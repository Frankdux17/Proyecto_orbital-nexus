/* ORBITAL NEXUS — game feel: sound, badges, toasts, autosave, difficulty, keyboard */

/* ---------------------------------------------------------------- *
 * explorers — several people use the same screen, so each one keeps *
 * a separate game under their name. No password, no account: the    *
 * name only picks which saved progress to load. Everything below in *
 * PROFILE_KEYS is stored once per explorer; language, sound and     *
 * what NEXUS learned are shared by everyone on this browser.        *
 * ---------------------------------------------------------------- */
var PROFILE_KEYS = ['on_save', 'on_badges', 'on_dests', 'on_crew', 'on_portal', 'on_scan_lv', 'on_tour', 'on_diff', 'on_ascent_help'];
var PROFILE = null;   /* { id, name } or null for a guest */
function pkey(k, id) {
  if (id === undefined) id = PROFILE ? PROFILE.id : '';
  return id && PROFILE_KEYS.indexOf(k) >= 0 ? k + '::' + id : k;
}
function pref(k, def) { try { var v = localStorage.getItem(pkey(k)); return v == null ? def : v; } catch (e) { return def; } }
function setPref(k, v) { try { localStorage.setItem(pkey(k), v); } catch (e) { } }

function profNorm(s) {
  return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, ' ').trim().replace(/ /g, '-');
}
function profList() {
  try { var l = JSON.parse(localStorage.getItem('on_profiles')); return Array.isArray(l) ? l : []; } catch (e) { return []; }
}
function profStore(l) { try { localStorage.setItem('on_profiles', JSON.stringify(l)); } catch (e) { } }
function profTab(v) {
  try {
    if (v === undefined) return sessionStorage.getItem('on_profile_tab');
    sessionStorage.setItem('on_profile_tab', v);
  } catch (e) { }
  return null;
}
/* what one explorer has done so far; id '' is the guest */
function profSummary(id) {
  function g(k) { try { return JSON.parse(localStorage.getItem(pkey(k, id || ''))); } catch (e) { return null; } }
  function count(o) { var n = 0; for (var k in (o || {})) if (o[k]) n++; return n; }
  var sv = g('on_save');
  var s = { save: sv && sv.phase > 0 ? sv : null, badges: count(g('on_badges')), scan: count(g('on_scan_lv')), portal: count(g('on_portal')), dests: (g('on_dests') || []).length };
  s.any = !!(s.save || s.badges || s.scan || s.portal);
  return s;
}
function profSummaryText(s) {
  var es = LANG === 'es', p = [];
  if (s.save) {
    var d = DATA.find(DATA.destinations, s.save.destId);
    p.push((es ? 'misión en fase ' : 'mission in phase ') + Math.min(s.save.phase, 7) + (es ? ' de 7, ' : ' of 7, ') + t(STEPS[Math.min(s.save.phase, 7) - 1]).toLowerCase() +
      (d ? (es ? ', rumbo a ' : ', bound for ') + L(d.name) : '') + (s.save.phase === 6 ? (es ? ', turno ' : ', turn ') + s.save.turn : ''));
  }
  if (s.badges) p.push(s.badges + (es ? ' de ' : ' of ') + BADGES.length + (es ? ' insignias' : ' badges'));
  if (s.scan) p.push((es ? 'escáner: ' : 'scanner: ') + s.scan + (es ? ' de 5 niveles' : ' of 5 levels'));
  if (s.portal) p.push((es ? 'portal: ' : 'portal: ') + s.portal + (es ? ' de 4 rescates' : ' of 4 rescues'));
  return p.length ? p.join(' · ') : (es ? 'sin avance todavía' : 'no progress yet');
}
/* enter as this name: a known name loads its game, a new one starts clean.
   A guest who types a name in the middle of a mission keeps that mission. */
