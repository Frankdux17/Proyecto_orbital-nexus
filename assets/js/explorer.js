/* ORBITAL NEXUS — 3D mission explorer.
   A rotatable 3D view of the whole mission: the trajectory from Earth to the
   destination, where every body is on each day, and a timeline that walks
   the lifecycle a CubeSat 101 developer goes through, from the concept of
   operations to end of mission. A side-by-side stereo mode turns a phone in
   a cardboard viewer into a simple VR headset.
   Scale is compressed (distances follow √r) so Earth and Jupiter fit on one
   screen; the explorer says so on screen. */

var EXP = {
  open: false, yaw: -0.6, pitch: 1.05, zoom: 1, day: 0, u: 0, playing: false, speed: 1,
  vr: false, follow: false, spin: 0, cfg: null, scene: null, raf: 0, last: 0, drag: null, stars: null, orient: null
};

/* ---------------------------------------------------------------- *
 * mission timeline                                                  *
 * ---------------------------------------------------------------- */
function expPhases(cfg) {
  var dev = cfg.devMonths * 30.4, cr = Math.max(1, cfg.cruise), ops = cfg.ops * 30;
  var arr = Math.max(0.5, Math.min(cr * 0.04, 6)), launch = Math.min(0.4, cr * 0.1);
  var P = [
    { k: 'concept', a: -dev, b: -dev * 0.82, w: 1, icon: 'target' },
    { k: 'design', a: -dev * 0.82, b: -dev * 0.5, w: 1, icon: 'console' },
    { k: 'build', a: -dev * 0.5, b: -dev * 0.1, w: 1.2, icon: 'shield' },
    { k: 'integ', a: -dev * 0.1, b: 0, w: 0.7, icon: cfg.cubesat ? 'cubesat' : 'rocket' },
    { k: 'launch', a: 0, b: launch, w: 0.8, icon: 'rocket' },
    { k: 'cruise', a: launch, b: cr, w: 1.4, icon: 'orbit3d' },
    { k: 'arrive', a: cr, b: cr + arr, w: 0.8, icon: cfg.lander ? 'chute' : 'target' },
    { k: 'ops', a: cr + arr, b: cr + ops - 30, w: 2, icon: 'cam' },
    { k: 'end', a: cr + ops - 30, b: cr + ops, w: 0.8, icon: 'spark' }
  ];
  var tot = 0, i;
  for (i = 0; i < P.length; i++) tot += P[i].w;
  var acc = 0;
  for (i = 0; i < P.length; i++) { P[i].u0 = acc / tot; acc += P[i].w; P[i].u1 = acc / tot; }
  return P;
}
/* the slider is piecewise-linear in phases so a 3-day cruise is as easy
   to scrub as a six-year one */
function expUtoDay(u) {
  var P = EXP.scene.phases;
  for (var i = 0; i < P.length; i++) if (u <= P[i].u1 || i === P.length - 1) {
    var f = (u - P[i].u0) / Math.max(1e-6, P[i].u1 - P[i].u0);
    return P[i].a + (P[i].b - P[i].a) * Math.max(0, Math.min(1, f));
  }
  return 0;
}
function expPhaseAt(day) {
  var P = EXP.scene.phases;
  for (var i = P.length - 1; i >= 0; i--) if (day >= P[i].a) return P[i];
  return P[0];
}

