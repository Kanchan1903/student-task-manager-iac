# Automated Deployment of a Serverless Student Task Management Application Using Terraform-Based Infrastructure as Code

> Mini Project | Cloud Computing | Infrastructure as Code (IaC)

---

## Project Overview

This project demonstrates the complete **Infrastructure as Code (IaC)** lifecycle using **Terraform** to provision a serverless **Student Task Management Application** on **Cloudflare Workers** with **Workers KV** persistent storage.

All cloud resources are created, modified, and destroyed exclusively through Terraform — no manual dashboard configuration.

---

## Architecture

```
Developer / Student
        |
     git push
        |
        v
 GitHub Repository
        |
        v
  GitHub Actions
        |
        v
    Terraform
        |
  Cloudflare Provider
        |
   +----+----+
   |         |
   v         v
Cloudflare  Workers KV
 Worker     (student_tasks)
   |         |
   +----+----+
        |
        v
 Student Task Manager
        |
        v
    End User
```

---

## Project Structure

```
student-task-manager-iac/
|
+-- terraform/
|   +-- providers.tf              # Cloudflare Terraform provider config
|   +-- main.tf                   # KV namespace + Worker + binding
|   +-- variables.tf              # Input variables
|   +-- outputs.tf                # Output values after apply
|   +-- terraform.tfvars.example  # Template for your tfvars file
|
+-- application/
|   +-- worker.js                 # Cloudflare Worker (API + embedded frontend)
|
+-- .github/
|   +-- workflows/
|       +-- deploy.yml            # GitHub Actions CI/CD pipeline
|
+-- screenshots/                  # Place all required screenshots here
|
+-- .gitignore
+-- README.md
```

---

## Technologies Used

| Component | Technology |
|-----------|-----------|
| Infrastructure as Code | Terraform |
| Cloud Platform | Cloudflare |
| Compute | Cloudflare Workers |
| Data Storage | Cloudflare Workers KV |
| Application | HTML, CSS, JavaScript |
| API | JavaScript / Cloudflare Worker |
| Version Control | Git |
| Repository | GitHub |
| CI/CD | GitHub Actions |

---

## Functional Features

| Feature | Description |
|---------|-------------|
| FR1: Add Task | Create a task with title, priority, and status |
| FR2: View Tasks | Display all tasks in a table with live stats |
| FR3: Update Task | Change a task's status inline |
| FR4: Delete Task | Remove a task with confirmation |
| FR5: Persistent Storage | All data stored in Cloudflare Workers KV |

---

## REST API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/tasks` | List all tasks |
| `POST` | `/api/tasks` | Create a new task |
| `GET` | `/api/tasks/:id` | Get a single task |
| `PUT` | `/api/tasks/:id` | Update a task |
| `DELETE` | `/api/tasks/:id` | Delete a task |

### Example: Create Task

```http
POST /api/tasks
Content-Type: application/json

{
  "title": "Submit Cloud Computing Assignment",
  "priority": "High",
  "status": "Pending"
}
```

### Example: Response

```json
{
  "success": true,
  "message": "Task created successfully.",
  "task": {
    "id": "T1699123456789",
    "title": "Submit Cloud Computing Assignment",
    "priority": "High",
    "status": "Pending",
    "createdAt": "2026-11-05T10:00:00.000Z"
  }
}
```

---

## Infrastructure Resources (Terraform)

```
Terraform
    |
    +---- cloudflare_workers_kv_namespace  "tasks"        (Workers KV)
    |
    +---- cloudflare_worker_script         "task_manager" (Cloudflare Worker)
    |
    +---- kv_namespace_binding             "TASKS_KV"     (Worker/KV binding)
    |
    +---- plain_text_binding               "ENVIRONMENT"  (env variable)
```

---

## Step-by-Step Setup

### Prerequisites

- Terraform >= 1.6.0 installed
- Git installed
- Cloudflare account (free plan is sufficient)
- GitHub account

### Step 1: Clone the Repository

```bash
git clone https://github.com/<your-username>/student-task-manager-iac.git
cd student-task-manager-iac
```

### Step 2: Create Cloudflare API Token

1. Go to: https://dash.cloudflare.com/profile/api-tokens
2. Click **Create Token**
3. Use **Custom Token** with these permissions:
   - `Account > Workers Scripts > Edit`
   - `Account > Workers KV Storage > Edit`
4. Copy the token

### Step 3: Get Your Cloudflare Account ID

Found in: Cloudflare Dashboard > any domain > right sidebar, or via:
https://dash.cloudflare.com → Overview page URL contains your account ID.

### Step 4: Create Your tfvars File

