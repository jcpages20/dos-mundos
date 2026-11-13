# Entrada de la casa después de salir andando

## Fallo reproducido

Salir por la puerta caminando guardaba la posición de los pies dentro del rectángulo de salida. Por ejemplo, `x:352, y:527.07` era transitable y se restauraba al entrar. El primer fotograma detectaba que el personaje estaba en la salida y cerraba otra vez la casa: el jugador permanecía en la ciudad.

Se reprodujo en Chromium con una partida sintética: caminar hacia abajo, salir y volver a entrar. Antes del arreglo, el escenario desaparecía y se recuperaba la ciudad.

## Corrección

- El rectángulo de salida deja de ser una posición válida para reanudar una partida. Las partidas que ya contienen esa posición aparecen en el punto interior seguro `352,508`.
- Al salir andando se guarda ese punto interior, en lugar del activador de salida. Las posiciones normales dentro de las habitaciones se conservan.
- TV, luces, personaje, dinero, necesidades, inventario, decoración y progresión mantienen sus datos. Se utiliza la misma clave y versión del guardado interior, sin borrar ni migrar claves.
- Las URL del lanzador, instalador y escena llevan una nueva versión para que el navegador cargue el arreglo aunque conserve módulos anteriores en caché.

No se modifican mapas, muebles, gráficos, dimensiones, colisiones, actividades ni archivos del cine, gimnasio y cafetería. Tampoco se modifican los HTML históricos ni Firebase.

## Verificación

Cinco casos de navegador verificados:

1. Salir caminando y regresar mediante el acceso móvil Nuestro hogar; permanecer en la casa, conservar progreso y guardar una posición interior segura.
2. Recuperar una posición antigua en la puerta con JC y Gabi, utilizando Entrar, Ir a casa y Nuestro hogar. Se conservan TV y luces.
3. Mantener una posición válida dentro de la casa al salir y regresar.
4. Cama, ducha y lectura conservan sus efectos en el progreso.
5. La entrada de Gabi conserva su carta original y la estrella fugaz. Se detecta el error histórico esperado de `postMessage` y se comprueba que su observador alternativo completa la introducción.

También pasan cinco pruebas del formato de copias y seis del movimiento/colisiones: **16 casos correctos**. Perfiles sintéticos y tráfico externo bloqueado; no se usan partidas reales.

```sh
python tests/house_browser.py HouseTests.test_walking_out_of_front_door_does_not_immediately_eject_on_reentry HouseTests.test_existing_doorway_saves_recover_for_both_roles_and_all_home_entries HouseTests.test_house_snapshot_and_position_reload_preserve_old_data HouseTests.test_bed_shower_and_reading_use_existing_progress HouseTests.test_new_house_entry_preserves_gabis_original_letter
node tests/save-format.test.mjs
node tests/house-navigation.test.mjs
```

Captura con una posición antigua recuperada: [casa en iPhone](casa-rpg/entrada-recuperada.png).

Pendiente: comprobación en iPhone/Safari físico y confirmación del usuario en su dispositivo. La comprobación publicada se registra en el PR después del despliegue.

## Publicación y rollback

Rama `fix/entrada-casa`, desde `b898453`. Copia previa local `dos-mundos-antes-arreglo-casa-b898453.bundle` y rama remota `backup/main-pre-entrada-casa-b898453`.

Publicación mediante PR y GitHub Pages. Entrada actualizada: `/dos-mundos/casa-rpg.html?casa=3`. Para Gabi con carta y estrella: `?gabi=1&casa=3`.

Rollback: revertir el PR sin borrar datos. Las posiciones seguras guardadas siguen siendo compatibles con la versión anterior. Para jugar la versión histórica, abrir `index6.1.html`.
