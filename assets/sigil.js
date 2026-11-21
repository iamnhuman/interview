"use strict";

(() => {
  const trigger = document.querySelector("[data-sigil-trigger]");
  const preview = document.querySelector("[data-sigil-hover]");
  const viewer = document.getElementById("sigil-viewer");
  if (!trigger || !preview || typeof viewer?.showModal !== "function") return;

  const stage = viewer.querySelector("[data-sigil-stage]");
  const close = viewer.querySelector("[data-sigil-close]");
  const status = viewer.querySelector("[data-sigil-status]");
  const canvas = stage.querySelector("[data-sigil-canvas]");
  const fallbackCanvas = stage.querySelector("[data-sigil-fallback]");
  const events = new AbortController();
  const { signal } = events;
  let scene, camera, turntable, yawAxis, pitchAxis;
  if (typeof THREE !== "undefined" && THREE.GLTFLoader) {
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(32, 1, .1, 20);
    turntable = new THREE.Group();
    yawAxis = new THREE.Vector3(0, 1, 0);
    pitchAxis = new THREE.Vector3(1, 0, 0);
    const key = new THREE.DirectionalLight(0xffffff, 1.55);
    const fill = new THREE.DirectionalLight(0xdce7ff, .95);
    key.position.set(-3, 4, 5);
    fill.position.set(4, -2, 3);
    scene.add(turntable, key, fill);
  }

  let renderer, model, reflections, software;
  const materialMetalness = new Map();
  let loading = false;
  let webGLUnavailable = false;
  let softwareUnavailable = false;
  let contextLost = false;
  let ready = false;
  let frame = 0;
  let previous = 0;
  let hovering = false;
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
    softwareStamp = -Infinity;
  }

  function isShowing() {
    return hovering || viewer.open;
  }

  function schedule() {
    const modelReady = ready && (canRenderWebGL() || !softwareUnavailable);
    if (modelReady && isShowing() && !document.hidden && !frame && !signal.aborted) {
      frame = requestAnimationFrame(draw);
    }
  }

  function showError() {
    delete stage.dataset.live;
    delete trigger.dataset.sigilPreviewing;
    status.textContent = "Не удалось открыть модель.";
    status.hidden = false;
  }

  function showFrame(mode) {
    if (stage.dataset.live !== mode) stage.dataset.live = mode;
    if (hovering && !trigger.hasAttribute("data-sigil-previewing")) trigger.dataset.sigilPreviewing = "";
    if (!status.hidden) status.hidden = true;
  }

  function canRenderWebGL() {
    return renderer && !contextLost && !webGLUnavailable;
  }

  function drawModel() {
    if (!ready || !canRenderWebGL()) return false;
    try {
      renderer.render(scene, camera);
      showFrame("model");
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
      showFrame("software");
      return true;
    } catch (error) {
      softwareUnavailable = true;
      console.warn("Не удалось отрисовать сигил через Canvas.", error);
      showError();
      return false;
    }
  }

  function draw(stamp) {
    frame = 0;
    if (!isShowing() || document.hidden || signal.aborted) return;
    const spinning = !pointer;
    if (spinning) {
      const dt = previous ? Math.min(.05, (stamp - previous) / 1000) : 1 / 60;
      turntable.rotateOnWorldAxis(yawAxis, (hovering ? 3.2 : .82) * dt);
    }
    previous = spinning ? stamp : 0;
    if (!drawModel()) drawSoftware(stamp, spinning);
    if (spinning) schedule();
  }

  function resize() {
    if (!isShowing() || !ready) return;
    if (!renderer && !contextLost && !webGLUnavailable) {
      initRenderer();
      if (canRenderWebGL()) lightModel();
    }
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
    delete stage.dataset.live;
    delete trigger.dataset.sigilPreviewing;
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

  function loadBackup() {
    // A local HTML file can load scripts even when the browser blocks fetch() for file URLs.
    return new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = stage.dataset.sigilBackup;
      script.onload = () => {
        const encoded = globalThis.sigilModelData;
        delete globalThis.sigilModelData;
        script.remove();
        try {
          if (typeof encoded !== "string") throw new Error("Sigil backup unavailable");
          const bytes = atob(encoded);
          const data = new Uint8Array(bytes.length);
          for (let index = 0; index < bytes.length; index++) data[index] = bytes.charCodeAt(index);
          resolve(data.buffer);
        } catch (error) {
          reject(error);
        }
      };
      script.onerror = () => {
        script.remove();
        reject(new Error("Sigil backup unavailable"));
      };
      document.head.append(script);
    });
  }

  async function loadModel() {
    const loader = new THREE.GLTFLoader();
    if (window.location.protocol !== "file:") {
      try {
        const response = await fetch(stage.dataset.sigilModel, { signal });
        if (!response.ok) throw new Error("Sigil model unavailable");
        return await loader.parseAsync(await response.arrayBuffer(), "");
      } catch (error) {
        if (signal.aborted) throw error;
        console.warn("Не удалось загрузить основной GLB сигила.", error);
      }
    }
    return loader.parseAsync(await loadBackup(), "");
  }

  async function start() {
    if (!isShowing() || ready || loading || signal.aborted) return;
    if (!scene) { showError(); return; }
    loading = true;
    try {
      const loaded = await loadModel();
      if (signal.aborted) { disposeModel(loaded.scene); return; }
      model = loaded.scene;
      mountModel();

      ready = true;
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
      showError();
    } finally {
      loading = false;
    }
  }

  const size = new ResizeObserver(resize);
  size.observe(stage);

  function hidePreview() {
    if (!hovering) return;
    hovering = false;
    preview.hidden = true;
    viewer.insertBefore(stage, status);
    stage.tabIndex = 0;
    delete trigger.dataset.sigilPreviewing;
    stop();
  }

  function positionPreview() {
    if (!hovering) return;
    const bounds = trigger.getBoundingClientRect();
    const { innerWidth: width, innerHeight: height } = window;
    if (bounds.bottom <= 0 || bounds.top >= height) { hidePreview(); return; }
    const radius = preview.clientWidth / 2;
    const x = Math.max(radius, Math.min(width - radius, bounds.left + bounds.width / 2));
    const y = Math.max(radius, Math.min(height - radius, bounds.top + bounds.height / 2));
    preview.style.left = `${x}px`;
    preview.style.top = `${y}px`;
  }

  trigger.addEventListener("pointerenter", event => {
    if (viewer.open || (event.pointerType !== "mouse" && event.pointerType !== "pen")) return;
    hovering = true;
    preview.hidden = false;
    stage.tabIndex = -1;
    preview.append(stage);
    positionPreview();
    turntable?.rotation.set(.09, 0, -.14);
    resize();
    void start();
    schedule();
  }, { signal });
  trigger.addEventListener("pointerleave", hidePreview, { signal });
  window.addEventListener("scroll", positionPreview, { passive: true, signal });
  window.addEventListener("resize", positionPreview, { signal });

  function rotate(yaw, pitch) {
    if (!turntable) return;
    turntable.rotateOnWorldAxis(yawAxis, yaw);
    turntable.rotateOnWorldAxis(pitchAxis, pitch);
    schedule();
  }

  stage.addEventListener("pointerdown", event => {
    if (!viewer.open || pointer || event.button !== 0 || event.isPrimary === false) return;
    pointer = { id: event.pointerId, x: event.clientX, y: event.clientY };
    stage.dataset.dragging = "";
    stage.setPointerCapture(event.pointerId);
  }, { signal });
  stage.addEventListener("pointermove", event => {
    if (pointer?.id !== event.pointerId) return;
    const sensitivity = 2 * Math.PI / Math.max(300, stage.clientWidth);
    rotate((event.clientX - pointer.x) * sensitivity, (event.clientY - pointer.y) * sensitivity);
    pointer.x = event.clientX;
    pointer.y = event.clientY;
  }, { signal });
  for (const eventName of ["pointerup", "pointercancel", "lostpointercapture"]) {
    stage.addEventListener(eventName, event => {
      if (pointer?.id !== event.pointerId) return;
      pointer = undefined;
      delete stage.dataset.dragging;
      previous = 0;
      schedule();
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
    hidePreview();
    viewer.showModal();
    close.focus({ preventScroll: true });
    turntable?.rotation.set(.09, 0, -.14);
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
  canvas.addEventListener("webglcontextlost", event => {
    event.preventDefault();
    contextLost = true;
    if (stage.dataset.live === "model") delete stage.dataset.live;
    stop();
    if (softwareUnavailable) showError();
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
      } else if (isShowing()) {
        void start();
      }
    });
  }, { signal });
  document.addEventListener("visibilitychange", () => document.hidden ? stop() : schedule(), { signal });
  window.addEventListener("pagehide", event => { if (event.persisted) stop(); else dispose(); }, { signal });
  window.addEventListener("pageshow", schedule, { signal });
})();
