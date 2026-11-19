"use strict";

function initDisplaySwitch(name, pressedValue, unpressedValue, onChange) {
  const root = document.documentElement;
  const attribute = `data-${name}`;
  const control = document.querySelector(`[${attribute}-switch]`);

  function setPressed(pressed) {
    const value = pressed ? pressedValue : unpressedValue;
    root.setAttribute(attribute, value);
    control.setAttribute("aria-pressed", String(pressed));
    onChange?.(value, control);
  }

  control.addEventListener("click", () => setPressed(control.getAttribute("aria-pressed") !== "true"));
  window.addEventListener("pageshow", event => {
    if (event.persisted) setPressed(false);
  });
  setPressed(false);
  control.hidden = false;
}

function initDisplaySettings() {
  const meta = document.querySelector('meta[name="theme-color"]');
  initDisplaySwitch("theme", "light", "dark", (theme, control) => {
    meta?.setAttribute("content", theme === "light" ? "#eeefef" : "#000000");
    control.title = theme === "light" ? "Включить тёмную тему" : "Включить светлую тему";
  });
  initDisplaySwitch("artist-style", "quoted", "bold", (style, control) => {
    control.title = style === "quoted" ? "Скрыть кавычки" : "Показать кавычки";
  });
}

// Keep artist typography in excerpts while leaving links and other interactive markup in the article.
function copyReadingText(target, source) {
  const copy = source.cloneNode(true);
  for (const note of copy.querySelectorAll(".source-ref, .source-list")) note.remove();
  for (const element of copy.querySelectorAll(":not(.artist-name, .artist-quote)")) {
    element.replaceWith(...element.childNodes);
  }
  target.replaceChildren(...copy.childNodes);
}

function initCoverMotion() {
  const cover = document.querySelector(".cover-heading");
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  let frame = 0;
  let visible = true;
  let pointerX = 0;
  let pointerY = 0;

  function update() {
    frame = 0;
    const bounds = cover.getBoundingClientRect();
    const phase = reduced.matches ? 0 : Math.max(0, Math.min(1, -bounds.top / Math.max(1, bounds.height)));
    const x = reduced.matches ? 0 : pointerX;
    const y = reduced.matches ? 0 : pointerY;
    cover.style.setProperty("--cover-turn", `${-8 + x * 13 + phase * 28}deg`);
    cover.style.setProperty("--cover-lean", `${x * 20}deg`);
    cover.style.setProperty("--cover-drift", `${y * 5 + phase * 12}px`);
  }

  function schedule() {
    if (!frame && visible) frame = window.requestAnimationFrame(update);
  }

  cover.addEventListener("pointermove", (event) => {
    if (reduced.matches || event.pointerType === "touch") return;
    const bounds = cover.getBoundingClientRect();
    pointerX = Math.max(-1, Math.min(1, (event.clientX - bounds.left) / bounds.width * 2 - 1));
    pointerY = Math.max(-1, Math.min(1, (event.clientY - bounds.top) / bounds.height * 2 - 1));
    schedule();
  });
  cover.addEventListener("pointerleave", () => { pointerX = 0; pointerY = 0; schedule(); });
  const visibility = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    if (visible) schedule();
  });
  visibility.observe(cover);
  window.addEventListener("scroll", schedule, { passive: true });
  window.addEventListener("resize", schedule);
  reduced.addEventListener("change", schedule);
  schedule();
}

function positionOnTimeline(stops, scrollTop) {
  const last = stops.length - 1;
  if (last < 1 || stops[last] <= 0 || scrollTop <= 0) return 0;
  if (scrollTop >= stops[last]) return 1;
  let segment = 0;
  while (segment < last - 1 && stops[segment + 1] <= scrollTop) segment += 1;
  const length = stops[segment + 1] - stops[segment];
  return (segment + (length > 0 ? (scrollTop - stops[segment]) / length : 0)) / last;
}

function scrollTopOnTimeline(stops, position) {
  const last = stops.length - 1;
  if (last < 1) return 0;
  const progress = Math.max(0, Math.min(1, position)) * last;
  const segment = Math.min(last - 1, Math.floor(progress));
  return stops[segment] + (stops[segment + 1] - stops[segment]) * (progress - segment);
}

