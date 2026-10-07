# Empaqueta todo apps/api/src en un único zip. Es suficiente para el volumen
# de código de este slice (sin dependencias externas de runtime pesadas); si
# el proyecto crece, esto se puede partir en un paquete por dominio o mover
# las dependencias compartidas a una Lambda Layer.
data "archive_file" "api_src" {
  type        = "zip"
  source_dir  = "${path.module}/../apps/api/src"
  output_path = "${path.module}/.build/api_src.zip"
  excludes    = ["**/__pycache__/**"]
}

locals {
  # Cobertura completa de DOCUMENTO_VIACLARA.md §14 salvo lo listado como
  # fuera de alcance en apps/api/README.md (notificaciones).
  lambda_functions = {
    auth_start = {
      handler = "handlers.auth.start.handler"
      role    = aws_iam_role.lambda_auth.arn
    }
    auth_verify = {
      handler = "handlers.auth.verify.handler"
      role    = aws_iam_role.lambda_auth.arn
    }
    incidents_create = {
      handler = "handlers.incidents.create.handler"
      role    = aws_iam_role.lambda_incidents.arn
    }
    incidents_get = {
      handler = "handlers.incidents.get.handler"
      role    = aws_iam_role.lambda_incidents.arn
    }
    incidents_list_by_municipality = {
      handler = "handlers.incidents.list_by_municipality.handler"
      role    = aws_iam_role.lambda_incidents.arn
    }
    incidents_list_by_user = {
      handler = "handlers.incidents.list_by_user.handler"
      role    = aws_iam_role.lambda_incidents.arn
    }
    incidents_edit = {
      handler = "handlers.incidents.edit.handler"
      role    = aws_iam_role.lambda_incidents.arn
    }
    incidents_delete = {
      handler = "handlers.incidents.delete.handler"
      role    = aws_iam_role.lambda_incidents.arn
    }
    incidents_like = {
      handler = "handlers.incidents.like.handler"
      role    = aws_iam_role.lambda_incidents.arn
    }
    incidents_follow = {
      handler = "handlers.incidents.follow.handler"
      role    = aws_iam_role.lambda_incidents.arn
    }
    incidents_status = {
      handler = "handlers.incidents.status.handler"
      role    = aws_iam_role.lambda_incidents.arn
    }
    incidents_verification = {
      handler = "handlers.incidents.verification.handler"
      role    = aws_iam_role.lambda_incidents.arn
    }
    comments_create = {
      handler = "handlers.comments.create.handler"
      role    = aws_iam_role.lambda_incidents.arn
    }
    comments_like = {
      handler = "handlers.comments.like.handler"
      role    = aws_iam_role.lambda_incidents.arn
    }
    comments_delete = {
      handler = "handlers.comments.delete.handler"
      role    = aws_iam_role.lambda_incidents.arn
    }
    municipalities_list = {
      handler = "handlers.municipalities.list.handler"
      role    = aws_iam_role.lambda_municipalities.arn
    }
    municipalities_ranking = {
      handler = "handlers.municipalities.ranking.handler"
      role    = aws_iam_role.lambda_municipalities.arn
    }
    users_change_municipality = {
      handler = "handlers.users.change_municipality.handler"
      role    = aws_iam_role.lambda_incidents.arn
    }
    users_create = {
      handler = "handlers.users.create.handler"
      role    = aws_iam_role.lambda_auth.arn
    }
    photos_upload_url = {
      handler = "handlers.photos.upload_url.handler"
      role    = aws_iam_role.lambda_photos.arn
    }
  }
}

# Created explicitly (instead of letting Lambda create it on first invocation)
# so logs expire and are removed on `terraform destroy`.
resource "aws_cloudwatch_log_group" "lambda" {
  for_each = local.lambda_functions

  name              = "/aws/lambda/${var.project}-${var.environment}-${replace(each.key, "_", "-")}"
  retention_in_days = 30
}

resource "aws_lambda_function" "api" {
  for_each = local.lambda_functions

  function_name    = "${var.project}-${var.environment}-${replace(each.key, "_", "-")}"
  role             = each.value.role
  handler          = each.value.handler
  runtime          = "python3.12"
  filename         = data.archive_file.api_src.output_path
  source_code_hash = data.archive_file.api_src.output_base64sha256
  timeout          = 10
  memory_size      = 128

  logging_config {
    log_format = "Text"
    log_group  = aws_cloudwatch_log_group.lambda[each.key].name
  }

  environment {
    variables = {
      TABLE_INCIDENTS      = aws_dynamodb_table.incidents.name
      TABLE_USERS          = aws_dynamodb_table.users.name
      TABLE_MUNICIPALITIES = aws_dynamodb_table.municipalities.name
      USER_POOL_ID         = aws_cognito_user_pool.main.id
      USER_POOL_CLIENT_ID  = aws_cognito_user_pool_client.mobile.id
      PHOTOS_BUCKET        = aws_s3_bucket.photos.id
      PHOTOS_BASE_URL      = local.photos_base_url
    }
  }
}
