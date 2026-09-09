/* ===================================================================
   Alpha CRM — armado de la aplicación, navegación y barra lateral
   =================================================================== */
(function (AE) {
  'use strict';

  var U = AE.utils, el = U.el, S = AE.store;

  var route = { tipo: 'dashboard', viewId: null };
  var search = '';
  var ctx = {
    get search() { return search; },
    setSearch: function (value) { search = value; renderMain(); },
    refresh: function () { render(); }
  };

  /* ---------------- navegación ---------------- */

  function leerHash() {
    var h = (location.hash || '').replace(/^#\/?/, '');
    if (h.indexOf('view/') === 0) {
      var id = h.slice(5);
      if (S.view(id)) return { tipo: 'view', viewId: id };
    }
    return { tipo: 'dashboard', viewId: null };
  }

  function ir(hash) {
    location.hash = hash;
  }

  window.addEventListener('hashchange', function () {
    route = leerHash();
    search = '';
    AE.grid.resetSelection();
    render();
  });

  /* ---------------- barra lateral ---------------- */

  function renderSidebar() {
    var host = document.getElementById('sidebar');
    host.innerHTML = '';
    var s = S.settings();
    var yo = AE.auth.usuario(), miRol = AE.auth.rol();

    host.appendChild(el('div', { class: 'side__brand' }, [
      el('span', { class: 'side__logo', text: 'A' }),
      el('div', {}, [
        el('strong', { text: s.brand }),
        el('span', { class: 'side__sub', text: 'CRM interno' })
      ])
    ]));

    host.appendChild(el('button', {
      class: 'side__user',
      onclick: function (e) { menuUsuario(e.currentTarget); }
    }, [
      el('span', { class: 'avatar', text: (yo || '?').slice(0, 1).toUpperCase() }),
      el('span', { class: 'side__user-name', text: yo }),
      el('span', { class: 'chip', style: '--chip:' + U.colorFor(miRol), text: miRol })
    ]));

    host.appendChild(el('button', {
      class: 'side__item side__item--dash' + (route.tipo === 'dashboard' ? ' is-on' : ''),
      onclick: function () { ir('#/dashboard'); }
    }, [
      el('span', { class: 'side__ico', text: AE.perms.esAdmin() ? '📊' : '🏠' }),
      el('span', { text: AE.perms.esAdmin() ? 'Panel y proyecciones' : 'Mi espacio' })
    ]));

    if (AE.perms.puedeCargarIngreso()) {
      host.appendChild(el('button', {
        class: 'side__cta', text: '＋ Cargar ingreso',
        onclick: function () { AE.ingresoForm.abrir({ onSave: render }); }
      }));
    }

    AE.perms.tablasVisibles().forEach(function (t) {
      var group = el('div', { class: 'side__group' });
      group.appendChild(el('div', { class: 'side__group-head' }, [
        el('span', { class: 'side__ico', text: t.icon || '📋' }),
        el('span', { class: 'side__group-name', text: t.name }),
        AE.perms.puedeEditarEstructura() ? el('button', {
          class: 'side__more', html: '⋯', title: 'Opciones de la tabla',
          onclick: function (e) { e.stopPropagation(); menuTabla(e.currentTarget, t); }
        }) : null
      ]));
      AE.perms.vistasVisibles(t.id).forEach(function (v) {
        group.appendChild(el('button', {
          class: 'side__item' + (route.viewId === v.id ? ' is-on' : ''),
          onclick: function () { ir('#/view/' + v.id); }
        }, [
          el('span', { class: 'side__vico', text: v.type === 'kanban' ? '▤' : v.type === 'gallery' ? '▢' : '▦' }),
          el('span', { text: v.name }),
          el('span', { class: 'side__count', text: S.rowsOf(v.id).length })
        ]));
      });
      group.appendChild(el('button', {
        class: 'side__add', text: '+ Vista',
        onclick: function (e) { menuNuevaVista(e.currentTarget, t); }
      }));
      host.appendChild(group);
    });

    if (AE.perms.puedeEditarEstructura()) {
      host.appendChild(el('button', {
        class: 'side__add side__add--table', text: '+ Nueva tabla',
        onclick: function () { nuevaTabla(); }
      }));
    }

    host.appendChild(el('div', { class: 'side__foot' }, [
      AE.perms.esAdmin() ? el('button', { class: 'side__foot-btn', id: 'cloudBtn', onclick: function () { AE.cloud.configurar(render); } }) : null,
      AE.perms.esAdmin() ? el('button', {
        class: 'side__foot-btn', text: '⚙︎ Datos y ajustes',
        onclick: function (e) { menuAjustes(e.currentTarget); }
      }) : null,
      el('button', {
        class: 'side__foot-btn', text: '⇥ Cerrar sesión',
        onclick: function () {
          AE.ui.confirm('¿Cerrar sesión?').then(function (ok) { if (ok) AE.auth.salir(); });
        }
      })
    ]));

    pintarEstadoNube();
  }

  function pintarEstadoNube() {
    var btn = document.getElementById('cloudBtn');
    if (!btn) return;
    var e = AE.cloud.estado;
    if (!AE.cloud.listo()) { btn.textContent = '☁︎ Conectar la nube'; btn.className = 'side__foot-btn'; return; }
    if (e.error) { btn.textContent = '☁︎ Error de sincronía'; btn.className = 'side__foot-btn is-warn'; return; }
    btn.textContent = e.pendiente ? '☁︎ Guardando…' : '☁︎ Sincronizado';
    btn.className = 'side__foot-btn is-ok';
  }

  document.addEventListener('ae:cloud', pintarEstadoNube);

  /* ---------------- menús ---------------- */

  function menuUsuario(anchor) {
    var yo = AE.auth.usuario();
    var items = [
      { icon: '🔑', label: 'Cambiar mi clave', onClick: function () { AE.auth.modalClave(yo); } }
    ];
    if (AE.perms.esAdmin()) {
      items.push({
        icon: '👁', label: AE.auth.verTodo() ? 'Ver sólo lo mío' : 'Ver todo el equipo',
        onClick: function () { AE.auth.setVerTodo(!AE.auth.verTodo()); render(); }
      });
      items.push({ icon: '🛡', label: 'Quién ve qué (permisos)', onClick: function () { AE.perms.editor(render); } });
    }
    items.push({ separator: true });
    items.push({
      icon: '⇥', label: 'Cerrar sesión', danger: true,
      onClick: function () {
        AE.ui.confirm('¿Cerrar sesión?').then(function (ok) { if (ok) AE.auth.salir(); });
      }
    });
    AE.ui.menu(anchor, items);
  }

  function menuTabla(anchor, t) {
    AE.ui.menu(anchor, [
      { icon: '＋', label: 'Agregar campo', onClick: function () { AE.fieldEditor.open(t.id, null, render, anchor); } },
      { icon: '📄', label: 'Exportar CSV', onClick: function () { S.exportCSV(t.id); } },
      { separator: true },
      {
        icon: '🗑', label: 'Eliminar tabla', danger: true,
        onClick: function () {
          AE.ui.confirm('¿Eliminar la tabla "' + t.name + '" con todos sus registros?', { danger: true, ok: 'Eliminar' })
            .then(function (ok) {
              if (!ok) return;
              S.deleteTable(t.id);
              ir('#/dashboard');
              render();
            });
        }
      }
    ], { align: 'right' });
  }

  function menuNuevaVista(anchor, t) {
    AE.ui.menu(anchor, [
      { icon: '▦', label: 'Tabla', onClick: function () { crearVista(t, 'grid'); } },
      { icon: '▤', label: 'Kanban', onClick: function () { crearVista(t, 'kanban'); } },
      { icon: '▢', label: 'Galería', onClick: function () { crearVista(t, 'gallery'); } }
    ]);
  }

  function crearVista(t, tipo) {
    var nombres = { grid: 'Tabla', kanban: 'Kanban', gallery: 'Galería' };
    var v = S.addView(t.id, nombres[tipo] + ' ' + (S.views(t.id).length + 1), tipo);
    ir('#/view/' + v.id);
    render();
  }

  function nuevaTabla() {
    var input = el('input', { class: 'inp', placeholder: 'Ej: Proveedores' });
    AE.ui.modal({
      title: 'Nueva tabla',
      body: AE.ui.formRow('Nombre', input),
      actions: [
        { label: 'Cancelar' },
        {
          label: 'Crear', kind: 'primary',
          onClick: function () {
            var name = input.value.trim();
            if (!name) return false;
            var t = S.addTable(name);
            ir('#/view/' + S.views(t.id)[0].id);
            render();
          }
        }
      ]
    });
  }

  function menuAjustes(anchor) {
    AE.ui.menu(anchor, [
      { icon: '🏷', label: 'Nombre y moneda', onClick: ajustesGenerales },
      { icon: '🛡', label: 'Quién ve qué (permisos)', onClick: function () { AE.perms.editor(render); } },
      { icon: '☁︎', label: 'Sincronizar ahora', onClick: function () { AE.cloud.sync(false).then(render); } },
      { separator: true },
      { icon: '🗃', label: 'Descargar copia (JSON)', onClick: function () { S.exportJSON(); } },
      { icon: '📥', label: 'Restaurar copia (JSON)', onClick: restaurar },
      { separator: true },
      { icon: '📊', label: 'Recargar los datos de los trackers', onClick: function () {
        AE.ui.confirm('Esto reemplaza todo por los datos migrados de los Excel (leads, alumnos, cobros y actividad del setter). ¿Seguir?', { danger: true, ok: 'Recargar' })
          .then(function (ok) {
            if (!ok) return;
            if (S.resetReales()) { render(); AE.ui.toast('Datos de los trackers recargados'); }
            else AE.ui.toast('No encuentro el archivo de datos migrados', 'warn');
          });
      } },
      { icon: '✨', label: 'Cargar datos de ejemplo', onClick: function () {
        AE.ui.confirm('Esto reemplaza todo lo que tengas cargado por datos de ejemplo. ¿Seguir?', { danger: true, ok: 'Cargar ejemplo' })
          .then(function (ok) { if (ok) { S.resetDemo(); render(); AE.ui.toast('Datos de ejemplo cargados'); } });
      } },
      { icon: '🧹', label: 'Vaciar todos los registros', danger: true, onClick: function () {
        AE.ui.confirm('Se borran todos los registros de todas las tablas (la estructura queda). ¿Seguir?', { danger: true, ok: 'Vaciar' })
          .then(function (ok) { if (ok) { S.clearData(); render(); AE.ui.toast('Registros eliminados'); } });
      } }
    ], { align: 'right' });
  }

  function ajustesGenerales() {
    var s = S.settings();
    var brand = el('input', { class: 'inp', value: s.brand });
    var currency = el('select', { class: 'inp' }, [
      el('option', { value: 'USD', text: 'Dólares (USD)', selected: s.currency === 'USD' }),
      el('option', { value: 'ARS', text: 'Pesos argentinos (ARS)', selected: s.currency === 'ARS' }),
      el('option', { value: 'EUR', text: 'Euros (EUR)', selected: s.currency === 'EUR' }),
      el('option', { value: 'MXN', text: 'Pesos mexicanos (MXN)', selected: s.currency === 'MXN' })
    ]);
    AE.ui.modal({
      title: 'Ajustes generales',
      body: el('div', {}, [
        AE.ui.formRow('Nombre del negocio', brand),
        AE.ui.formRow('Moneda', currency)
      ]),
      actions: [
        { label: 'Cancelar' },
        {
          label: 'Guardar', kind: 'primary',
          onClick: function () {
            s.brand = brand.value.trim() || 'Alpha Ecommerce';
            s.currency = currency.value;
            S.emit('settings');
            render();
          }
        }
      ]
    });
  }

  function restaurar() {
    var input = el('input', { type: 'file', accept: '.json,application/json' });
    input.addEventListener('change', function () {
      var file = input.files[0];
      if (!file) return;
      var reader = new FileReader();
      reader.onload = function () {
        try {
          S.importJSON(reader.result);
          render();
          AE.ui.toast('Copia restaurada');
        } catch (e) {
          AE.ui.toast('Archivo inválido: ' + e.message, 'warn');
        }
      };
      reader.readAsText(file);
    });
    input.click();
  }

  /* ---------------- contenido principal ---------------- */

  function renderMain() {
    var head = document.getElementById('viewHead');
    var toolbar = document.getElementById('viewToolbar');
    var body = document.getElementById('viewBody');
    head.innerHTML = ''; toolbar.innerHTML = ''; body.innerHTML = '';

    if (route.tipo === 'dashboard') {
      document.body.classList.add('is-dash');
      // Sólo se ve en pantallas chicas: da acceso al menú lateral
      var esAdmin = AE.perms.esAdmin();
      head.appendChild(el('div', { class: 'view-head view-head--dash' }, [
        el('button', { class: 'burger', html: '☰', onclick: function () { document.body.classList.toggle('is-side-open'); } }),
        el('span', { class: 'view-head__ico', text: esAdmin ? '📊' : '🏠' }),
        el('strong', { text: esAdmin ? 'Panel y proyecciones' : 'Mi espacio' })
      ]));
      if (esAdmin) AE.dashboard.render(body, ctx);
      else AE.espacio.render(body, ctx);
      return;
    }
    document.body.classList.remove('is-dash');

    var view = S.view(route.viewId);
    if (!view) { ir('#/dashboard'); return; }
    var table = S.table(view.tableId);
    if (!table || !AE.perms.puedeVerVista(view)) {
      AE.ui.toast('No tenés acceso a esa sección', 'warn');
      ir('#/dashboard');
      return;
    }

    var title = el('input', { class: 'view-title', value: view.name });
    title.addEventListener('change', function () {
      S.updateView(view.id, { name: title.value.trim() || 'Vista' });
      renderSidebar();
    });

    head.appendChild(el('div', { class: 'view-head' }, [
      el('button', { class: 'burger', html: '☰', onclick: function () { document.body.classList.toggle('is-side-open'); } }),
      el('span', { class: 'view-head__ico', text: table.icon || '📋' }),
      title,
      el('span', { class: 'view-head__table', text: table.name }),
      el('span', { class: 'toolbar__spacer' }),
      el('button', {
        class: 'tbtn', html: '⋯', title: 'Opciones de la vista',
        onclick: function (e) {
          AE.ui.menu(e.currentTarget, [
            { icon: '⧉', label: 'Duplicar vista', onClick: function () {
              var copia = S.addView(table.id, view.name + ' (copia)', view.type);
              S.updateView(copia.id, {
                filters: U.deepClone(view.filters || []), sorts: U.deepClone(view.sorts || []),
                hidden: (view.hidden || []).slice(), groupBy: view.groupBy, stackBy: view.stackBy
              });
              ir('#/view/' + copia.id); render();
            } },
            S.views(table.id).length > 1 ? {
              icon: '🗑', label: 'Eliminar vista', danger: true,
              onClick: function () {
                AE.ui.confirm('¿Eliminar la vista "' + view.name + '"? Los registros no se borran.', { danger: true, ok: 'Eliminar' })
                  .then(function (ok) {
                    if (!ok) return;
                    S.deleteView(view.id);
                    ir('#/view/' + S.views(table.id)[0].id);
                    render();
                  });
              }
            } : null
          ], { align: 'right' });
        }
      })
    ]));

    AE.toolbar.render(toolbar, view.id, ctx);

    if (view.type === 'kanban') AE.kanban.render(body, view.id, ctx);
    else if (view.type === 'gallery') AE.gallery.render(body, view.id, ctx);
    else AE.grid.render(body, view.id, ctx);
  }

  function render() {
    renderSidebar();
    renderMain();
  }

  /* ---------------- arranque ---------------- */

  function arrancar() {
    route = leerHash();
    if (route.tipo === 'dashboard' && !location.hash) location.hash = '#/dashboard';
    render();
    AE.cloud.iniciar();

    document.getElementById('sideScrim').addEventListener('click', function () {
      document.body.classList.remove('is-side-open');
    });

    // Guardar antes de cerrar
    window.addEventListener('beforeunload', function () { S.save(); });
  }

  function init() {
    S.load();
    if (AE.auth.revalidar()) arrancar();
    else AE.auth.pantalla(function () { arrancar(); });
  }

  document.addEventListener('DOMContentLoaded', init);
  AE.app = { render: render, ir: ir };
})(window.AE);
