/* ===================================================================
   Alpha CRM — cuentas y sesión
   Cada persona del equipo entra con su nombre y su clave. La sesión es
   local de cada dispositivo: no viaja a la nube ni la ve el resto.
   =================================================================== */
(function (AE) {
  'use strict';

  var U = AE.utils, el = U.el, S = AE.store;
  var KEY = 'alpha_crm_sesion';
  var sesion = null;

  function cargar() {
    if (sesion) return sesion;
    try {
      sesion = JSON.parse(localStorage.getItem(KEY) || 'null');
    } catch (e) { sesion = null; }
    return sesion;
  }

  function guardar() {
    try { localStorage.setItem(KEY, JSON.stringify(sesion)); } catch (e) {}
  }

  function actual() { return cargar(); }
  function usuario() { var s = cargar(); return s ? s.usuario : ''; }
  function rol() { var s = cargar(); return s ? s.rol : 'Admin'; }
  function verTodo() { var s = cargar(); return !!(s && s.verTodo); }

  function setVerTodo(value) {
    if (!sesion) return;
    sesion.verTodo = !!value;
    guardar();
  }

  function personas() {
    var t = S.table('equipo');
    if (!t) return [];
    return t.records.filter(function (p) { return p.activo !== false && p.nombre; });
  }

  function buscar(nombre) {
    return personas().filter(function (p) { return p.nombre === nombre; })[0];
  }

  /**
   * Verifica la clave y abre la sesión.
   * Devuelve { ok } o { ok:false, motivo }.
   */
  function entrar(nombre, clave) {
    var p = buscar(nombre);
    if (!p) return { ok: false, motivo: 'No encuentro esa persona en el equipo.' };
    if (p.clave && p.clave !== U.sha256(clave)) return { ok: false, motivo: 'Clave incorrecta.' };
    sesion = { usuario: p.nombre, rol: p.rol || 'Setter', verTodo: false, desde: Date.now() };
    guardar();
    return { ok: true, persona: p };
  }

  function salir() {
    sesion = null;
    try { localStorage.removeItem(KEY); } catch (e) {}
    location.reload();
  }

  function cambiarClave(nombre, nueva) {
    var p = buscar(nombre);
    if (!p) return false;
    S.updateRecord('equipo', p.id, { clave: U.sha256(nueva), claveInicial: false });
    return true;
  }

  /* Si la sesión guardada apunta a alguien que ya no existe o cambió de rol */
  function revalidar() {
    var s = cargar();
    if (!s) return false;
    var p = buscar(s.usuario);
    if (!p) { sesion = null; try { localStorage.removeItem(KEY); } catch (e) {} return false; }
    if (p.rol && p.rol !== s.rol) { sesion.rol = p.rol; guardar(); }
    return true;
  }

  /* ---------------- pantalla de ingreso ---------------- */

  function pantalla(onOk) {
    var host = document.getElementById('authHost');
    document.body.classList.add('is-auth');
    host.innerHTML = '';

    var gente = personas();
    var select = el('select', { class: 'inp' });
    gente.forEach(function (p) {
      select.appendChild(el('option', { value: p.nombre, text: p.nombre + '  ·  ' + (p.rol || '') }));
    });

    var clave = el('input', { class: 'inp', type: 'password', placeholder: 'Tu clave', autocomplete: 'current-password' });
    var error = el('p', { class: 'auth__error' });

    function intentar() {
      var res = entrar(select.value, clave.value);
      if (!res.ok) { error.textContent = res.motivo; clave.value = ''; clave.focus(); return; }
      document.body.classList.remove('is-auth');
      host.innerHTML = '';
      onOk(res.persona);
      if (res.persona.claveInicial) setTimeout(function () { pedirNuevaClave(res.persona); }, 400);
    }

    clave.addEventListener('keydown', function (e) { if (e.key === 'Enter') intentar(); });

    host.appendChild(el('div', { class: 'auth' }, [
      el('form', {
        class: 'auth__card',
        onsubmit: function (e) { e.preventDefault(); intentar(); }
      }, [
        el('div', { class: 'auth__brand' }, [
          el('span', { class: 'side__logo', text: 'A' }),
          el('div', {}, [
            el('strong', { text: S.settings().brand }),
            el('span', { class: 'side__sub', text: 'CRM interno' })
          ])
        ]),
        el('h1', { class: 'auth__title', text: 'Entrá a tu espacio' }),
        AE.ui.formRow('¿Quién sos?', select),
        AE.ui.formRow('Clave', clave),
        error,
        el('button', { class: 'btn2 btn2--primary auth__go', type: 'submit', text: 'Entrar' }),
        el('p', { class: 'auth__hint', text: 'Primera vez: tu clave inicial es tu nombre en minúscula (sin apellido). Cambiala apenas entres.' })
      ])
    ]));
    setTimeout(function () { clave.focus(); }, 60);
  }

  function pedirNuevaClave(persona) {
    var nueva = el('input', { class: 'inp', type: 'password', placeholder: 'Nueva clave' });
    var repetir = el('input', { class: 'inp', type: 'password', placeholder: 'Repetila' });
    AE.ui.modal({
      title: 'Poné tu clave',
      body: el('div', {}, [
        el('p', { class: 'muted', text: 'Estás usando la clave inicial. Elegí una nueva para que nadie más entre a tu espacio.' }),
        AE.ui.formRow('Nueva clave', nueva),
        AE.ui.formRow('Repetir', repetir)
      ]),
      actions: [
        { label: 'Después' },
        {
          label: 'Guardar clave', kind: 'primary',
          onClick: function () {
            if (nueva.value.length < 4) { AE.ui.toast('Usá al menos 4 caracteres', 'warn'); return false; }
            if (nueva.value !== repetir.value) { AE.ui.toast('Las claves no coinciden', 'warn'); return false; }
            cambiarClave(persona.nombre, nueva.value);
            AE.ui.toast('Clave actualizada');
          }
        }
      ]
    });
  }

  /* Cambiar la clave de cualquiera: uno mismo, o un admin a otra persona */
  function modalClave(nombre) {
    var p = buscar(nombre);
    if (!p) return;
    var propia = nombre === usuario();
    var actualInp = el('input', { class: 'inp', type: 'password', placeholder: 'Clave actual' });
    var nueva = el('input', { class: 'inp', type: 'password', placeholder: 'Nueva clave' });
    AE.ui.modal({
      title: 'Clave de ' + nombre,
      body: el('div', {}, [
        (propia && p.clave) ? AE.ui.formRow('Clave actual', actualInp) : null,
        AE.ui.formRow('Nueva clave', nueva)
      ]),
      actions: [
        { label: 'Cancelar' },
        {
          label: 'Guardar', kind: 'primary',
          onClick: function () {
            if (propia && p.clave && p.clave !== U.sha256(actualInp.value)) {
              AE.ui.toast('La clave actual no coincide', 'warn'); return false;
            }
            if (nueva.value.length < 4) { AE.ui.toast('Usá al menos 4 caracteres', 'warn'); return false; }
            cambiarClave(nombre, nueva.value);
            AE.ui.toast('Clave actualizada');
          }
        }
      ]
    });
  }

  AE.auth = {
    actual: actual, usuario: usuario, rol: rol, verTodo: verTodo, setVerTodo: setVerTodo,
    entrar: entrar, salir: salir, revalidar: revalidar, personas: personas,
    pantalla: pantalla, modalClave: modalClave, cambiarClave: cambiarClave
  };
})(window.AE);
