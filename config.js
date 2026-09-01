/**
 * config.js - Configuracion por defecto (rutas relativas para proxy nginx)
 * Este archivo es versionado con defaults relativos para que GitHub Pages
 * y despliegues sin nginx personalizado funcionen.
 */
window.APP_CONFIG = Object.assign({
  TRIAGE_ENDPOINT: "/api/triage/narrativa",
  ASR_ENDPOINT: "/api/transcribir",
  SINTOMAS_URL: "sintomas.json",
  WHISPER_LANGUAGE: "es"
}, window.APP_CONFIG || {});