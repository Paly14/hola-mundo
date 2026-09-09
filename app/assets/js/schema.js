/* ===================================================================
   Alpha CRM — base por defecto (tablas, campos, vistas y datos demo)
   Todo esto es editable desde la app; esto es sólo el punto de partida.
   =================================================================== */
(function (AE) {
  'use strict';

  var ESTADOS = [
    { name: 'Nuevo', color: '#94a3b8' },
    { name: 'Contactado', color: '#5b9dff' },
    { name: 'Calificado', color: '#38bdf8' },
    { name: 'Agendado', color: '#c084fc' },
    { name: 'Show', color: '#f2c14e' },
    { name: 'No Show', color: '#fb7185' },
    { name: 'Seguimiento', color: '#ff9248' },
    { name: 'Ganado', color: '#3ec9a7' },
    { name: 'Perdido', color: '#cbd5e1' }
  ];

  /* Estados que cuentan como "llamada agendada" y como "cierre" */
  var ETAPAS = {
    agendado: ['Agendado', 'Show', 'No Show', 'Seguimiento', 'Ganado', 'Perdido'],
    show: ['Show', 'Seguimiento', 'Ganado'],
    ganado: ['Ganado'],
    perdido: ['Perdido', 'No Show'],
    abierto: ['Nuevo', 'Contactado', 'Calificado', 'Agendado', 'Show', 'Seguimiento']
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
        field('origen', 'Origen', 'select', {
          width: 130,
          options: [
            { name: 'Instagram' }, { name: 'TikTok' }, { name: 'YouTube' },
            { name: 'Referido' }, { name: 'Ads' }, { name: 'Orgánico' }, { name: 'Otro' }
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
        field('objecion', 'Objeción', 'select', {
          width: 150,
          options: [
            { name: 'Precio' }, { name: 'Tiempo' }, { name: 'Pareja / socio' },
            { name: 'Confianza' }, { name: 'No es prioridad' }, { name: 'Sin objeción' }
          ]
        }),
        field('grabacion', 'Grabación', 'url', { width: 170 }),
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
        field('rol', 'Rol', 'select', {
          width: 120,
          options: [{ name: 'Setter' }, { name: 'Closer' }, { name: 'Admin' }]
        }),
        field('email', 'Email', 'email', { width: 210 }),
        field('meta_cash', 'Meta cash / mes', 'currency', { width: 150 }),
        field('comision', 'Comisión', 'percent', { width: 120 }),
        field('activo', 'Activo', 'checkbox', { width: 100 })
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
      filters: [{ fieldId: 'estado', op: 'isAnyOf', value: ['Nuevo', 'Contactado', 'Calificado', 'Agendado'] }],
      sorts: [{ fieldId: 'fecha_proximo_paso', dir: 'asc' }],
      hidden: ['cash_collected', 'objecion', 'grabacion', 'oferta']
    },
    {
      id: 'v_closer', tableId: 'leads', name: 'Panel Closer', type: 'grid',
      filters: [{ fieldId: 'estado', op: 'isAnyOf', value: ['Agendado', 'Show', 'Seguimiento', 'Ganado'] }],
      sorts: [{ fieldId: 'fecha_llamada', dir: 'asc' }],
      hidden: ['instagram', 'origen', 'email']
    },
    {
      id: 'v_cierres', tableId: 'leads', name: 'Cierres', type: 'grid',
      filters: [{ fieldId: 'estado', op: 'is', value: 'Ganado' }],
      sorts: [{ fieldId: 'fecha_llamada', dir: 'desc' }],
      groupBy: 'closer', hidden: ['probabilidad', 'proximo_paso', 'fecha_proximo_paso', 'objecion']
    },
    { id: 'v_actividades', tableId: 'actividades', name: 'Actividad reciente', type: 'grid', filters: [], sorts: [{ fieldId: 'fecha', dir: 'desc' }], hidden: [] },
    { id: 'v_recursos', tableId: 'recursos', name: 'Biblioteca', type: 'gallery', filters: [], sorts: [], hidden: [] },
    { id: 'v_recursos_grid', tableId: 'recursos', name: 'Tabla de recursos', type: 'grid', filters: [], sorts: [], hidden: [] },
    { id: 'v_equipo', tableId: 'equipo', name: 'Equipo', type: 'grid', filters: [], sorts: [], hidden: [] },
    { id: 'v_metas', tableId: 'metas', name: 'Metas por mes', type: 'grid', filters: [], sorts: [{ fieldId: 'mes', dir: 'desc' }], hidden: [] }
  ];

  AE.schema = {
    ESTADOS: ESTADOS,
    ETAPAS: ETAPAS,
    tables: TABLES,
    views: VIEWS,
    settings: {
      brand: 'Alpha Ecommerce',
      currency: 'USD',
      usuario: 'Admin',
      rol: 'Admin',
      cloud: { url: '', key: '', enabled: false }
    }
  };
})(window.AE);