function initReadingPosition() {
  const root = document.documentElement;
  const navigation = document.querySelector("[data-sigil-navigation]");
  const rail = document.querySelector("[data-sigil-scroll]");
  const thumb = rail.querySelector("[data-scroll-thumb]");
  const questions = [...document.querySelectorAll(".turn.question, .dialogue-aside")];
  if (!questions.length) return;
  const cover = document.getElementById("start");
  const end = document.getElementById("end");
  const sections = [{
    id: cover.id, label: "Начало интервью",
    sigil: cover.querySelector(".heading-sigil").getAttribute("src"),
  }, ...questions.map((question, index) => ({
    id: question.id, label: `Вопрос ${index + 1} из ${questions.length}`,
    number: `${String(index + 1).padStart(2, "0")} / ${questions.length}`,
    copy: question.querySelector(".question-copy"),
    sigil: questionSigilSource(index),
  })), {
    id: end.id, label: end.getAttribute("aria-label"),
    sigil: end.querySelector(".footer-sigil").getAttribute("src"),
  }];
  const jumpList = navigation.querySelector("[data-question-jumps]");
  const activeSigil = document.createElement("img");
  activeSigil.className = "question-symbol";
  activeSigil.alt = "";
  activeSigil.draggable = false;
  thumb.append(activeSigil);
  const preview = document.createElement("div");
  preview.className = "question-preview";
  preview.hidden = true;
  preview.setAttribute("role", "tooltip");
  const previewNumber = document.createElement("span");
  previewNumber.className = "question-preview-number";
  const previewText = document.createElement("p");
  const previewAddress = document.createElement("span");
  previewAddress.className = "question-preview-url";
  const previewSigil = document.createElement("img");
  previewSigil.className = "question-preview-sigil";
  previewSigil.width = 96;
  previewSigil.height = 36;
  previewSigil.alt = "";
  preview.append(previewNumber, previewText, previewSigil, previewAddress);
  navigation.append(preview);
  let previewIndex = -1;
  let activeIndex = -1;
  let stops = [0, 0];
  let dirty = true;
  let frame = 0;
  let drag = null;

  function setTabStop(index) {
    for (let i = 0; i < jumps.length; i += 1) jumps[i].tabIndex = i === index ? 0 : -1;
  }

  function placePreview() {
    if (previewIndex < 0) return;
    const rect = jumps[previewIndex].getBoundingClientRect();
    const top = navigation.getBoundingClientRect().top + 4;
    const height = preview.offsetHeight;
    const bottom = Math.max(top, window.innerHeight - height - 12);
    const previewTop = Math.max(top, Math.min(bottom, rect.top + (rect.height - height) / 2));
    const sigil = activeSigil.getBoundingClientRect();
    preview.style.top = `${previewTop}px`;
    activeSigil.style.visibility = sigil.bottom > previewTop && sigil.top < previewTop + height ? "hidden" : "";
  }

  function showPreview(index) {
    previewIndex = index;
    const section = sections[index];
    preview.classList.toggle("endpoint-preview", section.id === cover.id || section.id === end.id);
    previewNumber.textContent = section.number || "";
    previewNumber.hidden = !section.number;
    if (section.copy) copyReadingText(previewText, section.copy);
    else previewText.textContent = section.label;
    previewAddress.textContent = jumps[index].getAttribute("href");
    previewSigil.src = section.sigil;
    preview.hidden = false;
    placePreview();
  }

  function hidePreview() {
    previewIndex = -1;
    preview.hidden = true;
    activeSigil.style.visibility = "";
  }

  const jumps = sections.map((section, index) => {
    const link = document.createElement("a");
    link.className = "question-jump";
    link.href = `#${section.id}`;
    link.setAttribute("aria-label", section.label);
    if (section.copy) {
      link.id = `jump-${section.id}`;
      link.setAttribute("aria-labelledby", `${link.id} ${section.copy.id}`);
    }
    link.tabIndex = index === 0 ? 0 : -1;
    link.addEventListener("pointerenter", () => showPreview(index));
    link.addEventListener("pointerleave", () => {
      if (previewIndex === index && document.activeElement !== link) hidePreview();
    });
    link.addEventListener("focus", () => { setTabStop(index); showPreview(index); });
    link.addEventListener("blur", hidePreview);
    link.addEventListener("click", hidePreview);
    link.addEventListener("keydown", (event) => {
      if (event.key === "Escape") { hidePreview(); return; }
      const next = { ArrowUp: index - 1, ArrowDown: index + 1, Home: 0, End: sections.length - 1 }[event.key];
      if (typeof next !== "number") return;
      event.preventDefault();
      jumps[Math.max(0, Math.min(jumps.length - 1, next))].focus({ preventScroll: true });
    });
    jumpList.append(link);
    return link;
  });

  function scrollExtent() {
    return Math.max(0, root.scrollHeight - window.innerHeight);
  }

  function measure() {
    const extent = scrollExtent();
    const offset = parseFloat(getComputedStyle(questions[0]).scrollMarginTop) || 0;
    stops = [0, ...questions.map(question => Math.max(0, Math.min(extent, question.getBoundingClientRect().top + window.scrollY - offset))), extent];
    const travel = Math.max(0, rail.clientHeight - thumb.offsetHeight);
    const interval = travel / (stops.length - 1);
    for (let i = 0; i < jumps.length; i += 1) {
      jumps[i].style.top = `${thumb.offsetHeight / 2 + interval * i}px`;
      jumps[i].style.height = `${Math.max(1, interval)}px`;
    }
    dirty = false;
  }

  function update() {
    frame = 0;
    if (dirty || stops[stops.length - 1] !== scrollExtent()) measure();
    const scrollTop = window.scrollY;
    let current = 0;
    // Fragment navigation can land a fraction of a pixel before the stop.
    while (scrollTop > 0 && current + 1 < sections.length && stops[current + 1] - scrollTop < 1) current++;
    const position = positionOnTimeline(stops, Math.max(scrollTop, stops[current]));
    const travel = Math.max(0, rail.clientHeight - thumb.offsetHeight);
    thumb.style.transform = `translateY(${position * travel}px)`;
    rail.setAttribute("aria-valuenow", String(Math.round(position * 100)));
    if (current !== activeIndex) {
      if (activeIndex >= 0) jumps[activeIndex].removeAttribute("aria-current");
      rail.setAttribute("aria-valuetext", sections[current].label);
      activeSigil.src = sections[current].sigil;
      activeSigil.classList.toggle("cover-symbol", current === 0);
      activeSigil.classList.toggle("end-symbol", sections[current].id === end.id);
      jumps[current].setAttribute("aria-current", "location");
      activeIndex = current;
      if (!jumps.includes(document.activeElement)) setTabStop(current);
    }
    placePreview();
  }

  function schedule() {
    if (!frame) frame = window.requestAnimationFrame(update);
  }

  function invalidate() { dirty = true; schedule(); }

  function moveThumb(clientY) {
    if (dirty) measure();
    const travel = Math.max(1, rail.clientHeight - thumb.offsetHeight);
    const offset = clientY - rail.getBoundingClientRect().top - drag.offset;
    const position = Math.max(0, Math.min(1, offset / travel));
    window.scrollTo({ top: scrollTopOnTimeline(stops, position), behavior: "instant" });
    schedule();
  }

  function finishDrag(event) {
    if (!drag || event.pointerId !== drag.id) return;
    drag = null;
    root.classList.remove("is-sigil-dragging");
    if (rail.hasPointerCapture(event.pointerId)) rail.releasePointerCapture(event.pointerId);
  }

  rail.addEventListener("pointerdown", (event) => {
    if (event.button !== 0 || !event.isPrimary) return;
    event.preventDefault();
    hidePreview();
    const onThumb = thumb.contains(event.target);
    drag = { id: event.pointerId, offset: onThumb ? event.clientY - thumb.getBoundingClientRect().top : thumb.offsetHeight / 2 };
    rail.focus({ preventScroll: true });
    rail.setPointerCapture(event.pointerId);
    root.classList.add("is-sigil-dragging");
    moveThumb(event.clientY);
  });
  rail.addEventListener("pointermove", (event) => {
    if (drag?.id === event.pointerId) moveThumb(event.clientY);
  });
  rail.addEventListener("pointerup", finishDrag);
  rail.addEventListener("pointercancel", finishDrag);
  rail.addEventListener("lostpointercapture", finishDrag);
  rail.addEventListener("keydown", (event) => {
    const page = window.innerHeight * .85;
    const steps = { ArrowUp: -48, ArrowDown: 48, PageUp: -page, PageDown: page, Home: -window.scrollY, End: scrollExtent() - window.scrollY, " ": event.shiftKey ? -page : page };
    const delta = steps[event.key];
    if (typeof delta !== "number") return;
    event.preventDefault();
    window.scrollTo({ top: Math.max(0, Math.min(scrollExtent(), window.scrollY + delta)), behavior: "instant" });
    schedule();
  });

  const resize = new ResizeObserver(invalidate);
  resize.observe(document.body);
  resize.observe(rail);
  navigation.hidden = false;
  root.classList.add("has-sigil-scroll");
  window.addEventListener("scroll", schedule, { passive: true });
  window.addEventListener("resize", invalidate);
  window.addEventListener("load", invalidate);
  document.fonts?.ready.then(invalidate);
  update();
}

