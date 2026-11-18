# Cocina: tablero fijo y control fácil

Entrada: [jugar](https://jcpages20.github.io/dos-mundos/casa-rpg.html?cocina=14). [Gabi con carta y estrella](https://jcpages20.github.io/dos-mundos/casa-rpg.html?gabi=1&cocina=14).

## Problema reproducido

El alto del panel dependía de los mensajes, botones y control de fuego. El lienzo se centraba en el espacio restante; al cambiar ese espacio se movía o encogía y el observador de tamaño cancelaba el contacto. En Chromium a 375 × 667 se midió:

| Paso | Antes: posición y tamaño del lienzo | Después: posición y tamaño |
| --- | --- | --- |
| Cortar | x 0; y 86,78; 375 × 375 | x 4,05; y 60; 366,89 × 366,89 |
| Batir | x 0; y 87,25; 375 × 375 | x 4,05; y 60; 366,89 × 366,89 |
| Fuego | x 22,89; y 65,48; 329,20 × 329,20 | x 4,05; y 60; 366,89 × 366,89 |

La página original además tenía un desplazamiento de 703 px detrás del interior. La cocina bloqueaba únicamente el overflow del body y seguía enfocando el lienzo con cada contacto, dos fuentes de desplazamiento adicional en móviles.

## Pantalla estable

El modo de preparación reserva filas fijas para instrucciones, potencia, botones y mensajes. El fuego ocupa siempre su espacio; los botones comparten posiciones estables. El lienzo se alinea arriba y no cambia de tamaño al cortar, terminar un paso, mostrar un mensaje o pasar a otra preparación. Los paneles mantienen accesibles sus textos en espacios limitados.

`KitchenViewport` bloquea temporalmente el desplazamiento del documento del juego y de su anfitrión del mismo origen, conservando estilos y posición previos. Usa el viewport pequeño estable del anfitrión cuando está disponible. Los cambios de altura durante un contacto se aplican después de levantar el dedo; un cambio real de orientación puede cancelar el contacto para adaptar el espacio. Los documentos se restauran al cerrar o navegar fuera del iframe. El fondo conserva la pausa y el fuego detenido. El lienzo deja de pedir foco en cada toque; se mantiene el foco para teclado en dispositivos de puntero fino.

## Control fácil, activo al abrir

- Cortar: tocar la comida una vez por corte. El cuchillo sigue la guía automáticamente.
- Batir, lavar y remover: mantener el dedo sobre el cuenco, el agua o la sartén. La cuchara se mueve y el progreso avanza por tiempo de contacto; al levantar, apartarse o pausar se detiene.
- Fuego: los pasos nuevos empiezan al 55 %. Se conserva el control manual. Recuperar una preparación guardada respeta su potencia anterior.
- Tortilla y pasta: tocar la tortilla cuajada o el colador cuando corresponda. Los requisitos de cocción se mantienen.
- Emplatar: tocar un ingrediente y después el centro del plato. Seleccionar no coloca ni consume una porción; tocar fuera no gasta comida. También siguen disponibles el arrastre y los botones alternativos.

El botón «Fácil» permite cambiar a «Gestos» y regresar. La elección dura en la sesión; no se añade una clave de preferencias. El control con gestos conserva los cortes, círculos y arrastres de la entrega anterior.

## Datos y alcance

No hay migraciones. Se conserva el modelo de versión 1 y las claves existentes, incluida `dos-mundos-cocina-jugable-v1:<rol>:<nombre>`. El modo y la selección temporal de una porción no se escriben en el modelo guardado. Se mantienen recetas, ingredientes, minutos del mundo, alimentación, energía, XP, ensayos y recibos. Guardar una preparación no consume comida; servir se confirma una sola vez mediante el adaptador original.

Implementación: `src/kitchen/kitchen-viewport.mjs`, `kitchen-scene.mjs`, `cooking-model.mjs`, `kitchen-renderer.mjs` y `styles/kitchen.css`. Las entradas `casa-rpg.html`, `house-launcher.mjs`, `install-house.mjs`, `house-scene.mjs` y la referencia CSS de `house-bridge.mjs` solo renuevan las revisiones a `?cocina=14`. `recipes.mjs`, los atlas, los personajes, la economía, Firebase y los demás interiores no se modifican.

## Pruebas

Han pasado 109 casos distintos: 84 de lógica, 23 de cocina en navegador y dos regresiones de casa/cocina clásica. Las tres recetas completas se prueban con gestos y con el control fácil. Las nuevas pruebas comparan las coordenadas del lienzo durante los cuatro pasos, sostienen contactos mientras aparecen controles y cambia la altura del navegador, comprueban la restauración de estilos y scroll al cerrar y recargan únicamente el iframe para verificar que no queda bloqueado el anfitrión.

Se conservan los casos de ingredientes/XP, servicio único, ensayo, pausa, recarga, versiones futuras, cuota y arte ausente. El rendimiento en pausa mantiene cero redibujados, mutaciones de panel y escrituras en una ventana de 2,2 segundos. Los perfiles son desechables; no se usan cuentas Firebase ni partidas reales. Pendiente Safari/iPhone físico y ergonomía con los dos teléfonos. La comprobación de Pages se registra en el PR.

```sh
node --test --test-isolation=none tests/*.test.mjs
python tests/cooking_browser.py
cd tests
python -m unittest -v \
  house_browser.HouseTests.test_house_enter_exit_preserves_city_inventory_and_old_homes \
  life_browser.LifeTests.test_real_reading_then_cooking_consumes_inspiration_once_and_keeps_recipe_costs
```

Capturas: [cortar con toques](cocina-estable/corte-facil-375.png) y [fuego con el mismo tablero](cocina-estable/fuego-tablero-fijo-375.png).

## Despliegue y reversión

Rama `fix/cocina-pantalla-estable`, desde `54708c1227e16ce3789214ba58de9a23f2d65b7b`. Antes de modificar: bundle completo `dos-mundos-antes-cocina-estable-54708c1.bundle` y rama remota `backup/main-pre-cocina-estable-54708c1`.

Fusionar el PR a main, esperar a Pages y verificar el enlace de revisión 14. No se necesita borrar caché ni almacenamiento. Para revertir, deshacer la fusión conservando las claves: el cliente previo lee las mismas preparaciones y récords.