```bash
cd terraform
cp terraform.tfvars.example terraform.tfvars
# Edit terraform.tfvars with your account_id
```

Set the API token as an environment variable (never in a file):

```powershell
# Windows PowerShell
$env:TF_VAR_cloudflare_api_token = "your-api-token-here"
```

```bash
# Linux / macOS
export TF_VAR_cloudflare_api_token="your-api-token-here"
```

### Step 5: Terraform IaC Lifecycle

```bash
# 1. Initialize Terraform (download Cloudflare provider)
terraform init

# 2. Format code to standard style
terraform fmt

# 3. Validate configuration
terraform validate

# 4. Preview what will be created
terraform plan

# 5. Create the infrastructure
terraform apply

# 6. View created resources and outputs
terraform show
```

### Step 6: Access the Application

After `terraform apply` completes, check the output for `application_url`.

Replace `<your-subdomain>` with your Cloudflare workers.dev subdomain.

---

## CI/CD with GitHub Actions

### Setup GitHub Secrets

1. Go to: GitHub repo > **Settings** > **Secrets and variables** > **Actions**
2. Add these secrets:

| Secret Name | Value |
|-------------|-------|
| `CLOUDFLARE_API_TOKEN` | Your Cloudflare API token |
| `CLOUDFLARE_ACCOUNT_ID` | Your Cloudflare account ID |

### How CI/CD Works

```
git push (to main)
        |
        v
  GitHub Actions triggers
        |
        v
  terraform init
        |
        v
  terraform validate
        |
        v
  terraform plan
        |
        v
  terraform apply (auto-approved)
        |
        v
  Cloudflare updated
```

Pull requests run `plan` only (no `apply`) for safe review.

---

## Infrastructure Modification Demonstration

```bash
# Edit variables.tf or terraform.tfvars to change worker_name or environment
# Then run:
terraform plan    # Observe what will change (~modify)
terraform apply   # Apply the change
```

---

## Destroy and Recreate

```bash
# Destroy all infrastructure
terraform plan -destroy   # Preview what will be removed
terraform destroy         # Remove everything

# Verify removal in Cloudflare dashboard

# Recreate from scratch (no manual steps needed)
terraform plan
terraform apply
```

This demonstrates the core IaC principle:
**Infrastructure defined in code can be recreated identically at any time.**

---

## Terraform Commands Reference

| Command | Purpose |
|---------|---------|
| `terraform init` | Download provider plugins, initialize working directory |
| `terraform fmt` | Format .tf files to standard style |
| `terraform validate` | Check configuration for syntax/logic errors |
| `terraform plan` | Preview changes (+ create, ~ modify, - destroy) |
| `terraform apply` | Provision/update infrastructure |
| `terraform show` | Display current state |
| `terraform output` | Show output values |
| `terraform plan -destroy` | Preview destruction |
| `terraform destroy` | Remove all managed infrastructure |

---

## Security Notes

- API tokens are **never** stored in Terraform source files
- `terraform.tfvars` is in `.gitignore` and never committed
- `*.tfstate` files are in `.gitignore` (may contain sensitive values)
- Cloudflare credentials are stored only as GitHub Secrets
- The Cloudflare API token uses minimum required permissions (least privilege)

---

## Task Data Model

```
id         : String  — auto-generated (e.g. T1699123456789)
title      : String  — required
priority   : String  — High | Medium | Low
status     : String  — Pending | In Progress | Completed
createdAt  : String  — ISO 8601 timestamp (auto-generated)
```

---

## Example Tasks

| Task ID | Title | Priority | Status |
|---------|-------|----------|--------|
| T101 | Complete Cloud Computing Assignment | High | Pending |
| T102 | Prepare Project Presentation | Medium | In Progress |
| T103 | Submit Final Year Project Report | High | Pending |
| T104 | Attend Project Viva | High | Completed |
| T105 | Upload Laboratory Assignment | Low | Pending |

---

## Screenshots Required

Place all screenshots in the `screenshots/` folder:

- [ ] Terraform installation (`terraform --version`)
- [ ] `terraform init`
- [ ] `terraform validate`
- [ ] `terraform plan` (with resources highlighted)
- [ ] `terraform apply` (Apply complete!)
- [ ] Cloudflare Worker in dashboard
- [ ] Workers KV namespace in dashboard
- [ ] Working web application
- [ ] Create task operation
- [ ] Update task operation
- [ ] Delete task operation
- [ ] GitHub repository
- [ ] GitHub Actions execution (green checkmark)
- [ ] `terraform destroy` (Destroy complete!)
- [ ] Infrastructure recreation (`terraform apply` after destroy)
