/**
 * config.js - Configuracion por defecto (rutas relativas para proxy nginx)
 * Este archivo es versionado con defaults relativos para que GitHub Pages
 * y despliegues sin nginx personalizado funcionen. Para overrides locales
 * (desarrollo sin proxy), editar directamente o usar config.local.js (gitignored).
 *
 * Ver config.example.js para documentacion completa y ejemplos por entorno.
 */
window.APP_CONFIG = Object.assign({
  TRIAGE_ENDPOINT: "/api/triage/narrativa",
  ASR_ENDPOINT: "/api/transcribir",
  SINTOMAS_URL: "sintomas.json",
  WHISPER_LANGUAGE: "es"
}, window.APP_CONFIG || {});

// Nota: no congelar aqui para permitir que config.local.js haga merge de overrides.
// scripts.js congelara la vista resuelta si es necesario.
