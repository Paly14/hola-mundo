/* ===================================================================
   Alpha CRM — utilidades base
   =================================================================== */
window.AE = window.AE || {};

(function (AE) {
  'use strict';

  function uid(prefix) {
    return (prefix || 'id') + '_' +
      Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }

  function slug(text) {
    return String(text || '')
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .toLowerCase().trim()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '') || 'campo';
  }

  function esc(text) {
    return String(text == null ? '' : text)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function deepClone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  /* ---------- números y moneda ---------- */

  function toNumber(value) {
    if (value === '' || value == null) return null;
    if (typeof value === 'number') return isFinite(value) ? value : null;
    var clean = String(value).replace(/[^0-9,.\-]/g, '');
    // "1.234,56" (es) → "1234.56"
    if (/,\d{1,2}$/.test(clean)) clean = clean.replace(/\./g, '').replace(',', '.');
    else clean = clean.replace(/,/g, '');
    var n = parseFloat(clean);
    return isFinite(n) ? n : null;
  }

  function money(value, currency) {
    var n = toNumber(value);
    if (n == null) return '';
    try {
      return new Intl.NumberFormat('es-AR', {
        style: 'currency', currency: currency || 'USD', maximumFractionDigits: 0
      }).format(n);
    } catch (e) {
      return '$' + Math.round(n).toLocaleString('es-AR');
    }
  }

  function moneyShort(value, currency) {
    var n = toNumber(value) || 0;
    var sign = n < 0 ? '-' : '';
    var abs = Math.abs(n);
    var sym = currency === 'ARS' ? '$' : 'US$';
    if (abs >= 1000000) return sign + sym + (abs / 1000000).toFixed(1).replace('.0', '') + 'M';
    if (abs >= 1000) return sign + sym + (abs / 1000).toFixed(1).replace('.0', '') + 'k';
    return sign + sym + Math.round(abs);
  }

  function num(value, decimals) {
    var n = toNumber(value);
    if (n == null) return '';
    return n.toLocaleString('es-AR', {
      minimumFractionDigits: decimals || 0, maximumFractionDigits: decimals == null ? 2 : decimals
    });
  }

  function pct(part, total, decimals) {
    if (!total) return 0;
    var value = (part / total) * 100;
    return decimals == null ? Math.round(value) : Number(value.toFixed(decimals));
  }

  /* ---------- fechas ---------- */

  function today() {
    return new Date().toISOString().slice(0, 10);
  }

  function monthKey(dateish) {
    var d = parseDate(dateish);
    return d ? d.toISOString().slice(0, 7) : '';
  }

  function parseDate(value) {
    if (!value) return null;
    if (value instanceof Date) return isNaN(value) ? null : value;
    var d = new Date(String(value).length <= 10 ? value + 'T12:00:00' : value);
    return isNaN(d) ? null : d;
  }

  function formatDate(value) {
    var d = parseDate(value);
    if (!d) return '';
    return String(d.getDate()).padStart(2, '0') + '/' +
      String(d.getMonth() + 1).padStart(2, '0') + '/' + d.getFullYear();
  }

  function formatDateTime(value) {
    var d = parseDate(value);
    if (!d) return '';
    return formatDate(d) + ' ' + String(d.getHours()).padStart(2, '0') + ':' +
      String(d.getMinutes()).padStart(2, '0');
  }

  function daysBetween(a, b) {
    var da = parseDate(a), db = parseDate(b);
    if (!da || !db) return null;
    return Math.round((db - da) / 86400000);
  }

  function addMonths(key, delta) {
    var parts = String(key).split('-');
    var d = new Date(Number(parts[0]), Number(parts[1]) - 1 + delta, 1);
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
  }

  function monthLabel(key) {
    var names = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    var parts = String(key).split('-');
    var idx = Number(parts[1]) - 1;
    return (names[idx] || '?') + ' ' + String(parts[0]).slice(2);
  }

  function monthProgress(key) {
    var parts = String(key || monthKey(new Date())).split('-');
    var year = Number(parts[0]), month = Number(parts[1]);
    var totalDays = new Date(year, month, 0).getDate();
    var now = new Date();
    var elapsed = (now.getFullYear() === year && now.getMonth() + 1 === month)
      ? now.getDate()
      : (new Date(year, month - 1, 1) > now ? 0 : totalDays);
    return { elapsed: elapsed, total: totalDays, ratio: elapsed / totalDays };
  }

  /* ---------- CSV ---------- */

  function toCSV(rows) {
    return rows.map(function (row) {
      return row.map(function (cell) {
        var text = cell == null ? '' : String(cell);
        return /[",\n;]/.test(text) ? '"' + text.replace(/"/g, '""') + '"' : text;
      }).join(',');
    }).join('\n');
  }

  function download(filename, content, mime) {
    var blob = new Blob(['﻿' + content], { type: (mime || 'text/plain') + ';charset=utf-8' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  }

  /* ---------- DOM ---------- */

  function el(tag, attrs, children) {
    var node = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (key) {
      var value = attrs[key];
      if (value == null || value === false) return;
      if (key === 'class') node.className = value;
      else if (key === 'html') node.innerHTML = value;
      else if (key === 'text') node.textContent = value;
      else if (key.slice(0, 2) === 'on') node.addEventListener(key.slice(2), value);
      else if (key === 'dataset') Object.assign(node.dataset, value);
      else node.setAttribute(key, value === true ? '' : value);
    });
    (children || []).forEach(function (child) {
      if (child) node.appendChild(typeof child === 'string' ? document.createTextNode(child) : child);
    });
    return node;
  }

  function debounce(fn, wait) {
    var timer;
    return function () {
      var args = arguments, self = this;
      clearTimeout(timer);
      timer = setTimeout(function () { fn.apply(self, args); }, wait || 200);
    };
  }

  /* Color estable a partir de un texto (para chips de opciones) */
  var PALETTE = [
    '#ff9248', '#5b9dff', '#3ec9a7', '#f2c14e', '#c084fc',
    '#f472b6', '#38bdf8', '#a3b18a', '#fb7185', '#94a3b8'
  ];
  function colorFor(text) {
    var sum = 0, str = String(text || '');
    for (var i = 0; i < str.length; i++) sum = (sum * 31 + str.charCodeAt(i)) >>> 0;
    return PALETTE[sum % PALETTE.length];
  }

  /* ---------- SHA-256 (para guardar claves sin dejarlas en texto plano) ----------
     Implementación propia y sincrónica: funciona igual abriendo el archivo
     local o desde un servidor, sin depender de crypto.subtle.            */
  function sha256(input) {
    var ascii = unescape(encodeURIComponent(String(input == null ? '' : input)));
    function rrot(v, a) { return (v >>> a) | (v << (32 - a)); }
    var maxWord = Math.pow(2, 32), out = '';
    var words = [], bitLength = ascii.length * 8;
    var hash = [], k = [], primeCounter = 0, composite = {};
    var i, j;

    for (var candidate = 2; primeCounter < 64; candidate++) {
      if (!composite[candidate]) {
        for (i = 0; i < 313; i += candidate) composite[i] = candidate;
        hash[primeCounter] = (Math.pow(candidate, 0.5) * maxWord) | 0;
        k[primeCounter++] = (Math.pow(candidate, 1 / 3) * maxWord) | 0;
      }
    }
    hash = hash.slice(0, 8);

    ascii += '\x80';
    while (ascii.length % 64 - 56) ascii += '\x00';
    for (i = 0; i < ascii.length; i++) {
      j = ascii.charCodeAt(i);
      if (j >> 8) return null;
      words[i >> 2] |= j << ((3 - i) % 4) * 8;
    }
    words[words.length] = (bitLength / maxWord) | 0;
    words[words.length] = bitLength;

    for (var pos = 0; pos < words.length;) {
      var w = words.slice(pos, pos += 16);
      var old = hash.slice(0, 8);
      for (i = 0; i < 64; i++) {
        var w15 = w[i - 15], w2 = w[i - 2];
        var a = hash[0], e = hash[4];
        var t1 = hash[7] +
          (rrot(e, 6) ^ rrot(e, 11) ^ rrot(e, 25)) +
          ((e & hash[5]) ^ (~e & hash[6])) + k[i] +
          (w[i] = (i < 16) ? (w[i] | 0) : (
            w[i - 16] + (rrot(w15, 7) ^ rrot(w15, 18) ^ (w15 >>> 3)) +
            w[i - 7] + (rrot(w2, 17) ^ rrot(w2, 19) ^ (w2 >>> 10))
          ) | 0);
        var t2 = (rrot(a, 2) ^ rrot(a, 13) ^ rrot(a, 22)) +
          ((a & hash[1]) ^ (a & hash[2]) ^ (hash[1] & hash[2]));
        hash = [(t1 + t2) | 0].concat(hash);
        hash[4] = (hash[4] + t1) | 0;
      }
      for (i = 0; i < 8; i++) hash[i] = (hash[i] + old[i]) | 0;
      hash = hash.slice(0, 8);
    }

    for (i = 0; i < 8; i++) {
      for (j = 3; j + 1; j--) {
        var b = (hash[i] >> (j * 8)) & 255;
        out += ((b < 16) ? '0' : '') + b.toString(16);
      }
    }
    return out;
  }

  AE.utils = {
    uid: uid, slug: slug, esc: esc, deepClone: deepClone,
    toNumber: toNumber, money: money, moneyShort: moneyShort, num: num, pct: pct,
    today: today, monthKey: monthKey, parseDate: parseDate, formatDate: formatDate,
    formatDateTime: formatDateTime, daysBetween: daysBetween, addMonths: addMonths,
    monthLabel: monthLabel, monthProgress: monthProgress,
    toCSV: toCSV, download: download, el: el, debounce: debounce,
    colorFor: colorFor, PALETTE: PALETTE, sha256: sha256
  };
})(window.AE);
