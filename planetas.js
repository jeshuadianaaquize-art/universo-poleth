// ── MÓDULO DE PORTALES DE PLANETAS (zoom + video) ─────────────────────────
// Toda la lógica de "entrar" a un planeta vive aquí para no inflar el
// index.html: detección de cercanía (solo se puede hacer click si la
// cámara está razonablemente cerca, para no generar falsos clics desde
// lejos), distinguir click real de arrastre de OrbitControls, la animación
// de acercamiento de cámara, el destello de transición y el reproductor de
// video a pantalla completa.
//
// Se importa como módulo ES desde index.html con:
//   import { crearPortalesPlanetas } from './planetas.js';
//
// Uso típico dentro de index.html:
//
//   const portales = crearPortalesPlanetas({ THREE, camera, controls, renderer });
//   portales.registrarPlaneta({
//       mesh: earthMesh,
//       nombre: 'Tierra',
//       radio: 28,
//       video: './videos/tierra.mp4',
//       distanciaActivacion: 28 * 9   // qué tan cerca hay que estar para poder hacer click
//   });
//   portales.registrarPlaneta({
//       mesh: pMesh,
//       nombre: 'Poleth',
//       radio: 30,
//       video: './videos/poleth.mp4',
//       distanciaActivacion: 30 * 9
//   });
//
//   // dentro de animate(), en cada frame:
//   portales.actualizar();

