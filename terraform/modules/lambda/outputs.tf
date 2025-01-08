output "lambda_arn" {
  value       = aws_lambda_function.lambda.arn
  description = "Identifier of the managed Lambda function"
}

output "lambda_role_arn" {
  value       = aws_iam_role.iam_for_lambda.arn
  description = "Identifier of the IAM role of our Lambdas"
}
