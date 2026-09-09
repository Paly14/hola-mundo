# Alpha CRM — el "Airtable" interno de Alpha Ecommerce

Una app web **gratis**, sin servidores ni suscripciones, para cargar clientes,
trabajar el pipeline de **setters** y **closers**, guardar recursos y ver
**métricas y proyecciones**.

Se abre en el navegador: `https://TU-SITIO.netlify.app/app/`
(o haciendo doble clic en `app/index.html` en tu compu).

---

## Entrar

Cada persona entra con su nombre y su clave. **Las claves iniciales son el nombre
en minúscula** (`mariano`, `admin`, `facundo`, `gabo`): al primer ingreso la app
pide cambiarla. Se cambian también desde *Equipo → abrir la ficha → Cambiar clave*.

| Rol | Qué ve |
|---|---|
| **Dueño** (Mariano) y **Admin** | Todo: leads, alumnos, **facturación**, contenido, tareas, equipo, metas y permisos. |
| **Setter** | Sus leads, su actividad diaria, sus tareas y los recursos. Nada de plata. |
| **Closer** | Sus leads, quiénes son alumnos, sus tareas y los recursos. Nada de plata. |
| **Editor** | Contenido y guiones, sus tareas y los recursos. |

Quién ve qué se ajusta desde *⚙︎ Datos y ajustes → Quién ve qué (permisos)*.

**Comisiones**: el closer se lleva el 10% y el setter el 5% del cash efectivamente
cobrado. El porcentaje se cambia por persona en la tabla *Equipo* (campo Comisión);
si está vacío se usa el 10% / 5% por defecto. Cada uno ve sólo las suyas, al pie de
su espacio de trabajo, agrupadas por mes y separadas entre nuevos cierres y cuotas.

> Esto separa los espacios de trabajo y esconde la facturación, pero no es una
> caja fuerte: los datos viajan al navegador de cada uno. Para un control real
> por usuario hay que pasar a Supabase con Auth + RLS (ver más abajo).

## Qué tiene

| Sección | Para qué sirve |
|---|---|
| **Mi espacio** (setter y closer) | La portada de cada vendedor: accesos directos, sus leads con el seguimiento y notas, sus KPIs y, abajo de todo, **sus comisiones** mes a mes. |
| **Cargar ingreso** | Un formulario guiado para cargar cada pago: datos del ingreso, hasta 3 métodos de pago, plan de cuotas y detalle del downsell. Crea el cobro, actualiza el lead y crea o actualiza la ficha del alumno en un solo paso. Lo usan el closer y administración. |
| **Programas** | Catálogo con el precio de lista, la duración y qué incluye cada programa. Programa Completo: 997 USD. |
| **Panel y proyecciones** | KPIs del mes, embudo, cash collected por mes vs. meta, alumnos y cobranzas, facturación por método, saldos por cobrar, ranking del equipo, actividad del setter y proyección de cierre de mes y de los próximos 3 meses. |
| **Leads y Clientes** | La tabla principal, con los campos del CRM del closer: fuente, ¿se presentó?, ¿calificaba?, cuánto pagó en la llamada y en seguimiento, link de Fathom, Manychat, reagenda y cómo salió la call. Vistas *Pipeline* (kanban), *Panel Setter*, *Panel Closer* y *Cierres*. |
| **Facturación** | Cada cobro: cliente, fecha, monto, cuota, método, comprobante. El *cash collected* de un cliente sale siempre de acá. Solo Dueño y Admin. |
| **Alumnos** | Gestión post-venta: programa, fecha de ingreso, duración, vencimiento, modalidad de pago, precio, pagado, saldo, **plan de cuotas** (cantidad, monto, cuánto pagó en cuotas), **downsell** (monto y qué se le entregó), resultados y caso de éxito. La fecha de fin, los días para vencer, el total pagado y el saldo se calculan solos. |
| **Actividad diaria** | La carga diaria del setter: conversaciones, outbound, seguimientos, agendas. El panel calcula la tasa de agenda contra el objetivo (8–12%). |
| **Contenido y guiones** | El espacio de Mariano: ideas, gancho, guion, CTA, pilar, formato y estado (Idea → Guion → Grabar → Editar → Programado → Publicado). |
| **Tareas** | Estilo Notion: se etiqueta a una o varias personas, tiene prioridad, área y vencimiento, y se marca como hecha con un click (también desde el panel). |
| **Actividades** | Cada llamada, DM o WhatsApp queda registrado y vinculado a su lead. |
| **Recursos** | Biblioteca de links: scripts, formación, contratos, plantillas. |
| **Equipo** | Personas, roles, claves, metas de cash y comisión. |
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

## Los datos que ya están cargados

La app arranca con los datos migrados de los tres trackers de Excel:

- **CRM del closer (Gabo)** → 5 leads de septiembre con su situación, fuente,
  links de Fathom y lo que pagaron.
- **CRM del setter (Facundo)** → 15 días de actividad (agosto y septiembre), con
  su objetivo de tasa de agenda.
- **Gestión de alumnos** → 3 alumnos con programa, precio, pagado y saldo. Los
  totales del panel dan igual que el panel del Excel: 897 cobrados, 1.000 por cobrar.

Para volver a generarlos desde los Excel:

```bash
pip install openpyxl
python3 tools/importar-trackers.py CRM_Gabo.xlsx CRM_Setter.xlsx GESTION_ALUMNOS.xlsx
```

Dentro de la app, *⚙︎ Datos y ajustes* permite recargar esos datos, cargar datos
de ejemplo o vaciar todo para empezar de cero.

### Correcciones aplicadas sobre los Excel

- **Facundo Miño** pagó el downsell: quedó registrado el cobro de 300 USD, con
  saldo 0. (En Gestión de Alumnos figuraba como impago.)
- Las fechas de las llamadas venían mal interpretadas por Excel (leía `1/9` como
  9 de enero); se corrigieron al mes de cada hoja.

Lo que **no** se inventó y quedó como tarea: qué se entregó en cada downsell, el
plan de cuotas de Leon y Matias, y los precios que no coinciden con el catálogo
(Leon 1097 contra 997 de lista, Matias 500 contra 300).

---

## Dónde se guardan los datos

**Por defecto: en el navegador de cada persona** (localStorage). No hace falta
configurar nada, pero cada uno tiene su propia copia.

**Para que todo el equipo comparta la misma base** (recomendado), conectá
Supabase — plan gratuito, 5 minutos. Ojo: con esta configuración el control de
acceso sigue siendo el de la app (separa espacios, no es seguridad real). Si más
adelante quieren control por usuario de verdad, el paso siguiente es Supabase
**Auth + Row Level Security**.

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
  schema.js                 → tablas, campos, vistas y permisos iniciales
  datos-alpha.js            → los datos migrados de los Excel
  seed.js                   → datos de ejemplo (opcionales)
  store.js                  → datos, guardado, filtros, orden y cálculos
  auth.js                   → ingreso, claves y sesión
  perms.js                  → qué ve cada rol y valores por defecto
  fields.js                 → los 15 tipos de campo
  grid.js / kanban.js / gallery.js → las tres vistas
  record-card.js            → la ficha de un registro (con pagos y actividad)
  ingreso-form.js           → el formulario de carga de pagos y cuotas
  espacio.js                → "Mi espacio": portada del setter y del closer
  toolbar.js                → filtros, orden, agrupado, export
  metrics.js                → métricas, facturación, alumnos y proyecciones
  dashboard.js              → el panel
  cloud.js                  → sincronización opcional con Supabase
  app.js                    → navegación y barra lateral
tools/importar-trackers.py  → convierte los Excel en datos-alpha.js
```
