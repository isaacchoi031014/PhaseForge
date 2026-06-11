/**
 * Drifting background glyphs across STEM domains — mathematics, computer
 * science, chemistry, organic chemistry, electronics, biology, and
 * engineering. Grouped by domain so spawns draw EVENLY from every field
 * (pick a domain at random, then a symbol within it) rather than favoring
 * whichever domain happens to list the most symbols.
 *
 * Kept to glyphs/tokens that render in a serif + symbol fallback stack
 * (see GLYPH_FONT). A few technical marks (⌬ benzene, ⏚ ground, ⎓ DC,
 * ⌀ diameter) rely on a system symbol font to render.
 */
export const GLYPH_DOMAINS: readonly (readonly string[])[] = [
  // Mathematics
  ["∫", "∑", "√", "π", "θ", "λ", "∇", "∂", "Δ", "∞", "≈", "f(x)", "dy/dx", "x²", "eˣ", "lim", "∮"],
  // Computer science
  ["O(n)", "0xFF", "0xA1", "ADD X1 X2"],
  // Chemistry
  ["H₂O", "CO₂", "NaCl", "O₂", "pH", "⇌", "mol", "OH⁻", "H⁺", "NH₃", "Na⁺", "Cl⁻"],
  // Organic chemistry
  ["⌬", "C₆H₆", "–OH", "C=O", "–COOH"],
  // Electronics
  ["Ω", "nF", "±", "⏚", "⎓"],
  // Engineering
  ["MPa", "kN", "ε", "τ"],
];

/** Serif-first font stack with symbol fallbacks for the technical glyphs. */
export const GLYPH_FONT = `Georgia, "Times New Roman", "Apple Symbols", "Segoe UI Symbol", serif`;

/** Uniformly pick a domain, then a symbol within it — even cross-domain mix. */
export function randomGlyph(): string {
  const domain = GLYPH_DOMAINS[Math.floor(Math.random() * GLYPH_DOMAINS.length)];
  return domain[Math.floor(Math.random() * domain.length)];
}
