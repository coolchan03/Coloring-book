// The one icon set for the whole app: 24x24 outline glyphs that inherit the current text color.
// Markup uses <i data-icon="name"></i>; scripts call icon('name') for an <svg> element.

const PATHS = {
  home: '<path d="M3 11l9-8 9 8"/><path d="M5 10v10h5v-6h4v6h5V10"/>',
  sliders: '<path d="M4 7h9M17 7h3M4 17h3M11 17h9"/><circle cx="15" cy="7" r="2"/><circle cx="9" cy="17" r="2"/>',
  'chevron-left': '<path d="M15 5l-7 7 7 7"/>',
  'chevron-right': '<path d="M9 5l7 7-7 7"/>',
  undo: '<path d="M4 9h11a5 5 0 010 10H9"/><path d="M8 5L4 9l4 4"/>',
  redo: '<path d="M20 9H9a5 5 0 000 10h6"/><path d="M16 5l4 4-4 4"/>',
  trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
  share: '<path d="M12 15V3M8 7l4-4 4 4M5 12v8h14v-8"/>',
  download: '<path d="M12 3v12M8 11l4 4 4-4M5 20h14"/>',
  upload: '<path d="M12 15V3M8 7l4-4 4 4M5 15v5h14v-5"/>',
  print: '<path d="M7 9V3h10v6M7 17H4v-7h16v7h-3"/><path d="M7 14h10v7H7z"/>',
  heart: '<path d="M12 20s-7-4.500-7-10a4 4 0 017-2.500A4 4 0 0119 10c0 5.500-7 10-7 10z"/>',
  star: '<path d="M12 3l2.700 5.600 6.100.9-4.400 4.300 1 6.100L12 17l-5.400 2.900 1-6.100L3.200 9.500l6.100-.9z"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  minus: '<path d="M5 12h14"/>',
  close: '<path d="M6 6l12 12M18 6L6 18"/>',
  check: '<path d="M5 12l5 5 9-10"/>',
  search: '<circle cx="11" cy="11" r="6"/><path d="M20 20l-4.500-4.500"/>',
  dice: '<rect x="4" y="4" width="16" height="16" rx="3"/><g fill="currentColor" stroke="none"><circle cx="9" cy="9" r="1.300"/><circle cx="15" cy="9" r="1.300"/><circle cx="9" cy="15" r="1.300"/><circle cx="15" cy="15" r="1.300"/></g>',
  fit: '<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.500 1.500M17.500 17.500L19 19M5 19l1.500-1.500M17.500 6.500L19 5"/>',
  moon: '<path d="M20 14A8 8 0 0110 4a8 8 0 1010 10z"/>',
  contrast: '<circle cx="12" cy="12" r="8"/><path d="M12 4a8 8 0 010 16z" fill="currentColor"/>',
  palette: '<path d="M12 3a9 9 0 100 18c1.500 0 2-1 1.500-2s0-2 1.500-2h2a4 4 0 004-4c0-5-4-10-9-10z"/><g fill="currentColor" stroke="none"><circle cx="8" cy="11" r="1.200"/><circle cx="12" cy="7.500" r="1.200"/><circle cx="16" cy="10" r="1.200"/></g>',
  image: '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="1.500"/><path d="M21 16l-5-5-8 9"/>',
  archive: '<rect x="3" y="4" width="18" height="5" rx="1"/><path d="M5 9v10h14V9M10 13h4"/>',
  keyboard: '<rect x="2" y="6" width="20" height="12" rx="2"/><path d="M6 10h.01M10 10h.01M14 10h.01M18 10h.01M7 14h10"/>',
  hand: '<path d="M8 12V6a1.500 1.500 0 013 0v5V4.500a1.500 1.500 0 013 0V11V6a1.500 1.500 0 013 0v8c0 4-2.500 7-6 7-3 0-4.500-1.500-6-4l-2-3a1.500 1.500 0 012.500-1.500z"/>',
  symmetry: '<path d="M12 3v18" stroke-dasharray="2 2.500"/><path d="M8 7L3 12l5 5zM16 7l5 5-5 5z"/>',
  zoomin: '<circle cx="11" cy="11" r="6"/><path d="M20 20l-4.500-4.500M11 8v6M8 11h6"/>',
  zoomout: '<circle cx="11" cy="11" r="6"/><path d="M20 20l-4.500-4.500M8 11h6"/>',
  grid: '<rect x="4" y="4" width="7" height="7" rx="1.500"/><rect x="13" y="4" width="7" height="7" rx="1.500"/><rect x="4" y="13" width="7" height="7" rx="1.500"/><rect x="13" y="13" width="7" height="7" rx="1.500"/>',
  /* tools */
  brush: '<path d="M18 3l3 3-9 9-3-3z"/><path d="M9 12c-3 0-4 2-4 4 0 1.500-1 3-2 3 4 1 8 0 8-4"/>',
  fill: '<path d="M4 12l8-8 8 8-7 7a2 2 0 01-3 0z"/><path d="M4 12h16"/><path d="M21 16c1 1.500 1.500 2.300 1.500 3a1.500 1.500 0 01-3 0c0-.7.500-1.500 1.500-3z"/>',
  eraser: '<path d="M4 16l9-9a2 2 0 013 0l3 3a2 2 0 010 3l-6 6H8z"/><path d="M8 20h12M10 10l6 6"/>',
  pick: '<path d="M14 5l5 5M16 3l5 5-3 2-8 8H6l-1-1v-4l8-8z"/>',
  /* brush types */
  pen: '<path d="M12 21l-3-6 3-12 3 12z"/><path d="M9 15h6"/><circle cx="12" cy="12" r="1"/>',
  marker: '<path d="M5 19l2-5 8-8 3 3-8 8z"/><path d="M14 7l3 3M4 21h6"/>',
  pencil: '<path d="M4 20l1-4L16 5l3 3L8 19z"/><path d="M14 7l3 3"/>',
  crayon: '<path d="M6 18l9-9 3 3-9 9H6z"/><path d="M15 9l2-2 3 3-2 2"/><path d="M6 18l-2 2"/>',
  paint: '<path d="M20 4c-4 1-9 5-10 9l2 2c4-1 8-6 8-11z"/><path d="M10 13c-3 0-4 2-4 4 0 1-1 2-2 2 3 1 7 0 7-3"/>',
  spray: '<rect x="5" y="9" width="8" height="12" rx="2"/><path d="M7 9V6h4v3M16 6h.01M19 4h.01M19 8h.01M16 10h.01"/>',
  sparkle: '<path d="M12 3l2 6 6 3-6 3-2 6-2-6-6-3 6-3z"/>'
};

const NS = 'http://www.w3.org/2000/svg';

export function icon(name) {
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('class', 'ic');
  svg.setAttribute('aria-hidden', 'true');
  svg.dataset.name = name;
  svg.innerHTML = PATHS[name] || '';
  return svg;
}

// Replaces every <i data-icon="x"></i> under root with the matching <svg>.
export function hydrateIcons(root = document) {
  root.querySelectorAll('i[data-icon]').forEach((n) => n.replaceWith(icon(n.dataset.icon)));
}
