output "api_endpoint" {
  description = "URL base de la API (HTTP API de API Gateway)."
  value       = aws_apigatewayv2_api.main.api_endpoint
}

output "cognito_user_pool_id" {
  description = "ID del User Pool de Cognito (para configurar el SDK en la app móvil)."
  value       = aws_cognito_user_pool.main.id
}

output "cognito_user_pool_client_id" {
  description = "ID del app client público usado por la app móvil (Expo)."
  value       = aws_cognito_user_pool_client.mobile.id
}

output "dynamodb_incidents_table" {
  description = "Nombre de la tabla DynamoDB de incidencias."
  value       = aws_dynamodb_table.incidents.name
}

output "dynamodb_users_table" {
  description = "Nombre de la tabla DynamoDB de usuarios."
  value       = aws_dynamodb_table.users.name
}

output "dynamodb_municipalities_table" {
  description = "Nombre de la tabla DynamoDB de municipios."
  value       = aws_dynamodb_table.municipalities.name
}

output "admin_web_url" {
  description = "URL pública de la admin app (CloudFront)."
  value       = local.admin_web_url
}

output "admin_web_bucket" {
  description = "Bucket S3 donde se sube el build de la admin app (apps/admin-web/dist)."
  value       = aws_s3_bucket.admin_web.bucket
}

output "admin_web_distribution_id" {
  description = "ID de la distribución CloudFront, para invalidar la caché tras cada despliegue."
  value       = aws_cloudfront_distribution.admin_web.id
}

output "photos_bucket" {
  description = "Bucket S3 de las fotos de incidencias (lo usa apps/api/scripts/seed_demo_data.py)."
  value       = aws_s3_bucket.photos.bucket
}

output "photos_base_url" {
  description = "URL pública (CloudFront) bajo la que se sirven las fotos: <photos_base_url>/<userId>/<archivo>."
  value       = local.photos_base_url
}
