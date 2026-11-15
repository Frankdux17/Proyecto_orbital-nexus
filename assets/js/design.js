/* ORBITAL NEXUS — choosing made easy.
   Every option shows what it would do to the mission before you click it,
   the spacecraft sizes itself (arrays, battery, propellant) unless you take
   manual control, and each phase has a one-tap assistant: design kits for
   the platform, an instrument picker, a link solver and a rocket picker. */

function cloneState(src) { return JSON.parse(JSON.stringify(src)); }

/* a pick applied to any state, with the knock-on effects of that choice */
function pickInto(st, k, v) {
  if (k === 'antennaD' || k === 'twtaW') v = parseFloat(v);
  st[k] = v;
  if (k === 'busId') {
    var b = DATA.find(DATA.buses, v);
    if (st.arrayArea > b.arrayMax) st.arrayArea = b.arrayMax;
    if (st.propellantKg > b.propMax) st.propellantKg = b.propMax;
    if (st.batteryWh > b.batteryMax) st.batteryWh = b.batteryMax;
    if (!b.allowsRTG && st.powerType === 'rtg') st.powerType = 'solar';
    if (st.propId) { var p = DATA.find(DATA.propulsion, st.propId); if (p.minRank > b.rank) st.propId = null; }
    if (st.antennaD && st.antennaD > b.antennaMax) st.antennaD = null;
    var keep = [];
    for (var i = 0; i < st.instruments.length; i++) {
      var it = DATA.find(DATA.instruments, st.instruments[i]);
      if (it.minBusRank == null || b.rank >= it.minBusRank) keep.push(it.id);
    }
    st.instruments = keep;
  }
  if (k === 'programId') {
    var pr = DATA.find(DATA.programs, v);
    if (st.destId) { var d = DATA.find(DATA.destinations, st.destId); if (d.minProgram > pr.rank) st.destId = null; }
  }
  if (k === 'destId') { st.devMonths = null; st.instruments = []; st.edlId = null; }
}

/* ---------------------------------------------------------------- *
 * automatic sizing                                                  *
 * ---------------------------------------------------------------- */
/* The same sizing rules a systems engineer applies by hand: arrays for the
   end-of-life peak load plus margin, a battery for the longest eclipse, and
   propellant from the rocket equation, iterated because the tanks and the
   propellant feed back into the dry mass they have to push. */
function autoSizeInto(st, m) {
  m = m || { dv: 1.12, pw: 1.3, bat: 1.2 };
  var c = ENG.compute(st);
  if (!c.dest || !c.bus) return st;
  var bus = c.bus;
  function stepUp(v, step, max) { return Math.max(0, Math.min(max, Math.ceil(v / step - 1e-9) * step)); }
  for (var it = 0; it < 10; it++) {
    c = ENG.compute(st);
    var need = c.power.peak * m.pw;
    if (st.powerType === 'solar') {
      var per = ENG.solarPower(1, c.dest.solarAu, c.years);
      st.arrayArea = Math.round(stepUp(need / per, bus.arrayMax > 20 ? 1 : 0.2, bus.arrayMax) * 100) / 100;
    } else {
      st.rtgUnits = Math.max(1, Math.min(4, Math.ceil(need / ENG.rtgPower(1, c.years))));
    }
    var bstep = bus.batteryMax > 5000 ? 250 : 50;
    st.batteryWh = stepUp(c.battery.need * m.bat, bstep, bus.batteryMax);
    if (c.prop) {
      var target = c.dv.required * m.dv;
      var dryNoProp = c.mass.dry;
      var mp = ENG.propNeeded(c.prop.isp, dryNoProp, target);
      if (!isFinite(mp)) mp = bus.propMax;
      st.propellantKg = stepUp(mp, bus.propMax > 500 ? 10 : 1, bus.propMax);
    }
  }
  return st;
}

function autoSizeIfOn() { if (S.auto !== false && S.busId) autoSizeInto(S); }

/* ---------------------------------------------------------------- *
 * a quick verdict on any design                                     *
 * ---------------------------------------------------------------- */
