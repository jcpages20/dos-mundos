# dos-mundos
Juego de simulación de vida para dos jugadores.

Dos Mundos conserva sus versiones anteriores y añade una primera casa RPG jugable con habitaciones, colisiones, personajes originales y acciones contextuales. Es una entrada de prueba; el multijugador del nuevo interior y la colocación de muebles siguen en desarrollo.

- [Abrir la casa RPG de prueba](casa-rpg.html).
- [Abrir la versión 6.1 anterior](index6.1.html).
- [Casa RPG: implementación, pruebas y pendientes](docs/CASA_RPG_FASE_2.md).
- [Corrección de la entrada tras salir caminando de casa](docs/ARREGLO_ENTRADA_CASA.md).
- [Club Atlas: gimnasio amplio, máquinas y telas aéreas para Gabi](docs/GIMNASIO_RPG.md).
- [Paseos por Madrid: exteriores, vecinos, tráfico y plano del barrio](docs/MADRID_EXTERIORES.md).
- [Cómo utilizar el paseo y el plano desde el iPhone](docs/PASEO_IPHONE.md).
- [Huerto RPG: cultivo, ampliación de parcelas y museo conectado a Madrid](docs/HUERTO_RPG.md).
- [El Retiro y Plaza Mayor: paseos, bancos, terrazas y vecinos](docs/PARQUE_PLAZA_MADRID.md).
- [Vida y planes: personalidad, ánimo temporal y proyectos compartidos](docs/VIDA_Y_PLANES.md).
- [Cine Estrella: mejora visual y cartelera del día](docs/CINE_CARTELERA.md), disponible desde la misma entrada de la casa RPG.
- [Gimnasio y cafetería renovados, salida a la calle y cartelera por plataformas](docs/INTERIORES_CIUDAD.md).

- [Auditoría y comparación con el kit](docs/AUDITORIA_FASE_1.md).
- [Plan de siete fases y arquitectura propuesta](docs/PLAN_TECNICO.md).
- [Copias, uso local, despliegue y rollback](docs/COPIAS_Y_ROLLBACK.md).
- [Pruebas y límites de verificación](docs/PRUEBAS_FASE_1.md).

Servir esta carpeta con `python -m http.server 8765 --bind 127.0.0.1` y abrir `http://127.0.0.1:8765/casa-rpg.html`. La entrada anterior de la fase 1 sigue en `desarrollo.html`. `tools/partidas.html` permite descargar y recuperar el progreso local y las fotos del museo.

`index.html` mantiene el lanzador anterior. `index6.3.html` coincide con la referencia del kit y no se ha modificado. Todos los archivos históricos se conservan.
