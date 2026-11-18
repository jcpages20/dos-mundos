# Cocina: pausas móviles y rendimiento

Entrada: [Dos Mundos](https://jcpages20.github.io/dos-mundos/casa-rpg.html?rendimiento=12). Para Gabi con su introducción: [carta, estrella y juego](https://jcpages20.github.io/dos-mundos/casa-rpg.html?gabi=1&rendimiento=12).

## Problema y corrección

La cocina pausaba la receta en cualquier `window.blur` u `orientationchange`. Los controles del navegador móvil, el cambio de foco y el giro pueden emitir esos eventos aunque la página siga visible. Continuar y volver a tocar podía volver a mostrar la pausa.

Con la página visible, esos eventos cancelan únicamente el contacto táctil pendiente; no completan un corte ni abren la pausa. Solo se acepta un contacto primario a la vez. El botón Pausa, Escape, `document.hidden` y `pagehide` siguen deteniendo fuego y tiempo. Al regresar desde otra aplicación se pulsa Continuar una vez; recuperar una preparación guardada también requiere Continuar.

Antes se pintaba el lienzo y se reescribían sus etiquetas a cada fotograma, también en pausa, en el catálogo y al terminar un paso. Ahora se simulan los tiempos al ritmo habitual, se pintan las animaciones como máximo a 30 fps y las vistas estáticas se pintan al cambiar. El panel se revisa hasta diez veces por segundo durante la simulación y solo escribe valores distintos; las acciones y cambios de paso se reflejan inmediatamente.

Las coordenadas del lienzo se miden al empezar el gesto y se reutilizan durante el movimiento. Un cambio real de tamaño cancela el contacto. El observador de tamaño omite escrituras CSS si las medidas no cambian. El atlas procesado se reutiliza al reabrir la cocina; una carga fallida permite reintentar y conserva la salida al recetario rápido.

El guardado periódico se limita a la preparación activa. Los cambios de paso, los gestos terminados, pausar y salir siguen guardándose al momento; no se repite una escritura idéntica. El control de fuego y las flechas para remover se incluyen en el guardado periódico y se guardan inmediatamente al pausar o salir.

## Alcance y compatibilidad

No hay migración de datos. Se conserva `dos-mundos-cocina-jugable-v1:<rol>:<nombre>` y el mismo formato del modelo. Se mantienen las tres recetas, calidad, gestos, ingredientes, tiempos, alimentación, XP, ensayos, recibos y recetario clásico. No se modifican economía, adaptadores nativos, Firebase, otros interiores, gimnasio o recursos gráficos. `index6.1.html` conserva el blob `d46b7742a4968f2ac37d274a3ea47e4fcc1bd0e4`.

Archivos de ejecución cambiados: `src/kitchen/kitchen-scene.mjs` y `kitchen-renderer.mjs`. `casa-rpg.html`, `src/ui/house-launcher.mjs`, `src/interiors/install-house.mjs` y `house-scene.mjs` cambian únicamente la revisión de los módulos para renovar la caché. Las pruebas específicas están en `tests/cooking_browser.py`.

## Validación

Han pasado 90 casos distintos: 70 de lógica Node, las quince pruebas de cocina en navegador (diez anteriores y cinco nuevas) y cinco regresiones de casa, cocina clásica/personalidad y exportación/restauración de partidas y museo. Las tres recetas completas conservan sus ingredientes, alimentación y XP; se prueban los recibos únicos, ensayos y recuperación tras recargar. Las cinco regresiones nuevas cubren foco y giro visibles, fondo real por señal de visibilidad, cancelación de contacto y lecturas de geometría, trabajo en quietud y reutilización/reintento del atlas.

Medición en Chromium móvil, ventanas de 2,2 segundos, cocina cargada sin tocar la tabla o explícitamente pausada:

| Estado | Medida | Antes | Después |
| --- | --- | ---: | ---: |
| Receta activa, tabla quieta | Redibujados del lienzo | 132 | 0 |
| Receta activa, tabla quieta | Mutaciones del panel | 852 | 3 |
| Receta activa, tabla quieta | Escrituras de cocina | 2 | 2 |
| Pausa | Redibujados del lienzo | 132 | 0 |
| Pausa | Mutaciones del panel | 792 | 0 |
| Pausa | Escrituras de cocina | 2 | 0 |

El tiempo sigue avanzando cuando la receta está activa: se mantienen el contador y el guardado periódico. El límite de pintura no cambia la simulación del fuego ni descarta muestras del dedo. En otro ensayo con sesenta movimientos de un corte, la geometría del lienzo se leyó como máximo tres veces, en lugar de leerla en cada movimiento. Estas cifras miden trabajo evitado en esas vistas, no un porcentaje de batería o una velocidad garantizada en todos los teléfonos.

Perfiles de prueba desechables; no se accede a partidas o cuentas Firebase reales. Las pruebas reproducen las señales de foco, orientación y visibilidad en Chromium móvil; no constituyen una prueba de Safari/iPhone físico. La comprobación pública de Pages y sus resultados quedan registrados en el PR.

Capturas: [corte terminado tras varios giros y cambios de foco](cocina-rendimiento/sin-pausa-al-girar-iphone.png) y [pausa intencionada con el fuego detenido](cocina-rendimiento/pausa-intencionada-iphone.png).

Comandos:

```sh
node --test --test-isolation=none tests/*.test.mjs
python tests/cooking_browser.py
cd tests
python -m unittest -v \
  house_browser.HouseTests.test_house_enter_exit_preserves_city_inventory_and_old_homes \
  house_browser.HouseTests.test_walk_four_rooms_and_furniture_collision \
  house_browser.HouseTests.test_original_gabi_sits_and_stands_without_changing_roles \
  life_browser.LifeTests.test_real_reading_then_cooking_consumes_inspiration_once_and_keeps_recipe_costs \
  browser_smoke.BrowserTests.test_export_restore_real_storage_and_museum
```

## Publicación y rollback

Rama `fix/cocina-rendimiento-pausa`, desde `7c2ebfd985318cb0496392575573e7e98a096b6e`. Antes de modificar se creó el bundle completo `dos-mundos-antes-cocina-rendimiento-7c2ebfd.bundle` y la rama remota `backup/main-pre-cocina-rendimiento-7c2ebfd`.

Publicar mediante PR a main y esperar a que Pages termine. La cadena de módulos modificados usa `?rendimiento=12`; los enlaces anteriores también recibirán el nuevo HTML. No hay que borrar caché ni almacenamiento del jugador. Para deshacer esta corrección, revertir la fusión del PR sin borrar ninguna clave: la entrega anterior lee las mismas preparaciones, platos y marcas.
