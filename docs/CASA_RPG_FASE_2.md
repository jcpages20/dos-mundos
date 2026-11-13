# Casa RPG · Primera entrega jugable

Entrada de prueba: `casa-rpg.html`. Se conservan todos los HTML históricos, incluida la versión `index6.1.html` que revisó el usuario. Esta entrega implementa el escenario de la fase 2 y adelanta movimiento y primeras interacciones. Todavía no es la versión final multijugador.

## Implementado

- Entrada desde la puerta de Madrid, el acceso Ir a casa o Nuestro hogar dentro de Acciones; salida de vuelta a la posición exterior.
- Mapa continuo 768×560: dormitorio y baño arriba, pasillo, salón y cocina abajo. Puertas transitables, colisiones con paredes y muebles, cámara que sigue al jugador y modo Plano.
- 30 instancias visibles: 25 muebles de suelo y cinco decoraciones de pared, con atlas original de 24 sprites. Suelo de madera, baldosas, alfombras, paredes y sombras por capas. Ningún emoji/etiqueta sustituye a los muebles.
- JC y Gabi con sus ocho sprites originales funcionales en cuatro direcciones; controles táctiles de al menos 44 px, teclado y toque en el suelo con búsqueda de camino.
- Acercarse al sofá, sentarse y levantarse; dos anclajes distintos preparados para la futura reserva multijugador, todavía con ocupación local.
- Cama que utiliza el descanso existente y recupera energía; ducha/bañera que mejoran higiene; lectura que mejora estudio; comer con la acción anterior de 8 €.
- TV y luces encendidas/apagadas. Desde fogones/encimera se abre el recetario anterior, con sus ingredientes, costes y habilidades. El menú permite abrir el selector de cine.
- Inventario, decoración individual, citas/álbum, móvil/chat, radio, online y Vida Propia accesibles desde la casa. Actividades de la casa anterior muestra su interfaz original y permite volver al escenario.
- En esta entrada experimental, los botones flotantes existentes pasan a un único menú Acciones, conservando sus nodos/listeners. Arcade deja de tapar Nuestro hogar.

## Personajes y arte

Se detectó alfa incompleto en varios PNG sueltos del kit: sus canales RGB contienen el dibujo, pero solo unas partes son opacas. Esos originales siguen intactos en `assets/sprites/`.

El renderer usa los ocho PNG funcionales que ya estaban en `DM51_ART` de `index6.3.html`, extraídos **sin cambiar un píxel** a `assets/characters/`. Su manifiesto registra origen y SHA-256. Extracción reproducible: `python tools/extract_characters.py`.

`assets/furniture/house-atlas.png` es arte original generado para Dos Mundos. El PNG se conserva como fue generado; su JSON describe los recortes del atlas, no edita los dibujos. No contiene recursos de Nintendo.

Las poses iniciales se componen con los mismos personajes y la oclusión de los muebles. La marcha tiene orientación, desplazamiento y balanceo; los ciclos dedicados de piernas/manos y más poses requieren otro pase de animación. No se presenta este movimiento como un atlas de animaciones completo.

## Módulos y compatibilidad

| Módulo | Responsabilidad |
| --- | --- |
| `src/ui/house-launcher.mjs` | Copia previa y reutilización de scripts de 6.3 sin duplicar el monolito. |
| `src/legacy/house-bridge.mjs` | Adaptador dentro de la clausura original: entrada/salida, estado, acciones y menús. Verifica los marcadores antes de extender el código. |
| `src/engine/navigation.mjs` | Colisiones de pies, pasos cortos, búsqueda y aproximación a objetos. |
| `src/interiors/house-map.mjs` | Habitaciones, paredes, puertas, dimensiones, huellas y puntos de acción. |
| `house-renderer.mjs`, `house-scene.mjs`, `install-house.mjs` | Render por profundidad, cámara, controles, estados y ciclo de vida. |
| `src/characters/original-actor.mjs` | Personajes originales. |
| `src/ui/city-actions.mjs`, `styles/house.css` | Menús organizados y controles móviles solo en esta entrada. |

