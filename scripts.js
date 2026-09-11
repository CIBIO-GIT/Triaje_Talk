let sintomasScore = {};

// 1. CARGA INICIAL Y RENDERIZADO DINÁMICO
fetch("sintomas.json")
    .then(res => res.json())
    .then(data => {
        sintomasScore = data;
        renderizarSintomas(); // Genera la Hoja 4 automáticamente
    })
    .catch(err => console.error("Error cargando sintomas.json", err));

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
 * Mapea puntaje a nivel Manchester (fuente única de verdad)
 */
function getNivelTriage(score) {
    if (score >= 40) return { text: "🔴 Rojo (Atención Inmediata)", color: "#e74c3c", nivel: "Rojo" };
    if (score >= 20) return { text: "🟠 Naranja (Urgencia)", color: "#e67e22", nivel: "Naranja" };
    if (score >= 10) return { text: "🟡 Amarillo (Diferable)", color: "#f1c40f", nivel: "Amarillo" };
    if (score >= 3) return { text: "🟢 Verde (No Urgente)", color: "#2ecc71", nivel: "Verde" };
    return { text: "🔵 Azul (Consulta General)", color: "#3498db", nivel: "Azul" };
}

/**
 * Muestra los resultados finales según el puntaje (flujo estructurado)
 */
function mostrarResultados() {
    calculateScore();
    const finalScore = parseInt(document.getElementById('score-value').innerText);
    document.getElementById('final-score-value').innerText = finalScore;

    const { text: levelText, color: levelColor } = getNivelTriage(finalScore);

    const triageElement = document.getElementById('final-triage-level');
    triageElement.innerHTML = levelText;
    triageElement.style.color = levelColor;

    console.log("[Triage] origen: formulario-estructurado", { puntaje: finalScore, nivel: getNivelTriage(finalScore).nivel });

    showPage('hojaFinal');
}

// Endpoint Gemini vía proxy reverso (inyecta x-goog-api-key, no expone key en browser)
const TRIAGE_API_URL = "/api/generar-triage";

/**
 * Construye el prompt que se inyecta en el browser (nginx solo hace proxy_pass + header).
 * Incluye narrativa + datos demográficos + sintomas.json completo para que Gemini calcule puntaje.
 */
function construirPromptTriage({ edad, sexo, embarazo, sintomas_graves, respondiente, narrativa }) {
    return `Eres un clasificador de triage Manchester para el Hospital San José.

TAREA:
- Mapea la narrativa del paciente a los IDs de sintomas.json y calcula el puntaje total.
- Suma: edad según config_puntajes.edad + embarazo (30 si "si") + graves (50 si "si") + scores de síntomas padres e hijos (ej: p_dolor 3 + dolor_pecho 20).
- Umbrales fijos: >=40 Rojo (Atención Inmediata), >=20 Naranja (Urgencia), >=10 Amarillo (Diferible), >=3 Verde (No Urgente), <3 Azul (Consulta General).
- Devuelve SOLO JSON válido con {"puntaje": int 0-100, "nivel": "Rojo|Naranja|Amarillo|Verde|Azul"} sin markdown ni texto extra.
- No inventes síntomas no mencionados. Sé conservador si la narrativa es ambigua.

DATOS DEL PACIENTE:
- Respondiente: ${respondiente}
- Edad: ${edad}
- Sexo: ${sexo}
- Embarazo: ${embarazo}
- Síntomas graves (hoja3): ${sintomas_graves}
- Narrativa: """${narrativa}"""

SINTOMAS.JSON (baremo oficial):
${JSON.stringify(sintomasScore, null, 2)}`;
}

/**
 * Parsea respuesta de Gemini en múltiples formatos posibles.
 * Soporta generateContent {candidates[0].content.parts[0].text} y fallback interactions {output}.
 */
