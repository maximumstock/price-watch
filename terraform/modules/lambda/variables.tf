variable "environment" {
  description = "The environment, either development or production"
  type        = string
}

variable "lambda_name" {
  description = "The name of the Lambda function"
  type        = string
}

variable "lambda_bucket_id" {
  description = "The id of the bucket to store the Lambda in"
  type        = string
}
