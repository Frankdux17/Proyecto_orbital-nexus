/* ORBITAL NEXUS — the mission team. Each phase seats you at a different
   console, and the person who owns that console reads your live design and
   tells you, in plain words, the one thing that matters most right now. */

function coachTip(c) {
  var es = LANG === 'es', p = S.phase;
  function T(a, b) { return es ? a : b; }

  if (p === 1) {
    if (!S.programId) return { mood: 'idea', msg: T('¡Bienvenida, bienvenido al equipo! Primero elige la clase de programa: define cuánto dinero y cuántos meses tendremos.',
      'Welcome to the team! First pick the program class: it sets how much money and how many months we get.') };
    if (!S.destId) return { mood: 'idea', msg: T('Ahora el destino. Mira el Δv y la radiación de cada uno: eso decidirá el tamaño de la nave.',
      'Now the destination. Look at each one\'s Δv and radiation: they will decide how big the spacecraft has to be.') };
    var best = null;
    for (var i = 0; i < c.dest.objectives.length; i++) if (!best || c.dest.objectives[i].value > best.value) best = c.dest.objectives[i];
    var nm = [];
    for (i = 0; i < best.instr.length; i++) nm.push(tagName(best.instr[i]));
    return { mood: 'ok', msg: T('Mi objetivo favorito en este destino es «' + L(best.name) + '» (' + best.value + ' pts). Para lograrlo necesitamos: ' + nm.join(' + ') + '.',
      'My favourite objective here is "' + L(best.name) + '" (' + best.value + ' pts). To get it we need: ' + nm.join(' + ') + '.') };
  }

  if (p === 2) {
    if (!S.busId) return { mood: 'idea', msg: T('Elige el bus: es el esqueleto de la nave. Un bus grande carga más instrumentos pero cuesta y pesa más.',
      'Pick the bus: it is the skeleton of the spacecraft. A bigger bus carries more instruments but costs and weighs more.') };
    if (c.dv.margin < 0) return { mood: 'bad', msg: T('¡Nos falta Δv! Con este propelente no llegamos. Agrega propelente o usa un motor con más Isp.',
      'We are short on Δv! With this propellant we will not get there. Add propellant or use an engine with higher Isp.') };
    if (c.power.marginPct < 0) return { mood: 'bad', msg: T('La nave consume más energía de la que genera. Agranda los paneles o agrega un RTG.',
      'The spacecraft draws more power than it makes. Grow the arrays or add an RTG.') };
    if (c.power.marginPct < 0.3) return { mood: 'warn', msg: T('Margen de potencia ' + n0(c.power.marginPct * 100) + '%. Las revisiones reales piden cerca de 30%: los paneles se degradan con los años.',
      'Power margin ' + n0(c.power.marginPct * 100) + '%. Real reviews ask for about 30%: arrays degrade over the years.') };
    return { mood: 'ok', msg: T('Plataforma sana: sobran ' + n0(c.dv.margin * 1000) + ' m/s de Δv y ' + n0(c.power.marginPct * 100) + '% de potencia. ¡Buen trabajo de sistemas!',
      'Healthy platform: ' + n0(c.dv.margin * 1000) + ' m/s of Δv and ' + n0(c.power.marginPct * 100) + '% power to spare. Good systems work!') };
  }

  if (p === 3) {
    if (!c.instr.length) return { mood: 'idea', msg: T('¡Hora de la ciencia! Cada objetivo pide instrumentos concretos. Elige primero los de mayor valor.',
      'Science time! Each objective needs specific instruments. Start with the most valuable ones.') };
    if (c.bus && c.mass.payload > c.bus.payloadMax) return { mood: 'bad', msg: T('Nos pasamos de la carga útil del bus por ' + n0(c.mass.payload - c.bus.payloadMax) + ' kg. Quita un instrumento o vuelve a elegir un bus mayor.',
      'We are ' + n0(c.mass.payload - c.bus.payloadMax) + ' kg over the bus payload limit. Drop an instrument or go back for a bigger bus.') };
    var miss = [];
    for (i = 0; i < c.coverage.length; i++) if (!c.coverage[i].have) miss.push(L(c.coverage[i].obj.name));
    if (miss.length) return { mood: 'warn', msg: T('Aún no cubrimos: ' + miss.slice(0, 2).join(', ') + (miss.length > 2 ? '…' : '') + '. Pero cuidado: más instrumentos = más datos que bajar.',
      'Still uncovered: ' + miss.slice(0, 2).join(', ') + (miss.length > 2 ? '…' : '') + '. But careful: more instruments = more data to downlink.') };
    return { mood: 'ok', msg: T('¡Todos los objetivos tienen instrumento! Ahora el reto es bajar ' + gb(c.link.collectGbPerTurn) + ' por turno a la Tierra.',
      'Every objective has an instrument! Now the challenge is getting ' + gb(c.link.collectGbPerTurn) + ' per turn down to Earth.') };
  }

  if (p === 4) {
    if (!S.antennaD || !S.twtaW) return { mood: 'idea', msg: T('Elige antena y transmisor. Recuerda: solo cuentan los datos que llegan a la Tierra.',
      'Pick an antenna and transmitter. Remember: only the data that reaches Earth counts.') };
    if (c.link.ratio < 0.25) return { mood: 'bad', msg: T('Generamos ' + gb(c.link.collectGbPerTurn) + ' por turno y solo bajamos ' + gb(c.link.gbPerTurn) + '. La memoria se llenará. Antena más grande, banda Ka o estación de 70 m.',
      'We make ' + gb(c.link.collectGbPerTurn) + ' per turn and only downlink ' + gb(c.link.gbPerTurn) + '. Memory will fill up. Bigger dish, Ka band or a 70 m station.') };
    if (c.link.ratio < 0.6) return { mood: 'warn', msg: T('El enlace baja el ' + n0(c.link.ratio * 100) + '% de lo que generamos. En operaciones tendrás que elegir qué apagar.',
      'The link carries ' + n0(c.link.ratio * 100) + '% of what we generate. In operations you will have to choose what to switch off.') };
    if (c.dest.radKrad > 300 && S.shieldingId !== 'vault') return { mood: 'warn', msg: T('Este destino recibe ' + c.dest.radKrad + ' krad. Sin bóveda de electrónica perderemos instrumentos.',
      'This destination takes ' + c.dest.radKrad + ' krad. Without an electronics vault we will lose instruments.') };
    return { mood: 'ok', msg: T('Enlace sólido: ' + bps(c.link.bps) + '. Cada gigabit tiene camino a casa.',
      'Solid link: ' + bps(c.link.bps) + '. Every gigabit has a way home.') };
  }

  if (p === 5) {
    if (!S.launcherId) return { mood: 'idea', msg: T('Elige el cohete. Necesita llevar ' + n0(c.mass.launch) + ' kg a la energía de tu destino.',
      'Pick the rocket. It has to carry ' + n0(c.mass.launch) + ' kg to your destination\'s energy.') };
    if (c.mass.launch > c.lvCap) return { mood: 'bad', msg: T('¡El cohete no puede con nosotros! Nos pasamos por ' + n0(c.mass.launch - c.lvCap) + ' kg.',
      'The rocket cannot lift us! We are ' + n0(c.mass.launch - c.lvCap) + ' kg too heavy.') };
    if (c.devMonths < c.devNeed) return { mood: 'warn', msg: T('Recortaste ' + (c.devNeed - c.devMonths) + ' meses de pruebas. Ahorra dinero, pero un defecto podría escaparse a la puesta en servicio.',
      'You cut ' + (c.devNeed - c.devMonths) + ' months of testing. It saves money, but a defect could slip into commissioning.') };
    if (c.cost.margin < 0) return { mood: 'bad', msg: T('Estamos ' + money(-c.cost.margin) + ' sobre el presupuesto. El comité no aprobará el lanzamiento.',
      'We are ' + money(-c.cost.margin) + ' over budget. The board will not approve the launch.') };
    return { mood: 'ok', msg: T('Probabilidad total de operar: ' + n0(ENG.successOdds(c).total * 100) + '%. Antes de lanzar, mira tu trayectoria en el Explorador 3D.',
      'Overall chance of operating: ' + n0(ENG.successOdds(c).total * 100) + '%. Before launch, check your trajectory in the 3D Explorer.') };
  }

  if (p === 6) {
    var stored = storedTotal(), hk = 100 - S.alloc.sci - S.alloc.dl;
    if (stored > c.link.gbPerTurn * 3 && S.alloc.dl < 40) return { mood: 'warn', msg: T('Houston, la memoria tiene ' + gb(stored) + ' esperando. Sube la asignación de transmisión o esos datos valdrán cero.',
      'Houston, memory holds ' + gb(stored) + ' waiting. Raise the downlink share or that data is worth zero.') };
    if (hk < 10) return { mood: 'warn', msg: T('Dejamos solo ' + hk + '% para mantenimiento. Una nave sin cuidados acumula anomalías.',
      'Only ' + hk + '% left for maintenance. A spacecraft without care piles up anomalies.') };
    var dead = Object.keys(S.dead).length;
    if (dead) return { mood: 'bad', msg: T('Perdimos ' + dead + ' instrumento(s). Concentra la energía en los que siguen vivos.',
      'We lost ' + dead + ' instrument(s). Focus power on the ones still alive.') };
    return { mood: 'ok', msg: T('Aquí CAPCOM: telemetría nominal. Turno ' + S.turn + ' de ' + c.opsTurns + '. ¡Sigue así!',
      'CAPCOM here: telemetry nominal. Turn ' + S.turn + ' of ' + c.opsTurns + '. Keep it up!') };
  }
  return null;
}

