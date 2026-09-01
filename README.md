# 🏥 Documentación Técnica: Triaje_Talk

# 1. Introducción

El sistema de triage constituye una pieza crítica en la atención hospitalaria, ya que permite priorizar a los pacientes según la gravedad de su condición clínica. En instituciones públicas como el Hospital Municipal San José, la creciente demanda asistencial, la variabilidad en la presentación de los síntomas y la necesidad de decisiones rápidas pueden generar cuellos de botella, tiempos de espera prolongados y, en algunos casos, una asignación subóptima de prioridades. A esto se suma la dependencia de la interpretación inicial del personal de salud, que puede verse afectada por la sobrecarga laboral y la heterogeneidad en la comunicación con los pacientes.

# 2. Descripción General
Triaje_Talk es una aplicación web interactiva (SPA) diseñada para la clasificación rápida de pacientes en entornos de salud. Su objetivo es determinar la urgencia médica mediante un algoritmo de puntos que evalúa datos demográficos, factores de riesgo y síntomas específicos.

El sistema destaca por ofrecer dos caminos al usuario:

- Triaje Estructurado: Selección de síntomas por categorías con cálculo automático de puntos.

- Triaje Narrativo: Un campo de texto libre para que el paciente explique su situación, conectándose vía webhook con servicios de procesamiento externo (IA/n8n).

# 3. Arquitectura de Archivos y Diseño
El proyecto se basa en una separación clara de responsabilidades:

- index.html: Define el flujo de "hojas" (pasos). Utiliza contenedores vacíos que se rellenan dinámicamente para mantener el código limpio.

- style.css (Estilo Clínico Pro): Implementa una interfaz profesional mediante:

  - CSS Grid: Los síntomas secundarios se organizan en dos columnas para maximizar el espacio visual.
  - Jerarquía Visual: Uso de barras laterales azules (border-left) y tarjetas con sombras para diferenciar categorías.
  - Diseño Responsivo: Adaptación automática a una sola columna en dispositivos móviles.

- scripts.js: Gestiona la navegación, el cálculo de puntos y la interactividad.

- sintomas.json: Actúa como la base de datos centralizada de síntomas y baremos de puntuación.

# 4. Lógica del Sistema de Puntuación
El puntaje de peligro se calcula de forma dinámica y reactiva mediante la función calculateScore(), sumando tres factores principales:

- Edad (Baremo Dinámico): Los puntos se asignan según rangos definidos en el JSON (ej. recién nacidos o adultos mayores reciben una base de puntos más alta).

- Estado de Riesgo: Se suman puntos adicionales por condiciones como el embarazo.

- Selección Jerárquica:

  - Síntoma Padre: Activar una categoría (ej: Respiratorio) suma un puntaje base.

  - Síntoma Hijo: Especificar el síntoma (ej: Cianosis) suma puntos críticos adicionales.

# 5. Cómo realizar cambios futuros

Para mantener o escalar el sistema sin romper la lógica principal, sigue estas guías:

- Agregar un síntoma: Solo edita sintomas.json. Crea una nueva llave con el prefijo p_ (ej: p_piel) y añade sus puntos y sub-síntomas. El script detectará el prefijo y lo dibujará automáticamente en la interfaz "Clínico Pro".

- Cambiar la urgencia: Ajusta los valores de score directamente en el archivo JSON. El sistema recalcula los totales en tiempo real, por lo que no necesitas modificar ni una línea de JavaScript para ajustar la sensibilidad médica del test.

- Modificar colores de Triaje: Si decides que el nivel "Rojo" debe ser más difícil de alcanzar, busca la función mostrarResultados() en scripts.js y ajusta los umbrales numéricos en las condiciones if/else (por ejemplo, subir el límite de 40 a 50 puntos).

# 6. Configuración de APIs y proxy nginx

Todas las URLs externas (n8n/Ollama y Whisper) se centralizan en `config.js` y se consumen vía rutas relativas same-origin (`/api/*`) proxyeadas por nginx. Esto elimina CORS, permite cambiar backends por entorno sin tocar código, y mantiene compatibilidad con GitHub Pages.

## 6.1 Archivos clave

| Archivo | Rol | Versionado |
|---------|-----|------------|
| `config.example.js` | Plantilla documentada con todas las claves (`TRIAGE_ENDPOINT`, `ASR_ENDPOINT`, `SINTOMAS_URL`, `WHISPER_LANGUAGE`) | Sí |
| `config.js` | Config por defecto con rutas relativas (`/api/triage/narrativa`, `/api/transcribir`) | Sí (defaults relativos) |
| `config.local.js` | Overrides locales para dev sin proxy (URLs absolutas) | No (gitignored) |
| `nginx.conf.example` | Reverse proxy con `location /api/triage/narrativa` y `location /api/transcribir`, + estáticos | Sí |
| `nginx.conf` | Copia operativa con upstreams reales por entorno | No (gitignored) |

