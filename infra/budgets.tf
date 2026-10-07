# Account-wide SMS settings for this region (the account is dedicated to
# ViaClara). monthly_spend_limit is the hard cap against SMS pumping on the
# public POST /auth/start: once reached, SNS stops sending until next month.
# Disabled until AWS activates SMS on a new account (SNS rejects any SMS call
# with "needs a subscription for the service" until then).
resource "aws_sns_sms_preferences" "main" {
  count = var.manage_sms_preferences ? 1 : 0

  monthly_spend_limit = var.sms_monthly_spend_limit_usd
  default_sms_type    = "Transactional"
}

resource "aws_budgets_budget" "monthly" {
  count = var.budget_alert_email == "" ? 0 : 1

  name         = "${var.project}-${var.environment}-monthly"
  budget_type  = "COST"
  limit_amount = tostring(var.monthly_budget_usd)
  limit_unit   = "USD"
  time_unit    = "MONTHLY"

  notification {
    comparison_operator        = "GREATER_THAN"
    threshold                  = 80
    threshold_type             = "PERCENTAGE"
    notification_type          = "ACTUAL"
    subscriber_email_addresses = [var.budget_alert_email]
  }

  notification {
    comparison_operator        = "GREATER_THAN"
    threshold                  = 100
    threshold_type             = "PERCENTAGE"
    notification_type          = "FORECASTED"
    subscriber_email_addresses = [var.budget_alert_email]
  }
}
