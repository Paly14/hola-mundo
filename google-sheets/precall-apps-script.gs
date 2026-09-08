/**
 * ===================================================================
 * Alpha Ecommerce — Recibe las respuestas del formulario pre-call
 * y las guarda en una hoja de Google Sheets.
 *
 * Copiá TODO este archivo dentro de Extensiones → Apps Script
 * de tu planilla y seguí google-sheets/INSTRUCCIONES.md
 * ===================================================================
 */

/** Nombre de la pestaña donde se guardan las respuestas. */
var HOJA = 'Pre-Call';

/** Orden de las columnas (tiene que coincidir con los nombres del formulario). */
var COLUMNAS = [
  'Fecha',
  'Nombre y apellido',
  'Correo',
  'WhatsApp',
  'Pais y ciudad',
  'Edad',
  'Ocupacion actual',
  'Ingresos actuales',
  'Intentaste emprender antes',
  'Que paso',
  'Que te frena',
  'Otro freno',
  'Objetivo mensual',
  'Que cambiaria en tu vida',
  'Que tan lejos estas',
  'Compromiso',
  'Necesitas ayuda',
  'Cuanto invertirias',
  'Capital disponible',
  'Cuando podrias empezar',
  'Horario preferido',
  'Como nos conociste',
  'Comentarios',
  'Compromiso de asistencia',
  'Origen'
];

/** Recibe el POST del formulario. */
function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.waitLock(30000); // evita que dos envíos simultáneos se pisen
  try {
    var datos = JSON.parse(e.postData.contents);
    var hoja = obtenerHoja_();

    var fila = COLUMNAS.map(function (columna) {
      if (columna === 'Fecha') {
        return Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'dd/MM/yyyy HH:mm');
      }
      return datos[columna] !== undefined ? datos[columna] : '';
    });

    hoja.appendRow(fila);
    return respuesta_({ ok: true });
  } catch (error) {
    return respuesta_({ ok: false, error: String(error) });
  } finally {
    lock.releaseLock();
  }
}

/** Sirve para probar desde el navegador que el link funciona. */
function doGet() {
  return respuesta_({ ok: true, mensaje: 'Formulario pre-call de Alpha Ecommerce listo.' });
}

/** Devuelve la hoja, creándola con encabezados si todavía no existe. */
function obtenerHoja_() {
  var libro = SpreadsheetApp.getActiveSpreadsheet();
  var hoja = libro.getSheetByName(HOJA);

  if (!hoja) {
    hoja = libro.insertSheet(HOJA);
  }
  if (hoja.getLastRow() === 0) {
    hoja.appendRow(COLUMNAS);
    var encabezado = hoja.getRange(1, 1, 1, COLUMNAS.length);
    encabezado.setFontWeight('bold');
    encabezado.setBackground('#ff9248');
    encabezado.setFontColor('#ffffff');
    hoja.setFrozenRows(1);
  }
  return hoja;
}

function respuesta_(objeto) {
  return ContentService
    .createTextOutput(JSON.stringify(objeto))
    .setMimeType(ContentService.MimeType.JSON);
}
