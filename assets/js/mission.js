/* ORBITAL NEXUS — the ground side of a mission: who staffs mission control,
   the flight readiness review and GO / NO-GO poll before launch, navigation
   from Earth during the cruise, and the "which spacecraft should I pick"
   advice that real proposal teams learn the hard way. */

/* ---------------------------------------------------------------- *
 * recommendations                                                  *
 * ---------------------------------------------------------------- */
/* the lightest set of instruments that covers the two most valuable
   objectives: a sensible floor for the payload a bus must carry */
function minPayloadFor(dest) {
  if (!dest) return 0;
  var objs = dest.objectives.slice().sort(function (a, b) { return b.value - a.value; }).slice(0, 2);
  var picked = {}, mass = 0;
  for (var i = 0; i < objs.length; i++) for (var j = 0; j < objs[i].instr.length; j++) {
    var tag = objs[i].instr[j], best = null;
    for (var k = 0; k < DATA.instruments.length; k++) {
      var it = DATA.instruments[k];
      if (it.tags.indexOf(tag) < 0 || (it.landerOnly && !dest.lander)) continue;
      if (!best || it.mass < best.mass) best = it;
    }
    if (best && !picked[best.id]) { picked[best.id] = true; mass += best.mass; }
  }
  return mass;
}

function recommend(c) {
  var r = { bus: null, lv: null, prop: null };
  if (c.dest) {
    var need = Math.max(c.mass ? c.mass.payload : 0, minPayloadFor(c.dest));
    for (var i = 0; i < DATA.buses.length && !r.bus; i++) if (DATA.buses[i].payloadMax >= need * 1.15) r.bus = DATA.buses[i].id;
    /* propulsion: the cheapest system whose Isp makes the Δv without
       a propellant fraction above about 45% */
    var bus = c.bus;
    if (bus) {
      for (i = 0; i < DATA.propulsion.length && !r.prop; i++) {
        var p = DATA.propulsion[i];
        if (p.minRank > bus.rank) continue;
        var frac = 1 - Math.exp(-(c.dest.dv + c.dest.skDvPerTurn * c.dest.opsTurns / 1000) * 1000 / (p.isp * G0));
        if (frac < 0.45) r.prop = p.id;
      }
    }
  }
  if (c.dest && c.mass && c.mass.launch > 0) {
    var best = null;
    for (i = 0; i < DATA.launchers.length; i++) {
      var lv = DATA.launchers[i], cap = lv.cap[c.dest.c3] || 0;
      if (cap < c.mass.launch * 1.1 || lv.reliability < 0.9) continue;
      if (lv.onlyDest && lv.onlyDest.indexOf(c.dest.id) < 0) continue;
      if (lv.minProgram != null && c.prog && c.prog.rank < lv.minProgram) continue;
      if (!best || lv.cost < best.cost || (lv.cost === best.cost && lv.reliability > best.reliability)) best = lv;
    }
    r.lv = best ? best.id : null;
  }
  return r;
}

/* rules of thumb per phase, the way a mentor would put them */
function guideBox(phase) {
  var es = LANG === 'es', items;
  var G = {
    2: es ? ['Empieza por el bus más pequeño que cargue tus instrumentos con 15% de margen: cada kilo extra se paga en cohete.',
      'El propelente necesario crece de forma exponencial con el Δv (ecuación del cohete). Si pasa de ~45% de la masa, sube de Isp.',
      'Paneles solares hasta Marte; más allá de 3 UA piensa en RTG.',
      'Deja 30% de margen de potencia: los paneles pierden eficiencia cada año.']
      : ['Start with the smallest bus that carries your instruments with a 15% margin: every extra kilo is paid for in rocket.',
        'Required propellant grows exponentially with Δv (rocket equation). If it passes ~45% of the mass, buy more Isp.',
        'Solar arrays out to Mars; beyond 3 AU think RTG.',
        'Keep a 30% power margin: arrays lose efficiency every year.'],
    3: es ? ['Elige primero los instrumentos de los objetivos de mayor valor.',
      'Un instrumento que no puedes transmitir vale cero: compara los Gb por turno con tu enlace.',
      'Menos instrumentos bien atendidos ganan a muchos instrumentos apagados.']
      : ['Pick the instruments for the highest-value objectives first.',
        'An instrument you cannot downlink is worth zero: compare Gb per turn with your link.',
        'A few well-served instruments beat many switched off.'],
    4: es ? ['Duplicar la antena cuadruplica la tasa de datos; la banda Ka da ~10× la X, pero sufre con la lluvia.',
      'Lejos de la Tierra usa la DSN de 34 m; la de 70 m solo si el enlace no alcanza.',
      'Para el espacio profundo pon al menos 1 navegante (FIDO). Con 2–3 tus correcciones serán más precisas.',
      'Más gente en consola = mejores respuestas ante fallas, pero cada puesto cuesta cada turno.']
      : ['Doubling the antenna quadruples the data rate; Ka band gives ~10× X band, but suffers in rain.',
        'Far from Earth use the 34 m DSN; the 70 m only if the link falls short.',
        'For deep space staff at least 1 navigator (FIDO). With 2–3 your corrections will be more precise.',
        'More people on console = better responses to failures, but every seat costs every turn.'],
    5: es ? ['Elige el cohete más barato que lleve tu masa con 10% de margen y al menos 90% de fiabilidad.',
      'No recortes las pruebas: cada mes que quitas sube el riesgo en la puesta en servicio.',
      'Antes de despegar pasa la revisión de vuelo: el clima y cada consola deben decir GO.']
      : ['Pick the cheapest rocket that carries your mass with a 10% margin and at least 90% reliability.',
        'Do not cut testing: every month removed raises the commissioning risk.',
        'Before liftoff pass the flight review: the weather and every console must say GO.']
  }[phase];
  if (!G) return '';
  var h = '<details class="guide"><summary>' + icon('spark', 'ico') + '<span>' + esc(es ? '¿Cómo elegir la mejor opción?' : 'How to pick the best option?') + '</span></summary><ul>';
  for (var i = 0; i < G.length; i++) h += '<li>' + esc(G[i]) + '</li>';
  return h + '</ul></details>';
}

