/* ===================================================================
   Alpha CRM — crear y editar campos (columnas) de una tabla
   =================================================================== */
(function (AE) {
  'use strict';

  var U = AE.utils, el = U.el, S = AE.store, F = AE.fields;

  function open(tableId, fieldId, refresh, anchor) {
    var table = S.table(tableId);
    var existing = fieldId ? S.field(tableId, fieldId) : null;
    var draft = existing
      ? U.deepClone(existing)
      : { name: '', type: 'text', options: [], width: 160 };

    var nameInput = el('input', { class: 'inp', value: draft.name, placeholder: 'Nombre del campo' });

    var typeSelect = el('select', { class: 'inp' });
    F.TYPES.forEach(function (t) {
      typeSelect.appendChild(el('option', { value: t.id, text: t.icon + '  ' + t.name, selected: draft.type === t.id }));
    });
    typeSelect.value = draft.type;

    var extra = el('div', { class: 'fe-extra' });

    function drawExtra() {
      extra.innerHTML = '';
      var type = typeSelect.value;

      if (type === 'select' || type === 'multiselect') {
        if (draft.optionsFrom) {
          extra.appendChild(el('p', { class: 'muted small', text:
            'Las opciones se toman automáticamente de la tabla "' + S.table(draft.optionsFrom.table).name + '".' }));
          return;
        }
        var list = el('div', { class: 'fe-opts' });
        function drawOpts() {
          list.innerHTML = '';
          (draft.options || []).forEach(function (o, i) {
            var color = el('input', { type: 'color', class: 'fe-color', value: o.color || U.colorFor(o.name) });
            color.addEventListener('input', function () { o.color = color.value; });
            var name = el('input', { class: 'inp inp--sm', value: o.name });
            name.addEventListener('input', function () { o.name = name.value; });
            list.appendChild(el('div', { class: 'fe-opt' }, [
              color, name,
              el('button', {
                class: 'icon-btn', html: '&times;', title: 'Quitar',
                onclick: function () { draft.options.splice(i, 1); drawOpts(); }
              })
            ]));
          });
          var add = el('input', { class: 'inp inp--sm', placeholder: '+ Nueva opción (Enter)' });
          add.addEventListener('keydown', function (e) {
            if (e.key !== 'Enter' || !add.value.trim()) return;
            e.preventDefault();
            draft.options = draft.options || [];
            draft.options.push({ name: add.value.trim(), color: U.colorFor(add.value.trim()) });
            drawOpts();
            var inputs = list.querySelectorAll('input.inp--sm');
            if (inputs.length) inputs[inputs.length - 1].focus();
          });
          list.appendChild(add);
        }
        drawOpts();
        extra.appendChild(AE.ui.formRow('Opciones', list));
      }

      if (type === 'link') {
        var sel = el('select', { class: 'inp' });
        S.tables().filter(function (t) { return t.id !== tableId; }).forEach(function (t) {
          sel.appendChild(el('option', { value: t.id, text: t.name, selected: draft.linkTable === t.id }));
        });
        sel.addEventListener('change', function () { draft.linkTable = sel.value; });
        if (!draft.linkTable && sel.options.length) draft.linkTable = sel.value;
        extra.appendChild(AE.ui.formRow('Tabla vinculada', sel));
      }
    }

    typeSelect.addEventListener('change', function () {
      draft.type = typeSelect.value;
      if (['select', 'multiselect'].indexOf(draft.type) >= 0 && !draft.options) draft.options = [];
      drawExtra();
    });
    drawExtra();

    AE.ui.modal({
      title: existing ? 'Editar campo' : 'Nuevo campo',
      body: el('div', {}, [
        AE.ui.formRow('Nombre', nameInput),
        AE.ui.formRow('Tipo', typeSelect),
        extra
      ]),
      actions: [
        { label: 'Cancelar' },
        {
          label: existing ? 'Guardar' : 'Crear campo', kind: 'primary',
          onClick: function () {
            var name = nameInput.value.trim();
            if (!name) { AE.ui.toast('Poné un nombre para el campo', 'warn'); return false; }
            var patch = {
              name: name, type: typeSelect.value,
              options: draft.options || [], linkTable: draft.linkTable
            };
            if (existing) S.updateField(tableId, fieldId, patch);
            else S.addField(tableId, patch);
            if (refresh) refresh();
          }
        }
      ]
    });
  }

  AE.fieldEditor = { open: open };
})(window.AE);