export function crearPortalesPlanetas({ THREE, camera, controls, renderer }) {

    // ── ESTILOS (inyectados desde JS para no tocar el <style> del index) ──
    const estilo = document.createElement('style');
    estilo.textContent = `
        #portal-hint {
            position: fixed;
            transform: translate(-50%, -140%);
            padding: 5px 12px;
            border-radius: 20px;
            background: rgba(0, 10, 20, 0.32);
            border: 1px solid rgba(0, 229, 255, 0.5);
            color: #d8f9ff;
            font-family: 'Segoe UI', sans-serif;
            font-size: 0.72rem;
            letter-spacing: 0.5px;
            white-space: nowrap;
            pointer-events: none;
            box-shadow: 0 0 10px rgba(0, 229, 255, 0.25);
            opacity: 0;
            transition: opacity 0.25s ease;
            z-index: 500;
        }
        #portal-hint.visible { opacity: 1; }
        #portal-hint .punto {
            display: inline-block;
            width: 5px; height: 5px;
            border-radius: 50%;
            background: #00e5ff;
            margin-right: 6px;
            box-shadow: 0 0 6px #00e5ff;
            animation: portal-pulso 1.4s ease-in-out infinite;
        }
        @keyframes portal-pulso {
            0%, 100% { transform: scale(1); opacity: 1; }
            50% { transform: scale(1.6); opacity: 0.5; }
        }

        /* ── VERSIÓN MÓVIL: cartel más chico ── */
        @media (pointer: coarse), (max-width: 768px) {
            #portal-hint {
                padding: 3px 9px;
                font-size: 0.58rem;
                letter-spacing: 0.3px;
            }
            #portal-hint .punto {
                width: 4px; height: 4px;
                margin-right: 4px;
            }
        }

        #portal-flash {
            position: fixed; inset: 0;
            background: radial-gradient(ellipse at center, #ffffff 0%, #bfefff 35%, #003a55 100%);
            opacity: 0;
            pointer-events: none;
            /* Por debajo del #music-bar (z-index 100): así el reproductor
               (botones, aleatorio, letra de la canción, panel de letras)
               se sigue viendo ENCIMA durante toda la transición y el video. */
            z-index: 95;
        }

        #portal-video-overlay {
            position: fixed; inset: 0;
            z-index: 90;
            display: none;
            align-items: center;
            justify-content: center;
            background: #000;
            opacity: 0;
            transition: opacity 0.7s ease;
        }
        #portal-video-overlay video {
            width: 100%; height: 100%;
            /* "contain" en vez de "cover": se ve el video COMPLETO tal cual
               es (sin recortar bordes). Si su proporción no coincide con la
               pantalla, quedan franjas negras arriba/abajo o a los lados
               en vez de perder partes de la imagen. */
            object-fit: contain;
        }
        #portal-video-overlay .portal-error {
            position: absolute;
            top: 50%; left: 50%;
            transform: translate(-50%, -50%);
            color: #ffb3b3;
            font-family: 'Segoe UI', sans-serif;
            font-size: 0.95rem;
            text-align: center;
            max-width: 80%;
            display: none;
        }
        #portal-cerrar-btn {
            position: absolute;
            /* Pegado del todo arriba y chico: solo queda este botón (se
               quitó el título "Tierra/Poleth") para no saturar la parte
               de arriba, donde también viven las letras de la canción. */
            top: 10px;
            left: 50%;
            transform: translateX(-50%);
            padding: 6px 16px;
            border-radius: 30px;
            border: 1px solid rgba(0, 229, 255, 0.7);
            background: rgba(0, 10, 20, 0.55);
            color: #d8f9ff;
            font-family: 'Segoe UI', sans-serif;
            font-size: 0.75rem;
            letter-spacing: 1.5px;
            cursor: pointer;
            backdrop-filter: blur(3px);
        }
        #portal-cerrar-btn:hover {
            background: rgba(0, 229, 255, 0.2);
        }

        /* ── VERSIÓN MÓVIL: botón todavía más chico ── */
        @media (pointer: coarse), (max-width: 768px) {
            #portal-cerrar-btn {
                top: 8px;
                padding: 4px 12px;
                font-size: 0.62rem;
                letter-spacing: 1px;
            }
        }
    `;
    document.head.appendChild(estilo);

    // ── ELEMENTOS DOM ────────────────────────────────────────────────────
    const hintEl = document.createElement('div');
    hintEl.id = 'portal-hint';
    hintEl.innerHTML = `<span class="punto"></span><span id="portal-hint-texto">Click para explorar</span>`;
    document.body.appendChild(hintEl);
    const hintTexto = hintEl.querySelector('#portal-hint-texto');

    const flashEl = document.createElement('div');
    flashEl.id = 'portal-flash';
    document.body.appendChild(flashEl);

    const videoOverlayEl = document.createElement('div');
    videoOverlayEl.id = 'portal-video-overlay';
    videoOverlayEl.innerHTML = `
        <video id="portal-video" playsinline muted preload="auto"></video>
        <div class="portal-error" id="portal-error-texto"></div>
        <button id="portal-cerrar-btn">✕ Volver al universo</button>
    `;
    document.body.appendChild(videoOverlayEl);
    const videoEl = videoOverlayEl.querySelector('#portal-video');
    const errorEl = videoOverlayEl.querySelector('#portal-error-texto');
    const cerrarBtn = videoOverlayEl.querySelector('#portal-cerrar-btn');

    // Sin audio: son videos de timelapse/paisaje, no necesitan sonido, y
    // así nos evitamos por completo el bloqueo de autoplay-con-sonido de
    // los navegadores.
    videoEl.muted = true;

    videoEl.addEventListener('error', () => {
        const codigo = videoEl.error ? videoEl.error.code : '?';
        errorEl.style.display = 'block';
        errorEl.textContent = `No se pudo reproducir "${videoEl.src.split('/').pop()}" (código de error ${codigo}). ` +
            `Revisa que el archivo exista en esa ruta y que sea un .mp4 válido (H.264).`;
        console.error('[portal-video] Error al cargar/reproducir', videoEl.src, videoEl.error);
    });

    // ── ESTADO ───────────────────────────────────────────────────────────
    const planetas = [];       // { mesh, nombre, radio, video, distanciaActivacion }
    const raycaster = new THREE.Raycaster();
    // La Tierra vive en la "capa de luz" 1 (para que solo la ilumine el sol
    // real) y el raycaster por defecto SOLO revisa la capa 0 — sin esto,
    // el click en la Tierra nunca se detectaba.
    raycaster.layers.enableAll();
    const mouseNDC = new THREE.Vector2();
    const _centro = new THREE.Vector3();
    const _pantalla = new THREE.Vector3();

    let planetaCercano = null;   // el planeta activable en este momento (o null)
    let enTransicion = false;    // bloquea nuevos clicks mientras se anima
    let musicaEstabaSonando = null; // por si luego se quiere pausar/reanudar música

    // Para distinguir click real de arrastre de cámara (OrbitControls usa
    // el mismo botón para rotar la escena, así que un click con movimiento
    // no debe contar como click).
    let pDownX = 0, pDownY = 0;

    function registrarPlaneta({ mesh, nombre, radio, video, distanciaActivacion }) {
        planetas.push({
            mesh,
            nombre,
            radio,
            video,
            distanciaActivacion: distanciaActivacion || radio * 30
        });
    }

    // ── DETECCIÓN DE CERCANÍA (llamado una vez por frame desde animate) ──
    function actualizar() {
        if (enTransicion) return;

        let candidato = null;
        let distMin = Infinity;

        for (const p of planetas) {
            p.mesh.getWorldPosition(_centro);
            const d = camera.position.distanceTo(_centro);
            if (d <= p.distanciaActivacion && d < distMin) {
                distMin = d;
                candidato = p;
            }
        }

        planetaCercano = candidato;

        if (!planetaCercano) {
            hintEl.classList.remove('visible');
            renderer.domElement.style.cursor = 'default';
            return;
        }

        // Proyectar el centro del planeta a coordenadas de pantalla para
        // colocar el globito "Click para explorar" justo encima de él.
        planetaCercano.mesh.getWorldPosition(_centro);
        _pantalla.copy(_centro).project(camera);

        // Si el planeta quedó detrás de la cámara, no mostramos el hint.
        if (_pantalla.z > 1) {
            hintEl.classList.remove('visible');
            renderer.domElement.style.cursor = 'default';
            return;
        }

        const x = (_pantalla.x * 0.5 + 0.5) * window.innerWidth;
        const y = (-_pantalla.y * 0.5 + 0.5) * window.innerHeight;
        hintEl.style.left = `${x}px`;
        hintEl.style.top = `${y}px`;
        hintTexto.textContent = `Click para entrar a ${planetaCercano.nombre}`;
        hintEl.classList.add('visible');
        renderer.domElement.style.cursor = 'pointer';
    }

    // ── DETECCIÓN DE CLICK (no arrastre) SOBRE EL PLANETA CERCANO ────────
    renderer.domElement.addEventListener('pointerdown', (e) => {
        pDownX = e.clientX; pDownY = e.clientY;
    });

    renderer.domElement.addEventListener('pointerup', (e) => {
        if (enTransicion || !planetaCercano) return;

        // Si el mouse se movió más de unos pocos píxeles, fue un arrastre
        // para rotar la cámara (OrbitControls), no un click real.
        const movimiento = Math.hypot(e.clientX - pDownX, e.clientY - pDownY);
        if (movimiento > 6) return;

        mouseNDC.x = (e.clientX / window.innerWidth) * 2 - 1;
        mouseNDC.y = -(e.clientY / window.innerHeight) * 2 + 1;
        raycaster.setFromCamera(mouseNDC, camera);

        const hit = raycaster.intersectObject(planetaCercano.mesh, false);
        if (hit.length > 0) {
            activarPortal(planetaCercano);
        }
    });

    // ── SECUENCIA: ZOOM DE CÁMARA → DESTELLO → VIDEO ─────────────────────
    function activarPortal(target) {
        enTransicion = true;
        hintEl.classList.remove('visible');
        renderer.domElement.style.cursor = 'default';

        // Arrancamos a cargar el video YA (aunque todavía no se ve),
        // aprovechando los ~2.6s que dura el zoom + destello como tiempo
        // de precarga/buffer. Antes se empezaba a cargar recién al final
        // de esa animación, y el video arrancaba "en frío" — de ahí las
        // pausas/tirones de los primeros segundos.
        errorEl.style.display = 'none';
        errorEl.textContent = '';
        if (videoEl.src !== new URL(target.video, window.location.href).href) {
            videoEl.src = target.video;
            videoEl.load();
        }

        controls.enabled = false;
        const autoRotatePrevio = controls.autoRotate;
        controls.autoRotate = false;

        const posInicial = camera.position.clone();
        const targetInicial = controls.target.clone();

        const centroPlaneta = new THREE.Vector3();
        target.mesh.getWorldPosition(centroPlaneta);

        // Nos acercamos manteniendo la dirección actual de la cámara, para
        // que se sienta como "entrar" al planeta y no como un salto a otro
        // ángulo aleatorio.
        const direccion = new THREE.Vector3().subVectors(posInicial, centroPlaneta).normalize();
        const distanciaFinal = target.radio * 1.5;
        const posFinal = new THREE.Vector3().addVectors(centroPlaneta, direccion.multiplyScalar(distanciaFinal));

        const duracion = 2000; // ms
        const inicio = performance.now();

        function tickZoom(ahora) {
            const t = Math.min(1, (ahora - inicio) / duracion);
            const suave = 1 - Math.pow(1 - t, 3); // ease-out cúbico
            camera.position.lerpVectors(posInicial, posFinal, suave);
            controls.target.lerpVectors(targetInicial, centroPlaneta, suave);
            controls.update();

            if (t < 1) {
                requestAnimationFrame(tickZoom);
            } else {
                mostrarDestelloYVideo(target, posInicial, targetInicial, autoRotatePrevio);
            }
        }
        requestAnimationFrame(tickZoom);
    }

    function mostrarDestelloYVideo(target, posInicial, targetInicial, autoRotatePrevio) {
        // Fase 1: destello blanco/azulado, como si atravesáramos la
        // atmósfera del planeta.
        flashEl.style.transition = 'opacity 0.55s ease-in';
        flashEl.style.opacity = '1';

        setTimeout(() => {
            // Fase 2: mientras la pantalla sigue blanca, mostramos el video
            // (que ya lleva un par de segundos precargando desde el click).
            videoEl.currentTime = 0;
            videoEl.loop = true;
            videoOverlayEl.style.display = 'flex';
            // Avisa al módulo de letras (lyrics.js) que estamos dentro de
            // un planeta, para que baje su posición y no choque con el
            // botón de "Volver al universo" de aquí arriba.
            document.body.classList.add('portal-planeta-abierto');
            videoEl.play().catch((err) => {
                console.error('[portal-video] play() rechazado', err);
            });

            requestAnimationFrame(() => { videoOverlayEl.style.opacity = '1'; });

            // Fase 3: se retira el destello, revelando el video debajo.
            flashEl.style.transition = 'opacity 0.7s ease-out';
            flashEl.style.opacity = '0';

            // OJO: "enTransicion" se queda en true mientras el video está
            // abierto (recién se libera en cerrarPortal). Si se liberaba
            // aquí, actualizar() volvía a detectar el planeta como
            // "cercano" en cada frame (la cámara queda pegada a él) y el
            // globito de "Click para entrar" se re-mostraba ENCIMA del
            // video, tapando visualmente el botón de volver.
        }, 600);

        // Guardamos cómo volver, para el botón de cerrar.
        estadoRegreso = { posInicial, targetInicial, autoRotatePrevio };
    }

    let estadoRegreso = null;

    cerrarBtn.addEventListener('click', () => {
        if (!estadoRegreso) return;
        cerrarPortal(estadoRegreso);
        estadoRegreso = null;
    });

    function cerrarPortal({ posInicial, targetInicial, autoRotatePrevio }) {
        enTransicion = true;

        videoOverlayEl.style.opacity = '0';
        document.body.classList.remove('portal-planeta-abierto');
        setTimeout(() => {
            videoEl.pause();
            videoEl.removeAttribute('src');
            videoEl.load();
            videoOverlayEl.style.display = 'none';
            errorEl.style.display = 'none';
        }, 700);

        // Volvemos suavemente a la posición y el objetivo de cámara que
        // había antes de entrar al planeta.
        const posFinalRegreso = posInicial.clone();
        const targetFinalRegreso = targetInicial.clone();
        const posDesde = camera.position.clone();
        const targetDesde = controls.target.clone();

        const duracion = 1500;
        const inicio = performance.now();

        function tickRegreso(ahora) {
            const t = Math.min(1, (ahora - inicio) / duracion);
            const suave = 1 - Math.pow(1 - t, 3);
            camera.position.lerpVectors(posDesde, posFinalRegreso, suave);
            controls.target.lerpVectors(targetDesde, targetFinalRegreso, suave);
            controls.update();

            if (t < 1) {
                requestAnimationFrame(tickRegreso);
            } else {
                controls.enabled = true;
                controls.autoRotate = autoRotatePrevio;
                enTransicion = false;
            }
        }
        requestAnimationFrame(tickRegreso);
    }

    return { registrarPlaneta, actualizar };
}