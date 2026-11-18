# Cocina: cortar, remover y emplatar con el dedo

Entrada: [jugar](https://jcpages20.github.io/dos-mundos/casa-rpg.html?gestos=13.1). [Gabi con carta y estrella](https://jcpages20.github.io/dos-mundos/casa-rpg.html?gabi=1&gestos=13.1).

## Cambios de juego

- Cortes: la marca activa tiene una franja ancha y una flecha. Se reconocen trazos verticales más cortos, hacia arriba o abajo, con margen de desviación. El cuchillo se ajusta a la guía cercana. Tocar, deslizar horizontalmente, cortar fuera de la tabla o cancelar antes de soltar no completa un corte. Se mantiene un corte por contacto y la calidad sigue valorando la precisión con una tolerancia inicial mayor.
- Remover: antes se sumaba el ángulo con signo y los giros en sentido contrario no avanzaban. Ahora se reconoce la rotación neta en cualquiera de los sentidos. Se aceptan círculos pequeños, ovalados y muestras más separadas; el máximo avance del contacto evita sumar oscilaciones repetidas o perder lo ganado por una pequeña inversión. Se puede levantar el dedo y continuar en otro sentido. El anillo y el contador muestran el progreso. El tiempo, la temperatura y las vueltas necesarias de cada plato se conservan.
- Emplatado: se puede coger la parte visible inferior de un ingrediente, con un margen más amplio; si dos zonas se tocan se elige el ingrediente disponible más cercano. La comida se eleva por encima del dedo. El plato marca toda su zona de entrega y cambia de color cuando se puede soltar, incluso cerca del borde. Hay nombres en cada porción e indicaciones de recogida y entrega. Soltar fuera o cancelar devuelve el ingrediente arriba y lo explica sin consumirlo.

Se procesan las muestras táctiles agrupadas por el navegador sin lecturas de geometría por muestra ni escrituras DOM por cada una. Se conserva el límite de pintura a 30 fps, el panel limitado durante los gestos, la caché del atlas y la pausa únicamente cuando corresponde. Los botones alternativos y el teclado siguen disponibles.

## Datos y archivos

No se añade ni se migra ninguna clave. Continúa el modelo de versión 1 y `dos-mundos-cocina-jugable-v1:<rol>:<nombre>`. El ángulo y el avance de un contacto son temporales y no se guardan como nuevos campos. Se comprueba recuperar una preparación anterior y continuar con giros contrarios. Las recetas mantienen ingredientes, minutos, alimentación, energía, XP y recibo único; la asistencia solo afecta al control y a la valoración de precisión de los nuevos gestos. Se conservan récords anteriores y preparados pendientes.

Implementación: `src/kitchen/recipes.mjs` contiene las ayudas y zonas compartidas; `cooking-model.mjs`, el reconocimiento; `kitchen-renderer.mjs`, las señales visuales; `kitchen-scene.mjs`, las muestras agrupadas y mensajes. `casa-rpg.html`, `src/ui/house-launcher.mjs`, `src/interiors/install-house.mjs` y `house-scene.mjs` solo cambian la revisión de los módulos a `?gestos=13.1`. Las pruebas están en `tests/cooking-model.test.mjs` y `tests/cooking_browser.py`.

No se editan PNG, personajes, atlas, economía, adaptadores nativos, gimnasio ni otros interiores. `index6.1.html` conserva el blob `d46b7742a4968f2ac37d274a3ea47e4fcc1bd0e4`.

## Verificación

Han pasado 96 casos distintos: 77 de lógica (incluidos siete nuevos de gestos), las diecisiete pruebas de cocina en navegador (quince anteriores y dos nuevas) y dos regresiones de casa y cocina clásica/personalidad. Se preparan los tres platos completos, se conserva el servicio único y se comprueban fallos de cuota, ensayo, recarga y versiones futuras de datos. La medición de 2,2 segundos conserva cero redibujados, mutaciones del panel y escrituras en pausa; con la tabla activa quieta mantiene cero redibujados, tres mutaciones y dos guardados.

El ajuste final de redondeo añade un caso de lógica: tres vueltas exactas, en ambos sentidos y con 6, 12, 36 o 48 muestras por vuelta. Con 36 se reproducía un valor de 2,9999999999999982 que dejaba el paso abierto; ahora se admite una tolerancia de una millonésima de vuelta y el contador termina en 3. No se anticipan los requisitos de fuego, huevos, vuelta de tortilla o escurrido. Pasan las 78 pruebas de lógica; se vuelven a ejecutar las dos pruebas táctiles nuevas y la medición de rendimiento.

Los casos nuevos cubren cortes breves y desviados en ambas direcciones, rechazo de contactos inválidos, círculos pequeños y ovalados en ambos sentidos con pocas muestras, oscilaciones, recuperación de un preparado, recogida por el borde de la imagen, entrega en el borde del plato y cancelación sin una porción gratuita.

Capturas con perfiles de prueba: [franja de corte](cocina-controles/corte-375.png), [círculos pequeños en sentido contrario](cocina-controles/circulos-375.png) y [ingrediente levantado y plato preparado para soltar](cocina-controles/emplatado-390.png).

Las pruebas de navegador usan toque de Chromium y perfiles desechables, incluidas pantallas de 375 × 667 y 390 × 844. No se usan partidas ni cuentas Firebase reales. Quedan pendientes Safari/iPhone físico y la comodidad percibida en los móviles de los jugadores. La comprobación de la publicación en Pages se registra en el PR.

```sh
node --test --test-isolation=none tests/*.test.mjs
python tests/cooking_browser.py
cd tests
python -m unittest -v \
  house_browser.HouseTests.test_house_enter_exit_preserves_city_inventory_and_old_homes \
  life_browser.LifeTests.test_real_reading_then_cooking_consumes_inspiration_once_and_keeps_recipe_costs
```

## Publicación y reversión

Rama `fix/cocina-gestos-movil`, desde `8388f0f866633844f8ed12cd0a79ec7de558797d`. Respaldo anterior a los cambios: bundle completo `dos-mundos-antes-cocina-gestos-8388f0f.bundle` y rama remota `backup/main-pre-cocina-gestos-8388f0f`.

Ajuste de redondeo: rama `fix/cocina-vueltas-completas`, desde `fa2f3b5dc335705f474f0dc9e1a61de6667f9d35`, con respaldo local `backup/main-pre-cocina-redondeo-fa2f3b5` y bundle `dos-mundos-antes-cocina-redondeo-fa2f3b5.bundle`. Solo cambia la comprobación de vueltas y su prueba, además de renovar la cadena de entrada y el modelo a `?gestos=13.1`; recetas y renderer conservan su revisión 13. Revertir únicamente este ajuste conserva los nuevos controles.

Fusionar el PR a main, esperar a Pages y abrir el enlace con `?gestos=13.1`. No hace falta borrar caché ni datos. Para revertir, deshacer la fusión conservando el almacenamiento: la versión anterior lee los mismos preparados y récords. También se conservan sus correcciones de pausa y rendimiento.
