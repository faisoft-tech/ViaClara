# Infraestructura ViaClara (Terraform)

Backend real de ViaClara en AWS: API Gateway (HTTP API) + Lambda (Python) +
Cognito (login passwordless por teléfono) + DynamoDB. Ver el diseño completo
en `DOCUMENTO_VIACLARA.md` (§9 modelo de datos, §14 API) y el razonamiento
técnico en el plan de esta fase.

**Estado**: desplegado en la cuenta de ViaClara (`eu-central-1`, entorno
`dev`). `terraform output` da las URLs de la API, la admin app y las fotos.

## Prerrequisitos

- [Terraform](https://developer.hashicorp.com/terraform/install) >= 1.5
- Una cuenta AWS (pendiente de crear) con permisos de administrador para el
  primer despliegue
- AWS CLI configurado (`aws configure`) una vez exista la cuenta

## Verificar sin cuenta AWS

Estos comandos NO necesitan credenciales reales — solo descargan los
providers (acceso a internet a `registry.terraform.io`) y comprueban la
sintaxis/coherencia interna del código, sin llamar a la API de AWS:

```sh
cd infra
terraform init      # descarga los providers (aws, archive)
terraform validate  # comprueba sintaxis y referencias, sin credenciales
terraform fmt -check -recursive
```

`terraform plan`/`terraform apply` SÍ necesitan una cuenta real y
credenciales válidas — no ejecutarlos hasta entonces.

## Desplegar cuando exista la cuenta

Terraform ya crea **todos los roles y políticas IAM que la aplicación
necesita en tiempo de ejecución** (rol de ejecución de cada Lambda, rol que
Cognito asume para mandar SMS vía SNS — ver `iam.tf`/`cognito.tf`). Lo único
que no puede crear Terraform es la identidad con la que **vosotros** os
autenticáis para lanzar Terraform la primera vez — eso es un paso manual
previo, inevitable en cualquier cuenta AWS nueva:

0. **Bootstrap manual de la cuenta (una sola vez, antes de tocar Terraform):**
   - Crear la cuenta AWS (email + tarjeta) e iniciar sesión como *root*.
   - Activar MFA en el usuario *root* y no volver a usarlo para el día a día.
   - Crear un usuario/rol IAM con permisos de administrador para el despliegue
     inicial (vía **IAM Identity Center**, recomendado, o un usuario IAM
     clásico + access keys si no hay SSO). Con Identity Center os autenticáis
     con `aws sso login`; con un usuario IAM clásico, generáis un Access
     Key ID + Secret Access Key para ese usuario.
   - Esto es exactamente lo mismo que haríais para cualquier proyecto
     Terraform — no es nada específico de ViaClara, es el mínimo para que
     el provider `aws` pueda autenticar cualquier llamada.
1. Crear un perfil **propio** de AWS CLI para ViaClara (nunca usar el
   `default`, que puede apuntar a otra cuenta):
   ```powershell
   aws configure sso --profile viaclara
   aws sso login --profile viaclara
   aws sts get-caller-identity --profile viaclara   # comprobar el Account ID
   $env:AWS_PROFILE = "viaclara"
   ```
2. Copiar `terraform.tfvars.example` a `terraform.tfvars` (ignorado por git) y
   rellenar `allowed_account_ids` con el Account ID de ViaClara (Terraform se
   niega a ejecutarse contra cualquier otra cuenta) y `budget_alert_email`.
3. `terraform plan` para revisar el diff, luego `terraform apply`. **Esto ya
   crea todo lo demás solo**: las tablas DynamoDB, el User Pool + client +
   grupos de Cognito, los roles/políticas IAM, las Lambdas con sus log groups,
   el API Gateway con sus rutas, el hosting de la admin app (S3 + CloudFront),
   el tope de gasto en SMS y el presupuesto con alertas.
4. Tras el primer `apply`: solicitar salida del sandbox de SMS de Amazon SNS
   (gestión manual en la consola/soporte de AWS — Terraform no lo automatiza),
   necesario para enviar OTP a números reales de ciudadanos fuera de la lista
   de prueba de hasta 10 números verificados. En el mismo caso de soporte,
   pedir subir la cuota de gasto SMS mensual y luego ajustar
   `sms_monthly_spend_limit_usd` (no puede superar esa cuota).
5. Crear el **primer administrador** a mano (`POST /users` exige ya ser
   administrador, así que el primero no puede crearse vía API). El personal
   municipal entra en la admin app con **correo + contraseña**; Cognito le
   envía por email una contraseña temporal que debe cambiar al entrar:
   ```powershell
   $POOL = terraform output -raw cognito_user_pool_id
   $EMAIL = "admin@ejemplo.com"
   $SUB = aws cognito-idp admin-create-user --user-pool-id $POOL --username $EMAIL `
     --temporary-password "<contraseña temporal aleatoria, p.ej. Xy7!...>" `
     --user-attributes Name=email,Value=$EMAIL Name=email_verified,Value=true `
     --desired-delivery-mediums EMAIL --query "User.Attributes[?Name=='sub'].Value" --output text
   aws cognito-idp admin-add-user-to-group --user-pool-id $POOL --username $EMAIL --group-name administrators
   ```
   y crear su perfil en la tabla `users` (`PK=USER#$SUB`, `SK=PROFILE`,
   `role=administrator`). El resto del personal se da de alta con
   `POST /users` (`{email, name, role}`) desde una cuenta de administrador.
   Los ciudadanos nunca usan contraseña: entran con su teléfono por SMS.
6. Copiar los `output` (`cognito_user_pool_id`, `cognito_user_pool_client_id`,
   `api_endpoint`) a la configuración de la app móvil (todavía no integrada
   con Cognito real — es trabajo de frontend pendiente, fuera de este slice).

