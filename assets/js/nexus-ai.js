/* ORBITAL NEXUS — NEXUS, a small expert system that learns.
   It answers with rules over the live mission (thrusters, power, link,
   time, budget, what is missing), with the game's catalogue (destinations,
   glossary) and with what scientists have taught it. When it does not know,
   it asks to be taught; the answer is kept and used next time, and any
   answer can be corrected. Questions can be typed or spoken, answers are
   spoken in the chosen language, and the learned knowledge exports to JSON
   (for a notebook) and imports back. Everything stays in this browser. */

var NX = { open: false, rec: null, listening: false, teach: null };

function nxNorm(s) {
  return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/δ/g, 'delta ').replace(/[^a-z0-9ñ\s-]/g, ' ').replace(/\s+/g, ' ').trim();
}
var NX_STOP = ' el la los las un una unos unas de del al a en y o que es son se lo le por para con como cual cuales cuanto cuanta mi mis tu tus su sus me nos esta este estan esto hay the a an of to in and or is are what how which do does my your our it its be on for with about '.split(' ');
function nxTokens(s) { return nxNorm(s).split(' ').filter(function (w) { return w.length > 1 && NX_STOP.indexOf(' ' + w + ' ') < 0 && NX_STOP.indexOf(w) < 0; }); }

/* ---------- knowledge ---------- */
function nxLearned() { try { return JSON.parse(pref('on_nexus_kb', '[]')) || []; } catch (e) { return []; } }
function nxSaveLearned(list) { setPref('on_nexus_kb', JSON.stringify(list)); }