function expPhaseText(ph, cfg) {
  var es = LANG === 'es', d = cfg;
  function T(a, b) { return es ? a : b; }
  var geo = EXP.scene.mode === 'geo';
  switch (ph.k) {
    case 'concept': return [T('Concepto de la misión', 'Mission concept'),
      T('Se define qué se quiere lograr, quién usará los datos y cómo operará la nave: el concepto de operaciones (ConOps). Tu respuesta: ' + d.name + '.',
        'The team defines what the mission must achieve, who will use the data and how the spacecraft will operate: the concept of operations (ConOps). Your answer: ' + d.name + '.')];
    case 'design': return [T('Diseño y revisiones (PDR · CDR)', 'Design and reviews (PDR · CDR)'),
      T('Requisitos, presupuestos de masa, potencia y datos, y las revisiones de diseño preliminar y crítico. Es exactamente lo que hiciste en las fases 2 a 4.',
        'Requirements, mass, power and data budgets, then the preliminary and critical design reviews. Exactly what you did in phases 2 to 4.')];
    case 'build': return [T('Fabricación, integración y pruebas', 'Build, integration and test'),
      T('Se construye y se prueba como va a volar: vibración, termovacío y compatibilidad electromagnética. Acortar estos meses ahorra dinero pero sube el riesgo.',
        'It is built and tested as it will fly: vibration, thermal vacuum and electromagnetic compatibility. Cutting these months saves money but raises the risk.')];
    case 'integ': return cfg.cubesat
      ? [T('Integración en el dispensador', 'Integration into the dispenser'),
        T('Un CubeSat se entrega meses antes del lanzamiento y se instala en un dispensador que lo soltará con un resorte. Desde ese momento nadie puede tocarlo: las baterías deben quedar apagadas y cargadas.',
          'A CubeSat is handed over months before launch and loaded into a spring dispenser that will push it out. From then on nobody can touch it: batteries must stay off and charged.')]
      : [T('Integración con el lanzador', 'Launch vehicle integration'),
        T('La nave se carga de propelente, se monta en su adaptador y se encapsula dentro del cofre del cohete.',
          'The spacecraft is fuelled, mounted on its adapter and encapsulated inside the rocket fairing.')];
    case 'launch': return [T('Lanzamiento y separación', 'Launch and separation'),
      T((d.lv ? d.lv + ': ' : '') + 'despegue, Max-Q, separación de etapas, apertura del cofre y separación de la nave.',
        (d.lv ? d.lv + ': ' : '') + 'liftoff, Max-Q, staging, fairing separation and spacecraft release.')];
    case 'cruise': return [geo ? T('Puesta en servicio', 'Commissioning') : T('Crucero', 'Cruise'),
      geo ? T('Primer contacto, despliegue de paneles y antenas, y revisión de cada subsistema antes de empezar la ciencia.',
        'First contact, array and antenna deployment, and a check of every subsystem before science begins.')
        : T(d.cruise + ' días de viaje por una órbita de transferencia. Se calibran los instrumentos y se hacen maniobras de corrección de trayectoria.',
          d.cruise + ' days on a transfer orbit. Instruments are calibrated and trajectory correction manoeuvres are flown.')];
    case 'arrive': return cfg.lander
      ? [T('Entrada, descenso y aterrizaje', 'Entry, descent and landing'), T('Los famosos «siete minutos de terror»: escudo térmico, paracaídas y retrocohetes, todo sin ayuda desde la Tierra.', 'The famous "seven minutes of terror": heat shield, parachute and retro rockets, all with no help from Earth.')]
      : [T('Llegada e inserción', 'Arrival and insertion'), T('El motor se enciende para frenar y quedar capturado en la órbita científica. Es el minijuego que jugarás al lanzar.', 'The engine fires to brake into the science orbit. It is the mini game you will play at launch.')];
    case 'ops': return [T('Operaciones científicas', 'Science operations'),
      T(d.ops + ' turnos (meses) de observar, guardar y transmitir. Cada pase de la antena terrena es una ventana para bajar datos.',
        d.ops + ' turns (months) of observing, storing and transmitting. Every ground station pass is a window to downlink data.')];
    default: return [T('Fin de misión', 'End of mission'), d.destId === 'europa'
      ? T('Impacto controlado contra Júpiter para no contaminar Europa: protección planetaria.', 'A controlled plunge into Jupiter so Europa is never contaminated: planetary protection.')
      : d.destId === 'titan' ? T('El aterrizador hace su último vuelo y queda como estación meteorológica mientras el RTG le dé calor.', 'The lander makes its last flight and stays on as a weather station for as long as the RTG keeps it warm.')
      : (geo ? T('Desorbitado o reórbita «cementerio». Las reglas de basura espacial exigen que un CubeSat en órbita baja reingrese pronto a la atmósfera.', 'Deorbit or a "graveyard" orbit. Space debris rules require a CubeSat in low orbit to re-enter the atmosphere soon.')
        : T('Pasivación: se vacían tanques y baterías y se apaga el transmisor. La nave queda como un monumento en el espacio.', 'Passivation: tanks and batteries are emptied and the transmitter goes silent. The spacecraft becomes a monument in space.'))];
  }
}

/* ---------------------------------------------------------------- *
 * the 3D scene                                                      *
 * ---------------------------------------------------------------- */
var TAU = Math.PI * 2;
function sq(au) { return 62 * Math.sqrt(au); }
var PLANETS = {
  venus: { au: 0.723, P: 224.7, r: 4.2, c: ['#fff2c2', '#b38a32'], n: { es: 'Venus', en: 'Venus' } },
  earth: { au: 1, P: 365.25, r: 4.4, c: ['#9fd4ff', '#1f4e9a'], n: { es: 'Tierra', en: 'Earth' } },
  mars: { au: 1.524, P: 687, r: 3.6, c: ['#ffb07a', '#7a2a10'], n: { es: 'Marte', en: 'Mars' } },
  neo: { au: 1.12, P: 433, r: 2.2, c: ['#cfc6b6', '#4a4238'], inc: 0.18, n: { es: 'Asteroide', en: 'Asteroid' } },
  jupiter: { au: 5.2, P: 4333, r: 9, c: ['#fde3c0', '#8a5a2c'], n: { es: 'Júpiter', en: 'Jupiter' } },
  psyche: { au: 2.92, P: 1828, r: 2.6, c: ['#f2f0ea', '#3d3a35'], inc: 0.054, n: { es: 'Psyche', en: 'Psyche' } },
  saturn: { au: 9.54, P: 10759, r: 8, c: ['#f6e7c1', '#9b7a3c'], n: { es: 'Saturno', en: 'Saturn' } }
};
/* moons the spacecraft actually goes to */
var MOONS = {
  europa: { of: 'jupiter', n: 'Europa', r: 1.6, c: ['#ffffff', '#8c7658'], d: 15, w: 0.7 },
  titan: { of: 'saturn', n: { es: 'Titán', en: 'Titan' }, r: 1.9, c: ['#ffd98a', '#6b3a10'], d: 16, w: 0.5 }
};

function kepler(M, e) {
  var E = M;
  for (var i = 0; i < 8; i++) E = E - (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E));
  return E;
}

