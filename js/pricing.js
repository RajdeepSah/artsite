// Print options, price calculation and currency formatting.
// Prices in data/catalog.json are in USD for the smallest size (A3) on budget paper.

export const OPTIONS = {
  paper: {
    label: 'Paper',
    values: [
      { id: 'budget', label: 'Budget Art Paper', add: 0 },
      { id: 'giclee', label: 'Giclée Fine Art Paper', add: 15 },
      { id: 'hahnemuhle', label: 'Hahnemühle German Etching', add: 30 },
    ],
  },
  size: {
    label: 'Size',
    values: [
      { id: 'a3', label: '11.7 × 16.5" (A3)', short: '11.7 × 16.5"', factor: 1 },
      { id: 'a2', label: '16.5 × 23.4" (A2)', short: '16.5 × 23.4"', factor: 1.4 },
      { id: 'a1', label: '23.4 × 33.1" (A1)', short: '23.4 × 33.1"', factor: 2.1 },
      { id: 'a0', label: '33.1 × 46.8" (A0)', short: '33.1 × 46.8"', factor: 3.2 },
    ],
  },
  signature: {
    label: 'Signature',
    values: [
      { id: 'unsigned', label: 'Unsigned', add: 0 },
      { id: 'signed', label: 'Signed and Numbered', add: 40 },
    ],
  },
  frame: {
    label: 'Frame',
    values: [
      { id: 'unframed', label: 'Unframed', add: 0 },
      { id: 'classic', label: 'Classic Frame', add: 60 },
      { id: 'canvas', label: 'Framed Canvas', add: 85 },
    ],
  },
};

export const DEFAULT_OPTIONS = { paper: 'budget', size: 'a3', signature: 'unsigned', frame: 'unframed' };

export const option = (group, id) => OPTIONS[group].values.find((v) => v.id === id) || OPTIONS[group].values[0];

/** Unit price in USD for a print with the chosen options. */
export function priceFor(print, opts = DEFAULT_OPTIONS) {
  const paper = option('paper', opts.paper);
  const size = option('size', opts.size);
  const sig = option('signature', opts.signature);
  const frame = option('frame', opts.frame);
  return Math.round((print.basePrice + paper.add) * size.factor + sig.add + frame.add * size.factor);
}

/** Human readable summary of chosen options, e.g. for the bag. */
export function describeOptions(opts) {
  return [option('paper', opts.paper).label, option('size', opts.size).label,
    option('signature', opts.signature).label, option('frame', opts.frame).label].join(' · ');
}

// Simple fixed exchange rates (update as needed).
export const CURRENCIES = {
  USD: { rate: 1, locale: 'en-US' },
  GBP: { rate: 0.79, locale: 'en-GB' },
  EUR: { rate: 0.92, locale: 'de-DE' },
  INR: { rate: 84, locale: 'en-IN' },
};

const formatters = {};
export function formatPrice(usd, currency = 'USD') {
  const cur = CURRENCIES[currency] || CURRENCIES.USD;
  const key = currency;
  formatters[key] ||= new Intl.NumberFormat(cur.locale, { style: 'currency', currency, minimumFractionDigits: 2 });
  return formatters[key].format(usd * cur.rate);
}
