locals {
  lambda_s3_key = "${var.lambda_name}-${var.environment}"
}

resource "aws_lambda_function" "lambda" {
  function_name = "price-watch-lambda-${var.lambda_name}-${var.environment}"
  role          = aws_iam_role.iam_for_lambda.arn

  handler  = "index.handler"
  filename = data.archive_file.lambda_dummy.output_path
  runtime  = "nodejs18.x"

  environment {
    variables = {
      Environment = "${var.environment}"
    }
  }
}

# Build a dummy payload so we can create a Lambda
data "archive_file" "lambda_dummy" {
  type        = "zip"
  output_path = "${path.module}/lambda_function_payload.zip"

  source {
    content  = "dummy"
    filename = "dummy.txt"
  }
}

# Place the dummy payload under the expected Lambda bucket and key
resource "aws_s3_object" "lambda_dummy_s3" {
  bucket = var.lambda_bucket_id
  key    = local.lambda_s3_key
  source = data.archive_file.lambda_dummy.output_path
}


# Our Lambda assume role
resource "aws_iam_role" "iam_for_lambda" {
  name               = "iam-role-${var.lambda_name}-${var.environment}"
  assume_role_policy = data.aws_iam_policy_document.assume_role.json
}

data "aws_iam_policy_document" "assume_role" {
  statement {
    effect = "Allow"

    principals {
      type        = "Service"
      identifiers = ["lambda.amazonaws.com"]
    }

    actions = ["sts:AssumeRole"]
  }
}

# CloudWatch Log Group
resource "aws_cloudwatch_log_group" "log_group" {
  name = "/aws/lambda/${var.lambda_name}-${var.environment}"
}

data "aws_iam_policy_document" "lambda_logging" {
  statement {
    effect = "Allow"

    actions = [
      "logs:CreateLogGroup",
      "logs:CreateLogStream",
      "logs:PutLogEvents",
    ]

    resources = ["arn:aws:logs:*:*:*"]
  }
}

resource "aws_iam_policy" "lambda_logging" {
  name        = "price-watch-iam-policy-${var.lambda_name}-lambda-logging-${var.environment}"
  path        = "/"
  description = "IAM policy for logging from a lambda"
  policy      = data.aws_iam_policy_document.lambda_logging.json
}

resource "aws_iam_role_policy_attachment" "lambda_logs" {
  role       = aws_iam_role.iam_for_lambda.name
  policy_arn = aws_iam_policy.lambda_logging.arn
}
