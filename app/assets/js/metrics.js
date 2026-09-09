/* ===================================================================
   Alpha CRM — cálculo de métricas y proyecciones
   =================================================================== */
(function (AE) {
  'use strict';

  var U = AE.utils, S = AE.store;

  function etapa(nombre) { return AE.schema.ETAPAS[nombre] || []; }
  function esta(lead, grupo) { return etapa(grupo).indexOf(lead.estado) >= 0; }

  /* La fecha "de resultado" de un lead: cuándo se jugó el cierre */
  function fechaResultado(lead) { return lead.fecha_llamada || lead.fecha_contacto; }

  function enPeriodo(fecha, periodo) {
    var d = U.parseDate(fecha);
    if (!d) return false;
    var hoy = new Date();
    if (periodo === 'todo') return true;
    if (periodo === 'mes') return U.monthKey(d) === U.monthKey(hoy);
    if (periodo === 'mesPasado') return U.monthKey(d) === U.addMonths(U.monthKey(hoy), -1);
    if (periodo === '90d') return (hoy - d) / 86400000 <= 90 && d <= hoy;
    if (/^\d{4}-\d{2}$/.test(periodo)) return U.monthKey(d) === periodo;
    return true;
  }

  /**
   * Métricas del periodo. `filtro` permite acotar a un setter/closer.
   */
  function calcular(periodo, filtro) {
    var leads = S.allRows('leads').filter(function (l) {
      if (!filtro) return true;
      if (filtro.setter && l.setter !== filtro.setter) return false;
      if (filtro.closer && l.closer !== filtro.closer) return false;
      return true;
    });

    var nuevos = leads.filter(function (l) { return enPeriodo(l.fecha_contacto, periodo); });
    var delPeriodo = leads.filter(function (l) { return enPeriodo(fechaResultado(l), periodo); });

    var agendadas = delPeriodo.filter(function (l) { return esta(l, 'agendado'); });
    var shows = delPeriodo.filter(function (l) { return esta(l, 'show'); });
    var noShows = delPeriodo.filter(function (l) { return l.estado === 'No Show'; });
    var ganados = delPeriodo.filter(function (l) { return l.estado === 'Ganado'; });
    var perdidos = delPeriodo.filter(function (l) { return l.estado === 'Perdido'; });

    var cash = sum(ganados, 'cash_collected');
    var contratado = sum(ganados, 'precio');

    var abiertos = leads.filter(function (l) { return esta(l, 'abierto'); });
    var pipeline = sum(abiertos, 'precio');
    var ponderado = abiertos.reduce(function (a, l) {
      return a + (U.toNumber(l.precio) || 0) * ((U.toNumber(l.probabilidad) || 0) / 100);
    }, 0);

    return {
      periodo: periodo,
      leads: nuevos.length,
      agendadas: agendadas.length,
      shows: shows.length,
      noShows: noShows.length,
      cierres: ganados.length,
      perdidos: perdidos.length,
      cash: cash,
      contratado: contratado,
      ticket: ganados.length ? contratado / ganados.length : 0,
      showRate: U.pct(shows.length, agendadas.length),
      closeRate: U.pct(ganados.length, shows.length),
      leadToCall: U.pct(agendadas.length, nuevos.length),
      pipeline: pipeline,
      ponderado: ponderado,
      abiertos: abiertos.length,
      registros: { nuevos: nuevos, agendadas: agendadas, shows: shows, ganados: ganados, abiertos: abiertos }
    };
  }

  function sum(rows, fieldId) {
    return rows.reduce(function (a, r) { return a + (U.toNumber(r[fieldId]) || 0); }, 0);
  }

  /* Serie mensual de los últimos n meses */
  function serieMensual(n) {
    var meses = [];
    var base = U.monthKey(new Date());
    for (var i = n - 1; i >= 0; i--) meses.push(U.addMonths(base, -i));
    return meses.map(function (m) {
      var d = calcular(m);
      var meta = (S.allRows('metas').filter(function (x) { return x.mes === m; })[0]) || {};
      return {
        mes: m, label: U.monthLabel(m),
        cash: d.cash, cierres: d.cierres, leads: d.leads, agendadas: d.agendadas,
        metaCash: U.toNumber(meta.meta_cash) || 0
      };
    });
  }

  function metaDe(mes) {
    return S.allRows('metas').filter(function (m) { return m.mes === mes; })[0] || null;
  }

  /**
   * Proyección del mes en curso:
   * - ritmo: lo que da el run-rate de los días transcurridos
   * - pipeline: lo cerrado + el pipeline ponderado que todavía puede caer este mes
   */
  function proyeccion() {
    var mes = U.monthKey(new Date());
    var d = calcular(mes);
    var avance = U.monthProgress(mes);
    var ritmo = avance.ratio > 0 ? d.cash / avance.ratio : 0;
    var meta = metaDe(mes);
    var metaCash = meta ? (U.toNumber(meta.meta_cash) || 0) : 0;

    var conPipeline = d.cash + d.ponderado * (1 - avance.ratio * 0.4);
    var proyectado = Math.round((ritmo + conPipeline) / 2);
    var faltante = Math.max(0, metaCash - d.cash);
    var ticket = d.ticket || promedioTicket();

    return {
      mes: mes,
      avance: avance,
      actual: d.cash,
      ritmo: Math.round(ritmo),
      conPipeline: Math.round(conPipeline),
      proyectado: proyectado,
      meta: metaCash,
      cumplimiento: metaCash ? U.pct(d.cash, metaCash) : null,
      proyeccionVsMeta: metaCash ? U.pct(proyectado, metaCash) : null,
      faltante: faltante,
      cierresFaltantes: ticket ? Math.ceil(faltante / ticket) : null,
      llamadasFaltantes: (ticket && d.closeRate) ? Math.ceil((faltante / ticket) / (d.closeRate / 100)) : null,
      ticket: ticket,
      datos: d
    };
  }

  function promedioTicket() {
    var ganados = S.allRows('leads').filter(function (l) { return l.estado === 'Ganado'; });
    if (!ganados.length) return 0;
    return sum(ganados, 'precio') / ganados.length;
  }

  /* Proyección de los próximos n meses según tendencia + metas cargadas */
  function forecast(n) {
    var serie = serieMensual(4);
    var cerrados = serie.slice(0, 3);
    var promedio = cerrados.reduce(function (a, m) { return a + m.cash; }, 0) / (cerrados.length || 1);
    var crecimiento = crecimientoMedio(cerrados.map(function (m) { return m.cash; }));
    var proy = proyeccion();
    var out = [];
    var base = proy.proyectado || promedio;
    for (var i = 1; i <= n; i++) {
      var mes = U.addMonths(proy.mes, i);
      var meta = metaDe(mes);
      base = base * (1 + crecimiento);
      out.push({
        mes: mes, label: U.monthLabel(mes),
        proyectado: Math.round(base),
        meta: meta ? (U.toNumber(meta.meta_cash) || 0) : 0
      });
    }
    return { crecimiento: crecimiento, meses: out };
  }

  function crecimientoMedio(valores) {
    var ratios = [];
    for (var i = 1; i < valores.length; i++) {
      if (valores[i - 1] > 0) ratios.push(valores[i] / valores[i - 1] - 1);
    }
    if (!ratios.length) return 0.05;
    var media = ratios.reduce(function (a, b) { return a + b; }, 0) / ratios.length;
    return Math.max(-0.3, Math.min(0.4, media));   // sin optimismos delirantes
  }

  /* Ranking del equipo en el periodo */
  function ranking(periodo) {
    var equipo = S.allRows('equipo').filter(function (p) { return p.activo !== false; });
    return equipo.map(function (p) {
      var filtro = p.rol === 'Setter' ? { setter: p.nombre } : p.rol === 'Closer' ? { closer: p.nombre } : null;
      if (!filtro) return null;
      var d = calcular(periodo, filtro);
      return {
        nombre: p.nombre, rol: p.rol,
        leads: d.leads, agendadas: d.agendadas, shows: d.shows,
        cierres: d.cierres, cash: d.cash,
        showRate: d.showRate, closeRate: d.closeRate,
        meta: U.toNumber(p.meta_cash) || 0,
        cumplimiento: p.meta_cash ? U.pct(d.cash, U.toNumber(p.meta_cash)) : null,
        comision: (U.toNumber(p.comision) || 0) * d.cash / 100
      };
    }).filter(Boolean).sort(function (a, b) { return b.cash - a.cash || b.agendadas - a.agendadas; });
  }

  /* Distribución por un campo de selección (origen, oferta, objeción…) */
  function distribucion(fieldId, periodo) {
    var leads = S.allRows('leads').filter(function (l) { return enPeriodo(l.fecha_contacto, periodo); });
    var mapa = {};
    leads.forEach(function (l) {
      var key = l[fieldId] || 'Sin dato';
      if (!mapa[key]) mapa[key] = { key: key, total: 0, ganados: 0, cash: 0 };
      mapa[key].total++;
      if (l.estado === 'Ganado') {
        mapa[key].ganados++;
        mapa[key].cash += U.toNumber(l.cash_collected) || 0;
      }
    });
    return Object.keys(mapa).map(function (k) { return mapa[k]; })
      .sort(function (a, b) { return b.total - a.total; });
  }

  /* ---------------- facturación (sale de la tabla de cobros) ---------------- */

  function facturacion(periodo) {
    var pagos = S.allRows('pagos').filter(function (p) { return enPeriodo(p.fecha, periodo); });
    var neto = 0, reembolsos = 0, plataforma = 0;
    var porMetodo = {}, porTipo = {};
    pagos.forEach(function (p) {
      var monto = U.toNumber(p.monto) || 0;
      plataforma += U.toNumber(p.comision_plataforma) || 0;
      if (p.tipo === 'Reembolso') { reembolsos += Math.abs(monto); neto -= Math.abs(monto); }
      else neto += monto;
      var m = p.metodo || 'Sin método';
      porMetodo[m] = (porMetodo[m] || 0) + (p.tipo === 'Reembolso' ? -Math.abs(monto) : monto);
      var t = p.tipo || 'Pago';
      porTipo[t] = (porTipo[t] || 0) + 1;
    });
    return {
      total: neto, reembolsos: reembolsos, cantidad: pagos.length,
      plataforma: plataforma, neto: neto - plataforma,
      promedio: pagos.length ? neto / pagos.length : 0,
      porMetodo: aLista(porMetodo), porTipo: aLista(porTipo), pagos: pagos
    };
  }

  function aLista(mapa) {
    return Object.keys(mapa).map(function (k) { return { key: k, total: mapa[k] }; })
      .sort(function (a, b) { return b.total - a.total; });
  }

  /* Clientes ganados que todavía deben plata */
  function saldosPendientes() {
    return S.allRows('leads')
      .filter(function (l) { return l.estado === 'Ganado'; })
      .map(function (l) {
        var valor = U.toNumber(l.precio) || 0;
        var pagado = S.cobrado(l.id) || U.toNumber(l.cash_collected) || 0;
        return { id: l.id, nombre: l.nombre, closer: l.closer, valor: valor, pagado: pagado, saldo: valor - pagado };
      })
      .filter(function (c) { return c.saldo > 0.5; })
      .sort(function (a, b) { return b.saldo - a.saldo; });
  }

  /* Historial: cuánto pagó cada cliente */
  function topClientes(periodo, limite) {
    var mapa = {};
    S.allRows('pagos').filter(function (p) { return enPeriodo(p.fecha, periodo); }).forEach(function (p) {
      if (!p.lead) return;
      var monto = U.toNumber(p.monto) || 0;
      if (!mapa[p.lead]) mapa[p.lead] = { id: p.lead, nombre: S.titleOf('leads', p.lead), total: 0, pagos: 0 };
      mapa[p.lead].total += p.tipo === 'Reembolso' ? -Math.abs(monto) : monto;
      mapa[p.lead].pagos++;
    });
    return Object.keys(mapa).map(function (k) { return mapa[k]; })
      .sort(function (a, b) { return b.total - a.total; })
      .slice(0, limite || 6);
  }

  /* ---------------- alumnos ---------------- */

  function alumnos() {
    var lista = S.allRows('alumnos');
    var suma = function (campo) {
      return lista.reduce(function (a, x) { return a + (U.toNumber(x[campo]) || 0); }, 0);
    };
    var proximas = lista.filter(function (a) {
      var dias = a.proxima_cuota ? U.daysBetween(new Date(), a.proxima_cuota) : null;
      return dias != null && dias <= 7;
    }).sort(function (a, b) { return (U.parseDate(a.proxima_cuota) || 0) - (U.parseDate(b.proxima_cuota) || 0); });

    return {
      lista: lista,
      total: lista.length,
      activos: lista.filter(function (a) { return a.estado === 'Activo'; }).length,
      porVencer: lista.filter(function (a) { return a.estado === 'Por vencer'; }).length,
      vencidos: lista.filter(function (a) { return a.estado === 'Vencido'; }).length,
      casosExito: lista.filter(function (a) { return a.caso_exito; }).length,
      facturado: suma('precio_total'),
      cobrado: suma('total_pagado'),
      saldo: suma('saldo'),
      proximasCuotas: proximas,
      porVencerPronto: lista.filter(function (a) {
        return a.dias_restantes != null && a.dias_restantes >= 0 && a.dias_restantes <= 15;
      }).sort(function (a, b) { return a.dias_restantes - b.dias_restantes; })
    };
  }

  /* ---------------- actividad diaria del setter ---------------- */

  function actividadSetter(periodo, setter) {
    var dias = S.allRows('setter_dia').filter(function (d) {
      if (setter && d.setter !== setter) return false;
      return enPeriodo(d.fecha, periodo);
    });
    var suma = function (campo) {
      return dias.reduce(function (a, d) { return a + (U.toNumber(d[campo]) || 0); }, 0);
    };
    var conversaciones = suma('conversaciones');
    var agendas = suma('agendas');
    var objetivos = (S.settings().objetivos) || { tasaAgendaMin: 0.08, tasaAgendaMax: 0.12 };
    var tasa = conversaciones ? agendas / conversaciones : 0;

    return {
      dias: dias, diasCargados: dias.length,
      conversaciones: conversaciones, outbound: suma('outbound'),
      seguimientos: suma('seguimientos'), agendas: agendas,
      tasaAgenda: tasa,
      objetivoMin: objetivos.tasaAgendaMin, objetivoMax: objetivos.tasaAgendaMax,
      estado: !conversaciones ? 'Sin datos'
        : tasa >= objetivos.tasaAgendaMax ? 'Por encima del objetivo'
        : tasa >= objetivos.tasaAgendaMin ? 'En objetivo' : 'Por debajo del objetivo',
      porcentajeOutbound: conversaciones ? suma('outbound') / conversaciones : 0,
      serie: dias.slice().sort(function (a, b) { return (U.parseDate(a.fecha) || 0) - (U.parseDate(b.fecha) || 0); })
    };
  }

  /* La fila de hoy del setter, para cargar el día desde el panel */
  function diaDeHoy(setter) {
    var hoy = U.today();
    return S.allRows('setter_dia').filter(function (d) {
      return d.fecha === hoy && (!setter || d.setter === setter);
    })[0] || null;
  }

  /* Tareas abiertas de quien está mirando el panel */
  function misTareas() {
    var yo = AE.auth.usuario();
    return S.allRows('tareas').filter(function (t) {
      if (t.hecha) return false;
      var asignados = Array.isArray(t.asignados) ? t.asignados : (t.asignados ? [t.asignados] : []);
      return AE.perms.esAdmin() ? true : asignados.indexOf(yo) >= 0;
    }).sort(function (a, b) {
      return (U.parseDate(a.vence) || Infinity) - (U.parseDate(b.vence) || Infinity);
    });
  }

  AE.metrics = {
    calcular: calcular, serieMensual: serieMensual, proyeccion: proyeccion,
    forecast: forecast, ranking: ranking, distribucion: distribucion,
    facturacion: facturacion, saldosPendientes: saldosPendientes,
    topClientes: topClientes, misTareas: misTareas,
    alumnos: alumnos, actividadSetter: actividadSetter, diaDeHoy: diaDeHoy,
    metaDe: metaDe, enPeriodo: enPeriodo
  };
})(window.AE);