/* ---------------------------------------------------------------- *
 * mission control staffing (phase 4)                               *
 * ---------------------------------------------------------------- */
function staffPanel(c) {
  var es = LANG === 'es', st = S.staff, team = ENG.staff(S), h = '';
  for (var i = 0; i < DATA.consoles.length; i++) {
    var k = DATA.consoles[i], on = k.required || (k.levels ? st[k.id] > 0 : !!st[k.id]);
    var ctl;
    if (k.required) ctl = '<span class="st-req">' + esc(es ? 'Obligatorio' : 'Required') + '</span>';
    else if (k.levels) {
      ctl = '<span class="st-lvl"><button class="as-b" data-act="fido" data-v="-1" aria-label="−">−</button><b>' + (st[k.id] || 0) + '</b>' +
        '<button class="as-b" data-act="fido" data-v="1" aria-label="+">+</button><small>' + esc(es ? 'navegantes' : 'navigators') + '</small></span>';
    } else ctl = '<span class="switch' + (on ? ' on' : '') + '" data-act="staff" data-v="' + k.id + '" role="switch" aria-checked="' + on + '"></span>';
    h += '<div class="st-row' + (on ? ' on' : '') + '"><span class="st-ic">' + icon(k.icon, 'ico') + '</span><span class="st-txt"><b>' + esc(L(k.name)) + '</b><small>' + esc(L(k.desc)) + '</small></span>' + ctl + '</div>';
  }
  var perTurn = c.cost.staffPerTurn || 0;
  var deep = c.dest && c.dest.commAu > 0.002;
  return '<div class="panel staff"><h2>' + esc(es ? 'Centro de control en Tierra' : 'Mission control on Earth') + '</h2>' +
    '<p class="hint" style="margin:-4px 0 12px">' + esc(es ? 'Una nave no se opera sola: elige quién se sienta en cada consola. Cada puesto cuesta cada turno, pero cambia lo que puedes hacer cuando algo falla.'
      : 'A spacecraft does not fly itself: choose who sits at each console. Every seat costs every turn, but changes what you can do when something fails.') + '</p>' + h +
    '<div class="st-row h24' + (st.h24 ? ' on' : '') + '"><span class="st-ic">' + icon('clock', 'ico') + '</span><span class="st-txt"><b>' + esc(es ? 'Operación 24/7 (3 turnos)' : '24/7 operations (3 shifts)') + '</b><small>' +
    esc(es ? 'Alguien siempre mirando la telemetría: 15% menos anomalías, costo ×2,2.' : 'Someone always watching telemetry: 15% fewer anomalies, cost ×2.2.') + '</small></span>' +
    '<span class="switch' + (st.h24 ? ' on' : '') + '" data-act="h24" role="switch" aria-checked="' + !!st.h24 + '"></span></div>' +
    '<div class="st-sum"><div><span>' + esc(es ? 'En consola' : 'On console') + '</span><b>' + team.onConsole + '</b></div>' +
    '<div><span>' + esc(es ? 'Equipo total' : 'Total team') + '</span><b>' + team.total + '</b></div>' +
    '<div><span>' + esc(es ? 'Costo por turno' : 'Cost per turn') + '</span><b>$' + n2(perTurn) + 'M</b></div>' +
    '<div><span>' + esc(es ? 'Toda la misión' : 'Whole mission') + '</span><b>' + money(perTurn * c.opsTurns) + '</b></div></div>' +
    (deep && !st.fido ? '<div class="alert warn"><span class="alert-icon">!</span><span>' + esc(es ? 'Vas al espacio profundo sin navegantes: las correcciones de trayectoria serán imprecisas.' : 'You are going to deep space without navigators: trajectory corrections will be imprecise.') + '</span></div>' : '') +
    '</div>';
}

