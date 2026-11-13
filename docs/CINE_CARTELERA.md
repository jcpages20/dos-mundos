# Cine Estrella · Mejora visual y cartelera diaria

En `casa-rpg.html`, entrar en **Cine** desde Madrid abre la sala renovada: butacas de terciopelo con sombras, pasillo iluminado, cortinas, máquina de palomitas, carteles y una pantalla con un paisaje nocturno original. El dibujo se realiza en el canvas existente de 512×320, sin imágenes protegidas, servicios externos ni descargas de arte adicionales.

**Mirar la cartelera**, su símbolo en el escenario o el botón superior muestran tres sugerencias: aventura, comedia y emociones. Cambian con el **día del juego**, con una rotación de cinco días, y se mantienen al salir y volver. Si una actividad cruza medianoche, la cartelera se actualiza. Son ideas para buscar en la plataforma del jugador; no se anuncia disponibilidad ni se reproducen películas dentro del juego.

## Compatibilidad

La casa conserva exactamente su mapa, muebles, personajes, escalas, interacciones y estilos. Los HTML históricos, incluida la versión 6.1, tampoco cambian.

| Acción existente | Comportamiento conservado |
| --- | --- |
| Entrar a la sala | Selector original de Netflix, Max y Disney+, con sus enlaces en otra pestaña. |
| Comprar palomitas | 6 €, 10 minutos, +8 alimentación, +10 diversión y +3 XP; decaimiento normal de necesidades. |
| Sentarse en las butacas | 20 minutos, +4 energía, +9 diversión y +4 XP; decaimiento normal de necesidades. |
| Mirar la cartelera | Sin cobros, paso del tiempo ni experiencia. Amplía el texto con las sugerencias del día. |
| Interior clásico | Todos sus objetos, NPC y actividades siguen disponibles. |

El adaptador envuelve únicamente las funciones de dibujo, apertura y cartelera del cine. Las demás acciones siguen ejecutando `dm56Act` y `dm56Effect` originales. Los demás locales conservan sus vistas. Si falla el nuevo dibujo se recupera el renderer anterior.

No se crean claves de guardado, migraciones ni rutas Firebase. El progreso utiliza los mecanismos anteriores y la entrada conserva la copia automática previa al arranque. Antes de trabajar se creó la rama `feature/cine-cartelera` desde `7346ef0` y la copia local `dos-mundos-antes-cine-7346ef0.bundle`.

## Archivos

- `src/venues/cinema.mjs`: dibujo original y recomendaciones por día.
- `src/legacy/cinema-bridge.mjs`: integración con las acciones existentes.
- `styles/cinema.css`: estilos limitados al cine, con controles de al menos 44 px.
- `src/legacy/house-bridge.mjs`: conexión incremental del adaptador y su CSS.
- `casa-rpg.html`, `src/ui/house-launcher.mjs`: versión de URL de los módulos para evitar cargar el adaptador anterior desde caché.
- `tests/cinema_browser.py`: comparación con 6.3 intacta, economía, progreso, cartelera, controles, streaming y navegación.

## Verificación

Cinco pruebas del cine en Chromium con partidas sintéticas y tráfico externo bloqueado:

1. Palomitas y butacas producen el mismo dinero, tiempo, necesidades, habilidades, inventario, XP y registro de visitas que `index6.3.html` intacto.
2. Cartelera gratuita y estable, tanto desde el símbolo del escenario como desde el botón; cambio de día y reapertura correctos.
3. Dinero insuficiente no modifica el progreso.
4. Controles de al menos 44 px y sin desbordamiento horizontal en 390×844, 375×667, 844×390 y 1440×1000; interior clásico y enlaces originales de streaming disponibles.
5. Regreso a Madrid, otro local sin cambios y entrada/salida de la casa funcionando.

También se comprobaron cuatro regresiones de la casa: entrada/salida y guardados, Gabi sentada/de pie, recetas/vista anterior y carta/estrella original. Pasan las cinco pruebas de formato de copias y seis de navegación. **20 pruebas correctas** en total. La carta histórica conserva su error conocido de `postMessage` con origen `null`; su observador alternativo completa la introducción y se verifica expresamente.

Ejecutar los cinco casos específicos con:

```sh
python tests/cinema_browser.py CinemaTests.test_popcorn_and_seat_match_original_economy_time_xp_and_needs CinemaTests.test_daily_programme_is_free_stable_and_changes_at_midnight CinemaTests.test_insufficient_money_keeps_all_progress CinemaTests.test_mobile_layout_touch_targets_streaming_and_classic_cinema CinemaTests.test_return_to_city_house_and_other_venues
```

Capturas de prueba: [cine en iPhone](cine/cine-iphone.png), [cartelera en iPhone](cine/cartelera-iphone.png), [sala](cine/sala.png).

Pendiente: comprobación en Safari/iPhone físico y reproducción con cuentas reales de streaming. No se modifica ni se prueba Firebase en producción. Este retoque conserva el movimiento limitado y las acciones del cine anterior; no introduce un mapa de cine nuevo con colisiones como el de la casa.

## Despliegue y rollback

Fusionar el PR en `main` y esperar a GitHub Pages. La mejora aparece en la misma entrada `/dos-mundos/casa-rpg.html`; no sustituye la portada histórica. Para volver al cine anterior sin cambios de datos, abrir `/dos-mundos/index6.1.html` o revertir el commit del PR. No borrar ni restaurar guardados para revertir este cambio visual.
