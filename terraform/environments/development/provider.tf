terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.6.1"
    }

    archive = {
      source  = "hashicorp/archive"
      version = "2.4.2"
    }
  }

  backend "s3" {
    bucket = "price-watch-terraform-state"
    key    = "development/terraform.tfstate"
    region = "eu-central-1"
  }

  required_version = ">= 1.2.0"
}

provider "aws" {
  region = "eu-central-1"
}
