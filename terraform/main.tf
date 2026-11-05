# ============================================================
# main.tf
# Defines the actual cloud infrastructure resources:
#   1. Workers KV Namespace  — persistent key-value storage
#   2. Cloudflare Worker     — serverless compute
#   3. Worker/KV Binding     — connects the Worker to KV
# ============================================================

# ----------------------------------------------------------
# Resource 1: Workers KV Namespace
# This creates a global key-value store called "student_tasks"
# where all task records will be persisted.
# ----------------------------------------------------------
resource "cloudflare_workers_kv_namespace" "tasks" {
  account_id = var.account_id
  title      = "${var.kv_namespace_name}_${var.environment}"
}

# ----------------------------------------------------------
# Resource 2: Cloudflare Worker Script
# Deploys the application code to Cloudflare's edge network.
# The KV namespace binding (Resource 3) is defined inline
# so the Worker can access TASKS_KV inside the script.
# ----------------------------------------------------------
resource "cloudflare_worker_script" "task_manager" {
  account_id = var.account_id
  name       = "${var.worker_name}-${var.environment}"
  content    = file("${path.module}/../application/worker.js")
  module     = true

  # ----------------------------------------------------------
  # Resource 3: Worker / KV Binding
  # This binding exposes the KV namespace to the Worker
  # under the name TASKS_KV.
  # Inside worker.js: env.TASKS_KV.get(...) / .put(...) etc.
  # ----------------------------------------------------------
  kv_namespace_binding {
    name         = "TASKS_KV"
    namespace_id = cloudflare_workers_kv_namespace.tasks.id
  }

  # Pass the environment name as a plain-text variable
  plain_text_binding {
    name = "ENVIRONMENT"
    text = var.environment
  }
}
