# Vida y planes: primera entrega de jugabilidad

Esta entrega conecta las actividades existentes con personalidad elegida, estados temporales y tres proyectos de JC y Gabi. La ciudad, los interiores, los sprites, la economía, las recetas, las misiones, las citas y los guardados históricos siguen funcionando. No se modifican los HTML históricos ni los mapas o recursos gráficos.

Entrada: `casa-rpg.html?vida=8`. Para Gabi con carta y estrella: `casa-rpg.html?gabi=1&vida=8`. Abrir Acciones → Nuestros planes y personalidad. También se encuentra en el teléfono y en Mi vida. El teléfono se coloca por encima de los interiores amplios para permitir usar este acceso desde ellos.

Capturas de partidas sintéticas: [planes en iPhone](vida-planes/planes-iphone.png), [personalidad](vida-planes/personalidad-iphone.png) y [estado inspirado](vida-planes/animo-iphone.png).

## Personalidad y ánimo

Cada personaje elige hasta dos rasgos —creativo, sociable, casero o deportista—, tres actividades favoritas y una de las cinco recetas existentes como plato preferido. Las selecciones se guardan por rol y nombre. No se asigna una personalidad a Gabi ni a JC automáticamente; guardar o editar preferencias no cuesta dinero ni tiempo y no concede premios.

Los gustos y los rasgos añaden como máximo tres puntos de diversión a una actividad compatible. La creatividad convierte la lectura en inspiración; sociable favorece conversación y cafetería; casero favorece cocinar o descansar en casa; deportista favorece las actividades físicas. El plato favorito añade disfrute al cocinar esa receta con los ingredientes reales de la despensa.

Los estados aparecen a partir de actividades terminadas, usando el reloj absoluto de la partida:

| Estado | Origen | Duración del juego | Efecto |
| --- | --- | ---: | --- |
| Inspirado | Leer con el rasgo creativo | 120 min | 2 XP adicionales en la siguiente receta o sesión de lectura/estudio |
| Concentrado | Leer | 120 min | 2 XP adicionales en la siguiente sesión de lectura/estudio |
| Relajado | Pasear, descansar o estirar | 180 min | Un punto adicional de diversión en la siguiente actividad, dentro del límite de tres |
| Orgulloso | Terminar una actividad física | 150 min | Un punto adicional de diversión en la siguiente conversación, dentro del límite de tres |
| Cansado | Terminar ejercicio con menos de 25 de energía | 120 min | Explica el cansancio; descansar y recuperar energía lo elimina |

La bonificación de un estado se consume al usarla. Una nueva actividad puede generar un estado nuevo. Los estados se conservan al cerrar el juego y no caducan por horas reales; sí caducan cuando avanza el reloj de la partida. El indicador numérico de ánimo y las necesidades habituales se conservan. Los beneficios nuevos se activan al guardar la personalidad; hasta entonces las recompensas nativas son exactamente las anteriores.

La XP adicional se entrega al contador que corresponde a la actividad: estudio de la partida base, lectura de la biblioteca o cocina de Vida Propia. Los precios, ingredientes, minutos y XP principales los sigue calculando cada actividad original. No se duplica el pago, la comida ni las recompensas de las misiones existentes.

## Tres planes sin fecha límite

Se pueden mantener hasta dos planes activos, con progreso independiente de JC y Gabi. Cada persona se une y realiza sus aportaciones con su propio personaje. Las actividades anteriores a unirse no se cuentan retroactivamente.

- **Una cena entre los dos:** cada uno cocina una receta de su despensa. Ambos se reúnen en casa y confirman el momento. Cocinar conserva su efecto de alimentación; la confirmación añade el recuerdo, sin conceder otra comida o premio económico.
- **Una tarde por Madrid:** cada uno realiza una actividad en el parque, otra en la cafetería y un rato en las butacas del cine o una actividad de película existente. Consultar la cartelera o abrir una plataforma es gratis y no acredita una película. Ambos cierran el plan en el cine.
- **Nuestro reto activo:** cada uno completa tres modalidades diferentes entre fuerza, cardio, telas, estiramientos y deporte en el parque. Repetir una modalidad no aumenta el número de modalidades. Se completa cuando ambos han terminado su parte, aunque hayan jugado a horas distintas.

Cena y Madrid necesitan presencia online real de ambos en la misma sala: presencia actualizada en los últimos 45 segundos y una confirmación de cada jugador con una diferencia máxima de dos minutos. Cada persona confirma exclusivamente su propia participación. No se generan compañeros ficticios ni se mueve al otro personaje. Si se pasa ese intervalo, se puede volver a confirmar; el plan completo no tiene fecha de caducidad.

Dejar un plan conserva las aportaciones realizadas y detiene las nuevas hasta retomarlo. Si nadie participa, el plan queda pausado y libera espacio. Retomar respeta el máximo de dos activos. Cada una de las tres plantillas se completa una vez en esta primera entrega.

Las indicaciones «Ir a…» cierran el menú y usan las salidas nativas de los interiores y los caminos existentes de la ciudad. Conservan las colisiones y las transiciones. Al completar un plan aparece una tarjeta con fecha, actividades y aportaciones. Su título se puede personalizar. Estos recuerdos también aparecen en el álbum anterior, que conserva intactos sus recuerdos y fotografías.

