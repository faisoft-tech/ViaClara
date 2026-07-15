# Vía Clara — Documento de Análisis y Especificación del Proyecto

> *"Lo ves, lo avisas, lo sigues."*

Piloto: **Almuñécar (Granada)**. Documento vivo — se actualiza a medida que el proyecto avanza desde el prototipo (demo con datos mock) hacia el producto real.

---

## 1. Introducción

### 1.1 Objetivo del proyecto
Diseñar y desarrollar una solución tecnológica multiplataforma que facilite la participación ciudadana y optimice la gestión pública municipal. Vía Clara ofrece un canal directo, ágil y transparente entre el ciudadano y el Ayuntamiento para reportar, seguir y resolver incidencias en la vía pública, mejorando el mantenimiento del espacio urbano y el bienestar de la comunidad.

### 1.2 Alcance
Despliegue escalonado:

- **Fase 1 — MVP / Piloto (actual):** app móvil funcional en modo demo (datos mock en memoria) con el flujo completo de creación, seguimiento e interacción social sobre incidencias, ambientada en el municipio de **Almuñécar**. Sirve para validar UX, flujo y aceptación con el Ayuntamiento antes de conectar backend real.
- **Fase 2 — Backend real + admin app:** sustitución de los datos mock por API real (AWS), y construcción de la **admin app** (panel de gestión web) para operarios/administradores del Ayuntamiento.
- **Fase 3 — Expansión:** arquitectura multi-tenant para incorporar nuevos municipios sin refactorizar código base; comercialización a otros ayuntamientos de la provincia/región.

### 1.3 Público objetivo

A partir de este punto, el documento usa dos nombres fijos para las dos aplicaciones del proyecto:
- **"app"** → la aplicación móvil ciudadana (React Native + Expo, hoy en `src/`).
- **"admin app"** → la aplicación web para operarios/administradores del Ayuntamiento (aún no construida).

- **Ciudadanos** (usuarios finales de la **app**): diseño pensado explícitamente para **público 40+** — tipografía grande, alto contraste, iconos siempre acompañados de texto, registro no obligatorio para el uso básico.
- **Operarios / coordinadores del Ayuntamiento** (usuarios de la **admin app**, aún no construida): reciben, validan, asignan y resuelven incidencias.
- **Personal de campo / brigadas** (usuarios indirectos): reciben la orden de trabajo delegada, sin interacción activa con el sistema.
- **Administradores / gestión pública** (Alcaldía, concejalías, usuarios de la **admin app**): estadísticas, mapas de calor, KPIs.

### 1.4 Términos importantes
- **Incidencia / Aviso:** reporte de un ciudadano sobre un desperfecto o problema en la vía pública (farola fundida, bache, mobiliario roto, etc.). En el código: `Incidencia` (`src/data/incidencias.ts`).
- **Estado / Workflow:** ciclo de vida de una incidencia. Track principal `registrada → abierta → en_curso → resuelta`, con rama terminal alternativa `declinada` (ver `src/theme/tokens.ts`).
- **Apoyo / "Me gusta":** validación social de otros vecinos sobre una incidencia ya reportada, para priorizarla.
- **Seguir:** un ciudadano puede suscribirse a las notificaciones de una incidencia sin haberla creado.
- **Revivir:** reabrir/reforzar el interés en una incidencia declinada o antigua.
- **Tenant:** cada municipio. El sistema será multi-tenant: varios ayuntamientos compartirán la misma app con datos aislados.
- **Puntuación de prioridad:** valor calculado a partir de la interacción social de una incidencia (apoyos, seguidores, comentarios) que determina su posición en el listado por defecto. Ver RF-015 y §10 regla 10.
- **Puntos de usuario:** puntos que se otorgan al ciudadano autor cuando una de sus incidencias se resuelve, calculados a partir de la interacción social que tuvo esa incidencia. Se acumulan y son visibles en Perfil. Ver RF-016 y §10 regla 11.
- **Escalafón / ranking:** nivel (Bronce / Plata / Oro) de un ciudadano dentro de un municipio, calculado por su posición relativa en `points` frente a los demás ciudadanos activos de ese municipio. A mayor escalafón, más peso reciben las nuevas incidencias que reporte en ese municipio. Ver RF-018 y §10 regla 13.

### 1.5 Tecnologías

| Capa | Tecnología prevista | Estado actual en el repo |
|---|---|---|
| App móvil | React Native + **Expo SDK 54**, `expo-router` | ✅ Implementado (prototipo) |
| Backend | AWS Lambda (Python) + API Gateway (Serverless) | ⛔ Pendiente — datos mock en memoria |
| Base de datos | Amazon **DynamoDB** | ⛔ Pendiente (ya hay indicios de modelado PK/SK tipo `CITY#almunecar` / `INCIDENT#...` en `incidencias.ts`) |
| Almacenamiento de fotos | Amazon **S3** | ⛔ Pendiente — cámara/fotos simuladas |
| Autenticación | Amazon **Cognito** + JWT — registro por **número de teléfono** (SMS OTP) en vez de email, más acorde al público 40+ | ⛔ Pendiente — el registro actual es un flag local (`usuarioRegistrado`) |
| Admin app (Ayuntamiento) | React (SPA) | ⛔ No iniciado |
| Notificaciones push | Expo Notifications / EAS | ⚠️ Requiere *development build* de EAS (no funciona en Expo Go en Android desde SDK 53) |
| Estructura del repositorio | **Monorepo** (workspaces npm/pnpm): `apps/mobile`, `apps/admin-web`, `packages/shared` | ⛔ Pendiente de reestructurar — hoy todo el código vive en `src/` en la raíz, como si fuera solo `apps/mobile` |

---

## 2. Objetivos del sistema

