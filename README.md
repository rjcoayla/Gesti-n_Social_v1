# 🤝 Dashboard Gestión Social y Reputacional — Minería

Dashboard web interactivo y responsive para el monitoreo de la **gestión social, reputación y licencia social para operar** de una empresa minera. Construido con HTML, CSS y JavaScript puro + Chart.js.

![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=flat&logo=html5&logoColor=white)
![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=flat&logo=css3&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=flat&logo=javascript&logoColor=black)
![Chart.js](https://img.shields.io/badge/Chart.js-FF6384?style=flat&logo=chartdotjs&logoColor=white)

---

## 📋 Descripción

Este dashboard permite a las áreas de Relaciones Comunitarias, Sostenibilidad y Gerencia Social de una operación minera:

- **Monitorear la inversión en gestión social** por comunidad, región y tipo de proyecto.
- **Seguir los índices de confianza comunitaria y reputación** a lo largo del tiempo.
- **Identificar comunidades con quejas o reclamos** que requieren atención inmediata.
- **Visualizar la licencia social para operar** mediante semáforo de alerta.
- **Filtrar** por Año, Mes, Región, Comunidad, Tipo de Proyecto y Estado del Compromiso.

> ⚠️ Los datos son **simulados** con valores realistas para fines de demostración.

---

## 🚀 Cómo ejecutar localmente

El dashboard carga datos desde `social_reputation_data.json` usando `fetch()`, por lo que necesita un servidor local:

### Opción 1 — Python (recomendado)
```bash
cd social-dashboard
python -m http.server 8080
# Abre: http://localhost:8080
```

### Opción 2 — Node.js
```bash
npx serve .
```

### Opción 3 — VS Code Live Server
Instala la extensión **Live Server** y haz clic derecho en `index.html` → *Open with Live Server*.

### Publicar en GitHub Pages (recomendado para compartir)
1. Sube la carpeta a un repositorio GitHub público.
2. Ve a **Settings → Pages**.
3. Selecciona branch `main` y guarda.
4. Tu URL será: `https://tu-usuario.github.io/social-dashboard/`

---

## 📂 Estructura de carpetas

```
social-dashboard/
├── index.html                       ← Estructura HTML del dashboard
├── README.md                        ← Este archivo
├── css/
│   └── styles.css                   ← Estilos: grid, responsive, colores, animaciones
├── js/
│   └── app.js                       ← Lógica JS: filtrado, KPIs, gráficos
└── data/
    └── social_reputation_data.json  ← Datos simulados de proyectos y registros sociales
```

---

## 🧱 Tecnologías

| Tecnología | Uso |
|---|---|
| **HTML5 semántico** | Estructura: header, aside, main, section |
| **CSS3 Grid + Flexbox** | Layout responsive 4/2/1 cols + media queries |
| **JavaScript ES2020 (vanilla)** | Filtrado, KPIs, render de gráficos y tabla |
| **Chart.js v4** | Barras, doughnut, línea temporal |
| **Google Fonts** | Playfair Display + Plus Jakarta Sans |

---

## 📊 Variables del dataset

| Campo | Descripción |
|---|---|
| `id_proyecto` | Identificador único (PS-001, PS-002…) |
| `comunidad` | Comunidad o localidad impactada |
| `region` | Región geográfica |
| `tipo` | Tipo de proyecto (Educación, Salud, Infraestructura, etc.) |
| `estado` | En ejecución · Cumplido · Pendiente · Observado |
| `monto_invertido` | Inversión en el período (USD) |
| `beneficiarios` | Número de personas beneficiadas |
| `quejas` | Número de quejas o reclamos |
| `mesas_dialogo` | Reuniones o mesas de diálogo realizadas |
| `confianza` | Índice de Confianza Comunitaria (0–100) |
| `reputacion` | Índice de Reputación (0–100) |

---

## 🔍 Lógica de filtrado

Los filtros se almacenan en `estado.filtros` y se aplican con lógica **AND** simultánea:

```javascript
const registrosFilt = registros.filter(reg => {
  const proy = proyMap[reg.id_proyecto]; // join registro ↔ proyecto
  if (f.anio      && reg.anio     !== parseInt(f.anio)) return false;
  if (f.region    && proy.region  !== f.region)         return false;
  if (f.comunidad && proy.comunidad !== f.comunidad)    return false;
  // ... etc
  return true;
});
```

Al cambiar cualquier `<select>`, se recalculan: KPIs, 4 gráficos y tabla Top 10 de comunidades.

---

## 🎨 Paleta de colores

| Color | Uso |
|---|---|
| `#1c3829` Verde profundo | Fondo topbar y sidebar |
| `#40916c` Verde medio | Acento principal, proyectos activos |
| `#52b788` Verde claro | Barras, progreso favorable |
| `#2e6fad` Azul medio | KPI inversión, series de diálogo |
| `#e07c24` Ámbar | Alertas moderadas, quejas bajas |
| `#c0392b` Rojo | Quejas críticas, confianza baja |
| `#f0f4f0` Gris verdoso | Fondo principal (claro) |

---

## 📱 Diseño Responsive

| Dispositivo | Breakpoint | KPIs | Gráficos |
|---|---|---|---|
| Desktop | `> 1200px` | 4 por fila | 4 cols (línea/quejas = 2 cols) |
| Tablet | `768–1200px` | 2 por fila | 2 cols (anchas = fila entera) |
| Móvil | `< 768px` | 1 por fila | 1 por fila, sidebar colapsable |

---

## 🔗 Dashboard relacionado

Este dashboard forma parte de una suite de análisis minero junto con el **Dashboard CAPEX Minero**. Ambos comparten la misma arquitectura técnica (HTML + CSS Grid + JS + Chart.js) pero con identidades visuales distintas:

- **CAPEX**: tema oscuro, tonos dorado y teal — enfoque en inversiones de capital.
- **Social**: tema claro, tonos verde y azul — enfoque en personas y comunidades.

---

## 📄 Licencia

Proyecto de demostración con datos simulados. Libre para uso educativo y referencia técnica.
