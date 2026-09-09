/* ===================================================================
   Alpha CRM — vista Galería (usada para la biblioteca de recursos)
   =================================================================== */
(function (AE) {
  'use strict';

  var U = AE.utils, el = U.el, S = AE.store, F = AE.fields;

  function render(host, viewId, ctx) {
    var view = S.view(viewId);
    var table = S.table(view.tableId);
    var rows = S.rowsOf(viewId, ctx && ctx.search);
    var hidden = view.hidden || [];

    host.innerHTML = '';
    var grid = el('div', { class: 'gallery' });

    rows.forEach(function (rec) {
      var url = rec.url || '';
      var chips = table.fields.filter(function (f) {
        return ['select', 'multiselect'].indexOf(f.type) >= 0 && hidden.indexOf(f.id) < 0 && rec[f.id];
      });
      var desc = table.fields.filter(function (f) { return f.type === 'longtext'; })[0];

      grid.appendChild(el('article', { class: 'gcard' + (rec.destacado ? ' is-star' : '') }, [
        el('header', { class: 'gcard__head' }, [
          el('h4', { class: 'gcard__title', text: S.titleOf(table.id, rec.id) }),
          rec.destacado ? el('span', { class: 'gcard__star', text: '★', title: 'Destacado' }) : null
        ]),
        el('div', { class: 'gcard__chips', html: chips.map(function (f) {
          return F.cell(f, rec[f.id], rec);
        }).join(' ') }),
        desc && rec[desc.id] ? el('p', { class: 'gcard__desc', text: rec[desc.id] }) : null,
        el('div', { class: 'gcard__foot' }, [
          url
            ? el('a', { class: 'btn2 btn2--primary', href: url, target: '_blank', rel: 'noopener', text: 'Abrir recurso' })
            : el('span', { class: 'muted small', text: 'Sin link cargado' }),
          el('button', {
            class: 'btn2', text: 'Editar',
            onclick: function () { AE.recordCard.open(table.id, rec.id, ctx.refresh); }
          })
        ])
      ]));
    });

    grid.appendChild(el('button', {
      class: 'gcard gcard--new', text: '+ Agregar recurso',
      onclick: function () {
        var rec = S.createRecord(table.id, { para: 'Todos', categoria: 'Otros' });
        AE.recordCard.open(table.id, rec.id, ctx.refresh);
      }
    }));

    host.appendChild(grid);
  }

  AE.gallery = { render: render };
})(window.AE);
