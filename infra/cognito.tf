# Rol que Cognito asume para publicar los SMS de verificación/OTP vía SNS
# (necesario tanto para el flujo passwordless nativo como para el envío de
# mensajes de verificación, con independencia del mecanismo de auth elegido).
resource "aws_iam_role" "cognito_sms" {
  name = "${var.project}-${var.environment}-cognito-sms-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "cognito-idp.amazonaws.com" }
      Action    = "sts:AssumeRole"
      Condition = {
        StringEquals = {
          "sts:ExternalId" = "${var.project}-${var.environment}-external-id"
        }
      }
    }]
  })
}

resource "aws_iam_role_policy" "cognito_sms" {
  name = "${var.project}-${var.environment}-cognito-sms-policy"
  role = aws_iam_role.cognito_sms.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect   = "Allow"
      Action   = "sns:Publish"
      Resource = "*"
    }]
  })
}

# RF-008: login/registro por número de teléfono (sin email, sin contraseña),
# verificado por SMS OTP. Usa el flujo passwordless nativo de Cognito
# (USER_AUTH + SMS_OTP), NO los antiguos Lambda triggers custom de challenge
# — ver la nota de diseño en el plan sobre por qué se descartaron.
resource "aws_cognito_user_pool" "main" {
  name = "${var.project}-${var.environment}-user-pool"

  # El flujo passwordless con SMS_OTP como primer factor requiere el plan de
  # funcionalidades "Essentials" o superior (es el valor por defecto si se omite,
  # pero se deja explícito para que el requisito quede documentado en el código).
  user_pool_tier = "ESSENTIALS"

  # Citizens sign in with their phone (SMS_OTP, mobile app); municipal staff
  # with their email + password (admin web app), invited by an administrator.
  username_attributes      = ["phone_number", "email"]
  auto_verified_attributes = ["phone_number"]

  # Every account is created server-side (POST /auth/start for citizens,
  # POST /users for staff); the public SignUp API stays closed.
  admin_create_user_config {
    allow_admin_create_user_only = true

    invite_message_template {
      email_subject = "Acceso al panel municipal de ViaClara"
      email_message = "Hola. Te hemos dado acceso al panel municipal de ViaClara (${local.admin_web_url}). Usuario: {username} · Contraseña temporal: {####} — te pedirá cambiarla al entrar."
      sms_message   = "ViaClara: usuario {username}, codigo temporal {####}"
    }
  }

  # Cognito requires PASSWORD to be listed; no user ever gets a usable
  # password (accounts are created without one), so SMS_OTP is the only path.
  sign_in_policy {
    allowed_first_auth_factors = ["PASSWORD", "SMS_OTP"]
  }

  sms_configuration {
    external_id    = "${var.project}-${var.environment}-external-id"
    sns_caller_arn = aws_iam_role.cognito_sms.arn
  }

  account_recovery_setting {
    recovery_mechanism {
      name     = "verified_phone_number"
      priority = 1
    }
    recovery_mechanism {
      name     = "verified_email"
      priority = 2
    }
  }

  # No se usa nunca en la práctica (no hay flujo con contraseña), pero Cognito
  # exige que el bloque exista con valores válidos.
  password_policy {
    minimum_length = 8
  }
}

# App client público (sin secret) para el uso desde la app móvil (Expo / React
# Native no puede guardar un client secret de forma segura).
resource "aws_cognito_user_pool_client" "mobile" {
  name         = "${var.project}-${var.environment}-mobile-client"
  user_pool_id = aws_cognito_user_pool.main.id

  generate_secret = false

  # ALLOW_USER_AUTH habilita el flujo de selección de primer factor
  # (passwordless/SMS_OTP incluido); ALLOW_REFRESH_TOKEN_AUTH para renovar
  # sesión sin repetir el OTP.
  explicit_auth_flows = [
    "ALLOW_USER_AUTH",
    "ALLOW_REFRESH_TOKEN_AUTH",
  ]

  prevent_user_existence_errors = "ENABLED"

  access_token_validity  = 1
  id_token_validity      = 1
  refresh_token_validity = 30

  token_validity_units {
    access_token  = "hours"
    id_token      = "hours"
    refresh_token = "days"
  }
}

# Roles de §13 (permisos): todo usuario nuevo entra en "citizens"; los otros
# dos grupos se usan desde la admin app (RF-010, todavía no construida) para
# dar de alta operarios/administradores vía AdminAddUserToGroup.
resource "aws_cognito_user_group" "citizens" {
  name         = "citizens"
  user_pool_id = aws_cognito_user_pool.main.id
  description  = "Ciudadanos — rol por defecto de todo usuario nuevo."
}

resource "aws_cognito_user_group" "operators" {
  name         = "operators"
  user_pool_id = aws_cognito_user_pool.main.id
  description  = "Operarios del Ayuntamiento (admin app, RF-010)."
}

resource "aws_cognito_user_group" "administrators" {
  name         = "administrators"
  user_pool_id = aws_cognito_user_pool.main.id
  description  = "Administradores (admin app, RF-010)."
}
