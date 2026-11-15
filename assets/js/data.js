/* ORBITAL NEXUS — mission catalogue
   Figures are simplified but anchored on public NASA / launch-provider data.
   Costs are in millions of US dollars (M$). Masses in kg, power in W, data in Gb.
   See docs/MODEL.md for sources and the reasoning behind each number. */

var AU_M = 1.495978707e11;   // metres per astronomical unit
var G0 = 9.80665;            // m/s^2

var DATA = {};

/* ------------------------------------------------------------------ *
 * PROGRAM CLASSES — budget and schedule envelope                      *
 * ------------------------------------------------------------------ */
DATA.programs = [
  { id: 'cubesat', rank: 0, budget: 40, devNominal: 24, burnPerMonth: 0.15, opsPerTurn: 0.03,
    name: { es: 'Clase CubeSat', en: 'CubeSat class' },
    tag: { es: 'Universitaria', en: 'University' },
    desc: { es: 'Presupuesto mínimo, cronograma corto, tolerancia al riesgo alta. Así vuelan los experimentos estudiantiles y las demostraciones tecnológicas.',
            en: 'Minimal budget, short schedule, high risk tolerance. This is how student experiments and tech demos actually fly.' } },
  { id: 'smallsat', rank: 1, budget: 220, devNominal: 36, burnPerMonth: 0.7, opsPerTurn: 0.18,
    name: { es: 'Clase SmallSat', en: 'SmallSat class' },
    tag: { es: 'Venture / SIMPLEx', en: 'Venture / SIMPLEx' },
    desc: { es: 'Misiones enfocadas de bajo costo con un objetivo científico claro y poco margen para errores.',
            en: 'Focused low-cost missions with one clear science goal and little room for mistakes.' } },
  { id: 'discovery', rank: 2, budget: 750, devNominal: 54, burnPerMonth: 2.4, opsPerTurn: 0.9,
    name: { es: 'Clase Discovery', en: 'Discovery class' },
    tag: { es: 'Competida', en: 'Competed' },
    desc: { es: 'El caballo de batalla de la ciencia planetaria: tope de costo estricto, una pregunta científica profunda.',
            en: 'The workhorse of planetary science: a hard cost cap and one deep science question.' } },
  { id: 'newfrontiers', rank: 3, budget: 1400, devNominal: 72, burnPerMonth: 4.2, opsPerTurn: 1.8,
    name: { es: 'Clase New Frontiers', en: 'New Frontiers class' },
    tag: { es: 'Media', en: 'Medium' },
    desc: { es: 'Alcanza destinos difíciles y permite energía nuclear. El comité te va a exigir márgenes de verdad.',
            en: 'Reaches hard destinations and unlocks nuclear power. The review board will demand real margins.' } },
  { id: 'flagship', rank: 4, budget: 3600, devNominal: 96, burnPerMonth: 9.5, opsPerTurn: 4,
    name: { es: 'Clase Flagship', en: 'Flagship class' },
    tag: { es: 'Estratégica', en: 'Strategic' },
    desc: { es: 'Una década de desarrollo y una nave que no se puede repetir. Fallar no es una opción presupuestable.',
            en: 'A decade of development and a spacecraft you cannot build twice. Failure is not a budget line.' } }
];

/* ------------------------------------------------------------------ *
 * DESTINATIONS                                                        *
 * dv   = delta-v the SPACECRAFT must provide after launcher injection *
 * c3   = energy class the launch vehicle must deliver                 *
 * ------------------------------------------------------------------ */