Es una escena dentro del mismo juego, con el mismo estado y economía. El adaptador amplía la detección de la puerta hasta el punto de llegada que ya calculaba la ruta exterior. Los mapas y actividades anteriores siguen disponibles.

## Guardados

- Copia local antes de ejecutar el arranque histórico o la carta, usando la bóveda de la fase 1.
- Ninguna clave anterior se elimina, renombra o migra. No hay rutas Firebase nuevas ni escrituras en producción.
- Nuevo espacio aditivo: `dos-mundos-casa-rpg-v1:<rol>:<nombre codificado>`, con versión, posición/orientación interior, TV, luces y fecha. Solo se restauran coordenadas válidas y una orientación conocida; ese dato no puede sustituir el rol del personaje.
- Se guarda una posición segura de pie incluso al salir sentado/acostado, y también al ocultarse la página del móvil. La posición interior no reemplaza las coordenadas de Madrid.
- El mapa inicial está amueblado para probarlo. No consume ni convierte muebles de las casas individuales o del hogar 6.1; sus formatos y editores se mantienen.
- Entrar, salir, sentarse y caminar no cobran dinero. Las actividades elegidas aplican sus costes/efectos anteriores.
- Si falla el atlas, se muestra la casa anterior y se reanuda su animación: la partida sigue siendo jugable.

## Verificación

```sh
node tests/house-navigation.test.mjs
node tests/save-format.test.mjs
python tests/house_browser.py
git diff --exit-code 8083ec9 -- index.html 'index*.html'
```

Seis pruebas del motor: accesibilidad de cada objeto/puerta, colisiones incluso con pasos grandes, pasillo sin atravesar paredes, posiciones inválidas, dos asientos y seguimiento real de los caminos. Cinco pruebas del formato de copia conservadas.

La suite de navegador incluye las diez anteriores y diez de casa: entrada/salida/progreso, cuatro habitaciones, Gabi sentada, cama/ducha/lectura, recetas/casa anterior, cuatro tamaños de pantalla, respaldo/recarga de posición, acceso Nuestro hogar/citas, fallo del atlas y carta original en la nueva entrada.

Resultado local: **31 pruebas correctas**, sin omisiones (6 de motor, 5 de formato y 20 de navegador). Se repitieron específicamente la recarga de posición y los cuatro tamaños tras el ajuste final del guardado y del scroll móvil. Los HTML históricos no presentan diferencias respecto a la base.

Capturas con datos sintéticos: [plano completo](casa-rpg/plano-completo.png), [JC sentado en iPhone](casa-rpg/jc-en-sofa-iphone.png) y [dormitorio en iPhone](casa-rpg/dormitorio-iphone.png).

Pruebas con datos sintéticos y contextos aislados; tráfico a Firebase bloqueado. La carta histórica conserva su error conocido de postMessage con origen null; se detecta y se verifica que el observador alternativo permite finalizar. No se editó esa carta.

## Pendiente

- Los dos jugadores en este mapa: presencia, animaciones, reservas atómicas de asientos, TV compartida y reconexión. El online anterior no equivale a tener ya sincronizada esta escena.
- Catálogo propio para comprar/colocar/mover muebles y estilos. Los editores anteriores siguen funcionando.
- Animaciones dedicadas, cocinar juntos y comer platos del inventario con animaciones.
- Pulido de profundidad/escalas/sonido/rendimiento/accesibilidad, Safari e iPhone reales, red lenta y dos cuentas reales.
- Regresión exhaustiva del resto de la ciudad antes de sustituir la entrada estable.

## Prueba y rollback

Entrega por PR como entrada adicional, sin sustituir `index6.1.html` ni la portada. Su enlace será `/dos-mundos/casa-rpg.html` cuando se despliegue. Se comunicará disponible después de comprobar HTTP y la carga del escenario publicado.

Para volver al juego anterior, abrir `/dos-mundos/index6.1.html`. Para revertir el código, revertir el PR conservando el nuevo espacio de guardado. No borrar datos locales; `tools/partidas.html` permite recuperar las copias anteriores.