/* rules that read the mission as it is right now */
function nxRules() {
  var es = LANG === 'es';
  function T(a, b) { return es ? a : b; }
  return [
    { k: ['estado', 'informe', 'como va', 'todo bien', 'resumen', 'status', 'report', 'how is it going', 'everything ok', 'summary'], a: function () { return nexusReport(); } },
    { k: ['propulsor', 'propulsores', 'propelente', 'combustible', 'motor', 'delta v', 'deltav', 'thruster', 'thrusters', 'propellant', 'fuel', 'engine'], a: function (c) {
      if (!c.prop) return T('Aún no hay motor elegido. Usa el asistente de la fase 2.', 'No engine chosen yet. Use the phase 2 assistant.');
      return T('Propulsores: ' + L(c.prop.name) + ' (Isp ' + c.prop.isp + ' s), ' + n0(c.mass.propellant) + ' kg de propelente. Delta v disponible ' + n2(c.dv.available) + ' km/s para ' + n2(c.dv.required) + ' requeridos: ' + (c.dv.margin >= 0 ? 'margen de ' + n0(c.dv.margin * 1000) + ' m/s, todo bien.' : 'faltan ' + n0(-c.dv.margin * 1000) + ' m/s.'),
        'Thrusters: ' + L(c.prop.name) + ' (Isp ' + c.prop.isp + ' s), ' + n0(c.mass.propellant) + ' kg of propellant. Delta v available ' + n2(c.dv.available) + ' km/s against ' + n2(c.dv.required) + ' required: ' + (c.dv.margin >= 0 ? n0(c.dv.margin * 1000) + ' m/s margin, all good.' : 'short by ' + n0(-c.dv.margin * 1000) + ' m/s.'));
    } },
    { k: ['energia', 'potencia', 'paneles', 'bateria', 'rtg', 'electricidad', 'power', 'solar', 'battery', 'arrays', 'energy'], a: function (c) {
      if (!c.bus) return T('Aún no hay nave: elige un bus primero.', 'No spacecraft yet: pick a bus first.');
      return T('Energía: ' + n0(c.power.genBOL) + ' W al inicio y ' + n0(c.power.genEOL) + ' W al final de la misión; consumo máximo ' + n0(c.power.peak) + ' W. Margen ' + n0(c.power.marginPct * 100) + '%' + (c.power.marginPct >= 0.3 ? ', saludable.' : (c.power.marginPct >= 0 ? ', justo: las revisiones piden cerca de 30%.' : ': no alcanza.')),
        'Power: ' + n0(c.power.genBOL) + ' W at start and ' + n0(c.power.genEOL) + ' W at end of mission; peak draw ' + n0(c.power.peak) + ' W. Margin ' + n0(c.power.marginPct * 100) + '%' + (c.power.marginPct >= 0.3 ? ', healthy.' : (c.power.marginPct >= 0 ? ', tight: reviews ask for about 30%.' : ': not enough.')));
    } },
    { k: ['enlace', 'antena', 'datos', 'comunicacion', 'transmision', 'dsn', 'link', 'antenna', 'data', 'downlink', 'communication'], a: function (c) {
      if (!S.antennaD) return T('El enlace se diseña en la fase 4. Allí el asistente prueba todas las combinaciones.', 'The link is designed in phase 4. The assistant there tries every combination.');
      return T('Enlace: antena de ' + S.antennaD + ' m a ' + bps(c.link.bps) + '; baja ' + gb(c.link.gbPerTurn) + ' por turno frente a ' + gb(c.link.collectGbPerTurn) + ' que produce la ciencia (' + n0(c.link.ratio * 100) + '%).',
        'Link: ' + S.antennaD + ' m antenna at ' + bps(c.link.bps) + '; it downlinks ' + gb(c.link.gbPerTurn) + ' per turn against ' + gb(c.link.collectGbPerTurn) + ' produced by the science (' + n0(c.link.ratio * 100) + '%).');
    } },
    { k: ['tiempo', 'cuanto dura', 'duracion', 'dias', 'anos', 'crucero', 'llegar', 'time', 'how long', 'duration', 'days', 'years', 'cruise', 'arrive'], a: function (c) {
      if (!c.dest) return T('Elige un destino y te digo cuánto dura.', 'Pick a destination and I will tell you how long it takes.');
      return T('Viaje de ' + c.cruiseDays + ' días hasta ' + L(c.dest.name) + ', luego ' + c.opsTurns + ' meses de operación: ' + n1(c.years) + ' años en total.' + (S.phase === 6 ? ' Vamos en el turno ' + S.turn + ' de ' + c.opsTurns + '.' : ''),
        c.cruiseDays + ' days of travel to ' + L(c.dest.name) + ', then ' + c.opsTurns + ' months of operations: ' + n1(c.years) + ' years in all.' + (S.phase === 6 ? ' We are on turn ' + S.turn + ' of ' + c.opsTurns + '.' : ''));
    } },
    { k: ['costo', 'presupuesto', 'dinero', 'reserva', 'cost', 'budget', 'money', 'reserve'], a: function (c) {
      if (!c.prog) return T('Primero elige una clase de programa: fija el presupuesto.', 'First pick a program class: it sets the budget.');
      return T('Costo ' + money(c.cost.total) + ' de ' + money(c.cost.budget) + ' de presupuesto; reserva ' + money(c.cost.margin) + '.', 'Cost ' + money(c.cost.total) + ' of a ' + money(c.cost.budget) + ' budget; reserve ' + money(c.cost.margin) + '.');
    } },
    { k: ['falta', 'que hago', 'siguiente', 'pendiente', 'ayuda', 'missing', 'what next', 'next step', 'help', 'todo'], a: function (c) {
      if (S.phase < 1 || S.phase > 5) return T('Ahora no hay nada pendiente en el diseño.', 'Nothing is pending in the design right now.');
      var miss = statusItems(c).filter(function (x) { return !x.ok; });
      return miss.length ? T('Falta: ', 'Missing: ') + miss.map(function (x) { return x.t + ' (' + x.fix + ')'; }).join(' ') : T('No falta nada: todos los sistemas en verde.', 'Nothing is missing: all systems green.');
    } },
    { k: ['cohete', 'lanzador', 'rocket', 'launcher'], a: function (c) {
      if (!c.lv) return T('Aún no hay cohete. En la fase 5 el asistente elige el más barato que lleva tu nave con margen.', 'No rocket yet. In phase 5 the assistant picks the cheapest one that carries your spacecraft with margin.');
      return T(L(c.lv.name) + ': lleva ' + n0(c.lvCap) + ' kg a tu trayectoria y tu nave pesa ' + n0(c.mass.launch) + ' kg; fiabilidad ' + n1(c.lv.reliability * 100) + '%.', L(c.lv.name) + ': it carries ' + n0(c.lvCap) + ' kg to your trajectory and your spacecraft weighs ' + n0(c.mass.launch) + ' kg; reliability ' + n1(c.lv.reliability * 100) + '%.');
    } },
    { k: ['tripulacion', 'quien vuela', 'astronautas', 'crew', 'who flies', 'astronauts'], a: function () {
      var l = crewList();
      return l.length ? T('Tripulación: ', 'Crew: ') + l.map(function (x) { return (es ? x.role.es : x.role.en) + ' ' + x.name; }).join(', ') + '.' : T('Aún no registraste la tripulación. Pulsa el botón de astronauta para agregar nombres.', 'You have not logged the crew yet. Press the astronaut button to add names.');
    } }
  ];
}

