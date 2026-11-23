# Credentials come from the environment only:
# AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY (and AWS_REGION / var.aws_region).
provider "aws" {
  region = var.aws_region

  default_tags {
    tags = local.tags
  }
}
