/* ORBITAL NEXUS — orbital scanner.
   Look down from orbit the way remote-sensing scientists do. Move the
   camera over Earth, Mars or Europa, switch between a black-and-white
   visible camera, a thermal infrared camera, a near-infrared camera and a
   gas spectrometer, and geolocate what each one reveals. Nothing is
   "seen" directly: a find is a signal (a biosignature, water, heat, a
   technosignature) that must be confirmed with a second instrument, and
   some signals are false alarms — which is exactly why scientists confirm.
   The maps are simulated; the targets are based on real discoveries. */

var SCAN = { mode: 'levels', level: null, lvT: 0, lvFalse: 0, lvWon: false, world: 'earth', sensor: 'vis', layers: {}, prog: {}, done: {}, lx: 0.5, ly: 0.5, hold: 0, open: false, raf: 0, last: 0, msg: '', msgT: 0, opts: null, gained: 0, lensOn: false };
var SW = 720, SH = 360;

var SENSORS = [
  { id: 'vis', ic: 'cam', k: '1', es: ['Visible · blanco y negro', 'Cámara pancromática: la más nítida. Muestra formas: hielo, ciudades, deltas, manchas.'],
    en: ['Visible · black and white', 'Panchromatic camera: the sharpest. It shows shapes: ice, cities, deltas, stains.'] },
  { id: 'tir', ic: 'tir', k: '2', es: ['Infrarrojo térmico', 'Mide el calor: incendios, islas de calor, hielo frío bajo el polvo, zonas tibias.'],
    en: ['Thermal infrared', 'Measures heat: fires, heat islands, cold ice under dust, warm spots.'] },
  { id: 'nir', ic: 'spec_vnir', k: '3', es: ['Infrarrojo cercano', 'Las plantas vivas reflejan mucho infrarrojo cercano; también revela arcillas y sales.'],
    en: ['Near infrared', 'Living plants reflect a lot of near infrared; it also reveals clays and salts.'] },
  { id: 'gas', ic: 'spec_uv', k: '4', es: ['Espectrómetro de gases', 'Encuentra gases como metano o vapor de agua por la luz que absorben.'],
    en: ['Gas spectrometer', 'Finds gases such as methane or water vapour by the light they absorb.'] }
];

var KIND = {
  life: { c: '#3ecf9a', es: 'Biofirma confirmada', en: 'Confirmed biosignature' },
  tech: { c: '#f0c24b', es: 'Tecnofirma', en: 'Technosignature' },
  clue: { c: '#b98cff', es: 'Indicio de habitabilidad', en: 'Habitability clue' },
  water: { c: '#4fd1e0', es: 'Agua', en: 'Water' },
  event: { c: '#f0a93b', es: 'Evento natural', en: 'Natural event' },
  false: { c: '#f0655f', es: 'Falsa alarma', en: 'False alarm' }
};

var WORLDS = {
  earth: { es: ['Tierra', 'mapa simulado · objetivos basados en hallazgos reales'], en: ['Earth', 'simulated map · targets based on real finds'], seed: 3,
    targets: [
      { id: 'forest', lat: -6, lon: -62, r: 10, kind: 'life', bands: ['nir', 'vis'],
        es: ['Selva tropical', 'La clorofila refleja el infrarrojo cercano (el «borde rojo»). Vida vegetal confirmada desde el espacio.'],
        en: ['Tropical rainforest', 'Chlorophyll reflects near infrared (the “red edge”). Plant life confirmed from space.'] },
      { id: 'fire', lat: -11, lon: -54, r: 3.2, kind: 'event', bands: ['tir', 'vis'],
        es: ['Incendio forestal', 'Calor intenso y humo. No es vida, pero los satélites avisan para proteger personas y bosques.'],
        en: ['Forest fire', 'Intense heat and smoke. Not life, but satellites raise the alarm to protect people and forests.'] },
      { id: 'penguins', lat: -73, lon: 35, r: 2.6, kind: 'life', bands: ['vis', 'nir'],
        es: ['Colonia de pingüinos emperador', 'Se descubren desde el espacio por las manchas de guano en el hielo. Así se hallaron colonias nuevas en 2020.'],
        en: ['Emperor penguin colony', 'Found from space by guano stains on the ice. That is how new colonies were found in 2020.'] },
      { id: 'whales', lat: -38, lon: 148, r: 2.4, kind: 'life', bands: ['vis'],
        es: ['Grupo de ballenas', 'Los satélites de muy alta resolución ya cuentan ballenas en el océano desde la órbita.'],
        en: ['Pod of whales', 'Very high-resolution satellites already count whales in the ocean from orbit.'] },
      { id: 'city', lat: 36, lon: 139, r: 4, kind: 'tech', bands: ['tir', 'vis'],
        es: ['Ciudad', 'Isla de calor y calles en cuadrícula: una tecnofirma, la señal de una civilización.'],
        en: ['City', 'A heat island and a street grid: a technosignature, the sign of a civilisation.'] }
    ] },
  mars: { es: ['Marte', 'mapa simulado · objetivos basados en hallazgos reales'], en: ['Mars', 'simulated map · targets based on real finds'], seed: 11,
    targets: [
      { id: 'jezero', lat: 18.4, lon: 77.5, r: 4.5, kind: 'clue', bands: ['vis', 'nir'],
        es: ['Delta del cráter Jezero', 'Un lago antiguo con arcillas: el lugar ideal para buscar vida fósil. Allí trabaja Perseverance.'],
        en: ['Jezero crater delta', 'An ancient lake with clays: the ideal place to look for fossil life. Perseverance works there.'] },
      { id: 'methane', lat: -2, lon: 141, r: 8, kind: 'clue', bands: ['gas'],
        es: ['Metano en el cráter Gale', 'Puede venir de microbios o de la geología. Es un indicio, no una prueba: hace falta una misión en la superficie.'],
        en: ['Methane at Gale crater', 'It may come from microbes or from geology. A clue, not proof: it takes a surface mission.'] },
      { id: 'rover', lat: -4.6, lon: 137.4, r: 1.3, kind: 'tech', bands: ['vis'],
        es: ['Rover Curiosity', 'Tecnología humana vista desde la órbita: la cámara HiRISE ha fotografiado a los rovers.'],
        en: ['Curiosity rover', 'Human technology seen from orbit: the HiRISE camera has photographed the rovers.'] },
      { id: 'ice', lat: 46, lon: -150, r: 5, kind: 'water', bands: ['tir', 'vis'],
        es: ['Hielo bajo el polvo', 'Frío anómalo y cráteres nuevos que dejan el hielo al descubierto: agua para futuros astronautas.'],
        en: ['Ice under the dust', 'An anomalous cold spot and fresh craters that expose ice: water for future astronauts.'] },
      { id: 'hotrock', lat: -22, lon: -32, r: 3.2, kind: 'false', bands: ['tir'],
        es: ['Mancha caliente', 'Falsa alarma: roca volcánica que conserva el calor del día. Por eso se confirma con otro instrumento.'],
        en: ['Hot spot', 'False alarm: volcanic rock that keeps the day’s heat. That is why you confirm with another instrument.'] }
    ] },
  europa: { es: ['Europa', 'luna de Júpiter · mapa simulado'], en: ['Europa', 'Jupiter’s moon · simulated map'], seed: 23,
    targets: [
      { id: 'plume', lat: -15, lon: -172, r: 5, kind: 'water', bands: ['gas', 'tir'],
        es: ['Penacho de vapor de agua', 'Agua del océano escapando al espacio: se podría analizar sin aterrizar, como planea Europa Clipper.'],
        en: ['Water vapour plume', 'Ocean water escaping to space: it could be sampled without landing, as Europa Clipper plans.'] },
      { id: 'salts', lat: 8, lon: 58, r: 6, kind: 'clue', bands: ['nir', 'vis'],
        es: ['Sales en las grietas', 'La química del océano oculto sube por las grietas: sales y posible energía para la vida.'],
        en: ['Salts in the cracks', 'The hidden ocean’s chemistry rises through the cracks: salts and possible energy for life.'] },
      { id: 'thin', lat: -42, lon: -58, r: 5, kind: 'clue', bands: ['tir'],
        es: ['Zona tibia', 'El hielo podría ser más delgado aquí: un buen sitio para un futuro aterrizador.'],
        en: ['Warm patch', 'The ice may be thinner here: a good site for a future lander.'] },
      { id: 'glint', lat: 32, lon: -98, r: 3, kind: 'false', bands: ['vis'],
        es: ['Destello brillante', 'Falsa alarma: un reflejo del Sol en hielo liso, no una estructura.'],
        en: ['Bright glint', 'False alarm: sunlight glinting off smooth ice, not a structure.'] }
    ] }
};

