/* ORBITAL NEXUS — visuals: live spacecraft preview, mission view,
   launch sequence and the arrival-burn mini game */

function reducedMotion() {
  return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}
function cssVar(n) { return getComputedStyle(document.documentElement).getPropertyValue(n).trim(); }

/* ---------------------------------------------------------------- *
 * spacecraft preview — redrawn from the current design              *
 * ---------------------------------------------------------------- */
function shipSVG(c) {
  var W = 260, H = 176, cx = 130, cy = 92;
  var s = '<svg class="ship" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' +
    esc(LANG === 'es' ? 'Vista de tu nave' : 'Your spacecraft') + '">';
  if (!c.bus) {
    return s + '<rect x="104" y="62" width="52" height="46" rx="6" fill="none" stroke="var(--line-strong)" stroke-dasharray="4 4"/>' +
      '<text x="130" y="140" text-anchor="middle" class="ship-t">' +
      esc(LANG === 'es' ? 'Elige un bus para ver tu nave' : 'Pick a bus to see your spacecraft') + '</text></svg>';
  }
  var rank = c.bus.rank, bw = [24, 36, 48, 60][rank] || 40, bh = Math.round(bw * 0.92);
  var bx = cx - bw / 2, by = cy - bh / 2;
  var g = '<g class="ship-float">';

  /* solar wings: length follows the square root of area, like real panels */
  if (S.powerType === 'solar' && S.arrayArea > 0) {
    var ratio = ENG.clamp(S.arrayArea / c.bus.arrayMax, 0, 1);
    var maxL = bx - 14, L = 12 + (maxL - 12) * Math.sqrt(ratio), ph = Math.max(12, bh * 0.6);
    var cells = Math.max(1, Math.round(L / 13));
    for (var side = -1; side <= 1; side += 2) {
      var x0 = side < 0 ? bx - 7 - L : bx + bw + 7;
      g += '<line x1="' + (side < 0 ? bx : bx + bw) + '" y1="' + cy + '" x2="' + (side < 0 ? x0 + L : x0) + '" y2="' + cy + '" stroke="var(--txt-faint)" stroke-width="1.5"/>';
      g += '<rect class="ship-wing" x="' + x0 + '" y="' + (cy - ph / 2) + '" width="' + L + '" height="' + ph + '" rx="1.5"/>';
      for (var k = 1; k < cells; k++) {
        var lx = x0 + L * k / cells;
        g += '<line x1="' + lx + '" y1="' + (cy - ph / 2) + '" x2="' + lx + '" y2="' + (cy + ph / 2) + '" class="ship-cell"/>';
      }
      g += '<line x1="' + x0 + '" y1="' + cy + '" x2="' + (x0 + L) + '" y2="' + cy + '" class="ship-cell"/>';
    }
  }

  /* RTGs on a boom, glowing warm */
  if (S.powerType === 'rtg' && S.rtgUnits > 0) {
    g += '<line x1="' + bx + '" y1="' + (by + bh) + '" x2="' + (bx - 16 - S.rtgUnits * 13) + '" y2="' + (by + bh + 20) + '" stroke="var(--txt-faint)" stroke-width="1.5"/>';
    for (var r = 0; r < S.rtgUnits; r++) {
      var rx = bx - 22 - r * 13, ry = by + bh + 6 + r * 3.4;
      g += '<rect class="ship-rtg" x="' + rx + '" y="' + ry + '" width="9" height="17" rx="2"/>' +
        '<line x1="' + (rx - 2) + '" y1="' + (ry + 8.5) + '" x2="' + (rx + 11) + '" y2="' + (ry + 8.5) + '" stroke="var(--warn)" stroke-width="1"/>';
    }
  }

  /* engine */
  if (c.prop) {
    var nw = 6 + rank * 2.5, nb = by + bh;
    g += '<path d="M' + (cx - nw / 2) + ' ' + nb + ' L' + (cx + nw / 2) + ' ' + nb + ' L' + (cx + nw) + ' ' + (nb + 11) + ' L' + (cx - nw) + ' ' + (nb + 11) + 'Z" fill="var(--txt-faint)"/>';
    if (c.prop.id === 'electric') g += '<ellipse class="ship-ion" cx="' + cx + '" cy="' + (nb + 18) + '" rx="' + nw + '" ry="6"/>';
  }

  /* lander legs */
  if (c.dest && c.dest.lander && S.edlId) {
    g += '<path d="M' + (bx + 3) + ' ' + (by + bh - 3) + ' L' + (bx - 12) + ' ' + (by + bh + 22) + ' M' + (bx + bw - 3) + ' ' + (by + bh - 3) + ' L' + (bx + bw + 12) + ' ' + (by + bh + 22) +
      '" stroke="var(--txt-dim)" stroke-width="2" fill="none"/>' +
      '<line x1="' + (bx - 17) + '" y1="' + (by + bh + 22) + '" x2="' + (bx - 7) + '" y2="' + (by + bh + 22) + '" stroke="var(--txt-dim)" stroke-width="2.5"/>' +
      '<line x1="' + (bx + bw + 7) + '" y1="' + (by + bh + 22) + '" x2="' + (bx + bw + 17) + '" y2="' + (by + bh + 22) + '" stroke="var(--txt-dim)" stroke-width="2.5"/>';
  }

  /* magnetometer boom */
  if (S.instruments.indexOf('mag') >= 0) {
    g += '<line x1="' + (bx + bw) + '" y1="' + by + '" x2="' + (bx + bw + 44) + '" y2="' + (by - 34) + '" stroke="var(--txt-faint)" stroke-dasharray="2 2"/>' +
      '<rect x="' + (bx + bw + 42) + '" y="' + (by - 38) + '" width="6" height="6" fill="var(--sci)"/>';
  }

  /* antenna dish: radius grows with diameter */
  if (S.antennaD) {
    var ar = 5 + S.antennaD * 7, top = by - 6, dy = top - ar * 0.36;
    g += '<line x1="' + cx + '" y1="' + by + '" x2="' + cx + '" y2="' + top + '" stroke="var(--txt-faint)" stroke-width="1.6"/>' +
      '<path class="ship-dish" d="M' + (cx - ar) + ' ' + dy + ' Q' + cx + ' ' + (top + ar * 0.36) + ' ' + (cx + ar) + ' ' + dy + 'Z"/>' +
      '<line x1="' + cx + '" y1="' + (top - 1) + '" x2="' + cx + '" y2="' + (dy - ar * 0.45) + '" stroke="var(--txt-faint)"/>' +
      '<circle cx="' + cx + '" cy="' + (dy - ar * 0.45) + '" r="1.8" fill="var(--accent)"/>';
  }

  /* bus body, gold foil; a vault shows as a thick gold rim */
  var vault = S.shieldingId && S.shieldingId !== 'none';
  g += '<rect class="ship-bus' + (vault ? ' vault' : '') + '" x="' + bx + '" y="' + by + '" width="' + bw + '" height="' + bh + '" rx="3.5"' +
    (vault ? ' stroke-width="' + ({ light: 1.6, std: 2.4, vault: 3.6 }[S.shieldingId] || 2) + '"' : '') + '/>';
  /* propellant gauge */
  if (c.prop && c.bus.propMax > 0) {
    var pf = ENG.clamp(S.propellantKg / c.bus.propMax, 0, 1), gh = bh - 8;
    g += '<rect x="' + (bx + 3) + '" y="' + (by + 4) + '" width="3" height="' + gh + '" fill="var(--line)"/>' +
      '<rect x="' + (bx + 3) + '" y="' + (by + 4 + gh * (1 - pf)) + '" width="3" height="' + (gh * pf) + '" fill="var(--ok)"/>';
  }
  /* instruments as lenses on the bus face */
  var n = S.instruments.length;
  if (n) {
    var cols = Math.min(n, Math.max(2, Math.floor((bw - 10) / 9))), lr = Math.min(3.4, (bw - 12) / cols / 2.6);
    for (var i = 0; i < n; i++) {
      var col = i % cols, row = Math.floor(i / cols);
      var ix = bx + 10 + (bw - 14) * (col + 0.5) / cols, iy = by + 8 + row * (lr * 2.6);
      if (iy > by + bh - 4) break;
      g += '<circle class="ship-lens" cx="' + ix.toFixed(1) + '" cy="' + iy.toFixed(1) + '" r="' + lr.toFixed(1) + '"/>';
    }
  }
  g += '</g>';
  return s + g + '</svg>';
}

