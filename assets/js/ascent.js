/* ORBITAL NEXUS — piloted ascent: fly a two-stage rocket from the pad to orbit.
   The physics is a point-mass ascent over a round, rotating Earth: thrust
   along the pitch you command, gravity that weakens with altitude, drag in
   an exponential atmosphere, dynamic pressure (Max-Q), staging and the
   fairing. Orbit is judged the way a flight dynamics officer would: from
   the perigee the current state vector produces. */

var ASC = {
  R: 6371e3, MU: 3.986e14, G0: 9.80665, WARP: 8, QMAX: 45e3, QWARN: 32e3,
  ROT: 408,             /* Earth's rotation speed at a 28.5° launch site, m/s */
  TARGET_PE: 160e3      /* perigee that counts as orbit */
};

/* a generic medium launcher; the spacecraft rides on top */
ASC.vehicle = function (payloadKg) {
  return {
    s1: { dry: 25000, prop: 390000, thrust: 6.6e6, isp: 300, cda: 3.2 },
    s2: { dry: 4000, prop: 75000, thrust: 0.95e6, isp: 345, cda: 1.6 },
    fairing: 2000, payload: Math.max(500, Math.min(payloadKg || 3000, 9000))
  };
};

ASC.init = function (payloadKg) {
  var v = ASC.vehicle(payloadKg);
  return {
    v: v, t: 0, h: 0, x: 0, vh: ASC.ROT, vv: 0, pitch: 0, throttle: 1,
    stage: 1, p1: v.s1.prop, p2: v.s2.prop, fairing: true, fairingLow: false,
    q: 0, maxQ: 0, done: false, ok: false, why: null, lit: false, path: [], s2lit: false
  };
};

ASC.mass = function (s) {
  var v = s.v, m = v.payload + (s.fairing ? v.fairing : 0) + v.s2.dry + s.p2;
  if (s.stage === 1) m += v.s1.dry + s.p1;
  return m;
};

ASC.orbit = function (s) {
  var r = ASC.R + s.h, v2 = s.vh * s.vh + s.vv * s.vv;
  var E = v2 / 2 - ASC.MU / r, L = r * s.vh;
  if (Math.abs(E) < 1) E = -1;
  /* the same periapsis formula holds for a hyperbola (a < 0, e > 1) */
  var a = -ASC.MU / (2 * E), e = Math.sqrt(Math.max(0, 1 + 2 * E * L * L / (ASC.MU * ASC.MU)));
  return { pe: a * (1 - e) - ASC.R, ap: E >= 0 ? Infinity : a * (1 + e) - ASC.R, esc: E >= 0 };
};

ASC.step = function (s, dt) {
  if (s.done || !s.lit) return;
  var st = s.stage === 1 ? s.v.s1 : s.v.s2, prop = s.stage === 1 ? s.p1 : s.p2;
  var T = prop > 0 ? st.thrust * s.throttle : 0;
  var mdot = T / (st.isp * ASC.G0);
  var m = ASC.mass(s), r = ASC.R + s.h;
  var rho = s.h < 150e3 ? 1.225 * Math.exp(-s.h / 8500) : 0;
  var ah0 = s.vh - ASC.ROT * (ASC.R / r), vair = Math.sqrt(ah0 * ah0 + s.vv * s.vv);
  s.q = 0.5 * rho * vair * vair;
  var D = s.q * (s.stage === 1 ? s.v.s1.cda : s.v.s2.cda);
  var th = s.pitch * Math.PI / 180;
  var g = ASC.MU / (r * r);
  var ah = (T * Math.sin(th) - (vair > 1 ? D * ah0 / vair : 0)) / m - s.vh * s.vv / r;
  var av = (T * Math.cos(th) - (vair > 1 ? D * s.vv / vair : 0)) / m - g + s.vh * s.vh / r;
  /* held down on the pad until thrust beats weight */
  if (s.h <= 0 && av < 0 && s.t < 5) { av = 0; ah = 0; }
  s.vh += ah * dt; s.vv += av * dt;
  s.h += s.vv * dt; s.x += s.vh * dt * ASC.R / r;
  s.t += dt;
  if (s.stage === 1) s.p1 = Math.max(0, s.p1 - mdot * dt); else s.p2 = Math.max(0, s.p2 - mdot * dt);
  s.maxQ = Math.max(s.maxQ, s.q);
  if (s.stage === 2 && T > 0) s.s2lit = true;

  var o = ASC.orbit(s);
  s.pe = o.pe; s.ap = o.ap;
  if (s.q > ASC.QMAX) return ASC.end(s, false, 'maxq');
  if (s.h < 0 && s.t > 8) return ASC.end(s, false, 'crash');
  if (s.stage === 2 && s.p2 <= 0 && o.pe < ASC.TARGET_PE) return ASC.end(s, false, 'suborbital');
  if (o.pe >= ASC.TARGET_PE) return ASC.end(s, true, null);
};