DATA.destinations = [
  {
    id: 'leo-sso', c3: 'leo', dv: 0.05, cruiseDays: 3, opsTurns: 36, minProgram: 0,
    commAu: 1.4e-5, solarAu: 1.0, eclipse: 0.36, thermal: 'temperate', radKrad: 6,
    skDvPerTurn: 1.0, lander: false,
    name: { es: 'Órbita baja heliosíncrona (600 km)', en: 'Sun-synchronous low Earth orbit (600 km)' },
    tag: { es: 'Observación de la Tierra', en: 'Earth observation' },
    blurb: { es: 'Cerca, barato y con enlace generoso: puedes bajar cientos de gigabits. El reto es la cadencia de observación y el eclipse cada 96 minutos.',
             en: 'Close, cheap and link-rich: you can downlink hundreds of gigabits. The challenge is observation cadence and an eclipse every 96 minutes.' },
    analog: { name: 'Landsat 9 / PACE', note: { es: 'Observatorios terrestres en órbita polar con instrumentos ópticos de alta cadencia.', en: 'Polar-orbiting Earth observatories with high-cadence optical instruments.' } },
    objectives: [
      { id: 'lc', instr: ['cam'], dataGb: 1400, value: 110, name: { es: 'Cartografía de cobertura terrestre', en: 'Land cover mapping' } },
      { id: 'veg', instr: ['spec_vnir'], dataGb: 2200, value: 150, name: { es: 'Salud de la vegetación y cultivos', en: 'Vegetation and crop health' } },
      { id: 'heat', instr: ['tir'], dataGb: 420, value: 120, name: { es: 'Islas de calor urbano', en: 'Urban heat islands' } },
      { id: 'aer', instr: ['spec_uv'], dataGb: 500, value: 95, name: { es: 'Aerosoles y calidad del aire', en: 'Aerosols and air quality' } }
    ]
  },
  {
    id: 'geo-relay', c3: 'gto', dv: 1.85, cruiseDays: 12, opsTurns: 54, minProgram: 1,
    commAu: 2.4e-4, solarAu: 1.0, eclipse: 0.015, thermal: 'temperate', radKrad: 60,
    skDvPerTurn: 4, lander: false,
    name: { es: 'Órbita geoestacionaria (35 786 km)', en: 'Geostationary orbit (35,786 km)' },
    tag: { es: 'Meteorología y relevo', en: 'Weather and relay' },
    blurb: { es: 'Vista permanente del mismo hemisferio y casi sin eclipses, pero el cinturón de radiación de Van Allen castiga la electrónica y la inserción cuesta 1,85 km/s.',
             en: 'Permanent view of one hemisphere and almost no eclipses, but the Van Allen belt punishes electronics and insertion costs 1.85 km/s.' },
    analog: { name: 'GOES-18', note: { es: 'Imágenes continuas del disco terrestre cada pocos minutos desde la órbita geoestacionaria.', en: 'Continuous full-disk Earth imaging every few minutes from geostationary orbit.' } },
    objectives: [
      { id: 'wx', instr: ['cam', 'tir'], dataGb: 2600, value: 160, name: { es: 'Vigilancia meteorológica continua', en: 'Continuous weather watch' } },
      { id: 'lgt', instr: ['spec_uv'], dataGb: 700, value: 100, name: { es: 'Mapeo de descargas eléctricas', en: 'Lightning mapping' } },
      { id: 'spw', instr: ['plasma', 'mag'], dataGb: 260, value: 130, name: { es: 'Clima espacial y tormentas geomagnéticas', en: 'Space weather and geomagnetic storms' } }
    ]
  },
  {
    id: 'llo', c3: 'tli', dv: 1.05, cruiseDays: 5, opsTurns: 24, minProgram: 0,
    commAu: 2.57e-3, solarAu: 1.0, eclipse: 0.28, thermal: 'temperate', radKrad: 18,
    skDvPerTurn: 12, lander: false,
    name: { es: 'Órbita lunar baja (100 km)', en: 'Low lunar orbit (100 km)' },
    tag: { es: 'Reconocimiento lunar', en: 'Lunar reconnaissance' },
    blurb: { es: 'Alcanzable incluso con presupuestos pequeños, pero la órbita lunar baja es inestable: el mascón lunar te obliga a gastar propelente cada mes o te estrellas.',
             en: 'Reachable even on small budgets, but low lunar orbit is unstable: lunar mascons force you to spend propellant every month or you crash.' },
    analog: { name: 'Lunar Reconnaissance Orbiter', note: { es: 'Cámara de alta resolución y altímetro láser cartografiando sitios de aterrizaje y hielo polar.', en: 'High-resolution camera and laser altimeter mapping landing sites and polar ice.' } },
    objectives: [
      { id: 'sites', instr: ['cam'], dataGb: 900, value: 120, name: { es: 'Cartografía de sitios de aterrizaje Artemis', en: 'Artemis landing site mapping' } },
      { id: 'ice', instr: ['radar'], dataGb: 600, value: 170, name: { es: 'Hielo de agua en cráteres polares', en: 'Water ice in polar craters' } },
      { id: 'topo', instr: ['alt'], dataGb: 180, value: 110, name: { es: 'Modelo topográfico global', en: 'Global topographic model' } },
      { id: 'min', instr: ['spec_vnir'], dataGb: 1100, value: 130, name: { es: 'Mineralogía de la corteza', en: 'Crustal mineralogy' } }
    ]
  },
  {
    id: 'sel2', c3: 'tli', dv: 0.22, cruiseDays: 32, opsTurns: 60, minProgram: 2,
    commAu: 0.01, solarAu: 1.01, eclipse: 0, thermal: 'cold', radKrad: 40,
    skDvPerTurn: 1.2, lander: false,
    name: { es: 'Punto Sol-Tierra L2 (1,5 M km)', en: 'Sun-Earth L2 (1.5 M km)' },
    tag: { es: 'Astrofísica', en: 'Astrophysics' },
    blurb: { es: 'Sol, Tierra y Luna siempre del mismo lado: cero eclipses y un cielo oscuro y estable. El precio es el frío extremo y que nadie podrá repararte.',
             en: 'Sun, Earth and Moon always on the same side: zero eclipses and a dark, stable sky. The price is extreme cold and nobody can ever repair you.' },
    analog: { name: 'James Webb Space Telescope', note: { es: 'Observatorio criogénico con parasol de cinco capas, imposible de reparar tras el lanzamiento.', en: 'Cryogenic observatory with a five-layer sunshield, impossible to service after launch.' } },
    objectives: [
      { id: 'deep', instr: ['cam'], dataGb: 1600, value: 170, name: { es: 'Campo profundo de galaxias tempranas', en: 'Deep field of early galaxies' } },
      { id: 'exo', instr: ['spec_vnir'], dataGb: 1300, value: 190, name: { es: 'Espectros de atmósferas de exoplanetas', en: 'Exoplanet atmosphere spectra' } },
      { id: 'dust', instr: ['tir'], dataGb: 540, value: 120, name: { es: 'Discos de polvo protoplanetarios', en: 'Protoplanetary dust disks' } },
      { id: 'solw', instr: ['plasma'], dataGb: 200, value: 90, name: { es: 'Viento solar sin perturbar', en: 'Undisturbed solar wind' } }
    ]
  },
  {
    id: 'mars-orbit', c3: 'mars', dv: 1.65, cruiseDays: 210, opsTurns: 36, minProgram: 1,
    commAu: 1.9, solarAu: 1.666, eclipse: 0.38, thermal: 'cold', radKrad: 30,
    skDvPerTurn: 3, lander: false,
    name: { es: 'Órbita de Marte', en: 'Mars orbit' },
    tag: { es: 'Ciencia planetaria', en: 'Planetary science' },
    blurb: { es: 'A 1,9 UA de distancia tu enlace cae por el cuadrado de la distancia y el Sol entrega menos de la mitad de potencia. Las ventanas se abren solo cada 26 meses.',
             en: 'At 1.9 AU your link falls with the square of distance and the Sun delivers less than half the power. Windows open only every 26 months.' },
    analog: { name: 'Mars Reconnaissance Orbiter', note: { es: 'Antena de 3 m y aerofrenado de seis meses para ahorrar propelente en la inserción.', en: '3 m antenna and six months of aerobraking to save insertion propellant.' } },
    objectives: [
      { id: 'hires', instr: ['cam'], dataGb: 2800, value: 150, name: { es: 'Imágenes de alta resolución de la superficie', en: 'High-resolution surface imaging' } },
      { id: 'water', instr: ['spec_vnir'], dataGb: 1900, value: 180, name: { es: 'Minerales hidratados y agua pasada', en: 'Hydrated minerals and past water' } },
      { id: 'sub', instr: ['radar'], dataGb: 820, value: 170, name: { es: 'Hielo subsuperficial en latitudes medias', en: 'Mid-latitude subsurface ice' } },
      { id: 'atm', instr: ['msp', 'spec_uv'], dataGb: 420, value: 140, name: { es: 'Escape atmosférico y metano', en: 'Atmospheric escape and methane' } },
      { id: 'grav', instr: ['rs'], dataGb: 40, value: 80, name: { es: 'Campo gravitatorio y estructura interna', en: 'Gravity field and interior structure' } }
    ]
  },
  {
    id: 'mars-surface', c3: 'mars', dv: 0.35, cruiseDays: 215, opsTurns: 30, minProgram: 2,
    commAu: 1.9, solarAu: 1.666, eclipse: 0.5, thermal: 'cold', radKrad: 20,
    skDvPerTurn: 0, lander: true,
    name: { es: 'Superficie de Marte (aterrizador)', en: 'Mars surface (lander)' },
    tag: { es: 'Entrada, descenso y aterrizaje', en: 'Entry, descent and landing' },
    blurb: { es: 'La ciencia de contacto no se consigue de otra forma, pero el escudo térmico y el sistema de aterrizaje se comen la mitad de tu masa y la mitad de las misiones fallan en los siete minutos finales.',
             en: 'Contact science cannot be obtained any other way, but the heat shield and landing system eat half your mass and half of all missions fail in the final seven minutes.' },
    analog: { name: 'InSight', note: { es: 'Aterrizador fijo con sismómetro y estación meteorológica, finalmente vencido por el polvo en sus paneles.', en: 'Fixed lander with a seismometer and weather station, finally defeated by dust on its solar panels.' } },
    objectives: [
      { id: 'quake', instr: ['seis'], dataGb: 90, value: 200, name: { es: 'Sismología del interior marciano', en: 'Seismology of the Martian interior' } },
      { id: 'wx2', instr: ['met'], dataGb: 60, value: 110, name: { es: 'Meteorología de superficie de un año marciano', en: 'One Mars year of surface weather' } },
      { id: 'soil', instr: ['sampler'], dataGb: 130, value: 190, name: { es: 'Química y habitabilidad del regolito', en: 'Regolith chemistry and habitability' } },
      { id: 'pan', instr: ['cam'], dataGb: 300, value: 100, name: { es: 'Contexto geológico panorámico', en: 'Panoramic geological context' } }
    ]
  },
  {
    id: 'venus-orbit', c3: 'mars', dv: 2.1, cruiseDays: 155, opsTurns: 24, minProgram: 2,
    commAu: 1.4, solarAu: 0.723, eclipse: 0.33, thermal: 'hot', radKrad: 22,
    skDvPerTurn: 5, lander: false,
    name: { es: 'Órbita de Venus', en: 'Venus orbit' },
    tag: { es: 'Planeta hermano', en: 'Sister planet' },
    blurb: { es: 'Más cerca del Sol tus paneles rinden el doble… y tus radiadores se saturan. La nube ácida esconde la superficie: solo el radar y el infrarrojo cercano la atraviesan.',
             en: 'Closer to the Sun your arrays produce twice the power... and your radiators saturate. The acid cloud deck hides the surface: only radar and near-infrared get through.' },
    analog: { name: 'Magellan / VERITAS', note: { es: 'Cartografía radar global a través de una atmósfera permanentemente opaca.', en: 'Global radar mapping through a permanently opaque atmosphere.' } },
    objectives: [
      { id: 'vrad', instr: ['radar'], dataGb: 1500, value: 190, name: { es: 'Mapa radar global de la superficie', en: 'Global radar map of the surface' } },
      { id: 'vatm', instr: ['msp'], dataGb: 300, value: 160, name: { es: 'Gases traza y química de nubes', en: 'Trace gases and cloud chemistry' } },
      { id: 'vemi', instr: ['spec_vnir'], dataGb: 900, value: 150, name: { es: 'Emisividad de superficie en ventanas del NIR', en: 'Surface emissivity in NIR windows' } },
      { id: 'vgrav', instr: ['rs'], dataGb: 35, value: 90, name: { es: 'Gravimetría y espesor de la litósfera', en: 'Gravimetry and lithosphere thickness' } }
    ]
  },
  {
    id: 'neo', c3: 'highc3', dv: 2.45, cruiseDays: 520, opsTurns: 18, minProgram: 2,
    commAu: 1.7, solarAu: 1.35, eclipse: 0, thermal: 'cold', radKrad: 25,
    skDvPerTurn: 8, lander: false,
    name: { es: 'Rendezvous con asteroide cercano', en: 'Near-Earth asteroid rendezvous' },
    tag: { es: 'Cuerpos pequeños', en: 'Small bodies' },
    blurb: { es: 'Llegar no es el problema: igualar la velocidad del asteroide sí. Y una vez ahí, la gravedad es tan débil que operar cerca es un ejercicio de paciencia y propelente.',
             en: 'Getting there is not the problem: matching the asteroid’s velocity is. And once there, gravity is so weak that close operations are an exercise in patience and propellant.' },
    analog: { name: 'OSIRIS-REx', note: { es: 'Dos años caracterizando Bennu antes de atreverse a tocarlo durante cinco segundos.', en: 'Two years characterising Bennu before daring to touch it for five seconds.' } },
    objectives: [
      { id: 'shape', instr: ['cam', 'alt'], dataGb: 700, value: 140, name: { es: 'Modelo de forma y rotación', en: 'Shape and rotation model' } },
      { id: 'comp', instr: ['spec_vnir'], dataGb: 1000, value: 170, name: { es: 'Composición y materia orgánica', en: 'Composition and organics' } },
      { id: 'samp', instr: ['sampler'], dataGb: 150, value: 210, name: { es: 'Caracterización del sitio de muestreo', en: 'Sample site characterisation' } },
      { id: 'yark', instr: ['rs', 'tir'], dataGb: 120, value: 130, name: { es: 'Efecto Yarkovsky y riesgo de impacto', en: 'Yarkovsky effect and impact risk' } }
    ]
  },
  {
    id: 'europa', c3: 'jupiter', dv: 1.6, cruiseDays: 2100, opsTurns: 14, minProgram: 3,
    commAu: 6.2, solarAu: 5.46, eclipse: 0.1, thermal: 'cold', radKrad: 2800,
    skDvPerTurn: 18, lander: false,
    name: { es: 'Sistema de Júpiter / Europa', en: 'Jupiter system / Europa' },
    tag: { es: 'Mundo oceánico', en: 'Ocean world' },
    blurb: { es: 'El destino más brutal del catálogo: 1/30 de la luz solar, seis años de crucero y un entorno de radiación que mata electrónica sin blindar en semanas. La recompensa es un océano líquido bajo el hielo.',
             en: 'The most brutal destination here: 1/30th of the sunlight, six years of cruise, and a radiation environment that kills unshielded electronics in weeks. The reward is a liquid ocean under the ice.' },
    analog: { name: 'Europa Clipper', note: { es: '100 m² de paneles, una bóveda de aluminio para la electrónica y sobrevuelos cortos en lugar de órbita.', en: '100 m² of arrays, an aluminium vault for the electronics, and short flybys instead of orbit.' } },
    objectives: [
      { id: 'ice2', instr: ['radar'], dataGb: 500, value: 230, name: { es: 'Espesor de la capa de hielo', en: 'Ice shell thickness' } },
      { id: 'ocean', instr: ['mag'], dataGb: 80, value: 220, name: { es: 'Confirmación del océano por inducción magnética', en: 'Ocean confirmation by magnetic induction' } },
      { id: 'plume', instr: ['msp', 'dust'], dataGb: 160, value: 210, name: { es: 'Composición de los penachos de vapor', en: 'Composition of the vapour plumes' } },
      { id: 'surf', instr: ['spec_vnir'], dataGb: 620, value: 160, name: { es: 'Química de la superficie y sales', en: 'Surface chemistry and salts' } },
      { id: 'jmag', instr: ['plasma'], dataGb: 140, value: 120, name: { es: 'Magnetósfera joviana', en: 'Jovian magnetosphere' } }
    ]
  }
];

