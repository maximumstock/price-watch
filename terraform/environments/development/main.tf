locals {
  environment         = "development"
  manifest            = jsondecode(file("./manifest.json"))
  kleinanzeigen_tasks = [for search_task in local.manifest.kleinanzeigen : search_task]
}

module "s3" {
  source          = "../../modules/s3"
  environment     = local.environment
  lambda_role_arn = module.lambda-kleinanzeigen.lambda_role_arn
}

// TODO: extract `module.lambda-kleinanzeigen.lambda_role_arn` to be a single role for all Lambas
// and pass it as an argument to the Lambda module calls.

module "dynamodb" {
  source      = "../../modules/dynamodb"
  environment = local.environment
}

module "lambda-kleinanzeigen" {
  source             = "../../modules/lambda"
  environment        = local.environment
  lambda_name        = "kleinanzeigen"
  lambda_bucket_id   = module.s3.lambda_bucket_id
  dynamodb_table_arn = module.dynamodb.table_arn
  // Read from environment variables
  source_email        = var.source_email
  analytics_s3_bucket = var.analytics_s3_bucket
}


module "schedule-kleinanzeigen" {
  source      = "../../modules/event-bridge"
  environment = local.environment
  lambda_name = "kleinanzeigen"
  lambda_arn  = module.lambda-kleinanzeigen.lambda_arn
  // search task related values defined in the respective manifest schedule definition
  tasks = local.kleinanzeigen_tasks
}
