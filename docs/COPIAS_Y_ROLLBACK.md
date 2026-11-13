# Copias, revisión y recuperación

## Usar esta entrega

Servir los archivos por HTTP/HTTPS; los módulos ES e IndexedDB no están diseñados para abrirse por `file://`.

```sh
python -m http.server 8765 --bind 127.0.0.1
```

Abrir `http://127.0.0.1:8765/desarrollo.html`. Se hace una copia antes de arrancar 6.3, antes de que `loadState` normalice la partida o `?gabi=1` cambie el rol. `Mis copias` abre `tools/partidas.html` en la misma pestaña y detiene el juego de esa pestaña. La portada `index.html` y todos los HTML anteriores permanecen intactos.

**La copia automática solo se realiza al entrar por `desarrollo.html` o por la herramienta de copias.** Abrir directamente los lanzadores históricos o la portada actual sigue usando su comportamiento anterior. Esta entrega no intercepta globalmente localStorage ni modifica los escritores antiguos.

El origen importa: `http://localhost:8765`, `http://127.0.0.1:8765` y `https://jcpages20.github.io` tienen datos separados. Un archivo JSON descargado permite trasladar una copia explícitamente; la pantalla muestra su origen. No se copian sesiones de acceso. La herramienta publicada debe ejecutarse en el mismo origen del juego para ver sus guardados reales.

## Qué se guarda y cómo restaurar

1. Abrir `Mis copias`, con las demás pestañas de Dos Mundos cerradas.
2. Descargar el progreso y guardarlo fuera del navegador.
3. Para recuperar, elegir el JSON o revisar una copia de la lista. Se muestran fecha, número de claves/fotos y conflictos.
4. Confirmar que se han cerrado las otras pestañas y pulsar `Recuperar esta copia`.
5. Volver al juego en esa pestaña para que cargue los valores recuperados.

La restauración fusiona claves/fotos: reemplaza las incluidas con el mismo identificador, mantiene las ausentes y conserva campos extra de las fotos. No borra por completo el progreso nuevo que no esté en el archivo. Es una **recuperación no destructiva**, no una sustitución total del navegador. Para los conflictos, la copia elegida tiene prioridad.

Antes de aplicar se guarda una copia duradera `before-restore`. Si la bóveda no permite guardarla, no se cambia la partida. Se verifica que los datos no hayan cambiado desde la revisión y de nuevo tras crear el respaldo. Un fallo de cuota en localStorage revierte las claves y las fotos modificadas; se han probado ambas rutas de fallo con datos sintéticos.

## Esquema y límites

- Bóveda nueva: IndexedDB `dos-mundos-save-vault-v1`, object store `snapshots`, clave `id`.
- Registro: UUID, motivo y sobre JSON `dos-mundos-backup`, versión 1, fecha ISO, origen, datos y huella SHA-256.
- Sobre: `data.local` contiene strings exactos de `dos-mundos-*` / `dm58-life-*`; `data.photos` contiene los registros del museo.
- No hay migraciones, claves locales renombradas ni rutas Firebase nuevas en uso.
- No hay subidas de partidas ni fotos. Los JSON de copia son privados y no deben incluirse en Git. La huella detecta daños accidentales; no es una firma ni cifra el archivo.
- Las copias idénticas se reutilizan; las diferentes no se purgan automáticamente. Si falta espacio se informa, y el lanzador ofrece continuar explícitamente sin copia nueva. La gestión avanzada de espacio queda pendiente.
- La descarga directa lee la partida y el museo sin depender de que la bóveda tenga espacio. Si la bóveda falla, todavía se puede descargar el JSON; la restauración sigue exigiendo un respaldo previo válido.
- Leer un museo inexistente crea únicamente su base/almacén vacíos para poder usar la API antigua; nunca añade fotos de ejemplo a la partida.
- Límite de importación/exportación: 40 MB; máximo 1.000 claves. Las fotos se validan como data URLs JPEG/PNG/WebP con IDs únicos. Un archivo de versión desconocida, dañado o con claves de otras aplicaciones se rechaza antes de escribir.
- IndexedDB y localStorage no comparten una transacción atómica. Un cierre del navegador o del dispositivo durante la recuperación puede dejar el paso entre ambos incompleto. El respaldo previo permanece disponible en `Mis copias`; elegirlo y revisar su recuperación. No se promete atomicidad ante un corte de energía.
- Las exclusiones mediante Web Locks coordinan las herramientas nuevas, pero el código antiguo no usa esos bloqueos. Cerrar las otras pestañas sigue siendo necesario. No restaurar mientras el otro navegador esté editando datos compartidos de producción.
- Borrar datos del navegador elimina también la bóveda: guardar una descarga externa. Safari real, navegación privada y presión de almacenamiento requieren validación en dispositivo.
- El JSON no contiene RTDB, chat remoto ni fotos de otros dispositivos. No afirma ser un backup remoto completo.

## Revisión, publicación futura y rollback

La rama de desarrollo se entrega para revisión; esta fase no autoriza a tratar la casa futura como terminada. Al publicar esta entrega aditiva, `index.html` seguirá siendo la portada previa. Para probarla en Pages hará falta abrir `/dos-mundos/desarrollo.html` una vez subida y desplegada la rama apropiada. No se ha hecho ese despliegue en esta sesión.

La escritura GitHub ya está habilitada y la fase 1 se entrega en la rama de desarrollo para revisión. Para futuras actualizaciones, subir únicamente las referencias de trabajo y abrir o actualizar el PR en borrador:

```sh
git push origin backup/main-pre-casa-pokemon-8083ec9 feature/casa-pokemon
```

La rama de respaldo publicada es `backup/main-pre-casa-pokemon-8083ec9`, además del tag local `backup/pre-casa-pokemon-8083ec9`: no depende de publicar un tag. No forzar refs ni fusionar automáticamente.

Para recuperar el historial desde la copia anterior:

```sh
git clone /ruta/dos-mundos-8083ec9.bundle dos-mundos-recuperado
git -C dos-mundos-recuperado switch main
```

El bundle incluye las referencias y todo el historial de la base, pero **no** datos de navegadores o Firebase. El paquete de entrega añade un bundle posterior con los commits de esta fase.

Rollback de código: cerrar la entrada de desarrollo y volver a `index.html`; si la fase ya se hubiera fusionado, revertir sus commits mediante PR sin borrar guardados ni bóveda. No usar `git reset --hard` sobre trabajo del usuario. Rollback de datos locales: desde `Mis copias`, revisar el respaldo deseado y restaurarlo; se guardará también el estado anterior a esa recuperación.