function expBuild(cfg) {
  var id = cfg.destId, sc = { mode: 'helio', bodies: [], rings: [], phases: expPhases(cfg) };
  var cr = Math.max(1, cfg.cruise);
  var helioTarget = { 'mars-orbit': 'mars', 'mars-surface': 'mars', 'venus-orbit': 'venus', 'neo': 'neo', 'europa': 'jupiter', 'psyche': 'psyche', 'titan': 'saturn' }[id];
  var moon = MOONS[id], outer = helioTarget && PLANETS[helioTarget].au > 4;

  if (helioTarget) {
    var tg = PLANETS[helioTarget], E0 = PLANETS.earth;
    var r1 = sq(1), r2 = sq(tg.au), a = (r1 + r2) / 2, e = Math.abs(r2 - r1) / (r1 + r2);
    var th0 = Math.PI - TAU * cr / tg.P; /* the target is waiting at the far apse on arrival */
    function planetPos(p, d, phase0) {
      var ang = (phase0 || 0) + TAU * d / p.P, rr = sq(p.au);
      return [rr * Math.cos(ang), rr * Math.sin(ang), p.inc ? rr * Math.sin(p.inc) * Math.sin(ang - 0.6) : 0];
    }
    sc.extent = outer ? sq(tg.au) * 1.1 : sq(Math.max(1.6, tg.au)) * 1.15;
    sc.sun = [0, 0, 0];
    var list = ['venus', 'earth', 'mars'];
    if (tg.au >= 5) list.push('jupiter');
    if (helioTarget !== 'jupiter' && list.indexOf(helioTarget) < 0) list.push(helioTarget);
    for (var i = 0; i < list.length; i++) (function (k) {
      var p = PLANETS[k], ph0 = k === helioTarget ? th0 : (k === 'earth' ? 0 : (i * 1.7));
      sc.rings.push({ pts: ringPts(function (ang) { var rr = sq(p.au); return [rr * Math.cos(ang), rr * Math.sin(ang), p.inc ? rr * Math.sin(p.inc) * Math.sin(ang - 0.6) : 0]; }), col: 'rgba(140,170,230,.28)' });
      sc.bodies.push({ name: L(p.n), r: p.r, c: p.c, key: k, pos: function (d) { return planetPos(p, d, ph0); } });
    })(list[i]);
    if (moon) {
      sc.bodies.push({ name: typeof moon.n === 'string' ? moon.n : L(moon.n), r: moon.r, c: moon.c, moonOf: moon.of, pos: function (d) {
        var j = planetPos(tg, d, th0), ang = EXP.spin * moon.w;
        return [j[0] + moon.d * Math.cos(ang), j[1] + moon.d * Math.sin(ang), j[2]];
      } });
    }
    var tz = tg.inc ? planetPos(tg, cr, th0)[2] : 0;
    function transfer(f) {
      var M = Math.PI * f, Ek = kepler(M, e);
      var nu = 2 * Math.atan2(Math.sqrt(1 + e) * Math.sin(Ek / 2), Math.sqrt(1 - e) * Math.cos(Ek / 2));
      var rr = r2 > r1 ? a * (1 - e * Math.cos(Ek)) : a * (1 + e * Math.cos(Ek));
      return [rr * Math.cos(nu), rr * Math.sin(nu), tz * f];
    }
    var tp = [];
    for (i = 0; i <= 90; i++) tp.push(transfer(i / 90));
    sc.transfer = tp;
    sc.craft = function (d) {
      if (d <= 0) return planetPos(E0, d, 0);
      if (d < cr) return transfer(d / cr);
      var tgt = moon ? sc.bodies[sc.bodies.length - 1].pos(d) : planetPos(tg, d, th0);
      if (cfg.lander) return [tgt[0], tgt[1], tgt[2] + (moon ? moon.r : tg.r) * 0.9];
      var ang = EXP.spin * (moon ? 1.6 : 1.2);
      var rr = moon ? 3 : tg.r * 1.9;
      return [tgt[0] + rr * Math.cos(ang), tgt[1] + rr * Math.sin(ang) * 0.4, tgt[2] + rr * Math.sin(ang) * 0.9];
    };
    sc.earth = function (d) { return planetPos(E0, d, 0); };
    sc.note = LANG === 'es' ? 'Escala comprimida (√distancia) · trayectoria de transferencia tipo Hohmann' : 'Compressed scale (√distance) · Hohmann-type transfer';
    if (outer || helioTarget === 'psyche') sc.note += LANG === 'es' ? ' · la misión real usa asistencias gravitatorias' : ' · the real mission uses gravity assists';
    return sc;
  }

  /* Earth-centred scenes */
  sc.mode = 'geo';
  var RE = 12, earth = { name: LANG === 'es' ? 'Tierra' : 'Earth', r: RE, c: ['#9fd4ff', '#1f4e9a'], key: 'earth', spin: true, pos: function () { return [0, 0, 0]; } };
  sc.bodies.push(earth);
  sc.earth = function () { return [0, 0, 0]; };
  function ascent(d, target) {
    var f = Math.max(0, Math.min(1, d / Math.max(0.05, sc.phases[4].b)));
    var pad = [RE, 0, 0];
    return [pad[0] + (target[0] - pad[0]) * f, pad[1] + (target[1] - pad[1]) * f, pad[2] + (target[2] - pad[2]) * f];
  }

  if (id === 'leo-sso' || id === 'geo-relay') {
    var leo = id === 'leo-sso';
    var R = leo ? RE * 1.55 : RE * 5.2, inc = leo ? 98 * Math.PI / 180 : 0;
    function orb(ang) { return [R * Math.cos(ang), R * Math.sin(ang) * Math.cos(inc), R * Math.sin(ang) * Math.sin(inc)]; }
    sc.rings.push({ pts: ringPts(orb), col: 'rgba(79,209,224,.55)' });
    var gtoA = (RE * 1.3 + R) / 2, gtoE = (R - RE * 1.3) / (R + RE * 1.3);
    function gto(f) {
      var Ek = kepler(Math.PI * f, gtoE);
      var nu = 2 * Math.atan2(Math.sqrt(1 + gtoE) * Math.sin(Ek / 2), Math.sqrt(1 - gtoE) * Math.cos(Ek / 2));
      var rr = gtoA * (1 - gtoE * Math.cos(Ek));
      return [rr * Math.cos(nu), rr * Math.sin(nu), RE * 0.6 * Math.sin(nu) * (1 - f)];
    }
    if (!leo) { var g = []; for (var j = 0; j <= 60; j++) g.push(gto(j / 60)); sc.transfer = g; }
    sc.extent = leo ? R * 2.3 : R * 1.25;
    sc.craft = function (d) {
      var lb = sc.phases[4].b;
      if (d <= 0) return [RE, 0, 0];
      if (d < lb) return ascent(d, leo ? orb(0) : gto(0));
      if (!leo && d < cr) return gto((d - lb) / (cr - lb));
      return orb((leo ? 0 : Math.PI) + EXP.spin * (leo ? 1.3 : 0.45));
    };
    sc.note = LANG === 'es' ? (leo ? 'Órbita polar heliosíncrona, inclinación 98° · altura exagerada' : 'Órbita de transferencia geoestacionaria (GTO) → órbita geoestacionaria') : (leo ? 'Polar Sun-synchronous orbit, 98° inclination · altitude exaggerated' : 'Geostationary transfer orbit (GTO) → geostationary orbit');
    return sc;
  }

  /* Moon and Sun-Earth L2 */
  var lunar = id === 'llo';
  var DM = lunar ? 150 : 62, PM = 27.32, MR = lunar ? 4.5 : 3.2;
  var mph0 = lunar ? Math.PI - TAU * cr / PM : 1.2;
  /* the Moon turns at its real rate during the cruise and slowly otherwise,
     so months of development or operations do not blur into a strobe */
  function mday(d) { return d < 0 ? d * 0.02 : (d <= cr ? d : cr + (d - cr) * 0.03); }
  function moonPos(d) { var ang = mph0 + TAU * mday(d) / PM; return [DM * Math.cos(ang), DM * Math.sin(ang), DM * 0.09 * Math.sin(ang)]; }
  sc.rings.push({ pts: ringPts(function (ang) { return [DM * Math.cos(ang), DM * Math.sin(ang), DM * 0.09 * Math.sin(ang)]; }), col: 'rgba(140,170,230,.3)' });
  sc.bodies.push({ name: LANG === 'es' ? 'Luna' : 'Moon', r: MR, c: ['#f1f2f5', '#4c5160'], pos: moonPos });

  if (lunar) {
    var a2 = (RE * 1.4 + DM) / 2, e2 = (DM - RE * 1.4) / (DM + RE * 1.4);
    var tli = function (f) {
      var Ek = kepler(Math.PI * f, e2);
      var nu = 2 * Math.atan2(Math.sqrt(1 + e2) * Math.sin(Ek / 2), Math.sqrt(1 - e2) * Math.cos(Ek / 2));
      var rr = a2 * (1 - e2 * Math.cos(Ek));
      return [rr * Math.cos(nu), rr * Math.sin(nu), DM * 0.09 * Math.sin(nu) * f];
    };
    var tl = []; for (var q = 0; q <= 70; q++) tl.push(tli(q / 70));
    sc.transfer = tl;
    sc.extent = DM * 1.12;
    sc.craft = function (d) {
      var lb = sc.phases[4].b;
      if (d <= 0) return [RE, 0, 0];
      if (d < lb) return ascent(d, tli(0));
      if (d < cr) return tli((d - lb) / (cr - lb));
      var m = moonPos(d), ang = EXP.spin * 1.4;
      return [m[0] + MR * 1.7 * Math.cos(ang), m[1], m[2] + MR * 1.7 * Math.sin(ang)];
    };
    sc.note = LANG === 'es' ? 'Inyección translunar y órbita lunar polar baja · escala comprimida' : 'Trans-lunar injection and low polar lunar orbit · compressed scale';
    return sc;
  }

  var L2 = [175, 0, 0];
  sc.sunDir = [-1, 0, 0];
  sc.bodies.push({ name: 'L2', r: 1.2, c: ['#f0c24b', '#a7760a'], marker: true, pos: function () { return L2; } });
  function halo(ang) { return [L2[0] + 6 * Math.cos(2 * ang), L2[1] + 34 * Math.cos(ang), L2[2] + 20 * Math.sin(ang)]; }
  sc.rings.push({ pts: ringPts(halo), col: 'rgba(240,194,75,.55)' });
  var path = function (f) {
    var s = f * f * (3 - 2 * f), h0 = halo(0);
    return [RE * 1.4 + (h0[0] - RE * 1.4) * s, h0[1] * s + 30 * Math.sin(Math.PI * f), h0[2] * s + 14 * Math.sin(Math.PI * f)];
  };
  var pp = []; for (var w = 0; w <= 60; w++) pp.push(path(w / 60));
  sc.transfer = pp;
  sc.extent = 200;
  sc.craft = function (d) {
    var lb = sc.phases[4].b;
    if (d <= 0) return [RE, 0, 0];
    if (d < lb) return ascent(d, path(0));
    if (d < cr) return path((d - lb) / (cr - lb));
    return halo(EXP.spin * 0.35);
  };
  sc.note = LANG === 'es' ? 'Marco giratorio Sol-Tierra · órbita de halo alrededor de L2 (1,5 millones de km)' : 'Rotating Sun-Earth frame · halo orbit around L2 (1.5 million km)';
  return sc;
}

