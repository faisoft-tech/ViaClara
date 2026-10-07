terraform {
  # >= 1.5 para poder validar localmente con la CLI ya instalada (1.5.4); nada
  # de lo escrito aquí necesita una versión más nueva del lenguaje de Terraform.
  required_version = ">= 1.5"

  required_providers {
    aws = {
      source = "hashicorp/aws"
      # sign_in_policy (passwordless SMS_OTP en aws_cognito_user_pool) requiere
      # una versión relativamente reciente del provider. Si `terraform init`
      # falla al resolver esta restricción, sube el límite superior.
      version = ">= 5.70"
    }
    archive = {
      source  = "hashicorp/archive"
      version = "~> 2.4"
    }
  }

  # Backend remoto: descomentar en cuanto exista la cuenta AWS y se haya creado
  # el bucket S3 (versionado) + la tabla DynamoDB de bloqueo. Hasta entonces el
  # estado se guarda en local (infra/terraform.tfstate, ver .gitignore).
  #
  # backend "s3" {
  #   bucket         = "viaclara-terraform-state"
  #   key            = "dev/terraform.tfstate"
  #   region         = "eu-central-1"
  #   dynamodb_table = "viaclara-terraform-locks"
  #   encrypt        = true
  # }
}
