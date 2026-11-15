/* ORBITAL NEXUS — a friendlier game.
   A mission status ring that says what is missing and fixes it on request,
   tap-to-explain jargon, a three-step welcome tour, and a small celebration
   the first time each phase's design closes. */

/* ---------------------------------------------------------------- *
 * glossary                                                          *
 * ---------------------------------------------------------------- */
var GLOSS = [
  { id: 'dv', m: ['Δv', 'delta-v'], es: ['Delta-v (Δv)', 'Cuánto puede cambiar su velocidad la nave con su propio motor. Cada maniobra «gasta» Δv, como gasolina medida en km/s.'],
    en: ['Delta-v (Δv)', 'How much the spacecraft can change its own speed with its engine. Every manoeuvre “spends” Δv, like fuel measured in km/s.'] },
  { id: 'isp', m: ['Isp'], es: ['Impulso específico (Isp)', 'La eficiencia de un motor, en segundos. Más Isp = el mismo empuje con menos combustible. Gas frío ~65 s, hidracina ~228 s, iónico ~3000 s.'],
    en: ['Specific impulse (Isp)', 'An engine’s efficiency, in seconds. More Isp = the same push with less fuel. Cold gas ~65 s, hydrazine ~228 s, ion ~3000 s.'] },
  { id: 'c3', m: ['C3'], es: ['Energía de lanzamiento (C3)', 'La energía que el cohete le deja a la nave para escapar de la Tierra, en km²/s². Marte pide ~12; Júpiter ~80. A más C3, menos masa puede llevar el cohete.'],
    en: ['Launch energy (C3)', 'The energy the rocket leaves the spacecraft with to escape Earth, in km²/s². Mars needs ~12; Jupiter ~80. More C3, less mass the rocket can carry.'] },
  { id: 'rtg', m: ['MMRTG', 'RTG'], es: ['RTG (generador de radioisótopos)', 'Produce electricidad con el calor del plutonio-238. Funciona lejos del Sol y de noche, donde los paneles no sirven. Lo llevan Curiosity y Perseverance.'],
    en: ['RTG (radioisotope generator)', 'Makes electricity from the heat of plutonium-238. Works far from the Sun and at night, where arrays fail. Curiosity and Perseverance carry one.'] },
  { id: 'twta', m: ['TWTA'], es: ['TWTA (amplificador)', 'El «altavoz» de la radio de la nave: amplifica la señal antes de la antena. Más vatios = más datos, pero también más consumo.'],
    en: ['TWTA (amplifier)', 'The “loudspeaker” of the spacecraft radio: it boosts the signal before the antenna. More watts = more data, and more power drawn.'] },
  { id: 'eirp', m: ['EIRP'], es: ['EIRP', 'La potencia efectiva que sale de la antena en dirección a la Tierra: potencia del transmisor × ganancia de la antena.'],
    en: ['EIRP', 'The effective power leaving the antenna towards Earth: transmitter power × antenna gain.'] },
  { id: 'ebn0', m: ['Eb/N0'], es: ['Eb/N0', 'Energía de cada bit frente al ruido. Si es muy baja, los datos llegan con errores; la codificación moderna necesita ~6 dB.'],
    en: ['Eb/N0', 'Energy per bit against noise. Too low and the data arrives corrupted; modern coding needs ~6 dB.'] },
  { id: 'gt', m: ['G/T'], es: ['G/T (figura de mérito)', 'Qué tan bien escucha una antena en tierra: su ganancia dividida por su ruido. Las antenas de 70 m de la DSN son las mejores del mundo.'],
    en: ['G/T (figure of merit)', 'How well a ground antenna listens: its gain divided by its noise. The DSN 70 m dishes are the best in the world.'] },
  { id: 'krad', m: ['krad'], es: ['krad (dosis de radiación)', 'Unidad de radiación acumulada. La electrónica común aguanta 10–30 krad; cerca de Júpiter se reciben cientos o miles.'],
    en: ['krad (radiation dose)', 'Unit of accumulated radiation. Ordinary electronics survive 10–30 krad; near Jupiter you collect hundreds or thousands.'] },
  { id: 'au', m: ['UA', 'AU'], es: ['Unidad astronómica (UA)', 'La distancia media entre la Tierra y el Sol: unos 150 millones de km. Marte está a ~1,5 UA del Sol; Júpiter a 5,2.'],
    en: ['Astronomical unit (AU)', 'The mean Earth–Sun distance: about 150 million km. Mars is ~1.5 AU from the Sun; Jupiter 5.2.'] },
  { id: 'dsn', m: ['DSN'], es: ['DSN (Red del Espacio Profundo)', 'Las antenas gigantes de la NASA en California, Madrid y Canberra: siempre hay una mirando a tu nave mientras la Tierra gira.'],
    en: ['DSN (Deep Space Network)', 'NASA’s giant antennas in California, Madrid and Canberra: one always faces your spacecraft as Earth turns.'] },
  { id: 'maxq', m: ['Max-Q'], es: ['Max-Q', 'El momento del ascenso con la mayor presión del aire sobre el cohete. Si se pasa del límite estructural, el cohete se rompe.'],
    en: ['Max-Q', 'The moment of the ascent with the highest air pressure on the rocket. Past the structural limit, the rocket breaks up.'] },
  { id: 'peri', m: ['perigeo', 'perigee'], es: ['Perigeo', 'El punto de la órbita más cercano a la Tierra. Si queda por debajo de ~160 km, la atmósfera frena la nave y cae.'],
    en: ['Perigee', 'The point of the orbit closest to Earth. Below ~160 km the atmosphere drags the spacecraft down.'] },
  { id: 'hoh', m: ['Hohmann'], es: ['Transferencia de Hohmann', 'La forma más barata de pasar de una órbita circular a otra: media elipse con un encendido al salir y otro al llegar.'],
    en: ['Hohmann transfer', 'The cheapest way from one circular orbit to another: half an ellipse with one burn to leave and one to arrive.'] },
  { id: 'pareto', m: ['Pareto'], es: ['Frontera de Pareto', 'Las opciones que ninguna otra supera en dos cosas a la vez. Aquí: ningún diseño es a la vez más barato y más seguro que ellas.'],
    en: ['Pareto front', 'The options nothing else beats on two things at once. Here: no design is both cheaper and safer than them.'] },
  { id: 'capcom', m: ['CAPCOM'], es: ['CAPCOM', 'La única voz que habla con la nave o la tripulación desde el control de misión; tradicionalmente un astronauta.'],
    en: ['CAPCOM', 'The single voice that talks to the spacecraft or crew from mission control; traditionally an astronaut.'] },
  { id: 'fido', m: ['FIDO'], es: ['FIDO (navegación)', 'El oficial de dinámica de vuelo: calcula dónde está la nave con el rastreo desde Tierra y diseña las maniobras.'],
    en: ['FIDO (navigation)', 'The flight dynamics officer: works out where the spacecraft is from ground tracking and designs the burns.'] },
  { id: 'ka', m: ['banda Ka', 'Ka band', 'Banda Ka'], es: ['Banda Ka', 'Radio de 32 GHz: unas 10 veces más datos que la banda X con la misma antena, pero la lluvia en la Tierra la debilita.'],
    en: ['Ka band', '32 GHz radio: about 10 times the data of X band with the same antenna, but rain on Earth weakens it.'] },
  { id: 'bus', m: ['bus'], word: true, es: ['Bus', 'El chasis de la nave: estructura, computadora, energía, control térmico y de actitud. Los instrumentos científicos van montados encima.'],
    en: ['Bus', 'The spacecraft chassis: structure, computer, power, thermal and attitude control. The science instruments ride on top.'] },
  { id: 'eclipse', m: ['eclipse', 'Eclipse', 'eclipses'], word: true, es: ['Eclipse', 'El tiempo que la nave pasa en la sombra del planeta. Sin sol, vive solo de su batería.'],
    en: ['Eclipse', 'The time the spacecraft spends in the planet’s shadow. Without sunlight it lives on its battery alone.'] }
];
var GLOSS_SEL = '.card-desc, .hint, .phase-head p, .guide li, .coach-body p, .assist-head span, .lab-note, .lf > span, .lo > span, .alert span, .kit-desc, .auto-row span, .status-fix, .obj-need';