/* how every game and tool works, so NEXUS can teach the player to use them */
function nxGuide() {
  var es = LANG === 'es';
  function T(a, b) { return es ? a : b; }
  return [
    { w: 0.8, k: ['juegos', 'minijuegos', 'que juegos', 'cuantos juegos', 'how many games', 'que puedo jugar', 'modos', 'como se juega', 'games', 'mini games', 'what games', 'what can i play', 'modes', 'how to play'],
      a: function () { return T('Hay seis formas de jugar: diseñar una misión completa en 6 fases, el simulador de despegue, el explorador 3D con modo RV, el dron en Titán, el escáner orbital con 5 niveles y el modo futuro del portal cuántico, que es ficción. Además está el laboratorio de ingeniería para hacer cálculos. Pregúntame cómo se juega cualquiera y te lo abro.',
        'There are six ways to play: design a full mission in 6 phases, the launch simulator, the 3D explorer with VR mode, the drone on Titan, the orbital scanner with 5 levels and the quantum portal future mode, which is fiction. There is also the engineering lab for calculations. Ask me how to play any of them and I will open it.'); } },
    { w: 1.4, k: ['proyecto', 'como funciona el proyecto', 'que hace', 'que no hace', 'de que trata', 'para que sirve', 'orbital nexus', 'the project', 'how does the project work', 'what does it do', 'what doesn t it do', 'what is this', 'what is it for'],
      a: function () { return T('ORBITAL NEXUS es un simulador web para explorar una idea de misión espacial en minutos. Qué hace: diseñas la misión en 6 fases con física real, ves el efecto de cada decisión antes de tomarla, armas el centro de control, votas GO o NO-GO, despegas, navegas y operas la misión mientras ocurren fallas, y al final recibes un informe con la misión real de la NASA más parecida. Además tiene seis formas de jugar, un laboratorio de cálculos y a mí, NEXUS. Si te pierdes, pregúntame «¿dónde estoy?». Qué no hace: no es software oficial de la NASA, no se conecta a datos en vivo, los mapas del escáner son simulados, los costos son aproximados y el portal cuántico es ficción. Funciona en el navegador, sin instalar, en español e inglés.',
        'ORBITAL NEXUS is a web simulator to explore a space mission idea in minutes. What it does: you design the mission in 6 phases with real physics, see the effect of each decision before making it, staff mission control, poll GO or NO-GO, launch, navigate and operate the mission while failures happen, and finish with a report naming the closest real NASA mission. It also has six ways to play, a calculation lab and me, NEXUS. If you get lost, ask me “where am I?”. What it does not do: it is not official NASA software, it does not connect to live data, the scanner maps are simulated, costs are approximate and the quantum portal is fiction. It runs in the browser, nothing to install, in English and Spanish.'); } },
    { w: 1.6, k: ['me perdi', 'estoy perdido', 'perdida', 'donde estoy', 'que hago ahora', 'que hago', 'no entiendo', 'como sigo', 'como vuelvo', 'i m lost', 'im lost', 'lost', 'where am i', 'what do i do now', 'what now', 'i don t understand', 'how do i continue', 'how do i go back'],
      a: function (c) { return nxWhere(c); } },
    { w: 1.2, k: ['disenar', 'diseno', 'disenar una mision', 'fases', 'empezar', 'iniciar', 'mision completa', 'design', 'design a mission', 'phases', 'start', 'begin'], act: 'quickdemo',
      a: function () { return T('Pulsa «Iniciar diseño de misión». Pasas 6 fases: misión, plataforma, ciencia, enlace, lanzamiento y operaciones. En cada fase el asistente te propone un paquete, cada opción muestra su efecto antes de elegirla y el anillo de estado dice qué falta; «Arréglalo por mí» lo resuelve. Luego votas GO o NO-GO, despegas y operas turno a turno. Si quieres, te abro una misión lista para lanzar.',
        'Press “Start mission design”. You go through 6 phases: mission, platform, science, link, launch and operations. In each phase the assistant proposes a package, every option shows its effect before you pick it and the status ring says what is missing; “Fix it for me” solves it. Then you poll GO or NO-GO, launch and operate turn by turn. If you like, I will open a mission ready to launch.'); } },
    { w: 1.5, k: ['dron', 'drone', 'titan', 'dragonfly', 'volar'], act: 'drone',
      a: function () { return T('Dron en Titán: mantén ▲ o Espacio para subir y ◀ ▶ para avanzar. Aterriza suave, a menos de 2,2 metros por segundo, sobre las 3 banderas para tomar muestras, y evita el lago de metano. La batería solo se recarga en tierra, con el RTG.',
        'Drone on Titan: hold ▲ or Space to climb and ◀ ▶ to move. Land gently, under 2.2 metres per second, on the 3 flags to take samples, and avoid the methane lake. The battery only recharges on the ground, from the RTG.'); } },
    { w: 1.5, k: ['escaner', 'escanear', 'niveles', 'buscar vida', 'satelite', 'infrarrojo', 'geolocalizar', 'scanner', 'levels', 'search for life', 'satellite', 'infrared', 'geolocate'], act: 'scan',
      a: function () { return T('Escáner orbital: mueve la lupa sobre el mapa y cambia de instrumento con las teclas 1 a 4: visible, térmico, infrarrojo cercano y gases. Cuando la señal llega al 100% se fija el objetivo y te da su latitud y longitud; confírmalo con el segundo instrumento. Cada nivel da pistas, mide el tiempo y da hasta 3 estrellas; confirmar una falsa alarma resta una.',
        'Orbital scanner: move the lens over the map and switch instrument with keys 1 to 4: visible, thermal, near infrared and gas. When the signal reaches 100% it locks on and gives you latitude and longitude; confirm it with the second instrument. Each level gives clues, times you and awards up to 3 stars; confirming a false alarm costs one.'); } },
    { w: 1.5, k: ['portal', 'cuantico', 'modo futuro', 'agujero de gusano', 'teletransporte', 'quantum', 'future mode', 'wormhole', 'teleport'], act: 'portal',
      a: function () { return T('Modo futuro, que es ficción científica: mantén pulsado INYECTAR o la barra espaciadora para que la estabilidad del portal quede en la franja verde mientras cruzan los astronautas. Con poca energía colapsa y con mucha se sobrecarga. Al terminar te explico la física real.',
        'Future mode, which is science fiction: hold INJECT or the space bar to keep the portal’s stability in the green band while the astronauts cross. Too little energy collapses it and too much overloads it. At the end I explain the real physics.'); } },
    { w: 1.5, k: ['laboratorio', 'calculos', 'calculadora', 'ecuacion', 'hohmann', 'pareto', 'compensaciones', 'lab', 'calculations', 'calculator', 'equation', 'trade space'], act: 'lab',
      a: function () { return T('Laboratorio de ingeniería: seis herramientas con las ecuaciones a la vista: ecuación del cohete, transferencias y ventanas, órbita, enlace en decibelios, energía y el mapa de compensaciones con todas las naves posibles. Cambia cualquier número; «Cargar mi misión» trae tu diseño y puedes exportar a CSV.',
        'Engineering lab: six tools with the equations in view: rocket equation, transfers and windows, orbit, decibel link budget, power and the trade-space map with every possible spacecraft. Change any number; “Load my mission” brings in your design and you can export to CSV.'); } },
    { w: 1.5, k: ['simulador de despegue', 'simulador', 'despegue', 'despegar', 'ascenso', 'pilotar', 'pilotear', 'piloto el', 'launch simulator', 'ascent', 'fly the rocket', 'fly the launch', 'liftoff', 'take off'], act: 'practice',
      a: function () { return T('Simulador de despegue: ◀ ▶ cambian el cabeceo, ▲ ▼ el empuje y Espacio separa la etapa o suelta la cofia. Inclina poco a poco, baja el empuje en Max-Q, separa la etapa cuando se agote y suelta la cofia sobre 100 kilómetros. Llegas a órbita cuando el perigeo supera 160 kilómetros. También hay piloto automático.',
        'Launch simulator: ◀ ▶ change pitch, ▲ ▼ throttle and Space stages or drops the fairing. Pitch over gently, throttle down through Max-Q, stage when it runs dry and drop the fairing above 100 kilometres. You reach orbit when perigee clears 160 kilometres. There is an autopilot too.'); } },
    { w: 1.5, k: ['3d', 'explorador', 'realidad virtual', 'rv', 'vr', 'trayectoria', 'explorer', 'virtual reality', 'trajectory'], act: 'demo',
      a: function () { return T('Explorador 3D: muestra la trayectoria real, la línea de tiempo con las 9 fases de CubeSat 101 y un modo RV para visor tipo Cardboard. Arrastra para girar y usa la rueda o los dedos para acercar.',
        '3D explorer: it shows the real trajectory, the timeline with CubeSat 101’s 9 phases and a VR mode for Cardboard-style viewers. Drag to rotate and use the wheel or your fingers to zoom.'); } },
    { k: ['compartir', 'retar', 'compartir diseno', 'share', 'challenge', 'share my design'],
      a: function () { return T('En la fase de lanzamiento o en el informe pulsa «Compartir mi diseño»: copia un enlace con tu nave completa para que otra persona la abra, la mejore y la lance.',
        'In the launch phase or the report press “Share my design”: it copies a link with your whole spacecraft so someone else can open it, improve it and launch it.'); } },
    { k: ['que puedes hacer', 'quien eres', 'que eres', 'como te uso', 'como funcionas', 'que no puedes', 'limites', 'what can you do', 'who are you', 'how do i use you', 'how do you work', 'what can t you do', 'limits'],
      a: function () { return T('Soy NEXUS. Puedo decirte el estado de tu misión y qué falta, explicarte términos y cómo se juega cada modo, y abrirlo por ti. Háblame con el micrófono o escribe. Si no sé algo te lo digo y puedes enseñarme. No puedo inventar datos que no conozco ni conectarme a internet o a la NASA, y lo que aprendo se queda en este navegador: puedes exportarlo.',
        'I am NEXUS. I can tell you your mission status and what is missing, explain terms and how each mode is played, and open it for you. Talk to me with the microphone or type. If I do not know something I tell you and you can teach me. I cannot make up data I do not know or connect to the internet or NASA, and what I learn stays in this browser: you can export it.'); } },
    { k: ['ensenar', 'aprender', 'como te enseno', 'como aprendes', 'teach', 'learn', 'how do you learn'],
      a: function () { return T('Pregúntame algo que no sepa y te mostraré un cuadro para escribir la respuesta. También puedes pulsar «Corregir o mejorar esta respuesta» debajo de cualquier respuesta. Lo aprendido lleva el nombre de quien lo enseñó y se exporta o importa en JSON.',
        'Ask me something I do not know and I will show you a box to type the answer. You can also press “Correct or improve this answer” under any answer. What I learn carries the name of whoever taught it and exports or imports as JSON.'); } },
    { k: ['voz', 'voces', 'subtitulos', 'silenciar', 'molesta', 'tapa', 'estorba', 'pantalla', 'voice', 'voices', 'captions', 'mute', 'in the way', 'covers', 'cover', 'screen', 'block'], w: 1.2,
      a: function () { return T('Para que no estorbe: en el botón del astronauta puedes apagar las voces y elegir subtítulos normales, compactos u ocultos, y ponerlos abajo o arriba. Este chat se minimiza con el botón menos y se cambia de lado con las flechas.',
        'So I do not get in the way: in the astronaut button you can turn voices off and choose normal, compact or hidden captions, at the bottom or the top. This chat minimises with the minus button and switches side with the arrows.'); } }
  ];
}

