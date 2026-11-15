/* ORBITAL NEXUS — engineering model
 * All of the physics the game argues with lives here:
 *   - mass budget and the rocket equation
 *   - solar / RTG power budget with 1/r^2 and end-of-life degradation
 *   - a real (if simplified) telecom link budget against DSN antennas
 *   - cost rollup, feasibility checks, scoring and the final critique
 */

var ENG = {};

ENG.C = 2.99792458e8;
ENG.K_B = 1.380649e-23;
ENG.EBN0_REQ = 4.0;    // required Eb/N0, linear (~6 dB with modern coding)
ENG.LINK_MARGIN = 3.16; // 5 dB of design margin

/* Maximum downlink rate allowed by the allocated bandwidth of each band (bps).
   Deep space is power-limited; near Earth you run into spectrum first. */
ENG.BAND_MAX = { s: 2e6, x: 2e7, ka: 5e7 };

/* Fraction of ground-station hours actually usable, per destination.
   A LEO spacecraft is only above the horizon a few minutes per pass. */
ENG.CONTACT = { 'leo-sso': 0.06, 'geo-relay': 1.0, 'llo': 0.75, 'sel2': 0.25 };

/* Eclipse duration per orbit (hours) — sizes the battery. */
ENG.ECLIPSE_H = {
  'leo-sso': 0.58, 'geo-relay': 1.2, 'llo': 0.78, 'sel2': 0,
  'mars-orbit': 0.7, 'mars-surface': 12, 'venus-orbit': 0.9, 'neo': 0, 'europa': 1.5
};

ENG.clamp = function (v, a, b) { return v < a ? a : (v > b ? b : v); };

/* ---------------- rocket equation ---------------- */
ENG.deltaV = function (isp, dryKg, propKg) {
  if (dryKg <= 0 || propKg <= 0) return 0;
  return isp * G0 * Math.log((dryKg + propKg) / dryKg) / 1000; // km/s
};
ENG.propNeeded = function (isp, dryKg, dvKms) {
  return dryKg * (Math.exp(dvKms * 1000 / (isp * G0)) - 1);
};

/* ---------------- power ---------------- */
ENG.solarPower = function (areaM2, au, years) {
  var p = DATA.power.solar;
  var deg = Math.pow(1 - p.degradePerYear, Math.max(0, years));
  return 1361 / (au * au) * areaM2 * p.effBOL * p.packing * deg;
};
ENG.rtgPower = function (units, years) {
  var p = DATA.power.rtg;
  return units * p.wPerUnit * Math.pow(1 - p.decayPerYear, Math.max(0, years));
};

/* ---------------- link budget ---------------- */
ENG.linkRate = function (twtaW, antD, band, ground, au) {
  if (!twtaW || !antD || !band || !ground) return 0;
  var lambda = ENG.C / (band.ghz * 1e9);
  var gTx = 0.60 * Math.pow(Math.PI * antD / lambda, 2);
  var gRx = ground.eff * Math.pow(Math.PI * ground.dia / lambda, 2);
  var d = Math.max(au, 1e-6) * AU_M;
  var lPath = Math.pow(4 * Math.PI * d / lambda, 2);
  var noise = ENG.K_B * band.ts * ENG.EBN0_REQ * ENG.LINK_MARGIN;
  var bps = twtaW * gTx * gRx * band.weather / (lPath * noise);
  var cap = ENG.BAND_MAX[band.id] || 1e9;
  return Math.min(bps, cap);
};

