resource "aws_s3_bucket" "bronze-new" {
  bucket = "price-watch-bronze-${var.environment}"

  lifecycle {
    prevent_destroy = true
  }

  tags = {
    "Environment" : "${var.environment}"
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
