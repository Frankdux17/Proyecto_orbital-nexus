/* ORBITAL NEXUS — future mode: the quantum portal.
   Clearly labelled science fiction. Astronauts are stranded with less than
   a minute of oxygen; the player opens a portal and keeps it stable by
   feeding it exotic energy — too little and it collapses, too much and it
   overloads — while people cross one by one. Each level ends with what the
   real physics says and how a rocket compares in travel time and CO2. */

var PORTAL = {
  G: [
    { id: 'moon', es: ['Rescate en la Luna', 'Tres astronautas atrapados en el polo sur lunar.'], en: ['Rescue on the Moon', 'Three astronauts stranded at the lunar south pole.'],
      people: 3, drift: 0.16, noise: 0.18, energy: 100, o2: 60, color: '#cfd6e6', dist: { es: '384 000 km', en: '384,000 km' },
      rocket: { es: '3 días', en: '3 days' }, co2: 2500, art: 'llo' },
    { id: 'mars', es: ['Evacuación de Marte', 'Una tormenta de polvo amenaza la base: seis personas deben volver.'], en: ['Mars evacuation', 'A dust storm threatens the base: six people must come home.'],
      people: 6, drift: 0.22, noise: 0.26, energy: 120, o2: 60, color: '#e07a4a', dist: { es: '225 millones de km', en: '225 million km' },
      rocket: { es: '7 meses', en: '7 months' }, co2: 3000, art: 'mars-orbit' },
    { id: 'europa', es: ['Bajo el hielo de Europa', 'Un submarino científico quedó varado: rescata a su tripulación.'], en: ['Under Europa’s ice', 'A science submarine is stranded: rescue its crew.'],
      people: 5, drift: 0.27, noise: 0.34, energy: 110, o2: 55, color: '#d8e4f0', dist: { es: '628 millones de km', en: '628 million km' },
      rocket: { es: '6 años', en: '6 years' }, co2: 3000, art: 'europa' },
    { id: 'proxima', es: ['Próxima b', 'La primera colonia fuera del Sistema Solar pide ayuda a 4,2 años luz.'], en: ['Proxima b', 'The first colony beyond the Solar System calls for help 4.2 light-years away.'],
      people: 8, drift: 0.3, noise: 0.42, energy: 140, o2: 60, color: '#ff8a5c', dist: { es: '40 billones de km', en: '40 trillion km' },
      rocket: { es: '73 000 años', en: '73,000 years' }, co2: 3000, art: 'neo' }
  ]
};

function px(es, en) { return LANG === 'es' ? es : en; }
function portalStore() { try { return JSON.parse(pref('on_portal', '{}')) || {}; } catch (e) { return {}; } }

function portalOpen() {
  var root = document.getElementById('portal');
  if (!root) {
    root = document.createElement('div'); root.id = 'portal'; root.className = 'portal';
    root.setAttribute('role', 'dialog'); root.setAttribute('aria-modal', 'true'); root.tabIndex = -1;
    document.body.appendChild(root);
    root.addEventListener('click', portalClick);
  }
  root.hidden = false; OVERLAY_OPEN = true; document.body.classList.add('no-scroll');
  portalMenu();
  root.focus();
}
function portalClose() {
  portalStop();
  var root = document.getElementById('portal'); if (root) root.hidden = true;
  OVERLAY_OPEN = false; document.body.classList.remove('no-scroll');
  if (typeof render === 'function') render();
}

function portalHead() {
  return '<header class="po-head"><div class="po-title"><span class="po-badge">🌀</span><div><b>' + esc(px('Modo futuro: portal cuántico', 'Future mode: quantum portal')) + '</b>' +
    '<span class="po-fic">' + esc(px('FICCIÓN CIENTÍFICA · inspirada en física real', 'SCIENCE FICTION · inspired by real physics')) + '</span></div></div>' +
    '<button class="icon-btn po-x" data-po="close" aria-label="' + esc(px('Cerrar', 'Close')) + '">' + icon('close', 'ico') + '</button></header>';
}

