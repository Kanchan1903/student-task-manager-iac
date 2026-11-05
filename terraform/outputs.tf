# ============================================================
# outputs.tf
# Returns useful information after a successful terraform apply.
# These values help students verify what was created and
# find the application URL.
# ============================================================

output "worker_name" {
  description = "The name of the deployed Cloudflare Worker."
  value       = cloudflare_workers_script.task_manager.name
}

output "kv_namespace_id" {
  description = "The ID of the Workers KV namespace for task storage."
  value       = cloudflare_workers_kv_namespace.tasks.id
}

output "kv_namespace_title" {
  description = "The title of the Workers KV namespace."
  value       = cloudflare_workers_kv_namespace.tasks.title
}

output "application_url" {
  description = "The public URL of the deployed Student Task Manager application."
  value       = "https://${cloudflare_workers_script.task_manager.name}.<your-subdomain>.workers.dev"
}

output "environment" {
  description = "The deployment environment."
  value       = var.environment
}
