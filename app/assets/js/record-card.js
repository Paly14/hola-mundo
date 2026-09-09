/* ===================================================================
   Alpha CRM — ficha ampliada de un registro
   =================================================================== */
(function (AE) {
  'use strict';

  var U = AE.utils, el = U.el, S = AE.store, F = AE.fields;

  function open(tableId, recId, onChange) {
    var table = S.table(tableId);
    var rec = S.record(tableId, recId);
    if (!rec) return;
    var changed = false;

    function set(fieldId, value) {
      var patch = {};
      patch[fieldId] = value;
      S.updateRecord(tableId, recId, patch);
      changed = true;
    }

    var body = el('div', { class: 'card-form' });
    table.fields.forEach(function (f) {
      body.appendChild(AE.ui.formRow(f.name, control(f, rec, set), f.hint));
    });

    var extra = el('div', { class: 'card-extra' });
    if (tableId === 'leads') extra.appendChild(actividadesPanel(rec, function () { changed = true; }));

    var m = AE.ui.modal({
      title: S.titleOf(tableId, recId) || 'Registro',
      wide: true,
      body: el('div', { class: 'card-wrap' }, [quickActions(tableId, rec), body, extra]),
      actions: [
        {
          label: 'Duplicar', onClick: function () {
            S.duplicateRecord(tableId, recId);
            AE.ui.toast('Registro duplicado');
            changed = true;
          }
        },
        {
          label: 'Eliminar', kind: 'danger', onClick: function () {
            AE.ui.confirm('¿Eliminar este registro?', { danger: true, ok: 'Eliminar' }).then(function (ok) {
              if (!ok) return;
              S.deleteRecord(tableId, recId);
              changed = true;
              m.close();
              if (onChange) onChange();
            });
            return false;
          }
        },
        { label: 'Listo', kind: 'primary' }
      ],
      onClose: function () { if (changed && onChange) onChange(); }
    });
    return m;
  }

  function quickActions(tableId, rec) {
    if (tableId !== 'leads') return null;
    var wa = String(rec.telefono || '').replace(/[^0-9]/g, '');
    var row = el('div', { class: 'quick' });
    if (wa) row.appendChild(el('a', { class: 'btn2 btn2--wa', href: 'https://wa.me/' + wa, target: '_blank', rel: 'noopener', text: 'WhatsApp' }));
    if (rec.email) row.appendChild(el('a', { class: 'btn2', href: 'mailto:' + rec.email, text: 'Email' }));
    if (rec.grabacion) row.appendChild(el('a', { class: 'btn2', href: rec.grabacion, target: '_blank', rel: 'noopener', text: 'Grabación' }));
    return row.children.length ? row : null;
  }

  /* ---------------- controles por tipo ---------------- */

  function control(f, rec, set) {
    var value = rec[f.id];

    if (f.type === 'longtext') {
      var area = el('textarea', { class: 'inp', rows: 3, text: value == null ? '' : String(value) });
      area.addEventListener('change', function () { set(f.id, area.value); });
      return area;
    }

    if (f.type === 'checkbox') {
      var box = el('input', { class: 'inp-check', type: 'checkbox', checked: !!value });
      box.addEventListener('change', function () { set(f.id, box.checked); });
      return box;
    }

    if (f.type === 'rating') {
      var stars = el('div', { class: 'stars stars--big' });
      for (var i = 1; i <= 5; i++) {
        (function (n) {
          stars.appendChild(el('span', {
            class: 'star' + (n <= (Number(value) || 0) ? ' is-on' : ''), text: '★',
            onclick: function () {
              set(f.id, n);
              Array.prototype.forEach.call(stars.children, function (s, idx) {
                s.classList.toggle('is-on', idx < n);
              });
            }
          }));
        })(i);
      }
      return stars;
    }

    if (f.type === 'select') {
      var select = el('select', { class: 'inp' });
      select.appendChild(el('option', { value: '', text: '—' }));
      S.optionsOf(f).forEach(function (o) {
        select.appendChild(el('option', { value: o.name, text: o.name, selected: value === o.name }));
      });
      select.value = value == null ? '' : value;
      select.addEventListener('change', function () { set(f.id, select.value); });
      return select;
    }

    if (f.type === 'multiselect') {
      var current = Array.isArray(value) ? value.slice() : [];
      var wrap = el('div', { class: 'multi' });
      S.optionsOf(f).forEach(function (o) {
        var on = current.indexOf(o.name) >= 0;
        wrap.appendChild(el('button', {
          class: 'chip chip--btn' + (on ? ' is-on' : ''), style: '--chip:' + (o.color || U.colorFor(o.name)),
          text: o.name,
          onclick: function (e) {
            var btn = e.currentTarget;
            var i = current.indexOf(o.name);
            if (i >= 0) current.splice(i, 1); else current.push(o.name);
            btn.classList.toggle('is-on');
            set(f.id, current.slice());
          }
        }));
      });
      return wrap;
    }

    if (f.type === 'link') {
      var linkSel = el('select', { class: 'inp' });
      linkSel.appendChild(el('option', { value: '', text: '—' }));
      S.allRows(f.linkTable).forEach(function (r) {
        linkSel.appendChild(el('option', { value: r.id, text: S.titleOf(f.linkTable, r.id) }));
      });
      linkSel.value = value || '';
      linkSel.addEventListener('change', function () { set(f.id, linkSel.value); });
      return linkSel;
    }

    var input = el('input', {
      class: 'inp',
      type: F.INPUT_TYPE[f.type] || 'text',
      value: value == null ? '' : value
    });
    input.addEventListener('change', function () { set(f.id, F.parse(f, input.value)); });
    return input;
  }

  /* ---------------- actividades del lead ---------------- */

  function actividadesPanel(lead, onChange) {
    var box = el('div', { class: 'acts' });

    function draw() {
      box.innerHTML = '';
      box.appendChild(el('h4', { class: 'acts__title', text: 'Actividad' }));

      var lista = S.table('actividades').records
        .filter(function (a) { return a.lead === lead.id; })
        .sort(function (a, b) { return (U.parseDate(b.fecha) || 0) - (U.parseDate(a.fecha) || 0); });

      if (!lista.length) box.appendChild(el('p', { class: 'muted small', text: 'Todavía no hay actividad registrada.' }));

      lista.forEach(function (a) {
        box.appendChild(el('div', { class: 'act' }, [
          el('span', { class: 'act__date', text: U.formatDateTime(a.fecha) }),
          el('span', { class: 'chip', style: '--chip:' + U.colorFor(a.tipo), text: a.tipo || '—' }),
          el('span', { class: 'act__text', text: a.detalle || '' }),
          el('span', { class: 'act__who', text: a.responsable || '' }),
          el('button', {
            class: 'icon-btn', html: '&times;', title: 'Borrar',
            onclick: function () { S.deleteRecord('actividades', a.id); onChange(); draw(); }
          })
        ]));
      });

      var tipo = el('select', { class: 'inp inp--sm' });
      S.optionsOf(S.field('actividades', 'tipo')).forEach(function (o) {
        tipo.appendChild(el('option', { value: o.name, text: o.name }));
      });
      var resultado = el('select', { class: 'inp inp--sm' });
      S.optionsOf(S.field('actividades', 'resultado')).forEach(function (o) {
        resultado.appendChild(el('option', { value: o.name, text: o.name }));
      });
      var detalle = el('input', { class: 'inp inp--sm', placeholder: '¿Qué pasó en este contacto?' });

      box.appendChild(el('div', { class: 'acts__new' }, [
        tipo, resultado, detalle,
        el('button', {
          class: 'btn2 btn2--primary', text: 'Registrar',
          onclick: function () {
            if (!detalle.value.trim()) { AE.ui.toast('Escribí un detalle', 'warn'); return; }
            S.createRecord('actividades', {
              fecha: new Date().toISOString().slice(0, 16),
              lead: lead.id, tipo: tipo.value, resultado: resultado.value,
              responsable: S.settings().usuario, detalle: detalle.value.trim()
            });
            onChange();
            draw();
          }
        })
      ]));
    }

    draw();
    return box;
  }

  AE.recordCard = { open: open };
})(window.AE);
