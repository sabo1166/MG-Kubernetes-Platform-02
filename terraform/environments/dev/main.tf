locals {
  tags = merge({
    Project     = var.project_name
    Environment = var.environment
    ManagedBy   = "terraform"
    Owner       = "MG"
  }, var.extra_tags)
}

module "ecr" {
  source = "../../modules/ecr"

  repository_names = [
    var.frontend_repository_name,
    var.backend_repository_name,
  ]
  tags = local.tags
}
