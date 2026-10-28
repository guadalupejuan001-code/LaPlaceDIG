# LaPlaceDIG

## Demonio de Laplace digital — un proyecto independiente

**Misión:** representar el estado de un sistema, conocer o descubrir sus reglas y calcular qué puede ocurrir en el tiempo. Se fundamenta en la idea original de Ether: estados de fondo, relaciones, excepciones y consultas bajo demanda.

No es una nueva app de REVERSE, no es el solucionador de la ecuación espacial de Laplace, no es un chatbot y no promete predicción perfecta de la bolsa.

### Qué se ha trasladado

| Módulo | Estado |
| --- | --- |
| demonio/modelo.mjs | **Copia exacta** del mundo reversible XI de Mundo X |
| demonio/experimento.mjs | **Copia exacta** del auditor que ejecuta el runtime real |
| historia/contrato.mjs | Fechas de observación/publicación, cuatro familias de hechos, revisiones |
| historia/ether-xi.mjs | Proyección y lectura sin pérdida en Inverse Ether Memory original |
| tools/laplace.mjs | Comandos locales para consultar, filtrar y comprobar archivos históricos |
| tests/historia.test.mjs | Regresiones de fuga de futuro y reconstrucción de registros |
| docs/ARQUITECTURA.md | Fórmula objetivo, estado actual y límites de la IA futura |
| docs/FUENTES.md | Shiller, FRED/ALFRED y GDELT; cobertura y limitaciones reales |

**E001 añade el primer aprendiz de leyes:** recibe transiciones binarias, identifica una ley afín desconocida, la conserva como programa XI reproducible y calcula sus consecuencias. Se abstiene con evidencia insuficiente o contradictoria. Está comprobado en mundos sintéticos; todavía no aprende precios, economía ni geopolítica reales. El núcleo Ether está en Mundo X; LaPlaceDIG lo reutiliza fijando el commit 3d29556eff4d1079c791abab38e203fc209f1722.

| Nuevo componente | Función |
| --- | --- |
| inteligencia/laplace.mjs | Planificación desde entradas; aprendizaje y pronósticos ejecutados por XI nativo |
| inteligencia/experimento.mjs | Observación → aprendizaje → pronóstico sellado → contraste → refutación |
| docs/INTELIGENCIA.md | Contrato, comandos, alcance de las leyes y siguiente investigación |
| docs/CONTEXTO_LAPLACE.md | Intención del proyecto y punto de continuidad |

## 1. Comprobar el demonio digital existente

Para reproducir con el motor propio original, obtener Mundo X en una carpeta hermana o subcarpeta y fijar su referencia:

    git clone https://github.com/guadalupejuan001-code/mundo-X deps/mundo-X
    git -C deps/mundo-X checkout 3d29556eff4d1079c791abab38e203fc209f1722
    cmake -S deps/mundo-X/quantum-runtime -B build-ether -DCMAKE_BUILD_TYPE=Release
    cmake --build build-ether --target mundo_x_quantum --parallel 2
    node demonio/experimento.mjs ./build-ether/mundo_x_quantum demon-evidence

Esta prueba ejecuta un mundo cerrado mediante XI original, verifica cada estado contra un oráculo independiente y muestra qué cambia ante un evento desconocido. Los resultados son de un universo sintético, NO de la bolsa.

## 2. Traer datos históricos reales, cuando haya una fuente

LaPlaceDIG admite un diario de hechos en JSONL. Cada registro indica cuándo ocurrió y, especialmente, **cuándo se supo**.

    node tools/laplace.mjs convertir-precios mi-historial.csv > mi-historial.jsonl
    node tools/laplace.mjs validar mi-historial.jsonl
    node tools/laplace.mjs corte mi-historial.jsonl 2020-01-01T00:00:00Z
    node tools/laplace.mjs referencia mi-historial.jsonl 2020-01-01T00:00:00Z SPY
    node tools/laplace.mjs verificar-ether mi-historial.jsonl 2020-01-01T00:00:00Z ./build-ether/mundo_x_quantum

**Las fechas, el activo y el nombre de archivo del ejemplo anterior explican solo la sintaxis; no son resultados bursátiles.** Los valores originales deben provenir de una fuente verificable. Si no hay observaciones válidas, el sistema lo informa; no produce precios inventados.

Para importar un CSV de precios, se exige exactamente este encabezado (sin columnas entrecomilladas):

    id,asset,observed_at,known_at,value,price_basis,currency,source_url

- observed_at y known_at deben ser timestamps UTC ISO-8601 terminados en Z.
- value es decimal como texto, no número convertido en coma flotante.
- price_basis es raw_close, adjusted_close o monthly_average.
- source_url es URL HTTPS que identifica la fuente original.
- Para economía y geopolítica, utilizar JSONL con los campos descritos en docs/ARQUITECTURA.md; no reinterpretar datos faltantes como ceros.

El comando verificar-ether acepta un lote pequeño para demostrar transporte y recuperación sin pérdida desde XI. No es una base histórica masiva persistida, todavía.

## 3. Hacia la inteligencia LAPLACE

La formulación de trabajo es:

    Estado compacto Z_t = C_Ether(hechos conocidos hasta t)
    Aprendizaje: reglas_estimadas = Aprender(historial observable)
    Predicción: calcular posibles estados Y_(t+h) desde Z_t y las reglas
    Contraste: registrar antes, medir después y corregir el modelo

El primer ciclo es reproducible con el mismo binario original:

    node tools/laplace.mjs experimento-aprendiz ./build-ether/mundo_x_quantum build-evidence/aprendiz