function ringPts(fn) { var p = []; for (var i = 0; i <= 96; i++) p.push(fn(i / 96 * TAU)); return p; }

/* ---------------------------------------------------------------- *
 * projection and drawing                                            *
 * ---------------------------------------------------------------- */
function expProj(p, view) {
  var x = p[0] - view.cx, y = p[1] - view.cy, z = p[2] - view.cz;
  var cy = Math.cos(view.yaw), sy = Math.sin(view.yaw), cp = Math.cos(view.pitch), sp = Math.sin(view.pitch);
  var x1 = x * cy - y * sy, y1 = x * sy + y * cy;
  var y2 = y1 * cp - z * sp, z2 = y1 * sp + z * cp, depth = y2;
  var k = view.F / (view.F + depth * view.s * 0.9);
  if (k < 0.05) k = 0.05;
  return [view.ox + x1 * view.s * k, view.oy - z2 * view.s * k, k, depth];
}

function expDraw(ctx, w, h, ox, eyeYaw, ts) {
  var sc = EXP.scene, d = EXP.day;
  var focus = [0, 0, 0];
  if (EXP.follow) focus = sc.craft(d);
  var s = Math.min(w, h) * 0.46 / sc.extent * EXP.zoom * (EXP.follow ? 3.2 : 1);
  var view = { cx: focus[0], cy: focus[1], cz: focus[2], yaw: EXP.yaw + eyeYaw, pitch: EXP.pitch, s: s, F: Math.min(w, h) * 1.6, ox: ox + w / 2, oy: h / 2 };

  /* backdrop */
  var bg = ctx.createRadialGradient(ox + w / 2, h / 2, 10, ox + w / 2, h / 2, Math.max(w, h) * 0.8);
  bg.addColorStop(0, '#0c1636'); bg.addColorStop(1, '#03060f');
  ctx.fillStyle = bg; ctx.fillRect(ox, 0, w, h);
  ctx.save(); ctx.beginPath(); ctx.rect(ox, 0, w, h); ctx.clip();

  /* stars on a far sphere: rotate with the camera, no parallax */
  var cyw = Math.cos(view.yaw), syw = Math.sin(view.yaw), cpp = Math.cos(view.pitch), spp = Math.sin(view.pitch);
  for (var i = 0; i < EXP.stars.length; i++) {
    var st = EXP.stars[i];
    var x1 = st[0] * cyw - st[1] * syw, y1 = st[0] * syw + st[1] * cyw;
    var y2 = y1 * cpp - st[2] * spp, z2 = y1 * spp + st[2] * cpp;
    if (y2 < -0.1) continue;
    ctx.fillStyle = 'rgba(220,230,255,' + (st[3] * (0.5 + 0.5 * Math.sin(ts / 1500 + i))) + ')';
    ctx.fillRect(ox + w / 2 + x1 * w * 0.7, h / 2 - z2 * w * 0.7, st[3] > 0.7 ? 1.6 : 1, st[3] > 0.7 ? 1.6 : 1);
  }

  /* Sun */
  if (sc.sun) {
    var sp0 = expProj(sc.sun, view), sr = Math.max(8, 9 * view.s * sp0[2]);
    var sg = ctx.createRadialGradient(sp0[0], sp0[1], 0, sp0[0], sp0[1], sr * 3.2);
    sg.addColorStop(0, 'rgba(255,247,209,1)'); sg.addColorStop(0.25, 'rgba(255,201,74,.9)'); sg.addColorStop(1, 'rgba(255,138,31,0)');
    ctx.fillStyle = sg; ctx.beginPath(); ctx.arc(sp0[0], sp0[1], sr * 3.2, 0, TAU); ctx.fill();
  }
  if (sc.sunDir) {
    var sd = expProj([-400, 0, 0], view);
    var sg2 = ctx.createRadialGradient(sd[0], sd[1], 0, sd[0], sd[1], 90);
    sg2.addColorStop(0, 'rgba(255,220,120,.55)'); sg2.addColorStop(1, 'rgba(255,160,40,0)');
    ctx.fillStyle = sg2; ctx.beginPath(); ctx.arc(sd[0], sd[1], 90, 0, TAU); ctx.fill();
    label3(ctx, LANG === 'es' ? '← hacia el Sol' : '← to the Sun', sd[0] + 10, sd[1] + 4, 'rgba(255,220,140,.9)');
  }

  /* orbit rings */
  for (i = 0; i < sc.rings.length; i++) poly(ctx, sc.rings[i].pts, view, sc.rings[i].col, 1, null);

  /* trajectory: dashed ahead of the spacecraft, bright behind it */
  var lb = sc.phases[4].b, cr = Math.max(1, EXP.cfg.cruise);
  if (sc.transfer) {
    poly(ctx, sc.transfer, view, 'rgba(240,194,75,.45)', 1.3, [4, 5]);
    if (d > lb) {
      var f = Math.min(1, (d - lb) / Math.max(1e-6, cr - lb));
      if (sc.mode === 'helio') f = Math.min(1, d / cr);
      var n = Math.max(2, Math.round(sc.transfer.length * f));
      poly(ctx, sc.transfer.slice(0, n), view, '#f0c24b', 2.2, null);
    }
  }

  /* bodies, sorted back to front */
  var items = [];
  for (i = 0; i < sc.bodies.length; i++) {
    var b = sc.bodies[i], pp = expProj(b.pos(d), view);
    items.push({ b: b, p: pp });
  }
  var cp = expProj(sc.craft(d), view);
  items.push({ craft: true, p: cp });
  items.sort(function (A, B) { return B.p[3] - A.p[3]; });

  /* link line to Earth once the spacecraft is working */
  if (d > lb) {
    var ep = expProj(sc.earth(d), view);
    ctx.strokeStyle = 'rgba(79,209,224,.5)'; ctx.lineWidth = 1; ctx.setLineDash([2, 5]);
    ctx.lineDashOffset = -ts / 60;
    ctx.beginPath(); ctx.moveTo(cp[0], cp[1]); ctx.lineTo(ep[0], ep[1]); ctx.stroke();
    ctx.setLineDash([]);
  }

  for (i = 0; i < items.length; i++) {
    var it = items[i], p = it.p;
    if (it.craft) {
      var cs = 5 + 2 * Math.sin(ts / 220);
      var cg = ctx.createRadialGradient(p[0], p[1], 0, p[0], p[1], cs * 3);
      cg.addColorStop(0, 'rgba(255,255,255,.95)'); cg.addColorStop(0.3, 'rgba(79,209,224,.8)'); cg.addColorStop(1, 'rgba(79,209,224,0)');
      ctx.fillStyle = cg; ctx.beginPath(); ctx.arc(p[0], p[1], cs * 3, 0, TAU); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.beginPath();
      ctx.moveTo(p[0], p[1] - 4); ctx.lineTo(p[0] + 4, p[1]); ctx.lineTo(p[0], p[1] + 4); ctx.lineTo(p[0] - 4, p[1]); ctx.closePath(); ctx.fill();
      label3(ctx, LANG === 'es' ? 'Tu nave' : 'Your spacecraft', p[0] + 9, p[1] - 8, '#9ee7f2');
      continue;
    }
    var bb = it.b, r = Math.max(bb.marker ? 3 : 2.5, bb.r * view.s * p[2]);
    if (bb.marker) {
      ctx.strokeStyle = bb.c[0]; ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.moveTo(p[0] - 6, p[1]); ctx.lineTo(p[0] + 6, p[1]); ctx.moveTo(p[0], p[1] - 6); ctx.lineTo(p[0], p[1] + 6); ctx.stroke();
      label3(ctx, bb.name, p[0] + 8, p[1] - 6, bb.c[0]);
      continue;
    }
    var gg = ctx.createRadialGradient(p[0] - r * 0.35, p[1] - r * 0.35, r * 0.1, p[0], p[1], r);
    gg.addColorStop(0, bb.c[0]); gg.addColorStop(1, bb.c[1]);
    ctx.fillStyle = gg; ctx.beginPath(); ctx.arc(p[0], p[1], r, 0, TAU); ctx.fill();
    if (bb.spin && r > 10) {
      /* continents drift across the disc so Earth reads as a turning globe */
      ctx.save(); ctx.beginPath(); ctx.arc(p[0], p[1], r, 0, TAU); ctx.clip();
      ctx.fillStyle = 'rgba(90,190,120,.55)';
      for (var c2 = 0; c2 < 6; c2++) {
        var lon = ((ts / 9000 + c2 * 1.05) % TAU) - Math.PI;
        if (Math.abs(lon) > 1.45) continue;
        ctx.beginPath(); ctx.ellipse(p[0] + Math.sin(lon) * r * 0.8, p[1] + (c2 % 3 - 1) * r * 0.38, r * 0.22 * Math.cos(lon), r * 0.16, 0, 0, TAU); ctx.fill();
      }
      ctx.restore();
    }
    if (bb.key === 'saturn') {
      ctx.strokeStyle = 'rgba(240,220,170,.75)'; ctx.lineWidth = Math.max(1.2, r * 0.22);
      ctx.beginPath(); ctx.ellipse(p[0], p[1], r * 2.1, r * 0.55, -0.35, 0, TAU); ctx.stroke();
    }
    if (bb.key === 'jupiter' || bb.key === 'saturn') {
      ctx.save(); ctx.beginPath(); ctx.arc(p[0], p[1], r, 0, TAU); ctx.clip();
      ctx.strokeStyle = 'rgba(140,80,40,.45)'; ctx.lineWidth = Math.max(1, r * 0.14);
      for (var bnd = -2; bnd <= 2; bnd++) { ctx.beginPath(); ctx.moveTo(p[0] - r, p[1] + bnd * r * 0.32); ctx.lineTo(p[0] + r, p[1] + bnd * r * 0.32); ctx.stroke(); }
      ctx.restore();
    }
    label3(ctx, bb.name, p[0] + r + 4, p[1] - r * 0.4 - 2, 'rgba(200,215,245,.85)');
  }
  ctx.restore();
}

