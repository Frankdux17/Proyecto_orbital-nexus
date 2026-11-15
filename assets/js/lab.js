/* ORBITAL NEXUS — engineering lab.
   A workbench for people who want to run the numbers themselves: the rocket
   equation, Hohmann transfers and launch windows, orbit geometry, a decibel
   link budget, solar power over a mission, and a map of the whole trade
   space of the current mission with its Pareto front. Every tool can load
   the spacecraft being designed, and the useful results can be sent back. */

var LAB = { tab: 'rocket', v: {}, trade: null, sel: -1 };
var FLASK = '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M9 3h6M10 3v6l-5.5 9.2A2 2 0 0 0 6.2 21h11.6a2 2 0 0 0 1.7-2.8L14 9V3" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="M7.5 15h9" stroke="currentColor" stroke-width="1.8"/></svg>';

var MU = { sun: 1.32712440018e20, earth: 3.986004418e14, moon: 4.9048695e12, mars: 4.282837e13, jupiter: 1.26686534e17 };
var RBODY = { earth: 6371, moon: 1737.4, mars: 3389.5, jupiter: 69911 };
var PLANET_AU = { mercury: 0.387, venus: 0.723, earth: 1.0, mars: 1.524, ceres: 2.77, jupiter: 5.203, saturn: 9.537 };

function lx(es, en) { return LANG === 'es' ? es : en; }
function fmt(v, d) {
  if (!isFinite(v)) return '—';
  var a = Math.abs(v);
  if (a !== 0 && (a >= 1e7 || a < 1e-3)) return v.toExponential(2);
  return v.toLocaleString(LANG === 'es' ? 'es' : 'en', { maximumFractionDigits: d == null ? 2 : d, minimumFractionDigits: 0 });
}
function dB(x) { return 10 * Math.log10(x); }

var LAB_TABS = [
  { id: 'rocket', ic: 'rocket', es: 'Ecuación del cohete', en: 'Rocket equation' },
  { id: 'hohmann', ic: 'orbit3d', es: 'Transferencia y ventanas', en: 'Transfers and windows' },
  { id: 'orbit', ic: 'target', es: 'Órbita', en: 'Orbit' },
  { id: 'link', ic: 'dish', es: 'Enlace en dB', en: 'Link budget (dB)' },
  { id: 'power', ic: 'solar', es: 'Energía', en: 'Power' },
  { id: 'trade', ic: 'spark', es: 'Mapa de compensaciones', en: 'Trade-space map' }
];

/* default inputs; "load my mission" overwrites them */
function labDefaults() {
  return {
    rocket: { isp: 321, dry: 850, dv: 1.9, prop: 700 },
    hohmann: { body: 'sun', r1: 1.0, r2: 1.524, from: 'earth', to: 'mars' },
    orbit: { body: 'earth', alt: 600 },
    link: { pt: 100, dt: 2.5, et: 0.6, f: 8.4, dist: 1.5, unit: 'au', dr: 34, er: 0.6, ts: 30, ebn0: 6, margin: 5 },
    power: { area: 14, au: 1.524, eff: 28, pack: 78, deg: 2.5, years: 4, load: 450, ecl: 0.7, dod: 70 }
  };
}

/* ---------------------------------------------------------------- *
 * open / close                                                      *
 * ---------------------------------------------------------------- */
function labDOM() {
  var root = document.getElementById('lab');
  if (root) return root;
  root = document.createElement('div');
  root.id = 'lab'; root.className = 'lab'; root.hidden = true;
  root.setAttribute('role', 'dialog'); root.setAttribute('aria-modal', 'true');
  document.body.appendChild(root);
  root.addEventListener('click', labClick);
  root.addEventListener('input', labInput);
  root.addEventListener('change', labInput);
  root.addEventListener('keydown', function (e) { if (e.key === 'Escape') labClose(); });
  return root;
}

function labOpen(tab) {
  if (!LAB.v.rocket) { LAB.v = labDefaults(); if (S.busId || S.destId) labLoadMission(true); }
  if (tab) LAB.tab = tab;
  var root = labDOM();
  root.hidden = false; OVERLAY_OPEN = true;
  document.body.classList.add('no-scroll');
  labRender();
  root.focus();
  award('engineer');
}

function labClose() {
  var root = document.getElementById('lab');
  if (root) root.hidden = true;
  OVERLAY_OPEN = false;
  document.body.classList.remove('no-scroll');
  render();
}

/* pull the design on the table into every tool */
function labLoadMission(quiet) {
  var c = comp(), v = LAB.v;
  if (c.prop) { v.rocket.isp = c.prop.isp; }
  if (c.mass && c.mass.dry > 0) { v.rocket.dry = Math.round(c.mass.dry); v.rocket.prop = Math.round(c.mass.propellant); }
  if (c.dest) {
    v.rocket.dv = Math.round(c.dv.required * 1000) / 1000;
    var id = c.dest.id;
    if (id === 'mars-orbit' || id === 'mars-surface') v.hohmann = { body: 'sun', r1: 1, r2: 1.524, from: 'earth', to: 'mars' };
    else if (id === 'venus-orbit') v.hohmann = { body: 'sun', r1: 1, r2: 0.723, from: 'earth', to: 'venus' };
    else if (id === 'europa') v.hohmann = { body: 'sun', r1: 1, r2: 5.203, from: 'earth', to: 'jupiter' };
    else if (id === 'psyche') v.hohmann = { body: 'sun', r1: 1, r2: 2.92, from: 'earth', to: '' };
    else if (id === 'titan') v.hohmann = { body: 'sun', r1: 1, r2: 9.54, from: 'earth', to: 'saturn' };
    else if (id === 'neo') v.hohmann = { body: 'sun', r1: 1, r2: 1.3, from: 'earth', to: '' };
    else if (id === 'geo-relay') v.hohmann = { body: 'earth', r1: 6371 + 400, r2: 42164, from: '', to: '' };
    else if (id === 'llo' || id === 'sel2') v.hohmann = { body: 'earth', r1: 6371 + 400, r2: 384400, from: '', to: '' };
    else v.hohmann = { body: 'earth', r1: 6371 + 200, r2: 6371 + 600, from: '', to: '' };
    v.orbit = id === 'llo' ? { body: 'moon', alt: 100 } : (id.indexOf('mars') === 0 ? { body: 'mars', alt: 300 } : (id === 'geo-relay' ? { body: 'earth', alt: 35786 } : { body: 'earth', alt: 600 }));
    v.power.au = c.dest.solarAu; v.power.ecl = ENG.ECLIPSE_H[id] || 0;
    v.power.years = Math.round(c.years * 10) / 10;
    v.link.dist = c.dest.commAu < 0.02 ? Math.round(c.dest.commAu * AU_M / 1000) : c.dest.commAu;
    v.link.unit = c.dest.commAu < 0.02 ? 'km' : 'au';
  }
  if (S.powerType === 'solar' && S.arrayArea) v.power.area = S.arrayArea;
  if (c.power && c.power.peak) v.power.load = Math.round(c.power.peak);
  if (S.antennaD) v.link.dt = S.antennaD;
  if (S.twtaW) v.link.pt = S.twtaW;
  if (c.band) v.link.f = c.band.ghz;
  if (c.grd) v.link.dr = c.grd.dia;
  LAB.trade = null;
  if (!quiet) labRender();
}

/* ---------------------------------------------------------------- *
 * shell                                                             *
 * ---------------------------------------------------------------- */
function labBody() {
  return { rocket: labRocket, hohmann: labHohmann, orbit: labOrbit, link: labLink, power: labPower, trade: labTrade }[LAB.tab]();
}
/* while typing only the results and the chart change, so the field
   being edited keeps its text, caret and focus */
function labRefresh() {
  var tmp = document.createElement('div');
  tmp.innerHTML = labBody();
  var src = tmp.querySelector('.lab-out'), dst = document.querySelector('#lab .lab-out');
  if (src && dst) { dst.innerHTML = src.innerHTML; glossify(dst); }
  labDraw();
}
function labRender() {
  var root = labDOM(), tabs = '';
  for (var i = 0; i < LAB_TABS.length; i++) {
    var tb = LAB_TABS[i];
    tabs += '<button class="lab-tab' + (LAB.tab === tb.id ? ' on' : '') + '" data-lab="tab" data-v="' + tb.id + '">' + icon(tb.ic, 'ico') + '<span>' + esc(lx(tb.es, tb.en)) + '</span></button>';
  }
  var body = labBody();
  var hasMission = !!(S.destId);
  root.innerHTML = '<div class="lab-wrap" tabindex="-1">' +
    '<header class="lab-head"><div class="lab-title"><span class="lab-badge">' + FLASK + '</span><div><b>' +
    esc(lx('Laboratorio de ingeniería', 'Engineering lab')) + '</b><span>' +
    esc(lx('Haz tus propios cálculos con las ecuaciones reales. Cambia cualquier número.', 'Run your own numbers with the real equations. Change any value.')) + '</span></div></div>' +
    '<div class="lab-actions">' + (hasMission ? '<button class="btn ghost" data-lab="load">' + icon('spark', 'ico') + esc(lx('Cargar mi misión', 'Load my mission')) + '</button>' : '') +
    '<button class="btn ghost" data-lab="copy">' + esc(lx('Copiar resultados', 'Copy results')) + '</button>' +
    '<button class="icon-btn lab-x" data-lab="close" aria-label="' + esc(lx('Cerrar', 'Close')) + '">' + icon('close', 'ico') + '</button></div></header>' +
    '<nav class="lab-tabs" role="tablist">' + tabs + '</nav><main class="lab-body">' + body + '</main></div>';
  glossify(root);
  labDraw();
}