### 2.1 Objetivos principales
1. **Facilitar y democratizar la comunicación ciudadano-ayuntamiento**, con un canal 24/7 que permita reportar una incidencia en menos de 4 pasos (foto → ubicación → categoría → detalle), tal y como ya implementa `RegistroSheet.tsx` / `reportar.tsx`.
2. **Reducir los tiempos de gestión y resolución**, estandarizando categoría, ubicación GPS y evidencia fotográfica desde el origen del reporte.
3. **Centralizar la información**, evitando la fragmentación entre llamadas, redes sociales y registros presenciales — una única fuente de verdad por municipio.
4. **Garantizar trazabilidad y transparencia**, mostrando el historial completo de cada incidencia (`historial: HitoHistorial[]`) y su estado visual en la `WorkflowBar`.

### 2.2 Objetivos estratégicos
- **Gobierno basado en datos**: mapas de calor, KPIs de resolución, rendimiento por categoría/zona (hoy: `MapaIncidencias.tsx` ya agrupa por coordenadas dentro de Almuñécar).
- **Escalabilidad multi-tenant**: nuevos municipios incorporables sin reescribir el código base — la app ya aísla el concepto de `MUNICIPIO` como constante independiente de las incidencias.

---

## 3. Actores del sistema

### 3.1 Ciudadano
- Registrarse (opcional, escalonado — solo se pide cuenta para acciones sociales: comentar, seguir, dar apoyo).
- Crear incidencias.
- Consultar estado y seguimiento ("Mis avisos": pestañas **Mías** / **Siguiendo**).
- Apoyar ("me gusta"), comentar, seguir y "revivir" incidencias de otros.
- Recibir notificaciones de cambios de estado.
- Editar su perfil.
- Seleccionar y cambiar su municipio en cualquier momento desde Perfil (ver RF-014, §9.1, §10 regla 9).

### 3.2 Operador del Ayuntamiento *(no implementado aún — usuario de la admin app)*
- Ver incidencias entrantes por departamento/categoría.
- Validarlas, asignarlas a brigada, cambiar de estado.
- Marcar una incidencia como **"Resuelto"** — este cierre queda sujeto a la verificación posterior del ciudadano (ver §3.1-bis y RF-013).
- Responder/comentar como Ayuntamiento (ya modelado en el dato: `Comentario.esAyuntamiento`).
- Declinar una incidencia justificando el motivo (`resuelta: { fecha, nota }`, reutilizado también para declinaciones).
- Generar informes.
- Listar y eliminar incidencias (funciones propias de la admin app).

### 3.3 Administrador *(no implementado aún — usuario de la admin app)*
- Gestionar usuarios y departamentos.
- Configurar la aplicación por municipio (tenant).
- Consultar estadísticas y KPIs.
- Gestionar permisos y roles.

### 3.1-bis Ciudadano — verificación del cierre *(idea nueva, no implementada)*
Cuando el operario marca una incidencia como **"Resuelto"**, el ciudadano que la creó puede remarcarla como:
- **"Verificado"**: confirma que el problema quedó solucionado; cierre definitivo.
- **"No resuelto"**: rechaza el cierre; la incidencia debería reabrirse (volver a `en_curso` o `abierta`).

Esto añade una capa de control ciudadano sobre el cierre: el estado `resuelta` no depende únicamente de la palabra del operario. Ver RF-013, CU-004, §9.2 y §10 regla 8.

---

## 4. Requisitos funcionales

| ID | Nombre | Descripción | Actor | Prioridad | Estado |
|---|---|---|---|---|---|
| RF-001 | Crear incidencia | Registrar un nuevo aviso desde el móvil (foto, ubicación, categoría, descripción) | Ciudadano | Alta | ✅ Prototipo |
| RF-002 | Consultar listado y mapa | Ver incidencias del municipio en lista y en mapa, con filtro por categoría | Ciudadano, Operador, Administrador | Alta | ✅ Prototipo (app) / ⛔ Pendiente (admin app) |
| RF-003 | Ver detalle e historial | Ver el workflow visual completo de una incidencia | Ciudadano, Operador, Administrador | Alta | ✅ Prototipo (app) / ⛔ Pendiente (admin app) |
| RF-004 | Apoyar / seguir / comentar | Interacción social sobre incidencias ajenas | Ciudadano | Media | ✅ Prototipo |
| RF-005 | Revivir incidencia | Reforzar el interés en un aviso antiguo o declinado | Ciudadano | Baja | ✅ Prototipo |
| RF-006 | Registro escalonado | Pedir cuenta solo al realizar la primera acción social | Ciudadano | Media | ✅ Prototipo |
| RF-007 | Notificaciones de estado | Avisar al ciudadano cuando cambia el estado de un aviso que sigue | Ciudadano | Alta | ⛔ Pendiente (requiere EAS build) |
| RF-008 | Autenticación real | Login/registro con backend (Cognito), por número de teléfono con verificación SMS OTP, sin exigir email | Ciudadano | Alta | ⛔ Pendiente |
| RF-009 | Persistencia real | Sustituir el store en memoria por API + DynamoDB | Sistema | Alta | ⛔ Pendiente |
| RF-010 | Panel de gestión (admin app) | Ver, listar, triar, asignar, resolver y eliminar incidencias | Operador / Administrador | Alta | ⛔ Pendiente |
| RF-011 | Estadísticas y mapas de calor | Cuadro de mando para gestión pública | Administrador | Media | ⛔ Pendiente |
| RF-012 | Multi-tenant | Aislar datos por municipio, permitir alta de nuevos tenants | Sistema | Media | ⚠️ Parcialmente preparado (`MUNICIPIO` ya es una entidad separada) |
| RF-013 | Verificación ciudadana del cierre | El autor de la incidencia puede remarcar un "Resuelto" del operario como "Verificado" o "No resuelto" (reabre) | Ciudadano | Alta | ⛔ Pendiente (idea nueva) |
| RF-014 | Seleccionar / cambiar municipio | El ciudadano tiene siempre un municipio asociado y puede cambiarlo en cualquier momento desde Perfil; el listado, mapa y filtros muestran las incidencias del municipio seleccionado | Ciudadano | Alta | ⛔ Pendiente (idea nueva) |
| RF-015 | Priorización por interacción social | El listado de incidencias por municipio (`GET /municipalities/{id}/incidents`, app y admin app) se ordena **siempre por defecto** por una puntuación calculada a partir de apoyos, seguidores y comentarios — a más interacción, más arriba | Ciudadano, Operador, Administrador | **Alta** | ⛔ Pendiente (idea nueva) |
| RF-016 | Puntos de usuario al resolver | Al resolverse una incidencia, su autor recibe puntos iguales al `priorityScore` de esa incidencia en ese momento, sumados a `User.points`; visibles y acumulados en Perfil | Ciudadano | Media | ⛔ Pendiente (idea nueva) |
| RF-017 | Filtrar "Mis avisos" | Pantalla con todas las incidencias abiertas por el ciudadano, filtrable por estado y ubicación, ordenada siempre por fecha descendente (más reciente primero) | Ciudadano | Alta | ⚠️ Parcialmente prototipado — falta filtros (`mias.tsx` ya lista "Mías"/"Siguiendo") |
| RF-018 | Escalafón de usuario por municipio | Ranking Bronce/Plata/Oro por municipio según `points` relativo; el escalafón del autor multiplica el `priorityScore` de sus nuevas incidencias en ese municipio | Ciudadano, Operador, Administrador | Media | ⛔ Pendiente (idea nueva) |

