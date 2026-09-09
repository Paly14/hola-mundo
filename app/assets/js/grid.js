/* ===================================================================
   Alpha CRM — vista Tabla (grilla estilo Airtable)
   Celdas editables, filtros, orden, agrupado, columnas redimensionables
   =================================================================== */
(function (AE) {
  'use strict';

  var U = AE.utils, el = U.el, S = AE.store, F = AE.fields;

  var sel = { recId: null, fieldId: null };   // celda seleccionada
  var editing = false;
  var checked = {};                            // filas tildadas por id
  var collapsed = {};                          // grupos colapsados

  function visibleFields(table, view) {
    var hidden = view.hidden || [];
    return table.fields.filter(function (f) { return hidden.indexOf(f.id) < 0; });
  }

  function render(host, viewId, ctx) {
    var view = S.view(viewId);
    var table = S.table(view.tableId);
    var fields = visibleFields(table, view);
    var rows = S.rowsOf(viewId, ctx && ctx.search);

    host.innerHTML = '';
    var wrap = el('div', { class: 'grid-wrap' });
    var t = el('table', { class: 'grid' });

    /* --- anchos de columna --- */
    var cg = el('colgroup');
    cg.appendChild(el('col', { style: 'width:56px' }));
    fields.forEach(function (f) { cg.appendChild(el('col', { style: 'width:' + (f.width || 160) + 'px' })); });
    cg.appendChild(el('col', { style: 'width:120px' }));
    t.appendChild(cg);

    /* --- encabezado --- */
    var thead = el('thead');
    var hr = el('tr');
    hr.appendChild(el('th', { class: 'gutter', html: '<span class="muted">#</span>' }));
    fields.forEach(function (f) {
      var th = el('th', { class: 'gh', dataset: { field: f.id } }, [
        el('span', { class: 'gh__ico', text: F.typeInfo(f.type).icon }),
        el('span', { class: 'gh__name', text: f.name }),
        sortMark(view, f),
        el('button', {
          class: 'gh__menu', html: '▾', title: 'Opciones del campo',
          onclick: function (e) { e.stopPropagation(); fieldMenu(e.currentTarget, table, view, f, ctx); }
        }),
        el('span', { class: 'gh__resize' })
      ]);
      th.addEventListener('mousedown', function (e) {
        if (e.target.classList.contains('gh__resize')) startResize(e, table, f, ctx);
      });
      hr.appendChild(th);
    });
    hr.appendChild(el('th', { class: 'gh gh--add' }, [
      el('button', {
        class: 'gh__add', text: '+ Campo',
        onclick: function (e) { AE.fieldEditor.open(table.id, null, ctx.refresh, e.currentTarget); }
      })
    ]));
    thead.appendChild(hr);
    t.appendChild(thead);

    /* --- cuerpo --- */
    if (view.groupBy && S.field(table.id, view.groupBy)) {
      var gf = S.field(table.id, view.groupBy);
      S.groupRows(rows, view.groupBy).forEach(function (g) {
        var body = el('tbody', { class: 'grid__group' });
        var isOpen = !collapsed[viewId + ':' + g.key];
        var head = el('tr', { class: 'grow-group' });
        head.appendChild(el('td', {
          class: 'grow-group__cell', colspan: fields.length + 2,
          onclick: function () { collapsed[viewId + ':' + g.key] = isOpen; ctx.refresh(); }
        }, [
          el('span', { class: 'grow-group__caret', text: isOpen ? '▾' : '▸' }),
          el('span', { class: 'grow-group__title', html: gf.type === 'select' && g.key !== '—'
            ? F.chip(g.key, F.colorOf(gf, g.key)) : U.esc(g.key) }),
          el('span', { class: 'grow-group__count', text: g.rows.length + ' ' + (g.rows.length === 1 ? 'registro' : 'registros') }),
          el('span', { class: 'grow-group__sum', text: groupSummary(table, g.rows) })
        ]));
        body.appendChild(head);
        if (isOpen) g.rows.forEach(function (r, i) { body.appendChild(rowNode(table, view, fields, r, i, ctx)); });
        t.appendChild(body);
      });
    } else {
      var tbody = el('tbody');
      rows.forEach(function (r, i) { tbody.appendChild(rowNode(table, view, fields, r, i, ctx)); });
      tbody.appendChild(newRowNode(table, fields, ctx));
      t.appendChild(tbody);
    }

    /* --- pie con totales --- */
    var tfoot = el('tfoot');
    var fr = el('tr');
    fr.appendChild(el('td', { class: 'gutter', text: rows.length }));
    fields.forEach(function (f) {
      fr.appendChild(el('td', { class: 'gfoot', text: aggregate(f, rows) }));
    });
    fr.appendChild(el('td', { class: 'gfoot' }));
    tfoot.appendChild(fr);
    t.appendChild(tfoot);

    wrap.appendChild(t);
    host.appendChild(wrap);

    if (!rows.length) {
      host.appendChild(el('div', { class: 'empty' }, [
        el('p', { text: 'No hay registros que coincidan con esta vista.' }),
        el('button', {
          class: 'btn2 btn2--primary', text: '+ Crear el primero',
          onclick: function () { addRow(table, ctx); }
        })
      ]));
    }

    renderBulkBar(host, table, ctx);
  }

  function sortMark(view, f) {
    var s = (view.sorts || []).filter(function (x) { return x.fieldId === f.id; })[0];
    return s ? el('span', { class: 'gh__sort', text: s.dir === 'desc' ? '↓' : '↑' }) : null;
  }

  function groupSummary(table, rows) {
    var money = table.fields.filter(function (f) { return f.type === 'currency'; })[0];
    if (!money) return '';
    var total = rows.reduce(function (acc, r) { return acc + (U.toNumber(r[money.id]) || 0); }, 0);
    return total ? money.name + ': ' + U.money(total, S.settings().currency) : '';
  }

  function aggregate(f, rows) {
    if (['currency', 'number'].indexOf(f.type) >= 0) {
      var total = rows.reduce(function (a, r) { return a + (U.toNumber(r[f.id]) || 0); }, 0);
      if (!total) return '';
      return f.type === 'currency' ? U.money(total, S.settings().currency) : U.num(total);
    }
    if (f.type === 'percent' || f.type === 'rating') {
      var vals = rows.map(function (r) { return U.toNumber(r[f.id]); }).filter(function (v) { return v != null; });
      if (!vals.length) return '';
      var avg = vals.reduce(function (a, b) { return a + b; }, 0) / vals.length;
      return 'prom ' + U.num(avg, 1) + (f.type === 'percent' ? '%' : '');
    }
    if (f.type === 'checkbox') {
      var on = rows.filter(function (r) { return r[f.id]; }).length;
      return on ? on + ' sí' : '';
    }
    var llenos = rows.filter(function (r) { return r[f.id] != null && r[f.id] !== ''; }).length;
    return llenos && llenos < rows.length ? llenos + ' con dato' : '';
  }

  /* ---------------- filas ---------------- */

  function rowNode(table, view, fields, rec, index, ctx) {
    var tr = el('tr', { class: 'grow' + (checked[rec.id] ? ' is-checked' : ''), dataset: { rec: rec.id } });

    var gut = el('td', { class: 'gutter' }, [
      el('span', { class: 'gutter__n', text: index + 1 }),
      el('input', {
        class: 'gutter__check', type: 'checkbox', checked: !!checked[rec.id],
        onchange: function (e) {
          if (e.target.checked) checked[rec.id] = true; else delete checked[rec.id];
          ctx.refresh();
        }
      }),
      el('button', {
        class: 'gutter__expand', html: '⤢', title: 'Abrir ficha',
        onclick: function () { AE.recordCard.open(table.id, rec.id, ctx.refresh); }
      })
    ]);
    tr.appendChild(gut);

    fields.forEach(function (f) {
      var td = el('td', {
        class: 'gcell' + (sel.recId === rec.id && sel.fieldId === f.id ? ' is-sel' : ''),
        dataset: { field: f.id },
        html: F.cell(f, rec[f.id], rec)
      });
      td.addEventListener('click', function (e) { onCellClick(e, td, table, f, rec, ctx); });
      td.addEventListener('dblclick', function () { openEditor(td, table, f, rec, ctx); });
      tr.appendChild(td);
    });

    tr.appendChild(el('td', { class: 'gcell gcell--pad' }));
    return tr;
  }

  function newRowNode(table, fields, ctx) {
    var tr = el('tr', { class: 'grow grow--new' });
    tr.appendChild(el('td', { class: 'gutter', html: '<span class="gutter__plus">+</span>' }));
    tr.appendChild(el('td', {
      class: 'gcell gcell--new', colspan: fields.length + 1, text: 'Nuevo registro'
    }));
    tr.addEventListener('click', function () { addRow(table, ctx); });
    return tr;
  }

  function addRow(table, ctx) {
    var values = {};
    if (table.id === 'leads') {
      values.estado = 'Nuevo';
      values.fecha_contacto = U.today();
      if (S.settings().rol === 'Setter') values.setter = S.settings().usuario;
      if (S.settings().rol === 'Closer') values.closer = S.settings().usuario;
    }
    if (table.id === 'actividades') {
      values.fecha = new Date().toISOString().slice(0, 16);
      values.responsable = S.settings().usuario;
    }
    var rec = S.createRecord(table.id, values);
    sel = { recId: rec.id, fieldId: table.primary };
    ctx.refresh();
    setTimeout(function () {
      var td = document.querySelector('tr[data-rec="' + rec.id + '"] td[data-field="' + table.primary + '"]');
      if (td) openEditor(td, table, S.field(table.id, table.primary), rec, ctx);
    }, 20);
  }

  /* ---------------- edición de celdas ---------------- */

  function onCellClick(e, td, table, f, rec, ctx) {
    if (e.target.classList.contains('cell-link')) return;   // dejá abrir el link

    if (f.type === 'checkbox') {
      S.updateRecord(table.id, rec.id, defineValue(f.id, !rec[f.id]));
      ctx.refresh();
      return;
    }
    if (f.type === 'rating' && e.target.dataset.star) {
      var n = Number(e.target.dataset.star);
      S.updateRecord(table.id, rec.id, defineValue(f.id, rec[f.id] === n ? 0 : n));
      ctx.refresh();
      return;
    }
    var already = sel.recId === rec.id && sel.fieldId === f.id;
    sel = { recId: rec.id, fieldId: f.id };
    markSelection(td);
    if (already) openEditor(td, table, f, rec, ctx);
  }

  function defineValue(id, value) { var o = {}; o[id] = value; return o; }

  function markSelection(td) {
    Array.prototype.forEach.call(document.querySelectorAll('.gcell.is-sel'), function (n) {
      n.classList.remove('is-sel');
    });
    if (td) td.classList.add('is-sel');
  }

  function openEditor(td, table, f, rec, ctx) {
    if (editing) return;
    if (f.type === 'checkbox' || f.type === 'rating') return;
    editing = true;
    var original = td.innerHTML;
    F.edit(td, f, rec[f.id], function (value) {
      editing = false;
      S.updateRecord(table.id, rec.id, defineValue(f.id, value));
      ctx.refresh();
    }, function () {
      editing = false;
      td.innerHTML = original;
    });
  }

  /* ---------------- redimensionar columnas ---------------- */

  function startResize(e, table, f, ctx) {
    e.preventDefault();
    var startX = e.clientX, startW = f.width || 160;
    document.body.classList.add('is-resizing');
    function move(ev) {
      var w = Math.max(80, startW + (ev.clientX - startX));
      f.width = w;
      var idx = table.fields.indexOf(f);
      var col = document.querySelectorAll('.grid col')[idx + 1];
      if (col) col.style.width = w + 'px';
    }
    function up() {
      document.removeEventListener('mousemove', move);
      document.removeEventListener('mouseup', up);
      document.body.classList.remove('is-resizing');
      S.save();
    }
    document.addEventListener('mousemove', move);
    document.addEventListener('mouseup', up);
  }

  /* ---------------- menú de campo ---------------- */

  function fieldMenu(anchor, table, view, f, ctx) {
    var sorts = view.sorts || [];
    AE.ui.menu(anchor, [
      { icon: '↑', label: 'Ordenar A → Z', onClick: function () { S.updateView(view.id, { sorts: [{ fieldId: f.id, dir: 'asc' }] }); ctx.refresh(); } },
      { icon: '↓', label: 'Ordenar Z → A', onClick: function () { S.updateView(view.id, { sorts: [{ fieldId: f.id, dir: 'desc' }] }); ctx.refresh(); } },
      sorts.length ? { icon: '⤫', label: 'Quitar orden', onClick: function () { S.updateView(view.id, { sorts: [] }); ctx.refresh(); } } : null,
      { separator: true },
      { icon: '⿴', label: view.groupBy === f.id ? 'Desagrupar' : 'Agrupar por este campo',
        onClick: function () { S.updateView(view.id, { groupBy: view.groupBy === f.id ? null : f.id }); ctx.refresh(); } },
      { icon: '⚑', label: 'Filtrar por este campo', onClick: function () { AE.toolbar.addFilter(view.id, f.id); ctx.refresh(); } },
      { separator: true },
      { icon: '✎', label: 'Editar campo', onClick: function () { AE.fieldEditor.open(table.id, f.id, ctx.refresh, anchor); } },
      { icon: '👁', label: 'Ocultar campo', onClick: function () {
        S.updateView(view.id, { hidden: (view.hidden || []).concat([f.id]) }); ctx.refresh();
      } },
      table.primary === f.id ? null : {
        icon: '🗑', label: 'Eliminar campo', danger: true,
        onClick: function () {
          AE.ui.confirm('¿Eliminar el campo "' + f.name + '" y todos sus datos?', { danger: true, ok: 'Eliminar' })
            .then(function (ok) { if (ok) { S.deleteField(table.id, f.id); ctx.refresh(); } });
        }
      }
    ], { align: 'right' });
  }

  /* ---------------- barra de acciones en lote ---------------- */

  function renderBulkBar(host, table, ctx) {
    var ids = Object.keys(checked);
    if (!ids.length) return;
    host.appendChild(el('div', { class: 'bulkbar' }, [
      el('span', { text: ids.length + ' seleccionados' }),
      el('button', {
        class: 'btn2', text: 'Duplicar',
        onclick: function () { ids.forEach(function (id) { S.duplicateRecord(table.id, id); }); checked = {}; ctx.refresh(); }
      }),
      el('button', {
        class: 'btn2 btn2--danger', text: 'Eliminar',
        onclick: function () {
          AE.ui.confirm('¿Eliminar ' + ids.length + ' registros?', { danger: true, ok: 'Eliminar' }).then(function (ok) {
            if (!ok) return;
            ids.forEach(function (id) { S.deleteRecord(table.id, id); });
            checked = {}; ctx.refresh();
          });
        }
      }),
      el('button', { class: 'btn2', text: 'Cancelar', onclick: function () { checked = {}; ctx.refresh(); } })
    ]));
  }

  /* ---------------- teclado ---------------- */

  document.addEventListener('keydown', function (e) {
    if (editing || !sel.recId) return;
    var active = document.activeElement;
    if (active && /INPUT|TEXTAREA|SELECT/.test(active.tagName)) return;
    var td = document.querySelector('tr[data-rec="' + sel.recId + '"] td[data-field="' + sel.fieldId + '"]');
    if (!td) return;
    var tr = td.parentNode;

    function moveTo(node) {
      if (!node) return;
      e.preventDefault();
      sel.recId = node.parentNode.dataset.rec || sel.recId;
      sel.fieldId = node.dataset.field;
      markSelection(node);
      node.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    }

    if (e.key === 'ArrowRight') moveTo(nextCell(td, 1));
    else if (e.key === 'ArrowLeft') moveTo(nextCell(td, -1));
    else if (e.key === 'ArrowDown') moveTo(sameColumn(tr, td, 1));
    else if (e.key === 'ArrowUp') moveTo(sameColumn(tr, td, -1));
    else if (e.key === 'Enter') { e.preventDefault(); td.dispatchEvent(new MouseEvent('dblclick', { bubbles: true })); }
  });

  function nextCell(td, dir) {
    var node = dir > 0 ? td.nextElementSibling : td.previousElementSibling;
    while (node && (!node.dataset.field)) node = dir > 0 ? node.nextElementSibling : node.previousElementSibling;
    return node;
  }

  function sameColumn(tr, td, dir) {
    var idx = Array.prototype.indexOf.call(tr.children, td);
    var row = dir > 0 ? tr.nextElementSibling : tr.previousElementSibling;
    while (row && !row.dataset.rec) row = dir > 0 ? row.nextElementSibling : row.previousElementSibling;
    return row ? row.children[idx] : null;
  }

  AE.grid = {
    render: render,
    resetSelection: function () { sel = { recId: null, fieldId: null }; checked = {}; }
  };
})(window.AE);