/* catalogue knowledge: destinations and glossary */
function nxCatalog() {
  var out = [];
  DATA.destinations.forEach(function (d) {
    out.push({ k: [nxNorm(d.name.es), nxNorm(d.name.en), d.id.replace(/-/g, ' ')].concat(nxNorm(d.name.es).split(' ').filter(function (w) { return w.length > 4; })), a: function () { return L(d.name) + ': ' + L(d.blurb) + ' ' + (LANG === 'es' ? 'Misión real parecida: ' : 'Similar real mission: ') + d.analog.name + '.'; }, w: 0.8 });
  });
  GLOSS.forEach(function (g) {
    out.push({ k: g.m.map(nxNorm).concat([nxNorm(g.es[0]), nxNorm(g.en[0])]), a: function () { return (LANG === 'es' ? g.es : g.en).join(': '); }, w: 1.1 });
  });
  return out;
}

/* the inference step: best rule or fact for a question */
function nxAnswer(q) {
  var nq = ' ' + nxNorm(q) + ' ', toks = nxTokens(q), best = null, bestS = 0, c = comp();
  /* what scientists taught wins when it matches well */
  nxLearned().forEach(function (f, i) {
    var ft = nxTokens(f.q), inter = ft.filter(function (w) { return toks.indexOf(w) >= 0; }).length;
    var jac = inter / Math.max(1, new Set(ft.concat(toks)).size);
    var sc = jac * 4 + (nxNorm(f.q) === nxNorm(q) ? 4 : 0);
    if (jac >= 0.5 && sc > bestS) { bestS = sc; best = { text: f.a, src: 'learned', by: f.by, idx: i }; }
  });
  if (bestS >= 4) return best;
  var bestHit = [];
  nxRules().concat(nxGuide(), nxCatalog()).forEach(function (r) {
    var sc = 0, hit = [];
    r.k.forEach(function (k) {
      k = nxNorm(k); if (!k) return;
      if (nq.indexOf(' ' + k + ' ') >= 0) { sc += 1 + k.split(' ').length * 0.5; hit = hit.concat(k.split(' ')); }
      else if (k.length > 5 && nq.indexOf(k) >= 0) { sc += 0.8; hit = hit.concat(k.split(' ')); }
    });
    sc *= r.w || 1;
    if (sc > bestS) { bestS = sc; best = { text: r.a(c), src: 'rule', act: r.act }; bestHit = hit; }
  });
  if (bestS < 1) return best && best.src === 'learned' ? best : null;
  /* honesty check: if the question asks about things this answer does not cover,
     say so and ask to be taught instead of answering beside the point */
  if (best.src !== 'learned') {
    var loose = toks.filter(function (w) { return bestHit.indexOf(w) < 0 && NX_GENERIC.indexOf(w) < 0 && !bestHit.some(function (h) { return h.indexOf(w) === 0 || w.indexOf(h) === 0; }); });
    if (loose.length >= 2) best.partial = true;
  }
  return best;
}
var NX_GENERIC = 'mision mission nave spacecraft dime cuentame hablame informacion info sobre explica explicame tell about explain please favor sabes know quiero saber want todo esta estan como cual cuanto cuanta juego juegos jugar juega play game games usar uso use usa funciona works work abrir open modo mode'.split(' ');

