# The engineering model

Everything in this document is implemented in [`../assets/js/engine.js`](../assets/js/engine.js)
and parameterised in [`../assets/js/data.js`](../assets/js/data.js). The model has no DOM
dependency, so it can be tested and audited on its own.

The goal is not simulation fidelity — it is **correct intuition**. Every number below is
chosen so that a player who learns to design a good mission here has learned something
true about designing a real one.

---

## 1 · Mass budget and the rocket equation

Dry mass is built up from the parts, not assumed:

```
core_dry   = bus + payload + power_system + comms
shield     = shield_fraction × core_dry
prop_dry   = prop_base + prop_fraction × propellant        (tanks, valves, engine)
edl        = edl_fraction × (core_dry + shield + prop_dry) (landers only)
dry        = core_dry + shield + prop_dry + edl
launch     = dry + propellant
```

Available Δv is the Tsiolkovsky rocket equation:

```
Δv = Isp · g₀ · ln( (dry + propellant) / dry )
```

Required Δv is the destination's insertion manoeuvre plus station keeping accumulated
across the whole operations phase:

```
Δv_required = destination.dv + station_keeping_per_turn × turns
```

**Why this matters in play.** Propellant mass enters the mass ratio logarithmically but
the tank mass enters linearly, so high-Δv destinations punish low-Isp propulsion brutally.
A cold-gas CubeSat (Isp 65 s) cannot hold a lunar orbit no matter how much tankage you buy.
Station keeping is what kills players who ignore it: low lunar orbit is unstable because
of lunar mascons, so it bleeds 12 m/s per month, and 24 months of that is 288 m/s — more
than many players budget for the insertion itself.

**Simplifications.** Launch vehicle performance is tabulated by energy class rather than a
continuous C3 curve. Aerobraking is folded into the Mars insertion Δv as a flat discount
rather than modelled as a six-month campaign. Gravity assists are not modelled; instead
the Jupiter-class launch capability already reflects the mass that a real gravity-assist
trajectory delivers (Europa Clipper flew ~6 t on a Falcon Heavy via a Mars assist, which
is why the model's `jupiter` capability for that vehicle is 6200 kg and not the ~1 t a
direct trajectory would allow).

---

## 2 · Power budget

Solar array output falls with the square of heliocentric distance and degrades with time:

```
P_solar = (1361 / AU²) × area × η × packing × (1 − degradation)^years
          η = 0.28   packing = 0.78   degradation = 2.5 % / year
```

That yields roughly **297 W/m² at 1 AU** at the array level, which is in the right range
for modern triple-junction arrays after cell-to-array losses.

Radioisotope power is distance-independent and decays slowly:

```
P_rtg = units × 290 W × (1 − 0.016)^years
```

290 We per unit is GPHS-RTG class — the generator Cassini and New Horizons used, at three
units for Cassini. (The smaller MMRTG flown on Curiosity and Perseverance is ~110 We. The
model uses the larger class because the RTG option is gated to Flagship programs, where
the larger generator is the realistic choice.)

Loads are evaluated as three cases, and the margin is taken against the worst:

```
load_science  = bus_overhead + thermal + instruments
load_downlink = bus_overhead + thermal + TWTA_DC          TWTA_DC = RF_power / 0.55
load_cruise   = bus_overhead + thermal + electric_propulsion
margin        = P_end_of_life − max(the three)
```

Thermal parasitic load scales with the 0.62 power of dry mass (a surface-area-to-volume
proxy) and with distance from the Sun in cold environments:

```
cold:       m^0.62 × (0.6 + 0.30 × (AU − 1))
hot:        m^0.62 × 1.5                        (radiators, not heaters)
temperate:  m^0.62 × 0.5
```

Battery sizing is driven by eclipse duration, with a 70 % depth-of-discharge limit:

```
Wh_needed = (bus_overhead + thermal + 0.35 × instruments) × eclipse_hours / 0.7
```

