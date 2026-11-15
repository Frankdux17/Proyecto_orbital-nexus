/* ORBITAL NEXUS — interactive space background.
   Three layers of stars with mouse parallax, drifting nebulae in the brand
   colours, a constellation that lights up around the pointer, shooting
   stars, and a ripple of sparks where you click on empty space. Used by
   the game and by the presentation. It holds still for people who ask for
   reduced motion and pauses while the tab is hidden. No dependencies. */

var SpaceBG = (function () {
  function start(cv, opts) {
    opts = opts || {};
    var g = cv.getContext('2d'), W = 0, H = 0, dpr = 1;
    var stars = [], neb = [], shoot = [], ripples = [], sparks = [];
    var mx = -9999, my = -9999, px = 0, py = 0, tpx = 0, tpy = 0, t = 0, last = 0, raf = 0, nextShoot = 2;
    var still = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    function light() { return opts.light ? opts.light() : false; }
    function paused() { return document.hidden || (opts.paused && opts.paused()); }

    function size() {
      dpr = Math.min(1.5, window.devicePixelRatio || 1);
      W = window.innerWidth; H = window.innerHeight;
      cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
      cv.style.width = W + 'px'; cv.style.height = H + 'px';
      stars = [];
      var n = Math.min(420, Math.round(W * H / 4200));
      for (var i = 0; i < n; i++) {
        var layer = i % 3; /* 0 far, 1 mid, 2 near */
        stars.push({ x: Math.random() * W, y: Math.random() * H, z: [0.25, 0.6, 1][layer],
          r: [0.5, 0.9, 1.5][layer] * (0.6 + Math.random() * 0.7), a: 0.25 + Math.random() * 0.6,
          tw: Math.random() * 6.28, sp: 0.6 + Math.random() * 1.8,
          c: Math.random() < 0.12 ? (Math.random() < 0.5 ? '255,214,140' : '170,200,255') : '220,232,255' });
      }
      neb = [
        { x: 0.82, y: 0.12, r: 0.6, c: [79, 209, 224], a: 0.22, fx: 0.07, fy: 0.05, ph: 0 },
        { x: 0.12, y: 0.62, r: 0.62, c: [185, 140, 255], a: 0.2, fx: 0.05, fy: 0.08, ph: 2 },
        { x: 0.6, y: 1.05, r: 0.55, c: [122, 162, 255], a: 0.17, fx: 0.06, fy: 0.04, ph: 4 },
        { x: 0.35, y: 0.25, r: 0.34, c: [240, 194, 75], a: 0.09, fx: 0.09, fy: 0.07, ph: 1 }
      ];
      if (still) frame(0);
    }

    function addShoot() {
      var fromLeft = Math.random() < 0.5, y = Math.random() * H * 0.6;
      shoot.push({ x: fromLeft ? -40 : W + 40, y: y, vx: (fromLeft ? 1 : -1) * (520 + Math.random() * 380), vy: 160 + Math.random() * 140, life: 1.3 });
    }

    function onMove(e) { mx = e.clientX; my = e.clientY; tpx = (mx / W - 0.5); tpy = (my / H - 0.5); }
    function onLeave() { mx = my = -9999; tpx = tpy = 0; }
    function onClick(e) {
      if (still || paused()) return;
      var el = e.target;
      if (el.closest && el.closest('button,a,input,select,textarea,label,[data-act],[data-lab],[role=button],.card,.panel,.lab,.explorer,.drone,img,canvas:not(#' + cv.id + ')')) return;
      ripples.push({ x: e.clientX, y: e.clientY, r: 0, life: 1 });
      for (var i = 0; i < 16; i++) {
        var a = Math.random() * 6.283, s = 60 + Math.random() * 160;
        sparks.push({ x: e.clientX, y: e.clientY, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 0.7 + Math.random() * 0.5 });
      }
    }

    function frame(ts) {
      raf = still ? 0 : requestAnimationFrame(frame);
      if (!still && paused()) { last = 0; return; }
      var dt = last ? Math.min(0.05, (ts - last) / 1000) : 0.016; last = ts; t += dt;
      var L = light();
      px += (tpx - px) * Math.min(1, dt * 3); py += (tpy - py) * Math.min(1, dt * 3);
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      g.clearRect(0, 0, W, H);
      if (opts.base) { g.fillStyle = opts.base(); g.fillRect(0, 0, W, H); }

      /* nebulae */
      var mx0 = Math.max(W, H);
      for (var i = 0; i < neb.length; i++) {
        var n = neb[i], nx = (n.x + 0.04 * Math.sin(t * n.fx + n.ph)) * W - px * 40, ny = (n.y + 0.04 * Math.cos(t * n.fy + n.ph)) * H - py * 40;
        var rr = n.r * mx0, gr = g.createRadialGradient(nx, ny, 0, nx, ny, rr), a = n.a * (L ? 0.55 : 1);
        gr.addColorStop(0, 'rgba(' + n.c.join(',') + ',' + a + ')');
        gr.addColorStop(0.45, 'rgba(' + n.c.join(',') + ',' + (a * 0.35) + ')');
        gr.addColorStop(1, 'rgba(' + n.c.join(',') + ',0)');
        g.fillStyle = gr; g.fillRect(0, 0, W, H);
      }

      /* stars, with parallax and a glow near the pointer */
      var near = [];
      for (i = 0; i < stars.length; i++) {
        var s = stars[i];
        if (!still) { s.x -= dt * 4 * s.z; if (s.x < -4) s.x += W + 8; }
        var x = s.x - px * 60 * s.z, y = s.y - py * 60 * s.z;
        var tw = 0.65 + 0.35 * Math.sin(t * s.sp + s.tw), alpha = s.a * tw, r = s.r;
        var dx = x - mx, dy = y - my, d2 = dx * dx + dy * dy;
        if (d2 < 180 * 180) { var k = 1 - Math.sqrt(d2) / 180; alpha = Math.min(1, alpha + k * 0.8); r += k * 1.3; if (s.z > 0.3) near.push([x, y, k]); }
        g.fillStyle = L ? 'rgba(30,60,120,' + (alpha * 0.55) + ')' : 'rgba(' + s.c + ',' + alpha + ')';
        g.beginPath(); g.arc(x, y, r, 0, 6.283); g.fill();
        if (!L && s.z === 1 && alpha > 0.7) { g.fillStyle = 'rgba(' + s.c + ',' + (alpha * 0.18) + ')'; g.beginPath(); g.arc(x, y, r * 3.2, 0, 6.283); g.fill(); }
      }

      /* constellation around the pointer */
      if (near.length) {
        g.lineWidth = 1;
        for (i = 0; i < near.length; i++) {
          var p = near[i];
          g.strokeStyle = (L ? 'rgba(11,141,160,' : 'rgba(79,209,224,') + (p[2] * 0.65) + ')';
          g.beginPath(); g.moveTo(mx, my); g.lineTo(p[0], p[1]); g.stroke();
          for (var j = i + 1; j < near.length; j++) {
            var q = near[j], ddx = p[0] - q[0], ddy = p[1] - q[1];
            if (ddx * ddx + ddy * ddy < 95 * 95) {
              g.strokeStyle = (L ? 'rgba(56,96,216,' : 'rgba(185,140,255,') + (Math.min(p[2], q[2]) * 0.45) + ')';
              g.beginPath(); g.moveTo(p[0], p[1]); g.lineTo(q[0], q[1]); g.stroke();
            }
          }
        }
      }

      if (!still) {
        /* shooting stars */
        nextShoot -= dt;
        if (nextShoot <= 0) { addShoot(); nextShoot = 3.5 + Math.random() * 6; }
        for (i = shoot.length - 1; i >= 0; i--) {
          var sh = shoot[i]; sh.x += sh.vx * dt; sh.y += sh.vy * dt; sh.life -= dt;
          if (sh.life <= 0) { shoot.splice(i, 1); continue; }
          var len = 0.12, tx = sh.x - sh.vx * len, ty = sh.y - sh.vy * len;
          var lg = g.createLinearGradient(sh.x, sh.y, tx, ty);
          lg.addColorStop(0, L ? 'rgba(30,60,120,.6)' : 'rgba(255,255,255,.95)'); lg.addColorStop(1, 'rgba(255,255,255,0)');
          g.strokeStyle = lg; g.lineWidth = 2; g.beginPath(); g.moveTo(sh.x, sh.y); g.lineTo(tx, ty); g.stroke();
        }
        /* click ripples and sparks */
        for (i = ripples.length - 1; i >= 0; i--) {
          var rp = ripples[i]; rp.r += dt * 260; rp.life -= dt * 1.2;
          if (rp.life <= 0) { ripples.splice(i, 1); continue; }
          g.strokeStyle = 'rgba(79,209,224,' + (rp.life * 0.7) + ')'; g.lineWidth = 2;
          g.beginPath(); g.arc(rp.x, rp.y, rp.r, 0, 6.283); g.stroke();
        }
        for (i = sparks.length - 1; i >= 0; i--) {
          var sp = sparks[i]; sp.x += sp.vx * dt; sp.y += sp.vy * dt; sp.vx *= 0.96; sp.vy *= 0.96; sp.life -= dt;
          if (sp.life <= 0) { sparks.splice(i, 1); continue; }
          g.fillStyle = 'rgba(240,194,75,' + Math.min(1, sp.life) + ')';
          g.fillRect(sp.x, sp.y, 2.2, 2.2);
        }
      }
    }

    window.addEventListener('resize', size);
    window.addEventListener('pointermove', onMove, { passive: true });
    document.addEventListener('pointerleave', onLeave);
    window.addEventListener('blur', onLeave);
    window.addEventListener('click', onClick);
    document.addEventListener('visibilitychange', function () { if (!document.hidden && !still && !raf) raf = requestAnimationFrame(frame); });
    size();
    if (!still) raf = requestAnimationFrame(frame);
    return { redraw: function () { frame(performance.now()); } };
  }
  return { start: start };
})();
