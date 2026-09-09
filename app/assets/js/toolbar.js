/* ===================================================================
   Alpha CRM — barra de vista: filtros, orden, agrupado, campos, export
   =================================================================== */
(function (AE) {
  'use strict';

  var U = AE.utils, el = U.el, S = AE.store, F = AE.fields;

  function render(host, viewId, ctx) {
    var view = S.view(viewId);
    var table = S.table(view.tableId);
    var campos = S.visibleFields(table.id);
    host.innerHTML = '';

    var bar = el('div', { class: 'toolbar' }, [
      viewTypeButton(view, ctx),
      countBadge('Filtros', (view.filters || []).length, function (e) { filtersPop(e.currentTarget, view, table, ctx); }),
      countBadge('Orden', (view.sorts || []).length, function (e) { sortsPop(e.currentTarget, view, table, ctx); }),
      countBadge('Agrupar', view.groupBy ? 1 : 0, function (e) { groupPop(e.currentTarget, view, table, ctx); }),
      countBadge('Campos', (view.hidden || []).length, function (e) { fieldsPop(e.currentTarget, view, table, ctx); }),
      searchBox(ctx),
      el('span', { class: 'toolbar__spacer' }),
      el('button', {
        class: 'tbtn', text: '⤓ Exportar',
        onclick: function (e) {
          AE.ui.menu(e.currentTarget, [
            { icon: '📄', label: 'CSV de esta vista', onClick: function () { S.exportCSV(table.id, view.id); } },
            AE.perms.esAdmin() ? { icon: '🗃', label: 'Copia de seguridad (JSON)', onClick: function () { S.exportJSON(); } } : null,
            AE.perms.esAdmin() ? { icon: '📥', label: 'Importar CSV a esta tabla', onClick: function () { importCSV(table.id, ctx); } } : null
          ], { align: 'right' });
        }
      }),
      el('button', {
        class: 'tbtn tbtn--primary', text: '+ Registro',
        onclick: function () {
          var rec = S.createRecord(table.id, AE.defaults.para(table.id));
          AE.recordCard.open(table.id, rec.id, ctx.refresh);
        }
      })
    ]);
    host.appendChild(bar);
  }

  function countBadge(label, count, onClick) {
    return el('button', {
      class: 'tbtn' + (count ? ' is-on' : ''),
      onclick: onClick
    }, [
      el('span', { text: label }),
      count ? el('span', { class: 'tbtn__n', text: count }) : null
    ]);
  }

  function searchBox(ctx) {
    var input = el('input', { class: 'tsearch', type: 'search', placeholder: 'Buscar…', value: ctx.search || '' });
    input.addEventListener('input', U.debounce(function () {
      ctx.setSearch(input.value);
    }, 180));
    return input;
  }

  function viewTypeButton(view, ctx) {
    var icons = { grid: '▦ Tabla', kanban: '▤ Kanban', gallery: '▢ Galería' };
    return el('button', {
      class: 'tbtn tbtn--type', text: icons[view.type] || 'Vista',
      onclick: function (e) {
        AE.ui.menu(e.currentTarget, Object.keys(icons).map(function (k) {
          return {
            label: icons[k], active: view.type === k,
            onClick: function () { S.updateView(view.id, { type: k }); ctx.refresh(); }
          };
        }));
      }
    });
  }

  /* ---------------- filtros ---------------- */

  function filtersPop(anchor, view, table, ctx) {
    var box = el('div', { class: 'pop-panel' });

    function draw() {
      box.innerHTML = '';
      box.appendChild(el('div', { class: 'pop-panel__title', text: 'Mostrar registros donde…' }));
      var filters = view.filters || [];

      if (!filters.length) box.appendChild(el('p', { class: 'muted small', text: 'Sin filtros: se ven todos los registros.' }));

      filters.forEach(function (flt, i) {
        var f = S.field(table.id, flt.fieldId) || campos[0];

        var fieldSel = el('select', { class: 'inp inp--sm' });
        S.visibleFields(table.id).forEach(function (x) {
          fieldSel.appendChild(el('option', { value: x.id, text: x.name, selected: x.id === flt.fieldId }));
        });
        fieldSel.addEventListener('change', function () {
          flt.fieldId = fieldSel.value;
          flt.op = S.opsFor(S.field(table.id, flt.fieldId).type)[0];
          flt.value = '';
          S.emit('filter'); draw(); ctx.refresh();
        });

        var opSel = el('select', { class: 'inp inp--sm' });
        S.opsFor(f.type).forEach(function (op) {
          opSel.appendChild(el('option', { value: op, text: S.OP_LABELS[op] || op, selected: op === flt.op }));
        });
        opSel.addEventListener('change', function () {
          flt.op = opSel.value;
          flt.value = '';
          S.emit('filter'); draw(); ctx.refresh();
        });

        box.appendChild(el('div', { class: 'flt' }, [
          el('span', { class: 'flt__lead', text: i === 0 ? 'Donde' : 'y' }),
          fieldSel, opSel, valueControl(f, flt, ctx),
          el('button', {
            class: 'icon-btn', html: '&times;', title: 'Quitar filtro',
            onclick: function () { view.filters.splice(i, 1); S.emit('filter'); draw(); ctx.refresh(); }
          })
        ]));
      });

      box.appendChild(el('div', { class: 'pop-panel__foot' }, [
        el('button', {
          class: 'btn2', text: '+ Agregar filtro',
          onclick: function () { addFilter(view.id, campos[0].id); draw(); ctx.refresh(); }
        }),
        filters.length ? el('button', {
          class: 'btn2', text: 'Borrar todos',
          onclick: function () { S.updateView(view.id, { filters: [] }); draw(); ctx.refresh(); }
        }) : null
      ]));
    }

    draw();
    AE.ui.popover(anchor, box, { autofocus: false });
  }

  function valueControl(f, flt, ctx) {
    if (flt.op === 'isEmpty' || flt.op === 'isNotEmpty') return el('span', { class: 'muted small', text: '—' });

    if (flt.op === 'isWithin') {
      var range = el('select', { class: 'inp inp--sm' });
      Object.keys(S.RANGOS).forEach(function (k) {
        range.appendChild(el('option', { value: k, text: S.RANGOS[k], selected: flt.value === k }));
      });
      if (!flt.value) flt.value = range.value;
      range.addEventListener('change', function () { flt.value = range.value; S.emit('filter'); ctx.refresh(); });
      return range;
    }

    if (flt.op === 'isAnyOf' || flt.op === 'isNoneOf') {
      var current = Array.isArray(flt.value) ? flt.value.slice() : [];
      var wrap = el('div', { class: 'flt__multi' });
      S.optionsOf(f).forEach(function (o) {
        wrap.appendChild(el('button', {
          class: 'chip chip--btn' + (current.indexOf(o.name) >= 0 ? ' is-on' : ''),
          style: '--chip:' + (o.color || U.colorFor(o.name)), text: o.name,
          onclick: function (e) {
            var i = current.indexOf(o.name);
            if (i >= 0) current.splice(i, 1); else current.push(o.name);
            e.currentTarget.classList.toggle('is-on');
            flt.value = current.slice();
            S.emit('filter'); ctx.refresh();
          }
        }));
      });
      return wrap;
    }

    if (f.type === 'checkbox') {
      var bool = el('select', { class: 'inp inp--sm' }, [
        el('option', { value: 'true', text: 'Sí', selected: flt.value === true || flt.value === 'true' }),
        el('option', { value: 'false', text: 'No', selected: !(flt.value === true || flt.value === 'true') })
      ]);
      bool.addEventListener('change', function () { flt.value = bool.value === 'true'; S.emit('filter'); ctx.refresh(); });
      return bool;
    }

    if ((f.type === 'select' || f.type === 'multiselect') && (flt.op === 'is' || flt.op === 'isNot')) {
      var sel = el('select', { class: 'inp inp--sm' }, [el('option', { value: '', text: '—' })]);
      S.optionsOf(f).forEach(function (o) {
        sel.appendChild(el('option', { value: o.name, text: o.name, selected: flt.value === o.name }));
      });
      sel.value = flt.value || '';
      sel.addEventListener('change', function () { flt.value = sel.value; S.emit('filter'); ctx.refresh(); });
      return sel;
    }

    var input = el('input', {
      class: 'inp inp--sm',
      type: F.INPUT_TYPE[f.type] || 'text',
      value: flt.value == null ? '' : flt.value
    });
    input.addEventListener('input', U.debounce(function () {
      flt.value = input.value; S.emit('filter'); ctx.refresh();
    }, 250));
    return input;
  }

  function addFilter(viewId, fieldId) {
    var view = S.view(viewId);
    var f = S.field(view.tableId, fieldId);
    view.filters = view.filters || [];
    view.filters.push({ fieldId: fieldId, op: S.opsFor(f.type)[0], value: '' });
    S.emit('filter:add');
  }

  /* ---------------- orden ---------------- */

  function sortsPop(anchor, view, table, ctx) {
    var box = el('div', { class: 'pop-panel' });

    function draw() {
      box.innerHTML = '';
      box.appendChild(el('div', { class: 'pop-panel__title', text: 'Ordenar por' }));
      (view.sorts || []).forEach(function (s, i) {
        var fieldSel = el('select', { class: 'inp inp--sm' });
        S.visibleFields(table.id).forEach(function (x) {
          fieldSel.appendChild(el('option', { value: x.id, text: x.name, selected: x.id === s.fieldId }));
        });
        fieldSel.addEventListener('change', function () { s.fieldId = fieldSel.value; S.emit('sort'); ctx.refresh(); });

        var dirSel = el('select', { class: 'inp inp--sm' }, [
          el('option', { value: 'asc', text: '1 → 9 / A → Z', selected: s.dir === 'asc' }),
          el('option', { value: 'desc', text: '9 → 1 / Z → A', selected: s.dir === 'desc' })
        ]);
        dirSel.addEventListener('change', function () { s.dir = dirSel.value; S.emit('sort'); ctx.refresh(); });

        box.appendChild(el('div', { class: 'flt' }, [
          fieldSel, dirSel,
          el('button', {
            class: 'icon-btn', html: '&times;',
            onclick: function () { view.sorts.splice(i, 1); S.emit('sort'); draw(); ctx.refresh(); }
          })
        ]));
      });
      box.appendChild(el('button', {
        class: 'btn2', text: '+ Agregar orden',
        onclick: function () {
          view.sorts = view.sorts || [];
          view.sorts.push({ fieldId: S.visibleFields(table.id)[0].id, dir: 'asc' });
          S.emit('sort'); draw(); ctx.refresh();
        }
      }));
    }
    draw();
    AE.ui.popover(anchor, box, { autofocus: false });
  }

  /* ---------------- agrupar ---------------- */

  function groupPop(anchor, view, table, ctx) {
    var items = [{ label: 'Sin agrupar', active: !view.groupBy, onClick: function () { S.updateView(view.id, { groupBy: null }); ctx.refresh(); } }];
    S.visibleFields(table.id).filter(function (f) {
      return ['select', 'checkbox', 'text', 'date', 'link'].indexOf(f.type) >= 0;
    }).forEach(function (f) {
      items.push({
        label: f.name, active: view.groupBy === f.id,
        onClick: function () { S.updateView(view.id, { groupBy: f.id }); ctx.refresh(); }
      });
    });
    AE.ui.menu(anchor, items);
  }

  /* ---------------- mostrar/ocultar campos ---------------- */

  function fieldsPop(anchor, view, table, ctx) {
    var box = el('div', { class: 'pop-panel' });
    box.appendChild(el('div', { class: 'pop-panel__title', text: 'Campos visibles' }));
    S.visibleFields(table.id).forEach(function (f) {
      var hidden = (view.hidden || []).indexOf(f.id) >= 0;
      var row = el('label', { class: 'fswitch' }, [
        el('input', {
          type: 'checkbox', checked: !hidden,
          onchange: function (e) {
            var list = (view.hidden || []).slice();
            if (e.target.checked) list = list.filter(function (id) { return id !== f.id; });
            else if (list.indexOf(f.id) < 0) list.push(f.id);
            S.updateView(view.id, { hidden: list });
            ctx.refresh();
          }
        }),
        el('span', { class: 'fswitch__ico', text: F.typeInfo(f.type).icon }),
        el('span', { text: f.name })
      ]);
      box.appendChild(row);
    });
    box.appendChild(el('div', { class: 'pop-panel__foot' }, [
      el('button', { class: 'btn2', text: 'Mostrar todos', onclick: function () { S.updateView(view.id, { hidden: [] }); ctx.refresh(); AE.ui.closePopover(); } })
    ]));
    AE.ui.popover(anchor, box, { autofocus: false, align: 'right' });
  }

  /* ---------------- importar CSV ---------------- */

  function importCSV(tableId, ctx) {
    var input = el('input', { type: 'file', accept: '.csv,text/csv' });
    input.addEventListener('change', function () {
      var file = input.files[0];
      if (!file) return;
      var reader = new FileReader();
      reader.onload = function () {
        try {
          var n = S.importCSV(tableId, reader.result);
          AE.ui.toast(n + ' registros importados');
          ctx.refresh();
        } catch (e) {
          AE.ui.toast('No se pudo importar: ' + e.message, 'warn');
        }
      };
      reader.readAsText(file);
    });
    input.click();
  }

  AE.toolbar = { render: render, addFilter: addFilter };
})(window.AE);
