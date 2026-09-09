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
      if (!res.ok) return res.text().then(function (t) { throw new Error(t || res.status); });
      estado.error = null;
      estado.ultimo = new Date();
    }).catch(function (e) {
      estado.error = String(e.message || e).slice(0, 160);
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
        if (!res.ok) return res.text().then(function (t) { throw new Error(t || res.status); });
        return res.json();
      })
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

  function aplicar(remoto) {
    if (!remoto || !remoto.data) return false;
    var local = S.getState();
    var tLocal = new Date(local.updatedAt || 0).getTime();
    var tRemoto = new Date(remoto.data.updatedAt || remoto.updated_at || 0).getTime();
    if (tRemoto <= tLocal) return false;
    aplicandoRemoto = true;
    S.setState(remoto.data);
    aplicandoRemoto = false;
    return true;
  }

  function sync(silencioso) {
    if (!listo()) return Promise.resolve(false);
    return pull().then(function (remoto) {
      var cambio = aplicar(remoto);
      if (!remoto) push(S.getState());
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

    AE.ui.modal({
      title: 'Sincronizar con la nube (opcional)',
      wide: true,
      body: el('div', {}, [
        el('p', { class: 'muted', text: 'Sin esto, los datos viven sólo en este navegador. Con esto, el setter, el closer y vos comparten la misma base en tiempo real.' }),
        AE.ui.formRow('URL del proyecto', url),
        AE.ui.formRow('Clave anónima', key),
        AE.ui.formRow('Activar sincronización', on),
        ayuda
      ]),
      actions: [
        { label: 'Cancelar' },
        {
          label: 'Guardar y probar', kind: 'primary',
          onClick: function () {
            S.settings().cloud = { url: url.value.trim(), key: key.value.trim(), enabled: on.checked };
            S.save();
            notify();
            if (on.checked) sync(false).then(function () { if (refresh) refresh(); });
            else { AE.ui.toast('Sincronización desactivada'); if (refresh) refresh(); }
          }
        }
      ]
    });
  }

  function iniciar() {
    if (!listo()) { notify(); return; }
    sync(true);
    setInterval(function () { if (listo()) sync(true); }, 45000);
    window.addEventListener('focus', function () { if (listo()) sync(true); });
  }

  AE.cloud = {
    push: push, pull: pull, sync: sync, configurar: configurar,
    iniciar: iniciar, estado: estado, listo: listo
  };
})(window.AE);