function initHeaderPlayback(media) {
  const header = document.querySelector(".masthead");
  const player = header.querySelector("[data-header-player]");
  const toggle = header.querySelector("[data-header-toggle]");
  const stop = header.querySelector("[data-header-stop]");
  const jump = header.querySelector("[data-header-jump]");
  const title = header.querySelector("[data-header-track]");
  const artist = header.querySelector("[data-header-artist]");
  const art = header.querySelector("[data-header-art]");
  const thumbnail = header.querySelector("[data-header-video]");
  const thumbnailContext = thumbnail.getContext("2d", { alpha: false });
  let active = null;
  let inlineControls = null;
  let inlineVisible = false;
  let headerHeight = -1;
  let visibility;

  function controlsInView() {
    const rect = inlineControls?.getBoundingClientRect();
    return Boolean(rect && rect.width > 0 && rect.height > 0 &&
      rect.bottom > headerHeight && rect.top < window.innerHeight);
  }

  function updateVisibility() {
    const visible = controlsInView();
    if (inlineVisible === visible) return;
    inlineVisible = visible;
    sync();
  }

  function setActive(item) {
    active = item;
    const owner = item?.closest("[data-audio-player], [data-video-gallery]");
    const controls = owner?.querySelector(".media-controls:not([hidden])") || item;
    if (controls !== inlineControls) {
      visibility.disconnect();
      inlineControls = controls;
      if (controls) visibility.observe(controls);
    }
    inlineVisible = controlsInView();
    sync();
  }

  function showProgress() {
    const progress = active && Number.isFinite(active.duration) && active.duration > 0
      ? Math.min(1, Math.max(0, active.currentTime / active.duration)) : 0;
    player.style.setProperty("--header-fill", `${progress * 100}%`);
  }

  function showVideoFrame() {
    thumbnail.hidden = true;
    if (active?.tagName !== "VIDEO") return;
    art.hidden = !active.getAttribute("poster");
    if (!thumbnailContext || player.hidden || document.hidden || active.readyState < 2) return;
    const size = Math.min(active.videoWidth, active.videoHeight);
    if (!size) return;
    try {
      thumbnailContext.drawImage(active, (active.videoWidth - size) / 2, (active.videoHeight - size) / 2,
        size, size, 0, 0, thumbnail.width, thumbnail.height);
      thumbnail.hidden = false;
      art.hidden = true;
    } catch { /* The poster stays visible until a decoded frame is available. */ }
  }

  function sync() {
    const hadFocus = player.contains(document.activeElement);
    player.hidden = !active || inlineVisible;
    header.toggleAttribute("data-media-playing", Boolean(active && !active.paused && !active.ended));
    if (active) {
      const name = active.getAttribute("aria-label");
      const video = active.tagName === "VIDEO";
      const currentPlayer = active.closest("[data-audio-player], [data-video-gallery]");
      const audioRow = active.closest(".track-entry") || currentPlayer;
      const clips = video ? [...currentPlayer.querySelectorAll("video")] : [];
      const trackTitle = currentPlayer.querySelector(".version-title") || audioRow.querySelector(".track-title");
      artist.textContent = video ? `Видео · ${clips.indexOf(active) + 1} / ${clips.length}` :
        [trackTitle?.querySelector(".track-artist")?.textContent, audioRow.dataset.version].filter(Boolean).join(" · ");
      artist.hidden = !artist.textContent;
      title.textContent = video ? currentPlayer.getAttribute("aria-label") : trackTitle.querySelector("strong").textContent;
      const poster = video ? active.getAttribute("poster") : null;
      art.hidden = !poster;
      if (poster && art.getAttribute("src") !== poster) art.setAttribute("src", poster);
      if (!poster) art.removeAttribute("src");
      const action = active.paused ? "Продолжить" : "Пауза";
      toggle.title = action;
      toggle.setAttribute("aria-label", `${action} — ${name}`);
      stop.title = video ? "Остановить видео" : "Выключить трек";
      stop.setAttribute("aria-label", stop.title + " — " + name);
      jump.href = "#" + (video ? active.id : audioRow.id);
      jump.title = video ? "Перейти к видео" : "Перейти к треку";
      jump.setAttribute("aria-label", jump.title + " — " + name);
      if (inlineVisible && hadFocus) (currentPlayer.querySelector("[data-media-play]") || active).focus({ preventScroll: true });
    } else if (hadFocus) {
      header.querySelector(".wordmark").focus({ preventScroll: true });
    }
    showProgress();
    showVideoFrame();
  }

  function measureHeader() {
    const height = Math.ceil(header.getBoundingClientRect().height);
    if (height === headerHeight) return;
    headerHeight = height;
    document.documentElement.style.setProperty("--header-height", `${height}px`);
    visibility?.disconnect();
    visibility = new IntersectionObserver(updateVisibility, {
      rootMargin: `-${height}px 0px 0px 0px`, threshold: [0, .01]
    });
    if (inlineControls) visibility.observe(inlineControls);
    updateVisibility();
  }
  measureHeader();
  new ResizeObserver(measureHeader).observe(header);

  toggle.addEventListener("click", () => {
    if (!active) return;
    if (active.paused) playMedia(active);
    else active.pause();
  });
  stop.addEventListener("click", () => {
    active?.pause();
    setActive(null);
  });
  document.addEventListener("interviewclipchange", event => {
    if (active !== event.detail.previous) return;
    setActive(event.detail.current);
  });
  for (const item of media) {
    item.addEventListener("play", () => {
      if (item.paused || item.ended) return;
      setActive(item);
      pauseOtherMedia(item, media);
    });
    for (const event of ["timeupdate", "durationchange", "seeked", "loadeddata"]) {
      item.addEventListener(event, () => {
        if (active === item) { showProgress(); showVideoFrame(); }
      });
    }
    item.addEventListener("pause", () => { if (active === item) sync(); });
    for (const event of ["ended", "error", "emptied"]) item.addEventListener(event, () => {
      if (active === item) setActive(null);
    });
  }
  sync();
}