function portalMenu() {
  portalStop();
  var root = document.getElementById('portal'), st = portalStore(), cards = '';
  PORTAL.G.forEach(function (L, i) {
    var open = i === 0 || st[PORTAL.G[i - 1].id], best = st[L.id] || 0;
    cards += '<button class="po-card' + (open ? '' : ' locked') + '"' + (open ? ' data-po="play" data-v="' + i + '"' : ' disabled') + '>' +
      destArt(L.art, 'art po-art') + '<span class="po-n">' + px('Misión ', 'Mission ') + (i + 1) + ' · ' + esc(px(L.dist.es, L.dist.en)) + '</span>' +
      '<b>' + esc(px(L.es[0], L.en[0])) + '</b><span class="po-d">' + esc(px(L.es[1], L.en[1])) + '</span>' +
      '<span class="po-st">' + (open ? (best ? '★ ' + best + ' / ' + L.people + ' ' + px('rescatados', 'rescued') : px('Sin intentar', 'Not tried')) : '🔒 ' + px('Completa la anterior', 'Finish the previous one')) + '</span></button>';
  });
  root.innerHTML = '<div class="po-wrap">' + portalHead() +
    '<div class="po-intro"><div><h2>' + esc(px('¿Y si no hiciera falta un cohete?', 'What if we didn’t need a rocket?')) + '</h2><p>' +
    esc(px('Imagina una puerta que conecta la Tierra con la Luna o con Marte: entras aquí y sales allá en segundos, sin quemar combustible. Hoy es ficción; aquí lo pruebas en misiones de rescate y aprendes qué dice la física real.',
      'Imagine a door connecting Earth with the Moon or Mars: you step in here and out there in seconds, burning no fuel. Today it is fiction; here you try it in rescue missions and learn what real physics says.')) + '</p>' +
    '<ul class="po-how"><li>' + esc(px('Mantén pulsado INYECTAR (o Espacio) para dar energía exótica al portal.', 'Hold INJECT (or Space) to feed the portal exotic energy.')) + '</li>' +
    '<li>' + esc(px('Mantén la estabilidad en la franja verde: las personas solo cruzan si el portal está estable.', 'Keep stability in the green band: people only cross while the portal is stable.')) + '</li>' +
    '<li>' + esc(px('Muy poca energía: el portal colapsa. Demasiada: se sobrecarga. Y el oxígeno se acaba en menos de un minuto.', 'Too little energy and it collapses. Too much and it overloads. And the oxygen runs out in under a minute.')) + '</li></ul></div>' +
    '<canvas id="po-hero" class="po-hero" width="560" height="320" aria-hidden="true"></canvas></div>' +
    '<div class="po-grid">' + cards + '</div>' + portalScience(null) + '</div>';
  portalHeroAnim();
}

/* what physics actually says, shown on the menu and after every mission */
function portalScience(L) {
  var es = LANG === 'es';
  return '<div class="po-sci"><div class="po-sci-c"><b>🔬 ' + esc(px('La física real', 'The real physics')) + '</b><p>' +
    esc(px('Las ecuaciones de Einstein permiten «agujeros de gusano», atajos en el espacio-tiempo, pero mantener uno abierto exigiría energía negativa (materia exótica). El efecto Casimir la produce en cantidades minúsculas. La teletransportación cuántica sí existe: en 2017 el satélite Micius transmitió estados de fotones a 1400 km… pero mueve información, no personas.',
      'Einstein’s equations allow “wormholes”, shortcuts through spacetime, but keeping one open would need negative energy (exotic matter). The Casimir effect makes tiny amounts of it. Quantum teleportation is real: in 2017 the Micius satellite sent photon states 1,400 km… but it moves information, not people.')) + '</p></div>' +
    '<div class="po-sci-c"><b>🌍 ' + esc(px('El planeta', 'The planet')) + '</b><p>' +
    esc(px('Un lanzamiento con queroseno emite cientos de toneladas de CO₂ y deja hollín en la alta atmósfera, donde calienta mucho más que a nivel del suelo. Mientras los portales sean ficción, la respuesta real son cohetes reutilizables y combustibles más limpios como metano o hidrógeno.',
      'A kerosene launch emits hundreds of tonnes of CO₂ and leaves soot high in the atmosphere, where it warms far more than at ground level. While portals remain fiction, the real answer is reusable rockets and cleaner fuels such as methane or hydrogen.')) + '</p></div>' +
    (L ? '<div class="po-sci-c po-cmp"><b>⚖ ' + esc(px('Cohete frente a portal', 'Rocket versus portal')) + '</b><table>' +
      '<tr><td></td><th>' + esc(px('Cohete', 'Rocket')) + '</th><th>' + esc(px('Portal (ficción)', 'Portal (fiction)')) + '</th></tr>' +
      '<tr><td>' + esc(px('Viaje', 'Trip')) + '</td><td>' + esc(px(L.rocket.es, L.rocket.en)) + '</td><td>' + esc(px('segundos', 'seconds')) + '</td></tr>' +
      '<tr><td>' + esc(px('CO₂ por lanzamiento', 'CO₂ per launch')) + '</td><td>≈ 300–400 t*</td><td>0 t</td></tr></table>' +
      '<small>' + esc(px('*Estimación aproximada para un cohete mediano de queroseno, como un Falcon 9. Una misión tripulada lejana necesita varios lanzamientos.',
        '*Rough estimate for a medium kerosene rocket such as a Falcon 9. A distant crewed mission needs several launches.')) + '</small></div>' : '') + '</div>';
}