ASC.end = function (s, ok, why) { s.done = true; s.ok = ok; s.why = why; };

ASC.stageSep = function (s) {
  if (s.stage !== 1) return false;
  s.stage = 2; s.p1 = 0;
  return true;
};
ASC.dropFairing = function (s) {
  if (!s.fairing) return false;
  s.fairing = false;
  if (s.h < 90e3) s.fairingLow = true;
  return true;
};

/* the pitch program a guidance computer would fly: a gravity turn
   that starts after the tower is cleared, then lofts and flattens out
   over the second stage until horizontal speed builds up */
ASC.guide = function (s) {
  var h = s.h;
  if (h < 1200) return 0;
  if (s.stage === 1) return Math.min(72, 72 * Math.pow((h - 1200) / 62000, 0.55));
  /* second stage: hold a climb rate that settles at ~200 km, and spend the
     rest of the thrust on horizontal speed (gravity-compensated guidance) */
  var r = ASC.R + h, st = s.v.s2, m = ASC.mass(s);
  var T = s.p2 > 0 ? st.thrust * s.throttle : st.thrust;
  var vvWant = Math.max(-120, Math.min(500, (200e3 - h) / 70));
  var aUp = (ASC.MU / (r * r) - s.vh * s.vh / r) + (vvWant - s.vv) / 25;
  var c = Math.max(-0.4, Math.min(0.9, aUp * m / T));
  return Math.acos(c) * 180 / Math.PI;
};

/* ---------------------------------------------------------------- *
 * the interactive overlay                                          *
 * ---------------------------------------------------------------- */