**RF-001 en detalle:**

| Campo | Valor |
|---|---|
| Descripción | Permite al ciudadano registrar una nueva incidencia desde la app móvil |
| Actor(es) | Ciudadano |
| Prioridad | Alta |
| Caso de uso | CU-001 |

---

## 5. Requisitos no funcionales

### 5.1 Seguridad
- Contraseñas cifradas; tokens JWT (Cognito) en cuanto exista backend.
- Registro/login por **número de teléfono** (alias único en el User Pool de Cognito) con verificación por SMS OTP, sin requerir email.
- Comunicación exclusivamente por HTTPS.
- Control de acceso por roles (ciudadano / operario / administrador).
- Aislamiento de datos por municipio (tenant).

### 5.2 Rendimiento
- Tiempo de respuesta inferior a 2 segundos en operaciones de lectura.
- Registro de incidencia (pasos 7–9 del CU-001) en menos de 3 segundos con conexión disponible.
- Soportar 500 usuarios simultáneos por municipio en el piloto.

### 5.3 Disponibilidad
- 99% de uptime objetivo una vez en producción (arquitectura serverless AWS).

### 5.4 Compatibilidad
- Android e iOS (React Native + Expo) para ciudadanos.
- Windows/Web para la admin app del Ayuntamiento.

### 5.5 Escalabilidad
- Arquitectura preparada para añadir nuevos módulos (admin app, notificaciones, estadísticas) y nuevos municipios sin refactorizar el núcleo.

### 5.6 Accesibilidad *(propia de Vía Clara, no genérica)*
- Diseño explícito para público 40+: tipografía grande (`Font.body = 17`, `Font.bodyLg = 19`), alto contraste, iconos siempre acompañados de etiqueta de texto (ver `src/theme/tokens.ts`).

---

## 6. Casos de uso

### 6.1 CU-001 Crear incidencia

| | |
|---|---|
| **Actores** | Ciudadano, sistema |
| **Precondiciones** | Ninguna cuenta requerida para reportar (registro escalonado) |
| **Postcondiciones** | La incidencia queda registrada con estado `registrada` |

**Secuencia normal**
1. El ciudadano pulsa **Reportar**. El sistema muestra el flujo guiado de 4 pasos.
2. El ciudadano adjunta o simula una foto. El sistema valida formato/tamaño.
3. El ciudadano confirma o introduce manualmente la ubicación (GPS o dirección).
4. El ciudadano selecciona una categoría (`alumbrado`, `calzada`, `limpieza`, `mobiliario`, `zonas_verdes`, `otros`).
5. El ciudadano escribe título y descripción y pulsa **Enviar**.
6. El sistema valida los datos, crea la incidencia con estado `registrada`, fecha actual y la muestra al principio del listado.
7. El sistema confirma el registro al ciudadano.

**Flujos alternativos**
- Si no se conceden permisos de ubicación → introducir dirección manualmente.
- Si faltan campos obligatorios → resaltarlos e impedir el envío.
- Si no hay conexión → informar y no registrar (pendiente de implementar cola offline).

**Comentarios**
- Cada incidencia recibe un ID único (`inc-XXX`, hoy autoincremental en memoria — en producción, PK/SK de DynamoDB del tipo `CITY#<municipio>` / `INCIDENT#<timestamp>`).
- Estado inicial siempre `registrada`.
- El ciudadano puede consultar el estado en cualquier momento desde "Mis avisos".

### 6.2 CU-002 Apoyar / seguir una incidencia *(implementado)*
El ciudadano marca "me gusta" o "seguir" sobre un aviso ajeno; requiere registro (se dispara el alta escalonada si aún no está registrado).

### 6.3 CU-003 Cambiar estado de una incidencia *(pendiente — admin app)*
El operador mueve una incidencia por el track `registrada → abierta → en_curso → resuelta`, o la declina justificando el motivo (ej. "no es competencia municipal", ya contemplado en el dato de ejemplo `inc-005`).

### 6.4 CU-004 Verificar cierre de una incidencia *(idea nueva, pendiente)*

| | |
|---|---|
| **Actores** | Ciudadano (autor), sistema |
| **Precondiciones** | La incidencia está en estado `resuelta` (marcada por el operario) y el usuario actual es su autor |
| **Postcondiciones** | La incidencia queda `verificada` (cierre definitivo) o vuelve a `en_curso`/`abierta` |

**Secuencia normal**
1. El ciudadano abre el detalle de una incidencia propia marcada como `resuelta`. El sistema muestra las opciones **"Verificado"** / **"No resuelto"**.
2. El ciudadano elige una opción. El sistema registra la decisión y añade una entrada al `historial`.
3a. Si elige **"Verificado"** → el sistema fija el cierre definitivo.
3b. Si elige **"No resuelto"** → el sistema reabre la incidencia (vuelve a `en_curso` o `abierta`) y notifica al operario.

