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
    var equipo = [
      { id: U.uid('rec'), nombre: 'Lucas Giménez', rol: 'Setter', email: 'lucas@alphaecommerce.com', meta_cash: 0, comision: 5, activo: true },
      { id: U.uid('rec'), nombre: 'Ana Moretti', rol: 'Setter', email: 'ana@alphaecommerce.com', meta_cash: 0, comision: 5, activo: true },
      { id: U.uid('rec'), nombre: 'Diego Ramos', rol: 'Closer', email: 'diego@alphaecommerce.com', meta_cash: 25000, comision: 10, activo: true },
      { id: U.uid('rec'), nombre: 'Sol Ferreyra', rol: 'Closer', email: 'sol@alphaecommerce.com', meta_cash: 20000, comision: 10, activo: true },
      { id: U.uid('rec'), nombre: 'Admin', rol: 'Admin', email: 'hola@alphaecommerce.com', meta_cash: 0, comision: 0, activo: true }
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

    return { leads: leads, actividades: actividades, recursos: recursos, equipo: equipo, metas: metas };
  }

  AE.seed = { build: build, miembros: null };
})(window.AE);
