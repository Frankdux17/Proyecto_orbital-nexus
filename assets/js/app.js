/* ORBITAL NEXUS — application: state, interface and the operations simulator */

/* ---------------------------------------------------------------- *
 * state                                                            *
 * ---------------------------------------------------------------- */
var S;
function freshState() {
  return {
    phase: 0, seen: 0,
    programId: null, destId: null,
    busId: null, powerType: 'solar', arrayArea: 0, rtgUnits: 0, batteryWh: 0,
    propId: null, propellantKg: 0, edlId: null,
    instruments: [],
    antennaD: null, bandId: 'x', twtaW: null, groundId: null, shieldingId: 'none',
    launcherId: null, devMonths: null,
    auto: true,  /* arrays, battery and propellant size themselves */
    /* operations */
    turn: 0, alive: true, launchSuccess: true, failReason: null,
    storage: {}, collected: {}, downlinked: {}, dead: {},
    bonusScience: 0, budgetLeft: 0, propLeft: 0,
    arrayHealth: 1, permScience: 1, permDl: 1, permPower: 1, permImaging: 1, permAnomaly: 1,
    alloc: { sci: 60, dl: 30 }, active: {},
    log: [], strip: [], pendingEvent: null, usedEvents: {},
    diff: DIFF[pref('on_diff', 'eng')] ? pref('on_diff', 'eng') : 'eng',
    burnAcc: null, overflow: false, badgesChecked: false, newBadges: [],
    /* mission control, launch day and cruise navigation */
    staff: { fido: 1, gnc: true, eecom: false, inco: false, sci: true, h24: false },
    scrubs: 0, scrubCost: 0, wxFactor: 1, launchMode: null, ascent: null, nav: null,
    rng: (Math.random() * 4294967296) >>> 0
  };
}

