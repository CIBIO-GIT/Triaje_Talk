let sintomasScore = {};

// 0. CONFIGURACION CENTRALIZADA (proxy nginx)
// Todas las URLs externas se resuelven desde window.APP_CONFIG (config.js)
// con fallback a rutas relativas same-origin
const APP_CONFIG_RESOLVED = (typeof window !== 'undefined' && window.APP_CONFIG) ? window.APP_CONFIG : {};
const SINTOMAS_URL = APP_CONFIG_RESOLVED.SINTOMAS_URL || "sintomas.json";
const TRIAGE_ENDPOINT = APP_CONFIG_RESOLVED.TRIAGE_ENDPOINT || "/api/triage/narrativa";
const ASR_ENDPOINT = APP_CONFIG_RESOLVED.ASR_ENDPOINT || "/api/transcribir";
const WHISPER_LANGUAGE = APP_CONFIG_RESOLVED.WHISPER_LANGUAGE || "es";

// Alias para compatibilidad con tareas/spec (API.TRIAGE_ENDPOINT, etc.)
const API = {
    SINTOMAS_URL,
    TRIAGE_ENDPOINT,
    ASR_ENDPOINT,
    WHISPER_LANGUAGE
};

// 1. CARGA INICIAL Y RENDERIZADO DINÁMICO
fetch(SINTOMAS_URL)
    .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status} al cargar ${SINTOMAS_URL}`);
        return res.json();
    })
    .then(data => {
        sintomasScore = data;
        renderizarSintomas(); // Genera la Hoja 4 automáticamente
    })
    .catch(err => console.error(`Error cargando ${SINTOMAS_URL}:`, err));

/**
 * Genera el HTML de la Hoja 4 basándose en el JSON.
 * Crea títulos para los padres y listas para los hijos.
 */

function renderizarSintomas() {
    const contenedor = document.getElementById('contenedor-sintomas');
    if (!contenedor) return;
    contenedor.innerHTML = ''; // Limpiar contenedor

    Object.entries(sintomasScore).forEach(([idPadre, info]) => {
        // FILTRO: Solo procesar IDs que empiecen con 'p_' y omitir config_puntajes
        if (!idPadre.startsWith('p_')) return;

        // Creamos el bloque del síntoma principal (Padre)
        const divPadre = document.createElement('div');
        divPadre.className = 'grupo-sintoma';
        divPadre.style.marginBottom = "15px";

        // Usamos la propiedad 'texto' del JSON o transformamos el ID si no existe
        const nombreMostrar = info.texto || idPadre.replace('p_', '').toUpperCase();

        divPadre.innerHTML = `
            <div class="padre-row" style="background: #f8f9fa; padding: 10px; border-radius: 5px;">
                <input type="checkbox" id="${idPadre}" onchange="toggleHijos('${idPadre}')">
                <label for="${idPadre}"><strong>${nombreMostrar}</strong></label>
            </div>
            <div id="sub_${idPadre}" class="hijos-container" style="display:none; margin-left: 30px; margin-top: 10px;">
            </div>
        `;

        contenedor.appendChild(divPadre);

        // Si el padre tiene hijos, los renderizamos dentro de su contenedor
        if (info.children) {
            const subContenedor = divPadre.querySelector(`#sub_${idPadre}`);
            Object.entries(info.children).forEach(([idHijo, infoHijo]) => {
                const nombreHijo = (typeof infoHijo === 'object' ? infoHijo.texto : idHijo.replace(/_/g, ' '));

                const divHijo = document.createElement('div');
                divHijo.style.marginBottom = "5px";
                divHijo.innerHTML = `
                    <input type="checkbox" id="${idHijo}" onchange="calculateScore()">
                    <label for="${idHijo}">${nombreHijo}</label>
                `;
                subContenedor.appendChild(divHijo);
            });
        }
    });
}

/**
 * Muestra/Oculta los subtítulos y recalcula el puntaje
 */
function toggleHijos(idPadre) {
    const checkboxPadre = document.getElementById(idPadre);
    const subContenedor = document.getElementById(`sub_${idPadre}`);

    if (subContenedor) {
        // CAMBIO: Usamos 'grid' para activar las dos columnas del CSS
        subContenedor.style.display = checkboxPadre.checked ? 'grid' : 'none';

        // Si desmarcamos al padre, desmarcamos automáticamente a todos los hijos
        if (!checkboxPadre.checked) {
            const hijos = subContenedor.querySelectorAll('input[type="checkbox"]');
            hijos.forEach(h => h.checked = false);
        }
    }
    // Recalcular el puntaje siempre al final
    calculateScore();
}

