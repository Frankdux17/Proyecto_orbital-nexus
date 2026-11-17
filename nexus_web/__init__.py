"""ORBITAL NEXUS — aplicación web (Flask + SQLite).

Envuelve el simulador de diseño de misiones con cuentas de usuario, roles y
una bitácora de misiones guardada en SQLite.
"""
import os
import secrets

from flask import Flask, abort, render_template, request, send_from_directory, session

from . import admin, auth, db, missions
from .catalog import DESTINATIONS, PROGRAMS

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), os.pardir))


def create_app(test_config=None):
    app = Flask(
        __name__,
        static_folder=os.path.join(ROOT, "assets"),
        static_url_path="/assets",
        instance_path=os.path.join(ROOT, "instance"),
    )
    app.config.from_mapping(
        SECRET_KEY=os.environ.get("SECRET_KEY", "dev-solo-para-uso-local"),
        DATABASE=os.environ.get("DATABASE", os.path.join(app.instance_path, "orbital_nexus.db")),
        ADMIN_EMAIL=os.environ.get("ADMIN_EMAIL"),
        ADMIN_PASSWORD=os.environ.get("ADMIN_PASSWORD"),
        CSRF_ENABLED=True,
        SESSION_COOKIE_SAMESITE="Lax",
        SESSION_COOKIE_SECURE=bool(os.environ.get("RENDER")),
    )
    if test_config:
        app.config.update(test_config)

    db_dir = os.path.dirname(app.config["DATABASE"])
    if db_dir:
        os.makedirs(db_dir, exist_ok=True)

    db.init_app(app)
    with app.app_context():
        db.init_db()
        db.ensure_admin(app.config["ADMIN_EMAIL"], app.config["ADMIN_PASSWORD"])

    @app.before_request
    def csrf_protect():
        if request.method == "POST" and app.config["CSRF_ENABLED"]:
            sent = request.form.get("csrf_token", "")
            expected = session.get("csrf_token", "")
            if not expected or not secrets.compare_digest(sent, expected):
                abort(400, description="El formulario caducó. Vuelve a cargar la página e inténtalo otra vez.")

    def csrf_token():
        if "csrf_token" not in session:
            session["csrf_token"] = secrets.token_hex(16)
        return session["csrf_token"]

    app.jinja_env.globals["csrf_token"] = csrf_token

    app.register_blueprint(auth.bp)
    app.register_blueprint(missions.bp)
    app.register_blueprint(admin.bp)

    @app.route("/")
    def home():
        conn = db.get_db()
        stats = {
            "usuarios": conn.execute("SELECT COUNT(*) FROM users").fetchone()[0],
            "misiones": conn.execute("SELECT COUNT(*) FROM missions").fetchone()[0],
            "destinos": len(DESTINATIONS),
            "programas": len(PROGRAMS),
        }
        return render_template("home.html", stats=stats)

    @app.route("/simulador")
    def simulator():
        """El juego (HTML/JS) tal como se publica en GitHub Pages."""
        return send_from_directory(ROOT, "index.html")

    @app.route("/salud")
    def health():
        db.get_db().execute("SELECT 1")
        return {"status": "ok"}

    for code, title in ((400, "Solicitud no válida"), (403, "Acceso denegado"), (404, "Página no encontrada")):
        app.register_error_handler(code, _error_page(code, title))

    return app


def _error_page(code, title):
    def handler(err):
        defaults = {
            403: "Tu cuenta no tiene permiso para ver o cambiar esto.",
            404: "Esa página no existe o la misión fue eliminada.",
        }
        detail = defaults.get(code) or getattr(err, "description", "")
        return render_template("error.html", code=code, title=title, detail=detail), code

    return handler
