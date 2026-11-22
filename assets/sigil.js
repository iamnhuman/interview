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

function createSigilWave(facing, pinnedRadius = 0) {
  facing.updateMatrixWorld(true);
  const weights = [];
  const vertex = new THREE.Vector3();
  const normal = new THREE.Vector3();
  const delta = new THREE.Vector3();
  facing.traverse(mesh => {
    if (!mesh.isMesh) return;
    const { geometry, matrixWorld } = mesh;
    const positions = geometry.getAttribute("position");
    const normals = geometry.getAttribute("normal");
    const toSigil = matrixWorld.clone().setPosition(0, 0, 0);
    const toLocal = toSigil.clone().invert();
    const normalMatrix = toLocal.clone().transpose();
    const normalToLocal = toSigil.clone().transpose();
    const positionWaves = [new Float32Array(positions.count * 3), new Float32Array(positions.count * 3)];
    const normalWaves = [new Float32Array(positions.count * 3), new Float32Array(positions.count * 3)];

    for (let index = 0; index < positions.count; index++) {
      const { x, y } = vertex.fromBufferAttribute(positions, index).applyMatrix4(matrixWorld);
      const radius = Math.hypot(x, y);
      const inverseRadius = 1 / Math.max(.12, radius);
      const radialX = x * inverseRadius, radialY = y * inverseRadius;
      const phase = 3 * Math.atan2(y, x) + 1.8 * radius;
      const cosine = Math.cos(phase), sine = Math.sin(phase);
      const edge = pinnedRadius ? Math.min(1, Math.max(0, (radius - pinnedRadius) / .24)) : 1;
      const flex = Math.min(1, .35 + .72 * radius) * edge * edge * (3 - 2 * edge);
      const radial = .066 * flex, tangent = .034 * flex, depth = .12 * flex;
      const slopeX = 1.8 * radialX - 3 * radialY * inverseRadius;
      const slopeY = 1.8 * radialY + 3 * radialX * inverseRadius;
      const normalZ = normal.fromBufferAttribute(normals, index).applyMatrix4(normalMatrix).z;

      // Two morph targets carry the same wave a quarter-cycle apart.
      for (let target = 0; target < 2; target++) {
        const wave = target === 0 ? cosine : sine;
        const crest = target === 0 ? sine : -cosine;
        delta.set(radialX * radial * wave - radialY * tangent * crest,
          radialY * radial * wave + radialX * tangent * crest, depth * crest);
        delta.applyMatrix4(toLocal).toArray(positionWaves[target], index * 3);
        const slope = depth * wave * normalZ;
        delta.set(-slope * slopeX, -slope * slopeY, 0);
        delta.applyMatrix4(normalToLocal).toArray(normalWaves[target], index * 3);
      }
    }

    geometry.morphAttributes.position = positionWaves.map(array => new THREE.Float32BufferAttribute(array, 3));
    geometry.morphAttributes.normal = normalWaves.map(array => new THREE.Float32BufferAttribute(array, 3));
    geometry.morphTargetsRelative = true;
    mesh.updateMorphTargets();
    weights.push(mesh.morphTargetInfluences);
  });

  return (cosine, sine) => {
    for (const influence of weights) {
      influence[0] = cosine;
      influence[1] = sine;
    }
  };
}

