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
    { k: ['cohete', 'lanzador', 'lanzamiento', 'despegue', 'rocket', 'launcher', 'launch', 'liftoff'], a: function (c) {
      if (!c.lv) return T('Aún no hay cohete. En la fase 5 el asistente elige el más barato que lleva tu nave con margen.', 'No rocket yet. In phase 5 the assistant picks the cheapest one that carries your spacecraft with margin.');
      return T(L(c.lv.name) + ': lleva ' + n0(c.lvCap) + ' kg a tu trayectoria y tu nave pesa ' + n0(c.mass.launch) + ' kg; fiabilidad ' + n1(c.lv.reliability * 100) + '%.', L(c.lv.name) + ': it carries ' + n0(c.lvCap) + ' kg to your trajectory and your spacecraft weighs ' + n0(c.mass.launch) + ' kg; reliability ' + n1(c.lv.reliability * 100) + '%.');
    } },
    { k: ['tripulacion', 'quien vuela', 'astronautas', 'crew', 'who flies', 'astronauts'], a: function () {
      var l = crewList();
      return l.length ? T('Tripulación: ', 'Crew: ') + l.map(function (x) { return (es ? x.role.es : x.role.en) + ' ' + x.name; }).join(', ') + '.' : T('Aún no registraste la tripulación. Pulsa el botón de astronauta para agregar nombres.', 'You have not logged the crew yet. Press the astronaut button to add names.');
    } }
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
  nxRules().concat(nxCatalog()).forEach(function (r) {
    var sc = 0, hit = [];
    r.k.forEach(function (k) {
      k = nxNorm(k); if (!k) return;
      if (nq.indexOf(' ' + k + ' ') >= 0) { sc += 1 + k.split(' ').length * 0.5; hit = hit.concat(k.split(' ')); }
      else if (k.length > 5 && nq.indexOf(k) >= 0) { sc += 0.8; hit = hit.concat(k.split(' ')); }
    });
    sc *= r.w || 1;
    if (sc > bestS) { bestS = sc; best = { text: r.a(c), src: 'rule' }; bestHit = hit; }
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
var NX_GENERIC = 'mision mission nave spacecraft dime cuentame hablame informacion info sobre explica explicame tell about explain please favor sabes know quiero saber want todo esta estan como cual cuanto cuanta'.split(' ');

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
  nxPaint();
  if (!root.querySelector('.nx-msg')) nxBot(LANG === 'es' ? 'Hola' + (crewName('cmd') ? ', comandante ' + crewName('cmd') : '') + '. Soy NEXUS. Pregúntame por los propulsores, la energía, el tiempo de la misión o lo que falta. Si no sé algo, enséñamelo y lo recordaré.'
    : 'Hello' + (crewName('cmd') ? ', Commander ' + crewName('cmd') : '') + '. I am NEXUS. Ask me about the thrusters, power, mission time or what is missing. If I do not know something, teach me and I will remember it.', 'rule');
  setTimeout(function () { var i = document.getElementById('nx-q'); if (i) i.focus(); }, 50);
}
function nxClose() { var r = document.getElementById('nexus'); if (r) r.hidden = true; NX.open = false; nxStopListen(); }

function nxPaint() {
  var root = document.getElementById('nexus'), es = LANG === 'es', keep = root.querySelector('.nx-log');
  var chips = es ? ['¿Cómo están los propulsores?', '¿Qué falta?', '¿Cuánto dura la misión?', '¿Qué es delta-v?', 'Informe completo']
    : ['How are the thrusters?', 'What is missing?', 'How long is the mission?', 'What is delta-v?', 'Full report'];
  var n = nxLearned().length, hasMic = !!(window.SpeechRecognition || window.webkitSpeechRecognition);
  root.innerHTML = '<header class="nx-head"><span class="vcap-orb"><i></i><i></i><i></i></span><div><b>NEXUS</b><span>' + esc(es ? 'IA de a bordo · sistema experto que aprende' : 'Onboard AI · an expert system that learns') + '</span></div>' +
    '<button class="icon-btn nx-x" data-nx="close" aria-label="' + esc(es ? 'Cerrar' : 'Close') + '">' + icon('close', 'ico') + '</button></header>' +
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
function nxBot(text, src, by, q) {
  var es = LANG === 'es', tag = src === 'learned' ? '<span class="nx-src">🧠 ' + esc(es ? 'Aprendido' : 'Learned') + (by ? ' · ' + esc(by) : '') + '</span>' : '';
  var fix = q ? '<button class="nx-fix" data-nx="fix" data-q="' + esc(q) + '">' + esc(es ? 'Corregir o mejorar esta respuesta' : 'Correct or improve this answer') + '</button>' : '';
  nxMsg('bot', text, tag + fix);
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
  if (r) { nxBot(r.text, r.src, r.by, q); return; }
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
  else if (a === 'export') nxExport();
  else if (a === 'del') { var l = nxLearned(); l.splice(parseInt(b.getAttribute('data-v'), 10), 1); nxSaveLearned(l); nxPaint(); nxList(); }
}
