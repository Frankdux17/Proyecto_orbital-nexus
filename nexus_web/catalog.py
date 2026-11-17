"""Catálogo del simulador (mismos ids y cifras que assets/js/data.js).

budget   = tope de presupuesto de la clase de programa, en millones de USD.
min_rank = clase mínima de programa que puede llegar a ese destino.
dv       = delta-v que debe aportar la nave tras la inyección, en km/s.
"""

PROGRAMS = {
    "cubesat": {"name": "Clase CubeSat", "rank": 0, "budget": 40},
    "smallsat": {"name": "Clase SmallSat", "rank": 1, "budget": 220},
    "discovery": {"name": "Clase Discovery", "rank": 2, "budget": 750},
    "newfrontiers": {"name": "Clase New Frontiers", "rank": 3, "budget": 1400},
    "flagship": {"name": "Clase Flagship", "rank": 4, "budget": 3600},
}

DESTINATIONS = {
    "leo-sso": {"name": "Órbita baja terrestre (heliosíncrona)", "min_rank": 0, "dv": 0.05},
    "geo-relay": {"name": "Órbita geoestacionaria", "min_rank": 1, "dv": 1.85},
    "llo": {"name": "Órbita lunar baja", "min_rank": 0, "dv": 1.05},
    "sel2": {"name": "Punto L2 Sol-Tierra", "min_rank": 2, "dv": 0.22},
    "mars-orbit": {"name": "Órbita de Marte", "min_rank": 1, "dv": 1.65},
    "mars-surface": {"name": "Superficie de Marte", "min_rank": 2, "dv": 0.35},
    "venus-orbit": {"name": "Órbita de Venus", "min_rank": 2, "dv": 2.1},
    "neo": {"name": "Asteroide cercano a la Tierra", "min_rank": 2, "dv": 2.45},
    "europa": {"name": "Europa (luna de Júpiter)", "min_rank": 3, "dv": 1.6},
    "psyche": {"name": "Asteroide Psyche", "min_rank": 2, "dv": 3.4},
    "titan": {"name": "Titán (luna de Saturno)", "min_rank": 3, "dv": 0.6},
}

STATUSES = {
    "borrador": "Borrador",
    "en-diseno": "En diseño",
    "lanzada": "Lanzada",
    "completada": "Completada",
}


def program_for_rank(rank):
    """Nombre de la clase de programa más pequeña con ese rango."""
    for prog in PROGRAMS.values():
        if prog["rank"] == rank:
            return prog["name"]
    return ""
