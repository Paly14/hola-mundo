# Alpha CRM — el "Airtable" interno de Alpha Ecommerce

Una app web **gratis**, sin servidores ni suscripciones, para cargar clientes,
trabajar el pipeline de **setters** y **closers**, guardar recursos y ver
**métricas y proyecciones**.

Se abre en el navegador: `https://TU-SITIO.netlify.app/app/`
(o haciendo doble clic en `app/index.html` en tu compu).

---

## Qué tiene

| Sección | Para qué sirve |
|---|---|
| **Panel y proyecciones** | KPIs del mes, embudo, cash collected por mes vs. meta, ranking del equipo, origen de leads, objeciones y proyección de cierre de mes y de los próximos 3 meses. |
| **Leads y Clientes** | La tabla principal. Vista *Tabla* (estilo Airtable), *Pipeline* (kanban arrastrable), *Panel Setter*, *Panel Closer* y *Cierres*. |
| **Actividades** | Cada llamada, DM o WhatsApp queda registrado y vinculado a su lead. |
| **Recursos** | Biblioteca de links: scripts, formación, contratos, plantillas. |
| **Equipo** | Setters, closers, metas de cash y comisión. |
| **Metas** | Objetivo mensual de cash, leads, agendas y cierres. Alimenta las proyecciones. |

## Lo que se puede hacer (igual que en Airtable)

- Editar cualquier celda con un click (y otro click para entrar a editar).
- Crear **campos** nuevos de 15 tipos: texto, número, moneda, %, selección,
  selección múltiple, fecha, fecha y hora, casilla, link, email, teléfono,
  puntuación con estrellas y vínculo a otra tabla.
- Crear **tablas** y **vistas** nuevas (tabla, kanban o galería).
- **Filtrar**, **ordenar**, **agrupar**, ocultar campos y buscar.
- Arrastrar tarjetas entre etapas del pipeline.
- Seleccionar varias filas para duplicar o borrar.
- Exportar a **CSV**, importar **CSV**, y bajar/restaurar una copia **JSON**.

## Roles: qué ve cada uno

Arriba a la izquierda elegís quién sos (la lista sale de la tabla **Equipo**):

- **Setter** → ve sólo los leads donde figura como setter. El panel muestra *sus* números.
- **Closer** → ve sólo los leads donde figura como closer.
- **Admin** → ve todo.

Desde ese mismo menú se puede activar *"Ver todo el equipo"* si hace falta.

> Es un filtro de trabajo, no una barrera de seguridad: quien tenga el link puede
> cambiar de usuario. Sirve para que cada uno trabaje enfocado, no para esconder datos.

---

## Dónde se guardan los datos

**Por defecto: en el navegador de cada persona** (localStorage). No hace falta
configurar nada, pero cada uno tiene su propia copia.

**Para que todo el equipo comparta la misma base** (recomendado), conectá
Supabase — plan gratuito, 5 minutos:

1. Creá una cuenta en [supabase.com](https://supabase.com) y un proyecto nuevo (plan Free).
2. En **SQL Editor**, pegá y ejecutá:

```sql
create table crm_state (
  id text primary key,
  data jsonb,
  updated_at timestamptz default now()
);
alter table crm_state enable row level security;
create policy "equipo" on crm_state
  for all using (true) with check (true);
```

3. En **Settings → API** copiá el **Project URL** y la clave **anon public**.
4. En la app: barra lateral → **☁︎ Conectar la nube** → pegá los dos datos → *Guardar y probar*.

Desde ahí la app sincroniza sola cada 45 segundos, al volver a la pestaña y
después de cada cambio. Si dos personas editan a la vez, gana la versión más reciente.

> La clave `anon public` permite leer y escribir esa tabla a cualquiera que tenga
> el link de la app. Está bien para un equipo interno; no la publiques.

**Siempre conviene**: barra lateral → *Datos y ajustes* → **Descargar copia (JSON)**
cada tanto.

---

## Publicarla gratis

Ya está lista para Netlify (el repo tiene `netlify.toml`): cuando se despliega el
sitio, el CRM queda en `/app/`. También funciona con GitHub Pages o abriendo el
archivo local.

La página está marcada como `noindex` para que no aparezca en Google, pero el link
es público: compartilo sólo con el equipo.

## Empezar de cero

Barra lateral → **⚙︎ Datos y ajustes**:

- *Cargar datos de ejemplo* → vuelve a poner el equipo y los leads de demo.
- *Vaciar todos los registros* → borra todo y deja la estructura lista para cargar
  tus clientes reales (o importá un CSV desde **Exportar → Importar CSV**).

## Archivos

```
app/index.html              → la app
app/assets/css/app.css      → diseño
app/assets/js/
  schema.js                 → tablas, campos y vistas iniciales
  seed.js                   → datos de ejemplo
  store.js                  → datos, guardado, filtros y orden
  fields.js                 → los 15 tipos de campo
  grid.js / kanban.js / gallery.js → las tres vistas
  record-card.js            → la ficha de un registro
  toolbar.js                → filtros, orden, agrupado, export
  metrics.js                → cálculo de métricas y proyecciones
  dashboard.js              → el panel
  cloud.js                  → sincronización opcional con Supabase
  app.js                    → navegación y barra lateral
```
