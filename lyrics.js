// ════════════════════════════════════════════════════════════════════════
// lyrics.js — Letras sincronizadas flotando sobre el universo ✨
// ────────────────────────────────────────────────────────────────────────
// Cómo funciona:
//   1. Cada canción tiene un .txt en la carpeta "lyrics/" con EXACTAMENTE
//      el mismo nombre que el archivo de audio (sin la extensión .mp3,
//      con extensión .txt). Ejemplo:
//
//        musica/Keane - Somewhere Only We Know (Official Music Video).mp3
//        lyrics/Keane - Somewhere Only We Know (Official Music Video).txt
//
//   2. El formato del .txt es: cada línea = "m:ss texto de la línea"
//      (el mismo formato que ya tienes). Si una línea de texto se repite
//      con dos timestamps seguidos (estilo karaoke con inicio/fin), el
//      segundo timestamp se usa como el momento en que ESA línea termina
//      y empieza la siguiente.
//
//   3. Si no existe el .txt de una canción, simplemente no se muestra
//      nada (no rompe nada ni muestra errores al usuario).
// ════════════════════════════════════════════════════════════════════════

const CARPETA_LETRAS = 'lyrics/';

// Caché para no re-descargar/parsear la misma letra varias veces
const cacheLetras = new Map();

let lineasActuales = [];   // [{tiempo, texto}] de la canción actual
let indiceLineaActual = -1;
let letrasVisibles = false;
let audioRef = null;
let archivoActualKey = null;

// ── Construcción del DOM (capa flotante) ──────────────────────────────
function crearDOM() {
    if (document.getElementById('lyrics-layer')) return;

    const layer = document.createElement('div');
    layer.id = 'lyrics-layer';
    layer.innerHTML = `
        <div id="lyrics-anterior"></div>
        <div id="lyrics-actual"></div>
        <div id="lyrics-siguiente"></div>
        <div id="lyrics-vacio">♪ Letra no disponible para esta canción ♪</div>
    `;
    document.body.appendChild(layer);

    const estilo = document.createElement('style');
    estilo.id = 'lyrics-style';
    estilo.textContent = `
        #lyrics-layer {
            position: fixed;
            left: 0;
            right: 0;
            bottom: 130px;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: flex-end;
            gap: 10px;
            padding: 0 24px;
            z-index: 500;
            pointer-events: none;
            opacity: 0;
            visibility: hidden;
            transition: opacity 0.5s ease;
            text-align: center;
        }
        #lyrics-layer.visible {
            opacity: 1;
            visibility: visible;
        }
        #lyrics-anterior, #lyrics-siguiente {
            font-family: 'Segoe UI', sans-serif;
            font-size: 0.95rem;
            color: rgba(230, 217, 255, 0.45);
            text-shadow: 0 0 10px rgba(0,0,0,0.6), 0 0 18px rgba(150,80,255,0.25);
            letter-spacing: 0.5px;
            max-width: 90vw;
            transition: opacity 0.35s ease, transform 0.35s ease;
        }
        #lyrics-actual {
            font-family: 'Segoe UI', sans-serif;
            font-weight: 600;
            font-size: 1.5rem;
            color: #ffffff;
            text-shadow:
                0 0 12px rgba(0,229,255,0.85),
                0 0 28px rgba(170,80,255,0.55),
                0 2px 6px rgba(0,0,0,0.7);
            letter-spacing: 0.5px;
            max-width: 90vw;
            min-height: 1.4em;
            transition: opacity 0.35s ease, transform 0.35s ease;
        }
        #lyrics-vacio {
            display: none;
            font-family: 'Segoe UI', sans-serif;
            font-size: 0.95rem;
            font-style: italic;
            color: rgba(200, 200, 220, 0.55);
            text-shadow: 0 0 10px rgba(0,0,0,0.6);
        }
        #lyrics-layer.sin-letra #lyrics-vacio { display: block; }
        #lyrics-layer.sin-letra #lyrics-anterior,
        #lyrics-layer.sin-letra #lyrics-actual,
        #lyrics-layer.sin-letra #lyrics-siguiente { display: none; }

        /* Animación sutil de entrada de cada línea nueva */
        .lyrics-line-enter {
            animation: lyricsFadeUp 0.45s ease both;
        }
        @keyframes lyricsFadeUp {
            from { opacity: 0; transform: translateY(8px); }
            to   { opacity: 1; transform: translateY(0); }
        }

        /* Botón de letras: mismo estilo que el resto de mc-btn */
        #btn-lyrics.active {
            background: rgba(0,229,255,0.30);
            border-color: rgba(0,229,255,0.8);
            color: #aef6ff;
        }

        /* En pantallas muy pequeñas, deja más aire respecto a la barra inferior */
        @media (max-width: 480px) {
            #lyrics-layer { bottom: 122px; padding: 0 16px; }
            #lyrics-actual { font-size: 1.2rem; }
            #lyrics-anterior, #lyrics-siguiente { font-size: 0.8rem; }
        }
    `;
    document.head.appendChild(estilo);
}

