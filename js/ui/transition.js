// Helpers for the page transitions (white veil + "FLIP" image moves).
import { reducedMotion } from '../utils.js';

const EASE = 'cubic-bezier(.65, 0, .35, 1)';

/** Fade a full-screen veil (page background colour) in or out. */
export function veil(show, duration = 450) {
  let el = document.querySelector('.veil');
  if (!el) {
    el = document.createElement('div');
    el.className = 'veil';
    document.body.appendChild(el);
  }
  if (reducedMotion()) duration = 1;
  const anim = el.animate([{ opacity: show ? 0 : 1 }, { opacity: show ? 1 : 0 }], { duration, easing: EASE, fill: 'forwards' });
  return anim.finished.then(() => {
    if (!show) el.remove();
  });
}

/** Create a fixed <img> exactly covering `rect` (viewport coordinates). */
export function createFloatingImage(src, rect, alt = '') {
  const img = document.createElement('img');
  img.className = 'flip-image';
  img.src = src;
  img.alt = alt;
  Object.assign(img.style, {
    left: rect.left + 'px',
    top: rect.top + 'px',
    width: rect.width + 'px',
    height: rect.height + 'px',
  });
  document.body.appendChild(img);
  return img;
}

/** Animate a floating image from its current rect to `to` (a DOMRect-like object). */
export function flipTo(img, from, to, duration = 800) {
  if (reducedMotion()) duration = 1;
  const dx = to.left - from.left;
  const dy = to.top - from.top;
  const sx = to.width / from.width;
  const sy = to.height / from.height;
  return img.animate(
    [{ transform: 'translate(0, 0) scale(1, 1)' }, { transform: `translate(${dx}px, ${dy}px) scale(${sx}, ${sy})` }],
    { duration, easing: EASE, fill: 'forwards' },
  ).finished;
}

/** Wait for an <img> element to finish loading (or fail). */
export function imageReady(img) {
  if (!img || (img.complete && img.naturalWidth)) return Promise.resolve();
  return new Promise((resolve) => {
    img.addEventListener('load', resolve, { once: true });
    img.addEventListener('error', resolve, { once: true });
    setTimeout(resolve, 3000);
  });
}
