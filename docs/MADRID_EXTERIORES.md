# Paseos por Madrid

El barrio mantiene sus doce destinos y se dibuja con fachadas y objetos originales del mismo tono cálido de la casa y de Club Atlas. El cambio se aplica en `casa-rpg.html`; las páginas históricas permanecen intactas.

## Qué cambia

- Diez fachadas distintas: casa, mercado, oficina, gimnasio, café, biblioteca, cine, tienda, clínica y metro. Dos tipos de viviendas completan la fila del fondo.
- Aceras de piedra, bordillos, textura de asfalto, pasos de peatones, pavimento táctil, desagües y caminos del parque.
- Árboles con volumen, jacarandas, cipreses, flores, farolas, bancos, papeleras, bicicletas, bolardos, terrazas y puestos con imágenes reconocibles.
- Catorce coches animados, repartidos en dos sentidos y en sus carriles. Los semáforos alternan el paso y los coches esperan antes del cruce. El tráfico es ambiental: no atropella al personaje ni cambia sus necesidades.
- Seis vecinos con cuatro vistas cada uno. Las conversaciones, regalos, horarios y amistades siguen usando los sistemas existentes. Los ocho conocidos anteriores y los peatones ambientales también usan las nuevas ilustraciones, sin sustituir a JC ni a Gabi.
- Clasificación por profundidad de fachadas, personas y objetos; el follaje se vuelve transparente si tapa al jugador.
- Noche con farolas y entradas iluminadas, lluvia y paraguas, usando el clima y el reloj originales. Se respeta `prefers-reduced-motion`.
- Plano con doce destinos: elegir uno inicia la ruta nativa a pie hasta la puerta y entra al llegar. No teletransporta ni cobra una tarifa nueva.
- Vista «Pasear» con controles táctiles, botón contextual y menú de acciones. El lienzo original se mueve a esa vista conservando sus listeners. La cámara y el lienzo se adaptan a la pantalla vertical y horizontal; al cerrar se recuperan sus dimensiones originales.
- Al entrar a un interior se retira la vista de paseo; al salir se recupera. Casa, gimnasio, café y cine conservan sus escenas y actividades.
- Los distritos Cultural, Jardines del Este y Barrio Nocturno conservan sus accesos y actividades, con fachadas y vegetación de las nuevas láminas. Su movimiento y sus peatones internos siguen siendo los del sistema anterior.

## Archivos y compatibilidad

`src/legacy/city-bridge.mjs` adapta el dibujo, la cámara y la navegación ya existentes. `src/world/city-layout.mjs` contiene los anclajes decorativos y el tráfico; `city-renderer.mjs` dibuja y cachea el pavimento; `install-city.mjs` carga los recursos y gestiona las vistas. `styles/city.css` delimita sus estilos. `assets/city/` incluye las tres láminas y sus recortes y hashes.

El lanzador añade el adaptador junto a los de casa, cine, café y gimnasio. Para admitir un lienzo de altura variable, sustituye una única expresión del control táctil de la copia ejecutada: utiliza `cv.width` y `cv.height` en lugar de las dimensiones constantes. Se comprueba que el marcador ocurra exactamente una vez antes de aplicar el cambio. Las coordenadas del mundo, la búsqueda de rutas, el avance del reloj y las colisiones nativas no se sustituyen.

No se crean, migran, borran ni renombran claves de localStorage, almacenes IndexedDB o rutas Firebase. Abrir el plano, cambiar la vista o activar el paseo no modifica las partidas. Las acciones y los pasos conservan los efectos del juego original. Se mantiene la copia automática previa al arranque.

Los gráficos se cargan en paralelo mientras la ciudad anterior sigue disponible. Si una imagen falla o la carga supera catorce segundos, se conserva la vista anterior y aparece «Reintentar gráficos». La instalación del nuevo dibujante es conjunta, después de cargar las tres láminas. «Vista anterior» permite volver al dibujo previo durante la sesión.

## Verificación

Las pruebas usan perfiles sintéticos, bloquean conexiones externas y no acceden a partidas ni cuentas reales. Véanse `tests/city_browser.py` y `tests/city-traffic.test.mjs`, además de las regresiones de interiores, gimnasio, casa y guardado. Las capturas de móvil están en [madrid-rpg](madrid-rpg/).

Cobertura de esta entrega: coordenadas y rutas de los doce destinos para JC y Gabi; navegación real calle/casa/gimnasio/café/cine; pulsación de fachadas y NPC; compra de flores y conversación comparadas con las acciones nativas; conservación de guardados; fallo de una lámina y recuperación con un clic real; interfaz a 375, 390, 844 y 1440 píxeles; distritos, museo, bar y huerto; día, noche y lluvia.

Resultado local: 46 casos de navegador (12 de Madrid, 22 de interiores y guardados, 9 de gimnasio y 3 de casa) y 18 de navegación, tráfico y formato de guardado: 64 casos. Se han comprobado también los hashes de las tres láminas, sus sesenta recortes y que las páginas históricas, los personajes originales y los módulos de casa y gimnasio no tienen cambios.

La comprobación pública se realiza después del despliegue con los archivos realmente servidos por GitHub Pages y perfiles nuevos de JC y Gabi, incluida la carta y la estrella. Su resultado se registra en el PR de la entrega.

## Límites de esta entrega

- Se conservan las colisiones originales. El mobiliario de calle y los vehículos son ambientales; todavía no tienen nuevas colisiones ni un catálogo para colocarlos.
- Las fachadas nuevas no añaden edificios o interiores nuevos. Los locales en construcción de los otros distritos conservan su aviso original.
- Las direcciones de los NPC son imágenes propias; la marcha añade balanceo, sin una secuencia nueva de pasos para cada vecino.
- No se ha cambiado ni verificado con dos cuentas reales el multijugador. Se conserva el dibujante de presencia online de la calle y sus funciones anteriores; las nuevas escenas de casa y gimnasio siguen pendientes de sincronización de posiciones.
- Las pruebas móviles son emulación de Chromium. Falta probar el resultado en un iPhone físico/Safari y en una conexión móvil lenta real.
- La carta conserva el aviso histórico de `postMessage` con origen `null` del iframe; su recorrido visible y la estrella se verifican mediante el mecanismo de respaldo existente.

## Publicar y recuperar

Rama de trabajo: `feature/madrid-exteriores`, creada desde `b76d77ffd3686ddbdc9dbdb1861710859b2b231e`. Antes de editar se creó una copia local completa y la rama remota `backup/main-pre-exteriores-b76d77f` conserva la publicación anterior.

GitHub Pages publica la raíz de `main`, sin compilación ni dependencias nuevas. La URL de esta entrega es `casa-rpg.html?madrid=5`; para repetir la carta de Gabi, `casa-rpg.html?gabi=1&madrid=5`. Las consultas del lanzador y del adaptador evitan reutilizar sus módulos antiguos desde caché.

Para deshacer la entrega, revertir el commit de fusión del PR de Madrid; no forzar `main`, borrar guardados ni revertir las entregas anteriores de casa, gimnasio o cine. La versión anterior también sigue accesible en `index6.1.html` y las copias se pueden exportar desde `tools/partidas.html`.
