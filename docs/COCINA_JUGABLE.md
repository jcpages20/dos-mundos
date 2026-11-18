# Nuestra cocina: primera entrega de tres platos

Entrada actual: `casa-rpg.html?cocina=14`. Para Gabi con su carta y estrella: `casa-rpg.html?gabi=1&cocina=14`. Se abre con [tablero fijo y control fácil](COCINA_ESTABLE.md). Se mantienen la [corrección de pausas y rendimiento](COCINA_RENDIMIENTO.md) y el [control con gestos](COCINA_CONTROLES.md), con los mismos guardados.

En casa → Menú → «Cocinar jugando · 3 platos». El personaje camina hasta los fogones. También aparece «Cocinar jugando» al acercarse a los fogones o a la encimera y se añade una entrada desde el recetario habitual. La estación abre dentro del mismo juego y vuelve a la misma cocina al salir. La casa conserva muebles, tamaños, colisiones y actividades. El recetario rápido mantiene sus cinco recetas anteriores.

## Tres preparaciones distintas

| Plato | Pasos jugables | Ingredientes y recompensa originales |
| --- | --- | --- |
| Tortilla casera | Cortar verduras; cascar dos huevos y batir; cuajar y voltear; emplatar | 2 huevos, 1 verdura; 30 min del mundo, 14 XP, alimentación +27 y energía +9 antes del decaimiento habitual |
| Pasta con tomate | Cortar tomate; hervir y escurrir; remover salsa al fuego; servir pasta, salsa y queso | 1 pasta, 1 tomate, 1 queso; 35 min, 18 XP, alimentación +34 y energía +10 antes del decaimiento |
| Pollo con arroz | Trocear pollo; lavar el arroz; saltear; montar arroz, pollo y verduras | 1 pollo, 1 arroz, 1 verdura; 45 min, 23 XP, alimentación +42 y energía +14 antes del decaimiento |

El control fácil permite cortar tocando la comida, mantener el dedo para batir/lavar/remover y elegir un ingrediente y tocar el plato para colocarlo. Los pasos nuevos al fuego empiezan a potencia media. La tortilla y el colador se pueden tocar cuando estén listos. No hace falta arrastrar ni dibujar círculos. Los botones alternativos siguen disponibles.

Al elegir «Gestos» se corta deslizando sobre una franja de ayuda alrededor de cada marca, hacia abajo o arriba. Se admiten trazos más cortos y algo desviados; el cuchillo se ajusta a la guía cercana y los trozos se separan al levantar el dedo. Los huevos se tocan antes de batir. Mezclar, lavar y remover reconocen círculos pequeños u ovalados en ambos sentidos; tocar o agitar en línea recta no completa círculos. El fuego tiene un control de potencia: necesita calentarse, cocina durante un tiempo y una temperatura excesiva baja la calidad y deja marcas en la comida. La tortilla requiere una vuelta hacia arriba; la pasta, llevar la olla al colador. Los ingredientes del emplatado se cogen con un margen alrededor de su imagen, se elevan para verse sobre el dedo y se sueltan sobre el plato iluminado. Si se sueltan fuera o se cancela el contacto, vuelven a su posición.

Cada gesto tiene un botón alternativo con un nombre concreto. También se puede usar teclado: Espacio/Enter para la acción, flechas en orden para remover y flechas/Home/End en el control de fuego. Se interceptan las teclas de movimiento mientras la estación está abierta para no mover al personaje del interior anterior.

Son cuatro pasos cortos y no hay una cuenta atrás obligatoria. Se puede repetir el paso actual. El fuego necesita entre diez y doce segundos de cocción activa; el resto depende de los gestos. La puntuación de 0–1000 refleja corte, calor, vuelta y emplatado. No multiplica dinero ni XP. Se conservan mejores marcas por plato y treinta preparaciones recientes.

## Arte original para jugar

Dieciséis sprites originales: tabla, cuchillo, cuenco, sartén, olla, colador, tres platos terminados, tomate, pimiento, pollo, arroz, huevos, queso y cuchara. El PNG de 1254×1254 se copia sin editar desde la generación original; el manifiesto conserva su SHA-256 y los recortes. El motor aplica una clave de color magenta al cargar, sin modificar el archivo fuente. No se publican los bocetos descartados.

La estación combina estos sprites con la nevera, encimera y planta del atlas anterior, muebles de cocina dibujados en píxeles, azulejos, madera, ventana con tejados y la figura original de JC o Gabi. El lienzo mantiene proporciones cuadradas y transforma los gestos según el área visible, también en horizontal. La referencia es la interacción de un juego de cocina de portátil; no se utilizan personajes, imágenes o recursos de Cooking Mama o Nintendo.

## Despensa, alimentación y progreso

Consultar el catálogo o preparar no descuenta ingredientes. «Servir y comer» usa la receta original una vez al terminar los cuatro pasos. Reconoce tanto la despensa como las verduras de Barrio Vivo; no añade una segunda economía. Si faltan ingredientes al servir, la preparación sigue guardada: se puede abrir la despensa, comprar con los precios habituales y volver.

