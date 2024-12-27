locals {
  environment         = "development"
  manifest            = jsondecode(file("./manifest.json"))
  kleinanzeigen_tasks = [for search_task in local.manifest.kleinanzeigen : search_task]
}

module "s3" {
  source      = "../../modules/s3"
  environment = local.environment
}

module "dynamodb" {
  source      = "../../modules/dynamodb"
  environment = local.environment
}

module "lambda-health-check" {
  source             = "../../modules/lambda"
  environment        = local.environment
  lambda_name        = "health-check"
  lambda_bucket_id   = module.s3.lambda_bucket_id
  dynamodb_table_arn = module.dynamodb.table_arn
  // Read from environment variables
  source_email = var.source_email
}

module "lambda-kleinanzeigen" {
  source             = "../../modules/lambda"
  environment        = local.environment
  lambda_name        = "kleinanzeigen"
  lambda_bucket_id   = module.s3.lambda_bucket_id
  dynamodb_table_arn = module.dynamodb.table_arn
  // Read from environment variables
  source_email = var.source_email
}


module "schedule-kleinanzeigen" {
  source      = "../../modules/event-bridge"
  environment = local.environment
  lambda_name = "kleinanzeigen"
  lambda_arn  = module.lambda-kleinanzeigen.lambda_arn
  // search task related values defined in the respective manifest schedule definition
  tasks = local.kleinanzeigen_tasks
}