function ascentRun(o, done) {
  /* o: { practice, payloadKg, hwFail, lv, cadet } */
  var es = LANG === 'es';
  var root = document.getElementById('ascent');
  if (!root) {
    root = document.createElement('div');
    root.id = 'ascent'; root.className = 'ascent';
    document.body.appendChild(root);
  }
  root.hidden = false; OVERLAY_OPEN = true;
  root.innerHTML = '<canvas id="as-cv"></canvas>' +
    '<div class="as-top"><div class="as-met" id="as-met">T−10</div><div class="as-cap" id="as-cap" aria-live="polite"></div></div>' +
    '<div class="as-gauges" id="as-g"></div>' +
    '<canvas class="as-plot" id="as-plot" aria-label="' + esc(es ? 'Gráfica altitud contra distancia' : 'Altitude versus downrange plot') + '"></canvas>' +
    '<div class="as-ctl">' +
    '<div class="as-grp"><span>' + esc(es ? 'Cabeceo' : 'Pitch') + '</span><button class="as-b" id="as-pl" aria-label="pitch up">◀</button><b id="as-pv">0°</b><button class="as-b" id="as-pr" aria-label="pitch down">▶</button></div>' +
    '<div class="as-grp"><span>' + esc(es ? 'Empuje' : 'Throttle') + '</span><button class="as-b" id="as-td">−</button><b id="as-tv">100%</b><button class="as-b" id="as-tu">+</button></div>' +
    '<button class="as-act" id="as-act"></button>' +
    '<label class="as-auto"><input type="checkbox" id="as-ap"' + (o.cadet ? ' checked' : '') + '> ' + esc(es ? 'Piloto automático' : 'Autopilot') + '</label>' +
    '</div><div class="as-end" id="as-end" hidden></div>' +
    '<button class="as-help" id="as-help" type="button">?</button>';

  var cv = document.getElementById('as-cv'), ctx = cv.getContext('2d');
  var pv = document.getElementById('as-plot'), pctx = pv.getContext('2d');
  var s = ASC.init(o.payloadKg), keys = {}, last = 0, count = 10, raf = 0, closed = false, ended = false, paused = false;
  var hwAt = o.hwFail ? 40 + Math.random() * 90 : -1;
  var stars = [];
  for (var i = 0; i < 180; i++) stars.push([Math.random(), Math.random(), Math.random() * 1.3 + 0.3]);
  var tips = [], said = {};
  function say(k, txt, cls) {
    if (said[k]) return; said[k] = true;
    var cap = document.getElementById('as-cap');
    cap.textContent = txt; cap.className = 'as-cap ' + (cls || '');
    if (typeof voiceSay === 'function') voiceSay('nexus', txt, { queue: k !== 'cd', fast: true });
  }
  function help() {
    paused = true;
    showCard(es ? 'Cómo pilotar el ascenso' : 'How to fly the ascent',
      es ? '<ol><li><b>Despegue vertical</b> hasta salir de la torre.</li><li><b>Giro gravitatorio:</b> inclina poco a poco hacia la derecha (▶). Sigue la marca amarilla del guiado.</li><li><b>Max-Q:</b> si la presión dinámica pasa de 32 kPa, baja el empuje (−). A 45 kPa el cohete se rompe.</li><li><b>Separa la etapa</b> (Espacio) cuando la primera se quede sin combustible.</li><li><b>Suelta la cofia</b> por encima de 100 km: antes, el calor del aire dañaría tu nave.</li><li>Gana <b>velocidad horizontal</b> hasta que el perigeo supere 160 km: ¡estás en órbita!</li></ol><p>Teclado: ◀ ▶ cabeceo · ▲ ▼ empuje · Espacio etapa/cofia</p>'
        : '<ol><li><b>Lift off vertically</b> until you clear the tower.</li><li><b>Gravity turn:</b> pitch over gently to the right (▶). Follow the yellow guidance mark.</li><li><b>Max-Q:</b> if dynamic pressure passes 32 kPa, throttle down (−). At 45 kPa the rocket breaks up.</li><li><b>Stage</b> (Space) when the first stage runs dry.</li><li><b>Drop the fairing</b> above 100 km: earlier, air heating would damage your spacecraft.</li><li>Build <b>horizontal speed</b> until perigee clears 160 km: you are in orbit!</li></ol><p>Keyboard: ◀ ▶ pitch · ▲ ▼ throttle · Space stage/fairing</p>',
      es ? 'Entendido' : 'Got it', function () { hideCard(); paused = false; last = 0; });
  }
  function showCard(title, html, btn, cb, cls) {
    var el = document.getElementById('as-end');
    el.hidden = false;
    el.innerHTML = '<div class="as-card ' + (cls || '') + '"><h2>' + esc(title) + '</h2><div class="as-body">' + html + '</div><button class="btn primary" id="as-ok">' + esc(btn) + '</button></div>';
    if (typeof voiceSay === 'function' && cls) voiceSay('nexus', title + (/[.!?]$/.test(title) ? ' ' : '. ') + (el.querySelector('.as-body p') ? el.querySelector('.as-body p').textContent : ''));
    var b = document.getElementById('as-ok');
    b.onclick = cb; b.focus();
  }
  function hideCard() { document.getElementById('as-end').hidden = true; }

  function act() {
    if (ended) return;
    if (!s.lit) return;
    if (s.stage === 1) { if (ASC.stageSep(s)) { SFX.thump(); say('sep', es ? 'Separación de etapa · encendido de la segunda etapa' : 'Stage separation · second stage ignition'); } }
    else if (s.fairing) { ASC.dropFairing(s); SFX.thump(); say('fair', s.fairingLow ? (es ? '¡Cofia soltada demasiado bajo! El calor dañó los paneles' : 'Fairing dropped too low! Heating damaged the arrays') : (es ? 'Separación de la cofia' : 'Fairing separation'), s.fairingLow ? 'warn' : ''); }
  }
  document.getElementById('as-act').onclick = act;
  document.getElementById('as-help').onclick = help;
  function hold(id, k) {
    var b = document.getElementById(id);
    b.onpointerdown = function (e) { e.preventDefault(); keys[k] = true; };
    b.onpointerup = b.onpointerleave = b.onpointercancel = function () { keys[k] = false; };
  }
  hold('as-pl', 'ArrowLeft'); hold('as-pr', 'ArrowRight'); hold('as-td', 'ArrowDown'); hold('as-tu', 'ArrowUp');
  function kd(e) {
    if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].indexOf(e.key) >= 0) { keys[e.key] = true; e.preventDefault(); }
    if (e.key === ' ' && !ended && !paused) { e.preventDefault(); act(); }
  }
  function ku(e) { keys[e.key] = false; }
  document.addEventListener('keydown', kd); document.addEventListener('keyup', ku);

  function finish(res) {
    if (closed) return;
    closed = true;
    cancelAnimationFrame(raf);
    document.removeEventListener('keydown', kd); document.removeEventListener('keyup', ku);
    root.hidden = true; OVERLAY_OPEN = false;
    done(res);
  }

  function endScreen() {
    ended = true;
    var o2 = ASC.orbit(s), es2 = es, html;
    var reasons = {
      maxq: es2 ? 'La presión dinámica llegó a ' + n0(s.maxQ / 1000) + ' kPa y la estructura cedió. Debiste bajar el empuje o girar más tarde en la zona de Max-Q.' : 'Dynamic pressure reached ' + n0(s.maxQ / 1000) + ' kPa and the structure failed. Throttle down or pitch over later through Max-Q.',
      crash: es2 ? 'El cohete volvió a caer. Giraste demasiado pronto o demasiado fuerte y perdiste la velocidad vertical.' : 'The rocket fell back. You pitched over too early or too hard and lost vertical speed.',
      suborbital: es2 ? 'La segunda etapa se agotó con el perigeo a ' + n0(Math.max(-999, o2.pe / 1000)) + ' km: vuelo suborbital. Faltó velocidad horizontal: inclina más hacia el horizonte en la segunda etapa.' : 'The second stage ran dry with perigee at ' + n0(Math.max(-999, o2.pe / 1000)) + ' km: suborbital. You lacked horizontal speed: pitch closer to the horizon on the second stage.',
      hw: es2 ? 'Falla de motor en la primera etapa. Ni el mejor piloto puede salvar un cohete sin empuje: por eso importa la fiabilidad del lanzador.' : 'First-stage engine failure. Not even the best pilot can save a rocket without thrust: that is why launcher reliability matters.'
    };
    var left = s.p2 / s.v.s2.prop;
    if (s.ok) {
      SFX.chime();
      html = '<div class="as-kv"><div><span>' + esc(es2 ? 'Perigeo' : 'Perigee') + '</span><b>' + n0(o2.pe / 1000) + ' km</b></div>' +
        '<div><span>' + esc(es2 ? 'Apogeo' : 'Apogee') + '</span><b>' + n0(o2.ap / 1000) + ' km</b></div>' +
        '<div><span>Max-Q</span><b>' + n1(s.maxQ / 1000) + ' kPa</b></div>' +
        '<div><span>' + esc(es2 ? 'Combustible sobrante' : 'Fuel left') + '</span><b>' + n0(left * 100) + '%</b></div></div>' +
        '<p>' + esc(left > 0.08 ? (es2 ? 'Ascenso eficiente: el combustible sobrante se usa para una inyección más precisa, y tu nave ahorrará propelente.' : 'Efficient ascent: the leftover fuel buys a more precise injection, and your spacecraft will save propellant.')
          : (es2 ? 'Llegaste a órbita con lo justo. Un giro gravitatorio más limpio deja más combustible de reserva.' : 'You reached orbit with little to spare. A cleaner gravity turn leaves more reserve fuel.')) + '</p>' +
        (s.fairingLow ? '<p class="as-warn">' + esc(es2 ? 'Soltaste la cofia por debajo de 90 km: el calentamiento dañó 10% de los paneles.' : 'You dropped the fairing below 90 km: heating damaged 10% of the arrays.') + '</p>' : '') +
        (s.fairing ? '<p class="as-warn">' + esc(es2 ? 'Nunca soltaste la cofia: cargaste 2 toneladas inútiles hasta la órbita.' : 'You never dropped the fairing: you carried 2 useless tonnes to orbit.') + '</p>' : '');
      showCard(es2 ? '¡En órbita!' : 'Orbit achieved!', html, o.practice ? (es2 ? 'Cerrar' : 'Close') : (es2 ? 'Continuar la misión' : 'Continue the mission'),
        function () { finish({ ok: true, fuelLeft: left, fairingLow: s.fairingLow, maxQ: s.maxQ }); }, 'ok');
    } else {
      SFX.boom();
      html = '<p>' + esc(reasons[s.why] || '') + '</p>';
      if (o.practice) {
        showCard(es2 ? 'Vehículo perdido' : 'Vehicle lost', html + '<p>' + esc(es2 ? 'Es solo el simulador de entrenamiento: inténtalo otra vez.' : 'It is only the training simulator: try again.') + '</p>', es2 ? 'Reintentar' : 'Retry',
          function () { closed = true; cancelAnimationFrame(raf); document.removeEventListener('keydown', kd); document.removeEventListener('keyup', ku); ascentRun(o, done); }, 'bad');
        var ex = document.createElement('button');
        ex.className = 'btn ghost'; ex.textContent = es2 ? 'Salir' : 'Exit';
        ex.onclick = function () { finish({ ok: false, why: s.why }); };
        document.querySelector('#as-end .as-card').appendChild(ex);
      } else {
        showCard(es2 ? 'Falla en el lanzamiento' : 'Launch failure', html, es2 ? 'Ver el informe' : 'See the report',
          function () { finish({ ok: false, why: s.why, text: reasons[s.why] }); }, 'bad');
      }
    }
  }

  function gauges() {
    var o2 = ASC.orbit(s), vc = Math.sqrt(ASC.MU / (ASC.R + Math.max(0, s.h)));
    var qcls = s.q > ASC.QWARN ? 'bad' : (s.q > ASC.QWARN * 0.7 ? 'warn' : '');
    function g(label, val, pct, cls) {
      return '<div class="as-gg ' + (cls || '') + '"><span>' + esc(label) + '</span><b>' + val + '</b>' + (pct != null ? '<i><em style="width:' + Math.max(0, Math.min(100, pct * 100)) + '%"></em></i>' : '') + '</div>';
    }
    var hv = Math.sqrt(s.vh * s.vh + s.vv * s.vv);
    document.getElementById('as-g').innerHTML =
      g(es ? 'Altitud' : 'Altitude', n1(Math.max(0, s.h) / 1000) + ' km', s.h / 200e3) +
      g(es ? 'Velocidad' : 'Speed', n2(hv / 1000) + ' km/s', s.vh / vc) +
      g(es ? 'Vel. horizontal / orbital' : 'Horizontal / orbital speed', n2(s.vh / 1000) + ' / ' + n2(vc / 1000), s.vh / vc) +
      g(es ? 'Presión dinámica' : 'Dynamic pressure', n1(s.q / 1000) + ' kPa', s.q / ASC.QMAX, qcls) +
      g(es ? 'Combustible etapa ' + s.stage : 'Stage ' + s.stage + ' fuel', n0((s.stage === 1 ? s.p1 / s.v.s1.prop : s.p2 / s.v.s2.prop) * 100) + '%', s.stage === 1 ? s.p1 / s.v.s1.prop : s.p2 / s.v.s2.prop, (s.stage === 1 ? s.p1 : s.p2) <= 0 ? 'bad' : '') +
      g(es ? 'Perigeo' : 'Perigee', o2.pe < 0 ? (es ? 'suborbital' : 'suborbital') : n0(o2.pe / 1000) + ' km', Math.max(0, o2.pe) / ASC.TARGET_PE, o2.pe >= ASC.TARGET_PE ? 'ok' : '');
    document.getElementById('as-pv').textContent = n0(s.pitch) + '°';
    document.getElementById('as-tv').textContent = n0(s.throttle * 100) + '%';
    var a = document.getElementById('as-act');
    a.textContent = s.stage === 1 ? (es ? 'SEPARAR ETAPA' : 'STAGE') : (s.fairing ? (es ? 'SOLTAR COFIA' : 'DROP FAIRING') : (es ? 'ETAPA FINAL' : 'FINAL STAGE'));
    a.disabled = !s.lit || (s.stage === 2 && !s.fairing);
    a.classList.toggle('hot', (s.stage === 1 && s.p1 <= 0) || (s.stage === 2 && s.fairing && s.h > 100e3));
  }

  function draw(ts) {
    var dpr = window.devicePixelRatio || 1, W = cv.clientWidth, H = cv.clientHeight;
    if (cv.width !== Math.round(W * dpr)) { cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    var hk = Math.max(0, s.h) / 1000, space = Math.min(1, hk / 70);
    var sky = ctx.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, mix([70, 130, 210], [2, 3, 10], Math.min(1, space * 1.3)));
    sky.addColorStop(1, mix([150, 195, 240], [8, 14, 34], space));
    ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = 'rgba(230,236,255,' + (space * 0.9) + ')';
    for (var i = 0; i < stars.length; i++) ctx.fillRect(stars[i][0] * W, stars[i][1] * H, stars[i][2], stars[i][2]);

    /* the ground falls away and Earth's limb appears as you climb */
    var cx = W * 0.5, cy = H * 0.62;
    var groundY = cy + 60 + hk * 30;
    if (hk < 25) {
      ctx.fillStyle = '#26402c'; ctx.fillRect(0, groundY, W, H);
      ctx.fillStyle = '#3d4a5a'; ctx.fillRect(cx + 24 - s.x / 40, groundY - 120, 9, 120);
    } else {
      var curve = Math.min(1, (hk - 25) / 150), Rpx = W * (6 - curve * 4.6);
      var ey = H + Rpx - H * (0.32 - curve * 0.2);
      var eg = ctx.createRadialGradient(cx, ey, Rpx * 0.9, cx, ey, Rpx * 1.02);
      eg.addColorStop(0, '#1d5fae'); eg.addColorStop(0.97, '#5aa8ff'); eg.addColorStop(1, 'rgba(120,190,255,0)');
      ctx.fillStyle = eg; ctx.beginPath(); ctx.arc(cx, ey, Rpx * 1.02, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'rgba(90,180,110,.35)';
      for (i = 0; i < 6; i++) {
        var lx = ((i * 260 - s.x / 900) % (W + 300)) - 150;
        ctx.beginPath(); ctx.ellipse(lx, ey - Rpx + 30 + (i % 2) * 18, 90, 14, 0, 0, Math.PI * 2); ctx.fill();
      }
    }

    /* rocket, rotated to the commanded pitch */
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(s.pitch * Math.PI / 180);
    var len = s.stage === 1 ? 92 : 46, w = 13;
    var thrusting = s.lit && !s.done && (s.stage === 1 ? s.p1 > 0 : s.p2 > 0);
    if (thrusting) {
      var fl = (26 + Math.random() * 14) * s.throttle * (s.stage === 1 ? 1.4 : 0.9) * (1 + space * 0.8);
      var fg = ctx.createLinearGradient(0, 0, 0, fl);
      fg.addColorStop(0, 'rgba(255,250,220,1)'); fg.addColorStop(0.4, 'rgba(255,170,60,.9)'); fg.addColorStop(1, 'rgba(255,90,30,0)');
      ctx.fillStyle = fg; ctx.beginPath(); ctx.moveTo(-w * (0.4 + space * 0.6), 0); ctx.lineTo(w * (0.4 + space * 0.6), 0); ctx.lineTo(0, fl); ctx.closePath(); ctx.fill();
    }
    ctx.fillStyle = '#e8edf6'; ctx.fillRect(-w / 2, -len, w, len);
    ctx.fillStyle = '#c33'; if (s.stage === 1) ctx.fillRect(-w / 2, -len * 0.52, w, 3);
    if (s.fairing) { ctx.fillStyle = '#f4f6fb'; ctx.beginPath(); ctx.moveTo(-w / 2 - 2, -len); ctx.lineTo(w / 2 + 2, -len); ctx.lineTo(0, -len - 26); ctx.closePath(); ctx.fill(); }
    else { ctx.fillStyle = '#c9a24a'; ctx.fillRect(-5, -len - 9, 10, 9); ctx.fillStyle = '#3a63d8'; ctx.fillRect(-13, -len - 7, 7, 4); ctx.fillRect(6, -len - 7, 7, 4); }
    ctx.restore();

    /* the guidance cue: where the flight computer would point */
    var gp = ASC.guide(s);
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(gp * Math.PI / 180);
    ctx.strokeStyle = 'rgba(240,194,75,.9)'; ctx.setLineDash([4, 5]); ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(0, -110); ctx.lineTo(0, -170); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = '#f0c24b'; ctx.beginPath(); ctx.moveTo(0, -178); ctx.lineTo(-6, -166); ctx.lineTo(6, -166); ctx.closePath(); ctx.fill();
    ctx.restore();

    /* altitude-downrange plot */
    var pw = pv.clientWidth, ph = pv.clientHeight;
    if (pv.width !== Math.round(pw * dpr)) { pv.width = Math.round(pw * dpr); pv.height = Math.round(ph * dpr); }
    pctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    pctx.clearRect(0, 0, pw, ph);
    pctx.strokeStyle = 'rgba(120,150,210,.3)'; pctx.lineWidth = 1;
    pctx.strokeRect(0.5, 0.5, pw - 1, ph - 1);
    var ty = ph - (ASC.TARGET_PE / 250e3) * ph;
    pctx.setLineDash([3, 4]); pctx.strokeStyle = 'rgba(62,207,154,.6)'; pctx.beginPath(); pctx.moveTo(0, ty); pctx.lineTo(pw, ty); pctx.stroke(); pctx.setLineDash([]);
    pctx.fillStyle = '#9fb0d0'; pctx.font = '10px ui-monospace,monospace';
    pctx.fillText(es ? 'altitud vs distancia' : 'altitude vs downrange', 6, 13);
    pctx.fillText('160 km', pw - 44, ty - 4);
    pctx.strokeStyle = '#f0c24b'; pctx.lineWidth = 1.6; pctx.beginPath();
    for (i = 0; i < s.path.length; i++) {
      var px = s.path[i][0] / 2000e3 * pw, py = ph - s.path[i][1] / 250e3 * ph;
      if (i) pctx.lineTo(px, py); else pctx.moveTo(px, py);
    }
    pctx.stroke();
  }

  function frame(ts) {
    if (closed) return;
    var dt = last ? Math.min(0.05, (ts - last) / 1000) : 0.016; last = ts;
    if (paused) { gauges(); draw(ts); raf = requestAnimationFrame(frame); return; }
    if (!s.lit) {
      count -= dt * 2.2;
      document.getElementById('as-met').textContent = 'T−' + Math.max(0, Math.ceil(count));
      if (typeof crewCall === 'function') say('cd', es ? crewCall('pil').replace(/^./, function (m) { return m.toUpperCase(); }) + ', todos los sistemas listos. T menos diez.' : crewCall('pil').replace(/^./, function (m) { return m.toUpperCase(); }) + ', all systems go. T minus ten.');
      if (count <= 3) say('ign', es ? 'Encendido de motores' : 'Engine start');
      if (count <= 0) { s.lit = true; SFX.beep(true); SFX.rumble(4); say('lift', (es ? '¡Despegue! ' : 'Liftoff! ') + (o.lv || '')); }
    } else if (!s.done) {
      if (s.q > ASC.QWARN) say('mq', es ? 'Max-Q: presión dinámica alta. Reduce el empuje.' : 'Max-Q: high dynamic pressure. Throttle down.', 'warn');
      if (s.h > 100e3) say('space', es ? 'Superamos los cien kilómetros: estamos en el espacio.' : 'Passing one hundred kilometres: we are in space.');
      var auto = document.getElementById('as-ap').checked;
      if (auto) {
        var gp = ASC.guide(s);
        s.pitch += Math.max(-10 * dt, Math.min(10 * dt, gp - s.pitch));
        s.throttle = s.q > ASC.QWARN * 0.94 ? Math.max(0.6, s.throttle - dt * 0.6) : Math.min(1, s.throttle + dt * 0.4);
        if (s.stage === 1 && s.p1 <= 0) act();
        if (s.stage === 2 && s.fairing && s.h > 110e3) act();
      } else {
        if (keys.ArrowRight) s.pitch = Math.min(110, s.pitch + 9 * dt);
        if (keys.ArrowLeft) s.pitch = Math.max(-10, s.pitch - 9 * dt);
        if (keys.ArrowDown) s.throttle = Math.max(0.5, s.throttle - 0.5 * dt);
        if (keys.ArrowUp) s.throttle = Math.min(1, s.throttle + 0.5 * dt);
      }
      var simDt = dt * ASC.WARP, n = 8;
      for (var i = 0; i < n; i++) ASC.step(s, simDt / n);
      if (hwAt > 0 && s.t > hwAt && s.stage === 1 && !s.done) { ASC.end(s, false, 'hw'); }
      if (s.path.length === 0 || s.t - s.path[s.path.length - 1][2] > 2) s.path.push([s.x, Math.max(0, s.h), s.t]);
      var m = Math.floor(s.t / 60), sec = Math.floor(s.t % 60);
      document.getElementById('as-met').textContent = 'T+' + (m < 10 ? '0' : '') + m + ':' + (sec < 10 ? '0' : '') + sec;
      if (s.h > 1500 && s.pitch < 2) say('turn', es ? 'Torre despejada · inicia el giro gravitatorio ▶' : 'Tower cleared · begin the gravity turn ▶');
      if (s.q > ASC.QWARN) say('maxq', es ? '¡Max-Q! Baja el empuje ▼' : 'Max-Q! Throttle down ▼', 'warn');
      if (s.stage === 1 && s.p1 <= 0) say('meco', es ? 'Apagado de la primera etapa · ¡SEPARA LA ETAPA! (Espacio)' : 'Main engine cutoff · STAGE NOW! (Space)', 'warn');
      if (s.stage === 2 && s.fairing && s.h > 100e3) say('fairok', es ? 'Sobre 100 km · ya puedes soltar la cofia' : 'Above 100 km · you can drop the fairing now');
      if (s.done) {
        if (s.ok) say('orbit', es ? 'Apagado de la segunda etapa · ¡ÓRBITA!' : 'Second engine cutoff · ORBIT!', 'ok');
        else say('lost', es ? 'Vehículo perdido' : 'Vehicle lost', 'bad');
        setTimeout(endScreen, 900);
      }
    }
    gauges();
    draw(ts);
    raf = requestAnimationFrame(frame);
  }
  gauges();
  if (!pref('on_ascent_help', '')) { setPref('on_ascent_help', '1'); help(); }
  raf = requestAnimationFrame(frame);
}
