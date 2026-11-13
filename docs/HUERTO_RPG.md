# Huerto Comunitario: cultivar dentro de Madrid

Esta entrega transforma el huerto de tarjetas en un escenario caminable de 1120 × 896, con senderos, parcelas, invernadero, caseta, pozo, semillero, compostera, herramientas y gráficos originales. El museo y el huerto tienen fachadas propias y entradas en un nuevo sector al sur de Madrid.

## Cultivos y acciones

Las cuatro parcelas iniciales usan directamente sus registros anteriores. No se reinician las plantas ni sus fechas, salud o cosechas. Los precios y tiempos existentes se mantienen:

| Cultivo | Sembrar | Crecimiento real | Venta máxima |
| --- | ---: | ---: | ---: |
| Albahaca | 4 € | 5 h | 12 € |
| Tomates | 7 € | 9 h | 19 € |
| Girasoles | 6 € | 14 h | 23 € |
| Fresas | 9 € | 12 h | 26 € |

- Sembrar descuenta las semillas al realizar la acción; consultar el catálogo o elegir una semilla es gratis.
- El personaje camina hasta el borde de la parcela. Los bancales y los muebles tienen colisiones y accesos definidos.
- Las plantas muestran cuatro etapas. Crecen con tiempo real, también al cerrar el juego; el reloj del juego no acelera esos tiempos.
- Regar conserva los 10 minutos del juego y la recuperación de salud originales. Tras 18 horas sin agua se mantiene el deterioro anterior, contabilizado una sola vez por cada tramo de seis horas.
- Cosechar conserva los 15 minutos, vende según la salud, suma una cosecha al historial y libera la parcela. No se introduce un inventario de productos distinto al sistema anterior.
- Cada parcela adicional cuesta 25 € y 30 minutos del juego. Se amplía secuencialmente hasta doce, añadiendo una posición vacía al final del array existente.
- El compost es una acción nueva: 3 €, 15 minutos del juego y recuperación de 20 de salud, con máximo 100. Una planta sana no genera un gasto innecesario.
- La ronda de riego recorre las parcelas plantadas y aplica cada riego una vez. Interrumpirla conserva el trabajo realizado y detiene las acciones pendientes.

## Mundo y accesos

El mapa ejecutado se amplía de 1180 × 922 a 1180 × 1180. Los doce destinos y las viviendas decorativas originales conservan sus coordenadas. La avenida sur incorpora dos entradas: Museo de los Recuerdos y Huerto Comunitario. El plano ofrece catorce destinos; elegir cualquiera utiliza la búsqueda de caminos original. También funcionan la pulsación de fachada y el botón tradicional Entrar.

Se mantienen los accesos desde Barrio y Jardines del Este. El museo conserva su interior, álbum, fotografías de IndexedDB y actividades; esta entrega renueva su fachada y conexión con la ciudad, no sus salas interiores. Las fachadas nuevas también se utilizan en sus distritos anteriores.

Al salir del huerto se recupera la vista de ciudad o paseo que se estaba usando. El menú Opciones conserva las actividades anteriores del huerto y permite regresar al escenario nuevo. Un fallo al cargar las ilustraciones mantiene disponible ese huerto anterior.

## Código y datos

`src/farm/` separa mapa, recursos, dibujo, escena y cálculo de crecimiento. `src/legacy/farm-bridge.mjs` adapta el cultivo y economía nativos. `src/world/city-landmarks.mjs` contiene los dos nuevos destinos. El lanzador comprueba un marcador único antes de ampliar las dimensiones de la copia ejecutada; no modifica los HTML históricos.

El huerto sigue usando `dm58-life-<rol>-<nombre>`, conservando todas sus propiedades, sus visitas, dardos, cosechas y registros anteriores. La ampliación es una acción del jugador compatible con el renderer antiguo, que ya recorre todas las posiciones del array. No hay migración ni renombrado de claves o rutas Firebase.

La única clave nueva es `dos-mundos-huerto-rpg-v1:<rol>:<nombre codificado>`, para la posición segura y la semilla elegida. No duplica los cultivos ni la economía. Las posiciones guardadas dentro de la salida se recuperan en la entrada segura.

Las acciones comprueban parcela, semilla, fondos, estado maduro y sello de plantación. Impiden una segunda recompensa de cosecha y rechazan estados obsoletos. Si falla una escritura, restauran los valores de juego y almacenamiento capturados antes de la acción. Se conserva además la copia automática del lanzador y la exportación del baúl de partidas.

## Pruebas

80 casos comprobados: 12 del huerto en Chromium, 46 regresiones de ciudad/interiores/gimnasio/casa/guardados y 22 de navegación, tráfico y formato de guardado. Una expectativa antigua sobre el panel del huerto se actualizó para comprobar su nueva escena, y se volvió a verificar el recorrido de los distritos.

Se comparan siembra, riego y cosecha con `index6.3.html` intacto; se revisan ambas identidades, crecimiento offline, ampliación compatible con la vista anterior, fondos insuficientes, semilla inválida, doble cosecha, sequía, compost, almacenamiento lleno, caminos, puertas, controles y regreso a ciudad. También se comprueban las imágenes y la interfaz a 375, 390, 844 y 1440 píxeles. Las capturas de `huerto-rpg/` utilizan partidas sintéticas; la vista completa muestra el potencial de doce parcelas desbloqueadas.

Después de desplegar se registra en el PR el resultado de la comprobación con archivos servidos realmente por Pages, perfiles desechables de JC y Gabi, carta y estrella. Ninguna prueba utiliza cuentas, partidas o fotografías reales.

## Límites y publicación

El crecimiento y la economía conservan el guardado local por personaje del huerto anterior. No se añade un cultivo global compartido entre dispositivos ni se modifican Firebase, chat o los demás sistemas multijugador. Las imágenes de caminar y trabajar reutilizan los personajes originales; no son una nueva hoja completa de poses. Faltan pruebas en Safari/iPhone físico y una conexión móvil lenta real.

Rama: `feature/huerto-rpg`, desde `52146e43f686271689c1c810349323a5d88fac5d`. Copia local completa anterior y rama remota `backup/main-pre-huerto-52146e4`. GitHub Pages publica la raíz de main, sin dependencias ni compilación nuevas. Entrada: `casa-rpg.html?huerto=6`; Gabi con carta: `casa-rpg.html?gabi=1&huerto=6`.

Para recuperar la versión anterior, revertir el commit de fusión de esta entrega. Los cuatro cultivos y las parcelas ampliadas siguen siendo compatibles con el huerto anterior. No borrar partidas ni restablecer Firebase. El baúl de `tools/partidas.html` conserva las copias exportables.