**Comentarios**
- Solo el autor original de la incidencia puede verificarla (no otros ciudadanos que la apoyan o siguen).
- Si el ciudadano no responde en un plazo (a definir, ej. 15 días), se podría dar por verificada automáticamente — a decidir.

### 6.5 CU-005 Seleccionar / cambiar municipio *(idea nueva, pendiente)*

| | |
|---|---|
| **Actores** | Ciudadano, sistema |
| **Precondiciones** | Ninguna — todo usuario tiene siempre un municipio asociado (por defecto, el detectado por geolocalización o el del registro) |
| **Postcondiciones** | El municipio activo del usuario queda actualizado; el listado, mapa y filtros pasan a mostrar las incidencias del nuevo municipio |

**Secuencia normal**
1. El ciudadano entra en Perfil y selecciona la opción de cambiar de municipio.
2. El sistema muestra la lista de municipios disponibles (tenants dados de alta).
3. El ciudadano elige uno. El sistema actualiza el municipio activo del usuario.
4. El sistema recarga Inicio, mapa y "Mis avisos" filtrados por el nuevo municipio.

**Comentarios**
- Reportar una incidencia nueva siempre queda asociada al municipio activo en ese momento.
- El cambio de municipio no requiere reinicio de sesión ni pierde los avisos "Mías"/"Siguiendo" de otros municipios — solo cambia lo que se muestra por defecto.

### 6.6 CU-006 Otorgar puntos al resolver una incidencia *(idea nueva, pendiente)*

| | |
|---|---|
| **Actores** | Sistema (disparado por el cambio de estado del operario) |
| **Precondiciones** | Una incidencia pasa a estado `resuelta` |
| **Postcondiciones** | El autor de la incidencia suma puntos a su total acumulado, visible en Perfil |

**Secuencia normal**
1. El operario marca la incidencia como `resuelta` (CU-003).
2. El sistema lee el `priorityScore` de la incidencia en ese momento (likes, watchers, comentarios).
3. El sistema suma ese mismo valor, tal cual, al campo `points` del autor (`User.points`).
4. El sistema notifica al autor que ha ganado puntos (junto con la notificación de "incidencia resuelta").

**Flujos alternativos**
- Si el autor marca luego la incidencia como "No resuelto" (CU-004/RF-013), el sistema revierte los puntos otorgados por ese cierre hasta que vuelva a verificarse.

### 6.7 CU-007 Ver y filtrar "Mis avisos" *(idea nueva, parcialmente prototipada)*

| | |
|---|---|
| **Actores** | Ciudadano |
| **Precondiciones** | Usuario autenticado con incidencias propias registradas |
| **Postcondiciones** | Ninguna (pantalla de solo consulta) |

**Secuencia normal**
1. El ciudadano entra en la pestaña "Mis avisos".
2. El sistema muestra todas las incidencias abiertas por el ciudadano, ordenadas por **fecha descendente** (la más reciente primero).
3. El ciudadano aplica filtros (estado, ubicación/dirección, categoría opcional).
4. El sistema recalcula el listado con los filtros aplicados, manteniendo siempre el orden por fecha descendente.

**Comentarios**
- Este orden por fecha es fijo y no se ve afectado por la puntuación de prioridad (RF-015), que solo aplica al listado general de Inicio y a la bandeja de la admin app — en "Mis avisos" el ciudadano quiere ver primero lo último que reportó, no lo más popular.
- Los filtros de estado usan los valores de `EstadoId` (`registrada`, `abierta`, `en_curso`, `resuelta`, `declinada`).
- El filtro de ubicación puede ser por texto (dirección) o por proximidad si se dispone de GPS.
- **"Mis avisos" muestra las incidencias del ciudadano de todos los municipios, independientemente del municipio activo** (ver `GET /users/{userId}/incidents` en §14) — a diferencia de Inicio, que solo muestra el municipio activo.

### 6.8 CU-008 Calcular escalafón y aplicar su peso a nuevas incidencias *(idea nueva, pendiente)*

| | |
|---|---|
| **Actores** | Sistema |
| **Precondiciones** | El municipio tiene al menos un ciudadano con `points` > 0 |
| **Postcondiciones** | Cada ciudadano activo del municipio tiene un escalafón (Bronce/Plata/Oro) asignado; las incidencias que reporte llevan el multiplicador de ese escalafón aplicado a su `priorityScore` |

**Secuencia normal**
1. (Periódicamente, o al resolverse una incidencia y sumar puntos) el sistema recalcula el escalafón de cada ciudadano **dentro de cada municipio** en el que tiene incidencias, comparando su `points` con el de los demás ciudadanos activos de ese municipio (ranking relativo, no umbral fijo global).
2. Al crear o recalcular una incidencia, el sistema aplica el multiplicador del escalafón del autor **en ese municipio** sobre el `priorityScore` (§9.2, §10 regla 10).

**Comentarios**
- El escalafón es **relativo al municipio**, no al total global de `points` del usuario: un ciudadano puede ser Oro en un municipio pequeño y Plata en uno más grande, según cómo se compare con el resto de vecinos activos de cada uno.
- Propuesta de reparto (a validar con datos reales del piloto): Oro = top 10% de ciudadanos del municipio por puntos, Plata = siguiente 30%, Bronce = resto.
- Propuesta de multiplicador sobre `priorityScore` (a calibrar): Bronce ×1, Plata ×1.25, Oro ×1.5.
- El escalafón se muestra en Perfil junto a los puntos (§11.4).

---

## 7. Flujo de navegación

**app (implementada, `expo-router`):**