«Ensayo gratis» permite practicar aunque falten ingredientes. Guardar un ensayo no cambia comida, minutos, dinero, energía, XP, misiones o planes; tampoco reemplaza una marca de receta servida. El resultado indica claramente el modo.

La llamada de servicio se observa después de su transacción local. Conserva personalidad, plato favorito, inspiración y aportación al plan de cena. Las puntuaciones y preparaciones de esta entrega son locales al personaje/dispositivo; no se introduce una sartén compartida online ni se cambian rutas Firebase.

## Datos y dependencias

Nueva clave aditiva: `dos-mundos-cocina-jugable-v1:<rol>:<nombre codificado>`, con preparación activa, recibo, mejores marcas e historial. No se migran, renombran ni borran claves anteriores. Se conservan datos desconocidos compatibles y se rechazan versiones futuras sin reiniciarlas. El baúl ya incluye el prefijo `dos-mundos-`.

Se guarda la preparación después de los gestos, los cambios de paso y periódicamente mientras se cocina. Las escrituras idénticas se omiten. Cambiar de aplicación, pausar o recargar detiene el fuego y elimina el contacto táctil pendiente. Al volver se recupera en pausa. Perder el foco con la página visible o girar el móvil solo cancela el gesto pendiente y permite seguir cocinando sin abrir la pausa. Descartar una preparación incompleta no descuenta alimentos. La posición de la casa permanece en el pasillo de aproximación, sin modificar las coordenadas de Madrid.

El adaptador reutiliza el botón/callback de `DM55_RECIPES` y sus funciones `dm55ConsumeIngredients`, `advance`, `dm55XP` y guardado; no copia la fórmula nutricional. Antes captura estado, despensa, inventario de Barrio Vivo, registros y cachés. Si una escritura falla, los restaura antes de emitir una actividad a Vida y planes. El recibo impide consumir o recompensar dos veces al repetir el guardado.

| Módulo | Responsabilidad |
| --- | --- |
| `src/kitchen/recipes.mjs` | Tres recetas, cuatro pasos por receta y coordenadas de interacción |
| `src/kitchen/cooking-model.mjs` | Gestos, temperatura, pasos, calidad y recuperación |
| `src/kitchen/kitchen-renderer.mjs` | Estación, arte, ingredientes y cambios visibles |
| `src/kitchen/kitchen-scene.mjs` | Catálogo, controles, pausa, ensayos y resultados |
| `src/legacy/kitchen-bridge.mjs` | Recetas y guardados originales, consumo y recibos |
| `house-scene.mjs`, `install-house.mjs` | Acercarse a fogones, abrir/cerrar y mantener el recetario anterior |
| `life-bridge.mjs` | Identificar la receta y observar únicamente un servicio confirmado |

Los HTML históricos, los PNG de personajes, el atlas de la casa y los módulos de mundo, gimnasio, cine, huerto, parques y guardado no se sustituyen. Si falta el arte nuevo, la estación ofrece el recetario rápido y permite regresar a casa. Salir durante una carga no vuelve a abrir la estación al finalizar esa carga.

## Pruebas y publicación

Han pasado 136 casos distintos: diez nuevos de navegador, 56 regresiones relacionadas y 70 pruebas Node. Se preparan los tres platos completos con ratón y toque real de Chromium, incluidos corte, huevos, círculos, fuego, vuelta, escurrido y emplatado. Se comprueban ingredientes, alimentación, XP, sesión única, ensayo gratuito, pausa/recarga, cancelación táctil, datos futuros y recuperación cuando falta el arte. Una prueba usa verduras del inventario de Barrio Vivo y un fallo de cuota al servir: se restauran despensa e inventario, personalidad y plan de cena; reintentar concede una sola comida y una aportación al plan.

Las regresiones incluyen las doce de casa, personalidad y planes, copias y restauración del museo, carta/estrella, gimnasio rápido, retos clásicos y una rutina nueva, Madrid, cine/plataformas, huerto, parques, chat y radio. La comprobación pública después de Pages se registra en el PR. Se utilizan perfiles sintéticos, sin cuentas ni partidas reales. Quedan pendientes Safari/iPhone físico, ergonomía en los dos móviles y una prueba con dos cuentas Firebase reales.

Rama `feature/cocina-tres-platos`, desde `07b10ff70e26c5953c101413c10298f30211a859`. Antes de modificar se guardaron la copia completa `dos-mundos-antes-cocina-07b10ff.bundle` y la rama remota `backup/main-pre-cocina-07b10ff`. Pages publica main; la entrada y los módulos modificados de cocina usan `?cocina=11` para renovar cachés.

Rollback: revertir la fusión de esta entrega sin borrar claves o restablecer Firebase. El cliente anterior ignora la preparación nueva y mantiene los platos, ingredientes y XP ya confirmados. Para retomar una preparación pendiente hace falta volver a esta entrega; también se puede dejar conservada en su clave. El escape room continúa en pausa y no forma parte de la cocina.

Capturas con perfiles de prueba: [recetario](cocina-jugable/recetario-iphone.png), [corte táctil](cocina-jugable/corte-tactil-iphone.png), [salsa al fuego](cocina-jugable/pasta-fuego-iphone.png) y [plato de Gabi](cocina-jugable/pollo-gabi-iphone.png).