function glossFind(id) { for (var i = 0; i < GLOSS.length; i++) if (GLOSS[i].id === id) return GLOSS[i]; return null; }

/* wrap the first mention of each term inside each block of text */
function glossify(root) {
  if (!root) return;
  var blocks = root.querySelectorAll(GLOSS_SEL);
  for (var b = 0; b < blocks.length; b++) {
    var el = blocks[b];
    if (el.getAttribute('data-gl')) continue;
    el.setAttribute('data-gl', '1');
    for (var g = 0; g < GLOSS.length; g++) {
      var G = GLOSS[g], done = false;
      for (var m = 0; m < G.m.length && !done; m++) done = glossWrap(el, G, G.m[m]);
    }
  }
}
function glossWrap(el, G, term) {
  var walk = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, null), node;
  while ((node = walk.nextNode())) {
    if (node.parentNode.closest && node.parentNode.closest('.gl')) continue;
    var txt = node.nodeValue, i = txt.indexOf(term);
    while (i >= 0 && G.word && ((i > 0 && /[\wáéíóúñ]/i.test(txt[i - 1])) || /[\wáéíóúñ]/i.test(txt[i + term.length] || ''))) i = txt.indexOf(term, i + 1);
    if (i < 0) continue;
    var after = node.splitText(i);
    after.splitText(term.length);
    var span = document.createElement('span');
    span.className = 'gl'; span.setAttribute('data-g', G.id); span.setAttribute('role', 'button'); span.setAttribute('tabindex', '0');
    span.setAttribute('aria-label', term + ': ' + (LANG === 'es' ? 'ver explicación' : 'see explanation'));
    span.textContent = term;
    after.parentNode.replaceChild(span, after);
    return true;
  }
  return false;
}

