/* ===================================================================
   Alpha CRM — tipos de campo: cómo se muestran, editan y guardan
   =================================================================== */
(function (AE) {
  'use strict';

  var U = AE.utils, el = U.el;

  var TYPES = [
    { id: 'text', name: 'Texto', icon: 'A' },
    { id: 'longtext', name: 'Texto largo', icon: '¶' },
    { id: 'number', name: 'Número', icon: '#' },
    { id: 'currency', name: 'Moneda', icon: '$' },
    { id: 'percent', name: 'Porcentaje', icon: '%' },
    { id: 'select', name: 'Selección', icon: '▾' },
    { id: 'multiselect', name: 'Selección múltiple', icon: '≡' },
    { id: 'date', name: 'Fecha', icon: '📅' },
    { id: 'datetime', name: 'Fecha y hora', icon: '🕒' },
    { id: 'checkbox', name: 'Casilla', icon: '☑' },
    { id: 'url', name: 'Link', icon: '🔗' },
    { id: 'email', name: 'Email', icon: '@' },
    { id: 'phone', name: 'Teléfono', icon: '📱' },
    { id: 'rating', name: 'Puntuación', icon: '★' },
    { id: 'link', name: 'Vínculo a otra tabla', icon: '⇄' }
  ];

  function typeInfo(type) {
    return TYPES.filter(function (t) { return t.id === type; })[0] || TYPES[0];
  }

  function colorOf(f, name) {
    var opt = (AE.store.optionsOf(f) || []).filter(function (o) { return o.name === name; })[0];
    return (opt && opt.color) || U.colorFor(name);
  }

  /* ---------------- texto plano (búsqueda, csv, tarjetas) ---------------- */

  function text(f, value) {
    if (value == null || value === '') return '';
    switch (f.type) {
      case 'currency': return U.money(value, AE.store.settings().currency);
      case 'percent': return U.num(value) + '%';
      case 'number': return U.num(value);
      case 'date': return U.formatDate(value);
      case 'datetime': return U.formatDateTime(value);
      case 'checkbox': return value ? 'Sí' : 'No';
      case 'multiselect': return (Array.isArray(value) ? value : [value]).join(', ');
      case 'link': return AE.store.titleOf(f.linkTable, value);
      case 'rating': return '★'.repeat(Number(value) || 0);
      default: return String(value);
    }
  }

  /* ---------------- HTML de celda ---------------- */

  function chip(name, color) {
    return '<span class="chip" style="--chip:' + color + '">' + U.esc(name) + '</span>';
  }

  function cell(f, value, rec) {
    var empty = value == null || value === '' || (Array.isArray(value) && !value.length);
    switch (f.type) {
      case 'checkbox':
        return '<span class="check' + (value ? ' is-on' : '') + '">' + (value ? '✓' : '') + '</span>';
      case 'rating':
        var n = Number(value) || 0, out = '';
        for (var i = 1; i <= 5; i++) out += '<span class="star' + (i <= n ? ' is-on' : '') + '" data-star="' + i + '">★</span>';
        return '<span class="stars">' + out + '</span>';
      case 'select':
        return empty ? '' : chip(value, colorOf(f, value));
      case 'multiselect':
        return (Array.isArray(value) ? value : []).map(function (v) { return chip(v, colorOf(f, v)); }).join(' ');
      case 'url':
        if (empty) return '';
        return '<a class="cell-link" href="' + U.esc(value) + '" target="_blank" rel="noopener">' +
          U.esc(String(value).replace(/^https?:\/\//, '').slice(0, 40)) + '</a>';
      case 'email':
        return empty ? '' : '<a class="cell-link" href="mailto:' + U.esc(value) + '">' + U.esc(value) + '</a>';
      case 'phone':
        if (empty) return '';
        var wa = String(value).replace(/[^0-9]/g, '');
        return '<a class="cell-link" href="https://wa.me/' + wa + '" target="_blank" rel="noopener" title="Abrir WhatsApp">' + U.esc(value) + '</a>';
      case 'currency':
      case 'percent':
      case 'number':
        return empty ? '' : '<span class="num">' + U.esc(text(f, value)) + '</span>';
      case 'link':
        return empty ? '' : '<span class="chip chip--link">' + U.esc(AE.store.titleOf(f.linkTable, value) || '—') + '</span>';
      case 'longtext':
        return empty ? '' : '<span class="cell-long">' + U.esc(value) + '</span>';
      default:
        return U.esc(text(f, value));
    }
  }

  /* ---------------- normalización al guardar ---------------- */

  function parse(f, raw) {
    if (raw == null) return null;
    switch (f.type) {
      case 'number': case 'currency': case 'percent': case 'rating':
        return U.toNumber(raw);
      case 'checkbox':
        if (typeof raw === 'boolean') return raw;
        return ['si', 'sí', 'true', '1', 'x', 'yes'].indexOf(String(raw).trim().toLowerCase()) >= 0;
      case 'multiselect':
        if (Array.isArray(raw)) return raw;
        return String(raw).split(/[,;]/).map(function (s) { return s.trim(); }).filter(Boolean);
      case 'date':
        return raw ? String(raw).slice(0, 10) : '';
      case 'datetime':
        return raw ? String(raw).slice(0, 16) : '';
      default:
        return typeof raw === 'string' ? raw.trim() : raw;
    }
  }

  /* ---------------- edición ---------------- */

  var INPUT_TYPE = {
    number: 'number', currency: 'number', percent: 'number',
    date: 'date', datetime: 'datetime-local', email: 'email', url: 'url', phone: 'tel'
  };

  /* Devuelve true si el tipo se edita con un click directo, sin editor */
  function isToggle(f) { return f.type === 'checkbox' || f.type === 'rating'; }

  /**
   * Abre el editor del campo sobre `anchor`.
   * commit(nuevoValor) se llama al confirmar; cancel() al descartar.
   */
  function edit(anchor, f, value, commit, cancel) {
    cancel = cancel || function () {};

    if (f.type === 'select' || f.type === 'multiselect') return editSelect(anchor, f, value, commit, cancel);
    if (f.type === 'link') return editLink(anchor, f, value, commit, cancel);
    if (f.type === 'longtext') return editLong(anchor, f, value, commit, cancel);

    var input = el('input', {
      class: 'cell-input',
      type: INPUT_TYPE[f.type] || 'text',
      value: value == null ? '' : value
    });
    anchor.innerHTML = '';
    anchor.appendChild(input);
    input.focus();
    if (input.select) input.select();

    var done = false;
    function ok() { if (done) return; done = true; commit(parse(f, input.value)); }
    input.addEventListener('blur', ok);
    input.addEventListener('keydown', function (e) {
      // stopPropagation: si no, la grilla vuelve a abrir el editor al burbujear la tecla
      if (e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); ok(); }
      else if (e.key === 'Escape') { e.stopPropagation(); done = true; cancel(); }
      else if (e.key === 'Tab') { ok(); }
      else e.stopPropagation();
    });
    return input;
  }

  function editLong(anchor, f, value, commit, cancel) {
    var area = el('textarea', { class: 'cell-area', rows: 6, text: value == null ? '' : String(value) });
    var box = el('div', { class: 'editor-box' }, [
      area,
      el('div', { class: 'editor-box__foot' }, [
        el('span', { class: 'muted small', text: 'Ctrl + Enter para guardar' }),
        el('button', { class: 'btn2 btn2--primary', text: 'Guardar', onclick: function () { save(); } })
      ])
    ]);
    var pop = AE.ui.popover(anchor, box, { onClose: cancel });
    area.focus();
    function save() { AE.ui.closePopover(); commit(area.value); }
    area.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); save(); }
    });
    return pop;
  }

  function editSelect(anchor, f, value, commit, cancel) {
    var multi = f.type === 'multiselect';
    var current = multi ? (Array.isArray(value) ? value.slice() : []) : value;
    var options = AE.store.optionsOf(f).slice();
    var search = el('input', { class: 'pop-search', placeholder: 'Buscar o crear…' });
    var list = el('div', { class: 'pop-list' });
    var box = el('div', { class: 'pop-select' }, [search, list]);

    function draw() {
      var q = search.value.trim().toLowerCase();
      list.innerHTML = '';
      var shown = options.filter(function (o) { return !q || o.name.toLowerCase().indexOf(q) >= 0; });

      if (!multi) {
        list.appendChild(el('button', {
          class: 'pop-opt', onclick: function () { pick(''); }
        }, [el('span', { class: 'muted', text: 'Vaciar' })]));
      }

      shown.forEach(function (o) {
        var on = multi ? current.indexOf(o.name) >= 0 : current === o.name;
        list.appendChild(el('button', {
          class: 'pop-opt' + (on ? ' is-on' : ''), onclick: function () { pick(o.name); }
        }, [
          el('span', { class: 'chip', style: '--chip:' + (o.color || U.colorFor(o.name)), text: o.name }),
          on ? el('span', { class: 'pop-opt__tick', text: '✓' }) : null
        ]));
      });

      var exact = options.some(function (o) { return o.name.toLowerCase() === q; });
      if (q && !exact) {
        list.appendChild(el('button', {
          class: 'pop-opt pop-opt--new',
          text: '+ Crear "' + search.value.trim() + '"',
          onclick: function () { createOption(search.value.trim()); }
        }));
      }
    }

    function createOption(name) {
      if (f.optionsFrom) { AE.ui.toast('Este campo toma sus opciones de la tabla Equipo.', 'warn'); return; }
      var f2 = AE.store.field(anchorTable(), f.id);
      (f2.options = f2.options || []).push({ name: name, color: U.colorFor(name) });
      options = AE.store.optionsOf(f2).slice();
      AE.store.save();
      pick(name);
    }

    function anchorTable() { return f._tableId; }

    function pick(name) {
      if (multi) {
        if (!name) return;
        var i = current.indexOf(name);
        if (i >= 0) current.splice(i, 1); else current.push(name);
        draw();
        commit(current.slice());
      } else {
        AE.ui.closePopover();
        commit(name);
      }
    }

    search.addEventListener('input', draw);
    search.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { AE.ui.closePopover(); cancel(); }
    });
    draw();
    return AE.ui.popover(anchor, box, { onClose: cancel });
  }

  function editLink(anchor, f, value, commit, cancel) {
    var rows = AE.store.allRows(f.linkTable);
    var search = el('input', { class: 'pop-search', placeholder: 'Buscar registro…' });
    var list = el('div', { class: 'pop-list' });
    var box = el('div', { class: 'pop-select' }, [search, list]);

    function draw() {
      var q = search.value.trim().toLowerCase();
      list.innerHTML = '';
      list.appendChild(el('button', { class: 'pop-opt', onclick: function () { pick(''); } },
        [el('span', { class: 'muted', text: 'Vaciar' })]));
      rows.filter(function (r) {
        return !q || AE.store.titleOf(f.linkTable, r.id).toLowerCase().indexOf(q) >= 0;
      }).slice(0, 40).forEach(function (r) {
        list.appendChild(el('button', {
          class: 'pop-opt' + (value === r.id ? ' is-on' : ''),
          text: AE.store.titleOf(f.linkTable, r.id),
          onclick: function () { pick(r.id); }
        }));
      });
    }
    function pick(id) { AE.ui.closePopover(); commit(id); }
    search.addEventListener('input', draw);
    draw();
    return AE.ui.popover(anchor, box, { onClose: cancel });
  }

  AE.fields = {
    TYPES: TYPES, typeInfo: typeInfo, text: text, cell: cell, parse: parse,
    edit: edit, isToggle: isToggle, chip: chip, colorOf: colorOf,
    INPUT_TYPE: INPUT_TYPE
  };
})(window.AE);