function checks(c) {
  return {
    dv: !c.prop || c.dv.margin >= 0,
    power: c.power.genEOL <= 0 ? false : c.power.margin >= 0,
    budget: c.cost.margin >= 0,
    payload: !c.bus || c.mass.payload <= c.bus.payloadMax,
    fits: !c.lv || c.lvCap >= c.mass.launch
  };
}

function checkChip(ok, es, en) {
  return '<span class="ck ' + (ok ? 'ok' : 'bad') + '">' + (ok ? '✓ ' : '✕ ') + esc(LANG === 'es' ? es : en) + '</span>';
}

/* the same preview for switching an instrument on or off */
function impactInstr(id) {
  var st = cloneState(S), i = st.instruments.indexOf(id);
  if (i >= 0) st.instruments.splice(i, 1); else st.instruments.push(id);
  return impactState(st, 'instr');
}

/* what this option would do to the mission, before you choose it */
function impactOf(k, v) {
  if (!S.destId || !S.programId) return '';
  var st = cloneState(S);
  pickInto(st, k, v);
  return impactState(st, k);
}
function impactState(st, k) {
  var cur = CACHE || comp();
  if (st.auto !== false && st.busId) autoSizeInto(st);
  var c = ENG.compute(st), ck = checks(c);
  var dCost = c.cost.total - cur.cost.total;
  var es = LANG === 'es';
  var cost = Math.abs(dCost) < 0.5 ? (es ? 'mismo costo' : 'same cost')
    : (dCost > 0 ? '+' : '−') + money(Math.abs(dCost));
  var h = '<span class="impact"><span class="ck cost ' + (dCost > 0.5 ? 'up' : (dCost < -0.5 ? 'down' : '')) + '">' + esc(cost) + '</span>';
  if (k === 'launcherId') {
    var cap = c.lvCap, m = c.mass.launch, pct = cap > 0 ? Math.min(1, m / cap) : 1;
    h += '<span class="fitbar' + (ck.fits ? '' : ' over') + '" title="' + esc(n0(m) + ' / ' + n0(cap) + ' kg') + '"><i style="width:' + n0(pct * 100) + '%"></i></span>' +
      checkChip(ck.fits, ck.fits ? 'cabe · sobran ' + n0(cap - m) + ' kg' : 'no cabe: faltan ' + n0(m - cap) + ' kg',
        ck.fits ? 'fits · ' + n0(cap - m) + ' kg spare' : 'too heavy by ' + n0(m - cap) + ' kg');
  } else {
    if (S.phase >= 2) h += checkChip(ck.dv, 'Δv', 'Δv') + checkChip(ck.power, 'energía', 'power');
    if (k === 'busId' || k === 'instr') h += checkChip(ck.payload, 'carga', 'payload');
    h += checkChip(ck.budget, 'presupuesto', 'budget');
  }
  return h + '</span>';
}

/* how hard a destination is, in plain words */
function destLevel(d) {
  var score = d.dv + (d.commAu > 1 ? 1.5 : (d.commAu > 0.02 ? 0.8 : 0)) + d.radKrad / 200 + (d.lander ? 1.2 : 0) + d.minProgram * 0.5;
  if (score < 1.6) return { id: 'easy', es: 'Fácil', en: 'Easy', stars: 1 };
  if (score < 4) return { id: 'mid', es: 'Media', en: 'Medium', stars: 2 };
  return { id: 'hard', es: 'Difícil', en: 'Hard', stars: 3 };
}

/* ---------------------------------------------------------------- *
 * phase 1: start from a ready mission                               *
 * ---------------------------------------------------------------- */
var PRESETS = [
  { id: 'moon', prog: 'smallsat', dest: 'llo', ic: 'target',
    es: ['Primera misión', 'Orbitador lunar', 'Corta, barata y con buen enlace. Ideal para aprender.'],
    en: ['First mission', 'Lunar orbiter', 'Short, cheap and with a good link. Ideal to learn.'] },
  { id: 'mars', prog: 'discovery', dest: 'mars-orbit', ic: 'orbit3d',
    es: ['Misión clásica', 'Orbitador de Marte', 'Siete meses de crucero, inserción orbital y radar de hielo.'],
    en: ['Classic mission', 'Mars orbiter', 'Seven months of cruise, orbit insertion and an ice radar.'] },
  { id: 'europa', prog: 'flagship', dest: 'europa', ic: 'rtg',
    es: ['Gran desafío', 'Europa, luna de Júpiter', 'Radiación extrema, poca luz y seis años de viaje.'],
    en: ['Grand challenge', 'Europa, Jupiter’s moon', 'Extreme radiation, little light and six years of travel.'] }
];

