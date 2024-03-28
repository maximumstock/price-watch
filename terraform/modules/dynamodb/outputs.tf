output "table_arn" {
  value       = aws_dynamodb_table.seen-offers-v1.arn
  description = "Identifier of the managed DynamoDB table"
}