function unpackSpectrum(track) {
  const bytes = atob(track.edgeLevels);
  const levels = new Uint8Array(bytes.length * 2);
  for (let i = 0; i < bytes.length; i++) {
    const pair = bytes.charCodeAt(i);
    levels[i * 2] = pair >> 4;
    levels[i * 2 + 1] = pair & 15;
  }
  return levels;
}

function createSpectrumRenderer(canvas, levels, bands, total) {
  const ctx = canvas.getContext("2d", { alpha: false });
  if (!ctx) return null;
  const frames = levels.length / bands;
  let width = 0, height = 0, scale = 0, rows, columns, overview, ordinates, ink, paper;
  let lastSeconds = NaN, lastPlaying;

  function amplitude(framePosition, band) {
    const pos = Math.max(0, Math.min(frames - 1, framePosition));
    const frame = Math.floor(pos), mix = pos - frame;
    const a = levels[frame * bands + band];
    const b = levels[Math.min(frame + 1, frames - 1) * bands + band];
    return (a + (b - a) * mix) / 15;
  }

  function resize(w, h) {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    if (!w || !h || (width === w && height === h && scale === dpr)) return;
    width = w; height = h; scale = dpr;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    ctx.setTransform(canvas.width / w, 0, 0, canvas.height / h, 0, 0);
    ink = ctx.createLinearGradient(0, 0, w, 0);
    ink.addColorStop(0, "#6a6a6a"); ink.addColorStop(.58, "#969696"); ink.addColorStop(1, "#e2e2e2");
    paper = ctx.createLinearGradient(0, 0, 0, h);
    paper.addColorStop(0, "#111111"); paper.addColorStop(1, "#070707");
    ctx.lineJoin = "round";
    rows = Math.min(bands, Math.max(12, Math.round(h / 8)));
    columns = Math.min(320, Math.max(80, Math.round(w / 5)));
    overview = new Float32Array(rows * (columns + 1));
    ordinates = new Float32Array(overview.length);
    for (let row = 0; row < rows; row++) {
      const band = Math.round(row * (bands - 1) / (rows - 1));
      for (let x = 0; x <= columns; x++) {
        overview[row * (columns + 1) + x] = amplitude(x / columns * (frames - 1), band) ** 2;
      }
    }
    lastPlaying = undefined;
  }

  function draw(seconds, playing) {
    if (!width || !height || (lastPlaying === playing && (!playing || Math.abs(seconds - lastSeconds) < 1 / 36))) return;
    lastSeconds = seconds; lastPlaying = playing;
    ctx.fillStyle = paper; ctx.fillRect(0, 0, width, height);
    const dx = width / columns;
    const head = width * seconds / total, radius = Math.min(130, width * .2);
    const framesPerSecond = (frames - 1) / total;
    let stroke = ink;
    if (playing) {
      stroke = ctx.createLinearGradient(head - radius, 0, head + radius, 0);
      stroke.addColorStop(0, "#a3a3a3"); stroke.addColorStop(.5, "#fafafa"); stroke.addColorStop(1, "#777777");
    }

    let top = Infinity, bottom = -Infinity;
    for (let row = 0; row < rows; row++) {
      const band = Math.round(row * (bands - 1) / (rows - 1));
      const base = .72 * row / (rows - 1);
      const start = row * (columns + 1);
      const end = start + columns;
      for (let x = 0; x <= columns; x++) {
        const i = start + x;
        let energy = overview[i];
        const distance = (x * dx - head) / radius;
        if (playing && Math.abs(distance) < 1) {
          // Each band lifts with the recorded transient passing the playhead.
          const sample = (seconds - Math.abs(distance) * .85) * framesPerSecond;
          const level = amplitude(sample, band);
          const attack = Math.max(0, level - amplitude(sample - 2, band));
          energy += (1 - distance * distance) ** 2 * (.48 * level * level + .95 * attack);
        }
        ordinates[i] = base - energy * .24;
      }
      top = Math.min(top, ordinates[start], ordinates[end]);
      bottom = Math.max(bottom, ordinates[start], ordinates[end]);
      // The quadratic curves round the sample peaks. Measure their visible extrema.
      for (let i = start + 1; i < end; i++) {
        const center = ordinates[i];
        const left = ordinates[i - 1] - center, right = ordinates[i + 1] - center;
        if (left * right < 0) continue;
        const turn = left && right ? center + .5 * left * right / (left + right) : center;
        top = Math.min(top, turn);
        bottom = Math.max(bottom, turn);
      }
    }

    // Fit the recorded ridges between equal margins, including transient peaks.
    const inset = height * .1;
    const yScale = (height - 2 * inset) / (bottom - top);
    for (let row = 0; row < rows; row++) {
      const start = row * (columns + 1);
      let lastY = inset + (ordinates[start] - top) * yScale;
      ctx.beginPath();
      ctx.moveTo(0, lastY);
      for (let x = 1; x <= columns; x++) {
        const y = inset + (ordinates[start + x] - top) * yScale;
        ctx.quadraticCurveTo((x - 1) * dx, lastY, (x - .5) * dx, (lastY + y) / 2);
        lastY = y;
      }
      ctx.lineTo(width, lastY);
      ctx.strokeStyle = stroke; ctx.lineWidth = row === rows - 1 ? 1.45 : 1.1; ctx.stroke();
      ctx.lineTo(width, height); ctx.lineTo(0, height); ctx.closePath();
      ctx.fillStyle = "rgba(16,16,16,.81)"; ctx.fill();
    }
  }
  return { resize, draw };
}

