/* ORBITAL NEXUS — Titan flight.
   A rotorcraft mini game in the spirit of Dragonfly: on Titan gravity is
   1.35 m/s² and the air is four times denser than Earth's, so a drone
   climbs easily and drag keeps it slow. Fly between dune fields, land
   gently on the science sites to take samples, keep out of the methane
   lake, and watch the battery: it only recharges on the ground, from the
   RTG. */

var DRONE = { G: 1.352, LIFT: 3.0, SIDE: 2.8, DRAG: 0.022, SAFE_VY: 2.2, SAFE_VX: 2.0, LEN: 780 };

function droneTerrain(x) {
  var y = 22 + 8 * Math.sin(x / 37) + 5 * Math.sin(x / 13 + 1) + 12 * Math.sin(x / 180);
  /* flat pads: the start, three sites and the lake */
  var pads = DRONE.pads;
  for (var i = 0; i < pads.length; i++) {
    var p = pads[i], d = Math.abs(x - p.x);
    if (d < p.w) return p.h;
    if (d < p.w + 18) { var k = (d - p.w) / 18; k = k * k * (3 - 2 * k); return p.h * (1 - k) + y * k; }
  }
  return y;
}

function droneSetup() {
  DRONE.pads = [{ x: 50, w: 22, h: 18, kind: 'base' }, { x: 210, w: 16, h: 30, kind: 'site', n: 0 },
    { x: 355, w: 50, h: 6, kind: 'lake' }, { x: 500, w: 14, h: 38, kind: 'site', n: 1 }, { x: 720, w: 14, h: 24, kind: 'site', n: 2 }];
  DRONE.sites = [
    { es: 'Dunas orgánicas', en: 'Organic dunes', done: false, x: 210 },
    { es: 'Borde del cráter Selk', en: 'Selk crater rim', done: false, x: 500 },
    { es: 'Lecho de río seco', en: 'Dry river bed', done: false, x: 720 }
  ];
}

