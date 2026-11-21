// Bottom HUD: "You are walking past <collection>" + arrows.
import { $ } from '../utils.js';

export function createHud({ onPrev, onNext }) {
  const name = $('#hud-name');
  const enter = $('#hud-enter');
  let currentSlug = null;

  $('#walk-prev').addEventListener('click', onPrev);
  $('#walk-next').addEventListener('click', onNext);

  function setCollection(collection) {
    if (!collection || collection.slug === currentSlug) return;
    currentSlug = collection.slug;
    enter.href = `#/collection/${collection.slug}`;
    // slide the old title up and the new one in
    const old = name.querySelector('span:not(.is-leaving)');
    const next = document.createElement('span');
    next.textContent = collection.title;
    next.className = 'is-entering';
    if (old) {
      old.className = 'is-leaving';
      old.addEventListener('animationend', () => old.remove(), { once: true });
      setTimeout(() => old.remove(), 700);
    }
    name.appendChild(next);
  }

  return {
    setCollection,
    show: () => document.body.classList.remove('hud-hidden'),
    hide: () => document.body.classList.add('hud-hidden'),
  };
}