function crewMini() {
  var team = ENG.staff(S), es = LANG === 'es', h = '';
  for (var i = 0; i < team.seats.length; i++)
    h += '<span class="crew-chip" title="' + esc(L(team.seats[i].con.name)) + '">' + icon(team.seats[i].con.icon, 'ico') +
      (team.seats[i].n > 1 ? '<b>×' + team.seats[i].n + '</b>' : '') + '</span>';
  return '<div class="panel"><h2>' + esc(es ? 'Centro de control' : 'Mission control') + '</h2><div class="crew">' + h + '</div>' +
    '<div class="hint">' + esc(es ? team.onConsole + ' en consola · ' + team.total + ' personas en total' + (team.shifts === 3 ? ' (24/7)' : '')
      : team.onConsole + ' on console · ' + team.total + ' people in total' + (team.shifts === 3 ? ' (24/7)' : '')) + '</div></div>';
}

/* ---------------------------------------------------------------- *
 * flight readiness review + GO / NO-GO poll                         *
 * ---------------------------------------------------------------- */
function readinessItems(c) {
  var es = LANG === 'es', out = [];
  function add(ok, warn, name, val, fix) { out.push({ st: ok ? 'go' : (warn ? 'warn' : 'nogo'), name: name, val: val, fix: fix }); }
  var mm = c.lvCap > 0 ? (c.lvCap - c.mass.launch) / c.lvCap : -1;
  add(mm >= 0.1, mm >= 0, es ? 'Margen de masa del cohete' : 'Launch mass margin', n0(mm * 100) + '%',
    es ? 'Usa un cohete más capaz o quita masa: propelente, blindaje o un instrumento.' : 'Use a more capable rocket or remove mass: propellant, shielding or an instrument.');
  add(c.power.marginPct >= 0.3, c.power.marginPct >= 0.1, es ? 'Margen de potencia' : 'Power margin', n0(c.power.marginPct * 100) + '%',
    es ? 'Agranda los paneles o apaga instrumentos; las revisiones piden ~30%.' : 'Grow the arrays or drop instruments; reviews ask for ~30%.');
  var dvm = c.dv.required > 0 ? c.dv.margin / c.dv.required : 1;
  add(dvm >= 0.1, dvm >= 0, es ? 'Margen de Δv' : 'Δv margin', n0(c.dv.margin * 1000) + ' m/s',
    es ? 'Más propelente o un motor con más Isp.' : 'More propellant or a higher-Isp engine.');
  add(c.link.ratio >= 0.6, c.link.ratio >= 0.25, es ? 'Capacidad del enlace' : 'Link capacity', n0(c.link.ratio * 100) + '%',
    es ? 'Antena más grande, banda Ka, más potencia o estación de 70 m.' : 'Bigger dish, Ka band, more power or the 70 m station.');
  add(c.devMonths >= c.devNeed, c.devMonths >= c.devNeed * 0.85, es ? 'Campaña de pruebas' : 'Test campaign', c.devMonths + '/' + c.devNeed + (es ? ' meses' : ' months'),
    es ? 'Alarga el desarrollo: las pruebas de vibración y termovacío encuentran los defectos en Tierra.' : 'Extend development: vibration and thermal vacuum tests catch defects on the ground.');
  add(c.cost.marginPct >= 0.1, c.cost.marginPct >= 0, es ? 'Reserva de presupuesto' : 'Budget reserve', money(c.cost.margin),
    es ? 'Un cohete más barato o menos equipo en tierra liberan dinero para imprevistos.' : 'A cheaper rocket or a smaller ground team frees money for surprises.');
  var rad = c.shd.krad / Math.max(1, c.dest.radKrad);
  add(rad >= 1, rad >= 0.5, es ? 'Protección contra radiación' : 'Radiation protection', c.shd.krad + ' / ' + c.dest.radKrad + ' krad',
    es ? 'Sube el nivel de blindaje en la fase de enlace.' : 'Raise the shielding level in the link phase.');
  if (c.dest.commAu > 0.002)
    add((S.staff.fido || 0) >= 1, true, es ? 'Equipo de navegación' : 'Navigation team', (S.staff.fido || 0) + (es ? ' navegantes' : ' navigators'),
      es ? 'Agrega navegantes FIDO en el centro de control para corregir la trayectoria.' : 'Add FIDO navigators in mission control to correct the trajectory.');
  return out;
}

