/**
 * config.example.js - Configuracion centralizada de APIs para Triaje_Talk
 *
 * Copiar a config.js y ajustar por entorno:
 *   copy config.example.js config.js   (Windows)
 *   cp config.example.js config.js     (Linux/macOS)
 *
 * Todas las URLs externas consumidas por el frontend se definen aqui.
 * El frontend solo conoce rutas relativas same-origin (/api/*) en produccion
 * con nginx como reverse proxy. En desarrollo sin proxy se pueden usar
 * URLs absolutas directas (ver ejemplos comentados abajo).
 *
 * Este archivo se carga de forma sincronica antes de scripts.js via
 * <script src="config.js"> en index.html, exponiendo window.APP_CONFIG.
 */

window.APP_CONFIG = Object.assign({
  /**
   * Endpoint para envio de narrativa (triage narrativo).
   * Produccion (con nginx):   "/api/triage/narrativa" -> proxy_pass a n8n / Ollama
   * Desarrollo sin nginx:     "https://creactivehub.app.n8n.cloud/webhook/from-ghpages"
   * Hospital on-premise:      "/api/triage/narrativa" -> proxy_pass a http://ollama:11434/api/generate o n8n interno
   */
  TRIAGE_ENDPOINT: "/api/triage/narrativa",

  /**
   * Endpoint para transcripcion de audio (Whisper ASR).
   * Produccion (con nginx):   "/api/transcribir" -> proxy_pass a http://whisper:9000/asr
   * Desarrollo sin nginx:     "http://127.0.0.1:9000/asr"  (whisper local en Docker)
   * Docker (servicio whisper): "http://whisper:9000/asr"  (nombre del servicio en docker-compose)
   */
  ASR_ENDPOINT: "/api/transcribir",

  /**
   * URL para cargar la base de sintomas.
   * Por defecto es un archivo estatico same-origin. Puede proxificarse
   * a "/api/sintomas" si se desea centralizar todo bajo /api/.
   */
  SINTOMAS_URL: "sintomas.json",

  /**
   * Idioma para Whisper ASR (ISO 639-1).
   */
  WHISPER_LANGUAGE: "es"
}, window.APP_CONFIG || {});

// Para overrides locales sin modificar este archivo, crear config.local.js con:
// window.APP_CONFIG = Object.assign({}, window.APP_CONFIG, {
//   TRIAGE_ENDPOINT: "https://creactivehub.app.n8n.cloud/webhook/from-ghpages",
//   ASR_ENDPOINT: "http://127.0.0.1:9000/asr"
// });
// (config.local.js esta gitignored)
