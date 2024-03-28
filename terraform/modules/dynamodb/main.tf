resource "aws_dynamodb_table" "seen-offers-v1" {
  name           = "SeenOffersV1"
  hash_key       = "Key"
  read_capacity  = 1
  write_capacity = 1

  attribute {
    name = "Key"
    type = "S"
  }

  tags = {
    Name        = "seen-offers-v1"
    Environment = var.environment
  }
}
