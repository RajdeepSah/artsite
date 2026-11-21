// Drawers (slide in from the right) and modals (centred), one at a time.
// The page behind dims and blurs, like the bag drawer in the reference video.
import { $, html, trapFocus } from '../utils.js';

let current = null;

/**
 * Open an overlay.
 * @param {object} o
 * @param {'drawer'|'modal'|'palette'} o.kind
 * @param {string} o.label             accessible name
 * @param {(panel:HTMLElement, close:Function)=>void|Function} o.render  fills the panel; may return a cleanup fn
 * @param {string} [o.name]           identifier (e.g. 'bag') so callers can check what is open
 */
export function openOverlay({ kind = 'drawer', label, render, name = '' }) {
  if (current) closeOverlay(true);
  const root = $('#overlay-root');
  const wrap = html(`
    <div class="overlay overlay--${kind}" data-name="${name}">
      <div class="overlay__backdrop" data-close></div>
      <div class="overlay__panel" role="dialog" aria-modal="true" aria-label="${label}" tabindex="-1"></div>
    </div>`);
  root.appendChild(wrap);
  const panel = wrap.querySelector('.overlay__panel');
  const close = () => closeOverlay();
  const cleanup = render(panel, close);
  wrap.addEventListener('click', (e) => { if (e.target.closest('[data-close]')) close(); });
  const onKey = (e) => { if (e.key === 'Escape') { e.stopPropagation(); close(); } };
  document.addEventListener('keydown', onKey, true);
  document.body.classList.add('has-overlay');
  requestAnimationFrame(() => wrap.classList.add('is-open'));
  const release = trapFocus(panel);
  setTimeout(() => (panel.querySelector('[autofocus]') || panel).focus({ preventScroll: true }), 60);
  current = { wrap, name, onKey, release, cleanup };
  return { close, panel };
}

export function closeOverlay(immediate = false) {
  if (!current) return;
  const { wrap, onKey, release, cleanup } = current;
  current = null;
  document.removeEventListener('keydown', onKey, true);
  if (typeof cleanup === 'function') cleanup();
  document.body.classList.remove('has-overlay');
  wrap.classList.remove('is-open');
  release();
  if (immediate) wrap.remove();
  else setTimeout(() => wrap.remove(), 450);
}

export const openOverlayName = () => current?.name || null;
