/* =====================================================================
   ⚙️  CONFIGURACIÓN DEL FORMULARIO PRE-CALL — Alpha Ecommerce
   ---------------------------------------------------------------------
   ESTE ES EL ÚNICO ARCHIVO QUE NECESITÁS EDITAR.
   Cambiá sólo el texto entre comillas ' '.
   ===================================================================== */

const PRECALL_CONFIG = {

  /* ---------------------------------------------------------------
     1) LINK DE GOOGLE SHEETS  ← ⚠️ LO MÁS IMPORTANTE
     Pegá acá la URL que te da Google Apps Script cuando publicás
     el script (termina en /exec).
     El paso a paso está en: google-sheets/INSTRUCCIONES.md
     Mientras esté vacío, el formulario funciona pero NO guarda nada.

     Tu planilla de respuestas ya está creada acá:
     https://docs.google.com/spreadsheets/d/1MnHYbyOG8a3RTgQ6gdeZbioyOhmnGwTyD5StQPq9_EI/edit
     --------------------------------------------------------------- */
  sheetsURL: 'https://script.google.com/macros/s/AKfycbzVum04z2OzhFFyqUL8IJb2fWA4E2vcEZQWrHrCBRj-xT3kd_DLthhEkcMpGMp8Qi-Wvw/exec',

  /* ---------------------------------------------------------------
     2) COPIA DE RESPALDO EN NETLIFY (recomendado dejarlo en true)
     Cada respuesta queda TAMBIÉN guardada en Netlify → tu sitio →
     pestaña "Forms". Es una red de seguridad por si falla Google.
     --------------------------------------------------------------- */
  netlifyForms: true,

  /* ---------------------------------------------------------------
     3) TEXTOS DE LA PÁGINA
     --------------------------------------------------------------- */
  marca: 'Alpha Ecommerce',
  titulo: 'Antes de tu llamada',
  subtitulo:
    'Completá estas preguntas para que quien te atienda llegue a la llamada sabiendo tu situación. Son 2 minutos y hace que el tiempo rinda mucho más.',
  gracias:
    'Ya podés cerrar esta página. Nos vemos en la llamada en el horario acordado.',
};
