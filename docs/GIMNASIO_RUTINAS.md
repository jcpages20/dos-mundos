# Atlas: rutinas cortas, decisiones y accesorios

Entrada: `casa-rpg.html?rutinas=10`. Para Gabi con carta y estrella: `casa-rpg.html?gabi=1&rutinas=10`.

Entrar en Gimnasio → Menú → Reto de fuerza, cardio, telas o movilidad. El formato predeterminado es «Rutina de 45 segundos». «Reto clásico» mantiene las cuatro pruebas anteriores, sus códigos y marcas. Los entrenamientos rápidos del gimnasio siguen disponibles.

## Cómo se juega

Cada rutina tiene cinco segundos de preparación, tres tramos de diez segundos y un cierre de diez segundos. En los dos primeros segundos de cada tramo se puede elegir entre una variante segura (hasta 220 puntos) y una exigente (hasta 300). La segura queda seleccionada si no se cambia. Las variantes exigentes tienen condiciones más precisas; la decisión no cambia los minutos ni XP del entrenamiento original. El cierre aporta hasta 100 puntos. Una rutina segura perfecta puede conseguir 760 puntos; con los tres tramos exigentes se puede llegar a 1000.

Los segundos son activos: pausa, cambio de aplicación, pérdida de foco y orientación detienen el reloj y liberan los controles. Salir y volver permite recuperar el intento en pausa. La preparación permite probar el movimiento sin sumar puntuación o participación para cobrar premios.

- **Fuerza:** tres levantamientos por tramo, manteniendo para elevar la carga y soltando dentro de la franja. Las pesas y brazos siguen el movimiento; la barra desciende tras soltar. La variante exigente eleva más deprisa y exige mayor precisión. El cierre pide sostener dos segundos y soltar. Se adaptan también las piernas en prensa, los agarres de poleas y las mancuernas.
- **Cardio:** alternar izquierda y derecha al pasar las notas por la línea. El trote cómodo lleva cuatro pasos por tramo; el intervalo exigente, seis, con menor tolerancia. La cadencia del personaje y los metros dependen de los aciertos. El cierre es una última recta de seis pasos. Bicicleta, remo y saco usan poses correspondientes al material.
- **Telas:** elegir Nudo o Estrella; mantener para ascender y soltar a la altura marcada. Después corregir el balanceo con izquierda/derecha y pulsar «Asegurar figura». Se puede seguir corrigiendo antes de asegurarla. El cierre pide descender hasta la colchoneta y soltar. La altura, brazos, piernas y figura se dibujan a partir de los controles y el estado del intento.
- **Movilidad:** mantener al inspirar y soltar durante la salida del aire; la postura estable y la amplia tienen cadencias y amplitudes distintas. El cierre conserva ciclos tranquilos. Dejar la pantalla sin participar no permite guardar un entrenamiento.

La cámara se acerca durante las rutinas para que el movimiento se vea en teléfono. Las posturas se articulan a partir de recortes de los mismos PNG originales de JC y Gabi; no se sustituyen avatares ni se editan los recursos originales. Las demás escenas mantienen su dibujado anterior. No se añade el paquete de sonidos, vibraciones, partículas o celebraciones que el usuario excluyó de esta entrega.

## Desbloqueos y armario

«Mis rutinas y accesorios» muestra vistas del personaje con cada accesorio, requisitos, progreso y botones para usar o quitar el accesorio. Los accesorios se ven en Atlas, al caminar y entrenar; solo corresponden al personaje y nombre actuales.

| Requisito | Desbloqueo |
| --- | --- |
| Primera rutina guardada | Muñequeras Atlas |
| Tres rutinas guardadas | Muñequeras lavanda |
| Seis rutinas guardadas | Medalla del club |
| Dos rutinas guardadas de fuerza | Escalera de fuerza: objetivos de carga más altos |
| Dos rutinas guardadas de cardio | Intervalos de la Castellana: más pasos y aceleración entre intervalos |
| Dos rutinas guardadas de telas | Vela y mariposa: dos figuras nuevas, con balanceo distinto |
| Dos rutinas guardadas de movilidad | Fluir sobre la esterilla: cadencia asimétrica y cambios laterales de postura |

Las rutinas avanzadas se pueden probar desde el principio marcando «Ensayo gratis». Un ensayo no concede desbloqueos, no reemplaza marcas de entrenamiento y no cambia energía, dinero, minutos, XP o planes de pareja. Los accesorios son cosméticos, no cuestan dinero ni mejoran las ventanas de acierto. En esta entrega no se colocan trofeos en las casas ni se cambia su decoración.

