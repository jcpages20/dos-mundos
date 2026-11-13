# Verificación · Fase 1

Ejecutada el 13 de noviembre de 2026 con Node 24.22.1, Python 3.12 y Playwright 1.62.0 / Chromium del entorno. Datos completamente sintéticos, contextos nuevos por prueba y tráfico externo bloqueado en las pruebas de navegador. La carta original se sirve desde el checkout local de Carta para probar su código, no mediante acceso a cuentas reales.

## Comandos reproducibles

```sh
node tests/save-format.test.mjs
python tests/browser_smoke.py
python tools/audit.py > docs/audit/inventory.json
git diff --check
git diff --exit-code 8083ec9 -- index.html 'index*.html'
```

Python necesita Playwright y Pillow (este último para el inventario de imágenes). `CHROMIUM` permite seleccionar el ejecutable, por defecto `/usr/bin/chromium`. `CARTA_SOURCE` permite indicar `Carta/index.html` si el checkout no está en la carpeta hermana; si no existe, la prueba de carta original se omite explícitamente. En esta sesión existía y **no se omitió**. `DM_ARTIFACTS` permite elegir dónde guardar las capturas; por defecto `/tmp/dos-mundos-test-artifacts`.

El servidor de pruebas se inicia y detiene automáticamente, enlazado a localhost y con subruta `/dos-mundos/`, como en GitHub Pages. No se necesita servidor de producción ni compilación. El `localStorage.clear()` del test solo afecta a su contexto sintético aislado, nunca al código del juego o de la herramienta.

## Resultados

**5 pruebas del formato: correctas.**

1. Captura los espacios de claves del juego y excluye otras aplicaciones y tokens de autenticación.
2. Exportación/importación conserva strings exactos, campos desconocidos, JSON legado inválido y metadatos extra de fotos; detecta corrupción.
3. Rechaza claves ajenas, versiones no soportadas, imágenes inválidas e IDs de foto duplicados.
4. Fusión de datos mantiene claves y fotos ausentes en la copia; los conflictos usan el contenido elegido.
5. Un fallo de cuota revierte claves nuevas/modificadas y no toca otras aplicaciones.

**10 pruebas de navegador: correctas**, con la salvedad explícita de la carta que se detalla abajo.

| Prueba | Evidencia |
| --- | --- |
| Exportación/restauración real de localStorage + museo | Dinero, valores exactos, inventario, despensa/habilidades, decoración, huerto, hogar compartido y una foto sintética; conserva una clave de otra aplicación y progreso nuevo ausente del archivo; crea copia previa. |
| Corrupción/cambio concurrente | Rechaza checksum distinto y una recuperación cuya revisión quedó obsoleta; la modificación reciente permanece intacta. |
| Fallo durante la recuperación | Cuota simulada después de cambiar el museo: datos locales y foto vuelven al estado previo. |
| Bóveda no disponible | Se impide restaurar antes de escribir; el progreso sigue idéntico. La descarga directa sigue funcionando aunque la bóveda falle. |
| UI móvil de copias | Descarga de archivo, selección, previsualización, confirmación y recuperación; botón bloqueado hasta confirmar; sin desbordamiento horizontal a 390 px. |
| Copia antes del arranque | Conserva JSON con campos futuros antes de normalizarlo y antes de que `?gabi=1` cambie el rol; carta alternativa, estrella y entrada al juego. |
| Compatibilidad de versiones | Portada actual, 5.9.1 con fallback v28, 6.0.1 y 6.3 con v29: cargan 753 €, inventario y habilidad; entrar/salir de casa conserva esos campos. |
| Tamaños de pantalla | Entrada de desarrollo a 390×844, 375×667, 844×390 y 1440×900; juego carga y la nueva barra no desborda horizontalmente. No implica que los flotantes antiguos estén corregidos. |
| Carta original | Sobre, carta, estrella, pantalla final y entrada. **Detecta el error preexistente de postMessage** y verifica que su observador alternativo permite terminar. |
| Fallo de la copia al arrancar | No abre el juego ni cambia el rol automáticamente; muestra la opción de continuar sin copia y espera ese toque. |

La prueba de carta espera el error conocido `Invalid target origin 'null'`; por ello, que esta prueba sea correcta **no significa consola limpia ni corrección de ese defecto**. El original 6.3 no se ha editado y ese arreglo sigue pendiente antes de la versión estable.

## Otras comprobaciones

- `git bundle verify` del respaldo completo: correcto, historial completo incluido.
- Huellas del kit y de los HTML: coinciden en todas las versiones suministradas.
- Los ocho PNG añadidos coinciden byte por byte con los originales del kit; no hay sustitución de avatares ni sprites nuevos inventados.
- Al completar la subida se compararon todos los archivos ya presentes en la rama del usuario con la entrega preparada: ninguno difería. Se preservaron sus commits y archivos auxiliares; solo se añadieron los pendientes y se actualizó el estado de esta documentación.
- Ningún HTML histórico o lanzador existente fue modificado; `git diff` de esos archivos: vacío.
- Inventario regenerado sin cambios inesperados; módulos nuevos comprobados sintácticamente con Node.
- Portada pública de Pages y los tres archivos SDK Firebase referenciados: HTTP 200. No se verificó un nuevo despliegue.
- Inspección visual de capturas: herramienta legible en móvil; el juego conserva los flotantes antiguos y su solapamiento. La captura de la casa original se obtuvo mediante clic programático para poder documentarla; no se presenta como prueba de que su botón sea tocable.

## Capturas de esta entrega

- `audit/screenshots/iphone-copias.png`: herramienta nueva con una copia sintética para revisar.
- `audit/screenshots/desarrollo-390x844.png`: entrada 6.3 con barra de copias, conservando la UI antigua.
- `audit/screenshots/desarrollo-1440x900.png`: referencia en escritorio.
- `audit/screenshots/casa63-referencia.png`: casa existente, sin afirmar que sea la nueva casa RPG.

## Pendientes, sin dar por verificados

- Safari de iPhone real y navegador embebido, navegación privada, poca memoria, presión de almacenamiento y red lenta.
- Partidas reales de JC/Gabi: no se accedió al almacenamiento de sus dispositivos. La compatibilidad probada es con fixtures de los formatos, no con sus partidas privadas.
- Auth, reglas desplegadas y dos cuentas/sesiones Firebase, reconexión y conflictos remotos. No hubo escrituras en RTDB.
- Recorrido funcional exhaustivo de economía/trabajos, deportes, cada receta, cine/búsqueda, cafetería/restaurante, todas las zonas, metro/viajes, música/radio, minijuegos, NPC, misiones, museo/huerto y citas/álbum. Su presencia se inventarió; no se sustituye ese recorrido por una afirmación general de ausencia de regresiones.
- Casa RPG integrada, colisiones, poses completas, dos plazas, efectos de objetos, decoración móvil y sincronización del interior: fases 2 a 6.
- Revisión del PR y publicación estable: pendientes. El acceso de escritura quedó habilitado y la subida de la fase 1 se completó en la rama de desarrollo. No se ha cambiado Pages ni se ha fusionado `main`.