## 6.2 Inicio rápido (nuevo dev)

```bash
# 1. Clonar y crear config local (opcional, solo si querés probar sin nginx)
copy config.example.js config.local.js   # Windows
# cp config.example.js config.local.js   # Linux/macOS
# Editar config.local.js si no tenés nginx:
# window.APP_CONFIG = Object.assign({}, window.APP_CONFIG, {
#   TRIAGE_ENDPOINT: "https://creactivehub.app.n8n.cloud/webhook/from-ghpages",
#   ASR_ENDPOINT: "http://127.0.0.1:9000/asr"
# });

# 2. Servir estáticos (sin proxy, modo GH Pages)
npx serve .   # o python -m http.server 8000
# Abrir http://localhost:8000 — sintomas.json carga, narrativa/ASR mostrarán error visible si no hay proxy (esperado)

# 3. Con proxy nginx (prod / hospital)
copy nginx.conf.example nginx.conf
# Editar nginx.conf: cambiar proxy_pass de /api/triage/narrativa y /api/transcribir según tu entorno (ver tabla abajo)
nginx -t && nginx -s reload
# o con Docker:
# docker run -p 8080:80 -v "%cd%:/usr/share/nginx/html:ro" -v "%cd%/nginx.conf:/etc/nginx/nginx.conf:ro" nginx
```

## 6.3 Tabla de entornos

| Entorno | `config.js` | `nginx.conf` `proxy_pass` | Notas |
|---------|-------------|---------------------------|-------|
| **Dev sin proxy** (GH Pages, `file://`) | `config.local.js` con URLs absolutas (`https://creactivehub...`, `http://127.0.0.1:9000/asr`) | No aplica | Solo para pruebas rápidas; CORS puede requerir extensión o `add_header` |
| **Dev con proxy local** | Defaults relativos (`/api/triage/narrativa`, `/api/transcribir`) | `http://127.0.0.1:9000/asr` (whisper host), `https://creactivehub.app.n8n.cloud/webhook/from-ghpages` | Whisper en Docker: `docker run -p 9000:9000 whisper` |
| **Prod cloud** | Defaults relativos | `https://creactivehub.app.n8n.cloud/webhook/from-ghpages` y `http://whisper:9000` (Docker) | `client_max_body_size 20m` y timeouts 60s para `/api/transcribir` |
| **Hospital on-premise (Ollama)** | Defaults relativos | `http://ollama:11434/api/generate` (o `/api/chat`) y `http://whisper:9000` | Solo Docker para Whisper; Ollama local reemplaza n8n; ajustar reescritura si el body difiere |
| **GitHub Pages puro** | `config.js` defaults relativos (fallan sin proxy) | No aplica | `sintomas.json` sí funciona; narrativa/ASR muestran mensaje de error observable (no crash) |

> **Regla de oro:** nunca hardcodear URLs con host en `scripts.js` o `index.html`. Solo `config.*.js` y `nginx.conf` conocen hosts reales. Verificar con:
> ```bash
> grep -R "creactivehub\|127\.0\.0\.1:9000" --include="*.js" --include="*.html" | grep -v "config\." | grep -v "nginx.conf"
> # debe retornar 0 resultados
> ```

## 6.4 Nginx - detalles

- **Estáticos**: `location / { root /usr/share/nginx/html; try_files $uri $uri/ /index.html; }` + cache para `*.js,*.css,*.json`.
- **CORS**: same-origin no necesita CORS. Para dev cross-origin, descomentar `add_header Access-Control-Allow-Origin "*"` solo en dev.
- **Límites**: `/api/transcribir` tiene `client_max_body_size 20m; proxy_read_timeout 60s; proxy_request_buffering off;` para audio largo.
- **Recarga**: `nginx -t && nginx -s reload` o `docker compose restart nginx`.

## 6.5 Troubleshooting

- `config.js no encontrado` en consola → copiar `config.example.js` a `config.js` (el `index.html` hace `onerror` con fallback a `/api/*`).
- `502 Bad Gateway` en `/api/transcribir` → Whisper no está corriendo (`docker ps` / `curl http://127.0.0.1:9000`), verificar `proxy_pass` en `nginx.conf`.
- `413 Payload Too Large` → aumentar `client_max_body_size` en `location /api/transcribir`.
- Transcripción vacía → revisar `WHISPER_LANGUAGE` en `config.js` y query `?language=es` en Network.
