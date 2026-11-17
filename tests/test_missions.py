"""Operaciones CRUD de la bitácora de misiones sobre SQLite."""
from conftest import LUIS, MISSION


def test_crear_mision_la_guarda_en_sqlite(do, query):
    do.register()
    page = do.create_mission().get_data(as_text=True)
    assert "Misión registrada" in page
    rows = query("SELECT name, program, destination, mass_kg, budget_musd, status FROM missions")
    assert rows == [{
        "name": "Orbitador Marte 1", "program": "discovery", "destination": "mars-orbit",
        "mass_kg": 850.0, "budget_musd": 600.0, "status": "en-diseno",
    }]


def test_listar_y_ver_detalle(do, client):
    do.register()
    do.create_mission()
    do.create_mission(name="Sonda Lunar", program="cubesat", destination="llo", budget_musd="30")
    listing = client.get("/misiones/").get_data(as_text=True)
    assert "Orbitador Marte 1" in listing and "Sonda Lunar" in listing
    detail = client.get("/misiones/1").get_data(as_text=True)
    assert "Cartografiar hielo bajo la superficie." in detail
    assert "80 % de 750 M USD" in detail


def test_filtrar_por_estado_y_buscar_por_nombre(do, client):
    do.register()
    do.create_mission()
    do.create_mission(name="Sonda Lunar", program="cubesat", destination="llo", budget_musd="30", status="lanzada")
    by_status = client.get("/misiones/?estado=lanzada").get_data(as_text=True)
    assert "Sonda Lunar" in by_status and "Orbitador Marte 1" not in by_status
    by_name = client.get("/misiones/?q=marte").get_data(as_text=True)
    assert "Orbitador Marte 1" in by_name and "Sonda Lunar" not in by_name
    assert "Ninguna misión coincide" in client.get("/misiones/?q=100%25").get_data(as_text=True)


def test_editar_mision_actualiza_el_registro(do, client, query):
    do.register()
    do.create_mission()
    changed = {**MISSION, "name": "Orbitador Marte 2", "mass_kg": "910,5", "status": "lanzada"}
    page = client.post("/misiones/1/editar", data=changed, follow_redirects=True).get_data(as_text=True)
    assert "Cambios guardados" in page
    assert query("SELECT name, mass_kg, status FROM missions WHERE id = 1") == [
        {"name": "Orbitador Marte 2", "mass_kg": 910.5, "status": "lanzada"}
    ]


def test_eliminar_mision_la_borra(do, client, query):
    do.register()
    do.create_mission()
    page = client.post("/misiones/1/eliminar", follow_redirects=True).get_data(as_text=True)
    assert "eliminada" in page
    assert query("SELECT id FROM missions") == []
    assert client.get("/misiones/1").status_code == 404


def test_validacion_rechaza_datos_incorrectos(do, query):
    do.register()
    assert "entre 3 y 80 caracteres" in do.create_mission(name="X").get_data(as_text=True)
    assert "supera el tope de Clase Discovery" in do.create_mission(budget_musd="900").get_data(as_text=True)
    assert "La masa debe estar" in do.create_mission(mass_kg="cien").get_data(as_text=True)
    assert "Elige un destino" in do.create_mission(destination="pluton").get_data(as_text=True)
    assert query("SELECT id FROM missions") == []


def test_destino_lejano_exige_un_programa_mayor(do, query):
    do.register()
    page = do.create_mission(destination="titan").get_data(as_text=True)
    assert "exige al menos Clase New Frontiers" in page
    assert query("SELECT id FROM missions") == []
    do.create_mission(destination="titan", program="newfrontiers", budget_musd="1300")
    assert len(query("SELECT id FROM missions")) == 1


def test_el_texto_del_usuario_se_muestra_escapado(do, client):
    do.register()
    do.create_mission(name="<script>alert(1)</script>")
    page = client.get("/misiones/").get_data(as_text=True)
    assert "<script>alert(1)</script>" not in page
    assert "&lt;script&gt;alert(1)&lt;/script&gt;" in page


def test_un_usuario_no_puede_tocar_misiones_ajenas(do, client, query):
    do.register()
    do.create_mission()
    do.logout()
    do.register(LUIS)
    assert "Orbitador Marte 1" not in client.get("/misiones/").get_data(as_text=True)
    assert client.get("/misiones/1").status_code == 403
    assert client.post("/misiones/1/editar", data={**MISSION, "name": "Robada"}).status_code == 403
    assert client.post("/misiones/1/eliminar").status_code == 403
    assert query("SELECT name FROM missions") == [{"name": "Orbitador Marte 1"}]
