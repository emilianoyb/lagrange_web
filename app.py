from flask import Flask, render_template, request, jsonify

from lagrange import interpolar, muestrear_curva, evaluar_polinomio, MIN_PUNTOS, MAX_PUNTOS

app = Flask(__name__)


@app.route("/")
def index():
    return render_template("index.html", min_puntos=MIN_PUNTOS, max_puntos=MAX_PUNTOS)


@app.route("/calcular", methods=["POST"])
def calcular():
    """
    Recibe un JSON con la lista de puntos y regresa el polinomio
    interpolante junto con las coordenadas de su curva, listas para
    dibujar en el navegador.
    """
    datos = request.get_json(silent=True)

    if not datos or "puntos" not in datos:
        return jsonify({"error": "No se recibió una lista de puntos válida."}), 400

    puntos_crudos = datos["puntos"]

    try:
        puntos = [(float(p["x"]), float(p["y"])) for p in puntos_crudos]
    except (ValueError, TypeError, KeyError):
        return jsonify({"error": "Cada punto debe tener una coordenada x y una y numéricas."}), 400

    resultado = interpolar(puntos)

    if resultado["error"]:
        return jsonify({"error": resultado["error"]})

    xs = [p[0] for p in puntos]
    margen = (max(xs) - min(xs)) * 0.25 or 1.0
    x_min = min(xs) - margen
    x_max = max(xs) + margen

    curva = muestrear_curva(resultado["funcion"], x_min, x_max, num_puntos=200)

    return jsonify({
        "error": None,
        "polinomio": resultado["polinomio_str"],
        "polinomio_latex": resultado["polinomio_latex"],
        "grado": resultado["grado"],
        "curva": curva,
        "puntos": puntos,
    })


@app.route("/evaluar", methods=["POST"])
def evaluar():
    """
    Recibe los mismos puntos ya interpolados más un valor de x, y
    regresa P(x): el valor del polinomio interpolante en ese punto.
    """
    datos = request.get_json(silent=True)

    if not datos or "puntos" not in datos or "x" not in datos:
        return jsonify({"error": "Faltan los puntos o el valor de x a evaluar."}), 400

    puntos_crudos = datos["puntos"]

    try:
        puntos = [(float(p["x"]), float(p["y"])) for p in puntos_crudos]
    except (ValueError, TypeError, KeyError):
        return jsonify({"error": "Cada punto debe tener una coordenada x y una y numéricas."}), 400

    try:
        x_valor = float(datos["x"])
    except (ValueError, TypeError):
        return jsonify({"error": "El valor de x a evaluar debe ser numérico."}), 400

    resultado = interpolar(puntos)

    if resultado["error"]:
        return jsonify({"error": resultado["error"]})

    evaluacion = evaluar_polinomio(resultado["polinomio_expr"], x_valor)

    if evaluacion["error"]:
        return jsonify({"error": evaluacion["error"]})

    return jsonify({
        "error": None,
        "x": x_valor,
        "valor_exacto": evaluacion["valor_exacto"],
        "valor_decimal": evaluacion["valor_decimal"],
    })


if __name__ == "__main__":
    app.run(debug=True)
