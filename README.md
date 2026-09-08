# Alpha Ecommerce — Landing VSL

Landing page tipo **VSL** (Video Sales Letter) para Alpha Ecommerce:
un video principal, casos de éxito en video (YouTube) y botón de WhatsApp.

## ✏️ Cómo editarla (sin saber programar)

Todo se cambia en **un solo archivo**: [`assets/js/config.js`](assets/js/config.js)

1. **WhatsApp** → en `whatsapp.numero` poné tu número con código de país,
   sin `+`, sin `0` y sin espacios. Ej: `5491122334455`.
2. **Video principal (VSL)** → en `videoVSL` pegá el link de YouTube.
   Si aún no lo tenés, dejalo vacío (`''`) y aparece un cartel "Próximamente".
3. **Casos de éxito** → en la lista `casos`, cada bloque `{ ... }` es un video.
   - Para agregar: copiá un bloque, pegalo debajo (con una coma) y cambiá el link.
   - Para quitar: borrá su bloque.

Los links de YouTube funcionan en cualquier formato:
`youtube.com/watch?v=...`, `youtu.be/...`, `youtube.com/shorts/...`, etc.

## 📞 Formulario Pre-Call (respuestas a Google Sheets)

Página aparte: **`precall.html`** — el formulario que completa la persona
*antes* de la llamada. Diseño crema, naranja y blanco, en 5 pasos.

1. Conectalo con tu planilla siguiendo
   [`google-sheets/INSTRUCCIONES.md`](google-sheets/INSTRUCCIONES.md) (5 minutos).
2. Pegá la URL que te da Google en `sheetsURL`, dentro de
   [`assets/js/precall-config.js`](assets/js/precall-config.js).
3. Ahí mismo podés cambiar el WhatsApp, los textos y el link para agendar
   (Calendly) que se abre después de enviar.

Para compartirlo, el link es tu dominio + `/precall.html`
(ej: `https://tusitio.com/precall.html`).

### Preguntas que incluye

Paso 1 — datos de contacto · Paso 2 — situación actual, intentos previos y
qué lo frena · Paso 3 — objetivo mensual y qué cambiaría en su vida ·
Paso 4 — compromiso (1 a 10), inversión y capital disponible ·
Paso 5 — horario para la llamada, cómo nos conoció y confirmación de asistencia.

Para editar, agregar o quitar preguntas: se tocan en `precall.html` y hay que
agregar el mismo nombre en la lista `COLUMNAS` de
[`google-sheets/precall-apps-script.gs`](google-sheets/precall-apps-script.gs).

## 👀 Verla en tu compu

Abrí `index.html` en el navegador (doble clic) o serví la carpeta:

```bash
python3 -m http.server 8000
# luego abrí http://localhost:8000
```

## 🌐 Publicarla gratis (GitHub Pages)

1. En GitHub → **Settings → Pages**.
2. En "Source" elegí la rama y la carpeta `/root`.
3. Guardá. En unos minutos tenés tu link público.

## 📁 Estructura

```
index.html                      → landing VSL
precall.html                    → formulario pre-call
assets/css/styles.css           → diseño de la landing
assets/css/precall.css          → diseño del formulario
assets/js/config.js             → 👈 EDITÁS ACÁ (textos, WhatsApp, videos)
assets/js/precall-config.js     → 👈 EDITÁS ACÁ (link de Google Sheets, agenda)
assets/js/app.js                → lógica de la landing (no hace falta tocar)
assets/js/precall.js            → lógica del formulario (no hace falta tocar)
google-sheets/INSTRUCCIONES.md  → cómo conectar la planilla
google-sheets/precall-apps-script.gs → código para pegar en Apps Script
```
