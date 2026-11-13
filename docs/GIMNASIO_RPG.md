# Club Atlas · Gimnasio amplio con telas aéreas

El gimnasio pasa de la ilustración pequeña a una sala recorrible de **1056×816**, con cámara, plano general, colisiones y cuatro zonas. La casa y sus recursos permanecen idénticos, incluida la corrección de entrada de la puerta.

## Experiencia

- **Fuerza:** rack con barra y discos, banco ajustable, poleas, prensa de piernas, mancuernas y soporte para discos.
- **Cardio:** dos corredoras, elíptica, bicicleta de spinning, remo y saco de entrenamiento. Las cintas y pedales tienen detalles animados.
- **Telas aéreas:** dos pórticos completos, telas burdeos y lavanda, pliegues, anclajes y colchonetas acolchadas. La zona de madera lleva el detalle «Telas · Gabi» y permite practicar con cualquiera de los dos personajes originales.
- **Movilidad y calma:** esterillas, bloques, colchoneta, barra y espejo. También hay recepción con flores, taquillas, toallas, agua, banco de descanso, plantas y un olivo.
- **Arte:** 24 sprites originales de mobiliario, utilizados en 26 objetos y cuatro espejos; acero, madera, tapizados, texturas y sombras. Ventanas con tejados y luz según la hora del juego, suelo de goma, parqué, alfombras y lámparas cálidas.

Tocar el suelo permite caminar; tocar una máquina hace que el personaje se acerque a un punto libre. El botón contextual inicia la actividad. Las cuatro pestañas de zona llevan caminando hasta cada área. El menú ofrece sesiones y progreso, la vista anterior y la salida a la calle.

Durante la sesión se ve una animación breve: marcha sobre la cinta, asiento en bicicleta/remo/prensa, mancuernas o poleas, estiramiento, descanso y elevación con balanceo en las telas. Se conserva el personaje original de JC o Gabi; las poses se componen a partir de los sprites existentes, sin sustituirlos por avatares nuevos. Son animaciones de videojuego, no un sistema biomecánico ni un atlas dedicado de poses completo.

## Progreso y compatibilidad

| Actividad | Tiempo del juego y efectos |
| --- | --- |
| Fuerza | Función original: 60 min, energía −19, alimentación −8, diversión +8, 20 XP de fitness y una sesión. |
| Cardio | Función original: 35 min, energía −13, alimentación −5, diversión +7, 14 XP de fitness y una sesión. |
| Estiramientos | Función original: 20 min, energía +6, diversión +4, 6 XP de fitness y una sesión. |
| Telas | 45 min, energía −15, alimentación −6, diversión +14, 18 XP totales/de fitness, 18 puntos de telas y una sesión. |
| Agua | 5 min, energía +3, diversión +2. Sin XP ni sesión de entrenamiento. |
| Descanso | 15 min, energía +7, diversión +2. Sin XP ni sesión de entrenamiento. |

Todos los efectos conservan el decaimiento y los límites de necesidades del juego. No se introducen cobros. Las recompensas se aplican una sola vez al empezar; cerrar la animación o volver a caminar no concede recompensas adicionales ni repite el tiempo.

Se reutilizan `dm56Act`, `dm56Effect`, el contador de sesiones de `dos-mundos-56-visitas:<nombre>:<rol>` y la experiencia de `dos-mundos-55-progreso:<nombre>:<rol>`. Las telas añaden el campo compatible `skills.aerial`; no se duplica la experiencia total.

Nueva clave aditiva: `dos-mundos-gym-rpg-v1:<rol>:<nombre>`, con la posición interior segura. No se sobrescriben las coordenadas de Madrid ni las claves anteriores. La posición durante una animación se guarda en su punto de aproximación libre; la puerta nunca es un punto de reanudación. Las copias existentes incluyen automáticamente esta clave por su prefijo.

La vista previa y todas las actividades clásicas conservan su acceso. Si falla el material nuevo o tarda demasiado en cargar, se recupera el gimnasio anterior. Salir mientras se cargan recursos cancela la escena y evita que aparezca de nuevo. No hay cambios de Firebase.

## Recursos y módulos

