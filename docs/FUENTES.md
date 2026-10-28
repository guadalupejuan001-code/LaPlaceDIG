# Fuentes públicas históricas para LaPlaceDIG

**Estado:** catálogo comprobado de fuentes, NO una base de datos descargada. Este repositorio no contiene cotizaciones ni noticias presentadas como reales. No inventar fechas de publicación.

## Precios: Shiller

Fuente de investigación: https://shillerdata.com/
Página académica original: https://www.econ.yale.edu/~shiller/data.htm

El profesor Robert Shiller publica datos mensuales del mercado de Estados Unidos desde enero de 1871, incluyendo precios, dividendos, beneficios y otras series. Son series históricas reconstruidas; no todas contienen el momento en que cada valor habría sido conocido por un operador de aquella fecha.

Contrato de uso: distinguir valor observado, promedio mensual, fecha de publicación original y fechas de revisiones posteriores. Si no se conoce cuando un registro fue disponible, NO utilizarlo como característica de una predicción histórica estricta a esa fecha.

No confundir un índice histórico mensual anterior a 1993 con la historia de cotizaciones del ETF SPY.

## Economía: FRED y ALFRED — Reserva Federal de St. Louis

https://fred.stlouisfed.org/
https://fred.stlouisfed.org/docs/api/fred/realtime_period.html
https://fred.stlouisfed.org/docs/api/fred/series_vintagedates.html

FRED permite consultar series económicas; ALFRED guarda versiones históricas y fechas de revisiones. El API web oficial requiere una clave para muchas operaciones. Las fechas de versión (vintage) son esenciales: comparar una predicción antigua con datos revisados después produciría fuga de futuro.

Granularidad: el día de una versión de ALFRED no necesariamente especifica la hora precisa de publicación. Para experimentos intradía se necesita el anuncio/release real. Si no está verificado, abstenerse.

## Narrativa geopolítica: GDELT

Portal: https://www.gdelt.org/
Ficheros originales: https://gdeltproject.org/data.html
Código de eventos: https://data.gdeltproject.org/documentation/GDELT-Event_Codebook-V2.0.pdf

GDELT 1.0 permite estudiar eventos desde 1979. GDELT 2.0 cubre desde 2015 y el sistema publica actualizaciones frecuentes, con eventos y menciones. Un evento puede haber sucedido antes de que un artículo lo describa: no son el mismo tiempo. La clasificación automática tampoco garantiza que un artículo sea cierto.

**No es necesario entrenar otra IA para empezar.** Los códigos estructurados de eventos pueden analizarse primero. Una IA de lenguaje solo debe agregarse si demuestra mejoras en extracción o razonamiento, y se evalúa separadamente.

## Ingesta segura en LaPlaceDIG

Hechos normalizados:

- precio: activo, base de precio, moneda, valor decimal original, fecha de observación, fecha real de disponibilidad, URL de fuente.
- economia: serie, unidad, valor decimal y fecha de revisión conocida.
- geopolitica: código de evento, resumen registrado, región y fecha en que la noticia pudo conocerse.

Todo dato debe contener:
- observed_at: cuando sucedió/terminó la observación;
- known_at: momento UTC comprobado en que la información estuvo disponible;
- source_url: referencia original rastreable.

No deducir known_at = observed_at salvo evidencia. Tampoco asumir que descargar un dato hoy significa que ese mismo dato estaba publicado históricamente entonces. Un historial reconstruido podría ser útil para investigación descriptiva, pero no autoriza evaluar supuestas predicciones antiguas sin controlar su cronología.

El importador ya admite archivos locales JSONL y CSV estrictos de precios. Las descargas automáticas y la unificación de calendarios siguen pendientes de implementación y licencia/revisión de cada proveedor.

## Atribución y derechos

La accesibilidad pública no implica derecho universal a copiar o redistribuir una base. Revisar términos de cada fuente antes de almacenar masivamente o publicar muestras. Los datos reales del usuario no se incluyen automáticamente en este repositorio público.

No prometer todos los precios de todos los activos desde el origen histórico: su cobertura, calidad, cambios de símbolo, splits, supervivencia y datos faltantes varían según la fuente.
