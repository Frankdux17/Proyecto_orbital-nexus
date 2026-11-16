/* ORBITAL NEXUS — voices and crew.
   The mission team speaks (Dra. Lucía Vega and the others), and NEXUS, the
   onboard assistant, greets the crew, reads the status of thrusters, power,
   link and time, counts down the launch and calls out what happens in
   flight. Players can put their own names on the crew. Everything said is
   also shown as a caption, so the game works with the sound off. Speech
   uses the browser's own voices (Web Speech API); nothing leaves the page. */

var VOICE = { on: true, last: '', lastPhase: -1, cap: null, capT: 0, voices: [], started: false };
var CREW_ROLES = [
  { id: 'cmd', es: 'Comandante', en: 'Commander' },
  { id: 'pil', es: 'Piloto', en: 'Pilot' },
  { id: 'sci', es: 'Especialista científico', en: 'Science specialist' },
  { id: 'eng', es: 'Ingeniero de vuelo', en: 'Flight engineer' }
];
/* female / male guess for the team, so each person gets a fitting voice */
var SPEAKERS = {
  nexus: { name: 'NEXUS', pitch: 0.78, rate: 1.04, male: true },
  pi: { pitch: 1.12, rate: 1.0, male: false }, sys: { pitch: 0.95, rate: 1.0, male: true },
  com: { pitch: 1.15, rate: 1.02, male: false }, lv: { pitch: 1.05, rate: 1.0, male: false },
  capcom: { pitch: 0.9, rate: 1.0, male: true }, fd: { pitch: 0.85, rate: 0.98, male: true }
};

function voicePref() { return pref('on_voice', '1') === '1'; }
function crewGet() { try { return JSON.parse(pref('on_crew', '{}')) || {}; } catch (e) { return {}; } }
function crewName(role) { var c = crewGet(); return (c[role] || '').trim(); }
function crewList() {
  var c = crewGet(), out = [];
  CREW_ROLES.forEach(function (r) { if ((c[r.id] || '').trim()) out.push({ role: r, name: c[r.id].trim() }); });
  return out;
}
/* "Comandante Ana" or just "comandante" when no name was given */
function crewCall(role) {
  var r = null; CREW_ROLES.forEach(function (x) { if (x.id === role) r = x; });
  var n = crewName(role), t = LANG === 'es' ? r.es : r.en;
  return n ? t + ' ' + n : t.toLowerCase();
}

/* ---------- speech ---------- */
function voiceLoad() {
  if (!('speechSynthesis' in window)) return;
  VOICE.voices = speechSynthesis.getVoices() || [];
}
if ('speechSynthesis' in window) { voiceLoad(); speechSynthesis.onvoiceschanged = voiceLoad; }

var FEMALE = /helena|sabina|laura|dalia|elvira|paulina|monica|mónica|zira|hazel|susan|samantha|catherine|aria|jenny|libby|sonia|female|mujer|paloma|lucia|ximena|camila|elena/i;
var MALE = /pablo|raul|raúl|jorge|alvaro|álvaro|david|mark|george|daniel|guy|ryan|male|hombre|tomas|tomás|diego|gonzalo|dario|alex/i;
function voicePick(male) {
  var lang = LANG === 'es' ? 'es' : 'en', vs = VOICE.voices.filter(function (v) { return (v.lang || '').toLowerCase().indexOf(lang) === 0; });
  if (!vs.length) return null;
  var want = vs.filter(function (v) { return male ? MALE.test(v.name) : FEMALE.test(v.name); });
  var pool = want.length ? want : vs;
  /* prefer natural / online voices when the browser offers them */
  pool.sort(function (a, b) { return (/natural|neural|online|google/i.test(b.name) ? 1 : 0) - (/natural|neural|online|google/i.test(a.name) ? 1 : 0); });
  return pool[0];
}