function presetPanel() {
  var es = LANG === 'es';
  var h = '<div class="assist"><div class="assist-head">' + icon('spark', 'ico') + '<div><b>' +
    esc(es ? 'Empieza rápido con una misión lista' : 'Start fast with a ready mission') + '</b><span>' +
    esc(es ? 'Elige una y el equipo propone la nave. Después puedes cambiar todo.' : 'Pick one and the team proposes the spacecraft. You can change everything later.') +
    '</span></div></div><div class="presets">';
  for (var i = 0; i < PRESETS.length; i++) {
    var p = PRESETS[i], tx = es ? p.es : p.en, on = S.programId === p.prog && S.destId === p.dest;
    var d = DATA.find(DATA.destinations, p.dest), lv = destLevel(d);
    h += '<button class="preset' + (on ? ' on' : '') + '" data-act="preset" data-v="' + p.id + '">' +
      destArt(p.dest, 'art preset-art') + '<span class="preset-txt"><span class="lvl lvl-' + lv.id + '">' + esc(tx[0]) + ' · ' + esc(es ? lv.es : lv.en) + '</span>' +
      '<b>' + esc(tx[1]) + '</b><span>' + esc(tx[2]) + '</span></span></button>';
  }
  return h + '</div></div>';
}

function applyPreset(id) {
  var p = null;
  for (var i = 0; i < PRESETS.length; i++) if (PRESETS[i].id === id) p = PRESETS[i];
  if (!p) return;
  pickInto(S, 'programId', p.prog);
  pickInto(S, 'destId', p.dest);
  render();
}

/* ---------------------------------------------------------------- *
 * phase 2: design kits                                              *
 * ---------------------------------------------------------------- */
function kitState(kind) {
  var st = cloneState(S);
  var c = ENG.compute(st);
  if (!c.dest) return null;
  var need = Math.max(c.mass.payload, minPayloadFor(c.dest));
  var buses = DATA.buses, bi = -1;
  for (var i = 0; i < buses.length && bi < 0; i++) if (buses[i].payloadMax >= need * (kind === 'lean' ? 1.0 : 1.15)) bi = i;
  if (bi < 0) bi = buses.length - 1;
  if (kind === 'robust' && bi < buses.length - 1 && c.prog && buses[bi + 1].cost < c.prog.budget * 0.5) bi++;
  pickInto(st, 'busId', buses[bi].id);
  st.powerType = (c.dest.solarAu > 3 && buses[bi].allowsRTG && c.prog && c.prog.rank >= DATA.power.rtg.minProgram) ? 'rtg' : 'solar';
  var dvReq = c.dest.dv + c.dest.skDvPerTurn * c.dest.opsTurns / 1000;
  var best = null;
  for (i = 0; i < DATA.propulsion.length; i++) {
    var p = DATA.propulsion[i];
    if (p.minRank > buses[bi].rank) continue;
    var frac = 1 - Math.exp(-dvReq * 1000 / (p.isp * G0));
    var limit = kind === 'robust' ? 0.35 : (kind === 'lean' ? 0.55 : 0.45);
    if (p.id === 'electric' && kind !== 'robust') continue;
    if (frac < limit) { best = p; break; }
  }
  if (!best) for (i = DATA.propulsion.length - 1; i >= 0; i--) if (DATA.propulsion[i].minRank <= buses[bi].rank) { best = DATA.propulsion[i]; break; }
  st.propId = best ? best.id : null;
  autoSizeInto(st, kind === 'lean' ? { dv: 1.05, pw: 1.15, bat: 1.05 } : (kind === 'robust' ? { dv: 1.25, pw: 1.5, bat: 1.4 } : null));
  st.auto = true;
  return st;
}

