terraform {
  # >= 1.10 is required for native S3 state locking (use_lockfile in backend.tf).
  required_version = ">= 1.10.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  # State is remote (S3). See backend.tf and docs/deployment-guide.md section 4.
}
