"use strict";

function readingAnchor(top = document.querySelector(".masthead").getBoundingClientRect().bottom) {
  for (const block of document.querySelectorAll("#page-content :is(.cover, h2, h3, p, figure, .footer)")) {
    const bounds = block.getBoundingClientRect();
    if (bounds.bottom <= top) continue;
    if (bounds.top >= top || !block.matches("h2, h3, p")) return block;

    const x = bounds.left + Math.min(8, bounds.width / 2);
    const y = top + 1;
    let range = document.caretRangeFromPoint?.(x, y);
    if (!range) {
      const caret = document.caretPositionFromPoint?.(x, y);
      if (!caret) return block;
      range = document.createRange();
      range.setStart(caret.offsetNode, caret.offset);
      range.collapse(true);
    }
    const text = range.startContainer;
    if (text.nodeType === Node.TEXT_NODE && block.contains(text) && !text.parentElement.closest(".source-ref") &&
      range.getBoundingClientRect().height) return range;
    return block;
  }
  return null;
}

function preserveReadingPosition(change) {
  const anchor = window.scrollY > 0 && readingAnchor();
  if (!anchor) {
    change();
    return;
  }

  const style = document.documentElement.style;
  const previous = style.getPropertyValue("overflow-anchor");
  const priority = style.getPropertyPriority("overflow-anchor");
  // Compensate for the reflow once, even when the browser has its own scroll anchoring.
  style.setProperty("overflow-anchor", "none", "important");
  try {
    const top = anchor.getBoundingClientRect().top;
    change();
    const delta = anchor.getBoundingClientRect().top - top;
    if (Math.abs(delta) > .5) window.scrollBy({ top: delta, behavior: "instant" });
  } finally {
    style.setProperty("overflow-anchor", previous, priority);
  }
}

function initReadingResize() {
  const masthead = document.querySelector(".masthead");
  const touchViewport = matchMedia("(pointer: coarse)");
  let width = window.innerWidth, height = window.innerHeight;
  let saved, lastScroll, frame = 0;

  function remember(top) {
    const anchor = window.scrollY > 0 && readingAnchor(top);
    saved = null;
    if (!anchor) return;
    const photo = anchor.matches?.("figure") && [...anchor.querySelectorAll("[data-photo]")].find(link => {
      const bounds = link.getBoundingClientRect();
      return bounds.top <= top && bounds.bottom > top;
    });
    const target = photo || anchor;
    const bounds = target.getBoundingClientRect();
    if (!bounds.height) return;
    const fraction = target instanceof Element ? Math.max(0, (top - bounds.top) / bounds.height) : 0;
    saved = { target, fraction, offset: bounds.top + fraction * bounds.height - top };
  }

  function update() {
    frame = 0;
    // Touch browser toolbars can change the height during ordinary scrolling.
    const resized = window.innerWidth !== width || (!touchViewport.matches && window.innerHeight !== height);
    width = window.innerWidth;
    height = window.innerHeight;
    if (!resized && window.scrollY === lastScroll) return;
    const top = masthead.getBoundingClientRect().bottom;
    if (resized && saved) {
      const { target, fraction, offset } = saved;
      const bounds = target.getBoundingClientRect();
      if (bounds.height) {
        const delta = bounds.top + fraction * bounds.height - top - offset;
        if (Math.abs(delta) > .5) window.scrollBy({ top: delta, behavior: "instant" });
        lastScroll = window.scrollY;
        return;
      }
    }
    remember(top);
    lastScroll = window.scrollY;
  }

  function schedule() {
    if (!frame) frame = window.requestAnimationFrame(update);
  }

  window.addEventListener("resize", schedule);
  window.addEventListener("scroll", schedule, { passive: true });
  window.addEventListener("pageshow", () => { saved = null; lastScroll = undefined; schedule(); });
  schedule();
}

