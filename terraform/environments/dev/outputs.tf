output "frontend_repository_url" {
  description = "ECR URL for the frontend image."
  value       = module.ecr.repository_urls[var.frontend_repository_name]
}

output "backend_repository_url" {
  description = "ECR URL for the backend API image."
  value       = module.ecr.repository_urls[var.backend_repository_name]
}
