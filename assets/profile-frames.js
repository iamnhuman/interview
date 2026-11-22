"use strict";

(() => {
  const profiles = document.querySelector("[data-profile-frame-model]");
  if (!profiles || typeof THREE === "undefined" || !THREE.GLTFLoader) return;

  const cameraDistance = 3.8;
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  const avatars = new Map(Array.from(profiles.querySelectorAll(".toyota-profile-avatar"), avatar => [avatar, { avatar }]));
  const visible = new Set();
  const events = new AbortController();
  const { signal } = events;
  const gpuCanvas = document.createElement("canvas");
  const cpuCanvas = document.createElement("canvas");
  const scene = new THREE.Scene();
  const rig = new THREE.Group();
  const camera = new THREE.PerspectiveCamera(32, 1, .1, 20);
  camera.position.z = cameraDistance;
  let model, renderer, reflections, software, wave;
  let requested = false, useSoftware = false, frame = 0, previous = 0, phase = 0;

  function widenRim(mesh) {
    const { geometry, matrixWorld } = mesh;
    const position = geometry.getAttribute("position");
    const vertices = new Float32Array(position.count * 3);
    const toLocal = matrixWorld.clone().invert();
    const point = new THREE.Vector3();
    for (let index = 0; index < position.count; index++) {
      point.fromBufferAttribute(position, index).applyMatrix4(matrixWorld);
      const radius = Math.hypot(point.x, point.y);
      const edge = Math.min(1, Math.max(0, (radius - .73) / .18));
      const width = .04 * (1 - edge * edge * (3 - 2 * edge));
      const scale = 1 - width / Math.max(.04, radius);
      point.x *= scale;
      point.y *= scale;
      point.applyMatrix4(toLocal).toArray(vertices, index * 3);
    }
    geometry.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
  }

  function openingOutline(mesh) {
    const position = mesh.geometry.getAttribute("position");
    const indices = mesh.geometry.index?.array ?? Uint32Array.from({ length: position.count }, (_, index) => index);
    const projected = new Float32Array(position.count * 2);
    const point = new THREE.Vector3();
    camera.updateMatrixWorld();
    for (let index = 0; index < position.count; index++) {
      point.fromBufferAttribute(position, index).applyMatrix4(mesh.matrixWorld).project(camera);
      projected[index * 2] = point.x / 2;
      projected[index * 2 + 1] = -point.y / 2;
    }

    // Find the inner silhouette by tracing rays from the center of the opening.
    return Array.from({ length: 72 }, (_, index) => {
      const angle = index * 2 * Math.PI / 72;
      const dx = Math.cos(angle), dy = Math.sin(angle);
      let radius = Infinity;
      for (let triangle = 0; triangle < indices.length; triangle += 3) {
        for (let edge = 0; edge < 3; edge++) {
          const a = indices[triangle + edge] * 2, b = indices[triangle + (edge + 1) % 3] * 2;
          const x = projected[a], y = projected[a + 1];
          const bx = projected[b], by = projected[b + 1];
          const left = x * dy - y * dx, right = bx * dy - by * dx;
          if (left * right > 0 || left === right) continue;
          const fraction = left / (left - right);
          const distance = (x + (bx - x) * fraction) * dx + (y + (by - y) * fraction) * dy;
          if (distance > 0 && distance < radius) radius = distance;
        }
      }
      if (!Number.isFinite(radius)) throw new Error("В модели не найден замкнутый проём рамки.");
      return { angle, radius };
    });
  }

  function attachFrames(outline) {
    for (const item of avatars.values()) {
      const { avatar } = item;
      const canvas = document.createElement("canvas");
      const context = canvas.getContext("2d");
      if (!context) continue;
      const style = getComputedStyle(avatar);
      const scale = parseFloat(style.getPropertyValue("--profile-frame-scale"));
      const rotation = parseFloat(style.getPropertyValue("--profile-frame-angle")) * Math.PI / 180 || 0;
      const points = outline.map(({ angle, radius }) => {
        // Extend the media beneath the lip so the antialiased metal covers its edge.
        const extent = radius * scale + .012;
        const x = .5 + extent * Math.cos(angle + rotation);
        const y = .5 + extent * Math.sin(angle + rotation);
        return `${(x * 100).toFixed(2)}% ${(y * 100).toFixed(2)}%`;
      });
      canvas.className = "toyota-profile-frame";
      canvas.setAttribute("aria-hidden", "true");
      item.aperture = `polygon(${points.join(", ")})`;
      item.canvas = canvas;
      item.context = context;
      avatar.append(canvas);
      sizing.observe(canvas);
    }
  }

  function schedule() {
    if (wave && visible.size && !document.hidden && !signal.aborted && !frame) frame = requestAnimationFrame(draw);
  }

  function stop() {
    cancelAnimationFrame(frame);
    frame = previous = 0;
  }

  function release() {
    stop();
    sizing.disconnect();
    for (const item of avatars.values()) {
      const { avatar, canvas } = item;
      delete avatar.dataset.profileFrameLive;
      avatar.style.removeProperty("--profile-aperture");
      canvas?.remove();
      item.canvas = item.context = undefined;
    }
    model?.removeFromParent();
    disposeSigilGeometry(model);
    reflections?.dispose();
    renderer?.dispose();
    model = reflections = renderer = software = wave = undefined;
  }

  function drawFrame(size) {
    if (renderer && !useSoftware) {
      try {
        if (gpuCanvas.width !== size || gpuCanvas.height !== size) renderer.setSize(size, size, false);
        renderer.render(scene, camera);
        return gpuCanvas;
      } catch (error) {
        useSoftware = true;
        console.warn("Не удалось отрисовать рамки WebGL.", error);
      }
    }
    software ??= createSoftwareSigil(cpuCanvas, rig);
    software.draw(rig.matrix.elements, size, cameraDistance);
    return cpuCanvas;
  }

  function draw(stamp) {
    frame = 0;
    if (!wave || !visible.size || document.hidden || signal.aborted) return;
    const elapsed = previous ? stamp - previous : 1000 / 30;
    if (elapsed < 31) { schedule(); return; }
    const items = Array.from(visible).filter(item => item.size);
    if (!items.length) return;
    const size = Math.max(...items.map(item => item.size));
    const calm = reduced.matches;
    phase += 2.2 * Math.min(.05, elapsed / 1000) * (calm ? .56 : 1);
    const strength = calm ? .56 : .7;
    wave(strength * Math.cos(phase), strength * Math.sin(phase));
    try {
      const rendered = drawFrame(size);
      for (const { avatar, canvas, context, aperture, size } of items) {
        if (canvas.width !== size || canvas.height !== size) canvas.width = canvas.height = size;
        else context.clearRect(0, 0, size, size);
        context.drawImage(rendered, 0, 0, size, size);
        if (!avatar.hasAttribute("data-profile-frame-live")) {
          avatar.style.setProperty("--profile-aperture", aperture);
          avatar.dataset.profileFrameLive = "";
        }
      }
    } catch (error) {
      release();
      console.warn("Не удалось отрисовать круглые 3D-рамки.", error);
      return;
    }
    previous = stamp;
    schedule();
  }

  function fit() {
    const ratio = Math.min(2, window.devicePixelRatio || 1);
    for (const item of avatars.values()) {
      if (item.canvas) item.size = Math.min(384, Math.round(item.canvas.clientWidth * ratio));
    }
    schedule();
  }

  function initRenderer() {
    const context = gpuCanvas.getContext("webgl2", { alpha: true, antialias: true, powerPreference: "low-power" });
    if (!context) return;
    try {
      renderer = new THREE.WebGLRenderer({ canvas: gpuCanvas, context, alpha: true });
      renderer.setClearColor(0, 0);
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.1;
      renderer.debug.onShaderError = (gl, program) => {
        throw new Error(gl.getProgramInfoLog(program) || "Не удалось скомпилировать шейдер рамки.");
      };
      if (renderer.extensions.has("EXT_color_buffer_float")) {
        reflections = makeSigilReflections(renderer);
        scene.environment = reflections.texture;
        scene.environmentIntensity = .95;
      }
      if (!reflections) model.traverse(mesh => {
        if (mesh.isMesh) mesh.material.metalness = Math.min(mesh.material.metalness, .3);
      });
    } catch (error) {
      useSoftware = true;
      console.warn("Не удалось запустить WebGL для рамок.", error);
    }
  }

  async function load() {
    try {
      const url = profiles.dataset.profileFrameModel;
      const { scene: loaded } = await loadSigilGLB(url, url.replace(/\.glb$/, "-data.js"), signal);
      if (signal.aborted) { disposeSigilGeometry(loaded); return; }
      model = loaded;
      const facing = new THREE.Group();
      facing.rotation.y = -Math.PI / 2;
      facing.scale.setScalar(1 / .49);
      facing.position.set(.014 / .49, .003 / .49, 0);
      facing.add(model);
      rig.add(facing);
      const key = new THREE.DirectionalLight(0xffffff, 1.55);
      const fill = new THREE.DirectionalLight(0xdce7ff, .95);
      key.position.set(-3, 4, 5);
      fill.position.set(4, -2, 3);
      scene.add(rig, key, fill);
      scene.updateMatrixWorld(true);

      const mesh = facing.getObjectByProperty("isMesh", true);
      widenRim(mesh);
      mesh.material.normalScale.multiplyScalar(.45);
      mesh.material.roughnessMap = null;
      mesh.material.roughness = .32;
      mesh.material.emissive.setRGB(.042, .042, .042);
      const outline = openingOutline(mesh);
      // Flex the tips and keep the inner rim that covers the media in place.
      wave = createSigilWave(facing, .76);
      attachFrames(outline);
      initRenderer();
      fit();
    } catch (error) {
      release();
      if (!signal.aborted) console.warn("Не удалось загрузить круглые 3D-рамки.", error);
    }
  }

  function sync() {
    if (!visible.size || document.hidden) { stop(); return; }
    if (!requested) { requested = true; void load(); }
    schedule();
  }

  const sizing = new ResizeObserver(fit);
  const visibility = new IntersectionObserver(entries => {
    for (const { target, isIntersecting } of entries) {
      const item = avatars.get(target);
      if (isIntersecting) visible.add(item);
      else visible.delete(item);
    }
    sync();
  }, { rootMargin: "64px" });
  for (const avatar of avatars.keys()) visibility.observe(avatar);
  gpuCanvas.addEventListener("webglcontextlost", () => { useSoftware = true; schedule(); }, { signal });
  document.addEventListener("visibilitychange", sync, { signal });
  window.addEventListener("pageshow", sync, { signal });
  window.addEventListener("pagehide", event => {
    stop();
    if (event.persisted) return;
    events.abort();
    visibility.disconnect();
    release();
  }, { signal });
})();