var KITS = [
  { id: 'lean', es: ['Económica', 'Lo justo para cumplir: menos masa, menos costo, poco margen.'], en: ['Lean', 'Just enough to fly: less mass, less cost, thin margins.'] },
  { id: 'bal', es: ['Equilibrada', 'Lo que haría un equipo de la NASA: márgenes de 12–30%.'], en: ['Balanced', 'What a NASA team would do: 12–30% margins.'] },
  { id: 'robust', es: ['Robusta', 'Más margen para sobrevivir a fallas, a mayor costo.'], en: ['Robust', 'More margin to survive failures, at a higher cost.'] }
];

function bar(label, val, max, cls, txt) {
  var pct = Math.max(2, Math.min(100, max > 0 ? val / max * 100 : 0));
  return '<div class="kbar"><span>' + esc(label) + '</span><i><b class="' + (cls || '') + '" style="width:' + n0(pct) + '%"></b></i><em>' + txt + '</em></div>';
}

function kitPanel(c) {
  if (!c.dest || !c.prog) return '';
  var es = LANG === 'es';
  var h = '<div class="assist"><div class="assist-head">' + icon('spark', 'ico') + '<div><b>' +
    esc(es ? 'Asistente de diseño: elige un paquete completo' : 'Design assistant: pick a complete package') + '</b><span>' +
    esc(es ? 'Cada paquete elige bus y propulsión y dimensiona paneles, batería y propelente con la física real. Toca uno y listo.'
      : 'Each package picks bus and propulsion and sizes arrays, battery and propellant with real physics. Tap one and you are done.') +
    '</span></div></div><div class="kits">';
  var states = [], maxCost = 1, maxMass = 1;
  for (var i = 0; i < KITS.length; i++) {
    var st = kitState(KITS[i].id), kc = st ? ENG.compute(st) : null;
    states.push({ st: st, c: kc });
    if (kc) { maxCost = Math.max(maxCost, kc.cost.total); maxMass = Math.max(maxMass, kc.mass.launch); }
  }
  for (i = 0; i < KITS.length; i++) {
    var k = KITS[i], s = states[i];
    if (!s.c) continue;
    var tx = es ? k.es : k.en, ck = checks(s.c);
    var ok = ck.dv && ck.power && ck.budget && ck.payload;
    var on = S.busId === s.st.busId && S.propId === s.st.propId && S.powerType === s.st.powerType && S.auto !== false;
    h += '<button class="kit' + (on ? ' on' : '') + (k.id === 'bal' ? ' star' : '') + '" data-act="kit" data-v="' + k.id + '">' +
      (k.id === 'bal' ? '<span class="rec">★ ' + esc(es ? 'Recomendado' : 'Recommended') + '</span>' : '') +
      '<b class="kit-name">' + esc(tx[0]) + '</b><span class="kit-desc">' + esc(tx[1]) + '</span>' +
      '<span class="kit-cfg">' + icon(ART_MAP.buses[s.st.busId] || 'smallsat', 'ico') + esc(L(s.c.bus.name)) + '</span>' +
      '<span class="kit-cfg">' + icon(s.st.propId || 'mono', 'ico') + esc(s.c.prop ? L(s.c.prop.name) : '—') + '</span>' +
      bar(es ? 'Costo' : 'Cost', s.c.cost.total, maxCost, 'c-cost', money(s.c.cost.total)) +
      bar(es ? 'Masa' : 'Mass', s.c.mass.launch, maxMass, 'c-mass', n0(s.c.mass.launch) + ' kg') +
      bar(es ? 'Margen Δv' : 'Δv margin', Math.max(0, s.c.dv.margin / Math.max(0.01, s.c.dv.required)), 0.3, 'c-ok', n0(s.c.dv.margin * 1000) + ' m/s') +
      bar(es ? 'Margen energía' : 'Power margin', Math.max(0, s.c.power.marginPct), 0.6, 'c-ok', n0(s.c.power.marginPct * 100) + '%') +
      '<span class="kit-verdict ' + (ok ? 'ok' : 'bad') + '">' + (ok ? '✓ ' + esc(es ? 'Viable' : 'Feasible') : '✕ ' + esc(es ? 'No cierra' : 'Does not close')) + '</span>' +
      '</button>';
  }
  h += '</div>' + autoToggle() + '</div>';
  return h;
}

