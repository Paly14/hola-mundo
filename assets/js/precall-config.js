/* =====================================================================
   ⚙️  CONFIGURACIÓN DEL FORMULARIO PRE-CALL — Alpha Ecommerce
   ---------------------------------------------------------------------
   ESTE ES EL ÚNICO ARCHIVO QUE NECESITÁS EDITAR PARA EL FORMULARIO.
   Cambiá sólo el texto entre comillas ' '.
   ===================================================================== */

const PRECALL_CONFIG = {

  /* ---------------------------------------------------------------
     1) LINK DE GOOGLE SHEETS  ← ⚠️ LO MÁS IMPORTANTE
     Pegá acá la URL que te da Google Apps Script cuando publicás
     el script (termina en /exec).
     El paso a paso está en: google-sheets/INSTRUCCIONES.md
     Mientras esté vacío, el formulario funciona pero NO guarda nada.
     --------------------------------------------------------------- */
  sheetsURL: '',

  /* ---------------------------------------------------------------
     2) WHATSAPP (botón que aparece después de enviar)
     Código de país + número, SIN espacios, SIN "+" ni "0".
     --------------------------------------------------------------- */
  whatsapp: {
    numero: '5492944921937',
    mensaje: 'Hola! Ya completé el formulario pre-call. Quiero coordinar mi llamada 🚀',
  },

  /* ---------------------------------------------------------------
     3) LINK PARA AGENDAR (Calendly, Google Calendar, etc.)
     Si lo cargás, después de enviar el formulario se abre solo
     para que la persona elija día y hora.
     Si lo dejás vacío (''), no se abre nada.
     --------------------------------------------------------------- */
  agendaURL: '',

  /* ---------------------------------------------------------------
     4) TEXTOS DE LA PÁGINA
     --------------------------------------------------------------- */
  marca: 'Alpha Ecommerce',
  titulo: 'Contanos dónde estás hoy',
  subtitulo:
    'Son 2 minutos. Con esta info preparamos tu llamada y te damos un plan concreto para arrancar tu negocio de importaciones. Cuanto más honesto seas, mejor te podemos ayudar.',
  gracias:
    'Ya tenemos todo para preparar tu llamada. Si querés, escribinos por WhatsApp para confirmar el horario.',
};
