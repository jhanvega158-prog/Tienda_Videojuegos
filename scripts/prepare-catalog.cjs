const fs = require('node:fs');
process.chdir(require('node:path').resolve(__dirname, '..'));
fs.mkdirSync('public/images/games', { recursive: true });
const games = [
  [271590, 1, 'Acción'],
  [1174180, 2, 'Aventura'],
  [3405690, 3, 'Deportes'],
  [1551360, 4, 'Carreras'],
  [292030, 5, 'RPG'],
  [2050650, 6, 'Terror'],
  [289070, 7, 'Estrategia'],
  [812140, 8, 'Aventura'],
  [1091500, null, 'RPG'],
  [1245620, null, 'RPG'],
  [1593500, null, 'Acción'],
  [2322010, null, 'Acción'],
  [990080, null, 'RPG'],
  [1086940, null, 'RPG'],
  [1817070, null, 'Aventura'],
  [1817190, null, 'Aventura'],
  [2561580, null, 'Aventura'],
  [2420110, null, 'Aventura'],
  [814380, null, 'Acción'],
  [782330, null, 'Acción'],
  [1145360, null, 'Acción'],
  [367520, null, 'Aventura'],
  [413150, null, 'RPG'],
  [105600, null, 'Aventura'],
  [108600, null, 'Terror'],
  [218620, null, 'Acción'],
  [359550, null, 'Acción'],
  [1238810, null, 'Acción'],
  [1466860, null, 'Estrategia'],
  [255710, null, 'Estrategia'],
];
(async () => {
  const rows = [];
  const cached = fs.existsSync('docs/catalogo-juegos.json') ? JSON.parse(fs.readFileSync('docs/catalogo-juegos.json', 'utf8')) : [];
  for (const [appId, existingId, category] of games) {
    const saved = cached.find((r) => r.appId === appId);
    if (saved) {
      if (!fs.existsSync('public' + saved.imagen_url)) {
        const response = await fetch(saved.imageSource);
        if (!response.ok) throw Error('Missing cover: ' + appId);
        fs.writeFileSync('public' + saved.imagen_url, Buffer.from(await response.arrayBuffer()));
      }
      rows.push(saved);
      continue;
    }
    const url = `https://store.steampowered.com/api/appdetails?appids=${appId}&cc=us&l=spanish`;
    const r = await fetch(url);
    if (!r.ok) throw Error(`${appId}: ${r.status}`);
    const json = await r.json();
    const data = json[appId]?.data;
    if (!data) throw Error(`No metadata ${appId}`);
    const cover = await fetch(data.header_image);
    if (!cover.ok || !cover.headers.get('content-type')?.startsWith('image/'))
      throw Error(`No cover ${appId}`);
    const local = `/images/games/${appId}.jpg`;
    fs.writeFileSync('public' + local, Buffer.from(await cover.arrayBuffer()));
    const price = data.price_overview?.initial;
    if (!existingId && price == null && !data.is_free) throw Error(`Missing price ${appId}`);
    rows.push({
      appId,
      existingId,
      category,
      nombre: data.name,
      descripcion: data.short_description.replace(/<[^>]*>/g, ''),
      precio: data.is_free ? 0 : price / 100,
      stock: 0,
      plataforma: 'PC',
      desarrollador: data.developers?.join(', ') ?? '',
      editor: data.publishers?.join(', ') ?? '',
      imagen_url: local,
      trailer_url: null,
      fecha_lanzamiento: null,
      activo: true,
      destacado: false,
      source: `https://store.steampowered.com/app/${appId}/`,
      imageSource: data.header_image,
    });
    fs.writeFileSync('docs/catalogo-juegos.json', JSON.stringify(rows, null, 2) + '\n');
    console.log(`${rows.length}/30 ${data.name}`);
  }
  fs.writeFileSync('docs/catalogo-juegos.json', JSON.stringify(rows, null, 2) + '\n');
})();
