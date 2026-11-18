# Cocina: que el movimiento ejecute la acción

Entrada: [jugar](https://jcpages20.github.io/dos-mundos/casa-rpg.html?cocina=15). [Gabi con carta y estrella](https://jcpages20.github.io/dos-mundos/casa-rpg.html?gabi=1&cocina=15).

## Error reproducido

En Fácil el cuchillo se dibujaba ajustado a la guía, pero un deslizamiento seguía comprobando la posición precisa del dedo como en Gestos. El gesto por el centro de la comida `(0,52; 0,40) → (0,52; 0,82)` mostraba movimiento y registraba cero cortes, incluso al soltar. Los círculos en Fácil tampoco contribuían: solo avanzaba el tiempo de mantener pulsado. Además, perder la captura del puntero borraba el contacto antes de poder terminar un arrastre.

## Corrección

- El corte se reconoce mientras se mueve el dedo. En Fácil basta una pasada sobre la comida, vertical, horizontal o diagonal. Se mide únicamente la parte del trazo que cruza el alimento, también con pocas muestras de un gesto rápido. Los toques siguen disponibles.
- Cada contacto puede registrar un solo corte. Moverse más, invertir el trazo o soltar no lo duplica. Cancelar antes de un gesto válido no añade progreso; un corte ya reconocido se conserva.
- El cuchillo permanece en la marca del corte de ese contacto. Una línea clara y «¡Corte!» confirman la acción mientras se mantiene el dedo; el contador también avanza antes de soltar.
- En Fácil se reconocen círculos en ambos sentidos, además de mantener pulsado. El movimiento angular y el tiempo de mantener no se suman dos veces en el mismo fotograma. Al dejar de mover, mantener sigue avanzando sin esperar a recuperar un contador oculto.
- La vuelta de tortilla y el desplazamiento hacia el colador se reconocen durante el gesto; conservan sus requisitos de cocción y una sola acción por contacto. El arrastre de comida se confirma al soltar.
- Se siguen el movimiento y la liberación en la ventana, incluso si el navegador retira la captura del elemento. `pointercancel`, ocultar la página, pausar y salir siguen cancelando un contacto pendiente de forma segura.
- El lienzo se ajusta sincrónicamente al abrir la preparación para usar las coordenadas de la vista actual en el primer gesto. Las acciones reconocidas en movimiento se guardan al momento.

Gestos mantiene sus requisitos de precisión. El botón Fácil/Gestos sigue disponible. No se modifican las reglas que fijaron el tablero: `styles/kitchen.css` y `kitchen-viewport.mjs` permanecen intactos, al igual que sus pruebas de geometría, scroll y orientación.

## Datos y archivos

Mismo modelo versión 1 y mismas claves. El contacto conserva indicadores temporales de recorrido, marca y acción realizada; no se escriben nuevos campos en el modelo guardado. Preparados, marcas, ingredientes, minutos, alimentación, energía, XP y recibo único conservan su formato y reglas. Servir sigue siendo una confirmación separada al completar los cuatro pasos.

Cambios funcionales en `cooking-model.mjs`, `kitchen-scene.mjs` y `kitchen-renderer.mjs`. Las cuatro referencias de entrada/casa solo renuevan módulos a `?cocina=15`. CSS, viewport, recetas, PNG, personajes, mundo, otros interiores, adaptadores nativos y Firebase no cambian.

## Verificación

Han pasado 121 casos distintos: 91 de lógica, 28 de cocina en navegador y dos regresiones de casa/cocina clásica. Incluye siete pruebas nuevas de lógica y cinco nuevas de navegador. Se conservan los casos de las tres recetas con toques, pulsaciones y gestos, así como geometría fija, pausa, restauración de scroll, cuota, versiones futuras, ingredientes y servicio único. La medición en pausa mantiene cero redibujados, mutaciones de panel y escrituras en 2,2 segundos.

Se comprueba el gesto que fallaba antes de levantar el dedo, que el corte esté guardado en ese momento y que al soltar continúe siendo uno. Se prueba perder la captura y continuar, círculos antes de levantar en ambos sentidos, un arrastre tras perder captura, y recetas completas con deslizamientos por el centro en Fácil. Las pruebas de lógica incluyen trayectorias horizontales/diagonales, cruces con pocas muestras, movimientos fuera del alimento, ausencia de doble crédito al remover, requisitos de cocción y recuperación de datos.

Los perfiles son desechables y no se usan cuentas Firebase reales. Quedan pendientes el iPhone físico del jugador y Safari real. La comprobación del código publicado en Pages se registra en el PR.

Capturas con el dedo todavía pulsado: [corte reconocido](cocina-movimientos/corte-reconocido-375.png) y [círculos reconocidos](cocina-movimientos/circulos-reconocidos-390.png).

```sh
node --test --test-isolation=none tests/*.test.mjs
python tests/cooking_browser.py
cd tests
python -m unittest -v \
  house_browser.HouseTests.test_house_enter_exit_preserves_city_inventory_and_old_homes \
  life_browser.LifeTests.test_real_reading_then_cooking_consumes_inspiration_once_and_keeps_recipe_costs
```

## Publicación y reversión

Rama `fix/cocina-reconocer-movimientos`, desde `43ca75a3456a9e65d76f41b37bd257b6d5114ad6`. Antes de modificar se crearon el bundle completo `dos-mundos-antes-cocina-movimiento-43ca75a.bundle` y la rama remota `backup/main-pre-cocina-movimiento-43ca75a`.

Fusionar a main y esperar a Pages. Abrir el enlace de revisión 15 sin borrar almacenamiento. Para revertir, deshacer la fusión conservando las claves; el cliente previo lee los mismos preparados y marcas, y mantiene el tablero fijo.
