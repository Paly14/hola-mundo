/* ===================================================================
   Alpha CRM — base por defecto (tablas, campos, vistas y datos demo)
   Todo esto es editable desde la app; esto es sólo el punto de partida.
   =================================================================== */
(function (AE) {
  'use strict';

  /* Situación del lead: el mismo vocabulario que usa el CRM del closer */
  var ESTADOS = [
    { name: 'Nuevo', color: '#94a3b8' },
    { name: 'Contactado', color: '#5b9dff' },
    { name: 'Calificado', color: '#38bdf8' },
    { name: 'Agendado', color: '#c084fc' },
    { name: 'No Show', color: '#fb7185' },
    { name: 'Presentado', color: '#f2c14e' },
    { name: 'Seguimiento', color: '#ff9248' },
    { name: 'Esperando pago', color: '#38bdf8' },
    { name: 'Ganado', color: '#3ec9a7' },
    { name: 'Perdido', color: '#cbd5e1' }
  ];

  var SI_NO = [{ name: 'Sí', color: '#3ec9a7' }, { name: 'No', color: '#fb7185' }];

  /* Qué estados cuentan como agenda, como show y como cierre */
  var ETAPAS = {
    agendado: ['Agendado', 'No Show', 'Presentado', 'Seguimiento', 'Esperando pago', 'Ganado', 'Perdido'],
    show: ['Presentado', 'Seguimiento', 'Esperando pago', 'Ganado'],
    ganado: ['Ganado'],
    perdido: ['Perdido', 'No Show'],
    abierto: ['Nuevo', 'Contactado', 'Calificado', 'Agendado', 'Presentado', 'Seguimiento', 'Esperando pago']
  };

  /* Roles del equipo. Dueño y Admin ven y editan todo, incluida la facturación. */
  var ROLES = [
    { name: 'Dueño', color: '#ff9248' },
    { name: 'Admin', color: '#f57f2e' },
    { name: 'Setter', color: '#5b9dff' },
    { name: 'Closer', color: '#3ec9a7' },
    { name: 'Editor', color: '#c084fc' }
  ];

  /**
   * Qué ve cada rol.
   *   tablas  : '*' (todas) o la lista de tablas a las que entra
   *   ocultos : campos que no ve dentro de cada tabla
   *   propios : true = sólo sus registros (sus leads, sus tareas)
   *   admin   : puede editar la estructura, el equipo y la facturación
   */
  var PERMISOS = {
    'Dueño': { tablas: '*', ocultos: {}, propios: false, admin: true },
    'Admin': { tablas: '*', ocultos: {}, propios: false, admin: true },
    'Setter': {
      tablas: ['leads', 'actividades', 'setter_dia', 'tareas', 'recursos'],
      ocultos: { leads: ['cash_collected', 'precio', 'oferta', 'objecion', 'grabacion'] },
      propios: true, admin: false
    },
    'Closer': {
      tablas: ['leads', 'actividades', 'alumnos', 'programas', 'tareas', 'recursos'],
      /* El closer ve quién es alumno, pero la plata queda para Dueño y Admin */
      ocultos: {
        leads: ['cash_collected'],
        alumnos: ['precio_total', 'total_pagado', 'saldo', 'proxima_cuota',
          'modalidad', 'comprobantes']
      },
      propios: true, admin: false
    },
    'Editor': {
      tablas: ['contenido', 'tareas', 'recursos'],
      ocultos: {}, propios: true, admin: false
    }
  };

  function field(id, name, type, extra) {
    return Object.assign({ id: id, name: name, type: type, width: 160 }, extra || {});
  }

  var TABLES = [
    {
      id: 'leads', name: 'Leads y Clientes', icon: '🎯', primary: 'nombre',
      fields: [
        field('nombre', 'Nombre', 'text', { width: 190 }),
        field('telefono', 'WhatsApp', 'phone', { width: 150 }),
        field('email', 'Email', 'email', { width: 200 }),
        field('instagram', 'Instagram', 'text', { width: 140 }),
        field('origen', 'Fuente', 'select', {
          width: 130,
          options: [
            { name: 'Ads' }, { name: 'Producto' }, { name: 'Setter 1' }, { name: 'Setter 2' },
            { name: 'Manychat' }, { name: 'Orgánico' }, { name: 'Referido' },
            { name: 'Instagram' }, { name: 'TikTok' }, { name: 'YouTube' }
          ]
        }),
        field('estado', 'Estado', 'select', { width: 130, options: ESTADOS }),
        field('setter', 'Setter', 'select', {
          width: 130, options: [],
          optionsFrom: { table: 'equipo', field: 'nombre', where: { rol: 'Setter' } }
        }),
        field('closer', 'Closer', 'select', {
          width: 130, options: [],
          optionsFrom: { table: 'equipo', field: 'nombre', where: { rol: 'Closer' } }
        }),
        field('fecha_contacto', 'Fecha contacto', 'date', { width: 140 }),
        field('fecha_llamada', 'Fecha llamada', 'datetime', { width: 165 }),
        field('oferta', 'Oferta', 'select', {
          width: 140,
          options: [{ name: 'Alpha Starter' }, { name: 'Alpha Pro' }, { name: 'Alpha Elite' }]
        }),
        field('precio', 'Valor deal', 'currency', { width: 130 }),
        field('cash_collected', 'Cash collected', 'currency', { width: 145 }),
        field('probabilidad', 'Probabilidad', 'percent', { width: 130 }),
        field('interes', 'Interés', 'rating', { width: 120 }),
        field('proximo_paso', 'Próximo paso', 'text', { width: 200 }),
        field('fecha_proximo_paso', 'Fecha próximo paso', 'date', { width: 165 }),
        field('se_presento', '¿Se presentó?', 'select', { width: 130, options: SI_NO }),
        field('calificaba', '¿Calificaba?', 'select', { width: 130, options: SI_NO }),
        field('pago_llamada', 'Pagó en la llamada', 'currency', { width: 160 }),
        field('pago_seguimiento', 'Pagó en seguimiento', 'currency', { width: 170 }),
        field('reagenda', 'Reagenda', 'datetime', { width: 160 }),
        field('presento_reagenda', '¿Fue a la reagenda?', 'select', { width: 165, options: SI_NO }),
        field('contexto', 'Contexto previo', 'longtext', { width: 240 }),
        field('sensacion', '¿Cómo salió la call?', 'longtext', { width: 260 }),
        field('manychat', 'URL de Manychat', 'url', { width: 170 }),
        field('objecion', 'Objeción', 'select', {
          width: 150,
          options: [
            { name: 'Precio' }, { name: 'Tiempo' }, { name: 'Pareja / socio' },
            { name: 'Confianza' }, { name: 'No es prioridad' }, { name: 'Sin objeción' }
          ]
        }),
        field('grabacion', 'Link de Fathom', 'url', { width: 170 }),
        field('notas', 'Notas', 'longtext', { width: 260 })
      ]
    },
    {
      id: 'actividades', name: 'Actividades', icon: '📞', primary: 'detalle',
      fields: [
        field('fecha', 'Fecha', 'datetime', { width: 165 }),
        field('lead', 'Lead', 'link', { width: 190, linkTable: 'leads' }),
        field('tipo', 'Tipo', 'select', {
          width: 130,
          options: [
            { name: 'Llamada' }, { name: 'WhatsApp' }, { name: 'DM' },
            { name: 'Email' }, { name: 'Reunión' }, { name: 'Nota' }
          ]
        }),
        field('responsable', 'Responsable', 'select', {
          width: 140, options: [],
          optionsFrom: { table: 'equipo', field: 'nombre' }
        }),
        field('resultado', 'Resultado', 'select', {
          width: 150,
          options: [
            { name: 'Conectó' }, { name: 'No contestó' }, { name: 'Agendó' },
            { name: 'Reagendó' }, { name: 'Cerró' }, { name: 'Objeción' }, { name: 'Perdido' }
          ]
        }),
        field('detalle', 'Detalle', 'longtext', { width: 320 })
      ]
    },
    {
      id: 'recursos', name: 'Recursos', icon: '📚', primary: 'titulo',
      fields: [
        field('titulo', 'Título', 'text', { width: 220 }),
        field('categoria', 'Categoría', 'select', {
          width: 150,
          options: [
            { name: 'Scripts' }, { name: 'Formación' }, { name: 'Plantillas' },
            { name: 'Contratos' }, { name: 'Videos' }, { name: 'Otros' }
          ]
        }),
        field('para', 'Para', 'select', {
          width: 120,
          options: [{ name: 'Todos' }, { name: 'Setter' }, { name: 'Closer' }, { name: 'Admin' }]
        }),
        field('url', 'Link', 'url', { width: 240 }),
        field('descripcion', 'Descripción', 'longtext', { width: 300 }),
        field('destacado', 'Destacado', 'checkbox', { width: 110 })
      ]
    },
    {
      id: 'equipo', name: 'Equipo', icon: '👥', primary: 'nombre',
      fields: [
        field('nombre', 'Nombre', 'text', { width: 180 }),
        field('rol', 'Rol', 'select', { width: 120, options: ROLES }),
        field('email', 'Email', 'email', { width: 210 }),
        field('meta_cash', 'Meta cash / mes', 'currency', { width: 150 }),
        field('comision', 'Comisión', 'percent', { width: 120 }),
        field('activo', 'Activo', 'checkbox', { width: 100 })
      ]
    },
    {
      id: 'pagos', name: 'Facturación', icon: '💵', primary: 'concepto',
      fields: [
        field('concepto', 'Concepto', 'text', { width: 210 }),
        field('alumno', 'Alumno', 'link', { width: 180, linkTable: 'alumnos' }),
        field('lead', 'Lead', 'link', { width: 170, linkTable: 'leads' }),
        field('fecha', 'Fecha del pago', 'date', { width: 140 }),
        field('naturaleza', 'Naturaleza del ingreso', 'select', {
          width: 175,
          options: [
            { name: 'Reserva', color: '#f2c14e' }, { name: 'Nuevo cierre', color: '#3ec9a7' },
            { name: 'Cuota', color: '#5b9dff' }, { name: 'Downsell', color: '#c084fc' },
            { name: 'Upsell', color: '#ff9248' }, { name: 'Renovación', color: '#38bdf8' },
            { name: 'Reembolso', color: '#fb7185' }
          ]
        }),
        field('programa', 'Programa', 'select', {
          width: 170, options: [],
          optionsFrom: { table: 'programas', field: 'nombre' }
        }),
        field('cuota', 'Cuota N°', 'number', { width: 100 }),
        field('monto', 'Cash collected USD', 'currency', { width: 165 }),
        field('tipo', 'Tipo', 'select', {
          width: 140,
          options: [
            { name: 'Pago inicial', color: '#3ec9a7' }, { name: 'Cuota', color: '#5b9dff' },
            { name: 'Pago total', color: '#ff9248' }, { name: 'Reembolso', color: '#fb7185' }
          ]
        }),
        field('monto_1', 'Cobrado método 1', 'currency', { width: 155 }),
        field('metodo', 'Método de pago 1', 'select', {
          width: 155,
          options: [
            { name: 'Transferencia' }, { name: 'Mercado Pago' }, { name: 'Stripe' },
            { name: 'PayPal' }, { name: 'Efectivo' }, { name: 'Cripto' },
            { name: 'Binance' }, { name: 'Wise' }, { name: 'Otro' }
          ]
        }),
        field('monto_2', 'Cobrado método 2', 'currency', { width: 155 }),
        field('metodo_2', 'Método de pago 2', 'select', {
          width: 155,
          options: [
            { name: 'Transferencia' }, { name: 'Mercado Pago' }, { name: 'Stripe' },
            { name: 'PayPal' }, { name: 'Efectivo' }, { name: 'Cripto' },
            { name: 'Binance' }, { name: 'Wise' }, { name: 'Otro' }
          ]
        }),
        field('monto_3', 'Cobrado método 3', 'currency', { width: 155 }),
        field('metodo_3', 'Método de pago 3', 'select', {
          width: 155,
          options: [
            { name: 'Transferencia' }, { name: 'Mercado Pago' }, { name: 'Stripe' },
            { name: 'PayPal' }, { name: 'Efectivo' }, { name: 'Cripto' },
            { name: 'Binance' }, { name: 'Wise' }, { name: 'Otro' }
          ]
        }),
        field('closer', 'Closer', 'select', {
          width: 130, options: [],
          optionsFrom: { table: 'equipo', field: 'nombre', where: { rol: 'Closer' } }
        }),
        field('setter', 'Setter', 'select', {
          width: 130, options: [],
          optionsFrom: { table: 'equipo', field: 'nombre', where: { rol: 'Setter' } }
        }),
        field('factura', 'Comprobante', 'url', { width: 180 }),
        field('notas', 'Detalles y compromiso de pago', 'longtext', { width: 280 })
      ]
    },
    {
      id: 'programas', name: 'Programas', icon: '📦', primary: 'nombre',
      fields: [
        field('nombre', 'Programa', 'text', { width: 200 }),
        field('tipo', 'Tipo', 'select', {
          width: 150,
          options: [
            { name: 'Programa principal', color: '#ff9248' },
            { name: 'Downsell', color: '#5b9dff' },
            { name: 'Upsell', color: '#c084fc' },
            { name: 'Renovación', color: '#3ec9a7' }
          ]
        }),
        field('precio_lista', 'Precio de lista', 'currency', { width: 150 }),
        field('duracion_dias', 'Duración (días)', 'number', { width: 140 }),
        field('que_incluye', 'Qué incluye', 'longtext', { width: 320 }),
        field('activo', 'Activo', 'checkbox', { width: 90 })
      ]
    },
    {
      id: 'alumnos', name: 'Alumnos', icon: '🎓', primary: 'nombre',
      fields: [
        field('nombre', 'Nombre completo', 'text', { width: 200 }),
        field('email', 'Email', 'email', { width: 200 }),
        field('telefono', 'Teléfono', 'phone', { width: 150 }),
        field('programa', 'Programa', 'select', {
          width: 170, options: [],
          optionsFrom: { table: 'programas', field: 'nombre' }
        }),
        field('estado', 'Estado', 'select', {
          width: 130,
          options: [
            { name: 'Activo', color: '#3ec9a7' }, { name: 'Por vencer', color: '#f2c14e' },
            { name: 'Vencido', color: '#fb7185' }, { name: 'Pausado', color: '#94a3b8' },
            { name: 'Baja', color: '#cbd5e1' }
          ]
        }),
        field('fecha_ingreso', 'Fecha de ingreso', 'date', { width: 150 }),
        field('duracion', 'Duración (días)', 'number', { width: 140 }),
        field('fecha_fin', 'Fecha de finalización', 'date', { width: 165, calculado: true }),
        field('dias_restantes', 'Días para vencer', 'number', { width: 145, calculado: true }),
        field('modalidad', 'Modalidad de pago', 'select', {
          width: 160,
          options: [{ name: 'Pago completo' }, { name: 'Plan de cuotas' }]
        }),
        field('precio_total', 'Precio total', 'currency', { width: 140 }),
        field('total_pagado', 'Total pagado', 'currency', { width: 140, calculado: true }),
        field('saldo', 'Saldo pendiente', 'currency', { width: 150, calculado: true }),
        field('cantidad_cuotas', 'Cantidad de cuotas', 'number', { width: 155 }),
        field('monto_cuota', 'Monto por cuota', 'currency', { width: 150 }),
        field('pagado_en_cuotas', 'Pagado en cuotas', 'currency', { width: 155, calculado: true }),
        field('cuotas_pagadas', 'Cuotas pagadas', 'number', { width: 145, calculado: true }),
        field('proxima_cuota', 'Próxima cuota', 'date', { width: 145 }),
        field('downsell_monto', 'Monto del downsell', 'currency', { width: 165 }),
        field('downsell_entregado', 'Qué se le entregó del downsell', 'longtext', { width: 260 }),
        field('lead', 'Lead de origen', 'link', { width: 180, linkTable: 'leads' }),
        field('comprobantes', 'Comprobantes', 'url', { width: 160 }),
        field('resultados', 'Resultados / avances', 'longtext', { width: 260 }),
        field('caso_exito', '¿Caso de éxito?', 'checkbox', { width: 130 })
      ]
    },
    {
      id: 'setter_dia', name: 'Actividad diaria', icon: '📆', primary: 'fecha',
      fields: [
        field('fecha', 'Fecha', 'date', { width: 130 }),
        field('setter', 'Setter', 'select', {
          width: 140, options: [],
          optionsFrom: { table: 'equipo', field: 'nombre', where: { rol: 'Setter' } }
        }),
        field('conversaciones', 'Conversaciones nuevas', 'number', { width: 180 }),
        field('outbound', 'Contactos outbound (frío)', 'number', { width: 195 }),
        field('seguimientos', 'Seguimientos hechos', 'number', { width: 175 }),
        field('agendas', 'Agendas nuevas', 'number', { width: 150 }),
        field('pendientes', 'Pendientes de agendar', 'number', { width: 180 }),
        field('notas', 'Notas', 'text', { width: 220 })
      ]
    },
    {
      id: 'contenido', name: 'Contenido y guiones', icon: '🎬', primary: 'titulo',
      fields: [
        field('titulo', 'Título', 'text', { width: 220 }),
        field('formato', 'Formato', 'select', {
          width: 130,
          options: [
            { name: 'Reel' }, { name: 'Short' }, { name: 'Carrusel' }, { name: 'Historia' },
            { name: 'VSL' }, { name: 'Email' }, { name: 'Podcast' }
          ]
        }),
        field('pilar', 'Pilar', 'select', {
          width: 150,
          options: [
            { name: 'Autoridad' }, { name: 'Educativo' }, { name: 'Testimonio' },
            { name: 'Oferta' }, { name: 'Detrás de escena' }
          ]
        }),
        field('estado', 'Estado', 'select', {
          width: 130,
          options: [
            { name: 'Idea', color: '#94a3b8' }, { name: 'Guion', color: '#5b9dff' },
            { name: 'Grabar', color: '#c084fc' }, { name: 'Editar', color: '#f2c14e' },
            { name: 'Programado', color: '#ff9248' }, { name: 'Publicado', color: '#3ec9a7' }
          ]
        }),
        field('gancho', 'Gancho (primeros 3 seg)', 'text', { width: 260 }),
        field('guion', 'Guion', 'longtext', { width: 320 }),
        field('cta', 'Llamado a la acción', 'text', { width: 200 }),
        field('responsable', 'Responsable', 'select', {
          width: 140, options: [],
          optionsFrom: { table: 'equipo', field: 'nombre' }
        }),
        field('fecha_publicacion', 'Fecha de publicación', 'date', { width: 165 }),
        field('referencia', 'Referencia', 'url', { width: 170 }),
        field('link_publicado', 'Link publicado', 'url', { width: 170 }),
        field('notas', 'Notas', 'longtext', { width: 240 })
      ]
    },
    {
      id: 'tareas', name: 'Tareas', icon: '✅', primary: 'titulo',
      fields: [
        field('hecha', 'Hecha', 'checkbox', { width: 80 }),
        field('titulo', 'Tarea', 'text', { width: 280 }),
        field('asignados', 'Asignada a', 'multiselect', {
          width: 190, options: [],
          optionsFrom: { table: 'equipo', field: 'nombre' }
        }),
        field('estado', 'Estado', 'select', {
          width: 130,
          options: [
            { name: 'Pendiente', color: '#94a3b8' }, { name: 'En curso', color: '#5b9dff' },
            { name: 'Bloqueada', color: '#fb7185' }, { name: 'Hecha', color: '#3ec9a7' }
          ]
        }),
        field('prioridad', 'Prioridad', 'select', {
          width: 120,
          options: [
            { name: 'Alta', color: '#fb7185' }, { name: 'Media', color: '#f2c14e' },
            { name: 'Baja', color: '#94a3b8' }
          ]
        }),
        field('area', 'Área', 'select', {
          width: 140,
          options: [
            { name: 'Ventas' }, { name: 'Contenido' }, { name: 'Operaciones' },
            { name: 'Administración' }, { name: 'Personal' }
          ]
        }),
        field('vence', 'Vence', 'date', { width: 130 }),
        field('lead', 'Cliente relacionado', 'link', { width: 180, linkTable: 'leads' }),
        field('detalle', 'Detalle', 'longtext', { width: 300 }),
        field('creada_por', 'Creada por', 'select', {
          width: 140, options: [],
          optionsFrom: { table: 'equipo', field: 'nombre' }
        })
      ]
    },
    {
      id: 'metas', name: 'Metas', icon: '🎚️', primary: 'mes',
      fields: [
        field('mes', 'Mes', 'text', { width: 120 }),
        field('meta_cash', 'Meta cash', 'currency', { width: 140 }),
        field('meta_leads', 'Meta leads', 'number', { width: 130 }),
        field('meta_agendas', 'Meta agendas', 'number', { width: 140 }),
        field('meta_cierres', 'Meta cierres', 'number', { width: 140 }),
        field('nota', 'Nota', 'text', { width: 240 })
      ]
    }
  ];

  var VIEWS = [
    {
      id: 'v_pipeline', tableId: 'leads', name: 'Pipeline', type: 'kanban',
      stackBy: 'estado', filters: [], sorts: [],
      /* En las tarjetas queremos ver quién lo lleva, cuándo es la llamada y cuánto vale */
      hidden: ['telefono', 'email', 'instagram', 'fecha_contacto', 'oferta', 'cash_collected',
        'probabilidad', 'interes', 'proximo_paso', 'fecha_proximo_paso', 'objecion', 'grabacion', 'notas']
    },
    { id: 'v_leads_all', tableId: 'leads', name: 'Todos los leads', type: 'grid', filters: [], sorts: [{ fieldId: 'fecha_contacto', dir: 'desc' }], hidden: [] },
    {
      id: 'v_setter', tableId: 'leads', name: 'Panel Setter', type: 'grid',
      roles: ['Setter', 'Dueño', 'Admin'],
      filters: [{ fieldId: 'estado', op: 'isAnyOf', value: ['Nuevo', 'Contactado', 'Calificado', 'Agendado', 'No Show'] }],
      sorts: [{ fieldId: 'fecha_proximo_paso', dir: 'asc' }],
      hidden: ['cash_collected', 'objecion', 'grabacion', 'oferta', 'pago_llamada',
        'pago_seguimiento', 'sensacion', 'presento_reagenda']
    },
    {
      id: 'v_closer', tableId: 'leads', name: 'Panel Closer', type: 'grid',
      roles: ['Closer', 'Dueño', 'Admin'],
      filters: [{ fieldId: 'estado', op: 'isAnyOf', value: ['Agendado', 'Presentado', 'Seguimiento', 'Esperando pago', 'Ganado'] }],
      sorts: [{ fieldId: 'fecha_llamada', dir: 'asc' }],
      hidden: ['instagram', 'email', 'contexto', 'manychat']
    },
    {
      id: 'v_cierres', tableId: 'leads', name: 'Cierres', type: 'grid',
      roles: ['Closer', 'Dueño', 'Admin'],
      filters: [{ fieldId: 'estado', op: 'is', value: 'Ganado' }],
      sorts: [{ fieldId: 'fecha_llamada', dir: 'desc' }],
      groupBy: 'closer', hidden: ['probabilidad', 'proximo_paso', 'fecha_proximo_paso', 'objecion']
    },
    { id: 'v_actividades', tableId: 'actividades', name: 'Actividad reciente', type: 'grid', filters: [], sorts: [{ fieldId: 'fecha', dir: 'desc' }], hidden: [] },
    { id: 'v_recursos', tableId: 'recursos', name: 'Biblioteca', type: 'gallery', filters: [], sorts: [], hidden: [] },
    { id: 'v_recursos_grid', tableId: 'recursos', name: 'Tabla de recursos', type: 'grid', filters: [], sorts: [], hidden: [] },
    {
      id: 'v_pagos', tableId: 'pagos', name: 'Cobros', type: 'grid',
      filters: [], sorts: [{ fieldId: 'fecha', dir: 'desc' }], hidden: []
    },
    {
      id: 'v_pagos_cliente', tableId: 'pagos', name: 'Historial por cliente', type: 'grid',
      filters: [], sorts: [{ fieldId: 'fecha', dir: 'desc' }], groupBy: 'lead', hidden: ['notas', 'closer']
    },
    {
      id: 'v_programas', tableId: 'programas', name: 'Catálogo', type: 'grid',
      filters: [], sorts: [{ fieldId: 'precio_lista', dir: 'desc' }], hidden: []
    },
    {
      id: 'v_alumnos', tableId: 'alumnos', name: 'Alumnos activos', type: 'grid',
      filters: [{ fieldId: 'estado', op: 'isAnyOf', value: ['Activo', 'Por vencer'] }],
      sorts: [{ fieldId: 'dias_restantes', dir: 'asc' }],
      hidden: ['resultados', 'comprobantes', 'lead']
    },
    {
      id: 'v_alumnos_todos', tableId: 'alumnos', name: 'Todos los alumnos', type: 'grid',
      filters: [], sorts: [{ fieldId: 'fecha_ingreso', dir: 'desc' }], hidden: []
    },
    {
      id: 'v_alumnos_cobros', tableId: 'alumnos', name: 'Cobranzas', type: 'grid',
      roles: ['Dueño', 'Admin'],
      filters: [{ fieldId: 'saldo', op: '>', value: 0 }],
      sorts: [{ fieldId: 'proxima_cuota', dir: 'asc' }],
      hidden: ['resultados', 'duracion', 'fecha_fin', 'email', 'caso_exito']
    },
    {
      id: 'v_setter_dia', tableId: 'setter_dia', name: 'Carga diaria', type: 'grid',
      filters: [], sorts: [{ fieldId: 'fecha', dir: 'desc' }], hidden: []
    },
    {
      id: 'v_contenido_prod', tableId: 'contenido', name: 'Producción', type: 'kanban',
      stackBy: 'estado', filters: [], sorts: [],
      hidden: ['guion', 'notas', 'referencia', 'link_publicado', 'cta']
    },
    {
      id: 'v_contenido_guiones', tableId: 'contenido', name: 'Banco de guiones', type: 'gallery',
      filters: [], sorts: [], hidden: ['notas', 'referencia']
    },
    {
      id: 'v_contenido_cal', tableId: 'contenido', name: 'Calendario', type: 'grid',
      filters: [], sorts: [{ fieldId: 'fecha_publicacion', dir: 'asc' }], hidden: ['guion', 'notas']
    },
    {
      id: 'v_tareas_mias', tableId: 'tareas', name: 'Mis tareas', type: 'grid',
      filters: [{ fieldId: 'hecha', op: 'is', value: false }],
      sorts: [{ fieldId: 'vence', dir: 'asc' }], hidden: ['detalle', 'creada_por']
    },
    {
      id: 'v_tareas_tablero', tableId: 'tareas', name: 'Tablero', type: 'kanban',
      stackBy: 'estado', filters: [], sorts: [], hidden: ['detalle', 'creada_por', 'hecha']
    },
    {
      id: 'v_tareas_todas', tableId: 'tareas', name: 'Todas las tareas', type: 'grid',
      filters: [], sorts: [{ fieldId: 'vence', dir: 'asc' }], hidden: []
    },
    { id: 'v_equipo', tableId: 'equipo', name: 'Equipo', type: 'grid', filters: [], sorts: [], hidden: [] },
    { id: 'v_metas', tableId: 'metas', name: 'Metas por mes', type: 'grid', filters: [], sorts: [{ fieldId: 'mes', dir: 'desc' }], hidden: [] }
  ];

  /* Se sube en cada publicación: sirve para saber de un vistazo si el
     navegador está viendo la última versión o una copia vieja en caché. */
  var VERSION = '2026-09-09 · 1';

  AE.schema = {
    VERSION: VERSION,
    ESTADOS: ESTADOS,
    ETAPAS: ETAPAS,
    ROLES: ROLES,
    PERMISOS: PERMISOS,
    tables: TABLES,
    views: VIEWS,
    settings: {
      brand: 'Alpha Ecommerce',
      currency: 'USD',
      permisos: PERMISOS,
      /* Se sube cuando cambian los permisos por defecto, para que las bases
         ya guardadas se actualicen en vez de quedarse con los viejos. */
      permisosVersion: 2,
      /* Objetivo de tasa de agenda del setter (agendas / conversaciones) */
      objetivos: { tasaAgendaMin: 0.08, tasaAgendaMax: 0.12 },
      cloud: { url: '', key: '', enabled: false }
    }
  };
})(window.AE);