/* ---------------- full mission compute ---------------- */
ENG.compute = function (S) {
  var r = { ok: true, viol: [], warn: [] };

  var prog = DATA.find(DATA.programs, S.programId);
  var dest = DATA.find(DATA.destinations, S.destId);
  var bus = DATA.find(DATA.buses, S.busId);
  var prop = DATA.find(DATA.propulsion, S.propId);
  var band = DATA.find(DATA.bands, S.bandId);
  var grd = DATA.find(DATA.grounds, S.groundId);
  var shd = DATA.find(DATA.shielding, S.shieldingId);
  var edl = DATA.find(DATA.edl, S.edlId);
  var lv = DATA.find(DATA.launchers, S.launcherId);

  r.prog = prog; r.dest = dest; r.bus = bus; r.prop = prop;
  r.band = band; r.grd = grd; r.shd = shd; r.edl = edl; r.lv = lv;

  /* ---- science payload ---- */
  var instr = [];
  for (var i = 0; i < S.instruments.length; i++) {
    var ins = DATA.find(DATA.instruments, S.instruments[i]);
    if (ins) instr.push(ins);
  }
  r.instr = instr;

  var payloadMass = 0, payloadPower = 0, payloadCost = 0, payloadData = 0, riskSum = 0;
  var hasMag = false, hasTir = false;
  for (i = 0; i < instr.length; i++) {
    payloadMass += instr[i].mass;
    payloadPower += instr[i].powerW;
    payloadCost += instr[i].cost;
    payloadData += instr[i].dataGb;
    riskSum += instr[i].risk;
    if (instr[i].id === 'mag') hasMag = true;
    if (instr[i].id === 'tirs') hasTir = true;
  }
  var accessories = 0;
  if (hasMag) accessories += 4;                                  // deployable boom
  if (hasTir && dest && dest.thermal === 'hot') accessories += 6; // cryocooler
  payloadMass += accessories;
  r.accessories = accessories;

  /* ---- mission duration ---- */
  var cruiseDays = dest ? dest.cruiseDays : 0;
  if (prop && prop.cruiseFactor) cruiseDays *= prop.cruiseFactor;
  var opsTurns = dest ? dest.opsTurns : 0;
  var years = (cruiseDays + opsTurns * 30) / 365.25;
  r.cruiseDays = Math.round(cruiseDays);
  r.opsTurns = opsTurns;
  r.years = years;

  /* ---- power system ---- */
  var sp = DATA.power.solar, rp = DATA.power.rtg, bp = DATA.power.battery;
  var powerMass = 0, powerCost = 0;
  var area = S.powerType === 'solar' ? (S.arrayArea || 0) : 0;
  var units = S.powerType === 'rtg' ? (S.rtgUnits || 0) : 0;
  if (S.powerType === 'solar') { powerMass += area * sp.kgPerM2; powerCost += area * sp.costPerM2; }
  else { powerMass += units * rp.kgPerUnit; powerCost += units * rp.costPerUnit; }
  powerMass += (S.batteryWh || 0) * bp.kgPerWh;
  powerCost += (S.batteryWh || 0) * bp.costPerWh;

  var au = dest ? dest.solarAu : 1;
  var genBOL = S.powerType === 'solar' ? ENG.solarPower(area, au, 0) : ENG.rtgPower(units, 0);
  var genEOL = S.powerType === 'solar' ? ENG.solarPower(area, au, years) : ENG.rtgPower(units, years);

  /* ---- comms ---- */
  var antD = S.antennaD || 0;
  var commsMass = antD ? DATA.antennaMass(antD) : 0;
  var commsCost = antD ? DATA.antennaCost(antD) : 0;
  if (band) { commsMass += band.extraMass; commsCost += band.extraCost; }
  if (S.twtaW) { commsMass += DATA.twtaMass(S.twtaW); commsCost += DATA.twtaCost(S.twtaW); }
  var twtaDC = S.twtaW ? DATA.twtaDC(S.twtaW) : 0;

  /* ---- structural mass rollup ---- */
  var coreDry = (bus ? bus.dryMass : 0) + payloadMass + powerMass + commsMass;
  var shieldMass = shd ? shd.massFrac * coreDry : 0;
  var propDry = prop ? prop.dryBase + prop.dryFrac * (S.propellantKg || 0) : 0;
  var edlMass = (dest && dest.lander && edl) ? edl.massFrac * (coreDry + shieldMass + propDry) : 0;
  var dryMass = coreDry + shieldMass + propDry + edlMass;
  var launchMass = dryMass + (S.propellantKg || 0);

  r.mass = {
    bus: bus ? bus.dryMass : 0, payload: payloadMass, power: powerMass, comms: commsMass,
    shield: shieldMass, propDry: propDry, edl: edlMass,
    dry: dryMass, propellant: S.propellantKg || 0, launch: launchMass
  };

  /* ---- thermal + power balance ---- */
  var thermalW = dest ? DATA.thermalLoad(dest.thermal, dryMass, au) : 0;
  var overhead = (bus ? bus.overheadW : 0) + thermalW;
  var loadScience = overhead + payloadPower;
  var loadDownlink = overhead + twtaDC;
  var loadCruise = overhead + (prop && prop.powerW ? prop.powerW : 0);
  var peak = Math.max(loadScience, loadDownlink, loadCruise);

  r.power = {
    genBOL: genBOL, genEOL: genEOL, thermalW: thermalW, overhead: overhead,
    payloadW: payloadPower, twtaDC: twtaDC,
    loadScience: loadScience, loadDownlink: loadDownlink, loadCruise: loadCruise,
    peak: peak, margin: genEOL - peak,
    marginPct: peak > 0 ? (genEOL - peak) / peak : 0
  };

  /* battery sizing against eclipse */
  var ecH = dest ? (ENG.ECLIPSE_H[dest.id] != null ? ENG.ECLIPSE_H[dest.id] : 0) : 0;
  var battNeed = ecH > 0 ? (overhead + 0.35 * payloadPower) * ecH / 0.7 : 0;
  r.battery = { need: battNeed, have: S.batteryWh || 0, eclipseH: ecH };

  /* ---- delta-v ---- */
  var dvReq = dest ? dest.dv + dest.skDvPerTurn * opsTurns / 1000 : 0;
  var dvAvail = prop ? ENG.deltaV(prop.isp, dryMass, S.propellantKg || 0) : 0;
  r.dv = { required: dvReq, available: dvAvail, margin: dvAvail - dvReq };

  /* ---- data link ---- */
  var contact = dest ? (ENG.CONTACT[dest.id] != null ? ENG.CONTACT[dest.id] : 1.0) : 1;
  var hours = grd ? grd.maxHoursPerTurn * contact : 0;
  var rateFar = (band && grd && dest) ? ENG.linkRate(S.twtaW, antD, band, grd, dest.commAu) : 0;
  var gbPerTurn = rateFar * hours * 3600 / 1e9;
  r.link = {
    bps: rateFar, hours: hours, gbPerTurn: gbPerTurn,
    collectGbPerTurn: payloadData,
    ratio: payloadData > 0 ? gbPerTurn / payloadData : 0
  };

  /* ---- cost rollup ---- */
  var complexity = 1 + riskSum * 0.6 + (bus ? bus.rank * 0.5 : 0)
    + (prop && prop.id === 'electric' ? 1.2 : 0)
    + (S.powerType === 'rtg' ? 1.0 : 0)
    + (shd && shd.id === 'vault' ? 0.8 : 0)
    + (dest && dest.lander ? 2.0 : 0)
    + (band && band.id === 'ka' ? 0.4 : 0);
  var devNeed = Math.round(20 + 5.5 * complexity);
  var devMonths = S.devMonths || devNeed;
  var readiness = ENG.clamp(devMonths / devNeed, 0.4, 1.4);
  r.complexity = complexity; r.devNeed = devNeed; r.devMonths = devMonths; r.readiness = readiness;

  var cBus = bus ? bus.cost : 0;
  var cProp = prop ? prop.costBase + prop.costPerKg * (S.propellantKg || 0) : 0;
  var cShield = shd ? shd.cost : 0;
  var cEdl = (dest && dest.lander && edl) ? edl.cost : 0;
  var cLv = lv ? lv.cost : 0;
  var cDev = prog ? prog.burnPerMonth * devMonths : 0;
  var cOps = prog ? (prog.opsPerTurn + (grd ? grd.costPerTurn : 0)) * opsTurns : 0;
  var staffTurn = ENG.staffPerTurn(S, prog);
  cOps += staffTurn * opsTurns;
  var total = cBus + payloadCost + powerCost + commsCost + cProp + cShield + cEdl + cLv + cDev + cOps;
  var budget = prog ? prog.budget : 0;

  r.cost = {
    bus: cBus, payload: payloadCost, power: powerCost, comms: commsCost, prop: cProp,
    shield: cShield, edl: cEdl, launcher: cLv, dev: cDev, ops: cOps, staffPerTurn: staffTurn,
    total: total, budget: budget, margin: budget - total,
    marginPct: budget > 0 ? (budget - total) / budget : 0
  };

  /* ---- launcher capability ---- */
  var cap = (lv && dest) ? (lv.cap[dest.c3] || 0) : 0;
  r.lvCap = cap;

  /* ---- objective coverage ---- */
  var tags = {};
  for (i = 0; i < instr.length; i++)
    for (var j = 0; j < instr[i].tags.length; j++) tags[instr[i].tags[j]] = true;
  r.tags = tags;
  r.coverage = [];
  if (dest) {
    for (i = 0; i < dest.objectives.length; i++) {
      var ob = dest.objectives[i], have = 0;
      for (j = 0; j < ob.instr.length; j++) if (tags[ob.instr[j]]) have++;
      r.coverage.push({ obj: ob, have: have, need: ob.instr.length, full: have >= ob.instr.length });
    }
  }

  /* ---- feasibility checks ---- */
  var V = r.viol, W = r.warn;
  function bad(es, en) { V.push({ es: es, en: en }); }
  function warn(es, en) { W.push({ es: es, en: en }); }

  if (prog && dest && dest.minProgram > prog.rank)
    bad('El destino exige al menos clase ' + L(DATA.programs[dest.minProgram].name) + '.',
      'The destination requires at least ' + L(DATA.programs[dest.minProgram].name) + '.');

  if (bus && payloadMass > bus.payloadMax)
    bad('Carga científica de ' + payloadMass.toFixed(0) + ' kg sobre el límite de ' + bus.payloadMax + ' kg del bus.',
      'Science payload of ' + payloadMass.toFixed(0) + ' kg exceeds the bus limit of ' + bus.payloadMax + ' kg.');

  if (bus && S.powerType === 'solar' && area > bus.arrayMax)
    bad('Área de paneles sobre el máximo del bus (' + bus.arrayMax + ' m²).',
      'Array area above the bus maximum (' + bus.arrayMax + ' m²).');

  if (S.powerType === 'rtg' && (!bus || !bus.allowsRTG))
    bad('Solo el bus Flagship puede integrar un RTG.', 'Only the Flagship bus can integrate an RTG.');

  if (S.powerType === 'rtg' && prog && prog.rank < DATA.power.rtg.minProgram)
    bad('El combustible de RTG solo se asigna a programas de clase New Frontiers o superior.',
      'RTG fuel is only allocated to New Frontiers class programs or above.');

  if (bus && antD > bus.antennaMax)
    bad('Antena de ' + antD + ' m sobre el máximo del bus (' + bus.antennaMax + ' m).',
      'A ' + antD + ' m antenna is above the bus maximum (' + bus.antennaMax + ' m).');

  if (lv && antD && antD > lv.fairing - 0.15)
    bad('La antena de ' + antD + ' m no entra en el cofre de ' + lv.fairing + ' m del lanzador.',
      'The ' + antD + ' m antenna does not fit the launcher’s ' + lv.fairing + ' m fairing.');

  if (bus && (S.propellantKg || 0) > bus.propMax)
    bad('Propelente sobre la capacidad de tanques del bus (' + bus.propMax + ' kg).',
      'Propellant above the bus tank capacity (' + bus.propMax + ' kg).');

  if (prop && bus && prop.minRank > bus.rank)
    bad('Ese sistema de propulsión necesita un bus más grande.', 'That propulsion system needs a larger bus.');

  for (i = 0; i < instr.length; i++) {
    var it = instr[i];
    if (it.landerOnly && dest && !dest.lander)
      bad(L(it.name) + ': solo opera en misiones de superficie.', L(it.name) + ': only operates on surface missions.');
    if (it.minBusRank != null && bus && bus.rank < it.minBusRank)
      bad(L(it.name) + ' requiere un bus de clase superior.', L(it.name) + ' requires a higher-class bus.');
    if (it.needsBand && band && it.needsBand.indexOf(band.id) < 0)
      bad(L(it.name) + ' requiere banda X o Ka.', L(it.name) + ' requires X or Ka band.');
  }

  if (band && band.id === 'ka' && grd && grd.dia === 70)
    bad('Las antenas de 70 m de la DSN no soportan banda Ka: usa la de 34 m.',
      'DSN 70 m antennas do not support Ka band: use the 34 m.');

  if (prop && r.dv.margin < 0)
    bad('Delta-v insuficiente: faltan ' + Math.abs(r.dv.margin).toFixed(2) + ' km/s.',
      'Insufficient delta-v: short by ' + Math.abs(r.dv.margin).toFixed(2) + ' km/s.');

  if ((area > 0 || units > 0) && genEOL < overhead)
    bad('La nave no sobrevive: la potencia al final de la misión no cubre ni el bus y los calefactores.',
      'The spacecraft does not survive: end-of-life power does not even cover the bus and heaters.');

  if (lv && dest && cap <= 0)
    bad(L(lv.name) + ' no puede alcanzar ' + L(DATA.c3Labels[dest.c3]) + '.',
      L(lv.name) + ' cannot reach ' + L(DATA.c3Labels[dest.c3]) + '.');
  else if (lv && launchMass > cap)
    bad('Masa de lanzamiento ' + launchMass.toFixed(0) + ' kg sobre la capacidad de ' + cap.toFixed(0) + ' kg a ese destino.',
      'Launch mass ' + launchMass.toFixed(0) + ' kg above the ' + cap.toFixed(0) + ' kg capability to that destination.');

  if (lv && lv.onlyDest && dest && lv.onlyDest.indexOf(dest.id) < 0)
    bad(L(lv.name) + ' solo sirve para órbita heliosíncrona.', L(lv.name) + ' only serves sun-synchronous orbit.');

  if (lv && lv.minProgram != null && prog && prog.rank < lv.minProgram)
    bad(L(lv.name) + ' no está disponible para esta clase de programa.', L(lv.name) + ' is not available to this program class.');

  if (r.cost.margin < 0)
    bad('Sobrecosto de $' + Math.abs(r.cost.margin).toFixed(0) + 'M sobre el presupuesto del programa.',
      'Cost overrun of $' + Math.abs(r.cost.margin).toFixed(0) + 'M over the program budget.');

  if (dest && dest.lander && bus && !edl)
    bad('Una misión de superficie necesita un sistema de entrada, descenso y aterrizaje.',
      'A surface mission needs an entry, descent and landing system.');

  if (S.seen >= 3 && instr.length === 0)
    bad('Sin instrumentos no hay misión científica.', 'Without instruments there is no science mission.');

  /* --- warnings (allowed, but they will hurt) --- */
  if (r.power.margin < 0 && genEOL >= overhead)
    warn('Margen de potencia negativo: no podrás operar todos los instrumentos a la vez.',
      'Negative power margin: you will not be able to run all instruments at once.');
  else if (r.power.marginPct < 0.15 && peak > 0)
    warn('Margen de potencia por debajo del 15% que exigiría una revisión de diseño real.',
      'Power margin below the 15% a real design review would demand.');

  if (battNeed > 0 && (S.batteryWh || 0) < battNeed)
    warn('Batería insuficiente para el eclipse: se necesitan ~' + battNeed.toFixed(0) + ' Wh.',
      'Battery too small for eclipse: about ' + battNeed.toFixed(0) + ' Wh needed.');

  if (shd && dest && dest.radKrad > shd.krad)
    warn('Dosis de radiación de ' + dest.radKrad + ' krad sobre la tolerancia del blindaje (' + shd.krad + ' krad): anomalías frecuentes.',
      'Radiation dose of ' + dest.radKrad + ' krad exceeds the shielding tolerance (' + shd.krad + ' krad): expect frequent anomalies.');

  if (hasMag && prop && prop.emiPenalty)
    warn('El magnetómetro junto a propulsión eléctrica sufre interferencia: sus datos valen la mitad.',
      'The magnetometer next to electric propulsion suffers interference: its data counts half.');

  if (r.link.ratio > 0 && r.link.ratio < 0.25)
    warn('El enlace solo puede bajar el ' + (r.link.ratio * 100).toFixed(0) + '% de lo que generan tus instrumentos a pleno régimen.',
      'The link can only downlink ' + (r.link.ratio * 100).toFixed(0) + '% of what your instruments produce at full duty.');

  if (bus && payloadData > bus.storeGb * 3)
    warn('La memoria de ' + bus.storeGb + ' Gb se llena en menos de medio turno a pleno régimen.',
      'The ' + bus.storeGb + ' Gb memory fills in less than half a turn at full duty.');

  if (readiness < 0.85)
    warn('Desarrollo acortado a ' + devMonths + ' meses frente a los ' + devNeed + ' recomendados: riesgo de falla elevado.',
      'Development cut to ' + devMonths + ' months against the ' + devNeed + ' recommended: elevated failure risk.');

  if (r.cost.marginPct > 0 && r.cost.marginPct < 0.08)
    warn('Reserva de costo por debajo del 8%: cualquier sorpresa en vuelo se come el programa.',
      'Cost reserve below 8%: any in-flight surprise eats the program.');

  for (i = 0; i < r.coverage.length; i++)
    if (r.coverage[i].have === 0)
      warn('Ningún instrumento cubre: ' + L(r.coverage[i].obj.name) + '.',
        'No instrument covers: ' + L(r.coverage[i].obj.name) + '.');

  r.ok = V.length === 0;
  return r;
};

