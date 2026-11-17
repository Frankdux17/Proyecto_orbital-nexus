"""Gestión de usuarios: registro, inicio y cierre de sesión, control por rol."""
import functools
import re
import sqlite3

from flask import Blueprint, abort, flash, g, redirect, render_template, request, session, url_for
from werkzeug.security import check_password_hash, generate_password_hash

from .db import get_db

bp = Blueprint("auth", __name__)

EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
# Se compara contra este hash cuando el correo no existe, para que la respuesta
# tarde lo mismo exista o no la cuenta.
_DUMMY_HASH = generate_password_hash("orbital-nexus")


@bp.before_app_request
def load_user():
    user_id = session.get("user_id")
    g.user = None
    if user_id is not None:
        g.user = get_db().execute(
            "SELECT id, name, email, role, created_at FROM users WHERE id = ?", (user_id,)
        ).fetchone()
        if g.user is None:  # la cuenta fue eliminada con la sesión abierta
            session.clear()


def login_required(view):
    @functools.wraps(view)
    def wrapped(**kwargs):
        if g.user is None:
            flash("Inicia sesión para continuar.", "info")
            return redirect(url_for("auth.login", next=request.path))
        return view(**kwargs)

    return wrapped


def role_required(role):
    def decorator(view):
        @functools.wraps(view)
        @login_required
        def wrapped(**kwargs):
            if g.user["role"] != role:
                abort(403)
            return view(**kwargs)

        return wrapped

    return decorator


def _safe_next(target):
    """Solo se redirige a rutas internas."""
    if target and target.startswith("/") and not target.startswith("//") and "\\" not in target:
        return target
    return url_for("missions.index")


@bp.route("/registro", methods=("GET", "POST"))
def register():
    if g.user:
        return redirect(url_for("missions.index"))
    form = {"name": "", "email": ""}
    if request.method == "POST":
        name = request.form.get("name", "").strip()
        email = request.form.get("email", "").strip().lower()
        password = request.form.get("password", "")
        confirm = request.form.get("confirm", "")
        form = {"name": name, "email": email}

        error = None
        if not 2 <= len(name) <= 60:
            error = "Escribe tu nombre (entre 2 y 60 caracteres)."
        elif not EMAIL_RE.match(email) or len(email) > 120:
            error = "Escribe un correo válido."
        elif len(password) < 8:
            error = "La contraseña debe tener al menos 8 caracteres."
        elif password != confirm:
            error = "Las dos contraseñas no coinciden."

        if error is None:
            conn = get_db()
            try:
                cur = conn.execute(
                    "INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)",
                    (name, email, generate_password_hash(password)),
                )
                conn.commit()
            except sqlite3.IntegrityError:
                error = "Ya existe una cuenta con ese correo. Inicia sesión."
            else:
                session.clear()
                session["user_id"] = cur.lastrowid
                flash(f"Cuenta creada. Te damos la bienvenida, {name}.", "ok")
                return redirect(url_for("missions.index"))
        flash(error, "error")
    return render_template("auth/register.html", form=form)


@bp.route("/ingresar", methods=("GET", "POST"))
def login():
    if g.user:
        return redirect(url_for("missions.index"))
    email = ""
    if request.method == "POST":
        email = request.form.get("email", "").strip().lower()
        password = request.form.get("password", "")
        user = get_db().execute("SELECT * FROM users WHERE email = ?", (email,)).fetchone()
        valid = check_password_hash(user["password_hash"] if user else _DUMMY_HASH, password)
        if user and valid:
            session.clear()
            session["user_id"] = user["id"]
            flash(f"Sesión iniciada. Hola, {user['name']}.", "ok")
            return redirect(_safe_next(request.form.get("next") or request.args.get("next")))
        flash("El correo o la contraseña no son correctos.", "error")
    return render_template("auth/login.html", email=email, next=request.args.get("next", ""))


@bp.route("/salir", methods=("POST",))
def logout():
    session.clear()
    flash("Sesión cerrada.", "info")
    return redirect(url_for("home"))