/* ------------------------------------------------------------------ *
 * SPACECRAFT BUSES                                                    *
 * ------------------------------------------------------------------ */
DATA.buses = [
  { id: 'cube6u', rank: 0, dryMass: 9, payloadMax: 5, overheadW: 7, cost: 4,
    arrayMax: 1.2, antennaMax: 0.6, propMax: 6, storeGb: 12, reliability: 0.86, batteryMax: 300,
    name: { es: 'CubeSat 6U', en: '6U CubeSat' },
    desc: { es: 'Nueve kilos en total. Vuela como carga secundaria, cuesta casi nada y no perdona ni un vatio mal presupuestado.',
            en: 'Nine kilograms all-in. Flies as a secondary payload, costs almost nothing, and forgives not a single mis-budgeted watt.' } },
  { id: 'small150', rank: 1, dryMass: 115, payloadMax: 45, overheadW: 38, cost: 30,
    arrayMax: 7, antennaMax: 1.0, propMax: 200, storeGb: 80, reliability: 0.92, batteryMax: 2500,
    name: { es: 'SmallSat 150 kg', en: '150 kg SmallSat' },
    desc: { es: 'El punto dulce moderno: suficiente para dos o tres instrumentos serios sin el costo de un bus grande.',
            en: 'The modern sweet spot: enough for two or three serious instruments without the cost of a large bus.' } },
  { id: 'med600', rank: 2, dryMass: 520, payloadMax: 165, overheadW: 130, cost: 155,
    arrayMax: 24, antennaMax: 2.5, propMax: 1600, storeGb: 300, reliability: 0.955, batteryMax: 9000,
    name: { es: 'Bus medio 600 kg', en: '600 kg medium bus' },
    desc: { es: 'Plataforma de clase Discovery: puntería fina, memoria amplia y espacio para una antena de verdad.',
            en: 'Discovery-class platform: fine pointing, ample memory and room for a real antenna.' } },
  { id: 'flag2200', rank: 3, dryMass: 1950, payloadMax: 680, overheadW: 320, cost: 680,
    arrayMax: 100, antennaMax: 4.0, propMax: 4200, storeGb: 1200, reliability: 0.97, batteryMax: 30000, allowsRTG: true,
    name: { es: 'Bus Flagship 2,2 t', en: '2.2 t Flagship bus' },
    desc: { es: 'Todo lo que puedas pagar: redundancia doble, bóveda de electrónica opcional y capacidad para un RTG.',
            en: 'Everything you can afford: dual redundancy, optional electronics vault, and capacity for an RTG.' } }
];

/* ------------------------------------------------------------------ *
 * POWER                                                               *
 * ------------------------------------------------------------------ */
DATA.power = {
  solar: { effBOL: 0.28, packing: 0.78, kgPerM2: 2.7, costPerM2: 1.3, degradePerYear: 0.025 },
  rtg: { wPerUnit: 290, kgPerUnit: 56, costPerUnit: 95, decayPerYear: 0.016, minProgram: 3 },
  battery: { kgPerWh: 0.0062, costPerWh: 0.0004 }
};

/* ------------------------------------------------------------------ *
 * PROPULSION                                                          *
 * ------------------------------------------------------------------ */
DATA.propulsion = [
  { id: 'coldgas', isp: 65, dryBase: 2, dryFrac: 0.18, costBase: 1.2, costPerKg: 0.01, minRank: 0,
    name: { es: 'Gas frío', en: 'Cold gas' },
    desc: { es: 'Impulso específico ridículo, pero pesa casi nada. Solo sirve para mantener la órbita de un CubeSat.',
            en: 'Ridiculous specific impulse, but it weighs almost nothing. Only good for keeping a CubeSat in orbit.' } },
  { id: 'mono', isp: 228, dryBase: 16, dryFrac: 0.09, costBase: 9, costPerKg: 0.012, minRank: 0,
    name: { es: 'Monopropelente (hidracina)', en: 'Monopropellant (hydrazine)' },
    desc: { es: 'Simple y confiable. Es lo que llevan la mayoría de los satélites, y alcanza para inserciones modestas.',
            en: 'Simple and reliable. What most satellites carry, and enough for modest insertions.' } },
  { id: 'biprop', isp: 321, dryBase: 34, dryFrac: 0.11, costBase: 22, costPerKg: 0.02, minRank: 1,
    name: { es: 'Bipropelente presurizado', en: 'Pressure-fed bipropellant' },
    desc: { es: 'El estándar para inserción orbital planetaria: 321 s de Isp a cambio de tanques, válvulas y complejidad.',
            en: 'The standard for planetary orbit insertion: 321 s of Isp in exchange for tanks, valves and complexity.' } },
  { id: 'electric', isp: 2900, dryBase: 72, dryFrac: 0.06, costBase: 52, costPerKg: 0.05, minRank: 2,
    powerW: 700, cruiseFactor: 1.5, emiPenalty: true,
    name: { es: 'Propulsión eléctrica (Hall)', en: 'Electric propulsion (Hall thruster)' },
    desc: { es: 'Diez veces más eficiente en masa, pero empuja como una hoja de papel: alarga el crucero 50% y exige 700 W constantes. Su campo magnético ensucia las mediciones del magnetómetro.',
            en: 'Ten times more mass-efficient, but it pushes like a sheet of paper: stretches cruise by 50% and demands a constant 700 W. Its magnetic field pollutes magnetometer measurements.' } }
];

/* ------------------------------------------------------------------ *
 * SCIENCE INSTRUMENTS                                                 *
 * ------------------------------------------------------------------ */
