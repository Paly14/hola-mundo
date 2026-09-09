/* ===================================================================
   Alpha CRM — permisos por rol
   Dueño y Admin ven todo (incluida la facturación). Setter y closer
   trabajan en su espacio: sus leads, sus tareas y los recursos.
   =================================================================== */
(function (AE) {
  'use strict';

  var S = AE.store;

  var CERRADO = { tablas: [], ocultos: {}, propios: true, admin: false };

  function rol() { return AE.auth.rol(); }

  function config(unRol) {
    var mapa = (S.settings() && S.settings().permisos) || AE.schema.PERMISOS;
    return mapa[unRol || rol()] || CERRADO;
  }

  function esAdmin() { return !!config().admin; }

  function puedeVerTabla(tableId) {
    var c = config();
    return c.tablas === '*' || (c.tablas || []).indexOf(tableId) >= 0;
  }

  function tablasVisibles() {
    return S.tables().filter(function (t) { return puedeVerTabla(t.id); });
  }

  /* Una vista puede reservarse para ciertos roles (ej. Panel Closer) */
  function puedeVerVista(view) {
    if (!view) return false;
    if (!puedeVerTabla(view.tableId)) return false;
    return !view.roles || view.roles.indexOf(rol()) >= 0;
  }

  function vistasVisibles(tableId) {
    return S.views(tableId).filter(puedeVerVista);
  }

  function camposOcultos(tableId) {
    var c = config();
    return (c.ocultos && c.ocultos[tableId]) || [];
  }

  function puedeVerCampo(tableId, fieldId) {
    return camposOcultos(tableId).indexOf(fieldId) < 0;
  }

  /* Sólo un admin toca la estructura (campos, tablas), el equipo y las metas */
  function puedeEditarEstructura() { return esAdmin(); }

  /* true = esta persona ve únicamente sus propios registros */
  function soloPropios() { return !esAdmin() && !AE.auth.verTodo(); }

  /* Puede ver plata: facturación, cash collected, comisiones */
  function veFacturacion() { return esAdmin(); }

  /* ---------------- editor de permisos (sólo admins) ---------------- */

  function editor(refresh) {
    var U = AE.utils, el = U.el;
    var permisos = U.deepClone(S.settings().permisos || AE.schema.PERMISOS);
    var roles = Object.keys(permisos);
    var tablas = S.tables();

    var cuerpo = el('div', { class: 'perm' });
    roles.forEach(function (r) {
      var c = permisos[r];
      var fila = el('div', { class: 'perm__rol' }, [
        el('div', { class: 'perm__head' }, [
          el('span', { class: 'chip', style: '--chip:' + U.colorFor(r), text: r }),
          c.admin ? el('span', { class: 'muted small', text: 'acceso total (incluye facturación)' }) : null
        ])
      ]);
      if (!c.admin) {
        var grid = el('div', { class: 'perm__tablas' });
        tablas.forEach(function (t) {
          var on = c.tablas === '*' || (c.tablas || []).indexOf(t.id) >= 0;
          grid.appendChild(el('label', { class: 'fswitch' }, [
            el('input', {
              type: 'checkbox', checked: on,
              onchange: function (e) {
                var lista = c.tablas === '*' ? tablas.map(function (x) { return x.id; }) : (c.tablas || []).slice();
                if (e.target.checked) { if (lista.indexOf(t.id) < 0) lista.push(t.id); }
                else lista = lista.filter(function (id) { return id !== t.id; });
                c.tablas = lista;
              }
            }),
            el('span', { class: 'side__ico', text: t.icon || '📋' }),
            el('span', { text: t.name })
          ]));
        });
        fila.appendChild(grid);
        fila.appendChild(el('label', { class: 'fswitch' }, [
          el('input', {
            type: 'checkbox', checked: !!c.propios,
            onchange: function (e) { c.propios = e.target.checked; }
          }),
          el('span', { text: 'Ve solamente sus propios registros' })
        ]));
      }
      cuerpo.appendChild(fila);
    });

    AE.ui.modal({
      title: 'Quién ve qué',
      wide: true,
      body: el('div', {}, [
        el('p', { class: 'muted', text: 'Dueño y Admin siempre ven todo, incluida la facturación. Para los demás roles elegí a qué tablas entran.' }),
        cuerpo
      ]),
      actions: [
        { label: 'Cancelar' },
        {
          label: 'Guardar', kind: 'primary',
          onClick: function () {
            S.settings().permisos = permisos;
            S.emit('permisos');
            if (refresh) refresh();
            AE.ui.toast('Permisos actualizados');
          }
        }
      ]
    });
  }

  AE.perms = {
    config: config, esAdmin: esAdmin, puedeVerTabla: puedeVerTabla,
    tablasVisibles: tablasVisibles, camposOcultos: camposOcultos, puedeVerCampo: puedeVerCampo,
    puedeVerVista: puedeVerVista, vistasVisibles: vistasVisibles,
    puedeEditarEstructura: puedeEditarEstructura, soloPropios: soloPropios,
    veFacturacion: veFacturacion, editor: editor
  };
})(window.AE);

/* ===================================================================
   Alpha CRM — valores por defecto al crear un registro
   Se completan solos según quién está trabajando.
   =================================================================== */
(function (AE) {
  'use strict';

  var U = AE.utils, S = AE.store;

  function ahora() { return new Date().toISOString().slice(0, 16); }

  var POR_TABLA = {
    leads: function (yo, rol) {
      var v = { estado: 'Nuevo', fecha_contacto: U.today(), probabilidad: 10 };
      if (rol === 'Setter') v.setter = yo;
      if (rol === 'Closer') v.closer = yo;
      return v;
    },
    actividades: function (yo) { return { fecha: ahora(), tipo: 'WhatsApp', responsable: yo }; },
    tareas: function (yo) {
      return {
        estado: 'Pendiente', hecha: false, prioridad: 'Media',
        asignados: yo ? [yo] : [], creada_por: yo, vence: U.today()
      };
    },
    contenido: function (yo) { return { estado: 'Idea', formato: 'Reel', responsable: yo }; },
    pagos: function (yo, rol) {
      var v = { fecha: U.today(), tipo: 'Pago inicial', metodo: 'Transferencia' };
      if (rol === 'Closer') v.closer = yo;
      return v;
    },
    recursos: function () { return { para: 'Todos', categoria: 'Otros' }; },
    equipo: function () { return { rol: 'Setter', activo: true }; },
    metas: function () { return { mes: U.monthKey(new Date()) }; }
  };

  function para(tableId) {
    var fn = POR_TABLA[tableId];
    return fn ? fn(AE.auth.usuario(), AE.auth.rol()) : {};
  }

  AE.defaults = { para: para };
})(window.AE);
