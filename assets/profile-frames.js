"use strict";

(() => {
  const profiles = document.querySelector("[data-profile-frame-model]");
  if (!profiles) return;

  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  const avatars = Array.from(profiles.querySelectorAll(".toyota-profile-avatar"), (avatar, index) => {
    const angle = parseFloat(avatar.closest("li").style.getPropertyValue("--profile-frame-angle")) || 0;
    const period = 52 + index * 4.3;
    const phase = index * 2.4;
    const direction = index % 2 ? -1 : 1;
    avatar.style.setProperty("--profile-frame-period", period + "s");
    avatar.style.setProperty("--profile-frame-turn", -direction + "turn");
    return { avatar, angle: -angle * Math.PI / 180, period, phase, direction };
  });
  const visible = new Set();
  const events = new AbortController();
  const { signal } = events;
  const canvas = document.createElement("canvas");
  canvas.className = "toyota-profile-frames";
  canvas.setAttribute("aria-hidden", "true");

  let scene, camera, renderer, model, reflections;
  let requested = false, frame = 0, lastDraw = -Infinity;

  function stop() {
    cancelAnimationFrame(frame);
    frame = 0;
    lastDraw = -Infinity;
  }

  function release() {
    stop();
    profiles.removeAttribute("data-profile-frames-ready");
    sizing.disconnect();
    canvas.remove();
    scene?.clear();
    for (const item of avatars) item.rig = undefined;
    if (model) disposeSigilGeometry(model);
    reflections?.dispose();
    renderer?.dispose();
    model = reflections = renderer = undefined;
  }

  function schedule() {
    if (model && visible.size && !document.hidden && !signal.aborted && !frame) frame = requestAnimationFrame(draw);
  }

  function draw(now) {
    frame = 0;
    if (!model || !visible.size || document.hidden) return;
    if (now - lastDraw >= 31.5) {
      const strength = reduced.matches ? .4 : 1;
      const seconds = now * (reduced.matches ? .00065 : .001);
      for (const item of avatars) {
        item.rig.visible = visible.has(item.avatar);
        if (!item.rig.visible) continue;
        const turn = (seconds / item.period % 1) * item.direction * 2 * Math.PI;
        item.rig.rotation.set(
          strength * .07 * Math.sin(2 * turn + item.phase),
          strength * .08 * Math.cos(3 * turn - .5 * item.phase),
          item.angle + turn
        );
      }
      try {
        renderer.render(scene, camera);
        if (!profiles.hasAttribute("data-profile-frames-ready")) profiles.setAttribute("data-profile-frames-ready", "");
      } catch (error) {
        release();
        console.warn("Не удалось отрисовать круглые 3D-рамки.", error);
        return;
      }
      lastDraw = now;
    }
    schedule();
  }

  function fit() {
    if (!renderer || !model) return;
    const area = canvas.getBoundingClientRect();
    if (!area.width || !area.height) return;
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    renderer.setSize(area.width, area.height, false);
    camera.right = area.width;
    camera.top = area.height;
    camera.updateProjectionMatrix();
    for (const { avatar, rig } of avatars) {
      const rect = avatar.getBoundingClientRect();
      rig.position.set(rect.left - area.left + rect.width / 2, area.bottom - rect.top - rect.height / 2, 0);
      rig.scale.setScalar(rect.width / .72);
    }
    lastDraw = -Infinity;
    schedule();
  }

  async function load() {
    if (typeof THREE === "undefined" || !THREE.GLTFLoader || typeof loadSigilGLB !== "function") return;
    try {
      const context = canvas.getContext("webgl2", { alpha: true, antialias: true, powerPreference: "low-power" });
      if (!context) return;
      const url = profiles.dataset.profileFrameModel;
      const { scene: loaded } = await loadSigilGLB(url, url.replace(/\.glb(?=[?#]|$)/, "-data.js"), signal);
      if (signal.aborted) { disposeSigilGeometry(loaded); return; }
      model = loaded;

      renderer = new THREE.WebGLRenderer({ canvas, context, alpha: true });
      renderer.debug.onShaderError = (gl, program) => {
        throw new Error(gl.getProgramInfoLog(program) || "Не удалось скомпилировать шейдер рамки.");
      };
      renderer.setClearColor(0, 0);
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.1;
      scene = new THREE.Scene();
      camera = new THREE.OrthographicCamera(0, 1, 1, 0, .1, 1000);
      camera.position.z = 200;
      const key = new THREE.DirectionalLight(0xffffff, 1.55);
      const fill = new THREE.DirectionalLight(0xdce7ff, .95);
      key.position.set(-3, 4, 5);
      fill.position.set(4, -2, 3);
      scene.add(key, fill);
      if (renderer.extensions.has("EXT_color_buffer_float")) {
        try {
          reflections = makeSigilReflections(renderer);
          scene.environment = reflections.texture;
          scene.environmentIntensity = .95;
        } catch {
          renderer.setRenderTarget(null);
          renderer.toneMapping = THREE.ACESFilmicToneMapping;
          renderer.autoClear = true;
          renderer.setClearColor(0, 0);
        }
      }
      if (!reflections) model.traverse(mesh => {
        if (mesh.isMesh) mesh.material.metalness = Math.min(mesh.material.metalness, .3);
      });

      // Place the opening of the model at the center of the circular photograph.
      const facing = new THREE.Group();
      facing.rotation.y = -Math.PI / 2;
      facing.position.set(.014, .003, 0);
      facing.add(model);
      for (const item of avatars) {
        item.rig = new THREE.Group();
        item.rig.add(facing.clone());
        scene.add(item.rig);
        sizing.observe(item.avatar);
      }
      profiles.prepend(canvas);
      sizing.observe(profiles);
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
      target.toggleAttribute("data-profile-frame-visible", isIntersecting);
      if (isIntersecting) visible.add(target);
      else visible.delete(target);
    }
    sync();
  }, { rootMargin: "40px" });
  for (const { avatar } of avatars) visibility.observe(avatar);
  canvas.addEventListener("webglcontextlost", release, { signal });
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
