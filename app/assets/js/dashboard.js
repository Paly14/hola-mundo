/* ===================================================================
   Alpha CRM — Dashboard: métricas, embudo, ranking y proyecciones
   =================================================================== */
(function (AE) {
  'use strict';

  var U = AE.utils, el = U.el, S = AE.store, M = AE.metrics;

  var PERIODOS = { mes: 'Este mes', mesPasado: 'Mes pasado', '90d': 'Últimos 90 días', todo: 'Todo' };
  var periodo = 'mes';

  function render(host, ctx) {
    var cur = S.settings().currency;
    var d = M.calcular(periodo, alcance());
    var proy = M.proyeccion();

    host.innerHTML = '';
    host.appendChild(header(ctx));
    host.appendChild(kpis(d, cur));
    host.appendChild(el('div', { class: 'dash-grid' }, [
      panel('Cash collected por mes', barras(M.serieMensual(6), cur)),
      panel('Embudo del periodo', embudo(d))
    ]));
    host.appendChild(proyeccionPanel(proy, cur));
    host.appendChild(el('div', { class: 'dash-grid' }, [
      panel('Ranking del equipo', rankingTabla(cur)),
      panel('De dónde vienen los leads', distribucion('origen'))
    ]));
    host.appendChild(el('div', { class: 'dash-grid' }, [
      panel('Objeciones más frecuentes', distribucion('objecion')),
      panel('Próximos 3 meses (proyección)', forecastTabla(cur))
    ]));
  }

  /* Si el usuario no es Admin, el dashboard muestra sólo lo suyo */
  function alcance() {
    var s = S.settings();
    if (s.rol === 'Setter') return { setter: s.usuario };
    if (s.rol === 'Closer') return { closer: s.usuario };
    return null;
  }

  function header(ctx) {
    var sel = el('div', { class: 'seg' });
    Object.keys(PERIODOS).forEach(function (k) {
      sel.appendChild(el('button', {
        class: 'seg__btn' + (periodo === k ? ' is-on' : ''), text: PERIODOS[k],
        onclick: function () { periodo = k; ctx.refresh(); }
      }));
    });
    var s = S.settings();
    return el('div', { class: 'dash-head' }, [
      el('div', {}, [
        el('h2', { class: 'dash-title', text: 'Panel de control' }),
        el('p', { class: 'muted small', text: s.rol === 'Admin' ? 'Vista completa del equipo' : 'Tus números, ' + s.usuario })
      ]),
      sel
    ]);
  }

  function panel(title, content) {
    return el('section', { class: 'panel' }, [
      el('h3', { class: 'panel__title', text: title }),
      content
    ]);
  }

  /* ---------------- KPIs ---------------- */

  function kpis(d, cur) {
    var items = [
      { label: 'Leads nuevos', value: d.leads, hint: d.leadToCall + '% pasó a llamada' },
      { label: 'Llamadas agendadas', value: d.agendadas, hint: d.noShows + ' no shows' },
      { label: 'Show rate', value: d.showRate + '%', hint: d.shows + ' asistieron' },
      { label: 'Cierres', value: d.cierres, hint: d.closeRate + '% close rate' },
      { label: 'Cash collected', value: U.money(d.cash, cur), hint: 'Contratado ' + U.moneyShort(d.contratado, cur), strong: true },
      { label: 'Ticket promedio', value: U.money(d.ticket, cur), hint: d.cierres + ' cierres' },
      { label: 'Pipeline abierto', value: U.money(d.pipeline, cur), hint: d.abiertos + ' oportunidades' },
      { label: 'Pipeline ponderado', value: U.money(d.ponderado, cur), hint: 'según probabilidad' }
    ];
    var grid = el('div', { class: 'kpis' });
    items.forEach(function (k) {
      grid.appendChild(el('div', { class: 'kpi' + (k.strong ? ' kpi--strong' : '') }, [
        el('span', { class: 'kpi__label', text: k.label }),
        el('span', { class: 'kpi__value', text: k.value }),
        el('span', { class: 'kpi__hint', text: k.hint })
      ]));
    });
    return grid;
  }

  /* ---------------- gráfico de barras ---------------- */

  function barras(serie, cur) {
    var W = 640, H = 240, pad = { l: 64, r: 14, t: 18, b: 28 };
    var max = Math.max.apply(null, serie.map(function (m) { return Math.max(m.cash, m.metaCash); }).concat([1]));
    var innerW = W - pad.l - pad.r, innerH = H - pad.t - pad.b;
    var step = innerW / serie.length;
    var bw = Math.min(48, step * 0.55);
    var parts = [];

    /* guías horizontales */
    for (var g = 0; g <= 4; g++) {
      var y = pad.t + innerH - (innerH * g / 4);
      parts.push('<line x1="' + pad.l + '" y1="' + y + '" x2="' + (W - pad.r) + '" y2="' + y + '" class="ch-grid"/>');
      parts.push('<text x="' + (pad.l - 8) + '" y="' + (y + 4) + '" class="ch-axis" text-anchor="end">' +
        U.moneyShort(max * g / 4, cur) + '</text>');
    }

    serie.forEach(function (m, i) {
      var x = pad.l + step * i + (step - bw) / 2;
      var h = Math.max(2, innerH * (m.cash / max));
      var y = pad.t + innerH - h;
      parts.push('<rect x="' + x + '" y="' + y + '" width="' + bw + '" height="' + h + '" rx="6" class="ch-bar"><title>' +
        U.esc(m.label + ': ' + U.money(m.cash, cur)) + '</title></rect>');
      if (m.metaCash) {
        var my = pad.t + innerH - innerH * (m.metaCash / max);
        parts.push('<line x1="' + (x - 5) + '" y1="' + my + '" x2="' + (x + bw + 5) + '" y2="' + my + '" class="ch-meta"><title>' +
          U.esc('Meta: ' + U.money(m.metaCash, cur)) + '</title></line>');
      }
      parts.push('<text x="' + (x + bw / 2) + '" y="' + (H - 8) + '" class="ch-label" text-anchor="middle">' + m.label + '</text>');
      if (m.cash) {
        parts.push('<text x="' + (x + bw / 2) + '" y="' + (y - 5) + '" class="ch-value" text-anchor="middle">' +
          U.moneyShort(m.cash, cur) + '</text>');
      }
    });

    var svg = el('div', {
      class: 'chart',
      html: '<svg viewBox="0 0 ' + W + ' ' + H + '" preserveAspectRatio="xMidYMid meet">' + parts.join('') + '</svg>'
    });
    return el('div', {}, [svg, el('p', { class: 'muted small', text: 'La línea punteada es la meta del mes (tabla Metas).' })]);
  }

  /* ---------------- embudo ---------------- */

  function embudo(d) {
    var pasos = [
      { label: 'Leads', value: d.leads },
      { label: 'Agendadas', value: d.agendadas },
      { label: 'Shows', value: d.shows },
      { label: 'Cierres', value: d.cierres }
    ];
    var max = Math.max.apply(null, pasos.map(function (p) { return p.value; }).concat([1]));
    var box = el('div', { class: 'funnel' });
    pasos.forEach(function (p, i) {
      var prev = i ? pasos[i - 1].value : null;
      box.appendChild(el('div', { class: 'funnel__row' }, [
        el('span', { class: 'funnel__label', text: p.label }),
        el('div', { class: 'funnel__track' }, [
          el('div', { class: 'funnel__bar', style: 'width:' + Math.max(3, (p.value / max) * 100) + '%' },
            [el('span', { text: p.value })])
        ]),
        el('span', { class: 'funnel__conv', text: prev != null ? U.pct(p.value, prev) + '%' : '' })
      ]));
    });
    return box;
  }

  /* ---------------- proyecciones ---------------- */

  function proyeccionPanel(p, cur) {
    var pct = p.meta ? Math.min(100, U.pct(p.actual, p.meta)) : 0;
    var pctProy = p.meta ? Math.min(100, U.pct(p.proyectado, p.meta)) : 0;

    var barra = el('div', { class: 'goal' }, [
      el('div', { class: 'goal__track' }, [
        el('div', { class: 'goal__fill', style: 'width:' + pct + '%' }),
        el('div', { class: 'goal__proj', style: 'width:' + pctProy + '%' })
      ]),
      el('div', { class: 'goal__legend' }, [
        el('span', { html: '<i class="dot dot--fill"></i> Cobrado ' + U.money(p.actual, cur) }),
        el('span', { html: '<i class="dot dot--proj"></i> Proyectado ' + U.money(p.proyectado, cur) }),
        el('span', { html: '<i class="dot dot--meta"></i> Meta ' + U.money(p.meta, cur) })
      ])
    ]);

    var detalle = el('div', { class: 'proj-grid' }, [
      projItem('Día del mes', p.avance.elapsed + ' de ' + p.avance.total, Math.round(p.avance.ratio * 100) + '% transcurrido'),
      projItem('Proyección por ritmo', U.money(p.ritmo, cur), 'si seguís al mismo paso'),
      projItem('Proyección con pipeline', U.money(p.conPipeline, cur), 'cobrado + pipeline ponderado'),
      projItem('Cumplimiento proyectado', p.proyeccionVsMeta == null ? '—' : p.proyeccionVsMeta + '%',
        p.meta ? 'sobre la meta cargada' : 'cargá una meta en la tabla Metas'),
      projItem('Falta para la meta', U.money(p.faltante, cur),
        p.cierresFaltantes == null ? '' : '≈ ' + p.cierresFaltantes + ' cierres'),
      projItem('Llamadas necesarias', p.llamadasFaltantes == null ? '—' : p.llamadasFaltantes,
        'con el close rate actual')
    ]);

    return el('section', { class: 'panel panel--wide' }, [
      el('h3', { class: 'panel__title', text: 'Proyección del mes — ' + U.monthLabel(p.mes) }),
      barra, detalle
    ]);
  }

  function projItem(label, value, hint) {
    return el('div', { class: 'proj' }, [
      el('span', { class: 'proj__label', text: label }),
      el('span', { class: 'proj__value', text: value }),
      el('span', { class: 'proj__hint', text: hint || '' })
    ]);
  }

  function forecastTabla(cur) {
    var f = M.forecast(3);
    var tabla = el('table', { class: 'mini' }, [
      el('thead', {}, [el('tr', {}, [
        el('th', { text: 'Mes' }), el('th', { text: 'Proyectado' }), el('th', { text: 'Meta' }), el('th', { text: 'Gap' })
      ])])
    ]);
    var tb = el('tbody');
    f.meses.forEach(function (m) {
      var gap = m.meta ? m.proyectado - m.meta : null;
      tb.appendChild(el('tr', {}, [
        el('td', { text: m.label }),
        el('td', { text: U.money(m.proyectado, cur) }),
        el('td', { text: m.meta ? U.money(m.meta, cur) : '—' }),
        el('td', { class: gap == null ? '' : (gap >= 0 ? 'pos' : 'neg'), text: gap == null ? '—' : (gap >= 0 ? '+' : '') + U.moneyShort(gap, cur) })
      ]));
    });
    tabla.appendChild(tb);
    return el('div', {}, [
      tabla,
      el('p', { class: 'muted small', text: 'Basado en el ritmo de los últimos meses (' +
        (f.crecimiento >= 0 ? '+' : '') + Math.round(f.crecimiento * 100) + '% mensual promedio).' })
    ]);
  }

  /* ---------------- ranking y distribución ---------------- */

  function rankingTabla(cur) {
    var rows = M.ranking(periodo);
    if (!rows.length) return el('p', { class: 'muted small', text: 'Cargá gente en la tabla Equipo para ver el ranking.' });

    var tabla = el('table', { class: 'mini' }, [
      el('thead', {}, [el('tr', {}, [
        el('th', { text: 'Persona' }), el('th', { text: 'Rol' }),
        el('th', { text: 'Agendas' }), el('th', { text: 'Cierres' }),
        el('th', { text: 'Cash' }), el('th', { text: 'Meta' })
      ])])
    ]);
    var tb = el('tbody');
    rows.forEach(function (r) {
      tb.appendChild(el('tr', {}, [
        el('td', { text: r.nombre }),
        el('td', { html: AE.fields.chip(r.rol, U.colorFor(r.rol)) }),
        el('td', { text: r.agendadas }),
        el('td', { text: r.cierres }),
        el('td', { text: U.money(r.cash, cur) }),
        el('td', { class: r.cumplimiento == null ? '' : (r.cumplimiento >= 100 ? 'pos' : ''), text: r.cumplimiento == null ? '—' : r.cumplimiento + '%' })
      ]));
    });
    tabla.appendChild(tb);
    return tabla;
  }

  function distribucion(fieldId) {
    var rows = M.distribucion(fieldId, periodo).slice(0, 7);
    if (!rows.length) return el('p', { class: 'muted small', text: 'Sin datos en este periodo.' });
    var max = Math.max.apply(null, rows.map(function (r) { return r.total; }));
    var box = el('div', { class: 'dist' });
    rows.forEach(function (r) {
      box.appendChild(el('div', { class: 'dist__row' }, [
        el('span', { class: 'dist__label', text: r.key }),
        el('div', { class: 'dist__track' }, [
          el('div', { class: 'dist__bar', style: 'width:' + Math.max(4, (r.total / max) * 100) + '%;--chip:' + U.colorFor(r.key) })
        ]),
        el('span', { class: 'dist__n', text: r.total + (r.ganados ? ' · ' + r.ganados + ' ✓' : '') })
      ]));
    });
    return box;
  }

  AE.dashboard = { render: render };
})(window.AE);
