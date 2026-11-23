variable "aws_region" {
  description = "AWS region for the ECR repositories."
  type        = string
  default     = "us-east-1"
}

variable "project_name" {
  description = "Project name used for tagging."
  type        = string
  default     = "mg-k8s-platform-02"
}

variable "environment" {
  description = "Environment name used for tagging."
  type        = string
  default     = "dev"
}

variable "frontend_repository_name" {
  description = "ECR repository name for the frontend image."
  type        = string
  default     = "mg-k8s-platform-02-frontend"
}

variable "backend_repository_name" {
  description = "ECR repository name for the backend API image."
  type        = string
  default     = "mg-k8s-platform-02-api"
}

variable "extra_tags" {
  description = "Additional tags to apply to all resources."
  type        = map(string)
  default     = {}
}
