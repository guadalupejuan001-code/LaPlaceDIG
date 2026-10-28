# Continuidad de Laplace

## Intención

Construir el demonio de Laplace digital: representar estados, descubrir leyes y calcular consecuencias. La inteligencia debe aprender de observaciones y reconocer lo que desconoce. LaPlaceDIG es el repositorio de este proyecto.

La dirección original usa Ether como estado/reglas y sus diferencias, Inverse Ether Memory para consultas y XI como lenguaje ejecutable. Evitar reemplazar la tecnología propia por un modelo externo. No modificar REVERSE ni BBY Q desde este trabajo.

## Punto de partida conservado

La migración inicial incorporó un mundo de 16 celdas con reglas conocidas y una memoria histórica de precios, economía y acontecimientos. El núcleo original de Mundo X se fija al commit `3d29556eff4d1079c791abab38e203fc209f1722`. Los programas migrados del demonio se conservan idénticos.

La prueba de reglas dadas acreditó 33/33 estados de un universo cerrado, no aprendizaje. Las consultas históricas separan cuándo ocurrió un hecho y cuándo se pudo conocer. No se ha descargado toda la historia financiera.

## Avance E001

Se agregó un aprendiz de leyes afines binarias. El anfitrión planea la eliminación con entradas; XI transforma las salidas y ejecuta las predicciones. Los resultados aprendidos se recuperan reproduciendo un programa XI guardado. Se verifican evidencia insuficiente, hipótesis refutadas, ausencia de acceso a publicaciones futuras y un pronóstico reservado de 32 pasos.

Esto inicia la parte de descubrimiento de reglas. No completa una inteligencia general ni la predicción de mercados. Las fuentes y los límites técnicos se explican en [INTELIGENCIA.md](INTELIGENCIA.md) y [ARQUITECTURA.md](ARQUITECTURA.md).

## Restricciones que siguen vigentes

- Conservar el runtime original y una autoridad clara del estado aprendido.
- No incorporar información futura ni inventar precios, precisión o disponibilidad histórica.
- Explicar qué hace el anfitrión y qué calcula XI.
- Medir recursos reales; no presentar memoria lógica como RAM ilimitada.
- Mantener pruebas reproducibles, ramas de trabajo y revisión por PR.
- Distinguir resultados sintéticos de evidencia del mundo abierto.

## Próximo objetivo

Ampliar las familias de reglas y el manejo de ruido/cambios de régimen. El paso hacia datos reales debe conservar el contrato temporal existente y demostrar predicción fuera de muestra. No rebajar la misión a ejecutar un simulador con leyes entregadas de antemano.

## Dirección solicitada en E002

El usuario pidió fijar una métrica de interés, implementar entrenamiento y fórmula, crear el espacio con sus leyes y hacer que una probabilidad dependa exclusivamente de la narrativa geopolítica y humanitaria. Esa exclusividad se aplica a las entradas de inferencia. Los precios son necesarios para enseñar y medir un objetivo de mercado, pero no se usan como características del predictor.

Se fija por defecto BTC/USD, horizonte 24 horas y retorno superior a 10 puntos básicos de coste total supuesto. Se aprenden condiciones sobre temas, regiones, combinaciones y secuencias. Las probabilidades se estiman con conteos suavizados hacia una referencia de entrenamiento; se seleccionan solo mediante validación anterior al test. Cada patrón generado queda auditado, incluidos descartes y falta de soporte. La prueba final se reserva con un modelo congelado.

La estimación de E002 es clásica y propia en el anfitrión existente. Las reglas y estadísticas guardadas tienen una única copia autoritativa en el checkpoint reproducible Ether/XI. Se conservan ambos experimentos y sus diferencias técnicas. La evidencia de E002 sigue siendo sintética. El próximo avance debe reunir capturas históricas verificables y precios con disponibilidad documentada, y comprobar la señal narrativa fuera de muestra sin agregar precios a las entradas.
