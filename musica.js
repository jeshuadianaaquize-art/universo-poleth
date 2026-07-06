// ── MÓDULO DE MÚSICA (reproductor + playlist) ─────────────────────────────
// Toda la lógica del reproductor (canciones, controles, lista visual,
// aleatorio, barra de progreso) vive aquí para no inflar el index.html.
// Se importa como módulo ES desde index.html con:
//   import { cargarCancion } from './musica.js';
//
// "cargarCancion" se exporta porque el botón de huella (lanzarBigBang)
// en index.html necesita arrancar la primera canción al iniciar.

// ── CACHE BUSTING ────────────────────────────────────────────────────────
// Usamos la misma versión global definida en index.html (window.APP_VERSION)
// para que solo haya UN número que tocar al subir cambios a GitHub.
const APP_VERSION = window.APP_VERSION || '1.0';

// Import "blindado": si lyrics.js no existe, no está en la misma
// carpeta, o el navegador bloquea módulos (file://), el universo
// sigue cargando igual. Las letras simplemente no funcionarán.
let inicializarLetras = () => { };
let letrasCancionCambiada = () => { };
try {
    const mod = await import(`./lyrics.js?v=${APP_VERSION}`);
    inicializarLetras = mod.inicializarLetras;
    letrasCancionCambiada = mod.letrasCancionCambiada;
} catch (e) {
    console.warn('No se pudo cargar lyrics.js (las letras no estarán disponibles):', e);
}