/* ---------------- probability of a successful start ---------------- */
/* the ground team: who sits on console in mission control, and what it costs.
   Each seat costs a share of the program's per-turn operations cost; a 24/7
   operation needs three shifts and costs a little over twice as much. */
ENG.staff = function (S) {
  var st = S.staff || {}, seats = [], people = 0;
  for (var i = 0; i < DATA.consoles.length; i++) {
    var k = DATA.consoles[i], n = k.required ? 1 : (k.levels ? (st[k.id] || 0) : (st[k.id] ? 1 : 0));
    if (n > 0) { seats.push({ con: k, n: n }); people += n; }
  }
  var shifts = st.h24 ? 3 : 1;
  return { seats: seats, onConsole: people, total: people * shifts, shifts: shifts };
};
ENG.staffPerTurn = function (S, prog) {
  if (!prog || !DATA.consoles) return 0;
  var st = ENG.staff(S), c = 0;
  for (var i = 0; i < st.seats.length; i++) c += st.seats[i].con.cost * st.seats[i].n;
  return c * prog.opsPerTurn * (st.shifts === 3 ? 2.2 : 1);
};
ENG.has = function (S, id) { return !!(S.staff && S.staff[id]); };

ENG.successOdds = function (c) {
  var pLaunch = c.lv ? c.lv.reliability : 0.9;
  var shortfall = Math.max(0, 1 - c.readiness);
  var pCommission = (c.bus ? c.bus.reliability : 0.9) * (1 - shortfall * 0.55);
  var pEdl = (c.dest && c.dest.lander && c.edl) ? c.edl.success : 1;
  return { launch: pLaunch, commission: ENG.clamp(pCommission, 0.2, 0.995), edl: pEdl,
           total: pLaunch * ENG.clamp(pCommission, 0.2, 0.995) * pEdl };
};