function poly(ctx, pts, view, col, lw, dash) {
  ctx.strokeStyle = col; ctx.lineWidth = lw; ctx.setLineDash(dash || []);
  ctx.beginPath();
  for (var i = 0; i < pts.length; i++) {
    var p = expProj(pts[i], view);
    if (i) ctx.lineTo(p[0], p[1]); else ctx.moveTo(p[0], p[1]);
  }
  ctx.stroke(); ctx.setLineDash([]);
}
function label3(ctx, txt, x, y, col) {
  ctx.font = '600 11px system-ui, -apple-system, Segoe UI, sans-serif';
  ctx.fillStyle = 'rgba(3,6,15,.6)'; ctx.fillText(txt, x + 1, y + 1);
  ctx.fillStyle = col; ctx.fillText(txt, x, y);
}

/* ---------------------------------------------------------------- *
 * overlay, controls and loop                                       *
 * ---------------------------------------------------------------- */
function expDOM() {
  var root = document.getElementById('explorer');
  if (root) return root;
  root = document.createElement('div');
  root.id = 'explorer'; root.className = 'explorer'; root.hidden = true;
  root.setAttribute('role', 'dialog'); root.setAttribute('aria-modal', 'true');
  document.body.appendChild(root);
  return root;
}

function expChrome() {
  var es = LANG === 'es', cfg = EXP.cfg, sc = EXP.scene, ticks = '';
  for (var i = 0; i < sc.phases.length; i++) {
    var ph = sc.phases[i], tx = expPhaseText(ph, cfg);
    ticks += '<button class="x-tick" data-u="' + ((ph.u0 + ph.u1) / 2).toFixed(4) + '" style="left:' + (ph.u0 * 100) + '%;width:' + ((ph.u1 - ph.u0) * 100) + '%" title="' + esc(tx[0]) + '">' +
      icon(ph.icon, 'ico') + '<span>' + esc(tx[0]) + '</span></button>';
  }
  return '<canvas id="x-cv" class="x-cv"></canvas>' +
    '<div class="x-top"><div class="x-title">' + icon('orbit3d', 'ico') + '<div><b>' + esc(es ? 'Explorador 3D de la misión' : '3D mission explorer') + '</b><span>' + esc(cfg.name) + '</span></div></div>' +
    '<div class="x-tools">' +
    '<button class="x-btn" id="x-follow" type="button" aria-pressed="false">' + icon('target', 'ico') + '<span>' + esc(es ? 'Seguir nave' : 'Follow craft') + '</span></button>' +
    '<button class="x-btn" id="x-vr" type="button">' + icon('vr', 'ico') + '<span>' + esc(es ? 'Modo RV' : 'VR mode') + '</span></button>' +
    '<button class="x-btn x-close" id="x-close" type="button" aria-label="' + esc(es ? 'Cerrar' : 'Close') + '">' + icon('close', 'ico') + '</button></div></div>' +
    '<div class="x-card" id="x-card" aria-live="polite"></div>' +
    '<div class="x-note">' + esc(sc.note) + ' · ' + esc(es ? 'arrastra para girar, rueda o pellizco para acercar' : 'drag to rotate, wheel or pinch to zoom') + '</div>' +
    '<div class="x-bottom"><button class="x-play" id="x-play" type="button" aria-label="Play">' + icon('play', 'ico') + '</button>' +
    '<div class="x-line"><div class="x-ticks">' + ticks + '</div>' +
    '<input type="range" id="x-range" min="0" max="1000" step="1" value="0" aria-label="' + esc(es ? 'Línea de tiempo de la misión' : 'Mission timeline') + '"></div>' +
    '<div class="x-day" id="x-day"></div></div>' +
    '<button class="x-vr-exit" id="x-vr-exit" type="button">' + esc(es ? 'Salir de RV' : 'Exit VR') + '</button>';
}

