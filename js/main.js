// Entry point: loads the catalog, starts the 3D gallery and wires up the UI.
import { loadCatalog } from './data.js';
import { createGallery } from './gallery/scene.js';
import { createHud } from './ui/hud.js';
import { createCursor } from './ui/cursor.js';
import { $ } from './utils.js';

async function boot() {
  const catalog = await loadCatalog();
  const canvas = $('#gallery-canvas');
  const cursor = createCursor(canvas);
  let gallery;
  const hud = createHud({ onPrev: () => gallery?.prev(), onNext: () => gallery?.next() });

  gallery = await createGallery({
    canvas,
    catalog,
    onProgress: (p) => {
      $('#loader-pct').textContent = `${Math.round(p * 100)}%`;
      $('#loader-bar').style.width = `${p * 100}%`;
    },
    onHover: (item) => cursor.setHover(item),
    onSelect: (item) => console.log('select', item),
    onCollectionChange: (c) => hud.setCollection(c),
  });
  window.__gallery = gallery;
  document.body.classList.remove('is-loading');
}

boot();