/* ---------------- scoring ---------------- */
ENG.score = function (S, c) {
  var dest = c.dest, sc = { science: 0, scienceMax: 0, eng: 0, cost: 0, surv: 0 };

  /* science: objectives completed from DOWNLINKED data only */
  var objs = [];
  for (var i = 0; i < dest.objectives.length; i++) {
    var ob = dest.objectives[i], got = 0, ok = true;
    for (var j = 0; j < ob.instr.length; j++) {
      var tagGot = 0;
      for (var k = 0; k < c.instr.length; k++) {
        if (c.instr[k].tags.indexOf(ob.instr[j]) >= 0) tagGot += (S.downlinked[c.instr[k].id] || 0);
      }
      if (tagGot <= 0) ok = false;
      got += tagGot;
    }
    var frac = ok ? ENG.clamp(got / ob.dataGb, 0, 1) : 0;
    objs.push({ obj: ob, frac: frac, gb: got });
    sc.science += ob.value * frac;
    sc.scienceMax += ob.value;
  }
  sc.science += S.bonusScience || 0;
  sc.objectives = objs;

  /* Engineering discipline: margins actually held at launch.
     Mass and cost margin are scored as a band, not "more is better" — a rocket
     half empty and a budget half unspent are both design failures. */
  var pm = ENG.clamp(c.power.marginPct / 0.30, 0, 1);
  var massFrac = c.lvCap > 0 ? (c.lvCap - c.mass.launch) / c.lvCap : -1;
  var mm = massFrac < 0 ? 0 : ENG.clamp(1 - Math.abs(massFrac - 0.22) / 0.30, 0, 1);
  var dm = c.dv.required > 0 ? ENG.clamp(c.dv.margin / (0.20 * c.dv.required), 0, 1) : 1;
  var lm = ENG.clamp(c.link.ratio / 0.6, 0, 1);
  var bm = c.battery.need > 0 ? ENG.clamp(c.battery.have / c.battery.need, 0, 1) : 1;
  sc.eng = (pm * 45 + mm * 30 + dm * 30 + lm * 30 + bm * 15);
  sc.engDetail = { power: pm, mass: mm, dv: dm, link: lm, battery: bm, massFrac: massFrac };

  /* Cost: a healthy reserve is 15-30%. Overspending is blocked; hoarding wastes
     science you could have flown. */
  sc.cost = c.cost.marginPct < 0 ? 0 : ENG.clamp(1 - Math.abs(c.cost.marginPct - 0.22) / 0.25, 0, 1) * 150;

  /* survival */
  sc.surv = ENG.clamp(S.turn / Math.max(1, c.opsTurns), 0, 1) * 100;
  if (!S.alive) sc.surv *= 0.6;

  sc.total = Math.round(sc.science + sc.eng + sc.cost + sc.surv);
  sc.max = Math.round(sc.scienceMax + 150 + 150 + 100);
  sc.pct = sc.total / sc.max;

  if (sc.pct >= 0.85) sc.grade = 'S';
  else if (sc.pct >= 0.72) sc.grade = 'A';
  else if (sc.pct >= 0.58) sc.grade = 'B';
  else if (sc.pct >= 0.42) sc.grade = 'C';
  else if (sc.pct >= 0.25) sc.grade = 'D';
  else sc.grade = 'F';
  if (!S.launchSuccess) sc.grade = 'F';
  return sc;
};