function explorerOpen(cfg) {
  if (!cfg || !cfg.destId) return;
  EXP.cfg = cfg;
  EXP.scene = expBuild(cfg);
  EXP.u = 0; EXP.day = expUtoDay(0); EXP.playing = !reducedMotion(); EXP.zoom = 1; EXP.follow = false; EXP.vr = false;
  EXP.yaw = -0.6; EXP.pitch = EXP.scene.mode === 'geo' ? 1.15 : 1.0;
  if (!EXP.stars) {
    EXP.stars = [];
    for (var i = 0; i < 320; i++) {
      var u = Math.random() * 2 - 1, th = Math.random() * TAU, rr = Math.sqrt(1 - u * u);
      EXP.stars.push([rr * Math.cos(th), rr * Math.sin(th), u, Math.random()]);
    }
  }
  var root = expDOM();
  root.className = 'explorer';
  root.innerHTML = expChrome();
  root.hidden = false;
  EXP.open = true; OVERLAY_OPEN = true;
  expWire(root);
  expSync();
  cancelAnimationFrame(EXP.raf);
  EXP.last = 0;
  EXP.raf = requestAnimationFrame(expFrame);
  award('navigator');
}

function explorerClose() {
  var root = document.getElementById('explorer');
  if (root) root.hidden = true;
  EXP.open = false; OVERLAY_OPEN = false;
  cancelAnimationFrame(EXP.raf);
  if (EXP.vr) expVR(false);
}