## Integración y datos

`src/life/` separa modelo, perfil local, sincronización, controlador e interfaz. `src/legacy/life-bridge.mjs` observa las acciones del juego dentro de la copia ejecutada y adapta las APIs existentes antes de que las escenas las capturen. Comprueba que avanzó el tiempo y no hubo rechazo de la acción; identifica las recetas por el contador real de platos preparados. Combina la observación de funciones con captura/finalización de clics para incluir los controladores locales de cafetería y cocina. Evita contabilizar dos veces las llamadas anidadas.

Las únicas claves nuevas son:

- `dos-mundos-vida-v1:<rol>:<nombre codificado>`: preferencias y estados del personaje.
- `dos-mundos-planes-v1`: última copia de los proyectos compartidos recibida de Firebase.
- `dos-mundos-planes-cola-v1:<rol>:<nombre codificado>`: aportaciones locales pendientes de ese personaje.

El baúl ya captura este prefijo. No se migran ni eliminan claves anteriores. Los perfiles o planes de versiones futuras y los datos ilegibles se conservan y no se reescriben automáticamente. Si falla el almacenamiento, se rechaza el cambio del perfil o la aportación nueva; no se muestra como guardado algo que no pudo persistir. Un fallo al guardar el estado temporal tampoco concede su bonificación.

Los planes utilizan una ruta nueva e independiente, `dosMundos/duo/vidaV1/plans`, mediante el SDK, las cuentas y la conexión existentes. Se mantienen las rutas anteriores de chat, presencia, gestos y `v61/shared`. No se agregan credenciales ni dependencias externas de ejecución.

La escritura es una transacción sobre el pequeño conjunto de planes. Los comandos identifican al jugador y llevan recibos únicos, de modo que los reintentos no duplican aportaciones ni recuerdos. El reductor comprueba autor, modalidad, participación, límite de planes y confirmaciones. Un cliente fusiona exclusivamente sus aportaciones; una creación simultánea de la misma plantilla une a ambos y conserva su progreso. Los títulos son metadatos compartidos editables por ambos.

La cola se persiste antes de mostrar el cambio local. Se elimina una solicitud solo después de confirmar y guardar su recibo. Desconexiones, errores de permisos o almacenamiento mantienen la cola para reintentar. La interfaz distingue lo guardado aquí de lo compartido; permite descartar una solicitud bloqueada por un conflicto, como el límite de planes activos. Los eventos anteriores nunca vuelven a ejecutarse: se sincroniza su registro, no otra compra o sesión deportiva. Volver desde la caché del navegador reconstruye la suscripción y la cola.

No se han modificado reglas Firebase. La ruta nueva necesita los permisos de lectura y transacción de las dos cuentas autorizadas. La comprobación autenticada de esos permisos y una sesión simultánea real siguen pendientes; si el servidor rechaza la ruta, la interfaz conserva el modo local y muestra que la sincronización no se ha completado.

## Validación y publicación

Las pruebas nuevas comparan recetas, ingredientes, XP, necesidad de energía, clics de cafetería, modalidades deportivas, límites de planes, persistencia, perfiles por rol, versiones futuras, cuota de almacenamiento, destinos entre locales, estados con tiempo de juego, lectura en sus contadores nativos y regreso desde caché. Se revisa la interfaz a 375, 390, 844 y 1440 píxeles. El modelo de dos clientes prueba fusiones concurrentes, offline, reintentos, recibos, conflictos, confirmaciones y reconstrucción de la cola usando un servidor de transacciones simulado.

Han pasado 137 casos distintos: 14 nuevos de navegador, 81 regresiones de ciudad, casa, gimnasio, huerto, parque/plaza, cine, cafetería, carta y baúl, y 42 de modelo, sincronización, navegación, tráfico y formato de guardado en Node. Los resultados finales y la comprobación de los archivos realmente publicados se registran en el PR. Las pruebas usan perfiles sintéticos; no se accede a cuentas, fotografías ni partidas reales.

Pendientes de esta primera entrega: comprobación en Safari/iPhone físico y con las dos cuentas Firebase reales; aspiraciones largas, invitados NPC y metas con dinero compartido corresponden a entregas posteriores. La personalización de gustos es local a cada personaje/dispositivo; los proyectos y sus recuerdos son los datos preparados para compartir mediante Firebase.

Rama `feature/vida-y-planes`, desde `18c533c29573ea902238484598bc7a3c2732e088`. Copia completa previa `dos-mundos-antes-vida-18c533c.bundle` y rama remota `backup/main-pre-vida-18c533c`. Pages sigue sirviendo main sin compilación. El lanzador y su importación del puente usan `?vida=8` para renovar la caché.

Para revertir, revertir la fusión de esta entrega. Las claves y la ruta nuevas pueden conservarse: la versión anterior simplemente no las lee. Las pequeñas bonificaciones ya obtenidas siguen siendo números compatibles de diversión y XP. No borrar guardados ni restablecer Firebase. El baúl mantiene las copias exportables.
