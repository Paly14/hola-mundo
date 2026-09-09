/* ===================================================================
   Alpha CRM — piezas de interfaz: modal, popover, toast, confirmación
   =================================================================== */
(function (AE) {
  'use strict';

  var U = AE.utils, el = U.el;
  var openPopover = null;

  /* ---------------- toast ---------------- */

  function toast(message, kind) {
    var host = document.getElementById('toastHost');
    if (!host) return;
    var node = el('div', { class: 'toast toast--' + (kind || 'ok'), text: message });
    host.appendChild(node);
    setTimeout(function () { node.classList.add('is-out'); }, 2600);
    setTimeout(function () { node.remove(); }, 3000);
  }

  /* ---------------- modal ---------------- */

  function modal(opts) {
    var body = el('div', { class: 'modal__body' });
    if (typeof opts.body === 'string') body.innerHTML = opts.body;
    else if (opts.body) body.appendChild(opts.body);

    var foot = el('div', { class: 'modal__foot' });
    (opts.actions || []).forEach(function (a) {
      foot.appendChild(el('button', {
        class: 'btn2 ' + (a.kind ? 'btn2--' + a.kind : ''),
        text: a.label,
        onclick: function () { if (!a.onClick || a.onClick(api) !== false) api.close(); }
      }));
    });

    var card = el('div', { class: 'modal__card' + (opts.wide ? ' modal__card--wide' : '') }, [
      el('div', { class: 'modal__head' }, [
        el('h3', { class: 'modal__title', text: opts.title || '' }),
        el('button', { class: 'icon-btn', html: '&times;', title: 'Cerrar', onclick: function () { api.close(); } })
      ]),
      body,
      (opts.actions || []).length ? foot : null
    ]);

    var back = el('div', { class: 'modal' }, [card]);
    back.addEventListener('mousedown', function (e) { if (e.target === back) api.close(); });
    document.body.appendChild(back);
    document.body.classList.add('is-locked');

    function onKey(e) { if (e.key === 'Escape') api.close(); }
    document.addEventListener('keydown', onKey);

    var api = {
      el: back, body: body,
      close: function () {
        document.removeEventListener('keydown', onKey);
        back.remove();
        if (!document.querySelector('.modal')) document.body.classList.remove('is-locked');
        if (opts.onClose) opts.onClose();
      }
    };
    setTimeout(function () {
      var first = body.querySelector('input, textarea, select');
      if (first && opts.autofocus !== false) first.focus();
    }, 30);
    return api;
  }

  function confirm(message, opts) {
    opts = opts || {};
    return new Promise(function (resolve) {
      var done = false;
      modal({
        title: opts.title || 'Confirmar',
        body: el('p', { class: 'muted', text: message }),
        actions: [
          { label: 'Cancelar', onClick: function () { done = true; resolve(false); } },
          { label: opts.ok || 'Sí, continuar', kind: opts.danger ? 'danger' : 'primary', onClick: function () { done = true; resolve(true); } }
        ],
        onClose: function () { if (!done) resolve(false); }
      });
    });
  }

  /* ---------------- popover ---------------- */

  function closePopover() {
    if (openPopover) { openPopover.remove(); openPopover = null; }
  }

  function popover(anchor, content, opts) {
    closePopover();
    opts = opts || {};
    var pop = el('div', { class: 'popover' + (opts.class ? ' ' + opts.class : '') }, [content]);
    document.body.appendChild(pop);

    var r = anchor.getBoundingClientRect();
    var w = pop.offsetWidth, h = pop.offsetHeight;
    var left = opts.align === 'right' ? r.right - w : r.left;
    left = Math.max(8, Math.min(left, window.innerWidth - w - 8));
    var top = r.bottom + 6;
    if (top + h > window.innerHeight - 8) top = Math.max(8, r.top - h - 6);
    pop.style.left = left + 'px';
    pop.style.top = top + 'px';

    openPopover = pop;
    setTimeout(function () {
      document.addEventListener('mousedown', outside, true);
      document.addEventListener('keydown', onEsc, true);
    }, 0);

    function outside(e) {
      if (pop.contains(e.target) || anchor.contains(e.target)) return;
      cleanup();
    }
    function onEsc(e) { if (e.key === 'Escape') { e.stopPropagation(); cleanup(); } }
    function cleanup() {
      document.removeEventListener('mousedown', outside, true);
      document.removeEventListener('keydown', onEsc, true);
      closePopover();
      if (opts.onClose) opts.onClose();
    }

    pop.close = cleanup;
    var focusable = pop.querySelector('input, button');
    if (focusable && opts.autofocus !== false) focusable.focus();
    return pop;
  }

  /* Menú simple: [{label, icon, danger, onClick, separator}] */
  function menu(anchor, items, opts) {
    var list = el('div', { class: 'menu' });
    items.forEach(function (item) {
      if (!item) return;
      if (item.separator) { list.appendChild(el('div', { class: 'menu__sep' })); return; }
      list.appendChild(el('button', {
        class: 'menu__item' + (item.danger ? ' menu__item--danger' : '') + (item.active ? ' is-active' : ''),
        onclick: function () { closePopover(); item.onClick && item.onClick(); }
      }, [
        el('span', { class: 'menu__ico', text: item.icon || '' }),
        el('span', { text: item.label })
      ]));
    });
    return popover(anchor, list, opts);
  }

  /* Campo de formulario genérico para modales */
  function formRow(label, control, hint) {
    return el('label', { class: 'frow' }, [
      el('span', { class: 'frow__label', text: label }),
      control,
      hint ? el('span', { class: 'frow__hint', text: hint }) : null
    ]);
  }

  AE.ui = {
    toast: toast, modal: modal, confirm: confirm,
    popover: popover, closePopover: closePopover, menu: menu, formRow: formRow
  };
})(window.AE);
