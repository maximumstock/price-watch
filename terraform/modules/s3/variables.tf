variable "environment" {
  description = "The environment, either development or production"
  type        = string
}

variable "lambda_role_arn" {
  description = "The generic Lambda IAM role ARN"
  type        = string
}