function field(tool, k, label, unit, step, min, max) {
  var v = LAB.v[tool][k];
  return '<label class="lf"><span>' + esc(label) + '</span><span class="lf-in"><input type="number" inputmode="decimal" data-tool="' + tool + '" data-k="' + k + '" value="' + v + '"' +
    (step != null ? ' step="' + step + '"' : ' step="any"') + (min != null ? ' min="' + min + '"' : '') + (max != null ? ' max="' + max + '"' : '') + '>' +
    (unit ? '<em>' + esc(unit) + '</em>' : '') + '</span></label>';
}
function selectF(tool, k, label, opts) {
  var v = LAB.v[tool][k], h = '<label class="lf"><span>' + esc(label) + '</span><span class="lf-in"><select data-tool="' + tool + '" data-k="' + k + '">';
  for (var i = 0; i < opts.length; i++) h += '<option value="' + opts[i][0] + '"' + (String(v) === String(opts[i][0]) ? ' selected' : '') + '>' + esc(opts[i][1]) + '</option>';
  return h + '</select></span></label>';
}
function out(label, val, unit, cls) {
  return '<div class="lo' + (cls ? ' ' + cls : '') + '"><span>' + esc(label) + '</span><b>' + val + (unit ? ' <em>' + esc(unit) + '</em>' : '') + '</b></div>';
}
function formula(lines) {
  var h = '<div class="formula"><span class="f-k">' + esc(lx('Ecuaciones', 'Equations')) + '</span>';
  for (var i = 0; i < lines.length; i++) h += '<code>' + lines[i] + '</code>';
  return h + '</div>';
}
function labLayout(inputs, results, chart, note) {
  return '<div class="lab-grid"><section class="lab-card lab-in"><h3>' + esc(lx('Entradas', 'Inputs')) + '</h3>' + inputs + '</section>' +
    '<section class="lab-card lab-out"><h3>' + esc(lx('Resultados', 'Results')) + '</h3>' + results + '</section>' +
    '<section class="lab-card lab-chart">' + chart + (note ? '<p class="lab-note">' + note + '</p>' : '') + '</section></div>';
}
function chartBox(title) {
  return '<h3>' + esc(title) + '</h3><canvas id="lab-cv" class="lab-cv"></canvas>';
}

/* ---------------------------------------------------------------- *
 * 1. rocket equation                                                *
 * ---------------------------------------------------------------- */
function rocketCalc() {
  var v = LAB.v.rocket, ve = v.isp * G0;
  var dvHave = v.dry > 0 && v.prop > 0 ? ve * Math.log((v.dry + v.prop) / v.dry) / 1000 : 0;
  var R = Math.exp(v.dv * 1000 / ve);
  var need = v.dry * (R - 1);
  return { ve: ve, dvHave: dvHave, R: R, need: need, frac: 1 - 1 / R, wet: v.dry + need };
}
function labRocket() {
  var r = rocketCalc(), v = LAB.v.rocket;
  var canApply = S.busId && S.propId && S.phase >= 2 && S.phase <= 5;
  var inputs = field('rocket', 'isp', lx('Impulso específico Isp', 'Specific impulse Isp'), 's', 1, 1) +
    '<div class="presets-mini">' + [['65', lx('Gas frío', 'Cold gas')], ['228', 'Mono'], ['321', 'Biprop'], ['450', 'LOX/LH₂'], ['2900', 'Hall']].map(function (p) {
      return '<button class="chip-btn" data-lab="set" data-tool="rocket" data-k="isp" data-v="' + p[0] + '">' + esc(p[1]) + ' · ' + p[0] + ' s</button>';
    }).join('') + '</div>' +
    field('rocket', 'dry', lx('Masa seca m_f', 'Dry mass m_f'), 'kg', 1, 0) +
    field('rocket', 'dv', lx('Δv objetivo', 'Target Δv'), 'km/s', 0.01, 0) +
    field('rocket', 'prop', lx('Propelente cargado', 'Propellant loaded'), 'kg', 1, 0);
  var results = out(lx('Velocidad de escape v_e', 'Exhaust velocity v_e'), fmt(r.ve / 1000, 3), 'km/s') +
    out(lx('Propelente necesario', 'Propellant needed'), fmt(r.need, 1), 'kg', 'big') +
    out(lx('Razón de masas m₀/m_f', 'Mass ratio m₀/m_f'), fmt(r.R, 3)) +
    out(lx('Fracción de propelente', 'Propellant fraction'), fmt(r.frac * 100, 1), '%', r.frac > 0.45 ? 'warn' : '') +
    out(lx('Masa húmeda m₀', 'Wet mass m₀'), fmt(r.wet, 0), 'kg') +
    out(lx('Δv con el propelente cargado', 'Δv with propellant loaded'), fmt(r.dvHave, 3), 'km/s', r.dvHave >= v.dv ? 'ok' : 'bad') +
    (r.frac > 0.45 ? '<p class="lab-tip">' + esc(lx('Más del 45% de la nave sería propelente: sube el Isp o baja la masa seca.', 'Over 45% of the spacecraft would be propellant: raise Isp or cut dry mass.')) + '</p>' : '') +
    (canApply ? '<button class="btn primary wide" data-lab="apply-prop">' + esc(lx('Cargar ' + fmt(r.need * 1.1, 0) + ' kg (con 10% de margen) en mi nave', 'Load ' + fmt(r.need * 1.1, 0) + ' kg (with 10% margin) into my spacecraft')) + '</button>' : '') +
    formula(['Δv = I<sub>sp</sub> · g₀ · ln(m₀ / m<sub>f</sub>)', 'm<sub>prop</sub> = m<sub>f</sub> · (e<sup>Δv / (I<sub>sp</sub> g₀)</sup> − 1)', 'g₀ = 9.80665 m/s²']);
  return labLayout(inputs, results, chartBox(lx('Propelente necesario según Δv (comparación de motores)', 'Propellant needed against Δv (engine comparison)')),
    esc(lx('La curva es exponencial: cada km/s extra cuesta más que el anterior. Por eso el Isp decide qué destinos son posibles.',
      'The curve is exponential: every extra km/s costs more than the last. That is why Isp decides which destinations are possible.')));
}

/* ---------------------------------------------------------------- *
 * 2. Hohmann transfer + launch windows                              *
 * ---------------------------------------------------------------- */
