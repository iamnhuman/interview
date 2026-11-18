"use strict";

(() => {
  const stage = document.querySelector("[data-sigil-stage]");
  if (!stage || typeof THREE === "undefined" || typeof sigilBlades === "undefined") return;

  const canvas = stage.querySelector("[data-sigil-canvas]");
  const context = canvas.getContext("webgl2", {
    alpha: true,
    antialias: true,
    powerPreference: "low-power",
  });
  if (!context) return;

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, context, alpha: true, antialias: true });
  } catch {
    return;
  }
  renderer.setClearColor(0x000000, 0);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.13;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  // Softboxes in the reflection map give the blades shape even on the dark side.
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
  let reflections;
  try {
    reflections = filter.fromScene(studio, .045, .1, 32);
  } catch {
    renderer.dispose();
    return;
  } finally {
    filter.dispose();
    panelGeometry.dispose();
    for (const panel of studio.children) panel.material.dispose();
  }

  const scene = new THREE.Scene();
  scene.environment = reflections.texture;
  scene.environmentIntensity = .95;
  const rim = new THREE.DirectionalLight(0xffffff, 1.55);
  rim.position.set(-3, 4, 5);
  scene.add(rim);

  const sigil = new THREE.Group();
  const chrome = new THREE.MeshPhysicalMaterial({
    color: 0xe6e6e6,
    metalness: .98,
    roughness: .19,
    clearcoat: .22,
    clearcoatRoughness: .28,
  });
  const inlay = new THREE.MeshPhysicalMaterial({
    color: 0x7e7e7e,
    metalness: .98,
    roughness: .15,
  });

  const pieces = sigilBlades.map((blade, index) => {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.Float32BufferAttribute(blade.positions, 3));
    geometry.setIndex(blade.indices);
    geometry.computeVertexNormals();
    geometry.computeBoundingBox();
    const mesh = new THREE.Mesh(geometry, blade.finish === "chrome" ? chrome : inlay);
    const origin = geometry.boundingBox.getCenter(mesh.position).clone();
    geometry.translate(-origin.x, -origin.y, -origin.z);
    sigil.add(mesh);
    return { mesh, origin, depth: (index % 3 - 1) * .95 };
  });
  sigil.rotation.set(.077, -.24, -.081);
  scene.add(sigil);
  const camera = new THREE.PerspectiveCamera(32, 1, .1, 40);

  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
  const events = new AbortController();
  let onScreen = true;
  let ready = true;
  let scroll = 0;
  let cameraDistance = 12.8;
  let frame = 0;
  let previous = 0;
  let elapsed = 0;

  function pause() {
    if (frame) cancelAnimationFrame(frame);
    frame = 0;
    previous = 0;
  }

  function schedule() {
    if (ready && onScreen && !document.hidden && !frame) frame = requestAnimationFrame(draw);
  }

  function draw(stamp) {
    frame = 0;
    const dt = previous ? Math.min(.05, (stamp - previous) / 1000) : 1 / 60;
    previous = stamp;
    elapsed += dt;

    const reduced = reducedMotion.matches;
    const blend = reduced ? 1 : 1 - Math.exp(-7.8 * dt);
    const yaw = -.24 + (reduced ? 0 : scroll * .76);
    const pitch = .077 - (reduced ? 0 : scroll * .19);
    const lift = reduced ? 0 : Math.sin(elapsed * 1.22) * .065 + scroll * .30;
    sigil.rotation.x += (pitch - sigil.rotation.x) * blend;
    sigil.rotation.y += (yaw - sigil.rotation.y) * blend;
    sigil.position.y += (lift - sigil.position.y) * blend;
    const spread = reduced ? 0 : Math.sin(Math.PI * Math.min(1, scroll * 1.45)) * .49;
    camera.position.z = cameraDistance * (1 + spread * .38);
    for (const { mesh, origin, depth } of pieces) {
      mesh.position.x += (origin.x * (1 + spread) - mesh.position.x) * blend;
      mesh.position.y += (origin.y * (1 + spread * .85) - mesh.position.y) * blend;
      mesh.position.z += (origin.z + depth * spread - mesh.position.z) * blend;
      mesh.rotation.z += (origin.x * spread * .28 - mesh.rotation.z) * blend;
      mesh.rotation.y += (depth * spread * .4 - mesh.rotation.y) * blend;
    }
    renderer.render(scene, camera);
    if (!stage.hasAttribute("data-live")) stage.dataset.live = "";
    if (!reduced) schedule();
  }

  function resize() {
    const { clientWidth: width, clientHeight: height } = stage;
    if (!width || !height) return;
    const ratio = Math.min(devicePixelRatio || 1, width < 430 ? 1.45 : 2);
    renderer.setPixelRatio(ratio);
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    cameraDistance = 12.8 / Math.min(1, camera.aspect);
    camera.updateProjectionMatrix();
    schedule();
  }

  function refreshScroll() {
    const { top, height } = stage.getBoundingClientRect();
    const viewport = window.innerHeight;
    const span = Math.max(height, viewport * .56, 1);
    scroll = Math.max(0, Math.min(1, (viewport * .66 - top) / span));
    schedule();
  }

  const signal = events.signal;
  window.addEventListener("scroll", () => {
    if (onScreen) refreshScroll();
  }, { passive: true, signal });
  document.addEventListener("visibilitychange", () => document.hidden ? pause() : schedule(), { signal });
  reducedMotion.addEventListener("change", schedule, { signal });

  canvas.addEventListener("webglcontextlost", () => {
    ready = false;
    pause();
    delete stage.dataset.live;
  }, { signal });

  const size = new ResizeObserver(resize);
  size.observe(stage);
  const visibility = new IntersectionObserver(([entry]) => {
    onScreen = entry.isIntersecting;
    if (onScreen) refreshScroll();
    else pause();
  });
  visibility.observe(stage);
  window.addEventListener("pagehide", (event) => {
    pause();
    if (event.persisted) return;
    events.abort();
    size.disconnect();
    visibility.disconnect();
    for (const blade of sigil.children) blade.geometry.dispose();
    chrome.dispose();
    inlay.dispose();
    reflections.dispose();
    renderer.dispose();
  }, { signal });
  window.addEventListener("pageshow", refreshScroll, { signal });
  resize();
})();