function bindSpectrumSeek(plot, seek) {
  let gesture = null;
  function point(event, commit) {
    const rect = plot.getBoundingClientRect();
    if (!rect.width) return;
    const fraction = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
    const seconds = Number(seek.max) * fraction;
    plot.setAttribute("data-preview", timeLabel(seconds));
    plot.style.setProperty("--probe", fraction * 100 + "%");
    if (commit) {
      gesture.lastX = event.clientX;
      if (Number(seek.value) === seconds) return;
      seek.value = String(seconds);
      seek.dispatchEvent(new Event("input", { bubbles: true }));
    }
  }
  plot.addEventListener("pointerdown", event => {
    if (!event.isPrimary || event.button !== 0) return;
    gesture = { id: event.pointerId, x: event.clientX, y: event.clientY, tap: event.pointerType === "touch" };
    plot.setPointerCapture(event.pointerId);
    if (!gesture.tap) {
      seek.focus({ preventScroll: true });
      point(event, true);
    }
  });
  plot.addEventListener("pointermove", event => {
    if (!gesture) {
      if (event.pointerType === "mouse" || event.pointerType === "pen") point(event, false);
      return;
    }
    if (event.pointerId !== gesture.id) return;
    if (gesture.tap) {
      const dx = Math.abs(event.clientX - gesture.x), dy = Math.abs(event.clientY - gesture.y);
      if (dx < 6 || dy > dx) return;
      gesture.tap = false;
    }
    point(event, true);
  });
  function release(event) {
    if (event.pointerId !== gesture?.id) return;
    if (event.type === "pointerup") {
      const tap = gesture.tap && Math.hypot(event.clientX - gesture.x, event.clientY - gesture.y) < 6;
      if (tap || (!gesture.tap && event.clientX !== gesture.lastX)) point(event, true);
    }
    gesture = null;
    plot.removeAttribute("data-preview");
  }
  for (const name of ["pointerup", "pointercancel", "lostpointercapture"]) plot.addEventListener(name, release);
  plot.addEventListener("pointerleave", () => { if (!gesture) plot.removeAttribute("data-preview"); });
}

