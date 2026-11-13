# Contexto y estado actual
## Visión
Dos Mundos: simulador social web de dos jugadores (JC y Gabi), ciudad inspirada en Madrid, estilo RPG cenital, actividades compartidas, casa, trabajos, economía, citas y recuerdos. Cada jugador puede conectarse por separado y coincidir en línea.

## Versiones disponibles
- 5.9.1: versión previa con ciudad y múltiples sistemas.
- 6.0.1: introducción de la carta para Gabi, entrada forzada con `?gabi=1`.
- 6.1: casa compartida en panel separado, invitaciones a citas, álbum de recuerdos. Se introdujo almacenamiento local `dos-mundos-61-duo-v1` y ruta de Firebase `dosMundos/duo/v61/shared` (verificar reglas y sincronización).
- 6.2: canvas de habitación pixel art y avatar PROVISIONAL (incorrecto).
- 6.3: intentos de integrar sprites originales y nuevas vistas de habitaciones; NO asumir que todo está validado.

## Bugs y deuda técnica conocida
- En 6.2 se muestra un personaje diminuto genérico que no es JC.
- Interfaz móvil con numerosos botones flotantes superpuestos; capturas en `references/screenshots/`.
- Casa individual y casa compartida son sistemas separados; unificarlos con compatibilidad de guardados.
- En 6.1 el modo compartido puede quedar en local si Firebase no conecta. Verificar permisos, UID y reglas; no asumir que el multijugador funciona.
- No hay pruebas automatizadas completas ni prueba confirmada de sincronización entre móviles.
- Un único HTML muy grande; modularizar de forma incremental sin perder GitHub Pages.
- Revisar que la 6.3 realmente incorpora lo esperado antes de extenderla.

## Funciones existentes a preservar
Mundo, barrios, edificios, casa individual, decoración, economía, trabajos, gimnasio, cocina, relaciones, personajes personalizados, multijugador Firebase, chat, NPC, clima, día/noche, música/radio, cine, restaurante, parque, arcade, huerto, museo de recuerdos, viajes, habilidades, inventario, guardados, carta y estrella fugaz.
Esta lista viene de la evolución del proyecto; verificar cada función en el código, no dar por probada su operación.

## Privacidad y seguridad
El repositorio y GitHub Pages pueden ser públicos. No subir fotos personales, claves privadas ni datos íntimos en texto. El HTML podría contener configuración pública Firebase; revisar reglas, no exponer secretos de servidor.
