# Instrucciones para Codex — Dos Mundos
Idioma de comunicación: español. Proyecto: videojuego web de simulación social para dos jugadores, JC y Gabi, ambientado en Madrid. Inspiración visual: RPG pixel art de vista cenital estilo Pokémon, SIN copiar sprites, mapas ni recursos protegidos.

## Prioridad absoluta: no romper lo que ya funciona
- Lee `docs/ESTADO_Y_ARQUITECTURA.md`, `docs/PLAN_DE_DESARROLLO.md` y `docs/PRUEBAS.md` antes de modificar nada.
- `game/index.html` es una COPIA de trabajo de la última versión local disponible (6.3), no afirmes que es idéntica a GitHub sin comparar.
- NO borres edificios, personajes, inventario, economía, citas, recuerdos, chat, Firebase, modos de juego, música, cine, mapas, NPC, misiones, casas individuales ni la carta de Gabi.
- NO borres, renombres o migres claves de localStorage ni rutas Firebase sin plan de compatibilidad, backup y pruebas de restauración.
- Evita editar `main` directamente: crea rama `feature/casa-pokemon`, commits pequeños y pull request revisable.
- No subas credenciales privadas, tokens ni fotos personales; revisa cualquier configuración de Firebase y reglas de acceso.
- Primero haz inventario de funciones, selectores, IDs, claves de guardado, Firebase y assets; genera un mapa de dependencias.
- La migración a módulos debe ser incremental y preservar `index.html` jugable en GitHub Pages.
- Reutiliza los sprites JC/Gabi de `assets/sprites/` y, cuando corresponda, los avatares reales ya implementados en el juego. Nunca sustituyas por el muñeco genérico de 6.2.
- Los diseños en `assets/concepts/` son referencias conceptuales, NO recursos ya implementados.
- La casa debe sentirse como interior RPG real: movimiento, paredes, habitaciones, muebles con colisiones, interacción contextual y estados sentado/de pie.
- Dos usuarios: mostrar posiciones y estados coherentes en tiempo real, con manejo de desconexiones y sin sobrescribir partidas.
- Antes de dar por terminada cada tarea: ejecutar pruebas y documentar lo que NO se pudo verificar.

## Entregables por PR
1. Resumen del cambio y capturas en móvil.
2. Lista de archivos cambiados y migraciones de datos.
3. Pruebas (smoke test, navegación, Firebase si disponible).
4. Instrucciones de despliegue y rollback.
