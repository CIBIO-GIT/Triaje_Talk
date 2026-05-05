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
    const user  = users.find(u => u.dni === dni && u.password === password);

    if (user) {
        localStorage.setItem('currentSession', JSON.stringify({
            dni:      user.dni,
            nombre:   user.nombre,
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
 * Envío de datos a n8n
 */
function enviarNarrativa() {
    const formData = {
        respondiente: document.querySelector('input[name="respondiente"]:checked')?.value || 'N/A',
        edad: document.getElementById('edad').value,
        sexo: document.querySelector('input[name="sexo"]:checked')?.value || 'N/A',
        embarazo: document.querySelector('input[name="embarazo"]:checked')?.value || 'no',
        narrativa: document.getElementById('narrativa').value,
        puntaje: document.getElementById('score-value').innerText,
        origen: "github-pages"
    };

    fetch("https://creactivehub.app.n8n.cloud/webhook/from-ghpages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData)
    })
    .then(() => {
        document.getElementById('narrative-buttons').style.display = 'none';
        document.getElementById('narrativa').disabled = true;
        document.getElementById('after-send-message').style.display = 'block';
    })
    .catch(err => console.error("Error al enviar:", err));
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