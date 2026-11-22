"use strict";

function disposeSigilGeometry(object) {
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

function makeSigilReflections(renderer) {
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

async function loadSigilGLB(url, backup, signal) {
  const loader = new THREE.GLTFLoader();
  if (window.location.protocol !== "file:") {
    try {
      const response = await fetch(url, { signal });
      if (!response.ok) throw new Error("GLB model unavailable");
      return await loader.parseAsync(await response.arrayBuffer(), "");
    } catch (error) {
      if (signal.aborted || !backup) throw error;
    }
  }

  // Local HTML can load a classic script even when fetch() for file URLs is unavailable.
  const data = await new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = backup;
    script.onload = () => {
      const encoded = script.sigilModelData ?? globalThis.sigilModelData;
      if (script.sigilModelData === undefined) delete globalThis.sigilModelData;
      script.remove();
      try {
        if (typeof encoded !== "string") throw new Error("GLB backup unavailable");
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
      reject(new Error("GLB backup unavailable"));
    };
    document.head.append(script);
  });
  return loader.parseAsync(data, "");
}

(() => {
  const triggers = document.querySelectorAll("[data-sigil-trigger]");
  const preview = document.querySelector("[data-sigil-hover]");
  const viewer = document.getElementById("sigil-viewer");
  if (!triggers.length || !preview || typeof viewer?.showModal !== "function") return;

  const heroTrigger = document.querySelector(".heading-sigil");
  const hoverStart = document.querySelector("[data-sigil-hover-start]");
  const masthead = document.querySelector(".masthead");
  const footerTrigger = document.querySelector('[data-sigil-preview="footer"]');
  const outro = document.getElementById("interview-outro");
  const stage = viewer.querySelector("[data-sigil-stage]");
  const close = viewer.querySelector("[data-sigil-close]");
  const status = viewer.querySelector("[data-sigil-status]");
  const canvas = stage.querySelector("[data-sigil-canvas]");
  const fallbackCanvas = stage.querySelector("[data-sigil-fallback]");
  const poster = stage.querySelector("img");
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

  const models = new Map();
  let activeTrigger, mounted, renderer, reflections, software;
  let webGLUnavailable = false;
  let softwareUnavailable = false;
  let contextLost = false;
  let frame = 0;
  let previous = 0;
  let hovering = false;
  let pointer, hoverCursor;
  let softwareStamp = -Infinity;

  function prepareModel(model) {
    const materialMetalness = new Map();
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

    // Both Tripo sigils are flat in the YZ plane.
    const facing = new THREE.Group();
    facing.rotation.y = -Math.PI / 2;
    facing.scale.setScalar(1 / Math.sqrt(radiusSquared));
    model.position.sub(center);
    facing.add(model);
    return { facing, materialMetalness };
  }

  function applyMaterialLighting() {
    if (!mounted) return;
    for (const [material, metalness] of mounted.materialMetalness) {
      material.metalness = reflections ? metalness : Math.min(metalness, .3);
      material.needsUpdate = true;
    }
  }

  function lightModel() {
    reflections?.dispose();
    reflections = null;
    scene.environment = null;
    if (renderer.extensions.has("EXT_color_buffer_float")) {
      try {
        reflections = makeSigilReflections(renderer);
        scene.environment = reflections.texture;
        scene.environmentIntensity = .95;
      } catch {
        // Keep the model lit by direct lights if the renderer cannot build the reflection map.
        renderer.setRenderTarget(null);
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.autoClear = true;
      }
    }
    applyMaterialLighting();
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
    const modelReady = mounted && (canRenderWebGL() || !softwareUnavailable);
    if (modelReady && isShowing() && !document.hidden && !frame && !signal.aborted) {
      frame = requestAnimationFrame(draw);
    }
  }

  function showError() {
    delete stage.dataset.live;
    delete activeTrigger.dataset.sigilPreviewing;
    status.textContent = "Не удалось открыть модель.";
    status.hidden = false;
  }

  function showFrame(mode) {
    if (stage.dataset.live !== mode) stage.dataset.live = mode;
    if (hovering && !activeTrigger.hasAttribute("data-sigil-previewing")) activeTrigger.dataset.sigilPreviewing = "";
    if (!status.hidden) status.hidden = true;
  }

  function canRenderWebGL() {
    return renderer && !contextLost && !webGLUnavailable;
  }

  function drawModel() {
    if (!mounted || !canRenderWebGL()) return false;
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
    if (!mounted || softwareUnavailable) return false;
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
    if (!isShowing() || !mounted) return;
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

  function dispose() {
    if (signal.aborted) return;
    events.abort();
    stop();
    software = undefined;
    delete stage.dataset.live;
    if (activeTrigger) delete activeTrigger.dataset.sigilPreviewing;
    size.disconnect();
    for (const pending of models.values()) {
      void pending.then(({ facing }) => disposeSigilGeometry(facing), () => {});
    }
    models.clear();
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
    if (!isShowing() || mounted || signal.aborted) return;
    if (!scene) { showError(); return; }
    const trigger = activeTrigger;
    const { sigilModel, sigilBackup } = trigger.dataset;
    const pending = models.get(trigger) ?? loadSigilGLB(sigilModel, sigilBackup, signal).then(({ scene: model }) => {
      try {
        return prepareModel(model);
      } catch (error) {
        disposeSigilGeometry(model);
        throw error;
      }
    });
    models.set(trigger, pending);
    let next;
    try {
      next = await pending;
    } catch (error) {
      if (models.get(trigger) === pending) models.delete(trigger);
      if (signal.aborted || activeTrigger !== trigger || !isShowing()) return;
      console.warn("Не удалось загрузить 3D-сигил.", error);
      showError();
      return;
    }
    if (signal.aborted || activeTrigger !== trigger || !isShowing() || mounted) return;
    mounted = next;
    turntable.add(mounted.facing);
    applyMaterialLighting();
    resize();
    schedule();
  }

  function measureHeroHover() {
    if (!heroTrigger || !hoverStart || signal.aborted) return;
    const bounds = heroTrigger.getBoundingClientRect();
    const left = hoverStart.getBoundingClientRect().right - bounds.left;
    const right = bounds.right - document.documentElement.clientWidth;
    heroTrigger.style.setProperty("--sigil-hover-start", `${left}px`);
    heroTrigger.style.setProperty("--sigil-hover-end", `${right}px`);
  }

  const size = new ResizeObserver(() => {
    resize();
    measureHeroHover();
  });
  size.observe(stage);
  if (heroTrigger && hoverStart) {
    measureHeroHover();
    size.observe(heroTrigger.parentElement);
    document.fonts?.ready.then(measureHeroHover);
  }

  function hidePreview() {
    if (!hovering) return;
    hovering = false;
    preview.hidden = true;
    viewer.insertBefore(stage, status);
    stage.tabIndex = 0;
    delete activeTrigger.dataset.sigilPreviewing;
    stop();
  }

  function activate(trigger) {
    if (activeTrigger === trigger) return;
    hidePreview();
    mounted?.facing.removeFromParent();
    mounted = undefined;
    software = undefined;
    softwareUnavailable = false;
    delete stage.dataset.live;
    activeTrigger = trigger;
    poster.src = trigger.querySelector("img").src;
  }

  function followCursor(event) {
    hoverCursor = { x: event.clientX, y: event.clientY };
    preview.style.setProperty("--sigil-cursor-x", `${event.clientX}px`);
    preview.style.setProperty("--sigil-cursor-y", `${event.clientY}px`);
  }

  function hoverTriggerAt(x, y) {
    const { clientWidth, clientHeight } = document.documentElement;
    const headerBottom = masthead?.getBoundingClientRect().bottom ?? 0;
    if (x < 0 || x >= clientWidth || y < Math.max(0, headerBottom) || y >= clientHeight) return;

    if (heroTrigger && hoverStart) {
      const { width, bottom, height } = heroTrigger.getBoundingClientRect();
      if (width && bottom > headerBottom && y < bottom + height * .065
        && x >= hoverStart.getBoundingClientRect().right) return heroTrigger;
    }

    if (footerTrigger) {
      const { left, right, top } = footerTrigger.getBoundingClientRect();
      const sidePadding = 24;
      const hoverTop = outro ? outro.getBoundingClientRect().bottom + 50 : top - 50;
      if (x >= left - sidePadding && x < right + sidePadding && y < footerTrigger.parentElement.getBoundingClientRect().bottom
        && y >= hoverTop) return footerTrigger;
    }
  }

  function canPreview(event) {
    return !viewer.open && (event.pointerType === "mouse" || event.pointerType === "pen");
  }

  function showPreview(trigger, event) {
    followCursor(event);
    if (hovering && activeTrigger === trigger) return;
    activate(trigger);
    hovering = true;
    preview.toggleAttribute("data-compact", trigger.dataset.sigilPreview === "footer");
    preview.hidden = false;
    stage.tabIndex = -1;
    preview.append(stage);
    turntable?.rotation.set(.09, 0, -.14);
    resize();
    void start();
    schedule();
  }

  function checkHover() {
    if (!hovering) return;
    const { x, y } = hoverCursor;
    if (hoverTriggerAt(x, y) !== activeTrigger) hidePreview();
  }

  for (const trigger of triggers) {
    trigger.addEventListener("pointerenter", event => {
      if (canPreview(event) && hoverTriggerAt(event.clientX, event.clientY) === trigger) showPreview(trigger, event);
    }, { signal });
    trigger.addEventListener("pointerleave", event => {
      if (activeTrigger === trigger && hoverTriggerAt(event.clientX, event.clientY) !== trigger) hidePreview();
    }, { signal });
    trigger.addEventListener("click", () => {
      if (viewer.open) return;
      hidePreview();
      activate(trigger);
      viewer.showModal();
      close.focus({ preventScroll: true });
      turntable?.rotation.set(.09, 0, -.14);
      status.textContent = "Загрузка модели…";
      status.hidden = Boolean(stage.dataset.live);
      resize();
      void start();
      schedule();
    }, { signal });
  }
  window.addEventListener("pointermove", event => {
    if (!canPreview(event)) return;
    const trigger = hoverTriggerAt(event.clientX, event.clientY);
    if (trigger) showPreview(trigger, event);
    else hidePreview();
  }, { passive: true, signal });
  document.documentElement.addEventListener("pointerleave", hidePreview, { signal });
  window.addEventListener("blur", hidePreview, { signal });
  window.addEventListener("scroll", checkHover, { passive: true, signal });
  window.addEventListener("resize", () => {
    measureHeroHover();
    checkHover();
  }, { signal });

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

  close.addEventListener("click", () => viewer.close(), { signal });
  viewer.addEventListener("click", event => {
    if (event.target === viewer) viewer.close();
  }, { signal });
  viewer.addEventListener("close", () => {
    if (viewer.open) return;
    pointer = undefined;
    delete stage.dataset.dragging;
    stop();
    activeTrigger?.focus({ preventScroll: true });
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
      if (canRenderWebGL()) {
        lightModel();
        resize();
      }
      if (isShowing() && !mounted) void start();
    });
  }, { signal });
  document.addEventListener("visibilitychange", () => document.hidden ? stop() : schedule(), { signal });
  window.addEventListener("pagehide", event => { if (event.persisted) stop(); else dispose(); }, { signal });
  window.addEventListener("pageshow", schedule, { signal });
})();
