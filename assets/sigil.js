"use strict";

(() => {
  const trigger = document.querySelector("[data-sigil-trigger]");
  const viewer = document.getElementById("sigil-viewer");
  if (!trigger || typeof viewer?.showModal !== "function") return;

  const stage = viewer.querySelector("[data-sigil-stage]");
  const close = viewer.querySelector("[data-sigil-close]");
  const status = viewer.querySelector("[data-sigil-status]");
  const canvas = stage.querySelector("[data-sigil-canvas]");
  const fallbackCanvas = stage.querySelector("[data-sigil-fallback]");
  const frameColumns = 12, frameRows = 10;
  const revolution = 2 * Math.PI;
  const frameAngle = revolution / (frameColumns * frameRows);
  const motion = matchMedia("(prefers-reduced-motion: reduce)");
  const events = new AbortController();
  const { signal } = events;
  let scene, camera, turntable;
  if (typeof THREE !== "undefined" && THREE.GLTFLoader) {
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(32, 1, .1, 20);
    turntable = new THREE.Group();
    const key = new THREE.DirectionalLight(0xffffff, 1.55);
    const fill = new THREE.DirectionalLight(0xdce7ff, .95);
    key.position.set(-3, 4, 5);
    fill.position.set(4, -2, 3);
    scene.add(turntable, key, fill);
  }

  let renderer, model, reflections, software, fallback;
  const materialMetalness = new Map();
  let loading = false;
  let loadingFrames = false;
  let webGLUnavailable = false;
  let softwareUnavailable = false;
  let contextLost = false;
  let ready = false;
  let frame = 0;
  let previous = 0;
  let angle = 0;
  let tilt = .09;
  let automatic = true;
  let pointer;
  let softwareStamp = -Infinity;

  function makeReflections() {
    const studio = new THREE.Scene();
    studio.background = new THREE.Color().setRGB(.072, .072, .072);
    const softboxes = [
      { position: [-3, 4.9, 5.8], size: [5, 4], intensity: 4.4 },
      { position: [2.4, 2.5, 5.8], size: [1, 5.6], intensity: 4.2 },
      { position: [4.4, -.1, 3], size: [2.5, 5], intensity: 1.15 },
      { position: [-3.9, -2.1, 1.4], size: [2.5, 3.4], intensity: 1.8 },
      { position: [1.9, -4.2, -1.3], size: [4.2, 2.6], intensity: 2.8 },
      { position: [1.2, -2.8, 5], size: [4.2, 2.2], intensity: .45 },
    ];
    const panelGeometry = new THREE.BoxGeometry();
    for (const { position, size, intensity } of softboxes) {
      const color = new THREE.Color().setRGB(intensity, intensity, intensity);
      const material = new THREE.MeshBasicMaterial({ color, toneMapped: false });
      const panel = new THREE.Mesh(panelGeometry, material);
      panel.position.set(...position);
      panel.scale.set(...size, .04);
      panel.lookAt(0, 0, 0);
      studio.add(panel);
    }

    const filter = new THREE.PMREMGenerator(renderer);
    try {
      return filter.fromScene(studio, .045, .1, 32);
    } finally {
      filter.dispose();
      panelGeometry.dispose();
      for (const panel of studio.children) panel.material.dispose();
    }
  }

  function mountModel() {
    const center = new THREE.Box3().setFromObject(model).getCenter(new THREE.Vector3());
    const vertex = new THREE.Vector3();
    let radiusSquared = 0;
    model.traverse(mesh => {
      if (!mesh.isMesh) return;
      materialMetalness.set(mesh.material, mesh.material.metalness);
      const positions = mesh.geometry.getAttribute("position");
      for (let index = 0; index < positions.count; index++) {
        vertex.fromBufferAttribute(positions, index).applyMatrix4(mesh.matrixWorld);
        radiusSquared = Math.max(radiusSquared, vertex.distanceToSquared(center));
      }
    });

    // Tripo exported this sigil flat in the YZ plane.
    const facing = new THREE.Group();
    facing.rotation.y = -Math.PI / 2;
    facing.scale.setScalar(1 / Math.sqrt(radiusSquared));
    model.position.sub(center);
    facing.add(model);
    turntable.add(facing);
  }

  function lightModel() {
    reflections?.dispose();
    reflections = null;
    scene.environment = null;
    if (renderer.extensions.has("EXT_color_buffer_float")) {
      try {
        reflections = makeReflections();
        scene.environment = reflections.texture;
        scene.environmentIntensity = .95;
      } catch {
        // Keep the model lit by direct lights if the renderer cannot build the reflection map.
        renderer.setRenderTarget(null);
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.autoClear = true;
      }
    }
    for (const [material, metalness] of materialMetalness) {
      material.metalness = reflections ? metalness : Math.min(metalness, .3);
      material.needsUpdate = true;
    }
  }

  function stop() {
    if (frame) cancelAnimationFrame(frame);
    frame = 0;
    previous = 0;
  }

  function schedule() {
    const modelReady = ready && (canRenderWebGL() || !softwareUnavailable);
    if ((modelReady || fallback) && viewer.open && !document.hidden && !frame && !signal.aborted) {
      frame = requestAnimationFrame(draw);
    }
  }

  async function loadFrames() {
    if (fallback || loadingFrames || signal.aborted || !viewer.open) return;
    loadingFrames = true;
    try {
      const context = fallbackCanvas.getContext("2d");
      if (!context) throw new Error("Canvas 2D unavailable");
      const image = new Image();
      image.src = stage.dataset.sigilFrames;
      await image.decode();
      if (signal.aborted) return;
      fallback = { context, image, tile: image.naturalWidth / frameColumns, index: -1 };
      schedule();
    } catch (error) {
      if (signal.aborted) return;
      console.warn("Не удалось загрузить анимацию сигила.", error);
      status.textContent = "Не удалось загрузить модель.";
      status.hidden = false;
    } finally {
      loadingFrames = false;
    }
  }

  function showFrame(mode) {
    stage.dataset.live = mode;
    status.hidden = true;
  }

  function canRenderWebGL() {
    return renderer && !contextLost && !webGLUnavailable;
  }

  function drawModel() {
    if (!ready || !canRenderWebGL()) return false;
    try {
      renderer.render(scene, camera);
      if (stage.dataset.live !== "model") showFrame("model");
      return true;
    } catch (error) {
      webGLUnavailable = true;
      delete stage.dataset.live;
      console.warn("Не удалось отрисовать 3D-сигил.", error);
      return false;
    }
  }

  function drawSoftware(stamp, spinning) {
    if (!ready || softwareUnavailable) return false;
    if (spinning && stage.dataset.live === "software" && stamp - softwareStamp < 32) return true;
    try {
      software ??= createSoftwareSigil(fallbackCanvas, turntable);
      turntable.updateMatrix();
      software.draw(turntable.matrix.elements, stage.clientWidth);
      softwareStamp = stamp;
      if (stage.dataset.live !== "software") showFrame("software");
      return true;
    } catch (error) {
      softwareUnavailable = true;
      if (fallback) fallback.index = -1;
      delete stage.dataset.live;
      console.warn("Не удалось отрисовать сигил через Canvas.", error);
      void loadFrames();
      return false;
    }
  }

  function drawFrames() {
    const { context, image, tile } = fallback;
    const index = Math.round(angle / frameAngle) % (frameColumns * frameRows);
    if (fallback.index !== index) {
      const { width, height } = fallbackCanvas;
      context.clearRect(0, 0, width, height);
      context.drawImage(image, (index % frameColumns) * tile, Math.floor(index / frameColumns) * tile, tile, tile,
        0, 0, width, height);
      fallback.index = index;
    }
    if (stage.dataset.live !== "frames") showFrame("frames");
  }

  function draw(stamp) {
    frame = 0;
    if (!viewer.open || document.hidden || signal.aborted) return;
    const spinning = automatic && !motion.matches;
    if (spinning && previous) {
      const dt = Math.min(.05, (stamp - previous) / 1000);
      angle = (angle + .65 * dt) % revolution;
    }
    previous = spinning ? stamp : 0;
    if (ready) turntable.rotation.set(tilt + (spinning ? .12 * Math.sin(angle) : 0), angle, -.14);
    if (!drawModel() && !drawSoftware(stamp, spinning) && fallback) drawFrames();
    if (spinning) schedule();
  }

  function resize() {
    if (!viewer.open || !ready) return;
    if (!canRenderWebGL()) { schedule(); return; }
    const { clientWidth: width, clientHeight: height } = canvas;
    if (!width || !height) return;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2, 1600 / Math.max(width, height)));
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.position.z = 4.15 / Math.min(1, camera.aspect);
    camera.updateProjectionMatrix();
    schedule();
  }

  function disposeModel(object) {
    object?.traverse(mesh => {
      if (!mesh.isMesh) return;
      mesh.geometry.dispose();
      const textures = new Set(Object.values(mesh.material).filter(value => value?.isTexture));
      for (const texture of textures) {
        texture.image?.close?.();
        texture.dispose();
      }
      mesh.material.dispose();
    });
  }

  function dispose() {
    if (signal.aborted) return;
    events.abort();
    stop();
    ready = false;
    software = undefined;
    fallback = undefined;
    delete stage.dataset.live;
    size.disconnect();
    disposeModel(model);
    reflections?.dispose();
    renderer?.dispose();
  }

  function initRenderer() {
    try {
      const context = canvas.getContext("webgl2", { alpha: true, antialias: true })
        || canvas.getContext("webgl2", { alpha: true, antialias: false });
      if (!context) { webGLUnavailable = true; return; }
      renderer = new THREE.WebGLRenderer({ canvas, context, alpha: true });
      renderer.debug.onShaderError = (gl, program) => {
        throw new Error(gl.getProgramInfoLog(program) || "Не удалось скомпилировать шейдер сигила.");
      };
      renderer.setClearColor(0x000000, 0);
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.13;
      renderer.outputColorSpace = THREE.SRGBColorSpace;
    } catch (error) {
      webGLUnavailable = true;
      console.warn("Не удалось запустить WebGL для сигила.", error);
    }
  }

  async function start() {
    if (!viewer.open || loading || signal.aborted) return;
    if (!scene || window.location.protocol === "file:") { void loadFrames(); return; }
    if (ready) {
      if (!canRenderWebGL() && softwareUnavailable) void loadFrames();
      return;
    }
    loading = true;
    try {
      if (!renderer && !contextLost && !webGLUnavailable) initRenderer();
      const response = await fetch(stage.dataset.sigilModel, { signal });
      if (!response.ok) throw new Error("Sigil model unavailable");
      const data = await response.arrayBuffer();
      const loaded = await new THREE.GLTFLoader().parseAsync(data, "");
      if (signal.aborted) { disposeModel(loaded.scene); return; }
      model = loaded.scene;
      mountModel();

      ready = true;
      if (canRenderWebGL()) lightModel();
      resize();
      schedule();
    } catch (error) {
      if (signal.aborted) return;
      if (!ready) {
        disposeModel(model);
        model?.removeFromParent();
        model = undefined;
        materialMetalness.clear();
      }
      console.warn("Не удалось загрузить 3D-сигил.", error);
      void loadFrames();
    } finally {
      loading = false;
    }
  }

  const size = new ResizeObserver(resize);
  size.observe(stage);

  function pauseRotation() {
    if (automatic && !motion.matches) tilt += .12 * Math.sin(angle);
    automatic = false;
  }

  function rotate(yaw, pitch) {
    pauseRotation();
    angle = ((angle + yaw) % revolution + revolution) % revolution;
    tilt = Math.max(-1.2, Math.min(1.2, tilt + pitch));
    schedule();
  }

  stage.addEventListener("pointerdown", event => {
    if (pointer || event.button !== 0 || event.isPrimary === false) return;
    pauseRotation();
    pointer = { id: event.pointerId, x: event.clientX, y: event.clientY };
    stage.dataset.dragging = "";
    stage.setPointerCapture(event.pointerId);
  }, { signal });
  stage.addEventListener("pointermove", event => {
    if (pointer?.id !== event.pointerId) return;
    const sensitivity = revolution / Math.max(300, stage.clientWidth);
    rotate((event.clientX - pointer.x) * sensitivity, (event.clientY - pointer.y) * sensitivity);
    pointer.x = event.clientX;
    pointer.y = event.clientY;
  }, { signal });
  for (const eventName of ["pointerup", "pointercancel", "lostpointercapture"]) {
    stage.addEventListener(eventName, event => {
      if (pointer?.id !== event.pointerId) return;
      pointer = undefined;
      delete stage.dataset.dragging;
    }, { signal });
  }
  stage.addEventListener("keydown", event => {
    const steps = { ArrowLeft: [-.18, 0], ArrowRight: [.18, 0], ArrowUp: [0, -.18], ArrowDown: [0, .18] };
    if (!Object.hasOwn(steps, event.key)) return;
    event.preventDefault();
    rotate(...steps[event.key]);
  }, { signal });

  trigger.addEventListener("click", () => {
    if (viewer.open) return;
    viewer.showModal();
    close.focus({ preventScroll: true });
    angle = 0;
    tilt = .09;
    automatic = true;
    status.textContent = "Загрузка модели…";
    status.hidden = Boolean(stage.dataset.live);
    resize();
    void start();
    schedule();
  }, { signal });
  close.addEventListener("click", () => viewer.close(), { signal });
  viewer.addEventListener("click", event => {
    if (event.target === viewer) viewer.close();
  }, { signal });
  viewer.addEventListener("close", () => {
    if (viewer.open) return;
    pointer = undefined;
    delete stage.dataset.dragging;
    stop();
    trigger.focus({ preventScroll: true });
  }, { signal });
  motion.addEventListener("change", schedule, { signal });
  canvas.addEventListener("webglcontextlost", event => {
    event.preventDefault();
    contextLost = true;
    if (stage.dataset.live === "model") delete stage.dataset.live;
    stop();
    if (softwareUnavailable) void loadFrames();
    schedule();
  }, { signal });
  canvas.addEventListener("webglcontextrestored", () => {
    contextLost = false;
    webGLUnavailable = false;
    requestAnimationFrame(() => {
      if (signal.aborted || contextLost) return;
      if (ready && canRenderWebGL()) {
        lightModel();
        resize();
      } else if (viewer.open) {
        void start();
      }
    });
  }, { signal });
  document.addEventListener("visibilitychange", () => document.hidden ? stop() : schedule(), { signal });
  window.addEventListener("pagehide", event => { if (event.persisted) stop(); else dispose(); }, { signal });
  window.addEventListener("pageshow", schedule, { signal });
})();