/* ---------- chat ---------- */
function nxOpen() {
  var root = document.getElementById('nexus');
  if (!root) {
    root = document.createElement('aside'); root.id = 'nexus'; root.className = 'nx'; root.setAttribute('aria-label', 'NEXUS');
    document.body.appendChild(root);
    root.addEventListener('click', nxClick);
    root.addEventListener('submit', function (e) { e.preventDefault(); nxAsk(); });
    root.addEventListener('change', function (e) { if (e.target.id === 'nx-file') nxImport(e.target.files[0]); });
  }
  root.hidden = false; NX.open = true;
  root.classList.remove('mini');
  root.classList.toggle('left', pref('on_nx_side', 'right') === 'left');
  nxPaint();
  if (!root.querySelector('.nx-msg')) nxBot(LANG === 'es' ? 'Hola' + (crewName('cmd') ? ', comandante ' + crewName('cmd') : '') + '. Soy NEXUS. Pregúntame por los propulsores, la energía, el tiempo de la misión o lo que falta. Si no sé algo, enséñamelo y lo recordaré.'
    : 'Hello' + (crewName('cmd') ? ', Commander ' + crewName('cmd') : '') + '. I am NEXUS. Ask me about the thrusters, power, mission time or what is missing. If I do not know something, teach me and I will remember it.', 'rule');
  setTimeout(function () { var i = document.getElementById('nx-q'); if (i) i.focus(); }, 50);
}
function nxClose() { var r = document.getElementById('nexus'); if (r) r.hidden = true; NX.open = false; nxStopListen(); }