// ── Parser del formato .txt ─────────────────────────────────────────────
// Acepta líneas como: "1:42 texto de la línea"
// Si el mismo texto aparece dos veces seguidas con timestamps distintos
// (formato karaoke inicio/fin), se usa solo como [tiempoInicio, texto] y
// el segundo timestamp simplemente marca el fin (lo deducimos del inicio
// de la siguiente línea distinta).
function parsearLetra(texto) {
    const lineasCrudas = texto.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    const regex = /^(\d{1,2}):(\d{2})\s+(.*)$/;

    const entradas = [];
    for (const linea of lineasCrudas) {
        const m = linea.match(regex);
        if (!m) continue;
        const minutos = parseInt(m[1], 10);
        const segundos = parseInt(m[2], 10);
        const tiempo = minutos * 60 + segundos;
        const contenido = m[3].trim();
        entradas.push({ tiempo, texto: contenido });
    }
    if (entradas.length === 0) return [];

    // Colapsar duplicados consecutivos (mismo texto, dos timestamps =
    // inicio/fin del verso): nos quedamos con el primer timestamp como
    // inicio real de esa línea.
    const lineas = [];
    for (let i = 0; i < entradas.length; i++) {
        const actual = entradas[i];
        const siguiente = entradas[i + 1];
        if (siguiente && siguiente.texto === actual.texto && siguiente.tiempo >= actual.tiempo) {
            // Es el par inicio/fin de la misma línea: usamos el de inicio
            // y saltamos el duplicado.
            lineas.push({ tiempo: actual.tiempo, texto: actual.texto });
            i++; // saltar el duplicado
        } else {
            lineas.push({ tiempo: actual.tiempo, texto: actual.texto });
        }
    }

    // Asegurar orden cronológico por si acaso
    lineas.sort((a, b) => a.tiempo - b.tiempo);
    return lineas;
}

// ── Carga de un archivo de letra (con caché) ────────────────────────────
async function cargarLetraPara(nombreCancionSinExt) {
    if (cacheLetras.has(nombreCancionSinExt)) {
        return cacheLetras.get(nombreCancionSinExt);
    }
    const ruta = CARPETA_LETRAS + nombreCancionSinExt + '.txt';
    console.log('[letras] Buscando archivo:', ruta);
    try {
        const resp = await fetch(ruta);
        console.log('[letras] Respuesta del servidor:', resp.status, resp.ok ? 'OK' : 'FALLÓ');
        if (!resp.ok) {
            cacheLetras.set(nombreCancionSinExt, null);
            return null;
        }
        const texto = await resp.text();
        console.log('[letras] Caracteres recibidos:', texto.length);
        const lineas = parsearLetra(texto);
        console.log('[letras] Líneas con timestamp detectadas:', lineas.length);
        const resultado = lineas.length ? lineas : null;
        cacheLetras.set(nombreCancionSinExt, resultado);
        return resultado;
    } catch (e) {
        console.warn('[letras] Error al hacer fetch (revisa CORS / servidor local):', e);
        cacheLetras.set(nombreCancionSinExt, null);
        return null;
    }
}