/**
 * Cambia entre páginas (SPA)
 */
function showPage(pageId) {
    document.querySelectorAll('.survey-page').forEach(page => {
        page.style.display = 'none';
    });

    const paginasSinScore = ['hoja1_login', 'hoja1_registrarse', 'hojaFinal']
    document.getElementById("score-display").style.display =
        paginasSinScore.includes(pageId) ? 'none' : 'inline-flex';

    const activePage = document.getElementById(pageId);
    if (activePage) activePage.style.display = 'block';
}

/**
 * Autenticación: valida DNI y contraseña contra el localStorage
 * y guarda la sesión activa si las credenciales son correctas.
 */
function login() {
    const dni = document.getElementById('dni').value.trim();
    const password = document.getElementById('password').value;
    const errorEl = document.getElementById('login-error');
    const successEl = document.getElementById('login-success');

    errorEl.textContent = '';
    successEl.textContent = ''; // limpiar mensaje de registro exitoso

    if (!dni || !password) {
        errorEl.textContent = 'Completá el DNI y la contraseña.';
        return;
    }

    const users = JSON.parse(localStorage.getItem('users') || '[]');
    const user = users.find(u => u.dni === dni && u.password === password);

    if (user) {
        localStorage.setItem('currentSession', JSON.stringify({
            dni: user.dni,
            nombre: user.nombre,
            apellido: user.apellido
        }));
        document.getElementById('score-display').style.display = 'flex';
        showPage('hoja1');
    } else {
        errorEl.textContent = 'DNI o contraseña incorrectos.';
    }
}

/**
 * Valida el formulario, guarda el nuevo usuario en localStorage
 * y redirige al login con un mensaje de éxito.
 */
function registrarse() {
    const nombre = document.getElementById('reg-nombre').value.trim();
    const apellido = document.getElementById('reg-apellido').value.trim();
    const dni = document.getElementById('reg-dni').value;
    const mail = document.getElementById('reg-mail').value.trim();
    const password = document.getElementById('reg-password').value;
    const password2 = document.getElementById('reg-password2').value;
    const errorEl = document.getElementById('reg-error');

    errorEl.textContent = '';

    // Validaciones en orden
    if (!nombre || !apellido || !dni || !mail || !password || !password2) {
        errorEl.textContent = 'Completá todos los campos.';
        return;
    }
    if (!/^\d{7,8}$/.test(dni)) {
        errorEl.textContent = 'El DNI debe tener 7 u 8 dígitos numéricos, sin puntos.';
        return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mail)) {
        errorEl.textContent = 'Ingresá un email válido.';
        return;
    }
    if (password.length < 6) {
        errorEl.textContent = 'La contraseña debe tener al menos 6 caracteres.';
        return;
    }
    if (password !== password2) {
        errorEl.textContent = 'Las contraseñas no coinciden.';
        return;
    }

    const users = JSON.parse(localStorage.getItem('users') || '[]');

    if (users.find(u => u.dni === dni)) {
        errorEl.textContent = 'Ya existe una cuenta registrada con ese DNI.';
        return;
    }

    // Guardar nuevo usuario
    users.push({ dni, nombre, apellido, mail, password });
    localStorage.setItem('users', JSON.stringify(users));

    limpiarFormularioRegistro();

    // Mostrar confirmación en la pantalla de login
    document.getElementById('login-success').textContent =
        `✓ Cuenta creada correctamente. Ya podés iniciar sesión, ${nombre} ${apellido}.`;
    showPage('hoja1_login');
}

/**
 * Limpia todos los campos del formulario de registro.
 */
function limpiarFormularioRegistro() {
    ['reg-nombre', 'reg-apellido', 'reg-dni', 'reg-mail', 'reg-password', 'reg-password2']
        .forEach(id => { document.getElementById(id).value = ''; });

    document.getElementById('reg-error').textContent = '';
}

/**
 * Actualiza el slider de edad
 */
