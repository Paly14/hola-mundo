/* ===================================================================
   Alpha CRM — store: estado, persistencia, CRUD y consultas
   =================================================================== */
(function (AE) {
  'use strict';

  var U = AE.utils;
  var KEY = 'alpha_crm_v1';
  var listeners = [];
  var state = null;

  /* ---------------- persistencia ---------------- */

  function tagFields(base) {
    base.tables.forEach(function (t) {
      t.fields.forEach(function (f) { f._tableId = t.id; });
    });
    return base;
  }

  function blank() {
    return tagFields({
      version: 1,
      tables: U.deepClone(AE.schema.tables).map(function (t) { t.records = []; return t; }),
      views: U.deepClone(AE.schema.views),
      settings: U.deepClone(AE.schema.settings),
      updatedAt: new Date().toISOString()
    });
  }

  function withDemo() {
    var base = blank();
    var demo = AE.seed.build();
    base.tables.forEach(function (t) { t.records = demo[t.id] || []; });
    return base;
  }

  /* Datos migrados de los trackers de Excel (app/assets/js/datos-alpha.js) */
  function withReales() {
    var base = blank();
    var datos = AE.datosIniciales;
    base.tables.forEach(function (t) { t.records = (datos[t.id] || []).slice(); });
    if (datos.objetivos) base.settings.objetivos = datos.objetivos;
    return base;
  }

  function load() {
    var raw;
    try { raw = localStorage.getItem(KEY); } catch (e) { raw = null; }
    if (!raw) {
      state = AE.datosIniciales ? withReales() : withDemo();
      refrescarAlumnos();
      save();
      return state;
    }
    try {
      state = JSON.parse(raw);
      migrate();
    } catch (e) {
      console.warn('No se pudo leer el guardado local, empiezo de cero.', e);
      state = AE.datosIniciales ? withReales() : withDemo();
    }
    refrescarAlumnos();
    return state;
  }

  /* Agrega tablas/campos nuevos del esquema sin pisar los datos guardados */
  function migrate() {
    if (!state.tables) state.tables = [];
    if (!state.views) state.views = [];
    var guardados = state.settings || {};
    state.settings = Object.assign(U.deepClone(AE.schema.settings), guardados);
    /* Si los permisos por defecto cambiaron, se adoptan los nuevos */
    if (guardados.permisosVersion !== AE.schema.settings.permisosVersion) {
      state.settings.permisos = U.deepClone(AE.schema.PERMISOS);
      state.settings.permisosVersion = AE.schema.settings.permisosVersion;
    }
    AE.schema.tables.forEach(function (def) {
      var t = state.tables.filter(function (x) { return x.id === def.id; })[0];
      if (!t) { t = U.deepClone(def); t.records = []; state.tables.push(t); return; }
      def.fields.forEach(function (f) {
        if (!t.fields.some(function (x) { return x.id === f.id; })) t.fields.push(U.deepClone(f));
      });
      if (!t.primary) t.primary = def.primary;
      if (!t.icon) t.icon = def.icon;
    });
    AE.schema.views.forEach(function (def) {
      if (!state.views.some(function (v) { return v.id === def.id; })) state.views.push(U.deepClone(def));
    });
    state.tables.forEach(function (t) {
      if (!Array.isArray(t.records)) t.records = [];
      // marca de origen: los editores de campo la usan para saber a qué tabla pertenece
      t.fields.forEach(function (f) { f._tableId = t.id; });
    });
  }

  var save = U.debounce(function () {
    if (!state) return;
    state.updatedAt = new Date().toISOString();
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch (e) {
      console.error('No se pudo guardar en este navegador', e);
    }
    if (AE.cloud && AE.cloud.push) AE.cloud.push(state);
  }, 250);

  function emit(reason) {
    save();
    listeners.forEach(function (fn) {
      try { fn(reason); } catch (e) { console.error(e); }
    });
  }

  function subscribe(fn) { listeners.push(fn); return function () { listeners = listeners.filter(function (f) { return f !== fn; }); }; }

  /* ---------------- accesores ---------------- */

  function getState() { return state; }
  function settings() { return state.settings; }
  function tables() { return state.tables; }
  function table(id) { return state.tables.filter(function (t) { return t.id === id; })[0]; }
  function views(tableId) { return state.views.filter(function (v) { return v.tableId === tableId; }); }
  function view(id) { return state.views.filter(function (v) { return v.id === id; })[0]; }
  function field(tableId, fieldId) {
    var t = table(tableId);
    return t ? t.fields.filter(function (f) { return f.id === fieldId; })[0] : null;
  }
  function record(tableId, recId) {
    var t = table(tableId);
    return t ? t.records.filter(function (r) { return r.id === recId; })[0] : null;
  }

  /* Opciones de un select: fijas o derivadas de otra tabla (ej. Equipo) */
  function optionsOf(f) {
    if (f && f.optionsFrom) {
      var src = table(f.optionsFrom.table);
      if (!src) return f.options || [];
      var where = f.optionsFrom.where || {};
      return src.records
        .filter(function (r) {
          return Object.keys(where).every(function (k) { return r[k] === where[k]; });
        })
        .map(function (r) { return { name: r[f.optionsFrom.field], color: U.colorFor(r[f.optionsFrom.field]) }; })
        .filter(function (o) { return o.name; });
    }
    return (f && f.options) || [];
  }

  /* ---------------- CRUD registros ---------------- */

  function createRecord(tableId, values, opts) {
    var t = table(tableId);
    if (!t) return null;
    var rec = Object.assign({ id: U.uid('rec'), _createdAt: new Date().toISOString() }, values || {});
    aplicarReglas(tableId, rec, rec);
    if ((opts && opts.at) === 'end') t.records.push(rec); else t.records.unshift(rec);
    if (tableId === 'pagos') { recalcularCobro(rec.lead); recalcularAlumno(rec.alumno); }
    emit('record:create');
    return rec;
  }

  function updateRecord(tableId, recId, patch) {
    var rec = record(tableId, recId);
    if (!rec) return null;
    var leadAnterior = tableId === 'pagos' ? rec.lead : null;
    var alumnoAnterior = tableId === 'pagos' ? rec.alumno : null;
    aplicarReglas(tableId, rec, patch);
    Object.assign(rec, patch);
    rec._updatedAt = new Date().toISOString();
    if (tableId === 'pagos') {
      recalcularCobro(leadAnterior); recalcularCobro(rec.lead);
      recalcularAlumno(alumnoAnterior); recalcularAlumno(rec.alumno);
    }
    emit('record:update');
    return rec;
  }

  function deleteRecord(tableId, recId) {
    var t = table(tableId);
    if (!t) return;
    var rec = record(tableId, recId);
    var lead = rec && tableId === 'pagos' ? rec.lead : null;
    var alumno = rec && tableId === 'pagos' ? rec.alumno : null;
    t.records = t.records.filter(function (r) { return r.id !== recId; });
    if (lead) recalcularCobro(lead);
    if (alumno) recalcularAlumno(alumno);
    emit('record:delete');
  }

  /* Reglas automáticas al guardar, para no tener que tocar dos campos */
  function aplicarReglas(tableId, rec, patch) {
    if (tableId === 'alumnos') {
      setTimeout(function () { recalcularAlumno(rec.id); emit('alumno'); }, 0);
      return;
    }
    if (tableId !== 'tareas') return;
    if ('hecha' in patch) {
      if (patch.hecha) patch.estado = 'Hecha';
      else if ((rec.estado || patch.estado) === 'Hecha') patch.estado = 'Pendiente';
      else if (!rec.estado && !patch.estado) patch.estado = 'Pendiente';
    } else if ('estado' in patch) {
      patch.hecha = patch.estado === 'Hecha';
    }
  }

  /* El cash collected de un cliente sale siempre de su historial de cobros */
  function recalcularCobro(leadId) {
    if (!leadId) return;
    var lead = record('leads', leadId);
    var tabla = table('pagos');
    if (!lead || !tabla) return;
    var pagos = tabla.records.filter(function (p) { return p.lead === leadId; });
    if (!pagos.length) return;
    lead.cash_collected = pagos.reduce(function (a, p) {
      var monto = U.toNumber(p.monto) || 0;
      return a + (p.tipo === 'Reembolso' ? -Math.abs(monto) : monto);
    }, 0);
  }

  /* Un alumno: fecha de fin, días que le quedan, cuánto pagó y cuánto debe */
  function recalcularAlumno(alumnoId) {
    var a = record('alumnos', alumnoId);
    if (!a) return;
    var ingreso = U.parseDate(a.fecha_ingreso);
    var duracion = U.toNumber(a.duracion);
    if (ingreso && duracion) {
      var fin = new Date(ingreso.getTime() + duracion * 86400000);
      a.fecha_fin = fin.toISOString().slice(0, 10);
    }
    if (a.fecha_fin) a.dias_restantes = U.daysBetween(new Date(), a.fecha_fin);

    var pagos = pagosDeAlumno(alumnoId);
    if (pagos.length) {
      a.total_pagado = pagos.reduce(function (acc, p) {
        var monto = U.toNumber(p.monto) || 0;
        return acc + (p.tipo === 'Reembolso' ? -Math.abs(monto) : monto);
      }, 0);
      var cuotas = pagos.filter(function (p) { return p.tipo === 'Cuota'; });
      a.cuotas_pagadas = cuotas.length || null;
      a.pagado_en_cuotas = cuotas.reduce(function (acc, p) {
        return acc + (U.toNumber(p.monto) || 0);
      }, 0) || null;
    }
    a.saldo = (U.toNumber(a.precio_total) || 0) - (U.toNumber(a.total_pagado) || 0);

    if (['Baja', 'Pausado'].indexOf(a.estado) < 0 && a.dias_restantes != null) {
      a.estado = a.dias_restantes < 0 ? 'Vencido' : (a.dias_restantes <= 15 ? 'Por vencer' : 'Activo');
    }
  }

  /* Los días para vencer cambian solos: se recalculan al abrir la app */
  function refrescarAlumnos() {
    var t = table('alumnos');
    if (!t) return;
    t.records.forEach(function (a) { recalcularAlumno(a.id); });
  }

  function alumnoDe(leadId) {
    var t = table('alumnos');
    if (!t) return null;
    return t.records.filter(function (a) { return a.lead === leadId; })[0] || null;
  }

  function pagosDeAlumno(alumnoId) {
    var t = table('pagos');
    if (!t || !alumnoId) return [];
    return t.records.filter(function (p) { return p.alumno === alumnoId; })
      .sort(function (a, b) { return (U.parseDate(b.fecha) || 0) - (U.parseDate(a.fecha) || 0); });
  }

  function pagosDe(leadId) {
    var t = table('pagos');
    if (!t) return [];
    return t.records.filter(function (p) { return p.lead === leadId; })
      .sort(function (a, b) { return (U.parseDate(b.fecha) || 0) - (U.parseDate(a.fecha) || 0); });
  }

  function cobrado(leadId) {
    return pagosDe(leadId).reduce(function (a, p) {
      var monto = U.toNumber(p.monto) || 0;
      return a + (p.tipo === 'Reembolso' ? -Math.abs(monto) : monto);
    }, 0);
  }

  function duplicateRecord(tableId, recId) {
    var rec = record(tableId, recId);
    if (!rec) return null;
    var copy = Object.assign({}, rec, { id: U.uid('rec'), _createdAt: new Date().toISOString() });
    var t = table(tableId);
    var idx = t.records.indexOf(rec);
    t.records.splice(idx + 1, 0, copy);
    emit('record:duplicate');
    return copy;
  }

  /* ---------------- CRUD campos / tablas / vistas ---------------- */

  function addField(tableId, def) {
    var t = table(tableId);
    if (!t) return null;
    var id = U.slug(def.name);
    var base = id, n = 2;
    while (t.fields.some(function (f) { return f.id === id; })) id = base + '_' + (n++);
    var f = Object.assign({ id: id, width: 160, options: [] }, def, { id: id, _tableId: tableId });
    t.fields.push(f);
    emit('field:add');
    return f;
  }

  function updateField(tableId, fieldId, patch) {
    var f = field(tableId, fieldId);
    if (!f) return;
    Object.assign(f, patch);
    emit('field:update');
  }

  function deleteField(tableId, fieldId) {
    var t = table(tableId);
    if (!t || t.primary === fieldId) return;
    t.fields = t.fields.filter(function (f) { return f.id !== fieldId; });
    t.records.forEach(function (r) { delete r[fieldId]; });
    views(tableId).forEach(function (v) {
      v.filters = (v.filters || []).filter(function (f) { return f.fieldId !== fieldId; });
      v.sorts = (v.sorts || []).filter(function (s) { return s.fieldId !== fieldId; });
      if (v.groupBy === fieldId) v.groupBy = null;
      if (v.stackBy === fieldId) v.stackBy = null;
    });
    emit('field:delete');
  }

  function moveField(tableId, fieldId, delta) {
    var t = table(tableId);
    var idx = t.fields.findIndex(function (f) { return f.id === fieldId; });
    var to = idx + delta;
    if (idx < 0 || to < 0 || to >= t.fields.length) return;
    t.fields.splice(to, 0, t.fields.splice(idx, 1)[0]);
    emit('field:move');
  }

  function addTable(name) {
    var id = U.slug(name), base = id, n = 2;
    while (table(id)) id = base + '_' + (n++);
    var t = {
      id: id, name: name, icon: '📋', primary: 'nombre',
      fields: [
        { id: 'nombre', name: 'Nombre', type: 'text', width: 220 },
        { id: 'notas', name: 'Notas', type: 'longtext', width: 280 }
      ],
      records: []
    };
    state.tables.push(t);
    state.views.push({ id: U.uid('v'), tableId: id, name: 'Todos', type: 'grid', filters: [], sorts: [], hidden: [] });
    emit('table:add');
    return t;
  }

  function deleteTable(tableId) {
    state.tables = state.tables.filter(function (t) { return t.id !== tableId; });
    state.views = state.views.filter(function (v) { return v.tableId !== tableId; });
    emit('table:delete');
  }

  function addView(tableId, name, type) {
    var v = {
      id: U.uid('v'), tableId: tableId, name: name || 'Vista nueva',
      type: type || 'grid', filters: [], sorts: [], hidden: []
    };
    if (v.type === 'kanban') {
      var sel = table(tableId).fields.filter(function (f) { return f.type === 'select'; })[0];
      v.stackBy = sel ? sel.id : null;
    }
    state.views.push(v);
    emit('view:add');
    return v;
  }

  function updateView(viewId, patch) {
    var v = view(viewId);
    if (!v) return;
    Object.assign(v, patch);
    emit('view:update');
  }

  function deleteView(viewId) {
    state.views = state.views.filter(function (v) { return v.id !== viewId; });
    emit('view:delete');
  }

  /* ---------------- filtros / orden / agrupado ---------------- */

  var OPS = {
    text: ['contains', 'notContains', 'is', 'isNot', 'isEmpty', 'isNotEmpty'],
    select: ['is', 'isNot', 'isAnyOf', 'isNoneOf', 'isEmpty', 'isNotEmpty'],
    number: ['=', '≠', '>', '<', '≥', '≤', 'isEmpty', 'isNotEmpty'],
    date: ['is', 'before', 'after', 'isWithin', 'isEmpty', 'isNotEmpty'],
    checkbox: ['is'],
    link: ['is', 'isEmpty', 'isNotEmpty']
  };

  var OP_LABELS = {
    contains: 'contiene', notContains: 'no contiene', is: 'es', isNot: 'no es',
    isAnyOf: 'es alguno de', isNoneOf: 'no es ninguno de',
    isEmpty: 'está vacío', isNotEmpty: 'no está vacío',
    '=': '=', '≠': '≠', '>': '>', '<': '<', '≥': '≥', '≤': '≤',
    before: 'antes de', after: 'después de', isWithin: 'dentro de'
  };

  var RANGOS = {
    hoy: 'Hoy', semana: 'Últimos 7 días', mes: 'Este mes',
    mesPasado: 'Mes pasado', prox7: 'Próximos 7 días', trimestre: 'Últimos 90 días'
  };

  function opsFor(type) {
    if (['number', 'currency', 'percent', 'rating'].indexOf(type) >= 0) return OPS.number;
    if (['date', 'datetime'].indexOf(type) >= 0) return OPS.date;
    if (['select', 'multiselect'].indexOf(type) >= 0) return OPS.select;
    if (type === 'checkbox') return OPS.checkbox;
    if (type === 'link') return OPS.link;
    return OPS.text;
  }

  function inRange(value, range) {
    var d = U.parseDate(value);
    if (!d) return false;
    var now = new Date();
    var diff = Math.round((d - now) / 86400000);
    switch (range) {
      case 'hoy': return d.toISOString().slice(0, 10) === now.toISOString().slice(0, 10);
      case 'semana': return diff <= 0 && diff >= -7;
      case 'trimestre': return diff <= 0 && diff >= -90;
      case 'prox7': return diff >= 0 && diff <= 7;
      case 'mes': return U.monthKey(d) === U.monthKey(now);
      case 'mesPasado': return U.monthKey(d) === U.addMonths(U.monthKey(now), -1);
      default: return true;
    }
  }

  function matches(rec, filter, tableId) {
    var f = field(tableId, filter.fieldId);
    if (!f) return true;
    var raw = rec[filter.fieldId];
    var empty = raw == null || raw === '' || (Array.isArray(raw) && !raw.length);
    var text = String(raw == null ? '' : raw).toLowerCase();
    var target = String(filter.value == null ? '' : filter.value).toLowerCase();

    switch (filter.op) {
      case 'isEmpty': return empty;
      case 'isNotEmpty': return !empty;
      case 'contains': return text.indexOf(target) >= 0;
      case 'notContains': return text.indexOf(target) < 0;
      case 'is':
        if (f.type === 'checkbox') return !!raw === (filter.value === true || filter.value === 'true');
        return text === target;
      case 'isNot': return text !== target;
      case 'isAnyOf': return (filter.value || []).indexOf(raw) >= 0;
      case 'isNoneOf': return (filter.value || []).indexOf(raw) < 0;
      case '=': return U.toNumber(raw) === U.toNumber(filter.value);
      case '≠': return U.toNumber(raw) !== U.toNumber(filter.value);
      case '>': return (U.toNumber(raw) || 0) > (U.toNumber(filter.value) || 0);
      case '<': return (U.toNumber(raw) || 0) < (U.toNumber(filter.value) || 0);
      case '≥': return (U.toNumber(raw) || 0) >= (U.toNumber(filter.value) || 0);
      case '≤': return (U.toNumber(raw) || 0) <= (U.toNumber(filter.value) || 0);
      case 'before': return !empty && U.parseDate(raw) < U.parseDate(filter.value);
      case 'after': return !empty && U.parseDate(raw) > U.parseDate(filter.value);
      case 'isWithin': return inRange(raw, filter.value);
      default: return true;
    }
  }

  /* Alcance: cada persona ve su espacio de trabajo salvo que sea admin */
  var REGLAS_ALCANCE = {
    leads: function (r, yo) {
      return r.setter === yo || r.closer === yo || (!r.setter && !r.closer);
    },
    actividades: function (r, yo) { return !r.responsable || r.responsable === yo; },
    contenido: function (r, yo) { return !r.responsable || r.responsable === yo; },
    tareas: function (r, yo) {
      var asignados = Array.isArray(r.asignados) ? r.asignados : (r.asignados ? [r.asignados] : []);
      return !asignados.length || asignados.indexOf(yo) >= 0 || r.creada_por === yo;
    }
  };

  function scoped(rows, tableId) {
    if (!AE.perms || !AE.perms.soloPropios()) return rows;
    var yo = AE.auth.usuario();
    var regla = REGLAS_ALCANCE[tableId];
    if (!regla) return rows;
    return rows.filter(function (r) { return regla(r, yo); });
  }

  /* Campos que esta persona puede ver en una tabla */
  function visibleFields(tableId) {
    var t = table(tableId);
    if (!t) return [];
    var ocultos = AE.perms ? AE.perms.camposOcultos(tableId) : [];
    return t.fields.filter(function (f) { return ocultos.indexOf(f.id) < 0; });
  }

  function compare(a, b, f, dir) {
    var va = a[f.id], vb = b[f.id];
    var mul = dir === 'desc' ? -1 : 1;
    var ea = va == null || va === '', eb = vb == null || vb === '';
    if (ea && eb) return 0;
    if (ea) return 1;      // vacíos siempre al final
    if (eb) return -1;
    if (['number', 'currency', 'percent', 'rating'].indexOf(f.type) >= 0) {
      return ((U.toNumber(va) || 0) - (U.toNumber(vb) || 0)) * mul;
    }
    if (['date', 'datetime'].indexOf(f.type) >= 0) {
      return ((U.parseDate(va) || 0) - (U.parseDate(vb) || 0)) * mul;
    }
    if (f.type === 'checkbox') return ((va ? 1 : 0) - (vb ? 1 : 0)) * mul;
    return String(va).localeCompare(String(vb), 'es', { numeric: true }) * mul;
  }

  /* Filas visibles de una vista, con filtros + búsqueda + orden aplicados */
  function rowsOf(viewId, search) {
    var v = view(viewId);
    if (!v) return [];
    var t = table(v.tableId);
    if (!t) return [];
    var rows = scoped(t.records.slice(), v.tableId);

    (v.filters || []).forEach(function (f) {
      rows = rows.filter(function (r) { return matches(r, f, v.tableId); });
    });

    var q = String(search || v.search || '').trim().toLowerCase();
    if (q) {
      rows = rows.filter(function (r) {
        return t.fields.some(function (f) {
          return String(r[f.id] == null ? '' : r[f.id]).toLowerCase().indexOf(q) >= 0;
        });
      });
    }

    var sorts = (v.sorts || []).filter(function (s) { return field(v.tableId, s.fieldId); });
    if (sorts.length) {
      rows.sort(function (a, b) {
        for (var i = 0; i < sorts.length; i++) {
          var f = field(v.tableId, sorts[i].fieldId);
          var c = compare(a, b, f, sorts[i].dir);
          if (c) return c;
        }
        return 0;
      });
    }
    return rows;
  }

  /* Todas las filas de una tabla respetando el alcance por rol */
  function allRows(tableId) {
    var t = table(tableId);
    return t ? scoped(t.records.slice(), tableId) : [];
  }

  function groupRows(rows, fieldId) {
    var groups = [];
    var index = {};
    rows.forEach(function (r) {
      var key = r[fieldId] == null || r[fieldId] === '' ? '—' : String(r[fieldId]);
      if (!index[key]) { index[key] = { key: key, rows: [] }; groups.push(index[key]); }
      index[key].rows.push(r);
    });
    return groups;
  }

  /* Texto principal de un registro (para links y tarjetas) */
  function titleOf(tableId, recId) {
    var t = table(tableId);
    var rec = record(tableId, recId);
    if (!t || !rec) return '';
    return String(rec[t.primary] || rec[t.fields[0].id] || 'Sin título');
  }

  /* ---------------- import / export / reset ---------------- */

  function exportJSON() {
    U.download('alpha-crm-' + U.today() + '.json', JSON.stringify(state, null, 2), 'application/json');
  }

  function importJSON(text) {
    var data = JSON.parse(text);
    if (!data || !data.tables) throw new Error('El archivo no tiene el formato esperado.');
    state = data;
    migrate();
    emit('import');
  }

  function exportCSV(tableId, viewId) {
    var t = table(tableId);
    var visible = visibleFields(tableId).filter(function (f) {
      var v = viewId ? view(viewId) : null;
      return !v || (v.hidden || []).indexOf(f.id) < 0;
    });
    var rows = viewId ? rowsOf(viewId) : allRows(tableId);
    var out = [visible.map(function (f) { return f.name; })];
    rows.forEach(function (r) {
      out.push(visible.map(function (f) {
        if (f.type === 'link') return titleOf(f.linkTable, r[f.id]);
        if (f.type === 'checkbox') return r[f.id] ? 'Sí' : 'No';
        return r[f.id] == null ? '' : r[f.id];
      }));
    });
    U.download(U.slug(t.name) + '-' + U.today() + '.csv', U.toCSV(out), 'text/csv');
  }

  /* Importa un CSV a una tabla existente, mapeando por nombre de columna */
  function importCSV(tableId, text) {
    var t = table(tableId);
    if (!t) throw new Error('Tabla inexistente');
    var rows = parseCSV(text);
    if (rows.length < 2) throw new Error('El CSV está vacío.');
    var header = rows[0].map(function (h) { return U.slug(h); });
    var byId = {};
    t.fields.forEach(function (f) { byId[U.slug(f.name)] = f; byId[f.id] = f; });
    var creados = 0;
    rows.slice(1).forEach(function (row) {
      if (!row.join('').trim()) return;
      var rec = { id: U.uid('rec'), _createdAt: new Date().toISOString() };
      header.forEach(function (h, i) {
        var f = byId[h];
        if (!f) return;
        rec[f.id] = AE.fields.parse(f, row[i]);
      });
      t.records.unshift(rec);
      creados++;
    });
    emit('import:csv');
    return creados;
  }

  function parseCSV(text) {
    var rows = [], row = [], value = '', quoted = false;
    text = String(text).replace(/\r\n/g, '\n').replace(/^﻿/, '');
    for (var i = 0; i < text.length; i++) {
      var c = text[i];
      if (quoted) {
        if (c === '"' && text[i + 1] === '"') { value += '"'; i++; }
        else if (c === '"') quoted = false;
        else value += c;
      } else if (c === '"') quoted = true;
      else if (c === ',' || c === ';') { row.push(value); value = ''; }
      else if (c === '\n') { row.push(value); rows.push(row); row = []; value = ''; }
      else value += c;
    }
    if (value || row.length) { row.push(value); rows.push(row); }
    return rows;
  }

  function resetDemo() { state = withDemo(); refrescarAlumnos(); emit('reset'); }
  function resetReales() {
    if (!AE.datosIniciales) return false;
    state = withReales();
    refrescarAlumnos();
    emit('reset');
    return true;
  }

  function clearData() {
    state.tables.forEach(function (t) { t.records = []; });
    emit('clear');
  }

  AE.store = {
    load: load, save: function () { save(); }, emit: emit, subscribe: subscribe,
    getState: getState, setState: function (s) { state = s; migrate(); emit('sync'); },
    settings: settings, tables: tables, table: table, views: views, view: view,
    field: field, record: record, optionsOf: optionsOf,
    createRecord: createRecord, updateRecord: updateRecord, deleteRecord: deleteRecord,
    duplicateRecord: duplicateRecord,
    addField: addField, updateField: updateField, deleteField: deleteField, moveField: moveField,
    addTable: addTable, deleteTable: deleteTable,
    addView: addView, updateView: updateView, deleteView: deleteView,
    rowsOf: rowsOf, allRows: allRows, groupRows: groupRows, titleOf: titleOf,
    visibleFields: visibleFields, pagosDe: pagosDe, pagosDeAlumno: pagosDeAlumno, cobrado: cobrado,
    recalcularCobro: recalcularCobro, recalcularAlumno: recalcularAlumno,
    refrescarAlumnos: refrescarAlumnos, alumnoDe: alumnoDe, resetReales: resetReales,
    opsFor: opsFor, OP_LABELS: OP_LABELS, RANGOS: RANGOS,
    exportJSON: exportJSON, importJSON: importJSON, exportCSV: exportCSV, importCSV: importCSV,
    resetDemo: resetDemo, clearData: clearData, STORAGE_KEY: KEY
  };
})(window.AE);
