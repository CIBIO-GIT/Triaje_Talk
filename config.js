/**
 * config.js - Configuracion de apis por defecto
 * Demo nginx: TRIAGE_ENDPOINT es same-origin y lo proxea nginx -> Ollama
 * Para dev sin nginx, crear config.local.js con:
 *   window.APP_CONFIG.TRIAGE_ENDPOINT = "http://localhost:11434/api/generate";
 */
window.APP_CONFIG = Object.assign({
  TRIAGE_ENDPOINT: "/api/narrativa",
  ASR_ENDPOINT: "/api/transcribir",
  SINTOMAS_URL: "sintomas.json",
  WHISPER_LANGUAGE: "es",
  OLLAMA_MODEL: "llama3.2:latest",
  OLLAMA_TEMPERATURE: 0.2,
  TRIAGE_TIMEOUT_MS: 45000
}, window.APP_CONFIG || {});