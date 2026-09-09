/* ===================================================================
   Alpha CRM — vista Kanban (pipeline arrastrable)
   =================================================================== */
(function (AE) {
  'use strict';

  var U = AE.utils, el = U.el, S = AE.store, F = AE.fields;
  var dragging = null;

  function render(host, viewId, ctx) {
    var view = S.view(viewId);
    var table = S.table(view.tableId);
    var campos = S.visibleFields(table.id);
    var stackField = S.field(table.id, view.stackBy) ||
      campos.filter(function (f) { return f.type === 'select'; })[0];

    host.innerHTML = '';
    if (!stackField) {
      host.appendChild(el('div', { class: 'empty' }, [
        el('p', { text: 'Esta tabla no tiene ningún campo de selección para armar el pipeline.' })
      ]));
      return;
    }
    if (view.stackBy !== stackField.id) S.updateView(view.id, { stackBy: stackField.id });

    var rows = S.rowsOf(viewId, ctx && ctx.search);
    var options = S.optionsOf(stackField).slice();
    var board = el('div', { class: 'kanban' });

    var stacks = options.map(function (o) { return { name: o.name, color: o.color || U.colorFor(o.name) }; });
    stacks.push({ name: '', color: '#cbd5e1', label: 'Sin asignar' });

    stacks.forEach(function (stack) {
      var cards = rows.filter(function (r) {
        return (r[stackField.id] || '') === stack.name;
      });
      board.appendChild(column(table, view, stackField, stack, cards, ctx));
    });

    host.appendChild(board);
  }

  function column(table, view, stackField, stack, cards, ctx) {
    var money = S.visibleFields(table.id).filter(function (f) { return f.type === 'currency'; })[0];
    var total = money ? cards.reduce(function (a, r) { return a + (U.toNumber(r[money.id]) || 0); }, 0) : 0;

    var list = el('div', { class: 'kcol__list' });
    cards.forEach(function (rec) { list.appendChild(card(table, view, rec, ctx)); });

    var col = el('div', { class: 'kcol', dataset: { stack: stack.name } }, [
      el('div', { class: 'kcol__head' }, [
        el('span', { class: 'chip', style: '--chip:' + stack.color, text: stack.label || stack.name }),
        el('span', { class: 'kcol__count', text: cards.length }),
        total ? el('span', { class: 'kcol__sum', text: U.moneyShort(total, S.settings().currency) }) : null
      ]),
      list,
      el('button', {
        class: 'kcol__add', text: '+ Agregar',
        onclick: function () {
          var values = AE.defaults.para(table.id);
          values[stackField.id] = stack.name;
          var rec = S.createRecord(table.id, values);
          AE.recordCard.open(table.id, rec.id, ctx.refresh);
        }
      })
    ]);

    col.addEventListener('dragover', function (e) { e.preventDefault(); col.classList.add('is-over'); });
    col.addEventListener('dragleave', function () { col.classList.remove('is-over'); });
    col.addEventListener('drop', function (e) {
      e.preventDefault();
      col.classList.remove('is-over');
      if (!dragging) return;
      var patch = {};
      patch[stackField.id] = stack.name;
      if (table.id === 'leads' && stackField.id === 'estado') Object.assign(patch, autoFields(stack.name));
      S.updateRecord(table.id, dragging, patch);
      dragging = null;
      ctx.refresh();
    });
    return col;
  }

  /* Al mover un lead de etapa, completamos lo obvio para no tipear de más */
  function autoFields(estado) {
    if (estado === 'Ganado') return { probabilidad: 100 };
    if (estado === 'Perdido') return { probabilidad: 0 };
    if (estado === 'Agendado') return { probabilidad: 45 };
    if (estado === 'Show') return { probabilidad: 60 };
    return {};
  }

  function card(table, view, rec, ctx) {
    var hidden = view.hidden || [];
    var secondary = S.visibleFields(table.id).filter(function (f) {
      return f.id !== table.primary && f.id !== view.stackBy && hidden.indexOf(f.id) < 0;
    }).slice(0, 5);

    var node = el('div', {
      class: 'kcard', draggable: 'true',
      onclick: function () { AE.recordCard.open(table.id, rec.id, ctx.refresh); }
    }, [
      el('div', { class: 'kcard__title', text: S.titleOf(table.id, rec.id) }),
      el('div', {
        class: 'kcard__meta',
        html: secondary.map(function (f) {
          var value = rec[f.id];
          if (value == null || value === '') return '';
          return '<span class="kcard__bit">' + F.cell(f, value, rec) + '</span>';
        }).filter(Boolean).join('')
      })
    ]);

    node.addEventListener('dragstart', function (e) {
      dragging = rec.id;
      node.classList.add('is-dragging');
      e.dataTransfer.effectAllowed = 'move';
      try { e.dataTransfer.setData('text/plain', rec.id); } catch (err) {}
    });
    node.addEventListener('dragend', function () { node.classList.remove('is-dragging'); });
    return node;
  }

  AE.kanban = { render: render };
})(window.AE);
