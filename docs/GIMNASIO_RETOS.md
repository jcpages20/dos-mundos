# Club Atlas: entrenamientos que se juegan

Actualización: [rutinas de 45 segundos, figuras y accesorios](GIMNASIO_RUTINAS.md), entrada `casa-rpg.html?rutinas=10`. Las pruebas descritas aquí permanecen disponibles seleccionando «Reto clásico».

Entrada actualizada: `casa-rpg.html?retos=9`. Gabi con carta y estrella: `casa-rpg.html?gabi=1&retos=9`. Entrar en Gimnasio → Menú → Reto de fuerza, cardio, telas o movilidad. El personaje camina hasta el material y allí se abre la explicación. También aparece «Jugar reto» al acercarse a una máquina adecuada. Las sesiones rápidas anteriores conservan sus botones y efectos.

## Cuatro controles diferentes

- **Fuerza:** mantener y soltar al alcanzar una franja que cambia en cada una de ocho repeticiones. Las pulsaciones rápidas y mantener indefinidamente no consiguen precisión. El peso se eleva con la presión del jugador.
- **Cardio:** pulsar izquierda o derecha cuando las notas cruzan la línea dorada. La serie alterna lados y cambia de ritmo. Se registran aciertos, fallos y combo; cada nota puntúa una vez.
- **Telas:** observar y repetir dos o tres secuencias, mantener el equilibrio con izquierda/derecha y cerrar una figura en el momento adecuado. La altura, inclinación y figura del personaje responden a la fase y al equilibrio real de la partida.
- **Movilidad:** mantener durante la inspiración y soltar durante la salida del aire, en cinco ciclos. La puntuación refleja la coordinación; dejar la pantalla sin participar no habilita guardar una sesión.

Suave, Normal y Reto tienen ventanas de acierto y secuencias diferentes. Suave mantiene visibles las flechas de las telas. Las partidas duran aproximadamente 15–40 segundos activos, según modalidad, dificultad y respuesta. Una pausa, cambio de aplicación o pestaña oculta congela los segundos y libera los controles pulsados.

Los sprites de JC y Gabi siguen siendo los originales. No se sustituyen ni se modifican sus PNG. Las posturas se construyen mediante el dibujo y la transformación del sprite existente, como en los interiores anteriores; no se anuncia una nueva hoja completa de animaciones. Los efectos ambientales mantienen la preferencia de reducir movimiento; los indicadores necesarios para la precisión siguen visibles.

## Resultados y progreso

Se muestra puntuación de 0 a 1000, combo y resultado: oro desde 850, plata desde 650, bronce desde 400. En telas también se informa del porcentaje de equilibrio; en movilidad, de coordinación. La puntuación mide la partida y no multiplica dinero o XP.

El resultado no aplica automáticamente una sesión. «Guardar sesión y marca» llama una sola vez a la actividad original correspondiente. Se conservan sus minutos, energía, hambre, diversión, habilidades y contador de sesiones: fuerza 60 min / 20 XP; cardio 35 min / 14 XP; telas 45 min / 18 XP físicos y 18 de telas; movilidad 20 min / 6 XP. Los modificadores de personalidad ya existentes siguen funcionando y el reto activo reconoce la modalidad una vez.

«Ensayo gratis» permite practicar sin cambiar minutos, dinero, energía, XP o progreso de pareja. Se conserva en el historial como ensayo y no reemplaza la mejor marca de entrenamiento. Los intentos sin participación suficiente permiten volver a probar, sin conceder premios.

El menú «Mis marcas y códigos» muestra las mejores puntuaciones por modalidad y dificultad y las últimas sesiones/ensayos. Un código como `ATLAS-T-N-4F2A91` fija tipo, dificultad y semilla. Copiarlo con la puntuación permite pasárselo a la pareja; se puede pegar el mensaje completo para repetir las mismas condiciones. La puntuación del mensaje no se importa como una marca propia.

Los códigos funcionan sin un servidor nuevo. Las marcas son personales y locales a cada personaje/dispositivo; esta entrega no añade una clasificación online ni simula resultados de Gabi o JC. Se mantienen chat, presencia, Firebase y proyectos compartidos anteriores.

## Guardados y recuperación

La única clave nueva es `dos-mundos-gym-retos-v1:<rol>:<nombre codificado>`. Contiene la partida activa, mejores marcas y hasta treinta entradas recientes. Se guardan las fases, secuencias, segundos y estado de controles; al recuperar una partida se entra en pausa con los botones liberados. Los datos de versión futura o una secuencia incompleta se conservan hasta que el jugador decida descartar esa partida. El baúl ya incluye este prefijo.

El punto del personaje se guarda en el pasillo de aproximación al material. Las posiciones dentro de la máquina o de la colchoneta no se usan como punto de aparición al recargar. Se puede salir al mundo durante una partida y retomarla al volver al gimnasio.

Cada intento tiene identificador y estado de recompensa. Pulsar o reintentar el guardado no contabiliza la sesión dos veces. El adaptador captura el estado previo de los espacios de juego y las cachés nativas; si falla el guardado, restaura progreso, habilidades y registros. El observador de Vida y planes engloba esta operación, de modo que un fallo tampoco deja un estado de ánimo o una aportación de pareja concedidos en memoria.

## Código y comprobaciones

`src/gym-games/model.mjs` contiene reglas deterministas independientes del render; `challenge-ui.mjs`, controles, pausa, resultados y marcas. `src/legacy/gym-challenge-bridge.mjs` adapta el guardado y las recompensas originales. `GymScene` añade acceso contextual y recorrido hasta el material; `GymRenderer` representa las acciones dentro del mismo escenario. La distribución de Atlas, colisiones, personajes y recursos gráficos anteriores se conservan.

Han pasado 105 casos distintos: once pruebas de retos en Chromium, 44 regresiones relacionadas y 50 comprobaciones Node de modelos, navegación, datos y sincronización existente. Se juegan las cuatro modalidades con teclado real, se comprueban controles táctiles y tamaños de 375/390/844/1440 px, códigos, recompensas únicas, ensayo, falta de energía, guardado lleno, pausa y recarga. Se verifican las recetas, personalidad y planes anteriores, casa, huerto, cine, parque/plaza, carta y baúl. La comprobación pública después del despliegue se registra en el PR.

No se han comprobado Safari/iPhone físico ni latencia y ergonomía en los dos teléfonos reales. Las competiciones por código se comparan a través de sus resultados personales; no hay una sesión deportiva compartida nueva en Firebase. El guion de escape room se entrega por separado para revisión, sin activar un escape room ni publicar sus soluciones en el juego.

Rama `feature/gym-retos-jugables`, desde `c97ddc9cd8bc89cccaa29400b8249d05da1b6b07`. Antes de editar se crearon la copia completa `dos-mundos-antes-gym-retos-c97ddc9.bundle` y la rama remota `backup/main-pre-gym-retos-c97ddc9`. Pages sigue sirviendo main sin dependencias nuevas. El lanzador y las importaciones modificadas de gimnasio usan `?retos=9` para renovar cachés.

Para revertir, revertir la fusión de esta entrega. Las claves anteriores de personaje, gimnasio, cartas, álbum y planes siguen siendo compatibles. La clave nueva puede conservarse: la versión anterior no la lee. Las sesiones ya guardadas mantienen sus valores nativos de XP y necesidades. No borrar progreso ni restablecer Firebase.
