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

variable "tasks" {
  description = "A list of search tasks"
  type = list(object({
    searchQuery : string,
    rateInMinutes : string,
    storeForAnalytics : bool,
    analyticsS3Prefix : optional(string),
    notifications : optional(list(object({
      type : string,
      targets : list(string)
    })))
  }))
}
