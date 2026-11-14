# ORBITAL NEXUS

**An interactive space mission design game.** Pick a destination, build the spacecraft,
fight for every watt and every gigabit, then operate the mission turn by turn while
space tries to break it.

NASA Space Apps Challenge — *Space Mission Design Game*.
Bilingual interface (Spanish / English), no build step, no dependencies.

---

## The challenge

> Designing a space mission requires careful consideration of competing demands,
> including mission objectives, spacecraft design, scientific instruments, launch
> vehicles, budgets, power, mass, communications and orbital constraints. For students
> who rarely have the chance to experience a complete mission from concept to operation,
> these trade-offs often remain abstract.

The word that matters in that brief is **abstract**. Everybody can recite that spacecraft
design is about trade-offs; almost nobody has felt one. ORBITAL NEXUS makes the trade-off
the gameplay: you cannot add an instrument without taking the mass from propellant, the
watts from the transmitter, or the money from the launch vehicle — and the game computes
what that costs you, using the same equations a real mission design team uses.

## What the game actually simulates

Six phases, and a decision in each one that can lose the mission:

| Phase | What you decide | What bites you |
|---|---|---|
| **1 · Mission** | Program class (budget + schedule) and destination | Each destination fixes the physics: Δv, distance, sunlight, radiation, eclipses |
| **2 · Platform** | Bus, solar arrays or RTG, battery, propulsion, propellant | The rocket equation, 1/r² solar power, and end-of-life array degradation |
| **3 · Science** | Which instruments to fly | Mass, watts and data volume all compete; objectives need *specific* instruments |
| **4 · Link** | Antenna, band, transmitter power, ground station, radiation shielding | A real link budget. A 0.6 m dish at Mars downlinks 4 kbps — your spectrometer makes 520 Gb/month |
| **5 · Launch** | Launch vehicle and development schedule | Energy class capability, fairing diameter, reliability, and the cost of rushing the test campaign |
| **6 · Operations** | Each turn: science vs. downlink vs. maintenance, and which instruments are powered | Solar flares, reaction wheel failures, memory overflow, oversubscribed DSN passes, budget cuts |

Then a **final report** scores science, engineering discipline, cost and survival, writes
a technical critique of your specific design, and names the real NASA mission yours most
resembles.

**The central lesson is deliberately brutal: only data you successfully downlink counts.**
A spectrometer that fills the memory and never transmits scores exactly zero.

## Nine destinations

Sun-synchronous LEO · geostationary orbit · low lunar orbit · Sun-Earth L2 ·
Mars orbit · Mars surface (with entry, descent and landing) · Venus orbit ·
near-Earth asteroid rendezvous · the Jupiter / Europa system.

They are not reskins of each other. At Europa you get 1/30th of the sunlight, a six-year
cruise and 2800 krad of radiation — fly it without an electronics vault and you will lose
every instrument before the mission ends (measured: 46 of 57 simulated missions). In LEO
the link is effectively free and the binding constraint is collection time and the eclipse
every 96 minutes.

## Running it

It is static HTML, CSS and JavaScript. No npm, no bundler, no server required.

```bash
git clone <this-repo>
cd orbital-nexus
# then just open index.html in a browser
```

With Laragon / XAMPP, drop the folder in your web root and visit `http://localhost/orbital-nexus`.
It also deploys as-is to GitHub Pages (Settings → Pages → deploy from branch root).

## Project layout

```
index.html              markup shell
assets/css/style.css    design system, light and dark
assets/js/i18n.js       ES / EN string table
assets/js/data.js       mission catalogue: destinations, buses, instruments, launchers, events
assets/js/engine.js     the engineering model — rocket equation, power, link budget, scoring
assets/js/app.js        state machine, interface, operations simulator
docs/MODEL.md           every equation and where its numbers come from
```

`engine.js` is deliberately separate from the interface and has no DOM dependency, so the
model can be tested, audited, or reused on its own.

## Is the physics real?

Simplified, but not invented. The rocket equation, the inverse-square solar power budget
and the telecom link budget are computed properly; masses, costs, launch vehicle
capabilities and radiation environments are anchored on public NASA and launch-provider
figures. [`docs/MODEL.md`](docs/MODEL.md) lists every equation, every constant, and the
places where the model knowingly simplifies — including the ones that would make a real
mission engineer wince.

A worked example of the model's honesty: a 2.5 m Ka-band antenna with a 100 W transmitter
to a DSN 34 m station, at 1.9 AU, computes to about 5 Mbps. Mars Reconnaissance Orbiter's
real Ka-band link sits in the same range for comparable hardware. Shrink that antenna to
0.6 m on X-band with a 20 W transmitter and the model returns 4.2 kbps — a factor of 1200
worse, which is exactly the cliff that makes antenna sizing a real decision rather than a
menu choice.

## Credits

Built for the NASA Space Apps Challenge by **Proyecto ORBITAL NEXUS**.