/* ---------------------------------------------------------------- *
 * the mission                                                       *
 * ---------------------------------------------------------------- */
var PO = null;
function portalPlay(i) {
  portalStop();
  var L = PORTAL.G[i], root = document.getElementById('portal');
  root.innerHTML = '<div class="po-wrap">' + portalHead() +
    '<div class="po-game"><div class="po-stage"><canvas id="po-cv" class="po-cv"></canvas>' +
    '<div class="po-hud" id="po-hud"></div><div class="po-msg" id="po-msg"></div>' +
    '<div class="po-card-end" id="po-end" hidden></div></div>' +
    '<div class="po-ctrl"><button class="po-inject" id="po-inject" type="button">⚡ ' + esc(px('INYECTAR ENERGÍA', 'INJECT ENERGY')) + '<small>' + esc(px('mantén pulsado · Espacio', 'hold · Space')) + '</small></button>' +
    '<button class="btn ghost" data-po="menu">← ' + esc(px('Misiones', 'Missions')) + '</button></div></div></div>';
  PO = { L: L, i: i, s: 0.3, energy: L.energy, o2: L.o2, crossed: 0, prog: 0, t: 0, inj: false, over: false, warmup: 2.2, parts: [], walkers: [], raf: 0, last: 0, shake: 0 };
  var btn = document.getElementById('po-inject');
  function on(e) { e.preventDefault(); PO && (PO.inj = true); }
  function off() { PO && (PO.inj = false); }
  btn.addEventListener('pointerdown', on); btn.addEventListener('pointerup', off); btn.addEventListener('pointerleave', off); btn.addEventListener('pointercancel', off);
  PO.kd = function (e) { if (e.code === 'Space' || e.key === ' ') { e.preventDefault(); PO.inj = true; } if (e.key === 'Escape') portalMenu(); };
  PO.ku = function (e) { if (e.code === 'Space' || e.key === ' ') PO.inj = false; };
  document.addEventListener('keydown', PO.kd); document.addEventListener('keyup', PO.ku);
  portalMsg(px('Abriendo el portal… estabilízalo en la franja verde.', 'Opening the portal… stabilise it in the green band.'));
  PO.raf = requestAnimationFrame(portalFrame);
}
function portalStop() {
  if (PO) { cancelAnimationFrame(PO.raf); document.removeEventListener('keydown', PO.kd); document.removeEventListener('keyup', PO.ku); }
  if (window.__poHero) { cancelAnimationFrame(window.__poHero); window.__poHero = 0; }
  PO = null;
}
function portalMsg(m) { var e = document.getElementById('po-msg'); if (e) { e.textContent = m; e.classList.remove('flash'); void e.offsetWidth; e.classList.add('flash'); } }

