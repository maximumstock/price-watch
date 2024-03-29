variable "source_email" {
  description = "The email address to send notifications from"
  type        = string
}

variable "destination_emails" {
  description = "The email addresses to send notifications to"
  type        = list(string)
}
