# ViaClara API (Lambdas Python)

Código fuente de las Lambdas del backend real de ViaClara. Desplegado por
Terraform (ver `../../infra/`). Runtime: Python 3.12 (según
`DOCUMENTO_VIACLARA.md` §1.5).

## Desarrollo local

```sh
cd apps/api
python -m venv .venv
./.venv/Scripts/python.exe -m pip install -r requirements-dev.txt   # Windows
# source .venv/bin/activate && pip install -r requirements-dev.txt  # macOS/Linux

pytest             # corre los tests con moto (mock de AWS, sin cuenta real)
ruff check src tests
```

Todos los tests corren en local sin ninguna cuenta ni credencial AWS real —
`moto` intercepta las llamadas a DynamoDB. La excepción son los handlers que
llaman a operaciones admin-* de Cognito (`auth/start.py`, `auth/verify.py`,
`users/create.py`): ahí se mockea el cliente boto3 directamente, porque el
soporte de `moto` para el flujo passwordless `USER_AUTH`/`SMS_OTP` (una API
relativamente nueva) puede estar incompleto.

## Estructura

```
src/
  lib/              Código compartido: acceso a DynamoDB (dynamo.py), identidad/rol desde
                     el JWT (authz.py), cálculo de priorityScore/tier (priority.py), puntos
                     y recálculo de priorityScore (scoring.py), respuestas HTTP (response.py)
  handlers/
    auth/           start.py (inicia login/registro), verify.py (verifica el código)
    incidents/      create.py, get.py, edit.py, delete.py, like.py, follow.py, status.py,
                     verification.py, list_by_municipality.py, list_by_user.py
    comments/       create.py, like.py, delete.py
    municipalities/ list.py, ranking.py
    users/          change_municipality.py, create.py
tests/              pytest + moto (o mocks del cliente boto3 para los handlers que llaman a Cognito)
```

## Endpoints implementados

Cobertura completa de `DOCUMENTO_VIACLARA.md` §14, salvo lo listado como
fuera de alcance más abajo.

| Método | Path | Auth | Handler |
|---|---|---|---|
| POST | `/auth/start` | No | `handlers/auth/start.py` |
| POST | `/auth/verify` | No | `handlers/auth/verify.py` |
| POST | `/incidents` | Sí (JWT) | `handlers/incidents/create.py` |
| GET | `/incidents/{id}` | No | `handlers/incidents/get.py` |
| PUT | `/incidents/{id}` | Sí (autor, solo en `submitted`) | `handlers/incidents/edit.py` |
| DELETE | `/incidents/{id}` | Sí (autor u operario/administrador) | `handlers/incidents/delete.py` |
| PUT | `/incidents/{id}/like` | Sí (JWT) | `handlers/incidents/like.py` |
| PUT | `/incidents/{id}/follow` | Sí (JWT) | `handlers/incidents/follow.py` |
| PUT | `/incidents/{id}/status` | Sí (operario/administrador) | `handlers/incidents/status.py` |
| PUT | `/incidents/{id}/verification` | Sí (solo autor) | `handlers/incidents/verification.py` |
| POST | `/incidents/{id}/comments` | Sí (JWT) | `handlers/comments/create.py` |
| PUT | `/comments/{id}/like` | Sí (JWT) | `handlers/comments/like.py` |
| DELETE | `/comments/{id}` | Sí (autor o administrador) | `handlers/comments/delete.py` |
| GET | `/municipalities/{municipalityId}/incidents` | No | `handlers/incidents/list_by_municipality.py` |
| GET | `/municipalities` | No | `handlers/municipalities/list.py` |
| GET | `/municipalities/{municipalityId}/ranking` | No | `handlers/municipalities/ranking.py` |
| GET | `/users/{userId}/incidents` | Sí (solo el propio usuario) | `handlers/incidents/list_by_user.py` |
| PUT | `/users/{id}/municipality` | Sí (solo el propio usuario) | `handlers/users/change_municipality.py` |
| POST | `/users` | Sí (solo administrador) | `handlers/users/create.py` |
| POST | `/photos` | Sí (JWT) | `handlers/photos/upload_url.py` |

### Fotos

1. `POST /photos` con `{"contentType": "image/jpeg"}` (también `image/png`,
   `image/webp`, `image/heic`) devuelve `{key, url, fields, photoUrl}`: un
   *presigned POST* de S3 válido 5 minutos, limitado a 5 MB y a ese tipo de
   archivo, con la clave `photos/<userId>/<uuid>.<ext>`.
2. El cliente sube el archivo directamente a S3: `POST url` multipart con todos
   los `fields` y después el campo `file`.
3. `POST /incidents` recibe `"photos": [key, ...]` (máximo 3, solo claves del
   propio usuario) y guarda las URLs públicas de CloudFront
   (`<admin_web_url>/photos/...`) en el campo `photos` de la incidencia.

### Desviaciones deliberadas respecto a DOCUMENTO_VIACLARA.md §14

- `/auth/start` y `/auth/verify` sustituyen a `/auth/register`/`/auth/login`
  (login sin contraseña, ver `infra/README.md`).
- `PUT /comments/{id}/like` y `DELETE /comments/{id}` añaden `?incidentId=`
  como query param **obligatorio**. El path del documento solo lleva el id
  del comentario, pero en DynamoDB todo comentario vive bajo
  `PK=INCIDENT#<incidentId>` (patrón adjacency-list) y no hay forma de
  localizar un ítem por su id de comentario sin conocer su partición — ver la
  nota en `handlers/comments/like.py`. El frontend siempre tiene el
  `incidentId` disponible (está viendo el detalle de esa incidencia).
- `GET /users/{userId}/incidents` requiere JWT y exige que el `userId` del
  path coincida con el `sub` del token — el documento no lo especifica, pero
  dejarlo abierto permitiría listar los avisos/seguidos de cualquier usuario
  conociendo su id.

## Gaps conocidos / a verificar con una cuenta AWS real

- **`handlers/auth/verify.py`**: el nombre exacto del parámetro
  `SMS_OTP_CODE` en `ChallengeResponses` de `AdminRespondToAuthChallenge` es
  una suposición razonada (por analogía con `SOFTWARE_TOKEN_MFA_CODE` de
  MFA), no confirmada contra la documentación más reciente de AWS ni contra
  una llamada real. Revisar y ajustar en cuanto haya un User Pool real para
  probar contra él.
- **`handlers/authz.py`**: el formato exacto de `cognito:groups` en un evento
  de API Gateway HTTP API con authorizer JWT (lista real vs. string) tampoco
  se ha podido confirmar contra un token real — ver la nota en el módulo.
- El envío real de SMS (sandbox de Amazon SNS) y el comportamiento end-to-end
  de todo el flujo de auth no se pueden probar sin cuenta AWS.
- **`§10 regla 4`** ("un operario solo puede gestionar incidencias de su
  categoría/departamento asignado") no se aplica en `status.py`: el modelo de
  datos (§9.1) no tiene ningún campo de departamento/categoría asignada al
  operario todavía, así que no hay nada contra lo que validarlo.
- **Concurrencia**: like/follow/comentario/puntos usan dos escrituras
  DynamoDB separadas (un `ADD`/toggle atómico + un `SET` derivado), no una
  transacción — a escala de piloto el riesgo de carrera es aceptable, pero la
  mejora natural bajo tráfico real sería `TransactWriteItems`. Ver
  `lib/scoring.py`.

## Fuera de alcance de la API por ahora

Notificaciones push (EAS), backfill de ítems
espejo para incidencias creadas antes de que existieran (no aplica todavía:
no hay datos reales).
