// Site state (bag, saved prints, currency, settings, account, orders).
// Everything is kept in localStorage so it survives page reloads.

const KEY = 'artsite:v1';

const defaults = () => ({
  bag: [],            // [{ id, slug, options: {paper,size,signature,frame}, qty, unitPrice }]
  saved: [],          // [slug]
  currency: 'USD',
  settings: { reduceMotion: false, highQuality: true },
  account: null,      // { email, name }
  orders: [],         // [{ id, date, items, total, currency, customer }]
});

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return defaults();
    return { ...defaults(), ...JSON.parse(raw) };
  } catch {
    return defaults();
  }
}

const state = load();
const listeners = {};

function save() {
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* storage unavailable */ }
}

function emit(event) {
  (listeners[event] || []).forEach((fn) => fn(state));
  (listeners['*'] || []).forEach((fn) => fn(state, event));
  save();
}

const optionKey = (slug, o) => [slug, o.paper, o.size, o.signature, o.frame].join('|');

export const store = {
  get state() { return state; },

  on(event, fn) {
    (listeners[event] ||= []).push(fn);
    return () => { listeners[event] = listeners[event].filter((f) => f !== fn); };
  },

  // ---- bag
  addToBag({ slug, options, qty = 1, unitPrice }) {
    const id = optionKey(slug, options);
    const existing = state.bag.find((i) => i.id === id);
    if (existing) existing.qty += qty;
    else state.bag.push({ id, slug, options: { ...options }, qty, unitPrice });
    emit('bag');
  },
  setQty(id, qty) {
    const item = state.bag.find((i) => i.id === id);
    if (!item) return;
    if (qty <= 0) state.bag = state.bag.filter((i) => i.id !== id);
    else item.qty = Math.min(99, qty);
    emit('bag');
  },
  removeFromBag(id) {
    state.bag = state.bag.filter((i) => i.id !== id);
    emit('bag');
  },
  clearBag() {
    state.bag = [];
    emit('bag');
  },
  bagCount: () => state.bag.reduce((n, i) => n + i.qty, 0),
  bagSubtotal: () => state.bag.reduce((n, i) => n + i.qty * i.unitPrice, 0),

  // ---- saved prints
  isSaved: (slug) => state.saved.includes(slug),
  toggleSaved(slug) {
    if (state.saved.includes(slug)) state.saved = state.saved.filter((s) => s !== slug);
    else state.saved.push(slug);
    emit('saved');
    return state.saved.includes(slug);
  },

  // ---- preferences
  setCurrency(code) { state.currency = code; emit('currency'); },
  setSetting(key, value) { state.settings[key] = value; emit('settings'); },
  setAccount(account) { state.account = account; emit('account'); },

  // ---- orders
  addOrder(order) { state.orders.unshift(order); emit('orders'); },
};