function coachPanel(c) {
  var seat = TEAM[PHASE_SEAT[S.phase]];
  var tip = coachTip(c);
  if (!seat || !tip) return '';
  var es = LANG === 'es';
  var mood = { ok: es ? 'Todo en orden' : 'All good', warn: es ? 'Atención' : 'Heads up', bad: es ? 'Problema' : 'Problem', idea: es ? 'Sugerencia' : 'Tip' }[tip.mood];
  return '<div class="coach coach-' + tip.mood + '" aria-live="polite">' +
    useSvg(seat.av, 'coach-av') +
    '<div class="coach-body"><div class="coach-who"><b>' + esc(seat.name) + '</b><span>' + esc(L(seat.role)) + '</span>' +
    '<em class="coach-mood">' + esc(mood) + '</em></div>' +
    '<p>' + esc(tip.msg) + '</p></div></div>';
}

/* the seat strip on the splash: who you will sit with during the mission */
function teamStrip() {
  var es = LANG === 'es', h = '';
  var order = [['pi', 1], ['sys', 2], ['com', 4], ['lv', 5], ['capcom', 6], ['fd', 7]];
  for (var i = 0; i < order.length; i++) {
    var m = TEAM[order[i][0]];
    h += '<div class="seat">' + useSvg(m.av, 'seat-av') + '<b>' + esc(L(m.role)) + '</b><span>' + esc(m.name) + '</span>' +
      '<small>' + esc(t(STEPS[order[i][1] - 1])) + '</small></div>';
  }
  return '<div class="team"><h2>' + esc(es ? 'Tu equipo de misión' : 'Your mission team') + '</h2>' +
    '<p>' + esc(es ? 'Como en la sala de ingeniería concurrente Team X del JPL, cada fase te sienta en una consola distinta: científica, sistemas, telecomunicaciones, lanzamiento, y al final un astronauta CAPCOM te habla durante las operaciones.'
      : 'Like JPL\'s Team X concurrent engineering room, every phase seats you at a different console: science, systems, telecom, launch, and finally an astronaut CAPCOM talks you through operations.') + '</p>' +
    '<div class="seats">' + h + '</div></div>';
}