function rollWeather() {
  return {
    wind: Math.round(4 + rnd() * 32),          /* knots at the pad, limit 30 */
    upper: Math.round(25 + rnd() * 85),        /* upper-level wind shear, % of the vehicle's limit */
    storm: rnd() < 0.15,                       /* cumulus or lightning inside 10 nautical miles */
    boat: rnd() < 0.08,                        /* a boat inside the range exclusion zone */
    kp: Math.floor(rnd() * 9)
  };
}

function launchReview(c, go) {
  var es = LANG === 'es', W = rollWeather(), items = readinessItems(c);
  var scrubCost = Math.max(0.2, (c.prog ? c.prog.burnPerMonth : 1) * 0.25);
  var root = document.getElementById('review');
  if (!root) { root = document.createElement('div'); root.id = 'review'; root.className = 'review'; document.body.appendChild(root); }
  root.hidden = false; OVERLAY_OPEN = true;

  function wxRows() {
    function r(name, val, lim, ok) {
      return '<div class="rv-row ' + (ok ? 'go' : 'nogo') + '"><span class="rv-st">' + (ok ? 'GO' : 'NO-GO') + '</span><span class="rv-n">' + esc(name) + '<small>' + esc(lim) + '</small></span><b>' + esc(val) + '</b></div>';
    }
    return r(es ? 'Viento en la plataforma' : 'Pad winds', W.wind + ' kt', es ? 'límite 30 kt' : 'limit 30 kt', W.wind <= 30) +
      r(es ? 'Vientos en altura' : 'Upper-level winds', W.upper + '%', es ? 'del límite estructural' : 'of the structural limit', W.upper <= 100) +
      r(es ? 'Regla de rayos' : 'Lightning rule', W.storm ? (es ? 'cúmulos a 8 km' : 'cumulus at 5 nmi') : (es ? 'despejado' : 'clear'), es ? 'sin tormentas a menos de 18 km' : 'no storms within 10 nmi', !W.storm) +
      r(es ? 'Zona de exclusión del campo' : 'Range exclusion zone', W.boat ? (es ? 'un barco dentro' : 'a boat inside') : (es ? 'libre' : 'clear'), es ? 'mar y espacio aéreo despejados' : 'sea and airspace clear', !W.boat) +
      '<div class="rv-row ' + (W.kp >= 7 ? 'warn' : 'go') + '"><span class="rv-st">' + (W.kp >= 7 ? (es ? 'OBS.' : 'NOTE') : 'GO') + '</span><span class="rv-n">' + esc(es ? 'Clima espacial (índice Kp)' : 'Space weather (Kp index)') + '<small>' + esc(es ? 'tormenta geomagnética si Kp ≥ 7' : 'geomagnetic storm if Kp ≥ 7') + '</small></span><b>Kp ' + W.kp + '</b></div>';
  }
  function wxGo() { return W.wind <= 30 && W.upper <= 100 && !W.storm && !W.boat; }

  function render() {
    var nWarn = 0, nNo = 0, ih = '';
    for (var i = 0; i < items.length; i++) {
      var it = items[i];
      if (it.st === 'warn') nWarn++;
      if (it.st === 'nogo') nNo++;
      ih += '<div class="rv-row ' + it.st + '"><span class="rv-st">' + (it.st === 'go' ? 'GO' : (it.st === 'warn' ? (es ? 'OBS.' : 'NOTE') : 'NO-GO')) + '</span>' +
        '<span class="rv-n">' + esc(it.name) + (it.st !== 'go' ? '<small class="rv-fix">' + icon('spark', 'ico') + esc(it.fix) + '</small>' : '') + '</span><b>' + esc(it.val) + '</b></div>';
    }
    var poll = [
      [es ? 'Meteorología' : 'Weather', W.wind <= 30 && W.upper <= 100 && !W.storm],
      [es ? 'Seguridad del campo' : 'Range safety', !W.boat],
      [es ? 'Vehículo de lanzamiento' : 'Launch vehicle', items[0].st !== 'nogo'],
      [es ? 'Nave espacial' : 'Spacecraft', items[1].st !== 'nogo' && items[2].st !== 'nogo'],
      [es ? 'Red terrena y comunicaciones' : 'Ground network and comms', items[3].st !== 'nogo'],
      ['FIDO', c.dest.commAu <= 0.002 || (S.staff.fido || 0) > 0],
      [es ? 'Director de vuelo' : 'Flight director', null]
    ];
    var allGo = true;
    for (i = 0; i < poll.length - 1; i++) if (!poll[i][1]) allGo = false;
    poll[poll.length - 1][1] = allGo;
    var ph = '';
    for (i = 0; i < poll.length; i++)
      ph += '<li class="rv-poll ' + (poll[i][1] ? 'go' : 'nogo') + '" style="--d:' + (i * 0.32) + 's"><span>' + esc(poll[i][0]) + '</span><b>' + (poll[i][1] ? 'GO' : 'NO-GO') + '</b></li>';

    root.innerHTML = '<div class="rv-wrap"><div class="rv-head"><div><div class="rv-kick">' + esc(es ? 'Sala de lanzamiento · L−1 día' : 'Launch control · L−1 day') + '</div>' +
      '<h1>' + esc(es ? 'Revisión de preparación de vuelo' : 'Flight readiness review') + '</h1>' +
      '<p>' + esc(es ? 'Antes de encender los motores, cada consola revisa su parte. Aquí ves lo que podría salir mal y cómo mejorarlo.' : 'Before the engines light, every console checks its part. Here is what could go wrong and how to improve it.') + '</p></div>' +
      '<button class="x-btn x-close" data-rv="close" aria-label="' + esc(es ? 'Cerrar' : 'Close') + '">' + icon('close', 'ico') + '</button></div>' +
      '<div class="rv-cols"><section><h2>' + icon('smallsat', 'ico') + esc(es ? 'Lista de verificación de la nave' : 'Spacecraft checklist') + '</h2>' + ih + '</section>' +
      '<section><h2>' + icon('spark', 'ico') + esc(es ? 'Clima y condiciones del campo' : 'Weather and range conditions') + '</h2>' + wxRows() +
      '<h2 style="margin-top:18px">' + icon('console', 'ico') + esc(es ? 'Votación GO / NO-GO' : 'GO / NO-GO poll') + '</h2><ol class="rv-polls">' + ph + '</ol></section></div>' +
      '<div class="rv-verdict ' + (allGo ? 'go' : 'nogo') + '">' + esc(allGo
        ? (es ? 'Todas las consolas reportan GO. Estás listo para despegar.' : 'Every console reports GO. You are ready for liftoff.')
        : (es ? 'Hay consolas en NO-GO. Puedes posponer 24 h, corregir el diseño o arriesgarte: lanzar con NO-GO de clima aumenta la probabilidad de falla.'
          : 'Some consoles are NO-GO. You can scrub 24 h, fix the design or take the risk: launching with a weather NO-GO raises the failure odds.')) +
      (S.scrubs ? ' ' + esc(es ? 'Aplazamientos: ' + S.scrubs + ' (' + money(S.scrubCost) + ')' : 'Scrubs: ' + S.scrubs + ' (' + money(S.scrubCost) + ')') : '') + '</div>' +
      '<div class="rv-btns">' +
      '<button class="btn primary big" data-rv="auto">' + icon('rocket', 'ico') + '<span>' + esc(es ? 'Despegar con guiado automático' : 'Launch on automatic guidance') + '</span></button>' +
      '<button class="btn big rv-pilot" data-rv="pilot">' + icon('target', 'ico') + '<span>' + esc(es ? 'Pilotar el ascenso yo mismo' : 'Fly the ascent myself') + '</span></button>' +
      '<button class="btn big ghost" data-rv="scrub">' + icon('clock', 'ico') + '<span>' + esc(es ? 'Posponer 24 h' : 'Scrub 24 h') + ' (−' + money(scrubCost) + ')</span></button>' +
      '<button class="btn big ghost" data-rv="close">' + esc(es ? 'Volver a revisar el diseño' : 'Back to the design') + '</button></div></div>';
    if (!reducedMotion()) SFX.beep();
  }
  root.onclick = function (e) {
    var b = e.target.closest ? e.target.closest('[data-rv]') : null;
    if (!b) return;
    var a = b.getAttribute('data-rv');
    if (a === 'close') { root.hidden = true; OVERLAY_OPEN = false; return; }
    if (a === 'scrub') {
      S.scrubs = (S.scrubs || 0) + 1; S.scrubCost = (S.scrubCost || 0) + scrubCost;
      W = rollWeather(); render(); root.scrollTop = 0; return;
    }
    var f = 1;
    if (W.wind > 30) f *= 0.9;
    if (W.upper > 100) f *= 0.88;
    if (W.storm) f *= 0.8;
    if (W.boat) f *= 0.97;
    if (W.wind > 30 || W.upper > 100 || W.storm) award('nogo');
    if (wxGo() && S.scrubs) award('patience');
    root.hidden = true; OVERLAY_OPEN = false;
    go(a, f);
  };
  render();
  root.scrollTop = 0;
}

