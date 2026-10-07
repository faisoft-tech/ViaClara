data "aws_iam_policy_document" "lambda_assume_role" {
  statement {
    effect  = "Allow"
    actions = ["sts:AssumeRole"]

    principals {
      type        = "Service"
      identifiers = ["lambda.amazonaws.com"]
    }
  }
}

# --- Rol para las Lambdas de auth: admin-* de Cognito + escritura del perfil
#     inicial en la tabla "users". No tiene acceso a la tabla "incidents". ---

resource "aws_iam_role" "lambda_auth" {
  name               = "${var.project}-${var.environment}-lambda-auth-role"
  assume_role_policy = data.aws_iam_policy_document.lambda_assume_role.json
}

resource "aws_iam_role_policy_attachment" "lambda_auth_logs" {
  role       = aws_iam_role.lambda_auth.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

data "aws_iam_policy_document" "lambda_auth_inline" {
  statement {
    effect = "Allow"
    actions = [
      "cognito-idp:AdminCreateUser",
      "cognito-idp:AdminGetUser",
      "cognito-idp:AdminInitiateAuth",
      "cognito-idp:AdminRespondToAuthChallenge",
      # AdminAddUserToGroup: start.py mete a todo alta nueva en "citizens";
      # users/create.py (POST /users, solo administradores) mete al operario/
      # administrador dado de alta en su grupo correspondiente.
      "cognito-idp:AdminAddUserToGroup",
    ]
    resources = [aws_cognito_user_pool.main.arn]
  }

  statement {
    effect = "Allow"
    actions = [
      "dynamodb:PutItem",
      "dynamodb:GetItem",
    ]
    resources = [aws_dynamodb_table.users.arn]
  }
}

resource "aws_iam_role_policy" "lambda_auth_inline" {
  name   = "${var.project}-${var.environment}-lambda-auth-inline"
  role   = aws_iam_role.lambda_auth.id
  policy = data.aws_iam_policy_document.lambda_auth_inline.json
}

# --- Rol para las Lambdas de incidencias: tablas "incidents" y "users" (+ sus
#     GSIs). No tiene ningún permiso de Cognito.
#
#     Nace como "solo incidents", pero casi todas las acciones sociales
#     (like/follow/comentar/resolver/verificar) tocan también "users": leen el
#     tier del autor para priorityScore, escriben/revierten puntos, y
#     mantienen los ítems espejo (WATCH#/INCIDENT#) de "Mis avisos". Separar
#     esto en dos roles distintos ya no refleja los límites reales de acceso
#     a datos de este dominio, así que se fusiona en uno solo. ---

resource "aws_iam_role" "lambda_incidents" {
  name               = "${var.project}-${var.environment}-lambda-incidents-role"
  assume_role_policy = data.aws_iam_policy_document.lambda_assume_role.json
}

resource "aws_iam_role_policy_attachment" "lambda_incidents_logs" {
  role       = aws_iam_role.lambda_incidents.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

data "aws_iam_policy_document" "lambda_incidents_inline" {
  statement {
    effect = "Allow"
    actions = [
      "dynamodb:PutItem",
      "dynamodb:GetItem",
      "dynamodb:Query",
      "dynamodb:UpdateItem",
      "dynamodb:DeleteItem",
    ]
    resources = [
      aws_dynamodb_table.incidents.arn,
      "${aws_dynamodb_table.incidents.arn}/index/*",
      aws_dynamodb_table.users.arn,
      "${aws_dynamodb_table.users.arn}/index/*",
    ]
  }
}

resource "aws_iam_role_policy" "lambda_incidents_inline" {
  name   = "${var.project}-${var.environment}-lambda-incidents-inline"
  role   = aws_iam_role.lambda_incidents.id
  policy = data.aws_iam_policy_document.lambda_incidents_inline.json
}

# --- Rol para las Lambdas de municipios: lectura de "municipalities" +
#     lectura del GSI de escalafón en "users" (GET .../ranking). Sin acceso de
#     escritura a ninguna tabla, ni a Cognito. ---

resource "aws_iam_role" "lambda_municipalities" {
  name               = "${var.project}-${var.environment}-lambda-municipalities-role"
  assume_role_policy = data.aws_iam_policy_document.lambda_assume_role.json
}

resource "aws_iam_role_policy_attachment" "lambda_municipalities_logs" {
  role       = aws_iam_role.lambda_municipalities.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

data "aws_iam_policy_document" "lambda_municipalities_inline" {
  statement {
    effect    = "Allow"
    actions   = ["dynamodb:Query"]
    resources = [aws_dynamodb_table.municipalities.arn]
  }

  statement {
    effect    = "Allow"
    actions   = ["dynamodb:Query"]
    resources = ["${aws_dynamodb_table.users.arn}/index/*"]
  }
}

resource "aws_iam_role_policy" "lambda_municipalities_inline" {
  name   = "${var.project}-${var.environment}-lambda-municipalities-inline"
  role   = aws_iam_role.lambda_municipalities.id
  policy = data.aws_iam_policy_document.lambda_municipalities_inline.json
}

# --- Rol para la Lambda de fotos: solo firma subidas (presigned POST) a
#     photos/<userId>/ en el bucket de fotos. Sin acceso a DynamoDB ni Cognito. ---

resource "aws_iam_role" "lambda_photos" {
  name               = "${var.project}-${var.environment}-lambda-photos-role"
  assume_role_policy = data.aws_iam_policy_document.lambda_assume_role.json
}

resource "aws_iam_role_policy_attachment" "lambda_photos_logs" {
  role       = aws_iam_role.lambda_photos.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

data "aws_iam_policy_document" "lambda_photos_inline" {
  statement {
    effect    = "Allow"
    actions   = ["s3:PutObject"]
    resources = ["${aws_s3_bucket.photos.arn}/photos/*"]
  }
}

resource "aws_iam_role_policy" "lambda_photos_inline" {
  name   = "${var.project}-${var.environment}-lambda-photos-inline"
  role   = aws_iam_role.lambda_photos.id
  policy = data.aws_iam_policy_document.lambda_photos_inline.json
}
