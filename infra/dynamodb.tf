# Nota: `terraform validate` avisa de que hash_key/range_key están deprecados
# en favor de key_schema (provider AWS >= 6.x). Se mantiene deliberadamente
# hash_key/range_key aquí: key_schema tiene varios issues abiertos en el
# provider (state drift y reemplazo forzoso de GSIs — hashicorp/terraform-
# provider-aws #46513, #46601, #46335), y hash_key/range_key sigue siendo la
# sintaxis estable y totalmente soportada, solo marcada como "legacy".
#
# Esquema adjacency-list (una partición por incidencia con sus relaciones como
# ítems hijos) para poder traer incidencia + comentarios + "me gusta" en una
# sola Query. Ver DOCUMENTO_VIACLARA.md §9.2 y el razonamiento en el plan.
#
# Ítems de la tabla "incidents":
#   PK=INCIDENT#<id>  SK=METADATA                       -> la incidencia
#   PK=INCIDENT#<id>  SK=COMMENT#<createdAt>#<commentId> -> un comentario
#   PK=INCIDENT#<id>  SK=LIKE#<userId>                   -> "me gusta" (toggle idempotente)
#   PK=INCIDENT#<id>  SK=LIKE#COMMENT#<commentId>#<userId> -> "me gusta" de un comentario
#   PK=INCIDENT#<id>  SK=WATCH#<userId>                  -> "seguir" (toggle idempotente, mismo patrón que LIKE)
resource "aws_dynamodb_table" "incidents" {
  name         = "${var.project}-${var.environment}-incidents"
  billing_mode = "PAY_PER_REQUEST"

  point_in_time_recovery {
    enabled = true
  }
  hash_key  = "PK"
  range_key = "SK"

  attribute {
    name = "PK"
    type = "S"
  }
  attribute {
    name = "SK"
    type = "S"
  }
  # by-municipality: único GSI de esta tabla, ordenado por createdAt. Cubre
  # tanto ?sort=date como el orden por defecto por prioridad — este último se
  # calcula ordenando en memoria en la Lambda tras la Query (a escala de
  # piloto, 1-2 municipios, es más simple y barato que mantener un segundo GSI
  # cuyo sort key (priorityScore) se reescribiría en cada like/comentario).
  attribute {
    name = "GSI1PK"
    type = "S"
  }
  attribute {
    name = "GSI1SK"
    type = "N"
  }

  global_secondary_index {
    name            = "by-municipality"
    hash_key        = "GSI1PK"
    range_key       = "GSI1SK"
    projection_type = "ALL"
  }
}

# Ítems de la tabla "users":
#   PK=USER#<id>  SK=PROFILE                           -> perfil (name, phone, role, defaultMunicipalityId)
#   PK=USER#<id>  SK=MUNICIPALITY#<municipalityId>     -> points acumulados en ese municipio (RF-016/regla 11);
#                                                          lleva GSI1PK/GSI1SK (ranking-by-municipality, ver abajo)
#                                                          y authorName denormalizado para listar el escalafón
#                                                          sin N+1 GetItem a PROFILE.
#   PK=USER#<id>  SK=WATCH#<incidentId>                -> incidencia que sigue (Query directa por PK, sin GSI;
#                                                          sin timestamp en la SK porque además de listar hace
#                                                          falta poder comprobar/borrar por incidentId exacto
#                                                          en el toggle de PUT /incidents/{id}/follow)
#   PK=USER#<id>  SK=INCIDENT#<createdAt>#<incidentId> -> incidencia que creó (ídem, "Mis avisos"), con
#                                                          title/status/category/date denormalizados para poder
#                                                          listar sin N+1 (se actualiza también al cambiar estado)
#
# GSI disperso `ranking-by-municipality`: solo los ítems MUNICIPALITY#<id>
# (puntos) llevan GSI1PK/GSI1SK, así que la Query de ranking no necesita
# FilterExpression sobre el resto de tipos de ítem de la partición.
resource "aws_dynamodb_table" "users" {
  name         = "${var.project}-${var.environment}-users"
  billing_mode = "PAY_PER_REQUEST"

  point_in_time_recovery {
    enabled = true
  }
  hash_key  = "PK"
  range_key = "SK"

  attribute {
    name = "PK"
    type = "S"
  }
  attribute {
    name = "SK"
    type = "S"
  }
  attribute {
    name = "GSI1PK"
    type = "S"
  }
  attribute {
    name = "GSI1SK"
    type = "N"
  }

  global_secondary_index {
    name            = "ranking-by-municipality"
    hash_key        = "GSI1PK"
    range_key       = "GSI1SK"
    projection_type = "ALL"
  }
}

# Tabla de referencia "municipalities" (tenants). Todos los ítems comparten
# una partición constante (PK=MUNICIPALITY, SK=<id>) para que GET
# /municipalities sea una Query barata y acotada en vez de un Scan (que
# factura por cada ítem leído, cada vez, y es el antipatrón clásico de
# DynamoDB) — mismo coste que cualquier otro acceso indexado del resto de
# tablas, aunque la lista de municipios crezca. Mismos campos que
# MUNICIPALITIES en src/data/incidents.ts (id/name/province/center),
# sembrados abajo con aws_dynamodb_table_item para que el piloto arranque con
# datos reales.
resource "aws_dynamodb_table" "municipalities" {
  name         = "${var.project}-${var.environment}-municipalities"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "PK"
  range_key    = "SK"

  attribute {
    name = "PK"
    type = "S"
  }
  attribute {
    name = "SK"
    type = "S"
  }
}

locals {
  municipalities_seed = {
    almunecar = { name = "Almuñécar", province = "Granada", lat = "36.7339", lng = "-3.6907" }
    salobrena = { name = "Salobreña", province = "Granada", lat = "36.7429", lng = "-3.5859" }
    motril    = { name = "Motril", province = "Granada", lat = "36.7495", lng = "-3.5197" }
  }
}

resource "aws_dynamodb_table_item" "municipalities_seed" {
  for_each = local.municipalities_seed

  table_name = aws_dynamodb_table.municipalities.name
  hash_key   = aws_dynamodb_table.municipalities.hash_key
  range_key  = aws_dynamodb_table.municipalities.range_key

  item = jsonencode({
    PK       = { S = "MUNICIPALITY" }
    SK       = { S = each.key }
    id       = { S = each.key }
    name     = { S = each.value.name }
    province = { S = each.value.province }
    center = {
      M = {
        lat = { N = each.value.lat }
        lng = { N = each.value.lng }
      }
    }
  })
}