function autoToggle() {
  var es = LANG === 'es', on = S.auto !== false;
  return '<div class="auto-row"><button class="switch' + (on ? ' on' : '') + '" data-act="auto" role="switch" aria-checked="' + on + '"><i></i></button><div><b>' +
    esc(es ? 'Dimensionado automático ' + (on ? 'activado' : 'desactivado') : 'Automatic sizing ' + (on ? 'on' : 'off')) + '</b><span>' +
    esc(on ? (es ? 'Paneles, batería y propelente se ajustan solos cada vez que cambias algo. Mueve un control para tomar el mando manual.'
      : 'Arrays, battery and propellant resize whenever you change something. Move a slider to take manual control.')
      : (es ? 'Tú controlas los deslizadores. Actívalo para que el equipo vuelva a dimensionar la nave.'
        : 'You control the sliders. Turn it on to let the team size the spacecraft again.')) + '</span></div>' +
    labBtn('rocket') + '</div>';
}

function labBtn(tab) {
  return '<button class="btn ghost lab-open" data-act="lab" data-v="' + (tab || '') + '">' + FLASK +
    esc(LANG === 'es' ? 'Laboratorio de ingeniería' : 'Engineering lab') + '</button>';
}

function applyKit(id) {
  var st = kitState(id);
  if (!st) return;
  S.busId = st.busId; S.propId = st.propId; S.powerType = st.powerType;
  S.arrayArea = st.arrayArea; S.rtgUnits = st.rtgUnits; S.batteryWh = st.batteryWh;
  S.propellantKg = st.propellantKg; S.instruments = st.instruments; S.auto = true;
  render();
}

/* ---------------------------------------------------------------- *
 * phase 3: instrument picker                                        *
 * ---------------------------------------------------------------- */
/* greedy: objectives by value per kilogram, cheapest instrument per tag,
   stopping at the bus payload limit */
function autoInstruments(st) {
  var c = ENG.compute(st);
  if (!c.dest || !c.bus) return [];
  var objs = c.dest.objectives.slice();
  function bestFor(tag) {
    var b = null;
    for (var k = 0; k < DATA.instruments.length; k++) {
      var it = DATA.instruments[k];
      if (it.tags.indexOf(tag) < 0 || (it.landerOnly && !c.dest.lander)) continue;
      if (it.minBusRank != null && c.bus.rank < it.minBusRank) continue;
      if (it.needsBand && st.bandId && it.needsBand.indexOf(st.bandId) < 0) continue;
      if (!b || it.mass < b.mass) b = it;
    }
    return b;
  }
  var plans = [];
  for (var i = 0; i < objs.length; i++) {
    var set = [], mass = 0, okAll = true;
    for (var j = 0; j < objs[i].instr.length; j++) {
      var b = bestFor(objs[i].instr[j]);
      if (!b) { okAll = false; break; }
      set.push(b); mass += b.mass;
    }
    if (okAll) plans.push({ obj: objs[i], set: set, ratio: objs[i].value / Math.max(1, mass) });
  }
  plans.sort(function (a, b) { return b.ratio - a.ratio; });
  var pick = [], massNow = 0;
  for (i = 0; i < plans.length; i++) {
    var add = 0, fresh = [];
    for (j = 0; j < plans[i].set.length; j++) if (pick.indexOf(plans[i].set[j].id) < 0 && fresh.indexOf(plans[i].set[j].id) < 0) { add += plans[i].set[j].mass; fresh.push(plans[i].set[j].id); }
    if (massNow + add > c.bus.payloadMax * 0.95) continue;
    /* keep a 15% budget reserve for the rocket, the link and operations */
    var trial = cloneState(st); trial.instruments = pick.concat(fresh);
    if (trial.auto !== false) autoSizeInto(trial);
    /* count the rocket and the ground station even before they are chosen */
    if (!trial.groundId) trial.groundId = c.dest.commAu > 0.05 ? 'dsn34' : 'comm13';
    if (!trial.launcherId) trial.launcherId = recommend(ENG.compute(trial)).lv;
    if (pick.length && ENG.compute(trial).cost.marginPct < 0.15) continue;
    pick = pick.concat(fresh); massNow += add;
  }
  return pick;
}