function hohmannCalc() {
  var v = LAB.v.hohmann, mu = MU[v.body];
  var unit = v.body === 'sun' ? AU_M : 1000;
  var r1 = v.r1 * unit, r2 = v.r2 * unit, a = (r1 + r2) / 2;
  var v1 = Math.sqrt(mu / r1), v2 = Math.sqrt(mu / r2);
  var vp = Math.sqrt(mu * (2 / r1 - 1 / a)), va = Math.sqrt(mu * (2 / r2 - 1 / a));
  var dv1 = Math.abs(vp - v1), dv2 = Math.abs(v2 - va);
  var tof = Math.PI * Math.sqrt(a * a * a / mu);
  var T1 = 2 * Math.PI * Math.sqrt(r1 * r1 * r1 / mu), T2 = 2 * Math.PI * Math.sqrt(r2 * r2 * r2 / mu);
  var phase = Math.PI - 2 * Math.PI * tof / T2; // target lead angle at departure
  phase = ((phase % (2 * Math.PI)) + 3 * Math.PI) % (2 * Math.PI) - Math.PI;
  var syn = Math.abs(1 / (1 / T1 - 1 / T2));
  return { r1: r1, r2: r2, a: a, v1: v1, v2: v2, dv1: dv1, dv2: dv2, tof: tof, T1: T1, T2: T2, phase: phase, syn: syn, c3: dv1 * dv1 / 1e6, ecc: Math.abs(r2 - r1) / (r1 + r2) };
}
function labHohmann() {
  var h = hohmannCalc(), v = LAB.v.hohmann, sun = v.body === 'sun';
  var bodyOpts = [['sun', lx('Sol (interplanetario)', 'Sun (interplanetary)')], ['earth', lx('Tierra', 'Earth')], ['mars', lx('Marte', 'Mars')], ['jupiter', lx('Júpiter', 'Jupiter')], ['moon', lx('Luna', 'Moon')]];
  var presets = sun
    ? [['earth', 'mars', 'Tierra → Marte', 'Earth → Mars'], ['earth', 'venus', 'Tierra → Venus', 'Earth → Venus'], ['earth', 'jupiter', 'Tierra → Júpiter', 'Earth → Jupiter'], ['earth', 'saturn', 'Tierra → Saturno', 'Earth → Saturn'], ['earth', 'ceres', 'Tierra → Ceres', 'Earth → Ceres'], ['earth', 'mercury', 'Tierra → Mercurio', 'Earth → Mercury']]
    : [];
  var inputs = selectF('hohmann', 'body', lx('Cuerpo central', 'Central body'), bodyOpts) +
    (sun ? '<div class="presets-mini">' + presets.map(function (p) {
      return '<button class="chip-btn" data-lab="hoh" data-a="' + p[0] + '" data-b="' + p[1] + '">' + esc(lx(p[2], p[3])) + '</button>';
    }).join('') + '</div>' : '<div class="presets-mini"><button class="chip-btn" data-lab="hohr" data-a="' + (6371 + 400) + '" data-b="42164">LEO → GEO</button><button class="chip-btn" data-lab="hohr" data-a="' + (6371 + 400) + '" data-b="384400">' + esc(lx('LEO → distancia lunar', 'LEO → lunar distance')) + '</button></div>') +
    field('hohmann', 'r1', lx('Radio de la órbita inicial r₁', 'Initial orbit radius r₁'), sun ? 'UA' : 'km', 'any', 0) +
    field('hohmann', 'r2', lx('Radio de la órbita final r₂', 'Final orbit radius r₂'), sun ? 'UA' : 'km', 'any', 0);
  var days = h.tof / 86400;
  var results = out('Δv₁ ' + lx('(salida)', '(departure)'), fmt(h.dv1 / 1000, 3), 'km/s') +
    out('Δv₂ ' + lx('(llegada)', '(arrival)'), fmt(h.dv2 / 1000, 3), 'km/s') +
    out(lx('Δv total', 'Total Δv'), fmt((h.dv1 + h.dv2) / 1000, 3), 'km/s', 'big') +
    out(lx('Tiempo de vuelo', 'Time of flight'), days > 2 ? fmt(days, 0) + ' ' + lx('días', 'days') + (days > 400 ? ' (' + fmt(days / 365.25, 1) + ' ' + lx('años', 'years') + ')' : '') : fmt(h.tof / 3600, 1) + ' h') +
    out(lx('Ángulo de fase en la salida', 'Phase angle at departure'), fmt(h.phase * 180 / Math.PI, 1), '°') +
    (sun ? out(lx('Ventana de lanzamiento cada', 'Launch window every'), fmt(h.syn / 86400, 0), lx('días', 'days')) +
      out('C3 ' + lx('de salida ≈ v∞²', 'at departure ≈ v∞²'), fmt(h.c3, 1), 'km²/s²') : '') +
    out(lx('Excentricidad de la transferencia', 'Transfer eccentricity'), fmt(h.ecc, 3)) +
    formula(['a = (r₁ + r₂) / 2', 'Δv₁ = √(μ/r₁) · (√(2r₂/(r₁+r₂)) − 1)', 'Δv₂ = √(μ/r₂) · (1 − √(2r₁/(r₁+r₂)))', 't = π √(a³/μ)', 'T<sub>sin</sub> = 1 / |1/T₁ − 1/T₂|']);
  return labLayout(inputs, results, chartBox(lx('Geometría de la transferencia en el momento de salida', 'Transfer geometry at departure')),
    esc(sun ? lx('El destino debe ir adelantado el ángulo de fase cuando sales: por eso las ventanas a Marte se abren cada ~26 meses. El C3 dice qué cohete puede darte esa velocidad.',
      'The target must lead by the phase angle when you leave: that is why Mars windows open every ~26 months. C3 tells you which rocket can give you that speed.')
      : lx('Dos encendidos: uno para estirar la órbita y otro para circularizarla en el apoapsis.', 'Two burns: one to stretch the orbit and one to circularise it at apoapsis.')));
}

/* ---------------------------------------------------------------- *
 * 3. orbit geometry                                                 *
 * ---------------------------------------------------------------- */
function orbitCalc() {
  var v = LAB.v.orbit, mu = MU[v.body], R = RBODY[v.body] * 1000, r = R + v.alt * 1000;
  var T = 2 * Math.PI * Math.sqrt(r * r * r / mu), vc = Math.sqrt(mu / r), vesc = Math.sqrt(2 * mu / r);
  var ecl = r > R ? Math.asin(R / r) / Math.PI : 0;
  var rot = { earth: 86164.1, moon: 2360591, mars: 88642.7, jupiter: 35730 }[v.body];
  return { T: T, vc: vc, vesc: vesc, ecl: ecl, eclMin: ecl * T / 60, perDay: 86400 / T, shift: 360 * T / rot, horizon: Math.acos(R / r) * R / 1000, g: mu / (r * r) };
}
function labOrbit() {
  var o = orbitCalc();
  var inputs = selectF('orbit', 'body', lx('Cuerpo', 'Body'), [['earth', lx('Tierra', 'Earth')], ['moon', lx('Luna', 'Moon')], ['mars', lx('Marte', 'Mars')], ['jupiter', lx('Júpiter', 'Jupiter')]]) +
    field('orbit', 'alt', lx('Altitud', 'Altitude'), 'km', 'any', 0) +
    '<div class="presets-mini">' + [['earth', 400, 'ISS'], ['earth', 600, 'SSO'], ['earth', 20200, 'GPS'], ['earth', 35786, 'GEO'], ['moon', 100, 'LRO'], ['mars', 300, 'MRO']].map(function (p) {
      return '<button class="chip-btn" data-lab="orb" data-a="' + p[0] + '" data-b="' + p[1] + '">' + p[2] + ' · ' + fmt(p[1], 0) + ' km</button>';
    }).join('') + '</div>';
  var results = out(lx('Período orbital', 'Orbital period'), o.T > 7200 ? fmt(o.T / 3600, 2) + ' h' : fmt(o.T / 60, 1) + ' min', '', 'big') +
    out(lx('Velocidad circular', 'Circular velocity'), fmt(o.vc / 1000, 3), 'km/s') +
    out(lx('Velocidad de escape a esa altura', 'Escape velocity at that altitude'), fmt(o.vesc / 1000, 3), 'km/s') +
    out(lx('Eclipse máximo por órbita', 'Longest eclipse per orbit'), fmt(o.eclMin, 1) + ' min (' + fmt(o.ecl * 100, 0) + '%)') +
    out(lx('Órbitas por día', 'Orbits per day'), fmt(o.perDay, 2)) +
    out(lx('Desplazamiento de la traza por órbita', 'Ground-track shift per orbit'), fmt(o.shift, 2), '°') +
    out(lx('Distancia al horizonte', 'Distance to horizon'), fmt(o.horizon, 0), 'km') +
    out(lx('Gravedad local', 'Local gravity'), fmt(o.g, 3), 'm/s²') +
    formula(['T = 2π √(r³/μ)', 'v = √(μ/r) ·  v<sub>esc</sub> = √(2μ/r)', lx('eclipse (β = 0) = asin(R/r) / π', 'eclipse (β = 0) = asin(R/r) / π')]);
  return labLayout(inputs, results, chartBox(lx('Órbita a escala y sombra del planeta', 'Orbit to scale and the planet’s shadow')),
    esc(lx('El eclipse dimensiona la batería; las órbitas por día y la traza dicen cada cuánto vuelves a ver el mismo lugar.',
      'The eclipse sizes the battery; orbits per day and the ground track say how often you revisit the same place.')));
}

/* ---------------------------------------------------------------- *
 * 4. link budget in decibels                                        *
 * ---------------------------------------------------------------- */
