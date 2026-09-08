# Alpha Ecommerce — Encuesta de ingreso 🟠

Encuesta tipo Typeform (una pregunta por pantalla) para alumnos nuevos.
Las respuestas caen automáticamente en un Google Sheet.

```
alpha-encuesta-ingreso/
├── index.html      → la encuesta completa (HTML + CSS + JS en un solo archivo)
├── Code.gs         → el script que va pegado en el Google Sheet
├── netlify.toml    → config de deploy (sitio estático, sin build)
└── README.md       → este archivo
```

**Cómo funciona:** el navegador manda un `POST` con todas las respuestas en JSON
a una URL de Google Apps Script, y ese script agrega una fila en la hoja
`Respuestas`. No hay servidor propio, ni base de datos, ni claves de API.

---

## 1. Crear el Google Sheet

1. Andá a [sheets.new](https://sheets.new).
2. Ponele de nombre **`ALPHA_ENCUESTA_INGRESO`**.

## 2. Pegar el script

1. En el Sheet: menú **Extensiones → Apps Script**.
2. Se abre el editor con un archivo `Código.gs` que tiene algo tipo
   `function myFunction() {}`. **Borrá todo.**
3. Abrí `Code.gs` de esta carpeta, copiá **todo** el contenido y pegalo ahí.
4. **Guardá** (el ícono del disquete, o `Ctrl/Cmd + S`).

## 3. Ejecutar `setup()` una vez

1. Arriba, en el desplegable de funciones, elegí **`setup`**.
2. Click en **Ejecutar**.
3. Google te va a pedir permisos: **Revisar permisos → elegí tu cuenta →
   "Configuración avanzada" → "Ir a (nombre del proyecto)" → Permitir.**
   > Ese cartel de "Google no verificó esta aplicación" es normal: la app sos vos.
4. Volvé al Sheet: ya tenés la hoja **`Respuestas`** con los encabezados en
   negrita y la primera fila congelada.

## 4. Implementar como aplicación web

1. En el editor de Apps Script: **Implementar → Nueva implementación**.
2. Click en el engranaje ⚙️ al lado de "Seleccionar tipo" → **Aplicación web**.
3. Configurá así:
   - **Descripción:** `encuesta v1` (lo que quieras)
   - **Ejecutar como:** `Yo (tu mail)`
   - **Quién tiene acceso:** **`Cualquier persona`**
     > ⚠️ Tiene que decir *"Cualquier persona"*, **no** "Cualquier persona con
     > cuenta de Google". Si no, el formulario no puede escribir.
4. **Implementar** → copiá la **URL de la aplicación web**.
   Termina en `/exec`, algo tipo:
   `https://script.google.com/macros/s/AKfycb.../exec`

**Verificación rápida:** pegá esa URL en el navegador. Tenés que ver el texto
`Alpha Ecommerce — endpoint activo`. Si lo ves, el endpoint funciona.

## 5. Pegar la URL en la encuesta

Abrí `index.html`, buscá el bloque `CONFIG` (arriba de todo en el `<script>`) y
reemplazá el placeholder:

```js
const CONFIG = {
  SCRIPT_URL: 'https://script.google.com/macros/s/AKfycb.../exec',
  NOMBRE_MENTOR: 'Mariano',
};
```

> Mientras `SCRIPT_URL` siga diciendo `PEGAR_ACA_LA_URL_DEL_WEB_APP`, la encuesta
> **no envía nada**: imprime el payload en la consola del navegador y muestra un
> aviso. Sirve para probar el diseño sin ensuciar el Sheet.

## 6. Subir a Netlify

**Opción A — drag & drop (la más fácil):**
1. Entrá a [app.netlify.com/drop](https://app.netlify.com/drop).
2. Arrastrá **la carpeta `alpha-encuesta-ingreso` entera**.
3. Listo, te da un link público. Podés renombrar el sitio en
   *Site configuration → Change site name*.

**Opción B — línea de comandos:**
```bash
cd alpha-encuesta-ingreso
netlify deploy --prod
```
(Cuando pregunte el *publish directory*, poné `.`)

---

## Cómo probar que funciona

1. Abrí el sitio publicado.
2. Completá la encuesta de punta a punta con datos de prueba.
3. Al llegar a la pantalla final ("¡Listo! Ya tenemos tu info."), andá al Sheet:
   tiene que estar la fila nueva en **`Respuestas`**.
4. Borrá esa fila de prueba.

Si la fila no aparece:
- Revisá que la URL en `CONFIG.SCRIPT_URL` termine en `/exec` (no en `/dev`).
- Revisá que el acceso de la implementación sea **"Cualquier persona"**.
- Mirá si apareció una hoja **`Errores`** en el Sheet: ahí queda el error exacto
  y el JSON crudo que llegó.

---

## ⚠️ Importante: cada vez que edites `Code.gs`

Guardar **no alcanza**. La URL sigue sirviendo la versión vieja hasta que hagas:

**Implementar → Nueva implementación** (no "Administrar implementaciones")

Y si la URL nueva cambió, actualizá `CONFIG.SCRIPT_URL` en `index.html` y volvé
a subir a Netlify.

> Truco: si en vez de "Nueva implementación" entrás a **Administrar
> implementaciones → editar (lápiz) → Versión: Nueva versión → Implementar**,
> la URL **se mantiene** y no tenés que tocar el `index.html`. Es la opción
> recomendada a partir de la segunda vez.

---

## Cosas que podés cambiar sin romper nada

| Qué | Dónde |
|---|---|
| Nombre del mentor (aparece en 3 preguntas y en la pantalla final) | `CONFIG.NOMBRE_MENTOR` en `index.html` |
| Textos, opciones, orden de las preguntas | array `PREGUNTAS` en `index.html` |
| Lista de países | array `PAISES` en `index.html` |
| Máximo de bonos elegibles | `max: 3` en la pregunta `bonos_top` |
| Mail de aviso por cada respuesta | `MAIL_NOTIFICACION` arriba de `Code.gs` (vacío = no manda nada) |

> Si agregás o sacás una pregunta en `index.html`, acordate de reflejar el cambio
> en el array `COLUMNAS` de `Code.gs`, **en la misma posición**. Ese array define
> el orden de las columnas del Sheet.

---

## Seguimiento de campañas (UTM)

La encuesta lee de la URL `?utm_source=`, `?utm_campaign=` y `?ref=` y los guarda
como columnas. Ejemplo:

```
https://tu-sitio.netlify.app/?utm_source=instagram&utm_campaign=lanzamiento&ref=mariano
```

Si no vienen en la URL, las columnas quedan vacías.

---

## Columnas del Sheet (en orden)

`timestamp` · `nombre` · `edad` · `pais` · `ciudad` · `situacion_familiar` ·
`situacion_laboral` · `motivo` · `motivo_otro` · `tiempo_conoce` ·
`canal_contenido` · `videos_vistos` · `sueno` · `preocupacion` · `problemas` ·
`primer_logro` · `bonos_top` · `bono_deseado` · `comentarios` · `utm_source` ·
`utm_campaign` · `ref` · `user_agent`

- `timestamp` viene en hora de Argentina (UTC-3), formato ISO 8601.
- `bonos_top` guarda las opciones elegidas separadas por `; `.
- `motivo_otro` solo se completa si la persona eligió "Otro" en la pregunta 7.
