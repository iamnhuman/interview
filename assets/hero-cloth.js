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
    attribute vec2 normalXY;
    uniform vec4 crop;
    varying vec2 texCoord;
    varying vec2 tilt;
    void main() {
      vec2 p = (uv + displacement.xy) * vec2(2., -2.) + vec2(-1., 1.);
      float z = displacement.z;
      gl_Position = vec4(p + vec2(.10, .14) * z, -.3 * z, 1. - .44 * z);
      texCoord = crop.xy + uv * crop.zw;
      tilt = normalXY;
    }`;
  const fragment = `
    #ifdef GL_ES
    precision highp float;
    #endif
    uniform sampler2D photo;
    varying vec2 texCoord;
    varying vec2 tilt;
    void main() {
      vec3 normal = vec3(tilt, sqrt(max(0., 1. - dot(tilt, tilt))));
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
    attribute("normalXY", 2, 20, 12);
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
      refresh() {
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, photo);
        if (gl.getError() !== gl.NO_ERROR) throw new Error("Texture upload failed");
      },
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
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        gl.drawElements(gl.TRIANGLES, faces.length, gl.UNSIGNED_SHORT, 0);
      },
    };
  }

  // Paint a continuous light field onto the photograph, then deform that texture.
  // Both canvases can draw local files without reading pixels from the photograph.
  function software(canvas, photo, surface) {
    const ctx = canvas.getContext("2d", { alpha: false });
    const texture = document.createElement("canvas");
    const source = texture.getContext("2d", { alpha: false });
    const lighting = document.createElement("canvas");
    lighting.width = stride; lighting.height = rows + 1;
    const lamp = lighting.getContext("2d");
    if (!ctx || !source || !lamp) return null;
    const light = lamp.createImageData(stride, rows + 1);
    const xs = new Float32Array(count), ys = new Float32Array(count);
    const changed = new Uint8Array(count);
    let w, h, photoX, photoY, photoWidth, photoHeight;

    function triangle(a, b, c) {
      if (!(changed[a] || changed[b] || changed[c])) return;
      const u = uv[2 * a] * w, v = uv[2 * a + 1] * h;
      const ub = uv[2 * b] * w - u, vb = uv[2 * b + 1] * h - v;
      const uc = uv[2 * c] * w - u, vc = uv[2 * c + 1] * h - v;
      const xb = xs[b] - xs[a], yb = ys[b] - ys[a], xc = xs[c] - xs[a], yc = ys[c] - ys[a];
      const det = ub * vc - uc * vb;
      const xx = (xb * vc - xc * vb) / det, xy = (xc * ub - xb * uc) / det;
      const yx = (yb * vc - yc * vb) / det, yy = (yc * ub - yb * uc) / det;
      // Overlap the subpixel antialias fringe with the same opaque, pre-lit texture.
      const cx = (xs[a] + xs[b] + xs[c]) / 3, cy = (ys[a] + ys[b] + ys[c]) / 3;
      const bleed = Math.min(.18, 2 / Math.max(1, Math.min(w / columns, h / rows)));
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(xs[a] + (xs[a] - cx) * bleed, ys[a] + (ys[a] - cy) * bleed);
      ctx.lineTo(xs[b] + (xs[b] - cx) * bleed, ys[b] + (ys[b] - cy) * bleed);
      ctx.lineTo(xs[c] + (xs[c] - cx) * bleed, ys[c] + (ys[c] - cy) * bleed);
      ctx.closePath(); ctx.clip();
      ctx.setTransform(xx, yx, xy, yy, xs[a] - xx * u - xy * v, ys[a] - yx * u - yy * v);
      ctx.drawImage(texture, 0, 0);
      ctx.restore();
    }

    return {
      name: "canvas2d",
      resize(width, height) {
        const ratio = Math.min(window.devicePixelRatio || 1, 1.5, 1100 / width, 900 / height);
        w = canvas.width = texture.width = Math.max(1, Math.round(width * ratio));
        h = canvas.height = texture.height = Math.max(1, Math.round(height * ratio));
        const crop = photoSourceRect(photo, width, height);
        const scaleX = w / crop.width, scaleY = h / crop.height;
        photoX = -crop.x * scaleX; photoY = -crop.y * scaleY;
        photoWidth = photo.naturalWidth * scaleX; photoHeight = photo.naturalHeight * scaleY;
        source.imageSmoothingEnabled = true;
      },
      draw(flat) {
        // Scale the whole source into the canvas, including density-corrected images.
        source.drawImage(photo, photoX, photoY, photoWidth, photoHeight);
        if (flat) { ctx.drawImage(texture, 0, 0); return; }
        for (let i = 0; i < count; i++) {
          const k = i * 5, u = uv[i * 2], v = uv[i * 2 + 1], z = surface[k + 2];
          const perspective = 1 - .44 * z;
          xs[i] = (((u + surface[k]) * 2 - 1 + .10 * z) / perspective + 1) * w / 2;
          ys[i] = (((v + surface[k + 1]) * 2 - 1 - .14 * z) / perspective + 1) * h / 2;
          changed[i] = Math.abs(xs[i] - u * w) + Math.abs(ys[i] - v * h) > .1;
          const nx = surface[k + 3], ny = surface[k + 4];
          const nz = Math.sqrt(Math.max(0, 1 - nx * nx - ny * ny));
          const shade = .46 * (-.48 * nx - .60 * ny + .64 * (nz - 1));
          const grey = shade > 0 ? 255 : 0, off = i * 4;
          light.data[off] = light.data[off + 1] = light.data[off + 2] = grey;
          light.data[off + 3] = Math.round(Math.min(.40, Math.abs(shade)) * 255);
        }
        lamp.putImageData(light, 0, 0);
        // Texel centres coincide with mesh vertices. Canvas interpolates light across each cell.
        source.drawImage(lighting, .5, .5, columns, rows, 0, 0, w, h);
        ctx.drawImage(texture, 0, 0);
        for (let i = 0; i < faces.length; i += 3) triangle(faces[i], faces[i + 1], faces[i + 2]);
      },
    };
  }

  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  function cloth(link) {
    const photo = link.querySelector("img");
    let canvas = link.querySelector(".cloth-canvas");
    const hero = Boolean(canvas);
    if (!canvas) {
      canvas = document.createElement("canvas");
      canvas.className = "cloth-canvas";
      canvas.setAttribute("aria-hidden", "true");
      const picture = link.querySelector(".cover-frame-photo") ?? link;
      picture.append(canvas);
    }
    link.draggable = false;
    photo.draggable = false;
    let sourceUrl = "";
    const offset = new Float32Array(count * 3), speed = new Float32Array(count * 3);
    const surface = new Float32Array(count * 5);
    const force = new Float32Array(count * 3);
    const hand = { x: .5, y: .5, u: .5, v: .5, active: false };
    let grip = null, suppressClick = false;
    let renderer, visible = false, flat = true, frame = 0, last = 0, width = 0, height = 0, aspect = 1;
    let revealed = false, fromScreen = null, settling = false;

    // Equal and opposite 3D spring forces along warp, weft and the two diagonals.
    // The two-node spans resist sharp bending; the perimeter stays attached to the frame.
    function springs(dx, dy, stiffness) {
      const rx = dx * aspect / columns, ry = dy / rows;
      const rest = Math.hypot(rx, ry), jump = (dx + dy * stride) * 3;
      const first = Math.max(0, -dx), end = columns - Math.max(0, dx);
      for (let y = 0; y <= rows - dy; y++) {
        for (let x = first; x <= end; x++) {
          const a = (y * stride + x) * 3, b = a + jump;
          const ex = rx + offset[b] - offset[a], ey = ry + offset[b + 1] - offset[a + 1], ez = offset[b + 2] - offset[a + 2];
          const length = Math.sqrt(ex * ex + ey * ey + ez * ez);
          const stretch = stiffness * (1 - rest / Math.max(.00001, length));
          const fx = stretch * ex, fy = stretch * ey, fz = stretch * ez;
          force[a] += fx; force[b] -= fx;
          force[a + 1] += fy; force[b + 1] -= fy;
          force[a + 2] += fz; force[b + 2] -= fz;
        }
      }
    }

    function step(dt) {
      force.fill(0);
      springs(1, 0, 2900); springs(0, 1, 2400);
      springs(1, 1, 850); springs(-1, 1, 850);
      springs(2, 0, 130); springs(0, 2, 110);

      const follow = 1 - Math.exp(-42 * dt);
      const hx = (hand.x - hand.u) * aspect * follow, hy = (hand.y - hand.v) * follow;
      hand.u += hx / aspect; hand.v += hy;
      const travel = Math.hypot(hx, hy);
      const velocityScale = Math.min(1 / dt, 2.8 / Math.max(.00001, travel));
      const brushX = hx * velocityScale, brushY = hy * velocityScale;
      const motion = Math.min(1, travel / Math.max(.00001, 1.8 * dt));
      const reach = .14 + .055 * motion;
      const lift = (reduced.matches ? .45 : 1) * (.032 + .115 * motion);
      const damping = Math.exp(-5.8 * dt);
      const pullX = grip ? grip.ox + Math.max(-.5, Math.min(.5, (hand.u - grip.u) * aspect)) : 0;
      const pullY = grip ? grip.oy + Math.max(-.5, Math.min(.5, hand.v - grip.v)) : 0;
      let energy = 0;
      for (let y = 1; y < rows; y++) {
        for (let x = 1; x < columns; x++) {
          const i = y * stride + x, k = i * 3, u = uv[i * 2], v = uv[i * 2 + 1];
          const ox = offset[k], oy = offset[k + 1], oz = offset[k + 2];
          let fx = force[k] - 22 * ox, fy = force[k + 1] - 22 * oy + .8 * Math.abs(oz), fz = force[k + 2] - 27 * oz;
          // Keep the same fibres in the hand throughout a drag.
          if (grip) {
            const dx = (u - grip.nodeU) * aspect, dy = v - grip.nodeV;
            const weight = Math.max(0, 1 - (dx * dx + dy * dy) / .012) ** 2;
            fx += weight * (620 * (pullX - ox) - 25 * speed[k]);
            fy += weight * (620 * (pullY - oy) - 25 * speed[k + 1]);
            fz += weight * (470 * (grip.lift - oz) - 19 * speed[k + 2]);
          } else if (hand.active) {
            const dx = (u - hand.u) * aspect + ox, dy = v - hand.v + oy;
            const weight = Math.max(0, 1 - (dx * dx + dy * dy) / (reach * reach)) ** 2;
            fx += weight * 55 * (brushX - speed[k]);
            fy += weight * 55 * (brushY - speed[k + 1]);
            fz += weight * (295 * (lift - oz) - 12 * speed[k + 2]);
          }
          speed[k] = (speed[k] + dt * fx) * damping;
          speed[k + 1] = (speed[k + 1] + dt * fy) * damping;
          speed[k + 2] = (speed[k + 2] + dt * fz) * damping;
          energy = Math.max(energy, Math.abs(speed[k]), Math.abs(speed[k + 1]), Math.abs(speed[k + 2]));
        }
      }
      for (let i = 0; i < offset.length; i++) offset[i] += speed[i] * dt;
      return energy;
    }

    function paint() {
      for (let y = 1; y < rows; y++) {
        for (let x = 1; x < columns; x++) {
          const i = y * stride + x, k = i * 3, j = i * 5;
          surface[j] = offset[k] / aspect;
          surface[j + 1] = offset[k + 1];
          surface[j + 2] = offset[k + 2];
          // The normal follows both tangents of the deformed photograph, including shear.
          const l = k - 3, r = k + 3, t = k - stride * 3, b = k + stride * 3;
          const ux = 2 * aspect / columns + offset[r] - offset[l], uy = offset[r + 1] - offset[l + 1], uz = offset[r + 2] - offset[l + 2];
          const vx = offset[b] - offset[t], vy = 2 / rows + offset[b + 1] - offset[t + 1], vz = offset[b + 2] - offset[t + 2];
          const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
          const inv = (nz < 0 ? -1 : 1) / Math.max(.000001, Math.sqrt(nx * nx + ny * ny + nz * nz));
          surface[j + 3] = nx * inv;
          surface[j + 4] = ny * inv;
        }
      }
      renderer.draw(flat);
      link.toggleAttribute("data-cloth-moving", !flat);
      link.setAttribute("data-cloth-ready", renderer.name);
    }

    function reset() {
      window.cancelAnimationFrame(frame);
      frame = 0; last = 0; hand.active = false; grip = null; flat = true; settling = false;
      link.removeAttribute("data-cloth-moving");
      offset.fill(0); speed.fill(0); surface.fill(0);
    }

    // A critically damped return starts with the last position and velocity of each vertex.
    function settle(dt) {
      const rate = reduced.matches ? 24 : 10;
      const decay = Math.exp(-rate * dt);
      let residual = 0;
      for (let i = 0; i < offset.length; i++) {
        const slope = speed[i] + rate * offset[i];
        offset[i] = (offset[i] + slope * dt) * decay;
        speed[i] = (speed[i] - rate * slope * dt) * decay;
        residual = Math.max(residual, Math.abs(offset[i]), Math.abs(speed[i]) / rate);
      }
      return residual * Math.max(width, height) > .1;
    }

    function update(now) {
      frame = 0;
      if (reduced.matches && !settling) {
        if (hand.active) { for (let i = 0; i < 6; i++) step(1 / 160); }
        else reset();
        paint();
        return;
      }
      const dt = Math.min(.05, last ? (now - last) / 1000 : 1 / 60);
      if (renderer.name === "canvas2d" && last && dt < 1 / 32) { frame = window.requestAnimationFrame(update); return; }
      last = now;
      let moving;
      if (settling) {
        moving = settle(dt);
      } else {
        const steps = Math.max(1, Math.ceil(dt * 160));
        let energy = 0;
        for (let n = 0; n < steps; n++) energy = step(dt / steps);
        moving = energy > .001 || Math.abs(hand.x - hand.u) + Math.abs(hand.y - hand.v) > .0002;
      }
      if (!moving && !hand.active) reset();
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
      if (!renderer && !hero && !hand.active) return;
      const src = photo.currentSrc || photo.src;
      if (sourceUrl && sourceUrl !== src) {
        reset();
        width = height = 0;
        try { renderer?.refresh?.(); } catch { useSoftware(); }
      }
      sourceUrl = src;
      if (!renderer) {
        if (window.location.protocol !== "file:" || src.startsWith("data:")) {
          try { renderer = webGL(canvas, photo, surface); } catch { renderer = null; }
        }
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
        if (hero && !reduced.matches && !hand.active) {
          for (let y = 1; y < rows; y++) {
            for (let x = 1; x < columns; x++) {
              const dx = (x / columns - (aspect > 1.2 ? .65 : .36)) * aspect, dy = y / rows - .32;
              const impulse = Math.max(0, 1 - (dx * dx + dy * dy) / .075) ** 2;
              const k = (y * stride + x) * 3;
              speed[k] = -.25 * impulse;
              speed[k + 2] = .85 * impulse;
            }
          }
          flat = false;
          wake();
        }
      }
      paint();
      if (hand.active) wake();
    }

    function touch(event) {
      if (event.isPrimary === false || !photo.complete || !photo.naturalWidth || !link.clientWidth || !link.clientHeight) return;
      const rect = link.getBoundingClientRect();
      const px = event.clientX - rect.left - rect.width / 2, py = event.clientY - rect.top - rect.height / 2;
      const localX = fromScreen ? fromScreen.a * px + fromScreen.c * py : px;
      const localY = fromScreen ? fromScreen.b * px + fromScreen.d * py : py;
      const x = Math.max(0, Math.min(1, .5 + localX / link.clientWidth));
      const y = Math.max(0, Math.min(1, .5 + localY / link.clientHeight));
      if (!hand.active) { hand.u = x; hand.v = y; }
      settling = false;
      hand.x = x; hand.y = y; hand.active = true; flat = false;
      if (!renderer) prepare();
      if (grip && Math.hypot(event.clientX - grip.clientX, event.clientY - grip.clientY) > 6) grip.moved = true;
      wake();
    }

    function pick(event) {
      if (event.isPrimary === false || event.button !== 0) return;
      suppressClick = false;
      touch(event);
      if (!renderer || !hand.active) return;
      let nearest = stride + 1, best = Infinity;
      for (let y = 1; y < rows; y++) {
        for (let x = 1; x < columns; x++) {
          const i = y * stride + x, k = i * 3, z = offset[k + 2], perspective = 1 - .44 * z;
          const dx = ((uv[2 * i] + offset[k] / aspect - .5 + .05 * z) / perspective + .5 - hand.x) * aspect;
          const dy = (uv[2 * i + 1] + offset[k + 1] - .5 - .07 * z) / perspective + .5 - hand.y;
          const distance = dx * dx + dy * dy;
          if (distance < best) { nearest = i; best = distance; }
        }
      }
      const k = nearest * 3;
      grip = { id: event.pointerId, u: hand.x, v: hand.y, nodeU: uv[2 * nearest], nodeV: uv[2 * nearest + 1],
        ox: offset[k], oy: offset[k + 1], lift: offset[k + 2] + (reduced.matches ? .055 : .14),
        clientX: event.clientX, clientY: event.clientY, moved: false };
      link.setPointerCapture(event.pointerId);
    }

    function release() {
      if (!hand.active) return;
      hand.active = false; grip = null; settling = true;
      wake();
    }
    function move(event) {
      if (grip ? grip.id === event.pointerId : event.pointerType !== "touch" && !event.buttons) touch(event);
    }
    link.addEventListener("pointerenter", move);
    link.addEventListener("pointermove", move);
    link.addEventListener("pointerdown", pick);
    link.addEventListener("pointerleave", event => { if (!grip && event.isPrimary !== false) release(); });
    link.addEventListener("pointercancel", event => { if (grip && grip.id === event.pointerId) release(); });
    link.addEventListener("lostpointercapture", event => { if (grip && grip.id === event.pointerId) release(); });
    link.addEventListener("pointerup", event => {
      if (!grip || grip.id !== event.pointerId) return;
      suppressClick = grip.moved;
      release();
    });
    link.addEventListener("click", event => {
      if (!suppressClick || event.detail === 0) return;
      suppressClick = false;
      event.preventDefault();
      event.stopImmediatePropagation();
    }, true);
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

  function start() { document.querySelectorAll("[data-photo], .lightbox-photo").forEach(cloth); }
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