function sciencePanel(c) {
  if (!c.bus) return '';
  var es = LANG === 'es';
  var st = cloneState(S); st.instruments = autoInstruments(S);
  var names = [];
  for (var i = 0; i < st.instruments.length; i++) names.push(L(DATA.find(DATA.instruments, st.instruments[i]).name));
  var val = 0, sc = ENG.compute(st);
  for (i = 0; i < sc.coverage.length; i++) if (sc.coverage[i].full) val += sc.coverage[i].obj.value;
  return '<div class="assist"><div class="assist-head">' + icon('spark', 'ico') + '<div><b>' +
    esc(es ? 'Asistente científico' : 'Science assistant') + '</b><span>' +
    esc(es ? 'Propone los instrumentos con más valor científico por kilo que caben en tu bus, guardando 15% del presupuesto para el cohete y las operaciones.' : 'Proposes the instruments with the most science value per kilogram that fit your bus, keeping 15% of the budget for the rocket and operations.') +
    '</span></div></div><div class="assist-body"><div class="assist-out">' +
    (names.length ? '<b>' + esc(names.join(' + ')) + '</b><span>' + val + ' ' + esc(t('science_value')) + ' · ' + n0(sc.mass.payload) + ' / ' + c.bus.payloadMax + ' kg</span>'
      : '<span>' + esc(es ? 'Ningún instrumento cabe en este bus: elige uno mayor.' : 'No instrument fits this bus: pick a larger one.') + '</span>') +
    '</div>' + (names.length ? '<button class="btn primary" data-act="autosci">' + icon('spark', 'ico') + esc(es ? 'Usar esta selección' : 'Use this selection') + '</button>' : '') +
    '</div>' + autoToggle() + '</div>';
}

/* ---------------------------------------------------------------- *
 * phase 4: link solver                                              *
 * ---------------------------------------------------------------- */
/* every antenna × amplifier × band × station the bus can carry, the
   cheapest that downlinks 120% of the data with power to spare */
var LINK_MEMO = { key: null, val: null };
function solveLink(st0) {
  var probe = cloneState(st0);
  probe.antennaD = probe.twtaW = probe.bandId = probe.groundId = null;
  var key = JSON.stringify([probe.programId, probe.destId, probe.busId, probe.propId, probe.powerType, probe.instruments, probe.shieldingId, probe.edlId, probe.auto, probe.staff, probe.auto === false ? [probe.arrayArea, probe.batteryWh, probe.propellantKg, probe.rtgUnits] : 0]);
  if (LINK_MEMO.key === key) return LINK_MEMO.val;
  LINK_MEMO.key = key;
  return (LINK_MEMO.val = solveLinkRaw(st0));
}
function solveLinkRaw(st0) {
  var c0 = ENG.compute(st0);
  if (!c0.dest || !c0.bus) return null;
  var best = null, bestCost = Infinity;
  for (var a = 0; a < DATA.antennas.length; a++) {
    var d = DATA.antennas[a];
    if (d > c0.bus.antennaMax) continue;
    for (var w = 0; w < DATA.twtas.length; w++) for (var b = 0; b < DATA.bands.length; b++) for (var g = 0; g < DATA.grounds.length; g++) {
      /* deep space is tracked by the DSN, not by a commercial dish */
      if (c0.dest.commAu > 0.05 && DATA.grounds[g].dia < 34) continue;
      var st = cloneState(st0);
      st.antennaD = d; st.twtaW = DATA.twtas[w]; st.bandId = DATA.bands[b].id; st.groundId = DATA.grounds[g].id;
      var c = ENG.compute(st);
      /* the data rate does not depend on sizing: filter first, size after */
      if (c.link.collectGbPerTurn > 0 && c.link.ratio < 1.2) continue;
      if (st.auto !== false) { autoSizeInto(st); c = ENG.compute(st); }
      if (hasLinkViol(c)) continue;
      if (c.power.margin < 0 || (c.prop && c.dv.margin < 0)) continue;
      var cost = c.cost.total;
      if (cost < bestCost) { bestCost = cost; best = { st: st, c: c }; }
    }
  }
  return best;
}
function hasLinkViol(c) {
  for (var i = 0; i < c.viol.length; i++) {
    var s = c.viol[i].en;
    if (/antenna|Ka band|requires X/.test(s)) return true;
  }
  return false;
}

