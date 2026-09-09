/* ===================================================================
   Alpha CRM — formulario de carga de ingresos (pagos y cuotas)
   Reemplaza al formulario externo: carga el cobro, actualiza el lead
   y crea o actualiza la ficha del alumno en un solo paso.
   =================================================================== */
(function (AE) {
  'use strict';

  var U = AE.utils, el = U.el, S = AE.store;

  var NATURALEZAS = ['Reserva', 'Nuevo cierre', 'Cuota', 'Downsell', 'Upsell', 'Renovación', 'Reembolso'];

  /* Qué estado le corresponde al lead según lo que se cobró */
  var ESTADO_POR_NATURALEZA = {
    'Reserva': 'Esperando pago',
    'Nuevo cierre': 'Ganado',
    'Downsell': 'Ganado',
    'Upsell': 'Ganado',
    'Renovación': 'Ganado'
  };

  function opciones(tablaId, campoId) {
    var f = S.field(tablaId, campoId);
    return f ? S.optionsOf(f) : [];
  }

  function selector(lista, valor, placeholder) {
    var sel = el('select', { class: 'inp' });
    sel.appendChild(el('option', { value: '', text: placeholder || '—' }));
    lista.forEach(function (o) {
      var nombre = typeof o === 'string' ? o : o.name;
      sel.appendChild(el('option', { value: nombre, text: nombre, selected: valor === nombre }));
    });
    return sel;
  }

  function seccion(titulo, ayuda, contenido) {
    return el('section', { class: 'form-sec' }, [
      el('h4', { class: 'form-sec__title', text: titulo }),
      ayuda ? el('p', { class: 'form-sec__help', html: ayuda }) : null,
      el('div', { class: 'form-sec__grid' }, contenido)
    ]);
  }

  function abrir(opciones_) {
    opciones_ = opciones_ || {};
    var cur = S.settings().currency;
    var equipo = S.table('equipo').records;
    var programas = S.table('programas').records;
    var leads = S.table('leads').records;

    /* ---------- Datos del ingreso ---------- */

    var leadSel = el('select', { class: 'inp' }, [
      el('option', { value: '', text: '— Elegí el lead —' }),
      el('option', { value: '__nuevo__', text: '＋ Cargar un lead nuevo' })
    ]);
    leads.slice().sort(function (a, b) {
      return String(a.nombre || '').localeCompare(String(b.nombre || ''), 'es');
    }).forEach(function (l) {
      leadSel.appendChild(el('option', {
        value: l.id, text: l.nombre + (l.estado ? '  ·  ' + l.estado : ''),
        selected: opciones_.leadId === l.id
      }));
    });

    var nombreNuevo = el('input', { class: 'inp', placeholder: 'Nombre y apellido' });
    var filaNuevo = AE.ui.formRow('Nombre del lead nuevo', nombreNuevo);
    filaNuevo.hidden = true;

    var fecha = el('input', { class: 'inp', type: 'date', value: U.today() });
    var closer = selector(
      equipo.filter(function (p) { return p.rol === 'Closer'; }).map(function (p) { return p.nombre; }),
      AE.auth.rol() === 'Closer' ? AE.auth.usuario() : '');
    var setter = selector(
      ['No aplica'].concat(equipo.filter(function (p) { return p.rol === 'Setter'; }).map(function (p) { return p.nombre; })),
      'No aplica');
    var naturaleza = selector(NATURALEZAS, opciones_.naturaleza || '');
    var programa = selector(programas.map(function (p) { return p.nombre; }), '');
    var precioLista = el('span', { class: 'form-hint' });
    var email = el('input', { class: 'inp', type: 'email', placeholder: 'nombre@mail.com' });
    var telefono = el('input', { class: 'inp', type: 'tel', placeholder: '+54 9 11 ...' });
    var cashUSD = el('input', { class: 'inp', type: 'number', min: '0', step: '0.01', placeholder: '0' });
    var notas = el('textarea', {
      class: 'inp', rows: 3,
      placeholder: 'Compromiso de pago, contexto del cierre, lo que haga falta para el seguimiento.'
    });

    /* ---------- Datos financieros ---------- */

    var metodos = opciones('pagos', 'metodo');
    var monto1 = el('input', { class: 'inp', type: 'number', min: '0', step: '0.01' });
    var metodo1 = selector(metodos, '');
    var monto2 = el('input', { class: 'inp', type: 'number', min: '0', step: '0.01' });
    var metodo2 = selector(metodos, '');
    var monto3 = el('input', { class: 'inp', type: 'number', min: '0', step: '0.01' });
    var metodo3 = selector(metodos, '');
    var enPesos = el('input', { class: 'inp', type: 'number', min: '0', step: '0.01', placeholder: 'Monto en $' });
    var avisoPesos = el('span', { class: 'form-hint' });
    var comisionPlataforma = el('input', { class: 'inp', type: 'number', min: '0', step: '0.01', placeholder: '0' });
    var netoAviso = el('span', { class: 'form-hint' });
    var comprobante = el('input', { class: 'inp', type: 'url', placeholder: 'Link al comprobante (Drive, Dropbox…)' });

    /* ---------- Plan de pagos ---------- */

    var enCuotas = el('input', { class: 'inp-check', type: 'checkbox' });
    var cantidadSel = selector(['1', '2', '3', '4', '5', 'Personalizado (+5)'], '');
    var cantidadOtra = el('input', { class: 'inp', type: 'number', min: '6', placeholder: 'Cantidad de cuotas' });
    var montoCuota = el('input', { class: 'inp', type: 'number', min: '0', step: '0.01' });
    var saldoTotal = el('input', { class: 'inp', type: 'number', min: '0', step: '0.01' });
    var proximaCuota = el('input', { class: 'inp', type: 'date' });
    var cuotaN = el('input', { class: 'inp', type: 'number', min: '1', placeholder: '1' });

    /* ---------- Downsell ---------- */

    var downsellMonto = el('input', { class: 'inp', type: 'number', min: '0', step: '0.01' });
    var downsellEntregado = el('textarea', {
      class: 'inp', rows: 2, placeholder: '¿Qué se le entregó? (módulos, sesiones, comunidad…)'
    });

    /* ---------- armado ---------- */

    var error = el('p', { class: 'form-error' });

    var secPlan = seccion('Datos del plan de pagos',
      'Si el lead paga en cuotas, dejá el detalle acá. La primera cuota es la que estás cargando arriba. ' +
      'Si son más de 5, elegí "Personalizado (+5)" y poné el saldo total a abonar.',
      [
        AE.ui.formRow('¿Paga en cuotas?', enCuotas),
        AE.ui.formRow('Cantidad de cuotas', cantidadSel),
        AE.ui.formRow('Cuántas cuotas (si es +5)', cantidadOtra),
        AE.ui.formRow('Número de esta cuota', cuotaN),
        AE.ui.formRow('Monto por cuota (' + cur + ')', montoCuota),
        AE.ui.formRow('Saldo total a abonar (' + cur + ')', saldoTotal),
        AE.ui.formRow('Fecha de la próxima cuota', proximaCuota)
      ]);

    var secDownsell = seccion('Downsell',
      'Qué se le vendió y qué se le entregó, para que quede el detalle del downsell.',
      [
        AE.ui.formRow('Monto del downsell (' + cur + ')', downsellMonto),
        AE.ui.formRow('Qué se le entregó', downsellEntregado)
      ]);
    secDownsell.hidden = true;

    var cuerpo = el('div', { class: 'form-wrap' }, [
      error,
      seccion('Datos del ingreso', null, [
        AE.ui.formRow('Nombre del lead *', leadSel),
        filaNuevo,
        AE.ui.formRow('Fecha del pago *', fecha),
        AE.ui.formRow('Closer *', closer),
        AE.ui.formRow('Setter', setter),
        AE.ui.formRow('Naturaleza del ingreso *', naturaleza),
        AE.ui.formRow('Programa *', el('div', {}, [programa, precioLista])),
        AE.ui.formRow('Correo electrónico', email),
        AE.ui.formRow('Teléfono', telefono),
        AE.ui.formRow('Cash collected ' + cur + ' *',
          cashUSD, 'El monto que entró al negocio, sumando todos los métodos de pago.'),
        AE.ui.formRow('Detalles y compromiso de pago', notas)
      ]),
      seccion('Datos financieros del ingreso',
        'Hasta 3 métodos de pago. Si cobró por uno solo, usá el método 1. ' +
        'Poné cada monto <b>en la moneda en que se efectuó el pago</b>.',
        [
          AE.ui.formRow('Cobrado método 1 *', monto1),
          AE.ui.formRow('Método de pago 1 *', metodo1),
          AE.ui.formRow('Cobrado método 2', monto2),
          AE.ui.formRow('Método de pago 2', metodo2),
          AE.ui.formRow('Cobrado método 3', monto3),
          AE.ui.formRow('Método de pago 3', metodo3),
          conversorPesos(),
          AE.ui.formRow('Comisión de la plataforma (' + cur + ')',
            el('div', {}, [comisionPlataforma, netoAviso]),
            'Lo que se queda Stripe, PayPal, Mercado Pago… Dejalo en 0 si fue transferencia.'),
          AE.ui.formRow('Comprobante', comprobante)
        ]),
      secPlan,
      secDownsell
    ]);

    /* Si el cliente pagó en pesos, se pasa a dólares con la cotización de la semana */
    function conversorPesos() {
      var cot = S.settings().cotizacion || {};
      if (!cot.valor) return null;

      function convertir() {
        var pesos = U.toNumber(enPesos.value);
        if (!pesos) { avisoPesos.textContent = ''; return null; }
        var dolares = Math.round((pesos / cot.valor) * 100) / 100;
        avisoPesos.textContent = U.num(pesos) + ' pesos = ' + U.money(dolares, cur) +
          '  ·  dólar a ' + U.num(cot.valor) +
          (cot.fecha ? ' del ' + U.formatDate(cot.fecha) : '');
        return dolares;
      }
      enPesos.addEventListener('input', convertir);

      return AE.ui.formRow('¿Cobraste en pesos?',
        el('div', { class: 'conv' }, [
          el('div', { class: 'conv__row' }, [
            enPesos,
            el('button', {
              class: 'btn2', type: 'button', text: 'Pasar a ' + cur,
              onclick: function () {
                var dolares = convertir();
                if (!dolares) { AE.ui.toast('Poné el monto en pesos', 'warn'); return; }
                cashUSD.value = dolares;
                cashUSD.dispatchEvent(new Event('change'));
                AE.ui.toast('Cargado ' + U.money(dolares, cur));
              }
            })
          ]),
          avisoPesos
        ]),
        'Escribí el monto en pesos y pasalo a ' + cur + ' con la cotización de la semana.');
    }

    /* ---------- comportamiento ---------- */

    leadSel.addEventListener('change', function () {
      filaNuevo.hidden = leadSel.value !== '__nuevo__';
      var lead = S.record('leads', leadSel.value);
      if (!lead) return;
      if (lead.email) email.value = lead.email;
      if (lead.telefono) telefono.value = lead.telefono;
      if (lead.closer) closer.value = lead.closer;
      if (lead.setter) setter.value = lead.setter;
      var alumno = S.alumnoDe(lead.id);
      if (alumno) {
        if (alumno.programa) programa.value = alumno.programa;
        if (alumno.cantidad_cuotas) {
          enCuotas.checked = true;
          cantidadSel.value = alumno.cantidad_cuotas > 5 ? 'Personalizado (+5)' : String(alumno.cantidad_cuotas);
          cantidadOtra.value = alumno.cantidad_cuotas > 5 ? alumno.cantidad_cuotas : '';
          montoCuota.value = alumno.monto_cuota || '';
          cuotaN.value = (S.pagosDeAlumno(alumno.id).filter(function (p) {
            return p.tipo === 'Cuota';
          }).length + 1);
          naturaleza.value = 'Cuota';
        }
        actualizarPrograma();
      }
    });

    function actualizarPrograma() {
      var prog = programas.filter(function (p) { return p.nombre === programa.value; })[0];
      precioLista.textContent = prog && prog.precio_lista
        ? 'Precio de lista: ' + U.money(prog.precio_lista, cur)
        : '';
      if (prog && prog.precio_lista && !saldoTotal.value && !cashUSD.value) {
        saldoTotal.value = prog.precio_lista;
      }
    }
    programa.addEventListener('change', actualizarPrograma);

    naturaleza.addEventListener('change', function () {
      secDownsell.hidden = naturaleza.value !== 'Downsell';
      if (naturaleza.value === 'Downsell' && !downsellMonto.value) downsellMonto.value = cashUSD.value;
      if (naturaleza.value === 'Cuota') enCuotas.checked = true;
    });

    /* El método 1 se completa solo con el total si hay uno solo */
    cashUSD.addEventListener('change', function () {
      if (!monto1.value) monto1.value = cashUSD.value;
      if (naturaleza.value === 'Downsell' && !downsellMonto.value) downsellMonto.value = cashUSD.value;
      mostrarNeto();
    });

    /* Se ve al toque cuánto entra de verdad después de la plataforma */
    function mostrarNeto() {
      var bruto = U.toNumber(cashUSD.value) || 0;
      var costo = U.toNumber(comisionPlataforma.value) || 0;
      if (!bruto && !costo) { netoAviso.textContent = ''; return; }
      netoAviso.textContent = 'Neto que entra: ' + U.money(bruto - costo, cur) +
        (costo ? '  (de ' + U.money(bruto, cur) + ')' : '');
    }
    comisionPlataforma.addEventListener('input', mostrarNeto);
    cashUSD.addEventListener('input', mostrarNeto);

    var modal = AE.ui.modal({
      title: 'Cargar ingreso',
      wide: true,
      body: cuerpo,
      actions: [
        { label: 'Cancelar' },
        {
          label: 'Guardar ingreso', kind: 'primary',
          onClick: function () { return guardar(false); }
        },
        {
          label: 'Guardar y cargar otro',
          onClick: function () { return guardar(true); }
        }
      ]
    });

    /* ---------- validación y guardado ---------- */

    function fallar(mensaje, campo) {
      error.textContent = mensaje;
      error.scrollIntoView({ block: 'nearest' });
      if (campo) campo.focus();
      return false;
    }

    function guardar(seguirCargando) {
      error.textContent = '';

      var nombre = leadSel.value === '__nuevo__' ? nombreNuevo.value.trim() : '';
      if (!leadSel.value) return fallar('Elegí el lead o cargá uno nuevo.', leadSel);
      if (leadSel.value === '__nuevo__' && !nombre) return fallar('Poné el nombre del lead nuevo.', nombreNuevo);
      if (!fecha.value) return fallar('Falta la fecha del pago.', fecha);
      if (!closer.value) return fallar('Falta el closer.', closer);
      if (!naturaleza.value) return fallar('Elegí la naturaleza del ingreso.', naturaleza);
      if (!programa.value) return fallar('Elegí el programa.', programa);

      var total = U.toNumber(cashUSD.value);
      if (!total) return fallar('Poné el cash collected en ' + cur + '.', cashUSD);
      if (!U.toNumber(monto1.value)) return fallar('Poné el monto cobrado por el método 1.', monto1);
      if (!metodo1.value) return fallar('Elegí el método de pago 1.', metodo1);

      /* Lead: el que eligieron o uno nuevo */
      var lead = leadSel.value === '__nuevo__'
        ? S.createRecord('leads', Object.assign(AE.defaults.para('leads'), {
            nombre: nombre, fecha_contacto: fecha.value
          }))
        : S.record('leads', leadSel.value);

      var parcheLead = { closer: closer.value };
      if (email.value.trim()) parcheLead.email = email.value.trim();
      if (telefono.value.trim()) parcheLead.telefono = telefono.value.trim();
      if (setter.value && setter.value !== 'No aplica') parcheLead.setter = setter.value;
      var nuevoEstado = ESTADO_POR_NATURALEZA[naturaleza.value];
      if (nuevoEstado) parcheLead.estado = nuevoEstado;
      if (naturaleza.value !== 'Reembolso') parcheLead.oferta = programa.value;
      S.updateRecord('leads', lead.id, parcheLead);

      /* Alumno: se crea la primera vez y se actualiza en los cobros siguientes */
      var prog = programas.filter(function (p) { return p.nombre === programa.value; })[0];
      var cuotas = enCuotas.checked
        ? (cantidadSel.value === 'Personalizado (+5)'
            ? U.toNumber(cantidadOtra.value) : U.toNumber(cantidadSel.value))
        : null;
      var alumno = S.alumnoDe(lead.id);
      var datosAlumno = {
        nombre: lead.nombre,
        email: email.value.trim() || (alumno && alumno.email) || lead.email || '',
        telefono: telefono.value.trim() || (alumno && alumno.telefono) || lead.telefono || '',
        programa: programa.value,
        modalidad: enCuotas.checked ? 'Plan de cuotas' : 'Pago completo',
        lead: lead.id
      };
      if (cuotas) datosAlumno.cantidad_cuotas = cuotas;
      if (U.toNumber(montoCuota.value)) datosAlumno.monto_cuota = U.toNumber(montoCuota.value);
      if (proximaCuota.value) datosAlumno.proxima_cuota = proximaCuota.value;
      if (naturaleza.value === 'Downsell') {
        datosAlumno.downsell_monto = U.toNumber(downsellMonto.value) || total;
        if (downsellEntregado.value.trim()) datosAlumno.downsell_entregado = downsellEntregado.value.trim();
      }

      var precioAcordado = U.toNumber(saldoTotal.value) ||
        (alumno && U.toNumber(alumno.precio_total)) ||
        (prog && U.toNumber(prog.precio_lista)) || total;
      datosAlumno.precio_total = precioAcordado;

      if (!alumno) {
        datosAlumno.fecha_ingreso = fecha.value;
        datosAlumno.duracion = (prog && U.toNumber(prog.duracion_dias)) || 90;
        datosAlumno.estado = 'Activo';
        alumno = S.createRecord('alumnos', datosAlumno);
      } else {
        S.updateRecord('alumnos', alumno.id, datosAlumno);
      }

      /* El cobro */
      var esCuota = naturaleza.value === 'Cuota' || (enCuotas.checked && naturaleza.value !== 'Reembolso');
      S.createRecord('pagos', {
        concepto: naturaleza.value + ' — ' + lead.nombre,
        alumno: alumno.id, lead: lead.id,
        fecha: fecha.value,
        naturaleza: naturaleza.value,
        programa: programa.value,
        cuota: esCuota ? (U.toNumber(cuotaN.value) || 1) : null,
        monto: naturaleza.value === 'Reembolso' ? -Math.abs(total) : total,
        tipo: naturaleza.value === 'Reembolso' ? 'Reembolso'
          : esCuota ? 'Cuota'
          : (total >= precioAcordado ? 'Pago total' : 'Pago inicial'),
        monto_1: U.toNumber(monto1.value), metodo: metodo1.value,
        monto_2: U.toNumber(monto2.value), metodo_2: metodo2.value,
        monto_3: U.toNumber(monto3.value), metodo_3: metodo3.value,
        comision_plataforma: U.toNumber(comisionPlataforma.value) || null,
        closer: closer.value,
        setter: setter.value === 'No aplica' ? '' : setter.value,
        factura: comprobante.value.trim(),
        notas: notas.value.trim()
      });

      var suma = (U.toNumber(monto1.value) || 0) + (U.toNumber(monto2.value) || 0) + (U.toNumber(monto3.value) || 0);
      AE.ui.toast('Ingreso cargado: ' + U.money(total, cur) + ' de ' + lead.nombre);
      if (Math.abs(suma - total) > 0.5) {
        AE.ui.toast('Ojo: los métodos suman ' + U.money(suma, cur) + ' y el cash collected dice ' +
          U.money(total, cur) + '. Puede ser por el cambio de moneda.', 'warn');
      }

      if (opciones_.onSave) opciones_.onSave();
      if (seguirCargando) { modal.close(); abrir(opciones_); return false; }
      return true;
    }

    return modal;
  }

  AE.ingresoForm = { abrir: abrir };
})(window.AE);