function linkCalc() {
  var v = LAB.v.link, lambda = ENG.C / (v.f * 1e9);
  var d = v.unit === 'au' ? v.dist * AU_M : v.dist * 1000;
  var gt = v.et * Math.pow(Math.PI * v.dt / lambda, 2), gr = v.er * Math.pow(Math.PI * v.dr / lambda, 2);
  var fspl = Math.pow(4 * Math.PI * d / lambda, 2);
  var ptdb = dB(v.pt), gtdb = dB(gt), grdb = dB(gr), ldb = dB(fspl), tdb = dB(v.ts);
  var eirp = ptdb + gtdb, gT = grdb - tdb;
  var cn0 = eirp - ldb + gT - dB(ENG.K_B);
  var rate = Math.pow(10, (cn0 - v.ebn0 - v.margin) / 10);
  var bw = 70 * lambda / v.dt; // half-power beamwidth, degrees
  return { lambda: lambda, d: d, ptdb: ptdb, gtdb: gtdb, grdb: grdb, ldb: ldb, tdb: tdb, eirp: eirp, gT: gT, cn0: cn0, rate: rate, bw: bw, delay: d / ENG.C };
}
function labLink() {
  var k = linkCalc();
  var inputs = field('link', 'pt', lx('Potencia del transmisor P_t', 'Transmitter power P_t'), 'W', 'any', 0) +
    field('link', 'dt', lx('Antena de la nave D_t', 'Spacecraft antenna D_t'), 'm', 'any', 0) +
    selectF('link', 'f', lx('Frecuencia', 'Frequency'), [[2.3, 'S · 2.3 GHz'], [8.4, 'X · 8.4 GHz'], [32, 'Ka · 32 GHz']]) +
    '<div class="lf-row">' + field('link', 'dist', lx('Distancia', 'Distance'), '', 'any', 0) + selectF('link', 'unit', lx('Unidad', 'Unit'), [['au', 'UA / AU'], ['km', 'km']]) + '</div>' +
    selectF('link', 'dr', lx('Antena en Tierra', 'Ground antenna'), [[13, '13 m'], [34, 'DSN 34 m'], [70, 'DSN 70 m']]) +
    field('link', 'ts', lx('Temperatura de ruido T_sys', 'Noise temperature T_sys'), 'K', 'any', 1) +
    field('link', 'ebn0', lx('Eb/N0 requerido', 'Required Eb/N0'), 'dB', 0.1) +
    field('link', 'margin', lx('Margen de diseño', 'Design margin'), 'dB', 0.5);
  var row = function (a, b, c) { return '<tr><td>' + esc(a) + '</td><td>' + c + '</td><td class="num">' + b + '</td></tr>'; };
  var results = '<table class="lbt"><thead><tr><th>' + esc(lx('Término', 'Term')) + '</th><th>' + esc(lx('Símbolo', 'Symbol')) + '</th><th class="num">dB</th></tr></thead><tbody>' +
    row(lx('Potencia de transmisión', 'Transmit power'), fmt(k.ptdb, 1) + ' dBW', 'P<sub>t</sub>') +
    row(lx('Ganancia de la nave', 'Spacecraft gain'), '+' + fmt(k.gtdb, 1) + ' dBi', 'G<sub>t</sub>') +
    row('EIRP', fmt(k.eirp, 1) + ' dBW', 'P<sub>t</sub>G<sub>t</sub>') +
    row(lx('Pérdida de espacio libre', 'Free-space loss'), '−' + fmt(k.ldb, 1), 'L<sub>s</sub>') +
    row(lx('Ganancia en Tierra', 'Ground gain'), '+' + fmt(k.grdb, 1) + ' dBi', 'G<sub>r</sub>') +
    row(lx('Figura de mérito', 'Figure of merit'), fmt(k.gT, 1) + ' dB/K', 'G/T') +
    row(lx('Constante de Boltzmann', 'Boltzmann constant'), '+228.6', '−k') +
    row(lx('Densidad portadora/ruido', 'Carrier-to-noise density'), fmt(k.cn0, 1) + ' dB-Hz', 'C/N₀') +
    row(lx('Eb/N0 + margen', 'Eb/N0 + margin'), '−' + fmt(LAB.v.link.ebn0 + LAB.v.link.margin, 1), '') +
    '</tbody></table>' +
    out(lx('Tasa máxima de datos', 'Maximum data rate'), bps(k.rate), '', 'big') +
    out(lx('Ancho del haz de la nave', 'Spacecraft beamwidth'), fmt(k.bw, 2), '°') +
    out(lx('Retardo de la señal (ida)', 'One-way light time'), k.delay > 120 ? fmt(k.delay / 60, 1) + ' min' : fmt(k.delay, 2) + ' s') +
    formula(['C/N₀ = EIRP − L<sub>s</sub> + G/T − 10·log k', 'R = 10<sup>(C/N₀ − Eb/N₀ − M)/10</sup>', 'G = η (π D / λ)² · L<sub>s</sub> = (4π d / λ)²']);
  return labLayout(inputs, results, chartBox(lx('Tasa de datos según la distancia', 'Data rate against distance')),
    esc(lx('Cada vez que duplicas la distancia pierdes 6 dB: la tasa cae a la cuarta parte. Duplicar cualquiera de las dos antenas recupera esos 6 dB.',
      'Every time you double the distance you lose 6 dB: the rate drops to a quarter. Doubling either antenna wins those 6 dB back.')));
}

/* ---------------------------------------------------------------- *
 * 5. solar power and battery                                        *
 * ---------------------------------------------------------------- */
function powerCalc() {
  var v = LAB.v.power, flux = 1361 / (v.au * v.au);
  var bol = flux * v.area * v.eff / 100 * v.pack / 100;
  var eol = bol * Math.pow(1 - v.deg / 100, v.years);
  var batt = v.load * v.ecl / (v.dod / 100);
  var areaNeed = v.load * 1.3 / (flux * v.eff / 100 * v.pack / 100 * Math.pow(1 - v.deg / 100, v.years));
  return { flux: flux, bol: bol, eol: eol, margin: (eol - v.load) / v.load, batt: batt, mass: v.area * DATA.power.solar.kgPerM2 + batt * DATA.power.battery.kgPerWh, areaNeed: areaNeed };
}
function labPower() {
  var p = powerCalc();
  var inputs = field('power', 'area', lx('Área de paneles', 'Array area'), 'm²', 'any', 0) +
    field('power', 'au', lx('Distancia al Sol', 'Distance from the Sun'), 'UA', 'any', 0.1) +
    field('power', 'eff', lx('Eficiencia de celdas', 'Cell efficiency'), '%', 0.5, 1, 50) +
    field('power', 'pack', lx('Factor de empaquetado', 'Packing factor'), '%', 1, 1, 100) +
    field('power', 'deg', lx('Degradación anual', 'Yearly degradation'), '%/' + lx('año', 'yr'), 0.1, 0) +
    field('power', 'years', lx('Duración de la misión', 'Mission length'), lx('años', 'years'), 0.1, 0) +
    field('power', 'load', lx('Carga máxima', 'Peak load'), 'W', 'any', 0) +
    field('power', 'ecl', lx('Eclipse más largo', 'Longest eclipse'), 'h', 'any', 0) +
    field('power', 'dod', lx('Profundidad de descarga', 'Depth of discharge'), '%', 1, 1, 100);
  var results = out(lx('Flujo solar', 'Solar flux'), fmt(p.flux, 0), 'W/m²') +
    out(lx('Potencia al inicio (BOL)', 'Beginning of life (BOL)'), fmt(p.bol, 0), 'W') +
    out(lx('Potencia al final (EOL)', 'End of life (EOL)'), fmt(p.eol, 0), 'W', 'big') +
    out(lx('Margen sobre la carga', 'Margin over load'), fmt(p.margin * 100, 0), '%', p.margin >= 0.3 ? 'ok' : (p.margin >= 0 ? 'warn' : 'bad')) +
    out(lx('Área para 30% de margen', 'Area for a 30% margin'), fmt(p.areaNeed, 1), 'm²') +
    out(lx('Batería para el eclipse', 'Battery for the eclipse'), fmt(p.batt, 0), 'Wh') +
    out(lx('Masa de paneles + batería', 'Array + battery mass'), fmt(p.mass, 0), 'kg') +
    formula(['P = 1361 / d² · A · η · f<sub>p</sub>', 'P<sub>EOL</sub> = P<sub>BOL</sub> · (1 − δ)<sup>años</sup>', 'E<sub>bat</sub> = P · t<sub>eclipse</sub> / DoD']);
  return labLayout(inputs, results, chartBox(lx('Potencia a lo largo de la misión frente a la carga', 'Power across the mission against the load')),
    esc(lx('En Júpiter (5,2 UA) la luz es 27 veces más débil que en la Tierra: Juno necesitó 60 m² de paneles para unos 500 W.',
      'At Jupiter (5.2 AU) sunlight is 27 times weaker than at Earth: Juno needed 60 m² of arrays for about 500 W.')));
}

/* ---------------------------------------------------------------- *
 * 6. trade-space map                                                *
 * ---------------------------------------------------------------- */