function updateEdadOutput(value) {
    const output = document.getElementById('edad-output');
    output.innerText = (value == 0) ? "< 1" : (value == 100) ? "99+" : value;
}

/**
 * CÁLCULO DE PUNTAJE (Lógica jerárquica)
 */


function calculateScore() {
    let totalScore = 0;
    const config = sintomasScore.config_puntajes; // Acceso a la nueva configuración

    if (config) {
        // 1. Puntaje por Edad Dinámico
        let edad = parseInt(document.getElementById('edad').value) || 0;
        const rangoEncontrado = config.edad.find(rango => edad >= rango.min && edad <= rango.max);
        if (rangoEncontrado) {
            totalScore += rangoEncontrado.puntos;
        }

        // 2. Embarazo Dinámico
        if (document.getElementById('emb_si').checked) {
            totalScore += config.embarazo;
        }

        // 3. Síntomas Graves Dinámico
        if (document.getElementById('sintomas_si').checked) {
            totalScore += config.graves;
        }
    }

    // 4. Síntomas Dinámicos (Padres e Hijos) - Se mantiene igual
    Object.entries(sintomasScore).forEach(([idPadre, info]) => {
        // Filtramos para no procesar la "config_puntajes" como si fuera un síntoma
        if (idPadre.startsWith('p_')) {
            const checkPadre = document.getElementById(idPadre);
            if (checkPadre && checkPadre.checked) {
                totalScore += (info.score || 0);
                if (info.children) {
                    Object.entries(info.children).forEach(([idHijo, infoHijo]) => {
                        const checkHijo = document.getElementById(idHijo);
                        if (checkHijo && checkHijo.checked) {
                            totalScore += (infoHijo.score || 0);
                        }
                    });
                }
            }
        }
    });

    document.getElementById('score-value').innerText = totalScore;
}


/**
 * Muestra los resultados finales según el puntaje
 */
function mostrarResultados() {
    calculateScore();
    const finalScore = parseInt(document.getElementById('score-value').innerText);
    document.getElementById('final-score-value').innerText = finalScore;

    let levelText = "";
    let levelColor = "";

    if (finalScore >= 40) { levelText = "🔴 Rojo (Atención Inmediata)"; levelColor = "#e74c3c"; }
    else if (finalScore >= 20) { levelText = "🟠 Naranja (Urgencia)"; levelColor = "#e67e22"; }
    else if (finalScore >= 10) { levelText = "🟡 Amarillo (Diferable)"; levelColor = "#f1c40f"; }
    else if (finalScore >= 3) { levelText = "🟢 Verde (No Urgente)"; levelColor = "#2ecc71"; }
    else { levelText = "🔵 Azul (Consulta General)"; levelColor = "#3498db"; }

    const triageElement = document.getElementById('final-triage-level');
    triageElement.innerHTML = levelText;
    triageElement.style.color = levelColor;

    showPage('hojaFinal');
}



/**
 * Envío de datos a Ollama via proxy nginx
 * POST /api/triage/narrativa -> nginx -> Ollama /api/generate
 * Usa TRIAGE_ENDPOINT same-origin y OLLAMA_MODEL desde window.APP_CONFIG
 */
