variable "environment" {
  description = "The environment, either development or production"
  type        = string
}

variable "lambda_arn" {
  description = "The arn of the Lambda function to schedule. We use this as a target for the EventBridge scheduling."
  type        = string
}

variable "lambda_name" {
  description = "The name of the Lambda function to schedule. We use this to create the IAM role name for the EventBridge scheduling."
  type        = string
}

variable "search_query" {
  description = "The search query to call the Lambda function with. This will be passed as an input to the Lambda function."
  type        = string
}