function shipPanel(c) {
  var tags = [];
  if (c.bus) tags.push(L(c.bus.name));
  if (S.powerType === 'solar' && S.arrayArea > 0) tags.push(n1(S.arrayArea) + ' m² ' + (LANG === 'es' ? 'solares' : 'solar'));
  if (S.powerType === 'rtg' && S.rtgUnits > 0) tags.push(S.rtgUnits + ' MMRTG');
  if (S.antennaD) tags.push(S.antennaD + ' m ' + (LANG === 'es' ? 'antena' : 'dish'));
  if (S.instruments.length) tags.push(S.instruments.length + ' instr.');
  return '<div class="panel ship-panel"><h2>' + esc(LANG === 'es' ? 'Tu nave' : 'Your spacecraft') + '</h2>' + shipSVG(c) +
    (tags.length ? '<div class="ship-tags">' + esc(tags.join(' · ')) + '</div>' : '') + '</div>';
}

/* ---------------------------------------------------------------- *
 * live mission view (operations) — sliders change it in real time  *
 * ---------------------------------------------------------------- */
var VIZ = { a: 0, gs: 0, last: 0, boost: 0, packets: [], spawn: 0, running: false, col: null, colAge: 0, stars: null };

function vizPanel() {
  return '<div class="panel viz-panel"><h2>' + esc(LANG === 'es' ? 'Vista de la misión en vivo' : 'Live mission view') + '</h2>' +
    '<canvas id="viz" class="viz" aria-label="' + esc(LANG === 'es' ? 'Animación de la órbita y del enlace con la Tierra' : 'Animation of the orbit and the link to Earth') + '"></canvas>' +
    '<div class="viz-legend"><span><i style="background:var(--sci)"></i>' + esc(LANG === 'es' ? 'observación científica' : 'science observation') + '</span>' +
    '<span><i style="background:var(--accent)"></i>' + esc(LANG === 'es' ? 'paquetes de datos a Tierra' : 'data packets to Earth') + '</span>' +
    '<span><i style="background:var(--bad)"></i>' + esc(LANG === 'es' ? 'sin línea de vista' : 'no line of sight') + '</span></div>' +
    '<div class="hint">' + esc(LANG === 'es' ? 'Mueve los controles de asignación y mira cómo cambian la observación y el enlace.' : 'Move the allocation sliders and watch observation and downlink change.') + '</div></div>';
}

function vizStart() {
  if (VIZ.running) return;
  VIZ.running = true; VIZ.last = 0;
  requestAnimationFrame(vizFrame);
}
function vizBoost(sentGb) {
  VIZ.boost = 1;
  var burst = Math.min(24, Math.round(4 + (sentGb || 0) / 20));
  for (var i = 0; i < burst; i++) VIZ.packets.push({ t: -i * 0.06 });
}