function createTrackSpectrum(plot, seek) {
  bindSpectrumSeek(plot, seek);
  const canvas = plot.querySelector("[data-track-spectrum]");
  const picture = plot.querySelector("[data-spectrum-map]");
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  let audio, track, renderer, events;
  let frame = 0, visible = false, live = false;
  function isPlaying() { return live && !reduced.matches && !audio.paused && !audio.ended && !audio.seeking && !audio.error; }
  function drawAt(progress, playing = isPlaying()) {
    plot.toggleAttribute("data-playhead-visible", progress > 0 && progress < 1);
    if (renderer && visible && !document.hidden) renderer.draw(progress * track.duration, playing);
  }
  function tick() {
    frame = 0;
    if (!renderer || !visible || document.hidden) return;
    const playing = isPlaying(), length = Number(seek.max) || track.duration;
    const time = playing ? audio.currentTime : Number(seek.value);
    const ratio = Math.min(1, Math.max(0, time / length));
    plot.style.setProperty("--played", ratio * 100 + "%");
    drawAt(ratio, playing);
    if (playing) frame = window.requestAnimationFrame(tick);
  }
  function sync() {
    window.cancelAnimationFrame(frame);
    tick();
  }
  function resize() {
    if (renderer && visible && !document.hidden) renderer.resize(plot.clientWidth, plot.clientHeight);
    sync();
  }

  new ResizeObserver(resize).observe(plot);
  new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; resize(); }).observe(plot);
  reduced.addEventListener("change", sync);
  document.addEventListener("visibilitychange", resize);
  function select(next, data) {
    events?.abort();
    audio = next; track = data;
    live = !audio.paused && audio.readyState >= 2;
    renderer = createSpectrumRenderer(canvas, unpackSpectrum(track), spectrumBandCount, track.duration);
    plot.toggleAttribute("data-spectrum-ready", Boolean(renderer));
    picture.src = track.image;
    resize();
    if (!renderer) return;
    events = new AbortController();
    const opts = { signal: events.signal };
    audio.addEventListener("playing", () => { live = true; sync(); }, opts);
    for (const event of ["canplay", "seeked"]) audio.addEventListener(event, () => {
      live = !audio.paused && audio.readyState >= 2;
      sync();
    }, opts);
    audio.addEventListener("seeking", sync, opts);
    for (const event of ["pause", "waiting", "ended", "error", "emptied"]) audio.addEventListener(event, () => { live = false; sync(); }, opts);
  }
  return { select, drawAt };
}