DATA.instruments = [
  { id: 'nac', tags: ['cam'], mass: 14, powerW: 16, dataGb: 260, cost: 24, risk: 1,
    name: { es: 'Cámara de ángulo estrecho', en: 'Narrow-angle camera' },
    desc: { es: 'Resolución submétrica. Genera muchísimos datos: su cuello de botella nunca es el sensor, es el enlace.',
            en: 'Sub-metre resolution. Produces enormous data volumes: its bottleneck is never the sensor, it is the link.' } },
  { id: 'wac', tags: ['cam'], mass: 5, powerW: 7, dataGb: 70, cost: 9, risk: 0,
    name: { es: 'Cámara de gran angular', en: 'Wide-angle camera' },
    desc: { es: 'Contexto global con poca masa y pocos datos. La opción sensata cuando el presupuesto aprieta.',
            en: 'Global context at low mass and low data volume. The sensible pick when the budget is tight.' } },
  { id: 'vnir', tags: ['spec_vnir'], mass: 27, powerW: 35, dataGb: 520, cost: 52, risk: 2,
    name: { es: 'Espectrómetro de imagen VIS/NIR', en: 'VIS/NIR imaging spectrometer' },
    desc: { es: 'Identifica minerales y hielos por su firma espectral. Es el instrumento más científicamente rentable y el más hambriento de datos.',
            en: 'Identifies minerals and ices by spectral signature. The most scientifically productive instrument, and the hungriest for data.' } },
  { id: 'uvs', tags: ['spec_uv'], mass: 15, powerW: 20, dataGb: 95, cost: 31, risk: 1,
    name: { es: 'Espectrógrafo ultravioleta', en: 'Ultraviolet spectrograph' },
    desc: { es: 'Mide gases tenues, auroras y escape atmosférico. Datos ligeros, ciencia específica.',
            en: 'Measures tenuous gases, aurorae and atmospheric escape. Light on data, specific in science.' } },
  { id: 'tirs', tags: ['tir'], mass: 9, powerW: 14, dataGb: 60, cost: 19, risk: 1, coolerInHot: true,
    name: { es: 'Radiómetro infrarrojo térmico', en: 'Thermal infrared radiometer' },
    desc: { es: 'Temperaturas de superficie e inercia térmica. En entornos calientes necesita un criorrefrigerador extra.',
            en: 'Surface temperatures and thermal inertia. In hot environments it needs an extra cryocooler.' } },
  { id: 'mag', tags: ['mag'], mass: 5, powerW: 5, dataGb: 8, cost: 12, risk: 0, needsBoom: true,
    name: { es: 'Magnetómetro (en mástil)', en: 'Magnetometer (boom-mounted)' },
    desc: { es: 'Barato, ligero y capaz de detectar un océano bajo kilómetros de hielo. Exige una nave magnéticamente limpia.',
            en: 'Cheap, light, and able to detect an ocean beneath kilometres of ice. Demands a magnetically clean spacecraft.' } },
  { id: 'radar', tags: ['radar'], mass: 44, powerW: 68, dataGb: 185, cost: 58, risk: 2, minBusRank: 1,
    name: { es: 'Sondeador de radar', en: 'Radar sounder' },
    desc: { es: 'La única forma de ver bajo la superficie. Pesa, consume picos de potencia enormes y necesita una nave grande.',
            en: 'The only way to see below the surface. Heavy, with huge power peaks, and it needs a large spacecraft.' } },
  { id: 'msp', tags: ['msp'], mass: 20, powerW: 26, dataGb: 42, cost: 36, risk: 2,
    name: { es: 'Espectrómetro de masas', en: 'Mass spectrometer' },
    desc: { es: 'Huele la atmósfera molécula por molécula. Imprescindible para preguntas de habitabilidad.',
            en: 'Sniffs the atmosphere molecule by molecule. Essential for habitability questions.' } },
  { id: 'dust', tags: ['dust'], mass: 4, powerW: 5, dataGb: 7, cost: 8, risk: 0,
    name: { es: 'Detector de polvo y partículas', en: 'Dust and particle detector' },
    desc: { es: 'Casi gratis en masa y potencia. Siempre vale la pena si tu destino tiene penachos o anillos.',
            en: 'Nearly free in mass and power. Always worth it if your destination has plumes or rings.' } },
  { id: 'alt', tags: ['alt'], mass: 23, powerW: 33, dataGb: 32, cost: 30, risk: 2,
    name: { es: 'Altímetro láser', en: 'Laser altimeter' },
    desc: { es: 'Topografía de precisión centimétrica con muy pocos datos, pero su láser consume un tercio de tu potencia útil.',
            en: 'Centimetre-precision topography with very little data, but its laser eats a third of your usable power.' } },
  { id: 'rs', tags: ['rs'], mass: 3, powerW: 4, dataGb: 3, cost: 7, risk: 0, needsBand: ['x', 'ka'],
    name: { es: 'Radiociencia (oscilador ultraestable)', en: 'Radio science (ultra-stable oscillator)' },
    desc: { es: 'No es un instrumento: es tu propia antena midiendo el campo gravitatorio por efecto Doppler. Ciencia casi gratis.',
            en: 'Not really an instrument: it is your own antenna measuring the gravity field by Doppler shift. Almost free science.' } },
  { id: 'plasma', tags: ['plasma'], mass: 12, powerW: 15, dataGb: 26, cost: 23, risk: 1,
    name: { es: 'Paquete de plasma y partículas', en: 'Plasma and particles package' },
    desc: { es: 'Electrones e iones energéticos. En entornos de radiación es a la vez instrumento y dosímetro.',
            en: 'Energetic electrons and ions. In radiation environments it is both an instrument and a dosimeter.' } },
  { id: 'seis', tags: ['seis'], mass: 29, powerW: 11, dataGb: 15, cost: 40, risk: 2, landerOnly: true,
    name: { es: 'Sismómetro', en: 'Seismometer' },
    desc: { es: 'Escucha el interior del planeta. Requiere contacto con el suelo y un desacoplamiento térmico impecable.',
            en: 'Listens to the planet’s interior. Requires ground contact and impeccable thermal decoupling.' } },
  { id: 'met', tags: ['met'], mass: 7, powerW: 6, dataGb: 11, cost: 13, risk: 0, landerOnly: true,
    name: { es: 'Estación meteorológica', en: 'Weather station' },
    desc: { es: 'Presión, temperatura y viento durante años. Datos mínimos, serie temporal invaluable.',
            en: 'Pressure, temperature and wind for years. Minimal data, invaluable time series.' } },
  { id: 'sampler', tags: ['sampler'], mass: 47, powerW: 42, dataGb: 22, cost: 74, risk: 3, landerOnly: true,
    name: { es: 'Brazo de muestreo y laboratorio', en: 'Sampling arm and laboratory' },
    desc: { es: 'Ciencia de contacto: toca, raspa y analiza. Es el subsistema con más mecanismos y, por lejos, el más riesgoso.',
            en: 'Contact science: touch, scrape and analyse. The subsystem with the most mechanisms and by far the riskiest.' } }
];

/* ------------------------------------------------------------------ *
 * COMMUNICATIONS                                                      *
 * ------------------------------------------------------------------ */
DATA.antennas = [0.3, 0.6, 1.0, 1.6, 2.5, 4.0];
DATA.antennaMass = function (d) { return 7 * d * d + 2.5; };
DATA.antennaCost = function (d) { return 1.4 * d * d + 0.6; };

DATA.bands = [
  { id: 's', ghz: 2.2, ts: 36, weather: 1.0, extraMass: 0, extraCost: 0,
    name: { es: 'Banda S', en: 'S-band' },
    desc: { es: 'Robusta y tolerante a errores de puntería, pero de baja capacidad. Para telemetría, no para ciencia.',
            en: 'Robust and tolerant of pointing errors, but low capacity. For telemetry, not for science.' } },
  { id: 'x', ghz: 8.4, ts: 28, weather: 0.97, extraMass: 2, extraCost: 2,
    name: { es: 'Banda X', en: 'X-band' },
    desc: { es: 'El estándar del espacio profundo. Buen equilibrio entre ganancia y exigencia de puntería.',
            en: 'The deep-space standard. A good balance of gain and pointing demands.' } },
  { id: 'ka', ghz: 32, ts: 25, weather: 0.82, extraMass: 13, extraCost: 20,
    name: { es: 'Banda Ka', en: 'Ka-band' },
    desc: { es: 'Casi 15 veces la ganancia de banda X, pero exige control de actitud de precisión (+13 kg) y la lluvia en Tierra te corta pases.',
            en: 'Nearly 15× the gain of X-band, but it demands precision attitude control (+13 kg) and rain on Earth costs you passes.' } }
];

DATA.twtas = [5, 20, 50, 100, 200];
DATA.twtaMass = function (p) { return 2.2 + 0.055 * p; };
DATA.twtaCost = function (p) { return 1.2 + 0.09 * p; };
DATA.twtaDC = function (p) { return p / 0.55; };

DATA.grounds = [
  { id: 'comm13', dia: 13, eff: 0.62, costPerTurn: 0.12, maxHoursPerTurn: 300,
    name: { es: 'Red comercial 13 m', en: 'Commercial 13 m network' },
    desc: { es: 'Barata y con muchas antenas disponibles. Suficiente cerca de la Tierra, inútil en el espacio profundo.',
            en: 'Cheap, with plenty of antennas available. Fine near Earth, useless in deep space.' } },
  { id: 'dsn34', dia: 34, eff: 0.70, costPerTurn: 1.4, maxHoursPerTurn: 220,
    name: { es: 'DSN 34 m', en: 'DSN 34 m' },
    desc: { es: 'El caballo de batalla de la Red de Espacio Profundo. Tiempo cotizado, pero se consigue.',
            en: 'The Deep Space Network workhorse. Contested time, but obtainable.' } },
  { id: 'dsn70', dia: 70, eff: 0.74, costPerTurn: 4.5, maxHoursPerTurn: 90,
    name: { es: 'DSN 70 m', en: 'DSN 70 m' },
    desc: { es: 'Cuatro veces la ganancia del de 34 m, pero solo hay tres en el mundo y todas las misiones los quieren.',
            en: 'Four times the gain of the 34 m, but there are only three on Earth and every mission wants them.' } }
];