function nxPaint() {
  var root = document.getElementById('nexus'), es = LANG === 'es', keep = root.querySelector('.nx-log');
  var chips = es ? ['¿Cómo funciona el proyecto?', 'Me perdí, ¿dónde estoy?', '¿Qué juegos hay?', '¿Cómo se juega el escáner?', '¿Cómo están los propulsores?', '¿Qué falta?', '¿Qué puedes hacer?']
    : ['How does the project work?', 'I’m lost, where am I?', 'What games are there?', 'How do I play the scanner?', 'How are the thrusters?', 'What is missing?', 'What can you do?'];
  var n = nxLearned().length, hasMic = !!(window.SpeechRecognition || window.webkitSpeechRecognition);
  root.innerHTML = '<header class="nx-head"><span class="vcap-orb"><i></i><i></i><i></i></span><div><b>NEXUS</b><span>' + esc(es ? 'IA de a bordo · sistema experto que aprende' : 'Onboard AI · an expert system that learns') + '</span></div>' +
    '<button class="icon-btn nx-hb" data-nx="side" title="' + esc(es ? 'Cambiar de lado' : 'Switch side') + '" aria-label="' + esc(es ? 'Cambiar de lado' : 'Switch side') + '">⇄</button>' +
    '<button class="icon-btn nx-hb" data-nx="mini" title="' + esc(es ? 'Minimizar' : 'Minimise') + '" aria-label="' + esc(es ? 'Minimizar' : 'Minimise') + '">–</button>' +
    '<button class="icon-btn nx-x" data-nx="close" aria-label="' + esc(es ? 'Cerrar' : 'Close') + '">' + icon('close', 'ico') + '</button></header>' +
    '<button class="nx-pill" data-nx="expand">🛰️ NEXUS</button>' +
    '<div class="nx-log" id="nx-log" aria-live="polite"></div>' +
    '<div class="nx-chips">' + chips.map(function (c) { return '<button class="nx-chip" data-nx="chip">' + esc(c) + '</button>'; }).join('') + '</div>' +
    '<div class="nx-teach" id="nx-teach" hidden></div>' +
    '<form class="nx-form"><input id="nx-q" type="text" autocomplete="off" placeholder="' + esc(es ? 'Escribe tu pregunta…' : 'Type your question…') + '">' +
    (hasMic ? '<button type="button" class="nx-mic' + (NX.listening ? ' on' : '') + '" data-nx="mic" aria-label="' + esc(es ? 'Preguntar con la voz' : 'Ask by voice') + '">🎤</button>' : '') +
    '<button type="submit" class="nx-send" aria-label="' + esc(es ? 'Enviar' : 'Send') + '">➤</button></form>' +
    '<footer class="nx-foot"><span>🧠 ' + esc(es ? 'Conocimiento aprendido: ' : 'Learned knowledge: ') + '<b>' + n + '</b></span>' +
    '<button data-nx="list">' + esc(es ? 'Ver' : 'View') + '</button><button data-nx="export">' + esc(es ? 'Exportar' : 'Export') + '</button>' +
    '<label class="nx-imp">' + esc(es ? 'Importar' : 'Import') + '<input type="file" id="nx-file" accept="application/json,.json" hidden></label></footer>';
  if (keep) root.querySelector('.nx-log').replaceWith(keep);
}

function nxMsg(who, text, extra) {
  var log = document.getElementById('nx-log'); if (!log) return;
  var d = document.createElement('div'); d.className = 'nx-msg nx-' + who; d.innerHTML = '<p>' + esc(text) + '</p>' + (extra || '');
  log.appendChild(d); log.scrollTop = log.scrollHeight;
}
function nxBot(text, src, by, q, act) {
  var es = LANG === 'es', go = act ? '<button class="nx-go" data-nx="go" data-v="' + act + '">▶ ' + esc(es ? 'Abrir ahora' : 'Open now') + '</button>' : '', tag = src === 'learned' ? '<span class="nx-src">🧠 ' + esc(es ? 'Aprendido' : 'Learned') + (by ? ' · ' + esc(by) : '') + '</span>' : '';
  var fix = q ? '<button class="nx-fix" data-nx="fix" data-q="' + esc(q) + '">' + esc(es ? 'Corregir o mejorar esta respuesta' : 'Correct or improve this answer') + '</button>' : '';
  nxMsg('bot', text, go + tag + fix);
  if (typeof voiceSay === 'function') voiceSay('nexus', text);
}

function nxAsk(text) {
  var input = document.getElementById('nx-q'), q = (text || (input && input.value) || '').trim();
  if (!q) return;
  if (input) input.value = '';
  nxMsg('me', q);
  var r = nxAnswer(q);
  if (r && r.partial) {
    nxBot((LANG === 'es' ? 'No lo sé con certeza. Lo más cercano que sé: ' : 'I am not sure. The closest thing I know: ') + r.text + (LANG === 'es' ? ' ¿Me enseñas la respuesta exacta?' : ' Will you teach me the exact answer?'), 'rule');
    nxTeachBox(q);
    return;
  }
  if (r) { nxBot(r.text, r.src, r.by, q, r.act); return; }
  nxBot(LANG === 'es' ? 'Todavía no lo sé. ¿Me lo enseñas? Escribe la respuesta y la recordaré para la próxima vez.' : 'I do not know that yet. Will you teach me? Type the answer and I will remember it next time.', 'rule');
  nxTeachBox(q);
}

function nxTeachBox(q, current) {
  var box = document.getElementById('nx-teach'), es = LANG === 'es';
  NX.teach = q;
  box.innerHTML = '<b>' + esc(es ? 'Enseñar a NEXUS' : 'Teach NEXUS') + '</b><span>' + esc(es ? 'Pregunta: ' : 'Question: ') + esc(q) + '</span>' +
    '<textarea id="nx-a" rows="3" placeholder="' + esc(es ? 'La respuesta correcta, como la diría un científico…' : 'The right answer, as a scientist would say it…') + '">' + esc(current || '') + '</textarea>' +
    '<div class="nx-tbtn"><button class="btn sm ghost" data-nx="cancel">' + esc(es ? 'Cancelar' : 'Cancel') + '</button><button class="btn sm primary" data-nx="learn">🧠 ' + esc(es ? 'Aprender' : 'Learn') + '</button></div>';
  box.hidden = false;
  setTimeout(function () { var a = document.getElementById('nx-a'); if (a) a.focus(); }, 30);
}