El aprendiz recibe **48 transiciones observadas de 16 variables**, sin recibir las leyes del generador. Identifica una transformación afín binaria; desde un estado inicial reservado, su pronóstico sellado coincide en **32/32 estados futuros**. Persistencia coincide en 0/32. Una intervención desconocida produce divergencia en el instante 9; incorporar esa evidencia refuta la ley fija y el nuevo aprendizaje se abstiene. Esto mide aprendizaje dentro de una gramática concreta, sin demostrar capacidad financiera ni inteligencia general.

El anfitrión organiza el experimento y planifica pivotes usando solo entradas. XI transforma las salidas observadas mediante CNOT, recupera los coeficientes por Inverse Ether Memory y ejecuta los pronósticos. La persistencia usa **reproducción de un programa XI guardado**, no una sesión nativa que continúe viva. [Detalle y uso](docs/INTELIGENCIA.md).

Las reglas numéricas generales y la validación en mercados reales siguen pendientes. No transformar las cifras de este laboratorio en supuesta precisión bursátil.

Evidencia de E001: [resultado reproducible](evidencia/E001.json). La CI regenera los programas y pronósticos completos.

## 4. E002 — probabilidad desde narrativa geopolítica y humanitaria

**Objetivo inicial:** estimar si el retorno BTC/USD a 24 horas supera un coste total **supuesto** de 10 puntos básicos. Los precios producen las etiquetas de entrenamiento y evaluación; el predictor recibe exclusivamente relatos geopolíticos y humanitarios conocidos al corte.

    Z_t = Estado(narrativa geopolítica + humanitaria conocida en la ventana)
    Y_t = 1 si 10000 * (P_(t+24h)/P_t - 1) > coste_bps
    p0 = (positivos_globales + 1) / (casos_globales + 2)
    p_t = (positivos_del_patron + kappa*p0) / (casos_del_patron + kappa)

El espacio incluye temas individuales, contexto regional, combinaciones y secuencias de publicación. La extracción es simbólica con vocabulario declarado en español/inglés. Cada patrón observado recibe una auditoría de soporte, probabilidad y validación; solo condiciones validadas pueden producir una predicción. No se multiplican señales correlacionadas. Sin patrón validado, el modelo se abstiene.

El entrenamiento reserva tres tramos cronológicos: entrenamiento → selección por validación → prueba final con modelo congelado. Se miden Brier, log-loss, calibración por intervalos y cobertura, incluyendo abstenciones mediante la referencia fija para el resultado global. Se excluyen objetivos todavía no publicados y horizontes que crucen de partición.

    node tools/laplace.mjs experimento-narrativa ./build-ether/mundo_x_quantum build-evidence/narrativa

El control **sintético** usa 128 casos de entrenamiento, 64 de validación y 64 de prueba. Recupera interacciones entre ambos dominios. La aritmética probabilística y la selección ocurren en el anfitrión; el único estado guardado de reglas y estadísticas se recupera desde Inverse Ether Memory mediante el XI original. No hay un servicio continuo ni un modelo financiero real ya validado.

Se añaden hechos `humanitaria`, importadores de capturas ReliefWeb/GDELT y comandos de entrenamiento, consulta y evaluación. Una captura actual nunca se retrofecha como si su contenido hubiera estado disponible antes. [Fórmula, espacio y uso](docs/NARRATIVA.md) · [Evidencia E002](evidencia/E002.json).

## 5. E003 — dos resultados que coexisten y se registran por patrón

Una consulta devuelve una consecuencia condicional calculada por XI y una probabilidad narrativa para **el mismo objetivo**. La primera expresa qué determina una ley identificada; la segunda conserva su incertidumbre estadística. Las dos permanecen separadas y pueden abstenerse independientemente.

Cada ocurrencia se guarda por patrón con su fecha, ambas salidas y versión del modelo. Al llegar el resultado observado, se añade un evento sin reescribir el pronóstico. Las vistas muestran aciertos, errores, cobertura, Brier, refutaciones y diferencias. La ley refutada se retira para ese patrón según cuándo se conoció la evidencia.

    node tools/laplace.mjs experimento-dual ./build-ether/mundo_x_quantum build-evidence/dual-nuevo

El control cerrado produce 64 pares y 64 observaciones, agrupados en cuatro patrones. Es evidencia sintética, no predicción financiera real. [Uso y arquitectura](docs/COEXISTENCIA.md) · [Resultados E003](evidencia/E003.json).

## 6. E004 — masa positiva/negativa de escenarios en XI

El análisis de realidades ejecuta la ley sobre escenarios declarados y suma sus probabilidades con pesos explícitos. Se registra como análisis del patrón sin sustituir las dos salidas ni duplicar pronósticos.

    node tools/laplace.mjs experimento-realidades ./build-ether/mundo_x_quantum build-evidence/realidades-nuevo

El runtime original ejecuta 512 escenarios en **1.536 qubits activos**, divididos en componentes de tres qubits. Obtiene marginales y masas positivas/negativas sin enumerar un estado general exponencial. `?` significa incertidumbre equiprobable declarada; los pesos y leyes del control son sintéticos. [Alcance técnico](docs/COEXISTENCIA.md) · [Resultados E004](evidencia/E004.json).

Documentación: [Arquitectura](docs/ARQUITECTURA.md) · [Fuentes públicas](docs/FUENTES.md) · [Demonio XI](demonio/README.md).

Pruebas locales: node --test tests/*.test.mjs. Las CI compilan también el núcleo QuantumRuntime de Mundo X, fijado por SHA, y verifican el demonio.

## Reglas de ingeniería

Conservar la autoridad de estado original Ether, no usar datos futuros, no fabricar precios ni precisión, no ocultar costes de RAM, no inventar hardware cuántico. Nuevas funciones de la IA deben demostrar su utilidad mediante pruebas reproducibles. Los originales en Mundo X se conservan como referencia y no se alteran con esta migración.