/* ---------------------------------------------------------------- *
 * navigation from Earth: trajectory correction manoeuvres          *
 * The view is the B-plane, the target plane navigators aim through. *
 * Tracking from the Deep Space Network shrinks the uncertainty      *
 * ellipse; each correction moves the trajectory; later corrections *
 * cost more Δv because the lever arm is shorter.                    *
 * ---------------------------------------------------------------- */
function navGame(o, done) {
  /* o: { dest, fido, dsn70, lander, massKg, isp, prog } */
  var es = LANG === 'es';
  var root = document.getElementById('navg');
  if (!root) { root = document.createElement('div'); root.id = 'navg'; root.className = 'navg'; document.body.appendChild(root); }
  root.hidden = false; OVERLAY_OPEN = true;
  var RT = 60;                          /* target corridor radius, km */
  var ang = rnd() * 6.283, off = 1800 + rnd() * 2200;
  var T = [Math.cos(ang) * off, Math.sin(ang) * off];       /* the true arrival point */
  var sig = 2600, E = [T[0] + (rnd() - 0.5) * 2 * sig, T[1] + (rnd() - 0.5) * 2 * sig];
  var tcm = 0, NT = 3, dvUsed = 0, tracked = false, ddor = false, aim = null, reveal = false, history = [], view = 0;
  var lever = [0.0022, 0.006, 0.02]; /* m/s of Δv per km moved on the B-plane, by TCM */
  var trackK = Math.max(0.1, 0.3 - 0.06 * (o.fido || 0) - (o.dsn70 ? 0.03 : 0));
  var execK = Math.max(0.02, 0.09 - 0.022 * (o.fido || 0));

  root.innerHTML = '<div class="nv-wrap"><div class="nv-head"><div><div class="rv-kick">' + esc(es ? 'Navegación desde la Tierra · crucero' : 'Navigation from Earth · cruise') + '</div>' +
    '<h1>' + esc(es ? 'Correcciones de trayectoria' : 'Trajectory correction manoeuvres') + '</h1>' +
    '<p>' + esc(es ? 'Tu nave viaja hacia ' + o.dest + '. Desde la Tierra, el equipo de navegación mide su posición con las antenas de la DSN y decide cuánto corregir. Debes llevar el punto de llegada dentro del corredor verde.'
      : 'Your spacecraft is heading for ' + o.dest + '. From Earth, the navigation team measures its position with the DSN antennas and decides how much to correct. Bring the arrival point inside the green corridor.') + '</p></div></div>' +
    '<div class="nv-body"><canvas id="nv-cv" class="nv-cv" aria-label="' + esc(es ? 'Plano B de llegada' : 'Arrival B-plane') + '"></canvas>' +
    '<div class="nv-side"><div class="nv-step" id="nv-step"></div><div id="nv-kv" class="nv-kv"></div>' +
    '<div class="nv-btns" id="nv-btns"></div><ol class="nv-how"><li>' + esc(es ? 'Rastrea: el Doppler y la medición de distancia achican la elipse de incertidumbre.' : 'Track: Doppler and ranging shrink the uncertainty ellipse.') + '</li>' +
    '<li>' + esc(es ? 'Toca el plano para elegir hacia dónde mover la llegada y ejecuta la maniobra.' : 'Tap the plane to choose where to move the arrival, then execute the burn.') + '</li>' +
    '<li>' + esc(es ? 'Corregir temprano es barato; las últimas correcciones cuestan más Δv.' : 'Correcting early is cheap; the last corrections cost more Δv.') + '</li></ol></div></div></div>';
  var cv = document.getElementById('nv-cv'), ctx = cv.getContext('2d');

  function kgFor(dv) { return o.massKg * (1 - Math.exp(-dv / (o.isp * G0))); }
  function stepUI() {
    var s = document.getElementById('nv-step'), b = document.getElementById('nv-btns'), kv = document.getElementById('nv-kv');
    var dist = Math.hypot(E[0], E[1]);
    kv.innerHTML = '<div><span>' + esc(es ? 'Incertidumbre (1σ)' : 'Uncertainty (1σ)') + '</span><b>' + n0(sig) + ' km</b></div>' +
      '<div><span>' + esc(es ? 'Error estimado' : 'Estimated miss') + '</span><b>' + n0(dist) + ' km</b></div>' +
      '<div><span>' + esc(es ? 'Δv usado' : 'Δv used') + '</span><b>' + n1(dvUsed) + ' m/s</b></div>' +
      '<div><span>' + esc(es ? 'Propelente' : 'Propellant') + '</span><b>' + n1(kgFor(dvUsed)) + ' kg</b></div>' +
      '<div><span>' + esc(es ? 'Navegantes FIDO' : 'FIDO navigators') + '</span><b>' + (o.fido || 0) + '</b></div>' +
      '<div><span>' + esc(es ? 'Corredor' : 'Corridor') + '</span><b>±' + RT + ' km</b></div>';
    if (reveal) return;
    s.innerHTML = '<b>TCM-' + (tcm + 1) + '</b> · ' + esc(es ? ['30 días después del lanzamiento', 'mitad del crucero', '10 días antes de llegar'][tcm] : ['30 days after launch', 'mid-cruise', '10 days before arrival'][tcm]);
    var cost = aim ? Math.hypot(aim[0] - E[0], aim[1] - E[1]) * lever[tcm] : 0;
    b.innerHTML = '<button class="btn" data-nv="track"' + (tracked ? ' disabled' : '') + '>' + icon('dish', 'ico') + esc(es ? 'Rastrear con la DSN' : 'Track with the DSN') + '</button>' +
      '<button class="btn" data-nv="ddor"' + (!tracked || ddor ? ' disabled' : '') + '>' + icon('rs', 'ico') + esc(es ? 'Medición ΔDOR (−$1M)' : 'ΔDOR measurement (−$1M)') + '</button>' +
      '<button class="btn" data-nv="center">' + icon('target', 'ico') + esc(es ? 'Apuntar al centro' : 'Aim at the centre') + '</button>' +
      '<button class="btn primary" data-nv="burn"' + (aim ? '' : ' disabled') + '>' + icon('rocket', 'ico') + esc(es ? 'Ejecutar maniobra' : 'Execute burn') + (aim ? ' · ' + n1(cost) + ' m/s' : '') + '</button>' +
      '<button class="btn ghost" data-nv="skip">' + esc(es ? 'Omitir esta corrección' : 'Skip this correction') + '</button>';
  }
  function next() {
    history.push([E[0], E[1]]);
    tcm++; tracked = false; ddor = false; aim = null;
    /* the trajectory drifts between corrections (solar pressure,
       outgassing) and the knowledge of it ages */
    /* less time left to arrival = less room to drift */
    var d = [60, 30, 8][tcm - 1] * (0.5 + rnd()), a2 = rnd() * 6.283;
    T[0] += Math.cos(a2) * d; T[1] += Math.sin(a2) * d;
    sig = Math.min(sig * 1.15 + 20, 3000);
    if (tcm >= NT) return finishNav();
    stepUI();
  }
  function finishNav() {
    reveal = true;
    var miss = Math.hypot(T[0], T[1]) / RT;
    var b = document.getElementById('nv-btns'), s = document.getElementById('nv-step');
    var ok = miss <= 1;
    if (ok) award('navigator2');
    s.innerHTML = '<b class="' + (ok ? 'ok' : 'warn') + '">' + esc(ok ? (es ? '¡Dentro del corredor!' : 'Inside the corridor!') : (es ? 'Fuera del corredor' : 'Outside the corridor')) + '</b> · ' +
      esc(es ? 'error real ' + n0(Math.hypot(T[0], T[1])) + ' km' : 'true miss ' + n0(Math.hypot(T[0], T[1])) + ' km');
    b.innerHTML = '<p class="nv-res">' + esc(ok
      ? (es ? 'La llegada será precisa: la ventana del encendido de inserción será más amplia.' : 'Arrival will be precise: the insertion burn window will be wider.')
      : (es ? 'Tendrás que corregir en la llegada: la ventana del encendido será más estrecha' + (o.lander ? ' y el aterrizaje más arriesgado.' : '.') : 'You will have to correct at arrival: the burn window will be narrower' + (o.lander ? ' and landing riskier.' : '.'))) + '</p>' +
      '<button class="btn primary" data-nv="done">' + esc(es ? 'Continuar a la llegada' : 'Continue to arrival') + '</button>';
    stepUI();
    root._res = { miss: miss, dv: dvUsed, kg: kgFor(dvUsed), ddorCost: root._ddor || 0 };
  }

  root.onclick = function (e) {
    var b = e.target.closest ? e.target.closest('[data-nv]') : null;
    if (!b || b.disabled) return;
    var a = b.getAttribute('data-nv');
    if (a === 'track') {
      tracked = true; SFX.data();
      sig *= trackK;
      E = [T[0] + (E[0] - T[0]) * trackK, T[1] + (E[1] - T[1]) * trackK];
    } else if (a === 'ddor') {
      ddor = true; root._ddor = (root._ddor || 0) + 1; SFX.data();
      sig *= 0.5;
      E = [T[0] + (E[0] - T[0]) * 0.5, T[1] + (E[1] - T[1]) * 0.5];
    } else if (a === 'center') {
      aim = [0, 0];
    } else if (a === 'burn' && aim) {
      var dx = aim[0] - E[0], dy = aim[1] - E[1], mag = Math.hypot(dx, dy);
      dvUsed += mag * lever[tcm];
      /* execution error: proportional to the burn, smaller with a better nav team */
      var ex = (rnd() - 0.5) * 2 * (mag * execK + 15), ey = (rnd() - 0.5) * 2 * (mag * execK + 15);
      T[0] += dx + ex; T[1] += dy + ey;
      E[0] = aim[0]; E[1] = aim[1];
      sig = Math.hypot(sig, mag * execK);
      SFX.rumble(0.6);
      next(); return;
    } else if (a === 'skip') { next(); return; }
    else if (a === 'done') {
      root.hidden = true; OVERLAY_OPEN = false; cancelAnimationFrame(raf);
      done(root._res); return;
    }
    stepUI();
  };
  cv.onclick = function (e) {
    if (reveal) return;
    var r = cv.getBoundingClientRect(), x = e.clientX - r.left - r.width / 2, y = e.clientY - r.top - r.height / 2;
    aim = [x / view, -y / view];
    SFX.tick(); stepUI();
  };

  var raf = 0;
  function draw(ts) {
    var dpr = window.devicePixelRatio || 1, w = cv.clientWidth, h = cv.clientHeight;
    if (cv.width !== Math.round(w * dpr)) { cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    var span = Math.max(RT * 4, Math.hypot(E[0], E[1]) * 1.3 + sig * 2.4, reveal ? Math.hypot(T[0], T[1]) * 1.4 : 0);
    var targetView = Math.min(w, h) / 2 / span;
    view = view ? view + (targetView - view) * 0.12 : targetView;
    var cx = w / 2, cy = h / 2;
    ctx.fillStyle = '#050a18'; ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = 'rgba(120,150,210,.15)'; ctx.lineWidth = 1;
    var gstep = Math.pow(10, Math.floor(Math.log10(span / 2)));
    for (var g = -Math.ceil(span / gstep) * gstep; g <= span; g += gstep) {
      ctx.beginPath(); ctx.moveTo(cx + g * view, 0); ctx.lineTo(cx + g * view, h); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, cy + g * view); ctx.lineTo(w, cy + g * view); ctx.stroke();
    }
    ctx.fillStyle = '#6b7d9e'; ctx.font = '10px ui-monospace,monospace';
    ctx.fillText((es ? 'cuadrícula ' : 'grid ') + n0(gstep) + ' km · ' + (es ? 'plano B' : 'B-plane'), 8, h - 8);
    /* the planet's capture corridor */
    var pulse = 1 + 0.06 * Math.sin(ts / 300);
    ctx.fillStyle = 'rgba(62,207,154,.18)'; ctx.strokeStyle = '#3ecf9a'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(cx, cy, Math.max(4, RT * view) * pulse, 0, 6.283); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#3ecf9a'; ctx.fillText(es ? 'corredor' : 'corridor', cx + Math.max(4, RT * view) + 6, cy - 4);
    /* earlier estimates */
    ctx.fillStyle = 'rgba(159,176,208,.5)';
    for (var i = 0; i < history.length; i++) { ctx.beginPath(); ctx.arc(cx + history[i][0] * view, cy - history[i][1] * view, 3, 0, 6.283); ctx.fill(); }
    /* uncertainty ellipse around the estimate */
    var ex = cx + E[0] * view, ey = cy - E[1] * view;
    ctx.fillStyle = 'rgba(240,194,75,.13)'; ctx.strokeStyle = 'rgba(240,194,75,.8)';
    ctx.beginPath(); ctx.ellipse(ex, ey, sig * view * 2, sig * view * 1.3, 0.5, 0, 6.283); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#f0c24b'; ctx.beginPath(); ctx.arc(ex, ey, 5, 0, 6.283); ctx.fill();
    ctx.fillText(es ? 'estimación 2σ' : '2σ estimate', ex + 9, ey - 8);
    if (aim && !reveal) {
      var ax = cx + aim[0] * view, ay = cy - aim[1] * view;
      ctx.strokeStyle = '#4fd1e0'; ctx.lineWidth = 2; ctx.setLineDash([6, 5]);
      ctx.beginPath(); ctx.moveTo(ex, ey); ctx.lineTo(ax, ay); ctx.stroke(); ctx.setLineDash([]);
      ctx.beginPath(); ctx.arc(ax, ay, 7, 0, 6.283); ctx.stroke();
    }
    if (reveal) {
      var tx = cx + T[0] * view, ty = cy - T[1] * view;
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(tx, ty, 6, 0, 6.283); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.fillText(es ? 'llegada real' : 'true arrival', tx + 9, ty + 4);
    }
    raf = requestAnimationFrame(draw);
  }
  stepUI();
  raf = requestAnimationFrame(draw);
}
