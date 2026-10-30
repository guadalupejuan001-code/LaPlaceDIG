# LAPLACE · Diario prospectivo

Esta rama guarda exclusivamente datos públicos de investigación, no código ni cuentas.
El flujo horario de main añade pronósticos ANTES del objetivo y después sus resultados,
incluyendo errores, ausencias y fallos. No ejecutar operaciones financieras.

- `seguimiento/diario.jsonl`: eventos añadidos y encadenados con SHA-256.
- `seguimiento/resumen.json`: recuentos por horizonte y versión; vista de últimas 100 entradas.
- `seguimiento/entradas/`: datos de entrada comprimidos para reproducir las emisiones.

La configuración inicial es 15, 30, 60, 240 y 1440 minutos. No borrar ni reescribir
pronósticos al recalibrar. Los resultados usan cierres del minuto objetivo, no el segundo exacto.
El flujo se solicita cada hora. No hay resultados hasta que venzan los primeros objetivos.
