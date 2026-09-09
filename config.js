/**
 * config.js - Configuracion de apis por defecto
 */
window.APP_CONFIG = Object.assign({
  TRIAGE_ENDPOINT: "/api/triage/narrativa",
  ASR_ENDPOINT: "/api/transcribir",
  SINTOMAS_URL: "sintomas.json",
  WHISPER_LANGUAGE: "es"
}, window.APP_CONFIG || {});