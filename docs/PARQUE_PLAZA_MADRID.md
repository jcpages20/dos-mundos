# Un parque y una plaza con acento madrileño

Los destinos originales Parque y Plaza conservan sus entradas, IDs y actividades y abren dos escenarios caminables de 1280 × 960. El parque se inspira en El Retiro; la plaza, en Plaza Mayor. Son interpretaciones originales y simplificadas, con pixel art nuevo, sin sprites de Nintendo ni fotografías de referencia integradas como mapas.

Entrada del juego: [Dos Mundos](https://jcpages20.github.io/dos-mundos/casa-rpg.html?madrid=7). Para visitar los escenarios: Pasear → Plano → Parque o Plaza. También funcionan sus accesos anteriores. Calle y la salida inferior regresan a la ciudad y recuperan el paseo que se estaba usando.

## Escenarios y actividades

El Retiro tiene caminos de albero, estanque con barcas y reflejos, pabellón de cristal, columnata, rosaleda, castaños, cipreses, quiosco, bancos verdes, fuente de azulejos y puerta de hierro. Plaza Mayor incorpora fachadas rojizas y ocres, balcones, soportales, tejados de pizarra, reloj, fuente, monumento de bronce, terrazas, quioscos y guitarra. El agua y las palomas tienen movimiento ambiental; las farolas se iluminan por la noche y se mantiene el clima del juego. Se respeta reducir movimiento del sistema.

Se camina tocando el suelo, con flechas de teclado o controles táctiles. Los accesos rápidos llevan físicamente al personaje al rincón elegido. Plano muestra todo el escenario y permite seleccionar un destino; Acercar recupera la cámara que sigue al personaje. Agua, bases de edificios, troncos, bancos, terrazas, farolas y macetas tienen colisiones. Las puertas y la rosaleda mantienen su paso central.

Las actividades delegan en las funciones nativas. No hay una segunda economía ni recompensas por abrir el mapa o visitar un monumento:

| Lugar | Actividad | Minutos del juego | XP nativa |
| --- | --- | ---: | ---: |
| Parque | Pasear | 40 | 10 bienestar |
| Parque | Hacer deporte | 40 | 17 bienestar |
| Parque | Paseo corto clásico | 30 | — |
| Parque | Sentarse a descansar | 20 | — |
| Plaza | Escuchar música | 30 | 8 social |
| Plaza | Charlar con vecinos | 30 | 13 social |
| Plaza | Pasear y charlar clásico | 35 | — |
| Plaza | Sentarse a escuchar | 20 | — |

Se conservan los cambios originales de necesidades, reputación, objetivos e historial, incluidos los rechazos por poca energía. Sentarse aplica una sola vez la actividad correspondiente; el personaje permanece sentado hasta levantarse o caminar. Levantarse no cobra ni vuelve a dar beneficios. JC y Gabi tienen plazas distintas en cada banco y terraza. No se inicia una actividad al entrar o solo acercarse a un objeto.

Los NPC mantienen sus nombres, población y conversaciones del juego. Al hablar, se mueve temporalmente el mismo panel nativo de relaciones al menú del escenario y después se devuelve a su sitio. Las respuestas siguen modificando las amistades reales, los encuentros y los recuerdos anteriores. El menú ofrece teléfono/chat, planes, radio, ajustes online y las actividades anteriores; estas últimas permiten regresar al escenario renovado.

## Código, recursos y guardados

`src/outdoors/` separa mapas, recursos, dibujo, asientos, navegación de escena e instalación. Reutiliza `src/engine/navigation.mjs` y los sprites originales de `src/characters/original-actor.mjs`. La postura sentada se deriva del mismo sprite, igual que en los interiores existentes; no se sustituye la identidad de JC o Gabi por un avatar nuevo. Los NPC reutilizan el atlas original de vecinos creado para la ciudad.

`src/legacy/outdoor-bridge.mjs` se instala después de los adaptadores actuales, dentro de la copia ejecutada del juego. Conserva `openPlace`, `closeInterior`, `tabs`, `performDetailed`, los botones clásicos y las relaciones. Al abrir el escenario, pausa el dibujo anterior; la vista clásica sigue disponible. Si falla la carga de imágenes se recupera la vista anterior con sus actividades. Salir durante la carga impide que una respuesta tardía vuelva a abrir el escenario.

El único PNG nuevo es `assets/outdoors/madrid-atlas.png`, un atlas original transparente con 24 recursos. El manifiesto contiene sus rectángulos de lectura y SHA-256. El PNG generado se conserva sin edición; los recortes se hacen al dibujar en Canvas.

La única clave nueva es `dos-mundos-exteriores-rpg-v1:<park|plaza>:<rol>:<nombre codificado>`, con versión y posición segura. No contiene dinero, amistades ni inventario. Sentado se guarda el punto de aproximación libre; una posición de salida, inválida u ocupada se sustituye por la entrada segura. El baúl de partidas ya incluye este prefijo. No se migran ni borran claves anteriores; los cultivos y las decoraciones compartidas no se reescriben.

La presencia reutiliza los campos `room`, `roomX`, `roomY` y `face` del emisor Firebase existente. Las coordenadas del mapa grande se codifican dentro del rango del interior anterior; los clientes nuevos las decodifican y reconocen las plazas sentadas. Solo se dibuja al otro personaje si existe presencia online real en el mismo lugar. No se crean rutas, campos, cuentas, NPC que simulen al otro jugador ni conexiones Firebase nuevas. Los clientes antiguos ven las coordenadas en su interior pequeño; para compartir la distribución nueva ambos deben abrir la entrada actualizada.

## Validación y límites

Capturas reales con perfiles de prueba: [Retiro en iPhone](parque-plaza/retiro-iphone.png), [Plaza Mayor](parque-plaza/plaza-mayor-iphone.png) y [plaza de noche](parque-plaza/plaza-de-noche-iphone.png).

Las pruebas de `tests/outdoor_browser.py` usan perfiles sintéticos sin conexiones externas. Comparan las ocho actividades con `index6.3.html` intacto, ambos personajes, sentarse/levantarse, recarga, conversación nativa, salida al mismo paseo, dinero, XP, clima/interfaz, aislamiento de cultivos y decoración, carga fallida y abandono durante la carga. Se comprueba el esquema de presencia sin conectar cuentas reales. `tests/outdoor-navigation.test.mjs` recorre todos los accesos, NPC y colisiones y comprueba la codificación de asientos. Se revisan móvil vertical, horizontal y escritorio a 375, 390, 844 y 1440 píxeles; capturas en `parque-plaza/`.

Han pasado 107 casos distintos: 14 de los escenarios nuevos en Chromium, 67 regresiones de ciudad, casa, gimnasio, huerto, cine, cafetería, carta y baúl, y 26 de navegación, tráfico y formato de guardado en Node. Las suites heredadas repiten algunos casos del baúl; estos se cuentan una sola vez. La comprobación pública posterior al despliegue se registra en el PR. Los HTML históricos, los sprites de personajes y los módulos de los interiores y del huerto se conservan sin cambios.

No se han comprobado Safari en un iPhone físico ni una sesión simultánea autenticada con las dos cuentas reales. La compatibilidad de presencia se verifica localmente; no se anuncia como una prueba de conexión real. Las barcas son ambientación y los quioscos son decorativos; no se añade navegación en barca ni comercio de tapas en esta entrega.

## Publicación y reversión

Rama `feature/parque-plaza-madrid`, basada en `1d4e4c5771b77ea80268fa287d7a71972e19432e`. Antes de editar se crearon la copia completa `dos-mundos-antes-parque-plaza-1d4e4c5.bundle` y la rama remota `backup/main-pre-parque-plaza-1d4e4c5`.

GitHub Pages sirve la raíz de main, sin nuevas dependencias de ejecución ni compilación. El lanzador y su importación del adaptador utilizan `?madrid=7` para renovar la caché. Enlace de Gabi con carta y estrella: `casa-rpg.html?gabi=1&madrid=7`.

Para revertir, revertir el commit de fusión de esta entrega. Las claves originales de progreso y las rutas Firebase siguen siendo compatibles. Las claves nuevas de posición pueden conservarse; la versión anterior simplemente no las lee. El baúl de `tools/partidas.html` mantiene las copias exportables. No restablecer Firebase ni borrar partidas.