function expSync() {
  var ph = expPhaseAt(EXP.day), tx = expPhaseText(ph, EXP.cfg), es = LANG === 'es';
  var card = document.getElementById('x-card');
  if (card && card.getAttribute('data-k') !== ph.k) {
    card.setAttribute('data-k', ph.k);
    card.innerHTML = '<div class="x-card-ic">' + icon(ph.icon, 'ico') + '</div><div><small>' +
      esc(es ? 'Fase ' : 'Phase ') + (EXP.scene.phases.indexOf(ph) + 1) + '/9 · CubeSat 101</small><b>' + esc(tx[0]) + '</b><p>' + esc(tx[1]) + '</p></div>';
  }
  var d = Math.round(EXP.day), lbl = document.getElementById('x-day');
  if (lbl) lbl.textContent = (d < 0 ? 'L−' + (-d) : 'L+' + d) + (es ? ' días' : ' days');
  var rg = document.getElementById('x-range');
  if (rg && document.activeElement !== rg) rg.value = Math.round(EXP.u * 1000);
  var ticks = document.querySelectorAll('.x-tick');
  for (var i = 0; i < ticks.length; i++) ticks[i].classList.toggle('on', i === EXP.scene.phases.indexOf(ph));
  var pb = document.getElementById('x-play');
  if (pb) pb.innerHTML = icon(EXP.playing ? 'pause' : 'play', 'ico');
}

