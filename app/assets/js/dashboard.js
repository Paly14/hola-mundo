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
    var plata = AE.perms.veFacturacion();
    var d = M.calcular(periodo, alcance());

    host.innerHTML = '';
    host.appendChild(header(ctx));
    host.appendChild(kpis(d, cur, plata));

    host.appendChild(el('div', { class: 'dash-grid' }, [
      plata ? panel('Cash collected por mes', barras(M.serieMensual(6), cur)) : panel('Mis tareas', tareasPanel()),
      panel('Embudo del periodo', embudo(d))
    ]));

    if (plata) {
      host.appendChild(proyeccionPanel(M.proyeccion(), cur));
      host.appendChild(alumnosPanel(cur));
      host.appendChild(el('div', { class: 'dash-grid' }, [
        panel('Facturación del periodo', facturacionPanel(cur)),
        panel('Saldos por cobrar', saldosPanel(cur))
      ]));
      host.appendChild(el('div', { class: 'dash-grid' }, [
        panel('Actividad del setter', setterPanel()),
        panel('Próximas cuotas y vencimientos', vencimientosPanel(cur))
      ]));
      host.appendChild(el('div', { class: 'dash-grid' }, [
        panel('Ranking del equipo', rankingTabla(cur)),
        panel('Clientes que más pagaron', topClientesPanel(cur))
      ]));
      host.appendChild(el('div', { class: 'dash-grid' }, [
        panel('De dónde vienen los leads', distribucion('origen')),
        panel('Próximos 3 meses (proyección)', forecastTabla(cur))
      ]));
      host.appendChild(el('div', { class: 'dash-grid' }, [
        panel('Objeciones más frecuentes', distribucion('objecion')),
        panel('Tareas del equipo', tareasPanel())
      ]));
    } else {
      if (AE.perms.puedeVerTabla('setter_dia')) {
        host.appendChild(el('section', { class: 'panel panel--wide' }, [
          el('h3', { class: 'panel__title', text: 'Tu actividad diaria' }),
          setterPanel(AE.auth.usuario(), ctx)
        ]));
      }
      host.appendChild(el('div', { class: 'dash-grid' }, [
        panel('De dónde vienen tus leads', distribucion('origen')),
        panel('Tus objeciones más frecuentes', distribucion('objecion'))
      ]));
    }
  }

  /* Cada persona ve sus números; dueño y admin ven los del equipo */
  function alcance() {
    if (AE.perms.esAdmin() || AE.auth.verTodo()) return null;
    var rol = AE.auth.rol(), yo = AE.auth.usuario();
    if (rol === 'Setter') return { setter: yo };
    if (rol === 'Closer') return { closer: yo };
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
    return el('div', { class: 'dash-head' }, [
      el('div', {}, [
        el('h2', { class: 'dash-title', text: 'Panel de control' }),
        el('p', {
          class: 'muted small',
          text: AE.perms.esAdmin() ? 'Vista completa del equipo' : 'Tu espacio de trabajo, ' + AE.auth.usuario()
        })
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

  function kpis(d, cur, plata) {
    var items = [
      { label: 'Leads nuevos', value: d.leads, hint: d.leadToCall + '% pasó a llamada',
        rows: d.registros.nuevos, campoFecha: 'fecha_contacto',
        criterio: 'Leads cuya fecha de contacto cae en el periodo elegido.' },
      { label: 'Llamadas agendadas', value: d.agendadas, hint: d.noShows + ' no shows',
        rows: d.registros.agendadas, campoFecha: 'fecha_llamada',
        criterio: 'Leads cuya fecha de llamada cae en el periodo y que llegaron a agendar ' +
          '(Agendado, No Show, Presentado, Seguimiento, Esperando pago, Ganado o Perdido). ' +
          'Una llamada del mes pasado cuenta en el mes pasado, aunque el lead siga abierto.' },
      { label: 'Show rate', value: d.showRate + '%', hint: d.shows + ' asistieron',
        rows: d.registros.shows, campoFecha: 'fecha_llamada',
        criterio: 'De las agendadas del periodo, las que se presentaron: Presentado, ' +
          'Seguimiento, Esperando pago o Ganado.' },
      { label: 'Cierres', value: d.cierres, hint: d.closeRate + '% close rate',
        rows: d.registros.ganados, campoFecha: 'fecha_llamada',
        criterio: 'Leads en estado Ganado con fecha de llamada dentro del periodo.' }
    ];
    if (plata) {
      items.push({ label: 'Cash collected', value: U.money(d.cash, cur), hint: 'Contratado ' + U.moneyShort(d.contratado, cur), strong: true });
      items.push({ label: 'Ticket promedio', value: U.money(d.ticket, cur), hint: d.cierres + ' cierres' });
      items.push({ label: 'Pipeline abierto', value: U.money(d.pipeline, cur), hint: d.abiertos + ' oportunidades',
        rows: d.registros.abiertos, campoFecha: 'fecha_llamada',
        criterio: 'Todos los leads que siguen abiertos, sin importar la fecha.' });
      items.push({ label: 'Pipeline ponderado', value: U.money(d.ponderado, cur), hint: 'según probabilidad' });
    } else {
      var pendientes = M.misTareas().length;
      items.push({ label: 'Oportunidades abiertas', value: d.abiertos, hint: 'en tu pipeline',
        rows: d.registros.abiertos, criterio: 'Leads tuyos que siguen abiertos.' });
      items.push({ label: 'Perdidos', value: d.perdidos, hint: 'en el periodo',
        rows: d.registros.perdidos, campoFecha: 'fecha_llamada',
        criterio: 'Leads en estado Perdido con fecha de llamada dentro del periodo.' });
      items.push({ label: 'Tareas pendientes', value: pendientes, hint: pendientes ? 'te esperan' : 'todo al día', strong: !!pendientes });
    }
    return grillaKpis(items);
  }

  /**
   * Dibuja las tarjetas de KPI. Las que tienen una lista detrás se pueden
   * abrir para ver exactamente qué registros se contaron y con qué criterio.
   */
  function grillaKpis(items) {
    var grid = el('div', { class: 'kpis' });
    items.forEach(function (k) {
      var abrible = !!(k.rows && k.rows.length);
      var card = el('div', {
        class: 'kpi' + (k.strong ? ' kpi--strong' : '') + (abrible ? ' kpi--abrible' : ''),
        title: abrible ? 'Ver los registros que suman este número' : '',
        onclick: abrible ? function () { detalleKpi(k); } : null
      }, [
        el('span', { class: 'kpi__label', text: k.label }),
        el('span', { class: 'kpi__value', text: k.value }),
        el('span', { class: 'kpi__hint', text: k.hint }),
        abrible ? el('span', { class: 'kpi__lupa', text: '⧉' }) : null
      ]);
      grid.appendChild(card);
    });
    return grid;
  }

  /* De dónde sale este número: los registros, uno por uno */
  function detalleKpi(k) {
    var campoFecha = k.campoFecha || 'fecha_contacto';
    var f = S.field('leads', campoFecha);
    var tabla = el('table', { class: 'mini' }, [
      el('thead', {}, [el('tr', {}, [
        el('th', { text: 'Lead' }),
        el('th', { text: f ? f.name : 'Fecha' }),
        el('th', { text: 'Estado' }),
        el('th', { text: 'Closer' }),
        el('th', { text: 'Setter' })
      ])])
    ]);
    var tb = el('tbody');
    k.rows.slice().sort(function (a, b) {
      return (U.parseDate(b[campoFecha]) || 0) - (U.parseDate(a[campoFecha]) || 0);
    }).forEach(function (l) {
      tb.appendChild(el('tr', {
        class: 'mini__click',
        onclick: function () { AE.recordCard.open('leads', l.id, function () { AE.app.render(); }); }
      }, [
        el('td', { text: l.nombre }),
        el('td', { text: l[campoFecha] ? U.formatDateTime(l[campoFecha]) : '—' }),
        el('td', { html: l.estado ? AE.fields.chip(l.estado, AE.fields.colorOf(S.field('leads', 'estado'), l.estado)) : '' }),
        el('td', { text: l.closer || '—' }),
        el('td', { text: l.setter || '—' })
      ]));
    });
    tabla.appendChild(tb);

    AE.ui.modal({
      title: k.label + ': ' + k.value,
      wide: true,
      body: el('div', {}, [
        el('p', { class: 'muted', text: (k.criterio || '') }),
        tabla,
        el('p', { class: 'muted small', text: 'Las vistas de la barra lateral (Panel Closer, Panel Setter) ' +
          'no filtran por fecha: muestran todo lo que está abierto, por eso pueden marcar otro número.' })
      ]),
      actions: [{ label: 'Cerrar', kind: 'primary' }]
    });
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

  /* ---------------- facturación ---------------- */

  function facturacionPanel(cur) {
    var f = M.facturacion(periodo);
    var box = el('div', {});
    box.appendChild(el('div', { class: 'proj-grid' }, [
      projItem('Cobrado (bruto)', U.money(f.total, cur), f.cantidad + ' cobros'),
      projItem('Se llevó la plataforma', U.money(f.plataforma, cur),
        f.total ? U.pct(f.plataforma, f.total, 1) + '% de lo cobrado' : ''),
      projItem('Neto que entró', U.money(f.neto, cur), 'después de comisiones'),
      projItem('Cobro promedio', U.money(f.promedio, cur), 'por operación'),
      projItem('Reembolsos', U.money(f.reembolsos, cur), f.reembolsos ? 'revisar' : 'ninguno')
    ]));
    if (!f.porMetodo.length) {
      box.appendChild(el('p', { class: 'muted small', text: 'Sin cobros cargados en este periodo.' }));
      return box;
    }
    var max = Math.max.apply(null, f.porMetodo.map(function (m) { return Math.abs(m.total); }));
    var dist = el('div', { class: 'dist', style: 'margin-top:12px' });
    f.porMetodo.forEach(function (m) {
      dist.appendChild(el('div', { class: 'dist__row' }, [
        el('span', { class: 'dist__label', text: m.key }),
        el('div', { class: 'dist__track' }, [
          el('div', { class: 'dist__bar', style: 'width:' + Math.max(4, (Math.abs(m.total) / max) * 100) + '%;--chip:' + U.colorFor(m.key) })
        ]),
        el('span', { class: 'dist__n', text: U.moneyShort(m.total, cur) })
      ]));
    });
    box.appendChild(dist);
    return box;
  }

  function saldosPanel(cur) {
    var saldos = M.saldosPendientes();
    if (!saldos.length) return el('p', { class: 'muted small', text: 'No hay saldos pendientes: todos los cierres están cobrados.' });
    var total = saldos.reduce(function (a, c) { return a + c.saldo; }, 0);
    var tabla = el('table', { class: 'mini' }, [
      el('thead', {}, [el('tr', {}, [
        el('th', { text: 'Cliente' }), el('th', { text: 'Cerró' }),
        el('th', { text: 'Pagó' }), el('th', { text: 'Debe' })
      ])])
    ]);
    var tb = el('tbody');
    saldos.slice(0, 8).forEach(function (c) {
      tb.appendChild(el('tr', {
        class: 'mini__click',
        onclick: function () { AE.recordCard.open('leads', c.id, function () { AE.app.render(); }); }
      }, [
        el('td', { text: c.nombre }),
        el('td', { text: c.closer || '—' }),
        el('td', { text: U.money(c.pagado, cur) }),
        el('td', { class: 'neg', text: U.money(c.saldo, cur) })
      ]));
    });
    tabla.appendChild(tb);
    return el('div', {}, [
      tabla,
      el('p', { class: 'muted small', text: 'Total por cobrar: ' + U.money(total, cur) + ' en ' + saldos.length + ' clientes.' })
    ]);
  }

  function topClientesPanel(cur) {
    var top = M.topClientes(periodo, 6);
    if (!top.length) return el('p', { class: 'muted small', text: 'Sin cobros en este periodo.' });
    var max = top[0].total || 1;
    var box = el('div', { class: 'dist' });
    top.forEach(function (c) {
      box.appendChild(el('div', { class: 'dist__row' }, [
        el('span', { class: 'dist__label', text: c.nombre }),
        el('div', { class: 'dist__track' }, [
          el('div', { class: 'dist__bar', style: 'width:' + Math.max(4, (c.total / max) * 100) + '%;--chip:#3ec9a7' })
        ]),
        el('span', { class: 'dist__n', text: U.moneyShort(c.total, cur) })
      ]));
    });
    return box;
  }

  /* ---------------- alumnos ---------------- */

  function alumnosPanel(cur) {
    var a = M.alumnos();
    if (!a.total) {
      return el('section', { class: 'panel panel--wide' }, [
        el('h3', { class: 'panel__title', text: 'Alumnos' }),
        el('p', { class: 'muted small', text: 'Todavía no hay alumnos cargados.' })
      ]);
    }
    return el('section', { class: 'panel panel--wide' }, [
      el('h3', { class: 'panel__title', text: 'Alumnos y cobranzas' }),
      el('div', { class: 'proj-grid' }, [
        projItem('Alumnos', a.total, a.activos + ' activos'),
        projItem('Por vencer', a.porVencer, 'en 15 días o menos'),
        projItem('Vencidos', a.vencidos, a.vencidos ? 'revisar renovación' : 'ninguno'),
        projItem('Facturado', U.money(a.facturado, cur), 'contratado en total'),
        projItem('Cobrado', U.money(a.cobrado, cur), U.pct(a.cobrado, a.facturado) + '% del total'),
        projItem('Por cobrar', U.money(a.saldo, cur), a.saldo > 0 ? 'saldo pendiente' : 'todo cobrado'),
        projItem('Casos de éxito', a.casosExito, 'para contenido')
      ])
    ]);
  }

  function vencimientosPanel(cur) {
    var a = M.alumnos();
    var box = el('div', {});

    if (a.proximasCuotas.length) {
      box.appendChild(el('h4', { class: 'acts__title', text: 'Cuotas a cobrar' }));
      a.proximasCuotas.forEach(function (x) {
        var dias = U.daysBetween(new Date(), x.proxima_cuota);
        box.appendChild(el('div', { class: 'act' }, [
          el('span', { class: 'act__date', text: U.formatDate(x.proxima_cuota) }),
          el('span', { class: 'act__text', text: x.nombre }),
          el('span', { class: 'act__who num', text: U.money(x.saldo, cur) }),
          el('span', { class: dias < 0 ? 'neg' : '', text: dias < 0 ? 'vencida' : 'en ' + dias + ' d' })
        ]));
      });
    }

    if (a.porVencerPronto.length) {
      box.appendChild(el('h4', { class: 'acts__title', style: 'margin-top:12px', text: 'Programas que terminan' }));
      a.porVencerPronto.slice(0, 6).forEach(function (x) {
        box.appendChild(el('div', { class: 'act' }, [
          el('span', { class: 'act__date', text: U.formatDate(x.fecha_fin) }),
          el('span', { class: 'act__text', text: x.nombre + ' · ' + (x.programa || '') }),
          el('span', { class: 'act__who', text: x.dias_restantes + ' días' })
        ]));
      });
    }

    if (!box.children.length) {
      box.appendChild(el('p', { class: 'muted small', text: 'Sin cuotas ni vencimientos en los próximos días.' }));
    }
    return box;
  }

  /* ---------------- actividad del setter ---------------- */

  function setterPanel(soloSetter, ctx) {
    var a = M.actividadSetter(periodo, soloSetter);
    var box = el('div', {});

    var tono = a.estado === 'Por debajo del objetivo' ? 'neg' : a.estado === 'Sin datos' ? '' : 'pos';
    box.appendChild(el('div', { class: 'proj-grid' }, [
      projItem('Días cargados', a.diasCargados, 'en el periodo'),
      projItem('Conversaciones', a.conversaciones, a.outbound + ' en frío'),
      projItem('Agendas', a.agendas, a.seguimientos + ' seguimientos'),
      projItem('Tasa de agenda', U.num(a.tasaAgenda * 100, 1) + '%',
        'objetivo ' + Math.round(a.objetivoMin * 100) + '–' + Math.round(a.objetivoMax * 100) + '%')
    ]));
    box.appendChild(el('p', { class: 'small ' + tono, text: a.estado }));

    if (soloSetter) box.appendChild(cargaDelDia(soloSetter, ctx));
    return box;
  }

  /* Carga rápida del día: el setter no necesita entrar a la tabla */
  function cargaDelDia(setter, ctx) {
    var hoy = M.diaDeHoy(setter);
    var campos = [
      { id: 'conversaciones', label: 'Conversaciones' },
      { id: 'outbound', label: 'Outbound' },
      { id: 'seguimientos', label: 'Seguimientos' },
      { id: 'agendas', label: 'Agendas' }
    ];
    var inputs = {};
    var fila = el('div', { class: 'daily' });
    campos.forEach(function (c) {
      inputs[c.id] = el('input', {
        class: 'inp inp--sm', type: 'number', min: '0',
        value: hoy && hoy[c.id] != null ? hoy[c.id] : ''
      });
      fila.appendChild(el('label', { class: 'daily__field' }, [
        el('span', { class: 'proj__label', text: c.label }),
        inputs[c.id]
      ]));
    });
    fila.appendChild(el('button', {
      class: 'btn2 btn2--primary',
      text: hoy ? 'Actualizar hoy' : 'Cargar hoy',
      onclick: function () {
        var valores = { fecha: U.today(), setter: setter };
        campos.forEach(function (c) { valores[c.id] = U.toNumber(inputs[c.id].value) || 0; });
        if (hoy) S.updateRecord('setter_dia', hoy.id, valores);
        else S.createRecord('setter_dia', valores);
        AE.ui.toast('Día cargado');
        if (ctx) ctx.refresh();
      }
    }));
    return el('div', {}, [
      el('h4', { class: 'acts__title', style: 'margin-top:14px', text: 'Cargar el día de hoy' }),
      fila
    ]);
  }

  /* ---------------- tareas ---------------- */

  function tareasPanel() {
    var tareas = M.misTareas().slice(0, 8);
    var box = el('div', { class: 'task-list' });
    if (!tareas.length) {
      box.appendChild(el('p', { class: 'muted small', text: 'No tenés tareas pendientes. 🎉' }));
    }
    tareas.forEach(function (t) {
      var vencida = t.vence && U.parseDate(t.vence) < new Date();
      box.appendChild(el('label', { class: 'task' }, [
        el('input', {
          type: 'checkbox',
          onchange: function () {
            S.updateRecord('tareas', t.id, { hecha: true });
            AE.app.render();
            AE.ui.toast('Tarea marcada como hecha');
          }
        }),
        el('span', { class: 'task__title', text: t.titulo || 'Sin título' }),
        t.prioridad ? el('span', { class: 'chip', style: '--chip:' + U.colorFor(t.prioridad), text: t.prioridad }) : null,
        el('span', { class: 'task__due' + (vencida ? ' neg' : ''), text: t.vence ? U.formatDate(t.vence) : '' })
      ]));
    });
    box.appendChild(el('div', { class: 'task__foot' }, [
      el('button', {
        class: 'btn2', text: 'Ver todas las tareas',
        onclick: function () { AE.app.ir('#/view/v_tareas_mias'); }
      })
    ]));
    return box;
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

  AE.dashboard = { render: render, grillaKpis: grillaKpis, detalleKpi: detalleKpi };
})(window.AE);
