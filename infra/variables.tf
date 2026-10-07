variable "project" {
  description = "Nombre corto del proyecto, usado como prefijo de todos los recursos."
  type        = string
  default     = "viaclara"
}

variable "environment" {
  description = "Entorno de despliegue. Un único entorno (\"dev\") para el piloto; no se introduce multi-entorno hasta que haga falta de verdad."
  type        = string
  default     = "dev"
}

variable "aws_region" {
  description = "Región AWS donde se despliega todo (Cognito, DynamoDB, Lambda, API Gateway)."
  type        = string
  default     = "eu-central-1"
}

variable "allowed_account_ids" {
  description = "IDs de cuenta AWS contra los que Terraform puede ejecutarse. Rellenar con el Account ID de ViaClara para que nunca se despliegue por error en otra cuenta (p.ej. la del trabajo)."
  type        = list(string)
  default     = []
}

variable "budget_alert_email" {
  description = "Email que recibe las alertas de AWS Budgets. Vacío = no se crea el presupuesto."
  type        = string
  default     = ""
}

variable "monthly_budget_usd" {
  description = "Presupuesto mensual total de la cuenta (USD). Avisa al 80% real y al 100% previsto."
  type        = number
  default     = 20
}

variable "sms_monthly_spend_limit_usd" {
  description = "Tope mensual de gasto en SMS de SNS (USD), límite duro contra fraude por SMS (SMS pumping). No puede superar la cuota de gasto SMS de la cuenta: subirla requiere un caso de soporte a AWS (por defecto 1 USD en sandbox)."
  type        = number
  default     = 1
}

variable "admin_web_dev_origins" {
  description = "Orígenes extra permitidos por CORS en la API, para desarrollo local: admin app (Vite, 5173) y app móvil en modo web (Expo, 8081). Las apps nativas no aplican CORS."
  type        = list(string)
  default     = ["http://localhost:5173", "http://localhost:8081"]
}

variable "manage_sms_preferences" {
  description = "Gestionar el tope de gasto SMS de SNS. Poner a false mientras AWS no haya activado SMS en una cuenta nueva (hasta 24 h)."
  type        = bool
  default     = true
}