DATA.shielding = [
  { id: 'none', massFrac: 0, cost: 0, factor: 1.0, krad: 20,
    name: { es: 'Sin blindaje', en: 'No shielding' },
    desc: { es: 'Electrónica comercial. Válido en órbita baja terrestre y nada más.', en: 'Commercial electronics. Valid in low Earth orbit and nowhere else.' } },
  { id: 'light', massFrac: 0.03, cost: 7, factor: 0.72, krad: 100,
    name: { es: 'Blindaje ligero', en: 'Light shielding' },
    desc: { es: 'Partes calificadas a 100 krad y protección puntual en las cajas críticas.', en: '100 krad qualified parts and spot shielding on critical boxes.' } },
  { id: 'std', massFrac: 0.06, cost: 19, factor: 0.48, krad: 400,
    name: { es: 'Blindaje estándar', en: 'Standard shielding' },
    desc: { es: 'Diseño endurecido completo. Lo normal para órbita geoestacionaria o misiones largas.', en: 'Fully hardened design. Normal for geostationary orbit or long missions.' } },
  { id: 'vault', massFrac: 0.12, cost: 48, factor: 0.22, krad: 3000,
    name: { es: 'Bóveda de electrónica', en: 'Electronics vault' },
    desc: { es: 'Una caja de aluminio de paredes gruesas con toda la aviónica dentro. La solución de Juno y Europa Clipper.', en: 'A thick-walled aluminium box with all avionics inside. The Juno and Europa Clipper solution.' } }
];

/* ------------------------------------------------------------------ *
 * LAUNCH VEHICLES                                                     *
 * capability in kg for each energy class                              *
 * ------------------------------------------------------------------ */
DATA.launchers = [
  { id: 'rideshare', cost: 2, reliability: 0.985, fairing: 0.6, onlyDest: ['leo-sso'],
    cap: { leo: 180, gto: 0, tli: 0, mars: 0, highc3: 0, jupiter: 0 },
    name: { es: 'Rideshare a órbita heliosíncrona', en: 'Sun-synchronous rideshare' },
    desc: { es: 'Carga secundaria en un vuelo ajeno. Dos millones de dólares, pero la órbita y la fecha las elige otro.',
            en: 'Secondary payload on somebody else’s flight. Two million dollars, but someone else picks the orbit and the date.' } },
  { id: 'electron', cost: 8.5, reliability: 0.92, fairing: 1.2,
    cap: { leo: 300, gto: 0, tli: 70, mars: 0, highc3: 0, jupiter: 0 },
    name: { es: 'Electron', en: 'Electron' },
    desc: { es: 'Lanzador dedicado para cargas muy pequeñas. Tú eliges la órbita, pero 300 kg es todo lo que hay.',
            en: 'Dedicated launcher for very small payloads. You pick the orbit, but 300 kg is all there is.' } },
  { id: 'falcon9', cost: 70, reliability: 0.985, fairing: 4.6,
    cap: { leo: 17500, gto: 5500, tli: 4000, mars: 2900, highc3: 1150, jupiter: 0 },
    name: { es: 'Falcon 9', en: 'Falcon 9' },
    desc: { es: 'El lanzador más usado del mundo y el de mejor historial. Su límite es la energía: no llega a Júpiter.',
            en: 'The world’s most-flown launcher with the best record. Its limit is energy: it cannot reach Jupiter.' } },
  { id: 'ariane64', cost: 125, reliability: 0.97, fairing: 5.4,
    cap: { leo: 21600, gto: 11500, tli: 8600, mars: 5000, highc3: 2300, jupiter: 2000 },
    name: { es: 'Ariane 64', en: 'Ariane 64' },
    desc: { es: 'Etapa superior criogénica con excelente rendimiento a alta energía y un cofre amplio.',
            en: 'Cryogenic upper stage with excellent high-energy performance and a roomy fairing.' } },
  { id: 'vulcan', cost: 140, reliability: 0.94, fairing: 5.4,
    cap: { leo: 27000, gto: 14000, tli: 12000, mars: 7000, highc3: 3500, jupiter: 3000 },
    name: { es: 'Vulcan Centaur VC6', en: 'Vulcan Centaur VC6' },
    desc: { es: 'La etapa Centaur es insuperable para trayectorias de alta energía. Historial de vuelo todavía corto.',
            en: 'The Centaur stage is unbeatable for high-energy trajectories. Flight record still short.' } },
  { id: 'falconheavy', cost: 170, reliability: 0.96, fairing: 5.2,
    cap: { leo: 63800, gto: 26700, tli: 16000, mars: 12000, highc3: 6500, jupiter: 6200 },
    name: { es: 'Falcon Heavy', en: 'Falcon Heavy' },
    desc: { es: 'Fuerza bruta a precio razonable. Es el cohete que lleva Europa Clipper y Psyche.',
            en: 'Brute force at a reasonable price. The rocket that carries Europa Clipper and Psyche.' } },
  { id: 'newglenn', cost: 115, reliability: 0.88, fairing: 7.0,
    cap: { leo: 45000, gto: 13000, tli: 7000, mars: 5000, highc3: 2000, jupiter: 1600 },
    name: { es: 'New Glenn', en: 'New Glenn' },
    desc: { es: 'El cofre más grande disponible y buen precio por kilo, pero su confiabilidad aún no está demostrada.',
            en: 'The largest fairing available and a good price per kilogram, but its reliability is still unproven.' } },
  { id: 'sls', cost: 2300, reliability: 0.93, fairing: 5.0, minProgram: 4,
    cap: { leo: 95000, gto: 42000, tli: 27000, mars: 20000, highc3: 14000, jupiter: 11000 },
    name: { es: 'SLS Bloque 1B', en: 'SLS Block 1B' },
    desc: { es: 'Capacidad sin rival a cualquier energía, a un costo que se come un programa Discovery completo.',
            en: 'Unrivalled capability at any energy, at a cost that swallows an entire Discovery program.' } }
];

DATA.c3Labels = {
  leo: { es: 'Órbita baja terrestre', en: 'Low Earth orbit' },
  gto: { es: 'Órbita de transferencia geoestacionaria', en: 'Geostationary transfer orbit' },
  tli: { es: 'Inyección translunar (C3 ≈ -2)', en: 'Trans-lunar injection (C3 ≈ -2)' },
  mars: { es: 'Transferencia interplanetaria (C3 ≈ 12)', en: 'Interplanetary transfer (C3 ≈ 12)' },
  highc3: { es: 'Alta energía (C3 ≈ 25)', en: 'High energy (C3 ≈ 25)' },
  jupiter: { es: 'Trayectoria joviana (C3 ≈ 80)', en: 'Jovian trajectory (C3 ≈ 80)' }
};

DATA.thermalLabels = {
  hot: { es: 'Caliente — se requiere capacidad de radiadores', en: 'Hot — radiator capacity required' },
  temperate: { es: 'Templado', en: 'Temperate' },
  cold: { es: 'Frío — los calefactores consumen potencia', en: 'Cold — heaters consume power' }
};

/* heater / cooler parasitic load, W, as f(dry mass, distance) */
DATA.thermalLoad = function (env, dryMass, au) {
  var base = Math.pow(dryMass, 0.62);
  if (env === 'cold') return base * (0.6 + 0.30 * Math.max(0, au - 1));
  if (env === 'hot') return base * 1.5;
  return base * 0.5;
};

/* ------------------------------------------------------------------ *
 * EDL (landers)                                                       *
 * ------------------------------------------------------------------ */
DATA.edl = [
  { id: 'basic', massFrac: 0.80, cost: 55, success: 0.62,
    name: { es: 'Airbags y paracaídas', en: 'Airbags and parachute' },
    desc: { es: 'Heredado de los años 90: barato, ligero y con poco control sobre dónde caes.', en: 'Inherited from the 1990s: cheap, light, and with little control over where you land.' } },
  { id: 'retro', massFrac: 1.10, cost: 120, success: 0.84,
    name: { es: 'Retropropulsión con radar', en: 'Radar-guided retropropulsion' },
    desc: { es: 'Descenso controlado con motores. Es lo que usó InSight y Phoenix.', en: 'Powered controlled descent. What InSight and Phoenix used.' } },
  { id: 'skycrane', massFrac: 2.20, cost: 260, success: 0.93,
    name: { es: 'Grúa aérea con navegación por terreno', en: 'Sky crane with terrain-relative navigation' },
    desc: { es: 'La solución de Curiosity y Perseverance: precisión de 40 m, y una masa de entrada enorme.', en: 'The Curiosity and Perseverance solution: 40 m precision, and an enormous entry mass.' } }
];

