# Bitcoin: observación actual y calibración histórica

El objetivo de mercado de Laplace queda limitado a **BTC-USD**. Los módulos E001–E004 y el runtime original permanecen disponibles. Los dos resultados de E003 conservan su significado; este agente recoge evidencia y la calibración actúa sobre la ruta probabilística, sin convertirla en una ley determinista.

## Observatorio privado

[Abrir Laplace Bitcoin](https://laplace-bitcoin-observatorio.guadalupejuan001.chatgpt.site).

«Actualizar ahora» consulta Coinbase Exchange, CoinDesk, Decrypt, Cointelegraph, SEC, Reserva Federal, BCE y ONU Noticias. Guarda la operación de mercado con fecha original, captura y decimal original; recoge hasta cinco titulares relevantes por fuente con sus enlaces. Los medios se filtran a Bitcoin; los organismos oficiales pueden aportar contexto. Las categorías monetaria y regulatoria son visibles, pero no entran como características del predictor geopolítico/humanitario.

Cada captura es independiente y persiste en D1. Un bloqueo temporal evita actualizaciones simultáneas. Los titulares repetidos conservan su primera fecha de captura; las actualizaciones posteriores solo registran que se volvieron a observar. Una caída de una fuente queda registrada y no fabrica valores. La cotización es `spot_quote`: no se presenta como cierre diario ni se incorpora como tal al entrenamiento.

El código canónico es `bitcoin/agente.mjs`; el sitio usa una copia idéntica. El proyecto del sitio es `appgprj_6ae174ecf0f88191b2304800cdbf4ad6`, con repositorio de fuente gestionado separado. No contiene claves de bolsa ni ejecuta órdenes.

Para una captura local nueva:

```bash
node tools/laplace.mjs actualizar-bitcoin registros/captura-001.json registros/hechos-001.jsonl
```

Crear antes `registros/`. Los archivos existentes no se sobrescriben. Exportar una noticia antigua encontrada hoy conserva `known_at` de hoy: no transforma su título actual en una versión histórica.

## Prueba corta del pasado

La métrica es `Y = 1` si el cierre BTC/USD aumenta más de **10 puntos básicos** durante las próximas **24 horas**; en otro caso, `Y = 0`. Es un coste total supuesto para definir la etiqueta, no un cálculo de rentabilidad ejecutable. Las únicas entradas de inferencia siguen siendo hechos geopolíticos y humanitarios.

Cada ventana usa 28 días de entrenamiento, 8 de selección/validación, 8 de calibración y 7 de prueba reservada. Avanza siete días; los períodos de prueba no se solapan. Se eliminan etiquetas que cruzan particiones. El prior se estima en entrenamiento; las condiciones se seleccionan en validación. Los parámetros se recuperan del estado Ether/XI nativo antes de emitir los pronósticos retrospectivos.

El calibrador prueba la rejilla fija `lambda = 1, 0.75, 0.5, 0.25, 0` para `p_cal = lambda*p + (1-lambda)*prior_cal`. La frecuencia de calibración usa suavizado `(positivos+1)/(n+2)`. Se ajusta únicamente con al menos ocho predicciones narrativas del tramo de calibración; con menos, conserva la identidad. Las abstenciones permanecen abstenciones. No se prueban parámetros contra las etiquetas finales para escoger un ganador.

Para repetir la descarga y las dos evaluaciones con nombres nuevos:

```bash
node tools/laplace.mjs descargar-bitcoin 2026-07-30T00:00:00Z 2026-10-28T00:00:00Z registros/historia-001.json
node tools/laplace.mjs calibrar-bitcoin registros/historia-001.json ./build-ether/mundo_x_quantum registros/estricta-001.json strict
node tools/laplace.mjs calibrar-bitcoin registros/historia-001.json ./build-ether/mundo_x_quantum registros/exploratoria-001.json exploratory_close_availability registros/pasado-001.json
```

`evidencia/BTC-HISTORICO.json` contiene la muestra descargada: 91 cierres y 715 anotaciones narrativas, con manifiesto, hashes y 91 archivos GDELT identificados. El muestreo toma un lote de las 00:00 UTC por día y hasta dos eventos por tema, sin elegirlos por resultados de precios. No representa todas las noticias ni todos los patrones posibles. El texto de cada anotación se genera desde los campos estructurados; no se descargan hoy los cuerpos de artículos antiguos.

GDELT `DATEADDED` identifica la incorporación al índice, distinta de la fecha del suceso. Se retrasa 24 horas y se toma además el máximo con `Last-Modified` del archivo; cada ZIP queda identificado por SHA-256. Los códigos CAMEO 073/0863 se relacionan con acceso/entrega de ayuda, 0871 con alto el fuego, 163 con sanciones y raíz 05 con cooperación diplomática. Raíces 19/20 y 1623 son proxies declarados: combate/violencia masiva no demuestra una escalada relativa y reducción de asistencia no demuestra bloqueo físico. Las anotaciones automáticas tampoco verifican la verdad del reporte. La región queda GLOBAL.

Los cierres de Coinbase descargados hoy **no incluyen versiones históricas originales verificadas**. El ledger conserva `known_at` de la descarga. Por eso el modo **strict** devuelve evidencia insuficiente para todos los cortes antiguos. El modo **exploratorio** crea solo en memoria una vista que supone disponibilidad al final de cada día. No modifica el ledger y deja la hipótesis explícita en el informe. La versión histórica de los precios sigue sin certificarse.

## Resultado guardado, sin ocultar el resultado negativo

`evidencia/BTC-CALIBRACION.json` conserva seis ventanas, 42 pronósticos reservados, sus hashes, observaciones y estadísticas por patrón/modelo. Los momentos `frozen_at` son cortes lógicos de la reconstrucción, no fechas reales de emisión en el pasado. Las 42 decisiones incluyen 14 probabilidades narrativas y 28 abstenciones. Estas últimas se puntúan con el prior congelado de su ventana.

| Puntuación Brier (menor es mejor) | Valor |
| --- | ---: |
| Referencia del entrenamiento | 0.247090 |
| Narrativa sin calibrar | 0.248952 |
| Narrativa calibrada | 0.255053 |

La narrativa no superó la referencia y el calibrador empeoró la prueba reservada. **No se activa como predictor en vivo.** El informe estricto se conserva por separado en `BTC-CALIBRACION-ESTRICTA.json`. La muestra es pequeña, el archivo narrativo está muestreado y la reconstrucción de precios tiene una hipótesis sin verificar: este resultado no acredita precisión, causalidad ni ventaja financiera.

El panel permite revisar las 42 fechas y filtrar las 14 con probabilidad o las 28 abstenciones. `evidencia/BTC-PASADO.json` compara cada pronóstico con los dos cierres reales. Por ejemplo, al corte del 10 de octubre, la probabilidad narrativa de superar +0,10% al día siguiente fue 43,33% (calibrada: 40%); el cierre pasó de 82.544,71 a 82.910,80 USD y superó el umbral. La dirección favorecida falló en ese caso. No se cuenta una abstención como acierto ni se reemplaza por una predicción segura después de conocer el resultado.

Las pruebas automáticas comprueban que alterar precios posteriores al corte de calibración no cambia el primer modelo, calibrador ni los pronósticos sellados. También rechazan etiquetas futuras, fechas falsas, ZIP fuera de límites y cotizaciones antiguas.

## Fuentes técnicas

- [Ticker público de Coinbase](https://docs.cdp.coinbase.com/api-reference/exchange-api/rest-api/products/get-product-ticker).
- [Velas de Coinbase: inicio del intervalo, campos y posibles ausencias](https://docs.cdp.coinbase.com/api-reference/exchange-api/rest-api/products/get-product-candles).
- [Contrato de campos GDELT 2.0](https://data.gdeltproject.org/documentation/GDELT-Event_Codebook-V2.0.pdf).
- [Manual de códigos CAMEO](https://data.gdeltproject.org/documentation/CAMEO.Manual.1.1b3.pdf).

El siguiente entrenamiento debe usar nuevas observaciones y nuevos períodos reservados. Reajustar sobre estos mismos 42 casos y volver a llamarlos prueba final contaminaría la evaluación.
