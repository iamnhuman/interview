"use strict";

(() => {
  const columns = 48, rows = 36, stride = columns + 1;
  const count = stride * (rows + 1);
  const uv = new Float32Array(count * 2);
  const faces = new Uint16Array(columns * rows * 6);
  let face = 0;
  for (let y = 0; y <= rows; y++) {
    for (let x = 0; x <= columns; x++) {
      const i = y * stride + x;
      uv[i * 2] = x / columns;
      uv[i * 2 + 1] = y / rows;
      if (x < columns && y < rows) {
        faces.set([i, i + stride, i + 1, i + 1, i + stride, i + stride + 1], face);
        face += 6;
      }
    }
  }

  const vertex = `
    #ifdef GL_ES
    precision highp float;
    #endif
    attribute vec2 uv;
    attribute vec3 displacement;
    attribute vec2 gradient;
    uniform vec4 crop;
    varying vec2 texCoord;
    varying vec2 slope;
    void main() {
      vec2 p = (uv + displacement.xy) * vec2(2., -2.) + vec2(-1., 1.);
      float z = displacement.z;
      gl_Position = vec4(p + vec2(.10, .14) * z, -.3 * z, 1. - .44 * z);
      texCoord = crop.xy + uv * crop.zw;
      slope = gradient;
    }`;
  const fragment = `
    #ifdef GL_ES
    precision highp float;
    #endif
    uniform sampler2D photo;
    varying vec2 texCoord;
    varying vec2 slope;
    void main() {
      vec3 normal = normalize(vec3(-slope, 1.));
      vec3 light = vec3(-.48, -.60, .64);
      float diffuse = dot(normal, light) - light.z;
      vec3 halfway = normalize(light + vec3(0., 0., 1.));
      float sheen = pow(max(0., dot(normal, halfway)), 16.) - pow(halfway.z, 16.);
      vec3 colour = texture2D(photo, texCoord).rgb;
      gl_FragColor = vec4(colour * (1. + .78 * diffuse) + .12 * sheen, 1.);
    }`;

  function webGL(canvas, photo, surface) {
    const gl = canvas.getContext("webgl", { alpha: false, antialias: true, depth: true });
    if (!gl) return null;
    const program = gl.createProgram();
    for (const [type, source] of [[gl.VERTEX_SHADER, vertex], [gl.FRAGMENT_SHADER, fragment]]) {
      const shader = gl.createShader(type);
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      gl.attachShader(program, shader);
      gl.deleteShader(shader);
    }
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) { gl.deleteProgram(program); return null; }
    gl.useProgram(program);
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);
    function attribute(name, size, bytes = 0, offset = 0) {
      const location = gl.getAttribLocation(program, name);
      gl.enableVertexAttribArray(location);
      gl.vertexAttribPointer(location, size, gl.FLOAT, false, bytes, offset);
    }
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, uv, gl.STATIC_DRAW);
    attribute("uv", 2);
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, surface.byteLength, gl.DYNAMIC_DRAW);
    attribute("displacement", 3, 20);
    attribute("gradient", 2, 20, 12);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, faces, gl.STATIC_DRAW);
    gl.bindTexture(gl.TEXTURE_2D, gl.createTexture());
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, photo);
    if (gl.getError() !== gl.NO_ERROR) return null;
    const crop = gl.getUniformLocation(program, "crop");
    return {
      name: "webgl",
      resize(w, h) {
        const ratio = Math.min(window.devicePixelRatio || 1, 2);
        canvas.width = Math.max(1, Math.round(w * ratio));
        canvas.height = Math.max(1, Math.round(h * ratio));
        gl.viewport(0, 0, canvas.width, canvas.height);
        const rect = photoSourceRect(photo, w, h);
        gl.uniform4f(crop, rect.x / photo.naturalWidth, rect.y / photo.naturalHeight, rect.width / photo.naturalWidth, rect.height / photo.naturalHeight);
      },
      draw() {
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
        gl.bufferSubData(gl.ARRAY_BUFFER, 0, surface);
        gl.drawElements(gl.TRIANGLES, faces.length, gl.UNSIGNED_SHORT, 0);
      },
    };
  }

  // Draw the same folds with textured triangles when WebGL is unavailable.
  // Canvas can draw local photographs this way without reading their pixels.
  function software(canvas, photo, surface) {
    const ctx = canvas.getContext("2d", { alpha: false });
    const texture = document.createElement("canvas");
    const source = texture.getContext("2d", { alpha: false });
    if (!ctx || !source) return null;
    const xs = new Float32Array(count), ys = new Float32Array(count);
    const light = new Float32Array(count), changed = new Uint8Array(count);
    const skip = 2;
    let w, h;

    function triangle(a, b, c) {
      if (!(changed[a] || changed[b] || changed[c])) return;
      const u = uv[2 * a] * w, v = uv[2 * a + 1] * h;
      const ub = uv[2 * b] * w - u, vb = uv[2 * b + 1] * h - v;
      const uc = uv[2 * c] * w - u, vc = uv[2 * c + 1] * h - v;
      const xb = xs[b] - xs[a], yb = ys[b] - ys[a], xc = xs[c] - xs[a], yc = ys[c] - ys[a];
      const det = ub * vc - uc * vb;
      const xx = (xb * vc - xc * vb) / det, xy = (xc * ub - xb * uc) / det;
      const yx = (yb * vc - yc * vb) / det, yy = (yc * ub - yb * uc) / det;
      const shade = (light[a] + light[b] + light[c]) / 3;
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(xs[a], ys[a]);
      ctx.lineTo(xs[b], ys[b]);
      ctx.lineTo(xs[c], ys[c]);
      ctx.closePath();
      ctx.clip();
      ctx.setTransform(xx, yx, xy, yy, xs[a] - xx * u - xy * v, ys[a] - yx * u - yy * v);
      ctx.drawImage(texture, 0, 0);
      if (Math.abs(shade) > .01) {
        ctx.globalAlpha = Math.min(.55, Math.abs(shade));
        ctx.fillStyle = shade > 0 ? "#fff" : "#000";
        ctx.fillRect(0, 0, w, h);
      }
      ctx.restore();
    }

    return {
      name: "canvas2d",
      resize(width, height) {
        const ratio = Math.min(window.devicePixelRatio || 1, 1.5, 900 / width, 650 / height);
        w = canvas.width = texture.width = Math.max(1, Math.round(width * ratio));
        h = canvas.height = texture.height = Math.max(1, Math.round(height * ratio));
        const crop = photoSourceRect(photo, width, height);
        source.drawImage(photo, crop.x, crop.y, crop.width, crop.height, 0, 0, w, h);
      },
      draw(flat) {
        ctx.drawImage(texture, 0, 0);
        if (flat) return;
        for (let y = 0; y <= rows; y += skip) {
          for (let x = 0; x <= columns; x += skip) {
            const i = y * stride + x, k = i * 5, u = uv[i * 2], v = uv[i * 2 + 1];
            const z = surface[k + 2], perspective = 1 - .44 * z;
            xs[i] = (((u + surface[k]) * 2 - 1 + .10 * z) / perspective + 1) * w / 2;
            ys[i] = (((v + surface[k + 1]) * 2 - 1 - .14 * z) / perspective + 1) * h / 2;
            const nx = surface[k + 3], ny = surface[k + 4];
            light[i] = .78 * ((.48 * nx + .60 * ny + .64) / Math.hypot(nx, ny, 1) - .64);
            changed[i] = Math.abs(xs[i] - u * w) + Math.abs(ys[i] - v * h) > .08 || Math.abs(light[i]) > .01;
          }
        }
        for (let y = 0; y < rows; y += skip) {
          for (let x = 0; x < columns; x += skip) {
            const i = y * stride + x, below = i + skip * stride;
            triangle(i, below, i + skip);
            triangle(i + skip, below, below + skip);
          }
        }
      },
    };
  }

  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  function cloth(link) {
    const photo = link.querySelector("img");
    let canvas = link.querySelector(".cloth-canvas");
    const offset = new Float32Array(count * 3), speed = new Float32Array(count * 3);
    const surface = new Float32Array(count * 5);
    const pull = { x: .5, y: .5, dx: 0, dy: 0, angle: 0, touching: false };
    let renderer, visible = false, flat = true, frame = 0, last = 0, width = 0, height = 0, aspect = 1;
    let revealed = false, fromScreen = null;

    function step(dt, direct = false) {
      const horizontal = 940 / (aspect * aspect), vertical = 760;
      const damping = Math.exp(-6.2 * dt), co = Math.cos(pull.angle), si = Math.sin(pull.angle);
      const drag = Math.min(1, 5 * Math.hypot(pull.dx, pull.dy));
      let energy = 0;
      for (let y = 1; y < rows; y++) {
        for (let x = 1; x < columns; x++) {
          const i = y * stride + x, k = i * 3;
          const dx = (uv[i * 2] - pull.x) * aspect + .6 * pull.dx;
          const dy = uv[i * 2 + 1] - pull.y + .6 * pull.dy;
          const across = -dx * si + dy * co, along = dx * co + dy * si;
          const contact = pull.touching ? Math.exp(-16 * along * along - 32 * across * across) : 0;
          // Pull a ridge in the direction of travel and gather the cloth on either side.
          const crease = Math.cos(37 * across + 1.1 * Math.sin(8 * along));
          const lift = .065 + (.075 + .11 * drag) * crease;
          const force = contact * 275;
          for (let axis = 0; axis < 3; axis++) {
            const j = k + axis, value = offset[j];
            const target = axis === 0 ? pull.dx - .38 * dx : axis === 1 ? pull.dy - .38 * dy : lift;
            if (direct) { offset[j] = .3 * contact * target; continue; }
            const tension = (offset[j - 3] + offset[j + 3] - 2 * value) * horizontal
              + (offset[j - stride * 3] + offset[j + stride * 3] - 2 * value) * vertical;
            speed[j] = (speed[j] + dt * (tension - 37 * value + force * (target - value))) * damping;
            energy = Math.max(energy, Math.abs(speed[j]));
          }
        }
      }
      if (direct) return 0;
      for (let j = 0; j < offset.length; j++) offset[j] += speed[j] * dt;
      pull.dx *= Math.exp(-3.9 * dt); pull.dy *= Math.exp(-3.9 * dt);
      return energy;
    }

    function paint() {
      for (let y = 1; y < rows; y++) {
        for (let x = 1; x < columns; x++) {
          const i = y * stride + x, k = i * 3, j = i * 5;
          surface[j] = offset[k] / aspect;
          surface[j + 1] = offset[k + 1];
          surface[j + 2] = offset[k + 2];
          surface[j + 3] = (offset[k + 5] - offset[k - 1]) * columns / (2 * aspect);
          surface[j + 4] = (offset[k + stride * 3 + 2] - offset[k - stride * 3 + 2]) * rows / 2;
        }
      }
      renderer.draw(flat);
      link.setAttribute("data-cloth-ready", renderer.name);
    }

    function reset() {
      window.cancelAnimationFrame(frame);
      frame = 0; last = 0; pull.touching = false; pull.dx = 0; pull.dy = 0; flat = true;
      offset.fill(0); speed.fill(0); surface.fill(0);
    }

    function update(now) {
      frame = 0;
      if (reduced.matches) {
        if (pull.touching) step(0, true);
        else reset();
        paint();
        return;
      }
      const dt = Math.min(.05, last ? (now - last) / 1000 : 1 / 60);
      if (renderer.name === "canvas2d" && last && dt < 1 / 32) { frame = window.requestAnimationFrame(update); return; }
      last = now;
      const steps = Math.max(1, Math.ceil(dt * 120));
      let energy = 0;
      for (let n = 0; n < steps; n++) energy = step(dt / steps);
      const moving = energy > .00035 || Math.abs(pull.dx) + Math.abs(pull.dy) > .0005;
      if (!moving && !pull.touching) reset();
      paint();
      if (moving) frame = window.requestAnimationFrame(update);
    }

    function wake() {
      if (!frame && visible && renderer && !document.hidden) {
        last = 0;
        frame = window.requestAnimationFrame(update);
      }
    }

    function useSoftware() {
      const replacement = canvas.cloneNode(false);
      canvas.replaceWith(replacement);
      canvas = replacement;
      renderer = software(canvas, photo, surface);
    }

    function prepare() {
      if (!visible || document.hidden || !photo.complete || !photo.naturalWidth || !link.clientWidth || !link.clientHeight) return;
      if (!renderer) {
        try { renderer = webGL(canvas, photo, surface); } catch { renderer = null; }
        if (!renderer) useSoftware();
      }
      if (!renderer) return;
      if (width !== link.clientWidth || height !== link.clientHeight) {
        width = link.clientWidth; height = link.clientHeight; aspect = Math.max(.5, width / height);
        const transform = getComputedStyle(link.parentElement).transform;
        fromScreen = transform !== "none" && window.DOMMatrixReadOnly
          ? new DOMMatrixReadOnly(transform).inverse() : null;
        try { renderer.resize(width, height); } catch {
          reset();
          link.removeAttribute("data-cloth-ready");
          renderer = null; width = height = 0;
          return;
        }
      }
      if (!revealed) {
        revealed = true;
        if (!reduced.matches && !pull.touching) {
          for (let y = 1; y < rows; y++) {
            for (let x = 1; x < columns; x++) {
              const u = x / columns, v = y / rows, fold = u - .5 + .3 * (v - .5);
              speed[(y * stride + x) * 3 + 2] = .7 * Math.cos(fold * 25) * Math.exp(-12 * fold * fold) * Math.sin(Math.PI * u) * Math.sin(Math.PI * v);
            }
          }
          flat = false;
          wake();
        }
      }
      paint();
      if (pull.touching) wake();
    }

    function touch(event) {
      if (event.isPrimary === false || !link.clientWidth || !link.clientHeight) return;
      const rect = link.getBoundingClientRect();
      const px = event.clientX - rect.left - rect.width / 2, py = event.clientY - rect.top - rect.height / 2;
      const localX = fromScreen ? fromScreen.a * px + fromScreen.c * py : px;
      const localY = fromScreen ? fromScreen.b * px + fromScreen.d * py : py;
      const x = Math.max(0, Math.min(1, .5 + localX / link.clientWidth));
      const y = Math.max(0, Math.min(1, .5 + localY / link.clientHeight));
      if (pull.touching) {
        const dx = (x - pull.x) * aspect, dy = y - pull.y;
        if (Math.hypot(dx, dy) > .002) pull.angle = Math.atan2(dy, dx);
        pull.dx = Math.max(-.2, Math.min(.2, pull.dx + 1.75 * dx));
        pull.dy = Math.max(-.2, Math.min(.2, pull.dy + 1.75 * dy));
      }
      pull.x = x; pull.y = y; pull.touching = true; flat = false;
      wake();
    }

    function release() { pull.touching = false; wake(); }
    link.addEventListener("pointerenter", touch);
    link.addEventListener("pointermove", touch);
    link.addEventListener("pointerdown", touch);
    link.addEventListener("pointerleave", release);
    link.addEventListener("pointercancel", release);
    link.addEventListener("pointerup", event => { if (event.pointerType === "touch") release(); });
    canvas.addEventListener("webglcontextlost", event => {
      event.preventDefault();
      reset();
      link.removeAttribute("data-cloth-ready");
      useSoftware();
      width = height = 0;
      prepare();
    });
    photo.addEventListener("load", prepare);
    new ResizeObserver(prepare).observe(link);
    new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; if (visible) prepare(); else reset(); }).observe(link);
    document.addEventListener("visibilitychange", () => { if (document.hidden) reset(); else prepare(); });
    reduced.addEventListener("change", () => { reset(); prepare(); });
  }

  function start() { document.querySelectorAll(".cover [data-photo]").forEach(cloth); }
  // A directly opened HTML file needs origin-clean copies to upload or sample its local photographs.
  if (window.location.protocol === "file:") {
    const textures = document.createElement("script");
    textures.src = "assets/cover-textures.js";
    textures.onload = textures.onerror = start;
    document.head.append(textures);
  } else {
    start();
  }
})();