/* ---------- noise ---------- */
function shash(x, y, s) { var h = (x * 374761393 + y * 668265263 + s * 2147483647) | 0; h = (h ^ (h >>> 13)) * 1274126177 | 0; return ((h ^ (h >>> 16)) >>> 0) / 4294967295; }
function svalue(x, y, s, px) {
  var xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi, u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  function h(a, b) { return shash(((a % px) + px) % px, b, s); }
  var a = h(xi, yi), b = h(xi + 1, yi), c = h(xi, yi + 1), d = h(xi + 1, yi + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
function sfbm(x, y, s, base) { var t = 0, amp = 0.5, f = base; for (var o = 0; o < 5; o++) { t += amp * svalue(x * f, y * f, s + o * 17, Math.round(f)); amp *= 0.5; f *= 2; } return t; }

function sLatLon(px, py) { return [90 - py / SH * 180, px / SW * 360 - 180]; }
function sDist(lat1, lon1, lat2, lon2) { var dl = Math.abs(lon1 - lon2); if (dl > 180) dl = 360 - dl; dl *= Math.cos((lat1 + lat2) / 2 * Math.PI / 180); return Math.sqrt(dl * dl + (lat1 - lat2) * (lat1 - lat2)); }

/* ---------- the four sensor images of a world ---------- */
function scanBuild(wid) {
  if (SCAN.layers[wid]) return SCAN.layers[wid];
  var W0 = WORLDS[wid], seed = W0.seed, T = W0.targets;
  var L = {};
  ['vis', 'tir', 'nir', 'gas'].forEach(function (k) { var c = document.createElement('canvas'); c.width = SW; c.height = SH; L[k] = { c: c, g: c.getContext('2d'), d: null }; L[k].d = L[k].g.createImageData(SW, SH); });
  for (var y = 0; y < SH; y++) for (var x = 0; x < SW; x++) {
    var ll = sLatLon(x + 0.5, y + 0.5), lat = ll[0], lon = ll[1], al = Math.abs(lat);
    var n = sfbm(x / SW, y / SH, seed, 6), n2 = sfbm(x / SW, y / SH, seed + 50, 14);
    var vis, tir, nir, gas = 0, gasCol = null;
    /* influence of each target (gaussian in degrees) */
    var w = {};
    for (var i = 0; i < T.length; i++) { var d = sDist(lat, lon, T[i].lat, T[i].lon) / T[i].r; w[T[i].id] = d < 3 ? Math.exp(-d * d) : 0; }
    if (wid === 'earth') {
      var land = n + 0.18 * w.forest + 0.25 * (w.fire + w.city) - 0.3 * w.whales > 0.53, ice = al > 64 + 4 * (n2 - 0.5) || w.penguins > 0.02;
      var veg = land && !ice ? Math.max(0, 0.35 + 0.5 * Math.cos(lat * Math.PI / 90) * (n2 - 0.2) + 0.9 * w.forest - 0.6 * w.fire) : 0;
      vis = ice ? 232 - 18 * n2 : (land ? 95 + 90 * n2 - 45 * veg : 38 + 20 * n);
      tir = ice ? 0.08 : (land ? 0.55 + 0.35 * Math.cos(lat * Math.PI / 180) - 0.15 * veg : 0.45 + 0.3 * Math.cos(lat * Math.PI / 180));
      nir = ice ? 0.15 : (land ? 0.15 + veg * 0.95 : 0.03);
      /* signatures */
      vis -= 120 * w.penguins * (shash(x, y, 5) > 0.35 ? 1 : 0.6);
      if (w.whales > 0.15 && shash(x, y, 9) > 0.93) vis += 120;
      vis += 30 * w.fire * (shash(x, y, 2) - 0.2);
      if (w.city > 0.1) vis += ((x % 4 === 0 || y % 4 === 0) ? 80 : 10) * w.city;
      tir += 1.2 * w.fire + 0.5 * w.city;
      nir += 0.25 * w.penguins;
      gas = 0.05 * n2;
    } else if (wid === 'mars') {
      vis = 90 + 110 * n + 25 * (n2 - 0.5);
      if (al > 78) vis = 225;
      vis += 70 * w.jezero * (Math.sin((x + y) * 0.9) > 0 ? 1 : 0.4) + 160 * (w.rover > 0.5 ? 1 : 0) + 60 * w.ice * (shash(x, y, 4) > 0.8 ? 1 : 0);
      tir = 0.45 + 0.3 * Math.cos(lat * Math.PI / 180) - 0.2 * n - 0.45 * w.ice + 1.0 * w.hotrock;
      nir = 0.1 + 0.08 * n2 + 0.85 * w.jezero;
      gas = 0.05 * n2 + 1.0 * w.methane; gasCol = [255, 90, 220];
    } else {
      var crack = Math.abs(Math.sin(x * 0.07 + 6 * sfbm(x / SW, y / SH, seed + 3, 3))) < 0.08 || Math.abs(Math.sin(y * 0.11 + x * 0.03 + 5 * n2)) < 0.06;
      vis = (crack ? 150 : 215) + 30 * (n - 0.5) + 200 * w.glint * (shash(x, y, 7) > 0.4 ? 1 : 0.5);
      tir = 0.12 + 0.08 * n + 0.75 * w.thin + 0.5 * w.plume;
      nir = 0.12 + (crack ? 0.15 : 0) + 0.85 * w.salts * (crack ? 1 : 0.55);
      gas = 0.04 * n2 + 1.0 * w.plume; gasCol = [80, 220, 255];
    }
    var o = (y * SW + x) * 4, v = Math.max(0, Math.min(255, vis));
    L.vis.d.data[o] = L.vis.d.data[o + 1] = L.vis.d.data[o + 2] = v; L.vis.d.data[o + 3] = 255;
    var tc = heatRamp(Math.max(0, Math.min(1, tir)));
    L.tir.d.data[o] = tc[0]; L.tir.d.data[o + 1] = tc[1]; L.tir.d.data[o + 2] = tc[2]; L.tir.d.data[o + 3] = 255;
    var nn = Math.max(0, Math.min(1, nir));
    L.nir.d.data[o] = 30 + 60 * (1 - nn) * (v / 255); L.nir.d.data[o + 1] = 25 + 225 * nn; L.nir.d.data[o + 2] = 35 + 40 * (1 - nn); L.nir.d.data[o + 3] = 255;
    /* the gas view keeps a dim, true-ish colour of the world under the plumes */
    var gg = Math.max(0, Math.min(1, gas)), gc = gasCol || [255, 120, 220], base = v * 0.42,
      tint = wid === 'mars' ? [1.25, 0.72, 0.5] : (wid === 'europa' ? [0.95, 0.92, 1.05] : [0.7, 0.85, 1.1]);
    L.gas.d.data[o] = base * tint[0] + (gc[0] - base * tint[0]) * gg; L.gas.d.data[o + 1] = base * tint[1] + (gc[1] - base * tint[1]) * gg;
    L.gas.d.data[o + 2] = base * tint[2] + (gc[2] - base * tint[2]) * gg; L.gas.d.data[o + 3] = 255;
  }
  for (var k in L) L[k].g.putImageData(L[k].d, 0, 0);
  SCAN.layers[wid] = L;
  return L;
}
function heatRamp(t) {
  var s = [[10, 8, 40], [80, 20, 120], [200, 40, 60], [250, 150, 30], [255, 250, 200]];
  var f = t * (s.length - 1), i = Math.min(s.length - 2, Math.floor(f)), u = f - i;
  return [s[i][0] + (s[i + 1][0] - s[i][0]) * u, s[i][1] + (s[i + 1][1] - s[i][1]) * u, s[i][2] + (s[i + 1][2] - s[i][2]) * u];
}

/* ---------- open / close ---------- */
function scanOpen(opts) {
  SCAN.opts = opts || {};
  if (SCAN.opts.world) { SCAN.world = SCAN.opts.world; SCAN.mode = 'free'; } else if (SCAN.opts.levels) { SCAN.mode = 'levels'; SCAN.level = null; }
  SCAN.gained = 0;
  var root = document.getElementById('scanner');
  if (!root) {
    root = document.createElement('div'); root.id = 'scanner'; root.className = 'scanner';
    root.setAttribute('role', 'dialog'); root.setAttribute('aria-modal', 'true'); root.tabIndex = -1;
    document.body.appendChild(root);
    root.addEventListener('click', scanClick);
    root.addEventListener('keydown', scanKey);
  }
  root.hidden = false; OVERLAY_OPEN = true; SCAN.open = true;
  document.body.classList.add('no-scroll');
  scanRender();
  root.focus();
  cancelAnimationFrame(SCAN.raf); SCAN.last = 0; SCAN.raf = requestAnimationFrame(scanFrame);
}
function scanClose() {
  var root = document.getElementById('scanner');
  if (root) root.hidden = true;
  SCAN.open = false; OVERLAY_OPEN = false; cancelAnimationFrame(SCAN.raf);
  document.body.classList.remove('no-scroll');
  var cb = SCAN.opts && SCAN.opts.done; SCAN.opts = null;
  if (cb) cb({ science: SCAN.gained }); else if (typeof render === 'function') render();
}

function sx(es, en) { return LANG === 'es' ? es : en; }
function fmtLL(lat, lon) {
  return Math.abs(lat).toFixed(1) + '° ' + (lat >= 0 ? 'N' : 'S') + ' · ' + Math.abs(lon).toFixed(1) + '° ' + (lon >= 0 ? 'E' : (LANG === 'es' ? 'O' : 'W'));
}

function scanRender() {
  var root = document.getElementById('scanner'), W0 = WORLDS[SCAN.world], tw = '', sh = '';
  for (var k in WORLDS) tw += '<button class="sc-world' + (k === SCAN.world ? ' on' : '') + '" data-sc="world" data-v="' + k + '">' + destArt(k === 'earth' ? 'leo-sso' : (k === 'mars' ? 'mars-orbit' : 'europa'), 'art sc-wart') + '<span>' + esc(sx(WORLDS[k].es[0], WORLDS[k].en[0])) + '</span></button>';
  SENSORS.forEach(function (s) {
    sh += '<button class="sc-sensor' + (s.id === SCAN.sensor ? ' on' : '') + '" data-sc="sensor" data-v="' + s.id + '">' + icon(s.ic, 'ico') +
      '<span><b>' + s.k + ' · ' + esc(sx(s.es[0], s.en[0])) + '</b><small>' + esc(sx(s.es[1], s.en[1])) + '</small></span></button>';
  });
  var lv = SCAN.mode === 'levels' && SCAN.level != null ? SCAN_LEVELS[SCAN.level] : null;
  var modes = '<div class="sc-modes"><button class="sc-mode' + (SCAN.mode === 'levels' ? ' on' : '') + '" data-sc="levels">★ ' + esc(sx('Niveles', 'Levels')) + '</button>' +
    '<button class="sc-mode' + (SCAN.mode === 'free' ? ' on' : '') + '" data-sc="free">' + esc(sx('Exploración libre', 'Free exploration')) + '</button></div>';
  var head = '<header class="sc-head"><div class="sc-title"><span class="sc-badge">' + icon('target', 'ico') + '</span><div><b>' + esc(sx('Escáner orbital', 'Orbital scanner')) + '</b><span>' +
    esc(sx('Busca señales de vida y geolocalízalas desde la órbita', 'Search for signs of life and geolocate them from orbit')) + '</span></div></div>' + modes +
    (SCAN.mode === 'free' ? '<div class="sc-worlds">' + tw + '</div>' : '') +
    '<button class="icon-btn sc-x" data-sc="close" aria-label="' + esc(sx('Cerrar', 'Close')) + '">' + icon('close', 'ico') + '</button></header>';
  if (SCAN.mode === 'levels' && SCAN.level == null) { root.innerHTML = '<div class="sc-wrap">' + head + scanLevelSelect() + '</div>'; return; }
  var goals = lv ? '<div class="lv-play"><div class="lv-play-top"><span class="lv-n">' + sx('Nivel ', 'Level ') + (SCAN.level + 1) + ' · ' + esc(sx(WORLDS[lv.world].es[0], WORLDS[lv.world].en[0])) + '</span>' +
    '<span class="lv-time" id="lv-time">0 s</span></div><b>' + esc(sx(lv.es[0], lv.en[0])) + '</b><ul class="lv-goals" id="lv-goals">' + scanGoalsHTML() + '</ul>' +
    '<button class="btn ghost wide" data-sc="levels">← ' + esc(sx('Mapa de niveles', 'Level map')) + '</button></div>' : '';
  root.innerHTML = '<div class="sc-wrap">' + head +
    '<div class="sc-grid"><section class="sc-mapbox"><canvas id="sc-cv" class="sc-cv" aria-label="' + esc(sx('Mapa del planeta visto por el sensor elegido', 'Planet map seen through the chosen sensor')) + '"></canvas>' +
    '<div class="lv-end" id="lv-end" hidden></div>' +
    '<div class="sc-read" id="sc-read"></div><p class="sc-note">' + esc(sx(W0.es[1], W0.en[1])) + ' · ' +
    esc(sx('Mueve el mouse o el dedo sobre el mapa; flechas y teclas 1–4 también sirven.', 'Move the mouse or your finger over the map; arrow keys and 1–4 work too.')) + '</p></section>' +
    '<aside class="sc-side">' + goals + '<h3>' + esc(sx('Instrumentos', 'Instruments')) + '</h3><div class="sc-sensors">' + sh + '</div>' +
    '<div class="sc-truth"><b>' + esc(sx('¿Se pueden ver extraterrestres?', 'Can we see aliens?')) + '</b><span>' +
    esc(sx('No directamente. Los satélites buscan señales —gases, calor, plantas, agua— y las confirman con un segundo instrumento, porque muchas son falsas alarmas.',
      'Not directly. Satellites look for signals —gases, heat, plants, water— and confirm them with a second instrument, because many are false alarms.')) + '</span></div>' +
    '<h3>' + esc(sx('Catálogo de descubrimientos', 'Discovery catalogue')) + ' <em id="sc-count"></em></h3><div class="sc-cat" id="sc-cat"></div>' +
    '<button class="btn ghost wide" data-sc="csv">' + esc(sx('Exportar coordenadas (CSV)', 'Export coordinates (CSV)')) + '</button></aside></div></div>';
  var cv = root.querySelector('#sc-cv');
  cv.addEventListener('pointermove', function (e) { var r = cv.getBoundingClientRect(); SCAN.lx = (e.clientX - r.left) / r.width; SCAN.ly = (e.clientY - r.top) / r.height; SCAN.lensOn = true; });
  cv.addEventListener('pointerdown', function (e) { var r = cv.getBoundingClientRect(); SCAN.lx = (e.clientX - r.left) / r.width; SCAN.ly = (e.clientY - r.top) / r.height; SCAN.lensOn = true; });
  scanBuild(SCAN.world);
  scanCatalog();
}

function scanCatalog() {
  var T = WORLDS[SCAN.world].targets, h = '', n = 0, total = 0;
  for (var i = 0; i < T.length; i++) {
    var t = T[i], key = SCAN.world + ':' + t.id, k = KIND[t.kind];
    if (t.kind !== 'false') total++;
    if (!SCAN.done[key]) continue;
    if (t.kind !== 'false') n++;
    h += '<div class="sc-item" style="--k:' + k.c + '"><div class="sc-item-top"><b>' + esc(sx(t.es[0], t.en[0])) + '</b><span class="sc-kind">' + esc(sx(k.es, k.en)) + '</span></div>' +
      '<span class="sc-ll">📍 ' + fmtLL(t.lat, t.lon) + ' · ' + t.bands.map(function (b) { return sensorName(b); }).join(' + ') + '</span><p>' + esc(sx(t.es[1], t.en[1])) + '</p></div>';
  }
  if (!h) h = '<p class="sc-empty">' + esc(sx('Aún no hay hallazgos. Prueba cada instrumento: lo que es invisible en uno brilla en otro.', 'No finds yet. Try every instrument: what is invisible in one shines in another.')) + '</p>';
  document.getElementById('sc-cat').innerHTML = h;
  document.getElementById('sc-count').textContent = n + ' / ' + total;
}
function sensorName(id) { for (var i = 0; i < SENSORS.length; i++) if (SENSORS[i].id === id) return sx(SENSORS[i].es[0], SENSORS[i].en[0]); return id; }

/* ---------- the live view ---------- */
function scanFrame(ts) {
  if (!SCAN.open) return;
  SCAN.raf = requestAnimationFrame(scanFrame);
  var dt = SCAN.last ? Math.min(0.05, (ts - SCAN.last) / 1000) : 0.016; SCAN.last = ts;
  var cv = document.getElementById('sc-cv'); if (!cv) return;
  if (SCAN.mode === 'levels' && SCAN.level != null && !SCAN.lvWon) {
    SCAN.lvT += dt;
    var te = document.getElementById('lv-time'); if (te) { te.textContent = Math.floor(SCAN.lvT) + ' s'; te.classList.toggle('late', SCAN.lvT > SCAN_LEVELS[SCAN.level].par); }
  }
  var dpr = Math.min(2, window.devicePixelRatio || 1), w = cv.clientWidth, h = Math.round(w / 2);
  if (cv.height !== Math.round(h * dpr) || cv.width !== Math.round(w * dpr)) { cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); cv.style.height = h + 'px'; }
  var g = cv.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0);
  var L = scanBuild(SCAN.world), layer = L[SCAN.sensor].c;
  g.imageSmoothingEnabled = true; g.drawImage(layer, 0, 0, w, h);
  /* graticule */
  g.strokeStyle = 'rgba(255,255,255,.12)'; g.lineWidth = 1; g.font = '10px ui-monospace,monospace'; g.fillStyle = 'rgba(255,255,255,.55)';
  for (var la = -60; la <= 60; la += 30) { var yy = (90 - la) / 180 * h; g.beginPath(); g.moveTo(0, yy); g.lineTo(w, yy); g.stroke(); g.fillText((la > 0 ? la + '°N' : (la < 0 ? -la + '°S' : '0°')), 4, yy - 3); }
  for (var lo = -120; lo <= 120; lo += 60) { var xx = (lo + 180) / 360 * w; g.beginPath(); g.moveTo(xx, 0); g.lineTo(xx, h); g.stroke(); }
  /* confirmed finds and half-confirmed ones */
  var T = WORLDS[SCAN.world].targets, t;
  for (var i = 0; i < T.length; i++) {
    t = T[i]; var key = SCAN.world + ':' + t.id, px = (t.lon + 180) / 360 * w, py = (90 - t.lat) / 180 * h;
    if (SCAN.done[key]) {
      g.fillStyle = KIND[t.kind].c; g.beginPath(); g.moveTo(px, py); g.arc(px, py - 14, 7, Math.PI * 0.75, Math.PI * 2.25); g.closePath(); g.fill();
      g.fillStyle = '#04161c'; g.beginPath(); g.arc(px, py - 14, 3, 0, 6.283); g.fill();
    } else if (SCAN.prog[key]) {
      g.strokeStyle = KIND[t.kind].c; g.setLineDash([4, 3]); g.lineWidth = 2; g.beginPath(); g.arc(px, py, 12, 0, 6.283); g.stroke(); g.setLineDash([]);
    }
  }
  /* the lens: three times magnified, following the pointer */
  var lx = SCAN.lx * w, ly = SCAN.ly * h, R = Math.max(46, w * 0.075), Z = 3;
  var lat = 90 - SCAN.ly * 180, lon = SCAN.lx * 360 - 180;
  if (SCAN.lensOn) {
    g.save(); g.beginPath(); g.arc(lx, ly, R, 0, 6.283); g.clip();
    var sxx = SCAN.lx * SW - R / Z * SW / w, syy = SCAN.ly * SH - R / Z * SH / h;
    g.imageSmoothingEnabled = false;
    g.drawImage(layer, sxx, syy, 2 * R / Z * SW / w, 2 * R / Z * SH / h, lx - R, ly - R, 2 * R, 2 * R);
    g.restore();
  }
  /* what is under the lens for this sensor */
  var best = null, bestW = 0;
  for (i = 0; i < T.length; i++) {
    t = T[i]; var d = sDist(lat, lon, t.lat, t.lon), wv = Math.exp(-Math.pow(d / (t.r * 1.15), 2));
    if (t.bands.indexOf(SCAN.sensor) >= 0 && wv > bestW) { bestW = wv; best = t; }
  }
  var key2 = best ? SCAN.world + ':' + best.id : null, need = best ? scanNext(best) : null;
  var locking = SCAN.lensOn && best && bestW > 0.55 && need === SCAN.sensor;
  SCAN.hold = locking ? SCAN.hold + dt : Math.max(0, SCAN.hold - dt * 2);
  if (locking && SCAN.hold >= 1.1) { scanLock(best); SCAN.hold = 0; }
  if (SCAN.lensOn) {
    var col = locking ? '#3ecf9a' : (bestW > 0.25 ? '#f0c24b' : 'rgba(79,209,224,.9)');
    g.strokeStyle = col; g.lineWidth = 2.5; g.beginPath(); g.arc(lx, ly, R, 0, 6.283); g.stroke();
    g.beginPath(); g.moveTo(lx - 10, ly); g.lineTo(lx + 10, ly); g.moveTo(lx, ly - 10); g.lineTo(lx, ly + 10); g.stroke();
    if (locking) { g.strokeStyle = '#3ecf9a'; g.lineWidth = 5; g.beginPath(); g.arc(lx, ly, R + 7, -Math.PI / 2, -Math.PI / 2 + 6.283 * Math.min(1, SCAN.hold / 1.1)); g.stroke(); }
  }
  /* readout */
  var sig = Math.round(bestW * 100), bars = '';
  for (i = 0; i < 10; i++) bars += '<i class="' + (i < Math.round(bestW * 10) ? 'on' : '') + '"></i>';
  var hint = '';
  if (best && bestW > 0.25) {
    if (SCAN.done[key2]) hint = sx('Ya catalogado: ', 'Already catalogued: ') + sx(best.es[0], best.en[0]);
    else if (need && need !== SCAN.sensor) hint = sx('Señal aquí. Confírmala con: ', 'Signal here. Confirm it with: ') + sensorName(need);
    else hint = locking ? sx('Fijando objetivo…', 'Locking on…') : sx('Acércate al centro de la señal', 'Move to the centre of the signal');
  }
  if (SCAN.msgT > 0) { SCAN.msgT -= dt; hint = SCAN.msg; }
  var rd = document.getElementById('sc-read');
  rd.innerHTML = '<span class="sc-coord">📍 ' + (SCAN.lensOn ? fmtLL(lat, lon) : '—') + '</span>' +
    '<span class="sc-sig">' + esc(sx('Señal', 'Signal')) + ' <span class="sc-bars">' + bars + '</span> ' + sig + '%</span>' +
    '<span class="sc-hint">' + esc(hint || sx('Explora: cada instrumento revela cosas distintas.', 'Explore: each instrument reveals different things.')) + '</span>';
}