function droneGame(opts, done) {
  droneSetup();
  var es = LANG === 'es';
  var root = document.getElementById('drone');
  if (!root) { root = document.createElement('div'); root.id = 'drone'; root.className = 'drone'; document.body.appendChild(root); }
  root.innerHTML = '<canvas id="dr-cv"></canvas>' +
    '<div class="dr-top"><div class="dr-title"><b>' + esc(es ? 'Vuelo en Titán' : 'Flight on Titan') + '</b><span>' +
    esc(es ? 'g = 1,35 m/s² · aire 4× más denso que en la Tierra' : 'g = 1.35 m/s² · air 4× denser than on Earth') + '</span></div>' +
    '<button class="icon-btn dr-x" data-dr="quit" aria-label="' + esc(es ? 'Salir' : 'Quit') + '">' + icon('close', 'ico') + '</button></div>' +
    '<div class="dr-hud" id="dr-hud"></div>' +
    '<div class="dr-pad" aria-hidden="true"><button data-k="left">◀</button><button data-k="up">▲</button><button data-k="right">▶</button></div>' +
    '<div class="dr-card" id="dr-card"></div>';
  root.hidden = false; OVERLAY_OPEN = true;
  var cv = root.querySelector('#dr-cv'), g = cv.getContext('2d');
  var st = { x: 50, y: droneTerrain(50) + 0.6, vx: 0, vy: 0, bat: 100, landed: true, on: null, sample: 0, msg: '', msgT: 0, over: false, started: false, crashes: 0, lake: false, t: 0, parts: [] };
  var keys = { up: false, left: false, right: false }, raf = 0, last = 0;
  window.__drs = st; /* read-only hook for automated play tests */

  function card(html) { var c = root.querySelector('#dr-card'); c.innerHTML = html; c.hidden = !html; }
  card('<span class="dr-k">' + esc(es ? 'Inspirado en Dragonfly · NASA 2028' : 'Inspired by Dragonfly · NASA 2028') + '</span><h2>' +
    esc(es ? 'Toma muestras en 3 sitios' : 'Sample 3 sites') + '</h2><p>' +
    esc(es ? 'Mantén ▲ (o Espacio) para subir y ◀ ▶ para avanzar. Aterriza suave sobre las banderas: menos de 2,2 m/s. No caigas al lago: ¡es metano líquido! La batería solo se recarga en tierra, con el RTG.'
      : 'Hold ▲ (or Space) to climb and ◀ ▶ to move. Land gently on the flags: under 2.2 m/s. Stay out of the lake: it is liquid methane! The battery only recharges on the ground, from the RTG.') +
    '</p><button class="btn primary" data-dr="go">' + esc(es ? 'Despegar' : 'Lift off') + '</button>');

  function setKey(k, v) { if (k in keys) keys[k] = v; }
  function kd(e) {
    var m = { ArrowUp: 'up', ' ': 'up', w: 'up', ArrowLeft: 'left', a: 'left', ArrowRight: 'right', d: 'right' }[e.key];
    if (e.key === 'Escape') { finish(true); return; }
    if (m) { e.preventDefault(); setKey(m, true); if (!st.started) start(); }
  }
  function ku(e) { var m = { ArrowUp: 'up', ' ': 'up', w: 'up', ArrowLeft: 'left', a: 'left', ArrowRight: 'right', d: 'right' }[e.key]; if (m) setKey(m, false); }
  document.addEventListener('keydown', kd); document.addEventListener('keyup', ku);
  root.onpointerdown = function (e) {
    var b = e.target.closest('[data-k]');
    if (b) { e.preventDefault(); setKey(b.getAttribute('data-k'), true); if (!st.started) start(); b.setPointerCapture && b.setPointerCapture(e.pointerId); }
  };
  root.onpointerup = root.onpointercancel = function (e) { var b = e.target.closest('[data-k]'); if (b) setKey(b.getAttribute('data-k'), false); else keys.up = keys.left = keys.right = false; };
  root.onclick = function (e) {
    var b = e.target.closest('[data-dr]'); if (!b) return;
    var a = b.getAttribute('data-dr');
    if (a === 'go') start();
    if (a === 'quit' || a === 'done') finish(a === 'quit');
    if (a === 'again') { cleanup(); droneGame(opts, done); }
  };

  function start() { if (st.started) return; st.started = true; card(''); }
  function say(m) { st.msg = m; st.msgT = 2.6; }

  function step(dt) {
    st.t += dt;
    if (st.msgT > 0) st.msgT -= dt;
    if (!st.started || st.over) return;
    var thrust = keys.up && st.bat > 0;
    var ax = 0, ay = -DRONE.G;
    if (thrust) ay += DRONE.LIFT;
    if (!st.landed && st.bat > 0) { if (keys.left) ax -= DRONE.SIDE; if (keys.right) ax += DRONE.SIDE; }
    ax -= DRONE.DRAG * st.vx * Math.abs(st.vx);
    ay -= DRONE.DRAG * st.vy * Math.abs(st.vy);
    st.bat = Math.max(0, st.bat - dt * ((thrust ? 1.25 : 0) + (st.landed ? 0 : 0.35) + ((keys.left || keys.right) && !st.landed ? 0.35 : 0)));
    if (st.landed) {
      st.bat = Math.min(100, st.bat + dt * 4.5); /* the RTG trickle-charges the battery */
      if (thrust && st.bat > 3) { st.landed = false; st.vy = 0.8; st.on = null; st.sample = 0; }
      else {
        st.vx = 0; st.vy = 0;
        if (st.on && st.on.kind === 'site' && !DRONE.sites[st.on.n].done) {
          st.sample += dt;
          if (st.sample > 1.8) {
            DRONE.sites[st.on.n].done = true; SFX.chime && SFX.chime();
            say('✓ ' + (es ? 'Muestra analizada: ' : 'Sample analysed: ') + (es ? DRONE.sites[st.on.n].es : DRONE.sites[st.on.n].en) + ' (+60)');
            if (DRONE.sites.every(function (s) { return s.done; })) setTimeout(function () { endCard(); }, 900);
          }
        }
        if (st.bat <= 0 && !thrust) {}
        return;
      }
    }
    st.vx += ax * dt; st.vy += ay * dt;
    st.x += st.vx * dt; st.y += st.vy * dt;
    if (st.x < 5) { st.x = 5; st.vx = 0; }
    if (st.x > DRONE.LEN - 5) { st.x = DRONE.LEN - 5; st.vx = 0; }
    if (st.y > 140) { st.y = 140; st.vy = Math.min(0, st.vy); }
    if (thrust && Math.random() < 0.7) st.parts.push({ x: st.x + (Math.random() - 0.5) * 2, y: st.y - 0.6, vx: (Math.random() - 0.5) * 2, vy: -3 - Math.random() * 2, life: 0.6 });
    var gy = droneTerrain(st.x);
    if (st.y <= gy + 0.6) {
      var pad = null;
      for (var i = 0; i < DRONE.pads.length; i++) if (Math.abs(st.x - DRONE.pads[i].x) < DRONE.pads[i].w) pad = DRONE.pads[i];
      if (pad && pad.kind === 'lake') {
        st.over = true; st.lake = true; say(es ? '¡Al lago de metano! Dragonfly no flota.' : 'Into the methane lake! Dragonfly does not float.');
        setTimeout(function () { endCard(); }, 1100); return;
      }
      var hard = -st.vy > DRONE.SAFE_VY || Math.abs(st.vx) > DRONE.SAFE_VX;
      st.y = gy + 0.6; st.landed = true; st.on = pad;
      if (hard) {
        st.crashes++; st.bat = Math.max(0, st.bat - 22);
        say(es ? '¡Aterrizaje duro! (' + n1(-st.vy) + ' m/s) Batería −22%' : 'Hard landing! (' + n1(-st.vy) + ' m/s) Battery −22%');
        if (st.crashes >= 3) { st.over = true; setTimeout(function () { endCard(); }, 900); }
      } else if (pad && pad.kind === 'site' && !DRONE.sites[pad.n].done) say(es ? 'Aterrizaje suave. Tomando muestra…' : 'Soft landing. Taking a sample…');
      else if (!pad) say(es ? 'Aterrizaje fuera de un sitio: la batería se recarga.' : 'Landed off-site: the battery recharges.');
      st.vx = 0; st.vy = 0;
    }
  }

  function endCard() {
    if (root.hidden) return;
    st.over = true;
    var n = DRONE.sites.filter(function (s) { return s.done; }).length, pts = n * 60;
    var line = n === 3 ? (es ? '¡Las tres muestras! Así se explora un mundo con aire.' : 'All three samples! That is how you explore a world with air.')
      : (st.lake ? (es ? 'El lago de metano es hermoso, pero mortal.' : 'The methane lake is beautiful, but deadly.')
        : (es ? 'Practica aterrizajes más suaves: baja despacio en los últimos metros.' : 'Practise softer landings: come down slowly in the last metres.'));
    card('<span class="dr-k">' + esc(es ? 'Resultado del vuelo' : 'Flight result') + '</span><h2>' + n + ' / 3 ' + esc(es ? 'muestras' : 'samples') + '</h2><p>' + esc(line) +
      (opts.mission ? '<br><b>' + esc(es ? '+' + pts + ' puntos de ciencia para tu misión.' : '+' + pts + ' science points for your mission.') + '</b>' : '') + '</p>' +
      '<div class="dr-btns"><button class="btn ghost" data-dr="again">' + esc(es ? 'Volar otra vez' : 'Fly again') + '</button><button class="btn primary" data-dr="done">' + esc(es ? 'Terminar' : 'Finish') + '</button></div>');
  }

  function cleanup() {
    cancelAnimationFrame(raf);
    document.removeEventListener('keydown', kd); document.removeEventListener('keyup', ku);
  }
  function finish(quit) {
    cleanup();
    root.hidden = true; OVERLAY_OPEN = false;
    var n = DRONE.sites.filter(function (s) { return s.done; }).length;
    if (n === 3) award('titan');
    done && done({ samples: n, science: n * 60, quit: quit });
  }

  /* ------------ drawing ------------ */
  function draw() {
    var dpr = window.devicePixelRatio || 1, w = cv.clientWidth, h = cv.clientHeight;
    if (cv.width !== Math.round(w * dpr)) { cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); }
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    var ppm = Math.max(5, Math.min(w / 110, h / 70)), camX = st.x - w / ppm * 0.42, camY = Math.max(0, st.y - h / ppm * 0.55);
    function X(x) { return (x - camX) * ppm; }
    function Y(y) { return h - (y - camY) * ppm - h * 0.06; }
    /* haze sky */
    var sky = g.createLinearGradient(0, 0, 0, h);
    sky.addColorStop(0, '#3a2410'); sky.addColorStop(0.55, '#a8662a'); sky.addColorStop(1, '#e0a45a');
    g.fillStyle = sky; g.fillRect(0, 0, w, h);
    /* Saturn behind the haze */
    var sx = w * 0.78 - camX * 0.02 * ppm, sy = h * 0.2;
    g.globalAlpha = 0.18; g.fillStyle = '#f6e7c1'; g.beginPath(); g.arc(sx, sy, h * 0.11, 0, TAU); g.fill();
    g.strokeStyle = '#f6e7c1'; g.lineWidth = 3; g.beginPath(); g.ellipse(sx, sy, h * 0.24, h * 0.05, -0.3, 0, TAU); g.stroke(); g.globalAlpha = 1;
    /* far dunes (parallax) */
    g.fillStyle = 'rgba(120,64,20,.55)'; g.beginPath(); g.moveTo(0, h);
    for (var px = 0; px <= w; px += 8) { var wx = camX * 0.5 + px / ppm; g.lineTo(px, h * 0.62 - (10 * Math.sin(wx / 30) + 6 * Math.sin(wx / 11)) * ppm * 0.35); }
    g.lineTo(w, h); g.fill();
    /* terrain */
    g.fillStyle = '#6b3a10'; g.beginPath(); g.moveTo(0, h);
    for (px = 0; px <= w; px += 4) g.lineTo(px, Y(droneTerrain(camX + px / ppm)));
    g.lineTo(w, h); g.fill();
    g.strokeStyle = '#c47a35'; g.lineWidth = 2; g.beginPath();
    for (px = 0; px <= w; px += 4) { var yy = Y(droneTerrain(camX + px / ppm)); if (px) g.lineTo(px, yy); else g.moveTo(px, yy); }
    g.stroke();
    /* pads */
    DRONE.pads.forEach(function (p) {
      var x0 = X(p.x - p.w), x1 = X(p.x + p.w), y = Y(p.h);
      if (x1 < -50 || x0 > w + 50) return;
      if (p.kind === 'lake') {
        var lk = g.createLinearGradient(0, y, 0, y + 30); lk.addColorStop(0, '#1d2a4a'); lk.addColorStop(1, '#0c1226');
        g.fillStyle = lk; g.fillRect(x0, y - 2, x1 - x0, 40);
        g.fillStyle = 'rgba(160,190,255,.35)'; for (var r = 0; r < 4; r++) g.fillRect(x0 + ((st.t * 20 + r * 47) % (x1 - x0)), y + 2 + r * 4, 26, 1.5);
        g.fillStyle = '#cfe0ff'; g.font = '600 12px system-ui,sans-serif'; g.textAlign = 'center'; g.fillText(es ? 'Lago de metano' : 'Methane lake', (x0 + x1) / 2, y - 10);
        return;
      }
      g.fillStyle = p.kind === 'base' ? 'rgba(79,209,224,.5)' : 'rgba(240,194,75,.45)';
      g.fillRect(x0, y - 2, x1 - x0, 4);
      if (p.kind === 'site') {
        var s = DRONE.sites[p.n], fx = X(p.x);
        g.strokeStyle = '#fff'; g.lineWidth = 2; g.beginPath(); g.moveTo(fx, y); g.lineTo(fx, y - 34); g.stroke();
        g.fillStyle = s.done ? '#3ecf9a' : '#f0c24b'; g.beginPath(); g.moveTo(fx, y - 34); g.lineTo(fx + 20, y - 28); g.lineTo(fx, y - 22); g.fill();
        g.fillStyle = '#fff6e0'; g.font = '600 12px system-ui,sans-serif'; g.textAlign = 'center';
        g.fillText((s.done ? '✓ ' : '') + (es ? s.es : s.en), fx, y - 42);
      } else { g.fillStyle = '#c9f3f8'; g.font = '600 12px system-ui,sans-serif'; g.textAlign = 'center'; g.fillText(es ? 'Base' : 'Base', X(p.x), y - 10); }
    });
    /* rotor wash */
    st.parts = st.parts.filter(function (q) { q.life -= 1 / 60; q.x += q.vx / 60; q.y += q.vy / 60; return q.life > 0; });
    g.fillStyle = 'rgba(255,230,190,.5)';
    st.parts.forEach(function (q) { g.globalAlpha = Math.max(0, q.life * 1.5); g.fillRect(X(q.x), Y(q.y), 3, 3); }); g.globalAlpha = 1;
    /* the drone */
    var dx = X(st.x), dy = Y(st.y), tilt = (keys.right ? 0.18 : 0) - (keys.left ? 0.18 : 0);
    g.save(); g.translate(dx, dy - 6); g.rotate(st.landed ? 0 : tilt);
    g.fillStyle = '#e6eaf2'; g.fillRect(-16, -5, 32, 10);
    g.fillStyle = '#f0c24b'; g.fillRect(-4, -9, 8, 4);
    g.strokeStyle = '#e6eaf2'; g.lineWidth = 2; g.beginPath(); g.moveTo(-16, -2); g.lineTo(-28, -6); g.moveTo(16, -2); g.lineTo(28, -6);
    g.moveTo(-10, 5); g.lineTo(-14, 11); g.moveTo(10, 5); g.lineTo(14, 11); g.stroke();
    var blur = (keys.up && st.bat > 0) ? 1 : (st.landed ? 0.25 : 0.7), spin = Math.sin(st.t * 60) * 0.5 + 0.5;
    g.fillStyle = 'rgba(158,231,242,' + (0.35 + 0.45 * blur) + ')';
    [-28, 28].forEach(function (rx) { g.beginPath(); g.ellipse(rx, -8, 12 * (0.6 + 0.4 * (blur > 0.5 ? 1 : spin)), 2.2, 0, 0, TAU); g.fill(); });
    g.restore();
    /* sampling ring */
    if (st.landed && st.on && st.on.kind === 'site' && !DRONE.sites[st.on.n].done && st.sample > 0) {
      g.strokeStyle = '#3ecf9a'; g.lineWidth = 3; g.beginPath(); g.arc(dx, dy - 30, 12, -Math.PI / 2, -Math.PI / 2 + TAU * Math.min(1, st.sample / 1.8)); g.stroke();
    }
    /* message */
    if (st.msgT > 0) {
      g.font = '600 15px system-ui,sans-serif'; g.textAlign = 'center';
      var tw = g.measureText(st.msg).width + 28;
      var my = Math.max(150, h * 0.24);
      g.fillStyle = 'rgba(10,14,30,.78)'; g.fillRect(w / 2 - tw / 2, my - 22, tw, 34);
      g.fillStyle = '#fff6e0'; g.fillText(st.msg, w / 2, my);
    }
  }

  function hud() {
    var gy = droneTerrain(st.x), alt = Math.max(0, st.y - gy - 0.6), n = DRONE.sites.filter(function (s) { return s.done; }).length;
    var vcls = -st.vy > DRONE.SAFE_VY ? 'bad' : 'ok';
    root.querySelector('#dr-hud').innerHTML =
      '<div><span>' + esc(es ? 'Altura' : 'Altitude') + '</span><b>' + n1(alt) + ' m</b></div>' +
      '<div class="' + (st.landed ? '' : vcls) + '"><span>' + esc(es ? 'Vel. vertical' : 'Vertical speed') + '</span><b>' + n1(st.vy) + ' m/s</b></div>' +
      '<div><span>' + esc(es ? 'Vel. horizontal' : 'Horizontal') + '</span><b>' + n1(st.vx) + ' m/s</b></div>' +
      '<div class="dr-bat ' + (st.bat < 25 ? 'bad' : '') + '"><span>' + esc(es ? 'Batería' : 'Battery') + (st.landed ? ' ⚡' : '') + '</span><i><em style="width:' + n0(st.bat) + '%"></em></i></div>' +
      '<div><span>' + esc(es ? 'Muestras' : 'Samples') + '</span><b>' + n + ' / 3</b></div>';
  }

  function frame(ts) {
    var dt = last ? Math.min(0.05, (ts - last) / 1000) : 0.016; last = ts;
    step(dt); draw(); hud();
    raf = requestAnimationFrame(frame);
  }
  raf = requestAnimationFrame(frame);
  return { state: st, keys: keys };
}

/* the button that opens it, on the Titan operations screen and the splash */
function droneBtn(cls) {
  return '<button class="btn x-open ' + (cls || '') + '" data-act="drone">' + destArt('titan', 'art dr-ic') +
    '<span><b>' + esc(LANG === 'es' ? 'Vuela el dron en Titán' : 'Fly the drone on Titan') + '</b><small>' +
    esc(LANG === 'es' ? 'Minijuego: aterriza suave y toma muestras' : 'Mini game: land gently and take samples') + '</small></span></button>';
}
function droneFromGame() {
  var inOps = S.phase === 6 && S.destId === 'titan' && !S.droneDone;
  droneGame({ mission: inOps }, function (r) {
    if (inOps && !r.quit && r.science > 0) {
      S.bonusScience = (S.bonusScience || 0) + r.science; S.droneDone = true;
      logit((LANG === 'es' ? 'Vuelo en Titán: ' : 'Titan flight: ') + r.samples + '/3 ' + (LANG === 'es' ? 'muestras, +' : 'samples, +') + r.science + ' pts', 'sci');
    }
    render();
  });
}