function initDisplaySwitch(name, pressedValue, unpressedValue, onChange, { preservePosition = false } = {}) {
  const root = document.documentElement;
  const attribute = `data-${name}`;
  const control = document.querySelector(`[${attribute}-switch]`);

  function setPressed(pressed) {
    const value = pressed ? pressedValue : unpressedValue;
    function update() {
      root.setAttribute(attribute, value);
      control.setAttribute("aria-pressed", String(pressed));
      onChange?.(value, control);
    }
    if (preservePosition && root.getAttribute(attribute) !== value) preserveReadingPosition(update);
    else update();
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
  initDisplaySwitch("question-numbers", "shown", "hidden", (value, control) => {
    control.title = value === "shown" ? "Скрыть номера на шкале" : "Показать номера на шкале";
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

function positionOnTimeline(stops, scrollTop) {
  const last = stops.length - 1;
  if (last < 1 || stops[last] <= 0) return 0;
  const top = Math.max(0, scrollTop);
  // Keep track of the cover separately for layout changes before the first mark.
  if (top <= stops[0]) return stops[0] ? top / stops[0] - 1 : 0;
  if (top >= stops[last]) return 1;
  let segment = 0;
  while (segment < last - 1 && stops[segment + 1] <= top) segment += 1;
  const length = stops[segment + 1] - stops[segment];
  return (segment + (length > 0 ? (top - stops[segment]) / length : 0)) / last;
}

function scrollTopOnTimeline(stops, position) {
  const last = stops.length - 1;
  if (last < 1) return 0;
  if (position < 0) return stops[0] * (1 + Math.max(-1, position));
  const progress = Math.max(0, Math.min(1, position)) * last;
  const segment = Math.min(last - 1, Math.floor(progress));
  return stops[segment] + (stops[segment + 1] - stops[segment]) * (progress - segment);
}

function initReadingPosition() {
  const root = document.documentElement;
  const masthead = document.querySelector(".masthead");
  const navigation = document.querySelector("[data-sigil-navigation]");
  const rail = document.querySelector("[data-sigil-scroll]");
  const thumb = rail.querySelector("[data-scroll-thumb]");
  const questions = [...document.querySelectorAll(".turn.question, .dialogue-aside")];
  if (!questions.length) return;
  const cover = document.getElementById("start");
  const intro = document.getElementById("interview");
  const end = document.getElementById("end");
  const mobile = matchMedia("(max-width: 37rem)");
  const viewport = window.visualViewport;
  const sections = [{
    id: intro.id, label: "Начало интервью", marker: "↓",
    sigil: cover.querySelector(".heading-sigil img").getAttribute("src"),
  }, ...questions.map((question, index) => ({
    id: question.id, label: `Вопрос ${index + 1} из ${questions.length}`,
    number: String(index + 1).padStart(2, "0"),
    copy: question.querySelector(".question-copy"),
    sigil: questionSigilSource(index),
  })), {
    id: end.id, label: end.getAttribute("aria-label"), marker: "↑",
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
  const previewTag = document.createElement("span");
  previewTag.className = "question-preview-tag";
  const previewSigil = document.createElement("img");
  previewSigil.className = "question-preview-sigil";
  previewSigil.width = 96;
  previewSigil.height = 36;
  previewSigil.alt = "";
  preview.append(previewNumber, previewText, previewSigil, previewTag);
  navigation.append(preview);
  let previewIndex = -1;
  let activeIndex = -1;
  let stops = [0, 0];
  let dirty = true;
  let frame = 0;
  let drag = null;
  let jumpPress = null;
  let railTop, railHeight;
  let thumbHeight = 0, thumbTravel = 0;

  function setTabStop(index) {
    for (let i = 0; i < jumps.length; i += 1) jumps[i].tabIndex = i === index ? 0 : -1;
  }

  function placePreview() {
    if (previewIndex < 0) return;
    const rect = jumps[previewIndex].getBoundingClientRect();
    const bounds = navigation.getBoundingClientRect();
    const top = bounds.top + 4;
    const height = preview.offsetHeight;
    const bottom = Math.max(top, (mobile.matches ? bounds.bottom : window.innerHeight) - height - 12);
    const previewTop = Math.max(top, Math.min(bottom, rect.top + (rect.height - height) / 2));
    const sigil = activeSigil.getBoundingClientRect();
    preview.style.top = `${previewTop}px`;
    activeSigil.style.visibility = sigil.bottom > previewTop && sigil.top < previewTop + height ? "hidden" : "";
  }

  function showPreview(index) {
    previewIndex = index;
    const section = sections[index];
    preview.classList.toggle("endpoint-preview", Boolean(section.marker));
    previewNumber.textContent = section.number ? `${section.number} / ${questions.length}` : "";
    previewNumber.hidden = !section.number;
    if (section.copy) copyReadingText(previewText, section.copy);
    else previewText.textContent = section.label;
    previewTag.textContent = `#${section.id}`;
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
    const fragment = `#${section.id}`;
    link.href = section.copy ? `q/${section.id.slice("question-".length)}/` : fragment;
    link.setAttribute("aria-label", section.label);
    if (section.copy) {
      link.id = `jump-${section.id}`;
      link.setAttribute("aria-labelledby", `${link.id} ${section.copy.id}`);
    }
    const marker = document.createElement("span");
    marker.className = section.marker ? "question-jump-arrow" : "question-jump-number";
    marker.textContent = section.marker ?? section.number;
    marker.setAttribute("aria-hidden", "true");
    link.append(marker);
    link.tabIndex = index === 0 ? 0 : -1;
    link.addEventListener("pointerenter", event => {
      if (event.pointerType !== "touch" && !drag) showPreview(index);
    });
    link.addEventListener("pointerleave", () => {
      if (!drag && !jumpPress && previewIndex === index && document.activeElement !== link) hidePreview();
    });
    link.addEventListener("focus", () => {
      setTabStop(index);
      if (!drag) showPreview(index);
    });
    link.addEventListener("blur", () => { if (!drag && !jumpPress) hidePreview(); });
    link.addEventListener("click", event => {
      hidePreview();
      if (!section.copy || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      if (window.location.hash === fragment) document.getElementById(section.id).scrollIntoView();
      else window.location.hash = fragment;
    });
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
    return Math.max(0, root.scrollHeight - root.clientHeight);
  }

  function fitMobileRail() {
    if (!mobile.matches) return;
    const viewportTop = viewport?.offsetTop ?? 0;
    const viewportBottom = viewportTop + (viewport?.height ?? window.innerHeight);
    const top = Math.min(viewportBottom, Math.max(viewportTop, masthead.getBoundingClientRect().bottom));
    const height = viewportBottom - top;
    if (top === railTop && height === railHeight) return;
    railTop = top;
    railHeight = height;
    navigation.style.setProperty("--rail-top", `${top}px`);
    navigation.style.setProperty("--rail-height", `${height}px`);
    dirty = true;
  }

  function measure() {
    const extent = scrollExtent();
    const offset = parseFloat(getComputedStyle(intro).scrollMarginTop) || 0;
    const scrollTop = window.scrollY;
    stops = [intro, ...questions].map(section => {
      const top = section.getBoundingClientRect().top + scrollTop - offset;
      return Math.max(0, Math.min(extent, top));
    });
    stops.push(extent);
    thumbHeight = thumb.getBoundingClientRect().height;
    thumbTravel = Math.max(0, rail.getBoundingClientRect().height - thumbHeight);
    const interval = thumbTravel / (jumps.length - 1);
    navigation.style.setProperty("--tick-interval", `${interval}px`);
    for (let i = 0; i < jumps.length; i += 1) {
      jumps[i].style.top = `${thumbHeight / 2 + interval * i}px`;
      jumps[i].style.height = `${Math.max(1, interval)}px`;
    }
    dirty = false;
  }

  function measureIfNeeded() {
    fitMobileRail();
    if (dirty || stops[stops.length - 1] !== scrollExtent()) measure();
  }

  function update() {
    frame = 0;
    if (navigation.hidden) return;
    measureIfNeeded();
    const scrollTop = window.scrollY;
    let current = 0;
    // Fragment navigation can land a fraction of a pixel before the stop.
    while (scrollTop > 0 && current + 1 < sections.length && stops[current + 1] - scrollTop < 1) current++;
    const position = Math.max(0, positionOnTimeline(stops, scrollTop));
    thumb.style.transform = `translateY(${position * thumbTravel}px)`;
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
    measureIfNeeded();
    if (!thumbTravel) return;
    const offset = clientY - rail.getBoundingClientRect().top - drag.offset;
    const position = Math.max(0, Math.min(1, offset / thumbTravel));
    if (drag.previewQuestions) {
      const nearest = Math.round(position * (jumps.length - 1));
      if (nearest !== previewIndex) showPreview(nearest);
    }
    if (position === 0 && window.scrollY <= stops[0]) return;
    window.scrollTo({ top: scrollTopOnTimeline(stops, position), behavior: "instant" });
    schedule();
  }

  function finishDrag(event) {
    if (!drag || (event && event.pointerId !== drag.id)) return;
    const { id, previewQuestions } = drag;
    drag = null;
    if (previewQuestions) hidePreview();
    root.classList.remove("is-sigil-dragging");
    if (rail.hasPointerCapture(id)) rail.releasePointerCapture(id);
  }

  function startDrag(event, { onThumb = false, previewQuestions = false } = {}) {
    event.preventDefault();
    hidePreview();
    measureIfNeeded();
    let offset = thumbHeight / 2;
    if (onThumb) {
      // Anchor the drag to the current reading position.
      const position = Math.max(0, positionOnTimeline(stops, window.scrollY));
      offset = event.clientY - rail.getBoundingClientRect().top - position * thumbTravel;
    }
    drag = { id: event.pointerId, offset, previewQuestions };
    rail.focus({ preventScroll: true });
    rail.setPointerCapture(event.pointerId);
    root.classList.add("is-sigil-dragging");
    if (!onThumb) moveThumb(event.clientY);
  }

  jumpList.addEventListener("pointerdown", event => {
    if (!event.isPrimary || event.pointerType !== "touch" || drag) return;
    const index = jumps.indexOf(event.target.closest(".question-jump"));
    jumpPress = { id: event.pointerId, y: event.clientY, previewQuestions: index >= 0 };
    if (index >= 0) showPreview(index);
  });
  jumpList.addEventListener("pointermove", event => {
    if (jumpPress?.id !== event.pointerId || Math.abs(event.clientY - jumpPress.y) < 5) return;
    const { previewQuestions } = jumpPress;
    jumpPress = null;
    startDrag(event, { previewQuestions });
  });
  jumpList.addEventListener("contextmenu", event => {
    if (event.pointerType === "touch" || jumpPress) event.preventDefault();
  });
  for (const type of ["pointerup", "pointercancel", "lostpointercapture"]) {
    jumpList.addEventListener(type, event => {
      if (jumpPress?.id !== event.pointerId) return;
      jumpPress = null;
      hidePreview();
    });
  }

  rail.addEventListener("pointerdown", event => {
    if (event.button !== 0 || !event.isPrimary || drag || jumpPress) return;
    startDrag(event, { onThumb: thumb.contains(event.target) });
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
  resize.observe(masthead);
  resize.observe(rail);
  navigation.hidden = false;
  root.classList.add("has-sigil-scroll");

  const railSwitch = document.querySelector("[data-sigil-scroll-switch]");
  if (railSwitch) {
    let mobileRailVisible = true;

    function applyRailVisibility() {
      const visible = !mobile.matches || mobileRailVisible;
      railSwitch.hidden = !mobile.matches;
      railSwitch.setAttribute("aria-pressed", String(visible));
      railSwitch.title = visible ? "Скрыть шкалу вопросов" : "Показать шкалу вопросов";
      if (!visible) {
        jumpPress = null;
        if (navigation.contains(document.activeElement)) railSwitch.focus({ preventScroll: true });
        hidePreview();
        finishDrag();
      }
      navigation.hidden = !visible;
      root.classList.toggle("has-sigil-scroll", visible);
      dirty = true;
    }

    railSwitch.addEventListener("click", () => {
      if (!mobile.matches) return;
      if (dirty || stops[stops.length - 1] !== scrollExtent()) measure();
      const position = positionOnTimeline(stops, window.scrollY);
      mobileRailVisible = !mobileRailVisible;
      applyRailVisibility();
      measure();
      window.scrollTo({ top: scrollTopOnTimeline(stops, position), behavior: "instant" });
      schedule();
    });
    mobile.addEventListener("change", () => { applyRailVisibility(); schedule(); });
    applyRailVisibility();
  }

  window.addEventListener("scroll", schedule, { passive: true });
  window.addEventListener("resize", invalidate);
  viewport?.addEventListener("resize", schedule);
  viewport?.addEventListener("scroll", schedule);
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
    const selector = owner?.hasAttribute("data-track-playlist") ? "[data-media-play]" : ".media-controls:not([hidden])";
    const controls = owner?.querySelector(selector) || item;
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
    header.style.setProperty("--header-fill", `${progress * 100}%`);
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
  const waveDepth = .24;
  let width = 0, height = 0, scale = 0, rows, columns, overview, ink, paper, liftScale;
  let lastSeconds = NaN, lastMotion, lastHover, lastHoverPosition;

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
    let top = Infinity, bottom = -Infinity;
    for (let row = 0; row < rows; row++) {
      const band = Math.round(row * (bands - 1) / (rows - 1));
      const base = .72 * row / (rows - 1);
      const start = row * (columns + 1);
      const end = start + columns;
      for (let x = 0; x <= columns; x++) {
        overview[start + x] = base - amplitude(x / columns * (frames - 1), band) ** 2 * waveDepth;
      }
      top = Math.min(top, overview[start], overview[end]);
      bottom = Math.max(bottom, overview[start], overview[end]);
      // The quadratic curves round the sample peaks. Measure their visible extrema.
      for (let i = start + 1; i < end; i++) {
        const center = overview[i];
        const left = overview[i - 1] - center, right = overview[i + 1] - center;
        if (left * right < 0) continue;
        const turn = left && right ? center + .5 * left * right / (left + right) : center;
        top = Math.min(top, turn);
        bottom = Math.max(bottom, turn);
      }
    }

    // Fit the stationary spectrum once so transients cannot move the other waves.
    const inset = height * .1;
    const yScale = (height - 2 * inset) / (bottom - top);
    for (let i = 0; i < overview.length; i++) overview[i] = inset + (overview[i] - top) * yScale;
    liftScale = waveDepth * yScale;
    lastMotion = undefined;
  }

  function draw(seconds, motion, hoverPosition = 0, hover = 0) {
    const playbackUnchanged = lastMotion === motion && (!motion || Math.abs(seconds - lastSeconds) < 1 / 36);
    const hoverUnchanged = lastHover === hover && (!hover || lastHoverPosition === hoverPosition);
    if (!width || !height || (playbackUnchanged && hoverUnchanged)) return;
    lastSeconds = seconds; lastMotion = motion;
    lastHover = hover; lastHoverPosition = hoverPosition;
    ctx.fillStyle = paper; ctx.fillRect(0, 0, width, height);
    const dx = width / columns;
    const head = width * seconds / total, radius = Math.min(130, width * .2);
    const framesPerSecond = (frames - 1) / total;
    const motionInset = height * .025;
    const pointer = width * hoverPosition, pointerRadius = Math.min(96, width * .18);
    const pointerStrength = Math.min(22, height * .16) * hover;
    let highlight;
    if (motion === 1) {
      highlight = ctx.createLinearGradient(head - radius, 0, head + radius, 0);
      highlight.addColorStop(0, "rgba(250,250,250,0)");
      highlight.addColorStop(.5, "rgba(250,250,250,.7)");
      highlight.addColorStop(1, "rgba(250,250,250,0)");
    }

    for (let row = 0; row < rows; row++) {
      const band = Math.round(row * (bands - 1) / (rows - 1));
      const start = row * (columns + 1);
      let lastY;
      ctx.beginPath();
      for (let x = 0; x <= columns; x++) {
        const y = overview[start + x];
        const column = x * dx;
        const distance = (column - head) / radius;
        let displacement = 0;
        if (motion && Math.abs(distance) < 1) {
          // Keep the motion around the playhead and follow both rises and falls in the band.
          const sample = (seconds - Math.abs(distance) * .85) * framesPerSecond;
          const level = amplitude(sample, band);
          const change = level - amplitude(sample - 2, band);
          const ripple = Math.sin(seconds * 10 - distance * 6 + row * .55);
          const pulse = level * (.35 + 1.1 * level) * ripple + 2.15 * change;
          displacement = liftScale * motion * (1 - distance * distance) ** 2 * pulse;
        }
        const fromPointer = (column - pointer) / pointerRadius;
        if (pointerStrength && Math.abs(fromPointer) < 1) {
          const level = amplitude(hoverPosition * (frames - 1) + fromPointer * 3, band);
          const ripple = Math.cos(3.2 * fromPointer + row * .6);
          displacement += pointerStrength * (1 - fromPointer * fromPointer) ** 2 * (.52 + .48 * level) * ripple;
        }
        const bentY = Math.max(motionInset, Math.min(height - motionInset, y - displacement));
        if (x === 0) ctx.moveTo(0, bentY);
        else ctx.quadraticCurveTo((x - 1) * dx, lastY, (x - .5) * dx, (lastY + bentY) / 2);
        lastY = bentY;
      }
      ctx.lineTo(width, lastY);
      ctx.strokeStyle = ink; ctx.lineWidth = row === rows - 1 ? 1.45 : 1.1; ctx.stroke();
      if (highlight) { ctx.strokeStyle = highlight; ctx.stroke(); }
      ctx.lineTo(width, height); ctx.lineTo(0, height); ctx.closePath();
      ctx.fillStyle = "rgba(16,16,16,.81)"; ctx.fill();
    }
  }
  return { resize, draw };
}

function bindSpectrumSeek(plot, seek, onHover) {
  let gesture = null;
  function point(event, commit) {
    const rect = plot.getBoundingClientRect();
    if (!rect.width) return;
    const fraction = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
    const seconds = Number(seek.max) * fraction;
    plot.setAttribute("data-preview", timeLabel(seconds));
    plot.style.setProperty("--probe", fraction * 100 + "%");
    if (!commit) onHover(fraction);
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
  const canvas = plot.querySelector("[data-track-spectrum]");
  const picture = plot.querySelector("[data-spectrum-map]");
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  let audio, track, renderer, events;
  let frame = 0, visible = false;
  let hoverPosition = 0, hoverTarget = 0, hoverTime = -Infinity;
  let hoverLevel = 0, hoverImpulse = 0, hoverFrameTime = 0;

  function hoverStrength(now) {
    return hoverImpulse * Math.max(0, 1 - (now - hoverTime) / 220) ** 2;
  }

  bindSpectrumSeek(plot, seek, position => {
    const now = performance.now();
    const previous = hoverStrength(now);
    if (!hoverLevel && !previous) {
      hoverPosition = position;
      hoverFrameTime = now;
      hoverImpulse = .3;
    } else {
      const distance = Math.abs(position - hoverTarget) * plot.clientWidth;
      hoverImpulse = Math.max(previous, .3 + .7 * Math.min(1, distance / 12));
    }
    hoverTarget = position;
    hoverTime = now;
    if (!frame && renderer && visible && !document.hidden) frame = window.requestAnimationFrame(tick);
  });
  function isPlaying() {
    return audio && !audio.paused && !audio.ended && !audio.seeking && !audio.error && audio.readyState >= 2;
  }
  function drawAt(progress, playing = isPlaying()) {
    plot.toggleAttribute("data-playhead-visible", progress > 0 && progress < 1);
    if (!renderer || !visible || document.hidden) return;
    const strength = reduced.matches ? .3 : 1;
    const now = performance.now();
    const elapsed = Math.min(50, now - hoverFrameTime);
    const targetStrength = hoverStrength(now);
    hoverFrameTime = now;
    hoverPosition += (hoverTarget - hoverPosition) * (1 - Math.exp(-elapsed / 55));
    hoverLevel += (targetStrength - hoverLevel) * (1 - Math.exp(-elapsed / 75));
    if (!targetStrength && hoverLevel < .002) hoverLevel = 0;
    renderer.draw(progress * track.duration, playing ? strength : 0, hoverPosition, strength * hoverLevel);
    if ((playing || hoverLevel || targetStrength) && !frame) frame = window.requestAnimationFrame(tick);
  }
  function tick() {
    frame = 0;
    if (!renderer || !visible || document.hidden) return;
    const playing = isPlaying(), length = Number(seek.max) || track.duration;
    const time = playing ? audio.currentTime : Number(seek.value);
    const ratio = Math.min(1, Math.max(0, time / length));
    plot.style.setProperty("--played", ratio * 100 + "%");
    drawAt(ratio, playing);
  }
  function sync() {
    window.cancelAnimationFrame(frame);
    tick();
  }
  function resize() {
    if (renderer && visible && !document.hidden) renderer.resize(plot.clientWidth, plot.clientHeight);
    if (!visible || document.hidden) { hoverTime = -Infinity; hoverLevel = 0; }
    sync();
  }

  new ResizeObserver(resize).observe(plot);
  new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; resize(); }).observe(plot);
  reduced.addEventListener("change", sync);
  document.addEventListener("visibilitychange", resize);
  function select(next, data) {
    events?.abort();
    audio = next; track = data;
    hoverTime = -Infinity;
    hoverLevel = 0;
    renderer = createSpectrumRenderer(canvas, unpackSpectrum(track), spectrumBandCount, track.duration);
    plot.toggleAttribute("data-spectrum-ready", Boolean(renderer));
    picture.src = track.image;
    resize();
    if (!renderer) return;
    events = new AbortController();
    const opts = { signal: events.signal };
    for (const event of ["play", "playing", "canplay", "seeking", "seeked", "pause", "waiting", "ended", "error", "emptied"]) {
      audio.addEventListener(event, sync, opts);
    }
  }
  return { select, drawAt };
}

function initTrackTitleScroll(titles, trackPlaylist) {
  const range = trackPlaylist ? document.createRange() : null;
  function measure(title) {
    const text = title.firstElementChild;
    if (range) {
      const label = text.textContent;
      if (text.getAttribute("data-track-name-copy") !== label) text.setAttribute("data-track-name-copy", label);
      range.selectNodeContents(text);
    }
    const width = (range ?? text).getBoundingClientRect().width;
    const distance = Math.max(0, Math.ceil(width - title.clientWidth));
    const duration = trackPlaylist ? Math.max(.75, width / 84) : Math.max(4, distance / 32 + 2);
    title.style.setProperty("--track-name-shift", `${-distance}px`);
    title.style.setProperty("--track-name-duration", `${duration}s`);
    title.toggleAttribute("data-title-overflow", distance > 1);
  }

  const resize = new ResizeObserver(entries => {
    for (const { target } of entries) measure(target);
  });
  for (const title of titles) {
    const text = document.createElement("span");
    text.append(...title.childNodes);
    title.append(text);
    title.classList.add("track-name-scroll");
    if (!trackPlaylist) title.title = text.textContent;
    measure(title);
    resize.observe(title);
  }
  document.fonts?.ready.then(() => titles.forEach(measure));
  return measure;
}

function enhanceAudio(player) {
  const entries = [...player.querySelectorAll(".track-entry")];
  const rows = entries.length ? entries : [player];
  const compareVersions = player.hasAttribute("data-compare-versions");
  const trackPlaylist = player.hasAttribute("data-track-playlist");
  if (typeof trackSpectra === "undefined" || rows.some(row => !trackSpectra[row.id] || !row.querySelector("audio").canPlayType("audio/mpeg"))) return;
  const bar = player.querySelector(".track-bar"), plot = player.querySelector(".wave-control");
  const notice = player.querySelector("[data-media-error]");
  let selected;

  const choices = rows.map(row => {
    const audio = row.querySelector("audio"), download = row.querySelector(".track-download"), title = row.querySelector(".track-title");
    audio.id = row.id + "-audio";
    const label = audio.getAttribute("aria-label");
    if (!trackPlaylist) title.title = label;
    const choice = { row, audio, download, title, track: trackSpectra[row.id] };
    if (entries.length) {
      const button = document.createElement("button");
      button.type = "button"; button.className = "track-choice";
      button.setAttribute("aria-controls", audio.id);
      button.setAttribute("aria-label", "Воспроизвести — " + label);
      title.before(button);
      const icon = document.createElement("span");
      icon.className = "play-icon"; icon.setAttribute("aria-hidden", "true");
      button.append(icon, title);
      if (!compareVersions && !trackPlaylist) {
        const duration = timeLabel(choice.track.duration);
        title.title += " · " + duration;
        const length = document.createElement("span");
        length.className = "track-length";
        length.textContent = duration;
        button.append(length);
      }
      bar.append(download);
      choice.button = button;
      button.addEventListener("click", () => {
        if (selected === choice && !audio.paused && !audio.ended) {
          audio.pause();
          return;
        }
        select(choice);
        playMedia(audio);
      });
      audio.addEventListener("play", () => { if (!audio.paused) select(choice); });
    }
    audio.addEventListener("error", () => { if (selected === choice) notice.hidden = false; });
    audio.hidden = true;
    return choice;
  });
  const deck = bar.parentElement;
  const currentTitle = trackPlaylist ? choices[0].title.cloneNode(true) : null;
  if (currentTitle) {
    currentTitle.removeAttribute("id");
    bar.prepend(currentTitle);
    deck.hidden = false;
  }
  let spectrum;
  const controls = createMediaControls(bar, {
    plot,
    playButton: choices[0].button,
    playTooltip: !trackPlaylist,
    onPosition: p => spectrum?.drawAt(p),
  });
  const trackName = bar.querySelector(".track-title strong");
  const titles = trackPlaylist ? [trackName, ...choices.map(choice => choice.title.querySelector("strong"))] : [trackName];
  const measureTitle = initTrackTitleScroll(titles, trackPlaylist);
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
    for (const entry of choices) {
      entry.download.hidden = entry !== choice;
      if (entry.button) entry.button.setAttribute("aria-current", String(entry === choice));
    }
    if (currentTitle) {
      currentTitle.querySelector(".track-artist").textContent = choice.title.querySelector(".track-artist").textContent;
      trackName.firstElementChild.textContent = choice.title.querySelector("strong").textContent;
      measureTitle(trackName);
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
  if (trackPlaylist) {
    // A track fragment should center its whole deck beneath the sticky masthead.
    const measureJump = () => {
      const bounds = deck.getBoundingClientRect();
      player.style.setProperty("--playlist-height", `${bounds.height}px`);
      for (const entry of entries) {
        entry.style.setProperty("--track-offset", `${entry.getBoundingClientRect().top - bounds.top}px`);
      }
    };
    measureJump();
    const resize = new ResizeObserver(measureJump);
    resize.observe(deck);
    resize.observe(player.querySelector(".track-list"));
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

function initAdidasPhotoPosition() {
  const photo = document.getElementById("adidas-bootlegs");
  const mobileFigure = document.getElementById("adidas-bootlegs-mobile");
  const pairFrame = photo.parentElement;
  const mobileFrame = mobileFigure.querySelector(".image-frame");
  const mobile = matchMedia("(max-width: 37rem)");
  function place() {
    const frame = mobile.matches ? mobileFrame : pairFrame;
    if (photo.parentElement !== frame) frame.prepend(photo);
    mobileFigure.hidden = !mobile.matches;
  }
  place();
  mobile.addEventListener("change", place);
}

function initPhotoViewer() {
  const dialog = document.getElementById("photo-viewer");
  if (typeof dialog.showModal !== "function") return;

  const content = dialog.querySelector(".lightbox-inner");
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
      content.focus({ preventScroll: true });
      dialog.dispatchEvent(new CustomEvent("photo-viewer-open", { detail: link }));
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
    if (dialog.open) return;
    document.body.classList.remove("photo-open");
    preview.removeAttribute("srcset");
    preview.removeAttribute("sizes");
    preview.removeAttribute("src");
    trigger?.focus({ preventScroll: true });
  });
}

function initToyotaProfiles() {
  const profiles = document.getElementById("toyota-handles");
  if (!profiles) return;

  const list = profiles.querySelector(".toyota-profile-list");
  const desktopOrder = Array.from(list.children);
  const mobileOrder = desktopOrder.filter(item => !item.dataset.profileMobilePosition);
  const mobilePositions = desktopOrder.filter(item => item.dataset.profileMobilePosition);
  mobilePositions.sort((a, b) => a.dataset.profileMobilePosition - b.dataset.profileMobilePosition);
  for (const item of mobilePositions) mobileOrder.splice(item.dataset.profileMobilePosition - 1, 0, item);
  function orderProfiles() {
    const portrait = getComputedStyle(list).getPropertyValue("--profile-portrait").trim() === "1";
    const order = portrait ? mobileOrder : desktopOrder;
    for (const [index, item] of order.entries()) {
      if (list.children[index] !== item) list.insertBefore(item, list.children[index]);
    }
  }
  orderProfiles();
  new ResizeObserver(orderProfiles).observe(profiles);

  const avatarUpdates = Array.from(profiles.querySelectorAll("[data-profile-video]"), video => {
    const avatar = video.closest(".toyota-profile-avatar");
    const link = avatar.parentElement;
    const picture = video.previousElementSibling;
    const still = picture.getAttribute("src");
    const animation = video.dataset.profileAnimation;
    let hovered = false, focused = false, active = false, useAnimation = false;
    let touchPress = null, suppressClick = false;
    let revision = 0;

    function showAnimation() {
      useAnimation = true;
      video.pause();
      delete video.dataset.profileActive;
      if (active) picture.src = animation;
    }

    function update() {
      const requested = !document.hidden && (hovered || focused || touchPress?.playing === true);
      if (requested === active) return;
      active = requested;
      const current = ++revision;
      if (!active) {
        delete video.dataset.profileActive;
        video.pause();
        if (!video.error && video.currentTime > 0) video.currentTime = 0;
        if (useAnimation) picture.src = still;
        return;
      }
      if (useAnimation) {
        picture.src = animation;
        return;
      }
      video.muted = true;
      if (!video.getAttribute("src")) {
        video.poster = still;
        video.src = video.dataset.profileVideo;
      }
      function play() {
        if (current !== revision || useAnimation) return;
        video.dataset.profileActive = "";
        video.play().catch(error => {
          if (current === revision && error.name !== "AbortError") showAnimation();
        });
      }
      if (video.seeking) video.addEventListener("seeked", play, { once: true });
      else play();
    }

    link.addEventListener("pointerenter", event => {
      if (event.pointerType !== "mouse" && event.pointerType !== "pen") return;
      focused = false;
      hovered = true;
      update();
    });
    link.addEventListener("pointerleave", () => { hovered = false; update(); });
    link.addEventListener("focus", () => { focused = link.matches(":focus-visible"); update(); });
    link.addEventListener("blur", () => { focused = false; update(); });
    function stopPress() {
      if (!touchPress) return;
      clearTimeout(touchPress.timer);
      touchPress = null;
      delete link.dataset.profileHolding;
      update();
    }
    link.addEventListener("pointerdown", event => {
      if (!event.isPrimary) return;
      suppressClick = false;
      stopPress();
      if (event.pointerType !== "touch" || event.button !== 0 || !avatar.contains(event.target)) return;
      const press = { id: event.pointerId, x: event.clientX, y: event.clientY };
      touchPress = press;
      press.timer = window.setTimeout(() => {
        if (touchPress !== press || document.hidden) return;
        press.playing = true;
        suppressClick = true;
        link.dataset.profileHolding = "";
        update();
      }, 450);
    });
    link.addEventListener("pointermove", event => {
      if (touchPress?.id !== event.pointerId) return;
      if (Math.hypot(event.clientX - touchPress.x, event.clientY - touchPress.y) > 10) stopPress();
    }, { passive: true });
    for (const type of ["pointerup", "pointercancel", "lostpointercapture"]) {
      link.addEventListener(type, event => {
        if (touchPress?.id === event.pointerId) stopPress();
      });
    }
    link.addEventListener("contextmenu", event => {
      if (touchPress || (event.pointerType === "touch" && avatar.contains(event.target))) event.preventDefault();
    });
    link.addEventListener("click", event => {
      if (!suppressClick || event.detail === 0) return;
      suppressClick = false;
      event.preventDefault();
    });
    video.addEventListener("error", showAnimation);
    return () => {
      if (document.hidden && touchPress) stopPress();
      else update();
    };
  });
  document.addEventListener("visibilitychange", () => avatarUpdates.forEach(update => update()));
}

initDisplaySettings();
initAdidasPhotoPosition();
initToyotaProfiles();
for (const player of document.querySelectorAll("[data-audio-player]")) enhanceAudio(player);
initHeaderPlayback(document.querySelectorAll(".interview audio, .interview video:not([data-profile-video])"));
initReadingResize();
initReadingPosition();
initPhotoViewer();