var PO_LO = 0.42, PO_HI = 0.74;
function portalFrame(ts) {
  if (!PO) return;
  PO.raf = requestAnimationFrame(portalFrame);
  var dt = PO.last ? Math.min(0.05, (ts - PO.last) / 1000) : 0.016; PO.last = ts;
  var L = PO.L;
  if (!PO.over) {
    PO.t += dt;
    if (PO.warmup > 0) PO.warmup -= dt;
    /* physics of a made-up portal: it sags on its own, wobbles, and rises with exotic energy */
    var push = PO.inj && PO.energy > 0 ? 0.62 : 0;
    var wobble = L.noise * (Math.sin(PO.t * 2.3) * 0.6 + Math.sin(PO.t * 5.1 + 1) * 0.4);
    /* while it opens the portal settles by itself; then it is in the player's hands */
    if (PO.warmup > 0) PO.s += (0.58 - PO.s) * dt * 1.6;
    else PO.s += (push - L.drift + wobble * 0.5) * dt;
    if (PO.inj && PO.energy > 0 && PO.warmup <= 0) PO.energy = Math.max(0, PO.energy - dt * 9);
    PO.o2 = Math.max(0, PO.o2 - dt);
    var stable = PO.s >= PO_LO && PO.s <= PO_HI;
    if (PO.warmup <= 0) {
      if (stable) {
        PO.prog += dt / 2.4;
        if (PO.prog >= 1) {
          PO.prog = 0; PO.crossed++; PO.walkers.push({ x: 0 });
          if (typeof SFX !== 'undefined' && SFX.tick) SFX.tick();
          portalMsg(px('¡Cruzó una persona! ', 'One person crossed! ') + PO.crossed + ' / ' + L.people);
        }
      }
      if (PO.s < 0.06) portalEnd(false, px('El portal colapsó por falta de energía.', 'The portal collapsed for lack of energy.'));
      else if (PO.s > 0.98) portalEnd(false, px('Sobrecarga: demasiada energía exótica desgarró el portal.', 'Overload: too much exotic energy tore the portal apart.'));
      else if (PO.crossed >= L.people) portalEnd(true, px('¡Todos a salvo en menos de un minuto!', 'Everyone safe in under a minute!'));
      else if (PO.o2 <= 0) portalEnd(PO.crossed > 0, px('Se acabó el oxígeno.', 'The oxygen ran out.'));
      else if (PO.energy <= 0 && PO.s < PO_LO) portalEnd(PO.crossed > 0, px('Sin energía exótica para sostener el portal.', 'No exotic energy left to hold the portal.'));
    }
    PO.s = Math.max(0, Math.min(1, PO.s));
    PO.shake = PO.s > 0.85 ? (PO.s - 0.85) * 40 : (PO.s < 0.2 ? (0.2 - PO.s) * 25 : 0);
  }
  portalDraw(dt);
  portalHud();
}

function portalEnd(ok, why) {
  if (PO.over) return;
  PO.over = true;
  var L = PO.L, st = portalStore(), win = PO.crossed >= L.people;
  if ((st[L.id] || 0) < PO.crossed) { st[L.id] = win ? L.people : PO.crossed; setPref('on_portal', JSON.stringify(st)); }
  if (win && PO.i === PORTAL.G.length - 1 && typeof award === 'function') award('portal');
  if (win && typeof confetti === 'function') confetti();
  var next = win && PO.i + 1 < PORTAL.G.length, box = document.getElementById('po-end');
  box.innerHTML = '<span class="po-k">' + esc(win ? px('Rescate completado', 'Rescue complete') : px('Rescate incompleto', 'Rescue incomplete')) + '</span>' +
    '<div class="po-big">' + PO.crossed + ' / ' + L.people + '</div><p>' + esc(why) + ' ' + esc(px('Tiempo: ', 'Time: ')) + Math.round(PO.t) + ' s</p>' +
    '<div class="po-btns"><button class="btn ghost" data-po="play" data-v="' + PO.i + '">' + esc(px('Reintentar', 'Retry')) + '</button>' +
    (next ? '<button class="btn primary" data-po="play" data-v="' + (PO.i + 1) + '">' + esc(px('Siguiente misión →', 'Next mission →')) + '</button>'
      : '<button class="btn primary" data-po="menu">' + esc(px('Misiones', 'Missions')) + '</button>') + '</div>' + portalScience(L);
  box.hidden = false;
}

function portalHud() {
  if (!PO) return;
  var L = PO.L, h = document.getElementById('po-hud'); if (!h) return;
  var stable = PO.s >= PO_LO && PO.s <= PO_HI;
  h.innerHTML = '<div class="po-h"><span>' + esc(px(L.es[0], L.en[0])) + '</span><b>' + PO.crossed + ' / ' + L.people + ' ' + esc(px('a salvo', 'safe')) + '</b></div>' +
    '<div class="po-h' + (PO.o2 < 15 ? ' bad' : '') + '"><span>' + esc(px('Oxígeno', 'Oxygen')) + '</span><b>' + Math.ceil(PO.o2) + ' s</b></div>' +
    '<div class="po-h"><span>' + esc(px('Energía exótica', 'Exotic energy')) + '</span><i class="po-bar"><em style="width:' + (PO.energy / L.energy * 100).toFixed(0) + '%"></em></i></div>' +
    '<div class="po-h po-stab"><span>' + esc(px('Estabilidad', 'Stability')) + ' · ' + esc(stable ? px('ESTABLE', 'STABLE') : (PO.s < PO_LO ? px('DÉBIL', 'WEAK') : px('SOBRECARGA', 'OVERLOAD'))) + '</span>' +
    '<i class="po-gauge"><u style="left:' + (PO_LO * 100) + '%;width:' + ((PO_HI - PO_LO) * 100) + '%"></u><em style="left:' + (PO.s * 100).toFixed(1) + '%"></em></i></div>';
}