```
(tabs)
 ├── Inicio (index)        → lista + mapa de incidencias, filtro por categoría
 ├── Mis avisos (mias)     → pestañas: Mías / Siguiendo — filtros por estado y ubicación,
 │                           orden fijo por fecha descendente (más reciente primero)
 ├── Reportar (reportar)   → flujo guiado 4 pasos → crea incidencia
 └── Perfil (perfil)       → registro escalonado, datos de usuario

incidencia/[id]            → detalle: WorkflowBar, comentarios, apoyos, seguir, revivir,
                              verificar cierre (Verificado / No resuelto) si está resuelta y es mía
```

**admin app (pendiente de construir):**

```
Login
 └── Dashboard
      ├── Gestión de incidencias (bandeja, filtros, asignación, resolver, eliminar)
      ├── Gestión de usuarios/departamentos
      ├── Estadísticas / mapas de calor
      └── Configuración del tenant (municipio)
```

---

## 8. Módulos del sistema

> Estructura de repositorio prevista (monorepo): `apps/mobile` (la **app**, hoy en `src/`), `apps/admin-web` (la **admin app**, nueva), `packages/shared` (tipos de incidencia, tokens de estado/categoría, cliente de API — compartidos entre ambas).

### 8.1 app (móvil, ciudadana) — estado actual
| Módulo | Archivo | Estado |
|---|---|---|
| Inicio (lista + mapa) | `src/app/(tabs)/index.tsx`, `MapaIncidencias.tsx` | ✅ |
| Reportar | `src/app/(tabs)/reportar.tsx`, `RegistroSheet.tsx` | ✅ |
| Detalle de incidencia | `src/app/incidencia/[id].tsx`, `WorkflowBar.tsx`, `StatusBadge.tsx` | ✅ |
| Mis avisos | `src/app/(tabs)/mias.tsx` | ⚠️ Prototipado, faltan filtros de estado/ubicación (RF-017/CU-007) |
| Perfil / registro | `src/app/(tabs)/perfil.tsx` | ✅ |
| Verificar cierre (Verificado / No resuelto) | — | ⛔ pendiente (idea nueva, RF-013/CU-004) |
| Notificaciones | — | ⛔ pendiente (bloqueado por EAS build) |
| Ajustes | — | ⛔ pendiente |

### 8.2 admin app (web, Ayuntamiento) — pendiente
- Dashboard
- Gestión de incidencias (ver, listar, resolver, eliminar) — bandeja ordenada por defecto por **puntuación de prioridad** (RF-015), igual que en Inicio de la app
- Gestión de usuarios
- Estadísticas
- Configuración
- Informes

---

## 9. Modelo de datos

> Nota de nomenclatura: a partir de esta versión, el modelo de datos se describe con **nombres de campo en inglés** (`CLAUDE.md`: todo el código, endpoints incluidos, siempre en inglés). El código actual del prototipo (`src/data/incidencias.ts`, `src/theme/tokens.ts`) todavía usa nombres y valores en español (`titulo`, `estado: 'registrada'`, `categoria: 'alumbrado'`, etc.) — queda pendiente una pasada de renombrado cuando se aborde el backend real (RF-009), que no se ha hecho todavía en el código fuente.

### 9.1 User *(a construir — hoy solo existe `usuarioRegistrado: boolean` en el store)*
- id
- name
- phone *(identificador de inicio de sesión — alias único en Cognito, verificado por SMS OTP; sin email, ver decisión más abajo)*
- points *(RF-016)*: contador acumulado de puntos ganados por incidencias propias resueltas, visible en Perfil
- municipality (tenant) *(campo obligatorio y siempre presente — nunca `null`; el usuario lo cambia libremente desde Perfil, ver RF-014/CU-005)*
- role (`citizen` / `operator` / `administrator`) *(campo técnico implícito, necesario para el control de acceso de §13 — no forma parte de los 4 campos "de negocio" del modelo, pero es imprescindible para distinguir ciudadano/operario/administrador)*

> Decisión: se usa el **número de teléfono** como identificador principal de registro/login en vez de email, por ser más acorde al público 40+ de la app. Cognito lo soporta de forma nativa configurando `phone_number` como atributo de login del User Pool, con verificación SMS OTP. Coste/trade-off: el envío de SMS pasa por Amazon SNS (coste por mensaje) y requiere solicitar a AWS acceso de producción para envío fuera del sandbox inicial — asumible para el volumen del piloto (1-2 municipios).

### 9.2 Incident *(ya modelado, en español, en `src/data/incidencias.ts`)*
- id
- date *(fecha de creación)*
- location: `{ address, lat, lng }` *(ubicación)*
- images: `string[]` *(array de imágenes — URLs a S3; hoy simuladas en el prototipo)*
- category *(tipo de incidencia — `IncidentCategory`: `lighting` / `road` / `cleaning` / `furniture` / `green_areas` / `other`; hoy en código: `alumbrado` / `calzada` / `limpieza` / `mobiliario` / `zonas_verdes` / `otros`)*
- createdBy *(usuario creador — referencia a `User`)*
- status *(estado del workflow — `IncidentStatus`: `submitted` / `open` / `in_progress` / `resolved` / `declined`; hoy en código: `registrada` / `abierta` / `en_curso` / `resuelta` / `declinada`)*
- comments: `Comment[]` (author, text, date, isMunicipality, likes — "me gusta" del comentario, campo nuevo, ver `PUT /comments/{id}/like` en §14)
- likes *(contador de "me gusta"/apoyos de la incidencia)*
- watchers: `User[]` *(usuarios que la siguen — lista de referencias, no solo un contador, para poder notificarles individualmente; el nº de seguidores usado en la puntuación de prioridad es `watchers.length`)*
- history: `HistoryEntry[]` (status, date, note) *(técnico, capa adicional sobre el modelo base para la trazabilidad de §2 objetivo 4)*
- resolution?: `{ date, note }` *(motivo/nota al resolver o declinar — técnico, capa adicional)*
- verification?: `{ result: 'verified' | 'not_resolved', date }` *(RF-013 — técnico, capa adicional)*
- priorityScore *(calculado — RF-015/§10 regla 10)*: `(likes·1 + watchers.length·1.5 + comments.length·2) × tierMultiplier(createdBy, municipality)`, donde `tierMultiplier` depende del escalafón (Bronce/Plata/Oro) del autor en ese municipio — ver RF-018/CU-008/§10 regla 13. Nota técnica: con DynamoDB conviene **denormalizar y recalcular este valor en cada escritura** (like, follow, comentario, cambio de escalafón) en vez de calcularlo en cada lectura, y usarlo como sort key de un GSI para paginar ordenado por prioridad de forma eficiente.

