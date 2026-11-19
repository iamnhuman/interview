"use strict";

function timeLabel(seconds) {
  const whole = Math.floor(Math.max(0, seconds || 0));
  return Math.floor(whole / 60) + ":" + String(whole % 60).padStart(2, "0");
}

function pauseOtherMedia(current, media) {
  for (const other of media) {
    if (other !== current && !other.paused) other.pause();
  }
}

async function playMedia(item) {
  const player = item.closest("[data-audio-player], [data-video-gallery]");
  const notice = player?.querySelector("[data-media-error]");
  if (notice) notice.hidden = true;
  pauseOtherMedia(item, document.querySelectorAll(".interview audio, .interview video"));
  try { await item.play(); }
  catch (error) {
    const control = player?.querySelector("[data-media-play]");
    const selected = !control || control.getAttribute("aria-controls") === item.id;
    if (error.name !== "AbortError" && selected && notice) notice.hidden = false;
  }
}

function mediaIconButton(className, label, icon) {
  const icons = {
    sound: "M3 9h4l5-4v14l-5-4H3zM16 8q4 4 0 8M19 5q7 7 0 14",
    muted: "M3 9h4l5-4v14l-5-4H3zM16 9l5 6m0-6-5 6",
    expand: "M4 10V4h6m4 0h6v6m0 4v6h-6m-4 0H4v-6",
    collapse: "M10 4v6H4m10-6v6h6m0 4h-6v6m-4 0v-6H4",
  };
  const button = document.createElement("button");
  button.type = "button"; button.className = className;
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 24 24"); svg.setAttribute("aria-hidden", "true");
  const path = document.createElementNS(svg.namespaceURI, "path");
  svg.append(path); button.append(svg);
  function set(text, shape) {
    button.title = text; button.setAttribute("aria-label", text);
    path.setAttribute("d", icons[shape]);
  }
  set(label, icon);
  return { button, set };
}

let openVolumePanel = null;

function closeVolumePanel(restoreFocus = false) {
  if (!openVolumePanel) return;
  const { button, panel } = openVolumePanel;
  openVolumePanel = null;
  panel.hidden = true;
  button.setAttribute("aria-expanded", "false");
  if (restoreFocus) button.focus({ preventScroll: true });
}

function dismissOutsideVolume(event) {
  if (openVolumePanel && !openVolumePanel.panel.parentElement.contains(event.target)) closeVolumePanel();
}

document.addEventListener("pointerdown", dismissOutsideVolume);
document.addEventListener("focusin", dismissOutsideVolume);
document.addEventListener("keydown", event => {
  if (event.key === "Escape" && openVolumePanel) {
    event.preventDefault();
    closeVolumePanel(true);
  }
});

