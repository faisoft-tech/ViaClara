# ViaClara → Figma export — SPEC compartido

Objetivo: cada pantalla de la app se exporta como **un archivo SVG** que el usuario arrastra a Figma.
Al importar, Figma convierte cada `<rect>`, `<text>`, `<g>`, etc. en capas editables. Por eso:

- **El texto SIEMPRE va en `<text>`** (nunca "quemado" en paths), para que en Figma siga siendo texto editable.
- Agrupa secciones con `<g>` y ponles `id` descriptivo (Figma lo usa como nombre de capa). Ej: `id="hero"`, `id="tab-bar"`, `id="card-inc-001"`.
- Sin dependencias externas, sin `<image href>` a URLs. Iconos = paths vectoriales dibujados a mano o formas simples (círculos/rects) con glifo aproximado. NO uses fuentes de iconos.

## Lienzo (frame de iPhone)

- Tamaño: **390 × 844** (iPhone lógico). `viewBox="0 0 390 844"`, `width="390" height="844"`.
- Fondo del frame = `Colors.background` (#FAFAFC) salvo que la pantalla tenga otro.
- **Barra de estado** (arriba, alto 50): dibuja hora `9:41` a la izquierda (x≈24, y≈32, bold 15px) y a la derecha tres glifos simples (señal / wifi / batería) en `Colors.text`. Sobre fondo azul usa blanco.
- Contenido de la app empieza bajo la barra de estado.
- Si la pantalla es una de las 3 tabs (index, my-reports, profile), dibuja la **tab bar** abajo (ver componente compartido).

## Design tokens (theme/tokens.ts)

Colores:
- primary `#3D69FE`, primaryDark `#2A4FD1`, primarySoft `#E7EDFF`, accent `#12B3AE`
- text `#17194B`, textMuted `#7D7E88`, textInverse `#FFFFFF`
- background `#FAFAFC`, surface `#FFFFFF`, border `#EEEEEE`, borderStrong `#E7E7E7`
- danger `#F24545`, warning `#F2A415`, success `#00A854`, slate `#4B4C60`

Tipografía (usa `font-family="Poppins"` para texto y `font-family="Epilogue"` para labels/chips/stats):
- small 12, body 14, bodyLg 15, subtitle 16, title 20, hero 26
- pesos: regular 400, medium 500, semibold 600, bold 700, extrabold 800

Spacing: xs 4, sm 8, md 12, lg 16, xl 24, xxl 32
Radius: sm 8, md 12, lg 16, xl 24, pill 999 (usa rx grande p.ej. 20+ o mitad de la altura)
Sombra de card: color #0A2A33 a 8% opacidad, blur 10, offset y 4. En SVG aproxima con un `<rect>` gris muy claro desplazado o un filter feGaussianBlur suave. Mantenlo sutil.

## STATUS_CONFIG (estados de incidencia)
- submitted "Registrada"  color textMuted #7D7E88  icono doc
- open      "Abierta"     color danger   #F24545   icono alerta (círculo con !)
- in_progress "En curso"  color warning  #F2A415   icono llave/tuerca
- resolved  "Resuelta"    color success  #00A854   icono check
- declined  "Declinada"   color slate    #4B4C60   icono menos

Badge de estado = pill con fondo del color del estado, icono + texto blanco, semibold 12px.

## CATEGORY_CONFIG (categorías)
- lighting "Alumbrado" #F59F00 (bombilla)
- road "Calzada" #E8590C (triángulo aviso)
- cleaning "Limpieza" #2F9E44 (papelera)
- furniture "Mobiliario" #9C36B5 (martillo)
- green_areas "Zonas verdes" #37B24D (hoja)
- other "Otros" #5B6B7B (tres puntos)

Thumbnail de categoría = cuadrado redondeado (10px) de 48×48, fondo = color categoría a ~13% (sufijo "22"), icono del color.

## Tab bar (compartida entre index / my-reports / profile)
- Alto 88, fondo surface #FFFFFF, borde superior 1px border #EEEEEE.
- 3 slots: [Home | (botón central +) | Mis avisos]
- Home: icono casa + label "Inicio". Mis avisos: icono lista + label "Mis avisos".
- Botón central elevado: círculo azul primary de 52×52, elevado -22px (sobresale por encima de la barra), icono "+" blanco. Sombra azul.
- Item activo en color primary #3D69FE, inactivo textMuted #7D7E88. Label 12.5px semibold.
- Nota: Profile NO está en la tab bar (se abre desde el avatar de Home), pero como pantalla suelta también dibuja la tab bar abajo con "Inicio" activo si aplica; para profile deja Home inactivo.

## Contenido de ejemplo (usar estos datos reales del repo)
Municipio activo: **Almuñécar, Granada**. Saludo: "Hola 👋".
Incidencias de muestra:
1. inc-001 · "Farola fundida en el Paseo del Altillo" · Alumbrado · En curso · "Paseo del Altillo, junto al banco azul" · hace 2 días · 23 likes · María J.
2. inc-002 · "Bache grande en la Avenida de Andalucía" · Calzada · Abierta · "Avenida de Andalucía, 45" · hace 4 días · 41 likes · Anónimo
3. inc-003 · "Contenedor desbordado en la Plaza Mayor" · Limpieza · Resuelta · "Plaza Mayor" · hace 8 días · 17 likes · Antonio G. (isMine)

Usuario de ejemplo (profile registrado): nombre "Diego H.", tel +34 6·· ·· ·· 89, puntos 1.240, tier Oro, stats: 12 avisos / 8 resueltos / 47 me gusta.

## Salida
Escribe el archivo en `figma-export/<nombre>.svg`. Devuelve SOLO una frase confirmando qué generaste.
