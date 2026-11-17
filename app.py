"""Punto de entrada: `flask --app app run` en local, `gunicorn app:app` en Render."""
from nexus_web import create_app

app = create_app()

if __name__ == "__main__":
    app.run(debug=True)