/* Every bus × propulsion × rocket × power source, each sized by the same
   rules, plotted as cost against the chance of the mission working. The
   points nobody can beat on both axes are the Pareto front. */
function tradeRun() {
  var base = cloneState(S), c0 = ENG.compute(base), rows = [];
  if (!c0.dest || !c0.prog) return { rows: rows, none: true };
  if (!base.instruments.length) base.instruments = autoInstruments(cloneState(base).busId ? base : (function () { var t = cloneState(base); pickInto(t, 'busId', 'flag2200'); return t; })());
  if (!base.antennaD) { base.antennaD = 1.0; base.twtaW = 50; }
  if (!base.groundId) base.groundId = c0.dest.commAu > 0.05 ? 'dsn34' : 'comm13';
  for (var b = 0; b < DATA.buses.length; b++) for (var p = 0; p < DATA.propulsion.length; p++) for (var l = 0; l < DATA.launchers.length; l++) for (var pw = 0; pw < 2; pw++) {
    var bus = DATA.buses[b], pr = DATA.propulsion[p], lv = DATA.launchers[l];
    if (pr.minRank > bus.rank) continue;
    if (pw === 1 && (!bus.allowsRTG || c0.prog.rank < DATA.power.rtg.minProgram)) continue;
    if ((lv.cap[c0.dest.c3] || 0) <= 0) continue;
    if (lv.onlyDest && lv.onlyDest.indexOf(c0.dest.id) < 0) continue;
    if (lv.minProgram != null && c0.prog.rank < lv.minProgram) continue;
    var st = cloneState(base);
    pickInto(st, 'busId', bus.id);
    st.instruments = base.instruments.filter(function (id) { var it = DATA.find(DATA.instruments, id); return it.minBusRank == null || bus.rank >= it.minBusRank; });
    st.propId = pr.id; st.launcherId = lv.id; st.powerType = pw ? 'rtg' : 'solar';
    if (st.antennaD > bus.antennaMax) st.antennaD = bus.antennaMax >= 1 ? 1.0 : 0.6;
    st.devMonths = null;
    autoSizeInto(st);
    var c = ENG.compute(st), ck = checks(c);
    var feasible = ck.dv && ck.power && ck.budget && ck.payload && ck.fits && c.viol.length === 0;
    var sci = 0;
    for (var i = 0; i < c.coverage.length; i++) if (c.coverage[i].full) sci += c.coverage[i].obj.value;
    sci *= Math.min(1, c.link.ratio || 0);
    rows.push({ st: st, bus: bus, prop: pr, lv: lv, rtg: !!pw, cost: c.cost.total, odds: ENG.successOdds(c).total, mass: c.mass.launch,
      dvm: c.dv.margin, pwm: c.power.marginPct, sci: sci, ok: feasible, why: c.viol.length ? L(c.viol[0]) : (!ck.budget ? lx('Sobre el presupuesto', 'Over budget') : (!ck.fits ? lx('No cabe en el cohete', 'Does not fit the rocket') : (!ck.dv ? lx('Le falta Δv', 'Short of Δv') : (!ck.power ? lx('Le falta energía', 'Short of power') : '')))) });
  }
  /* Pareto front over feasible points: lower cost, higher odds */
  var ok = rows.filter(function (r) { return r.ok; }).sort(function (a, b) { return a.cost - b.cost || b.odds - a.odds; });
  var bestOdds = -1;
  for (var k = 0; k < ok.length; k++) if (ok[k].odds > bestOdds + 1e-9) { ok[k].pareto = true; bestOdds = ok[k].odds; }
  return { rows: rows, budget: c0.prog.budget };
}
function labTrade() {
  var es = LANG === 'es';
  if (!S.destId || !S.programId) {
    return '<div class="lab-empty">' + icon('spark', 'ico') + '<b>' + esc(lx('Elige primero un programa y un destino', 'First pick a program and a destination')) + '</b><span>' +
      esc(lx('El mapa evalúa todas las naves posibles para tu misión.', 'The map evaluates every possible spacecraft for your mission.')) + '</span></div>';
  }
  if (!LAB.trade) { LAB.trade = tradeRun(); LAB.sel = -1; for (var i = 0; i < LAB.trade.rows.length; i++) if (LAB.trade.rows[i].pareto) { LAB.sel = i; } }
  var T = LAB.trade, rows = T.rows, nOk = 0, nPar = 0;
  for (i = 0; i < rows.length; i++) { if (rows[i].ok) nOk++; if (rows[i].pareto) nPar++; }
  var sel = rows[LAB.sel], det = '';
  if (sel) {
    det = '<div class="trade-sel"><b>' + esc(L(sel.bus.name)) + ' · ' + esc(L(sel.prop.name)) + ' · ' + esc(L(sel.lv.name)) + (sel.rtg ? ' · RTG' : '') + '</b>' +
      '<div class="trade-kv">' + out(lx('Costo', 'Cost'), money(sel.cost)) + out(lx('Probabilidad de éxito', 'Chance of success'), fmt(sel.odds * 100, 1), '%') +
      out(lx('Masa de lanzamiento', 'Launch mass'), fmt(sel.mass, 0), 'kg') + out(lx('Margen Δv', 'Δv margin'), fmt(sel.dvm * 1000, 0), 'm/s') +
      out(lx('Margen de energía', 'Power margin'), fmt(sel.pwm * 100, 0), '%') + out(lx('Ciencia que se puede bajar', 'Science you can downlink'), fmt(sel.sci, 0)) + '</div>' +
      (sel.ok ? (sel.pareto ? '<span class="ck ok">★ ' + esc(lx('En la frontera de Pareto: nadie es más barato y más seguro a la vez', 'On the Pareto front: nothing is both cheaper and safer')) + '</span>' : '<span class="ck ok">✓ ' + esc(lx('Viable', 'Feasible')) + '</span>')
        : '<span class="ck bad">✕ ' + esc(sel.why) + '</span>') +
      (sel.ok && S.phase >= 1 && S.phase <= 5 ? '<button class="btn primary wide" data-lab="apply-trade">' + esc(lx('Aplicar este diseño a mi misión', 'Apply this design to my mission')) + '</button>' : '') + '</div>';
  }
  var inputs = '<p class="lab-p">' + esc(lx('Se evaluaron ', 'Evaluated ')) + '<b>' + rows.length + '</b>' + esc(lx(' naves completas (bus × propulsión × cohete × energía), cada una dimensionada con la física del juego.',
    ' complete spacecraft (bus × propulsion × rocket × power), each sized with the game’s physics.')) + '</p>' +
    '<div class="trade-stats"><div><b>' + nOk + '</b><span>' + esc(lx('viables', 'feasible')) + '</span></div><div><b>' + (rows.length - nOk) + '</b><span>' + esc(lx('no cierran', 'do not close')) + '</span></div><div><b>' + nPar + '</b><span>' + esc(lx('en la frontera', 'on the front')) + '</span></div></div>' +
    '<div class="trade-legend"><span><i class="lg-ok"></i>' + esc(lx('viable', 'feasible')) + '</span><span><i class="lg-par"></i>' + esc(lx('frontera de Pareto', 'Pareto front')) + '</span><span><i class="lg-bad"></i>' + esc(lx('no cierra', 'does not close')) + '</span><span><i class="lg-you"></i>' + esc(lx('tu diseño', 'your design')) + '</span></div>' +
    '<button class="btn ghost wide" data-lab="csv">' + esc(lx('Exportar todo a CSV', 'Export everything to CSV')) + '</button>' +
    formula([lx('Frontera de Pareto: diseños que ningún otro supera en costo y en probabilidad de éxito a la vez.', 'Pareto front: designs no other beats on both cost and chance of success.')]);
  return '<div class="lab-grid trade"><section class="lab-card lab-in"><h3>' + esc(lx('El espacio de diseño de tu misión', 'Your mission’s design space')) + '</h3>' + inputs + '</section>' +
    '<section class="lab-card lab-chart big"><h3>' + esc(lx('Costo frente a probabilidad de éxito · toca un punto', 'Cost against chance of success · tap a point')) + '</h3><canvas id="lab-cv" class="lab-cv tall"></canvas>' + det + '</section></div>';
}

/* ---------------------------------------------------------------- *
 * charts                                                            *
 * ---------------------------------------------------------------- */