**Why this matters in play.** At Europa, 1361/5.46² is 46 W/m² — one thirtieth of Earth's
insolation. Even the Flagship bus's 100 m² array ceiling yields under 1 kW, which is why
Europa Clipper's arrays are enormous and why in this game a 200 W Ka-band transmitter at
Jupiter forces you onto nuclear power or forces you to give up the transmitter. Meanwhile
Venus *gives* you nearly twice the power of Earth orbit and takes it back in radiator mass.

A design review in the real world wants roughly 30 % power margin at launch, because
arrays degrade and heater loads always come in high. The game scores you against that.

---

## 3 · Telecom link budget

Computed as a genuine link budget rather than a lookup table:

```
λ      = c / f
G_tx   = 0.60 × (π · D_antenna / λ)²
G_rx   = η_station × (π · D_station / λ)²
L_path = (4π · distance / λ)²
R      = P_tx · G_tx · G_rx · weather / (L_path · k · T_s · (Eb/N0) · margin)
```

with `k = 1.380649e-23`, system noise temperature `T_s` of 25–36 K depending on band, a
required `Eb/N0` of 4.0 linear (≈6 dB, consistent with modern turbo/LDPC coding) and 5 dB
of design margin. Ground station gains use real dish diameters: 13 m commercial, DSN 34 m,
DSN 70 m.

The result is then capped by allocated bandwidth, because near Earth you run out of
spectrum long before you run out of signal-to-noise:

```
S-band 2 Mbps · X-band 20 Mbps · Ka-band 50 Mbps
```

Finally, capacity per turn uses the station's available hours scaled by a per-destination
contact factor — a LEO spacecraft is above the horizon only a few minutes per pass:

```
Gb_per_turn = R × hours × contact_factor × 3600 / 1e9
```

**Sanity checks against reality.** A 2.5 m Ka antenna, 100 W RF, to DSN 34 m at 1.9 AU
computes to ≈5 Mbps, which is the right range for Mars Reconnaissance Orbiter-class
hardware. At Sun-Earth L2 the model is bandwidth-limited to ≈9.9 Tb/month, close to
JWST's real ~57 GB/day. The same 100 W behind a 0.6 m X-band dish at Mars yields 4.2 kbps
— a factor of 1200 worse, and the single most instructive number in the game.

**Two real constraints the model enforces.** Ka-band is unavailable on the DSN 70 m
antennas (they are X-band), so the highest-gain spacecraft antenna cannot be paired with
the largest ground antenna. And the spacecraft antenna must fit inside the launch
vehicle's fairing.

**Simplifications.** No pointing-loss model, no atmospheric elevation dependence beyond a
flat per-band weather factor, no relay through other orbiters (which is how Mars landers
really return their data), and one fixed design distance per destination rather than a
varying Earth–target range.

---

## 4 · Radiation

Each destination carries a total mission dose in krad; each shielding option carries a
qualification level. Overexposure acts two ways:

```
anomaly_probability ∝ clamp(dose / shield_rating, 0.25, 3)
per-turn part loss   = clamp((dose/shield_rating − 1) × 0.02, 0, 0.35)   when ratio > 1.5
```

**Why this matters in play.** Measured over 57 simulated Europa missions, flying unshielded
into 2800 krad lost every instrument before the end of the mission in 46 of them. The same
design behind an electronics vault lost none. The vault costs 12 % of dry mass and $48M —
which is precisely the trade Juno and Europa Clipper made.

---

## 5 · Schedule, cost and risk

Design complexity is accumulated from the choices the player actually made:

```
complexity = 1 + 0.6×Σ(instrument risk) + 0.5×bus_rank + electric(1.2)
             + rtg(1.0) + vault(0.8) + lander(2.0) + Ka(0.4)
dev_needed = 20 + 5.5 × complexity        months
readiness  = clamp(dev_months / dev_needed, 0.4, 1.4)
```

