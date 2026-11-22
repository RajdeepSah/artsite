// Minimal hash router: "#/print/first-touch" -> handler({ slug: 'first-touch' }).

const routes = [];
let current = null;
let previous = null;

export function route(pattern, handler) {
  const keys = [];
  const regex = new RegExp('^' + pattern.replace(/:(\w+)/g, (_, k) => { keys.push(k); return '([^/]+)'; }) + '/?$');
  routes.push({ regex, keys, handler });
}

export const currentPath = () => decodeURIComponent(location.hash.replace(/^#/, '')) || '/';

export function navigate(path) {
  if (currentPath() === path) resolve();
  else location.hash = path;
}

export const getPrevious = () => previous;

function resolve() {
  const path = currentPath();
  for (const r of routes) {
    const m = path.match(r.regex);
    if (m) {
      const params = {};
      r.keys.forEach((k, i) => { params[k] = m[i + 1]; });
      previous = current;
      current = path;
      r.handler(params, { path, previous });
      return;
    }
  }
  // Unknown route -> home.
  location.hash = '/';
}

export function startRouter() {
  window.addEventListener('hashchange', resolve);
  resolve();
}
