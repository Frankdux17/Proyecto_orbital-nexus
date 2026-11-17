"""Panel de administración: solo para el rol admin."""
from flask import Blueprint, abort, flash, g, redirect, render_template, request, url_for

from .auth import role_required
from .db import get_db

bp = Blueprint("admin", __name__, url_prefix="/admin")


def _get_user(user_id):
    user = get_db().execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
    if user is None:
        abort(404)
    return user


@bp.route("/usuarios")
@role_required("admin")
def users():
    rows = get_db().execute(
        "SELECT u.id, u.name, u.email, u.role, u.created_at, COUNT(m.id) AS missions "
        "FROM users u LEFT JOIN missions m ON m.user_id = u.id "
        "GROUP BY u.id ORDER BY u.created_at, u.id"
    ).fetchall()
    return render_template("admin/users.html", users=rows)


@bp.route("/usuarios/<int:user_id>/rol", methods=("POST",))
@role_required("admin")
def set_role(user_id):
    user = _get_user(user_id)
    role = request.form.get("role")
    if role not in ("explorer", "admin"):
        abort(400, description="Rol no válido.")
    if user["id"] == g.user["id"]:
        flash("No puedes cambiar tu propio rol.", "error")
    else:
        conn = get_db()
        conn.execute("UPDATE users SET role = ? WHERE id = ?", (role, user_id))
        conn.commit()
        flash(f"{user['name']} ahora tiene el rol {role}.", "ok")
    return redirect(url_for("admin.users"))


@bp.route("/usuarios/<int:user_id>/eliminar", methods=("POST",))
@role_required("admin")
def delete_user(user_id):
    user = _get_user(user_id)
    if user["id"] == g.user["id"]:
        flash("No puedes eliminar tu propia cuenta.", "error")
    else:
        conn = get_db()
        conn.execute("DELETE FROM users WHERE id = ?", (user_id,))  # borra sus misiones en cascada
        conn.commit()
        flash(f"Cuenta de {user['name']} eliminada junto con sus misiones.", "info")
    return redirect(url_for("admin.users"))
