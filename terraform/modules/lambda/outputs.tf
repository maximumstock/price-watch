output "lambda_arn" {
  value       = aws_lambda_function.lambda.arn
  description = "Identifier of the managed Lambda function"
}