async function enviarNarrativa() {
    // Resolver endpoint dinámicamente (refleja config.local.js si fue cargado)
    const resolvedConfig = (typeof window !== 'undefined' && window.APP_CONFIG) ? window.APP_CONFIG : {};
    const endpoint = "/api/narrativa/api/generate";
    const model = resolvedConfig.OLLAMA_MODEL || "llama3.2:latest";
    const temperature = typeof resolvedConfig.OLLAMA_TEMPERATURE === 'number' ? resolvedConfig.OLLAMA_TEMPERATURE : 0.2;
    const timeoutMs = resolvedConfig.TRIAGE_TIMEOUT_MS || 45000;

    // Validaciones previas
    if (!sintomasScore || Object.keys(sintomasScore).length === 0) {
        setVoiceStatus('El catálogo de síntomas aún no cargó. Esperá un segundo y reintentá.', 'error');
        return;
    }
    const narrativaEl = document.getElementById('narrativa');
    const narrativaVal = narrativaEl ? narrativaEl.value.trim() : '';
    if (!narrativaVal) {
        setVoiceStatus('Escribí o dictá tu narrativa antes de enviar.', 'error');
        if (narrativaEl) narrativaEl.focus();
        return;
    }
    if (narrativaVal.length < 10) {
        setVoiceStatus('La narrativa es muy corta. Describí con más detalle tus síntomas.', 'error');
        return;
    }
    // Advertencia si TRIAGE_ENDPOINT apunta a localhost pero no estamos en localhost (config errónea prod)
    if (endpoint.includes('localhost') || endpoint.includes('127.0.0.1')) {
        const host = window.location.hostname;
        if (host && host !== 'localhost' && host !== '127.0.0.1' && host !== '') {
            console.warn(`TRIAGE_ENDPOINT apunta a ${endpoint} pero la página se sirve desde ${host}. Si estás en demo con nginx deberías usar "/api/triage/narrativa".`);
        }
    }

    const formData = {
        respondiente: document.querySelector('input[name="respondiente"]:checked')?.value || 'N/A',
        edad: document.getElementById('edad').value,
        sexo: document.querySelector('input[name="sexo"]:checked')?.value || 'N/A',
        embarazo: document.querySelector('input[name="embarazo"]:checked')?.value || 'no',
        narrativa: narrativaVal,
        puntaje: document.getElementById('score-value').innerText
    };

    const catalogoStr = JSON.stringify(sintomasScore, null, 2);
    const prompt = `[CONTEXTO]\nSos un ayudante de triage en un hospital. Los pacientes ingresan una narrativa describiendo sus síntomas y usás el protocolo Manchester para calcular el triage rápidamente.\n\n[CATALOGO PUNTAJES]\n\`\`\`json\n${catalogoStr}\n\`\`\`\n\n[OBJETIVO]\nCalcula el puntaje de triage en base a la narrativa del paciente usando el protocolo Manchester y el catálogo anterior (edad, embarazo, síntomas graves y síntomas padres/hijos).\n\n[RESTRICCIONES]\n- Responde ÚNICAMENTE con un número entero (el puntaje total). Sin texto, sin unidades, sin explicación.\n- Si no podés determinar, responde "0".\n\n[DATOS DEL PACIENTE]\n${JSON.stringify(formData, null, 2)}`;

    const formModel = {
        model: model,
        prompt: prompt,
        stream: false,
        options: { temperature: temperature }
    };

    const sendBtn = document.getElementById('send-narrative-btn');
    if (sendBtn) {
        sendBtn.disabled = true;
        sendBtn.textContent = 'Enviando…';
    }
    setVoiceStatus('Enviando narrativa a Ollama…', '');

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
        const response = await fetch(endpoint, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(formModel),
            signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
            const body = await response.text().catch(() => '');
            throw new Error(`HTTP ${response.status} ${body.slice(0, 300)}`);
        }

        const data = await response.json().catch(async () => {
            const t = await response.text().catch(() => '');
            throw new Error(`Respuesta no-JSON de Ollama: ${t.slice(0, 300)}`);
        });

        console.log('Ollama response:', data);
        const rawResponse = (data.response || '').toString().trim();
        // Ollama debe devolver solo número; extraer primer entero si viene con texto extra
        const match = rawResponse.match(/-?\d+/);
        const puntajeLLM = match ? parseInt(match[0], 10) : NaN;

        // Actualizar UI de éxito genérico
        document.getElementById('narrative-buttons').style.display = 'none';
        document.getElementById('narrativa').disabled = true;
        document.getElementById('after-send-message').style.display = 'block';

        // Mostrar resultado LLM en el nuevo contenedor
        const llmScoreEl = document.getElementById('llm-triage-score');
        const llmLevelEl = document.getElementById('llm-triage-level');
        const llmRawEl = document.getElementById('llm-raw-response');

        if (!isNaN(puntajeLLM)) {
            if (llmScoreEl) llmScoreEl.textContent = String(puntajeLLM);
            // Reusar lógica de niveles de mostrarResultados()
            let levelText = "";
            let levelColor = "";
            if (puntajeLLM >= 40) { levelText = "🔴 Rojo (Atención Inmediata)"; levelColor = "#e74c3c"; }
            else if (puntajeLLM >= 20) { levelText = "🟠 Naranja (Urgencia)"; levelColor = "#e67e22"; }
            else if (puntajeLLM >= 10) { levelText = "🟡 Amarillo (Diferible)"; levelColor = "#f1c40f"; }
            else if (puntajeLLM >= 3) { levelText = "🟢 Verde (No Urgente)"; levelColor = "#2ecc71"; }
            else { levelText = "🔵 Azul (Consulta General)"; levelColor = "#3498db"; }
            if (llmLevelEl) {
                llmLevelEl.textContent = levelText;
                llmLevelEl.style.color = levelColor;
            }
            if (llmRawEl) llmRawEl.textContent = `Respuesta LLM: "${rawResponse}"`;
            setVoiceStatus(`Narración enviada. Puntaje Ollama: ${puntajeLLM} – ${levelText}`, 'success');
        } else {
            if (llmScoreEl) llmScoreEl.textContent = '—';
            if (llmLevelEl) llmLevelEl.textContent = 'Respuesta no numérica';
            if (llmRawEl) llmRawEl.textContent = `Respuesta LLM: "${rawResponse.slice(0, 500)}"`;
            setVoiceStatus(`Narración enviada pero Ollama no devolvió un puntaje numérico. Respuesta: "${rawResponse.slice(0, 200)}"`, 'error');
        }

        // Advertencia si usó fallback localhost en prod (ya logueado)
        if (endpoint.includes('localhost') && window.location.hostname !== 'localhost') {
            console.warn('Revisá config.js: en demo con nginx el endpoint debe ser relativo "/api/triage/narrativa".');
        }

    } catch (err) {
        clearTimeout(timeoutId);
        console.error(`Error al enviar narrativa a ${endpoint}:`, err);
        let userMsg = err.message || String(err);
        if (err.name === 'AbortError') {
            userMsg = `Tiempo agotado tras ${Math.round(timeoutMs / 1000)}s. Ollama puede estar cargando el modelo (cold start). Reintentá en 10-20s.`;
        } else if (userMsg.includes('Failed to fetch') || userMsg.includes('NetworkError')) {
            userMsg = `No se pudo conectar a ${endpoint}. Verificá que nginx esté corriendo y que Ollama esté en http://ollama:11434 (o 127.0.0.1:11434). Detalle: ${err.message}`;
        }
        setVoiceStatus(`No se pudo enviar la narrativa a ${endpoint}. ${userMsg}`, 'error');
        if (sendBtn) {
            sendBtn.disabled = false;
            sendBtn.textContent = 'Enviar al Triage';
        }
    }
    TRIAGE_ENDPOINT
}