### Datos de ejemplo

`apps/api/scripts/seed_demo_data.py` carga las incidencias de
`apps/api/scripts/demo_incidents.json` (calles reales de Almuñécar, Salobreña y
Motril; coordenadas aproximadas) y sube sus fotos de
`apps/api/scripts/demo_photos/` (CC0/dominio público, ver `CREDITS.md`). Las
fechas son relativas al momento de la carga. Se puede relanzar: borra antes
todas las incidencias de ejemplo (`createdBy` = `seed-*`) y deja la demo como
nueva. El bucket y la URL de las fotos los lee de `terraform output`. Si el perfil usa `aws login`
(boto3 antiguo no lo soporta), exportar antes las credenciales:
```sh
cd apps/api
eval "$(aws configure export-credentials --profile viaclara --format env)"
AWS_DEFAULT_REGION=eu-central-1 .venv/Scripts/python.exe scripts/seed_demo_data.py
```

### Configuración de las apps

Ambas leen valores públicos de `terraform output` desde un `.env`:
`apps/admin-web/.env` (`VITE_API_URL`, `VITE_COGNITO_REGION`,
`VITE_COGNITO_CLIENT_ID`) y `.env` en la raíz para la app móvil
(`EXPO_PUBLIC_API_URL`). Si se recrea el User Pool, actualizar
`VITE_COGNITO_CLIENT_ID` y volver a desplegar la admin app.

### Desplegar la admin app (S3 + CloudFront)

```powershell
cd apps/admin-web
npm run build
aws s3 sync dist "s3://$(terraform -chdir=../../infra output -raw admin_web_bucket)" --delete
aws cloudfront create-invalidation --distribution-id "$(terraform -chdir=../../infra output -raw admin_web_distribution_id)" --paths "/*"
```

La URL queda en `terraform output admin_web_url`. Ese origen (y
`http://localhost:5173` / `http://localhost:8081` para desarrollo de la admin
app y de la app móvil en modo web) son los únicos permitidos por CORS en la
API.

### Opcional: estado remoto (recomendado para trabajar en equipo)

Por defecto el estado se guarda en local (`infra/terraform.tfstate`). Para
compartirlo entre varias personas sin pisaros el trabajo, hace falta un
bucket S3 (versionado) + una tabla DynamoDB de bloqueo — como el propio
Terraform no puede crear el backend donde va a guardar su estado antes de
tener un backend, esos dos recursos se crean **a mano** (consola o un par de
comandos `aws s3api create-bucket` / `aws dynamodb create-table`) o con un
mini-proyecto Terraform aparte con estado local solo para eso. Una vez
existan, descomentar el bloque `backend "s3"` en `versions.tf` y ejecutar
`terraform init -migrate-state`.

## Qué hay desplegado en este slice

- **DynamoDB**: tablas `incidents`, `users` (esquema adjacency-list, ver
  comentarios en `dynamodb.tf`; ambas con point-in-time recovery) y
  `municipalities` (sembrada con los municipios del piloto).
- **Cognito**: User Pool con login passwordless por teléfono para ciudadanos
  (SMS OTP nativo) y correo + contraseña para el personal municipal, grupos
  `citizens`/`operators`/`administrators`.
- **API Gateway (HTTP API)** + **Lambda (Python 3.12)**: 19 endpoints — ver
  `apps/api/README.md`. CORS limitado a la admin app, throttling global
  (50 req/s) y mucho más estricto en `POST /auth/start` (1 req/s), que envía
  un SMS de pago en cada llamada. Logs en CloudWatch con 30 días de retención.
- **Admin app**: bucket S3 privado + CloudFront (Origin Access Control,
  fallback a `index.html` para el routing del SPA).
- **Fotos de incidencias** (`photos.tf`): bucket S3 privado aparte, servido
  por la misma distribución CloudFront bajo `/photos/*`. Los clientes suben
  directamente a S3 con un *presigned POST* de `POST /photos` (5 MB máx., solo
  imágenes, clave limitada a `photos/<userId>/`).
- **Costes**: tope mensual de gasto en SMS de SNS (límite duro contra fraude
  por SMS) y presupuesto de AWS Budgets con alertas por email.

## Decisiones de diseño relevantes

- **Un solo entorno ("dev")**, sin multi-entorno todavía — no tiene sentido
  para un piloto de 1-2 municipios; añadir `environments/*.tfvars` cuando
  haga falta un entorno de verdad diferenciado.
- **Estado local** (`infra/terraform.tfstate`, en `.gitignore`) hasta que
  exista la cuenta AWS; el bloque `backend "s3"` ya está escrito y comentado
  en `versions.tf`, listo para activar.
- **`hash_key`/`range_key`** en vez del más nuevo `key_schema` en
  `aws_dynamodb_table`: `terraform validate` avisa de que están deprecados,
  pero se mantienen a propósito porque `key_schema` tiene varios issues
  abiertos de *state drift* / reemplazo forzoso de GSIs en el provider AWS
  (ver comentario en `dynamodb.tf`).
- **`/auth/start` + `/auth/verify`** sustituyen a `/auth/register` +
  `/auth/login` de §14: con login passwordless no hay contraseña que
  registrar, así que esos dos nombres no encajaban; el resto del contrato de
  §14 se respeta tal cual.
- **Sin WAF**: las HTTP APIs de API Gateway no admiten WAF, así que no hay
  límite por IP. La protección de `/auth/start` es el throttling global de
  la ruta + el tope de gasto SMS. Si hiciera falta límite por IP, la opción
  es poner CloudFront + WAF delante de la API.