// ── MÚSICA ────────────────────────────────────────────────────────────────
// Cada canción es { archivo, favorita } — "favorita" = true son las que ya
// estaban en la playlist original (se marcan con 🐾 en la lista).
// Ordenadas en bloques por género / energía para que las transiciones entre
// canciones fluyan mejor (sin saltar de un ritmo a otro de golpe).
const cancionesData = [

    // ── Pop romántico / soft pop (apertura suave) ──────────────────────
    { archivo: 'musica/Ariana Grande - hate that i made you love me.mp3', favorita: false },
    { archivo: 'musica/RAYE - WHERE IS MY HUSBAND!.mp3', favorita: true },
    { archivo: 'musica/Ed Sheeran - Give Me Love.mp3', favorita: true },
    { archivo: "musica/Ali Gatie - It's You.mp3", favorita: true },
    { archivo: 'musica/Love song.mp3', favorita: true },
    { archivo: 'musica/Keane - Somewhere Only We Know (Official Music Video).mp3', favorita: false },
    { archivo: 'musica/Cody Fry - I Hear a Symphony.mp3', favorita: true },
    { archivo: "musica/Willamette Stone - Heart Like Yours.mp3", favorita: true },
    { archivo: 'musica/Maroon 5 - Sunday Morning.mp3', favorita: true },
    { archivo: 'musica/She\'s The One.mp3', favorita: true },
    { archivo: 'musica/Happy Together.mp3', favorita: true },
    { archivo: 'musica/New West - Those Eyes.mp3', favorita: true },
    { archivo: 'musica/No Idea.mp3', favorita: true },
    { archivo: 'musica/Sweet Dreams, TN.mp3', favorita: true },
    { archivo: 'musica/The Exit.mp3', favorita: true },
    { archivo: 'musica/The Great War.mp3', favorita: true },
    { archivo: "musica/Isabel LaRosa - i'm yours.mp3", favorita: false },
    { archivo: 'musica/keshi - Soft Spot.mp3', favorita: true },
    { archivo: 'musica/Kali Uchis - telepatía.mp3', favorita: false },
    { archivo: 'musica/Kali Uchis, Peso Pluma - Igual Que Un Ángel.mp3', favorita: false },

    // ── Indie / alternative melancólico ─────────────────────────────────
    { archivo: 'musica/The 1975 - Robbers.mp3', favorita: true },
    { archivo: "musica/Rex Orange County - THE SHADE.mp3", favorita: true },
    { archivo: 'musica/As The World Caves In - Matt Maltese.mp3', favorita: true },
    { archivo: 'musica/sombr - back to friends.mp3', favorita: false },
    { archivo: 'musica/The Neighbourhood - Daddy Issues.mp3', favorita: false },
    { archivo: 'musica/Conan Gray - Heather.mp3', favorita: false },
    { archivo: 'musica/505.mp3', favorita: false },
    { archivo: 'musica/Joji - SLOW DANCING IN THE DARK.mp3', favorita: false },
    { archivo: 'musica/Oliver Tree - Life Goes On.mp3', favorita: false },
    { archivo: 'musica/Olivia Rodrigo - deja vu.mp3', favorita: false },
    { archivo: 'musica/Lana Del Rey - Video Games.mp3', favorita: true },
    { archivo: 'musica/Lana Del Rey - Summertime Sadness (Official Music Video).mp3', favorita: false },
    { archivo: 'musica/Lana Del Rey - Say Yes To Heaven.mp3', favorita: true },
    { archivo: 'musica/Damiano David - Mysterious Girl.mp3', favorita: true },
    { archivo: 'musica/Damiano David - Zombie Lady.mp3', favorita: true },
    { archivo: "musica/Taylor Swift - The Fate of Ophelia (Official Music Video).mp3", favorita: false },
    { archivo: 'musica/LIFETIME.mp3', favorita: false },
    { archivo: 'musica/ROSÉ - toxic till the end.mp3', favorita: true },
    { archivo: 'musica/ROSÉ - \'Gone\'.mp3', favorita: true },

    // ── Euphoria (HBO) / atmosférico ────────────────────────────────────
    { archivo: 'musica/Labrinth - Still Dont Know My Name.mp3', favorita: false },
    { archivo: 'musica/All For Us - Zendaya Only.mp3', favorita: false },
    { archivo: 'musica/LSD - Genius ft. Sia, Diplo, Labrinth.mp3', favorita: false },
    { archivo: 'musica/Billie Eilish - LUNCH.mp3', favorita: false },
    { archivo: 'musica/Billie Eilish - CHIHIRO (Official Lyric Video).mp3', favorita: false },
    { archivo: 'musica/Billie Eilish - WILDFLOWER (Official Lyric Video).mp3', favorita: false },
    { archivo: 'musica/Happier Than Ever.mp3', favorita: false },
    { archivo: 'musica/Madison Beer - bittersweet.mp3', favorita: true },
    { archivo: 'musica/DPR IAN - Don\'t Go Insane.mp3', favorita: true },

    // ── R&B / pop sensual ────────────────────────────────────────────
    { archivo: "musica/Ariana Grande - better off.mp3", favorita: true },
    { archivo: 'musica/Ariana Grande - goodnight n go.mp3', favorita: true },
    { archivo: 'musica/Ariana Grande - imagine.mp3', favorita: true },
    { archivo: 'musica/Ariana Grande - intro.mp3', favorita: true },
    { archivo: 'musica/Ariana Grande - pov.mp3', favorita: true },
    { archivo: "musica/Ariana Grande - no tears left to cry (Official Video).mp3", favorita: false },
    { archivo: "musica/Ariana Grande - we can't be friends (wait for your love) (official music video).mp3", favorita: false },
    { archivo: 'musica/The Weeknd, Ariana Grande - Die For You.mp3', favorita: true },
    { archivo: 'musica/The Weeknd, JENNIE & Lily Rose Depp - One Of The Girls (Official Audio).mp3', favorita: false },
    { archivo: 'musica/Doja Cat, The Weeknd - You Right (Official Video).mp3', favorita: false },
    { archivo: 'musica/Selena Gomez - Fetish ft. Gucci Mane (Official Music Video).mp3', favorita: false },
    { archivo: 'musica/Dove Cameron - Boyfriend (Official Video).mp3', favorita: false },
    { archivo: 'musica/RIDE OR DIE PT. 2 FT. TOKISCHA & VILLANO ANTILLANO (VÍDEO CON LETRAS).mp3', favorita: false },
    { archivo: 'musica/Dracula (JENNIE Remix).mp3', favorita: false },
    { archivo: 'musica/HUMBE - KINTSUGI.mp3', favorita: false },
    { archivo: 'musica/LISA - DREAM.mp3', favorita: true },
    { archivo: 'musica/LISA - Chill.mp3', favorita: true },
    { archivo: 'musica/JENNIE & Dominic Fike \'Love Hangover\'.mp3', favorita: true },
    { archivo: 'musica/MARQUISE - dontneedyouanymore.mp3', favorita: true },

    // ── Pop / dance mainstream (sube la energía) ────────────────────────
    { archivo: 'musica/Harry Styles - Adore You.mp3', favorita: true },
    { archivo: 'musica/Harry Styles - Coming Up Roses.mp3', favorita: true },
    { archivo: 'musica/Shawn Mendes - There\'s Nothing Holdin\' Me Back.mp3', favorita: true },
    { archivo: 'musica/DJ Snake, Justin Bieber - Let Me Love You.mp3', favorita: true },
    { archivo: 'musica/Sabrina Carpenter - Read your Mind.mp3', favorita: true },
    { archivo: 'musica/Sabrina Carpenter - Espresso.mp3', favorita: false },
    { archivo: 'musica/Dua Lipa - Break My Heart (Official Video).mp3', favorita: false },
    { archivo: 'musica/Camila Cabello - Shameless (Official Video).mp3', favorita: false },
    { archivo: 'musica/Carly Rae Jepsen - Call Me Maybe.mp3', favorita: false },
    { archivo: 'musica/OneRepublic - Counting Stars.mp3', favorita: false },
    { archivo: 'musica/Tove Lo - Habits (Stay High).mp3', favorita: false },
    { archivo: 'musica/Ariana Grande ft. Nicki Minaj - Side To Side (Official Video) ft. Nicki Minaj.mp3', favorita: false },
    { archivo: 'musica/Ariana Grande - 7 rings (Official Video).mp3', favorita: false },
    { archivo: 'musica/Justin Bieber - Beauty And A Beat (Official Music Video) ft. Nicki Minaj.mp3', favorita: false },
    { archivo: 'musica/Robin Schulz - Sugar (feat. Francesco Yates) (OFFICIAL MUSIC VIDEO).mp3', favorita: false },
    { archivo: 'musica/5 Seconds of Summer - Youngblood (Alt Version).mp3', favorita: false },
    { archivo: 'musica/5 Seconds of Summer - Teeth (Official Video).mp3', favorita: false },
    { archivo: 'musica/The Wanted - Glad You Came.mp3', favorita: false },
    { archivo: 'musica/DNCE - Cake By The Ocean.mp3', favorita: false },
    { archivo: 'musica/LET THE WORLD BURN (Official Music Video).mp3', favorita: false },
    { archivo: "musica/Lady Gaga, Doechii - RUNWAY (Official Music Video).mp3", favorita: false },
    { archivo: "musica/Lady Gaga - Abracadabra (Official Music Video).mp3", favorita: false },
    { archivo: 'musica/ROSÉ - \'On The Ground\'.mp3', favorita: true },
    { archivo: 'musica/Camila Cabello - My Oh My.mp3', favorita: true },
    { archivo: 'musica/LISA - MOONLIT FLOOR (Official Performance Video).mp3', favorita: true },
    { archivo: 'musica/LISA - WHEN I\'M WITH YOU feat. Tyla.mp3', favorita: true },
    { archivo: 'musica/Madison Beer - Make You Mine.mp3', favorita: true },
    { archivo: 'musica/Tate McRae - greedy.mp3', favorita: true },

    // ── Bruno Mars / funk-pop ─────────────────────────────────────────
    { archivo: 'musica/Bruno Mars - Just The Way You Are.mp3', favorita: true },
    { archivo: 'musica/Bruno Mars - Locked Out Of Heaven.mp3', favorita: true },
    { archivo: 'musica/Bruno Mars - Risk It All.mp3', favorita: true },
    { archivo: "musica/Bruno Mars - Thats What I Like [Official Music Video].mp3", favorita: false },
    { archivo: 'musica/Maroon 5 - Sugar (Official Music Video).mp3', favorita: false },

    // ── Big Time Rush / pop juvenil 2010s ────────────────────────────
    { archivo: 'musica/Big Time Rush - Confetti Falling (Official Video).mp3', favorita: false },
    { archivo: 'musica/Big Time Rush - City Is Ours (Official Video).mp3', favorita: false },
    { archivo: 'musica/Big Time Rush - Big Night (Official Video).mp3', favorita: false },
    { archivo: 'musica/Big Time Rush - Til I Forget About You Español.mp3', favorita: false },
    { archivo: 'musica/Big Time Rush - Any Kind of Guy (Official Video).mp3', favorita: false },
    { archivo: 'musica/Big Time Rush - Music Sounds Better (Official Video) ft. Mann.mp3', favorita: false },
    { archivo: 'musica/Big Time Rush - Worldwide (Video).mp3', favorita: false },
    { archivo: 'musica/Big Time Rush - Boyfriend (Official Video) ft. Snoop Dogg.mp3', favorita: false },
    { archivo: 'musica/Big Time Rush - Windows Down (Official Video).mp3', favorita: false },

    // ── Clásicos / soul / disco-pop ───────────────────────────────────
    { archivo: 'musica/Amy Winehouse - Back To Black.mp3', favorita: false },
    { archivo: 'musica/Vogue.mp3', favorita: false },
    { archivo: 'musica/Remember The Time.mp3', favorita: false },
    { archivo: 'musica/Michael Jackson - Human Nature (Audio).mp3', favorita: false },
    { archivo: "musica/Michael Jackson - Don't Stop 'Til You Get Enough (Official Video - Upscaled).mp3", favorita: false },
    { archivo: 'musica/Beat It.mp3', favorita: false },
    { archivo: 'musica/You Rock My World (Radio Edit).mp3', favorita: false },
    { archivo: 'musica/Foreigner - I Want To Know What Love Is.mp3', favorita: false },
    { archivo: 'musica/Desireless - Voyage Voyage.mp3', favorita: false },
    { archivo: "musica/I'm Gonna Give My Heart.mp3", favorita: false },
    { archivo: 'musica/Sweet Dreams (Are Made of This).mp3', favorita: false },
    { archivo: 'musica/Big in Japan.mp3', favorita: false },
    { archivo: 'musica/Run to Me.mp3', favorita: false },
    { archivo: 'musica/Brother Louie.mp3', favorita: false },
    { archivo: 'musica/Self Control.mp3', favorita: false },
    { archivo: 'musica/Be My Lover.mp3', favorita: false },
    { archivo: "musica/You're My Heart, You're My Soul.mp3", favorita: false },
    { archivo: "musica/[I'll Never Be] Maria Magdalena.mp3", favorita: false },
    { archivo: 'musica/Cause You Are Young.mp3', favorita: false },
    { archivo: 'musica/C. C. Catch - Strangers By Night.mp3', favorita: false },
    { archivo: 'musica/Touch By Touch (12 Version).mp3', favorita: false },
    { archivo: 'musica/Yesterday (Remastered 2009).mp3', favorita: false },
    { archivo: 'musica/Every Breath You Take.mp3', favorita: false },
    { archivo: 'musica/Michael Sembello - Maniac.mp3', favorita: false },
    { archivo: 'musica/Joy - Touch By Touch.mp3', favorita: false },
    { archivo: 'musica/Bad Boys Blue - Heart Beat - I Wanna Hear Your Heartbeat (Sunday Girl).mp3', favorita: false },
    { archivo: 'musica/Part-Time Lover.mp3', favorita: false },

    // ── Recién agregadas (pop actual) ────────────────────────────────
    { archivo: "musica/Rockwell - Somebody's Watching Me.mp3", favorita: false },
    { archivo: "musica/Knife.mp3", favorita: false },
    { archivo: "musica/Jackson 5 - I'll Be There.mp3", favorita: false },
    { archivo: "musica/Jermaine Jackson, Pia Zadora - When the Rain Begins to Fall.mp3", favorita: false },
    { archivo: "musica/Madonna - Papa Don't Preach.mp3", favorita: false },
    { archivo: "musica/Demi Lovato - Really Don't Care ft. Cher Lloyd.mp3", favorita: false },
    { archivo: 'musica/Rihanna - Stay ft. Mikky Ekko.mp3', favorita: false },
    { archivo: "musica/Camila Cabello - Don't Go Yet.mp3", favorita: false },
    { archivo: 'musica/Taylor Swift - Wildest Dreams.mp3', favorita: false },
    { archivo: "musica/Alizée - J'en ai marre !.mp3", favorita: false },
    { archivo: 'musica/Alizée - La Isla Bonita.mp3', favorita: false },
    { archivo: 'musica/Alizee - Moi Lolita - live (HQ).mp3', favorita: false },
    { archivo: 'musica/Aaliyah -Try Again.mp3', favorita: false },
];

