# Fase 1: auditar 6.3 y proteger las partidas antes de desarrollar la casa RPG

La portada actual carga 2.9 aunque el repositorio ya incluye 6.3. Esta entrega conserva todos los HTML existentes y añade una entrada optativa `desarrollo.html` que abre 6.3 después de crear una copia local. La nueva herramienta `tools/partidas.html` descarga y recupera progreso y fotos del museo con validación de integridad, revisión de conflictos y respaldo previo a restaurar.

Incluye auditoría, plan de siete fases, instrucciones de rollback, inventario reproducible y los ocho PNG originales de JC/Gabi sin edición. La nueva casa RPG todavía no está implementada.

## Cambios y datos

- Nuevos módulos: `src/persistence/{save-format,save-vault}.mjs` y `src/ui/{development-launcher,backup-page}.mjs`.
- Nuevas páginas/estilos: `desarrollo.html`, `tools/partidas.html`, `styles/persistence.css`.
- Recursos y soporte: `assets/sprites/`, `tools/audit.py`, `tests/`, `AGENTS.md`, `.gitignore`, `docs/`; README ampliado.
- Sin migraciones ni cambios de claves locales o rutas Firebase. Únicamente se añade IndexedDB `dos-mundos-save-vault-v1/snapshots`. La lectura inicial puede crear el almacén vacío del museo si no existía.
- No se incluyen partidas reales, exportaciones privadas ni fotos personales.

## Validación

- 5 pruebas de formato y 10 de Chromium: datos exactos, recuperación de fotos, fallos de cuota/bóveda, cambio concurrente, UI móvil, cuatro lanzadores/versiones y carta original/alternativa.
- Capturas en `docs/audit/screenshots/`; tamaños 390×844, 375×667, 844×390 y 1440×900.
- HTML históricos sin cambios, sprites idénticos al kit y respaldo Git verificado.
- La carta conserva un error preexistente de `postMessage` con origen `null`; la prueba lo detecta y verifica su mecanismo alternativo. Los botones flotantes antiguos siguen solapándose. No es una versión estable de la casa.
- Pendientes Safari real, regresión funcional completa y dos cuentas Firebase; no se accedió a producción.

## Despliegue y rollback

Sin compilación: compatible con rutas estáticas de Pages. La portada continúa igual; la entrada nueva es `/dos-mundos/desarrollo.html`. Volver a `index.html` revierte el acceso al experimento; revertir estos commits conserva los datos. Para recuperar progreso usar la copia previa en `Mis copias`. Detalles en `docs/COPIAS_Y_ROLLBACK.md`.

Entrega para un PR en borrador. Se conservan los commits de subida manual y los archivos existentes, y se completa el resto de la fase 1 con la escritura GitHub ya habilitada. No fusionar ni promover el lanzador hasta completar las fases y su validación.
