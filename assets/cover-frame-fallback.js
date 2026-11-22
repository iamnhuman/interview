"use strict";

const animateCoverFrameFallback = (() => {
  const sources = {
    "cover-stage": "assets/frames/cover-sigil.webp?v=2",
    "cover-detail": "assets/frames/cover-rig.webp",
  };
  const frames = new WeakMap();
  const slice = .32;

  function axis(length, cap, size, pins) {
    const marks = new Set([0, cap, length - cap, length]);
    for (const pin of pins) if (pin > 0 && pin < length) marks.add(pin);
    for (let step = 1; step < 3; step++) {
      marks.add(cap * step / 3);
      marks.add(length - cap * step / 3);
    }
    for (let step = 1; step < 6; step++) marks.add(cap + (length - 2 * cap) * step / 6);
    return [...marks].sort((a, b) => a - b).map(position => {
      let fraction;
      if (position <= cap) fraction = position / cap * slice;
      else if (position >= length - cap) fraction = 1 - (length - position) / cap * slice;
      else fraction = slice + (position - cap) / (length - 2 * cap) * (1 - 2 * slice);
      return { position, texel: size * fraction };
    });
  }

  function fit(photo, canvas, image) {
    const frame = getComputedStyle(photo, "::after"), style = getComputedStyle(canvas);
    const cap = parseFloat(frame.borderTopWidth), padding = parseFloat(frame.getPropertyValue("--cover-frame-padding"));
    const canvasWidth = parseFloat(style.width), canvasHeight = parseFloat(style.height);
    const width = canvasWidth - 2 * padding, height = canvasHeight - 2 * padding;
    if (!(cap > 0 && width > 2 * cap && height > 2 * cap && photo.clientWidth && photo.clientHeight)) return;
    const left = -parseFloat(style.left) - padding, top = -parseFloat(style.top) - padding;
    const right = left + photo.clientWidth, bottom = top + photo.clientHeight;
    const pin = Math.max(4, .085 * cap);
    const columns = axis(width, cap, image.naturalWidth, [left - pin, right + pin]);
    const rows = axis(height, cap, image.naturalHeight, [top - pin, bottom + pin]);
    const points = rows.map(row => columns.map(column => {
      const x = column.position, y = row.position;
      // Leave a fixed strip of metal over the photograph, including between mesh vertices.
      const outside = Math.max(left - x, x - right, top - y, y - bottom);
      const amount = Math.min(1, Math.max(0, (outside - pin) / (.45 * cap)));
      return { x: x + padding, y: y + padding, u: column.texel, v: row.texel,
        phaseA: 16 * x / width + 5 * y / height, phaseB: -7 * x / width + 15 * y / height,
        flex: amount * amount * (3 - 2 * amount) * cap / 108 };
    }));
    const faces = [];
    for (let row = 0; row < rows.length - 1; row++) {
      for (let column = 0; column < columns.length - 1; column++) {
        if (columns[column].position >= cap && columns[column + 1].position <= width - cap
          && rows[row].position >= cap && rows[row + 1].position <= height - cap) continue;
        const a = points[row][column], b = points[row][column + 1];
        const c = points[row + 1][column], d = points[row + 1][column + 1];
        if (b.u - a.u > .001 && c.v - a.v > .001) faces.push([a, b, c], [d, c, b]);
      }
    }
    const ratio = Math.min(window.devicePixelRatio || 1, 1.5, 1300 / Math.max(canvasWidth, canvasHeight));
    canvas.width = Math.ceil(canvasWidth * ratio);
    canvas.height = Math.ceil(canvasHeight * ratio);
    return { faces, points: points.flat(), ratio };
  }

  function paintTriangle(context, image, ratio, a, b, c) {
    const xx = (b.px - a.px) / (b.u - a.u), yx = (b.py - a.py) / (b.u - a.u);
    const xy = (c.px - a.px) / (c.v - a.v), yy = (c.py - a.py) / (c.v - a.v);
    const centerX = (a.px + b.px + c.px) / 3, centerY = (a.py + b.py + c.py) / 3;
    context.save();
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    context.beginPath();
    for (const point of [a, b, c]) {
      const dx = point.px - centerX, dy = point.py - centerY;
      const bleed = .65 / Math.max(1, Math.hypot(dx, dy));
      context.lineTo(point.px + dx * bleed, point.py + dy * bleed);
    }
    context.closePath();
    context.clip();
    context.transform(xx, yx, xy, yy, a.px - xx * a.u - xy * a.v, a.py - yx * a.u - yy * a.v);
    context.drawImage(image, 0, 0);
    context.restore();
  }

  function attach(photo) {
    const reduced = matchMedia("(prefers-reduced-motion: reduce)");
    let canvas, context, image, url, shape;
    let hovered = false, frame = 0, previous = 0, time = 0, strength = 0;
    const available = () => photo.hasAttribute("data-cover-frame-fallback") && !document.hidden;

    function schedule() {
      if (!frame && image?.complete && image.naturalWidth && available()) frame = requestAnimationFrame(draw);
    }

    function draw(stamp) {
      frame = 0;
      if (!available()) { previous = strength = 0; return; }
      const elapsed = previous ? stamp - previous : 1000 / 30;
      if (elapsed < 31) { schedule(); return; }
      shape ??= fit(photo, canvas, image);
      if (!shape) return;
      const dt = Math.min(.06, elapsed / 1000), calm = reduced.matches;
      const delta = (hovered ? (calm ? .8 : 1) : 0) - strength;
      strength += Math.abs(delta) < .003 ? delta : delta * (1 - Math.exp(-7 * dt));
      time += dt * (calm ? .56 : 1);
      for (const point of shape.points) {
        const a = point.phaseA - 2.1 * time, b = point.phaseB + 1.34 * time;
        const amount = strength * point.flex;
        point.px = point.x + amount * (9 * Math.sin(a) + 4 * Math.sin(b));
        point.py = point.y + amount * (9 * Math.cos(b) + 4 * Math.cos(a));
      }
      context.clearRect(0, 0, canvas.width, canvas.height);
      for (const [a, b, c] of shape.faces) paintTriangle(context, image, shape.ratio, a, b, c);
      photo.toggleAttribute("data-cover-frame-software", true);
      previous = hovered || strength ? stamp : 0;
      if (previous) schedule();
    }

    function start() {
      const next = sources[photo.dataset.mediaFrame];
      if (!next || !available()) return;
      if (!canvas) {
        canvas = document.createElement("canvas");
        context = canvas.getContext("2d");
        if (!context) { canvas = undefined; return; }
        canvas.className = "cover-frame-canvas cover-frame-software";
        canvas.setAttribute("aria-hidden", "true");
        photo.append(canvas);
        new ResizeObserver(() => {
          shape = undefined;
          if (hovered || photo.hasAttribute("data-cover-frame-software")) schedule();
        }).observe(canvas);
      }
      hovered = true;
      if (next !== url) {
        url = next;
        shape = undefined;
        photo.removeAttribute("data-cover-frame-software");
        image = new Image();
        image.onload = schedule;
        image.src = url;
      }
      schedule();
    }

    function follow(event) {
      if (event.pointerType === "mouse" || event.pointerType === "pen") start();
    }
    photo.addEventListener("pointerenter", follow);
    photo.addEventListener("pointermove", follow, { passive: true });
    photo.addEventListener("pointerleave", () => { hovered = false; if (strength) schedule(); });
    return start;
  }

  return photo => {
    if (!frames.has(photo)) frames.set(photo, attach(photo));
    if (matchMedia("(any-hover: hover)").matches && photo.matches(":hover")) frames.get(photo)();
  };
})();