function segDist(px, py, ax, ay, bx, by) {
  var dx = bx - ax, dy = by - ay, l2 = dx * dx + dy * dy, u = l2 ? ((px - ax) * dx + (py - ay) * dy) / l2 : 0;
  u = ENG.clamp(u, 0, 1);
  var qx = ax + u * dx - px, qy = ay + u * dy - py;
  return Math.sqrt(qx * qx + qy * qy);
}

function vizScene(id, w, h) {
  var S0 = {
    'leo-sso': { body: { x: w / 2, y: h / 2, r: h * 0.3, c1: '#4f8fe0', c2: '#123a74', earth: true }, orbit: { r: h * 0.39, sp: 1.2 } },
    'geo-relay': { body: { x: w / 2, y: h / 2, r: h * 0.16, c1: '#4f8fe0', c2: '#123a74', earth: true }, orbit: { r: h * 0.43, sp: 0.35, geo: true } },
    'llo': { body: { x: w * 0.42, y: h / 2, r: h * 0.3, c1: '#cfd2d8', c2: '#5c6170' }, orbit: { r: h * 0.36, sp: 1.0 }, earth: { x: w * 0.88, y: h * 0.22, r: 9 } },
    'sel2': { body: null, l2: { x: w * 0.66, y: h / 2 }, orbit: { rx: h * 0.3, ry: h * 0.16, sp: 0.32 }, earth: { x: w * 0.3, y: h / 2, r: 9 }, sun: true },
    'mars-orbit': { body: { x: w * 0.42, y: h / 2, r: h * 0.28, c1: '#e07a4a', c2: '#6b2410' }, orbit: { r: h * 0.38, sp: 0.7 }, earth: { x: w * 0.9, y: h * 0.18, r: 6 } },
    'mars-surface': { surface: true, body: { x: w / 2, y: h + h * 1.55, r: h * 1.95, c1: '#d0703f', c2: '#5e200d' }, earth: { orbitSky: true, r: 5 } },
    'venus-orbit': { body: { x: w * 0.42, y: h / 2, r: h * 0.29, c1: '#f1d790', c2: '#8a6a22', clouds: true }, orbit: { r: h * 0.39, sp: 0.55 }, earth: { x: w * 0.9, y: h * 0.18, r: 6 } },
    'neo': { body: { x: w * 0.45, y: h / 2, r: h * 0.15, c1: '#a49a8a', c2: '#4a4238', rock: true }, orbit: { r: h * 0.32, sp: 0.25 }, earth: { x: w * 0.92, y: h * 0.16, r: 5 } },
    'europa': { jupiter: { x: -h * 0.05, y: h / 2, r: h * 0.62 }, body: { x: w * 0.6, y: h / 2, r: h * 0.14, c1: '#f3efe6', c2: '#a28a6c', ice: true }, orbit: { r: h * 0.25, sp: 0.8 }, earth: { x: w * 0.94, y: h * 0.14, r: 4 } }
  };
  return S0[id] || S0['leo-sso'];
}