function profEnter(name) {
  name = String(name || '').replace(/[<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, 28);
  var id = profNorm(name);
  if (!id) return null;
  var list = profList(), p = null;
  for (var i = 0; i < list.length; i++) if (list[i].id === id) p = list[i];
  if (p && PROFILE && PROFILE.id === id) return { isNew: false, same: true };   /* already playing as this name */
  var isNew = !p, carry = isNew && !PROFILE && S && S.phase > 0;
  if (!carry && S && S.phase > 0) saveGame();
  if (isNew) { p = { id: id, name: name, created: Date.now() }; list.push(p); }
  p.seen = Date.now();
  profStore(list);
  PROFILE = { id: id, name: p.name };
  profTab(id);
  if (isNew) setPref('on_crew', JSON.stringify({ cmd: name }));
  if (carry) { try { localStorage.removeItem('on_save'); } catch (e) { } saveGame(); }
  else S = freshState();
  return { isNew: isNew, carried: carry };
}
/* go back to playing without a name */
function profGuest() {
  if (S && S.phase > 0) saveGame();
  PROFILE = null; profTab('-');
  S = freshState();
}
/* same tab, page reloaded: keep whoever was playing */
function profRestore() {
  var id = profTab();
  if (!id) return false;
  if (id === '-') return true;
  var list = profList();
  for (var i = 0; i < list.length; i++) if (list[i].id === id) { PROFILE = { id: id, name: list[i].name }; return true; }
  return false;
}
/* erase one explorer's progress (the name stays in the list) */
function profWipe(id) {
  PROFILE_KEYS.forEach(function (k) { if (k !== 'on_crew') { try { localStorage.removeItem(pkey(k, id || '')); } catch (e) { } } });
}

/* ---------------------------------------------------------------- *
 * difficulty — three levels, like the NASA telescope game           *
 * ev: anomaly probability multiplier · bonus: extra reserve as a    *
 * fraction of the program budget · zone: width of the burn window   *
 * ---------------------------------------------------------------- */
var DIFF = {
  cadet: { ev: 0.6, bonus: 0.08, zone: 0.24,
    name: { es: 'Cadete', en: 'Cadet' },
    desc: { es: 'Menos anomalías, reserva extra y ventanas de maniobra amplias. Ideal para una primera misión.',
            en: 'Fewer anomalies, extra reserve and wide burn windows. Ideal for a first mission.' } },
  eng: { ev: 1, bonus: 0, zone: 0.15,
    name: { es: 'Ingeniero', en: 'Engineer' },
    desc: { es: 'El modelo tal cual: los márgenes que exige una revisión de diseño real.',
            en: 'The model as it is: the margins a real design review demands.' } },
  dir: { ev: 1.35, bonus: 0, zone: 0.08,
    name: { es: 'Director de vuelo', en: 'Flight director' },
    desc: { es: 'El espacio es más hostil y las maniobras no perdonan. Para tripulaciones veteranas.',
            en: 'Space is more hostile and burns are unforgiving. For veteran crews.' } }
};

/* ---------------------------------------------------------------- *
 * sound — tiny WebAudio synth, no files                             *
 * ---------------------------------------------------------------- */
var SFX = (function () {
  var ctx = null, muted = pref('on_mute', '0') === '1';
  function ac() {
    if (muted) return null;
    if (!ctx) { try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return null; } }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }
  function tone(freq, dur, type, vol, delay, slideTo) {
    var a = ac(); if (!a) return;
    var t0 = a.currentTime + (delay || 0);
    var o = a.createOscillator(), g = a.createGain();
    o.type = type || 'sine';
    o.frequency.setValueAtTime(freq, t0);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol || 0.08, t0 + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g); g.connect(a.destination);
    o.start(t0); o.stop(t0 + dur + 0.05);
  }
  function noise(dur, vol, cutoff, delay) {
    var a = ac(); if (!a) return;
    var t0 = a.currentTime + (delay || 0);
    var len = Math.floor(a.sampleRate * dur), buf = a.createBuffer(1, len, a.sampleRate), d = buf.getChannelData(0);
    for (var i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    var src = a.createBufferSource(), f = a.createBiquadFilter(), g = a.createGain();
    src.buffer = buf; f.type = 'lowpass'; f.frequency.value = cutoff || 400;
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol || 0.2, t0 + Math.min(0.4, dur * 0.2));
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(f); f.connect(g); g.connect(a.destination);
    src.start(t0); src.stop(t0 + dur);
  }
  return {
    isMuted: function () { return muted; },
    toggle: function () { muted = !muted; setPref('on_mute', muted ? '1' : '0'); if (!muted) this.tick(); return muted; },
    tick: function () { tone(1400, 0.05, 'triangle', 0.03); },
    go: function () { tone(660, 0.07, 'triangle', 0.05); tone(990, 0.09, 'triangle', 0.05, 0.06); },
    beep: function (hi) { tone(hi ? 880 : 440, hi ? 0.5 : 0.14, 'square', 0.035); },
    rumble: function (dur) { noise(dur || 4, 0.32, 260); },
    thump: function () { noise(0.35, 0.25, 160); tone(90, 0.3, 'sine', 0.12, 0, 40); },
    boom: function () { noise(2.2, 0.5, 700); tone(70, 1.4, 'sawtooth', 0.12, 0, 25); },
    chime: function () { tone(784, 0.35, 'sine', 0.06); tone(1046, 0.4, 'sine', 0.06, 0.12); tone(1318, 0.6, 'sine', 0.06, 0.24); },
    alarm: function () { tone(740, 0.16, 'square', 0.04); tone(560, 0.16, 'square', 0.04, 0.2); tone(740, 0.16, 'square', 0.04, 0.4); },
    data: function () { tone(1800, 0.04, 'sine', 0.025); tone(2400, 0.04, 'sine', 0.025, 0.05); },
    fail: function () { tone(330, 0.5, 'sawtooth', 0.05, 0, 110); }
  };
})();

