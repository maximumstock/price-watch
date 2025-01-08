resource "aws_s3_bucket" "bronze-new" {
  bucket = "price-watch-bronze-${var.environment}"

  lifecycle {
    prevent_destroy = true
  }

  tags = {
    "Environment" : "${var.environment}"
  }
}

// Allow access to the bucket to the Lambda IAM role
resource "aws_s3_bucket_policy" "bronze-bucket-lambda-access" {
  bucket = aws_s3_bucket.bronze-new.id
  policy = data.aws_iam_policy_document.lambda_access.json
}

data "aws_iam_policy_document" "lambda_access" {
  statement {

    effect = "Allow"
    principals {
      type        = "AWS"
      identifiers = [var.lambda_role_arn]
    }

    actions = [
      "s3:ListBucket",
      "s3:PutObject",
    ]

    resources = [
      aws_s3_bucket.bronze-new.arn,
      "${aws_s3_bucket.bronze-new.arn}/*",
    ]
  }
}

# A place to store the Lambdas
resource "aws_s3_bucket" "lambda_bucket_new" {
  bucket = "price-watch-lambda-bucket-${var.environment}"

  lifecycle {
    prevent_destroy = true
  }

  tags = {
    "Environment" : "${var.environment}"
  }
}
