# ViaClara

App ciudadana para reportar y seguir incidencias municipales. Prototipo (demo) para
el piloto de **Almuñécar**.

> Lo ves, lo avisas, lo sigues.

📄 Documento completo de análisis y especificación del proyecto (objetivos, actores,
requisitos funcionales/no funcionales, casos de uso, modelo de datos, reglas de
negocio, roadmap e ideas nuevas): **[DOCUMENTO_VIACLARA.md](./DOCUMENTO_VIACLARA.md)**.

## Cómo arrancarlo en Expo Go

1. Instala **Expo Go** en tu móvil (App Store / Google Play).
2. En el ordenador, dentro de esta carpeta:
   ```bash
   npm install      # solo la primera vez
   npm start        # arranca el servidor de Expo
   ```
3. Escanea el **QR** que aparece en el terminal con la cámara (iOS) o desde la
   app Expo Go (Android). El móvil y el ordenador deben estar en la **misma red wifi**.

## Qué incluye la demo

- **Inicio**: lista y mapa de avisos del municipio, con filtros por categoría.
- **Reportar**: flujo guiado en 4 pasos (foto → ubicación → categoría → detalle).
- **Detalle**: barra de *workflow* visual (Registrada → Abierta → En curso → Resuelta,
  más la rama Declinada), me gusta, seguir, compartir, revivir y comentarios.
- **Mis avisos**: pestañas "Mías" / "Siguiendo".
- **Perfil**: registro escalonado (solo se pide cuenta para acciones sociales).

Diseño pensado para público 40+: tipografía grande, alto contraste, iconos con texto.

## Notas técnicas

- **Stack**: React Native + Expo (SDK 54), expo-router. Backend previsto: AWS Lambda
  (Python) + DynamoDB.
- Los datos son **mock en memoria** (`src/data/`); no hay backend todavía.
- La cámara, el mapa y las fotos están **simulados** para que funcione en Expo Go sin
  configuración nativa.
- ⚠️ **Notificaciones push**: requieren un *development build* de EAS (no funcionan en
  Expo Go en Android desde el SDK 53). Es el siguiente paso para el piloto real.

## Estructura

```
src/
  app/                 rutas (expo-router)
    (tabs)/            Inicio · Mis avisos · Reportar · Perfil
    incidencia/[id]    detalle de una incidencia
  components/          tarjetas, workflow, cabecera, etc.
  data/                datos mock + store en memoria
  theme/               colores, tipografía, estados, categorías
```
