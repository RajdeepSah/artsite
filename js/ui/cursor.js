// Custom ring cursor shown over the 3D gallery, with the black "Open the print" pill.
import { $ } from '../utils.js';

export function createCursor(canvas) {
  const el = $('#cursor');
  const label = $('#cursor-label');
  let x = -100, y = -100, cx = -100, cy = -100;
  let raf = 0;

  function loop() {
    cx += (x - cx) * 0.35;
    cy += (y - cy) * 0.35;
    el.style.transform = `translate3d(${cx}px, ${cy}px, 0)`;
    raf = Math.abs(x - cx) + Math.abs(y - cy) > 0.1 ? requestAnimationFrame(loop) : 0;
  }

  canvas.addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse') return;
    x = e.clientX; y = e.clientY;
    if (!el.classList.contains('is-visible')) { cx = x; cy = y; }
    el.classList.add('is-visible');
    if (!raf) raf = requestAnimationFrame(loop);
  });
  canvas.addEventListener('pointerleave', () => el.classList.remove('is-visible'));
  canvas.addEventListener('pointerdown', () => el.classList.add('is-down'));
  window.addEventListener('pointerup', () => el.classList.remove('is-down'));

  return {
    setHover(item) {
      if (item) label.textContent = item.type === 'card' ? 'Enter the collection' : 'Open the print';
      el.classList.toggle('is-hovering', !!item);
    },
    hide() { el.classList.remove('is-visible', 'is-hovering'); },
  };
}