### 9.3 Municipality *(ya modelado)*
- id, name, province, center (lat/lng)

> Nota técnica: en `incidencias.ts` hay un registro de ejemplo con campos `PK: "CITY#almunecar"` / `SK: "INCIDENT#..."` — es un primer boceto de la clave de partición/ordenación de DynamoDB para cuando se conecte el backend real. Conviene limpiarlo del dato mock cuando se aborde RF-009, ya que hoy no forma parte del tipo `Incidencia` y genera un objeto con forma inconsistente.

---

## 10. Reglas de negocio

1. Un ciudadano solo puede editar el título/descripción de una incidencia mientras esté en estado `registrada`.
2. Una incidencia no puede pasar a `resuelta` sin haber pasado por `en_curso`.
3. Una incidencia puede terminar en `declinada` desde `registrada` o `abierta`, siempre con nota explicativa.
4. Un operario solo puede gestionar incidencias de su categoría/departamento asignado.
5. *(Actualizada)* Solo un administrador puede eliminar usuarios. Un ciudadano puede eliminar sus propias incidencias y sus propios comentarios; un operario o administrador puede eliminar cualquier incidencia (de su categoría/departamento, en el caso del operario). Nadie salvo su autor o un administrador puede eliminar un comentario.
6. El registro de cuenta no es obligatorio para reportar ni para consultar; sí lo es para interactuar socialmente (me gusta, seguir, comentar, revivir).
7. Los datos de cada municipio (tenant) están aislados: un ciudadano de Almuñécar no ve incidencias de otro municipio.
8. *(Nueva)* Cuando el operario marca una incidencia como `resuelta`, solo el ciudadano autor puede verificarla como **"Verificado"** (cierre definitivo) o **"No resuelto"** (la incidencia se reabre a `en_curso`/`abierta`). Otros ciudadanos que solo apoyan o siguen la incidencia no pueden verificar el cierre.
9. *(Nueva)* Todo ciudadano tiene siempre un municipio activo asociado (nunca queda sin municipio); puede cambiarlo libremente desde Perfil en cualquier momento. El listado, el mapa y los filtros de Inicio muestran por defecto las incidencias del municipio activo. Reportar una incidencia nueva la asocia siempre al municipio activo en el momento de crearla.
10. *(Nueva)* La prioridad interna de una incidencia sube cuanta más interacción social recibe (apoyos/"me gusta", seguidores, comentarios), y también según el **escalafón de su autor en ese municipio** (regla 13). Esa puntuación es el criterio de **orden por defecto** del listado, tanto en Inicio (app, para el ciudadano) como en la bandeja de incidencias de la admin app (para operario/administrador) — las incidencias con más interacción y de autores de mayor escalafón aparecen arriba. Propuesta de fórmula (pesos a calibrar con datos reales del piloto):
    ```
    priorityScore = (likes·1 + watchers.length·1.5 + comments.length·2) × multiplicadorEscalafón(autor, municipio)
    ```
    Los comentarios pesan más porque implican más esfuerzo/compromiso que un simple "me gusta". El usuario siempre puede cambiar el orden manualmente a "más reciente" si lo prefiere; la puntuación no altera el orden del `historial` ni el workflow de estados, solo el orden de listado.
11. *(Nueva)* Cuando una incidencia pasa a `resuelta`, su autor recibe **puntos de usuario**: exactamente el valor de `priorityScore` de esa incidencia en el momento de resolverse (**no** una fórmula aparte — son el mismo número calculado en la regla 10: `likes·1 + watchers.length·1.5 + comments.length·2`), y ese valor se suma al campo `points` del usuario (`User.points`, ver §9.1). Solo el autor original recibe puntos, no quienes dieron like/siguieron/comentaron. Si más adelante existe verificación ciudadana del cierre (RF-013) y el autor marca **"No resuelto"**, los puntos sumados por ese cierre deben revertirse (restarse de `User.points`) hasta que se verifique de nuevo, para no premiar cierres en falso.
12. *(Nueva)* "Mis avisos" (incidencias propias del ciudadano) se ordena **siempre por fecha descendente** (la más reciente primero), con independencia de la puntuación de prioridad de la regla 10 — esa puntuación solo afecta al listado general de Inicio y a la bandeja de la admin app, nunca a "Mis avisos". Los filtros disponibles (estado, ubicación) se aplican sobre ese orden fijo, sin alterarlo.
13. *(Nueva)* Cada ciudadano tiene un **escalafón** (Bronce / Plata / Oro) por municipio, calculado según su posición relativa en `points` frente a los demás ciudadanos activos de ese municipio (no un umbral fijo global — ver CU-008). Cuantos más puntos tiene un ciudadano, mayor escalafón alcanza en ese municipio, y mayor es el multiplicador que aplica al `priorityScore` de cada nueva incidencia que reporte ahí (regla 10). Esto significa que un ciudadano con más histórico de incidencias resueltas ve sus nuevos avisos posicionados más arriba desde el principio, incluso antes de recibir apoyos o comentarios.

## 11. Diseño de pantallas (resumen del prototipo actual)

### 11.1 Pantalla Reportar (`reportar.tsx` + `RegistroSheet.tsx`)
- **Campos:** foto (simulada), ubicación (GPS o manual), categoría, título, descripción.
- **Botones:** Siguiente / Atrás por paso, Enviar en el paso final.
- **Validaciones:** categoría y descripción obligatorias antes de enviar (a reforzar: mínimo de caracteres en descripción, según plantilla original de 20 caracteres).

