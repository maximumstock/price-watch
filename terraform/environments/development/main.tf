locals {
  environment = "development"
}

module "s3" {
  source      = "../../modules/s3"
  environment = local.environment
}


module "lambda-health-check" {
  source           = "../../modules/lambda"
  environment      = local.environment
  lambda_name      = "health-check"
  lambda_bucket_id = module.s3.lambda_bucket_id
}

module "lambda-kleinanzeigen" {
  source           = "../../modules/lambda"
  environment      = local.environment
  lambda_name      = "kleinanzeigen"
  lambda_bucket_id = module.s3.lambda_bucket_id
}