function glossShow(el) {
  glossHide();
  var G = glossFind(el.getAttribute('data-g'));
  if (!G) return;
  var tx = LANG === 'es' ? G.es : G.en;
  var pop = document.createElement('div');
  pop.id = 'gl-pop'; pop.className = 'gl-pop'; pop.setAttribute('role', 'tooltip');
  pop.innerHTML = '<b>' + esc(tx[0]) + '</b><span>' + esc(tx[1]) + '</span>';
  document.body.appendChild(pop);
  var r = el.getBoundingClientRect(), w = Math.min(300, window.innerWidth - 24);
  pop.style.width = w + 'px';
  var left = Math.max(12, Math.min(window.innerWidth - w - 12, r.left + r.width / 2 - w / 2));
  var top = r.bottom + 8;
  if (top + pop.offsetHeight > window.innerHeight - 8) top = Math.max(8, r.top - pop.offsetHeight - 8);
  pop.style.left = left + 'px'; pop.style.top = top + 'px';
  el.classList.add('open');
  GL_Y = window.scrollY;
}
var GL_Y = 0;
function glossHide() {
  var p = document.getElementById('gl-pop');
  if (p) p.parentNode.removeChild(p);
  var o = document.querySelectorAll('.gl.open');
  for (var i = 0; i < o.length; i++) o[i].classList.remove('open');
}

/* ---------------------------------------------------------------- *
 * mission status ring                                               *
 * ---------------------------------------------------------------- */
