// Settings modal: reduce motion + 3D quality.
import { openOverlay } from './overlay.js';

export function applySettings(settings) {
  const root = document.documentElement;
  root.classList.toggle('reduce-motion', !!settings.reduceMotion);
  root.classList.toggle('low-quality', !settings.highQuality);
}

export function openSettings(ctx) {
  const { store, onQualityChange } = ctx;

  openOverlay({
    kind: 'modal',
    name: 'settings',
    label: 'Settings',
    render(panel) {
      const s = store.state.settings;
      panel.innerHTML = `
        <div class="modal">
          <button type="button" class="drawer__close modal__close" data-close aria-label="Close">×</button>
          <h2 class="display modal__title">Settings</h2>
          <label class="switch">
            <span><span class="switch__label">Reduce motion</span><span class="switch__hint">Fewer animations and instant transitions.</span></span>
            <input type="checkbox" data-setting="reduceMotion" ${s.reduceMotion ? 'checked' : ''}>
            <span class="switch__track" aria-hidden="true"></span>
          </label>
          <label class="switch">
            <span><span class="switch__label">High quality 3D</span><span class="switch__hint">Sharper gallery. Turn off on slower devices.</span></span>
            <input type="checkbox" data-setting="highQuality" ${s.highQuality ? 'checked' : ''}>
            <span class="switch__track" aria-hidden="true"></span>
          </label>
        </div>`;
      panel.addEventListener('change', (e) => {
        const key = e.target.dataset.setting;
        if (!key) return;
        store.setSetting(key, e.target.checked);
        applySettings(store.state.settings);
        if (key === 'highQuality') onQualityChange?.();
      });
    },
  });
}