var LAB_PLOT = null;
function cvSetup() {
  var cv = document.getElementById('lab-cv');
  if (!cv) return null;
  var dpr = window.devicePixelRatio || 1, w = cv.clientWidth || 600, h = cv.clientHeight || 320;
  cv.width = w * dpr; cv.height = h * dpr;
  var g = cv.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0);
  g.clearRect(0, 0, w, h);
  return { cv: cv, g: g, w: w, h: h };
}
var COL = { grid: 'rgba(140,170,230,.14)', axis: 'rgba(170,190,230,.55)', txt: '#9fb0d0', cyan: '#4fd1e0', gold: '#f0c24b', violet: '#b98cff', blue: '#7aa2ff', orange: '#f0a93b', red: '#f0655f', green: '#3ecf9a' };

/* generic x/y plot with optional log axes */
function plotXY(o) {
  var s = cvSetup(); if (!s) return;
  var g = s.g, L0 = 62, R0 = 16, T0 = 14, B0 = 40, W = s.w - L0 - R0, H = s.h - T0 - B0;
  function tx(x) { return L0 + (o.logx ? (Math.log10(x) - Math.log10(o.x0)) / (Math.log10(o.x1) - Math.log10(o.x0)) : (x - o.x0) / (o.x1 - o.x0)) * W; }
  function ty(y) { return T0 + H - (o.logy ? (Math.log10(Math.max(y, o.y0)) - Math.log10(o.y0)) / (Math.log10(o.y1) - Math.log10(o.y0)) : (y - o.y0) / (o.y1 - o.y0)) * H; }
  g.font = '11px ui-monospace,Menlo,Consolas,monospace'; g.fillStyle = COL.txt; g.strokeStyle = COL.grid; g.lineWidth = 1;
  var ticks = function (a, b, log, n) {
    var out = [];
    if (log) { for (var e = Math.floor(Math.log10(a)); e <= Math.ceil(Math.log10(b)); e++) { var t = Math.pow(10, e); if (t >= a * 0.999 && t <= b * 1.001) out.push(t); } }
    else { var st = niceStep((b - a) / n); for (var t2 = Math.ceil(a / st) * st; t2 <= b + 1e-9; t2 += st) out.push(t2); }
    return out;
  };
  var xt = ticks(o.x0, o.x1, o.logx, 6), yt = ticks(o.y0, o.y1, o.logy, 5);
  g.textAlign = 'center';
  xt.forEach(function (x) { var X = tx(x); g.beginPath(); g.moveTo(X, T0); g.lineTo(X, T0 + H); g.stroke(); g.fillText(o.fx ? o.fx(x) : shortNum(x), X, T0 + H + 16); });
  g.textAlign = 'right';
  yt.forEach(function (y) { var Y = ty(y); g.beginPath(); g.moveTo(L0, Y); g.lineTo(L0 + W, Y); g.stroke(); g.fillText(o.fy ? o.fy(y) : shortNum(y), L0 - 8, Y + 4); });
  g.strokeStyle = COL.axis; g.strokeRect(L0, T0, W, H);
  g.fillStyle = COL.txt; g.textAlign = 'center'; g.fillText(o.xl, L0 + W / 2, s.h - 6);
  g.save(); g.translate(13, T0 + H / 2); g.rotate(-Math.PI / 2); g.fillText(o.yl, 0, 0); g.restore();
  g.save(); g.beginPath(); g.rect(L0, T0, W, H); g.clip();
  (o.bands || []).forEach(function (b) { g.fillStyle = b.c; g.fillRect(L0, ty(b.y1), W, ty(b.y0) - ty(b.y1)); });
  (o.series || []).forEach(function (sr) {
    g.strokeStyle = sr.c; g.lineWidth = sr.w || 2; g.setLineDash(sr.dash || []); g.beginPath();
    sr.pts.forEach(function (p, i) { var X = tx(p[0]), Y = ty(p[1]); if (i) g.lineTo(X, Y); else g.moveTo(X, Y); });
    g.stroke(); g.setLineDash([]);
  });
  (o.marks || []).forEach(function (m) {
    var X = tx(m[0]), Y = ty(m[1]);
    g.fillStyle = m[2] || COL.gold; g.beginPath(); g.arc(X, Y, 5, 0, Math.PI * 2); g.fill();
    g.strokeStyle = '#04161c'; g.lineWidth = 1.5; g.stroke();
    if (m[3]) { g.fillStyle = '#e8eefc'; g.textAlign = X > L0 + W * 0.7 ? 'right' : 'left'; g.fillText(m[3], X + (X > L0 + W * 0.7 ? -9 : 9), Y - 8); }
  });
  g.restore();
  /* legend */
  var lx0 = L0 + 10, ly = T0 + 16;
  (o.series || []).forEach(function (sr) { if (!sr.label) return; g.fillStyle = sr.c; g.fillRect(lx0, ly - 7, 14, 3); g.fillStyle = '#c9d6f0'; g.textAlign = 'left'; g.fillText(sr.label, lx0 + 20, ly - 2); ly += 15; });
  LAB_PLOT = { tx: tx, ty: ty, L0: L0, T0: T0, W: W, H: H };
}
function niceStep(raw) { var p = Math.pow(10, Math.floor(Math.log10(raw))), f = raw / p; return (f < 1.5 ? 1 : f < 3.5 ? 2 : f < 7.5 ? 5 : 10) * p; }
function shortNum(v) {
  var a = Math.abs(v);
  if (a >= 1e9) return (v / 1e9).toFixed(0) + 'G'; if (a >= 1e6) return (v / 1e6).toFixed(a >= 1e7 ? 0 : 1) + 'M'; if (a >= 1e3) return (v / 1e3).toFixed(a >= 1e4 ? 0 : 1) + 'k';
  if (a > 0 && a < 0.01) return v.toExponential(0);
  return String(Math.round(v * 100) / 100);
}

function labDraw() {
  var t = LAB.tab;
  if (t === 'rocket') {
    var v = LAB.v.rocket, x1 = Math.max(3, v.dv * 1.6), engines = [[228, COL.blue, 'Mono 228 s'], [321, COL.violet, 'Biprop 321 s'], [450, COL.green, 'LOX/LH₂ 450 s']], ser = [];
    if ([228, 321, 450].indexOf(+v.isp) < 0) engines.unshift([+v.isp, COL.cyan, lx('Tu motor ', 'Your engine ') + v.isp + ' s']);
    var ymax = 0;
    engines.forEach(function (e) {
      var pts = [];
      for (var i = 0; i <= 60; i++) { var dv = x1 * i / 60, m = v.dry * (Math.exp(dv * 1000 / (e[0] * G0)) - 1); pts.push([dv, m]); }
      ser.push({ pts: pts, c: +e[0] === +v.isp ? COL.cyan : e[1], w: +e[0] === +v.isp ? 3 : 1.6, label: e[2] });
    });
    var need = rocketCalc().need; ymax = Math.max(need * 1.8, v.dry * 1.2, 10);
    plotXY({ x0: 0, x1: x1, y0: 0, y1: ymax, series: ser, xl: 'Δv (km/s)', yl: lx('propelente (kg)', 'propellant (kg)'),
      marks: [[v.dv, need, COL.gold, fmt(need, 0) + ' kg'], [rocketCalc().dvHave, v.prop, COL.orange, lx('cargado', 'loaded')]] });
  } else if (t === 'hohmann') drawHohmann();
  else if (t === 'orbit') drawOrbit();
  else if (t === 'link') {
    var lk = LAB.v.link, cur = linkCalc(), dAU = cur.d / AU_M, pts = [], pts70 = [];
    var x0 = Math.min(1e-5, dAU / 3), x1b = Math.max(40, dAU * 3);
    for (var i = 0; i <= 80; i++) {
      var d = Math.pow(10, Math.log10(x0) + (Math.log10(x1b) - Math.log10(x0)) * i / 80);
      var sc = Math.pow(cur.d / (d * AU_M), 2);
      pts.push([d, cur.rate * sc]);
      pts70.push([d, cur.rate * sc * Math.pow(70 / lk.dr, 2)]);
    }
    var planets = [['LEO', 600e3 / AU_M], [lx('Luna', 'Moon'), 384400e3 / AU_M], [lx('Marte', 'Mars'), 1.5], [lx('Júpiter', 'Jupiter'), 5.2], ['Saturno', 9.5]];
    var marks = [[dAU, cur.rate, COL.gold, bps(cur.rate)]];
    plotXY({ x0: x0, x1: x1b, y0: 1, y1: 1e10, logx: true, logy: true, xl: lx('distancia (UA, escala log)', 'distance (AU, log scale)'), yl: lx('tasa (bps, escala log)', 'rate (bps, log scale)'),
      series: [{ pts: pts, c: COL.cyan, w: 2.5, label: lx('tu enlace', 'your link') }].concat(lk.dr !== 70 ? [{ pts: pts70, c: COL.violet, w: 1.4, dash: [5, 4], label: lx('con DSN 70 m', 'with DSN 70 m') }] : []),
      marks: marks.concat(planets.filter(function (p) { return p[1] >= x0 && p[1] <= x1b; }).map(function (p) { return [p[1], cur.rate * Math.pow(cur.d / (p[1] * AU_M), 2), 'rgba(232,238,252,.7)', p[0]]; })),
      fx: function (x) { return x >= 1 ? shortNum(x) : x.toExponential(0); } });
  } else if (t === 'power') {
    var pv = LAB.v.power, pc = powerCalc(), yrs = Math.max(1, pv.years * 1.3), pp = [];
    for (var y = 0; y <= 40; y++) { var yy = yrs * y / 40; pp.push([yy, pc.bol * Math.pow(1 - pv.deg / 100, yy)]); }
    plotXY({ x0: 0, x1: yrs, y0: 0, y1: Math.max(pc.bol, pv.load) * 1.25, xl: lx('años de misión', 'mission years'), yl: lx('potencia (W)', 'power (W)'),
      series: [{ pts: pp, c: COL.gold, w: 2.5, label: lx('paneles', 'arrays') }, { pts: [[0, pv.load], [yrs, pv.load]], c: COL.red, w: 1.6, dash: [6, 4], label: lx('carga máxima', 'peak load') },
        { pts: [[0, pv.load * 1.3], [yrs, pv.load * 1.3]], c: COL.green, w: 1.2, dash: [2, 4], label: lx('carga + 30% de margen', 'load + 30% margin') }],
      marks: [[pv.years, pc.eol, COL.cyan, 'EOL ' + fmt(pc.eol, 0) + ' W']] });
  } else if (t === 'trade') drawTrade();
}

