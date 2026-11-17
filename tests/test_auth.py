"""Gestión de usuarios: registro, inicio de sesión y cierre de sesión."""
from conftest import ANA, LUIS
from nexus_web import create_app


def test_registro_crea_cuenta_y_abre_sesion(do, query):
    page = do.register().get_data(as_text=True)
    assert "Cuenta creada" in page
    assert "Cerrar sesión" in page
    rows = query("SELECT name, role FROM users WHERE email = ?", (ANA["email"],))
    assert rows == [{"name": ANA["name"], "role": "explorer"}]


def test_la_contrasena_se_guarda_cifrada(do, query):
    do.register()
    stored = query("SELECT password_hash FROM users WHERE email = ?", (ANA["email"],))[0]["password_hash"]
    assert ANA["password"] not in stored
    assert stored.startswith(("scrypt:", "pbkdf2:"))


def test_registro_rechaza_correo_repetido(do, query):
    do.register()
    do.logout()
    page = do.register(name="Otra Ana").get_data(as_text=True)
    assert "Ya existe una cuenta con ese correo" in page
    assert len(query("SELECT id FROM users WHERE email = ?", (ANA["email"],))) == 1


def test_registro_valida_los_datos(do, query):
    assert "al menos 8 caracteres" in do.register(password="corta", confirm="corta").get_data(as_text=True)
    assert "no coinciden" in do.register(confirm="otra-clave-9").get_data(as_text=True)
    assert "correo válido" in do.register(email="sin-arroba").get_data(as_text=True)
    assert query("SELECT id FROM users WHERE role = 'explorer'") == []


def test_inicio_de_sesion_correcto(do):
    do.register()
    do.logout()
    page = do.login().get_data(as_text=True)
    assert "Sesión iniciada" in page
    assert ANA["name"] in page


def test_inicio_de_sesion_con_clave_incorrecta(do, client):
    do.register()
    do.logout()
    page = do.login(password="clave-equivocada").get_data(as_text=True)
    assert "no son correctos" in page
    assert client.get("/misiones/").status_code == 302


def test_inicio_de_sesion_con_correo_desconocido(do):
    assert "no son correctos" in do.login(LUIS).get_data(as_text=True)


def test_cierre_de_sesion(do, client):
    do.register()
    assert client.get("/misiones/").status_code == 200
    assert "Sesión cerrada" in do.logout().get_data(as_text=True)
    assert client.get("/misiones/").status_code == 302


def test_despues_de_ingresar_vuelve_a_la_pagina_pedida_y_no_sale_del_sitio(do, client):
    do.register()
    do.logout()
    inside = client.post("/ingresar?next=/misiones/nueva", data={"email": ANA["email"], "password": ANA["password"]})
    assert inside.headers["Location"] == "/misiones/nueva"
    do.logout()
    outside = client.post("/ingresar?next=//sitio-ajeno.example", data={"email": ANA["email"], "password": ANA["password"]})
    assert outside.headers["Location"] == "/misiones/"


def test_formulario_sin_token_csrf_es_rechazado(tmp_path):
    app = create_app({"TESTING": True, "DATABASE": str(tmp_path / "csrf.db")})
    client = app.test_client()
    data = {**ANA, "confirm": ANA["password"]}
    assert client.post("/registro", data=data).status_code == 400
    client.get("/registro")
    with client.session_transaction() as session:
        token = session["csrf_token"]
    assert client.post("/registro", data={**data, "csrf_token": token}).status_code == 302
