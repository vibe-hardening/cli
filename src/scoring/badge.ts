import type { Grade } from './score.js';

const GRADE_COLORS: Record<Grade, string> = {
  A: '#4c1',
  B: '#97CA00',
  C: '#dfb317',
  D: '#fe7d37',
  F: '#e05d44',
};

/**
 * shields.io-compatible flat-square SVG. Width is computed from the
 * measured text so badges look tidy for any score / grade combination.
 */
export function renderBadge(score: number, grade: Grade): string {
  const label = 'vibe-hardening';
  const value = `${score}/100 ${grade}`;
  const labelWidth = Math.round(label.length * 6.2 + 14);
  const valueWidth = Math.round(value.length * 7 + 14);
  const totalWidth = labelWidth + valueWidth;
  const color = GRADE_COLORS[grade];

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${totalWidth}" height="20" role="img" aria-label="${label}: ${value}">
  <title>${label}: ${value}</title>
  <linearGradient id="vh-g" x2="0" y2="100%">
    <stop offset="0" stop-color="#bbb" stop-opacity=".1"/>
    <stop offset="1" stop-opacity=".1"/>
  </linearGradient>
  <clipPath id="vh-c"><rect width="${totalWidth}" height="20" rx="3" fill="#fff"/></clipPath>
  <g clip-path="url(#vh-c)">
    <rect width="${labelWidth}" height="20" fill="#555"/>
    <rect x="${labelWidth}" width="${valueWidth}" height="20" fill="${color}"/>
    <rect width="${totalWidth}" height="20" fill="url(#vh-g)"/>
  </g>
  <g fill="#fff" text-anchor="middle" font-family="Verdana,DejaVu Sans,Geneva,sans-serif" text-rendering="geometricPrecision" font-size="11">
    <text aria-hidden="true" x="${labelWidth / 2}" y="15" fill="#010101" fill-opacity=".3">${label}</text>
    <text x="${labelWidth / 2}" y="14">${label}</text>
    <text aria-hidden="true" x="${labelWidth + valueWidth / 2}" y="15" fill="#010101" fill-opacity=".3">${value}</text>
    <text x="${labelWidth + valueWidth / 2}" y="14">${value}</text>
  </g>
</svg>`;
}

export function renderBadgeUrl(score: number, grade: Grade): string {
  return `https://img.shields.io/badge/vibe--hardening-${encodeURIComponent(
    `${score}%2F100 ${grade}`,
  )}-${GRADE_COLORS[grade].slice(1)}`;
}