/* ---------------------------------------------------------------- *
 * toasts                                                            *
 * ---------------------------------------------------------------- */
function toast(html, cls) {
  var box = document.getElementById('toasts');
  if (!box) { box = document.createElement('div'); box.id = 'toasts'; box.className = 'toasts'; box.setAttribute('aria-live', 'polite'); document.body.appendChild(box); }
  var el = document.createElement('div');
  el.className = 'toast ' + (cls || '');
  el.innerHTML = html;
  box.appendChild(el);
  setTimeout(function () { el.classList.add('out'); }, 3600);
  setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 4100);
}

/* ---------------------------------------------------------------- *
 * badges — kept per explorer in localStorage                        *
 * ---------------------------------------------------------------- */
var BADGES = [
  { id: 'liftoff', icon: '🚀', name: { es: 'Despegue', en: 'Liftoff' }, desc: { es: 'Lanza una misión con éxito.', en: 'Launch a mission successfully.' } },
  { id: 'burn', icon: '🎯', name: { es: 'Quemado perfecto', en: 'Perfect burn' }, desc: { es: 'Precisión ≥ 90 % en la maniobra de llegada.', en: '≥ 90 % accuracy on the arrival manoeuvre.' } },
  { id: 'landed', icon: '🪂', name: { es: 'Siete minutos de terror', en: 'Seven minutes of terror' }, desc: { es: 'Aterriza en Marte.', en: 'Land on Mars.' } },
  { id: 'survivor', icon: '🛰️', name: { es: 'Misión completa', en: 'Full mission' }, desc: { es: 'Opera todos los turnos sin perder la nave.', en: 'Operate every turn without losing the spacecraft.' } },
  { id: 'allobj', icon: '🔭', name: { es: 'Ciencia total', en: 'Full science' }, desc: { es: 'Cumple el 100 % de todos los objetivos.', en: 'Meet 100 % of every objective.' } },
  { id: 'nobits', icon: '💾', name: { es: 'Ni un bit perdido', en: 'Not a bit lost' }, desc: { es: 'Termina sin saturar nunca la memoria.', en: 'Finish without ever saturating memory.' } },
  { id: 'frugal', icon: '💰', name: { es: 'Bajo presupuesto', en: 'Under budget' }, desc: { es: 'Termina con al menos 15 % de reserva.', en: 'Finish with at least 15 % reserve.' } },
  { id: 'gradeS', icon: '🏆', name: { es: 'Leyenda de la NASA', en: 'NASA legend' }, desc: { es: 'Obtén calificación S.', en: 'Earn an S grade.' } },
  { id: 'europa', icon: '🧊', name: { es: 'Océano bajo el hielo', en: 'Ocean under the ice' }, desc: { es: 'Completa la misión a Europa.', en: 'Complete the Europa mission.' } },
  { id: 'director', icon: '🎖️', name: { es: 'Director de vuelo', en: 'Flight director' }, desc: { es: 'Completa una misión en la dificultad más alta.', en: 'Complete a mission on the hardest difficulty.' } },
  { id: 'explorer', icon: '🌌', name: { es: 'Explorador del sistema solar', en: 'Solar system explorer' }, desc: { es: 'Completa misiones a 3 destinos distintos.', en: 'Complete missions to 3 different destinations.' } },
  { id: 'pilot', icon: '🧑‍🚀', name: { es: 'Piloto de ascenso', en: 'Ascent pilot' }, desc: { es: 'Lleva tu misión a órbita pilotando el cohete a mano.', en: 'Fly your mission to orbit by hand.' } },
  { id: 'trainee', icon: '🎮', name: { es: 'Graduado del simulador', en: 'Simulator graduate' }, desc: { es: 'Alcanza la órbita en el simulador de despegue.', en: 'Reach orbit in the launch simulator.' } },
  { id: 'navigator2', icon: '🧭', name: { es: 'Navegación de precisión', en: 'Precision navigation' }, desc: { es: 'Llega dentro del corredor tras las correcciones de trayectoria.', en: 'Arrive inside the corridor after the trajectory corrections.' } },
  { id: 'patience', icon: '⛈️', name: { es: 'Paciencia de la sala', en: 'Launch-room patience' }, desc: { es: 'Pospón por clima y lanza después con todo en GO.', en: 'Scrub for weather, then launch with everything GO.' } },
  { id: 'nogo', icon: '🎲', name: { es: 'Temerario', en: 'Daredevil' }, desc: { es: 'Lanza con el clima en NO-GO.', en: 'Launch with a weather NO-GO.' } },
  { id: 'teamwork', icon: '🤝', name: { es: 'Trabajo en equipo', en: 'Teamwork' }, desc: { es: 'Resuelve una falla con la solución de tu centro de control.', en: 'Fix a failure with your mission control team\'s solution.' } },
  { id: 'engineer', icon: '🧮', name: { es: 'Ingeniero de cálculo', en: 'Number cruncher' }, desc: { es: 'Abre el Laboratorio de ingeniería y haz tus propios cálculos.', en: 'Open the Engineering lab and run your own numbers.' } },
  { id: 'teacher', icon: '🧠', name: { es: 'Mentor de NEXUS', en: 'NEXUS mentor' }, desc: { es: 'Enseña a NEXUS algo que no sabía.', en: 'Teach NEXUS something it did not know.' } },
  { id: 'portal', icon: '🌀', name: { es: 'Rescatista del futuro', en: 'Rescuer of the future' }, desc: { es: 'Completa las cuatro misiones del portal cuántico.', en: 'Complete all four quantum portal missions.' } },
  { id: 'hunter', icon: '🔭', name: { es: 'Cazador de biofirmas', en: 'Biosignature hunter' }, desc: { es: 'Confirma todas las señales de un mundo con el escáner orbital.', en: 'Confirm every signal on one world with the orbital scanner.' } },
  { id: 'titan', icon: '🚁', name: { es: 'Volar en otro mundo', en: 'Flying on another world' }, desc: { es: 'Completa la misión a Titán.', en: 'Complete the Titan mission.' } },
  { id: 'psyche', icon: '🔩', name: { es: 'Corazón de metal', en: 'Heart of metal' }, desc: { es: 'Completa la misión al asteroide Psyche.', en: 'Complete the Psyche mission.' } },
  { id: 'navigator', icon: '🪐', name: { es: 'Navegante 3D', en: '3D navigator' }, desc: { es: 'Recorre la trayectoria de una misión en el Explorador 3D.', en: 'Fly through a mission trajectory in the 3D Explorer.' } }
];