/* the next band a target still needs */
function scanNext(t) {
  var key = SCAN.world + ':' + t.id, p = SCAN.prog[key] || 0;
  return p < t.bands.length ? t.bands[p] : null;
}
function scanLock(t) {
  var key = SCAN.world + ':' + t.id;
  SCAN.prog[key] = (SCAN.prog[key] || 0) + 1;
  if (SCAN.prog[key] >= t.bands.length) {
    SCAN.done[key] = true;
    SCAN.msg = (t.kind === 'false' ? '⚠ ' : '✓ ') + sx(t.es[0], t.en[0]) + ' · ' + sx(KIND[t.kind].es, KIND[t.kind].en) + ' · ' + fmtLL(t.lat, t.lon);
    SCAN.msgT = 3.5;
    if (t.kind !== 'false') SCAN.gained += 40;
    if (typeof SFX !== 'undefined' && SFX.chime) SFX.chime();
    scanCatalog();
    var all = true; WORLDS[SCAN.world].targets.forEach(function (q) { if (!SCAN.done[SCAN.world + ':' + q.id] && q.kind !== 'false') all = false; });
    if (all && SCAN.mode === 'free' && typeof award === 'function') award('hunter');
    if (SCAN.mode === 'levels') scanLevelCheck(t);
  } else {
    SCAN.msg = sx('Señal registrada. Ahora confírmala con: ', 'Signal logged. Now confirm it with: ') + sensorName(t.bands[SCAN.prog[key]]);
    SCAN.msgT = 3.2;
  }
}

