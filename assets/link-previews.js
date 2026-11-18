"use strict";

(() => {
  const card = document.getElementById("link-preview");
  const arrow = card.querySelector(".link-preview-arrow");
  const title = card.querySelector("strong");
  const description = card.querySelector("p");
  const picture = card.querySelector("img");
  const hover = matchMedia("(any-hover: hover)");
  let anchor = null;
  let pending = null;
  let timer = 0;
  let line = 0;

  function details(link) {
    const href = link.getAttribute("href");
    const record = linkCards[href];
    if (record) return { ...record, arrow: "↗" };
    const target = href.startsWith("#") ? document.getElementById(href.slice(1)) : link.closest("[data-audio-player]");
    if (!target) return null;
    if (target.matches("[data-audio-player]")) {
      return { arrow: "↓", title: target.querySelector(".track-title strong").textContent,
        description: [target.querySelector(".track-artist").textContent, target.querySelector("[data-duration]").textContent].join(" · ") };
    }
    const heading = target.querySelector("h1, h2");
    return heading ? { arrow: href === "#top" ? "↑" : "↓", title: heading.textContent.trim() } : null;
  }

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
  }

  function show(link, clientY) {
    const record = details(link);
    hide();
    if (!record || !link.isConnected) return;
    anchor = link;
    line = Math.max(0, [...link.getClientRects()].findIndex(rect => clientY >= rect.top && clientY <= rect.bottom));
    arrow.textContent = record.arrow;
    title.textContent = record.title;
    description.textContent = record.description || "";
    description.hidden = !record.description;
    picture.hidden = !record.image;
    if (record.image) picture.src = record.image;
    else picture.removeAttribute("src");
    link.setAttribute("aria-describedby", [link.getAttribute("aria-describedby"), card.id].filter(Boolean).join(" "));
    card.hidden = false;
    place();
  }

  function request(link, y, delay) {
    clearTimeout(timer);
    if (anchor === link) return;
    hide();
    pending = link;
    timer = window.setTimeout(() => show(link, y), delay);
  }
  // Question marks have their own preview. Photograph links already show their subject.
  const links = document.querySelectorAll("a[href]:not([data-photo], .question-jump, .read-link)");
  for (const link of links) {
    link.addEventListener("pointerenter", event => {
      if (hover.matches && event.pointerType !== "touch") request(link, event.clientY, 240);
    });
    link.addEventListener("pointerleave", () => {
      if (pending !== link && anchor !== link) return;
      clearTimeout(timer);
      if (!link.matches(":focus-visible")) hide();
    });
    link.addEventListener("focus", () => { if (link.matches(":focus-visible")) request(link, null, 0); });
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
