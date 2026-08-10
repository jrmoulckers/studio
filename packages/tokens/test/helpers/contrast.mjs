/**
 * WCAG 2.2 contrast math for the color formats Studio's themes actually author.
 *
 * Studio mixes `#rrggbb` and `oklch()` in the same palette, so a hex-only implementation
 * silently returns NaN for exactly the wide-gamut colors that are hardest to eyeball. Every
 * comparison here therefore resolves both formats, and an unparseable color is an error
 * rather than a skipped check.
 */

/** Linear-light sRGB channels for a `#rgb`/`#rrggbb` or `oklch(L C H)` color. */
export function linearRgb(color) {
  const text = String(color).trim();

  if (text.startsWith('#')) {
    const digits = text.slice(1);
    if (!/^[0-9a-f]{3}$|^[0-9a-f]{6}$/i.test(digits)) {
      throw new Error(`Unparseable hex color "${text}".`);
    }
    const full =
      digits.length === 3
        ? digits
            .split('')
            .map((digit) => digit + digit)
            .join('')
        : digits;
    return [0, 2, 4]
      .map((index) => parseInt(full.slice(index, index + 2), 16) / 255)
      .map((channel) =>
        channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4,
      );
  }

  const match = text.match(/^oklch\(\s*([\d.]+%?)\s+([\d.]+)\s+([\d.]+)/i);
  if (!match) throw new Error(`Unparseable color "${text}".`);

  const lightness = match[1].endsWith('%') ? parseFloat(match[1]) / 100 : parseFloat(match[1]);
  const chroma = parseFloat(match[2]);
  const hue = (parseFloat(match[3]) * Math.PI) / 180;

  const a = chroma * Math.cos(hue);
  const b = chroma * Math.sin(hue);

  // Oklab -> LMS -> linear sRGB (Björn Ottosson's published matrices).
  const l = (lightness + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (lightness - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (lightness - 0.0894841775 * a - 1.291485548 * b) ** 3;

  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];
}

/** WCAG relative luminance. Out-of-gamut oklch is clamped, matching what a display shows. */
export function luminance(color) {
  const [red, green, blue] = linearRgb(color).map((channel) => Math.min(1, Math.max(0, channel)));
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}

/** WCAG contrast ratio, order-independent. */
export function contrastRatio(first, second) {
  const [lighter, darker] = [luminance(first), luminance(second)].sort((a, b) => b - a);
  return (lighter + 0.05) / (darker + 0.05);
}