### 11.2 Pantalla Detalle de incidencia (`incidencia/[id].tsx`)
- `WorkflowBar`: barra visual del track principal + rama declinada.
- `StatusBadge`: chip de color según estado.
- Acciones sociales: me gusta, seguir, compartir, revivir, comentar.

### 11.3 Pantalla Inicio (`index.tsx` + `MapaIncidencias.tsx`)
- Lista + mapa combinados, filtro por categoría con los iconos de `CATEGORIAS`.
- Muestra siempre las incidencias del municipio activo del usuario (ver §11.4 y RF-014).
- Orden por defecto: **puntuación de prioridad** (apoyos + seguidores + comentarios, ver §10 regla 10 / RF-015), con opción de cambiar a "más reciente".

### 11.4 Pantalla Perfil (`perfil.tsx`) *(selector de municipio, puntos y escalafón pendientes — RF-014/CU-005, RF-016/CU-006, RF-018/CU-008)*
- **Campos actuales:** registro escalonado, datos de usuario.
- **Nuevo:** selector de municipio activo — muestra el municipio actual y permite cambiarlo entre los tenants disponibles; el cambio se refleja de inmediato en Inicio, mapa y "Mis avisos".
- **Nuevo:** total de **puntos de usuario** acumulados por incidencias propias resueltas (RF-016), visible de forma destacada — coherente con la gamificación cívica ligera planteada en §16.
- **Nuevo:** insignia de **escalafón** (Bronce / Plata / Oro) del municipio activo, junto a los puntos (RF-018).

### 11.5 Pantalla Mis avisos (`mias.tsx`) *(filtros pendientes — RF-017/CU-007)*
- **Actual:** pestañas Mías / Siguiendo.
- **Nuevo — filtros:** por estado (`registrada`, `abierta`, `en_curso`, `resuelta`, `declinada`) y por ubicación/dirección.
- **Orden:** fijo por fecha descendente (más reciente primero); no se ve afectado por la puntuación de prioridad (RF-015), a diferencia de Inicio.

---

## 12. Notificaciones *(diseño previsto, pendiente de EAS build)*

**Al ciudadano:**
- Incidencia validada / abierta.
- Incidencia en curso.
- Incidencia resuelta → *(nueva)* incluye la petición de verificar el cierre y el aviso de puntos ganados (RF-016).
- Incidencia declinada (con motivo).
- Actividad en una incidencia que sigue (nuevo comentario del Ayuntamiento).

**Al operario (admin app, futuro):**
- Nueva incidencia en su categoría.
- Incidencia reasignada.
- *(Nueva)* El ciudadano marcó una incidencia cerrada como "No resuelto" → se reabre y requiere atención de nuevo.

---

## 13. Permisos

| Función | Ciudadano | Operario | Administrador |
|---|---|---|---|
| Crear incidencia | Sí | No | No |
| Editar incidencia | Limitado (solo propia, en `registrada`) | Sí | Sí |
| Cambiar estado | No | Sí | Sí |
| Marcar como Resuelto | No | Sí | Sí |
| Verificar cierre (Verificado / No resuelto) | Limitado (solo autor de la incidencia) | No | No |
| Eliminar incidencia | Limitado (solo propia) | Sí | Sí |
| Comentar como Ayuntamiento | No | Sí | Sí |
| Eliminar comentario | Limitado (solo propio) | No | Sí |
| Ver estadísticas | No | Sí | Sí |
| Gestionar usuarios (crear/editar/eliminar) | No | No | Sí |

---

## 14. API *(a construir — hoy no existe, todo es mock en memoria vía `StoreProvider`)*

Endpoints iniciales (API Gateway + Lambda). Los paths, query params y nombres de recursos van en **inglés**, siguiendo la convención de código fijada en `CLAUDE.md`; las descripciones quedan en español como el resto del documento.

### GET

```
GET /users/{userId}/incidents
    → Incidencias del usuario, de TODOS los municipios (independientemente del municipio activo).
      Alimenta "Mis avisos" (RF-017/CU-007). Orden fijo: fecha descendente (más reciente primero).
      Query params: ?relation=own|following  &status=  &location=

GET /municipalities/{municipalityId}/incidents
    → Incidencias de un municipio. Alimenta Inicio (app) y la bandeja de la admin app.
      ⚠️ MUY IMPORTANTE: orden por defecto = puntuación de prioridad (RF-015 / §10 regla 10),
      no por fecha.
      Query params: ?status=  &category=  &dateFrom=  &dateTo=  &minLikes=  &sort=priority|date
      (sort=priority es el valor por defecto)

GET /incidents/{id}
    → Detalle completo de una incidencia (historial, comentarios, apoyos, etc.)

GET /municipalities
    → Lista de municipios (tenants) disponibles, para el selector de Perfil (RF-014/CU-005)

GET /municipalities/{municipalityId}/ranking
    → Escalafón (Bronce/Plata/Oro) de los ciudadanos activos de ese municipio, por puntos (RF-018/CU-008)
```

### POST

```
POST /auth/register
POST /auth/login

POST /incidents
    → Crear una nueva incidencia (RF-001/CU-001)

POST /users
    → Crear un nuevo usuario (uso admin app: alta de operarios/administradores, RF-010/§3.3).
      Distinto del alta de ciudadano, que se hace vía /auth/register.

POST /incidents/{id}/comments
    → Añadir un comentario a una incidencia
```

### PUT

```
PUT /incidents/{id}
    → Editar una incidencia (solo autor, solo en estado `registrada` — §10 regla 1)

PUT /incidents/{id}/like
    → Alternar "me gusta" (apoyo) de una incidencia

PUT /incidents/{id}/follow
    → Alternar "seguir" una incidencia

PUT /comments/{id}/like
    → Alternar "me gusta" de un comentario (campo nuevo, ver §9.2)

PUT /incidents/{id}/status
    → Cambiar el estado de una incidencia (operario/administrador — CU-003).
      Body: { status, note? }

PUT /incidents/{id}/verification
    → Verificar el cierre de una incidencia (solo el autor — RF-013/CU-004).
      Body: { result: 'verified' | 'not_resolved' }

PUT /users/{id}/municipality
    → Cambiar el municipio activo del usuario (RF-014/CU-005)
```

