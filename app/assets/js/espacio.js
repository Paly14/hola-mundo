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

  /* Un admin puede mirar el espacio de otra persona sin cerrar sesión */
  var viendoComo = null;

  function yo() { return viendoComo || AE.auth.usuario(); }

  function miRol() {
    if (!viendoComo) return AE.auth.rol();
    return fichaDe(viendoComo).rol || 'Setter';
  }

  function fichaDe(nombre) {
    return S.table('equipo').records.filter(function (p) { return p.nombre === nombre; })[0] || {};
  }

  function miFicha() { return fichaDe(yo()); }

  /* true si estoy mirando el espacio de otro, no el mío */
  function espiando() { return !!viendoComo && viendoComo !== AE.auth.usuario(); }

  function verComo(nombre) {
    viendoComo = (nombre && nombre !== AE.auth.usuario()) ? nombre : null;
  }

  function esVendedor(rol) { return rol === 'Setter' || rol === 'Closer'; }

  function miComision() { return M.porcentajeDe(miFicha()); }

  /* Hay gente que comisiona sobre sus propios cierres y gente sobre todo lo
     que factura el negocio (por ejemplo, quien dirige el área comercial). */
  function comisionaTodo() { return miFicha().base_comision === 'Todas las ventas'; }

  /* Muestra cierres y comisiones a quien tenga un porcentaje asignado */
  function cobraComision() { return esVendedor(miRol()) || miComision() > 0; }

  /* ---------------- render ---------------- */

  function render(host, ctx) {
    var rol = miRol();
    host.innerHTML = '';
    host.appendChild(encabezado(ctx));
    if (espiando()) host.appendChild(bannerPreview(ctx));
    host.appendChild(accesos(ctx));
    host.appendChild(metricas(rol));
    /* El tracker diario es lo primero que toca un setter cada día */
    if (rol === 'Setter') host.appendChild(kpisDiarios(ctx));
    host.appendChild(leadsPanel(ctx));
    if (rol === 'Closer') host.appendChild(llamadasPanel(ctx));
    host.appendChild(tareasPanel(ctx));
    if (cobraComision()) {
      host.appendChild(cierresPanel(ctx));
      host.appendChild(comisionesPanel());
    }
  }

  function bannerPreview(ctx) {
    return el('div', { class: 'preview-bar' }, [
      el('span', { text: 'Estás viendo el espacio de ' + viendoComo + ' · ' +
        (fichaDe(viendoComo).rol || '') + '. Es exactamente lo que ve al entrar.' }),
      el('button', {
        class: 'btn2', text: 'Volver a mi espacio',
        onclick: function () { verComo(null); ctx.refresh(); }
      })
    ]);
  }

  function encabezado(ctx) {
    var sel = el('div', { class: 'seg' });
    Object.keys(PERIODOS).forEach(function (k) {
      sel.appendChild(el('button', {
        class: 'seg__btn' + (periodo === k ? ' is-on' : ''), text: PERIODOS[k],
        onclick: function () { periodo = k; ctx.refresh(); }
      }));
    });
    var titulo = espiando() ? 'Espacio de ' + yo() : 'Hola, ' + yo();
    var bajada = cobraComision()
      ? (espiando() ? 'Como lo ve ' + yo() + ' · ' + miRol() : 'Tu espacio de trabajo como ' + miRol().toLowerCase()) +
        ' · comisión del ' + U.num(miComision()) + '% del neto ' +
        (comisionaTodo() ? 'de todas las ventas' : 'de tus cierres')
      : 'Tus tareas, tus leads y el acceso a los espacios del equipo';

    return el('div', { class: 'dash-head' }, [
      el('div', {}, [
        el('h2', { class: 'dash-title', text: titulo }),
        el('p', { class: 'muted small', text: bajada })
      ]),
      selectorDeEspacio(ctx),
      sel
    ]);
  }

  /* Sólo para dueño y admin: mirar el espacio de cualquiera del equipo */
  function selectorDeEspacio(ctx) {
    if (!AE.perms.esAdmin()) return null;
    var gente = S.table('equipo').records.filter(function (p) { return p.activo !== false && p.nombre; });
    var sel = el('select', { class: 'inp inp--sm' });
    sel.appendChild(el('option', { value: '', text: 'Mi espacio (' + AE.auth.usuario() + ')' }));
    gente.filter(function (p) { return p.nombre !== AE.auth.usuario(); }).forEach(function (p) {
      sel.appendChild(el('option', {
        value: p.nombre, text: 'Ver el espacio de ' + p.nombre + ' · ' + (p.rol || ''),
        selected: viendoComo === p.nombre
      }));
    });
    sel.value = viendoComo || '';
    sel.addEventListener('change', function () { verComo(sel.value); ctx.refresh(); });
    return el('label', { class: 'ver-como' }, [
      el('span', { class: 'proj__label', text: 'Ver como' }), sel
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
        { label: 'Leads nuevos', value: d.leads, hint: d.abiertos + ' abiertos',
          rows: d.registros.nuevos, campoFecha: 'fecha_contacto',
          criterio: 'Tus leads cuya fecha de contacto cae en el periodo.' },
        { label: 'Shows', value: d.shows, hint: d.showRate + '% show rate',
          rows: d.registros.shows, campoFecha: 'fecha_llamada',
          criterio: 'De tus agendadas del periodo, las que se presentaron.' },
        { label: 'Cierres', value: d.cierres, hint: d.closeRate + '% close rate',
          rows: d.registros.ganados, campoFecha: 'fecha_llamada',
          criterio: 'Tus leads en estado Ganado con fecha de llamada dentro del periodo.' },
        { label: 'Tu comisión', value: U.money(com.totalPeriodo, S.settings().currency),
          hint: U.num(miComision()) + '% de ' + U.moneyShort(com.netoPeriodo, S.settings().currency) + ' netos', strong: true }
      ];
    } else {
      items = [
        { label: 'Llamadas agendadas', value: d.agendadas, hint: d.noShows + ' no shows',
          rows: d.registros.agendadas, campoFecha: 'fecha_llamada',
          criterio: 'Tus llamadas cuya fecha cae en el periodo elegido. Una call del mes ' +
            'pasado cuenta en el mes pasado, aunque el lead siga abierto.' },
        { label: 'Shows', value: d.shows, hint: d.showRate + '% show rate',
          rows: d.registros.shows, campoFecha: 'fecha_llamada',
          criterio: 'De tus agendadas del periodo, las que se presentaron.' },
        { label: 'Cierres', value: d.cierres, hint: d.closeRate + '% close rate',
          rows: d.registros.ganados, campoFecha: 'fecha_llamada',
          criterio: 'Tus leads en estado Ganado con fecha de llamada dentro del periodo.' },
        { label: 'En seguimiento', value: d.registros.abiertos.length, hint: 'para cerrar',
          rows: d.registros.abiertos, campoFecha: 'fecha_llamada',
          criterio: 'Todos tus leads abiertos, sin importar la fecha.' },
        { label: 'Cash generado', value: U.money(com.cashPeriodo, S.settings().currency),
          hint: com.plataformaPeriodo ? U.moneyShort(com.netoPeriodo, S.settings().currency) + ' netos' : 'de tus cierres' },
        { label: 'Tu comisión', value: U.money(com.totalPeriodo, S.settings().currency),
          hint: U.num(miComision()) + '% de ' + U.moneyShort(com.netoPeriodo, S.settings().currency) + ' netos', strong: true }
      ];
    }

    return el('div', {}, [AE.dashboard.grillaKpis(items)]);
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
    var mios = S.allRows('leads').filter(function (l) {
      if (l[campo] === yo()) return true;
      /* Los leads sin dueño aparecen en el espacio propio para que alguien los tome,
         pero no cuando un admin está mirando el espacio de otra persona. */
      return !l[campo] && !espiando();
    });
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
      el('h3', { class: 'panel__title', text: espiando() ? 'Leads de ' + yo() : 'Mis leads y su seguimiento' }),
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
      el('h3', { class: 'panel__title', text: espiando() ? 'KPIs diarios de ' + yo() : 'Mis KPIs diarios' }),
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
      el('h4', { class: 'acts__title', text: espiando() ? 'Cargar el día de hoy de ' + yo() : 'Cargar el día de hoy' }), fila
    ]);
  }

  /* ---------------- llamadas del closer ---------------- */

  function llamadasPanel(ctx) {
    var mias = S.allRows('leads').filter(function (l) {
      return l.closer === yo() && l.fecha_llamada && M.enPeriodo(l.fecha_llamada, periodo);
    }).sort(function (a, b) { return (U.parseDate(b.fecha_llamada) || 0) - (U.parseDate(a.fecha_llamada) || 0); });

    if (!mias.length) {
      return el('section', { class: 'panel panel--wide' }, [
        el('h3', { class: 'panel__title', text: espiando() ? 'Llamadas de ' + yo() : 'Mis llamadas' }),
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
      el('h3', { class: 'panel__title', text: espiando() ? 'Llamadas de ' + yo() : 'Mis llamadas' }), tabla
    ]);
  }

  /* ---------------- tareas ---------------- */

  function tareasDe(nombre) {
    return S.allRows('tareas').filter(function (t) {
      if (t.hecha) return false;
      var asignados = Array.isArray(t.asignados) ? t.asignados : (t.asignados ? [t.asignados] : []);
      return asignados.indexOf(nombre) >= 0;
    }).sort(function (a, b) {
      return (U.parseDate(a.vence) || Infinity) - (U.parseDate(b.vence) || Infinity);
    });
  }

  function tareasPanel(ctx) {
    var tareas = tareasDe(yo());
    var box = el('div', { class: 'task-list' });

    if (!tareas.length) {
      box.appendChild(el('p', { class: 'muted small',
        text: espiando() ? yo() + ' no tiene tareas pendientes.' : 'No tenés tareas pendientes. 🎉' }));
    }

    tareas.slice(0, 10).forEach(function (t) {
      var vencida = t.vence && U.parseDate(t.vence) < new Date();
      box.appendChild(el('label', { class: 'task' }, [
        el('input', {
          type: 'checkbox',
          onchange: function () {
            S.updateRecord('tareas', t.id, { hecha: true });
            AE.ui.toast('Tarea marcada como hecha');
            ctx.refresh();
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

    return el('section', { class: 'panel panel--wide' }, [
      el('h3', { class: 'panel__title', text: espiando() ? 'Tareas de ' + yo() : 'Mis tareas' }),
      box
    ]);
  }

  /* ---------------- comisiones ---------------- */

  /* Las reglas de atribución viven en metrics: acá sólo se consultan */
  function leadDelPago(pago) { return M.leadDelPago(pago); }

  function misPagos() { return M.pagosDePersona(miFicha()); }

  /**
   * Las comisiones se calculan sobre el cash efectivamente cobrado.
   */
  function misComisiones() {
    var todos = misPagos();
    var tasa = miComision() / 100;

    /* La comisión se calcula sobre lo que entra de verdad: el cobro menos
       lo que se queda la plataforma de pago. */
    function armar(lista) {
      var bruto = 0, neto = 0;
      lista.forEach(function (p) {
        bruto += M.brutoDePago(p);
        neto += M.netoDePago(p);
      });
      return {
        bruto: bruto, plataforma: bruto - neto, neto: neto,
        cash: bruto, comision: neto * tasa, cantidad: lista.length
      };
    }

    var netoDe = M.netoDePago;

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

    var resumen = armar(delPeriodo);
    return {
      tasa: tasa, netoDe: netoDe,
      pagos: delPeriodo,
      cashPeriodo: resumen.bruto,
      plataformaPeriodo: resumen.plataforma,
      netoPeriodo: resumen.neto,
      totalPeriodo: resumen.comision,
      nuevos: armar(nuevos), cuotas: armar(cuotas),
      historico: armar(todos),
      porMes: Object.keys(meses).sort().reverse().map(function (m) {
        return { mes: m, pagos: meses[m], resumen: armar(meses[m]) };
      })
    };
  }

  /* Los leads propios que terminaron cerrando, con lo que dejaron */
  function misCierres() {
    var campo = miRol() === 'Setter' ? 'setter' : 'closer';
    var otro = campo === 'setter' ? 'closer' : 'setter';
    var tasa = miComision() / 100;

    return S.allRows('leads')
      .filter(function (l) { return l.estado === 'Ganado' && (comisionaTodo() || l[campo] === yo()); })
      .filter(function (l) { return M.enPeriodo(l.fecha_llamada || l.fecha_contacto, periodo); })
      .map(function (l) {
        var alumno = S.alumnoDe(l.id);
        var cobrado = 0, neto = 0;
        misPagos()
          .filter(function (p) { var lead = leadDelPago(p); return lead && lead.id === l.id; })
          .forEach(function (p) {
            cobrado += M.brutoDePago(p);
            neto += M.netoDePago(p);
          });
        var plataforma = cobrado - neto;
        return {
          lead: l,
          fecha: l.fecha_llamada || l.fecha_contacto,
          conQuien: l[otro] || '—',
          programa: (alumno && alumno.programa) || l.oferta || '—',
          precio: (alumno && U.toNumber(alumno.precio_total)) || U.toNumber(l.precio) || 0,
          cobrado: cobrado, plataforma: plataforma, neto: neto,
          comision: neto * tasa
        };
      })
      .sort(function (a, b) { return (U.parseDate(b.fecha) || 0) - (U.parseDate(a.fecha) || 0); });
  }

  function cierresPanel(ctx) {
    var cur = S.settings().currency;
    var cierres = misCierres();
    var otro = miRol() === 'Setter' ? 'Closer' : 'Setter';

    if (!cierres.length) {
      return el('section', { class: 'panel panel--wide' }, [
        el('h3', { class: 'panel__title', text: espiando() ? 'Cierres de ' + yo() : 'Mis cierres' }),
        el('p', { class: 'muted small', text: espiando()
          ? 'No hay cierres de ' + yo() + ' en este periodo.'
          : 'Todavía no hay cierres tuyos en este periodo.' })
      ]);
    }

    var totalCobrado = cierres.reduce(function (a, c) { return a + c.cobrado; }, 0);
    var totalNeto = cierres.reduce(function (a, c) { return a + c.neto; }, 0);
    var totalComision = cierres.reduce(function (a, c) { return a + c.comision; }, 0);
    var pendiente = cierres.reduce(function (a, c) { return a + Math.max(0, c.precio - c.cobrado); }, 0);

    var tabla = el('table', { class: 'mini' }, [
      el('thead', {}, [el('tr', {}, [
        el('th', { text: 'Cliente' }), el('th', { text: 'Fecha' }), el('th', { text: otro }),
        el('th', { text: 'Programa' }), el('th', { text: 'Cobrado' }),
        el('th', { text: 'Neto' }), el('th', { text: 'Tu comisión' })
      ])])
    ]);
    var tb = el('tbody');
    cierres.forEach(function (c) {
      tb.appendChild(el('tr', {
        class: 'mini__click',
        onclick: function () { AE.recordCard.open('leads', c.lead.id, ctx.refresh); }
      }, [
        el('td', { text: c.lead.nombre }),
        el('td', { text: U.formatDate(c.fecha) }),
        el('td', { text: c.conQuien }),
        el('td', { text: c.programa }),
        el('td', { text: U.money(c.cobrado, cur) }),
        el('td', { text: U.money(c.neto, cur) }),
        el('td', { class: 'pos', text: U.money(c.comision, cur) })
      ]));
    });
    tabla.appendChild(tb);
    tabla.appendChild(el('tfoot', {}, [el('tr', {}, [
      el('td', { text: cierres.length + ' cierres' }),
      el('td', {}), el('td', {}), el('td', {}),
      el('td', { text: U.money(totalCobrado, cur) }),
      el('td', { text: U.money(totalNeto, cur) }),
      el('td', { class: 'pos', text: U.money(totalComision, cur) })
    ])]));

    return el('section', { class: 'panel panel--wide' }, [
      el('h3', { class: 'panel__title', text: comisionaTodo() ? 'Cierres del equipo'
        : (espiando() ? 'Cierres de ' + yo() : 'Mis cierres') }),
      tabla,
      pendiente > 0 ? el('p', { class: 'muted small', text:
        'Quedan ' + U.money(pendiente, cur) + ' por cobrar de estos clientes. ' +
        'Tu comisión se suma a medida que entra la plata.' }) : null
    ]);
  }

  function comisionesPanel() {
    var cur = S.settings().currency;
    var com = misComisiones();

    var resumen = el('div', { class: 'proj-grid' }, [
      item('Cobrado (bruto)', U.money(com.cashPeriodo, cur), com.pagos.length + ' cobros'),
      item('Se llevó la plataforma', U.money(com.plataformaPeriodo, cur),
        com.plataformaPeriodo ? 'no comisiona' : 'sin costos'),
      item('Base de tu comisión', U.money(com.netoPeriodo, cur), 'lo que entró de verdad'),
      item('Comisión del periodo', U.money(com.totalPeriodo, cur), U.num(miComision()) + '% del neto'),
      item('Nuevos cierres', U.money(com.nuevos.comision, cur), U.moneyShort(com.nuevos.neto, cur) + ' netos'),
      item('Cuotas', U.money(com.cuotas.comision, cur), U.moneyShort(com.cuotas.neto, cur) + ' netos'),
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
          el('th', { text: 'Cobrado' }), el('th', { text: 'Plataforma' }),
          el('th', { text: 'Neto' }), el('th', { text: 'Tu comisión' }),
          el('th', { text: 'Naturaleza' })
        ])])
      ]);
      var tb = el('tbody');
      grupo.pagos.slice().sort(function (a, b) {
        return (U.parseDate(b.fecha) || 0) - (U.parseDate(a.fecha) || 0);
      }).forEach(function (p) {
        var monto = U.toNumber(p.monto) || 0;
        var costo = U.toNumber(p.comision_plataforma) || 0;
        var neto = com.netoDe(p);
        tb.appendChild(el('tr', {}, [
          el('td', { text: S.titleOf('leads', p.lead) || S.titleOf('alumnos', p.alumno) || p.concepto }),
          el('td', { text: U.formatDate(p.fecha) }),
          el('td', { text: U.money(monto, cur) }),
          el('td', { class: costo ? 'neg' : '', text: costo ? '−' + U.money(costo, cur) : '—' }),
          el('td', { text: U.money(neto, cur) }),
          el('td', { class: 'pos', text: U.money(neto * com.tasa, cur) }),
          el('td', { html: p.naturaleza ? F.chip(p.naturaleza, U.colorFor(p.naturaleza)) : '' })
        ]));
      });
      tabla.appendChild(tb);

      cuerpo.appendChild(el('div', { class: 'com-mes' }, [
        el('div', { class: 'com-mes__head' }, [
          el('strong', { text: U.monthLabel(grupo.mes) }),
          el('span', { class: 'muted small', text: grupo.pagos.length + ' cobros · ' +
            U.money(grupo.resumen.bruto, cur) + ' cobrados · ' +
            U.money(grupo.resumen.neto, cur) + ' netos' }),
          el('span', { class: 'com-mes__total', text: U.money(grupo.resumen.comision, cur) })
        ]),
        tabla
      ]));
    });

    return el('section', { class: 'panel panel--wide' }, [
      el('h3', { class: 'panel__title', text: espiando() ? 'Comisiones de ' + yo() : 'Mis comisiones' }),
      el('p', { class: 'muted small', text: 'Se calculan al ' + U.num(miComision()) + '% del neto: ' +
        'lo cobrado menos lo que se queda la plataforma de pago. ' +
        (comisionaTodo()
          ? 'Toma todas las ventas del negocio.'
          : 'Cuenta lo que lleva tu nombre en el cobro y, si el cobro no dice quién fue, lo que ' +
            'pagaron tus leads. Si algo no coincide, avisale a administración.') }),
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

  AE.espacio = {
    render: render, misComisiones: misComisiones, misCierres: misCierres,
    verComo: verComo, viendo: function () { return yo(); }
  };
})(window.AE);
