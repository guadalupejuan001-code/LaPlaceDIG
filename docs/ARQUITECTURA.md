# LaPlaceDIG — arquitectura del demonio digital sobre Ether

## Objetivo

Crear una inteligencia predictiva de sistemas inspirada en el demonio de Laplace. No un chatbot convencional, ni una máquina que prometa rentabilidad infinita. La tarea es calcular qué futuro se sigue de un estado y unas leyes y distinguir lo desconocido.

El demonio determinista en un mundo cerrado:

    S(t+h) = F^h(S(t))

S(t) es el estado completo de ese MODELO; F es su ley de transición; h es el horizonte. No confundir con la ecuación diferencial espacial de Laplace (nabla²u=0): resolver esta última no proporciona conocimiento del futuro.

## 1. Ether — base preexistente

Tecnología original en Mundo X: QuantumRuntime, InfiniteCore, CompactCore e Inverse Ether Memory. Se reutiliza como dependencia fija, sin copiar otra CPU ni crear un simulador alternativo:

- Estado de fondo definido por reglas y diferencias finitas materializadas.
- Reglas globales y relaciones exactas para familias cuánticas admitidas.
- Direcciones lógicas enormes sin materializar todas las direcciones intermedias.
- Sesión y rollback transaccional.
- Los bytes clásicos son proyecciones bajo solicitud.

Esto es simulación cuántica en CPU clásica. La compresión conocida no es universal y no demuestra aceleración para una IA de mercados.

## 2. Dos laboratorios conectados conceptualmente

### A. Demonio digital — migrado

- Mundo artificial determinista cerrado de 16 celdas.
- El runtime XI original aplica puertas CNOT y obtiene los observables.
- La evolución real se compara con los estados futuros predichos previamente.
- Una intervención externa desconocida produce divergencia.
- Si se conocen también las causas nuevas, vuelve la predicción exacta.
- Reversibilidad y una prueba separada de superposición cuántica.

Fuente idéntica: demonio/modelo.mjs y demonio/experimento.mjs. Original: Mundo X, commit 3d29556eff4d1079c791abab38e203fc209f1722.

### B. Historial temporal — primer adaptador

- Precio, economía y acontecimientos geopolíticos son hechos externos, no resultados fabricados por Ether.
- Cada registro contiene observed_at (cuándo ocurrió) y known_at (primera disponibilidad verificada).
- Valores originales decimales y URLs de procedencia se preservan.
- La consulta asOf(corte) solo muestra registros conocidos antes o en el corte.
- Las revisiones económicas se guardan por separado y se seleccionan según la fecha de disponibilidad.
- historia/ether-xi.mjs proyecta los bytes del historial elegible a Inverse Memory con el XI ORIGINAL y exige recuperación idéntica.

**Límite de persistencia:** el CLI aislado mundo_x_quantum inicia una sesión nueva para cada ejecución. La fuente persistente es el archivo JSONL; la proyección XI actual verifica fidelidad dentro de una transacción, NO es aún una base mundial persistente ni comprime automáticamente millones de precios.

## 3. La IA que aún falta — hipótesis de investigación

    Z_t = C_Ether(observaciones conocidas hasta t)
    F_estimado_t = AprenderLeyes(Z_0 ... Z_t)
    pronostico_t_h = P(Y_(t+h) | Z_t, F_estimado_t)
    nueva_observacion -> CorregirModelo(F_estimado_t)

No hay una IA entrenada que implemente todavía esta ecuación. Una fuente geopolítica estructurada puede incorporarse sin una segunda IA; comprender narrativas textuales completas requerirá capacidades adicionales que deben comprobarse.

La representación Z debe conservar aquello que el problema exige para predecir, no simplemente usar pocos bytes.

## 4. Pruebas exigidas antes de hablar de ventaja

1. El modelo no lee información publicada después de su tiempo de predicción.
2. El entrenamiento no mira datos de evaluación final.
3. Se compara contra persistencia y referencias convencionales bajo la misma información.
4. Se miden errores, calibración, memoria, tiempo y causas de abstención.
5. Se registran revisiones económicas, eventos con publicación tardía y cambios de régimen.
6. Toda ventaja atribuida a Ether se demuestra sobre el MISMO cálculo.

## 5. Estado real

| Componente | Estado |
| --- | --- |
| Demonio XI sobre mundo artificial | Migrado; test en CI |
| Ether/Inverse Memory | Dependencia del núcleo original fijado por SHA |
| Contrato de precios, economía y geopolitica | Implementado |
| Filtrado temporal y revisiones conocidas | Implementado |
| Recuperación byte por byte desde XI | Prueba automática con el motor original |
| Descarga de todo el mercado mundial | No importada |
| Conectores automáticos Shiller / FRED / GDELT | No instalados |
| IA que aprende leyes y predice mercados | No construida |
| Predicción perfecta o ventaja demostrada en trading | No existe |
| Hardware cuántico físico | No existe |

LaPlaceDIG es el repositorio central de la nueva investigación. Mundo X sigue siendo la dependencia de tecnología propia, no otra app de destino.