function vizFrame(ts) {
  var cv = document.getElementById('viz');
  if (!cv || S.phase !== 6) { VIZ.running = false; return; }
  var dt = VIZ.last ? Math.min(0.05, (ts - VIZ.last) / 1000) : 0.016;
  VIZ.last = ts;
  var dpr = window.devicePixelRatio || 1, w = cv.clientWidth, h = cv.clientHeight;
  if (cv.width !== Math.round(w * dpr) || cv.height !== Math.round(h * dpr)) {
    cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); VIZ.stars = null;
  }
  var ctx = cv.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  if (!VIZ.col || ++VIZ.colAge > 90) {
    VIZ.colAge = 0;
    VIZ.col = { acc: cssVar('--accent'), sci: cssVar('--sci'), bad: cssVar('--bad'), txt: cssVar('--txt'), dim: cssVar('--txt-faint'), line: cssVar('--line-strong'), warn: cssVar('--warn') };
  }
  var C = VIZ.col, c = CACHE || comp(), dest = c.dest;
  if (!dest) { requestAnimationFrame(vizFrame); return; }
  var still = reducedMotion();
  VIZ.boost *= Math.pow(0.12, dt);
  var speed = still ? 0 : (1 + VIZ.boost * 7);
  var sc = vizScene(dest.id, w, h);
  VIZ.a += dt * (sc.orbit ? sc.orbit.sp : 0.3) * speed;
  VIZ.gs += dt * 0.25 * speed;

  ctx.clearRect(0, 0, w, h);
  /* deep-space backdrop, always dark: it is a view port */
  var bg = ctx.createLinearGradient(0, 0, 0, h);
  bg.addColorStop(0, '#050914'); bg.addColorStop(1, '#0b1430');
  ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h);
  if (!VIZ.stars) {
    VIZ.stars = [];
    for (var i = 0; i < 70; i++) VIZ.stars.push([Math.random() * w, Math.random() * h, Math.random() * 0.9 + 0.2, Math.random()]);
  }
  for (i = 0; i < VIZ.stars.length; i++) {
    var st = VIZ.stars[i];
    ctx.fillStyle = 'rgba(210,225,255,' + (0.25 + 0.35 * Math.abs(Math.sin(ts / 1400 + st[3] * 6))) + ')';
    ctx.fillRect(st[0], st[1], st[2], st[2]);
  }

  if (sc.sun) {
    var sg = ctx.createRadialGradient(-30, h / 2, 4, -30, h / 2, h * 0.9);
    sg.addColorStop(0, 'rgba(255,220,140,.95)'); sg.addColorStop(0.25, 'rgba(255,190,90,.25)'); sg.addColorStop(1, 'rgba(255,190,90,0)');
    ctx.fillStyle = sg; ctx.fillRect(0, 0, w, h);
  }
  if (sc.jupiter) {
    var J = sc.jupiter;
    for (i = 1; i <= 3; i++) {
      ctx.strokeStyle = 'rgba(185,140,255,' + (0.07 + 0.03 * Math.sin(ts / 500 + i)) + ')';
      ctx.lineWidth = 14;
      ctx.beginPath(); ctx.arc(J.x, J.y, J.r + i * h * 0.22, -0.9, 0.9); ctx.stroke();
    }
    var jg = ctx.createRadialGradient(J.x + J.r * 0.3, J.y - J.r * 0.3, J.r * 0.1, J.x, J.y, J.r);
    jg.addColorStop(0, '#f0d6b0'); jg.addColorStop(1, '#8a5a32');
    ctx.save(); ctx.beginPath(); ctx.arc(J.x, J.y, J.r, 0, 6.2832); ctx.fillStyle = jg; ctx.fill(); ctx.clip();
    for (i = -4; i <= 4; i++) {
      ctx.fillStyle = i % 2 ? 'rgba(120,70,40,.28)' : 'rgba(255,240,220,.12)';
      ctx.fillRect(J.x - J.r, J.y + i * J.r * 0.2 - J.r * 0.05, J.r * 2, J.r * 0.1);
    }
    ctx.restore();
  }

  /* central body */
  var B = sc.body;
  if (B) drawBody(ctx, B, ts, sc.surface ? 0 : VIZ.gs);

  /* spacecraft position */
  var sx, sy;
  if (sc.surface) { sx = w / 2; sy = B.y - B.r - 7; }
  else if (sc.l2) { sx = sc.l2.x + Math.cos(VIZ.a) * sc.orbit.rx; sy = sc.l2.y + Math.sin(VIZ.a) * sc.orbit.ry; }
  else {
    var ang = sc.orbit.geo ? VIZ.gs * 0.6 : VIZ.a;
    sx = B.x + Math.cos(ang) * sc.orbit.r; sy = B.y + Math.sin(ang) * sc.orbit.r;
  }

  /* orbit path */
  ctx.setLineDash([3, 5]); ctx.strokeStyle = C.line; ctx.lineWidth = 1;
  if (sc.l2) {
    ctx.beginPath(); ctx.ellipse(sc.l2.x, sc.l2.y, sc.orbit.rx, sc.orbit.ry, 0, 0, 6.2832); ctx.stroke();
    ctx.setLineDash([]); ctx.strokeStyle = C.dim;
    ctx.beginPath(); ctx.moveTo(sc.l2.x - 5, sc.l2.y); ctx.lineTo(sc.l2.x + 5, sc.l2.y); ctx.moveTo(sc.l2.x, sc.l2.y - 5); ctx.lineTo(sc.l2.x, sc.l2.y + 5); ctx.stroke();
    label(ctx, 'L2', sc.l2.x + 7, sc.l2.y - 6, C.dim);
  } else if (!sc.surface) {
    ctx.beginPath(); ctx.arc(B.x, B.y, sc.orbit.r, 0, 6.2832); ctx.stroke();
  }
  ctx.setLineDash([]);

  /* where the ground station is */
  var tx, ty, visible = true;
  if (B && B.earth) {
    var ga = VIZ.gs * 0.6;
    tx = B.x + Math.cos(ga) * B.r; ty = B.y + Math.sin(ga) * B.r;
    var diff = Math.atan2(sy - B.y, sx - B.x) - ga;
    diff = Math.atan2(Math.sin(diff), Math.cos(diff));
    visible = Math.abs(diff) < (sc.orbit.geo ? 3.2 : 0.75);
    ctx.fillStyle = C.acc; ctx.beginPath(); ctx.arc(tx, ty, 3, 0, 6.2832); ctx.fill();
  } else if (sc.earth && sc.earth.orbitSky) {
    var ea = 3.1416 + 0.35 + ((VIZ.gs * 0.5) % 6.2832);
    tx = w / 2 + Math.cos(ea) * w * 0.48; ty = (B.y - B.r) - 4 + Math.sin(ea) * h * 0.55;
    visible = ty < B.y - B.r - 8;
    if (visible) drawEarthDot(ctx, tx, ty, sc.earth.r, C);
  } else if (sc.earth) {
    tx = sc.earth.x; ty = sc.earth.y;
    drawEarthDot(ctx, tx, ty, sc.earth.r, C);
    label(ctx, LANG === 'es' ? 'Tierra' : 'Earth', tx - 10, ty + sc.earth.r + 12, C.dim);
    if (B) visible = segDist(B.x, B.y, sx, sy, tx, ty) > B.r;
  }

  /* science: an observation cone, intensity follows the allocation */
  var anyOn = false;
  for (i = 0; i < c.instr.length; i++) if (S.active[c.instr[i].id] && !S.dead[c.instr[i].id]) anyOn = true;
  if (S.alive && anyOn && S.alloc.sci > 0) {
    var nx, ny;
    if (sc.l2) { nx = 1; ny = 0; }
    else { var dx = B.x - sx, dy = B.y - sy, dl = Math.sqrt(dx * dx + dy * dy) || 1; nx = dx / dl; ny = dy / dl; }
    var len = sc.l2 ? w * 0.4 : (sc.surface ? 14 : Math.max(10, Math.sqrt((B.x - sx) * (B.x - sx) + (B.y - sy) * (B.y - sy)) - B.r * 0.95));
    var spread = sc.l2 ? 0.12 : 0.3;
    var ex = sx + nx * len, ey = sy + ny * len;
    ctx.globalAlpha = 0.12 + 0.5 * S.alloc.sci / 100;
    ctx.fillStyle = C.sci;
    ctx.beginPath(); ctx.moveTo(sx, sy);
    ctx.lineTo(ex - ny * len * spread, ey + nx * len * spread);
    ctx.lineTo(ex + ny * len * spread, ey - nx * len * spread);
    ctx.closePath(); ctx.fill();
    ctx.globalAlpha = 1;
  }

  /* downlink: packets travel while there is line of sight */
  var dlOn = S.alive && S.alloc.dl > 0 && tx != null;
  if (dlOn) {
    ctx.strokeStyle = visible ? C.acc : C.bad;
    ctx.globalAlpha = visible ? 0.25 + 0.5 * S.alloc.dl / 100 : 0.5;
    ctx.setLineDash(visible ? [] : [2, 4]); ctx.lineWidth = visible ? 1.2 : 1;
    ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(tx, ty); ctx.stroke();
    ctx.setLineDash([]); ctx.globalAlpha = 1;
    if (visible) {
      VIZ.spawn += dt * (0.6 + 5 * S.alloc.dl / 100 * Math.min(1, c.link.ratio + 0.15)) * speed;
      while (VIZ.spawn > 1) { VIZ.spawn -= 1; VIZ.packets.push({ t: 0 }); }
    } else {
      label(ctx, LANG === 'es' ? 'sin contacto' : 'no contact', sx + 8, sy - 8, C.bad);
    }
  }
  for (i = VIZ.packets.length - 1; i >= 0; i--) {
    var p = VIZ.packets[i];
    p.t += dt * 0.9 * (still ? 1 : 1 + VIZ.boost * 2);
    if (p.t >= 1 || !dlOn || !visible) { VIZ.packets.splice(i, 1); continue; }
    if (p.t < 0) continue;
    ctx.fillStyle = C.acc;
    ctx.fillRect(sx + (tx - sx) * p.t - 1.5, sy + (ty - sy) * p.t - 1.5, 3, 3);
  }
  if (VIZ.packets.length > 80) VIZ.packets.splice(0, VIZ.packets.length - 80);

  /* the spacecraft */
  ctx.save(); ctx.translate(sx, sy);
  ctx.fillStyle = S.alive ? C.txt : C.dim;
  ctx.fillRect(-3.5, -3.5, 7, 7);
  if (S.powerType === 'solar') { ctx.fillStyle = S.alive ? C.acc : C.dim; ctx.fillRect(-12, -2, 7, 4); ctx.fillRect(5, -2, 7, 4); }
  if (S.pendingEvent) {
    ctx.strokeStyle = C.warn; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(0, 0, 10 + 4 * Math.sin(ts / 120), 0, 6.2832); ctx.stroke();
  }
  ctx.restore();

  /* instrument read-outs */
  var stored = 0; for (var k in S.storage) stored += S.storage[k];
  var memF = c.bus ? ENG.clamp(stored / c.bus.storeGb, 0, 1) : 0;
  label(ctx, (LANG === 'es' ? 'T ' : 'T ') + S.turn + '/' + c.opsTurns + '  ·  ' + bps(c.link.bps), 10, 16, C.dim);
  var mw = 90, mx = w - mw - 10, my = h - 16;
  label(ctx, (LANG === 'es' ? 'memoria ' : 'memory ') + n0(memF * 100) + '%', mx, my - 6, memF > 0.85 ? C.bad : C.dim);
  ctx.fillStyle = 'rgba(255,255,255,.12)'; ctx.fillRect(mx, my, mw, 4);
  ctx.fillStyle = memF > 0.85 ? C.bad : C.sci; ctx.fillRect(mx, my, mw * memF, 4);

  requestAnimationFrame(vizFrame);
}

