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

variable "dynamodb_table_arn" {
  description = "The arn of the DynamoDB table to store offers in"
  type        = string
}

variable "source_email" {
  description = "The email address to send notifications from"
  type        = string
}