/* ------------------------------------------------------------------ *
 * MISSION CONTROL — the flight control consoles you staff on Earth.   *
 * Named after the positions in NASA's Mission Operations Control Room *
 * cost: fraction of the program's per-turn operations cost, per seat  *
 * ------------------------------------------------------------------ */
DATA.consoles = [
  { id: 'flight', required: true, cost: 0.10, icon: 'console',
    name: { es: 'Director de vuelo (FLIGHT)', en: 'Flight director (FLIGHT)' },
    desc: { es: 'Tiene la última palabra en cada decisión. Siempre presente.', en: 'Has the final word on every decision. Always on console.' } },
  { id: 'capcom', required: true, cost: 0.10, icon: 'rs',
    name: { es: 'CAPCOM', en: 'CAPCOM' },
    desc: { es: 'La única voz que habla con la nave. Tradicionalmente un astronauta.', en: 'The only voice that talks to the spacecraft. Traditionally an astronaut.' } },
  { id: 'fido', levels: 3, cost: 0.12, icon: 'orbit3d',
    name: { es: 'Navegación y dinámica de vuelo (FIDO)', en: 'Navigation and flight dynamics (FIDO)' },
    desc: { es: 'Determina la órbita con el rastreo desde Tierra y diseña las maniobras. Más navegantes = correcciones más precisas y menos propelente gastado.',
            en: 'Determines the orbit from ground tracking and designs the burns. More navigators = more precise corrections and less propellant spent.' } },
  { id: 'gnc', cost: 0.12, icon: 'target',
    name: { es: 'Guiado y control de actitud (GNC)', en: 'Guidance and attitude control (GNC)' },
    desc: { es: 'Ruedas de reacción, giróscopos y sensores estelares. Da soluciones más baratas cuando fallan.',
            en: 'Reaction wheels, gyros and star trackers. Offers cheaper fixes when they fail.' } },
  { id: 'eecom', cost: 0.12, icon: 'battery',
    name: { es: 'Energía y térmico (EECOM)', en: 'Power and thermal (EECOM)' },
    desc: { es: 'Vigila paneles, baterías y calefactores. Reduce 40% el daño permanente de potencia.',
            en: 'Watches arrays, batteries and heaters. Cuts permanent power damage by 40%.' } },
  { id: 'inco', cost: 0.12, icon: 'dish',
    name: { es: 'Comunicaciones (INCO)', en: 'Communications (INCO)' },
    desc: { es: 'Planifica los pases de antena y el enlace. +8% de datos bajados y menos errores de comandos.',
            en: 'Plans antenna passes and the link. +8% data downlinked and fewer command errors.' } },
  { id: 'sci', cost: 0.12, icon: 'cam',
    name: { es: 'Operaciones científicas (SCI)', en: 'Science operations (SCI)' },
    desc: { es: 'Planifica las observaciones. +8% de ciencia y aprovecha mejor las oportunidades.',
            en: 'Plans the observations. +8% science and makes more of opportunities.' } }
];

/* ------------------------------------------------------------------ *
 * OPERATIONS EVENTS                                                   *
 * weight: relative probability. env: restricts to destinations.       *
 * ------------------------------------------------------------------ */