function label(ctx, txt, x, y, col) {
  ctx.font = '10.5px ui-monospace, Menlo, Consolas, monospace';
  ctx.fillStyle = col; ctx.fillText(txt, x, y);
}
function drawEarthDot(ctx, x, y, r, C) {
  var g = ctx.createRadialGradient(x - r * 0.3, y - r * 0.3, 1, x, y, r);
  g.addColorStop(0, '#8ec5ff'); g.addColorStop(1, '#1f4e9a');
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, 6.2832); ctx.fill();
}
function drawBody(ctx, B, ts, spin) {
  var g = ctx.createRadialGradient(B.x - B.r * 0.4, B.y - B.r * 0.4, B.r * 0.1, B.x, B.y, B.r);
  g.addColorStop(0, B.c1); g.addColorStop(1, B.c2);
  ctx.save();
  ctx.beginPath();
  if (B.rock) {
    for (var i = 0; i <= 14; i++) {
      var a = i / 14 * 6.2832 + spin * 0.6, rr = B.r * (0.78 + 0.22 * Math.sin(i * 2.3) * Math.cos(i * 1.7));
      var x = B.x + Math.cos(a) * rr * 1.25, y = B.y + Math.sin(a) * rr * 0.85;
      if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y);
    }
  } else ctx.arc(B.x, B.y, B.r, 0, 6.2832);
  ctx.fillStyle = g; ctx.fill(); ctx.clip();
  if (B.earth) {
    ctx.fillStyle = 'rgba(80,170,110,.55)';
    for (i = 0; i < 5; i++) {
      var ca = spin + i * 1.3;
      ctx.beginPath(); ctx.ellipse(B.x + Math.cos(ca) * B.r * 0.55, B.y + Math.sin(i * 2.1) * B.r * 0.45, B.r * 0.28, B.r * 0.16, ca, 0, 6.2832); ctx.fill();
    }
  }
  if (B.clouds) {
    ctx.strokeStyle = 'rgba(255,250,230,.35)'; ctx.lineWidth = B.r * 0.08;
    for (i = -2; i <= 2; i++) { ctx.beginPath(); ctx.arc(B.x - B.r * 0.2 + Math.sin(ts / 3000 + i) * 6, B.y + i * B.r * 0.32, B.r * 0.9, 0.2, 2.6); ctx.stroke(); }
  }
  if (B.ice) {
    ctx.strokeStyle = 'rgba(150,90,60,.55)'; ctx.lineWidth = 1;
    for (i = 0; i < 6; i++) { ctx.beginPath(); ctx.moveTo(B.x - B.r, B.y - B.r + i * B.r * 0.4); ctx.quadraticCurveTo(B.x, B.y + (i - 3) * 4, B.x + B.r, B.y - B.r * 0.6 + i * B.r * 0.35); ctx.stroke(); }
  }
  /* night side */
  var sh = ctx.createLinearGradient(B.x - B.r, 0, B.x + B.r, 0);
  sh.addColorStop(0, 'rgba(0,0,0,0)'); sh.addColorStop(0.55, 'rgba(0,0,0,0)'); sh.addColorStop(1, 'rgba(0,0,10,.55)');
  ctx.fillStyle = sh; ctx.fillRect(B.x - B.r * 1.3, B.y - B.r, B.r * 2.6, B.r * 2);
  ctx.restore();
}