/**
 * Reset completo del sistema
 */
function reiniciarEncuesta() {
    document.getElementById('multiStepForm').reset();
    document.getElementById('score-display').style.display = 'block';
    document.getElementById('narrativa').disabled = false;
    document.getElementById('narrative-buttons').style.display = 'block';
    document.getElementById('after-send-message').style.display = 'none';
    // Limpiar resultado LLM previo
    const llmScoreEl = document.getElementById('llm-triage-score');
    const llmLevelEl = document.getElementById('llm-triage-level');
    const llmRawEl = document.getElementById('llm-raw-response');
    if (llmScoreEl) llmScoreEl.textContent = '—';
    if (llmLevelEl) { llmLevelEl.textContent = ''; llmLevelEl.style.color = ''; }
    if (llmRawEl) llmRawEl.textContent = '';
    const sendBtn = document.getElementById('send-narrative-btn');
    if (sendBtn) { sendBtn.disabled = false; sendBtn.textContent = 'Enviar al Triage'; }

    // Resetear el estado del botón de voz
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
        mediaRecorder.stop();
    }
    mediaRecorder = null;
    isRecording = false;
    const voiceBtn = document.getElementById('voice-narrative-btn');
    if (voiceBtn) {
        voiceBtn.classList.remove('recording');
        voiceBtn.disabled = false;
        voiceBtn.textContent = 'Narrar sintomas con voz';
    }
    setVoiceStatus('', '');

    // Ocultar todos los subcontenedores de síntomas
    document.querySelectorAll('.hijos-container').forEach(c => c.style.display = 'none');

    calculateScore();
    showPage('hoja1');
}

