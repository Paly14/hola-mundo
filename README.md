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

Página aparte: **`precall.html`** — **no es una landing de venta**: es la
herramienta interna que el closer le pasa al lead **antes** de la llamada para
llegar con información. No tiene CTA, ni FAQ, ni botones de WhatsApp: sólo el
formulario en 5 pasos, en crema, naranja y blanco.

**Tu planilla de respuestas ya está creada:**
[Alpha Ecommerce — Pre-Call (respuestas)](https://docs.google.com/spreadsheets/d/1MnHYbyOG8a3RTgQ6gdeZbioyOhmnGwTyD5StQPq9_EI/edit)

1. Conectá el formulario con esa planilla siguiendo
   [`google-sheets/INSTRUCCIONES.md`](google-sheets/INSTRUCCIONES.md) (5 minutos).
2. Pegá la URL que te da Google en `sheetsURL`, dentro de
   [`assets/js/precall-config.js`](assets/js/precall-config.js).
3. Ahí mismo podés cambiar los textos (título, subtítulo y mensaje final).

El link que le pasa el closer al lead es tu dominio + `/precall.html`
(ej: `https://alpha-ecommerce-precall.netlify.app/precall.html`).

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

## 🚀 Publicarla en Netlify

El repo ya trae `netlify.toml` configurado (sitio estático, sin compilar) y el
sitio **ya está creado** en tu cuenta:

👉 [app.netlify.com/projects/alpha-ecommerce-precall](https://app.netlify.com/projects/alpha-ecommerce-precall)

Falta un solo paso: conectarlo con GitHub para que se publique
(y para que cada cambio futuro se publique solo).

1. Abrí el link de arriba → **Site configuration → Build & deploy → Link repository**
   (si te aparece el botón **"Import from Git"**, es el mismo camino).
2. Elegí **GitHub** → este repositorio → y en "Branch to deploy" elegí la rama
   donde está esta versión: **`claude/quirky-pasteur-3f4xvh`**
   (o mergeala a `main` primero y elegí `main`).
3. Publish directory: `.` — Build command: vacío. **Deploy**.
4. En un minuto queda online:
   - Landing VSL → `https://alpha-ecommerce-precall.netlify.app/`
   - Formulario pre-call → `https://alpha-ecommerce-precall.netlify.app/precall.html`

> Alternativa sin Git: en la pestaña **Deploys**, arrastrá la carpeta del
> proyecto al recuadro "Drag and drop your site output folder here".

En **Domain management** podés ponerle tu dominio propio o cambiar el nombre
`alpha-ecommerce-precall` por el que quieras.

### 📥 Respaldo de respuestas en Netlify

Además de Google Sheets, cada respuesta queda guardada en Netlify
(**tu sitio → pestaña Forms → "precall"**). Es una red de seguridad por si
Google falla o todavía no configuraste el Apps Script. Se puede apagar poniendo
`netlifyForms: false` en `assets/js/precall-config.js`.

## 🌐 Publicarla gratis (GitHub Pages)

1. En GitHub → **Settings → Pages**.
2. En "Source" elegí la rama y la carpeta `/root`.
3. Guardá. En unos minutos tenés tu link público.

## 📁 Estructura

```
index.html                      → landing VSL
precall.html                    → formulario pre-call (uso interno del closer)
assets/css/styles.css           → diseño de la landing
assets/css/precall.css          → diseño del formulario
assets/js/config.js             → 👈 EDITÁS ACÁ (textos, WhatsApp, videos)
assets/js/precall-config.js     → 👈 EDITÁS ACÁ (link de Google Sheets y textos)
assets/js/app.js                → lógica de la landing (no hace falta tocar)
assets/js/precall.js            → lógica del formulario (no hace falta tocar)
google-sheets/INSTRUCCIONES.md  → cómo conectar la planilla
google-sheets/precall-apps-script.gs → código para pegar en Apps Script
```
