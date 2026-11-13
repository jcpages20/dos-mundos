# dos-mundos
Juego de simulación de vida para dos jugadores.

Desarrollo 6.3+ en la rama `feature/casa-pokemon`: fase 1 de auditoría y protección de partidas. La casa RPG todavía no está implementada.

- [Auditoría y comparación con el kit](docs/AUDITORIA_FASE_1.md).
- [Plan de siete fases y arquitectura propuesta](docs/PLAN_TECNICO.md).
- [Copias, uso local, despliegue y rollback](docs/COPIAS_Y_ROLLBACK.md).
- [Pruebas y límites de verificación](docs/PRUEBAS_FASE_1.md).

Servir esta carpeta con `python -m http.server 8765 --bind 127.0.0.1` y abrir `http://127.0.0.1:8765/desarrollo.html`. `tools/partidas.html` permite descargar y recuperar el progreso local y las fotos del museo.

`index.html` mantiene el lanzador anterior. `index6.3.html` coincide con la referencia del kit y no se ha modificado. Todos los archivos históricos se conservan.