Los desbloqueos se conceden al guardar la sesión, una sola vez por intento. Acabar, reabrir el resultado o copiar un código no concede recompensas. Se conserva la función original de entrenamiento: fuerza 60 minutos del mundo / 20 XP; cardio 35 / 14; telas 45 / 18 físicos y 18 de telas; movilidad 20 / 6 y recuperación. Las necesidades y personalidad siguen usando sus funciones existentes.

## Compatibilidad de datos

Se mantiene `dos-mundos-gym-retos-v1:<rol>:<nombre codificado>`. Se añaden campos compatibles: `journey` (versión 1, contadores por modalidad y accesorio equipado), `engine` y `routine` en intentos y resultados. Los campos desconocidos compatibles se conservan. Los datos de una versión futura del armario no se editan ni se reinician.

Los intentos clásicos conservan su modelo versión 1. Los nuevos usan modelo versión 2; una recarga comprueba formato, semilla, plan, reloj de fase y valores, y reanuda en pausa. No se convierten ni descartan automáticamente intentos anteriores. La posición guardada sigue siendo el pasillo de aproximación, no el interior de una máquina.

Las mejores marcas clásicas mantienen `modalidad:dificultad`; las nuevas usan `modalidad:dificultad:routine:rutina`. Los códigos clásicos `ATLAS-…` siguen funcionando. `ATLAS2-T-N-B-000B15` identifica las nuevas rutinas: deporte, dificultad, recorrido base/avanzado y semilla. Cada jugador elige el riesgo durante los tramos. Pegar un mensaje con la puntuación no importa esa marca como propia. No hay clasificación online ni nuevas rutas Firebase.

El guardado de recompensa incluye la progresión y el armario en la transacción local anterior. Si falla una escritura, se restauran progreso nativo, habilidades, registros y cachés antes de que Vida y planes observe un entrenamiento. Reintentar conserva la recompensa única.

## Módulos

- `src/gym-games/routine-model.mjs`: reloj, decisiones, condiciones, puntuación, códigos y recuperación.
- `src/gym-games/progression.mjs`: rutinas, requisitos, contadores y accesorios; reglas compartidas con el adaptador histórico.
- `src/characters/exercise-actor.mjs`: articulación del arte original y accesorios deportivos.
- `challenge-ui.mjs`, `gym-renderer.mjs`, `gym-scene.mjs`: controles, armario, poses y entrada física al material.
- `gym-challenge-bridge.mjs`: compatibilidad de guardados, premios nativos y desbloqueos únicos.

## Comprobación y publicación

Han pasado 126 casos distintos: once nuevos de navegador, once de retos clásicos, 44 regresiones relacionadas y 60 pruebas Node. Se juegan las cuatro modalidades con controles reales; se comprueban dos rutinas de Gabi para desbloquear Vela/Mariposa, equipar y recargar, cuota y reintento, ensayo avanzado, marca clásica conservada, recuperación del riesgo elegido, separación por personaje, datos futuros, códigos y tamaños 375/390/844/1440 px. Una prueba usa eventos táctiles reales del navegador para mantener, soltar y pausar durante un toque. La pantalla de resultado clásica se muestra al terminar el último movimiento para que Enter permita guardar de inmediato.

Las regresiones incluyen copias y restauración del museo, carta/estrella, gimnasio anterior, casa y reentrada, Madrid, cine/plataformas, huerto, parque/plaza, personalidad, planes, chat y radio. La comprobación pública después de Pages se registra en el PR. Se usan perfiles desechables; no se entra en cuentas ni se modifican partidas reales. Queda pendiente la ergonomía en Safari/iPhone físico y la comprobación en los dos teléfonos reales. El gimnasio sigue siendo una escena local; la presencia y el chat anteriores se conservan.

La rama es `feature/gym-rutinas-figuras`, desde `c66c166fa0fcb75338c355035623f9fbf810a266`. Antes de editar se crearon la copia completa `dos-mundos-antes-gym-rutinas-c66c166.bundle` y la rama remota `backup/main-pre-gym-rutinas-c66c166`. GitHub Pages publica main; las importaciones modificadas usan `?rutinas=10` para renovar caché sin dependencias nuevas.

Rollback: revertir la fusión de esta entrega, sin borrar partidas ni restablecer Firebase. El cliente anterior conserva los campos de armario desconocidos y las marcas clásicas. Un intento nuevo versión 2 quedaría conservado pero no sería reanudable con el motor anterior: se puede descartar ese intento o volver al cliente nuevo; no se pierde el progreso ya guardado.

El escape room sigue pendiente de revisión y no se incluye en esta entrega.

Capturas con perfiles de prueba: [telas](gym-rutinas/telas-iphone.png), [Mariposa](gym-rutinas/mariposa-iphone.png), [cardio](gym-rutinas/cardio-iphone.png) y [armario](gym-rutinas/armario-iphone.png).
