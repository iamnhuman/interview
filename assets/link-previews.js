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
  const markSymbols = document.getElementById("source-marks")?.content;
  const hover = matchMedia("(any-hover: hover)");
  const shortDomains = new Map([["open.spotify.com", "spotify.com"]]);
  const sourceMarks = new Map([
    ["bandcamp.com", "bandcamp"], ["fandom.com", "fandom"], ["github.io", "github"],
    ["higgsfield.ai", "higgsfield"], ["instagram.com", "instagram"], ["reddit.com", "reddit"],
    ["soundcloud.com", "soundcloud"], ["spotify.com", "spotify"], ["t.me", "telegram"],
    ["vk.com", "vk"], ["vk.ru", "vk"], ["youtu.be", "youtube"], ["youtube.com", "youtube"],
  ]);
  const sources = new WeakMap();
  let anchor = null;
  let pending = null;
  let activeSource = null;
  let timer = 0;
  let line = 0;

  function createSourceMark(link) {
    const domain = link.hostname.split(".").slice(-2).join(".");
    const icon = link.getAttribute("type") === "application/pdf" ? "document" : sourceMarks.get(domain) || "website";
    const symbol = markSymbols?.querySelector(`#${icon}`);
    if (!symbol) return null;
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("class", `source-mark source-mark-${icon}`);
    svg.setAttribute("viewBox", symbol.getAttribute("viewBox"));
    svg.setAttribute("aria-hidden", "true");
    svg.setAttribute("focusable", "false");
    for (const shape of symbol.children) svg.append(shape.cloneNode(true));
    return svg;
  }

  function createSource(link, list, sectionId, numbered) {
    const number = list.children.length + 1;
    const href = link.getAttribute("href");
    let site = shortDomains.get(link.hostname) || link.hostname.replace(/^www\./, "") || "В интервью";
    if (site === "t.me") {
      const channel = link.pathname.split("/")[1];
      if (channel) site = `t.me/${channel}`;
    }
    if (link.getAttribute("type") === "application/pdf") site = "PDF";
    const record = linkCards[href] || { title: link.textContent.trim() || href, meta: site };
    const row = document.createElement("a");
    row.className = "source-link";
    row.id = `source-${sectionId}-${number}`;
    for (const attribute of ["href", "target", "rel", "type"]) {
      if (link.hasAttribute(attribute)) row.setAttribute(attribute, link.getAttribute(attribute));
    }
    if (numbered) {
      const index = document.createElement("span");
      index.className = "source-index";
      index.setAttribute("aria-hidden", "true");
      index.textContent = number;
      row.append(index);
    }
    const label = document.createElement("span");
    label.className = "source-title";
    label.textContent = record.title;
    const domain = document.createElement("span");
    domain.className = "source-site";
    const mark = createSourceMark(link);
    if (mark) domain.append(mark);
    domain.append(record.displayUrl || site);
    row.append(label, domain);
    const item = document.createElement("li");
    item.append(row);
    list.append(item);
    const source = { number, record, row, links: [row] };
    sources.set(row, source);
    return source;
  }

  function connectSourceLink(link, source, numbered) {
    source.links.push(link);
    sources.set(link, source);
    if (!numbered) return;

    const jump = document.createElement("a");
    jump.href = "#" + source.row.id;
    jump.textContent = source.number;
    jump.setAttribute("aria-label", `К источнику ${source.number} — ${source.record.title}`);
    const marker = document.createElement("sup");
    marker.className = "source-ref";
    marker.append(jump);
    let end = link.closest(".artist-name") || link;
    const after = end.nextSibling;
    if (after?.nodeType === Node.TEXT_NODE && after.data.startsWith("»")) {
      after.splitText(1);
      end = after;
    }
    end.after(marker);
    source.links.push(jump);
    sources.set(jump, source);
  }

  function buildSourceLists() {
    const article = document.querySelector(".interview");
    let section;
    const sections = [];
    for (const block of article.querySelectorAll(".question-copy, .answer-copy p, figure, blockquote, figcaption")) {
      if (block.matches(".question-copy") && !block.parentElement.hasAttribute("data-sources-continue")) {
        section = {
          id: block.id.replace(/-title$/, ""),
          links: [],
          atEnd: block.parentElement.hasAttribute("data-sources-at-end"),
        };
        sections.push(section);
      }
      if (!section) continue;
      section.end = block.closest("figure") || block;
      if (block.matches("figure")) {
        if (block.matches("[data-audio-player], [data-video-gallery], [data-sources-before]")) section.listBefore ??= block;
      } else {
        section.links.push(...block.querySelectorAll("a[href]:not([download], [data-photo])"));
      }
    }
    for (const { id, links, end, listBefore, atEnd } of sections) {
      if (!links.length) continue;
      const list = document.createElement("ol");
      list.className = "source-list";
      list.setAttribute("role", "list");
      list.setAttribute("aria-label", "Источники");
      const numbered = new Set(links.map(link => link.href)).size > 1;
      const byURL = new Map();
      for (const link of links) {
        let source = byURL.get(link.href);
        if (!source) {
          source = createSource(link, list, id, numbered);
          byURL.set(link.href, source);
        }
        connectSourceLink(link, source, numbered);
      }
      if (listBefore && !atEnd) listBefore.before(list);
      else end.after(list);
    }
    return sections.flatMap(section => section.links);
  }

  function highlight(source) {
    if (source === activeSource) return;
    for (const link of activeSource?.links || []) link.classList.remove("source-active");
    for (const link of source?.links || []) link.classList.add("source-active");
    activeSource = source;
  }

  function place() {
    if (!anchor || card.hidden) return;
    const rect = anchor.getClientRects()[line] || anchor.getBoundingClientRect();
    const width = document.documentElement.clientWidth, height = window.innerHeight;
    if (rect.bottom <= 0 || rect.top >= height || !rect.width) { hide(); return; }
    const x = Math.max(8, Math.min(rect.left, width - card.offsetWidth - 8));
    const above = rect.top - card.offsetHeight - 7;
    const y = above >= 8 ? above : Math.max(8, Math.min(rect.bottom + 7, height - card.offsetHeight - 8));
    card.style.left = `${x}px`;
    card.style.top = `${y}px`;
  }

  function hide() {
    clearTimeout(timer);
    highlight(null);
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
    const layout = record.imageLayout || "";
    picture.dataset.layout = layout;
    video.dataset.layout = layout;
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

  function setMeta(text = "") {
    meta.hidden = !text;
    const parts = text.split(/«(Telegram|Spotify|SoundCloud)»/u);
    meta.replaceChildren(...parts.map((part, index) => {
      if (index % 2 === 0) return part;
      const name = document.createElement("span");
      name.className = "artist-name";
      const opening = document.createElement("span");
      opening.className = "artist-quote";
      const closing = opening.cloneNode(false);
      opening.textContent = "«";
      closing.textContent = "»";
      name.append(opening, part, closing);
      return name;
    }));
  }

  function show(link, record, clientY) {
    if (!link.isConnected) { hide(); return; }
    pending = null;
    anchor = link;
    line = Math.max(0, [...link.getClientRects()].findIndex(rect => clientY >= rect.top && clientY <= rect.bottom));
    arrow.textContent = "↗";
    const destination = activeSource?.row || link;
    const label = destination.getAttribute("type") === "application/pdf"
      ? destination.pathname.split("/").pop()
      : destination.getAttribute("href");
    address.textContent = record.previewAddress || record.displayUrl || shortDomains.get(destination.hostname) || label;
    setMeta(record.meta);
    title.textContent = record.title;
    description.textContent = record.description || "";
    description.hidden = !record.description;
    link.setAttribute("aria-describedby", [link.getAttribute("aria-describedby"), card.id].filter(Boolean).join(" "));
    card.hidden = false;
    showMedia(link, record);
    place();
  }

  function request(link, record, y, delay) {
    if (anchor === link) return;
    hide();
    highlight(sources.get(link));
    pending = link;
    timer = window.setTimeout(() => show(link, record, y), delay);
  }
  const citedLinks = buildSourceLists();
  initDisplaySwitch("bibliography", "shown", "hidden", (value, control) => {
    const shown = value === "shown";
    control.title = shown ? "Скрыть библиографию" : "Показать библиографию";
    for (const link of citedLinks) {
      if (shown) link.setAttribute("aria-details", sources.get(link).row.id);
      else link.removeAttribute("aria-details");
    }
    hide();
  }, { preservePosition: true });
  const links = document.querySelectorAll("a[href]:not([download], [data-photo])");
  for (const link of links) {
    const group = link.closest("[data-preview-image]");
    const record = sources.get(link)?.record || linkCards[link.getAttribute("href")] || (group && {
      title: link.getAttribute("aria-label"),
      image: group.dataset.previewImage,
    });
    if (!record) continue;
    link.addEventListener("pointerenter", event => {
      if (hover.matches && event.pointerType !== "touch") request(link, record, event.clientY, 240);
    });
    link.addEventListener("pointerleave", () => {
      if (pending !== link && anchor !== link) return;
      if (!link.matches(":focus-visible")) hide();
    });
    link.addEventListener("focus", () => { if (link.matches(":focus-visible")) request(link, record, null, 0); });
    link.addEventListener("blur", () => { if (pending === link || anchor === link) hide(); });
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
  new ResizeObserver(place).observe(card);
})();