function voiceSay(who, text, opts) {
  opts = opts || {};
  if (!text) return;
  if (!opts.noCap) voiceCaption(who, text);
  if (!voicePref() || !('speechSynthesis' in window)) return;
  try {
    if (!opts.queue) speechSynthesis.cancel();
    /* read it the way a person would: no keyboard hints, no symbols */
    var spoken = text.replace(/\s*\([^)]*\)/g, '').replace(/Δv/g, LANG === 'es' ? 'delta uve' : 'delta v').replace(/\s*·\s*/g, ', ').replace(/[«»"“”]/g, '');
    var sp = SPEAKERS[who] || SPEAKERS.nexus, u = new SpeechSynthesisUtterance(spoken);
    u.lang = LANG === 'es' ? 'es-ES' : 'en-US';
    var v = voicePick(sp.male); if (v) { u.voice = v; u.lang = v.lang; }
    u.pitch = sp.pitch; u.rate = sp.rate * (opts.fast ? 1.12 : 1);
    speechSynthesis.speak(u);
  } catch (e) { }
}
function voiceStop() { try { if ('speechSynthesis' in window) speechSynthesis.cancel(); } catch (e) { } }

/* the caption: who is talking and what they said */
function capSize() { return pref('on_cap_size', 'normal'); }
function capPos() { return pref('on_cap_pos', 'bl'); }
function voiceCaption(who, text) {
  if (capSize() === 'off') return;
  var el = document.getElementById('vcap');
  if (!el) { el = document.createElement('div'); el.id = 'vcap'; el.className = 'vcap'; el.setAttribute('aria-live', 'polite'); document.body.appendChild(el); }
  var seat = TEAM[who], isAI = !seat;
  var base = 'vcap ' + (isAI ? 'vcap-ai' : 'vcap-team') + ' pos-' + capPos() + (capSize() === 'compact' ? ' vcap-compact' : '');
  el.className = base + ' show';
  el.innerHTML = (isAI ? '<span class="vcap-orb"><i></i><i></i><i></i></span>' : useSvg(seat.av, 'vcap-av')) +
    '<div><b>' + esc(isAI ? 'NEXUS · ' + (LANG === 'es' ? 'asistente de a bordo' : 'onboard assistant') : seat.name) + '</b><span>' + esc(text) + '</span></div>' +
    '<button class="vcap-x" type="button" aria-label="' + esc(LANG === 'es' ? 'Cerrar' : 'Close') + '">×</button>';
  el.querySelector('.vcap-x').onclick = function () { el.className = base; voiceStop(); };
  clearTimeout(VOICE.capT);
  VOICE.capT = setTimeout(function () { el.className = base; }, Math.min(capSize() === 'compact' ? 9000 : 16000, 3000 + text.length * (capSize() === 'compact' ? 45 : 70)));
}

/* ---------- what NEXUS says ---------- */
function nexusGreeting() {
  var es = LANG === 'es', n = crewName('cmd');
  return es ? 'Bienvenido a bordo' + (n ? ', comandante ' + n : '') + '. Soy NEXUS, tu asistente de misión. ¿Listo para despegar y conocer lo que hay más allá de la Tierra? Elige un destino y yo te diré cómo va todo.'
    : 'Welcome aboard' + (n ? ', Commander ' + n : '') + '. I am NEXUS, your mission assistant. Ready for liftoff and to discover what lies beyond Earth? Pick a destination and I will tell you how everything is going.';
}

/* a full status report: thrusters, power, link, time, budget, what is missing */
function nexusReport() {
  var c = comp(), es = LANG === 'es', p = [];
  if (!c.dest) return es ? 'Aún no hay misión. Elige un programa y un destino para empezar.' : 'No mission yet. Pick a program and a destination to begin.';
  p.push((es ? 'Informe de NEXUS para la misión a ' : 'NEXUS report for the mission to ') + L(c.dest.name) + '.');
  if (c.prop) p.push(es ? 'Propulsores: ' + L(c.prop.name) + ', ' + n0(c.mass.propellant) + ' kilos de propelente; delta uve ' + n2(c.dv.available) + ' de ' + n2(c.dv.required) + ' kilómetros por segundo: ' + (c.dv.margin >= 0 ? 'suficiente.' : 'insuficiente, faltan ' + n0(-c.dv.margin * 1000) + ' metros por segundo.')
    : 'Thrusters: ' + L(c.prop.name) + ', ' + n0(c.mass.propellant) + ' kilograms of propellant; delta v ' + n2(c.dv.available) + ' of ' + n2(c.dv.required) + ' kilometres per second: ' + (c.dv.margin >= 0 ? 'sufficient.' : 'short by ' + n0(-c.dv.margin * 1000) + ' metres per second.'));
  else p.push(es ? 'Propulsores: sin elegir.' : 'Thrusters: not chosen yet.');
  if (c.bus) p.push(es ? 'Energía: ' + n0(c.power.genEOL) + ' vatios al final de la misión, margen ' + n0(c.power.marginPct * 100) + ' por ciento.' : 'Power: ' + n0(c.power.genEOL) + ' watts at end of mission, ' + n0(c.power.marginPct * 100) + ' percent margin.');
  if (S.antennaD) p.push(es ? 'Enlace: ' + bps(c.link.bps) + ', baja el ' + n0(c.link.ratio * 100) + ' por ciento de los datos.' : 'Link: ' + bps(c.link.bps) + ', downlinking ' + n0(c.link.ratio * 100) + ' percent of the data.');
  p.push(es ? 'Tiempo: ' + c.cruiseDays + ' días de viaje y ' + c.opsTurns + ' meses de operación, ' + n1(c.years) + ' años en total.' : 'Time: ' + c.cruiseDays + ' days of travel and ' + c.opsTurns + ' months of operations, ' + n1(c.years) + ' years in all.');
  p.push(es ? 'Presupuesto: ' + money(c.cost.total) + ' de ' + money(c.cost.budget) + '.' : 'Budget: ' + money(c.cost.total) + ' of ' + money(c.cost.budget) + '.');
  if (S.phase >= 1 && S.phase <= 5) {
    var items = statusItems(c), miss = items.filter(function (x) { return !x.ok; });
    p.push(miss.length ? (es ? 'Falta: ' : 'Missing: ') + miss.map(function (x) { return x.t; }).join('; ') + '.' : (es ? 'Todos los sistemas en verde. Todo está bien.' : 'All systems green. Everything is fine.'));
  }
  if (S.phase === 6) p.push(es ? 'Turno ' + S.turn + ' de ' + c.opsTurns + '. Propelente restante ' + n0(S.propLeft) + ' kilos.' : 'Turn ' + S.turn + ' of ' + c.opsTurns + '. Propellant left ' + n0(S.propLeft) + ' kilograms.');
  return p.join(' ');
}

var PHASE_NAMES = { 1: ['misión', 'mission'], 2: ['plataforma', 'platform'], 3: ['ciencia', 'science'], 4: ['enlace', 'link'], 5: ['lanzamiento', 'launch'], 6: ['operaciones', 'operations'], 7: ['informe', 'report'] };

/* called after every render: speak when the phase changes or the coach has something new */
function voiceAfterRender(c) {
  if (S.phase === 0) { VOICE.lastPhase = 0; return; }
  var es = LANG === 'es';
  if (S.phase !== VOICE.lastPhase) {
    var prev = VOICE.lastPhase; VOICE.lastPhase = S.phase; VOICE.last = '';
    if (S.phase >= 1 && S.phase <= 5) {
      var items = statusItems(c), ok = items.filter(function (x) { return x.ok; }).length, next = null;
      items.forEach(function (x) { if (!next && !x.ok) next = x; });
      var pn = PHASE_NAMES[S.phase][es ? 0 : 1];
      var msg = (prev <= 0 && S.phase === 1) ? nexusGreeting()
        : (es ? 'Fase ' + S.phase + ': ' + pn + '. Estado ' + Math.round(ok / items.length * 100) + ' por ciento. ' + (next ? 'Siguiente paso: ' + next.fix : 'Todo en orden.')
          : 'Phase ' + S.phase + ': ' + pn + '. Status ' + Math.round(ok / items.length * 100) + ' percent. ' + (next ? 'Next step: ' + next.fix : 'All in order.'));
      if (S.phase === 5 && !next) msg = es ? crewCall('cmd').replace(/^./, function (m) { return m.toUpperCase(); }) + ', la nave está lista. ¿Listo para despegar?' : (crewCall('cmd').replace(/^./, function (m) { return m.toUpperCase(); }) + ', the spacecraft is ready. Ready for liftoff?');
      voiceSay('nexus', msg);
      return;
    }
    if (S.phase === 7) { voiceSay('fd', es ? 'Misión terminada. Revisemos el informe juntos.' : 'Mission complete. Let us review the report together.'); return; }
    return;
  }
  /* same phase: let the person at this console speak when their advice changes */
  var tip = typeof coachTip === 'function' ? coachTip(c) : null, seat = PHASE_SEAT[S.phase];
  if (tip && tip.msg !== VOICE.last && VOICE.started) {
    VOICE.last = tip.msg;
    var lead = (S.phase === 1 && S.destId && crewName('cmd')) ? (es ? 'Comandante ' : 'Commander ') + crewName('cmd') + ', ' : '';
    voiceSay(seat, lead ? lead + tip.msg.charAt(0).toLowerCase() + tip.msg.slice(1) : tip.msg);
  } else if (tip) VOICE.last = tip.msg;
}

/* ---------- crew dialog ---------- */
function crewOpen() {
  var root = document.getElementById('crew');
  if (!root) {
    root = document.createElement('div'); root.id = 'crew'; root.className = 'tour-back'; root.setAttribute('role', 'dialog'); root.setAttribute('aria-modal', 'true');
    document.body.appendChild(root);
    root.addEventListener('change', function (e) { var k = e.target.getAttribute && e.target.getAttribute('data-crew-opt'); if (k) { setPref(k, e.target.value); voiceCaption('nexus', LANG === 'es' ? 'Así se verán los subtítulos.' : 'This is how captions will look.'); } });
    root.addEventListener('click', function (e) {
      var b = e.target.closest ? e.target.closest('[data-crew]') : null;
      if (!b) { if (e.target === root) crewClose(); return; }
      var a = b.getAttribute('data-crew');
      if (a === 'save') crewSave(true);
      else if (a === 'close') crewClose();
      else if (a === 'test') { crewSave(false); voiceSay('nexus', nexusGreeting()); }
      else if (a === 'voice') { setPref('on_voice', voicePref() ? '0' : '1'); if (!voicePref()) voiceStop(); crewPaint(); }
    });
  }
  root.hidden = false; OVERLAY_OPEN = true;
  var cap = document.getElementById('vcap'); if (cap) cap.classList.remove('show');
  crewPaint();
  var f = root.querySelector('input'); if (f) f.focus();
}
function crewPaint() {
  var root = document.getElementById('crew'), es = LANG === 'es', c = crewGet(), rows = '';
  CREW_ROLES.forEach(function (r) {
    rows += '<label class="crew-row"><span>' + esc(es ? r.es : r.en) + '</span><input type="text" maxlength="28" data-role="' + r.id + '" value="' + esc(c[r.id] || '') + '" placeholder="' + esc(es ? 'Escribe un nombre' : 'Type a name') + '"></label>';
  });
  root.innerHTML = '<div class="tour crew" tabindex="-1"><button class="icon-btn tour-x" data-crew="close" aria-label="' + esc(es ? 'Cerrar' : 'Close') + '">' + icon('close', 'ico') + '</button>' +
    '<div class="tour-art"><span class="tour-orbit"></span><span class="tour-ic">👩‍🚀</span></div>' +
    '<span class="tour-k">' + esc(es ? 'Tu tripulación' : 'Your crew') + '</span><h2>' + esc(es ? '¿Quién vuela esta misión?' : 'Who flies this mission?') + '</h2>' +
    '<p>' + esc(es ? 'Escribe sus nombres: el equipo y NEXUS les hablarán por su nombre durante la simulación.' : 'Type their names: the team and NEXUS will call them by name during the simulation.') + '</p>' +
    '<div class="crew-rows">' + rows + '</div>' +
    '<div class="crew-voice"><button class="switch' + (voicePref() ? ' on' : '') + '" data-crew="voice" role="switch" aria-checked="' + voicePref() + '"><i></i></button><span>' +
    esc(es ? 'Voces del equipo y de NEXUS ' + (voicePref() ? 'activadas' : 'desactivadas') + ' (los subtítulos siempre se muestran)' : 'Team and NEXUS voices ' + (voicePref() ? 'on' : 'off') + ' (captions always show)') + '</span></div>' +
    '<div class="crew-opts"><label>' + esc(es ? 'Subtítulos' : 'Captions') + '<select data-crew-opt="on_cap_size">' +
      [['normal', es ? 'Normales' : 'Normal'], ['compact', es ? 'Compactos (una línea)' : 'Compact (one line)'], ['off', es ? 'Ocultos' : 'Hidden']].map(function (o) { return '<option value="' + o[0] + '"' + (capSize() === o[0] ? ' selected' : '') + '>' + esc(o[1]) + '</option>'; }).join('') + '</select></label>' +
      '<label>' + esc(es ? 'Posición' : 'Position') + '<select data-crew-opt="on_cap_pos">' +
      [['bl', es ? 'Abajo a la izquierda' : 'Bottom left'], ['br', es ? 'Abajo a la derecha' : 'Bottom right'], ['top', es ? 'Arriba' : 'Top']].map(function (o) { return '<option value="' + o[0] + '"' + (capPos() === o[0] ? ' selected' : '') + '>' + esc(o[1]) + '</option>'; }).join('') + '</select></label></div>' +
    '<div class="tour-btns"><button class="btn ghost" data-crew="test">🔊 ' + esc(es ? 'Probar voz' : 'Test voice') + '</button><button class="btn primary" data-crew="save">' + esc(es ? 'Guardar tripulación' : 'Save crew') + '</button></div></div>';
}
function crewSave(close) {
  var c = {}, ins = document.querySelectorAll('#crew input[data-role]');
  for (var i = 0; i < ins.length; i++) c[ins[i].getAttribute('data-role')] = ins[i].value.replace(/[<>]/g, '').slice(0, 28);
  setPref('on_crew', JSON.stringify(c));
  if (close) {
    crewClose();
    var n = crewName('cmd');
    voiceSay('nexus', LANG === 'es' ? 'Tripulación registrada.' + (n ? ' Bienvenido, comandante ' + n + '.' : '') + ' ¿Listo para despegar?' : 'Crew logged.' + (n ? ' Welcome, Commander ' + n + '.' : '') + ' Ready for liftoff?');
  }
}
function crewClose() { var r = document.getElementById('crew'); if (r) r.hidden = true; OVERLAY_OPEN = false; if (typeof render === 'function') render(); }

/* the crew card shown in the sidebar and the report */
function crewPanel() {
  var es = LANG === 'es', list = crewList();
  return '<div class="panel crew-panel"><h2>' + esc(es ? 'Tripulación' : 'Crew') + '</h2>' +
    (list.length ? '<ul class="crew-list">' + list.map(function (x) { return '<li><span>' + esc(es ? x.role.es : x.role.en) + '</span><b>' + esc(x.name) + '</b></li>'; }).join('') + '</ul>'
      : '<p class="hint">' + esc(es ? 'Agrega los nombres de quienes simulan el vuelo.' : 'Add the names of the people flying the simulation.') + '</p>') +
    '<div class="crew-btns"><button class="btn sm" data-act="crew">👩‍🚀 ' + esc(list.length ? (es ? 'Editar' : 'Edit') : (es ? 'Agregar nombres' : 'Add names')) + '</button>' +
    '<button class="btn sm" data-act="nexus">🛰️ ' + esc(es ? 'Pregunta a NEXUS' : 'Ask NEXUS') + '</button></div></div>';
}