// Inicialización
document.addEventListener('DOMContentLoaded', () => {
    const session = localStorage.getItem('currentSession');
    if (session) {
        // Si ya hay sesión activa, saltar directamente al formulario
        document.getElementById('score-display').style.display = 'inline-flex';
        showPage('hoja1');
    } else {
        showPage('hoja1_login');
    }
});
const mainForm = document.getElementById('multiStepForm');
mainForm.addEventListener('change', calculateScore);
mainForm.addEventListener('input', calculateScore);

//funcion para habilitar el embarazo solo si es mujer:
function hayEmbarazo() {
    const esHombre = document.getElementById('hombre').checked;

    const embSi = document.getElementById('emb_si');
    const embNo = document.getElementById('emb_no');

    if (esHombre) {
        // Desmarcar
        embSi.checked = false;
        embNo.checked = false;

        // Deshabilitar
        embSi.disabled = true;
        embNo.disabled = true;
    } else {
        // Habilitar
        embSi.disabled = false;
        embNo.disabled = false;
    }
}

// 5. NARRACIÓN POR VOZ (Whisper)
// Endpoints resueltos arriba (ASR_ENDPOINT, WHISPER_LANGUAGE desde config.js con fallback /api/transcribir)

let mediaRecorder = null;
let audioChunks = [];
let isRecording = false;

function setVoiceStatus(message, type = '') {
    const statusEl = document.getElementById('voice-status');
    if (!statusEl) return;
    statusEl.textContent = message;
    statusEl.className = 'voice-status' + (type ? ' ' + type : '');
}

/**
 * Inicia o detiene la grabación de voz (toggle).
 * Al detener, envía el audio a Whisper y vuelca la transcripción al textarea.
 */
async function narrarsintomasPorVoz() {
    const btn = document.getElementById('voice-narrative-btn');
    if (!btn) return;

    if (!isRecording) {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaRecorder = new MediaRecorder(stream);
            audioChunks = [];

            mediaRecorder.ondataavailable = (e) => {
                if (e.data.size > 0) audioChunks.push(e.data);
            };

            mediaRecorder.onstop = () => {
                stream.getTracks().forEach(t => t.stop());
                const blob = new Blob(audioChunks, { type: mediaRecorder.mimeType || 'audio/webm' });
                transcribirAudio(blob);
            };

            mediaRecorder.start();
            isRecording = true;

            btn.classList.add('recording');
            btn.disabled = false;
            btn.textContent = 'Detener grabacion';
            setVoiceStatus('Grabando… hablá con normalidad. Tocá el botón para detener.', 'recording');
        } catch (err) {
            setVoiceStatus('No se pudo acceder al micrófono. Revisá los permisos del navegador.', 'error');
        }
    } else {
        isRecording = false;
        btn.disabled = true;
        btn.textContent = 'Transcribiendo…';
        setVoiceStatus('Transcribiendo audio…', '');
        mediaRecorder.stop();
    }
}

/**
 * Envía el audio grabado a la API de Whisper y coloca la transcripción
 * en el textarea de la narración (reemplaza siempre el contenido).
 */
async function transcribirAudio(blob) {
    const btn = document.getElementById('voice-narrative-btn');
    const formData = new FormData();
    formData.append('audio_file', blob, 'audio.webm');

    const params = new URLSearchParams({
        encode: 'true',
        task: 'transcribe',
        language: WHISPER_LANGUAGE,
        output: 'txt'
    });

    const endpoint = (typeof ASR_ENDPOINT !== 'undefined' && ASR_ENDPOINT) ? ASR_ENDPOINT : (API && API.ASR_ENDPOINT) || "/api/transcribir";
    const url = `${endpoint}?${params}`;

    try {
        const response = await fetch(url, {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            const body = await response.text().catch(() => '');
            throw new Error(`HTTP ${response.status} ${body.slice(0, 200)}`);
        }

        const transcription = await response.text();
        document.getElementById('narrativa').value = transcription;
        setVoiceStatus('Transcripción lista. Revisá y corregí el texto antes de enviar.', 'success');
    } catch (err) {
        console.error(`Error al transcribir via ${url}:`, err);
        setVoiceStatus(`No se pudo transcribir el audio via ${endpoint}. Verificá que el proxy nginx y Whisper estén activos. Detalle: ${err.message}`, 'error');
    } finally {
        if (btn) {
            btn.classList.remove('recording');
            btn.disabled = false;
            btn.textContent = 'Narrar sintomas con voz';
        }
    }
}