/* ---------------- post-mission critique ---------------- */
ENG.critique = function (S, c, sc) {
  var out = [];
  function add(es, en) { out.push({ es: es, en: en }); }

  var collected = 0, downlinked = 0;
  for (var kk in S.collected) collected += S.collected[kk];
  for (kk in S.downlinked) downlinked += S.downlinked[kk];

  if (!S.launchSuccess) {
    add('La misión nunca llegó a operar. Un lanzador con ' + ((1 - c.lv.reliability) * 100).toFixed(1) + '% de probabilidad de falla, o un desarrollo acortado, son decisiones de ingeniería como cualquier otra: el riesgo es parte del diseño.',
      'The mission never reached operations. A launcher with a ' + ((1 - c.lv.reliability) * 100).toFixed(1) + '% chance of failure, or a shortened development, are engineering decisions like any other: risk is part of the design.');
    return out;
  }

  if (collected > 0 && downlinked / collected < 0.55) {
    add('Recolectaste ' + collected.toFixed(0) + ' Gb y solo bajaste ' + downlinked.toFixed(0) + ' Gb (' + (downlinked / collected * 100).toFixed(0) + '%). El resto murió en la memoria de la nave. Una antena más grande, más potencia de transmisión o una estación terrena mejor habrían convertido esa masa en ciencia.',
      'You collected ' + collected.toFixed(0) + ' Gb and downlinked only ' + downlinked.toFixed(0) + ' Gb (' + (downlinked / collected * 100).toFixed(0) + '%). The rest died in onboard memory. A larger antenna, more transmit power or a better ground station would have turned that mass into science.');
  } else if (collected > 0 && downlinked / collected > 0.95 && c.link.ratio > 3 && c.mass.comms > 0.08 * c.mass.dry) {
    add('Tu enlace estuvo sobredimensionado: podías bajar ' + c.link.gbPerTurn.toFixed(0) + ' Gb por turno y tus instrumentos solo generaban ' + c.link.collectGbPerTurn.toFixed(0) + ' Gb. Esos kilos de antena y esos vatios de TWTA podrían haber sido otro instrumento.',
      'Your link was oversized: you could downlink ' + c.link.gbPerTurn.toFixed(0) + ' Gb per turn while your instruments only produced ' + c.link.collectGbPerTurn.toFixed(0) + ' Gb. Those antenna kilograms and TWTA watts could have been another instrument.');
  }

  var uncovered = [];
  for (var i = 0; i < c.coverage.length; i++) if (c.coverage[i].have === 0) uncovered.push(L(c.coverage[i].obj.name));
  if (uncovered.length) {
    add('Quedaron objetivos sin ningún instrumento capaz de medirlos: ' + uncovered.join('; ') + '. Es puntaje que estaba disponible y nunca se intentó.',
      'Objectives were left with no instrument able to measure them: ' + uncovered.join('; ') + '. That is score that was on the table and never attempted.');
  }

  if (sc.engDetail.power < 0.3) {
    add('Volaste con un margen de potencia de ' + (c.power.marginPct * 100).toFixed(0) + '%. Toda revisión de diseño real exige cerca del 30% al lanzamiento, porque los paneles se degradan y los calefactores siempre piden más de lo previsto.',
      'You flew with a ' + (c.power.marginPct * 100).toFixed(0) + '% power margin. Every real design review demands around 30% at launch, because arrays degrade and heaters always ask for more than predicted.');
  }
  if (sc.engDetail.dv < 0.3 && c.dv.required > 0.5) {
    add('El margen de delta-v fue de solo ' + (c.dv.margin * 1000).toFixed(0) + ' m/s. Una corrección de trayectoria no planeada o una fuga te habrían dejado sin misión.',
      'Delta-v margin was only ' + (c.dv.margin * 1000).toFixed(0) + ' m/s. One unplanned trajectory correction or a leak would have ended the mission.');
  }
  if (sc.engDetail.massFrac > 0.55 && c.lvCap > 0) {
    add('Usaste solo el ' + (c.mass.launch / c.lvCap * 100).toFixed(0) + '% de la capacidad del lanzador. Pagaste por un cohete que no necesitabas, o dejaste masa científica en Tierra por miedo.',
      'You used only ' + (c.mass.launch / c.lvCap * 100).toFixed(0) + '% of the launcher capability. You paid for a rocket you did not need, or left science mass on the ground out of caution.');
  }
  if (c.cost.marginPct > 0.38) {
    add('Terminaste con $' + c.cost.margin.toFixed(0) + 'M sin gastar, el ' + (c.cost.marginPct * 100).toFixed(0) + '% del presupuesto. En una propuesta real, ese dinero habría sido otro instrumento o un lanzador con mejor historial.',
      'You finished with $' + c.cost.margin.toFixed(0) + 'M unspent, ' + (c.cost.marginPct * 100).toFixed(0) + '% of the budget. In a real proposal that money would have been another instrument or a launcher with a better record.');
  }
  if (c.shd && c.dest.radKrad > c.shd.krad) {
    add('Llevaste ' + L(c.shd.name).toLowerCase() + ' a un entorno de ' + c.dest.radKrad + ' krad. Las anomalías que sufriste no fueron mala suerte: estaban en el presupuesto de radiación desde el día uno.',
      'You took ' + L(c.shd.name).toLowerCase() + ' into a ' + c.dest.radKrad + ' krad environment. The anomalies you suffered were not bad luck: they were in the radiation budget from day one.');
  }
  if (c.battery.need > 0 && c.battery.have < c.battery.need * 0.9) {
    add('La batería quedó corta para eclipses de ' + c.battery.eclipseH.toFixed(1) + ' h. Cada paso por la sombra te obligó a apagar instrumentos.',
      'The battery was short for ' + c.battery.eclipseH.toFixed(1) + ' h eclipses. Every pass through shadow forced you to power instruments down.');
  }
  if (c.instr.length >= 6 && sc.science / sc.scienceMax < 0.55) {
    add('Llevaste ' + c.instr.length + ' instrumentos y completaste menos de la mitad de la ciencia. Repartir el tiempo y la potencia entre demasiados instrumentos suele rendir menos que tres bien operados.',
      'You carried ' + c.instr.length + ' instruments and completed less than half the science. Splitting time and power across too many instruments usually returns less than three well-operated ones.');
  }
  if (c.readiness < 0.85) {
    add('Acortaste el desarrollo a ' + c.devMonths + ' meses frente a los ' + c.devNeed + ' que pedía la complejidad de tu diseño. Ahorrar en la fase de pruebas es el modo más común de perder una misión.',
      'You cut development to ' + c.devMonths + ' months against the ' + c.devNeed + ' your design complexity demanded. Saving on the test campaign is the most common way to lose a mission.');
  }
  if (sc.science / Math.max(1, sc.scienceMax) > 0.8 && c.cost.marginPct > 0.1) {
    add('Diseño excelente: más del 80% de la ciencia disponible, dentro del presupuesto y con reservas. Es exactamente lo que un comité de selección busca en una propuesta.',
      'Excellent design: over 80% of the available science, inside budget and with reserves left. That is exactly what a selection board looks for in a proposal.');
  }
  if (out.length === 0) {
    add('Misión equilibrada, sin errores graves de presupuesto. El siguiente paso es ambición: intenta un destino más difícil con la misma disciplina.',
      'A balanced mission with no serious budget errors. The next step is ambition: try a harder destination with the same discipline.');
  }
  return out;
};
