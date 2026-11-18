"use strict";

function initTheme() {
  const root = document.documentElement;
  const control = document.querySelector("[data-theme-switch]");
  const meta = document.querySelector('meta[name="theme-color"]');

  function apply(theme, persist = false) {
    const value = theme === "light" ? "light" : "dark";
    root.dataset.theme = value;
    control.setAttribute("aria-pressed", String(value === "dark"));
    meta?.setAttribute("content", value === "light" ? "#eeefef" : "#000000");
    if (persist) {
      try { localStorage.setItem("interview-theme", value); } catch {}
    }
  }

  control.addEventListener("click", () => apply(root.dataset.theme === "dark" ? "light" : "dark", true));
  window.addEventListener("storage", (event) => {
    if (event.key === "interview-theme") apply(event.newValue);
  });
  apply(root.dataset.theme);
  control.hidden = false;
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
  const questions = [...document.querySelectorAll(".turn.question")];
  if (!questions.length) return;
  const cover = document.getElementById("cover");
  const sections = [{
    id: cover.id, label: "Обложка", number: "Обложка",
    title: cover.querySelector("h1").textContent.trim(),
    sigil: cover.querySelector(".heading-sigil").getAttribute("src"),
  }, ...questions.map((question, index) => ({
    id: question.id, label: `Вопрос ${index + 1} из ${questions.length}`,
    number: `${String(index + 1).padStart(2, "0")} / ${questions.length}`,
    title: question.querySelector("h2").textContent.trim(), sigil: questionSigilSources[index],
  }))];
  const jumpList = navigation.querySelector("[data-question-jumps]");
  const activeSigil = document.createElement("img");
  activeSigil.className = "question-symbol";
  activeSigil.alt = "";
  activeSigil.draggable = false;
  const preview = document.createElement("div");
  preview.className = "question-preview";
  preview.hidden = true;
  preview.setAttribute("role", "tooltip");
  const previewNumber = document.createElement("span");
  previewNumber.className = "question-preview-number";
  const previewText = document.createElement("p");
  const previewSigil = document.createElement("img");
  previewSigil.className = "question-preview-sigil";
  previewSigil.width = 96;
  previewSigil.height = 36;
  previewSigil.alt = "";
  preview.append(previewNumber, previewText, previewSigil);
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
    const bottom = Math.max(top, window.innerHeight - preview.offsetHeight - 12);
    preview.style.top = `${Math.max(top, Math.min(bottom, rect.top + rect.height / 2 - preview.offsetHeight / 2))}px`;
  }

  function showPreview(index) {
    previewIndex = index;
    const section = sections[index];
    previewNumber.textContent = section.number;
    previewText.textContent = section.title;
    previewSigil.src = section.sigil;
    previewSigil.classList.toggle("cover-symbol", index === 0);
    preview.hidden = false;
    placePreview();
  }

  function hidePreview() {
    previewIndex = -1;
    preview.hidden = true;
  }

  const jumps = sections.map((section, index) => {
    const link = document.createElement("a");
    link.className = "question-jump";
    link.href = `#${section.id}`;
    link.setAttribute("aria-label", `${section.label}. ${section.title}`);
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
    const fontSize = parseFloat(getComputedStyle(root).fontSize) || 16;
    const header = document.querySelector(".masthead").getBoundingClientRect().height;
    const offset = header + fontSize * 1.5;
    stops = [0, ...questions.map(question => Math.max(0, Math.min(extent, question.getBoundingClientRect().top + window.scrollY - offset))), extent];
    const travel = Math.max(0, rail.clientHeight - thumb.offsetHeight);
    const interval = travel / sections.length;
    for (let i = 0; i < jumps.length; i += 1) {
      jumps[i].style.top = `${thumb.offsetHeight / 2 + interval * i}px`;
      jumps[i].style.height = `${Math.max(1, interval)}px`;
    }
    dirty = false;
  }

  function update() {
    frame = 0;
    if (dirty || stops[stops.length - 1] !== scrollExtent()) measure();
    const position = positionOnTimeline(stops, window.scrollY);
    const travel = Math.max(0, rail.clientHeight - thumb.offsetHeight);
    thumb.style.transform = `translateY(${position * travel}px)`;
    rail.setAttribute("aria-valuenow", String(Math.round(position * 100)));
    let current = 0;
    while (window.scrollY > 0 && current + 1 < sections.length && stops[current + 1] <= window.scrollY + .5) current++;
    if (current !== activeIndex) {
      if (activeIndex >= 0) jumps[activeIndex].removeAttribute("aria-current");
      rail.setAttribute("aria-valuetext", sections[current].label);
      activeSigil.src = sections[current].sigil;
      activeSigil.classList.toggle("cover-symbol", current === 0);
      jumps[current].append(activeSigil);
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

function initHeaderPlayback(tracks) {
  const header = document.querySelector(".masthead");
  const player = header.querySelector("[data-header-player]");
  const toggle = header.querySelector("[data-header-toggle]");
  const stop = header.querySelector("[data-header-stop]");
  const jump = header.querySelector("[data-header-jump]");
  const title = header.querySelector("[data-header-track]");
  const artist = header.querySelector("[data-header-artist]");
  const art = header.querySelector("[data-header-art]");
  let active = null;
  let followedPlayer = null;
  let inlineVisible = false;
  const visibility = new IntersectionObserver(entries => {
    for (const entry of entries) {
      if (entry.target !== followedPlayer) continue;
      if (entry.isIntersecting) inlineVisible = true;
      else if (inlineVisible) clearFollow();
    }
    sync();
  }, { rootMargin: `-${Math.round(header.getBoundingClientRect().height)}px 0px 0px 0px` });

  function clearFollow() {
    visibility.disconnect();
    followedPlayer = null;
    inlineVisible = false;
  }

  function showProgress() {
    const progress = active && Number.isFinite(active.duration) && active.duration > 0
      ? Math.min(1, Math.max(0, active.currentTime / active.duration)) : 0;
    player.style.setProperty("--header-progress", String(progress));
  }

  function sync() {
    const hadFocus = player.contains(document.activeElement);
    player.hidden = !active || inlineVisible;
    header.toggleAttribute("data-audio-playing", Boolean(active && !active.paused));
    if (active) {
      const name = active.getAttribute("aria-label");
      const currentPlayer = active.closest("[data-audio-player]");
      artist.textContent = currentPlayer.querySelector(".track-artist").textContent;
      title.textContent = currentPlayer.querySelector(".track-title strong").textContent;
      const cover = currentPlayer.querySelector(".track-art").getAttribute("src");
      if (art.getAttribute("src") !== cover) art.setAttribute("src", cover);
      const action = active.paused ? "Продолжить" : "Пауза";
      toggle.title = action;
      toggle.setAttribute("aria-label", `${action} — ${name}`);
      stop.setAttribute("aria-label", `Выключить трек: ${name}`);
      jump.href = `#${currentPlayer.id}`;
      jump.setAttribute("aria-label", `Прыгнуть к треку: ${name}`);
      if (inlineVisible && hadFocus) currentPlayer.querySelector("[data-play]").focus({ preventScroll: true });
    } else if (hadFocus) {
      header.querySelector(".wordmark").focus({ preventScroll: true });
    }
    showProgress();
  }

  const measure = new ResizeObserver(() => {
    document.documentElement.style.setProperty("--header-height", `${header.getBoundingClientRect().height}px`);
  });
  measure.observe(header);

  jump.addEventListener("click", event => {
    if (!active || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    clearFollow();
    followedPlayer = active.closest("[data-audio-player]");
    visibility.observe(followedPlayer);
  });
  toggle.addEventListener("click", () => {
    if (!active) return;
    if (active.paused) playAudio(active);
    else active.pause();
  });
  stop.addEventListener("click", () => {
    active?.pause();
    active = null;
    clearFollow();
    sync();
  });
  for (const audio of tracks) {
    for (const event of ["timeupdate", "durationchange", "seeked"]) {
      audio.addEventListener(event, () => { if (active === audio) showProgress(); });
    }
    audio.addEventListener("play", () => {
      if (active !== audio) clearFollow();
      active = audio;
      sync();
    });
    audio.addEventListener("pause", () => { if (active === audio) sync(); });
    for (const event of ["ended", "error", "emptied"]) audio.addEventListener(event, () => {
      if (active === audio) { active = null; clearFollow(); sync(); }
    });
  }
  sync();
}

function timeLabel(seconds) {
  const whole = Math.floor(seconds);
  const minutes = Math.floor(whole / 60);
  return `${minutes}:${String(whole % 60).padStart(2, "0")}`;
}

function createSpectrumEdge(svg, track) {
  const bands = spectrumBandCount;
  const packed = atob(track.edgeLevels);
  const frames = packed.length * 2 / bands;
  const mask = svg.querySelector(".edge-mask");
  const front = svg.querySelector(".edge-front");
  const [far, near] = svg.querySelectorAll(".edge-trail");
  let lastTime = -1;

  function contour(time, offset) {
    const sample = Math.max(0, Math.min(frames - 1, time * frames / track.duration));
    const first = Math.floor(sample), second = Math.min(first + 1, frames - 1);
    const mix = sample - first;
    let path = "";
    for (let i = 0; i < bands; i++) {
      const shift = i % 2 === 0 ? 4 : 0;
      const a = (packed.charCodeAt((first * bands + i) >> 1) >> shift) & 15;
      const b = (packed.charCodeAt((second * bands + i) >> 1) >> shift) & 15;
      const x = Math.min(99, 4 + offset + (a + (b - a) * mix) * 5.25);
      path += `${i ? "L" : "M"}${x.toFixed(1)} ${(100 * i / (bands - 1)).toFixed(1)}`;
    }
    return path;
  }

  return (seconds, reducedMotion) => {
    const rate = reducedMotion ? 4 : 30;
    const tick = Math.floor(seconds * rate);
    const time = tick / rate;
    if (time === lastTime) return;
    lastTime = time;
    const outline = contour(time, 0);
    mask.setAttribute("d", outline + "L100 100L100 0Z");
    front.setAttribute("d", outline);
    near.setAttribute("d", contour(time - .10, 8));
    far.setAttribute("d", contour(time - .23, 16));
  };
}

function initTrackSpectrum(player, audio) {
  const track = typeof trackSpectra !== "undefined" && trackSpectra[player.id];
  if (!track) return null;
  const canvas = player.querySelector("[data-track-spectrum]");
  const screen = canvas.parentElement;
  const map = player.querySelector("[data-spectrum-map]");
  const seek = player.querySelector("[data-seek]");
  const context = canvas.getContext("2d", { alpha: false });
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  const drawEdge = createSpectrumEdge(screen.querySelector(".spectrum-edge"), track);
  const historyFraction = .74;
  screen.style.setProperty("--edge-width", `${(1 - historyFraction) * 100}%`);
  let frame = 0, visible = false, live = !audio.paused && !audio.ended, ready = false;
  let start = 0, span = track.duration, drag = null, previewTime = null;

  function duration() { return Number.isFinite(audio.duration) && audio.duration > 0 ? audio.duration : track.duration; }

  function position(seconds) {
    player.style.setProperty("--played", `${100 * seconds / duration()}%`);
  }

  function draw(seconds) {
    if (!visible || document.hidden) return;
    const total = duration();
    seconds = Math.max(0, Math.min(seconds, total));
    const sounding = live && !audio.paused && !audio.ended && !audio.seeking;
    const follow = ready && sounding && !reduced.matches && !drag;
    const probe = audio.paused && !drag && previewTime !== null;
    const sampleTime = probe ? previewTime : seconds;
    drawEdge(sampleTime, reduced.matches);
    screen.toggleAttribute("data-preview", probe);
    player.toggleAttribute("data-history-live", Boolean(follow));
    if (drag) {
      ({ start, span } = drag);
    } else if (follow) {
      const history = Math.max(3.5, Math.min(7, screen.clientWidth / 95));
      start = Math.max(0, seconds - history);
      span = Math.max(1 / 48, seconds - start);
    } else {
      start = 0;
      span = total;
    }
    screen.style.setProperty("--needle", `${historyFraction * Math.max(0, Math.min(100, (seconds - start) / span * 100))}%`);
    if (!ready) return;
    const length = Math.min(span, total - start);
    const width = canvas.width, height = canvas.height;
    const historyWidth = Math.round(width * historyFraction);
    context.fillStyle = "#0b0910";
    context.fillRect(0, 0, width, height);
    if (length > 0) {
      context.drawImage(map, map.naturalWidth * start / total, 0, map.naturalWidth * length / total, map.naturalHeight,
        0, 0, historyWidth * length / span, height);
    }
    // Stretch the exact frequency column at the playhead into the animated outline.
    const column = Math.min(map.naturalWidth - 1, sampleTime / total * map.naturalWidth);
    context.drawImage(map, column, 0, 1, map.naturalHeight, historyWidth, 0, width - historyWidth, height);
  }

  function nextFrame() {
    frame = 0;
    const seconds = audio.currentTime;
    position(seconds);
    draw(seconds);
    if (visible && !document.hidden && live && !drag && !reduced.matches && !audio.paused && !audio.ended && !audio.seeking && !audio.error) {
      frame = window.requestAnimationFrame(nextFrame);
    }
  }

  function sync() {
    window.cancelAnimationFrame(frame);
    nextFrame();
  }
  function resize() {
    if (!screen.clientWidth || !screen.clientHeight || !context) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = Math.round(screen.clientWidth * dpr), h = Math.round(screen.clientHeight * dpr);
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = "high";
    draw(audio.currentTime);
  }
  function loaded() {
    ready = Boolean(context && map.naturalWidth && map.naturalHeight);
    player.toggleAttribute("data-spectrum-ready", ready);
    resize();
    sync();
  }

  map.addEventListener("load", loaded);
  map.src = track.image;
  if (map.complete && map.naturalWidth) loaded();
  new ResizeObserver(resize).observe(screen);
  new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    sync();
  }).observe(player);
  audio.addEventListener("playing", () => { previewTime = null; live = true; sync(); });
  for (const event of ["canplay", "seeked"]) audio.addEventListener(event, () => {
    live = !audio.paused && !audio.ended && audio.readyState >= 2;
    sync();
  });
  for (const event of ["seeking", "loadedmetadata"]) audio.addEventListener(event, sync);
  for (const event of ["pause", "waiting", "ended", "error", "emptied"]) audio.addEventListener(event, () => { live = false; sync(); });
  reduced.addEventListener("change", sync);
  document.addEventListener("visibilitychange", sync);

  // The large plot seeks within the displayed interval. The strip always spans the whole song.
  function scrub(event) {
    const rect = screen.getBoundingClientRect();
    const fraction = Math.max(0, Math.min(1, (event.clientX - rect.left) / (rect.width * historyFraction)));
    seek.value = String(Math.max(0, Math.min(duration(), drag.start + fraction * drag.span)));
    seek.dispatchEvent(new Event("input", { bubbles: true }));
  }
  screen.addEventListener("pointerdown", event => {
    if (!event.isPrimary || event.button !== 0) return;
    const rect = screen.getBoundingClientRect();
    if (event.clientX - rect.left > rect.width * historyFraction) return;
    previewTime = null;
    drag = { id: event.pointerId, start, span, waitingForTap: event.pointerType === "touch", x: event.clientX, y: event.clientY };
    screen.setPointerCapture(event.pointerId);
    if (!drag.waitingForTap) scrub(event);
  });
  screen.addEventListener("pointermove", event => {
    if (!drag && audio.paused && event.pointerType === "mouse") {
      const rect = screen.getBoundingClientRect();
      const x = Math.max(0, (event.clientX - rect.left) / rect.width);
      previewTime = x <= historyFraction ? duration() * x / historyFraction : null;
      screen.style.setProperty("--probe", `${x * 100}%`);
      draw(audio.currentTime);
    }
    if (!drag || drag.id !== event.pointerId) return;
    if (drag.waitingForTap) {
      const dx = Math.abs(event.clientX - drag.x), dy = Math.abs(event.clientY - drag.y);
      if (dx < 6 || dy > dx) return;
      drag.waitingForTap = false;
    }
    scrub(event);
  });
  screen.addEventListener("pointerleave", () => {
    if (previewTime !== null) { previewTime = null; draw(audio.currentTime); }
  });
  function release(event) {
    if (!drag || drag.id !== event.pointerId) return;
    drag = null;
    sync();
  }
  screen.addEventListener("lostpointercapture", release);
  screen.addEventListener("pointercancel", release);
  screen.addEventListener("pointerup", event => {
    if (drag && drag.id === event.pointerId && drag.waitingForTap && Math.hypot(event.clientX - drag.x, event.clientY - drag.y) < 6) scrub(event);
    release(event);
  });
  return progress => {
    const seconds = progress * duration();
    position(seconds);
    if (!frame) draw(seconds);
  };
}

async function playAudio(audio) {
  const errorLabel = audio.closest("[data-audio-player]").querySelector("[data-audio-error]");
  errorLabel.hidden = true;
  try {
    await audio.play();
  } catch (error) {
    if (error.name !== "AbortError") errorLabel.hidden = false;
  }
}

function enhanceAudio(player, tracks) {
  const audio = player.querySelector("audio");
  if (!audio.canPlayType("audio/mpeg")) return;

  const controls = player.querySelector(".sound-controls");
  const play = player.querySelector("[data-play]");
  const seek = player.querySelector("[data-seek]");
  const currentLabel = player.querySelector("[data-current]");
  const durationLabel = player.querySelector("[data-duration]");
  const errorLabel = player.querySelector("[data-audio-error]");
  const spectrum = initTrackSpectrum(player, audio);
  const name = audio.getAttribute("aria-label");
  let duration = Number(seek.max);
  let pendingSeek = null;

  function drawPosition(seconds) {
    const progress = Math.min(1, Math.max(0, seconds / duration));
    seek.value = String(seconds);
    const current = timeLabel(seconds);
    currentLabel.textContent = current;
    seek.setAttribute("aria-valuetext", `${current} из ${timeLabel(duration)}`);
    spectrum?.(progress);
  }

  function drawPlayback() {
    const playing = !audio.paused && !audio.ended;
    player.toggleAttribute("data-playing", playing);
    play.setAttribute("aria-label", `${playing ? "Поставить на паузу" : "Воспроизвести"} ${name}`);
  }

  play.addEventListener("click", () => {
    if (!audio.paused && !audio.ended) {
      audio.pause();
      return;
    }
    playAudio(audio);
  });

  seek.addEventListener("input", () => {
    const next = Number(seek.value);
    if (audio.readyState >= 1) {
      audio.currentTime = next;
    } else {
      pendingSeek = next;
      if (audio.paused && audio.preload === "none") {
        audio.preload = "metadata";
        audio.load();
      }
    }
    drawPosition(next);
  });

  audio.addEventListener("loadedmetadata", () => {
    if (Number.isFinite(audio.duration) && audio.duration > 0) {
      duration = audio.duration;
      seek.max = String(duration);
      durationLabel.textContent = timeLabel(duration);
    }
    if (pendingSeek !== null) {
      audio.currentTime = Math.min(pendingSeek, duration);
      pendingSeek = null;
    }
    drawPosition(audio.currentTime);
  });

  audio.addEventListener("timeupdate", () => drawPosition(pendingSeek ?? audio.currentTime));
  audio.addEventListener("play", () => {
    for (const other of tracks) {
      if (other !== audio && !other.paused) other.pause();
    }
    drawPlayback();
  });
  audio.addEventListener("pause", drawPlayback);
  audio.addEventListener("ended", drawPlayback);
  audio.addEventListener("error", () => { errorLabel.hidden = false; });

  audio.hidden = true;
  controls.hidden = false;
  player.setAttribute("data-audio-ready", "");
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

function initPhotoEffects() {
  const links = [...document.querySelectorAll(".image-asset [data-photo]")];
  if (!links.length) return;
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  let active = null;

  for (const link of links) {
    const photo = link.querySelector("img");
    let canvas;
    let context;
    let frame = 0;
    let lastMove = 0;
    let width = 0;
    let height = 0;
    let pointerX = 0;
    let pointerY = 0;
    let source;

    function stop() {
      if (frame) window.cancelAnimationFrame(frame);
      frame = 0;
      link.removeAttribute("data-ripple-active");
      if (active === stop) active = null;
    }

    function prepare() {
      if (!photo.complete || !photo.naturalWidth) return false;
      if (!canvas) {
        canvas = document.createElement("canvas");
        canvas.className = "photo-distortion";
        canvas.setAttribute("aria-hidden", "true");
        context = canvas.getContext("2d");
        if (!context) return false;
        link.append(canvas);
      }
      if (!context) return false;
      width = photo.clientWidth;
      height = photo.clientHeight;
      if (!width || !height) return false;
      const ratio = Math.min(devicePixelRatio || 1, 1.5);
      const pixelWidth = Math.round(width * ratio);
      const pixelHeight = Math.round(height * ratio);
      if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
        canvas.width = pixelWidth;
        canvas.height = pixelHeight;
      }
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      source = photoSourceRect(photo, width, height);
      return true;
    }

    function draw(now) {
      frame = 0;
      const energy = Math.exp(-Math.max(0, now - lastMove - 80) / 210);
      if (energy < .015 || reduced.matches || document.hidden) { stop(); return; }
      context.clearRect(0, 0, width, height);
      context.drawImage(photo, source.x, source.y, source.width, source.height, 0, 0, width, height);

      const radius = Math.min(150, Math.max(75, width * .28));
      const step = Math.max(10, Math.round(radius / 12));
      const scaleX = source.width / width;
      const scaleY = source.height / height;
      const left = Math.max(0, Math.floor((pointerX - radius) / step) * step);
      const top = Math.max(0, Math.floor((pointerY - radius) / step) * step);
      for (let y = top; y < Math.min(height, pointerY + radius); y += step) {
        for (let x = left; x < Math.min(width, pointerX + radius); x += step) {
          const dx = x + step / 2 - pointerX;
          const dy = y + step / 2 - pointerY;
          const distance = Math.hypot(dx, dy);
          if (distance >= radius) continue;
          const falloff = (1 - distance / radius) ** 2;
          const ripple = Math.sin(distance * .065 - now * .009) * falloff * energy * 7;
          const tileWidth = Math.min(step, width - x);
          const tileHeight = Math.min(step, height - y);
          const sampleWidth = tileWidth * scaleX;
          const sampleHeight = tileHeight * scaleY;
          const sampleX = Math.max(0, Math.min(photo.naturalWidth - sampleWidth, source.x + (x + dx / Math.max(1, distance) * ripple) * scaleX));
          const sampleY = Math.max(0, Math.min(photo.naturalHeight - sampleHeight, source.y + (y + dy / Math.max(1, distance) * ripple) * scaleY));
          context.drawImage(photo, sampleX, sampleY, sampleWidth, sampleHeight, x, y, tileWidth, tileHeight);
        }
      }
      link.setAttribute("data-ripple-active", "");
      frame = window.requestAnimationFrame(draw);
    }

    link.addEventListener("pointermove", (event) => {
      if (event.pointerType === "touch" || reduced.matches) return;
      if (active && active !== stop) active();
      if (!prepare()) return;
      const bounds = photo.getBoundingClientRect();
      pointerX = Math.max(0, Math.min(width, (event.clientX - bounds.left) / bounds.width * width));
      pointerY = Math.max(0, Math.min(height, (event.clientY - bounds.top) / bounds.height * height));
      lastMove = performance.now();
      active = stop;
      if (!frame) frame = window.requestAnimationFrame(draw);
    });
    link.addEventListener("pointerleave", () => { lastMove = performance.now() - 200; });
    link.addEventListener("pointerdown", stop);
    new ResizeObserver(stop).observe(photo);
  }
  reduced.addEventListener("change", () => { if (reduced.matches) active?.(); });
  document.addEventListener("visibilitychange", () => { if (document.hidden) active?.(); });
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
      const description = link.querySelector("img").alt;
      photoFrame.dataset.mediaFrame = link.dataset.mediaFrame;
      preview.src = link.href;
      preview.alt = description;
      caption.textContent = link.closest("figure")?.querySelector("figcaption")?.textContent.trim() || "";
      caption.hidden = !caption.textContent;
      dialog.showModal();
      document.body.classList.add("photo-open");
      close.focus();
    });
  }
  close.addEventListener("click", () => dialog.close());
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) dialog.close();
  });
  dialog.addEventListener("close", () => {
    document.body.classList.remove("photo-open");
    preview.removeAttribute("src");
    trigger?.focus({ preventScroll: true });
  });
}

const tracks = document.querySelectorAll("[data-audio-player] audio");
initTheme();
for (const player of document.querySelectorAll("[data-audio-player]")) enhanceAudio(player, tracks);
initHeaderPlayback(tracks);
initReadingPosition();
initCoverMotion();
initPhotoEffects();
initPhotoViewer();
