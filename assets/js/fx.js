/* ORBITAL NEXUS — game feel: sound, badges, toasts, autosave, difficulty, keyboard */

function pref(k, def) { try { var v = localStorage.getItem(k); return v == null ? def : v; } catch (e) { return def; } }
function setPref(k, v) { try { localStorage.setItem(k, v); } catch (e) { } }

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
 * badges — kept per viewer in localStorage                          *
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
  { id: 'explorer', icon: '🌌', name: { es: 'Explorador del sistema solar', en: 'Solar system explorer' }, desc: { es: 'Completa misiones a 3 destinos distintos.', en: 'Complete missions to 3 different destinations.' } }
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
    if (S.phase > 0) localStorage.setItem('on_save', JSON.stringify(S));
  } catch (e) { }
}
function loadSave() {
  try {
    var s = JSON.parse(localStorage.getItem('on_save'));
    return s && s.phase > 0 ? s : null;
  } catch (e) { return null; }
}
function clearSave() { try { localStorage.removeItem('on_save'); } catch (e) { } }

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