function linkPanel(c) {
  if (!c.bus) return '';
  var es = LANG === 'es', sol = solveLink(S);
  var body;
  if (sol) {
    var g = DATA.find(DATA.grounds, sol.st.groundId), bd = DATA.find(DATA.bands, sol.st.bandId);
    body = '<div class="assist-out"><b>' + sol.st.antennaD + ' m · ' + esc(L(bd.name)) + ' · ' + sol.st.twtaW + ' W · ' + esc(L(g.name)) + '</b><span>' +
      bps(sol.c.link.bps) + ' · ' + esc(es ? 'cobertura' : 'coverage') + ' ' + n0(sol.c.link.ratio * 100) + '% · ' + money(sol.c.cost.total) + '</span></div>' +
      '<button class="btn primary" data-act="autolink">' + icon('dish', 'ico') + esc(es ? 'Usar este enlace' : 'Use this link') + '</button>';
  } else body = '<div class="assist-out"><span>' + esc(es ? 'Ninguna combinación baja todos los datos: quita un instrumento o usa un bus con antena mayor.'
    : 'No combination downlinks all the data: drop an instrument or use a bus with a larger antenna.') + '</span></div>';
  return '<div class="assist"><div class="assist-head">' + icon('spark', 'ico') + '<div><b>' +
    esc(es ? 'Asistente de telecomunicaciones' : 'Telecom assistant') + '</b><span>' +
    esc(es ? 'Prueba todas las antenas, amplificadores, bandas y estaciones y elige la más barata que baja el 120% de tus datos.'
      : 'Tries every antenna, amplifier, band and station and picks the cheapest that downlinks 120% of your data.') +
    '</span></div></div><div class="assist-body">' + body + '</div>' + autoToggle() + '</div>';
}

/* ---------------------------------------------------------------- *
 * phase 5: rocket                                                   *
 * ---------------------------------------------------------------- */
function launchPanel(c) {
  var es = LANG === 'es', rec = recommend(c), lv = rec.lv ? DATA.find(DATA.launchers, rec.lv) : null;
  var body = lv
    ? '<div class="assist-out"><b>' + esc(L(lv.name)) + '</b><span>' + n0(lv.cap[c.dest.c3]) + ' kg ' + esc(es ? 'de capacidad para tus ' : 'of capability for your ') + n0(c.mass.launch) + ' kg · ' +
      n1(lv.reliability * 100) + '% ' + esc(es ? 'fiabilidad' : 'reliability') + ' · ' + money(lv.cost) + '</span></div>' +
      (S.launcherId === lv.id ? '<span class="ck ok">✓ ' + esc(es ? 'Elegido' : 'Selected') + '</span>'
        : '<button class="btn primary" data-act="pick" data-k="launcherId" data-v="' + lv.id + '">' + icon('rocket', 'ico') + esc(es ? 'Elegir este cohete' : 'Pick this rocket') + '</button>')
    : '<div class="assist-out"><span>' + esc(es ? 'Ningún cohete fiable lleva esta masa con 10% de margen. Aligera la nave.' : 'No reliable rocket carries this mass with a 10% margin. Lighten the spacecraft.') + '</span></div>';
  return '<div class="assist"><div class="assist-head">' + icon('spark', 'ico') + '<div><b>' +
    esc(es ? 'Asistente de lanzamiento' : 'Launch assistant') + '</b><span>' +
    esc(es ? 'El cohete más barato que lleva tu nave con 10% de margen y al menos 90% de fiabilidad. La barra de cada cohete muestra cuánto de su capacidad usas.'
      : 'The cheapest rocket that carries your spacecraft with a 10% margin and at least 90% reliability. Each rocket’s bar shows how much of its capability you use.') +
    '</span></div></div><div class="assist-body">' + body + '</div><div class="auto-row">' + labBtn('trade') + '</div></div>';
}
