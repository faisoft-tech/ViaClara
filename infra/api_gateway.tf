resource "aws_apigatewayv2_api" "main" {
  name          = "${var.project}-${var.environment}-api"
  protocol_type = "HTTP"

  # Only needed by the admin web app (browser); the mobile app is not subject
  # to CORS. When set, API Gateway answers preflights itself and ignores any
  # CORS headers returned by the Lambdas.
  cors_configuration {
    allow_origins = concat([local.admin_web_url], var.admin_web_dev_origins)
    allow_methods = ["GET", "POST", "PUT", "DELETE", "OPTIONS"]
    allow_headers = ["authorization", "content-type"]
    max_age       = 3600
  }
}

# Throttling limits are global per route (not per client IP: HTTP APIs do not
# support WAF). The hard cap against SMS pumping is the SNS monthly spend
# limit in budgets.tf; these limits only bound how fast it can be reached.
resource "aws_apigatewayv2_stage" "default" {
  api_id      = aws_apigatewayv2_api.main.id
  name        = "$default"
  auto_deploy = true

  default_route_settings {
    throttling_burst_limit = 100
    throttling_rate_limit  = 50
  }

  # Every call sends a paid SMS; a pilot of 1-2 municipalities needs far less.
  route_settings {
    route_key              = aws_apigatewayv2_route.routes["auth_start"].route_key
    throttling_burst_limit = 5
    throttling_rate_limit  = 1
  }
}

resource "aws_apigatewayv2_authorizer" "cognito" {
  api_id           = aws_apigatewayv2_api.main.id
  authorizer_type  = "JWT"
  identity_sources = ["$request.header.Authorization"]
  name             = "${var.project}-${var.environment}-cognito-authorizer"

  jwt_configuration {
    audience = [aws_cognito_user_pool_client.mobile.id]
    issuer   = "https://cognito-idp.${var.aws_region}.amazonaws.com/${aws_cognito_user_pool.main.id}"
  }
}

# Rutas de DOCUMENTO_VIACLARA.md §14, salvo /auth/start y /auth/verify que
# sustituyen a /auth/register y /auth/login por no haber contraseña (ver
# plan), y PUT /comments/{id}/like + DELETE /comments/{id} que requieren
# además `?incidentId=` como query param — ver la nota de desviación en
# handlers/comments/like.py. Añadir un endpoint nuevo = una entrada más en
# local.routes + su Lambda en lambda.tf, siguiendo el mismo patrón.
locals {
  routes = {
    auth_start = {
      method       = "POST"
      path         = "/auth/start"
      function_key = "auth_start"
      protected    = false
    }
    auth_verify = {
      method       = "POST"
      path         = "/auth/verify"
      function_key = "auth_verify"
      protected    = false
    }
    incidents_create = {
      method       = "POST"
      path         = "/incidents"
      function_key = "incidents_create"
      protected    = true
    }
    incidents_get = {
      method       = "GET"
      path         = "/incidents/{id}"
      function_key = "incidents_get"
      protected    = false
    }
    incidents_edit = {
      method       = "PUT"
      path         = "/incidents/{id}"
      function_key = "incidents_edit"
      protected    = true
    }
    incidents_delete = {
      method       = "DELETE"
      path         = "/incidents/{id}"
      function_key = "incidents_delete"
      protected    = true
    }
    incidents_like = {
      method       = "PUT"
      path         = "/incidents/{id}/like"
      function_key = "incidents_like"
      protected    = true
    }
    incidents_follow = {
      method       = "PUT"
      path         = "/incidents/{id}/follow"
      function_key = "incidents_follow"
      protected    = true
    }
    incidents_status = {
      method       = "PUT"
      path         = "/incidents/{id}/status"
      function_key = "incidents_status"
      protected    = true
    }
    incidents_verification = {
      method       = "PUT"
      path         = "/incidents/{id}/verification"
      function_key = "incidents_verification"
      protected    = true
    }
    comments_create = {
      method       = "POST"
      path         = "/incidents/{id}/comments"
      function_key = "comments_create"
      protected    = true
    }
    comments_like = {
      method       = "PUT"
      path         = "/comments/{id}/like"
      function_key = "comments_like"
      protected    = true
    }
    comments_delete = {
      method       = "DELETE"
      path         = "/comments/{id}"
      function_key = "comments_delete"
      protected    = true
    }
    incidents_list_by_municipality = {
      method       = "GET"
      path         = "/municipalities/{municipalityId}/incidents"
      function_key = "incidents_list_by_municipality"
      protected    = false
    }
    incidents_list_by_user = {
      method       = "GET"
      path         = "/users/{userId}/incidents"
      function_key = "incidents_list_by_user"
      protected    = true
    }
    municipalities_list = {
      method       = "GET"
      path         = "/municipalities"
      function_key = "municipalities_list"
      protected    = false
    }
    municipalities_ranking = {
      method       = "GET"
      path         = "/municipalities/{municipalityId}/ranking"
      function_key = "municipalities_ranking"
      protected    = false
    }
    users_change_municipality = {
      method       = "PUT"
      path         = "/users/{id}/municipality"
      function_key = "users_change_municipality"
      protected    = true
    }
    users_create = {
      method       = "POST"
      path         = "/users"
      function_key = "users_create"
      protected    = true
    }
    photos_upload_url = {
      method       = "POST"
      path         = "/photos"
      function_key = "photos_upload_url"
      protected    = true
    }
  }
}

resource "aws_apigatewayv2_integration" "routes" {
  for_each = local.routes

  api_id                 = aws_apigatewayv2_api.main.id
  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_function.api[each.value.function_key].invoke_arn
  payload_format_version = "2.0"
}

resource "aws_apigatewayv2_route" "routes" {
  for_each = local.routes

  api_id             = aws_apigatewayv2_api.main.id
  route_key          = "${each.value.method} ${each.value.path}"
  target             = "integrations/${aws_apigatewayv2_integration.routes[each.key].id}"
  authorization_type = each.value.protected ? "JWT" : "NONE"
  authorizer_id      = each.value.protected ? aws_apigatewayv2_authorizer.cognito.id : null
}

resource "aws_lambda_permission" "api_gw" {
  for_each = local.lambda_functions

  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.api[each.key].function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.main.execution_arn}/*/*"
}