Shortening development below what the design needs raises both the commissioning failure
probability and the in-flight anomaly rate:

```
P(commission) = bus_reliability × (1 − 0.55 × max(0, 1 − readiness))
P(operate)    = P(launch) × P(commission) × P(EDL)
```

Cost is a straight rollup of hardware, launch, development burn rate and operations
(including ground station time per turn). The **remaining reserve becomes the in-flight
contingency fund**: when an event costs money, it comes out of that reserve, and a mission
that runs the reserve negative is cancelled. A design with zero reserve at launch dies to
the first anomaly — which is the entire argument for carrying reserves, made playable.

**Simplifications.** Launch windows are not modelled as discrete dates; schedule pressure
is expressed through development duration instead. Cost growth, the single most reliable
feature of real space programs, is modelled only through discrete in-flight events.

---

## 6 · Operations

One turn is one month. Each turn the player allocates time across science, downlink and
maintenance, and chooses which instruments are powered.

```
power_available = generation(t) × array_health × damage_factors
                  − bus_overhead − thermal − TWTA_DC × downlink_fraction
duty            = min(1, power_available / Σ instrument_power)

collected  = Σ instrument.data_rate × science_fraction × duty × modifiers
storage overflows at bus capacity — the excess is lost
downlinked = min(link_capacity × downlink_fraction, stored)
```

Science credit is granted **only for downlinked data**, tracked per instrument, and an
objective progresses only if every instrument type it requires has returned data.

Maintenance allocation lowers the anomaly probability. Fifteen event types fire with
weighted probability — solar flares, reaction wheel degradation, micrometeoroid impacts,
memory corruption, propellant leaks, DSN oversubscription, budget cuts, latch-ups, dust
accumulation on a Mars lander, and genuine opportunities — and almost all of them present
a real decision with no free option.

Missions end early on propellant exhaustion, budget exhaustion, or the loss of every
instrument.

---

## 7 · Scoring

| Component | Max | How it is earned |
|---|---|---|
| Science | sum of objective values | Fraction of each objective's required data actually downlinked |
| Engineering | 150 | Power margin (45), mass margin (30), Δv margin (30), link coverage (30), battery sizing (15) |
| Cost | 150 | Reserve held at launch |
| Survival | 100 | Fraction of planned turns operated |

Mass margin and cost reserve are scored as a **band, not a maximum**. Full credit sits near
22 % and falls away on both sides: a rocket flown half empty and a budget left half unspent
are design failures too, not caution. This is the one piece of scoring that players find
counter-intuitive and that mission designers find obvious.

The final report then runs a critique pass over the finished mission and reports, in plain
language, which specific decision cost the player the most — collection versus downlink
ratio, uncovered objectives, thin margins, insufficient shielding, undersized battery,
too many instruments, or a rushed schedule.

---

## Sources

Public NASA and launch-provider material, used as anchors for the model's constants:

- NASA/NSSDC planetary fact sheets — <https://nssdc.gsfc.nasa.gov/planetary/factsheet/>
- JPL Deep Space Network Telecommunications Link Design Handbook, 810-005 — <https://deepspace.jpl.nasa.gov/dsndocs/810-005/>
- NASA Radioisotope Power Systems — MMRTG and GPHS-RTG specifications
- NASA Launch Services Program launch vehicle performance data
- Published launch vehicle payload user guides (Falcon, Vulcan Centaur, Ariane 6, Electron, New Glenn, SLS)
- Discovery and New Frontiers program cost caps as announced in NASA Announcements of Opportunity
- Public mission pages and press kits: Mars Reconnaissance Orbiter, Lunar Reconnaissance
  Orbiter, InSight, OSIRIS-REx, Magellan, Juno, Europa Clipper, James Webb Space Telescope,
  GOES-R series, Landsat 9, PACE, CAPSTONE

Where a figure is a deliberate game-balance choice rather than a published value, this
document says so.