function drawHohmann() {
  var s = cvSetup(); if (!s) return;
  var g = s.g, h = hohmannCalc(), cx = s.w / 2, cy = s.h / 2, sc = Math.min(s.w, s.h) * 0.44 / Math.max(h.r1, h.r2);
  var sun = LAB.v.hohmann.body === 'sun';
  g.fillStyle = sun ? '#ffc94a' : '#3b6fd8'; g.shadowColor = g.fillStyle; g.shadowBlur = 18;
  g.beginPath(); g.arc(cx, cy, sun ? 9 : Math.max(5, RBODY[LAB.v.hohmann.body] * 1000 * sc), 0, Math.PI * 2); g.fill(); g.shadowBlur = 0;
  g.lineWidth = 1.4; g.setLineDash([4, 4]);
  g.strokeStyle = 'rgba(122,162,255,.7)'; g.beginPath(); g.arc(cx, cy, h.r1 * sc, 0, Math.PI * 2); g.stroke();
  g.strokeStyle = 'rgba(240,169,59,.7)'; g.beginPath(); g.arc(cx, cy, h.r2 * sc, 0, Math.PI * 2); g.stroke();
  g.setLineDash([]);
  /* transfer half-ellipse from the orbit equation r = p / (1 + e cos θ):
     departure at angle 0, arrival at angle π, inward or outward */
  var outward = h.r2 > h.r1, pp = h.a * (1 - h.ecc * h.ecc);
  g.strokeStyle = COL.cyan; g.lineWidth = 2.6; g.beginPath();
  for (var i = 0; i <= 90; i++) {
    var phi = Math.PI * i / 90, th = outward ? phi : phi + Math.PI;
    var rr = pp / (1 + h.ecc * Math.cos(th)) * sc, X = cx + rr * Math.cos(phi), Y = cy - rr * Math.sin(phi);
    if (i) g.lineTo(X, Y); else g.moveTo(X, Y);
  }
  g.stroke();
  /* bodies at departure */
  var dep = [cx + h.r1 * sc, cy];
  var tgt = [cx + h.r2 * sc * Math.cos(h.phase), cy - h.r2 * sc * Math.sin(h.phase)];
  var arr = [cx - h.r2 * sc, cy];
  function dot(p, c, r, lab) { g.fillStyle = c; g.beginPath(); g.arc(p[0], p[1], r, 0, Math.PI * 2); g.fill(); if (lab) { g.fillStyle = '#e8eefc'; g.font = '12px system-ui,sans-serif'; g.textAlign = 'left'; g.fillText(lab, p[0] + 9, p[1] - 8); } }
  dot(dep, COL.blue, 6, lx('salida', 'departure') + (LAB.v.hohmann.from ? ' · ' + planetName(LAB.v.hohmann.from) : ''));
  if (sun) dot(tgt, COL.orange, 6, (planetName(LAB.v.hohmann.to) || lx('destino', 'target')) + ' ' + lx('al salir', 'at launch'));
  dot(arr, COL.gold, 5, lx('llegada', 'arrival'));
  if (sun) {
    g.strokeStyle = 'rgba(232,238,252,.35)'; g.lineWidth = 1; g.beginPath(); g.moveTo(cx, cy); g.lineTo(dep[0], dep[1]); g.moveTo(cx, cy); g.lineTo(tgt[0], tgt[1]); g.stroke();
    g.beginPath(); g.strokeStyle = COL.orange; g.arc(cx, cy, 28, 0, -h.phase, h.phase > 0); g.stroke();
    g.fillStyle = COL.orange; g.font = '12px ui-monospace,monospace'; g.fillText('φ = ' + fmt(h.phase * 180 / Math.PI, 1) + '°', cx + 34, cy - 8);
  }
}
function planetName(id) {
  var N = { mercury: ['Mercurio', 'Mercury'], venus: ['Venus', 'Venus'], earth: ['Tierra', 'Earth'], mars: ['Marte', 'Mars'], ceres: ['Ceres', 'Ceres'], jupiter: ['Júpiter', 'Jupiter'], saturn: ['Saturno', 'Saturn'] }[id];
  return N ? (LANG === 'es' ? N[0] : N[1]) : '';
}

function drawOrbit() {
  var s = cvSetup(); if (!s) return;
  var g = s.g, v = LAB.v.orbit, R = RBODY[v.body], r = R + v.alt, cx = s.w / 2, cy = s.h / 2;
  var sc = Math.min(s.w, s.h) * 0.42 / r, Rp = R * sc, rp = r * sc;
  /* shadow cylinder, Sun to the left */
  g.fillStyle = 'rgba(0,0,0,.45)'; g.fillRect(cx, cy - Rp, s.w, 2 * Rp);
  g.fillStyle = 'rgba(255,201,74,.9)'; g.font = '12px system-ui,sans-serif'; g.textAlign = 'left'; g.fillText('☀ ' + lx('luz solar', 'sunlight'), 10, 18);
  var col = { earth: '#3b6fd8', moon: '#9aa3b2', mars: '#c8643a', jupiter: '#d9b38c' }[v.body];
  /* lit from the left: day side in colour, night side fading out */
  var grd = g.createLinearGradient(cx - Rp, cy, cx + Rp, cy);
  grd.addColorStop(0, col); grd.addColorStop(0.45, col); grd.addColorStop(0.62, '#0d1426'); grd.addColorStop(1, '#070b16');
  g.fillStyle = grd; g.beginPath(); g.arc(cx, cy, Rp, 0, Math.PI * 2); g.fill();
  /* orbit: lit arc cyan, eclipsed arc red */
  var ea = Math.asin(Math.min(1, R / r));
  g.lineWidth = 3;
  g.strokeStyle = COL.cyan; g.beginPath(); g.arc(cx, cy, rp, ea, 2 * Math.PI - ea, false); g.stroke();
  g.strokeStyle = COL.red; g.beginPath(); g.arc(cx, cy, rp, -ea, ea, false); g.stroke();
  g.fillStyle = '#e8eefc'; g.textAlign = 'right';
  g.fillText(lx('eclipse', 'eclipse') + ' ' + fmt(orbitCalc().eclMin, 0) + ' min', s.w - 10, cy - Rp - 10 > 20 ? cy - Rp - 10 : 20);
  g.textAlign = 'left'; g.fillStyle = COL.cyan; g.fillText(fmt(v.alt, 0) + ' km', cx - rp * 0.72, cy - rp * 0.72);
}

