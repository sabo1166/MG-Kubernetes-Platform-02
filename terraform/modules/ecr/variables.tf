variable "repository_names" {
  description = "Names of the private ECR repositories to create."
  type        = set(string)

  validation {
    condition     = alltrue([for n in var.repository_names : can(regex("^[a-z0-9]+([._/-][a-z0-9]+)*$", n))])
    error_message = "Repository names must be lowercase alphanumerics separated by ., _, - or /."
  }
}

variable "tags" {
  description = "Tags applied to every repository."
  type        = map(string)
  default     = {}
}
