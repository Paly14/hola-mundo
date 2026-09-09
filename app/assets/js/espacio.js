/* ===================================================================
   Alpha CRM — "Mi espacio": la portada de un setter o un closer.
   Accesos directos, sus leads con el seguimiento, sus KPIs y, abajo
   de todo, sus comisiones.
   =================================================================== */
(function (AE) {
  'use strict';

  var U = AE.utils, el = U.el, S = AE.store, M = AE.metrics, F = AE.fields;

  var PERIODOS = { mes: 'Este mes', mesPasado: 'Mes pasado', '90d': 'Últimos 90 días', todo: 'Todo' };
  var periodo = 'mes';

  /* Comisión por defecto si la persona no la tiene cargada en Equipo */
  var COMISION = { Closer: 10, Setter: 5 };

  function yo() { return AE.auth.usuario(); }
  function miRol() { return AE.auth.rol(); }

  function miFicha() {
    return S.table('equipo').records.filter(function (p) { return p.nombre === yo(); })[0] || {};
  }

  function miComision() {
    var ficha = miFicha();
    var valor = U.toNumber(ficha.comision);
    return valor != null && valor > 0 ? valor : (COMISION[miRol()] || 0);
  }

  /* ---------------- render ---------------- */

  function render(host, ctx) {
    var rol = miRol();
    host.innerHTML = '';
    host.appendChild(encabezado(ctx));
    host.appendChild(accesos(ctx));
    host.appendChild(metricas(rol));
    host.appendChild(leadsPanel(ctx));
    host.appendChild(rol === 'Setter' ? kpisDiarios(ctx) : llamadasPanel(ctx));
    host.appendChild(comisionesPanel());
  }

  function encabezado(ctx) {
    var sel = el('div', { class: 'seg' });
    Object.keys(PERIODOS).forEach(function (k) {
      sel.appendChild(el('button', {
        class: 'seg__btn' + (periodo === k ? ' is-on' : ''), text: PERIODOS[k],
        onclick: function () { periodo = k; ctx.refresh(); }
      }));
    });
    return el('div', { class: 'dash-head' }, [
      el('div', {}, [
        el('h2', { class: 'dash-title', text: 'Hola, ' + yo() }),
        el('p', { class: 'muted small', text: 'Tu espacio de trabajo como ' + miRol().toLowerCase() +
          ' · comisión del ' + U.num(miComision()) + '%' })
      ]),
      sel
    ]);
  }

  /* ---------------- accesos directos ---------------- */

  function accesos(ctx) {
    var botones = [];

    if (AE.perms.puedeCargarIngreso()) {
      botones.push({ texto: '💵 Cargar ingreso', tono: 'verde', click: function () {
        AE.ingresoForm.abrir({ onSave: ctx.refresh });
      } });
    }
    if (AE.perms.puedeVerTabla('setter_dia')) {
      botones.push({ texto: '📅 Cargar mi día', tono: 'azul', click: function () {
        var fila = document.querySelector('.daily');
        if (fila) fila.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } });
    }
    botones.push({ texto: '🎯 Mis leads', click: function () {
      AE.app.ir('#/view/' + (miRol() === 'Setter' ? 'v_setter' : 'v_closer'));
    } });
    botones.push({ texto: '✅ Mis tareas', click: function () { AE.app.ir('#/view/v_tareas_mias'); } });
    botones.push({ texto: '📚 Biblioteca de recursos', click: function () { AE.app.ir('#/view/v_recursos'); } });

    var grid = el('div', { class: 'accesos' });
    botones.forEach(function (b) {
      grid.appendChild(el('button', {
        class: 'acceso' + (b.tono ? ' acceso--' + b.tono : ''), text: b.texto, onclick: b.click
      }));
    });

    /* Los recursos marcados como destacados que tengan link */
    S.allRows('recursos').filter(function (r) {
      return r.destacado && r.url && (r.para === 'Todos' || r.para === miRol());
    }).slice(0, 4).forEach(function (r) {
      grid.appendChild(el('a', {
        class: 'acceso acceso--link', href: r.url, target: '_blank', rel: 'noopener',
        text: '🔗 ' + r.titulo
      }));
    });

    return el('section', { class: 'panel panel--wide' }, [
      el('h3', { class: 'panel__title', text: 'Accesos directos' }), grid
    ]);
  }

  /* ---------------- métricas ---------------- */

  function metricas(rol) {
    var filtro = rol === 'Setter' ? { setter: yo() } : { closer: yo() };
    var d = M.calcular(periodo, filtro);
    var com = misComisiones();
    var items;

    if (rol === 'Setter') {
      var act = M.actividadSetter(periodo, yo());
      items = [
        { label: 'Conversaciones', value: act.conversaciones, hint: act.outbound + ' en frío' },
        { label: 'Agendas', value: act.agendas, hint: 'tasa ' + U.num(act.tasaAgenda * 100, 1) + '%' },
        { label: 'Leads nuevos', value: d.leads, hint: d.abiertos + ' abiertos' },
        { label: 'Shows', value: d.shows, hint: d.showRate + '% show rate' },
        { label: 'Cierres', value: d.cierres, hint: d.closeRate + '% close rate' },
        { label: 'Tu comisión', value: U.money(com.totalPeriodo, S.settings().currency),
          hint: U.num(miComision()) + '% de ' + U.moneyShort(com.cashPeriodo, S.settings().currency), strong: true }
      ];
    } else {
      items = [
        { label: 'Llamadas agendadas', value: d.agendadas, hint: d.noShows + ' no shows' },
        { label: 'Shows', value: d.shows, hint: d.showRate + '% show rate' },
        { label: 'Cierres', value: d.cierres, hint: d.closeRate + '% close rate' },
        { label: 'En seguimiento', value: d.registros.abiertos.length, hint: 'para cerrar' },
        { label: 'Cash generado', value: U.money(com.cashPeriodo, S.settings().currency), hint: 'de tus cierres' },
        { label: 'Tu comisión', value: U.money(com.totalPeriodo, S.settings().currency),
          hint: U.num(miComision()) + '% del cash cobrado', strong: true }
      ];
    }

    var grid = el('div', { class: 'kpis' });
    items.forEach(function (k) {
      grid.appendChild(el('div', { class: 'kpi' + (k.strong ? ' kpi--strong' : '') }, [
        el('span', { class: 'kpi__label', text: k.label }),
        el('span', { class: 'kpi__value', text: k.value }),
        el('span', { class: 'kpi__hint', text: k.hint })
      ]));
    });
    return el('div', {}, [grid]);
  }

  /* ---------------- mis leads con el seguimiento ---------------- */

  function ultimaActividad(leadId) {
    var t = S.table('actividades');
    if (!t) return null;
    return t.records.filter(function (a) { return a.lead === leadId; })
      .sort(function (a, b) { return (U.parseDate(b.fecha) || 0) - (U.parseDate(a.fecha) || 0); })[0] || null;
  }

  function leadsPanel(ctx) {
    var campo = miRol() === 'Setter' ? 'setter' : 'closer';
    var mios = S.allRows('leads').filter(function (l) { return l[campo] === yo() || !l[campo]; });
    var abiertos = mios.filter(function (l) {
      return AE.schema.ETAPAS.abierto.indexOf(l.estado) >= 0;
    }).sort(function (a, b) {
      return (U.parseDate(a.fecha_proximo_paso) || U.parseDate(a.fecha_llamada) || 0) -
             (U.parseDate(b.fecha_proximo_paso) || U.parseDate(b.fecha_llamada) || 0);
    });

    var cuerpo = el('div', { class: 'leadlist' });
    if (!abiertos.length) {
      cuerpo.appendChild(el('p', { class: 'muted small', text: 'No tenés leads abiertos en este momento.' }));
    }

    abiertos.slice(0, 12).forEach(function (l) {
      var act = ultimaActividad(l.id);
      var seguimiento = l.proximo_paso || (act && act.detalle) || l.notas || l.sensacion || '';
      var cuando = l.fecha_proximo_paso || l.fecha_llamada || l.fecha_contacto;

      cuerpo.appendChild(el('div', {
        class: 'leadrow',
        onclick: function () { AE.recordCard.open('leads', l.id, ctx.refresh); }
      }, [
        el('div', { class: 'leadrow__main' }, [
          el('span', { class: 'leadrow__name', text: l.nombre }),
          el('span', { class: 'leadrow__chips', html:
            (l.estado ? F.chip(l.estado, F.colorOf(S.field('leads', 'estado'), l.estado)) : '') +
            (l.origen ? ' ' + F.chip(l.origen, U.colorFor(l.origen)) : '') })
        ]),
        el('div', { class: 'leadrow__note', text: seguimiento || 'Sin seguimiento cargado' }),
        el('div', { class: 'leadrow__meta' }, [
          el('span', { text: cuando ? U.formatDate(cuando) : '' }),
          act ? el('span', { class: 'muted', text: 'últ. ' + (act.tipo || 'contacto') + ' ' + U.formatDate(act.fecha) }) : null
        ]),
        el('button', {
          class: 'btn2 leadrow__btn', text: '＋ Nota',
          onclick: function (e) {
            e.stopPropagation();
            notaRapida(l, ctx);
          }
        })
      ]));
    });

    return el('section', { class: 'panel panel--wide' }, [
      el('h3', { class: 'panel__title', text: 'Mis leads y su seguimiento' }),
      cuerpo,
      el('button', {
        class: 'btn2', text: 'Ver todos mis leads',
        onclick: function () { AE.app.ir('#/view/' + (miRol() === 'Setter' ? 'v_setter' : 'v_closer')); }
      })
    ]);
  }

  /* Nota rápida: queda como actividad y como próximo paso del lead */
  function notaRapida(lead, ctx) {
    var detalle = el('textarea', { class: 'inp', rows: 3, placeholder: '¿Qué pasó en este contacto?' });
    var tipo = el('select', { class: 'inp' });
    S.optionsOf(S.field('actividades', 'tipo')).forEach(function (o) {
      tipo.appendChild(el('option', { value: o.name, text: o.name }));
    });
    var resultado = el('select', { class: 'inp' });
    S.optionsOf(S.field('actividades', 'resultado')).forEach(function (o) {
      resultado.appendChild(el('option', { value: o.name, text: o.name }));
    });
    var proximo = el('input', { class: 'inp', value: lead.proximo_paso || '', placeholder: 'Ej: reenviar propuesta' });
    var cuando = el('input', { class: 'inp', type: 'date', value: lead.fecha_proximo_paso || '' });

    AE.ui.modal({
      title: 'Seguimiento de ' + lead.nombre,
      body: el('div', {}, [
        AE.ui.formRow('Tipo de contacto', tipo),
        AE.ui.formRow('Resultado', resultado),
        AE.ui.formRow('Qué pasó', detalle),
        AE.ui.formRow('Próximo paso', proximo),
        AE.ui.formRow('¿Cuándo?', cuando)
      ]),
      actions: [
        { label: 'Cancelar' },
        {
          label: 'Guardar', kind: 'primary',
          onClick: function () {
            if (!detalle.value.trim()) { AE.ui.toast('Escribí qué pasó', 'warn'); return false; }
            S.createRecord('actividades', {
              fecha: new Date().toISOString().slice(0, 16), lead: lead.id,
              tipo: tipo.value, resultado: resultado.value,
              responsable: yo(), detalle: detalle.value.trim()
            });
            S.updateRecord('leads', lead.id, {
              proximo_paso: proximo.value.trim(),
              fecha_proximo_paso: cuando.value
            });
            AE.ui.toast('Seguimiento guardado');
            ctx.refresh();
          }
        }
      ]
    });
  }

  /* ---------------- KPIs diarios (setter) ---------------- */

  function kpisDiarios(ctx) {
    var act = M.actividadSetter(periodo, yo());
    var cuerpo = el('div', {});

    cuerpo.appendChild(cargaDelDia(ctx));

    if (act.serie.length) {
      var tabla = el('table', { class: 'mini' }, [
        el('thead', {}, [el('tr', {}, [
          el('th', { text: 'Fecha' }), el('th', { text: 'Conversaciones' }),
          el('th', { text: 'Outbound' }), el('th', { text: 'Seguimientos' }),
          el('th', { text: 'Agendas' }), el('th', { text: 'Tasa' })
        ])])
      ]);
      var tb = el('tbody');
      act.serie.slice().reverse().slice(0, 14).forEach(function (d) {
        var tasa = d.conversaciones ? (d.agendas || 0) / d.conversaciones : 0;
        tb.appendChild(el('tr', {}, [
          el('td', { text: U.formatDate(d.fecha) }),
          el('td', { text: d.conversaciones || 0 }),
          el('td', { text: d.outbound || 0 }),
          el('td', { text: d.seguimientos || 0 }),
          el('td', { text: d.agendas || 0 }),
          el('td', { class: tasa >= act.objetivoMin ? 'pos' : '', text: U.num(tasa * 100, 1) + '%' })
        ]));
      });
      tabla.appendChild(tb);
      tabla.appendChild(el('tfoot', {}, [el('tr', {}, [
        el('td', { text: 'Total' }),
        el('td', { text: act.conversaciones }), el('td', { text: act.outbound }),
        el('td', { text: act.seguimientos }), el('td', { text: act.agendas }),
        el('td', { class: 'pos', text: U.num(act.tasaAgenda * 100, 1) + '%' })
      ])]));
      cuerpo.appendChild(tabla);
    }

    return el('section', { class: 'panel panel--wide' }, [
      el('h3', { class: 'panel__title', text: 'Mis KPIs diarios' }),
      el('p', { class: 'muted small', text: 'Objetivo de tasa de agenda: ' +
        Math.round(act.objetivoMin * 100) + '–' + Math.round(act.objetivoMax * 100) + '%. ' + act.estado }),
      cuerpo
    ]);
  }

  function cargaDelDia(ctx) {
    var hoy = M.diaDeHoy(yo());
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
        el('span', { class: 'proj__label', text: c.label }), inputs[c.id]
      ]));
    });
    fila.appendChild(el('button', {
      class: 'btn2 btn2--primary', text: hoy ? 'Actualizar hoy' : 'Cargar hoy',
      onclick: function () {
        var valores = { fecha: U.today(), setter: yo() };
        campos.forEach(function (c) { valores[c.id] = U.toNumber(inputs[c.id].value) || 0; });
        if (hoy) S.updateRecord('setter_dia', hoy.id, valores);
        else S.createRecord('setter_dia', valores);
        AE.ui.toast('Día cargado');
        ctx.refresh();
      }
    }));
    return el('div', {}, [
      el('h4', { class: 'acts__title', text: 'Cargar el día de hoy' }), fila
    ]);
  }

  /* ---------------- llamadas del closer ---------------- */

  function llamadasPanel(ctx) {
    var mias = S.allRows('leads').filter(function (l) {
      return l.closer === yo() && l.fecha_llamada && M.enPeriodo(l.fecha_llamada, periodo);
    }).sort(function (a, b) { return (U.parseDate(b.fecha_llamada) || 0) - (U.parseDate(a.fecha_llamada) || 0); });

    if (!mias.length) {
      return el('section', { class: 'panel panel--wide' }, [
        el('h3', { class: 'panel__title', text: 'Mis llamadas' }),
        el('p', { class: 'muted small', text: 'No hay llamadas en este periodo.' })
      ]);
    }

    var tabla = el('table', { class: 'mini' }, [
      el('thead', {}, [el('tr', {}, [
        el('th', { text: 'Lead' }), el('th', { text: 'Fecha' }), el('th', { text: 'Fuente' }),
        el('th', { text: '¿Se presentó?' }), el('th', { text: '¿Calificaba?' }),
        el('th', { text: 'Situación' }), el('th', { text: 'Grabación' })
      ])])
    ]);
    var tb = el('tbody');
    mias.forEach(function (l) {
      tb.appendChild(el('tr', {
        class: 'mini__click',
        onclick: function () { AE.recordCard.open('leads', l.id, ctx.refresh); }
      }, [
        el('td', { text: l.nombre }),
        el('td', { text: U.formatDate(l.fecha_llamada) }),
        el('td', { text: l.origen || '—' }),
        el('td', { text: l.se_presento || '—' }),
        el('td', { text: l.calificaba || '—' }),
        el('td', { html: l.estado ? F.chip(l.estado, F.colorOf(S.field('leads', 'estado'), l.estado)) : '' }),
        el('td', { html: l.grabacion
          ? '<a class="cell-link" href="' + U.esc(l.grabacion) + '" target="_blank" rel="noopener">Fathom</a>' : '' })
      ]));
    });
    tabla.appendChild(tb);

    return el('section', { class: 'panel panel--wide' }, [
      el('h3', { class: 'panel__title', text: 'Mis llamadas' }), tabla
    ]);
  }

  /* ---------------- comisiones ---------------- */

  /**
   * Las comisiones se calculan sobre el cash efectivamente cobrado
   * en los pagos donde figura esta persona como closer o como setter.
   */
  function misComisiones() {
    var campo = miRol() === 'Setter' ? 'setter' : 'closer';
    var tabla = S.table('pagos');
    var todos = tabla ? tabla.records.filter(function (p) { return p[campo] === yo(); }) : [];
    var tasa = miComision() / 100;

    function armar(lista) {
      var cash = lista.reduce(function (a, p) {
        var monto = U.toNumber(p.monto) || 0;
        return a + (p.tipo === 'Reembolso' ? -Math.abs(monto) : monto);
      }, 0);
      return { cash: cash, comision: cash * tasa, cantidad: lista.length };
    }

    var delPeriodo = todos.filter(function (p) { return M.enPeriodo(p.fecha, periodo); });
    var nuevos = delPeriodo.filter(function (p) { return p.tipo !== 'Cuota'; });
    var cuotas = delPeriodo.filter(function (p) { return p.tipo === 'Cuota'; });

    /* Agrupado por mes, como en la planilla */
    var meses = {};
    todos.forEach(function (p) {
      var mes = U.monthKey(p.fecha) || 'sin fecha';
      if (!meses[mes]) meses[mes] = [];
      meses[mes].push(p);
    });

    return {
      tasa: tasa,
      pagos: delPeriodo,
      cashPeriodo: armar(delPeriodo).cash,
      totalPeriodo: armar(delPeriodo).comision,
      nuevos: armar(nuevos), cuotas: armar(cuotas),
      historico: armar(todos),
      porMes: Object.keys(meses).sort().reverse().map(function (m) {
        return { mes: m, pagos: meses[m], resumen: armar(meses[m]) };
      })
    };
  }

  function comisionesPanel() {
    var cur = S.settings().currency;
    var com = misComisiones();

    var resumen = el('div', { class: 'proj-grid' }, [
      item('Comisión del periodo', U.money(com.totalPeriodo, cur), com.pagos.length + ' cobros'),
      item('Nuevos cierres', U.money(com.nuevos.comision, cur), U.moneyShort(com.nuevos.cash, cur) + ' cobrados'),
      item('Cuotas', U.money(com.cuotas.comision, cur), U.moneyShort(com.cuotas.cash, cur) + ' cobrados'),
      item('Comisión histórica', U.money(com.historico.comision, cur), 'desde el inicio')
    ]);

    var cuerpo = el('div', {});
    cuerpo.appendChild(resumen);

    if (!com.porMes.length) {
      cuerpo.appendChild(el('p', { class: 'muted small', text:
        'Todavía no hay cobros a tu nombre. Se cuentan los pagos donde figurás como ' +
        miRol().toLowerCase() + '.' }));
    }

    com.porMes.forEach(function (grupo) {
      var tabla = el('table', { class: 'mini' }, [
        el('thead', {}, [el('tr', {}, [
          el('th', { text: 'Cliente' }), el('th', { text: 'Fecha' }),
          el('th', { text: 'Cash collected' }), el('th', { text: 'Tu comisión' }),
          el('th', { text: 'Programa' }), el('th', { text: 'Naturaleza' })
        ])])
      ]);
      var tb = el('tbody');
      grupo.pagos.slice().sort(function (a, b) {
        return (U.parseDate(b.fecha) || 0) - (U.parseDate(a.fecha) || 0);
      }).forEach(function (p) {
        var monto = U.toNumber(p.monto) || 0;
        tb.appendChild(el('tr', {}, [
          el('td', { text: S.titleOf('leads', p.lead) || S.titleOf('alumnos', p.alumno) || p.concepto }),
          el('td', { text: U.formatDate(p.fecha) }),
          el('td', { text: U.money(monto, cur) }),
          el('td', { class: 'pos', text: U.money(monto * com.tasa, cur) }),
          el('td', { text: p.programa || '—' }),
          el('td', { html: p.naturaleza ? F.chip(p.naturaleza, U.colorFor(p.naturaleza)) : '' })
        ]));
      });
      tabla.appendChild(tb);

      cuerpo.appendChild(el('div', { class: 'com-mes' }, [
        el('div', { class: 'com-mes__head' }, [
          el('strong', { text: U.monthLabel(grupo.mes) }),
          el('span', { class: 'muted small', text: grupo.pagos.length + ' cobros · ' +
            U.money(grupo.resumen.cash, cur) + ' cobrados' }),
          el('span', { class: 'com-mes__total', text: U.money(grupo.resumen.comision, cur) })
        ]),
        tabla
      ]));
    });

    return el('section', { class: 'panel panel--wide' }, [
      el('h3', { class: 'panel__title', text: 'Mis comisiones' }),
      el('p', { class: 'muted small', text: 'Se calculan sobre el cash efectivamente cobrado, al ' +
        U.num(miComision()) + '%. Si algo no coincide, avisale a administración.' }),
      cuerpo
    ]);
  }

  function item(label, value, hint) {
    return el('div', { class: 'proj' }, [
      el('span', { class: 'proj__label', text: label }),
      el('span', { class: 'proj__value', text: value }),
      el('span', { class: 'proj__hint', text: hint || '' })
    ]);
  }

  AE.espacio = { render: render, misComisiones: misComisiones };
})(window.AE);
