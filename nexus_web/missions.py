"""Bitácora de misiones: CRUD sobre la tabla missions."""
from flask import Blueprint, abort, flash, g, redirect, render_template, request, url_for

from .auth import login_required
from .catalog import DESTINATIONS, PROGRAMS, STATUSES, program_for_rank
from .db import get_db

bp = Blueprint("missions", __name__, url_prefix="/misiones")


def _is_admin():
    return g.user["role"] == "admin"


def _get_mission(mission_id):
    """Devuelve la misión si existe y el usuario puede verla (dueño o admin)."""
    row = get_db().execute(
        "SELECT m.*, u.name AS owner_name FROM missions m JOIN users u ON u.id = m.user_id WHERE m.id = ?",
        (mission_id,),
    ).fetchone()
    if row is None:
        abort(404)
    if row["user_id"] != g.user["id"] and not _is_admin():
        abort(403)
    return row


def _number(raw):
    try:
        value = float(raw.replace(",", "."))
    except (AttributeError, ValueError):
        return None
    return value if value == value and abs(value) != float("inf") else None


def validate(form):
    """Limpia el formulario. Devuelve (datos, lista de errores)."""
    data = {
        "name": form.get("name", "").strip(),
        "program": form.get("program", ""),
        "destination": form.get("destination", ""),
        "objective": form.get("objective", "").strip(),
        "mass_kg": _number(form.get("mass_kg", "")),
        "budget_musd": _number(form.get("budget_musd", "")),
        "status": form.get("status", "borrador"),
    }
    errors = []
    if not 3 <= len(data["name"]) <= 80:
        errors.append("El nombre de la misión debe tener entre 3 y 80 caracteres.")
    program = PROGRAMS.get(data["program"])
    destination = DESTINATIONS.get(data["destination"])
    if program is None:
        errors.append("Elige una clase de programa.")
    if destination is None:
        errors.append("Elige un destino.")
    if program and destination and program["rank"] < destination["min_rank"]:
        errors.append(
            f"{destination['name']} exige al menos {program_for_rank(destination['min_rank'])}."
        )
    if len(data["objective"]) > 500:
        errors.append("El objetivo científico no puede pasar de 500 caracteres.")
    if data["mass_kg"] is None or not 1 <= data["mass_kg"] <= 100000:
        errors.append("La masa debe estar entre 1 y 100 000 kg.")
    if data["budget_musd"] is None or data["budget_musd"] <= 0:
        errors.append("El presupuesto debe ser mayor que cero.")
    elif program and data["budget_musd"] > program["budget"]:
        errors.append(
            f"El presupuesto supera el tope de {program['name']}: {program['budget']} M USD."
        )
    if data["status"] not in STATUSES:
        errors.append("Elige un estado válido.")
    return data, errors


def _form_context(**extra):
    return dict(programs=PROGRAMS, destinations=DESTINATIONS, statuses=STATUSES, **extra)


@bp.route("/")
@login_required
def index():
    status = request.args.get("estado", "")
    query = request.args.get("q", "").strip()
    sql = (
        "SELECT m.*, u.name AS owner_name FROM missions m "
        "JOIN users u ON u.id = m.user_id WHERE 1 = 1"
    )
    params = []
    if not _is_admin():
        sql += " AND m.user_id = ?"
        params.append(g.user["id"])
    if status in STATUSES:
        sql += " AND m.status = ?"
        params.append(status)
    if query:
        sql += " AND m.name LIKE ? ESCAPE '\\'"
        escaped = query.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")
        params.append(f"%{escaped}%")
    sql += " ORDER BY m.updated_at DESC, m.id DESC"
    rows = get_db().execute(sql, params).fetchall()
    return render_template(
        "missions/index.html", missions=rows, status=status, query=query, **_form_context()
    )


@bp.route("/nueva", methods=("GET", "POST"))
@login_required
def create():
    data = {"status": "borrador"}
    if request.method == "POST":
        data, errors = validate(request.form)
        if not errors:
            conn = get_db()
            cur = conn.execute(
                "INSERT INTO missions (user_id, name, program, destination, objective, mass_kg, budget_musd, status) "
                "VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                (g.user["id"], data["name"], data["program"], data["destination"], data["objective"],
                 data["mass_kg"], data["budget_musd"], data["status"]),
            )
            conn.commit()
            flash("Misión registrada.", "ok")
            return redirect(url_for("missions.detail", mission_id=cur.lastrowid))
        for message in errors:
            flash(message, "error")
    return render_template("missions/form.html", mission=data, editing=False, **_form_context())


@bp.route("/<int:mission_id>")
@login_required
def detail(mission_id):
    return render_template("missions/detail.html", mission=_get_mission(mission_id), **_form_context())


@bp.route("/<int:mission_id>/editar", methods=("GET", "POST"))
@login_required
def edit(mission_id):
    mission = _get_mission(mission_id)
    data = dict(mission)
    if request.method == "POST":
        data, errors = validate(request.form)
        data["id"] = mission_id
        if not errors:
            conn = get_db()
            conn.execute(
                "UPDATE missions SET name = ?, program = ?, destination = ?, objective = ?, mass_kg = ?, "
                "budget_musd = ?, status = ?, updated_at = datetime('now') WHERE id = ?",
                (data["name"], data["program"], data["destination"], data["objective"],
                 data["mass_kg"], data["budget_musd"], data["status"], mission_id),
            )
            conn.commit()
            flash("Cambios guardados.", "ok")
            return redirect(url_for("missions.detail", mission_id=mission_id))
        for message in errors:
            flash(message, "error")
    return render_template("missions/form.html", mission=data, editing=True, **_form_context())


@bp.route("/<int:mission_id>/eliminar", methods=("POST",))
@login_required
def delete(mission_id):
    mission = _get_mission(mission_id)
    conn = get_db()
    conn.execute("DELETE FROM missions WHERE id = ?", (mission_id,))
    conn.commit()
    flash(f"Misión «{mission['name']}» eliminada.", "info")
    return redirect(url_for("missions.index"))