DATA.events = [
  {
    id: 'flare', weight: 10, kind: { es: 'Clima espacial', en: 'Space weather' },
    title: { es: 'Fulguración solar clase X', en: 'X-class solar flare' },
    text: { es: 'Los monitores de partículas se saturan. Si mantienes los instrumentos encendidos arriesgas un latch-up permanente; si entras en modo seguro pierdes el turno completo de ciencia.',
            en: 'The particle monitors saturate. Keeping instruments powered risks a permanent latch-up; entering safe mode costs you a full turn of science.' },
    choices: [
      { label: { es: 'Entrar en modo seguro', en: 'Enter safe mode' }, note: { es: 'Sin ciencia este turno, sin riesgo', en: 'No science this turn, no risk' }, effect: { scienceMult: 0, dlMult: 0.4 } },
      { label: { es: 'Seguir observando', en: 'Keep observing' }, note: { es: '40% de probabilidad de perder un instrumento', en: '40% chance of losing one instrument' }, effect: { riskInstrument: 0.4 } }
    ]
  },
  {
    id: 'wheel', weight: 8, kind: { es: 'Falla de subsistema', en: 'Subsystem failure' },
    title: { es: 'Rueda de reacción degradada', en: 'Reaction wheel degraded' },
    text: { es: 'Una de las cuatro ruedas muestra fricción creciente. Puedes operar con tres a costa de precisión de puntería, o pagar una campaña de recalibración.',
            en: 'One of four wheels shows rising friction. You can operate on three at the cost of pointing precision, or pay for a recalibration campaign.' },
    staff: 'gnc', staffChoice: { label: { es: 'Equipo GNC: control con 3 ruedas y magnetopares', en: 'GNC team: 3-wheel control with magnetorquers' }, note: { es: 'Imagen −10% permanente, sin costo', en: 'Imaging −10% permanently, no cost' }, effect: { permImagingMult: 0.9 } },
    choices: [
      { label: { es: 'Operar con tres ruedas', en: 'Operate on three wheels' }, note: { es: 'Datos de imagen −35% el resto de la misión', en: 'Imaging data −35% for the rest of the mission' }, effect: { permImagingMult: 0.65 } },
      { label: { es: 'Campaña de recalibración', en: 'Recalibration campaign' }, note: { es: '−$14M y medio turno sin ciencia', en: '−$14M and half a turn without science' }, effect: { cost: 14, scienceMult: 0.5 } }
    ]
  },
  {
    id: 'mmod', weight: 7, kind: { es: 'Daño físico', en: 'Physical damage' },
    title: { es: 'Impacto de micrometeorito', en: 'Micrometeoroid impact' },
    text: { es: 'Un impacto en el ala solar reduce la generación de potencia de forma permanente. No hay nada que decidir, solo adaptarse.',
            en: 'An impact on the solar wing permanently reduces power generation. There is nothing to decide, only to adapt.' },
    choices: [
      { label: { es: 'Registrar y continuar', en: 'Log it and continue' }, note: { es: 'Potencia generada −7% permanente', en: 'Generated power −7% permanently' }, effect: { arrayDamage: 0.07 } }
    ]
  },
  {
    id: 'dsnbusy', weight: 9, kind: { es: 'Operaciones terrestres', en: 'Ground operations' },
    title: { es: 'Red de Espacio Profundo sobresuscrita', en: 'Deep Space Network oversubscribed' },
    text: { es: 'Una misión de clase Flagship en fase crítica se queda con tus pases. Puedes aceptar la pérdida o comprar tiempo de emergencia.',
            en: 'A flagship mission in a critical phase takes your passes. You can accept the loss or buy emergency time.' },
    staff: 'inco', staffChoice: { label: { es: 'Equipo INCO: negociar un pase compartido', en: 'INCO team: negotiate a shared pass' }, note: { es: 'Transmisión −20% este turno, sin costo', en: 'Downlink −20% this turn, no cost' }, effect: { dlMult: 0.8 } },
    choices: [
      { label: { es: 'Aceptar la reprogramación', en: 'Accept the rescheduling' }, note: { es: 'Transmisión −55% este turno', en: 'Downlink −55% this turn' }, effect: { dlMult: 0.45 } },
      { label: { es: 'Comprar tiempo de emergencia', en: 'Buy emergency time' }, note: { es: '−$9M, enlace nominal', en: '−$9M, nominal link' }, effect: { cost: 9 } }
    ]
  },
  {
    id: 'memory', weight: 6, kind: { es: 'Anomalía de aviónica', en: 'Avionics anomaly' },
    title: { es: 'Corrupción de la memoria masiva', en: 'Mass memory corruption' },
    text: { es: 'Un error de bit único corrompió un bloque de la memoria de estado sólido. Los datos que no habías bajado todavía están en riesgo.',
            en: 'A single-bit error corrupted a block of the solid-state memory. The data you had not downlinked yet is at risk.' },
    choices: [
      { label: { es: 'Reiniciar la memoria', en: 'Reinitialise the memory' }, note: { es: 'Pierdes 45% de los datos almacenados', en: 'You lose 45% of stored data' }, effect: { storageLoss: 0.45 } },
      { label: { es: 'Recuperación por software', en: 'Software recovery' }, note: { es: '−$5M, pierdes 12% y un turno de ciencia a la mitad', en: '−$5M, lose 12% and half a turn of science' }, effect: { cost: 5, storageLoss: 0.12, scienceMult: 0.5 } }
    ]
  },
  {
    id: 'budgetcut', weight: 6, kind: { es: 'Presupuesto', en: 'Budget' },
    title: { es: 'Recorte presupuestario del congreso', en: 'Congressional budget cut' },
    text: { es: 'La fase de operaciones extendidas recibe un recorte. Reduce el equipo de operaciones o reduce la ciencia.',
            en: 'The extended operations phase takes a cut. Shrink the operations team or shrink the science.' },
    choices: [
      { label: { es: 'Reducir el equipo de operaciones', en: 'Shrink the operations team' }, note: { es: 'Ciencia −25% el resto de la misión', en: 'Science −25% for the rest of the mission' }, effect: { permScienceMult: 0.75 } },
      { label: { es: 'Absorber el recorte', en: 'Absorb the cut' }, note: { es: '−$22M del presupuesto restante', en: '−$22M from remaining budget' }, effect: { cost: 22 } }
    ]
  },
  {
    id: 'leak', weight: 5, kind: { es: 'Propulsión', en: 'Propulsion' },
    title: { es: 'Fuga en una válvula de propelente', en: 'Propellant valve leak' },
    text: { es: 'La presión del tanque cae más rápido de lo previsto. Aislar la rama afectada cuesta redundancia; dejarla cuesta propelente.',
            en: 'Tank pressure is dropping faster than predicted. Isolating the affected branch costs redundancy; leaving it costs propellant.' },
    choices: [
      { label: { es: 'Aislar la rama', en: 'Isolate the branch' }, note: { es: 'Pierdes 8% del propelente restante', en: 'Lose 8% of remaining propellant' }, effect: { propLoss: 0.08 } },
      { label: { es: 'Seguir usándola y vigilar', en: 'Keep using it and monitor' }, note: { es: '25% de probabilidad de perder 30% del propelente', en: '25% chance of losing 30% of propellant' }, effect: { gamble: { p: 0.25, propLoss: 0.30 } } }
    ]
  },
  {
    id: 'patch', weight: 6, kind: { es: 'Oportunidad', en: 'Opportunity' },
    title: { es: 'Parche de compresión de datos disponible', en: 'Data compression patch available' },
    text: { es: 'El equipo en Tierra desarrolló un compresor sin pérdidas mejor. Subirlo y validarlo consume un turno de ciencia.',
            en: 'The ground team developed a better lossless compressor. Uploading and validating it costs a turn of science.' },
    choices: [
      { label: { es: 'Subir el parche', en: 'Upload the patch' }, note: { es: 'Ciencia 0 este turno, enlace +22% permanente', en: 'No science this turn, link +22% permanently' }, effect: { scienceMult: 0, permDlMult: 1.22 } },
      { label: { es: 'Rechazar, seguir observando', en: 'Decline, keep observing' }, note: { es: 'Sin cambios', en: 'No change' }, effect: {} }
    ]
  },
  {
    id: 'target', weight: 7, kind: { es: 'Oportunidad científica', en: 'Science opportunity' },
    title: { es: 'Objetivo de oportunidad detectado', en: 'Target of opportunity detected' },
    text: { es: 'Un fenómeno transitorio aparece en el campo de visión. Reapuntar rompe el plan de observación, pero la ciencia es irrepetible.',
            en: 'A transient phenomenon appears in the field of view. Repointing breaks the observation plan, but the science is unrepeatable.' },
    staff: 'sci', staffChoice: { label: { es: 'Equipo SCI: observación rápida planificada', en: 'SCI team: planned quick-look observation' }, note: { es: '+110 pts de ciencia, propelente −2%', en: '+110 science pts, propellant −2%' }, effect: { bonusScience: 110, propLoss: 0.02 } },
    choices: [
      { label: { es: 'Reapuntar de inmediato', en: 'Repoint immediately' }, note: { es: '+90 pts de ciencia bonus, propelente −4%', en: '+90 bonus science pts, propellant −4%' }, effect: { bonusScience: 90, propLoss: 0.04 } },
      { label: { es: 'Mantener el plan nominal', en: 'Keep the nominal plan' }, note: { es: 'Sin cambios', en: 'No change' }, effect: {} }
    ]
  },
  {
    id: 'latchup', weight: 7, kind: { es: 'Radiación', en: 'Radiation' }, radMin: 50,
    title: { es: 'Latch-up en un instrumento', en: 'Instrument latch-up' },
    text: { es: 'Un ion pesado dejó un instrumento sin responder. Un ciclo de potencia podría recuperarlo, o podría ser el final de ese instrumento.',
            en: 'A heavy ion left an instrument unresponsive. A power cycle might recover it, or it might be the end of that instrument.' },
    staff: 'eecom', staffChoice: { label: { es: 'Equipo EECOM: ciclo de potencia controlado', en: 'EECOM team: controlled power cycle' }, note: { es: '85% de recuperación, ciencia −20% este turno', en: '85% recovery, science −20% this turn' }, effect: { scienceMult: 0.8, gamble: { p: 0.15, killInstrument: true } } },
    choices: [
      { label: { es: 'Ciclo de potencia inmediato', en: 'Immediate power cycle' }, note: { es: '65% de recuperación, 35% pérdida definitiva', en: '65% recovery, 35% permanent loss' }, effect: { gamble: { p: 0.35, killInstrument: true } } },
      { label: { es: 'Diagnóstico lento desde Tierra', en: 'Slow diagnosis from the ground' }, note: { es: '−$8M, 90% de recuperación, medio turno sin ciencia', en: '−$8M, 90% recovery, half a turn without science' }, effect: { cost: 8, scienceMult: 0.5, gamble: { p: 0.10, killInstrument: true } } }
    ]
  },
  {
    id: 'thermal', weight: 5, kind: { es: 'Térmico', en: 'Thermal' },
    title: { es: 'Degradación de los calefactores', en: 'Heater degradation' },
    text: { es: 'Una zona del bus se está enfriando más de lo previsto. Subir la potencia de calefacción quita vatios a la ciencia.',
            en: 'A zone of the bus is running colder than predicted. Raising heater power takes watts away from science.' },
    staff: 'eecom', staffChoice: { label: { es: 'Equipo EECOM: reprogramar los ciclos de calefacción', en: 'EECOM team: reprogram the heater duty cycles' }, note: { es: 'Potencia útil −4% permanente', en: 'Usable power −4% permanently' }, effect: { permPowerMult: 0.96 } },
    choices: [
      { label: { es: 'Aumentar calefacción', en: 'Increase heating' }, note: { es: 'Potencia útil −10% permanente', en: 'Usable power −10% permanently' }, effect: { permPowerMult: 0.90 } },
      { label: { es: 'Aceptar el riesgo térmico', en: 'Accept the thermal risk' }, note: { es: '30% de perder un instrumento', en: '30% chance of losing an instrument' }, effect: { riskInstrument: 0.30 } }
    ]
  },
  {
    id: 'dustdevil', weight: 6, kind: { es: 'Entorno', en: 'Environment' }, onlyDest: ['mars-surface'],
    title: { es: 'Polvo acumulado en los paneles', en: 'Dust accumulation on the arrays' },
    text: { es: 'Meses de deposición de polvo redujeron la potencia. Un remolino de polvo podría limpiarlos… o podría no pasar nunca.',
            en: 'Months of dust deposition have cut your power. A dust devil might clean them... or might never come.' },
    choices: [
      { label: { es: 'Esperar un evento de limpieza', en: 'Wait for a cleaning event' }, note: { es: '45% de recuperar la potencia, 55% de perder otro 12%', en: '45% power recovery, 55% chance of losing another 12%' }, effect: { gamble: { p: 0.55, arrayDamage: 0.12 }, elseArrayHeal: 0.08 } },
      { label: { es: 'Entrar en modo de baja potencia', en: 'Enter low-power mode' }, note: { es: 'Ciencia −40% permanente, sin más pérdida de potencia', en: 'Science −40% permanently, no further power loss' }, effect: { permScienceMult: 0.60 } }
    ]
  },
  {
    id: 'extend', weight: 5, kind: { es: 'Oportunidad', en: 'Opportunity' },
    title: { es: 'Oferta de misión extendida', en: 'Extended mission offer' },
    text: { es: 'La nave está sana y el comité ofrece financiar observaciones adicionales si aceptas un objetivo nuevo fuera del plan original.',
            en: 'The spacecraft is healthy and the review board offers to fund extra observations if you accept a new objective outside the original plan.' },
    choices: [
      { label: { es: 'Aceptar la extensión', en: 'Accept the extension' }, note: { es: '+$30M de presupuesto, ciencia +12% permanente', en: '+$30M budget, science +12% permanently' }, effect: { cost: -30, permScienceMult: 1.12 } },
      { label: { es: 'Mantener el alcance original', en: 'Keep the original scope' }, note: { es: 'Sin cambios', en: 'No change' }, effect: {} }
    ]
  },
  {
    id: 'gyro', weight: 5, kind: { es: 'Software', en: 'Software' },
    title: { es: 'Reinicio inesperado del computador de vuelo', en: 'Unexpected flight computer reset' },
    text: { es: 'La nave despertó en modo seguro sin causa clara. Hay que decidir cuánto esfuerzo invertir en entender por qué.',
            en: 'The spacecraft woke up in safe mode with no clear cause. You must decide how much effort to spend understanding why.' },
    staff: 'gnc', staffChoice: { label: { es: 'Equipo GNC: reconfigurar la unidad inercial', en: 'GNC team: reconfigure the inertial unit' }, note: { es: '−$2M, sin perder ciencia, menos anomalías', en: '−$2M, no science lost, fewer anomalies' }, effect: { cost: 2, permAnomalyMult: 0.85 } },
    choices: [
      { label: { es: 'Investigación a fondo', en: 'Full investigation' }, note: { es: '−$6M y un turno sin ciencia, pero reduce anomalías futuras', en: '−$6M and a turn without science, but fewer future anomalies' }, effect: { cost: 6, scienceMult: 0, permAnomalyMult: 0.7 } },
      { label: { es: 'Reanudar operaciones ya', en: 'Resume operations now' }, note: { es: 'Transmisión −30% este turno', en: 'Downlink −30% this turn' }, effect: { dlMult: 0.7 } }
    ]
  },
  {
    id: 'conjunction', weight: 8, kind: { es: 'Basura espacial', en: 'Space debris' }, onlyDest: ['leo-sso', 'geo-relay'],
    title: { es: 'Alerta de conjunción con basura espacial', en: 'Space debris conjunction alert' },
    text: { es: 'El radar de vigilancia espacial predice que una etapa de cohete abandonada pasará a 180 m de tu nave en 30 horas. La probabilidad de choque es 1 en 3000.',
            en: 'Space surveillance radar predicts an abandoned rocket stage will pass 180 m from your spacecraft in 30 hours. The collision probability is 1 in 3000.' },
    staff: 'fido', staffChoice: { label: { es: 'Equipo FIDO: maniobra mínima calculada', en: 'FIDO team: computed minimum burn' }, note: { es: 'Propelente −1%, ciencia −10% este turno', en: 'Propellant −1%, science −10% this turn' }, effect: { propLoss: 0.01, scienceMult: 0.9 } },
    choices: [
      { label: { es: 'Maniobra de evasión', en: 'Avoidance manoeuvre' }, note: { es: 'Propelente −3%, ciencia −30% este turno', en: 'Propellant −3%, science −30% this turn' }, effect: { propLoss: 0.03, scienceMult: 0.7 } },
      { label: { es: 'Aceptar el riesgo', en: 'Accept the risk' }, note: { es: '6% de probabilidad de impacto: paneles −35% y un instrumento perdido', en: '6% impact chance: arrays −35% and one instrument lost' }, effect: { gamble: { p: 0.06, arrayDamage: 0.35, killInstrument: true } } }
    ]
  },
  {
    id: 'los', weight: 6, kind: { es: 'Comunicaciones', en: 'Communications' },
    title: { es: 'Pérdida de señal', en: 'Loss of signal' },
    text: { es: 'La nave dejó de responder en el pase programado. Puede estar en modo seguro con la antena mal apuntada.',
            en: 'The spacecraft did not answer at the scheduled pass. It may be in safe mode with the antenna mispointed.' },
    staff: 'inco', staffChoice: { label: { es: 'Equipo INCO: comandar por la antena de baja ganancia', en: 'INCO team: command through the low-gain antenna' }, note: { es: 'Transmisión −50% este turno, sin costo', en: 'Downlink −50% this turn, no cost' }, effect: { dlMult: 0.5 } },
    choices: [
      { label: { es: 'Esperar la recuperación autónoma', en: 'Wait for autonomous recovery' }, note: { es: 'Sin transmisión y ciencia −50% este turno', en: 'No downlink and science −50% this turn' }, effect: { dlMult: 0, scienceMult: 0.5 } },
      { label: { es: 'Barrido de emergencia con la antena de 70 m', en: 'Emergency sweep with the 70 m dish' }, note: { es: '−$6M, transmisión −40% este turno', en: '−$6M, downlink −40% this turn' }, effect: { cost: 6, dlMult: 0.6 } }
    ]
  },
  {
    id: 'cmd', weight: 6, kind: { es: 'Error humano', en: 'Human error' }, lessWith: 'inco',
    title: { es: 'Secuencia de comandos con un error', en: 'Command sequence with an error' },
    text: { es: 'Una secuencia ya enviada desde Tierra tiene una tabla de apuntamiento equivocada: en 6 horas un instrumento podría mirar directo al Sol.',
            en: 'A sequence already uplinked from the ground has a wrong pointing table: in 6 hours an instrument could stare straight at the Sun.' },
    staff: 'sci', staffChoice: { label: { es: 'Equipo SCI: corregir solo la tabla de apuntamiento', en: 'SCI team: patch only the pointing table' }, note: { es: 'Ciencia −15% este turno', en: 'Science −15% this turn' }, effect: { scienceMult: 0.85 } },
    choices: [
      { label: { es: 'Abortar la secuencia y replanificar', en: 'Abort the sequence and re-plan' }, note: { es: 'Ciencia −60% este turno', en: 'Science −60% this turn' }, effect: { scienceMult: 0.4 } },
      { label: { es: 'Dejarla correr y vigilar', en: 'Let it run and watch' }, note: { es: '25% de dañar un instrumento', en: '25% chance of damaging an instrument' }, effect: { gamble: { p: 0.25, killInstrument: true } } }
    ]
  },
  {
    id: 'battery', weight: 5, kind: { es: 'Energía', en: 'Power' },
    title: { es: 'Falla de una celda de batería', en: 'Battery cell failure' },
    text: { es: 'Una celda de la batería quedó en cortocircuito. Durante los eclipses la nave tendrá menos energía.',
            en: 'One battery cell shorted. During eclipses the spacecraft will have less energy.' },
    staff: 'eecom', staffChoice: { label: { es: 'Equipo EECOM: rebalancear la batería', en: 'EECOM team: rebalance the battery' }, note: { es: 'Ciencia −4% permanente', en: 'Science −4% permanently' }, effect: { permScienceMult: 0.96 } },
    choices: [
      { label: { es: 'Reducir la profundidad de descarga', en: 'Reduce the depth of discharge' }, note: { es: 'Ciencia −12% permanente', en: 'Science −12% permanently' }, effect: { permScienceMult: 0.88 } },
      { label: { es: 'Puentear la celda', en: 'Bypass the cell' }, note: { es: '30% de probabilidad de perder 20% de la potencia', en: '30% chance of losing 20% of power' }, effect: { gamble: { p: 0.3, arrayDamage: 0.2 } } }
    ]
  },
  {
    id: 'storm', weight: 6, kind: { es: 'Clima espacial', en: 'Space weather' }, onlyDest: ['leo-sso'],
    title: { es: 'Tormenta geomagnética', en: 'Geomagnetic storm' },
    text: { es: 'Una eyección de masa coronal calentó la alta atmósfera. El arrastre se multiplicó y la órbita baja más rápido.',
            en: 'A coronal mass ejection heated the upper atmosphere. Drag multiplied and the orbit is decaying faster.' },
    staff: 'fido', staffChoice: { label: { es: 'Equipo FIDO: subir la órbita en el momento óptimo', en: 'FIDO team: raise the orbit at the optimal time' }, note: { es: 'Propelente −2,5%', en: 'Propellant −2.5%' }, effect: { propLoss: 0.025 } },
    choices: [
      { label: { es: 'Subir la órbita ya', en: 'Raise the orbit now' }, note: { es: 'Propelente −6%', en: 'Propellant −6%' }, effect: { propLoss: 0.06 } },
      { label: { es: 'Aceptar una órbita más baja', en: 'Accept a lower orbit' }, note: { es: 'Ciencia −10% permanente (cobertura distinta)', en: 'Science −10% permanently (different coverage)' }, effect: { permScienceMult: 0.9 } }
    ]
  },
  {
    id: 'startracker', weight: 5, kind: { es: 'Guiado', en: 'Guidance' },
    title: { es: 'Sensor estelar cegado', en: 'Star tracker blinded' },
    text: { es: 'Un reflejo del Sol cegó el sensor estelar y la nave no sabe con precisión hacia dónde apunta.',
            en: 'Sun glint blinded the star tracker and the spacecraft no longer knows precisely where it is pointing.' },
    staff: 'gnc', staffChoice: { label: { es: 'Equipo GNC: cambiar al sensor de respaldo', en: 'GNC team: switch to the backup tracker' }, note: { es: 'Ciencia −10% este turno', en: 'Science −10% this turn' }, effect: { scienceMult: 0.9 } },
    choices: [
      { label: { es: 'Operar solo con giróscopos', en: 'Fly on gyros only' }, note: { es: 'Ciencia −40% este turno', en: 'Science −40% this turn' }, effect: { scienceMult: 0.6 } },
      { label: { es: 'Apuntamiento seguro al Sol', en: 'Safe Sun-pointing' }, note: { es: 'Ciencia −70% este turno, sin riesgo', en: 'Science −70% this turn, no risk' }, effect: { scienceMult: 0.3 } }
    ]
  }
];

/* lookup helpers */
DATA.find = function (list, id) { for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i]; return null; };