function statusItems(c) {
  var es = LANG === 'es', it = [], p = S.phase;
  function add(ok, es1, en1, fixEs, fixEn, act) { it.push({ ok: !!ok, t: es ? es1 : en1, fix: es ? fixEs : fixEn, act: act }); }
  add(S.programId && S.destId, 'Misión y destino elegidos', 'Mission and destination chosen',
    'Elige una misión lista arriba o un programa y un destino.', 'Pick a ready mission above, or a program and a destination.', null);
  if (p >= 2) {
    add(c.bus && c.prop, 'Nave y motor elegidos', 'Spacecraft and engine chosen',
      'Toca el paquete «Equilibrada» del asistente.', 'Tap the “Balanced” package in the assistant.', 'kit');
    add(c.bus && c.mass.payload <= c.bus.payloadMax, 'Los instrumentos caben en el bus', 'Instruments fit the bus',
      'Elige un bus más grande o quita un instrumento.', 'Pick a larger bus or drop an instrument.', 'kit');
    add(c.prop && c.dv.margin >= 0, 'Combustible suficiente (Δv)', 'Enough fuel (Δv)',
      'Activa el dimensionado automático o elige un motor con más Isp.', 'Turn on automatic sizing or pick an engine with more Isp.', 'size');
    add(c.power.genEOL > 0 && c.power.margin >= 0, 'Energía suficiente hasta el final', 'Enough power to the end',
      'Activa el dimensionado automático o agrega paneles.', 'Turn on automatic sizing or add arrays.', 'size');
    if (c.battery.eclipseH > 0) add(c.battery.have >= c.battery.need, 'Batería para los eclipses', 'Battery for the eclipses',
      'Activa el dimensionado automático o sube la batería.', 'Turn on automatic sizing or raise the battery.', 'size');
  }
  if (p >= 3) {
    var cov = 0; for (var i = 0; i < c.coverage.length; i++) if (c.coverage[i].full) cov++;
    add(cov > 0, 'Al menos un objetivo científico cubierto', 'At least one science objective covered',
      'Usa la selección del asistente científico.', 'Use the science assistant’s selection.', 'sci');
  }
  if (p >= 4) {
    add(S.antennaD && S.groundId && c.link.ratio >= 1, 'El enlace baja todos los datos', 'The link downlinks all the data',
      'Usa el enlace que propone el asistente.', 'Use the link the assistant proposes.', 'link');
    add(!c.dest || !c.shd || c.shd.krad >= c.dest.radKrad, 'Blindaje contra la radiación', 'Radiation shielding',
      'Elige un blindaje que tolere la dosis del destino.', 'Pick shielding that tolerates the destination’s dose.', 'shield');
  }
  if (p >= 5) {
    add(S.launcherId && c.lvCap >= c.mass.launch, 'El cohete puede llevar la nave', 'The rocket can carry the spacecraft',
      'Elige el cohete que propone el asistente.', 'Pick the rocket the assistant proposes.', 'lv');
  }
  add(c.cost.margin >= 0, 'Dentro del presupuesto', 'Within budget',
    'Prueba el paquete «Económica» o quita un instrumento caro.', 'Try the “Lean” package or drop an expensive instrument.', p === 2 ? 'lean' : null);
  return it;
}

function statusPanel(c) {
  if (S.phase < 1 || S.phase > 5) return '';
  var es = LANG === 'es', items = statusItems(c), ok = 0, next = null;
  for (var i = 0; i < items.length; i++) { if (items[i].ok) ok++; else if (!next) next = items[i]; }
  var pct = items.length ? ok / items.length : 0, R = 34, C = 2 * Math.PI * R;
  var cls = pct >= 1 ? 'ok' : (pct >= 0.6 ? 'warn' : 'bad');
  var h = '<div class="panel status-panel st-' + cls + '"><h2>' + esc(es ? 'Estado de la misión' : 'Mission status') + '</h2><div class="status-top">' +
    '<svg class="ring" viewBox="0 0 84 84" aria-hidden="true"><circle cx="42" cy="42" r="' + R + '" class="ring-bg"/>' +
    '<circle cx="42" cy="42" r="' + R + '" class="ring-fg" stroke-dasharray="' + C.toFixed(1) + '" stroke-dashoffset="' + (C * (1 - pct)).toFixed(1) + '"/></svg>' +
    '<div class="ring-num"><b>' + n0(pct * 100) + '%</b><span>' + esc(es ? 'listo' : 'ready') + '</span></div>' +
    '<div class="status-next">' + (next
      ? '<span class="sn-k">' + esc(es ? 'Siguiente paso' : 'Next step') + '</span><b>' + esc(next.t) + '</b><span class="status-fix">' + esc(next.fix) + '</span>' +
        (next.act ? '<button class="btn primary sm" data-act="fix" data-v="' + next.act + '">' + icon('spark', 'ico') + esc(es ? 'Arréglalo por mí' : 'Fix it for me') + '</button>' : '')
      : '<span class="sn-k">' + esc(es ? '¡Diseño listo!' : 'Design ready!') + '</span><b>' + esc(S.phase === 5 ? (es ? 'Todo en orden para lanzar.' : 'All set for launch.') : (es ? 'Pulsa «Continuar».' : 'Press “Continue”.')) + '</b>') +
    '</div></div><ul class="status-list">';
  for (i = 0; i < items.length; i++) h += '<li class="' + (items[i].ok ? 'ok' : 'bad') + '"><span>' + (items[i].ok ? '✓' : '✕') + '</span>' + esc(items[i].t) + '</li>';
  return h + '</ul></div>';
}

