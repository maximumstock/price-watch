variable "source_email" {
  description = "The email address to send notifications from"
  type        = string
}

variable "analytics_s3_bucket" {
  description = "The S3 bucket to store scraped data for analytics"
  type        = string
}