function badgesOwned() { try { return JSON.parse(pref('on_badges', '{}')) || {}; } catch (e) { return {}; } }
function award(id) {
  var own = badgesOwned();
  if (own[id]) return false;
  own[id] = Date.now();
  setPref('on_badges', JSON.stringify(own));
  var b = null;
  for (var i = 0; i < BADGES.length; i++) if (BADGES[i].id === id) b = BADGES[i];
  if (!b) return false;
  if (S && S.newBadges) S.newBadges.push(id);
  SFX.chime();
  toast('<span class="toast-ic">' + b.icon + '</span><span><b>' + esc(LANG === 'es' ? 'Insignia desbloqueada' : 'Badge unlocked') +
    '</b>' + esc(L(b.name)) + '</span>', 'gold');
  return true;
}

function badgeShelf(highlight) {
  var own = badgesOwned(), n = 0, h = '';
  for (var i = 0; i < BADGES.length; i++) {
    var b = BADGES[i], got = !!own[b.id];
    if (got) n++;
    if (highlight && highlight.indexOf(b.id) < 0) continue;
    h += '<div class="badge' + (got ? ' got' : '') + '" title="' + esc(L(b.desc)) + '"><span class="badge-ic">' + (got ? b.icon : '🔒') +
      '</span><span class="badge-n">' + esc(L(b.name)) + '</span><span class="badge-d">' + esc(L(b.desc)) + '</span></div>';
  }
  return { html: h, count: n, total: BADGES.length };
}