// ── Render de las líneas (anterior / actual / siguiente) ───────────────
function pintarLineas(idx) {
    const elAnterior = document.getElementById('lyrics-anterior');
    const elActual = document.getElementById('lyrics-actual');
    const elSiguiente = document.getElementById('lyrics-siguiente');

    const anterior = lineasActuales[idx - 1];
    const actual = lineasActuales[idx];
    const siguiente = lineasActuales[idx + 1];

    elAnterior.textContent = anterior ? anterior.texto : '';
    elSiguiente.textContent = siguiente ? siguiente.texto : '';

    if (actual) {
        elActual.textContent = actual.texto;
        elActual.classList.remove('lyrics-line-enter');
        // reiniciar animación
        void elActual.offsetWidth;
        elActual.classList.add('lyrics-line-enter');
    } else {
        elActual.textContent = '';
    }
}

function actualizarSegunTiempo() {
    if (!letrasVisibles || !audioRef || lineasActuales.length === 0) return;
    const t = audioRef.currentTime;

    // Buscar el índice de la línea vigente (la última cuyo tiempo <= t)
    let nuevoIndice = -1;
    for (let i = 0; i < lineasActuales.length; i++) {
        if (lineasActuales[i].tiempo <= t) nuevoIndice = i;
        else break;
    }

    if (nuevoIndice !== indiceLineaActual) {
        indiceLineaActual = nuevoIndice;
        pintarLineas(indiceLineaActual);
    }
}

// ── API pública del módulo ──────────────────────────────────────────────

/**
 * Se llama cada vez que se carga una canción nueva en el reproductor.
 * nombreSinExt: el nombre "limpio" de la canción, igual al que usa
 * nombreLimpioDe() en el HTML (sin "musica/" ni ".mp3").
 */
export async function letrasCancionCambiada(nombreSinExt) {
    crearDOM();
    archivoActualKey = nombreSinExt;
    indiceLineaActual = -1;
    lineasActuales = [];

    const layer = document.getElementById('lyrics-layer');
    document.getElementById('lyrics-anterior').textContent = '';
    document.getElementById('lyrics-actual').textContent = '';
    document.getElementById('lyrics-siguiente').textContent = '';

    const lineas = await cargarLetraPara(nombreSinExt);

    // Si el usuario cambió de canción otra vez mientras cargábamos, no pisar
    if (archivoActualKey !== nombreSinExt) return;

    if (!lineas) {
        lineasActuales = [];
        layer.classList.add('sin-letra');
    } else {
        lineasActuales = lineas;
        layer.classList.remove('sin-letra');
        actualizarSegunTiempo();
    }
}

/**
 * Inicializa el módulo de letras.
 * audio: el elemento <audio> del reproductor.
 * obtenerNombreActual: función que devuelve el nombre limpio de la
 *   canción que está sonando en este momento (para la carga inicial).
 */
export function inicializarLetras(audio, obtenerNombreActual) {
    crearDOM();
    audioRef = audio;

    audio.addEventListener('timeupdate', actualizarSegunTiempo);

    // Botón de letras en la barra del reproductor
    const btnLyrics = document.getElementById('btn-lyrics');
    const layer = document.getElementById('lyrics-layer');
    console.log('[letras] Botón #btn-lyrics encontrado:', !!btnLyrics);
    console.log('[letras] Capa #lyrics-layer creada:', !!layer);
    if (btnLyrics) {
        btnLyrics.addEventListener('click', () => {
            letrasVisibles = !letrasVisibles;
            console.log('[letras] Click en botón. Visible ahora:', letrasVisibles, '| Líneas cargadas:', lineasActuales.length);
            btnLyrics.classList.toggle('active', letrasVisibles);
            layer.classList.toggle('visible', letrasVisibles);
            if (letrasVisibles) actualizarSegunTiempo();
        });
    } else {
        console.warn('[letras] No se encontró el botón #btn-lyrics en el HTML.');
    }

    // Carga inicial (si ya hay una canción sonando al iniciar)
    if (typeof obtenerNombreActual === 'function') {
        const nombre = obtenerNombreActual();
        if (nombre) letrasCancionCambiada(nombre);
    }
}