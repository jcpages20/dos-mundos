# Plan incremental propuesto
## Fase 0 — Auditoría y protección (PR 1)
- Inventariar archivos, JS/CSS, claves localStorage, rutas Firebase, dependencias externas, sprites y eventos.
- Comparar 6.3 del kit con HEAD del repositorio. Guardar tag/backup. Preparar smoke tests.
- Corregir superposición de botones en iPhone sin borrar funciones.
## Fase 1 — Casa RPG integrada (PR 2)
- Mantener casas individuales y compartidas; definir ruta de transición sin perder muebles.
- Crear escena con tiles (16x16 o 32x32), suelo, paredes, puertas, cuatro habitaciones y colisiones.
- Extraer mobiliario en spritesheets propios y metadatos (dimensiones, colisiones, punto de interacción).
- Incorporar sprites originales JC y Gabi con animación de caminar y orientación.
## Fase 2 — Interacciones (PR 3)
- Sofá con dos asientos y estados: acercarse, sentarse, levantarse. Personaje sentado con sprite adecuado; impedir ocupar la misma plaza.
- Cocina: animación de cocinar y recetas existentes. Dormitorio: dormir y recuperación. Baño: acciones simples.
- UI contextual en lugar de botones flotantes sobre el escenario.
## Fase 3 — Multijugador (PR 4)
- Sincronizar presencia, sala, posición, orientación, estado sentado, asiento ocupado y desconexión mediante Firebase.
- Autoridad por jugador para su propio avatar; reconciliación y rate limiting; validar reglas.
- Casa, invitaciones y álbum compartidos; conservar datos antiguos y evitar carreras de escritura.
## Fase 4 — Pulido y despliegue (PR 5)
- Animaciones y efectos de iluminación; controles táctiles iPhone; rendimiento.
- Probar con dos sesiones/usuarios, sin afectar progreso real.
- Documentar rollback y publicar tras revisión.

## Criterios de aceptación
- JC y Gabi muestran los sprites correctos.
- Se puede entrar desde el mundo a la casa y salir sin perder posición/partida.
- Los muebles se ven como objetos, no etiquetas en rectángulos.
- Ambos pueden sentarse en el sofá en plazas distintas.
- Al reconectar, estado y muebles compartidos se recuperan.
- Carta `?gabi=1` y todos los sistemas anteriores siguen funcionando.