/* evaluated once when a mission reaches the report */
function checkEndBadges(c, sc) {
  if (S.badgesChecked) return;
  S.badgesChecked = true;
  if (!S.launchSuccess) return;
  var full = S.alive && S.turn >= c.opsTurns;
  if (full) award('survivor');
  var all = sc.objectives.length > 0;
  for (var i = 0; i < sc.objectives.length; i++) if (sc.objectives[i].frac < 1) all = false;
  if (all) award('allobj');
  if (full && !S.overflow) award('nobits');
  if (full && c.cost.budget > 0 && S.budgetLeft / c.cost.budget >= 0.15) award('frugal');
  if (sc.grade === 'S') award('gradeS');
  if (full && c.dest.id === 'europa') award('europa');
  if (full && c.dest.id === 'titan') award('titan');
  if (full && c.dest.id === 'psyche') award('psyche');
  if (full && S.diff === 'dir') award('director');
  if (full) {
    var seen = [];
    try { seen = JSON.parse(pref('on_dests', '[]')) || []; } catch (e) { seen = []; }
    if (seen.indexOf(c.dest.id) < 0) seen.push(c.dest.id);
    setPref('on_dests', JSON.stringify(seen));
    if (seen.length >= 3) award('explorer');
  }
}

/* ---------------------------------------------------------------- *
 * autosave — short sessions: a crew break can end mid-mission       *
 * ---------------------------------------------------------------- */
function saveGame() {
  try {
    if (S.phase > 0) localStorage.setItem(pkey('on_save'), JSON.stringify(S));
  } catch (e) { }
}
function loadSave() {
  try {
    var s = JSON.parse(localStorage.getItem(pkey('on_save')));
    return s && s.phase > 0 ? s : null;
  } catch (e) { return null; }
}
function clearSave() { try { localStorage.removeItem(pkey('on_save')); } catch (e) { } }

/* ---------------------------------------------------------------- *
 * keyboard: Enter advances, 1–4 picks an event response             *
 * ---------------------------------------------------------------- */
var OVERLAY_OPEN = false;
function wireFx() {
  document.addEventListener('keydown', function (e) {
    if (OVERLAY_OPEN || e.ctrlKey || e.metaKey || e.altKey) return;
    var modalOpen = !document.getElementById('modal-back').hidden;
    if (modalOpen && /^[1-4]$/.test(e.key)) {
      var ch = document.querySelectorAll('#modal .choice')[parseInt(e.key, 10) - 1];
      if (ch) { e.preventDefault(); ch.click(); }
      return;
    }
    if (e.key === 'Enter' && !modalOpen) {
      var ae = document.activeElement;
      if (ae && ae !== document.body && ae.type !== 'range') return;
      var nb = document.getElementById('btn-next');
      if (!document.getElementById('navbar').hidden && !nb.disabled) { e.preventDefault(); nb.click(); }
    }
  });

  document.addEventListener('click', function (e) {
    var el = e.target.closest ? e.target.closest('[data-act],.btn,.pill') : null;
    if (el && !el.disabled) SFX.tick();
  }, true);

  var snd = document.getElementById('snd-toggle');
  function paint() {
    var m = SFX.isMuted();
    snd.classList.toggle('muted', m);
    snd.setAttribute('aria-pressed', m ? 'false' : 'true');
    snd.title = LANG === 'es' ? (m ? 'Activar sonido' : 'Silenciar') : (m ? 'Turn sound on' : 'Mute');
  }
  snd.addEventListener('click', function () { SFX.toggle(); paint(); });
  paint();
}
