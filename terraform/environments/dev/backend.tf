# Remote state in S3 with native S3 locking (use_lockfile, Terraform >= 1.10).
# No DynamoDB table is needed. The lock object is "<key>.tflock" in the same bucket.
#
# Bucket verified on 2026-11-28 (AWS console, account owner session):
#   region us-east-1, SSE-S3 default encryption, Block Public Access ON,
#   Object Ownership "Bucket owner enforced", no objects (no prior state).
#
# CI also checks that this bucket matches the TF_STATE_BUCKET repository variable.
terraform {
  backend "s3" {
    bucket       = "mg-k8s-platform-02-terraform-state-2026"
    key          = "mg-k8s-platform-02/terraform.tfstate"
    region       = "us-east-1"
    encrypt      = true
    use_lockfile = true
  }
}
