# Recursos originales de Madrid

Tres láminas PNG con transparencia, generadas para Dos Mundos mediante la herramienta de generación de imágenes. Se han incorporado sin retocar sus píxeles. No se han extraído gráficos de Pokémon ni de otros videojuegos.

- `buildings.png`: doce fachadas; diez edificios jugables y dos variantes de viviendas de fondo. Tejas, balcones, flores, escaparates, marquesina del cine y pabellón del metro.
- `street-props.png`: veinticuatro recursos; tres árboles, jardinera, farola, banco, papelera, semáforo, bolardo, bicicleta, seto, poste, fuente, terraza, tres puestos, perro, cuatro coches direccionales y dos peatones de ambiente.
- `neighbors.png`: seis vecinos con cuatro direcciones cada uno. Inés, Leo, Alma, Dani, Noa y Omar. Las otras ocho personas del sistema anterior reutilizan estas ilustraciones sin cambiar sus nombres, horarios o relaciones guardadas.

`city-atlas.json` indica los rectángulos de origen, dimensiones y SHA-256 de cada PNG. Los recortes se aplican al dibujar en Canvas; los archivos originales no se han recortado ni editado. Los cuadros no forman una cuadrícula perfectamente uniforme, por lo que las coordenadas de recorte son explícitas.

JC y Gabi siguen usando sus recursos originales de `assets/characters/` y `DM51_ART`; estas láminas solo contienen edificios, objetos y NPC.

La distribución y la composición del suelo se definen en `src/world/`. Esta entrega conserva las colisiones originales de los edificios. Las plantas, bancos, coches y otros elementos de calle son decoración visual y no añaden obstáculos al trazado antiguo.
