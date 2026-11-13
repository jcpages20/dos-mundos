# Interiores de la ciudad · Cine, Club Atlas y Café Luna

Entrada: `casa-rpg.html`. La casa conserva su mapa, arte, colisiones, personajes, escalas, interacciones y estilos. Todos los HTML históricos permanecen idénticos.

## Cambios visibles

- **Cine:** el botón superior indica **Calle** y vuelve directamente a la ciudad; Escape hace lo mismo. El selector de plataformas conserva la sala nueva detrás y **Volver al juego** la recupera, también al cerrar con Escape o al tocar el fondo. El interior anterior solo aparece al elegir su botón explícito.
- **Cartelera:** una ficha de Netflix, una de Max y una de Disney+, con color, título, descripción y enlace. Son cinco sugerencias preparadas por plataforma, rotadas por día del juego; no hay consultas automáticas a catálogos. La disponibilidad actual depende de la plataforma y el país. No se cobran ni gastan minutos al consultar o abrir enlaces.
- **Gimnasio:** espejos, suelo de goma, mancuernas, banco con barra, dos máquinas de cardio, colchoneta, toalla, agua, taquillas, luces y ventiladores. Las cintas y ventiladores se animan; el reloj sigue la hora del juego. El panel muestra sesiones reales, nivel físico y energía. Se conservan fuerza, cardio, estiramientos y consulta de progreso.
- **Cafetería:** escenario original más amplio con cafetera, vitrina con pasteles, estanterías, tazas, mesas, sillas, plantas, alfombra, lámparas y ventana a los tejados. Se ven vapor y nubes en movimiento, cielo diurno/nocturno y el personaje original elegido. Portátil, cuaderno, tarta, segunda taza y notas musicales aparecen según la actividad realizada.
- **Detalles comunes:** hora y día visibles en cine/gimnasio, controles de al menos 44 px, foco dentro de sus menús y botones flotantes ocultos durante la visita. Las salidas del gimnasio y cafetería también llevan a la calle; la vista anterior y sus actividades conservan su acceso explícito.

Estos son retoques de los interiores existentes: el movimiento limitado del cine/gimnasio sigue siendo el anterior y la cafetería mantiene sus actividades por menú. No se presenta esta entrega como tres nuevos mapas con colisiones y animaciones completas como la casa.

## Integración y guardados

| Archivos | Función |
| --- | --- |
| `src/venues/gym.mjs`, `cafe.mjs` | Arte original y detalles animados dibujados en canvas. |
| `src/legacy/gym-bridge.mjs`, `cafe-bridge.mjs` | Adaptan la presentación y conservan los efectos nativos de las actividades. |
| `src/legacy/venue-navigation.mjs` | Salida directa, restauración de foco y bloqueo del interior oculto; reloj de la visita. |
| `src/venues/cinema.mjs`, `src/legacy/cinema-bridge.mjs` | Rotación por plataforma y regreso al cine después del selector. |
| `styles/venues.css` | Estilos limitados a los tres locales. |
| `src/legacy/house-bridge.mjs`, `src/ui/house-launcher.mjs`, `casa-rpg.html` | Integración incremental y URL de módulos con versión para la caché. |
| `tests/interiors_browser.py`, `tests/cinema_browser.py` | Regresión de navegación, actividades, economía y presentación. |

No hay migraciones, claves nuevas ni rutas Firebase nuevas. Dinero, necesidades, tiempos, XP, visitas y sesiones utilizan las funciones anteriores. La copia automática antes del arranque permanece. Las animaciones del interior antiguo se pausan mientras se muestra el nuevo y se reanudan al abrir la vista clásica; el bucle del café se cancela al cerrar. Los dibujos de respaldo anteriores se conservan.

La rama `feature/cine-gym-interiores` parte de `c810834`. Copia previa local: `dos-mundos-antes-interiores-c810834.bundle`; copia remota: `backup/main-pre-interiores-c810834`.

## Pruebas realizadas

```sh
python tests/interiors_browser.py InteriorsTests
node tests/save-format.test.mjs
node tests/house-navigation.test.mjs
git diff --exit-code c810834 -- index.html 'index*.html' src/interiors src/characters styles/house.css
```

**22 pruebas de navegador correctas**, incluyendo las anteriores de copias y cine y siete casos de esta entrega:

1. Fuerza, cardio y estiramientos comparados con 6.3 intacta: mismos minutos, dinero, necesidades, XP, habilidades, sesiones y registros. Consulta de progreso gratuita.
2. Fuerza sin energía no modifica el progreso; Escape devuelve a la calle y restaura los controles.
3. Cerrar el cine devuelve a la ciudad con un toque; el selector de streaming vuelve a la sala nueva al cerrar por botón, Escape o fondo. La posición y las necesidades se conservan.
4. Una ficha y un enlace por plataforma, con apertura externa y protección `noopener noreferrer`; leer la cartelera no modifica el progreso.
5. Las siete actividades del café comparadas con 6.3: café, tarta, charla, música, mini cita, portátil y cuaderno conservan costes, minutos y necesidades.
6. Café sin dinero, animación visible, acceso clásico y regreso a la calle sin bloqueo residual.
7. Gimnasio/café en 390×844, 375×667, 844×390 y 1440×1000: controles de al menos 44 px, sin desbordamiento horizontal, reapertura y cierres correctos.

También se ejecutaron cuatro regresiones de casa: entrada/salida/partida, Gabi sentada, carta/estrella original y recetas/vista clásica. Con las once pruebas de copias y navegación, son **37 pruebas correctas**. Las pruebas usan perfiles sintéticos y bloquean tráfico externo. La carta original conserva su error conocido de `postMessage` con origen `null`; se comprueba que su observador alternativo finaliza la introducción.

Capturas: [gimnasio en iPhone](interiores/gym-iphone.png), [cafetería en iPhone](interiores/cafe-iphone.png), [cine en iPhone](interiores/cine-iphone.png), [cartelera por plataformas](interiores/cartelera-plataformas.png).

Pendiente: Safari/iPhone físico, reproducción y catálogos con cuentas reales, Firebase y sincronización del nuevo interior de la casa. No se han usado datos ni cuentas de producción durante las pruebas.

## Publicación y rollback

Fusionar el PR y esperar el despliegue de GitHub Pages. Entrada actualizada: `/dos-mundos/casa-rpg.html?interiores=2`. Para Gabi, añadir `gabi=1` para ver la carta y estrella antes de entrar. La portada histórica no se sustituye.

Para volver al código anterior, revertir el PR; para jugar la versión 6.1 sin esta entrada, abrir `index6.1.html`. No es necesario borrar ni restaurar partidas para revertir estos retoques.
