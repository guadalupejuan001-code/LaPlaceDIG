# U003 — mundo económico, logístico y de información

U003 amplía la captura U002/369 sin sustituirla. El principio es: añadir
**dominios**, no números arbitrarios.

## Capas nuevas

### Mercados regionales y futuros
- Benchmarks de Japón, Hong Kong, China, Europa, Reino Unido, Alemania, Francia,
  España, India, Brasil, México, Australia, Corea, Taiwán, Singapur y Canadá.
- Futuros públicos de oro, plata, WTI, gas natural, cobre, maíz, trigo, soja,
  café y azúcar.
- Cada serie aporta cierre, retorno 5 min, retorno 30 min y volumen relativo.

Estos benchmarks siguen usando el adaptador público de mercado de B001. No se
presentan como feed directo/licenciado de cada bolsa.

### Bolsas directas
- JPX/J-Quants V2: adaptador directo implementado; solo se activa cuando existe
  `JQUANTS_API_KEY`.
- B3 y Deutsche Börse se marcan `requires_license`. U003 no las sustituye
  silenciosamente por terceros.

### Bancos centrales
- BIS WS_CBPOL: tasas de política de múltiples bancos centrales. U003 conserva
  el período de referencia y el momento en que LAPLACE conoció la observación.

### Empleo
- BLS Public Data API: nóminas no agrícolas, desempleo y participación laboral.
- FRED público: solicitudes iniciales y continuadas de desempleo y fed funds.
  En particular, las solicitudes semanales dan una señal de mayor frecuencia
  que los indicadores laborales mensuales.

### Releases macro con vintages exactos
- Con `FRED_API_KEY`, U003 consulta FRED/ALFRED con `output_type=4` para conservar
  **la publicación inicial** de GDP, CPI, desempleo, payrolls, ventas minoristas
  y producción industrial. `known_at` usa la fecha vintage/realtime_start de la
  publicación inicial, no la fecha en que LAPLACE la descargó.
- Sin clave, la fuente queda `requires_credentials`; no se inventa el vintage.

### Electricidad
- NESO Open Data: demanda nacional/transmisión de Gran Bretaña, generación
  embebida e interconectores. Se usa solo la última observación marcada como
  actual.

### Transporte marítimo
- IMF PortWatch / UN Global Platform: suma mundial de llamadas a puerto,
  llamadas cargo/tanker y estimaciones de importación/exportación. Es AIS
  agregado; no es aduana ni movimiento exacto de mercancía.

### Transporte aéreo
- OpenSky: adaptador OAuth2 implementado, pero **no se consulta sin
  autorización**. Se activa con `OPENSKY_CLIENT_ID` y
  `OPENSKY_CLIENT_SECRET`. Solo se conservan agregados regionales y no
  identificadores de aeronaves.

### Noticias geolocalizadas
- GDELT GEO 2.0: conteos y distribución hemisférica de ubicaciones asociadas a
  conflicto, protesta, comercio, energía, shipping, ciber y desastres.
- Los conteos representan geografía de cobertura/noticias, no hechos causales.

## Vintages y tiempo conocido

Para las series ALFRED configuradas, U003 puede conservar la fecha vintage de
publicación inicial. Para el resto de fuentes, U003 no retroinventa la fecha
exacta en que una cifra histórica fue publicada. Cada captura registra:
- `observed_at`: período/instante del fenómeno;
- `known_at`: instante en que LAPLACE recibió la observación.

El registro programado podrá conservar sucesivas capturas como vintages
punto-en-tiempo. Para una fuente que no expone timestamp de publicación, esto
produce un **primer-visto por LAPLACE**, no una publicación histórica exacta.

## XI / Ether

El snapshot U003 usa el mismo contrato universal y la misma codificación
compacta de U002. El límite sigue siendo 4096 estados por snapshot. La prueba
de integración materializa la captura completa en Inverse Ether Memory y exige
round-trip exacto antes de aprobar.

U003 no activa estas señales en M001/XN01. Primero se debe construir historia
punto-en-tiempo y demostrar mejora fuera de muestra.

## Registro prospectivo

`universo/registro-u003.mjs` y el workflow
`universo-u003-registro.yml` producen una captura horaria. Cuando se publica en
la rama `laplace-registro`, cada commit conserva el snapshot punto-en-tiempo.
Esto permite después entrenar y probar señales U003 sin reconstruir el pasado
con datos revisados.

Secrets opcionales soportados:
- `FRED_API_KEY`: vintages ALFRED exactos.
- `OPENSKY_CLIENT_ID` / `OPENSKY_CLIENT_SECRET`: tráfico aéreo.
- `JQUANTS_API_KEY`: JPX directo.