function nxLearn() {
  var a = (document.getElementById('nx-a').value || '').trim(), q = NX.teach;
  if (!a || !q) return;
  var list = nxLearned(), nq = nxNorm(q), by = crewName('sci') || crewName('cmd') || '';
  list = list.filter(function (f) { return nxNorm(f.q) !== nq; });
  list.push({ q: q, a: a.replace(/[<>]/g, ''), by: by, lang: LANG, t: new Date().toISOString().slice(0, 10) });
  nxSaveLearned(list);
  document.getElementById('nx-teach').hidden = true; NX.teach = null;
  nxPaint();
  nxBot(LANG === 'es' ? 'Aprendido' + (by ? ', gracias ' + by : ', gracias') + '. Ya sé responder: «' + q + '».' : 'Learned' + (by ? ', thank you ' + by : ', thank you') + '. I can now answer: “' + q + '”.', 'rule');
  if (typeof award === 'function') award('teacher');
}

function nxList() {
  var list = nxLearned(), es = LANG === 'es';
  if (!list.length) { nxBot(es ? 'Aún no me han enseñado nada. Hazme una pregunta que no sepa y enséñame la respuesta.' : 'Nobody has taught me anything yet. Ask me something I do not know and teach me the answer.', 'rule'); return; }
  var h = '<ul class="nx-kb">' + list.map(function (f, i) { return '<li><b>' + esc(f.q) + '</b><span>' + esc(f.a) + '</span><small>' + esc((f.by || '—') + ' · ' + (f.t || '')) + '</small><button data-nx="del" data-v="' + i + '">' + esc(es ? 'Olvidar' : 'Forget') + '</button></li>'; }).join('') + '</ul>';
  nxMsg('bot', es ? 'Esto es lo que me han enseñado:' : 'This is what I have been taught:', h);
}

function nxExport() {
  var data = { app: 'ORBITAL NEXUS', kind: 'nexus-knowledge', version: 1, exported: new Date().toISOString(), facts: nxLearned() };
  var a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })); a.download = 'nexus-conocimiento.json';
  document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
}
function nxImport(file) {
  if (!file) return;
  var rd = new FileReader();
  rd.onload = function () {
    try {
      var d = JSON.parse(rd.result), facts = Array.isArray(d) ? d : d.facts, list = nxLearned(), added = 0;
      (facts || []).forEach(function (f) {
        var q = String(f.q || f.pregunta || f.question || '').slice(0, 300), a = String(f.a || f.respuesta || f.answer || '').replace(/[<>]/g, '').slice(0, 2000);
        if (!q || !a) return;
        list = list.filter(function (x) { return nxNorm(x.q) !== nxNorm(q); });
        list.push({ q: q, a: a, by: String(f.by || f.autor || '').slice(0, 40), lang: f.lang || LANG, t: f.t || new Date().toISOString().slice(0, 10) }); added++;
      });
      nxSaveLearned(list); nxPaint();
      nxBot((LANG === 'es' ? 'Importé ' : 'Imported ') + added + (LANG === 'es' ? ' conocimientos.' : ' facts.'), 'rule');
    } catch (e) { nxBot(LANG === 'es' ? 'Ese archivo no es un conocimiento de NEXUS válido.' : 'That file is not valid NEXUS knowledge.', 'rule'); }
  };
  rd.readAsText(file);
}

/* ---------- speech recognition: ask by voice in the chosen language ---------- */
function nxListen() {
  var R = window.SpeechRecognition || window.webkitSpeechRecognition; if (!R) return;
  if (NX.listening) { nxStopListen(); return; }
  try {
    NX.rec = new R(); NX.rec.lang = LANG === 'es' ? 'es-ES' : 'en-US'; NX.rec.interimResults = false; NX.rec.maxAlternatives = 1;
    NX.rec.onresult = function (e) { var t = e.results[0][0].transcript; nxStopListen(); nxAsk(t); };
    NX.rec.onerror = NX.rec.onend = function () { nxStopListen(); };
    if (typeof voiceStop === 'function') voiceStop();
    NX.rec.start(); NX.listening = true;
    var m = document.querySelector('.nx-mic'); if (m) m.classList.add('on');
  } catch (e) { nxStopListen(); }
}
function nxStopListen() {
  if (NX.rec) { try { NX.rec.stop(); } catch (e) { } }
  NX.rec = null; NX.listening = false;
  var m = document.querySelector('.nx-mic'); if (m) m.classList.remove('on');
}

