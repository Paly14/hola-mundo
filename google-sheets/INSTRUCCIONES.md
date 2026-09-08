# 📋 Cómo conectar el formulario pre-call con Google Sheets

Tiempo: ~5 minutos. No hace falta saber programar.

---

## 1) Crear la planilla

1. Entrá a [sheets.new](https://sheets.new) (se crea una planilla vacía).
2. Ponele un nombre, por ejemplo **Alpha Ecommerce — Pre-Call**.
   (No hace falta crear columnas: se crean solas la primera vez.)

## 2) Pegar el código

1. En la planilla: menú **Extensiones → Apps Script**.
2. Borrá todo lo que aparece en el editor (suele decir `function myFunction() {}`).
3. Abrí el archivo [`precall-apps-script.gs`](precall-apps-script.gs) de este proyecto,
   copiá **todo** su contenido y pegalo en el editor.
4. Guardá con el ícono 💾 (o `Ctrl/Cmd + S`).

## 3) Publicarlo

1. Arriba a la derecha: botón **Implementar → Nueva implementación**.
2. En el engranaje ⚙️ elegí **Aplicación web**.
3. Completá:
   - **Descripción:** `Formulario pre-call`
   - **Ejecutar como:** `Yo (tu correo)`
   - **Quién tiene acceso:** **`Cualquier usuario`** ← ⚠️ importante
4. **Implementar** → Google te va a pedir permisos:
   *Autorizar acceso → elegí tu cuenta → "Configuración avanzada" →
   "Ir a (nombre del proyecto)" → **Permitir**.*
5. Copiá la **URL de la aplicación web**. Termina en `/exec` y se ve así:

   ```
   https://script.google.com/macros/s/AKfycb...../exec
   ```

## 4) Pegar la URL en el formulario

Abrí [`assets/js/precall-config.js`](../assets/js/precall-config.js) y pegala acá:

```js
sheetsURL: 'https://script.google.com/macros/s/AKfycb...../exec',
```

Guardá, subí los cambios y listo: **cada persona que complete el formulario
aparece como una fila nueva en la pestaña "Pre-Call"** de tu planilla.

---

## ✅ Cómo probar que funciona

1. Abrí `precall.html` en el navegador, completá el formulario con datos de prueba y enviá.
2. Mirá la planilla: tiene que aparecer una fila nueva en unos segundos.
3. Si no aparece, revisá:
   - que la URL termine en `/exec` (no en `/dev`);
   - que en "Quién tiene acceso" hayas puesto **Cualquier usuario**;
   - que no haya quedado ningún espacio dentro de las comillas.

## 🔁 Si más adelante cambiás el código del script

Tenés que volver a **Implementar → Administrar implementaciones → ✏️ (editar) →
Versión: Nueva versión → Implementar**. La URL sigue siendo la misma.

## 📧 Aviso por mail de cada respuesta (opcional)

En la planilla: **Herramientas → Reglas de notificación → "Se realizan cambios" →
"Correo electrónico: inmediato"**. Te llega un mail cada vez que entra una respuesta.
