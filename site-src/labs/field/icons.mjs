// Studio / Field switch icons for the Field lab. THE ONE PLACE TO PICK: change PICK to another id below.
// 24x24 glyphs. style 'fill' (current): solid shapes at 15px; style 'line': 16px outlines, stroke 1.8, round caps.
// Adapted from Lucide (ISC) and Tabler Icons (MIT); the sparkle, pocket knife and nib are hand-tuned.
// Inactive side: filled in the muted colour; active side: filled in the pill text colour (site.css).
// Override for a one-off build: SZ_FIELD_ICONS=<id>. Keep these strings free of backslashes and // (they are
// also pasted into the landing page's JSON-escaped template).
export const PICK = 'spark-axe';
export const PAIRS = [
  // filled glyphs (current): solid shapes, drawn at 15px with a thin round-joined stroke in the same colour to soften corners
  { style: 'fill', id: 'spark-axe', name: 'Sparkle / axe (filled)',
    studio: '<path d="M12 1.8c.9 5.5 3.4 8.4 10.2 10.2-6.8 1.8-9.3 4.7-10.2 10.2-.9-5.5-3.4-8.4-10.2-10.2C8.6 10.2 11.1 7.3 12 1.8Z"/>',
    field: '<path d="M15 15.5a.5.5 0 0 0 .5.5A6.5 6.5 0 0 0 22 9.5a.5.5 0 0 0-.5-.5h-1.672a2 2 0 0 1-1.414-.586l-5.062-5.062a1.205 1.205 0 0 0-1.704 0L9.352 5.648a1.205 1.205 0 0 0 0 1.704l5.062 5.062A2 2 0 0 1 15 13.828z"/><rect x=".5" y="13.5" width="15" height="3" rx="1.5" transform="rotate(-45 8 15)"/>' },
  { style: 'fill', id: 'nib-axe', name: 'Pen-tool nib / axe (filled)',
    studio: '<path fill-rule="evenodd" d="m18 13-.654-4.736a4 4 0 0 0-2.756-3.266l-9.163-2.9a2 2 0 0 0-2.017.493l-.82.819a2 2 0 0 0-.492 2.017l2.9 9.163a4 4 0 0 0 3.266 2.756L13 18ZM13 11a2 2 0 1 0-4 0 2 2 0 1 0 4 0Z"/><path d="M18.648 12.352a1.205 1.205 0 0 1 1.704 0l1.296 1.296a1.205 1.205 0 0 1 0 1.704l-6.296 6.296a1.205 1.205 0 0 1-1.704 0l-1.296-1.296a1.205 1.205 0 0 1 0-1.704z"/>',
    field: '<path d="M15 15.5a.5.5 0 0 0 .5.5A6.5 6.5 0 0 0 22 9.5a.5.5 0 0 0-.5-.5h-1.672a2 2 0 0 1-1.414-.586l-5.062-5.062a1.205 1.205 0 0 0-1.704 0L9.352 5.648a1.205 1.205 0 0 0 0 1.704l5.062 5.062A2 2 0 0 1 15 13.828z"/><rect x=".5" y="13.5" width="15" height="3" rx="1.5" transform="rotate(-45 8 15)"/>' },
  // line icons (first round; see sanz-field-icon-options-2026-10-08.png)
  { style: 'line', id: "cursor-axe", name: "Cursor / axe",
    studio: '<path d="M4.037 4.688a.495.495 0 0 1 .651-.651l16 6.5a.5.5 0 0 1-.063.947l-6.124 1.58a2 2 0 0 0-1.438 1.435l-1.579 6.126a.5.5 0 0 1-.947.063z"/>',
    field: '<path d="m14 12-8.381 8.38a1 1 0 0 1-3.001-3L11 9"/><path d="M15 15.5a.5.5 0 0 0 .5.5A6.5 6.5 0 0 0 22 9.5a.5.5 0 0 0-.5-.5h-1.672a2 2 0 0 1-1.414-.586l-5.062-5.062a1.205 1.205 0 0 0-1.704 0L9.352 5.648a1.205 1.205 0 0 0 0 1.704l5.062 5.062A2 2 0 0 1 15 13.828z"/>' },
  { style: 'line', id: "pen-knife", name: "Bezier pen / pocket knife",
    studio: '<path d="m18 13-.654-4.736a4 4 0 00-2.756-3.266l-9.163-2.9a2 2 0 00-2.017.493l-.82.819a2 2 0 00-.492 2.017l2.9 9.163a4 4 0 003.266 2.756L13 18"/><path d="M18.648 12.352a1.205 1.205 0 011.704 0l1.296 1.296a1.205 1.205 0 010 1.704l-6.296 6.296a1.205 1.205 0 01-1.704 0l-1.296-1.296a1.205 1.205 0 010-1.704z"/><path d="m3 3 6.586 6.586"/><circle cx="11" cy="11" r="2"/>',
    field: '<rect x="2.6" y="15.2" width="10" height="4.2" rx="2.1" transform="rotate(-45 7.6 17.3)"/><path d="M10.4 13.4 20.5 3.5c.5 4.2-2.3 8.7-7.4 11.6z"/>' },
  { style: 'line', id: "nib-hatchet", name: "Pen nib / hatchet",
    studio: '<path d="M9.5 14.5 4 20"/><path d="M17.5 6.5a2.12 2.12 0 0 0-3-3L6 12l-1 5 5-1 8.5-8.5z"/><path d="M14 7l3 3"/>',
    field: '<path d="M13 9l7.383 7.418c.823.82.823 2.148 0 2.967a2.11 2.11 0 0 1-2.976 0l-7.407-7.385"/><path d="M6.66 15.66l-3.32-3.32a1.25 1.25 0 0 1 .42-2.044l3.24-1.296 6-6 3 3-6 6-1.296 3.24a1.25 1.25 0 0 1-2.044.42"/>' },
  { style: 'line', id: "spark-flame", name: "Spark / campfire",
    studio: '<path d="M11.017 2.814a1 1 0 0 1 1.966 0l1.051 5.558a2 2 0 0 0 1.594 1.594l5.558 1.051a1 1 0 0 1 0 1.966l-5.558 1.051a2 2 0 0 0-1.594 1.594l-1.051 5.558a1 1 0 0 1-1.966 0l-1.051-5.558a2 2 0 0 0-1.594-1.594l-5.558-1.051a1 1 0 0 1 0-1.966l5.558-1.051a2 2 0 0 0 1.594-1.594z"/>',
    field: '<path d="M4 21l16-4"/><path d="M20 21 4 17"/><path d="M12 15a4 4 0 0 0 4-4c0-3-2-3-2-8-4 2-6 5-6 8a4 4 0 0 0 4 4"/>' },
  { style: 'line', id: "grid-compass", name: "Grid / compass",
    studio: '<path d="M12 3v18"/><path d="M3 12h18"/><rect x="3" y="3" width="18" height="18" rx="2"/>',
    field: '<circle cx="12" cy="12" r="10"/><path d="m16.24 7.76-1.804 5.411a2 2 0 0 1-1.265 1.265L7.76 16.24l1.804-5.411a2 2 0 0 1 1.265-1.265z"/>' },
  { style: 'line', id: "laptop-tent", name: "Laptop / tent",
    studio: '<rect x="4" y="5" width="16" height="11" rx="1.5"/><path d="M2 19h20"/><path d="M8 19v-1.5h8V19"/>',
    field: '<path d="M3.5 21 14 3"/><path d="M20.5 21 10 3"/><path d="M15.5 21 12 15l-3.5 6"/><path d="M2 21h20"/>' },
];
const LINE = 'fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"';
const FILL = 'fill="currentColor" stroke="currentColor" stroke-width="1" stroke-linejoin="round"';
export const svg = (body, style = 'line', size = style === 'fill' ? 15 : 16) => `<svg width="${size}" height="${size}" viewBox="0 0 24 24" ${style === 'fill' ? FILL : LINE} aria-hidden="true" focusable="false">${body}</svg>`;
export function pick(id = process.env.SZ_FIELD_ICONS || PICK) {
  const p = PAIRS.find((x) => x.id === id);
  if (!p) throw new Error(`field icons: unknown pair "${id}" (have: ${PAIRS.map((x) => x.id).join(', ')})`);
  return { ...p, studioSvg: svg(p.studio, p.style), fieldSvg: svg(p.field, p.style) };
}
