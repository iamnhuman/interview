"use strict";

// Eleven blade silhouettes and four different structures form a fixed alphabet
// of 44 signs. SVG sources stay sharp in both the small rail and the larger preview.
const questionSigilSources = (() => {
  const wings = [
    "M2 10C16 16 24 3 35 10L46 16C30 11 22 23 2 10ZM10 24C24 12 33 16 45 17C30 17 22 27 10 24Z",
    "M4 27C10 7 27 3 46 15L44 18C27 9 15 16 4 27ZM12 5C20 11 29 10 37 13C26 15 17 13 12 5Z",
    "M2 17L17 11L25 13L20 3L34 13L46 16L34 19L20 29L25 19L17 21ZM8 17L19 17L14 15Z",
    "M3 5C19 24 32 4 46 16C28 11 21 31 3 5ZM5 27C23 11 33 27 45 17C32 19 23 6 5 27Z",
    "M2 16C15 0 33 5 46 16C31 28 14 30 2 16ZM9 16C21 23 31 21 39 16C29 10 20 9 9 16Z",
    "M3 16C16 16 17 6 15 2C27 8 18 15 34 15L46 16L34 19C18 22 24 28 27 30C12 28 17 18 3 16Z",
    "M2 16L20 13L14 8L29 13L26 4L37 14L46 16L34 20L26 28L29 19L14 24L20 18Z",
    "M2 24C17 28 17 4 32 9L46 16C32 9 25 20 22 23C14 30 7 28 2 24ZM9 8C19 5 23 7 28 12C18 9 17 17 9 8Z",
    "M2 16C15 13 25 2 34 5L46 16L34 27C25 30 15 19 2 16ZM15 16L33 22L40 16L33 10Z",
    "M2 6C16 10 20 23 34 19L46 16C29 29 15 17 2 6ZM3 26C18 16 19 7 33 11L45 16C29 8 19 28 3 26Z",
    "M2 16L25 8L20 3L40 12L46 16L36 18L12 29L23 18ZM9 15L25 12L29 15Z",
  ];
  const cores = [
    "M48 1C50 10 53 13 58 16C52 18 50 23 48 31C46 23 44 18 38 16C44 13 46 10 48 1ZM48 9L44 16L48 23L52 16Z",
    "M41 2C43 12 55 11 56 18C57 24 50 29 44 30C49 24 51 21 49 18C46 13 39 13 41 2ZM55 2C49 7 46 11 47 15C50 19 56 21 55 30C52 20 42 22 40 15C39 9 49 4 55 2Z",
    "M48 2L60 16L48 30L36 16ZM48 8L42 16L48 24L54 16ZM31 16L40 14L43 16L40 18ZM65 16L56 14L53 16L56 18Z",
    "M38 3C40 12 43 15 47 15L48 0L50 15C55 14 58 10 61 5C58 15 54 18 50 18L48 32L46 18C41 18 38 13 38 3ZM36 25L44 20L45 22ZM60 26L52 21L51 23Z",
  ];
  const openingCore = "M31 16Q42 12 48 2Q54 12 65 16Q54 20 48 30Q42 20 31 16ZM39 16L48 20L57 16L48 12Z";
  return Array.from({ length: 44 }, (_, index) => {
    const silhouette = index % wings.length;
    const structure = Math.floor(index / wings.length);
    const opposite = (silhouette + [0, 3, 7, 0][structure]) % wings.length;
    const tilt = structure === 3 ? -6 : 0;
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -2 96 36" fill-rule="evenodd">
      <defs><linearGradient id="silver" x1="0" y1="0" x2="0.2" y2="1">
        <stop offset="0" stop-color="#89939c"/><stop offset=".24" stop-color="#f8fbff"/>
        <stop offset=".46" stop-color="#9da8b2"/><stop offset=".58" stop-color="#eef3f7"/>
        <stop offset=".77" stop-color="#69747f"/><stop offset="1" stop-color="#c9d2db"/>
      </linearGradient></defs>
      <g fill="url(#silver)" stroke="#bfc9d1" stroke-width=".22" stroke-linejoin="round">
        <g transform="rotate(${tilt} 48 16)"><path d="${wings[silhouette]}"/>
          <path transform="translate(96 0) scale(-1 1)" d="${wings[opposite]}"/></g>
        <path d="${index === 0 ? openingCore : cores[structure]}"/>
      </g></svg>`;
    return `data:image/svg+xml,${encodeURIComponent(svg)}`;
  });
})();