function portalDraw(dt) {
  var cv = document.getElementById('po-cv'); if (!cv || !PO) return;
  var dpr = Math.min(2, window.devicePixelRatio || 1), w = cv.clientWidth, h = cv.clientHeight;
  if (cv.width !== Math.round(w * dpr)) { cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); }
  var g = cv.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0);
  var L = PO.L, t = PO.t, s = PO.s, stable = s >= PO_LO && s <= PO_HI;
  var sx0 = (Math.random() - 0.5) * PO.shake, sy0 = (Math.random() - 0.5) * PO.shake;
  g.save(); g.translate(sx0, sy0);
  var bg = g.createLinearGradient(0, 0, w, h); bg.addColorStop(0, '#070b1e'); bg.addColorStop(1, '#14082a');
  g.fillStyle = bg; g.fillRect(-20, -20, w + 40, h + 40);
  for (var i = 0; i < 90; i++) { var x = (i * 137.5 % w), y = (i * 89.3 % h); g.fillStyle = 'rgba(220,230,255,' + (0.2 + 0.4 * Math.abs(Math.sin(t + i))) + ')'; g.fillRect(x, y, 1.6, 1.6); }
  /* Earth on the left, the destination on the right */
  var ex = w * 0.14, ey = h * 0.55, er = Math.min(h * 0.2, 90);
  var eg = g.createRadialGradient(ex - er * 0.3, ey - er * 0.3, er * 0.1, ex, ey, er); eg.addColorStop(0, '#9fd4ff'); eg.addColorStop(0.6, '#2f7fd8'); eg.addColorStop(1, '#0d2f6b');
  g.fillStyle = eg; g.beginPath(); g.arc(ex, ey, er, 0, 6.283); g.fill();
  var dx = w * 0.86, dr = Math.min(h * 0.18, 80);
  var dg = g.createRadialGradient(dx - dr * 0.3, ey - dr * 0.3, dr * 0.1, dx, ey, dr); dg.addColorStop(0, '#ffffff'); dg.addColorStop(0.5, L.color); dg.addColorStop(1, '#1a1020');
  g.fillStyle = dg; g.beginPath(); g.arc(dx, ey, dr, 0, 6.283); g.fill();
  g.font = '600 13px system-ui,sans-serif'; g.textAlign = 'center'; g.fillStyle = '#c9d6f0';
  g.fillText(px('Tierra', 'Earth'), ex, ey + er + 20); g.fillText(px(L.es[0], L.en[0]).replace(/^(Rescate en la |Evacuación de |Bajo el hielo de |Rescue on the |Under )/, ''), dx, ey + dr + 20);
  /* the portal: two mouths joined by a tunnel of light */
  var cx = w * 0.5, cy = ey, R = Math.min(h * 0.32, 150) * (0.35 + 0.65 * Math.min(1, s * 1.6)) * (PO.warmup > 0 ? 1 - PO.warmup / 2.2 * 0.6 : 1);
  var hue = stable ? 185 : (s < PO_LO ? 280 : 20);
  for (var k = 7; k >= 0; k--) {
    var rr = R * (0.25 + k * 0.11), a = t * (1.2 + k * 0.3) * (k % 2 ? 1 : -1);
    g.strokeStyle = 'hsla(' + (hue + k * 8) + ',95%,' + (55 + k * 3) + '%,' + (0.18 + 0.08 * k) + ')'; g.lineWidth = 3 + k * 0.6;
    g.beginPath(); g.ellipse(cx, cy, rr, rr * 0.92, a, 0.2, 5.6); g.stroke();
  }
  var core = g.createRadialGradient(cx, cy, 0, cx, cy, R * 0.5); core.addColorStop(0, 'rgba(255,255,255,.95)'); core.addColorStop(0.4, 'hsla(' + hue + ',100%,70%,.55)'); core.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = core; g.beginPath(); g.arc(cx, cy, R * 0.5, 0, 6.283); g.fill();
  /* swirl particles */
  if (PO.parts.length < 160) for (i = 0; i < 4; i++) PO.parts.push({ a: Math.random() * 6.283, r: R * (1 + Math.random() * 0.8), v: 0.6 + Math.random() });
  PO.parts = PO.parts.filter(function (p) { p.a += dt * p.v * 2.2; p.r -= dt * R * 0.45 * p.v; return p.r > R * 0.12; });
  PO.parts.forEach(function (p) { g.fillStyle = 'hsla(' + hue + ',100%,75%,' + Math.min(1, p.r / R) + ')'; g.fillRect(cx + Math.cos(p.a) * p.r, cy + Math.sin(p.a) * p.r * 0.9, 2.2, 2.2); });
  /* beams to both worlds while stable */
  if (stable && PO.warmup <= 0) {
    g.strokeStyle = 'rgba(79,209,224,.35)'; g.lineWidth = 6; g.setLineDash([10, 8]); g.lineDashOffset = -t * 60;
    g.beginPath(); g.moveTo(dx - dr, cy); g.lineTo(cx + R * 0.5, cy); g.moveTo(cx - R * 0.5, cy); g.lineTo(ex + er, cy); g.stroke(); g.setLineDash([]);
  }
  /* people walking home through the portal */
  PO.walkers = PO.walkers.filter(function (wk) { wk.x += dt * 0.5; return wk.x < 1; });
  PO.walkers.forEach(function (wk) {
    var fromX = dx - dr, toX = ex + er, xx = fromX + (toX - fromX) * wk.x;
    g.fillStyle = '#f0c24b'; g.beginPath(); g.arc(xx, cy - 14, 5, 0, 6.283); g.fill(); g.fillRect(xx - 3, cy - 9, 6, 12);
  });
  /* waiting crew next to the destination */
  for (i = 0; i < PO.L.people - PO.crossed; i++) { g.fillStyle = '#ffd98a'; var wx = dx - dr - 18 - i * 11; g.beginPath(); g.arc(wx, cy + dr * 0.6, 4, 0, 6.283); g.fill(); g.fillRect(wx - 2.5, cy + dr * 0.6 + 4, 5, 9); }
  /* crossing progress ring */
  if (stable && PO.warmup <= 0 && !PO.over) { g.strokeStyle = '#3ecf9a'; g.lineWidth = 5; g.beginPath(); g.arc(cx, cy, R + 14, -Math.PI / 2, -Math.PI / 2 + 6.283 * PO.prog); g.stroke(); }
  g.restore();
}

