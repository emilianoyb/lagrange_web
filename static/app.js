(function () {
    const filasContenedor = document.getElementById("filas-puntos");
    const btnAgregar = document.getElementById("btn-agregar");
    const btnCalcular = document.getElementById("btn-calcular");
    const btnEjemplo = document.getElementById("btn-ejemplo");
    const mensajeError = document.getElementById("mensaje-error");
    const svg = document.getElementById("grafico");
    const placa = document.getElementById("placa-resultado");
    const placaFormula = document.getElementById("placa-formula");
    const placaGrado = document.getElementById("placa-grado");
    const campoXEvaluar = document.getElementById("campo-x-evaluar");
    const btnEvaluar = document.getElementById("btn-evaluar");
    const evaluadorResultado = document.getElementById("evaluador-resultado");

    const SVG_NS = "http://www.w3.org/2000/svg";
    const ANCHO = 640;
    const ALTO = 440;
    const PAD = 42;

    let contadorFilas = 0;

    // ---------- Construcción dinámica de filas de puntos ----------

    function agregarFila(x, y) {
        contadorFilas++;
        const fila = document.createElement("div");
        fila.className = "fila-punto";
        fila.dataset.id = contadorFilas;

        const num = document.createElement("span");
        num.className = "fila-num";
        num.textContent = contadorFilas;

        const inputX = document.createElement("input");
        inputX.type = "text";
        inputX.inputMode = "decimal";
        inputX.placeholder = "x";
        inputX.className = "campo-x";
        if (x !== undefined) inputX.value = x;

        const inputY = document.createElement("input");
        inputY.type = "text";
        inputY.inputMode = "decimal";
        inputY.placeholder = "y";
        inputY.className = "campo-y";
        if (y !== undefined) inputY.value = y;

        const btnQuitar = document.createElement("button");
        btnQuitar.type = "button";
        btnQuitar.className = "fila-quitar";
        btnQuitar.innerHTML = "&times;";
        btnQuitar.addEventListener("click", () => {
            fila.remove();
            renumerarFilas();
        });

        fila.appendChild(num);
        fila.appendChild(inputX);
        fila.appendChild(inputY);
        fila.appendChild(btnQuitar);
        filasContenedor.appendChild(fila);
    }

    function renumerarFilas() {
        [...filasContenedor.children].forEach((fila, idx) => {
            fila.querySelector(".fila-num").textContent = idx + 1;
        });
    }

    function leerPuntos() {
        return [...filasContenedor.children].map((fila) => ({
            x: fila.querySelector(".campo-x").value,
            y: fila.querySelector(".campo-y").value,
        }));
    }

    btnAgregar.addEventListener("click", () => {
        agregarFila();
        ocultarError();
    });

    btnEjemplo.addEventListener("click", () => {
        filasContenedor.innerHTML = "";
        contadorFilas = 0;
        agregarFila(-1, 1);
        agregarFila(0, 0);
        agregarFila(2, 4);
        agregarFila(3, 9);
        ocultarError();
        placa.hidden = true;
        ocultarEvaluacion();
    });

    function ocultarError() {
        mensajeError.hidden = true;
    }
    function mostrarError(texto) {
        mensajeError.textContent = texto;
        mensajeError.hidden = false;
    }

    // ---------- Calcular ----------

    btnCalcular.addEventListener("click", async () => {
        ocultarError();
        const puntosCrudos = leerPuntos();

        if (puntosCrudos.some((p) => p.x === "" || p.y === "")) {
            mostrarError("Completa todas las coordenadas x y y antes de trazar la curva.");
            return;
        }

        btnCalcular.disabled = true;
        btnCalcular.textContent = "Trazando…";

        try {
            const resp = await fetch("/calcular", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ puntos: puntosCrudos }),
            });
            const datos = await resp.json();

            if (!resp.ok || datos.error) {
                mostrarError(datos.error || "Ocurrió un error al calcular el polinomio.");
                placa.hidden = true;
                ocultarEvaluacion();
                dibujarGrafico(null);
                return;
            }

            mostrarResultado(datos);
        } catch (e) {
            mostrarError("No se pudo conectar con el servidor. Intenta de nuevo.");
        } finally {
            btnCalcular.disabled = false;
            btnCalcular.textContent = "Trazar curva";
        }
    });

    function mostrarResultado(datos) {
        placaGrado.textContent = datos.grado;
        placaFormula.textContent = "P(x) = " + formatearPolinomio(datos.polinomio);
        placa.hidden = false;
        ocultarEvaluacion();
        dibujarGrafico(datos);
    }

    // ---------- Evaluar el polinomio en un x dado ----------

    function ocultarEvaluacion() {
        evaluadorResultado.hidden = true;
        evaluadorResultado.classList.remove("es-error");
    }

    btnEvaluar.addEventListener("click", async () => {
        const xTexto = campoXEvaluar.value.trim();
        if (xTexto === "" || isNaN(Number(xTexto))) {
            evaluadorResultado.textContent = "Escribe un valor numérico de x para evaluar.";
            evaluadorResultado.classList.add("es-error");
            evaluadorResultado.hidden = false;
            return;
        }

        const puntosCrudos = leerPuntos();
        btnEvaluar.disabled = true;
        const textoOriginal = btnEvaluar.textContent;
        btnEvaluar.textContent = "Evaluando…";

        try {
            const resp = await fetch("/evaluar", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ puntos: puntosCrudos, x: xTexto }),
            });
            const datos = await resp.json();

            if (!resp.ok || datos.error) {
                evaluadorResultado.textContent = datos.error || "No se pudo evaluar el polinomio.";
                evaluadorResultado.classList.add("es-error");
                evaluadorResultado.hidden = false;
                return;
            }

            mostrarEvaluacion(datos);
        } catch (e) {
            evaluadorResultado.textContent = "No se pudo conectar con el servidor. Intenta de nuevo.";
            evaluadorResultado.classList.add("es-error");
            evaluadorResultado.hidden = false;
        } finally {
            btnEvaluar.disabled = false;
            btnEvaluar.textContent = textoOriginal;
        }
    });

    campoXEvaluar.addEventListener("keydown", (ev) => {
        if (ev.key === "Enter") btnEvaluar.click();
    });

    function mostrarEvaluacion(datos) {
        evaluadorResultado.classList.remove("es-error");
        const xFmt = formatearNum(datos.x);
        const decimalFmt = formatearNum(datos.valor_decimal);
        const exactoFmt = formatearPolinomio(datos.valor_exacto);

        let texto = `P(${xFmt}) = <span class="valor-destacado">${decimalFmt}</span>`;
        if (exactoFmt !== decimalFmt && /[0-9]\/[0-9]/.test(exactoFmt)) {
            texto += ` &nbsp;(= ${exactoFmt})`;
        }
        evaluadorResultado.innerHTML = texto;
        evaluadorResultado.hidden = false;
    }

    function formatearPolinomio(expresionPython) {
        // Convierte la notación de sympy/Python (x**2) a notación matemática (x²)
        // y limpia asteriscos de multiplicación para que se lea como fórmula.
        return expresionPython
            .replace(/\*\*2/g, "²")
            .replace(/\*\*3/g, "³")
            .replace(/\*\*(\d+)/g, "^$1")
            .replace(/\*/g, "")
            .replace(/\s+/g, " ");
    }

    // ---------- Dibujo del gráfico SVG ----------

    function limpiarSvg() {
        while (svg.firstChild) svg.removeChild(svg.firstChild);
    }

    function crear(tag, attrs) {
        const el = document.createElementNS(SVG_NS, tag);
        for (const k in attrs) el.setAttribute(k, attrs[k]);
        return el;
    }

    function dibujarGrafico(datos) {
        limpiarSvg();

        if (!datos || !datos.curva || datos.curva.length < 2) {
            const texto = crear("text", {
                x: ANCHO / 2, y: ALTO / 2, "text-anchor": "middle",
                class: "svg-eje-etiqueta",
            });
            texto.textContent = "La curva aparecerá aquí";
            svg.appendChild(texto);
            return;
        }

        const curva = datos.curva;
        const puntos = datos.puntos;

        const xsCurva = curva.map((p) => p[0]);
        const ysCurva = curva.map((p) => p[1]);
        const ysPuntos = puntos.map((p) => p[1]);

        let xMin = Math.min(...xsCurva);
        let xMax = Math.max(...xsCurva);
        let yMin = Math.min(...ysCurva, ...ysPuntos);
        let yMax = Math.max(...ysCurva, ...ysPuntos);

        // Asegurar que el eje y=0 siempre sea visible, y dar un pequeño margen
        yMin = Math.min(yMin, 0);
        yMax = Math.max(yMax, 0);
        const rangoY = (yMax - yMin) || 1;
        yMin -= rangoY * 0.1;
        yMax += rangoY * 0.1;

        const escX = (x) => PAD + ((x - xMin) / (xMax - xMin)) * (ANCHO - 2 * PAD);
        const escY = (y) => PAD + ((yMax - y) / (yMax - yMin)) * (ALTO - 2 * PAD);

        // --- Cuadrícula de fondo ---
        const pasosGrid = 10;
        for (let i = 0; i <= pasosGrid; i++) {
            const gx = PAD + (i / pasosGrid) * (ANCHO - 2 * PAD);
            const gy = PAD + (i / pasosGrid) * (ALTO - 2 * PAD);
            svg.appendChild(crear("line", { x1: gx, y1: PAD, x2: gx, y2: ALTO - PAD, class: "svg-grid-line" }));
            svg.appendChild(crear("line", { x1: PAD, y1: gy, x2: ANCHO - PAD, y2: gy, class: "svg-grid-line" }));
        }

        // --- Ejes (x=0 y y=0, si caen dentro del rango visible) ---
        if (xMin <= 0 && xMax >= 0) {
            const x0 = escX(0);
            svg.appendChild(crear("line", { x1: x0, y1: PAD, x2: x0, y2: ALTO - PAD, class: "svg-eje" }));
        }
        if (yMin <= 0 && yMax >= 0) {
            const y0 = escY(0);
            svg.appendChild(crear("line", { x1: PAD, y1: y0, x2: ANCHO - PAD, y2: y0, class: "svg-eje" }));
        }

        // --- Etiquetas de extremos de los ejes ---
        svg.appendChild(etiqueta(xMin.toFixed(1), PAD, ALTO - PAD + 16, "middle"));
        svg.appendChild(etiqueta(xMax.toFixed(1), ANCHO - PAD, ALTO - PAD + 16, "middle"));
        svg.appendChild(etiqueta(yMin.toFixed(1), PAD - 8, ALTO - PAD + 4, "end"));
        svg.appendChild(etiqueta(yMax.toFixed(1), PAD - 8, PAD + 4, "end"));

        // --- La curva del polinomio ---
        const puntosLinea = curva.map((p) => `${escX(p[0]).toFixed(1)},${escY(p[1]).toFixed(1)}`).join(" ");
        svg.appendChild(crear("polyline", { points: puntosLinea, class: "svg-curva" }));

        // --- Los "alfileres" en cada punto dado ---
        puntos.forEach(([px, py]) => {
            const cx = escX(px);
            const cy = escY(py);
            const yBase = Math.min(ALTO - PAD, cy + 22);

            svg.appendChild(crear("line", { x1: cx, y1: cy, x2: cx, y2: yBase, class: "svg-pin-tallo" }));
            svg.appendChild(crear("circle", { cx, cy, r: 6, class: "svg-pin-cabeza" }));

            const texto = crear("text", {
                x: cx, y: Math.min(ALTO - PAD + 34, yBase + 14),
                "text-anchor": "middle", class: "svg-pin-etiqueta",
            });
            texto.textContent = `(${formatearNum(px)}, ${formatearNum(py)})`;
            svg.appendChild(texto);
        });
    }

    function etiqueta(texto, x, y, anchor) {
        const el = crear("text", { x, y, "text-anchor": anchor, class: "svg-eje-etiqueta" });
        el.textContent = texto;
        return el;
    }

    function formatearNum(n) {
        const r = Math.round(n * 100) / 100;
        return Object.is(r, -0) ? "0" : r.toString();
    }

    // ---------- Inicialización: 3 filas de ejemplo vacías ----------
    agregarFila(-1, "");
    agregarFila(0, "");
    agregarFila(2, "");
    dibujarGrafico(null);
})();
