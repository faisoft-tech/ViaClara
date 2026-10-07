provider "aws" {
  region = var.aws_region

  # Refuses to run against any other account (e.g. a work profile left as
  # default). Empty list = no restriction, only until the account id is known.
  allowed_account_ids = length(var.allowed_account_ids) > 0 ? var.allowed_account_ids : null

  default_tags {
    tags = {
      Project     = "ViaClara"
      Environment = var.environment
      ManagedBy   = "terraform"
    }
  }
}
