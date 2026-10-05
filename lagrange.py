"""
Módulo que implementa la Interpolación de Lagrange: encuentra el único
polinomio de grado <= n-1 que pasa exactamente por n puntos dados.
"""

import sympy as sp

MIN_PUNTOS = 2
MAX_PUNTOS = 10


class ErrorLagrange(Exception):
    """Error controlado del método (puntos inválidos, x repetidas, etc.)."""


def validar_puntos(puntos):
    """
    Valida la lista de puntos [(x0, y0), (x1, y1), ...].
    Lanza ErrorLagrange con un mensaje claro si algo no es válido.
    """
    if len(puntos) < MIN_PUNTOS:
        raise ErrorLagrange(
            f"Se necesitan al menos {MIN_PUNTOS} puntos para interpolar."
        )
    if len(puntos) > MAX_PUNTOS:
        raise ErrorLagrange(
            f"Como máximo se aceptan {MAX_PUNTOS} puntos en esta herramienta."
        )

    xs = [p[0] for p in puntos]
    vistos = set()
    for x in xs:
        if x in vistos:
            raise ErrorLagrange(
                f"Hay dos puntos con la misma x = {x}. "
                "Para que exista un polinomio interpolante, todas las x deben ser distintas."
            )
        vistos.add(x)


def construir_base_lagrange(puntos, i):
    """
    Construye, como expresión simbólica de sympy, el i-ésimo polinomio
    base de Lagrange: L_i(x) = producto, para j != i, de (x - x_j)/(x_i - x_j).
    Vale 1 en x_i y 0 en todas las demás x_j del conjunto de puntos.
    """
    x = sp.symbols('x')
    xi, _ = puntos[i]
    termino = sp.Integer(1)
    for j, (xj, _) in enumerate(puntos):
        if j == i:
            continue
        termino *= (x - xj) / (xi - xj)
    return termino


def interpolar(puntos):
    """
    Calcula el polinomio de interpolación de Lagrange para una lista
    de puntos [(x0, y0), (x1, y1), ..., (xn, yn)].

    Retorna un dict con:
        'polinomio_str'   : el polinomio ya simplificado, como texto
                             (ej. "x**2 - 2*x + 1")
        'polinomio_latex' : el mismo polinomio en formato LaTeX, para
                             mostrarlo bonito en la interfaz
        'grado'           : el grado real del polinomio resultante
        'funcion'         : función de Python evaluable, f(x) -> y
        'error'           : mensaje de error, o None si no hubo error
    """
    try:
        validar_puntos(puntos)
    except ErrorLagrange as e:
        return {'polinomio_str': None, 'polinomio_latex': None,
                'grado': None, 'funcion': None, 'error': str(e)}

    x = sp.symbols('x')

    # Convertir a fracciones exactas (sp.Rational) en vez de floats,
    # para que la simplificación algebraica dé un resultado exacto
    # y no arrastre errores de redondeo de punto flotante.
    puntos_exactos = [(sp.nsimplify(px), sp.nsimplify(py)) for px, py in puntos]

    polinomio = sp.Integer(0)
    for i, (_, yi) in enumerate(puntos_exactos):
        polinomio += yi * construir_base_lagrange(puntos_exactos, i)

    polinomio = sp.expand(polinomio)
    polinomio_poly = sp.Poly(polinomio, x) if polinomio.has(x) else None
    grado = polinomio_poly.degree() if polinomio_poly else 0

    funcion = sp.lambdify(x, polinomio, modules=['math'])

    return {
        'polinomio_str': str(polinomio),
        'polinomio_latex': sp.latex(polinomio),
        'polinomio_expr': polinomio,
        'grado': grado,
        'funcion': funcion,
        'error': None,
    }


def evaluar_polinomio(polinomio_expr, x_valor):
    """
    Evalúa el polinomio interpolante (expresión simbólica de sympy) en un
    valor x_valor dado por el usuario.

    Retorna un dict con:
        'valor_exacto'  : el resultado como fracción/expresión exacta (texto)
        'valor_decimal' : el resultado como número decimal
        'error'         : mensaje de error, o None si no hubo error
    """
    x = sp.symbols('x')
    try:
        x_exacto = sp.nsimplify(x_valor)
        valor = sp.nsimplify(polinomio_expr.subs(x, x_exacto))
        valor = sp.simplify(valor)
    except Exception:
        return {'valor_exacto': None, 'valor_decimal': None,
                'error': 'No se pudo evaluar el polinomio en ese valor de x.'}

    return {
        'valor_exacto': str(valor),
        'valor_decimal': float(valor),
        'error': None,
    }


def muestrear_curva(funcion, x_min, x_max, num_puntos=200):
    """
    Evalúa la función interpolada en 'num_puntos' valores distribuidos
    uniformemente entre x_min y x_max, para poder dibujar la curva.
    Retorna una lista de pares [x, y].
    """
    if num_puntos < 2:
        num_puntos = 2
    paso = (x_max - x_min) / (num_puntos - 1)
    curva = []
    for i in range(num_puntos):
        xv = x_min + i * paso
        try:
            yv = funcion(xv)
        except Exception:
            continue
        curva.append([xv, yv])
    return curva


if __name__ == "__main__":
    # Prueba rápida por consola: puntos de una parábola conocida y = x^2
    puntos_prueba = [(-1, 1), (0, 0), (2, 4)]
    resultado = interpolar(puntos_prueba)
    if resultado['error']:
        print(resultado['error'])
    else:
        print("Polinomio:", resultado['polinomio_str'])
        print("Grado:", resultado['grado'])
        f = resultado['funcion']
        for px, py in puntos_prueba:
            print(f"  f({px}) = {f(px)}  (esperado {py})")