function applyFix(act) {
  if (act === 'kit') { applyKit('bal'); return; }
  if (act === 'lean') { applyKit('lean'); return; }
  if (act === 'size') { S.auto = true; autoSizeIfOn(); render(); return; }
  if (act === 'sci') { S.instruments = autoInstruments(S); autoSizeIfOn(); render(); return; }
  if (act === 'link') {
    var sol = solveLink(S);
    if (sol) ['antennaD', 'twtaW', 'bandId', 'groundId', 'arrayArea', 'rtgUnits', 'batteryWh', 'propellantKg'].forEach(function (k) { S[k] = sol.st[k]; });
    render(); return;
  }
  if (act === 'shield') {
    var d = comp().dest, best = null;
    for (var i = 0; i < DATA.shielding.length; i++) {
      var sh = DATA.shielding[i];
      if (d && sh.krad >= d.radKrad && (!best || sh.cost < best.cost)) best = sh;
    }
    if (best) onPick('shieldingId', best.id);
    return;
  }
  if (act === 'lv') { var r = recommend(comp()); if (r.lv) onPick('launcherId', r.lv); }
}

/* the first time a phase closes, say so */
function celebrateCheck() {
  if (S.phase < 2 || S.phase > 5) return;
  var c = CACHE || comp(), items = statusItems(c);
  for (var i = 0; i < items.length; i++) if (!items[i].ok) return;
  if (gateMissing(c).length || c.viol.length) return;
  S.celebrated = S.celebrated || {};
  if (S.celebrated[S.phase]) return;
  S.celebrated[S.phase] = true;
  confetti();
  SFX.chime && SFX.chime();
  toast('<span class="toast-ic">🚀</span><span><b>' + esc(LANG === 'es' ? '¡Fase lista!' : 'Phase ready!') + '</b>' +
    esc(LANG === 'es' ? 'El diseño cierra: todos los márgenes en verde.' : 'The design closes: every margin is green.') + '</span>', 'gold');
}

function confetti() {
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  var box = document.createElement('div'), cols = ['#4fd1e0', '#f0c24b', '#b98cff', '#3ecf9a', '#7aa2ff', '#f0a93b'];
  box.className = 'confetti'; box.setAttribute('aria-hidden', 'true');
  for (var i = 0; i < 60; i++) {
    var s = document.createElement('i');
    s.style.left = (Math.random() * 100) + '%';
    s.style.background = cols[i % cols.length];
    s.style.setProperty('--dx', (Math.random() * 240 - 120) + 'px');
    s.style.setProperty('--r', (Math.random() * 720 - 360) + 'deg');
    s.style.animationDelay = (Math.random() * 0.35) + 's';
    s.style.animationDuration = (1.4 + Math.random() * 0.9) + 's';
    box.appendChild(s);
  }
  document.body.appendChild(box);
  setTimeout(function () { if (box.parentNode) box.parentNode.removeChild(box); }, 2800);
}

/* ---------------------------------------------------------------- *
 * welcome tour                                                      *
 * ---------------------------------------------------------------- */
var TOUR = [
  { ic: 'target', es: ['1 · Elige tu misión', 'Empieza con una misión lista —la Luna es la más fácil— o elige tú el programa y el destino. Cada destino dice si es fácil, medio o difícil.'],
    en: ['1 · Pick your mission', 'Start with a ready mission —the Moon is the easiest— or choose the program and destination yourself. Every destination says if it is easy, medium or hard.'] },
  { ic: 'spark', es: ['2 · El equipo te ayuda', 'Cada opción muestra ✓ o ✕ antes de tocarla. Los asistentes arman la nave con un toque y el anillo «Estado de la misión» te dice qué falta y lo arregla por ti.'],
    en: ['2 · The team helps you', 'Every option shows ✓ or ✕ before you tap it. The assistants build the spacecraft in one tap, and the “Mission status” ring tells you what is missing and fixes it for you.'] },
  { ic: 'rocket', es: ['3 · Lanza, navega y opera', 'Vota GO / NO-GO, pilota el despegue, corrige la trayectoria y opera la misión mientras el espacio intenta romperla. ¿Quieres números de verdad? Abre el Laboratorio de ingeniería.'],
    en: ['3 · Launch, navigate, operate', 'Poll GO / NO-GO, fly the ascent, correct the trajectory and operate the mission while space tries to break it. Want real numbers? Open the Engineering lab.'] }
];
var TOUR_I = 0;

