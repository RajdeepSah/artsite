// Canvas-drawn textures for the 3D gallery: wall labels, collection title cards,
// soft arches behind each print and soft drop shadows.
import * as THREE from 'three';

const FONT_DISPLAY = 'Oswald, "Arial Narrow", sans-serif';
const FONT_SERIF = 'Newsreader, Georgia, serif';
const FONT_MONO = '"IBM Plex Mono", ui-monospace, monospace';

function canvasTexture(canvas, anisotropy = 4) {
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = anisotropy;
  tex.needsUpdate = true;
  return tex;
}

function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

/** Split text into lines that fit maxWidth. */
function wrap(ctx, text, maxWidth) {
  const words = text.split(/\s+/);
  const lines = [];
  let line = '';
  for (const w of words) {
    const test = line ? line + ' ' + w : w;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = w;
    } else line = test;
  }
  if (line) lines.push(line);
  return lines;
}

/** Wall label shown under each print: artist, title, small meta line. */
export function labelTexture({ artist, title, meta }, anisotropy) {
  const W = 768, H = 220;
  const c = makeCanvas(W, H);
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#1b1b1b';
  ctx.textBaseline = 'top';
  ctx.font = `500 46px ${FONT_SERIF}`;
  ctx.fillText(artist, 0, 6);
  ctx.font = `italic 400 42px ${FONT_SERIF}`;
  ctx.fillStyle = '#2a2a2a';
  ctx.fillText(title, 0, 62);
  ctx.font = `400 22px ${FONT_MONO}`;
  ctx.fillStyle = '#7a7a7a';
  ctx.fillText(meta.toUpperCase(), 2, 128);
  return { texture: canvasTexture(c, anisotropy), aspect: W / H };
}

/** Light grey title card that starts every collection. */
export function cardTexture({ title, count }, anisotropy) {
  const W = 720, H = 1000;
  const c = makeCanvas(W, H);
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#e7e7e7';
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#141414';
  ctx.textBaseline = 'top';
  let size = 104;
  let lines;
  do {
    ctx.font = `600 ${size}px ${FONT_DISPLAY}`;
    lines = wrap(ctx, title.toUpperCase(), W - 120);
    size -= 6;
  } while ((lines.length > 4 || lines.some((l) => ctx.measureText(l).width > W - 120)) && size > 40);
  const lh = size * 1.14;
  lines.forEach((l, i) => ctx.fillText(l, 60, 70 + i * lh));
  ctx.font = `400 30px ${FONT_MONO}`;
  ctx.fillStyle = '#4a4a4a';
  ctx.fillText(`${count} PRINT${count === 1 ? '' : 'S'}`, 62, 70 + lines.length * lh + 34);
  return canvasTexture(c, anisotropy);
}

/** Soft white arch (alpha texture) used as a recessed niche behind prints. */
let archCache;
export function archTexture() {
  if (archCache) return archCache;
  const W = 256, H = 512;
  const c = makeCanvas(W, H);
  const ctx = c.getContext('2d');
  ctx.filter = 'blur(10px)';
  ctx.fillStyle = '#ffffff';
  const pad = 22;
  const r = (W - pad * 2) / 2;
  ctx.beginPath();
  ctx.moveTo(pad, H - pad);
  ctx.lineTo(pad, pad + r);
  ctx.arc(W / 2, pad + r, r, Math.PI, 0);
  ctx.lineTo(W - pad, H - pad);
  ctx.closePath();
  ctx.fill();
  archCache = canvasTexture(c);
  return archCache;
}

/** Soft rectangular drop shadow (alpha texture). */
let shadowCache;
export function shadowTexture() {
  if (shadowCache) return shadowCache;
  const S = 256;
  const c = makeCanvas(S, S);
  const ctx = c.getContext('2d');
  ctx.filter = 'blur(22px)';
  ctx.fillStyle = '#000000';
  ctx.fillRect(48, 48, S - 96, S - 96);
  shadowCache = canvasTexture(c);
  return shadowCache;
}
