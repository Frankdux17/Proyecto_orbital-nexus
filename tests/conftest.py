import os
import sys

import pytest

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), os.pardir)))

from nexus_web import create_app  # noqa: E402

ADMIN = {"email": "admin@nexus.test", "password": "clave-admin-1"}
ANA = {"name": "Ana Ríos", "email": "ana@nexus.test", "password": "clave-ana-1"}
LUIS = {"name": "Luis Paz", "email": "luis@nexus.test", "password": "clave-luis-1"}

MISSION = {
    "name": "Orbitador Marte 1",
    "program": "discovery",
    "destination": "mars-orbit",
    "objective": "Cartografiar hielo bajo la superficie.",
    "mass_kg": "850",
    "budget_musd": "600",
    "status": "en-diseno",
}


@pytest.fixture
def app(tmp_path):
    """Aplicación con una base SQLite nueva y vacía para cada prueba."""
    return create_app({
        "TESTING": True,
        "CSRF_ENABLED": False,
        "DATABASE": str(tmp_path / "test.db"),
        "ADMIN_EMAIL": ADMIN["email"],
        "ADMIN_PASSWORD": ADMIN["password"],
    })


@pytest.fixture
def client(app):
    return app.test_client()


class Actions:
    def __init__(self, client):
        self.client = client

    def register(self, user=ANA, **changes):
        data = {**user, "confirm": user["password"], **changes}
        return self.client.post("/registro", data=data, follow_redirects=True)

    def login(self, user=ANA, **changes):
        data = {"email": user["email"], "password": user["password"], **changes}
        return self.client.post("/ingresar", data=data, follow_redirects=True)

    def logout(self):
        return self.client.post("/salir", follow_redirects=True)

    def create_mission(self, **changes):
        return self.client.post("/misiones/nueva", data={**MISSION, **changes}, follow_redirects=True)


@pytest.fixture
def do(client):
    return Actions(client)


@pytest.fixture
def query(app):
    """Consulta directa a SQLite para comprobar lo que quedó guardado."""
    from nexus_web.db import get_db

    def run(sql, params=()):
        with app.app_context():
            return [dict(row) for row in get_db().execute(sql, params).fetchall()]

    return run
