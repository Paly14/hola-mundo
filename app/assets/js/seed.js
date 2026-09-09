/* ===================================================================
   Alpha CRM — datos de ejemplo (se pueden borrar de un click)
   Las fechas se generan relativas a hoy para que el dashboard
   siempre muestre el mes en curso y los dos anteriores.
   =================================================================== */
(function (AE) {
  'use strict';

  var U = AE.utils;

  /* Random determinístico (mulberry32): los datos demo son siempre los mismos */
  function rng(seed) {
    var t = seed >>> 0;
    return function () {
      t = (t + 0x6D2B79F5) >>> 0;
      var r = Math.imul(t ^ (t >>> 15), t | 1);
      r ^= r + Math.imul(r ^ (r >>> 7), r | 61);
      return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
    };
  }

  function isoDaysAgo(days, hour) {
    var d = new Date();
    d.setDate(d.getDate() - days);
    if (hour != null) { d.setHours(hour, 0, 0, 0); return d.toISOString().slice(0, 16); }
    return d.toISOString().slice(0, 10);
  }

  var NOMBRES = [
    'Martina Rossi', 'Julián Paz', 'Camila Duarte', 'Nicolás Ferrer', 'Sofía Aguirre',
    'Bruno Salinas', 'Valentina Ortiz', 'Tomás Ledesma', 'Agustina Vera', 'Facundo Ríos',
    'Lucía Medina', 'Iván Castro', 'Paula Benítez', 'Matías Sosa', 'Renata Molina',
    'Gonzalo Ibarra', 'Micaela Franco', 'Emiliano Ruiz', 'Delfina Cabrera', 'Santiago Peña',
    'Abril Navarro', 'Joaquín Herrera', 'Milagros Silva', 'Thiago Domínguez'
  ];

  var ORIGENES = ['Instagram', 'TikTok', 'YouTube', 'Referido', 'Ads', 'Orgánico'];
  var OFERTAS = ['Alpha Starter', 'Alpha Pro', 'Alpha Elite'];
  var PRECIOS = { 'Alpha Starter': 1200, 'Alpha Pro': 3000, 'Alpha Elite': 6000 };
  var OBJECIONES = ['Precio', 'Tiempo', 'Pareja / socio', 'Confianza', 'No es prioridad', 'Sin objeción'];

  function build() {
    var rand = rng(20260909);
    /* La clave se guarda hasheada; la inicial es el nombre en minúscula. */
    function persona(nombre, rol, email, meta, comision, clave) {
      return {
        id: U.uid('rec'), nombre: nombre, rol: rol, email: email,
        meta_cash: meta, comision: comision, activo: true,
        clave: U.sha256(clave), claveInicial: true
      };
    }
    var equipo = [
      persona('Mariano', 'Dueño', 'mariano@alphaecommerce.com', 0, 0, 'mariano'),
      persona('Admin', 'Admin', 'hola@alphaecommerce.com', 0, 0, 'admin'),
      persona('Lucas Giménez', 'Setter', 'lucas@alphaecommerce.com', 0, 5, 'lucas'),
      persona('Ana Moretti', 'Setter', 'ana@alphaecommerce.com', 0, 5, 'ana'),
      persona('Diego Ramos', 'Closer', 'diego@alphaecommerce.com', 25000, 10, 'diego'),
      persona('Sol Ferreyra', 'Closer', 'sol@alphaecommerce.com', 20000, 10, 'sol')
    ];
    var setters = ['Lucas Giménez', 'Ana Moretti'];
    var closers = ['Diego Ramos', 'Sol Ferreyra'];

    var leads = [];
    var actividades = [];

    for (var i = 0; i < 72; i++) {
      // Sesgo hacia fechas recientes: el mes en curso tiene que tener movimiento
      var diasAtras = Math.floor(Math.pow(rand(), 1.7) * 88);
      var r = rand();
      var estado, precio = null, cash = null, prob = null, objecion = null;
      var oferta = OFERTAS[Math.floor(rand() * OFERTAS.length)];
      var setter = setters[Math.floor(rand() * setters.length)];
      var closer = closers[Math.floor(rand() * closers.length)];

      if (r < 0.14) { estado = 'Nuevo'; prob = 10; closer = ''; }
      else if (r < 0.28) { estado = 'Contactado'; prob = 20; closer = ''; }
      else if (r < 0.38) { estado = 'Calificado'; prob = 35; closer = ''; }
      else if (r < 0.54) { estado = 'Agendado'; prob = 45; precio = PRECIOS[oferta]; }
      else if (r < 0.64) { estado = 'Show'; prob = 60; precio = PRECIOS[oferta]; }
      else if (r < 0.72) { estado = 'Seguimiento'; prob = 55; precio = PRECIOS[oferta]; objecion = OBJECIONES[Math.floor(rand() * 4)]; }
      else if (r < 0.80) { estado = 'No Show'; prob = 15; precio = PRECIOS[oferta]; }
      else if (r < 0.90) { estado = 'Perdido'; prob = 0; precio = PRECIOS[oferta]; objecion = OBJECIONES[Math.floor(rand() * 5)]; }
      else {
        estado = 'Ganado'; prob = 100; precio = PRECIOS[oferta];
        cash = rand() < 0.55 ? precio : Math.round(precio * 0.5);
        objecion = 'Sin objeción';
      }

      var agendado = AE.schema.ETAPAS.agendado.indexOf(estado) >= 0;
      var nombre = NOMBRES[i % NOMBRES.length] + (i >= NOMBRES.length ? ' ' + (Math.floor(i / NOMBRES.length) + 1) : '');
      var lead = {
        id: U.uid('rec'),
        nombre: nombre,
        telefono: '+54 9 11 ' + (4000 + Math.floor(rand() * 5999)) + '-' + (1000 + Math.floor(rand() * 8999)),
        email: U.slug(nombre).replace(/_/g, '.') + '@mail.com',
        instagram: '@' + U.slug(nombre).replace(/_/g, ''),
        origen: ORIGENES[Math.floor(rand() * ORIGENES.length)],
        estado: estado,
        setter: setter,
        closer: closer,
        fecha_contacto: isoDaysAgo(diasAtras),
        fecha_llamada: agendado ? isoDaysAgo(Math.max(0, diasAtras - 3), 10 + Math.floor(rand() * 8)) : '',
        oferta: agendado ? oferta : '',
        precio: precio,
        cash_collected: cash,
        probabilidad: prob,
        interes: 1 + Math.floor(rand() * 5),
        proximo_paso: estado === 'Seguimiento' ? 'Reenviar propuesta y cerrar' :
          estado === 'Agendado' ? 'Confirmar asistencia 24hs antes' :
          estado === 'Contactado' ? 'Calificar por WhatsApp' : '',
        fecha_proximo_paso: ['Nuevo', 'Contactado', 'Calificado', 'Agendado', 'Seguimiento'].indexOf(estado) >= 0
          ? isoDaysAgo(-Math.floor(rand() * 10)) : '',
        objecion: objecion,
        grabacion: '',
        notas: ''
      };
      leads.push(lead);

      actividades.push({
        id: U.uid('rec'),
        fecha: isoDaysAgo(diasAtras, 9 + Math.floor(rand() * 9)),
        lead: lead.id,
        tipo: rand() < 0.6 ? 'WhatsApp' : 'DM',
        responsable: setter,
        resultado: estado === 'Nuevo' ? 'No contestó' : agendado ? 'Agendó' : 'Conectó',
        detalle: 'Primer contacto desde ' + lead.origen + '.'
      });
      if (agendado) {
        actividades.push({
          id: U.uid('rec'),
          fecha: isoDaysAgo(Math.max(0, diasAtras - 3), 11 + Math.floor(rand() * 7)),
          lead: lead.id,
          tipo: 'Llamada',
          responsable: closer,
          resultado: estado === 'Ganado' ? 'Cerró' : estado === 'No Show' ? 'No contestó' :
            estado === 'Perdido' ? 'Perdido' : estado === 'Seguimiento' ? 'Objeción' : 'Conectó',
          detalle: 'Llamada de cierre — oferta ' + oferta + '.'
        });
      }
    }

    var recursos = [
      { id: U.uid('rec'), titulo: 'Script de setting (DM a llamada)', categoria: 'Scripts', para: 'Setter', url: '', descripcion: 'Guion completo para pasar de DM a llamada agendada.', destacado: true },
      { id: U.uid('rec'), titulo: 'Script de cierre — llamada 1', categoria: 'Scripts', para: 'Closer', url: '', descripcion: 'Estructura de la llamada: contexto, dolor, oferta, cierre.', destacado: true },
      { id: U.uid('rec'), titulo: 'Manejo de objeciones', categoria: 'Formación', para: 'Closer', url: '', descripcion: 'Precio, tiempo, pareja, confianza: respuestas listas.', destacado: true },
      { id: U.uid('rec'), titulo: 'Plantilla de seguimiento 7 días', categoria: 'Plantillas', para: 'Todos', url: '', descripcion: 'Secuencia de mensajes post llamada.', destacado: false },
      { id: U.uid('rec'), titulo: 'Contrato de servicio', categoria: 'Contratos', para: 'Closer', url: '', descripcion: 'Modelo de contrato para enviar al cerrar.', destacado: false },
      { id: U.uid('rec'), titulo: 'Onboarding de cliente nuevo', categoria: 'Formación', para: 'Todos', url: '', descripcion: 'Checklist de los primeros 7 días del cliente.', destacado: false },
      { id: U.uid('rec'), titulo: 'Landing de Alpha Ecommerce', categoria: 'Otros', para: 'Todos', url: '../index.html', descripcion: 'La página VSL que ven los leads.', destacado: false },
      { id: U.uid('rec'), titulo: 'Casos de éxito en video', categoria: 'Videos', para: 'Todos', url: '../index.html#casos', descripcion: 'Testimonios para enviar antes de la llamada.', destacado: true }
    ];

    var mesActual = U.monthKey(new Date());
    var metas = [
      { id: U.uid('rec'), mes: U.addMonths(mesActual, -2), meta_cash: 30000, meta_leads: 120, meta_agendas: 45, meta_cierres: 12, nota: '' },
      { id: U.uid('rec'), mes: U.addMonths(mesActual, -1), meta_cash: 38000, meta_leads: 140, meta_agendas: 55, meta_cierres: 15, nota: '' },
      { id: U.uid('rec'), mes: mesActual, meta_cash: 45000, meta_leads: 160, meta_agendas: 65, meta_cierres: 18, nota: 'Mes de escala' },
      { id: U.uid('rec'), mes: U.addMonths(mesActual, 1), meta_cash: 55000, meta_leads: 190, meta_agendas: 78, meta_cierres: 22, nota: 'Proyectado' }
    ];

    /* ---- Facturación: cada lead ganado deja su historial de cobros ---- */
    var pagos = [];
    leads.filter(function (l) { return l.estado === 'Ganado' && l.cash_collected; }).forEach(function (l) {
      var total = l.cash_collected;
      var completo = total >= (l.precio || 0);
      var fecha = (l.fecha_llamada || l.fecha_contacto || '').slice(0, 10);
      var metodo = ['Transferencia', 'Mercado Pago', 'Stripe', 'PayPal'][Math.floor(rand() * 4)];
      if (completo) {
        pagos.push({
          id: U.uid('rec'), concepto: 'Pago total — ' + l.nombre, lead: l.id, fecha: fecha,
          monto: total, tipo: 'Pago total', metodo: metodo, closer: l.closer, factura: '', notas: ''
        });
      } else {
        var inicial = Math.round(total * 0.6);
        pagos.push({
          id: U.uid('rec'), concepto: 'Pago inicial — ' + l.nombre, lead: l.id, fecha: fecha,
          monto: inicial, tipo: 'Pago inicial', metodo: metodo, closer: l.closer, factura: '', notas: ''
        });
        pagos.push({
          id: U.uid('rec'), concepto: 'Cuota 1 — ' + l.nombre, lead: l.id,
          fecha: isoDaysAgo(Math.max(0, (U.daysBetween(fecha, new Date()) || 0) - 15)),
          monto: total - inicial, tipo: 'Cuota', metodo: metodo, closer: l.closer, factura: '', notas: ''
        });
      }
    });

    /* ---- Contenido y guiones (espacio de Mariano) ---- */
    var contenido = [
      {
        id: U.uid('rec'), titulo: 'El error #1 al lanzar una tienda', formato: 'Reel', pilar: 'Educativo',
        estado: 'Publicado', gancho: 'El 90% de las tiendas que fracasan cometen ESTE error en la semana 1.',
        guion: 'GANCHO (0-3s): "El 90% de las tiendas que fracasan cometen este error en la semana 1."\n\nDESARROLLO (3-25s): Eligen el producto por gusto propio y no por demanda. Mostrar en pantalla cómo validar demanda en 10 minutos.\n\nPRUEBA (25-40s): Caso real: alumno que cambió de producto y pasó de 0 a 4.000 USD en 30 días.\n\nCIERRE (40-50s): "Si querés que revisemos tu producto, escribime ALPHA por DM."',
        cta: 'Escribime ALPHA por DM', responsable: 'Mariano',
        fecha_publicacion: isoDaysAgo(12), referencia: '', link_publicado: '', notas: ''
      },
      {
        id: U.uid('rec'), titulo: 'Testimonio Jona: de 0 a 10k', formato: 'Reel', pilar: 'Testimonio',
        estado: 'Editar', gancho: 'Empezó sin saber nada de ecommerce y hoy factura 10k por mes.',
        guion: 'GANCHO: clip de Jona diciendo la cifra.\n\nCONTEXTO: dónde estaba antes (trabajo fijo, cero experiencia).\n\nPROCESO: los 3 pasos que siguió.\n\nRESULTADO + CTA: "Mirá el caso completo en el link."',
        cta: 'Caso completo en el link', responsable: 'Mariano',
        fecha_publicacion: isoDaysAgo(-3), referencia: '', link_publicado: '', notas: 'Cortar a 45 seg máximo.'
      },
      {
        id: U.uid('rec'), titulo: '3 productos que YO no vendería en 2026', formato: 'Reel', pilar: 'Autoridad',
        estado: 'Grabar', gancho: 'Tres productos que están de moda y que yo no tocaría ni con un palo.',
        guion: 'GANCHO fuerte con lista en pantalla.\n\n1. Producto saturado por ads.\n2. Producto con logística imposible.\n3. Producto sin recompra.\n\nCIERRE: qué mirar en su lugar (margen, recompra, envío).',
        cta: 'Comentá "LISTA" y te paso los criterios', responsable: 'Mariano',
        fecha_publicacion: isoDaysAgo(-6), referencia: '', link_publicado: '', notas: ''
      },
      {
        id: U.uid('rec'), titulo: 'Detrás de escena: revisando cuentas de alumnos', formato: 'Historia',
        pilar: 'Detrás de escena', estado: 'Idea',
        gancho: 'Un martes cualquiera revisando 12 cuentas.', guion: '',
        cta: 'Sumate a la próxima revisión', responsable: 'Mariano',
        fecha_publicacion: '', referencia: '', link_publicado: '', notas: ''
      },
      {
        id: U.uid('rec'), titulo: 'Carrusel: checklist de las primeras 48hs', formato: 'Carrusel',
        pilar: 'Educativo', estado: 'Guion',
        gancho: 'Las 7 cosas que tenés que tener listas antes de gastar el primer peso en ads.',
        guion: 'Slide 1: gancho.\nSlide 2-8: un ítem por slide.\nSlide 9: CTA a la llamada.',
        cta: 'Agendá tu diagnóstico gratis', responsable: 'Mariano',
        fecha_publicacion: isoDaysAgo(-9), referencia: '', link_publicado: '', notas: ''
      },
      {
        id: U.uid('rec'), titulo: 'Oferta: cierre de cupos del mes', formato: 'Reel', pilar: 'Oferta',
        estado: 'Programado', gancho: 'Quedan 4 lugares y después cerramos hasta el mes que viene.',
        guion: 'GANCHO: escasez real.\nQUÉ INCLUYE: 3 bullets.\nPARA QUIÉN ES / PARA QUIÉN NO.\nCTA con urgencia.',
        cta: 'Link en bio para aplicar', responsable: 'Mariano',
        fecha_publicacion: isoDaysAgo(-1), referencia: '', link_publicado: '', notas: ''
      }
    ];

    /* ---- Tareas del equipo ---- */
    function tarea(titulo, asignados, estado, prioridad, area, dias, detalle) {
      return {
        id: U.uid('rec'), titulo: titulo, asignados: asignados,
        estado: estado, hecha: estado === 'Hecha', prioridad: prioridad, area: area,
        vence: isoDaysAgo(-dias), lead: '', detalle: detalle || '', creada_por: 'Mariano'
      };
    }
    var tareas = [
      tarea('Llamar a los no-show de la semana', ['Ana Moretti'], 'Pendiente', 'Alta', 'Ventas', 1, 'Reagendar antes del viernes.'),
      tarea('Cargar los leads del último lanzamiento', ['Lucas Giménez'], 'En curso', 'Alta', 'Ventas', 2, ''),
      tarea('Revisar grabaciones de llamadas perdidas', ['Diego Ramos'], 'Pendiente', 'Media', 'Ventas', 4, 'Buscar el patrón de objeción.'),
      tarea('Actualizar el script de cierre con las nuevas objeciones', ['Sol Ferreyra', 'Diego Ramos'], 'Pendiente', 'Media', 'Ventas', 6, ''),
      tarea('Grabar los 3 reels de la semana', ['Mariano'], 'En curso', 'Alta', 'Contenido', 3, 'Bloque de grabación el jueves.'),
      tarea('Escribir guion del carrusel de checklist', ['Mariano'], 'Hecha', 'Media', 'Contenido', -2, ''),
      tarea('Conciliar los cobros del mes', ['Admin'], 'Pendiente', 'Alta', 'Administración', 5, 'Cruzar con la tabla Facturación.'),
      tarea('Pagar comisiones de closers', ['Admin', 'Mariano'], 'Pendiente', 'Alta', 'Administración', 8, ''),
      tarea('Armar el onboarding de los clientes nuevos', ['Ana Moretti'], 'Bloqueada', 'Media', 'Operaciones', 7, 'Falta definir el acceso al aula.'),
      tarea('Subir los contratos firmados a la carpeta', ['Sol Ferreyra'], 'Hecha', 'Baja', 'Operaciones', -4, ''),
      tarea('Definir la meta de cash del mes que viene', ['Mariano', 'Admin'], 'Pendiente', 'Media', 'Administración', 10, '')
    ];

    return {
      leads: leads, actividades: actividades, recursos: recursos, equipo: equipo,
      metas: metas, pagos: pagos, contenido: contenido, tareas: tareas
    };
  }

  AE.seed = { build: build, miembros: null };
})(window.AE);