/* ---------------------------------------------------------------- *
 * launch sequence — countdown, ascent, staging, fairing, deploy     *
 * ---------------------------------------------------------------- */
function launchDOM() {
  var root = document.getElementById('launch');
  if (root) return root;
  root = document.createElement('div');
  root.id = 'launch'; root.className = 'launch'; root.hidden = true;
  root.innerHTML = '<canvas id="launch-cv"></canvas>' +
    '<div class="l-hud"><div class="l-met" id="l-met"></div><div class="l-cap" id="l-cap" aria-live="polite"></div></div>' +
    '<button class="btn ghost l-skip" id="l-skip" type="button"></button>' +
    '<div class="l-game" id="l-game" hidden></div>';
  document.body.appendChild(root);
  return root;
}
function launchClose() {
  var root = document.getElementById('launch');
  if (root) root.hidden = true;
  OVERLAY_OPEN = false;
}

function launchSequence(o, done) {
  var root = launchDOM();
  root.hidden = false; OVERLAY_OPEN = true;
  var cv = document.getElementById('launch-cv'), ctx = cv.getContext('2d');
  var cap = document.getElementById('l-cap'), met = document.getElementById('l-met'), skip = document.getElementById('l-skip');
  var game = document.getElementById('l-game'); game.hidden = true;
  skip.hidden = false;
  skip.textContent = LANG === 'es' ? 'Saltar animación ⏭' : 'Skip animation ⏭';
  var dpr = window.devicePixelRatio || 1, W = window.innerWidth, H = window.innerHeight;
  cv.width = W * dpr; cv.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  var END = o.fail === 'launch' ? 9.2 : (o.fail === 'commission' ? 12.5 : 11.2);
  var t0 = null, finished = false, fired = {}, smoke = [], debris = [], stars = [];
  for (var i = 0; i < 160; i++) stars.push([Math.random() * W, Math.random() * H, Math.random() * 1.3 + 0.3]);
  var es = LANG === 'es';
  var cues = [
    [0, es ? 'T−3 · Todos los sistemas listos' : 'T−3 · All systems go', function () { SFX.beep(); }],
    [1, 'T−2', function () { SFX.beep(); }],
    [2, es ? 'T−1 · Encendido de motores' : 'T−1 · Engine start', function () { SFX.beep(); }],
    [3, (es ? '¡Despegue! ' : 'Liftoff! ') + o.lv, function () { SFX.beep(true); SFX.rumble(5); }],
    [5, es ? 'Max-Q · presión dinámica máxima' : 'Max-Q · maximum dynamic pressure'],
    [7, es ? 'Separación de la primera etapa' : 'First stage separation', function () { SFX.thump(); }],
    [8.4, es ? 'Separación de la cofia' : 'Fairing separation', function () { SFX.thump(); }],
    [9.6, es ? 'Nave liberada · despliegue de paneles' : 'Spacecraft separation · array deploy', function () { SFX.chime(); }]
  ];
  if (o.fail === 'launch') cues = cues.slice(0, 5).concat([[6.1, es ? '¡Anomalía! Pérdida del vehículo' : 'Anomaly! Vehicle lost', function () { SFX.boom(); }]]);
  if (o.fail === 'commission') cues.push([10.8, es ? 'Sin telemetría de la nave…' : 'No spacecraft telemetry…', function () { SFX.fail(); }]);
  if (!o.fail) cues.push([10.4, (es ? 'Rumbo a ' : 'Bound for ') + o.dest + ' · ' + o.cruise + (es ? ' días de crucero' : ' day cruise')]);

  function finish() {
    if (finished) return;
    finished = true; skip.hidden = true;
    done();
  }
  skip.onclick = function () { SFX.tick(); finish(); };

  if (reducedMotion()) {
    var last = cues[cues.length - 1];
    cap.textContent = last[1]; met.textContent = '';
    ctx.fillStyle = '#03050c'; ctx.fillRect(0, 0, W, H);
    setTimeout(finish, 1400);
    return;
  }

  function frame(ts) {
    if (finished) return;
    if (t0 == null) t0 = ts;
    var t = (ts - t0) / 1000;
    for (var i = 0; i < cues.length; i++) if (t >= cues[i][0] && !fired[i]) {
      fired[i] = true; cap.textContent = cues[i][1];
      cap.className = 'l-cap' + (/Anomal|telemetr/.test(cues[i][1]) ? ' bad' : '');
      if (cues[i][2]) cues[i][2]();
    }
    var tl = Math.max(0, t - 3);
    met.textContent = t < 3 ? 'T−' + (3 - Math.floor(t)) : 'T+' + pad(Math.floor(tl * 22 / 60)) + ':' + pad(Math.floor(tl * 22) % 60);

    var alt = 0.5 * 70 * tl * tl, padY = H * 0.8;
    var ry = Math.max(H * 0.42, padY - alt), cam = alt - (padY - ry);
    var space = ENG.clamp(cam / 1100, 0, 1);
    var sky = ctx.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, mix([10, 26, 58], [2, 3, 9], space));
    sky.addColorStop(1, mix([46, 84, 140], [4, 7, 18], space));
    ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = 'rgba(220,230,255,' + (0.15 + space * 0.8) + ')';
    for (i = 0; i < stars.length; i++) ctx.fillRect(stars[i][0], (stars[i][1] + cam * 0.05) % H, stars[i][2], stars[i][2]);

    /* ground and tower */
    var gy = padY + 46 + cam;
    if (gy < H + 40) {
      ctx.fillStyle = '#0b1220'; ctx.fillRect(0, gy, W, H - gy + 40);
      ctx.fillStyle = '#1b2638'; ctx.fillRect(W / 2 + 22, gy - 150, 10, 150);
      for (i = 0; i < 9; i++) ctx.fillRect(W / 2 + 10, gy - 140 + i * 16, 22, 2);
    }

    var shake = (t > 3 && t < 6.5) ? (Math.random() - 0.5) * 2.2 : 0;
    var rx = W / 2 + shake, exploded = o.fail === 'launch' && t >= 6.1;
    var stage1 = t < 7, fairing = t < 8.4;

    /* smoke and exhaust */
    if (t > 2.6 && !exploded && t < 9.6) {
      for (i = 0; i < (stage1 ? 4 : 1); i++)
        smoke.push({ x: rx + (Math.random() - 0.5) * 10, y: ry + 46 + cam, vx: (Math.random() - 0.5) * (tl < 1 ? 160 : 30), vy: 40 + Math.random() * 40, r: 6 + Math.random() * 6, a: 0.5, s: stage1 });
    }
    for (i = smoke.length - 1; i >= 0; i--) {
      var p = smoke[i];
      p.x += p.vx * 0.016; p.y += p.vy * 0.016; p.r += 0.35; p.a -= 0.006;
      if (p.a <= 0) { smoke.splice(i, 1); continue; }
      ctx.fillStyle = 'rgba(190,195,205,' + (p.a * (1 - space * 0.7)) + ')';
      ctx.beginPath(); ctx.arc(p.x, p.y - cam, p.r, 0, 6.2832); ctx.fill();
    }

    if (!exploded) {
      /* falling first stage */
      if (!stage1 && t < 10) {
        var fy = ry + 30 + (t - 7) * (t - 7) * 60;
        ctx.save(); ctx.translate(rx - 4, fy); ctx.rotate((t - 7) * 0.5);
        ctx.fillStyle = '#d8dde6'; ctx.fillRect(-7, 0, 14, 52);
        ctx.restore();
      }
      if (!fairing && t < 11) {
        var d = (t - 8.4);
        for (var sd = -1; sd <= 1; sd += 2) {
          ctx.save(); ctx.translate(rx + sd * (6 + d * 28), ry - 26 + d * d * 22); ctx.rotate(sd * d * 0.9);
          ctx.fillStyle = '#eef1f6';
          ctx.beginPath(); ctx.moveTo(0, -16); ctx.lineTo(sd * 7, 4); ctx.lineTo(0, 4); ctx.closePath(); ctx.fill();
          ctx.restore();
        }
      }
      drawRocket(ctx, rx, ry, t, stage1, fairing, tl);
      if (t >= 9.6) drawFreeSpacecraft(ctx, rx, ry - 30 - (t - 9.6) * 10, Math.min(1, (t - 9.6) / 0.9), o.fail === 'commission' && t > 10.8 ? (Math.floor(t * 5) % 2) : 1);
    } else {
      if (!debris.length) {
        for (i = 0; i < 140; i++) {
          var a = Math.random() * 6.2832, v = 40 + Math.random() * 260;
          debris.push({ x: rx, y: ry, vx: Math.cos(a) * v, vy: Math.sin(a) * v, l: 1 + Math.random() * 1.6, c: Math.random() < 0.5 ? '255,170,60' : '255,90,50' });
        }
      }
      for (i = 0; i < debris.length; i++) {
        var q = debris[i];
        q.x += q.vx * 0.016; q.y += q.vy * 0.016; q.vy += 2; q.l -= 0.012;
        if (q.l <= 0) continue;
        ctx.fillStyle = 'rgba(' + q.c + ',' + Math.min(1, q.l) + ')';
        ctx.beginPath(); ctx.arc(q.x, q.y, 2 + q.l * 2, 0, 6.2832); ctx.fill();
      }
    }

    if (t >= END) { finish(); return; }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

function pad(v) { return (v < 10 ? '0' : '') + v; }
function mix(a, b, f) {
  return 'rgb(' + Math.round(a[0] + (b[0] - a[0]) * f) + ',' + Math.round(a[1] + (b[1] - a[1]) * f) + ',' + Math.round(a[2] + (b[2] - a[2]) * f) + ')';
}

function drawRocket(ctx, x, y, t, stage1, fairing, tl) {
  ctx.save(); ctx.translate(x, y);
  var bot = stage1 ? 46 : -8;
  /* flame */
  if (t > 2.8 && t < 9.6) {
    var fl = (stage1 ? 34 : 18) * (0.85 + Math.random() * 0.3) * Math.min(1, (t - 2.8) * 2);
    var fg = ctx.createLinearGradient(0, bot, 0, bot + fl);
    fg.addColorStop(0, 'rgba(255,250,210,1)'); fg.addColorStop(0.4, 'rgba(255,170,60,.9)'); fg.addColorStop(1, 'rgba(255,80,30,0)');
    ctx.fillStyle = fg;
    ctx.beginPath(); ctx.moveTo(-6, bot); ctx.quadraticCurveTo(0, bot + fl * 1.4, 6, bot); ctx.closePath(); ctx.fill();
  }
  ctx.fillStyle = '#e6eaf1';
  if (stage1) { ctx.fillRect(-7, -8, 14, 54); ctx.fillStyle = '#1c2533'; ctx.fillRect(-7, 10, 14, 3); }
  ctx.fillStyle = '#e6eaf1'; ctx.fillRect(-6, -26, 12, 18);
  if (fairing) {
    ctx.beginPath(); ctx.moveTo(-7, -26); ctx.lineTo(7, -26); ctx.lineTo(0, -46); ctx.closePath(); ctx.fill();
  }
  ctx.restore();
}

function drawFreeSpacecraft(ctx, x, y, deploy, alpha) {
  ctx.save(); ctx.translate(x, y); ctx.globalAlpha = alpha ? 1 : 0.25;
  ctx.fillStyle = '#d9b45a'; ctx.fillRect(-6, -6, 12, 12);
  var L = 26 * deploy;
  ctx.fillStyle = '#4f7fe0';
  ctx.fillRect(-8 - L, -4, L, 8); ctx.fillRect(8, -4, L, 8);
  ctx.strokeStyle = '#9fb0d0'; ctx.beginPath(); ctx.moveTo(-8, 0); ctx.lineTo(-6, 0); ctx.moveTo(6, 0); ctx.lineTo(8, 0); ctx.stroke();
  ctx.restore();
}

/* ---------------------------------------------------------------- *
 * arrival mini game: fire the engine inside the window              *
 * cfg: { title, body, btn, zone } · onResult(acc) -> {text, cls}    *
 * ---------------------------------------------------------------- */
function burnGame(cfg, onResult, onClose) {
  launchDOM();
  var box = document.getElementById('l-game'), cap = document.getElementById('l-cap'), met = document.getElementById('l-met');
  cap.textContent = ''; met.textContent = '';
  document.getElementById('l-skip').hidden = true;
  OVERLAY_OPEN = true;
  var zc = 0.3 + Math.random() * 0.4, zw = cfg.zone;
  box.hidden = false;
  box.innerHTML = '<div class="lg-card">' +
    '<div class="lg-kick">' + esc(cfg.kick) + '</div><h2>' + esc(cfg.title) + '</h2><p>' + esc(cfg.body) + '</p>' +
    '<div class="lg-bar"><i class="lg-zone" style="left:' + ((zc - zw / 2) * 100) + '%;width:' + (zw * 100) + '%"></i><i class="lg-needle" id="lg-needle"></i></div>' +
    '<div class="lg-scale"><span>' + esc(LANG === 'es' ? 'temprano' : 'early') + '</span><span>' + esc(LANG === 'es' ? 'ventana óptima' : 'optimal window') + '</span><span>' + esc(LANG === 'es' ? 'tarde' : 'late') + '</span></div>' +
    '<button class="btn primary lg-btn" id="lg-fire" type="button">' + esc(cfg.btn) + ' <span class="kbd">' + esc(LANG === 'es' ? 'Espacio' : 'Space') + '</span></button>' +
    '<div class="lg-res" id="lg-res" aria-live="polite"></div></div>';
  var needle = document.getElementById('lg-needle'), fire = document.getElementById('lg-fire'), res = document.getElementById('lg-res');
  var ph = Math.random() * 6, pos = 0.5, last = 0, stopped = false, closed = false, shotAt = 0, start = performance.now();
  var still = reducedMotion();

  function loop(ts) {
    if (stopped) return;
    var dt = last ? (ts - last) / 1000 : 0.016; last = ts;
    var el = (ts - start) / 1000;
    ph += dt * (still ? 0.9 : 2.1 + 0.9 * Math.sin(el * 0.8));
    pos = 0.5 + 0.48 * Math.sin(ph);
    needle.style.left = (pos * 100) + '%';
    if (el > 14) { shoot(); return; }
    requestAnimationFrame(loop);
  }
  function shoot() {
    if (stopped) return;
    stopped = true; shotAt = performance.now();
    var dist = Math.abs(pos - zc), half = zw / 2, acc;
    if (dist <= half) acc = 0.85 + 0.15 * (1 - dist / half);
    else acc = ENG.clamp(0.85 - (dist - half) / 0.4 * 0.85, 0, 0.85);
    SFX.rumble(1.2);
    var r = onResult(acc) || {};
    var verdict = acc >= 0.9 ? (LANG === 'es' ? '¡Perfecto!' : 'Perfect!') : acc >= 0.7 ? (LANG === 'es' ? 'Buen quemado' : 'Good burn') : (LANG === 'es' ? 'Fuera de la ventana' : 'Outside the window');
    res.className = 'lg-res ' + (r.cls || '');
    res.innerHTML = '<b>' + esc(verdict) + '</b> · ' + esc(LANG === 'es' ? 'precisión ' : 'accuracy ') + n0(acc * 100) + '%<br>' + esc(r.text || '');
    fire.innerHTML = esc(LANG === 'es' ? 'Continuar' : 'Continue') + ' <span class="kbd">Enter</span>';
    fire.onclick = close;
  }
  function close() {
    /* the key-up of the press that fired would otherwise close the result at once */
    if (closed || performance.now() - shotAt < 450) return;
    closed = true;
    document.removeEventListener('keydown', key);
    box.hidden = true;
    onClose();
  }
  function key(e) {
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      if (!stopped) shoot(); else close();
    }
  }
  fire.onclick = shoot;
  document.addEventListener('keydown', key);
  fire.focus();
  requestAnimationFrame(loop);
}