function parsearRespuestaGemini(raw) {
    let text = null;

    // Formato oficial generateContent
    if (raw.candidates && raw.candidates[0]?.content?.parts?.[0]?.text) {
        text = raw.candidates[0].content.parts[0].text;
    } else if (typeof raw.output === "string") {
        text = raw.output;
    } else if (typeof raw.output_text === "string") {
        text = raw.output_text;
    } else if (typeof raw.text === "string") {
        text = raw.text;
    } else if (typeof raw === "string") {
        text = raw;
    }

    if (!text) {
        // Intento: el proxy ya devolvió JSON directo {puntaje, nivel}
        if (typeof raw.puntaje !== "undefined" && raw.nivel) {
            return { puntaje: raw.puntaje, nivel: raw.nivel, raw };
        }
        throw new Error("Formato de respuesta Gemini no reconocido");
    }

    // Limpiar posible markdown ```json ... ```
    const cleaned = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();

    // Extraer JSON si viene con texto adicional
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    const jsonStr = jsonMatch ? jsonMatch[0] : cleaned;

    const parsed = JSON.parse(jsonStr);
    if (typeof parsed.puntaje === "undefined" || !parsed.nivel) {
        throw new Error("Respuesta Gemini sin puntaje/nivel");
    }
    return { puntaje: parsed.puntaje, nivel: parsed.nivel, raw };
}

/**
 * Envío de narrativa a Gemini vía /api/generar-triage (prompt inyectado en browser).
 * Renderiza resultado en hojaFinal igual que el flujo estructurado.
 */
async function enviarNarrativa() {
    const narrativaEl = document.getElementById('narrativa');
    const narrativa = narrativaEl.value.trim();
    const errorEl = document.getElementById('narrative-error');
    const loadingEl = document.getElementById('narrative-loading');
    const sendBtn = document.getElementById('send-narrative-btn');
    const voiceBtn = document.getElementById('voice-narrative-btn');

    if (errorEl) errorEl.textContent = "";

    if (narrativa.length < 10) {
        if (errorEl) errorEl.textContent = "Describí tus síntomas con más detalle (mínimo 10 caracteres).";
        else setVoiceStatus("Describí tus síntomas con más detalle (mínimo 10 caracteres).", "error");
        return;
    }

    if (Object.keys(sintomasScore).length === 0) {
        if (errorEl) errorEl.textContent = "Aún se está cargando el baremo de síntomas. Intentá de nuevo en unos segundos.";
        return;
    }

    const datos = {
        respondiente: document.querySelector('input[name="respondiente"]:checked')?.value || 'N/A',
        edad: parseInt(document.getElementById('edad').value) || 0,
        sexo: document.querySelector('input[name="sexo"]:checked')?.value || 'N/A',
        embarazo: document.querySelector('input[name="embarazo"]:checked')?.value || 'no',
        sintomas_graves: document.querySelector('input[name="sintomas_graves"]:checked')?.value || 'no',
        narrativa
    };

    const prompt = construirPromptTriage(datos);

    // Payload Gemini generateContent (proxy hace pass-through + inyecta x-goog-api-key)
    const geminiBody = {
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
            temperature: 0.2,
            responseMimeType: "application/json",
            responseSchema: {
                type: "object",
                properties: {
                    puntaje: { type: "integer", description: "Puntaje total 0-100" },
                    nivel: { type: "string", enum: ["Rojo", "Naranja", "Amarillo", "Verde", "Azul"] }
                },
                required: ["puntaje", "nivel"]
            }
        }
    };

    // UI loading
    if (sendBtn) {
        sendBtn.disabled = true;
        sendBtn.textContent = "Evaluando...";
    }
    if (voiceBtn) voiceBtn.disabled = true;
    if (narrativaEl) narrativaEl.disabled = true;
    if (loadingEl) loadingEl.style.display = "block";
    setVoiceStatus("Evaluando prioridad con IA...", "");

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    try {
        const response = await fetch(TRIAGE_API_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(geminiBody),
            signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
            const errText = await response.text().catch(() => "");
            throw new Error(`API respondió ${response.status} ${errText.slice(0, 200)}`);
        }

        const raw = await response.json();
        const { puntaje: puntajeRaw } = parsearRespuestaGemini(raw);

        let puntaje = parseInt(puntajeRaw, 10);
        if (isNaN(puntaje)) throw new Error("Puntaje no numérico");
        puntaje = Math.max(0, Math.min(100, puntaje));

        // Fuente única de verdad para nivel/color (evita alucinación)
        const { text: levelText, color: levelColor, nivel } = getNivelTriage(puntaje);

        // Actualizar displays (header + hojaFinal)
        const scoreDisplay = document.getElementById('score-value');
        if (scoreDisplay) scoreDisplay.innerText = puntaje;
        document.getElementById('final-score-value').innerText = puntaje;
        const triageEl = document.getElementById('final-triage-level');
        triageEl.innerHTML = levelText;
        triageEl.style.color = levelColor;

        console.log("[Triage] origen: IA-narrativa", { puntaje, nivel, raw });

        showPage('hojaFinal');
    } catch (err) {
        clearTimeout(timeoutId);
        console.error("Error al evaluar con Gemini:", err);
        const msg = err.name === "AbortError"
            ? "La evaluación tardó demasiado. Verificá tu conexión y reintentá."
            : "No se pudo evaluar la narrativa. Verificá que el proxy /api/generar-triage esté activo y reintentá.";
        if (errorEl) errorEl.textContent = msg;
        setVoiceStatus(msg, "error");
    } finally {
        if (loadingEl) loadingEl.style.display = "none";
        if (sendBtn) {
            sendBtn.disabled = false;
            sendBtn.textContent = "Enviar al Triage";
        }
        if (voiceBtn) voiceBtn.disabled = false;
        if (narrativaEl) narrativaEl.disabled = false;
        setVoiceStatus("", "");
        // Limpiar loading extra si quedó
        const statusEl = document.getElementById('voice-status');
        if (statusEl && statusEl.textContent === "Evaluando prioridad con IA...") {
            setVoiceStatus("", "");
        }
    }
}