function enhanceAudio(player) {
  const entries = [...player.querySelectorAll(".track-entry")];
  const rows = entries.length ? entries : [player];
  const compareVersions = player.hasAttribute("data-compare-versions");
  if (typeof trackSpectra === "undefined" || rows.some(row => !trackSpectra[row.id] || !row.querySelector("audio").canPlayType("audio/mpeg"))) return;
  const bar = player.querySelector(".track-bar"), plot = player.querySelector(".wave-control");
  const selectionTitle = bar.querySelector(".playlist-selection");
  const notice = player.querySelector("[data-media-error]");
  let selected;
  const choices = rows.map(row => {
    const audio = row.querySelector("audio"), download = row.querySelector(".track-download"), title = row.querySelector(".track-title");
    audio.id = row.id + "-audio";
    title.title = audio.getAttribute("aria-label");
    const choice = { row, audio, download, track: trackSpectra[row.id] };
    if (entries.length) {
      const button = document.createElement("button"), icon = document.createElement("span");
      button.type = "button"; button.className = "track-choice";
      button.setAttribute("aria-controls", audio.id);
      button.setAttribute("aria-label", "Воспроизвести — " + title.title);
      icon.className = "play-icon"; icon.setAttribute("aria-hidden", "true");
      title.before(button); button.append(icon, title);
      if (!compareVersions) {
        const length = document.createElement("span");
        length.className = "track-length";
        length.textContent = timeLabel(choice.track.duration);
        button.append(length);
        title.title += " · " + length.textContent;
      }
      bar.append(download);
      choice.button = button;
      button.addEventListener("click", () => {
        if (selected === choice && !audio.paused && !audio.ended) { audio.pause(); return; }
        select(choice); playMedia(audio);
      });
      audio.addEventListener("play", () => { if (!audio.paused) select(choice); });
    }
    audio.addEventListener("error", () => { if (selected === choice) notice.hidden = false; });
    audio.hidden = true;
    return choice;
  });
  let spectrum;
  const controls = createMediaControls(bar, { plot, playButton: choices[0].button, onPosition: p => spectrum?.drawAt(p) });
  spectrum = createTrackSpectrum(plot, controls.seek);
  function select(choice) {
    if (selected === choice) return;
    const previous = selected?.audio;
    let time = 0;
    if (compareVersions && previous && !previous.ended) {
      time = previous.readyState >= 1 ? previous.currentTime : Number(controls.seek.value);
    }
    if (previous) {
      previous.pause();
      choice.audio.volume = previous.volume;
      choice.audio.muted = previous.muted;
    }
    selected = choice;
    if (selectionTitle) {
      selectionTitle.textContent = choice.audio.getAttribute("aria-label");
      selectionTitle.hidden = false;
    }
    for (const entry of choices) {
      entry.download.hidden = entry !== choice;
      if (entry.button) entry.button.setAttribute("aria-current", String(entry === choice));
    }
    notice.hidden = !choice.audio.error;
    controls.select(choice.audio, choice.track.duration, choice.button);
    spectrum.select(choice.audio, choice.track);
    if (previous) {
      if (time !== choice.audio.currentTime) controls.seekTo(Math.min(time, choice.track.duration));
      player.dispatchEvent(new CustomEvent("interviewclipchange", { bubbles: true, detail: { previous, current: choice.audio } }));
    }
  }
  select(choices.find(c => "#" + c.row.id === window.location.hash) || choices[0]);
  plot.parentElement.hidden = false;
  if (selectionTitle) {
    // A track fragment should center its whole deck beneath the sticky masthead.
    const measureJump = () => {
      const bounds = player.getBoundingClientRect();
      player.style.setProperty("--playlist-height", `${bounds.height}px`);
      player.style.setProperty("--choices-top", `${entries[0].getBoundingClientRect().top - bounds.top}px`);
    };
    measureJump();
    new ResizeObserver(measureJump).observe(player);
  }
}

