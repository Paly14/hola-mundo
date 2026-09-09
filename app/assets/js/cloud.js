/* ===================================================================
   Alpha CRM — sincronización opcional con Supabase (plan gratuito)
   Sin configurar, la app funciona 100% local en el navegador.
   Con URL + clave anónima, todo el equipo comparte la misma base.
   =================================================================== */
(function (AE) {
  'use strict';

  var U = AE.utils, el = U.el, S = AE.store;
  var TABLE = 'crm_state';
  var ROW_ID = 'alpha';
  var aplicandoRemoto = false;
  var estado = { activo: false, ultimo: null, error: null, pendiente: false };

  function cfg() { return (S.settings() && S.settings().cloud) || { url: '', key: '', enabled: false }; }
  function listo() { var c = cfg(); return !!(c.enabled && c.url && c.key); }

  function headers(extra) {
    var c = cfg();
    return Object.assign({
      'apikey': c.key,
      'Authorization': 'Bearer ' + c.key,
      'Content-Type': 'application/json'
    }, extra || {});
  }

  function base() { return String(cfg().url).replace(/\/+$/, '') + '/rest/v1/' + TABLE; }

  /**
   * Traduce el error de Supabase a algo que se entienda y diga qué hacer.
   */
  function diagnostico(res, texto) {
    var t = String(texto || '');
    if (!res) {
      return 'No se pudo llegar al servidor. Revisá la URL del proyecto ' +
        '(tiene que empezar con https:// y terminar en .supabase.co) y tu conexión a internet.';
    }
    if (res.status === 401 || res.status === 403) {
      if (/row-level security|RLS|policy/i.test(t)) {
        return 'La tabla existe pero está bloqueada: falta crear la política de acceso. ' +
          'Volvé al SQL Editor y ejecutá la parte del "create policy".';
      }
      return 'La clave no es válida. Copiá de nuevo la clave "anon public" desde Settings → API.';
    }
    if (res.status === 404 || /does not exist|could not find the table/i.test(t)) {
      return 'No encuentro la tabla crm_state. Pegá y ejecutá el SQL que está más abajo en el SQL Editor.';
    }
    if (res.status === 400 && /column/i.test(t)) {
      return 'La tabla crm_state existe pero le faltan columnas. Borrala y volvé a crearla con el SQL de abajo.';
    }
    return 'Error ' + res.status + ': ' + t.slice(0, 140);
  }

  function pedir(metodo, ruta, cuerpo, extraHeaders) {
    return fetch(base() + (ruta || ''), {
      method: metodo,
      headers: headers(extraHeaders),
      body: cuerpo ? JSON.stringify(cuerpo) : undefined
    }).then(function (res) {
      if (res.ok) return res.status === 204 ? null : res.json().catch(function () { return null; });
      return res.text().then(function (t) {
        var e = new Error(diagnostico(res, t));
        e.crudo = t;
        throw e;
      });
    }, function () {
      throw new Error(diagnostico(null));
    });
  }

  /**
   * Prueba la conexión de punta a punta: lee, escribe y vuelve a leer.
   * Devuelve { ok:true } o { ok:false, motivo }.
   */
  function probar(url, key) {
    var anterior = U.deepClone(cfg());
    S.settings().cloud = { url: url, key: key, enabled: true };
    return pedir('GET', '?id=eq.' + ROW_ID + '&select=id')
      .then(function () {
        return pedir('POST', '', [{ id: '__test__', data: { ping: true }, updated_at: new Date().toISOString() }],
          { 'Prefer': 'resolution=merge-duplicates,return=minimal' });
      })
      .then(function () { return pedir('DELETE', '?id=eq.__test__'); })
      .then(function () { return { ok: true }; })
      .catch(function (e) {
        S.settings().cloud = anterior;
        return { ok: false, motivo: e.message };
      });
  }

  /* ---------------- subir ---------------- */

  var push = U.debounce(function (state) {
    if (!listo() || aplicandoRemoto) return;
    estado.pendiente = true;
    notify();
    fetch(base(), {
      method: 'POST',
      headers: headers({ 'Prefer': 'resolution=merge-duplicates,return=minimal' }),
      body: JSON.stringify([{ id: ROW_ID, data: state, updated_at: new Date().toISOString() }])
    }).then(function (res) {
      if (!res.ok) return res.text().then(function (t) { throw new Error(diagnostico(res, t)); });
      estado.error = null;
      estado.ultimo = new Date();
    }, function () {
      throw new Error(diagnostico(null));
    }).catch(function (e) {
      estado.error = String(e.message || e).slice(0, 200);
    }).then(function () {
      estado.pendiente = false;
      notify();
    });
  }, 2500);

  /* ---------------- bajar ---------------- */

  function pull() {
    if (!listo()) return Promise.resolve(null);
    return fetch(base() + '?id=eq.' + ROW_ID + '&select=data,updated_at', { headers: headers() })
      .then(function (res) {
        if (!res.ok) return res.text().then(function (t) { throw new Error(diagnostico(res, t)); });
        return res.json();
      }, function () { throw new Error(diagnostico(null)); })
      .then(function (rows) {
        estado.error = null;
        estado.ultimo = new Date();
        if (!rows || !rows.length || !rows[0].data) return null;
        return rows[0];
      })
      .catch(function (e) {
        estado.error = String(e.message || e).slice(0, 160);
        notify();
        return null;
      });
  }

  /**
   * Trae la versión de la nube si corresponde.
   * La primera vez que un dispositivo se conecta, la nube siempre gana:
   * si no, la base recién creada de esa persona pisaría la del equipo.
   */
  function aplicar(remoto, forzar) {
    if (!remoto || !remoto.data) return false;
    var local = S.getState();
    var confLocal = U.deepClone(cfg());
    var tLocal = new Date(local.updatedAt || 0).getTime();
    var tRemoto = new Date(remoto.data.updatedAt || remoto.updated_at || 0).getTime();
    var primeraVez = !confLocal.sincronizado;

    if (!forzar && !primeraVez && tRemoto <= tLocal) return false;

    aplicandoRemoto = true;
    S.setState(remoto.data);
    confLocal.sincronizado = true;
    S.settings().cloud = confLocal;   // la configuración es de este dispositivo
    aplicandoRemoto = false;
    S.save();
    return true;
  }

  function marcarSincronizado() {
    var c = cfg();
    if (c && !c.sincronizado) { c.sincronizado = true; S.save(); }
  }

  function sync(silencioso, forzar) {
    if (!listo()) return Promise.resolve(false);
    return pull().then(function (remoto) {
      var cambio = aplicar(remoto, forzar);
      if (!remoto) push(S.getState());   // la nube está vacía: la sembramos
      marcarSincronizado();
      if (!silencioso) {
        AE.ui.toast(estado.error ? 'Error de sincronización' : cambio ? 'Datos actualizados desde la nube' : 'Todo al día',
          estado.error ? 'warn' : 'ok');
      }
      notify();
      return cambio;
    });
  }

  function notify() {
    estado.activo = listo();
    document.dispatchEvent(new CustomEvent('ae:cloud'));
  }

  /* ---------------- link para invitar al equipo ---------------- */

  function codificar(objeto) {
    return btoa(unescape(encodeURIComponent(JSON.stringify(objeto))))
      .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }

  function decodificar(texto) {
    var base64 = String(texto).replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4) base64 += '=';
    return JSON.parse(decodeURIComponent(escape(atob(base64))));
  }

  /** Link que ya trae la configuración: el resto del equipo sólo lo abre. */
  function linkDeEquipo() {
    var c = cfg();
    if (!c.url || !c.key) return '';
    var base = location.href.split('#')[0];
    return base + '#/conectar/' + codificar({ u: c.url, k: c.key });
  }

  /**
   * Si la URL trae una invitación, deja la configuración lista.
   * Devuelve true si había una invitación.
   */
  function aplicarInvitacion() {
    var m = (location.hash || '').match(/^#\/conectar\/(.+)$/);
    if (!m) return false;
    try {
      var datos = decodificar(m[1]);
      if (!datos.u || !datos.k) return false;
      S.settings().cloud = { url: datos.u, key: datos.k, enabled: true, sincronizado: false };
      S.save();
      history.replaceState(null, '', location.pathname + location.search + '#/dashboard');
      return true;
    } catch (e) {
      console.warn('Link de conexión inválido', e);
      return false;
    }
  }

  /* ---------------- pantalla de configuración ---------------- */

  function configurar(refresh) {
    var c = cfg();
    var url = el('input', { class: 'inp', value: c.url || '', placeholder: 'https://xxxx.supabase.co' });
    var key = el('input', { class: 'inp', value: c.key || '', placeholder: 'clave anónima (anon public)' });
    var on = el('input', { type: 'checkbox', class: 'inp-check', checked: !!c.enabled });

    var ayuda = el('details', { class: 'help' }, [
      el('summary', { text: '¿Cómo lo activo? (5 minutos, gratis)' }),
      el('ol', { class: 'help__list', html:
        '<li>Entrá a <b>supabase.com</b> y creá una cuenta gratis.</li>' +
        '<li>Creá un proyecto nuevo (plan Free).</li>' +
        '<li>Abrí <b>SQL Editor</b> y pegá esto:<pre>create table crm_state (\n  id text primary key,\n  data jsonb,\n  updated_at timestamptz default now()\n);\nalter table crm_state enable row level security;\ncreate policy "equipo" on crm_state\n  for all using (true) with check (true);</pre></li>' +
        '<li>En <b>Settings → API</b> copiá <b>Project URL</b> y la clave <b>anon public</b>.</li>' +
        '<li>Pegalas acá arriba, activá la sincronización y listo: todo el equipo ve los mismos datos.</li>'
      }),
      el('p', { class: 'muted small', text: 'Nota: la clave anónima permite leer y escribir esta tabla a quien tenga el link de la app. Usala para el equipo interno, no la publiques.' })
    ]);

    var aviso = el('p', { class: 'cloud-status' });
    var zonaLink = el('div', { class: 'cloud-link' });

    function mostrarLink() {
      zonaLink.innerHTML = '';
      var link = linkDeEquipo();
      if (!link || !listo()) return;
      var campo = el('input', { class: 'inp', readonly: true, value: link });
      zonaLink.appendChild(el('div', { class: 'frow' }, [
        el('span', { class: 'frow__label', text: 'Link para el resto del equipo' }),
        el('div', { class: 'cloud-link__row' }, [
          campo,
          el('button', {
            class: 'btn2', text: 'Copiar',
            onclick: function () {
              campo.select();
              try {
                if (navigator.clipboard) navigator.clipboard.writeText(link);
                else document.execCommand('copy');
                AE.ui.toast('Link copiado');
              } catch (e) { AE.ui.toast('Copialo a mano desde el campo', 'warn'); }
            }
          })
        ]),
        el('span', { class: 'frow__hint', text:
          'Mandáselo a cada uno: al abrirlo quedan conectados a esta base sin copiar nada. ' +
          'Ojo, el link incluye la clave: compartilo sólo con el equipo.' })
      ]));
    }

    function probarYGuardar(cerrar) {
      var u = url.value.trim(), k = key.value.trim();
      if (!on.checked) {
        S.settings().cloud = { url: u, key: k, enabled: false };
        S.save(); notify();
        AE.ui.toast('Sincronización desactivada');
        if (refresh) refresh();
        return true;
      }
      if (!u || !k) {
        aviso.className = 'cloud-status is-error';
        aviso.textContent = 'Faltan la URL del proyecto y la clave anónima.';
        return false;
      }
      aviso.className = 'cloud-status';
      aviso.textContent = 'Probando la conexión…';

      probar(u, k).then(function (res) {
        if (!res.ok) {
          aviso.className = 'cloud-status is-error';
          aviso.textContent = res.motivo;
          return;
        }
        var yaSincronizado = !!(cfg() || {}).sincronizado;
        S.settings().cloud = { url: u, key: k, enabled: true, sincronizado: yaSincronizado };
        S.save();
        notify();
        aviso.className = 'cloud-status is-ok';
        aviso.textContent = 'Conectado. Sincronizando los datos…';
        sync(true).then(function () {
          aviso.textContent = 'Listo: la base quedó sincronizada.';
          mostrarLink();
          if (refresh) refresh();
          if (cerrar) modal.close();
        });
      });
      return false;
    }

    var modal = AE.ui.modal({
      title: 'Compartir la base con el equipo',
      wide: true,
      body: el('div', {}, [
        el('p', { class: 'muted', text: 'Sin esto, los datos viven sólo en este navegador y cada uno ve lo suyo. Con esto, Mariano, los closers y los setters trabajan sobre la misma base.' }),
        AE.ui.formRow('URL del proyecto', url, 'Settings → API → Project URL. Termina en .supabase.co'),
        AE.ui.formRow('Clave anónima', key, 'Settings → API → la clave "anon public" (la larga).'),
        AE.ui.formRow('Activar sincronización', on),
        aviso,
        zonaLink,
        ayuda
      ]),
      actions: [
        { label: 'Cerrar' },
        { label: 'Probar conexión', onClick: function () { return probarYGuardar(false); } },
        { label: 'Guardar y conectar', kind: 'primary', onClick: function () { return probarYGuardar(true); } }
      ]
    });

    if (listo()) mostrarLink();
  }

  function iniciar() {
    if (!listo()) { notify(); return; }
    sync(true);
    setInterval(function () { if (listo()) sync(true); }, 45000);
    window.addEventListener('focus', function () { if (listo()) sync(true); });
  }

  AE.cloud = {
    push: push, pull: pull, sync: sync, configurar: configurar,
    iniciar: iniciar, estado: estado, listo: listo, probar: probar,
    linkDeEquipo: linkDeEquipo, aplicarInvitacion: aplicarInvitacion
  };
})(window.AE);
