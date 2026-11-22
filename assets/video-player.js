"use strict";

(() => {
  function element(tag, className) {
    const node = document.createElement(tag);
    node.className = className;
    return node;
  }

  function enhance(gallery) {
    const deck = gallery.querySelector(".video-deck");
    const stage = deck.querySelector(".video-stage");
    const clips = [...stage.querySelectorAll("video")];
    if (!clips.length || !clips[0].canPlayType("video/mp4")) return;
    stage.classList.add("player-screen");
    const bar = element("div", "video-bar");
    const controls = createMediaControls(bar);
    const fullscreen = mediaIconButton("clip-fullscreen", "На весь экран", "expand");
    bar.append(fullscreen.button);
    const notice = element("p", "clip-error");
    notice.setAttribute("role", "status"); notice.setAttribute("data-media-error", "");
    notice.textContent = "Не удалось воспроизвести этот фрагмент."; notice.hidden = true;
    const picker = element("div", "video-picker");
    picker.setAttribute("role", "group"); picker.setAttribute("aria-label", "Фрагменты видео");
    picker.classList.toggle("clip-pair", clips.length === 2);
    const columns = gallery.dataset.previewRows === "2" ? Math.ceil(clips.length / 2) : 1;
    if (columns > 1) picker.style.setProperty("--clip-columns", String(columns));
    const choices = [];
    let clip = null;
    stage.append(notice);
    deck.append(picker, bar);
    picker.hidden = clips.length < 2;
    fullscreen.button.hidden = !deck.requestFullscreen && !clips[0].webkitEnterFullscreen;

    function fitFrame() {
      const w = clip.videoWidth || Number(clip.getAttribute("width")), h = clip.videoHeight || Number(clip.getAttribute("height"));
      const ratio = w && h ? w / h : 16 / 9;
      gallery.style.setProperty("--clip-ratio", String(ratio));
      gallery.toggleAttribute("data-portrait", ratio < 1 && clips.length > 1);
    }
    function select(index, { fromThumbnail = false } = {}) {
      const next = clips[index], previous = clip;
      if (previous === next) {
        if (fromThumbnail && (next.paused || next.ended)) playMedia(next);
        return;
      }
      const finished = previous?.ended;
      const shouldPlay = fromThumbnail || (previous && (finished || !previous.paused));
      if (previous) {
        previous.pause();
        next.muted = previous.muted; next.volume = previous.volume; next.playbackRate = previous.playbackRate;
      }
      clip = next;
      choices.forEach((choice, i) => {
        clips[i].hidden = i !== index;
        choice.setAttribute("aria-pressed", String(i === index));
        choice.tabIndex = i === index ? 0 : -1;
      });
      const [minutes, seconds] = clip.dataset.length.split(":").map(Number);
      controls.select(clip, minutes * 60 + seconds);
      if ((fromThumbnail || finished) && clip.currentTime > 0) controls.seekTo(0);
      fullscreen.button.setAttribute("aria-controls", clip.id);
      notice.hidden = !clip.error;
      fitFrame();
      if (previous) gallery.dispatchEvent(new CustomEvent("interviewclipchange", { bubbles: true, detail: { previous, current: clip } }));
      if (shouldPlay) playMedia(clip);
    }
    clips.forEach((video, i) => {
      const item = element("button", "clip-choice");
      item.type = "button"; item.title = video.getAttribute("aria-label");
      item.setAttribute("aria-label", item.title + ", " + video.dataset.length);
      item.setAttribute("aria-controls", video.id);
      const img = element("img", "clip-thumb");
      img.alt = ""; img.src = video.poster; img.loading = "lazy"; img.decoding = "async";
      const length = element("span", "clip-length"); length.textContent = video.dataset.length;
      const number = element("span", "clip-number"); number.textContent = String(i + 1).padStart(2, "0");
      const meta = element("span", "clip-meta"); meta.append(number, length);
      item.append(img, meta); picker.append(item); choices.push(item);
      item.addEventListener("click", () => select(i, { fromThumbnail: true }));
      video.addEventListener("click", () => {
        if (clip !== video) return;
        if (video.paused || video.ended) playMedia(video); else video.pause();
      });
      video.addEventListener("loadedmetadata", () => { if (clip === video) fitFrame(); });
      video.addEventListener("error", () => { if (clip === video) notice.hidden = false; });
    });
    picker.addEventListener("keydown", event => {
      if (event.altKey || event.ctrlKey || event.metaKey) return;
      const index = choices.indexOf(event.target);
      if (index < 0) return;
      const layout = getComputedStyle(picker);
      const columnsInView = layout.gridAutoFlow === "row" ? layout.gridTemplateColumns.split(" ").length : columns;
      const destinations = {
        ArrowLeft: index - 1, ArrowRight: index + 1,
        ArrowUp: index >= columnsInView ? index - columnsInView : index,
        ArrowDown: index + columnsInView < choices.length ? index + columnsInView : index,
        Home: 0, End: choices.length - 1,
      };
      if (!Object.hasOwn(destinations, event.key)) return;
      event.preventDefault();
      const next = Math.max(0, Math.min(choices.length - 1, destinations[event.key]));
      select(next);
      choices[next].focus();
    });
    fullscreen.button.addEventListener("click", async () => {
      try {
        if (document.fullscreenElement === deck) await document.exitFullscreen();
        else if (deck.requestFullscreen) await deck.requestFullscreen();
        else clip.webkitEnterFullscreen();
      } catch { if (!document.fullscreenElement && clip.webkitSupportsFullscreen) clip.webkitEnterFullscreen(); }
    });
    document.addEventListener("fullscreenchange", () => {
      const full = document.fullscreenElement === deck;
      fullscreen.set(full ? "Свернуть" : "На весь экран", full ? "collapse" : "expand");
    });
    select(0);
    clips.forEach(video => { video.controls = false; });
    gallery.setAttribute("data-picker-ready", "");
  }
  document.querySelectorAll("[data-video-gallery]").forEach(enhance);
})();