// Lista plana de rutas (se mantiene por compatibilidad con el resto del código)
const cancionesLista = cancionesData.map(c => c.archivo);

// Reproducción en el orden exacto en que están en cancionesData (por género)
let indiceActual = 0;
let reproduciendo = false;

// ── Orden de reproducción (normal o aleatorio) ──────────────────────────
let aleatorioActivo = false;
let ordenReproduccion = cancionesLista.map((_, i) => i);
let posicionActual = 0;

function mezclarArray(array) {
    const a = array.slice();
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

const audio = new Audio();
audio.crossOrigin = 'anonymous';
const btnPlay = document.getElementById('btn-play');
const songTitle = document.getElementById('song-title');
const waveformBar = document.getElementById('waveform-bar');
const timeCurrent = document.getElementById('time-current');
const timeTotal = document.getElementById('time-total');
const btnList = document.getElementById('btn-list');
const playlistPanel = document.getElementById('playlist-panel');
const playlistScroll = document.getElementById('playlist-scroll');

// ── Análisis de audio en tiempo real (barras que reaccionan al sonido) ─
// Usamos la Web Audio API: conectamos el <audio> a un AnalyserNode que
// nos da el nivel de cada frecuencia mientras suena. Eso se usa para
// modular la altura de cada barrita en vivo. Si está pausado o no hay
// sonido, las barras se quedan planas.
let audioCtx = null;
let analizador = null;
let datosFrecuencia = null;
let audioCtxConectado = false;

function asegurarAudioContext() {
    if (audioCtxConectado) {
        if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
        return;
    }
    try {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const sourceNode = audioCtx.createMediaElementSource(audio);
        analizador = audioCtx.createAnalyser();
        analizador.fftSize = 1024;
        analizador.smoothingTimeConstant = 0.78;
        sourceNode.connect(analizador);
        analizador.connect(audioCtx.destination);
        datosFrecuencia = new Uint8Array(analizador.frequencyBinCount);
        audioCtxConectado = true;
    } catch (e) {
        console.warn('No se pudo iniciar el análisis de audio en vivo (las barras quedarán estáticas):', e);
    }
}

// ── Waveform decorativo y funcional como barra de progreso ─────────────
// Generamos N barritas con alturas pseudo-aleatorias (pero estables,
// con una "semilla" para que no cambien de forma en cada repintado)
// y luego pintamos de color las que ya se "reprodujeron" según el
// avance de la canción, igual que en la imagen de referencia.
const WF_TOTAL_BARRAS = 60;
let wfSeed = 1234;
function wfRandom() {
    // PRNG simple y determinista para que el patrón sea estable
    wfSeed = (wfSeed * 9301 + 49297) % 233280;
    return wfSeed / 233280;
}
let wfAlturasBase = [];   // patrón de referencia (forma "tipo onda" para que no todas las barras midan igual)
let wfAlturasActuales = []; // altura actual de cada barra, se anima frame a frame
function generarWaveform() {
    waveformBar.innerHTML = '';
    wfSeed = 1234;
    wfAlturasBase = [];
    wfAlturasActuales = [];
    for (let i = 0; i < WF_TOTAL_BARRAS; i++) {
        const bar = document.createElement('div');
        bar.className = 'wf-bar';
        // Envolvente tipo "onda de voz": más alta al centro de cada grupo
        const onda = Math.sin((i / WF_TOTAL_BARRAS) * Math.PI * 3.2) * 0.5 + 0.5;
        const ruido = wfRandom() * 0.6 + 0.4;
        const alturaPct = Math.max(18, Math.min(100, onda * ruido * 100));
        wfAlturasBase.push(alturaPct);
        wfAlturasActuales.push(8);
        bar.style.height = '8%';
        waveformBar.appendChild(bar);
    }
}
function actualizarWaveformProgreso(fraccion) {
    const barras = waveformBar.children;
    const activas = Math.round(fraccion * barras.length);
    for (let i = 0; i < barras.length; i++) {
        barras[i].classList.toggle('wf-played', i < activas);
    }
}

// Loop de animación: si hay sonido sonando, las barras "bailan" según
// el volumen real de cada rango de frecuencia; si no, se aplanan poco
// a poco (efecto suave, no un corte brusco).
const WF_PLANO = 8;
function animarWaveform() {
    requestAnimationFrame(animarWaveform);
    const barras = waveformBar.children;
    if (!barras.length) return;

    const sonando = reproduciendo && !audio.paused && analizador;
    if (sonando) {
        analizador.getByteFrequencyData(datosFrecuencia);
    }
    const bins = sonando ? datosFrecuencia.length : 0;

    for (let i = 0; i < barras.length; i++) {
        let destino = WF_PLANO;
        if (sonando) {
            // Escala LOGARÍTMICA (no lineal): en audio real casi toda la
            // energía está en los graves, así que si repartimos los bins
            // de frecuencia en partes iguales, las primeras barras (graves)
            // se ven siempre altas y las últimas (agudos) casi planas.
            // Con escala log, cada barra cubre un rango de frecuencias más
            // "perceptualmente parejo" (como en un ecualizador real).
            const inicio = Math.floor(Math.pow(bins, i / barras.length));
            const fin = Math.max(inicio + 1, Math.floor(Math.pow(bins, (i + 1) / barras.length)));
            let suma = 0;
            for (let b = inicio; b < fin && b < bins; b++) suma += datosFrecuencia[b];
            const promedio = suma / (fin - inicio);

            // Compensación de ganancia: a mayor frecuencia (barras de la
            // derecha), más boost, porque su volumen real es mucho más bajo.
            const ganancia = 1 + (i / barras.length) * 2.2;
            const nivel = Math.min(1, (promedio / 255) * ganancia);

            destino = Math.max(WF_PLANO, Math.min(100, nivel * 100 * (wfAlturasBase[i] / 60)));
        }
        const actual = wfAlturasActuales[i] ?? destino;
        const nuevo = actual + (destino - actual) * 0.35;
        wfAlturasActuales[i] = nuevo;
        barras[i].style.height = nuevo + '%';
    }
}
generarWaveform();
animarWaveform();

waveformBar.addEventListener('click', (e) => {
    if (!audio.duration) return;
    const rect = waveformBar.getBoundingClientRect();
    const fraccion = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
    audio.currentTime = fraccion * audio.duration;
    actualizarWaveformProgreso(fraccion);
});

function formatearTiempo(segundos) {
    if (isNaN(segundos)) return "0:00";
    const m = Math.floor(segundos / 60);
    const s = Math.floor(segundos % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
}

function nombreLimpioDe(ruta) {
    return ruta.replace('musica/', '').replace('.mp3', '');
}

// ── Construir lista visual de canciones ──────────────────────────────────
// Se reconstruye respetando "ordenReproduccion" (secuencial o aleatorio)
function construirListaVisual() {
    playlistScroll.innerHTML = '';
    ordenReproduccion.forEach((indiceReal) => {
        const cancion = cancionesData[indiceReal];
        const item = document.createElement('div');
        item.className = 'playlist-item';
        item.dataset.indiceReal = indiceReal;

        const icon = document.createElement('span');
        icon.className = 'pl-icon';
        icon.textContent = cancion.favorita ? '🐾' : '✨';

        const name = document.createElement('span');
        name.className = 'pl-name';
        name.textContent = nombreLimpioDe(cancion.archivo);

        item.appendChild(icon);
        item.appendChild(name);
        item.addEventListener('click', () => {
            indiceActual = indiceReal;
            posicionActual = ordenReproduccion.indexOf(indiceReal);
            cargarCancion(0, true);
            actualizarResaltadoLista();
        });
        playlistScroll.appendChild(item);
    });
}

function actualizarResaltadoLista() {
    document.querySelectorAll('.playlist-item').forEach(el => {
        el.classList.toggle('playing', Number(el.dataset.indiceReal) === indiceActual);
    });
    const activo = playlistScroll.querySelector('.playlist-item.playing');
    if (activo) activo.scrollIntoView({ block: 'nearest' });
}

btnList.addEventListener('click', (e) => {
    e.stopPropagation();
    const abierto = playlistPanel.classList.toggle('open');
    btnList.classList.toggle('active', abierto);
    if (abierto) actualizarResaltadoLista();
});

document.addEventListener('click', (e) => {
    if (!playlistPanel.contains(e.target) && e.target !== btnList) {
        playlistPanel.classList.remove('open');
        btnList.classList.remove('active');
    }
});

function cargarCancion(paso, autoplay) {
    posicionActual = (posicionActual + paso + ordenReproduccion.length) % ordenReproduccion.length;
    indiceActual = ordenReproduccion[posicionActual];
    const ruta = cancionesLista[indiceActual];
    audio.src = ruta;

    // Limpiar el nombre para que se vea bonito
    let nombreLimpio = nombreLimpioDe(ruta);
    songTitle.textContent = '♪ ' + nombreLimpio;

    if (autoplay) {
        asegurarAudioContext();
        audio.play().catch(() => { });
        reproduciendo = true;
        btnPlay.textContent = '⏸';
    }
    actualizarResaltadoLista();
    letrasCancionCambiada(nombreLimpio);
}

// Eventos de la barra de progreso
audio.addEventListener('timeupdate', () => {
    if (audio.duration) {
        actualizarWaveformProgreso(audio.currentTime / audio.duration);
        timeCurrent.textContent = formatearTiempo(audio.currentTime);
    }
});
audio.addEventListener('loadedmetadata', () => {
    timeTotal.textContent = formatearTiempo(audio.duration);
});

audio.addEventListener('ended', () => cargarCancion(1, true));

btnPlay.addEventListener('click', () => {
    if (reproduciendo) { audio.pause(); reproduciendo = false; btnPlay.textContent = '▶'; }
    else { asegurarAudioContext(); audio.play().catch(() => { }); reproduciendo = true; btnPlay.textContent = '⏸'; }
});
document.getElementById('btn-next').addEventListener('click', () => cargarCancion(1, reproduciendo));
document.getElementById('btn-prev').addEventListener('click', () => cargarCancion(-1, reproduciendo));

const btnShuffle = document.getElementById('btn-shuffle');
btnShuffle.addEventListener('click', () => {
    aleatorioActivo = !aleatorioActivo;
    btnShuffle.classList.toggle('active', aleatorioActivo);

    if (aleatorioActivo) {
        // Nuevo orden aleatorio completo (la canción actual también se
        // mezcla, no se mantiene fija) y arrancamos directo con una
        // canción al azar de ese nuevo orden.
        ordenReproduccion = mezclarArray(cancionesLista.map((_, i) => i));
        posicionActual = 0;
        indiceActual = ordenReproduccion[0];
        construirListaVisual();
        cargarCancion(0, true);
        return;
    } else {
        // Volver al orden original (secuencial)
        ordenReproduccion = cancionesLista.map((_, i) => i);
        posicionActual = indiceActual;
    }
    construirListaVisual();
    actualizarResaltadoLista();
});

// Cargar la primera canción
construirListaVisual();
cargarCancion(0, false);
inicializarLetras(audio, () => nombreLimpioDe(cancionesLista[indiceActual]));

export { cargarCancion };