function photoSourceRect(photo, width, height) {
  const style = getComputedStyle(photo);
  const naturalWidth = photo.naturalWidth;
  const naturalHeight = photo.naturalHeight;
  if (style.objectFit !== "cover") return { x: 0, y: 0, width: naturalWidth, height: naturalHeight };
  const scale = Math.max(width / naturalWidth, height / naturalHeight);
  const sourceWidth = width / scale;
  const sourceHeight = height / scale;
  const position = style.objectPosition.split(" ").map((part) => parseFloat(part) / 100);
  return {
    x: (naturalWidth - sourceWidth) * (Number.isFinite(position[0]) ? position[0] : .5),
    y: (naturalHeight - sourceHeight) * (Number.isFinite(position[1]) ? position[1] : .5),
    width: sourceWidth,
    height: sourceHeight,
  };
}

function initPhotoViewer() {
  const dialog = document.getElementById("photo-viewer");
  if (typeof dialog.showModal !== "function") return;

  const close = dialog.querySelector(".lightbox-close");
  const caption = dialog.querySelector("figcaption");
  const photoFrame = dialog.querySelector(".lightbox-photo");
  const preview = photoFrame.querySelector("img");
  let trigger;

  for (const link of document.querySelectorAll("[data-photo]")) {
    link.addEventListener("click", (event) => {
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      trigger = link;
      const photo = link.querySelector("img");
      if (link.dataset.mediaFrame) photoFrame.dataset.mediaFrame = link.dataset.mediaFrame;
      else photoFrame.removeAttribute("data-media-frame");
      preview.sizes = photo.sizes;
      preview.srcset = photo.src === link.href ? photo.srcset : "";
      preview.src = link.href;
      preview.alt = photo.alt;
      const sourceCaption = link.closest("figure")?.querySelector("figcaption");
      if (sourceCaption) copyReadingText(caption, sourceCaption);
      else caption.replaceChildren();
      caption.hidden = !caption.textContent.trim();
      dialog.showModal();
      document.body.classList.add("photo-open");
      close.focus();
    });
  }
  close.addEventListener("click", () => dialog.close());
  photoFrame.addEventListener("click", event => {
    if (event.button === 0 && !event.defaultPrevented) dialog.close();
  });
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) dialog.close();
  });
  dialog.addEventListener("close", () => {
    document.body.classList.remove("photo-open");
    preview.removeAttribute("srcset");
    preview.removeAttribute("sizes");
    preview.removeAttribute("src");
    trigger?.focus({ preventScroll: true });
  });
}

initDisplaySettings();
for (const player of document.querySelectorAll("[data-audio-player]")) enhanceAudio(player);
initHeaderPlayback(document.querySelectorAll(".interview audio, .interview video"));
initReadingPosition();
initCoverMotion();
initPhotoViewer();