Reference data drawn from public NASA sources — planetary fact sheets, the JPL Deep Space
Network Telecommunications Link Design Handbook (810-005), NASA radioisotope power system
specifications, Launch Services Program vehicle performance data, and the public mission
pages for MRO, LRO, InSight, OSIRIS-REx, Magellan, JWST, GOES and Europa Clipper.

Released under the MIT licence.

---
---

# ORBITAL NEXUS (español)

**Un juego interactivo de diseño de misiones espaciales.** Elige un destino, construye la
nave, pelea por cada vatio y cada gigabit, y después opera la misión turno a turno
mientras el espacio intenta romperla.

NASA Space Apps Challenge — *Juego de diseño de misiones espaciales*.
Interfaz bilingüe (español / inglés), sin proceso de compilación, sin dependencias.

## El desafío

> El diseño de una misión espacial requiere una cuidadosa consideración de las demandas
> contrapuestas... Para los estudiantes que rara vez tienen la oportunidad de experimentar
> con una misión completa, desde el concepto hasta la operación, estas compensaciones
> suelen permanecer **abstractas**.

Esa es la palabra clave. Cualquiera puede recitar que diseñar una nave es cuestión de
compromisos; casi nadie los ha sentido. ORBITAL NEXUS convierte el compromiso en la
mecánica del juego: no puedes agregar un instrumento sin quitarle masa al propelente,
vatios al transmisor o dinero al cohete — y el juego calcula exactamente lo que eso te
cuesta, con las mismas ecuaciones que usa un equipo real de diseño de misiones.

## Qué simula el juego

Seis fases, y en cada una una decisión capaz de perder la misión:

| Fase | Qué decides | Qué te castiga |
|---|---|---|
| **1 · Misión** | Clase de programa (presupuesto + cronograma) y destino | Cada destino fija la física: Δv, distancia, luz solar, radiación, eclipses |
| **2 · Plataforma** | Bus, paneles solares o RTG, batería, propulsión, propelente | La ecuación del cohete, la potencia solar por 1/r² y la degradación de los paneles |
| **3 · Ciencia** | Qué instrumentos llevas | Masa, vatios y volumen de datos compiten entre sí; cada objetivo exige instrumentos *específicos* |
| **4 · Enlace** | Antena, banda, potencia de transmisión, estación terrena, blindaje | Un presupuesto de enlace real. Una antena de 0,6 m en Marte baja 4 kbps, y tu espectrómetro genera 520 Gb al mes |
| **5 · Lanzamiento** | Vehículo de lanzamiento y tiempo de desarrollo | Capacidad por clase de energía, diámetro del cofre, fiabilidad, y el precio de acortar las pruebas |
| **6 · Operaciones** | Cada turno: ciencia vs. transmisión vs. mantenimiento, y qué instrumentos enciendes | Fulguraciones solares, fallas de ruedas de reacción, memoria saturada, DSN sobresuscrita, recortes de presupuesto |

Después, un **informe final** puntúa ciencia, disciplina de ingeniería, costo y
supervivencia, escribe una crítica técnica de tu diseño concreto, y nombra la misión real
de la NASA a la que más se parece.

**La lección central es deliberadamente brutal: solo cuentan los datos que logras bajar a
Tierra.** Un espectrómetro que llena la memoria y nunca transmite vale exactamente cero.

## Nueve destinos

Órbita baja heliosíncrona · órbita geoestacionaria · órbita lunar baja · punto Sol-Tierra L2 ·
órbita de Marte · superficie de Marte (con entrada, descenso y aterrizaje) · órbita de Venus ·
rendezvous con asteroide cercano · sistema de Júpiter / Europa.

No son el mismo destino repintado. En Europa recibes 1/30 de la luz solar, un crucero de
seis años y 2800 krad de radiación: vuela sin bóveda de electrónica y perderás todos los
instrumentos antes de terminar (medido: 46 de 57 misiones simuladas). En órbita baja el
enlace es prácticamente gratis y lo que limita es el tiempo de observación y el eclipse
cada 96 minutos.

## Cómo ejecutarlo

Es HTML, CSS y JavaScript estáticos. Sin npm, sin empaquetador, sin servidor.

```bash
git clone <este-repo>
cd orbital-nexus
# y abre index.html en el navegador
```

Con Laragon o XAMPP, coloca la carpeta en tu raíz web y visita `http://localhost/orbital-nexus`.
También se publica tal cual en GitHub Pages (Settings → Pages → desde la raíz de la rama).

## ¿La física es real?

Simplificada, pero no inventada. La ecuación del cohete, el presupuesto de potencia solar
por el inverso del cuadrado y el presupuesto de enlace se calculan de verdad; masas,
costos, capacidades de lanzadores y entornos de radiación están anclados en datos públicos
de la NASA y de los proveedores de lanzamiento. [`docs/MODEL.md`](docs/MODEL.md) documenta
cada ecuación, cada constante y cada simplificación consciente del modelo.

## Créditos

Desarrollado para el NASA Space Apps Challenge por **Proyecto ORBITAL NEXUS**.
Licencia MIT.