| Archivo | Responsabilidad |
| --- | --- |
| `assets/gym/gym-atlas.png`, `.json` | Atlas de 24 muebles original, transparencia y coordenadas de los recortes. SHA-256 en el manifiesto. PNG copiado sin modificar después de prepararlo con image_gen. |
| `src/interiors/gym-map.mjs` | Zonas, dimensiones, 26 objetos, colisiones, puntos de aproximación y práctica. |
| `src/interiors/gym-renderer.mjs` | Suelos, paredes, profundidad, luces, cámara, plano, objetos y poses originales. |
| `src/interiors/gym-scene.mjs` | Controles, navegación, sesiones, menú, guardado y ciclo de vida. |
| `src/interiors/install-gym.mjs` | Entrada, salida y recuperación de la vista anterior ante errores. |
| `src/legacy/gym-world-bridge.mjs` | Adaptación incremental al estado y las funciones originales. |
| `styles/gym.css` | Interfaz del gimnasio y controles táctiles. |
| `src/legacy/house-bridge.mjs`, `src/ui/house-launcher.mjs`, `casa-rpg.html` | Conexión de los módulos y versión de URL para la caché. |

La foto de referencia solo guía la idea de las telas: no se publica ni se convierte a un personaje. No se han utilizado recursos de Nintendo ni fotos personales en los gráficos del gimnasio.

## Verificación

**49 casos verificados:** nueve del gimnasio nuevo, 22 regresiones de interiores/copias/cine/cafetería, tres de casa/Gabi/carta y 15 de navegación/formato de copias. Perfiles sintéticos y tráfico externo bloqueado; sin modificar partidas ni Firebase de producción.

- Los entrenamientos en máquinas reales del mapa producen los mismos costes, minutos, necesidades, inventario, experiencia y sesiones que 6.3 intacta.
- La práctica de telas con Gabi conserva el rol, añade una sola recompensa, restaura una posición libre y persiste después de recargar.
- Los cuatro sectores y todos los objetos tienen puntos accesibles; no se atraviesan máquinas ni colchonetas.
- Energía insuficiente no concede recompensas ni modifica el progreso.
- Controles de al menos 44 px, sin desbordamiento ni botón de salida recortado en 390×844, 375×667, 844×390 y 1440×1000.
- Salida, reentrada, posiciones antiguas en la puerta, retorno desde la vista anterior y fallo/carga tardía de recursos comprobados.
- Casa, sprites originales, entrada corregida de la casa, carta/estrella de Gabi y funcionalidades de los otros locales comprobados. La carta conserva su error histórico conocido de `postMessage` con origen `null`; se comprueba su finalización por el observador alternativo.

Las pruebas de acciones gratuitas esperan a que termine la inicialización automática del progreso diario anterior, para distinguir las escrituras del arranque de las propias de una actividad.

```sh
node tests/gym-navigation.test.mjs
node tests/house-navigation.test.mjs
node tests/save-format.test.mjs
python tests/gym_browser.py GymTests
python tests/interiors_browser.py InteriorsTests
```

Capturas con datos de prueba: [plano general](gym-rpg/plano-general.png), [Gabi en las telas](gym-rpg/gabi-telas-iphone.png), [corredora](gym-rpg/cardio-iphone.png) y [prensa de piernas](gym-rpg/fuerza-iphone.png).

Pendiente: iPhone/Safari físico, sesiones con cuentas reales y sincronización de dos jugadores en este nuevo mapa. La conexión y el chat anteriores se conservan; no se presenta esta escena local como multijugador sincronizado.

## Publicación y rollback

Rama `feature/gym-rpg-telas` desde `d80b582`; copias previas local `dos-mundos-antes-gym-amplio-d80b582.bundle` y remota `backup/main-pre-gym-rpg-d80b582`.

Publicar por PR y GitHub Pages. Entrada actualizada: `/dos-mundos/casa-rpg.html?gym=4`; para Gabi con carta, `?gabi=1&gym=4`.

Rollback: revertir el PR sin borrar progreso. La clave de posición queda conservada y el campo de experiencia de telas es compatible con el cargador anterior. Los HTML históricos y `index6.1.html` permanecen intactos.