/* a small looping portal on the mission menu */
function portalHeroAnim() {
  var cv = document.getElementById('po-hero'); if (!cv) return;
  var g = cv.getContext('2d'), t0 = performance.now();
  function f(ts) {
    if (!document.getElementById('po-hero')) return;
    var t = (ts - t0) / 1000, w = cv.width, h = cv.height, cx = w / 2, cy = h / 2;
    g.clearRect(0, 0, w, h);
    for (var k = 8; k >= 0; k--) {
      var rr = 30 + k * 13, a = t * (0.8 + k * 0.25) * (k % 2 ? 1 : -1);
      g.strokeStyle = 'hsla(' + (185 + k * 12) + ',95%,' + (55 + k * 3) + '%,' + (0.15 + 0.08 * k) + ')'; g.lineWidth = 3 + k * 0.5;
      g.beginPath(); g.ellipse(cx, cy, rr, rr * 0.9, a, 0.2, 5.6); g.stroke();
    }
    var core = g.createRadialGradient(cx, cy, 0, cx, cy, 70); core.addColorStop(0, 'rgba(255,255,255,.95)'); core.addColorStop(0.4, 'rgba(79,209,224,.5)'); core.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = core; g.beginPath(); g.arc(cx, cy, 70, 0, 6.283); g.fill();
    window.__poHero = requestAnimationFrame(f);
  }
  window.__poHero = requestAnimationFrame(f);
}

function portalClick(e) {
  var b = e.target.closest ? e.target.closest('[data-po]') : null; if (!b) return;
  var a = b.getAttribute('data-po');
  if (a === 'close') portalClose();
  else if (a === 'menu') portalMenu();
  else if (a === 'play') portalPlay(parseInt(b.getAttribute('data-v'), 10));
}
