"""Control de acceso por sesión y por rol, panel de administración y páginas públicas."""
import pytest

from conftest import ADMIN, ANA, LUIS


@pytest.mark.parametrize("path", ["/", "/simulador", "/ingresar", "/registro", "/salud"])
def test_paginas_publicas_responden(client, path):
    assert client.get(path).status_code == 200


def test_el_simulador_se_sirve_con_sus_archivos(client):
    page = client.get("/simulador").get_data(as_text=True)
    assert "assets/js/app.js" in page
    assert client.get("/assets/js/app.js").status_code == 200
    assert client.get("/assets/css/style.css").status_code == 200


@pytest.mark.parametrize("path", ["/misiones/", "/misiones/nueva", "/misiones/1", "/admin/usuarios"])
def test_sin_sesion_redirige_a_iniciar_sesion(client, path):
    response = client.get(path)
    assert response.status_code == 302
    assert response.headers["Location"].startswith("/ingresar")


def test_rol_explorer_no_entra_al_panel_de_administracion(do, client, query):
    do.register()
    assert client.get("/admin/usuarios").status_code == 403
    assert client.post("/admin/usuarios/1/rol", data={"role": "explorer"}).status_code == 403
    assert client.post("/admin/usuarios/1/eliminar").status_code == 403
    assert "Usuarios</a>" not in client.get("/").get_data(as_text=True)
    assert len(query("SELECT id FROM users")) == 2


def test_rol_admin_ve_usuarios_y_todas_las_misiones(do, client):
    do.register()
    do.create_mission()
    do.logout()
    do.login(ADMIN)
    users = client.get("/admin/usuarios").get_data(as_text=True)
    assert ANA["email"] in users and ADMIN["email"] in users
    missions = client.get("/misiones/").get_data(as_text=True)
    assert "Orbitador Marte 1" in missions and ANA["name"] in missions
    assert client.get("/misiones/1/editar").status_code == 200


def test_admin_cambia_el_rol_de_un_usuario(do, client, query):
    do.register()
    do.logout()
    do.login(ADMIN)
    ana_id = query("SELECT id FROM users WHERE email = ?", (ANA["email"],))[0]["id"]
    client.post(f"/admin/usuarios/{ana_id}/rol", data={"role": "admin"})
    assert query("SELECT role FROM users WHERE id = ?", (ana_id,)) == [{"role": "admin"}]
    do.logout()
    do.login()
    assert client.get("/admin/usuarios").status_code == 200


def test_admin_elimina_usuario_y_sus_misiones(do, client, query):
    do.register()
    do.create_mission()
    do.logout()
    do.login(ADMIN)
    ana_id = query("SELECT id FROM users WHERE email = ?", (ANA["email"],))[0]["id"]
    client.post(f"/admin/usuarios/{ana_id}/eliminar")
    assert query("SELECT id FROM users WHERE id = ?", (ana_id,)) == []
    assert query("SELECT id FROM missions") == []


def test_admin_no_puede_quitarse_el_rol_ni_eliminarse(do, client, query):
    do.login(ADMIN)
    admin_id = query("SELECT id FROM users WHERE email = ?", (ADMIN["email"],))[0]["id"]
    client.post(f"/admin/usuarios/{admin_id}/rol", data={"role": "explorer"})
    client.post(f"/admin/usuarios/{admin_id}/eliminar")
    assert query("SELECT role FROM users WHERE id = ?", (admin_id,)) == [{"role": "admin"}]


def test_sesion_de_una_cuenta_eliminada_deja_de_valer(do, client, app):
    do.register(LUIS)
    admin = app.test_client()
    admin.post("/ingresar", data=ADMIN)
    admin.post("/admin/usuarios/2/eliminar")
    assert client.get("/misiones/").status_code == 302


def test_pagina_inexistente_devuelve_404(client):
    response = client.get("/no-existe")
    assert response.status_code == 404
    assert "Página no encontrada" in response.get_data(as_text=True)