function drawTrade() {
  var T = LAB.trade; if (!T || !T.rows.length) return;
  var rows = T.rows, xmax = 0, xmin = Infinity, ymin = 1, ymax = 0;
  rows.forEach(function (r) { xmax = Math.max(xmax, r.cost); xmin = Math.min(xmin, r.cost); ymin = Math.min(ymin, r.odds); ymax = Math.max(ymax, r.odds); });
  var cur = comp(), curOdds = ENG.successOdds(cur).total;
  xmax = Math.max(xmax, T.budget) * 1.05; ymin = Math.max(0, Math.min(ymin, curOdds) - 0.03); ymax = Math.min(1, ymax + 0.02);
  var par = rows.filter(function (r) { return r.pareto; }).sort(function (a, b) { return a.cost - b.cost; });
  plotXY({ x0: 0, x1: xmax, y0: ymin, y1: ymax, xl: lx('costo total ($M)', 'total cost ($M)'), yl: lx('probabilidad de éxito', 'chance of success'),
    fy: function (y) { return Math.round(y * 100) + '%'; },
    series: [{ pts: [[T.budget, ymin], [T.budget, ymax]], c: COL.red, w: 1.4, dash: [6, 4], label: lx('tope de presupuesto', 'budget cap') },
      { pts: par.map(function (r) { return [r.cost, r.odds]; }), c: COL.gold, w: 2 }] });
  var g = document.getElementById('lab-cv').getContext('2d'), P = LAB_PLOT;
  g.save(); g.beginPath(); g.rect(P.L0, P.T0, P.W, P.H); g.clip();
  rows.forEach(function (r, i) {
    var X = P.tx(r.cost), Y = P.ty(r.odds);
    r.px = X; r.py = Y;
    g.fillStyle = r.pareto ? COL.gold : (r.ok ? 'rgba(79,209,224,.85)' : 'rgba(150,165,195,.32)');
    g.beginPath(); g.arc(X, Y, r.pareto ? 5.5 : (r.ok ? 4 : 3), 0, Math.PI * 2); g.fill();
    if (i === LAB.sel) { g.strokeStyle = '#fff'; g.lineWidth = 2; g.beginPath(); g.arc(X, Y, 9, 0, Math.PI * 2); g.stroke(); }
  });
  if (S.busId && S.launcherId) {
    var X = P.tx(cur.cost.total), Y = P.ty(curOdds);
    g.strokeStyle = COL.green; g.lineWidth = 2.5; g.beginPath(); g.moveTo(X - 8, Y); g.lineTo(X + 8, Y); g.moveTo(X, Y - 8); g.lineTo(X, Y + 8); g.stroke();
    g.fillStyle = COL.green; g.font = '12px system-ui,sans-serif'; g.textAlign = 'left'; g.fillText(lx('tú', 'you'), X + 10, Y - 6);
  }
  g.restore();
}

/* ---------------------------------------------------------------- *
 * events                                                            *
 * ---------------------------------------------------------------- */
function labInput(e) {
  var el = e.target, tool = el.getAttribute && el.getAttribute('data-tool');
  if (!tool) return;
  var k = el.getAttribute('data-k'), raw = el.value;
  var val = (k === 'unit' || k === 'body') ? raw : parseFloat(raw);
  if (typeof val === 'number' && !isFinite(val)) return;
  LAB.v[tool][k] = val;
  if (tool === 'hohmann' && k === 'body') {
    LAB.v.hohmann = val === 'sun' ? { body: 'sun', r1: 1, r2: 1.524, from: 'earth', to: 'mars' }
      : { body: val, r1: RBODY[val] + 300, r2: RBODY[val] * 6, from: '', to: '' };
  }
  if (tool === 'hohmann' && (k === 'r1' || k === 'r2')) { LAB.v.hohmann.from = ''; LAB.v.hohmann.to = ''; }
  if (el.tagName === 'SELECT') { if (e.type === 'change') labRender(); return; }
  labRefresh();
}

function labClick(e) {
  var el = e.target.closest ? e.target.closest('[data-lab]') : null;
  if (!el) {
    if (e.target.id === 'lab-cv' && LAB.tab === 'trade' && LAB.trade) {
      var rc = e.target.getBoundingClientRect(), mx = e.clientX - rc.left, my = e.clientY - rc.top, best = -1, bd = 400;
      LAB.trade.rows.forEach(function (r, i) { var d = (r.px - mx) * (r.px - mx) + (r.py - my) * (r.py - my); if (d < bd) { bd = d; best = i; } });
      if (best >= 0) { LAB.sel = best; labRender(); }
    }
    return;
  }
  var a = el.getAttribute('data-lab');
  if (a === 'close') { labClose(); return; }
  if (a === 'tab') { LAB.tab = el.getAttribute('data-v'); labRender(); return; }
  if (a === 'load') { labLoadMission(); return; }
  if (a === 'set') { LAB.v[el.getAttribute('data-tool')][el.getAttribute('data-k')] = parseFloat(el.getAttribute('data-v')); labRender(); return; }
  if (a === 'hoh') {
    var f = el.getAttribute('data-a'), t = el.getAttribute('data-b');
    LAB.v.hohmann = { body: 'sun', r1: PLANET_AU[f], r2: PLANET_AU[t], from: f, to: t }; labRender(); return;
  }
  if (a === 'hohr') { LAB.v.hohmann.r1 = parseFloat(el.getAttribute('data-a')); LAB.v.hohmann.r2 = parseFloat(el.getAttribute('data-b')); labRender(); return; }
  if (a === 'orb') { LAB.v.orbit = { body: el.getAttribute('data-a'), alt: parseFloat(el.getAttribute('data-b')) }; labRender(); return; }
  if (a === 'apply-prop') {
    var c = comp(), need = rocketCalc().need * 1.1;
    S.auto = false;
    S.propellantKg = Math.min(c.bus.propMax, Math.ceil(need / (c.bus.propMax > 500 ? 10 : 1)) * (c.bus.propMax > 500 ? 10 : 1));
    el.textContent = '✓ ' + lx('Cargado: ' + S.propellantKg + ' kg (dimensionado manual)', 'Loaded: ' + S.propellantKg + ' kg (manual sizing)');
    comp(); saveGame(); return;
  }
  if (a === 'apply-trade') {
    var r = LAB.trade.rows[LAB.sel];
    if (!r) return;
    var keep = { staff: S.staff, diff: S.diff };
    ['busId', 'propId', 'launcherId', 'powerType', 'arrayArea', 'rtgUnits', 'batteryWh', 'propellantKg', 'instruments', 'antennaD', 'twtaW', 'groundId'].forEach(function (k) { S[k] = cloneState(r.st)[k]; });
    S.staff = keep.staff; S.auto = true; S.devMonths = null;
    if (S.phase < 2) S.phase = 2;
    S.seen = Math.max(S.seen, 5);
    LAB.trade = null;
    labClose(); return;
  }
  if (a === 'csv') { labCSV(); return; }
  if (a === 'copy') { labCopy(el); return; }
}

function labCSV() {
  var T = LAB.trade; if (!T) return;
  var head = ['bus', 'propulsion', 'launcher', 'power', 'cost_musd', 'success_prob', 'launch_mass_kg', 'dv_margin_ms', 'power_margin_pct', 'science', 'feasible', 'pareto', 'reason'];
  var lines = [head.join(',')];
  T.rows.forEach(function (r) {
    lines.push([r.bus.id, r.prop.id, r.lv.id, r.rtg ? 'rtg' : 'solar', r.cost.toFixed(1), r.odds.toFixed(4), r.mass.toFixed(0), (r.dvm * 1000).toFixed(0), (r.pwm * 100).toFixed(0), r.sci.toFixed(0), r.ok ? 1 : 0, r.pareto ? 1 : 0, '"' + (r.why || '').replace(/"/g, '""') + '"'].join(','));
  });
  var blob = new Blob(['﻿' + lines.join('\n')], { type: 'text/csv;charset=utf-8' });
  var a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = 'orbital-nexus-trade-space.csv';
  document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
}

function labCopy(btn) {
  var box = document.querySelector('#lab .lab-out') || document.querySelector('#lab .trade-sel') || document.querySelector('#lab .lab-in');
  var title = '';
  for (var i = 0; i < LAB_TABS.length; i++) if (LAB_TABS[i].id === LAB.tab) title = lx(LAB_TABS[i].es, LAB_TABS[i].en);
  var lines = ['ORBITAL NEXUS · ' + title];
  var ins = document.querySelectorAll('#lab .lab-in .lf');
  for (i = 0; i < ins.length; i++) { var inp = ins[i].querySelector('input,select'); lines.push(ins[i].querySelector('span').textContent + ': ' + (inp.tagName === 'SELECT' ? inp.options[inp.selectedIndex].text : inp.value) + (ins[i].querySelector('em') ? ' ' + ins[i].querySelector('em').textContent : '')); }
  lines.push('—');
  var outs = box ? box.querySelectorAll('.lo, tr') : [];
  for (i = 0; i < outs.length; i++) lines.push(outs[i].innerText.replace(/\s*\n\s*/g, ': ').replace(/\t/g, ' · '));
  var txt = lines.join('\n');
  try { navigator.clipboard.writeText(txt); btn.textContent = '✓ ' + lx('Copiado', 'Copied'); }
  catch (err) { btn.textContent = lx('No se pudo copiar', 'Could not copy'); }
}