function nxClick(e) {
  var b = e.target.closest ? e.target.closest('[data-nx]') : null; if (!b) return;
  var a = b.getAttribute('data-nx');
  if (a === 'close') nxClose();
  else if (a === 'chip') nxAsk(b.textContent);
  else if (a === 'mic') nxListen();
  else if (a === 'learn') nxLearn();
  else if (a === 'cancel') { document.getElementById('nx-teach').hidden = true; NX.teach = null; }
  else if (a === 'fix') { var q = b.getAttribute('data-q'); var cur = nxAnswer(q); nxTeachBox(q, cur && cur.src === 'learned' ? cur.text : ''); }
  else if (a === 'list') nxList();
  else if (a === 'go') nxGo(b.getAttribute('data-v'));
  else if (a === 'mini') nxMini();
  else if (a === 'side') { var r2 = document.getElementById('nexus'); r2.classList.toggle('left'); setPref('on_nx_side', r2.classList.contains('left') ? 'left' : 'right'); }
  else if (a === 'expand') nxMini(false);
  else if (a === 'export') nxExport();
  else if (a === 'del') { var l = nxLearned(); l.splice(parseInt(b.getAttribute('data-v'), 10), 1); nxSaveLearned(l); nxPaint(); nxList(); }
}

function nxGo(act) {
  nxMini(true);
  var b = document.createElement('button');
  b.setAttribute('data-act', act);
  if (act === 'demo') b.setAttribute('data-v', S.destId || 'mars-orbit');
  b.style.display = 'none'; document.body.appendChild(b); b.click(); b.remove();
}
/* minimise to a small pill so the scientist can see the screen */
function nxMini(on) {
  var r = document.getElementById('nexus'); if (!r) return;
  if (on == null) on = !r.classList.contains('mini');
  r.classList.toggle('mini', !!on);
}

/* where the player is and what to do next, so nobody gets lost */
function nxWhere(c) {
  var es = LANG === 'es';
  function T(a, b) { return es ? a : b; }
  function open(id) { var e = document.getElementById(id); return e && !e.hidden; }
  var back = T(' Para volver, toca una fase anterior en la barra de arriba, usa «Atrás» o el logo para ir al inicio.', ' To go back, tap an earlier phase in the top bar, use “Back”, or the logo to go home.');
  if (open('scanner')) return T('Estás en el escáner orbital. Mueve la lupa sobre el mapa, cambia de instrumento con las teclas 1 a 4 y espera a que la señal llegue al 100%. Ciérralo con la X de arriba a la derecha.', 'You are in the orbital scanner. Move the lens over the map, switch instrument with keys 1 to 4 and wait for the signal to reach 100%. Close it with the X at the top right.');
  if (open('portal')) return T('Estás en el modo futuro. Mantén pulsado INYECTAR para dejar la estabilidad en la franja verde. Ciérralo con la X de arriba.', 'You are in future mode. Hold INJECT to keep stability in the green band. Close it with the X at the top.');
  if (open('drone')) return T('Estás en el dron de Titán. Mantén ▲ para subir, ◀ ▶ para moverte y aterriza suave en las banderas. Sal con la X.', 'You are flying the Titan drone. Hold ▲ to climb, ◀ ▶ to move and land gently on the flags. Leave with the X.');
  if (open('lab')) return T('Estás en el laboratorio de ingeniería. Elige una pestaña arriba y cambia cualquier número. Ciérralo con la X.', 'You are in the engineering lab. Pick a tab at the top and change any number. Close it with the X.');
  if (typeof EXP !== 'undefined' && EXP.open) return T('Estás en el explorador 3D. Pulsa reproducir o arrastra la línea de tiempo. Ciérralo con la X.', 'You are in the 3D explorer. Press play or drag the timeline. Close it with the X.');
  if (S.phase === 0) return T('Estás en la portada. Para empezar pulsa «Iniciar diseño de misión», o usa «Explora en 3 minutos» para abrir una misión lista o cualquier juego.', 'You are on the home screen. To start press “Start mission design”, or use “Explore in 3 minutes” to open a ready mission or any game.');
  var names = es ? ['', 'misión', 'plataforma', 'ciencia', 'enlace', 'lanzamiento', 'operaciones', 'informe'] : ['', 'mission', 'platform', 'science', 'link', 'launch', 'operations', 'report'];
  var msg = T('Estás en la fase ' + S.phase + ' de 6, ' + names[S.phase] + '. ', 'You are in phase ' + S.phase + ' of 6, ' + names[S.phase] + '. ');
  if (S.phase >= 1 && S.phase <= 5) {
    var miss = statusItems(c).filter(function (x) { return !x.ok; });
    msg += miss.length ? T('Siguiente paso: ' + miss[0].t + '. ' + miss[0].fix + ' También puedes pulsar «Arréglalo por mí» en el anillo de estado.', 'Next step: ' + miss[0].t + '. ' + miss[0].fix + ' You can also press “Fix it for me” on the status ring.')
      : T('Todo está listo: pulsa ' + (S.phase === 5 ? '«Lanzar misión»' : '«Continuar»') + ' abajo a la derecha.', 'Everything is ready: press ' + (S.phase === 5 ? '“Launch mission”' : '“Continue”') + ' at the bottom right.');
  } else if (S.phase === 6) msg += T('Ajusta cuánto tiempo dedicas a ciencia y a transmitir, enciende los instrumentos y pulsa «Siguiente turno» abajo a la derecha.', 'Set how much time goes to science and downlink, switch the instruments on and press “Next turn” at the bottom right.');
  else msg += T('Revisa tu nota y la crítica técnica; puedes compartir el diseño o volver al inicio.', 'Review your grade and the technical critique; you can share the design or go home.');
  return msg + back;
}
