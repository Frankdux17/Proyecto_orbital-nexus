"""Conexión a SQLite: una conexión por petición, guardada en flask.g."""
import os
import sqlite3

from flask import current_app, g
from werkzeug.security import generate_password_hash


def get_db():
    if "db" not in g:
        g.db = sqlite3.connect(current_app.config["DATABASE"])
        g.db.row_factory = sqlite3.Row
        g.db.execute("PRAGMA foreign_keys = ON")
    return g.db


def close_db(_exc=None):
    conn = g.pop("db", None)
    if conn is not None:
        conn.close()


def init_db():
    """Crea las tablas si todavía no existen."""
    path = os.path.join(os.path.dirname(__file__), "schema.sql")
    with open(path, encoding="utf-8") as fh:
        get_db().executescript(fh.read())


def ensure_admin(email, password):
    """Crea la cuenta de administrador indicada por ADMIN_EMAIL / ADMIN_PASSWORD."""
    if not email or not password:
        return
    conn = get_db()
    conn.execute(
        "INSERT OR IGNORE INTO users (name, email, password_hash, role) VALUES (?, ?, ?, 'admin')",
        ("Administrador", email.strip().lower(), generate_password_hash(password)),
    )
    conn.commit()


def init_app(app):
    app.teardown_appcontext(close_db)
