/**
 * Alpha Ecommerce — Encuesta de ingreso
 * Google Apps Script desplegado como Web App.
 *
 * Recibe un POST con JSON (Content-Type: text/plain) desde index.html
 * y agrega una fila en la hoja "Respuestas".
 *
 * Ver README.md para los pasos de implementación.
 */

/* =========================================================
   CONFIG
   ========================================================= */

/** Dejalo vacío para NO recibir mails. Ej: 'mariano@alphaecommerce.com' */
const MAIL_NOTIFICACION = '';

const HOJA_RESPUESTAS = 'Respuestas';
const HOJA_ERRORES = 'Errores';

/**
 * Orden EXACTO de las columnas del Sheet.
 * Si agregás una pregunta en index.html, agregala también acá (en la misma posición).
 */
const COLUMNAS = [
  'timestamp',
  'nombre',
  'edad',
  'pais',
  'ciudad',
  'situacion_familiar',
  'situacion_laboral',
  'motivo',
  'motivo_otro',
  'tiempo_conoce',
  'canal_contenido',
  'videos_vistos',
  'sueno',
  'preocupacion',
  'problemas',
  'primer_logro',
  'bonos_top',
  'bono_deseado',
  'comentarios',
  'utm_source',
  'utm_campaign',
  'ref',
  'user_agent'
];

/* =========================================================
   Endpoints
   ========================================================= */

/**
 * Verificación rápida desde el navegador: pegá la URL del Web App y
 * tenés que ver el texto de abajo.
 */
function doGet() {
  return ContentService.createTextOutput('Alpha Ecommerce — endpoint activo');
}

/**
 * Recibe la encuesta y agrega la fila.
 */
function doPost(e) {
  const lock = LockService.getScriptLock();
  let crudo = '';

  try {
    // Espera hasta 30s para que dos POST simultáneos no se pisen.
    lock.waitLock(30000);

    crudo = (e && e.postData && e.postData.contents) ? e.postData.contents : '';
    const datos = JSON.parse(crudo);

    const hoja = obtenerHojaRespuestas_();

    const fila = COLUMNAS.map(function (clave) {
      const valor = datos[clave];
      return (valor === undefined || valor === null) ? '' : String(valor);
    });

    hoja.appendRow(fila);

    if (MAIL_NOTIFICACION) {
      notificar(datos);
    }

    return jsonOk_({ ok: true });

  } catch (err) {
    registrarError_(err, crudo);
    return jsonOk_({ ok: false, error: String(err) });

  } finally {
    try { lock.releaseLock(); } catch (ignorado) {}
  }
}

/* =========================================================
   Setup — correr UNA sola vez a mano
   ========================================================= */

/**
 * Crea la hoja "Respuestas" con los encabezados en negrita
 * y la primera fila congelada.
 */
function setup() {
  const hoja = obtenerHojaRespuestas_();
  SpreadsheetApp.getActiveSpreadsheet().toast('Hoja "' + HOJA_RESPUESTAS + '" lista.', 'Alpha Ecommerce', 5);
  return hoja.getName();
}

/* =========================================================
   Notificación por mail (opcional)
   ========================================================= */

/**
 * Manda un mail resumen. Solo corre si MAIL_NOTIFICACION tiene un valor.
 */
function notificar(payload) {
  if (!MAIL_NOTIFICACION) return;

  const nombre = payload.nombre || '(sin nombre)';

  const cuerpo = [
    'Nueva respuesta en la encuesta de ingreso de Alpha Ecommerce.',
    '',
    'Nombre: ' + (payload.nombre || ''),
    'País: ' + (payload.pais || ''),
    'Situación laboral: ' + (payload.situacion_laboral || ''),
    '',
    '— Su sueño —',
    payload.sueno || '(vacío)',
    '',
    '— Lo que más le preocupa —',
    payload.preocupacion || '(vacío)',
    '',
    '— Problemas que quiere resolver —',
    payload.problemas || '(vacío)',
    '',
    'Recibido: ' + (payload.timestamp || '')
  ].join('\n');

  MailApp.sendEmail({
    to: MAIL_NOTIFICACION,
    subject: 'Alpha Ecommerce — nueva encuesta: ' + nombre,
    body: cuerpo
  });
}

/* =========================================================
   Helpers internos
   ========================================================= */

/** Devuelve la hoja "Respuestas"; la crea con encabezados si no existe. */
function obtenerHojaRespuestas_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let hoja = ss.getSheetByName(HOJA_RESPUESTAS);

  if (!hoja) {
    hoja = ss.insertSheet(HOJA_RESPUESTAS);
  }

  // Si está vacía (o le falta el encabezado), lo escribimos.
  if (hoja.getLastRow() === 0) {
    hoja.getRange(1, 1, 1, COLUMNAS.length)
        .setValues([COLUMNAS])
        .setFontWeight('bold');
    hoja.setFrozenRows(1);
    hoja.getRange(1, 1, 1, COLUMNAS.length).setBackground('#0A0A0A').setFontColor('#F26B22');
  }

  return hoja;
}

/** Guarda cualquier error en la hoja "Errores" junto al body crudo. */
function registrarError_(err, crudo) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let hoja = ss.getSheetByName(HOJA_ERRORES);

    if (!hoja) {
      hoja = ss.insertSheet(HOJA_ERRORES);
      hoja.getRange(1, 1, 1, 3)
          .setValues([['timestamp', 'error', 'body_crudo']])
          .setFontWeight('bold');
      hoja.setFrozenRows(1);
    }

    hoja.appendRow([
      new Date(),
      String(err && err.stack ? err.stack : err),
      String(crudo || '').slice(0, 40000)
    ]);
  } catch (ignorado) {
    // Si ni siquiera podemos registrar el error, no hay nada más que hacer.
  }
}

/** Respuesta JSON estándar. */
function jsonOk_(objeto) {
  return ContentService
    .createTextOutput(JSON.stringify(objeto))
    .setMimeType(ContentService.MimeType.JSON);
}