/* ---------- events ---------- */
function scanClick(e) {
  var b = e.target.closest ? e.target.closest('[data-sc]') : null; if (!b) return;
  var a = b.getAttribute('data-sc');
  if (a === 'close') { scanClose(); return; }
  if (a === 'world') { SCAN.world = b.getAttribute('data-v'); SCAN.hold = 0; SCAN.msgT = 0; scanRender(); return; }
  if (a === 'sensor') { SCAN.sensor = b.getAttribute('data-v'); SCAN.hold = 0; var s = document.querySelectorAll('.sc-sensor'); for (var i = 0; i < s.length; i++) s[i].classList.toggle('on', s[i].getAttribute('data-v') === SCAN.sensor); return; }
  if (a === 'csv') { scanCSV(); return; }
  if (a === 'levels') { SCAN.mode = 'levels'; SCAN.level = null; scanRender(); return; }
  if (a === 'free') { SCAN.mode = 'free'; SCAN.level = null; scanRender(); return; }
  if (a === 'level') { scanStartLevel(parseInt(b.getAttribute('data-v'), 10)); return; }
}
function scanKey(e) {
  if (e.key === 'Escape') { scanClose(); return; }
  var s = { '1': 'vis', '2': 'tir', '3': 'nir', '4': 'gas' }[e.key];
  if (s) { var b = document.querySelector('.sc-sensor[data-v="' + s + '"]'); if (b) b.click(); return; }
  var st = e.shiftKey ? 0.04 : 0.01, m = { ArrowLeft: [-st, 0], ArrowRight: [st, 0], ArrowUp: [0, -st * 2], ArrowDown: [0, st * 2] }[e.key];
  if (m) { e.preventDefault(); SCAN.lensOn = true; SCAN.lx = ((SCAN.lx + m[0]) % 1 + 1) % 1; SCAN.ly = Math.max(0.01, Math.min(0.99, SCAN.ly + m[1])); }
}
function scanCSV() {
  var rows = [['world', 'target', 'type', 'latitude', 'longitude', 'instruments']];
  for (var wk in WORLDS) WORLDS[wk].targets.forEach(function (t) {
    if (!SCAN.done[wk + ':' + t.id]) return;
    rows.push([sx(WORLDS[wk].es[0], WORLDS[wk].en[0]), sx(t.es[0], t.en[0]), sx(KIND[t.kind].es, KIND[t.kind].en), t.lat.toFixed(2), t.lon.toFixed(2), t.bands.map(sensorName).join(' + ')]);
  });
  var csv = rows.map(function (r) { return r.map(function (c) { return '"' + String(c).replace(/"/g, '""') + '"'; }).join(','); }).join('\n');
  var a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' })); a.download = 'orbital-nexus-descubrimientos.csv';
  document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
}

/* which world a mission looks down on */
function scanWorldFor(destId) {
  if (destId === 'leo-sso' || destId === 'geo-relay') return 'earth';
  if (destId === 'mars-orbit' || destId === 'mars-surface') return 'mars';
  if (destId === 'europa') return 'europa';
  return null;
}
function scanBtn(cls) {
  return '<button class="btn x-open ' + (cls || '') + '" data-act="scan">' + icon('target', 'ico') +
    '<span><b>' + esc(sx('Escáner orbital', 'Orbital scanner')) + '</b><small>' +
    esc(sx('Geolocaliza señales de vida con cámaras infrarrojas y en blanco y negro', 'Geolocate signs of life with infrared and black-and-white cameras')) + '</small></span></button>';
}
function scanFromGame() {
  var w = S.phase === 6 ? scanWorldFor(S.destId) : null, inOps = !!w && S.alive && !S.scanDone;
  scanOpen({ world: w || null, levels: !w, done: function (r) {
    if (inOps && r.science > 0) {
      S.bonusScience = (S.bonusScience || 0) + r.science; S.scanDone = true;
      logit(sx('Escaneo orbital: +', 'Orbital scan: +') + r.science + ' pts', 'sci');
    }
    render();
  } });
}

/* ---------------------------------------------------------------- *
 * exploration levels                                                *
 * ---------------------------------------------------------------- */
/* Five missions that unlock one after another. Each gives clues instead
   of names, times the search, and costs a star for every false alarm the
   player confirms, so the lesson is the scientist's: check before you
   announce. */
var SCAN_LEVELS = [
  { world: 'earth', par: 40,
    es: ['Entrenamiento: vida verde', 'Tu primer día como analista de satélites. Encuentra vida vegetal desde la órbita.'],
    en: ['Training: green life', 'Your first day as a satellite analyst. Find plant life from orbit.'],
    goals: [{ t: 'forest', es: 'Una gran zona viva cerca del ecuador, en Sudamérica. Pista: las plantas brillan en infrarrojo cercano.', en: 'A large living area near the equator, in South America. Hint: plants glow in near infrared.' }] },
  { world: 'earth', par: 90,
    es: ['Patrulla terrestre', 'Vigila la Tierra como los satélites de observación: vida, peligros y ciudades.'],
    en: ['Earth patrol', 'Watch Earth like observation satellites do: life, hazards and cities.'],
    goals: [
      { t: 'fire', es: 'Algo muy caliente en la selva. Pista: infrarrojo térmico.', en: 'Something very hot in the rainforest. Hint: thermal infrared.' },
      { t: 'penguins', es: 'Manchas oscuras sobre el hielo de la Antártida.', en: 'Dark stains on the Antarctic ice.' },
      { t: 'whales', es: 'Puntos claros en el océano, al sureste de Australia.', en: 'Bright specks in the ocean, south-east of Australia.' },
      { t: 'city', es: 'Una isla de calor con calles en cuadrícula, en Asia.', en: 'A heat island with a street grid, in Asia.' }] },
  { world: 'mars', par: 90,
    es: ['Marte: agua y vida antigua', 'Elige dónde aterrizará la próxima misión: busca agua y un lago antiguo.'],
    en: ['Mars: water and ancient life', 'Choose where the next mission lands: look for water and an ancient lake.'],
    goals: [
      { t: 'jezero', es: 'Un delta en forma de abanico al norte del ecuador. Confírmalo con arcillas.', en: 'A fan-shaped delta north of the equator. Confirm it with clays.' },
      { t: 'ice', es: 'Un lugar anormalmente frío en el norte. Pista: térmico.', en: 'An unusually cold spot in the north. Hint: thermal.' },
      { t: 'rover', es: 'Un punto brillante diminuto cerca del ecuador: tecnología humana.', en: 'A tiny bright dot near the equator: human technology.' }] },
  { world: 'mars', par: 60, trap: true,
    es: ['La caza del metano', 'Un gas que podría venir de microbios. Cuidado: Marte también engaña a los sensores.'],
    en: ['The methane hunt', 'A gas that might come from microbes. Careful: Mars fools sensors too.'],
    goals: [{ t: 'methane', es: 'Un penacho de gas cerca del cráter Gale. Pista: espectrómetro de gases.', en: 'A gas plume near Gale crater. Hint: gas spectrometer.' }] },
  { world: 'europa', par: 90, trap: true,
    es: ['Europa: el océano oculto', 'Bajo el hielo hay un océano. Encuentra por dónde se asoma.'],
    en: ['Europa: the hidden ocean', 'There is an ocean under the ice. Find where it peeks out.'],
    goals: [
      { t: 'plume', es: 'Vapor de agua saliendo al espacio en el sur. Confírmalo con el térmico.', en: 'Water vapour escaping to space in the south. Confirm it with thermal.' },
      { t: 'salts', es: 'Grietas con sales que vienen del océano. Pista: infrarrojo cercano.', en: 'Cracks with salts from the ocean. Hint: near infrared.' },
      { t: 'thin', es: 'Una zona más tibia donde el hielo podría ser delgado.', en: 'A warmer patch where the ice may be thin.' }] }
];

function scanLvStore() { try { return JSON.parse(pref('on_scan_lv', '{}')) || {}; } catch (e) { return {}; } }
function scanLvSave(o) { setPref('on_scan_lv', JSON.stringify(o)); }
function scanLvUnlocked(i) { return i === 0 || !!scanLvStore()[i - 1]; }

function scanLevelSelect() {
  var st = scanLvStore(), h = '<div class="lv-grid">';
  for (var i = 0; i < SCAN_LEVELS.length; i++) {
    var L = SCAN_LEVELS[i], open = scanLvUnlocked(i), stars = st[i] || 0, w = L.world;
    h += '<button class="lv-card' + (open ? '' : ' locked') + (stars ? ' won' : '') + '"' + (open ? ' data-sc="level" data-v="' + i + '"' : ' disabled') + '>' +
      destArt(w === 'earth' ? 'leo-sso' : (w === 'mars' ? 'mars-orbit' : 'europa'), 'art lv-art') +
      '<span class="lv-n">' + sx('Nivel ', 'Level ') + (i + 1) + (L.trap ? ' · ⚠ ' + sx('falsas alarmas', 'false alarms') : '') + '</span>' +
      '<b>' + esc(sx(L.es[0], L.en[0])) + '</b><span class="lv-d">' + esc(sx(L.es[1], L.en[1])) + '</span>' +
      '<span class="lv-stars">' + (open ? '★★★'.slice(0, stars) + '<i>' + '★★★'.slice(stars) + '</i>' : '🔒 ' + sx('Completa el nivel anterior', 'Finish the previous level')) + '</span></button>';
  }
  var total = 0; for (var k in st) total += st[k];
  return '<div class="lv-wrap"><div class="lv-head"><div><b>' + esc(sx('Misiones de exploración', 'Exploration missions')) + '</b><span>' +
    esc(sx('Investiga lugares de la Tierra, Marte y Europa como un analista de la NASA. Cada nivel desbloquea el siguiente.',
      'Investigate places on Earth, Mars and Europa like a NASA analyst. Each level unlocks the next.')) + '</span></div>' +
    '<span class="lv-total">★ ' + total + ' / ' + (SCAN_LEVELS.length * 3) + '</span></div>' + h + '</div></div>';
}

function scanStartLevel(i) {
  var L = SCAN_LEVELS[i];
  SCAN.level = i; SCAN.world = L.world; SCAN.lvT = 0; SCAN.lvFalse = 0; SCAN.lvWon = false; SCAN.hold = 0; SCAN.msgT = 0;
  WORLDS[L.world].targets.forEach(function (t) { delete SCAN.done[L.world + ':' + t.id]; delete SCAN.prog[L.world + ':' + t.id]; });
  SCAN.sensor = 'vis';
  scanRender();
}

function scanGoalsHTML() {
  var L = SCAN_LEVELS[SCAN.level], h = '';
  L.goals.forEach(function (gl) {
    var ok = !!SCAN.done[L.world + ':' + gl.t], t = scanTarget(L.world, gl.t);
    h += '<li class="' + (ok ? 'ok' : '') + '"><span>' + (ok ? '✓' : '?') + '</span><div><b>' + esc(ok ? sx(t.es[0], t.en[0]) : sx('Objetivo desconocido', 'Unknown target')) + '</b><small>' +
      esc(ok ? fmtLL(t.lat, t.lon) : sx(gl.es, gl.en)) + '</small></div></li>';
  });
  return h;
}
function scanTarget(w, id) { var T = WORLDS[w].targets; for (var i = 0; i < T.length; i++) if (T[i].id === id) return T[i]; return null; }

/* called after every confirmation while a level is running */
function scanLevelCheck(t) {
  if (SCAN.level == null || SCAN.lvWon) return;
  var L = SCAN_LEVELS[SCAN.level];
  if (t.kind === 'false') {
    SCAN.lvFalse++;
    SCAN.msg = '⚠ ' + sx('¡Falsa alarma confirmada! Pierdes una estrella. Revisa con otro instrumento antes de anunciar.', 'False alarm confirmed! You lose a star. Check with another instrument before announcing.');
    SCAN.msgT = 4;
  }
  var gl = document.getElementById('lv-goals'); if (gl) gl.innerHTML = scanGoalsHTML();
  var all = L.goals.every(function (g) { return SCAN.done[L.world + ':' + g.t]; });
  if (!all) return;
  SCAN.lvWon = true;
  var stars = 3; if (SCAN.lvT > L.par) stars--; stars -= Math.min(2, SCAN.lvFalse); stars = Math.max(1, stars);
  var st = scanLvStore(); if (!st[SCAN.level] || st[SCAN.level] < stars) { st[SCAN.level] = stars; scanLvSave(st); }
  if (SCAN.level === SCAN_LEVELS.length - 1 && typeof award === 'function') award('hunter');
  var next = SCAN.level + 1 < SCAN_LEVELS.length;
  var box = document.getElementById('lv-end');
  if (!box) return;
  box.innerHTML = '<span class="lv-k">' + esc(sx('Nivel completado', 'Level complete')) + '</span><div class="lv-big">' + '★★★'.slice(0, stars) + '<i>' + '★★★'.slice(stars) + '</i></div>' +
    '<p>' + esc(sx('Tiempo: ', 'Time: ')) + Math.round(SCAN.lvT) + ' s · ' + esc(sx('meta ', 'target ')) + L.par + ' s · ' + esc(sx('falsas alarmas: ', 'false alarms: ')) + SCAN.lvFalse + '</p>' +
    '<div class="lv-btns"><button class="btn ghost" data-sc="level" data-v="' + SCAN.level + '">' + esc(sx('Repetir', 'Replay')) + '</button>' +
    (next ? '<button class="btn primary" data-sc="level" data-v="' + (SCAN.level + 1) + '">' + esc(sx('Siguiente nivel →', 'Next level →')) + '</button>'
      : '<button class="btn primary" data-sc="levels">' + esc(sx('¡Todos los niveles! Ver mapa', 'All levels done! See the map')) + '</button>') + '</div>';
  box.hidden = false;
  if (typeof confetti === 'function') confetti();
}