function tourOpen() {
  TOUR_I = 0;
  var root = document.getElementById('tour');
  if (!root) {
    root = document.createElement('div');
    root.id = 'tour'; root.className = 'tour-back';
    root.setAttribute('role', 'dialog'); root.setAttribute('aria-modal', 'true');
    document.body.appendChild(root);
    root.addEventListener('click', function (e) {
      var b = e.target.closest ? e.target.closest('[data-tour]') : null;
      if (!b) { if (e.target === root) tourClose(); return; }
      var a = b.getAttribute('data-tour');
      if (a === 'next') { if (TOUR_I < TOUR.length - 1) { TOUR_I++; tourPaint(); } else tourClose(); }
      else if (a === 'prev') { if (TOUR_I > 0) { TOUR_I--; tourPaint(); } }
      else if (a === 'dot') { TOUR_I = parseInt(b.getAttribute('data-v'), 10); tourPaint(); }
      else tourClose();
    });
    root.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') tourClose();
      if (e.key === 'ArrowRight' || e.key === 'Enter') { e.preventDefault(); root.querySelector('[data-tour=next]').click(); }
      if (e.key === 'ArrowLeft') root.querySelector('[data-tour=prev]').click();
    });
  }
  root.hidden = false; OVERLAY_OPEN = true;
  tourPaint();
}
function tourPaint() {
  var root = document.getElementById('tour'), es = LANG === 'es', st = TOUR[TOUR_I], tx = es ? st.es : st.en, dots = '';
  for (var i = 0; i < TOUR.length; i++) dots += '<button class="tdot' + (i === TOUR_I ? ' on' : '') + '" data-tour="dot" data-v="' + i + '" aria-label="' + (i + 1) + '"></button>';
  var last = TOUR_I === TOUR.length - 1;
  root.innerHTML = '<div class="tour" tabindex="-1"><button class="icon-btn tour-x" data-tour="close" aria-label="' + esc(es ? 'Cerrar' : 'Close') + '">' + icon('close', 'ico') + '</button>' +
    '<div class="tour-art"><span class="tour-orbit"></span><span class="tour-ic">' + icon(st.ic, 'ico') + '</span></div>' +
    '<span class="tour-k">' + esc(es ? 'Cómo se juega' : 'How to play') + '</span><h2>' + esc(tx[0]) + '</h2><p>' + esc(tx[1]) + '</p>' +
    '<div class="tour-dots">' + dots + '</div><div class="tour-btns">' +
    '<button class="btn ghost" data-tour="' + (TOUR_I ? 'prev' : 'close') + '">' + esc(TOUR_I ? (es ? 'Atrás' : 'Back') : (es ? 'Saltar' : 'Skip')) + '</button>' +
    '<button class="btn primary" data-tour="next">' + esc(last ? (es ? '¡A diseñar!' : 'Let’s design!') : (es ? 'Siguiente' : 'Next')) + '</button></div></div>';
  root.querySelector('.tour').focus();
}
function tourClose() {
  var root = document.getElementById('tour');
  if (root) root.hidden = true;
  OVERLAY_OPEN = false;
  setPref('on_tour', '1');
}

/* ---------------------------------------------------------------- *
 * wiring                                                            *
 * ---------------------------------------------------------------- */
function wireHelp() {
  /* capture phase: a glossary term inside an option card must not pick the card */
  document.addEventListener('click', function (e) {
    var g = e.target.closest ? e.target.closest('.gl') : null;
    if (g) { e.stopPropagation(); e.preventDefault(); if (g.classList.contains('open')) glossHide(); else glossShow(g); return; }
    if (!(e.target.closest && e.target.closest('#gl-pop'))) glossHide();
  }, true);
  document.addEventListener('keydown', function (e) {
    var g = document.activeElement;
    if (g && g.classList && g.classList.contains('gl') && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); e.stopPropagation(); glossShow(g); }
    if (e.key === 'Escape') glossHide();
  }, true);
  window.addEventListener('scroll', function () { if (Math.abs(window.scrollY - GL_Y) > 40) glossHide(); }, { passive: true });
}
