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
      var campos = S.visibleFields(table.id).filter(function (f) { return hidden.indexOf(f.id) < 0; });

      var chips = campos.filter(function (f) {
        return ['select', 'multiselect'].indexOf(f.type) >= 0 && rec[f.id];
      });
      var desc = campos.filter(function (f) { return f.type === 'longtext'; })[0];

      /* El primer campo de tipo link, se llame como se llame */
      var campoUrl = campos.filter(function (f) { return f.type === 'url' && rec[f.id]; })[0];
      var url = campoUrl ? rec[campoUrl.id] : '';

      /* Datos sueltos que conviene tener a mano y poder copiar:
         un alias, un CBU, una wallet, un precio. */
      var datos = campos.filter(function (f) {
        return ['text', 'phone', 'email', 'currency', 'number'].indexOf(f.type) >= 0 &&
          f.id !== table.primary && rec[f.id] != null && rec[f.id] !== '';
      }).slice(0, 5);

      var listaDatos = el('div', { class: 'gcard__datos' });
      datos.forEach(function (f) {
        var valor = F.text(f, rec[f.id]);
        listaDatos.appendChild(el('div', { class: 'gdato' }, [
          el('span', { class: 'gdato__label', text: f.name }),
          el('span', { class: 'gdato__valor', text: valor, title: valor }),
          el('button', {
            class: 'gdato__copiar', text: '⧉', title: 'Copiar',
            onclick: function (e) {
              e.stopPropagation();
              copiar(valor);
            }
          })
        ]));
      });

      grid.appendChild(el('article', { class: 'gcard' + (rec.destacado ? ' is-star' : '') }, [
        el('header', { class: 'gcard__head' }, [
          el('h4', { class: 'gcard__title', text: S.titleOf(table.id, rec.id) }),
          rec.destacado ? el('span', { class: 'gcard__star', text: '★', title: 'Destacado' }) : null
        ]),
        chips.length ? el('div', { class: 'gcard__chips', html: chips.map(function (f) {
          return F.cell(f, rec[f.id], rec);
        }).join(' ') }) : null,
        datos.length ? listaDatos : null,
        desc && rec[desc.id] ? el('p', { class: 'gcard__desc', text: rec[desc.id] }) : null,
        el('div', { class: 'gcard__foot' }, [
          url ? el('a', {
            class: 'btn2 btn2--primary', href: url, target: '_blank', rel: 'noopener',
            text: 'Abrir ' + (campoUrl.name.length < 16 ? campoUrl.name.toLowerCase() : 'link')
          }) : null,
          url ? el('button', {
            class: 'btn2', text: 'Copiar link',
            onclick: function () { copiar(url); }
          }) : el('span', { class: 'muted small', text: 'Sin link cargado' }),
          el('button', {
            class: 'btn2', text: 'Editar',
            onclick: function () { AE.recordCard.open(table.id, rec.id, ctx.refresh); }
          })
        ])
      ]));
    });

    grid.appendChild(el('button', {
      class: 'gcard gcard--new', text: '+ Agregar',
      onclick: function () {
        var rec = S.createRecord(table.id, AE.defaults.para(table.id));
        AE.recordCard.open(table.id, rec.id, ctx.refresh);
      }
    }));

    host.appendChild(grid);
  }

  /* Copiar al portapapeles con respaldo para navegadores viejos */
  function copiar(texto) {
    function avisar() { AE.ui.toast('Copiado: ' + String(texto).slice(0, 40)); }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(texto).then(avisar, respaldo);
    } else respaldo();

    function respaldo() {
      var campo = el('textarea', { class: 'copia-oculta' });
      campo.value = texto;
      document.body.appendChild(campo);
      campo.select();
      try { document.execCommand('copy'); avisar(); }
      catch (e) { AE.ui.toast('Copialo a mano desde la ficha', 'warn'); }
      campo.remove();
    }
  }

  AE.gallery = { render: render, copiar: copiar };
})(window.AE);