/* seeded RNG so a mission can be replayed/debugged */
function rnd() {
  S.rng = (S.rng + 0x6D2B79F5) >>> 0;
  var t = S.rng;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

/* ---------------------------------------------------------------- *
 * small helpers                                                    *
 * ---------------------------------------------------------------- */
function $(id) { return document.getElementById(id); }
function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
function n0(v) { return (isFinite(v) ? v : 0).toFixed(0); }
function n1(v) { return (isFinite(v) ? v : 0).toFixed(1); }
function n2(v) { return (isFinite(v) ? v : 0).toFixed(2); }
function money(v) { return '$' + n0(v) + 'M'; }
function gb(v) { if (v >= 1000) return n1(v / 1000) + ' Tb'; return n0(v) + ' Gb'; }
function bps(v) {
  if (!isFinite(v) || v <= 0) return '—';
  if (v >= 1e9) return n1(v / 1e9) + ' Gbps';
  if (v >= 1e6) return n1(v / 1e6) + ' Mbps';
  if (v >= 1e3) return n1(v / 1e3) + ' kbps';
  return n0(v) + ' bps';
}
function statusClass(ratio) { return ratio >= 0.15 ? 'ok' : (ratio >= 0 ? 'warn' : 'bad'); }

var CACHE = null;
function comp() { CACHE = ENG.compute(S); return CACHE; }

/* ---------------------------------------------------------------- *
 * starfield                                                        *
 * ---------------------------------------------------------------- */
function starfield() {
  var cv = $('starfield'), ctx = cv.getContext('2d'), stars = [];
  function size() {
    cv.width = window.innerWidth; cv.height = window.innerHeight;
    stars = [];
    var n = Math.min(260, Math.round(cv.width * cv.height / 7000));
    for (var i = 0; i < n; i++) stars.push({
      x: Math.random() * cv.width, y: Math.random() * cv.height,
      r: Math.random() * 1.25 + 0.2, a: Math.random() * 0.55 + 0.12
    });
    draw();
  }
  function draw() {
    ctx.clearRect(0, 0, cv.width, cv.height);
    for (var i = 0; i < stars.length; i++) {
      var s = stars[i];
      ctx.beginPath();
      ctx.fillStyle = 'rgba(200,220,255,' + s.a + ')';
      ctx.arc(s.x, s.y, s.r, 0, 6.2832);
      ctx.fill();
    }
  }
  window.addEventListener('resize', size);
  size();
}

/* ---------------------------------------------------------------- *
 * chrome: stepper + HUD + nav                                      *
 * ---------------------------------------------------------------- */
var STEPS = ['step_mission', 'step_platform', 'step_science', 'step_link', 'step_launch', 'step_ops', 'step_report'];

function renderStepper() {
  var h = '';
  for (var i = 0; i < STEPS.length; i++) {
    var p = i + 1;
    var cls = S.phase === p ? 'active' : (S.phase > p ? 'done' : '');
    h += '<span class="step ' + cls + '"><span class="dot">' + (S.phase > p ? '✓' : p) + '</span>' + icon(PHASE_ICON[p], 'ico step-ic') + '<span class="step-t">' + esc(t(STEPS[i])) + '</span></span>';
  }
  $('stepper').innerHTML = S.phase === 0 ? '' : h;
}

function chip(label, val, sub, cls, pct) {
  return '<div class="chip"><div class="chip-top"><span class="chip-label">' + esc(label) + '</span>' +
    '<span class="chip-val s-' + cls + '">' + val + '</span></div>' +
    (sub ? '<div class="chip-sub">' + sub + '</div>' : '') +
    (pct != null ? '<div class="meter"><i class="m-' + cls + '" style="width:' + ENG.clamp(pct * 100, 0, 100) + '%"></i></div>' : '') +
    '</div>';
}

function renderHUD() {
  var hud = $('hud');
  if (S.phase < 1 || S.phase > 6 || !S.destId) { hud.hidden = true; return; }
  hud.hidden = false;
  var c = CACHE || comp();
  var h = '';

  h += chip(t('h_cost'), money(c.cost.total), money(c.cost.budget) + ' · ' + t('margin') + ' ' + money(c.cost.margin),
    statusClass(c.cost.marginPct), c.cost.budget ? c.cost.total / c.cost.budget : 0);

  h += chip(t('h_mass'), n0(c.mass.launch) + ' kg',
    c.lvCap ? (t('avail') + ' ' + n0(c.lvCap) + ' kg') : (t('req') + ' — '),
    c.lvCap ? (c.mass.launch <= c.lvCap * 0.85 ? 'ok' : (c.mass.launch <= c.lvCap ? 'warn' : 'bad')) : 'warn',
    c.lvCap ? c.mass.launch / c.lvCap : 0);

  h += chip(t('h_power'), n0(c.power.genEOL) + ' W',
    t('used') + ' ' + n0(c.power.peak) + ' W · ' + t('margin') + ' ' + n0(c.power.marginPct * 100) + '%',
    statusClass(c.power.marginPct), c.power.genEOL ? c.power.peak / c.power.genEOL : 0);

  h += chip(t('h_dv'), n2(c.dv.available) + ' km/s',
    t('req') + ' ' + n2(c.dv.required) + ' km/s',
    c.dv.required > 0 ? statusClass(c.dv.margin / Math.max(0.01, c.dv.required)) : 'ok',
    c.dv.available ? c.dv.required / c.dv.available : 0);

  h += chip(t('h_data'), bps(c.link.bps),
    gb(c.link.gbPerTurn) + '/' + t('turn').toLowerCase() + ' · ' + t('used') + ' ' + gb(c.link.collectGbPerTurn),
    c.link.ratio >= 0.6 ? 'ok' : (c.link.ratio >= 0.25 ? 'warn' : 'bad'),
    c.link.ratio ? Math.min(1, c.link.collectGbPerTurn / Math.max(1, c.link.gbPerTurn)) : 0);

  h += chip(t('h_payload'), n0(c.mass.payload) + ' kg',
    (c.bus ? t('avail') + ' ' + c.bus.payloadMax + ' kg' : '—') + ' · ' + c.instr.length + ' instr.',
    c.bus ? (c.mass.payload <= c.bus.payloadMax ? 'ok' : 'bad') : 'warn',
    c.bus ? c.mass.payload / c.bus.payloadMax : 0);

  hud.innerHTML = h;
}

/* which selections each phase demands before you may continue */
function gateMissing(c) {
  var m = [];
  function need(cond, es, en) { if (!cond) m.push({ es: es, en: en }); }
  if (S.phase === 1) {
    need(S.programId, 'Elige una clase de programa.', 'Pick a program class.');
    need(S.destId, 'Elige un destino.', 'Pick a destination.');
  }
  if (S.phase === 2) {
    need(S.busId, 'Elige un bus.', 'Pick a bus.');
    need(S.powerType === 'solar' ? S.arrayArea > 0 : S.rtgUnits > 0,
      'Dimensiona la fuente de energía.', 'Size the power source.');
    need(S.propId, 'Elige un sistema de propulsión.', 'Pick a propulsion system.');
    if (c.dest && c.dest.lander) need(S.edlId, 'Elige un sistema de aterrizaje.', 'Pick a landing system.');
  }
  if (S.phase === 3) need(S.instruments.length > 0, 'Selecciona al menos un instrumento.', 'Select at least one instrument.');
  if (S.phase === 4) {
    need(S.antennaD, 'Elige una antena.', 'Pick an antenna.');
    need(S.twtaW, 'Elige un amplificador.', 'Pick an amplifier.');
    need(S.groundId, 'Elige una estación terrena.', 'Pick a ground station.');
  }
  if (S.phase === 5) need(S.launcherId, 'Elige un lanzador.', 'Pick a launch vehicle.');
  return m;
}

function renderNav() {
  var nav = $('navbar');
  if (S.phase === 0 || S.phase === 7) { nav.hidden = true; return; }
  nav.hidden = false;
  var c = CACHE || comp();
  var miss = gateMissing(c);
  var msgs = [];
  for (var i = 0; i < miss.length; i++) msgs.push(L(miss[i]));
  for (i = 0; i < c.viol.length; i++) msgs.push(L(c.viol[i]));

  var blocked = msgs.length > 0;
  $('nav-msgs').innerHTML = blocked
    ? '<b>' + esc(t('blocked')) + '</b> ' + esc(msgs.slice(0, 2).join(' · ')) + (msgs.length > 2 ? ' (+' + (msgs.length - 2) + ')' : '')
    : '';

  var back = $('btn-back'), next = $('btn-next');
  back.textContent = t('back');
  back.disabled = S.phase <= 1 || S.phase === 6;
  if (S.phase === 5) next.textContent = t('launch_btn');
  else if (S.phase === 6) next.textContent = (S.alive && S.turn < c.opsTurns) ? t('next_turn') : t('end_mission');
  else next.textContent = t('next');
  next.disabled = S.phase === 6 ? false : blocked;
  next.classList.toggle('ready', !blocked && S.phase >= 1 && S.phase <= 5);
}

/* ---------------------------------------------------------------- *
 * phase 0 — splash                                                 *
 * ---------------------------------------------------------------- */
function viewSplash() {
  var es = LANG === 'es', sv = loadSave(), dh = '';
  for (var k in DIFF) dh += '<button class="diff' + (S.diff === k ? ' on' : '') + '" data-act="diff" data-v="' + k + '">' +
    '<b>' + esc(L(DIFF[k].name)) + '</b><span>' + esc(L(DIFF[k].desc)) + '</span></button>';
  var shelf = badgeShelf();
  var resume = '';
  if (sv) {
    var sd = DATA.find(DATA.destinations, sv.destId);
    resume = '<button class="btn" data-act="resume">' + esc(es ? 'Continuar misión guardada' : 'Resume saved mission') +
      '<small>' + esc(t(STEPS[Math.min(sv.phase, 7) - 1]) + (sd ? ' · ' + L(sd.name) : '') + (sv.phase === 6 ? ' · ' + t('turn') + ' ' + sv.turn : '')) + '</small></button>';
  }
  var gal = '';
  for (var i = 0; i < DATA.destinations.length; i++) {
    var d = DATA.destinations[i];
    gal += '<button class="gal" data-act="demo" data-v="' + d.id + '">' + destArt(d.id, 'art') +
      '<b>' + esc(L(d.tag)) + '</b><span>' + esc(L(d.name)) + '</span></button>';
  }
  var feats = [['orbit3d', 'splash_f1t', 'splash_f1b'], ['console', 'splash_f2t', 'splash_f2b'], ['dish', 'splash_f3t', 'splash_f3b'], ['trophy', 'splash_f4t', 'splash_f4b']];
  var fh = '';
  for (i = 0; i < feats.length; i++)
    fh += '<div><span class="feat-ic">' + icon(feats[i][0], 'ico') + '</span><strong>' + esc(t(feats[i][1])) + '</strong><span>' + esc(t(feats[i][2])) + '</span></div>';
  return '<div class="splash">' + juryBar() +
    '<div class="hero"><div class="hero-copy">' +
    '<div class="tag">' + esc(t('splash_tag')) + '</div>' +
    '<h1>' + esc(t('splash_title')) + '</h1>' +
    '<p>' + esc(t('splash_body')) + '</p>' +
    '<div class="cta"><button class="btn primary big" data-act="start">' + icon('rocket', 'ico') + esc(t('splash_start')) + '</button>' + resume +
    '<button class="btn big ghost" data-act="demo" data-v="mars-orbit">' + icon('orbit3d', 'ico') + esc(es ? 'Ver una misión en 3D' : 'See a mission in 3D') + '</button>' +
    '<button class="btn big ghost" data-act="practice">' + icon('rocket', 'ico') + esc(es ? 'Simulador de despegue' : 'Launch simulator') + '</button>' +
    '<button class="btn big ghost lab-cta" data-act="lab">' + FLASK + esc(es ? 'Laboratorio de ingeniería' : 'Engineering lab') + '</button></div>' +
    '</div><div class="hero-poster"><img src="assets/img/hero.jpg" width="1136" height="884" alt="' +
    esc(es ? 'ORBITAL NEXUS · Ingeniería más allá de la Tierra: un cohete deja la Tierra rumbo a Marte' : 'ORBITAL NEXUS · Engineering Beyond Earth: a rocket leaves Earth for Mars') + '"></div></div>' +
    visionPanel() +
    '<div class="splash-sec"><h2>' + esc(es ? 'Elige tu nivel' : 'Choose your level') + '</h2>' +
    '<div class="diffs" role="group" aria-label="' + esc(es ? 'Dificultad' : 'Difficulty') + '">' + dh + '</div>' +
    '<p class="splash-note">' + esc(es ? 'Tu progreso se guarda solo: puedes dejar la misión en un descanso y retomarla después. Atajos: Enter avanza, 1–4 responde a una anomalía.'
      : 'Progress saves itself: leave the mission during a break and pick it up later. Shortcuts: Enter advances, 1–4 answers an anomaly.') + '</p></div>' +
    teamStrip() +
    '<div class="splash-sec"><h2>' + esc(es ? 'Explora los destinos en 3D' : 'Explore the destinations in 3D') + '</h2>' +
    '<p>' + esc(es ? 'Toca un destino para ver su trayectoria, cada fase del ciclo de vida de una misión (al estilo de CubeSat 101) y probarla con un visor de realidad virtual tipo Cardboard.'
      : 'Tap a destination to see its trajectory, every phase of a mission lifecycle (CubeSat 101 style), and try it in a Cardboard-style VR viewer.') + '</p>' +
    '<div class="gallery">' + gal + '</div></div>' +
    '<div class="splash-sec"><h2>' + esc(es ? 'Minijuego nuevo' : 'New mini game') + '</h2>' + droneBtn('wide drone-cta') + '</div>' +
    '<div class="feat">' + fh + '</div>' +
    '<div class="shelf"><h2>' + esc(es ? 'Insignias' : 'Badges') + ' <span>' + shelf.count + '/' + shelf.total + '</span></h2>' +
    '<div class="badges">' + shelf.html + '</div></div></div>';
}

/* where each phase sits in the NASA picture: mission segment, JPL Concept
   Maturity Level and the matching Mission Design Lab study type */
var PHASE_META = {
  1: { seg: 'user', cml: { es: 'CML 1–2 · Idea y viabilidad', en: 'CML 1–2 · Idea and feasibility' }, mdl: { es: 'MDL · Lluvia de ideas', en: 'MDL · Office hours' } },
  2: { seg: 'space', cml: { es: 'CML 3 · Espacio de compensaciones', en: 'CML 3 · Trade space' }, mdl: { es: 'MDL · Estudio de compensaciones', en: 'MDL · Trade study' } },
  3: { seg: 'space', cml: { es: 'CML 3 · Espacio de compensaciones', en: 'CML 3 · Trade space' }, mdl: { es: 'MDL · Estudio de compensaciones', en: 'MDL · Trade study' } },
  4: { seg: 'ground', cml: { es: 'CML 3 · Espacio de compensaciones', en: 'CML 3 · Trade space' }, mdl: { es: 'MDL · Estudio de compensaciones', en: 'MDL · Trade study' } },
  5: { seg: 'launch', cml: { es: 'CML 4 · Diseño de punto', en: 'CML 4 · Point design' }, mdl: { es: 'MDL · Diseño por puntos', en: 'MDL · Point design' } },
  6: { seg: 'ops', cml: { es: 'Implementación · operaciones', en: 'Implementation · operations' }, mdl: null }
};
var SEG_NAME = {
  user: { es: 'Segmento de usuarios', en: 'User segment' },
  space: { es: 'Segmento espacial', en: 'Space segment' },
  ground: { es: 'Segmento terrestre', en: 'Ground segment' },
  launch: { es: 'Segmento de lanzamiento', en: 'Launch segment' },
  ops: { es: 'Segmentos terrestre + usuarios', en: 'Ground + user segments' }
};

function head(kick, title, lead) {
  var m = PHASE_META[S.phase], meta = '';
  if (m) meta = '<div class="phase-meta"><span class="pm seg-' + m.seg + '">' + esc(L(SEG_NAME[m.seg])) + '</span>' +
    '<span class="pm">' + esc(L(m.cml)) + '</span>' + (m.mdl ? '<span class="pm">' + esc(L(m.mdl)) + '</span>' : '') +
    '<span class="pm diff-' + S.diff + '">' + esc(L(DIFF[S.diff].name)) + '</span></div>';
  var hc = CACHE || comp();
  return '<div class="phase-head">' + (hc.dest ? '<div class="phase-art" aria-hidden="true">' + destArt(hc.dest.id, 'art') + '</div>' : '') +
    '<div class="phase-ic">' + icon(PHASE_ICON[S.phase], 'ico') + '</div><div class="phase-txt">' +
    '<div class="phase-kicker">' + esc(t(kick)) + '</div>' +
    '<div class="phase-prog" aria-hidden="true"><i style="width:' + n0(Math.min(6, S.phase) / 6 * 100) + '%"></i></div>' +
    '<h1>' + esc(t(title)) + '</h1><p>' + esc(t(lead)) + '</p>' + meta + '</div></div>' + coachPanel(CACHE || comp());
}

function specs(arr) {
  var h = '<div class="specs">';
  for (var i = 0; i < arr.length; i++) h += '<span class="spec">' + arr[i] + '</span>';
  return h + '</div>';
}

function cardArt(o) {
  if (o.k === 'destId') return destArt(o.v, 'card-art art-big');
  var ic = null;
  if (o.k === 'programId') ic = ART_MAP.programs[o.v];
  else if (o.k === 'busId') ic = ART_MAP.buses[o.v];
  else if (o.k === 'propId') ic = o.v;
  else if (o.k === 'edlId') ic = 'chute';
  else if (o.k === 'bandId') ic = 'band';
  else if (o.k === 'groundId') ic = 'dish';
  else if (o.k === 'shieldingId') ic = 'shield';
  else if (o.k === 'launcherId') ic = 'rocket';
  else if (o.act === 'instr') { var it = DATA.find(DATA.instruments, o.v); ic = it ? it.tags[0] : null; }
  return ic ? '<span class="card-art card-ic ic-' + esc(o.k || o.act) + '">' + icon(ic, 'ico') + '</span>' : '';
}

function card(o) {
  var art = cardArt(o);
  return '<button class="card' + (o.on ? ' on' : '') + (o.locked ? ' locked' : '') + (art ? ' has-art' : '') + (o.k === 'destId' ? ' dest' : '') + '"' +
    (o.locked ? ' disabled' : '') + ' data-act="' + o.act + '" data-k="' + (o.k || '') + '" data-v="' + o.v + '">' + art +
    '<span class="card-main">' +
    (o.rec ? '<span class="rec">★ ' + esc(LANG === 'es' ? 'Recomendado' : 'Recommended') + '</span>' : '') +
    (o.tag || o.badge ? '<span class="card-tags">' + (o.tag ? '<span class="card-tag">' + esc(o.tag) + '</span>' : '') +
      (o.badge ? '<span class="lvl lvl-' + o.badge.id + '">' + esc(LANG === 'es' ? o.badge.es : o.badge.en) + '</span>' : '') + '</span>' : '') +
    '<span class="card-name">' + esc(o.name) + '</span>' +
    (o.desc ? '<p class="card-desc">' + esc(o.desc) + '</p>' : '') +
    (o.specs ? specs(o.specs) : '') +
    (o.extra || '') +
    (o.lock ? '<div class="lock-note">' + esc(o.lock) + '</div>' : '') +
    '</span></button>';
}

function explorerBtn(c, cls) {
  if (!c || !c.dest) return '';
  return '<button class="btn x-open ' + (cls || '') + '" data-act="explore">' + icon('orbit3d', 'ico') +
    '<span><b>' + esc(LANG === 'es' ? 'Explorador 3D de la misión' : '3D mission explorer') + '</b><small>' +
    esc(LANG === 'es' ? 'Trayectoria, cronograma y modo RV' : 'Trajectory, timeline and VR mode') + '</small></span></button>';
}

function slider(k, label, val, min, max, step, unit, hint) {
  return '<div class="ctrl"><div class="ctrl-top"><label>' + esc(label) + '</label>' +
    '<output>' + (Math.round(val * 100) / 100) + ' ' + esc(unit) + '</output></div>' +
    '<input type="range" data-k="' + k + '" data-unit="' + esc(unit) + '" min="' + min + '" max="' + max + '" step="' + step + '" value="' + val + '">' +
    (hint ? '<div class="hint">' + esc(hint) + '</div>' : '') + '</div>';
}

function rows(list) {
  var h = '<div class="rows">';
  for (var i = 0; i < list.length; i++)
    h += '<div class="row' + (list[i][2] ? ' total' : '') + '"><span>' + esc(list[i][0]) + '</span><b>' + list[i][1] + '</b></div>';
  return h + '</div>';
}

function alerts(c) {
  var h = '';
  for (var i = 0; i < c.viol.length; i++) h += '<div class="alert bad"><span class="alert-icon">✕</span><span>' + esc(L(c.viol[i])) + '</span></div>';
  for (i = 0; i < c.warn.length; i++) h += '<div class="alert warn"><span class="alert-icon">!</span><span>' + esc(L(c.warn[i])) + '</span></div>';
  if (!h) h = '<div class="alert ok"><span class="alert-icon">✓</span><span>' +
    esc(LANG === 'es' ? 'Sin violaciones de diseño en esta fase.' : 'No design violations in this phase.') + '</span></div>';
  return h;
}

/* ---------------------------------------------------------------- *
 * phase 1 — mission                                                *
 * ---------------------------------------------------------------- */
function viewMission(c) {
  var h = head('p1_kick', 'p1_title', 'p1_lead') + '<div class="cols"><div>' + presetPanel();

  h += '<div class="panel"><h2>' + esc(t('program')) + '</h2><div class="grid c2">';
  for (var i = 0; i < DATA.programs.length; i++) {
    var p = DATA.programs[i];
    h += card({
      act: 'pick', k: 'programId', v: p.id, on: S.programId === p.id,
      tag: L(p.tag), name: L(p.name), desc: L(p.desc),
      specs: ['<b>' + money(p.budget) + '</b> ' + (LANG === 'es' ? 'presupuesto' : 'budget'),
      '<b>' + p.devNominal + '</b> ' + t('u_mo')]
    });
  }
  h += '</div></div>';

  h += '<div class="panel"><h2>' + esc(t('destination')) + '</h2><div class="grid c2">';
  for (i = 0; i < DATA.destinations.length; i++) {
    var d = DATA.destinations[i];
    var locked = !S.programId || DATA.find(DATA.programs, S.programId).rank < d.minProgram;
    h += card({
      act: 'pick', k: 'destId', v: d.id, on: S.destId === d.id, locked: locked,
      tag: L(d.tag), badge: destLevel(d), name: L(d.name), desc: L(d.blurb),
      specs: ['Δv <b>' + n2(d.dv) + '</b> km/s',
      (LANG === 'es' ? 'crucero' : 'cruise') + ' <b>' + d.cruiseDays + '</b> d',
      (LANG === 'es' ? 'enlace' : 'link') + ' <b>' + (d.commAu < 0.02 ? n0(d.commAu * AU_M / 1000) + ' km' : n1(d.commAu) + ' UA') + '</b>',
      (LANG === 'es' ? 'sol' : 'sun') + ' <b>' + n2(d.solarAu) + '</b> UA',
      (LANG === 'es' ? 'radiación' : 'radiation') + ' <b>' + d.radKrad + '</b> krad',
      '<b>' + d.opsTurns + '</b> ' + (LANG === 'es' ? 'turnos' : 'turns')],
      lock: locked ? t('min_class') + ': ' + L(DATA.programs[d.minProgram].name) : null
    });
  }
  h += '</div></div></div><div class="side">' + statusPanel(c);

  if (c.dest) {
    h += '<div class="panel dest-hero">' + destArt(c.dest.id, 'art hero-art') + '<div><span class="card-tag">' + esc(L(c.dest.tag)) + '</span><b>' + esc(L(c.dest.name)) + '</b></div>' + explorerBtn(c, 'wide') + '</div>';
    h += '<div class="panel"><h2>' + esc(t('objectives')) + '</h2><p class="hint" style="margin:-6px 0 12px">' + esc(t('obj_hint')) + '</p>';
    for (i = 0; i < c.dest.objectives.length; i++) {
      var o = c.dest.objectives[i];
      var names = [];
      for (var j = 0; j < o.instr.length; j++) names.push(tagName(o.instr[j]));
      h += '<div class="obj unmet"><div class="obj-top"><span class="obj-name">' + esc(L(o.name)) + '</span>' +
        '<span class="obj-val">' + o.value + ' ' + esc(t('science_value')) + '</span></div>' +
        '<div class="obj-need">' + esc(t('needs_instr')) + ': ' + esc(names.join(' + ')) + ' · ' +
        esc(t('data_needed')) + ' ' + gb(o.dataGb) + '</div></div>';
    }
    h += '<h3>' + esc(t('env')) + '</h3>' + rows([
      [LANG === 'es' ? 'Energía de lanzamiento' : 'Launch energy', esc(L(DATA.c3Labels[c.dest.c3]))],
      [LANG === 'es' ? 'Entorno térmico' : 'Thermal environment', esc(L(DATA.thermalLabels[c.dest.thermal]))],
      [LANG === 'es' ? 'Fracción en eclipse' : 'Eclipse fraction', n0(c.dest.eclipse * 100) + '%'],
      [LANG === 'es' ? 'Potencia solar relativa' : 'Relative solar power', n0(100 / (c.dest.solarAu * c.dest.solarAu)) + '%'],
      [LANG === 'es' ? 'Dosis total' : 'Total dose', c.dest.radKrad + ' krad']
    ]) + '</div>';
  }
  return h + '</div></div>';
}

function tagName(tag) {
  for (var i = 0; i < DATA.instruments.length; i++)
    if (DATA.instruments[i].tags.indexOf(tag) >= 0) {
      var nm = L(DATA.instruments[i].name);
      if (tag === 'cam') return LANG === 'es' ? 'cámara' : 'camera';
      if (tag === 'spec_vnir') return LANG === 'es' ? 'espectrómetro VIS/NIR' : 'VIS/NIR spectrometer';
      if (tag === 'spec_uv') return LANG === 'es' ? 'espectrógrafo UV' : 'UV spectrograph';
      if (tag === 'tir') return LANG === 'es' ? 'radiómetro térmico' : 'thermal radiometer';
      return nm;
    }
  return tag;
}

/* ---------------------------------------------------------------- *
 * phase 2 — platform                                               *
 * ---------------------------------------------------------------- */
function viewPlatform(c) {
  var h = head('p2_kick', 'p2_title', 'p2_lead') + '<div class="cols"><div>' + kitPanel(c) + guideBox(2);
  var rec = recommend(c);

  h += '<div class="panel"><h2>' + esc(t('bus')) + '</h2><div class="grid c2">';
  for (var i = 0; i < DATA.buses.length; i++) {
    var b = DATA.buses[i];
    h += card({
      act: 'pick', k: 'busId', v: b.id, on: S.busId === b.id, rec: rec.bus === b.id,
      name: L(b.name), desc: L(b.desc),
      specs: [(LANG === 'es' ? 'seco' : 'dry') + ' <b>' + b.dryMass + '</b> kg',
      (LANG === 'es' ? 'carga' : 'payload') + ' <b>' + b.payloadMax + '</b> kg',
      (LANG === 'es' ? 'paneles' : 'arrays') + ' ≤<b>' + b.arrayMax + '</b> m²',
      (LANG === 'es' ? 'antena' : 'antenna') + ' ≤<b>' + b.antennaMax + '</b> m',
      (LANG === 'es' ? 'tanques' : 'tanks') + ' ≤<b>' + b.propMax + '</b> kg',
      (LANG === 'es' ? 'memoria' : 'memory') + ' <b>' + b.storeGb + '</b> Gb',
      '<b>' + money(b.cost) + '</b>'],
      extra: impactOf('busId', b.id)
    });
  }
  h += '</div></div>';

  /* power */
  h += '<div class="panel"><h2>' + esc(t('power_src')) + '</h2><div class="pills">';
  var rtgLock = !c.bus || !c.bus.allowsRTG || !c.prog || c.prog.rank < DATA.power.rtg.minProgram;
  h += '<button class="pill' + (S.powerType === 'solar' ? ' on' : '') + '" data-act="pick" data-k="powerType" data-v="solar">' + icon('solar', 'ico') + esc(t('solar')) + '</button>';
  h += '<button class="pill' + (S.powerType === 'rtg' ? ' on' : '') + (rtgLock ? ' locked' : '') + '"' + (rtgLock ? ' disabled' : '') +
    ' data-act="pick" data-k="powerType" data-v="rtg">' + icon('rtg', 'ico') + esc(t('rtg')) + '</button>';
  h += '</div>';

  if (S.powerType === 'solar') {
    var amax = c.bus ? c.bus.arrayMax : 10;
    h += slider('arrayArea', t('array_area'), S.arrayArea, 0, amax, amax > 20 ? 1 : 0.2, 'm²',
      (LANG === 'es' ? 'A ' : 'At ') + n2(c.dest ? c.dest.solarAu : 1) + ' UA ' +
      (LANG === 'es' ? 'cada m² entrega ' : 'each m² delivers ') +
      n0(ENG.solarPower(1, c.dest ? c.dest.solarAu : 1, 0)) + ' W ' +
      (LANG === 'es' ? 'al inicio y ' : 'at start and ') +
      n0(ENG.solarPower(1, c.dest ? c.dest.solarAu : 1, c.years)) + ' W ' +
      (LANG === 'es' ? 'al final de la misión.' : 'at end of mission.'));
  } else {
    h += slider('rtgUnits', t('rtg_units'), S.rtgUnits, 0, 4, 1, 'MMRTG',
      (LANG === 'es' ? '110 W y 45 kg por unidad, independiente de la distancia al Sol. ' + money(DATA.power.rtg.costPerUnit) + ' cada uno.'
        : '110 W and 45 kg per unit, independent of distance from the Sun. ' + money(DATA.power.rtg.costPerUnit) + ' each.'));
  }
  var bmax = c.bus ? c.bus.batteryMax : 3000;
  h += slider('batteryWh', t('battery'), S.batteryWh, 0, bmax, bmax > 5000 ? 250 : 50, 'Wh',
    c.battery.eclipseH > 0
      ? (LANG === 'es' ? 'Eclipses de ' + n1(c.battery.eclipseH) + ' h exigen ~' + n0(c.battery.need) + ' Wh.'
        : n1(c.battery.eclipseH) + ' h eclipses demand about ' + n0(c.battery.need) + ' Wh.')
      : (LANG === 'es' ? 'Este destino no tiene eclipses: la batería solo cubre transitorios.'
        : 'This destination has no eclipses: the battery only covers transients.'));
  h += '</div>';

  /* propulsion */
  h += '<div class="panel"><h2>' + esc(t('propulsion')) + '</h2><div class="grid c2">';
  for (i = 0; i < DATA.propulsion.length; i++) {
    var p = DATA.propulsion[i];
    var lock = !c.bus || p.minRank > c.bus.rank;
    h += card({
      act: 'pick', k: 'propId', v: p.id, on: S.propId === p.id, locked: lock, rec: !lock && rec.prop === p.id,
      name: L(p.name), desc: L(p.desc),
      specs: ['Isp <b>' + p.isp + '</b> s', (LANG === 'es' ? 'seco' : 'dry') + ' <b>' + p.dryBase + '</b> kg+' + n0(p.dryFrac * 100) + '%',
      p.powerW ? '<b>' + p.powerW + '</b> W' : ''],
      extra: lock ? '' : impactOf('propId', p.id),
      lock: lock ? (LANG === 'es' ? 'Necesita un bus mayor' : 'Needs a larger bus') : null
    });
  }
  h += '</div>';
  var pmax = c.bus ? c.bus.propMax : 100;
  h += slider('propellantKg', t('propellant'), S.propellantKg, 0, pmax, pmax > 500 ? 10 : 1, 'kg',
    c.prop ? (LANG === 'es' ? 'Δv disponible ' + n2(c.dv.available) + ' km/s frente a ' + n2(c.dv.required) + ' km/s requeridos (inserción + mantenimiento de órbita durante ' + c.opsTurns + ' turnos).'
      : 'Δv available ' + n2(c.dv.available) + ' km/s against ' + n2(c.dv.required) + ' km/s required (insertion + station keeping over ' + c.opsTurns + ' turns).') : '');
  h += '</div>';

  if (c.dest && c.dest.lander) {
    h += '<div class="panel"><h2>' + esc(LANG === 'es' ? 'Entrada, descenso y aterrizaje' : 'Entry, descent and landing') + '</h2><div class="grid c3">';
    for (i = 0; i < DATA.edl.length; i++) {
      var e = DATA.edl[i];
      h += card({
        act: 'pick', k: 'edlId', v: e.id, on: S.edlId === e.id,
        name: L(e.name), desc: L(e.desc),
        specs: ['+<b>' + n0(e.massFrac * 100) + '%</b> ' + (LANG === 'es' ? 'de masa' : 'mass'),
        '<b>' + n0(e.success * 100) + '%</b> ' + (LANG === 'es' ? 'éxito' : 'success'), '<b>' + money(e.cost) + '</b>'],
        extra: impactOf('edlId', e.id)
      });
    }
    h += '</div></div>';
  }

  h += '</div><div class="side">' + statusPanel(c) + shipPanel(c) + '<div class="panel"><h2>' + esc(LANG === 'es' ? 'Presupuestos' : 'Budgets') + '</h2>';
  h += rows([
    [LANG === 'es' ? 'Masa seca' : 'Dry mass', n0(c.mass.dry) + ' kg'],
    [LANG === 'es' ? '· bus' : '· bus', n0(c.mass.bus) + ' kg'],
    [LANG === 'es' ? '· energía' : '· power', n0(c.mass.power) + ' kg'],
    [LANG === 'es' ? '· propulsión' : '· propulsion', n0(c.mass.propDry) + ' kg'],
    [LANG === 'es' ? '· aterrizaje' : '· landing', n0(c.mass.edl) + ' kg'],
    [LANG === 'es' ? 'Propelente' : 'Propellant', n0(c.mass.propellant) + ' kg'],
    [LANG === 'es' ? 'Masa de lanzamiento' : 'Launch mass', n0(c.mass.launch) + ' kg', true]
  ]);
  h += '<h3>' + esc(LANG === 'es' ? 'Potencia' : 'Power') + '</h3>' + rows([
    [LANG === 'es' ? 'Generada (inicio)' : 'Generated (start)', n0(c.power.genBOL) + ' W'],
    [LANG === 'es' ? 'Generada (fin de vida)' : 'Generated (end of life)', n0(c.power.genEOL) + ' W'],
    [LANG === 'es' ? 'Bus + calefactores' : 'Bus + heaters', n0(c.power.overhead) + ' W'],
    [LANG === 'es' ? 'Margen' : 'Margin', n0(c.power.genEOL - c.power.overhead) + ' W', true]
  ]);
  h += '<h3>' + esc(LANG === 'es' ? 'Revisión de diseño' : 'Design review') + '</h3>' + alerts(c) + '</div></div></div>';
  return h;
}

/* ---------------------------------------------------------------- *
 * phase 3 — science payload                                         *
 * ---------------------------------------------------------------- */
function viewScience(c) {
  var h = head('p3_kick', 'p3_title', 'p3_lead') + '<div class="cols"><div>' + sciencePanel(c) + guideBox(3);
  h += '<div class="panel"><h2>' + esc(t('payload')) + '</h2><div class="grid c2">';
  for (var i = 0; i < DATA.instruments.length; i++) {
    var it = DATA.instruments[i];
    var lock = false, lockMsg = null;
    if (it.landerOnly && c.dest && !c.dest.lander) { lock = true; lockMsg = t('lander_only'); }
    if (it.minBusRank != null && c.bus && c.bus.rank < it.minBusRank) { lock = true; lockMsg = LANG === 'es' ? 'Requiere un bus mayor' : 'Requires a larger bus'; }
    var useful = false;
    if (c.dest) for (var j = 0; j < c.dest.objectives.length; j++)
      for (var k = 0; k < c.dest.objectives[j].instr.length; k++)
        if (it.tags.indexOf(c.dest.objectives[j].instr[k]) >= 0) useful = true;
    h += card({
      act: 'instr', v: it.id, on: S.instruments.indexOf(it.id) >= 0, locked: lock,
      tag: useful ? (LANG === 'es' ? 'Útil aquí' : 'Useful here') : (LANG === 'es' ? 'Sin objetivo aquí' : 'No objective here'),
      name: L(it.name), desc: L(it.desc),
      specs: ['<b>' + it.mass + '</b> kg', '<b>' + it.powerW + '</b> W',
      '<b>' + gb(it.dataGb) + '</b>/' + (LANG === 'es' ? 'turno' : 'turn'),
      '<b>' + money(it.cost) + '</b>',
      (LANG === 'es' ? 'riesgo' : 'risk') + ' <b>' + (LANG === 'es' ? ['—', 'bajo', 'medio', 'alto'] : ['—', 'low', 'medium', 'high'])[it.risk] + '</b>'],
      extra: lock ? '' : impactInstr(it.id),
      lock: lockMsg
    });
  }
  h += '</div></div></div><div class="side">' + statusPanel(c) + shipPanel(c) + '<div class="panel"><h2>' + esc(t('obj_coverage')) + '</h2>';
  for (i = 0; i < c.coverage.length; i++) {
    var cv = c.coverage[i];
    var cls = cv.full ? 'met' : (cv.have > 0 ? 'partial' : 'unmet');
    h += '<div class="obj ' + cls + '"><div class="obj-top"><span class="obj-name">' + esc(L(cv.obj.name)) + '</span>' +
      '<span class="obj-val">' + cv.obj.value + ' ' + esc(t('science_value')) + '</span></div>' +
      '<div class="obj-need">' + (cv.have >= cv.need ? esc(t('covered')) : cv.have + '/' + cv.need + ' · ' + esc(t('not_covered'))) +
      ' · ' + gb(cv.obj.dataGb) + '</div></div>';
  }
  h += '<h3>' + esc(LANG === 'es' ? 'Carga útil' : 'Payload') + '</h3>' + rows([
    [LANG === 'es' ? 'Masa' : 'Mass', n0(c.mass.payload) + ' / ' + (c.bus ? c.bus.payloadMax : '—') + ' kg'],
    [LANG === 'es' ? 'Potencia' : 'Power', n0(c.power.payloadW) + ' W'],
    [LANG === 'es' ? 'Datos a pleno régimen' : 'Data at full duty', gb(c.link.collectGbPerTurn) + '/' + (LANG === 'es' ? 'turno' : 'turn')],
    [LANG === 'es' ? 'Costo' : 'Cost', money(c.cost.payload), true]
  ]);
  h += '<h3>' + esc(LANG === 'es' ? 'Revisión de diseño' : 'Design review') + '</h3>' + alerts(c) + '</div></div></div>';
  return h;
}

/* ---------------------------------------------------------------- *
 * phase 4 — link and survival                                       *
 * ---------------------------------------------------------------- */
function viewLink(c) {
  var h = head('p4_kick', 'p4_title', 'p4_lead') + '<div class="cols"><div>' + linkPanel(c) + guideBox(4);

  h += '<div class="panel"><h2>' + esc(t('antenna')) + '</h2><div class="pills">';
  for (var i = 0; i < DATA.antennas.length; i++) {
    var d = DATA.antennas[i];
    var lock = c.bus && d > c.bus.antennaMax;
    h += '<button class="pill' + (S.antennaD === d ? ' on' : '') + (lock ? ' locked' : '') + '"' + (lock ? ' disabled' : '') +
      ' data-act="pick" data-k="antennaD" data-v="' + d + '">' + icon('dish', 'ico') + d + ' m · ' + n0(DATA.antennaMass(d)) + ' kg · ' + money(DATA.antennaCost(d)) + '</button>';
  }
  h += '</div><div class="hint">' + esc(LANG === 'es'
    ? 'La ganancia crece con el cuadrado del diámetro: duplicar la antena cuadruplica la tasa de datos, pero la masa también se cuadruplica.'
    : 'Gain grows with the square of diameter: doubling the antenna quadruples data rate, but mass quadruples too.') + '</div>';

  h += '<h3>' + esc(t('band')) + '</h3><div class="grid c3">';
  for (i = 0; i < DATA.bands.length; i++) {
    var b = DATA.bands[i];
    h += card({
      act: 'pick', k: 'bandId', v: b.id, on: S.bandId === b.id,
      name: L(b.name), desc: L(b.desc),
      specs: ['<b>' + b.ghz + '</b> GHz', '+<b>' + b.extraMass + '</b> kg', '+<b>' + money(b.extraCost) + '</b>'],
      extra: impactOf('bandId', b.id)
    });
  }
  h += '</div>';

  h += '<h3>' + esc(t('twta')) + '</h3><div class="pills">';
  for (i = 0; i < DATA.twtas.length; i++) {
    var w = DATA.twtas[i];
    h += '<button class="pill' + (S.twtaW === w ? ' on' : '') + '" data-act="pick" data-k="twtaW" data-v="' + w + '">' + icon('twta', 'ico') +
      w + ' W RF · ' + n0(DATA.twtaDC(w)) + ' W DC · ' + n0(DATA.twtaMass(w)) + ' kg</button>';
  }
  h += '</div></div>';

  h += '<div class="panel"><h2>' + esc(t('ground')) + '</h2><div class="grid c3">';
  for (i = 0; i < DATA.grounds.length; i++) {
    var g = DATA.grounds[i];
    h += card({
      act: 'pick', k: 'groundId', v: g.id, on: S.groundId === g.id,
      name: L(g.name), desc: L(g.desc),
      specs: ['<b>' + g.dia + '</b> m', '<b>' + n0(g.maxHoursPerTurn) + '</b> h/' + (LANG === 'es' ? 'turno' : 'turn'),
      '<b>' + money(g.costPerTurn) + '</b>/' + (LANG === 'es' ? 'turno' : 'turn')],
      extra: impactOf('groundId', g.id)
    });
  }
  h += '</div></div>';

  h += '<div class="panel"><h2>' + esc(t('shielding')) + '</h2><div class="grid c2">';
  for (i = 0; i < DATA.shielding.length; i++) {
    var s = DATA.shielding[i];
    h += card({
      act: 'pick', k: 'shieldingId', v: s.id, on: S.shieldingId === s.id,
      name: L(s.name), desc: L(s.desc),
      specs: ['+<b>' + n0(s.massFrac * 100) + '%</b> ' + (LANG === 'es' ? 'masa' : 'mass'),
      (LANG === 'es' ? 'tolera' : 'tolerates') + ' <b>' + s.krad + '</b> krad', '<b>' + money(s.cost) + '</b>'],
      extra: impactOf('shieldingId', s.id),
      lock: c.dest && c.dest.radKrad > s.krad ? (LANG === 'es' ? 'Insuficiente para ' + c.dest.radKrad + ' krad' : 'Insufficient for ' + c.dest.radKrad + ' krad') : null
    });
  }
  h += '</div></div>';

  h += staffPanel(c);
  h += '</div><div class="side">' + statusPanel(c) + shipPanel(c) + '<div class="panel"><h2>' + esc(t('link_calc')) + '</h2>' + rows([
    [LANG === 'es' ? 'Distancia de diseño' : 'Design distance', c.dest ? (c.dest.commAu < 0.02 ? n0(c.dest.commAu * AU_M / 1000) + ' km' : n2(c.dest.commAu) + ' UA') : '—'],
    [LANG === 'es' ? 'Tasa de bajada' : 'Downlink rate', bps(c.link.bps)],
    [LANG === 'es' ? 'Horas de contacto' : 'Contact hours', n0(c.link.hours) + ' h/' + (LANG === 'es' ? 'turno' : 'turn')],
    [LANG === 'es' ? 'Capacidad por turno' : 'Capacity per turn', gb(c.link.gbPerTurn)],
    [LANG === 'es' ? 'Generación de datos' : 'Data production', gb(c.link.collectGbPerTurn) + '/' + (LANG === 'es' ? 'turno' : 'turn')],
    [LANG === 'es' ? 'Cobertura del enlace' : 'Link coverage', n0(c.link.ratio * 100) + '%', true]
  ]);
  h += '<h3>' + esc(LANG === 'es' ? 'Masa y costo del enlace' : 'Link mass and cost') + '</h3>' + rows([
    [LANG === 'es' ? 'Masa de comunicaciones' : 'Comms mass', n0(c.mass.comms) + ' kg'],
    [LANG === 'es' ? 'Consumo DC del TWTA' : 'TWTA DC draw', n0(c.power.twtaDC) + ' W'],
    [LANG === 'es' ? 'Blindaje' : 'Shielding', n0(c.mass.shield) + ' kg'],
    [LANG === 'es' ? 'Costo' : 'Cost', money(c.cost.comms + c.cost.shield + c.cost.ops), true]
  ]);
  h += '<h3>' + esc(LANG === 'es' ? 'Revisión de diseño' : 'Design review') + '</h3>' + alerts(c) + '</div></div></div>';
  return h;
}

/* ---------------------------------------------------------------- *
 * phase 5 — launch                                                  *
 * ---------------------------------------------------------------- */
function viewLaunch(c) {
  var h = head('p5_kick', 'p5_title', 'p5_lead') + '<div class="cols"><div>' + launchPanel(c) + guideBox(5);
  var rec = recommend(c);
  h += '<div class="panel"><h2>' + esc(t('launcher')) + '</h2><div class="grid c2">';
  for (var i = 0; i < DATA.launchers.length; i++) {
    var lv = DATA.launchers[i];
    var cap = c.dest ? (lv.cap[c.dest.c3] || 0) : 0;
    var lock = cap <= 0 || (lv.onlyDest && c.dest && lv.onlyDest.indexOf(c.dest.id) < 0) ||
      (lv.minProgram != null && c.prog && c.prog.rank < lv.minProgram);
    var lockMsg = null;
    if (cap <= 0) lockMsg = LANG === 'es' ? 'No alcanza esa energía' : 'Cannot reach that energy';
    else if (lv.onlyDest && c.dest && lv.onlyDest.indexOf(c.dest.id) < 0) lockMsg = LANG === 'es' ? 'Órbita fija incompatible' : 'Fixed orbit incompatible';
    else if (lv.minProgram != null && c.prog && c.prog.rank < lv.minProgram) lockMsg = LANG === 'es' ? 'Fuera de esta clase de programa' : 'Outside this program class';
    h += card({
      act: 'pick', k: 'launcherId', v: lv.id, on: S.launcherId === lv.id, locked: lock, rec: !lock && rec.lv === lv.id,
      name: L(lv.name), desc: L(lv.desc),
      specs: ['<b>' + n0(cap) + '</b> kg ' + (LANG === 'es' ? 'al destino' : 'to target'),
      (LANG === 'es' ? 'fiabilidad' : 'reliability') + ' <b>' + n1(lv.reliability * 100) + '%</b>',
      (LANG === 'es' ? 'cofre' : 'fairing') + ' <b>' + lv.fairing + '</b> m',
      '<b>' + money(lv.cost) + '</b>'],
      extra: lock ? '' : impactOf('launcherId', lv.id),
      lock: lockMsg
    });
  }
  h += '</div></div>';

  h += '<div class="panel"><h2>' + esc(t('dev_time')) + '</h2>';
  h += slider('devMonths', t('dev_time'), c.devMonths, 18, 132, 1, t('u_mo'),
    (LANG === 'es' ? 'Complejidad del diseño ' + n1(c.complexity) + ' → desarrollo recomendado ' + c.devNeed + ' meses. Cada mes cuesta ' + money(c.prog ? c.prog.burnPerMonth : 0) + '.'
      : 'Design complexity ' + n1(c.complexity) + ' → recommended development ' + c.devNeed + ' months. Each month costs ' + money(c.prog ? c.prog.burnPerMonth : 0) + '.'));
  var od = ENG.successOdds(c);
  h += rows([
    [LANG === 'es' ? 'Éxito del lanzamiento' : 'Launch success', n1(od.launch * 100) + '%'],
    [LANG === 'es' ? 'Puesta en servicio' : 'Commissioning', n1(od.commission * 100) + '%'],
    (c.dest && c.dest.lander ? [LANG === 'es' ? 'Aterrizaje' : 'Landing', n1(od.edl * 100) + '%'] : null),
    [LANG === 'es' ? 'Probabilidad total de operar' : 'Overall chance of operating', n1(od.total * 100) + '%', true]
  ].filter(function (x) { return x; }));
  h += readinessPreview(c);
  h += '</div></div><div class="side">' + statusPanel(c) + shipPanel(c) + '<div class="panel">' + explorerBtn(c, 'wide') + practiceBtn('wide') + shareBtn('wide') + '</div><div class="panel"><h2>' + esc(LANG === 'es' ? 'Hoja de datos final' : 'Final data sheet') + '</h2>';
  h += rows([
    [LANG === 'es' ? 'Masa de lanzamiento' : 'Launch mass', n0(c.mass.launch) + ' kg'],
    [LANG === 'es' ? 'Capacidad del cohete' : 'Rocket capability', n0(c.lvCap) + ' kg'],
    [LANG === 'es' ? 'Margen de masa' : 'Mass margin', n0(c.lvCap - c.mass.launch) + ' kg'],
    [LANG === 'es' ? 'Margen de potencia' : 'Power margin', n0(c.power.marginPct * 100) + '%'],
    [LANG === 'es' ? 'Margen de Δv' : 'Δv margin', n0(c.dv.margin * 1000) + ' m/s'],
    [LANG === 'es' ? 'Duración total' : 'Total duration', n1(c.years) + ' ' + (LANG === 'es' ? 'años' : 'years')],
    [LANG === 'es' ? 'Costo total' : 'Total cost', money(c.cost.total)],
    [LANG === 'es' ? 'Reserva' : 'Reserve', money(c.cost.margin), true]
  ]);
  h += '<h3>' + esc(LANG === 'es' ? 'Desglose de costo' : 'Cost breakdown') + '</h3>' + rows([
    [LANG === 'es' ? 'Bus' : 'Bus', money(c.cost.bus)],
    [LANG === 'es' ? 'Instrumentos' : 'Instruments', money(c.cost.payload)],
    [LANG === 'es' ? 'Energía' : 'Power', money(c.cost.power)],
    [LANG === 'es' ? 'Comunicaciones' : 'Comms', money(c.cost.comms)],
    [LANG === 'es' ? 'Propulsión' : 'Propulsion', money(c.cost.prop)],
    [LANG === 'es' ? 'Blindaje y aterrizaje' : 'Shielding and landing', money(c.cost.shield + c.cost.edl)],
    [LANG === 'es' ? 'Lanzador' : 'Launcher', money(c.cost.launcher)],
    [LANG === 'es' ? 'Desarrollo' : 'Development', money(c.cost.dev)],
    [LANG === 'es' ? 'Operaciones (incluye equipo en tierra)' : 'Operations (incl. ground team)', money(c.cost.ops)]
  ]);
  h += '<h3>' + esc(LANG === 'es' ? 'Revisión de diseño' : 'Design review') + '</h3>' + alerts(c) + '</div></div></div>';
  return h;
}

/* ---------------------------------------------------------------- *
 * launch resolution                                                 *
 * ---------------------------------------------------------------- */
function doLaunch() {
  var c = comp();
  launchReview(c, function (mode, wx) {
    S.launchMode = mode; S.wxFactor = wx;
    startLaunch(comp(), mode, wx);
  });
}

function startLaunch(c, mode, wx) {
  var od = ENG.successOdds(c);
  var es = LANG === 'es';
  var hwFail = rnd() > od.launch * wx;
  var fail = null, reason = null;
  if (hwFail) { fail = 'launch'; reason = { es: 'El vehículo de lanzamiento falló durante el ascenso.', en: 'The launch vehicle failed during ascent.' }; }
  else if (rnd() > od.commission) {
    fail = 'commission';
    reason = c.readiness < 0.9
      ? { es: 'La nave nunca completó la puesta en servicio: un defecto que una campaña de pruebas más larga habría encontrado.', en: 'The spacecraft never completed commissioning: a defect a longer test campaign would have caught.' }
      : { es: 'Una falla de la plataforma durante la puesta en servicio dejó la nave sin control.', en: 'A platform failure during commissioning left the spacecraft uncontrolled.' };
  }
  if (wx < 1 && hwFail) reason = { es: 'El vehículo falló durante el ascenso. Se lanzó con condiciones meteorológicas en NO-GO.', en: 'The vehicle failed during ascent. It launched with a weather NO-GO.' };

  if (mode === 'pilot') {
    ascentRun({ payloadKg: c.mass.launch, hwFail: hwFail, lv: L(c.lv.name), cadet: S.diff === 'cadet' }, function (res) {
      S.ascent = res;
      if (!res.ok) {
        endLaunch(false, res.why === 'hw' ? reason : { es: 'Falla en el ascenso pilotado: ' + (res.text || ''), en: 'Piloted ascent failure: ' + (res.text || '') });
        return;
      }
      award('pilot');
      var root = launchDOM(); root.hidden = false; OVERLAY_OPEN = true;
      if (fail === 'commission') { launchClose(); OVERLAY_OPEN = false; endLaunch(false, reason); return; }
      afterAscent(c, od);
    });
    return;
  }
  launchSequence({ fail: fail, lv: L(c.lv.name), dest: L(c.dest.name), cruise: c.cruiseDays }, function () {
    if (fail) { launchClose(); endLaunch(false, reason); return; }
    afterAscent(c, od);
  });
}

/* cruise navigation (deep space only), then the arrival burn or EDL */
function afterAscent(c, od) {
  award('liftoff');
  if (c.dest.commAu > 0.002) {
    var root = document.getElementById('launch'); if (root) root.hidden = true;
    navGame({ dest: L(c.dest.name), fido: S.staff.fido || 0, dsn70: S.groundId === 'dsn70', lander: c.dest.lander,
      massKg: c.mass.launch, isp: c.prop.isp }, function (nv) {
      S.nav = nv;
      if (nv.ddorCost) S.scrubCost += nv.ddorCost;
      launchDOM().hidden = false; OVERLAY_OPEN = true;
      arrival(c, od);
    });
    return;
  }
  arrival(c, od);
}

function arrival(c, od) {
  var es = LANG === 'es';
  /* arrival: an orbit insertion burn, or the parachute call on a lander.
     Timing changes the propellant bill or the odds of touching down. */
  var lander = c.dest.lander, factor = 1, edlLost = false;
  var nominal = c.mass.launch * (1 - Math.exp(-c.dest.dv * 1000 / (c.prop.isp * G0)));
  var navK = S.nav ? ENG.clamp(1.3 - 0.4 * S.nav.miss, 0.6, 1.3) : 1;
  burnGame({
    kick: lander ? (es ? 'Entrada, descenso y aterrizaje' : 'Entry, descent and landing') : (es ? 'Llegada · ' : 'Arrival · ') + L(c.dest.name),
    title: lander ? (es ? 'Despliega el paracaídas' : 'Deploy the parachute') : (es ? 'Quemado de inserción orbital' : 'Orbit insertion burn'),
    body: (lander
      ? (es ? 'La nave cae a 1,6 km/s por la atmósfera marciana. Abre el paracaídas dentro de la ventana: muy pronto se rompe, muy tarde no frena a tiempo.'
        : 'The spacecraft falls through the Martian atmosphere at 1.6 km/s. Open the chute inside the window: too early it tears, too late it cannot slow you down.')
      : (es ? 'Enciende el motor cuando la aguja cruce la ventana verde. Un quemado fuera de la ventana exige maniobras de corrección y gasta propelente que necesitarás para mantener la órbita.'
        : 'Fire the engine when the needle crosses the green window. A burn outside the window needs correction manoeuvres and spends propellant you will need for station keeping.')) +
      (S.nav ? ' ' + (navK >= 1 ? (es ? 'Tu navegación precisa amplió la ventana.' : 'Your precise navigation widened the window.') : (es ? 'La navegación imprecisa estrechó la ventana.' : 'Imprecise navigation narrowed the window.')) : ''),
    btn: lander ? (es ? 'ABRIR PARACAÍDAS' : 'DEPLOY CHUTE') : (es ? 'ENCENDER MOTOR' : 'FIRE ENGINE'),
    zone: Math.min(0.4, DIFF[S.diff].zone * navK)
  }, function (acc) {
    S.burnAcc = acc;
    if (acc >= 0.9) award('burn');
    if (lander) {
      var navEdl = S.nav ? ENG.clamp((1 - S.nav.miss) * 0.05, -0.08, 0.05) : 0;
      var pEdl = ENG.clamp(od.edl + (acc - 0.6) * 0.12 + navEdl, 0.05, 0.99);
      if (rnd() > pEdl) { edlLost = true; SFX.fail(); return { text: es ? 'Se perdió la señal durante el descenso.' : 'Signal lost during descent.', cls: 'bad' }; }
      award('landed');
      return { text: es ? '¡Contacto con la superficie confirmado!' : 'Touchdown confirmed!', cls: 'ok' };
    }
    factor = 1.12 - 0.15 * acc;
    var delta = nominal * (1 - factor);
    return {
      text: delta >= 0
        ? (es ? 'Ahorraste ' + n0(delta) + ' kg de propelente para mantener la órbita.' : 'You saved ' + n0(delta) + ' kg of propellant for station keeping.')
        : (es ? 'Las correcciones costaron ' + n0(-delta) + ' kg extra de propelente.' : 'Corrections cost an extra ' + n0(-delta) + ' kg of propellant.'),
      cls: delta >= 0 ? 'ok' : 'warn'
    };
  }, function () {
    launchClose(); OVERLAY_OPEN = false;
    if (edlLost) { endLaunch(false, { es: 'La nave se perdió durante la entrada, el descenso y el aterrizaje.', en: 'The spacecraft was lost during entry, descent and landing.' }); return; }
    finishLaunch(c, nominal * factor);
  });
}

function endLaunch(ok, reason) {
  S.launchSuccess = ok;
  S.failReason = reason;
  S.alive = false; S.phase = 7;
  render();
}

function finishLaunch(c, used) {
  S.launchSuccess = true;
  S.failReason = null;
  /* insertion burn, then whatever propellant is left funds station keeping */
  S.propLeft = Math.max(0, c.mass.propellant - used - (S.nav ? S.nav.kg : 0));
  S.budgetLeft = c.cost.margin + DIFF[S.diff].bonus * c.cost.budget - (S.scrubCost || 0);
  if (S.ascent && S.ascent.ok && S.ascent.fuelLeft > 0.08) S.propLeft += c.mass.propellant * Math.min(0.06, S.ascent.fuelLeft * 0.2);
  if (S.ascent && S.ascent.fairingLow) S.arrayHealth *= 0.9;
  for (var i = 0; i < c.instr.length; i++) S.active[c.instr[i].id] = true;
  S.phase = 6;
  logit({ es: 'Lanzamiento nominal. Crucero de ' + c.cruiseDays + ' días completado; la llegada consumió ' + n0(used) + ' kg de propelente.',
          en: 'Nominal launch. ' + c.cruiseDays + ' day cruise completed; arrival consumed ' + n0(used) + ' kg of propellant.' }, 'good');
  if (S.scrubs) logit({ es: 'Lanzamiento tras ' + S.scrubs + ' aplazamiento(s) por condiciones: ' + money(S.scrubCost) + ' de costo de espera.', en: 'Launch after ' + S.scrubs + ' scrub(s) for conditions: ' + money(S.scrubCost) + ' standing-army cost.' }, '');
  if (S.ascent && S.ascent.ok) logit({ es: 'Ascenso pilotado a mano hasta la órbita (Max-Q ' + n1(S.ascent.maxQ / 1000) + ' kPa, combustible sobrante ' + n0(S.ascent.fuelLeft * 100) + '%).', en: 'Ascent hand-flown to orbit (Max-Q ' + n1(S.ascent.maxQ / 1000) + ' kPa, ' + n0(S.ascent.fuelLeft * 100) + '% fuel left).' }, 'good');
  if (S.ascent && S.ascent.fairingLow) logit({ es: 'La cofia se soltó demasiado bajo: el calentamiento dañó 10% de los paneles.', en: 'The fairing was dropped too low: heating damaged 10% of the arrays.' }, 'bad');
  if (S.nav) logit({ es: 'Navegación de crucero: ' + n1(S.nav.dv) + ' m/s en correcciones, error final ' + n0(S.nav.miss * 60) + ' km.', en: 'Cruise navigation: ' + n1(S.nav.dv) + ' m/s in corrections, final miss ' + n0(S.nav.miss * 60) + ' km.' }, S.nav.miss <= 1 ? 'good' : 'bad');
  if (S.burnAcc != null) logit({ es: 'Precisión de la maniobra de llegada: ' + n0(S.burnAcc * 100) + '%.', en: 'Arrival manoeuvre accuracy: ' + n0(S.burnAcc * 100) + '%.' }, S.burnAcc >= 0.7 ? 'good' : '');
  if (DIFF[S.diff].bonus > 0) logit({ es: 'Modo cadete: reserva adicional de ' + money(DIFF[S.diff].bonus * c.cost.budget) + '.', en: 'Cadet mode: extra reserve of ' + money(DIFF[S.diff].bonus * c.cost.budget) + '.' }, 'good');
  render();
}

function logit(msg, cls) { S.log.unshift({ turn: S.turn, msg: msg, cls: cls || '' }); }

/* ---------------------------------------------------------------- *
 * phase 6 — operations                                             *
 * ---------------------------------------------------------------- */
function storedTotal() { var s = 0; for (var k in S.storage) s += S.storage[k]; return s; }
function dlTotal() { var s = 0; for (var k in S.downlinked) s += S.downlinked[k]; return s; }

function viewOps(c) {
  var h = head('p6_kick', 'p6_title', 'p6_lead');
  var stored = storedTotal();

  h += '<div class="cols"><div>' + (S.destId === 'titan' && !S.droneDone && S.alive ? '<div class="panel">' + droneBtn('wide') + '</div>' : '') + vizPanel();

  /* turn strip */
  h += '<div class="panel"><h2>' + esc(t('turn')) + ' ' + S.turn + ' ' + esc(t('of')) + ' ' + c.opsTurns + '</h2><div class="turnstrip">';
  for (var i = 0; i < c.opsTurns; i++) {
    var cls = S.strip[i] || '';
    h += '<span class="tcell ' + cls + (i === S.turn ? ' now' : '') + '"></span>';
  }
  h += '</div><div class="hint">' + esc(LANG === 'es'
    ? 'Violeta: ciencia recolectada · Cian: turno dominado por transmisión · Ámbar: anomalía · Rojo: pérdida grave'
    : 'Violet: science collected · Cyan: downlink-dominated turn · Amber: anomaly · Red: serious loss') + '</div></div>';

  /* allocation */
  var hk = 100 - S.alloc.sci - S.alloc.dl;
  h += '<div class="panel"><h2>' + esc(t('alloc')) + '</h2>';
  h += slider('allocSci', t('a_science'), S.alloc.sci, 0, 100, 5, '%', '');
  h += slider('allocDl', t('a_downlink'), S.alloc.dl, 0, 100, 5, '%', '');
  h += '<div class="ctrl"><div class="ctrl-top"><label>' + esc(t('a_house')) + '</label><output>' + hk + ' %</output></div>' +
    '<div class="meter"><i class="m-ok" style="width:' + hk + '%"></i></div>' +
    '<div class="hint">' + esc(LANG === 'es'
      ? 'El mantenimiento no produce ciencia, pero reduce la probabilidad de anomalías. Es el seguro más barato que tienes.'
      : 'Maintenance produces no science, but it lowers the anomaly probability. It is the cheapest insurance you have.') + '</div></div>';
  h += '</div>';

  /* instruments */
  h += '<div class="panel"><h2>' + esc(t('instruments_on')) + '</h2>';
  var avail = powerAvailable(c);
  var draw = 0;
  for (i = 0; i < c.instr.length; i++) if (S.active[c.instr[i].id] && !S.dead[c.instr[i].id]) draw += c.instr[i].powerW;
  for (i = 0; i < c.instr.length; i++) {
    var it = c.instr[i], dead = !!S.dead[it.id], on = !!S.active[it.id] && !dead;
    h += '<div class="instr-row"><span class="nm">' + esc(L(it.name)) +
      '<small>' + it.powerW + ' W · ' + gb(it.dataGb) + '/' + (LANG === 'es' ? 'turno' : 'turn') +
      ' · ' + esc(LANG === 'es' ? 'bajado' : 'downlinked') + ' ' + gb(S.downlinked[it.id] || 0) +
      (dead ? ' · ' + esc(LANG === 'es' ? 'FUERA DE SERVICIO' : 'FAILED') : '') + '</small></span>' +
      '<span class="switch' + (on ? ' on' : '') + (dead ? ' dead' : '') + '" data-act="toggle" data-v="' + it.id + '"></span></div>';
  }
  h += '<div class="hint">' + esc(LANG === 'es'
    ? 'Potencia disponible para instrumentos: ' + n0(avail) + ' W. Demanda actual: ' + n0(draw) + ' W.'
    : 'Power available to instruments: ' + n0(avail) + ' W. Current demand: ' + n0(draw) + ' W.') +
    (draw > avail ? ' <b style="color:var(--bad)">' + esc(LANG === 'es' ? 'Sobredemanda: los instrumentos operarán a ciclo reducido.' : 'Over-demand: instruments will run at reduced duty cycle.') + '</b>' : '') +
    '</div></div>';

  h += '</div><div class="side"><div class="panel"><h2>' + esc(LANG === 'es' ? 'Estado de la nave' : 'Spacecraft status') + '</h2>';
  h += rows([
    [t('storage'), gb(stored) + ' / ' + gb(c.bus.storeGb)],
    [t('downlinked'), gb(dlTotal())],
    [t('ops_budget'), money(S.budgetLeft)],
    [LANG === 'es' ? 'Propelente restante' : 'Propellant left', n0(S.propLeft) + ' kg'],
    [LANG === 'es' ? 'Salud de paneles' : 'Array health', n0(S.arrayHealth * 100) + '%'],
    [LANG === 'es' ? 'Potencia disponible' : 'Power available', n0(avail) + ' W'],
    [LANG === 'es' ? 'Capacidad de bajada' : 'Downlink capacity', gb(c.link.gbPerTurn * S.permDl) + '/' + (LANG === 'es' ? 'turno' : 'turn'), true]
  ]);
  h += '<div class="bar"><i style="width:' + ENG.clamp(stored / c.bus.storeGb * 100, 0, 100) + '%"></i></div>';

  h += '<h3>' + esc(t('objectives')) + '</h3>';
  var sc = ENG.score(S, c);
  for (i = 0; i < sc.objectives.length; i++) {
    var o = sc.objectives[i];
    var cls = o.frac >= 1 ? 'met' : (o.frac > 0 ? 'partial' : 'unmet');
    h += '<div class="obj ' + cls + '"><div class="obj-top"><span class="obj-name">' + esc(L(o.obj.name)) + '</span>' +
      '<span class="obj-val">' + n0(o.frac * 100) + '%</span></div>' +
      '<div class="bar"><i style="width:' + ENG.clamp(o.frac * 100, 0, 100) + '%"></i></div></div>';
  }
  h += '</div>';

  h += crewMini();
  h += '<div class="panel"><h2>' + esc(t('mission_log')) + '</h2><div class="log">';
  for (i = 0; i < Math.min(S.log.length, 40); i++)
    h += '<div class="log-item ' + S.log[i].cls + '"><span class="log-t">T' + S.log[i].turn + '</span><span class="log-x">' + esc(L(S.log[i].msg)) + '</span></div>';
  h += '</div></div></div></div>';
  return h;
}

function powerAvailable(c) {
  var years = (c.cruiseDays + S.turn * 30) / 365.25;
  var gen = (S.powerType === 'solar'
    ? ENG.solarPower(S.arrayArea, c.dest.solarAu, years)
    : ENG.rtgPower(S.rtgUnits, years)) * S.arrayHealth * S.permPower;
  return Math.max(0, gen - c.power.overhead - c.power.twtaDC * (S.alloc.dl / 100));
}

/* ----- event roll ----- */
function rollEvent(c) {
  var hk = (100 - S.alloc.sci - S.alloc.dl) / 100;
  var radFactor = ENG.clamp(c.dest.radKrad / Math.max(1, c.shd.krad), 0.25, 3);
  var p = 0.16 * (1.25 - hk * 1.1) * S.permAnomaly * radFactor * (1 + Math.max(0, 1 - c.readiness) * 1.5) * DIFF[S.diff].ev;
  if (ENG.has(S, 'h24')) p *= 0.85;
  if (rnd() > ENG.clamp(p, 0.02, 0.8)) return null;

  var pool = [];
  for (var i = 0; i < DATA.events.length; i++) {
    var e = DATA.events[i];
    if (e.onlyDest && e.onlyDest.indexOf(c.dest.id) < 0) continue;
    if (e.radMin && c.dest.radKrad < e.radMin) continue;
    if (S.usedEvents[e.id] && rnd() < 0.75) continue;
    var wgt = e.lessWith && ENG.has(S, e.lessWith) ? Math.ceil(e.weight / 2) : e.weight;
    for (var j = 0; j < wgt; j++) pool.push(e);
  }
  if (!pool.length) return null;
  return pool[Math.floor(rnd() * pool.length)];
}

function applyEffect(eff, c) {
  var mods = { sci: 1, dl: 1 };
  if (!eff) return mods;
  if (eff.cost) { S.budgetLeft -= eff.cost; }
  if (eff.scienceMult != null) mods.sci *= eff.scienceMult;
  if (eff.dlMult != null) mods.dl *= eff.dlMult;
  if (eff.permScienceMult) S.permScience *= eff.permScienceMult;
  if (eff.permDlMult) S.permDl *= eff.permDlMult;
  /* an EECOM on console catches power problems early */
  var softP = ENG.has(S, 'eecom') ? 0.6 : 1;
  if (eff.permPowerMult) S.permPower *= 1 - (1 - eff.permPowerMult) * (eff.permPowerMult < 1 ? softP : 1);
  if (eff.permImagingMult) S.permImaging *= eff.permImagingMult;
  if (eff.permAnomalyMult) S.permAnomaly *= eff.permAnomalyMult;
  if (eff.arrayDamage) S.arrayHealth *= (1 - eff.arrayDamage * softP);
  if (eff.bonusScience) S.bonusScience += eff.bonusScience;
  if (eff.propLoss) S.propLeft *= (1 - eff.propLoss);
  if (eff.storageLoss) for (var k in S.storage) S.storage[k] *= (1 - eff.storageLoss);
  if (eff.riskInstrument && rnd() < eff.riskInstrument) killInstrument(c);
  if (eff.gamble) {
    if (rnd() < eff.gamble.p) {
      if (eff.gamble.killInstrument) killInstrument(c);
      if (eff.gamble.propLoss) S.propLeft *= (1 - eff.gamble.propLoss);
      if (eff.gamble.arrayDamage) S.arrayHealth *= (1 - eff.gamble.arrayDamage * softP);
    } else if (eff.elseArrayHeal) {
      S.arrayHealth = Math.min(1, S.arrayHealth + eff.elseArrayHeal);
      logit({ es: 'Un evento de limpieza recuperó parte de la potencia de los paneles.', en: 'A cleaning event recovered some array power.' }, 'good');
    }
  }
  return mods;
}

function killInstrument(c) {
  var alive = [];
  for (var i = 0; i < c.instr.length; i++) if (!S.dead[c.instr[i].id]) alive.push(c.instr[i]);
  if (!alive.length) return;
  var victim = alive[Math.floor(rnd() * alive.length)];
  S.dead[victim.id] = true;
  S.active[victim.id] = false;
  S.strip[S.turn] = 'bad';
  logit({ es: L(victim.name) + ' quedó fuera de servicio de forma permanente.', en: L(victim.name) + ' was permanently lost.' }, 'bad');
}

/* ----- execute one turn ----- */
function nextTurn() {
  var c = comp();
  if (!S.alive || S.turn >= c.opsTurns) { S.phase = 7; render(); return; }

  var ev = rollEvent(c);
  if (ev) { S.usedEvents[ev.id] = true; showEvent(ev, c); return; }
  execTurn(c, { sci: 1, dl: 1 });
}

function execTurn(c, mods) {
  var dest = c.dest, bus = c.bus;
  var avail = powerAvailable(c);
  var draw = 0, actives = [];
  for (var i = 0; i < c.instr.length; i++) {
    var it = c.instr[i];
    if (S.active[it.id] && !S.dead[it.id]) { draw += it.powerW; actives.push(it); }
  }
  var duty = draw > 0 ? Math.min(1, avail / draw) : 0;
  if (draw > avail && draw > 0)
    logit({ es: 'Potencia insuficiente: los instrumentos operaron al ' + n0(duty * 100) + '% del ciclo previsto.',
            en: 'Insufficient power: instruments ran at ' + n0(duty * 100) + '% of the planned duty cycle.' }, 'bad');

  /* Cumulative radiation damage: total dose beyond what the shielding was
     qualified for kills parts outright, not just through anomaly events. */
  var over = dest.radKrad / Math.max(1, c.shd.krad);
  if (over > 1.5 && rnd() < ENG.clamp((over - 1) * 0.02, 0, 0.35)) {
    logit({ es: 'Dosis acumulada de radiación por encima de la calificación del blindaje: daño permanente en la electrónica.',
            en: 'Cumulative radiation dose above the shielding qualification: permanent electronics damage.' }, 'bad');
    killInstrument(c);
  }

  /* science collection */
  var sciFrac = (S.alloc.sci / 100) * S.permScience * duty * mods.sci * (ENG.has(S, 'sci') ? 1.08 : 1);
  var collectedNow = 0;
  for (i = 0; i < actives.length; i++) {
    it = actives[i];
    var mult = 1;
    if (it.tags.indexOf('cam') >= 0) mult *= S.permImaging;
    if (it.id === 'mag' && c.prop.emiPenalty) mult *= 0.5;
    var g = it.dataGb * sciFrac * mult;
    S.storage[it.id] = (S.storage[it.id] || 0) + g;
    S.collected[it.id] = (S.collected[it.id] || 0) + g;
    collectedNow += g;
  }

  /* memory overflow */
  var stored = storedTotal();
  if (stored > bus.storeGb) {
    var keep = bus.storeGb / stored, lost = stored - bus.storeGb;
    for (var k in S.storage) S.storage[k] *= keep;
    logit({ es: 'Memoria saturada: se perdieron ' + gb(lost) + ' de datos sin transmitir.',
            en: 'Memory saturated: ' + gb(lost) + ' of untransmitted data was lost.' }, 'bad');
    S.strip[S.turn] = 'bad';
    S.overflow = true;
  }

  /* downlink */
  var cap = c.link.gbPerTurn * (S.alloc.dl / 100) * S.permDl * mods.dl * (ENG.has(S, 'inco') ? 1.08 : 1);
  stored = storedTotal();
  var sent = Math.min(cap, stored);
  if (stored > 0) {
    var frac = sent / stored;
    for (k in S.storage) {
      var moved = S.storage[k] * frac;
      S.storage[k] -= moved;
      S.downlinked[k] = (S.downlinked[k] || 0) + moved;
    }
  }

  vizBoost(sent);
  if (sent > 0) SFX.data();

  /* station keeping */
  if (dest.skDvPerTurn > 0) {
    var mNow = c.mass.dry + S.propLeft;
    var burn = mNow * (1 - Math.exp(-dest.skDvPerTurn / (c.prop.isp * G0))) * (1 - 0.06 * (S.staff.fido || 0));
    S.propLeft -= burn;
  }

  /* strip colour */
  if (!S.strip[S.turn]) S.strip[S.turn] = (S.alloc.dl > S.alloc.sci) ? 'dl' : (collectedNow > 0 ? 'sci' : '');

  S.turn++;

  logit({ es: 'Recolectados ' + gb(collectedNow) + ', transmitidos ' + gb(sent) + '.',
          en: 'Collected ' + gb(collectedNow) + ', transmitted ' + gb(sent) + '.' }, '');

  /* end conditions */
  if (S.propLeft <= 0 && dest.skDvPerTurn > 0) {
    S.alive = false;
    S.failReason = { es: 'Sin propelente para mantener la órbita: la nave se perdió.', en: 'Out of propellant for station keeping: the spacecraft was lost.' };
    logit(S.failReason, 'bad');
  }
  if (S.budgetLeft < 0) {
    S.alive = false;
    S.failReason = { es: 'Las reservas de presupuesto se agotaron y el programa fue cancelado.', en: 'Budget reserves ran out and the program was cancelled.' };
    logit(S.failReason, 'bad');
  }
  var anyAlive = false;
  for (i = 0; i < c.instr.length; i++) if (!S.dead[c.instr[i].id]) anyAlive = true;
  if (!anyAlive) {
    S.alive = false;
    S.failReason = { es: 'Todos los instrumentos quedaron fuera de servicio.', en: 'All instruments are out of service.' };
    logit(S.failReason, 'bad');
  }

  if (!S.alive || S.turn >= c.opsTurns) S.phase = 7;
  render();
}

/* ----- event modal ----- */
/* the team answer comes first when the right console is staffed */
function evChoices(ev) {
  if (ev.staff && ev.staffChoice && ENG.has(S, ev.staff)) {
    var con = DATA.find(DATA.consoles, ev.staff);
    var tc = { label: ev.staffChoice.label, note: ev.staffChoice.note, effect: ev.staffChoice.effect, team: con ? con.icon : 'console' };
    return [tc].concat(ev.choices);
  }
  return ev.choices;
}
function showEvent(ev, c) {
  S.strip[S.turn] = 'ev';
  var h = '<div class="ev-kind">' + esc(L(ev.kind)) + ' · ' + esc(t('turn')) + ' ' + (S.turn + 1) + '</div>' +
    '<h2>' + esc(L(ev.title)) + '</h2><p>' + esc(L(ev.text)) + '</p>' +
    '<div class="ev-kind" style="color:var(--txt-faint)">' + esc(t('ev_choose')) + '</div>';
  var ch = evChoices(ev);
  for (var i = 0; i < ch.length; i++) {
    h += '<button class="choice' + (ch[i].team ? ' team' : '') + '" data-act="evchoice" data-v="' + i + '"><span class="kbd">' + (i + 1) + '</span>' +
      (ch[i].team ? icon(ch[i].team, 'ico') : '') + esc(L(ch[i].label)) +
      '<small>' + esc(L(ch[i].note)) + '</small></button>';
  }
  if (ev.staff && !ENG.has(S, ev.staff)) {
    var con = DATA.find(DATA.consoles, ev.staff);
    h += '<p class="ev-miss">' + icon('console', 'ico') + esc(LANG === 'es' ? 'Con ' + L(con.name) + ' en el centro de control tendrías una opción mejor.' : 'With ' + L(con.name) + ' in mission control you would have a better option.') + '</p>';
  }
  if (!S.pendingEvent) SFX.alarm();
  S.pendingEvent = ev;
  $('modal').innerHTML = h;
  $('modal-back').hidden = false;
}

function resolveEvent(idx) {
  var ev = S.pendingEvent, c = comp();
  $('modal-back').hidden = true;
  S.pendingEvent = null;
  var ch = evChoices(ev)[idx];
  logit({ es: L(ev.title) + ' → ' + L(ch.label), en: L(ev.title) + ' → ' + L(ch.label) }, ch.team ? 'good' : 'bad');
  if (ch.team) award('teamwork');
  var mods = applyEffect(ch.effect, c);
  execTurn(comp(), mods);
}

/* ---------------------------------------------------------------- *
 * phase 7 — report                                                  *
 * ---------------------------------------------------------------- */
function viewReport(c) {
  var sc = ENG.score(S, c);
  checkEndBadges(c, sc);
  var crit = ENG.critique(S, c, sc);
  var gradeColor = { S: 'var(--accent)', A: 'var(--ok)', B: 'var(--accent-2)', C: 'var(--gold)', D: 'var(--warn)', F: 'var(--bad)' }[sc.grade];

  var h = '<div class="phase-head"><div class="phase-kicker">' + esc(t('rep_kick')) + '</div>' +
    '<h1>' + esc(t('rep_title')) + '</h1><p>' + esc(L(c.dest.name)) + ' · ' + esc(L(c.prog.name)) +
    ' · ' + S.turn + '/' + c.opsTurns + ' ' + esc(LANG === 'es' ? 'turnos operados' : 'turns operated') + '</p></div>';

  if (!S.launchSuccess || !S.alive) {
    h += '<div class="alert bad" style="margin-bottom:16px"><span class="alert-icon">✕</span><span><b>' +
      esc(!S.launchSuccess ? t('launch_fail') : (LANG === 'es' ? 'MISIÓN TERMINADA ANTES DE LO PREVISTO' : 'MISSION ENDED EARLY')) +
      '</b> — ' + esc(S.failReason ? L(S.failReason) : '') + '</span></div>';
  }

  h += '<div class="panel"><div class="score-hero">' +
    '<div class="grade" style="color:' + gradeColor + '">' + sc.grade + '</div>' +
    '<div><div class="lbl">' + esc(t('total_score')) + '</div><div class="big">' + sc.total + ' <span style="color:var(--txt-faint);font-size:18px">/ ' + sc.max + '</span></div></div>' +
    '<div class="score-rows">';
  var bars = [
    [t('sc_science'), sc.science, sc.scienceMax],
    [t('sc_eng'), sc.eng, 150],
    [t('sc_cost'), sc.cost, 150],
    [t('sc_surv'), sc.surv, 100]
  ];
  for (var i = 0; i < bars.length; i++) {
    h += '<div class="sb"><span class="sb-n">' + esc(bars[i][0]) + '</span>' +
      '<span class="sb-bar"><i style="width:' + ENG.clamp(bars[i][1] / bars[i][2] * 100, 0, 100) + '%"></i></span>' +
      '<span class="sb-v">' + n0(bars[i][1]) + '/' + n0(bars[i][2]) + '</span></div>';
  }
  h += '</div></div></div>';

  /* KPIs */
  var collected = 0, down = 0;
  for (var k in S.collected) collected += S.collected[k];
  for (k in S.downlinked) down += S.downlinked[k];
  h += '<div class="panel"><h2>' + esc(t('summary')) + '</h2><div class="kv">' +
    kv(LANG === 'es' ? 'Datos recolectados' : 'Data collected', gb(collected)) +
    kv(LANG === 'es' ? 'Datos bajados' : 'Data downlinked', gb(down)) +
    kv(LANG === 'es' ? 'Eficiencia de enlace' : 'Link efficiency', collected > 0 ? n0(down / collected * 100) + '%' : '—') +
    kv(LANG === 'es' ? 'Costo total' : 'Total cost', money(c.cost.total)) +
    kv(LANG === 'es' ? 'Reserva final' : 'Final reserve', money(S.budgetLeft)) +
    kv(LANG === 'es' ? 'Masa de lanzamiento' : 'Launch mass', n0(c.mass.launch) + ' kg') +
    kv(LANG === 'es' ? 'Instrumentos perdidos' : 'Instruments lost', n0(Object.keys(S.dead).length) + '/' + c.instr.length) +
    kv(LANG === 'es' ? 'Duración' : 'Duration', n1(c.years) + (LANG === 'es' ? ' años' : ' yr')) +
    kv(LANG === 'es' ? 'Equipo en tierra' : 'Ground team', ENG.staff(S).total + (LANG === 'es' ? ' personas' : ' people')) +
    kv(LANG === 'es' ? 'Ascenso' : 'Ascent', S.launchMode === 'pilot' ? (LANG === 'es' ? 'pilotado' : 'hand-flown') : (LANG === 'es' ? 'automático' : 'automatic')) +
    '</div></div>';

  /* objectives table */
  h += '<div class="panel"><h2>' + esc(t('final_obj')) + '</h2><table class="tbl"><tr><th>' +
    esc(LANG === 'es' ? 'Objetivo' : 'Objective') + '</th><th class="num">' + esc(LANG === 'es' ? 'Datos' : 'Data') +
    '</th><th class="num">' + esc(LANG === 'es' ? 'Requerido' : 'Required') + '</th><th class="num">%</th><th class="num">' +
    esc(LANG === 'es' ? 'Puntos' : 'Points') + '</th></tr>';
  for (i = 0; i < sc.objectives.length; i++) {
    var o = sc.objectives[i];
    h += '<tr><td>' + esc(L(o.obj.name)) + '</td><td class="num">' + gb(o.gb) + '</td><td class="num">' + gb(o.obj.dataGb) +
      '</td><td class="num">' + n0(o.frac * 100) + '%</td><td class="num">' + n0(o.obj.value * o.frac) + '/' + o.obj.value + '</td></tr>';
  }
  h += '</table></div>';

  /* critique */
  h += '<div class="panel"><h2>' + esc(t('critique')) + '</h2>';
  for (i = 0; i < crit.length; i++) h += '<div class="lesson">' + esc(L(crit[i])) + '</div>';
  h += '</div>';

  /* the four mission segments, as NASA breaks a mission down */
  var objMet = 0;
  for (i = 0; i < sc.objectives.length; i++) if (sc.objectives[i].frac >= 1) objMet++;
  var es = LANG === 'es';
  h += '<div class="panel"><h2>' + esc(es ? 'Arquitectura de tu misión' : 'Your mission architecture') + '</h2><div class="segs-wrap">' +
    '<div class="segs-ship">' + shipSVG(c) + '</div><div class="segs">' +
    seg('launch', L(c.lv.name), (es ? 'fiabilidad ' : 'reliability ') + n1(c.lv.reliability * 100) + '% · ' + n0(c.mass.launch) + ' / ' + n0(c.lvCap) + ' kg') +
    seg('space', L(c.bus.name), c.instr.length + (es ? ' instrumentos · ' : ' instruments · ') + n0(c.power.genEOL) + ' W') +
    seg('ground', c.grd ? L(c.grd.name) : '—', bps(c.link.bps) + ' · ' + (c.band ? L(c.band.name) : '')) +
    seg('user', gb(down) + (es ? ' entregados' : ' delivered'), objMet + '/' + sc.objectives.length + (es ? ' objetivos cumplidos' : ' objectives met')) +
    '</div></div></div>';

  if (S.newBadges && S.newBadges.length) {
    h += '<div class="panel"><h2>' + esc(es ? 'Insignias de esta misión' : 'Badges from this mission') + '</h2><div class="badges">' + badgeShelf(S.newBadges).html + '</div></div>';
  }

  /* analogue */
  h += '<div class="panel"><h2>' + esc(t('analog')) + '</h2><div class="analog"><div>' +
    '<div class="nasa">NASA</div><strong style="font-size:16px">' + esc(c.dest.analog.name) + '</strong>' +
    '<p style="color:var(--txt-dim);font-size:13px;margin:6px 0 0">' + esc(L(c.dest.analog.note)) + '</p></div></div>' +
    explorerBtn(c, 'wide') +
    '<button class="btn wide" data-act="copy">' + esc(LANG === 'es' ? 'Copiar informe como texto' : 'Copy report as text') + '</button>' +
    shareBtn('wide') +
    '<button class="btn primary wide" data-act="restart">' + esc(t('restart')) + '</button></div>';

  return h;
}

function seg(kind, main, sub) {
  return '<div class="segc seg-' + kind + '"><div class="k">' + esc(L(SEG_NAME[kind])) + '</div><div class="v">' + esc(main) + '</div><div class="s">' + esc(sub) + '</div></div>';
}

function kv(k, v) { return '<div><div class="k">' + esc(k) + '</div><div class="v">' + v + '</div></div>'; }

function reportText(c, sc) {
  var lines = [];
  lines.push('ORBITAL NEXUS — ' + L(c.dest.name));
  lines.push(L(c.prog.name) + ' · ' + L(c.bus.name) + ' · ' + L(c.lv.name));
  lines.push('');
  lines.push((LANG === 'es' ? 'Puntaje' : 'Score') + ': ' + sc.total + '/' + sc.max + '  (' + sc.grade + ')');
  lines.push((LANG === 'es' ? 'Ciencia' : 'Science') + ': ' + n0(sc.science) + '/' + n0(sc.scienceMax) +
    ' · ' + (LANG === 'es' ? 'Ingeniería' : 'Engineering') + ': ' + n0(sc.eng) + '/150' +
    ' · ' + (LANG === 'es' ? 'Costo' : 'Cost') + ': ' + n0(sc.cost) + '/150' +
    ' · ' + (LANG === 'es' ? 'Supervivencia' : 'Survival') + ': ' + n0(sc.surv) + '/100');
  lines.push('');
  lines.push((LANG === 'es' ? 'Masa de lanzamiento' : 'Launch mass') + ': ' + n0(c.mass.launch) + ' kg / ' + n0(c.lvCap) + ' kg');
  lines.push((LANG === 'es' ? 'Potencia EOL' : 'EOL power') + ': ' + n0(c.power.genEOL) + ' W · ' + (LANG === 'es' ? 'margen' : 'margin') + ' ' + n0(c.power.marginPct * 100) + '%');
  lines.push('Delta-v: ' + n2(c.dv.available) + ' / ' + n2(c.dv.required) + ' km/s');
  lines.push((LANG === 'es' ? 'Enlace' : 'Link') + ': ' + bps(c.link.bps) + ' · ' + gb(c.link.gbPerTurn) + '/turn');
  lines.push((LANG === 'es' ? 'Costo' : 'Cost') + ': ' + money(c.cost.total) + ' / ' + money(c.cost.budget));
  lines.push('');
  for (var i = 0; i < sc.objectives.length; i++)
    lines.push('- ' + L(sc.objectives[i].obj.name) + ': ' + n0(sc.objectives[i].frac * 100) + '%');
  lines.push('');
  var crit = ENG.critique(S, c, sc);
  for (i = 0; i < crit.length; i++) lines.push('* ' + L(crit[i]));
  return lines.join('\n');
}

function practiceBtn(cls) {
  return '<button class="btn x-open ' + (cls || '') + '" data-act="practice">' + icon('rocket', 'ico') +
    '<span><b>' + esc(LANG === 'es' ? 'Simulador de despegue' : 'Launch simulator') + '</b><small>' +
    esc(LANG === 'es' ? 'Practica el ascenso a órbita sin riesgo' : 'Practise the climb to orbit, risk free') + '</small></span></button>';
}
function practiceAscent() {
  ascentRun({ practice: true, payloadKg: 3000, cadet: false, lv: '' }, function (res) { if (res.ok) award('trainee'); });
}
/* a short preview of the readiness checklist on the launch phase */
function readinessPreview(c) {
  if (!c.lv) return '';
  var it = readinessItems(c), es = LANG === 'es', h = '', ok = 0;
  for (var i = 0; i < it.length; i++) {
    if (it[i].st === 'go') ok++;
    h += '<div class="rv-row ' + it[i].st + '"><span class="rv-st">' + (it[i].st === 'go' ? 'GO' : (it[i].st === 'warn' ? (es ? 'OBS.' : 'NOTE') : 'NO-GO')) + '</span><span class="rv-n">' + esc(it[i].name) +
      (it[i].st !== 'go' ? '<small class="rv-fix">' + icon('spark', 'ico') + esc(it[i].fix) + '</small>' : '') + '</span><b>' + esc(it[i].val) + '</b></div>';
  }
  return '<div class="panel"><h2>' + esc(es ? 'Antes de despegar: ¿qué podría salir mal?' : 'Before liftoff: what could go wrong?') + ' <span class="rv-count">' + ok + '/' + it.length + ' GO</span></h2>' +
    '<p class="hint" style="margin:-4px 0 10px">' + esc(es ? 'Al pulsar «Lanzar» entrarás a la sala de lanzamiento: se revisa el clima y cada consola vota GO o NO-GO.' : 'Pressing "Launch" takes you to launch control: the weather is checked and every console votes GO or NO-GO.') + '</p>' + h + '</div>';
}

/* ---------------------------------------------------------------- *
 * render                                                           *
 * ---------------------------------------------------------------- */
var LAST_PHASE = -1;
function render() {
  var c = comp();
  var h = '';
  if (S.phase === 0) h = viewSplash();
  else if (S.phase === 1) h = viewMission(c);
  else if (S.phase === 2) h = viewPlatform(c);
  else if (S.phase === 3) h = viewScience(c);
  else if (S.phase === 4) h = viewLink(c);
  else if (S.phase === 5) h = viewLaunch(c);
  else if (S.phase === 6) h = viewOps(c);
  else h = viewReport(c);
  $('stage').innerHTML = h;
  glossify($('stage'));
  $('brand-sub').textContent = t('sub');
  $('lab-top-txt').textContent = LANG === 'es' ? 'Laboratorio' : 'Lab';
  renderStepper();
  renderHUD();
  renderNav();
  var lt = $('lang-toggle').querySelectorAll('.lang-opt');
  for (var i = 0; i < lt.length; i++) lt[i].className = 'lang-opt' + (lt[i].getAttribute('data-l') === LANG ? ' on' : '');
  if (LAST_PHASE !== S.phase) window.scrollTo(0, 0);
  LAST_PHASE = S.phase;
  saveGame();
  if (S.phase === 6) vizStart();
  celebrateCheck();
}

/* ---------------------------------------------------------------- *
 * defaults applied when entering a phase                            *
 * ---------------------------------------------------------------- */
function enterPhase(p) {
  S.phase = p;
  S.seen = Math.max(S.seen, p);
  var c = comp();
  if (p === 2 && S.busId && !S.propId) {
    /* sensible starting point so the sliders mean something immediately */
    S.propId = c.bus.rank === 0 ? 'coldgas' : (c.bus.rank === 1 ? 'mono' : 'biprop');
  }
  if (p === 4 && !S.groundId) S.groundId = c.dest.commAu > 0.05 ? 'dsn34' : 'comm13';
  if (p >= 2 && p <= 5) autoSizeIfOn();
  if (p === 5 && S.devMonths == null) S.devMonths = comp().devNeed;
  render();
}

/* ---------------------------------------------------------------- *
 * events / wiring                                                  *
 * ---------------------------------------------------------------- */
function onPick(k, v) {
  pickInto(S, k, v);
  if (S.phase >= 2) autoSizeIfOn();
  render();
}

function applyRange(k, v) {
  v = parseFloat(v);
  if (k === 'allocSci') {
    S.alloc.sci = v;
    if (S.alloc.sci + S.alloc.dl > 100) S.alloc.dl = 100 - S.alloc.sci;
  } else if (k === 'allocDl') {
    S.alloc.dl = v;
    if (S.alloc.sci + S.alloc.dl > 100) S.alloc.sci = 100 - S.alloc.dl;
  } else S[k] = v;
}

var SIZING_KEYS = ['arrayArea', 'rtgUnits', 'batteryWh', 'propellantKg'];
function wire() {
  document.addEventListener('click', function (e) {
    var el = e.target.closest ? e.target.closest('[data-act]') : null;
    if (!el) return;
    var act = el.getAttribute('data-act');
    if (act === 'start') {
      var d0 = S.diff; clearSave(); S = freshState(); S.diff = d0; enterPhase(1);
      if (!pref('on_tour', '')) tourOpen();
      return;
    }
    if (act === 'tour') { tourOpen(); return; }
    if (act === 'share') { shareDesign(el); return; }
    if (act === 'quickdemo') { quickDemo(); return; }
    if (act === 'drone') { droneFromGame(); return; }
    if (act === 'fix') { applyFix(el.getAttribute('data-v')); return; }
    if (act === 'diff') { S.diff = el.getAttribute('data-v'); setPref('on_diff', S.diff); render(); return; }
    if (act === 'resume') { resumeGame(); return; }
    if (act === 'explore') { explorerOpen(explorerCfg(comp())); return; }
    if (act === 'practice') { practiceAscent(); return; }
    if (act === 'staff') { var sid = el.getAttribute('data-v'); S.staff[sid] = !S.staff[sid]; render(); return; }
    if (act === 'fido') { S.staff.fido = Math.max(0, Math.min(3, (S.staff.fido || 0) + parseInt(el.getAttribute('data-v'), 10))); render(); return; }
    if (act === 'h24') { S.staff.h24 = !S.staff.h24; render(); return; }
    if (act === 'demo') { explorerOpen(explorerDemo(el.getAttribute('data-v'))); return; }
    if (act === 'pick') { onPick(el.getAttribute('data-k'), el.getAttribute('data-v')); return; }
    if (act === 'preset') { applyPreset(el.getAttribute('data-v')); return; }
    if (act === 'kit') { applyKit(el.getAttribute('data-v')); return; }
    if (act === 'auto') { S.auto = S.auto === false; autoSizeIfOn(); render(); return; }
    if (act === 'autosci') { S.instruments = autoInstruments(S); autoSizeIfOn(); render(); return; }
    if (act === 'autolink') {
      var sol = solveLink(S);
      if (sol) ['antennaD', 'twtaW', 'bandId', 'groundId', 'arrayArea', 'rtgUnits', 'batteryWh', 'propellantKg'].forEach(function (k) { S[k] = sol.st[k]; });
      render(); return;
    }
    if (act === 'lab') { labOpen(el.getAttribute('data-v')); return; }
    if (act === 'instr') {
      var id = el.getAttribute('data-v'), i = S.instruments.indexOf(id);
      if (i >= 0) S.instruments.splice(i, 1); else S.instruments.push(id);
      autoSizeIfOn();
      render(); return;
    }
    if (act === 'toggle') {
      var tid = el.getAttribute('data-v');
      if (S.dead[tid]) return;
      S.active[tid] = !S.active[tid];
      render(); return;
    }
    if (act === 'evchoice') { resolveEvent(parseInt(el.getAttribute('data-v'), 10)); return; }
    if (act === 'restart') { clearSave(); S = freshState(); render(); return; }
    if (act === 'copy') {
      var c = comp(), txt = reportText(c, ENG.score(S, c));
      try {
        navigator.clipboard.writeText(txt);
        el.textContent = LANG === 'es' ? '✓ Copiado al portapapeles' : '✓ Copied to clipboard';
      } catch (err) {
        el.textContent = LANG === 'es' ? 'No se pudo copiar' : 'Could not copy';
      }
      return;
    }
  });

  /* While dragging we only refresh the readout and the HUD, so the slider
     keeps the pointer. The full phase re-render happens on release. */
  document.addEventListener('input', function (e) {
    if (!e.target.getAttribute || e.target.type !== 'range') return;
    var k = e.target.getAttribute('data-k');
    if (!k) return;
    applyRange(k, e.target.value);
    if (SIZING_KEYS.indexOf(k) >= 0) S.auto = false;
    var box = e.target.parentNode, out = box ? box.querySelector('output') : null;
    if (out) out.textContent = (Math.round(parseFloat(e.target.value) * 100) / 100) + ' ' + (e.target.getAttribute('data-unit') || '');
    comp(); renderHUD(); renderNav();
  });
  document.addEventListener('change', function (e) {
    if (e.target.getAttribute && e.target.type === 'range' && e.target.getAttribute('data-k')) render();
  });

  $('btn-next').addEventListener('click', function () {
    if (OVERLAY_OPEN) return;
    if (S.phase === 5) { doLaunch(); return; }
    if (S.phase === 6) {
      var c = comp();
      if (S.alive && S.turn < c.opsTurns) nextTurn();
      else { S.phase = 7; render(); }
      return;
    }
    enterPhase(S.phase + 1);
  });
  $('btn-back').addEventListener('click', function () { if (S.phase > 1) enterPhase(S.phase - 1); });

  $('lang-toggle').addEventListener('click', function () {
    LANG = LANG === 'es' ? 'en' : 'es';
    try { localStorage.setItem('on_lang', LANG); } catch (err) { }
    document.documentElement.lang = LANG;
    if (S.pendingEvent) showEvent(S.pendingEvent, comp());
    render();
  });
}

function resumeGame() {
  var sv = loadSave();
  if (!sv) return;
  var base = freshState();
  for (var k in sv) base[k] = sv[k];
  S = base;
  /* the event object was serialised as a copy; point back at the catalogue */
  var ev = S.pendingEvent ? DATA.find(DATA.events, S.pendingEvent.id) : null;
  S.pendingEvent = null;
  render();
  if (ev) showEvent(ev, comp());
}

/* ---------------------------------------------------------------- *
 * boot                                                             *
 * ---------------------------------------------------------------- */
injectArt();
S = freshState();
starfield();
wire();
wireFx();
wireHelp();
document.documentElement.lang = LANG;
if (!loadShared()) {
  render();
  /* presentacion.html links here: open the ready-made mission */
  if (location.hash === '#demo') { history.replaceState(null, '', location.href.split('#')[0]); quickDemo(); }
}
