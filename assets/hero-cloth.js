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
      gl_FragColor = vec4(colour * (1. + .55 * diffuse) + .075 * sheen, 1.);
    }`;

  function webGL(canvas, photo, surface) {
    const gl = canvas.getContext("webgl", { alpha: false, antialias: true, depth: false });
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
        gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
        gl.bufferSubData(gl.ARRAY_BUFFER, 0, surface);
        gl.drawElements(gl.TRIANGLES, faces.length, gl.UNSIGNED_SHORT, 0);
      },
    };
  }

  // Rasterize the same projected mesh when a GPU context is unavailable.
  // UV coordinates and light are interpolated across every triangle, including shared edges.
  function software(canvas, photo, surface) {
    const ctx = canvas.getContext("2d", { alpha: false, willReadFrequently: true });
    if (!ctx) return null;
    const xs = new Float32Array(count), ys = new Float32Array(count);
    const gain = new Float32Array(count), gloss = new Float32Array(count);
    const changed = new Uint8Array(count);
    const halfLength = Math.hypot(.48, .60, 1.64), flatGloss = (1.64 / halfLength) ** 16;
    let source, output, w, h;

    function triangle(a, b, c) {
      if (!(changed[a] || changed[b] || changed[c])) return;
      const ax = xs[a], ay = ys[a], bx = xs[b] - ax, by = ys[b] - ay, cx = xs[c] - ax, cy = ys[c] - ay;
      const area = bx * cy - by * cx;
      if (Math.abs(area) < .001) return;
      const left = Math.max(0, Math.ceil(Math.min(ax, xs[b], xs[c]) - .5));
      const right = Math.min(w - 1, Math.floor(Math.max(ax, xs[b], xs[c]) - .5));
      const top = Math.max(0, Math.ceil(Math.min(ay, ys[b], ys[c]) - .5));
      const bottom = Math.min(h - 1, Math.floor(Math.max(ay, ys[b], ys[c]) - .5));
      const u0 = uv[a * 2] * w - .5, v0 = uv[a * 2 + 1] * h - .5;
      const ub = (uv[b * 2] - uv[a * 2]) * w, uc = (uv[c * 2] - uv[a * 2]) * w;
      const vb = (uv[b * 2 + 1] - uv[a * 2 + 1]) * h, vc = (uv[c * 2 + 1] - uv[a * 2 + 1]) * h;
      const gb = gain[b] - gain[a], gc = gain[c] - gain[a], sb = gloss[b] - gloss[a], sc = gloss[c] - gloss[a];
      const stepB = cy / area, stepC = -by / area;
      const pixels = source.data, result = output.data;
      for (let y = top; y <= bottom; y++) {
        let wb = ((left + .5 - ax) * cy - (y + .5 - ay) * cx) / area;
        let wc = (bx * (y + .5 - ay) - by * (left + .5 - ax)) / area;
        for (let x = left; x <= right; x++, wb += stepB, wc += stepC) {
          if (wb < -.00001 || wc < -.00001 || wb + wc > 1.00001) continue;
          const u = Math.max(0, Math.min(w - 1, u0 + wb * ub + wc * uc));
          const v = Math.max(0, Math.min(h - 1, v0 + wb * vb + wc * vc));
          const ix = Math.floor(u), iy = Math.floor(v), dx = u - ix, dy = v - iy;
          const i = (iy * w + ix) * 4, j = ix + 1 < w ? i + 4 : i, row = iy + 1 < h ? w * 4 : 0;
          const light = gain[a] + wb * gb + wc * gc, shine = gloss[a] + wb * sb + wc * sc;
          const dest = (y * w + x) * 4;
          for (let k = 0; k < 3; k++) {
            const upper = pixels[i + k] + dx * (pixels[j + k] - pixels[i + k]);
            const lower = pixels[i + row + k] + dx * (pixels[j + row + k] - pixels[i + row + k]);
            result[dest + k] = (upper + dy * (lower - upper)) * light + shine;
          }
        }
      }
    }

    return {
      name: "canvas2d",
      resize(width, height) {
        const ratio = Math.min(window.devicePixelRatio || 1, 1.5, 850 / width, 600 / height);
        w = canvas.width = Math.max(1, Math.round(width * ratio));
        h = canvas.height = Math.max(1, Math.round(height * ratio));
        const rect = photoSourceRect(photo, width, height);
        ctx.drawImage(photo, rect.x, rect.y, rect.width, rect.height, 0, 0, w, h);
        source = ctx.getImageData(0, 0, w, h);
        output = ctx.createImageData(w, h);
      },
      draw(flat) {
        if (flat) { ctx.putImageData(source, 0, 0); return; }
        output.data.set(source.data);
        for (let i = 0; i < count; i++) {
          const k = i * 5, u = uv[i * 2], v = uv[i * 2 + 1], z = surface[k + 2], perspective = 1 - .44 * z;
          xs[i] = (((u + surface[k]) * 2 - 1 + .10 * z) / perspective + 1) * w / 2;
          ys[i] = (((v + surface[k + 1]) * 2 - 1 - .14 * z) / perspective + 1) * h / 2;
          const sx = surface[k + 3], sy = surface[k + 4], normal = 1 / Math.hypot(sx, sy, 1);
          gain[i] = 1 + .55 * ((sx * .48 + sy * .60 + .64) * normal - .64);
          gloss[i] = 255 * .075 * ((Math.max(0, (sx * .48 + sy * .60 + 1.64) * normal / halfLength)) ** 16 - flatGloss);
          changed[i] = Math.abs(xs[i] - u * w) + Math.abs(ys[i] - v * h) > .06 || Math.abs(gain[i] - 1) + Math.abs(gloss[i] / 255) > .001;
        }
        for (let j = 0; j < faces.length; j += 3) triangle(faces[j], faces[j + 1], faces[j + 2]);
        ctx.putImageData(output, 0, 0);
      },
    };
  }

  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  function cloth(link) {
    const photo = link.querySelector("img");
    let canvas = link.querySelector(".cloth-canvas");
    const offset = new Float32Array(count * 3), speed = new Float32Array(count * 3);
    const surface = new Float32Array(count * 5);
    const pull = { x: 0, y: 0, dx: 0, dy: 0, angle: 0, touching: false };
    let renderer, visible = false, flat = true, frame = 0, last = 0, width = 0, height = 0, aspect = 1;

    function step(dt) {
      const horizontal = 940 / (aspect * aspect), vertical = 760;
      const damping = Math.exp(-5.5 * dt), co = Math.cos(pull.angle), si = Math.sin(pull.angle);
      const drag = Math.min(1, 8 * Math.hypot(pull.dx, pull.dy));
      let energy = 0;
      for (let y = 1; y < rows; y++) {
        for (let x = 1; x < columns; x++) {
          const i = y * stride + x, k = i * 3;
          const dx = (uv[i * 2] - pull.x) * aspect, dy = uv[i * 2 + 1] - pull.y;
          const contact = pull.touching ? Math.exp(-34 * (dx * dx + dy * dy)) : 0;
          const across = -dx * si + dy * co, along = dx * co + dy * si;
          const crease = .075 * drag * Math.cos(across * 29 + along * 4);
          const force = contact * 195;
          for (let axis = 0; axis < 3; axis++) {
            const j = k + axis, value = offset[j];
            const target = axis === 0 ? pull.dx - .24 * dx : axis === 1 ? pull.dy - .24 * dy : -.13 + crease;
            const tension = (offset[j - 3] + offset[j + 3] - 2 * value) * horizontal
              + (offset[j - stride * 3] + offset[j + stride * 3] - 2 * value) * vertical;
            speed[j] = (speed[j] + dt * (tension - 37 * value + force * (target - value))) * damping;
            energy = Math.max(energy, Math.abs(speed[j]));
          }
        }
      }
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
      if (!frame && visible && renderer && !document.hidden && !reduced.matches) {
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
        try { renderer.resize(width, height); } catch {
          reset();
          link.removeAttribute("data-cloth-ready");
          renderer = null; width = height = 0;
          return;
        }
      }
      paint();
      if (pull.touching) wake();
    }

    function touch(event) {
      if (reduced.matches || !event.isPrimary) return;
      const x = Math.max(0, Math.min(1, event.offsetX / link.clientWidth));
      const y = Math.max(0, Math.min(1, event.offsetY / link.clientHeight));
      if (pull.touching) {
        const dx = (x - pull.x) * aspect, dy = y - pull.y;
        if (Math.hypot(dx, dy) > .002) pull.angle = Math.atan2(dy, dx);
        pull.dx = Math.max(-.19, Math.min(.19, pull.dx + 1.55 * dx));
        pull.dy = Math.max(-.19, Math.min(.19, pull.dy + 1.55 * dy));
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