(() => {
  const triggers = document.querySelectorAll("[data-sigil-trigger]");
  const preview = document.querySelector("[data-sigil-hover]");
  const viewer = document.getElementById("sigil-viewer");
  if (!triggers.length || !preview || typeof viewer?.showModal !== "function") return;

  const heroTrigger = document.querySelector(".heading-sigil");
  const hoverStart = document.querySelector("[data-sigil-hover-start]");
  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
  const masthead = document.querySelector(".masthead");
  const navigation = document.querySelector("[data-sigil-navigation]");
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
  let heroVisible = false, heroTime = 0;
  let pointer, hoverCursor;
  let touchPress = null, suppressHeroClick = false;
  let softwareStamp = -Infinity;

  function prepareModel(model, isHero) {
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
    const wave = isHero ? createSigilWave(facing) : null;
    return { facing, materialMetalness, wave };
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

  function isOnCover() {
    return heroTrigger && stage.parentElement === heroTrigger;
  }

  function isShowing() {
    return hovering || viewer.open || (heroVisible && isOnCover());
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

  function drawSoftware(stamp, animating) {
    if (!mounted || softwareUnavailable) return false;
    if (animating && stage.dataset.live === "software" && stamp - softwareStamp < 32) return true;
    try {
      software ??= createSoftwareSigil(fallbackCanvas, turntable);
      turntable.updateMatrix();
      software.draw(turntable.matrix.elements, stage.clientWidth, camera.position.z);
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
    const onCover = isOnCover();
    const animating = onCover || !pointer;
    if (onCover && previous && stamp - previous < 32) { schedule(); return; }
    const dt = previous ? Math.min(.05, (stamp - previous) / 1000) : 1 / 60;
    if (onCover) {
      const calm = reducedMotion.matches;
      const strength = calm ? .8 : 1;
      heroTime += dt * (calm ? .56 : 1);
      const phase = 2.2 * heroTime;
      mounted.wave(strength * Math.cos(phase), strength * Math.sin(phase));
      turntable.rotation.set(0, 0, .08);
    } else {
      mounted.wave?.(0, 0);
      if (animating) turntable.rotateOnWorldAxis(yawAxis, (hovering ? 3.2 : .82) * dt);
    }
    previous = animating ? stamp : 0;
    if (!drawModel()) drawSoftware(stamp, animating);
    if (animating) schedule();
  }

  function resize() {
    if (!isShowing() || !mounted) return;
    const { clientWidth: width, clientHeight: height } = canvas;
    if (!width || !height) return;
    camera.aspect = width / height;
    camera.position.z = (isOnCover() ? 3.3 : 4.15) / Math.min(1, camera.aspect);
    camera.updateProjectionMatrix();
    if (!renderer && !contextLost && !webGLUnavailable) {
      initRenderer();
      if (canRenderWebGL()) lightModel();
    }
    if (!canRenderWebGL()) { schedule(); return; }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2, 1600 / Math.max(width, height)));
    renderer.setSize(width, height, false);
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
    coverVisibility.disconnect();
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
        return prepareModel(model, trigger === heroTrigger);
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

  const coverVisibility = new IntersectionObserver(([entry]) => {
    heroVisible = entry.isIntersecting;
    if (!isOnCover()) return;
    if (heroVisible) {
      resize();
      void start();
    } else stop();
  });

  function placeStage(host) {
    if (stage.parentElement === host) return;
    stop();
    delete stage.dataset.live;
    if (host === viewer) {
      viewer.insertBefore(stage, status);
      stage.tabIndex = 0;
      stage.removeAttribute("aria-hidden");
    } else {
      host.append(stage);
      stage.removeAttribute("tabindex");
      stage.setAttribute("aria-hidden", "true");
    }
  }

  function showCover() {
    if (!heroTrigger) { placeStage(viewer); return; }
    activate(heroTrigger);
    placeStage(heroTrigger);
    resize();
    void start();
  }

  function hidePreview() {
    if (!hovering) return;
    hovering = false;
    preview.hidden = true;
    delete activeTrigger.dataset.sigilPreviewing;
    if (!viewer.open) showCover();
  }

  function stopHeroPress() {
    if (!touchPress) return;
    const { timer, previewing } = touchPress;
    window.clearTimeout(timer);
    touchPress = null;
    if (previewing) hidePreview();
  }

  function activate(trigger) {
    if (activeTrigger === trigger) return;
    if (activeTrigger) delete activeTrigger.dataset.sigilPreviewing;
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
        && y >= hoverTop && !navigation?.contains(document.elementFromPoint(x, y))) return footerTrigger;
    }
  }

  function canHover(event) {
    return !touchPress && !viewer.open && (event.pointerType === "mouse" || event.pointerType === "pen");
  }

  function showPreview(trigger, event) {
    followCursor(event);
    preview.toggleAttribute("data-touch-preview", event.pointerType === "touch");
    if (hovering && activeTrigger === trigger) return;
    activate(trigger);
    hovering = true;
    preview.toggleAttribute("data-compact", trigger.dataset.sigilPreview === "footer");
    preview.hidden = false;
    placeStage(preview);
    turntable?.rotation.set(.09, 0, -.14);
    resize();
    void start();
    schedule();
  }

  function checkHover() {
    stopHeroPress();
    if (!hovering) return;
    const { x, y } = hoverCursor;
    if (hoverTriggerAt(x, y) !== activeTrigger) hidePreview();
  }

  if (heroTrigger) {
    heroTrigger.addEventListener("pointerdown", event => {
      if (!event.isPrimary) return;
      stopHeroPress();
      suppressHeroClick = false;
      if (event.pointerType !== "touch" || event.button !== 0 || viewer.open) return;
      const press = { id: event.pointerId, x: event.clientX, y: event.clientY };
      touchPress = press;
      press.timer = window.setTimeout(() => {
        if (touchPress !== press || document.hidden || viewer.open || signal.aborted) return;
        press.previewing = true;
        suppressHeroClick = true;
        showPreview(heroTrigger, event);
      }, 450);
    }, { signal });
    heroTrigger.addEventListener("pointermove", event => {
      if (touchPress?.id !== event.pointerId) return;
      if (Math.hypot(event.clientX - touchPress.x, event.clientY - touchPress.y) > 10) stopHeroPress();
    }, { passive: true, signal });
    for (const type of ["pointerup", "pointercancel", "lostpointercapture"]) {
      heroTrigger.addEventListener(type, event => {
        if (touchPress?.id === event.pointerId) stopHeroPress();
      }, { signal });
    }
    heroTrigger.addEventListener("contextmenu", event => {
      if (touchPress || event.pointerType === "touch") event.preventDefault();
    }, { signal });
  }

  for (const trigger of triggers) {
    trigger.addEventListener("pointerenter", event => {
      if (canHover(event) && hoverTriggerAt(event.clientX, event.clientY) === trigger) showPreview(trigger, event);
    }, { signal });
    trigger.addEventListener("pointerleave", event => {
      if (touchPress || event.pointerType === "touch") return;
      if (activeTrigger === trigger && hoverTriggerAt(event.clientX, event.clientY) !== trigger) hidePreview();
    }, { signal });
    trigger.addEventListener("click", event => {
      if (trigger === heroTrigger && suppressHeroClick && (event.detail !== 0 || event.pointerType === "touch")) {
        suppressHeroClick = false;
        event.preventDefault();
        return;
      }
      if (viewer.open) return;
      viewer.showModal();
      stopHeroPress();
      hidePreview();
      placeStage(viewer);
      activate(trigger);
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
    if (!canHover(event)) return;
    const trigger = hoverTriggerAt(event.clientX, event.clientY);
    if (trigger) showPreview(trigger, event);
    else hidePreview();
  }, { passive: true, signal });
  document.documentElement.addEventListener("pointerleave", event => {
    if (touchPress?.id === event.pointerId) stopHeroPress();
    else if (!touchPress) hidePreview();
  }, { signal });
  window.addEventListener("blur", () => {
    stopHeroPress();
    hidePreview();
  }, { signal });
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
    showCover();
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
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      stopHeroPress();
      stop();
    } else schedule();
  }, { signal });
  window.addEventListener("pagehide", event => {
    stopHeroPress();
    if (event.persisted) stop();
    else dispose();
  }, { signal });
  window.addEventListener("pageshow", schedule, { signal });
  reducedMotion.addEventListener("change", schedule, { signal });
  if (heroTrigger) {
    showCover();
    coverVisibility.observe(heroTrigger);
  }
})();
