# ============================================================
# variables.tf
# Declares all configurable inputs for the infrastructure.
# Hard-coding values is avoided by using variables.
# ============================================================

variable "cloudflare_api_token" {
  description = "Cloudflare API token with Workers and KV permissions. Never hard-code this value."
  type        = string
  sensitive   = true
}

variable "account_id" {
  description = "Your Cloudflare account ID (found in the Cloudflare dashboard URL or overview page)."
  type        = string
}

variable "worker_name" {
  description = "Name of the Cloudflare Worker to be created."
  type        = string
  default     = "student-task-manager"
}

variable "kv_namespace_name" {
  description = "Title of the Workers KV namespace used for task storage."
  type        = string
  default     = "student_tasks"
}

variable "environment" {
  description = "Deployment environment label (e.g. production, dev, test)."
  type        = string
  default     = "production"
}