/**
 * Reset completo del sistema
 */
function reiniciarEncuesta() {
    document.getElementById('multiStepForm').reset();
    document.getElementById('score-display').style.display = 'block';
    const narrativaEl = document.getElementById('narrativa');
    if (narrativaEl) narrativaEl.disabled = false;
    const nb = document.getElementById('narrative-buttons');
    if (nb) nb.style.display = 'flex';
    const afterMsg = document.getElementById('after-send-message');
    if (afterMsg) afterMsg.style.display = 'none';
    const errEl = document.getElementById('narrative-error');
    if (errEl) errEl.textContent = '';
    const loadingEl = document.getElementById('narrative-loading');
    if (loadingEl) loadingEl.style.display = 'none';
    const sendBtn = document.getElementById('send-narrative-btn');
    if (sendBtn) {
        sendBtn.disabled = false;
        sendBtn.textContent = 'Enviar al Triage';
    }

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

// uso proxy para probar, para producción usar n8n
const WHISPER_URL = 'http://127.0.0.1:9000/asr';
const WHISPER_LANGUAGE = 'es';

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

    try {
        const response = await fetch(`${WHISPER_URL}?${params}`, {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            throw new Error(`Whisper respondió ${response.status}`);
        }

        const transcription = await response.text();
        document.getElementById('narrativa').value = transcription;
        setVoiceStatus('Transcripción lista. Revisá y corregí el texto antes de enviar.', 'success');
    } catch (err) {
        console.error('Error al transcribir:', err);
        setVoiceStatus('No se pudo transcribir el audio. Verificá que Whisper esté corriendo en el puerto 9000.', 'error');
    } finally {
        if (btn) {
            btn.classList.remove('recording');
            btn.disabled = false;
            btn.textContent = 'Narrar sintomas con voz';
        }
    }
}