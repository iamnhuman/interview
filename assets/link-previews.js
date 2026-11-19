"use strict";

(() => {
  const card = document.getElementById("link-preview");
  const arrow = card.querySelector(".link-preview-arrow");
  const title = card.querySelector("strong");
  const description = card.querySelector("p");
  const meta = card.querySelector(".link-preview-meta");
  const address = card.querySelector(".link-preview-url");
  const picture = card.querySelector("img");
  const video = card.querySelector("video");
  const hover = matchMedia("(any-hover: hover)");
  let anchor = null;
  let pending = null;
  let timer = 0;
  let line = 0;

  function place() {
    if (!anchor || card.hidden) return;
    const rect = anchor.getClientRects()[line] || anchor.getBoundingClientRect();
    const width = document.documentElement.clientWidth, height = window.innerHeight;
    if (rect.bottom <= 0 || rect.top >= height || !rect.width) { hide(); return; }
    const x = Math.max(8, Math.min(rect.left, width - card.offsetWidth - 8));
    const below = rect.bottom + 7;
    const y = below + card.offsetHeight <= height - 8 ? below : Math.max(8, rect.top - card.offsetHeight - 7);
    card.style.left = `${x}px`;
    card.style.top = `${y}px`;
  }

  function hide() {
    clearTimeout(timer);
    pending = null;
    if (anchor) {
      const ids = (anchor.getAttribute("aria-describedby") || "").split(/\s+/).filter(id => id && id !== card.id);
      if (ids.length) anchor.setAttribute("aria-describedby", ids.join(" "));
      else anchor.removeAttribute("aria-describedby");
    }
    anchor = null;
    card.hidden = true;
    if (!video.hidden) {
      video.pause();
      video.hidden = true;
    }
    video.onerror = null;
    picture.removeAttribute("src");
  }

  function showMedia(link, record) {
    picture.dataset.layout = record.imageLayout || "";
    if (!record.video || !video.canPlayType("video/mp4")) {
      picture.hidden = !record.image;
      if (record.image) picture.src = record.animatedImage || record.image;
      return;
    }
    picture.hidden = true;
    video.poster = record.image;
    video.muted = true;
    if (video.getAttribute("src") !== record.video) video.src = record.video;
    video.hidden = false;
    function showFallback() {
      if (anchor !== link || video.hidden) return;
      video.hidden = true;
      picture.src = record.animatedImage || record.image;
      picture.hidden = false;
      place();
    }
    video.onerror = showFallback;
    video.play().catch(error => { if (error.name !== "AbortError") showFallback(); });
  }

  function show(link, record, clientY) {
    const href = link.getAttribute("href");
    hide();
    if (!link.isConnected) return;
    anchor = link;
    line = Math.max(0, [...link.getClientRects()].findIndex(rect => clientY >= rect.top && clientY <= rect.bottom));
    arrow.textContent = "↗";
    address.textContent = href;
    meta.textContent = record.meta || "";
    meta.hidden = !record.meta;
    title.textContent = record.title;
    description.textContent = record.description || "";
    description.hidden = !record.description;
    link.setAttribute("aria-describedby", [link.getAttribute("aria-describedby"), card.id].filter(Boolean).join(" "));
    card.hidden = false;
    showMedia(link, record);
    place();
  }

  function request(link, record, y, delay) {
    clearTimeout(timer);
    if (anchor === link) return;
    hide();
    pending = link;
    timer = window.setTimeout(() => show(link, record, y), delay);
  }
  const links = document.querySelectorAll("a[href]:not([download], [data-photo])");
  for (const link of links) {
    const group = link.closest("[data-preview-image]");
    const record = linkCards[link.getAttribute("href")] || (group && {
      title: link.getAttribute("aria-label"),
      image: group.dataset.previewImage,
    });
    if (!record) continue;
    link.addEventListener("pointerenter", event => {
      if (hover.matches && event.pointerType !== "touch") request(link, record, event.clientY, 240);
    });
    link.addEventListener("pointerleave", () => {
      if (pending !== link && anchor !== link) return;
      clearTimeout(timer);
      if (!link.matches(":focus-visible")) hide();
    });
    link.addEventListener("focus", () => { if (link.matches(":focus-visible")) request(link, record, null, 0); });
    link.addEventListener("blur", hide);
    link.addEventListener("click", hide);
  }
  picture.addEventListener("error", () => { picture.hidden = true; place(); });
  document.addEventListener("keydown", event => {
    if (event.key !== "Escape") return;
    hide();
  });
  document.addEventListener("pointerdown", hide);
  window.addEventListener("scroll", hide, { passive: true });
  window.addEventListener("resize", place);
})();