function expWire(root) {
  var cv = document.getElementById('x-cv');
  document.getElementById('x-close').onclick = explorerClose;
  document.getElementById('x-play').onclick = function () {
    if (EXP.u >= 0.999) EXP.u = 0;
    EXP.playing = !EXP.playing; expSync();
  };
  document.getElementById('x-follow').onclick = function () {
    EXP.follow = !EXP.follow; this.setAttribute('aria-pressed', EXP.follow ? 'true' : 'false'); this.classList.toggle('on', EXP.follow);
  };
  document.getElementById('x-vr').onclick = function () { expVR(true); };
  document.getElementById('x-vr-exit').onclick = function () { expVR(false); };
  var rg = document.getElementById('x-range');
  rg.oninput = function () { EXP.u = rg.value / 1000; EXP.day = expUtoDay(EXP.u); EXP.playing = false; expSync(); };
  var ticks = root.querySelectorAll('.x-tick');
  for (var i = 0; i < ticks.length; i++) ticks[i].onclick = function () {
    var P = EXP.scene.phases, u = parseFloat(this.getAttribute('data-u'));
    for (var j = 0; j < P.length; j++) if (u >= P[j].u0 && u <= P[j].u1) u = P[j].u0 + 0.001;
    EXP.u = u; EXP.day = expUtoDay(u); expSync();
  };

  var pts = {};
  cv.onpointerdown = function (e) { cv.setPointerCapture(e.pointerId); pts[e.pointerId] = [e.clientX, e.clientY]; EXP.drag = { pinch: null }; };
  cv.onpointermove = function (e) {
    if (!pts[e.pointerId]) return;
    var ids = Object.keys(pts);
    if (ids.length === 2) {
      var o = ids[0] == e.pointerId ? pts[ids[1]] : pts[ids[0]];
      var dist = Math.hypot(e.clientX - o[0], e.clientY - o[1]);
      if (EXP.drag.pinch) EXP.zoom = Math.max(0.35, Math.min(6, EXP.zoom * dist / EXP.drag.pinch));
      EXP.drag.pinch = dist;
    } else {
      var p = pts[e.pointerId];
      EXP.yaw += (e.clientX - p[0]) * 0.008;
      EXP.pitch = Math.max(0.05, Math.min(1.55, EXP.pitch - (e.clientY - p[1]) * 0.006));
    }
    pts[e.pointerId] = [e.clientX, e.clientY];
  };
  cv.onpointerup = cv.onpointercancel = function (e) { delete pts[e.pointerId]; };
  cv.onwheel = function (e) { e.preventDefault(); EXP.zoom = Math.max(0.35, Math.min(6, EXP.zoom * Math.exp(-e.deltaY * 0.0012))); };

  root.onkeydown = function (e) {
    if (e.key === 'Escape') { e.preventDefault(); if (EXP.vr) expVR(false); else explorerClose(); }
    if (e.key === ' ' && e.target === document.body) { e.preventDefault(); EXP.playing = !EXP.playing; expSync(); }
  };
  root.tabIndex = -1; root.focus();
}

/* side-by-side stereo for a phone in a cardboard viewer; the phone's
   orientation steers the camera when the browser exposes it */
function expVR(on) {
  var root = document.getElementById('explorer');
  EXP.vr = on;
  root.classList.toggle('vr', on);
  if (on) {
    EXP.playing = true;
    try { if (root.requestFullscreen) root.requestFullscreen().then(function () { try { screen.orientation.lock('landscape'); } catch (e) { } }).catch(function () { }); } catch (e) { }
    var startOrient = function () {
      EXP.orient = function (ev) {
        if (ev.gamma == null) return;
        EXP.yaw = -(ev.alpha || 0) * Math.PI / 180;
        EXP.pitch = Math.max(0.05, Math.min(1.55, Math.abs(ev.gamma) * Math.PI / 180));
      };
      window.addEventListener('deviceorientation', EXP.orient);
    };
    if (window.DeviceOrientationEvent && typeof DeviceOrientationEvent.requestPermission === 'function') {
      DeviceOrientationEvent.requestPermission().then(function (s) { if (s === 'granted') startOrient(); }).catch(function () { });
    } else if (window.DeviceOrientationEvent) startOrient();
  } else {
    if (EXP.orient) window.removeEventListener('deviceorientation', EXP.orient);
    EXP.orient = null;
    try { if (document.fullscreenElement) document.exitFullscreen(); } catch (e) { }
  }
  expSync();
}

function expFrame(ts) {
  if (!EXP.open) return;
  var cv = document.getElementById('x-cv');
  if (!cv) return;
  var dt = EXP.last ? Math.min(0.05, (ts - EXP.last) / 1000) : 0.016;
  EXP.last = ts;
  if (!reducedMotion()) EXP.spin += dt;
  if (EXP.playing) {
    EXP.u += dt / 38; /* the whole mission in about forty seconds */
    if (EXP.u >= 1) { EXP.u = 1; EXP.playing = false; }
    EXP.day = expUtoDay(EXP.u);
    expSync();
  }
  if (!EXP.drag && !EXP.vr && !reducedMotion() && EXP.playing) EXP.yaw += dt * 0.04;
  var dpr = window.devicePixelRatio || 1, w = cv.clientWidth, h = cv.clientHeight;
  if (cv.width !== Math.round(w * dpr) || cv.height !== Math.round(h * dpr)) { cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); }
  var ctx = cv.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  if (EXP.vr) {
    expDraw(ctx, w / 2, h, 0, -0.03, ts);
    expDraw(ctx, w / 2, h, w / 2, 0.03, ts);
    ctx.fillStyle = '#000'; ctx.fillRect(w / 2 - 1, 0, 2, h);
  } else expDraw(ctx, w, h, 0, 0, ts);
  EXP.raf = requestAnimationFrame(expFrame);
}

/* what the explorer needs from the live design */
function explorerCfg(c) {
  if (!c || !c.dest) return null;
  return {
    destId: c.dest.id, name: L(c.dest.name), cruise: c.cruiseDays || c.dest.cruiseDays, ops: c.opsTurns,
    devMonths: c.devMonths || (c.prog ? c.prog.devNominal : 36), lander: !!c.dest.lander,
    cubesat: !!(c.prog && c.prog.id === 'cubesat') || !!(c.bus && c.bus.rank === 0), lv: c.lv ? L(c.lv.name) : ''
  };
}
/* a ready-made mission for the splash screen, before the player has chosen */
function explorerDemo(destId) {
  var d = DATA.find(DATA.destinations, destId || 'mars-orbit');
  return { destId: d.id, name: L(d.name), cruise: d.cruiseDays, ops: d.opsTurns, devMonths: 48, lander: !!d.lander, cubesat: d.id === 'leo-sso', lv: '' };
}
