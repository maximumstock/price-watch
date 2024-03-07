resource "aws_s3_bucket" "bronze" {
  bucket = "bronze-${var.environment}"
  tags = {
    "Environment" : "${var.environment}"
  }

}

resource "aws_s3_bucket_lifecycle_configuration" "bronze-lifecycle" {
  bucket = aws_s3_bucket.bronze.id

  rule {
    id     = "archive"
    status = "Enabled"

    transition {
      days          = 30
      storage_class = "ONEZONE_IA"
    }
  }
}