### DELETE

```
DELETE /incidents/{id}
    → Eliminar una incidencia: el ciudadano solo la propia; operario/administrador, cualquiera
      de su ámbito (§10 regla 5, §13 permisos)

DELETE /comments/{id}
    → Eliminar un comentario: el ciudadano solo el propio; administrador, cualquiera
```

---

## 15. Criterios de aceptación

**Crear incidencia (RF-001 / CU-001)** se considera correcto cuando:
- Guarda la incidencia con id único.
- Guarda la categoría, ubicación y descripción.
- Asigna estado inicial `registrada` y registra fecha/hora.
- Aparece de inmediato en "Mis avisos" (pestaña Mías).
- El ciudadano recibe confirmación visual.

**Cambio de estado (futuro, admin app)** se considera correcto cuando:
- Respeta el orden del track principal (no se puede saltar de `registrada` a `resuelta`).
- Añade una entrada al `historial` con fecha y nota opcional.
- Dispara notificación al ciudadano si está siguiendo el aviso.

**Verificar cierre (RF-013 / CU-004)** se considera correcto cuando:
- Solo el autor original de la incidencia puede verificarla.
- "Verificado" deja la incidencia cerrada de forma definitiva.
- "No resuelto" reabre la incidencia (`en_curso` o `abierta`) y notifica al operario.
- Queda registrada la decisión en `historial` con fecha.

**Seleccionar / cambiar municipio (RF-014 / CU-005)** se considera correcto cuando:
- El usuario siempre tiene un municipio activo (nunca `null`), por defecto desde el registro o geolocalización.
- El cambio de municipio desde Perfil se refleja de inmediato en Inicio, mapa y "Mis avisos".
- Una nueva incidencia reportada queda asociada al municipio activo en el momento de crearla.

**Priorización por interacción social (RF-015)** se considera correcto cuando:
- El listado por defecto (app y admin app) ordena las incidencias de mayor a menor puntuación.
- La puntuación se recalcula al recibir un nuevo apoyo, seguidor o comentario.
- El usuario puede cambiar el orden a "más reciente" sin perder el filtro por categoría/municipio activo.

**Puntos de usuario al resolver (RF-016 / CU-006)** se considera correcto cuando:
- Solo el autor original de la incidencia recibe los puntos, no otros ciudadanos que apoyaron/siguieron/comentaron.
- Los puntos se calculan según la interacción de esa incidencia en el momento de resolverse.
- El total acumulado es visible en Perfil.
- Si el autor marca luego la incidencia como "No resuelto" (RF-013), los puntos de ese cierre se revierten.

**Ver y filtrar Mis avisos (RF-017 / CU-007)** se considera correcto cuando:
- Muestra únicamente las incidencias propias del ciudadano autenticado.
- El orden es siempre por fecha descendente (más reciente primero), incluso con filtros aplicados.
- Los filtros de estado y ubicación se pueden combinar entre sí.
- Quitar los filtros vuelve a mostrar el listado completo de incidencias propias.

**Escalafón de usuario por municipio (RF-018 / CU-008)** se considera correcto cuando:
- El escalafón (Bronce/Plata/Oro) de un ciudadano se calcula por municipio, relativo a los demás ciudadanos activos de ese municipio — no por un umbral fijo global.
- El multiplicador del escalafón del autor se aplica al `priorityScore` de cada incidencia nueva que reporte en ese municipio.
- El escalafón es visible en Perfil.
- Subir de escalafón en un municipio no afecta al escalafón del mismo usuario en otro municipio.

---

## 16. Proyección y nuevas ideas

Ideas a evaluar para siguientes iteraciones, más allá de la especificación base:

- ~~**Verificación ciudadana del cierre**~~ → incorporada como requisito formal (RF-013, CU-004, §3.1-bis).
- ~~**Gamificación cívica ligera (puntos por resolución)**~~ → incorporada como requisito formal (RF-016, CU-006, §10 regla 11). Pendiente de decidir si además se muestra un ranking público o se queda solo en el total personal visible en Perfil, para no romper con el enfoque no invasivo pensado para el público 40+.
- **Fotos con geoetiquetado automático** al capturar, para reducir fricción en el paso de ubicación.
- **Agrupación automática de duplicados**: si dos incidencias caen en el mismo radio y categoría en poco tiempo, ofrecer "apoyar la existente" en vez de crear una nueva.
- **Modo "brigada" ligero** (sin admin app completa): vista móvil simplificada de solo lectura + botón "marcar resuelta" con foto, para personal de campo sin necesitar el panel web.
- **Exportación de partes de trabajo** en PDF/CSV para brigadas externas que no usan la app.
- **Panel de transparencia pública** (fase 3): mapa de calor accesible sin login, con estadísticas agregadas por municipio, como escaparate para atraer nuevos ayuntamientos.
- **Multi-idioma**: relevante si se expande fuera de Andalucía; hoy todo el copy está en español fijo.

---

## Anexo — Correspondencia entre este documento y el código actual

| Sección del documento | Archivo(s) relacionado(s) |
|---|---|
| Modelo de datos §9 | `src/data/incidencias.ts`, `src/data/store.tsx` |
| Estados y categorías | `src/theme/tokens.ts` |
| Flujo de navegación §7 | `src/app/(tabs)/`, `src/app/incidencia/[id].tsx` |
| Componentes de UI | `src/components/*.tsx` |
| Stack y notas técnicas §1.5 | `README.md` |
| Estructura monorepo prevista §1.5/§8 | hoy todo bajo `src/` — pendiente de mover a `apps/mobile`; `apps/admin-web` y `packages/shared` aún no existen |
