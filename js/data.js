// Loads data/catalog.json and links collections <-> prints.

export async function loadCatalog() {
  const res = await fetch('data/catalog.json', { cache: 'no-cache' });
  if (!res.ok) throw new Error('Could not load data/catalog.json');
  const data = await res.json();

  const collections = data.collections.map((c, index) => ({ ...c, index, prints: [] }));
  const bySlug = Object.fromEntries(collections.map((c) => [c.slug, c]));

  const prints = data.prints.map((p) => {
    const collection = bySlug[p.collection];
    if (!collection) throw new Error(`Print "${p.slug}" has unknown collection "${p.collection}"`);
    const print = { artist: data.site.artist, edition: 25, ...p, collection };
    collection.prints.push(print);
    return print;
  });

  return {
    site: data.site,
    collections,
    prints,
    collection: (slug) => bySlug[slug],
    print: (slug) => prints.find((p) => p.slug === slug),
  };
}