function createMediaControls(bar, { plot, onPosition = () => {}, playButton } = {}) {
  function element(tag, cls) {
    const node = document.createElement(tag);
    node.className = cls;
    return node;
  }
  function range(cls, label, max, step) {
    const input = element("input", cls);
    input.type = "range"; input.min = "0"; input.max = String(max); input.step = String(step);
    input.setAttribute("aria-label", label);
    return input;
  }
  bar.classList.add("media-controls");
  bar.setAttribute("role", "group");
  let play = playButton;
  if (!play) {
    play = element("button", "play-toggle");
    play.type = "button";
    const icon = element("span", "play-icon"); icon.setAttribute("aria-hidden", "true"); play.append(icon);
    bar.prepend(play);
    play.addEventListener("click", () => { if (media.paused || media.ended) playMedia(media); else media.pause(); });
  }
  const seek = range("seek", "Позиция воспроизведения", 1, "any");
  const clock = element("span", "clock");
  clock.setAttribute("aria-hidden", "true");
  const current = element("span", "elapsed"), total = element("span", "total");
  clock.append(current, total);
  const gain = element("div", "media-gain");
  const volumeToggle = mediaIconButton("volume-toggle", "Громкость", "sound");
  volumeToggle.button.setAttribute("aria-expanded", "false");
  const panel = element("div", "volume-panel");
  panel.hidden = true;
  panel.setAttribute("role", "group"); panel.setAttribute("aria-label", "Громкость");
  const level = element("span", "volume-value");
  level.setAttribute("aria-hidden", "true");
  const volume = range("media-volume", "Громкость", 1, .01);
  volume.setAttribute("aria-orientation", "vertical");
  const mute = mediaIconButton("media-mute", "Без звука", "muted").button;
  panel.append(level, volume, mute);
  gain.append(volumeToggle.button, panel);

  (plot || bar).append(seek);
  const download = bar.querySelector(".track-download");
  if (download) download.before(clock, gain);
  else bar.append(clock, gain);

  let media, estimate, pending = null, events;
  function duration() { return Number.isFinite(media.duration) && media.duration > 0 ? media.duration : estimate; }
  function position() {
    const length = duration(), time = Math.min(pending ?? media.currentTime, length);
    seek.max = String(length); seek.value = String(time);
    const ratio = length ? time / length : 0;
    (plot || seek).style.setProperty("--played", ratio * 100 + "%");
    current.textContent = timeLabel(time);
    total.textContent = timeLabel(length);
    seek.setAttribute("aria-valuetext", timeLabel(time) + " из " + timeLabel(length));
    onPosition(ratio);
  }
  function state() {
    const playing = !media.paused && !media.ended, silent = media.muted || !media.volume;
    bar.toggleAttribute("data-playing", playing);
    const action = playing ? "Пауза" : "Воспроизвести";
    play.title = action; play.setAttribute("aria-label", action + " — " + media.getAttribute("aria-label"));
    mute.setAttribute("aria-pressed", String(silent));
    mute.title = silent ? "Включить звук" : "Выключить звук";
    volume.value = silent ? "0" : String(media.volume);
    const percent = Math.round(Number(volume.value) * 100) + "%";
    volumeToggle.set("Громкость " + percent, silent ? "muted" : "sound");
    volume.style.setProperty("--filled", percent);
    volume.setAttribute("aria-valuetext", percent); level.textContent = percent;
  }
  function select(next, initialDuration, nextPlay = play) {
    events?.abort(); events = new AbortController(); pending = null;
    if (media && play !== nextPlay) {
      play.removeAttribute("data-media-play");
      play.setAttribute("aria-label", "Воспроизвести — " + media.getAttribute("aria-label"));
      play.title = "Воспроизвести";
    }
    play = nextPlay;
    play.setAttribute("data-media-play", "");
    media = next; estimate = initialDuration;
    const opts = { signal: events.signal };
    bar.setAttribute("aria-label", "Управление — " + media.getAttribute("aria-label"));
    seek.setAttribute("aria-label", "Позиция — " + media.getAttribute("aria-label"));
    if (!panel.id) {
      panel.id = media.id + "-volume";
      volumeToggle.button.setAttribute("aria-controls", panel.id);
    }
    for (const control of [play, seek, mute, volume]) control.setAttribute("aria-controls", media.id);
    media.addEventListener("loadedmetadata", () => {
      if (pending !== null) { media.currentTime = Math.min(pending, duration()); pending = null; }
      position();
    }, opts);
    for (const name of ["timeupdate", "durationchange", "seeking", "seeked"]) media.addEventListener(name, position, opts);
    for (const name of ["play", "pause", "ended", "volumechange"]) media.addEventListener(name, state, opts);
    state(); position();
  }

  function seekTo(time) {
    if (media.readyState >= 1) media.currentTime = time;
    else {
      pending = time;
      if (media.preload === "none") { media.preload = "metadata"; media.load(); }
    }
    position();
  }
  seek.addEventListener("input", () => seekTo(Number(seek.value)));
  seek.addEventListener("keydown", event => {
    if (event.altKey || event.ctrlKey || event.metaKey) return;
    const length = duration(), step = length < 30 ? 1 : 5;
    const time = Number(seek.value);
    const keys = {
      ArrowRight: time + step, ArrowUp: time + step,
      ArrowLeft: time - step, ArrowDown: time - step,
      PageUp: time + length / 10, PageDown: time - length / 10,
      Home: 0, End: length,
    };
    if (!Object.hasOwn(keys, event.key)) return;
    event.preventDefault();
    seekTo(Math.max(0, Math.min(length, keys[event.key])));
  });
  volumeToggle.button.addEventListener("click", () => {
    const opening = panel.hidden;
    closeVolumePanel();
    if (!opening) return;
    panel.hidden = false;
    volumeToggle.button.setAttribute("aria-expanded", "true");
    openVolumePanel = { button: volumeToggle.button, panel };
    const rect = gain.getBoundingClientRect();
    const headerBottom = document.querySelector(".masthead")?.getBoundingClientRect().bottom ?? 0;
    panel.toggleAttribute("data-below", rect.top - headerBottom < panel.offsetHeight + 8 && window.innerHeight - rect.bottom >= panel.offsetHeight + 8);
    volume.focus({ preventScroll: true });
  });
  mute.addEventListener("click", () => {
    if (media.muted || !media.volume) { if (!media.volume) media.volume = .75; media.muted = false; }
    else media.muted = true;
    state();
  });
  volume.addEventListener("input", () => { media.volume = Number(volume.value); media.muted = !media.volume; state(); });
  return { select, seek, seekTo };
}
