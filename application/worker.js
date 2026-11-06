/**
 * worker.js — Cloudflare Worker
 *
 * This single file serves as both the web server and REST API
 * for the Student Task Management Application.
 *
 * Routing:
 *   GET  /                → Serves modern animated HTML frontend
 *   GET  /api/tasks       → List all tasks
 *   POST /api/tasks       → Create a task
 *   GET  /api/tasks/:id   → Get a single task
 *   PUT  /api/tasks/:id   → Update a task
 *   DELETE /api/tasks/:id → Delete a task
 *
 * Storage: Cloudflare Workers KV (bound as TASKS_KV)
 */

// ─── Embedded Frontend HTML ───────────────────────────────────────────────────
const HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Student Task Manager | Cloudflare & Terraform</title>
  <!-- Google Fonts & Font Awesome Icons -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">

  <style>
    /* ── Design Tokens & Theme ── */
    :root {
      --primary: #6366f1;
      --primary-hover: #4f46e5;
      --primary-glow: rgba(99, 102, 241, 0.35);
      --secondary: #ec4899;
      --bg-dark: #0b0f19;
      --card-bg: rgba(22, 28, 45, 0.72);
      --card-border: rgba(255, 255, 255, 0.08);
      --text-main: #f8fafc;
      --text-muted: #94a3b8;
      --success: #10b981;
      --warning: #f59e0b;
      --danger: #ef4444;
      --info: #06b6d4;
    }

    /* ── Base Styling & Reset ── */
    *, *::before, *::after {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    body {
      font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif;
      background: var(--bg-dark);
      background-image: 
        radial-gradient(at 0% 0%, rgba(99, 102, 241, 0.18) 0px, transparent 50%),
        radial-gradient(at 100% 0%, rgba(236, 72, 153, 0.15) 0px, transparent 50%),
        radial-gradient(at 50% 100%, rgba(16, 185, 129, 0.1) 0px, transparent 50%);
      background-attachment: fixed;
      color: var(--text-main);
      min-height: 100vh;
      line-height: 1.5;
      overflow-x: hidden;
    }

    /* ── Top Header / Hero ── */
    header {
      position: relative;
      padding: 3rem 1.5rem 2.5rem;
      text-align: center;
      background: linear-gradient(180deg, rgba(30, 41, 59, 0.6) 0%, transparent 100%);
      border-bottom: 1px solid var(--card-border);
      backdrop-filter: blur(12px);
    }
    .header-badge {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      background: rgba(99, 102, 241, 0.15);
      border: 1px solid rgba(99, 102, 241, 0.35);
      color: #a5b4fc;
      padding: 0.35rem 0.9rem;
      border-radius: 9999px;
      font-size: 0.8rem;
      font-weight: 600;
      letter-spacing: 0.05em;
      text-transform: uppercase;
      margin-bottom: 1rem;
      animation: pulseGlow 3s infinite alternate;
    }
    @keyframes pulseGlow {
      0% { box-shadow: 0 0 10px rgba(99, 102, 241, 0.2); }
      100% { box-shadow: 0 0 25px rgba(236, 72, 153, 0.35); }
    }
    header h1 {
      font-size: clamp(2rem, 4vw, 2.85rem);
      font-weight: 800;
      letter-spacing: -0.03em;
      background: linear-gradient(135deg, #ffffff 30%, #a5b4fc 70%, #f472b6 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      margin-bottom: 0.5rem;
    }
    header p {
      color: var(--text-muted);
      font-size: 1rem;
      max-width: 650px;
      margin: 0 auto;
    }
    .tech-pills {
      display: flex;
      justify-content: center;
      gap: 0.75rem;
      margin-top: 1rem;
      flex-wrap: wrap;
    }
    .tech-pill {
      font-size: 0.75rem;
      padding: 0.25rem 0.75rem;
      border-radius: 6px;
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.1);
      color: #cbd5e1;
    }

    /* ── Main Container ── */
    .container {
      max-width: 1140px;
      margin: -1.5rem auto 3rem;
      padding: 0 1.25rem;
      position: relative;
      z-index: 10;
    }

    /* ── Glassmorphism Cards ── */
    .glass-card {
      background: var(--card-bg);
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
      border: 1px solid var(--card-border);
      border-radius: 20px;
      padding: 1.75rem;
      margin-bottom: 2rem;
      box-shadow: 0 10px 30px -10px rgba(0, 0, 0, 0.5);
      transition: border-color 0.3s ease, transform 0.2s ease;
    }
    .glass-card:hover {
      border-color: rgba(99, 102, 241, 0.3);
    }
    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1.25rem;
    }
    .card-header h2 {
      font-size: 1.25rem;
      font-weight: 700;
      color: #fff;
      display: flex;
      align-items: center;
      gap: 0.6rem;
    }

    /* ── Quick Stats Grid ── */
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 1rem;
      margin-bottom: 2rem;
    }
    .stat-card {
      background: var(--card-bg);
      border: 1px solid var(--card-border);
      backdrop-filter: blur(12px);
      padding: 1.2rem 1.4rem;
      border-radius: 16px;
      display: flex;
      align-items: center;
      gap: 1.1rem;
      transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.3s ease;
    }
    .stat-card:hover {
      transform: translateY(-4px);
      box-shadow: 0 12px 25px -8px rgba(0, 0, 0, 0.5);
    }
    .stat-icon {
      width: 48px;
      height: 48px;
      border-radius: 14px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.35rem;
    }
    .stat-total .stat-icon    { background: rgba(99, 102, 241, 0.15); color: #818cf8; }
    .stat-pending .stat-icon  { background: rgba(6, 182, 212, 0.15); color: #22d3ee; }
    .stat-progress .stat-icon { background: rgba(245, 158, 11, 0.15); color: #fbbf24; }
    .stat-done .stat-icon     { background: rgba(16, 185, 129, 0.15); color: #34d399; }
    .stat-overdue .stat-icon  { background: rgba(239, 68, 68, 0.15); color: #f87171; }
    .stat-info h3 {
      font-size: 0.8rem;
      font-weight: 600;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .stat-info .stat-number {
      font-size: 1.6rem;
      font-weight: 800;
      color: #fff;
      line-height: 1.2;
    }

    /* ── Add Task Form ── */
    .form-grid {
      display: grid;
      grid-template-columns: 2.2fr 1fr 1fr 1.3fr auto;
      gap: 1rem;
      align-items: end;
    }
    @media (max-width: 960px) {
      .form-grid {
        grid-template-columns: 1fr 1fr;
      }
      .form-grid .form-span-2 {
        grid-column: span 2;
      }
      .form-grid .btn-submit-wrap {
        grid-column: span 2;
      }
    }
    @media (max-width: 560px) {
      .form-grid {
        grid-template-columns: 1fr;
      }
      .form-grid .form-span-2,
      .form-grid .btn-submit-wrap {
        grid-column: span 1;
      }
    }
    .form-group {
      display: flex;
      flex-direction: column;
      gap: 0.4rem;
    }
    .form-group label {
      font-size: 0.75rem;
      font-weight: 700;
      color: #94a3b8;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      display: flex;
      align-items: center;
      gap: 0.35rem;
    }
    .form-control {
      background: rgba(15, 23, 42, 0.65);
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 12px;
      color: #fff;
      padding: 0.75rem 1rem;
      font-size: 0.92rem;
      outline: none;
      transition: all 0.25s ease;
      font-family: inherit;
    }
    .form-control:focus {
      border-color: var(--primary);
      box-shadow: 0 0 0 3px var(--primary-glow);
      background: rgba(15, 23, 42, 0.95);
    }
    .form-control option {
      background: #1e293b;
      color: #fff;
    }

    /* ── Controls & Filter Bar ── */
    .toolbar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 1rem;
      margin-bottom: 1.25rem;
      flex-wrap: wrap;
    }
    .search-box {
      position: relative;
      flex: 1;
      min-width: 240px;
    }
    .search-box i {
      position: absolute;
      left: 1rem;
      top: 50%;
      transform: translateY(-50%);
      color: var(--text-muted);
      font-size: 0.9rem;
    }
    .search-box input {
      width: 100%;
      padding-left: 2.6rem;
    }
    .filter-pills {
      display: flex;
      gap: 0.4rem;
      background: rgba(15, 23, 42, 0.65);
      padding: 0.3rem;
      border-radius: 12px;
      border: 1px solid rgba(255, 255, 255, 0.08);
    }
    .filter-btn {
      background: transparent;
      border: none;
      color: var(--text-muted);
      padding: 0.4rem 0.9rem;
      font-size: 0.8rem;
      font-weight: 600;
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.2s ease;
    }
    .filter-btn.active, .filter-btn:hover {
      background: rgba(99, 102, 241, 0.25);
      color: #fff;
    }

    /* ── Modern Animated Buttons ── */
    .btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      padding: 0.75rem 1.4rem;
      border-radius: 12px;
      font-weight: 600;
      font-size: 0.88rem;
      cursor: pointer;
      border: none;
      outline: none;
      transition: all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
      position: relative;
      overflow: hidden;
    }
    .btn::after {
      content: '';
      position: absolute;
      top: 50%;
      left: 50%;
      width: 120%;
      height: 120%;
      background: radial-gradient(circle, rgba(255,255,255,0.2) 10%, transparent 60%);
      transform: translate(-50%, -50%) scale(0);
      opacity: 0;
      transition: transform 0.5s, opacity 0.3s;
    }
    .btn:active::after {
      transform: translate(-50%, -50%) scale(1);
      opacity: 1;
      transition: 0s;
    }
    .btn:hover {
      transform: translateY(-2px);
    }
    .btn:active {
      transform: translateY(0);
    }
    .btn-primary {
      background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
      color: #fff;
      box-shadow: 0 4px 15px var(--primary-glow);
    }
    .btn-primary:hover {
      background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
      box-shadow: 0 6px 20px rgba(99, 102, 241, 0.5);
    }
    .btn-sm {
      padding: 0.38rem 0.7rem;
      font-size: 0.78rem;
      border-radius: 8px;
    }
    .btn-action-del {
      background: rgba(239, 68, 68, 0.15);
      color: #f87171;
      border: 1px solid rgba(239, 68, 68, 0.3);
    }
    .btn-action-del:hover {
      background: #ef4444;
      color: #fff;
    }

    /* ── Tasks Table / Cards ── */
    .table-container {
      overflow-x: auto;
      border-radius: 14px;
      border: 1px solid rgba(255, 255, 255, 0.06);
      background: rgba(11, 15, 25, 0.5);
    }
    table {
      width: 100%;
      border-collapse: separate;
      border-spacing: 0;
      font-size: 0.9rem;
    }
    thead th {
      background: rgba(30, 41, 59, 0.7);
      padding: 0.9rem 1.1rem;
      text-align: left;
      font-size: 0.73rem;
      font-weight: 700;
      color: #94a3b8;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      border-bottom: 1px solid var(--card-border);
    }
    tbody tr {
      transition: all 0.25s ease;
      border-bottom: 1px solid rgba(255, 255, 255, 0.04);
      animation: fadeInRow 0.4s ease forwards;
    }
    tbody tr:hover {
      background: rgba(99, 102, 241, 0.06);
    }
    @keyframes fadeInRow {
      from { opacity: 0; transform: translateY(6px); }
      to { opacity: 1; transform: translateY(0); }
    }
    tbody td {
      padding: 1rem 1.1rem;
      vertical-align: middle;
      border-bottom: 1px solid rgba(255, 255, 255, 0.04);
    }

    /* ── Table Elements ── */
    .task-id-badge {
      font-family: 'SFMono-Regular', Consolas, monospace;
      font-size: 0.78rem;
      background: rgba(255, 255, 255, 0.06);
      border: 1px solid rgba(255, 255, 255, 0.1);
      padding: 0.25rem 0.5rem;
      border-radius: 6px;
      color: #cbd5e1;
    }
    .task-title {
      font-weight: 600;
      color: #f1f5f9;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    .task-title.completed-title {
      text-decoration: line-through;
      color: #64748b;
    }

    /* ── Priority Badges ── */
    .badge {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      padding: 0.3rem 0.75rem;
      border-radius: 9999px;
      font-size: 0.75rem;
      font-weight: 700;
      letter-spacing: 0.03em;
    }
    .badge-high {
      background: rgba(239, 68, 68, 0.15);
      border: 1px solid rgba(239, 68, 68, 0.3);
      color: #f87171;
    }
    .badge-medium {
      background: rgba(245, 158, 11, 0.15);
      border: 1px solid rgba(245, 158, 11, 0.3);
      color: #fbbf24;
    }
    .badge-low {
      background: rgba(16, 185, 129, 0.15);
      border: 1px solid rgba(16, 185, 129, 0.3);
      color: #34d399;
    }

    /* ── Due Date Styling ── */
    .due-pill {
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
      padding: 0.3rem 0.65rem;
      border-radius: 8px;
      font-size: 0.78rem;
      font-weight: 600;
    }
    .due-pill.overdue {
      background: rgba(239, 68, 68, 0.2);
      border: 1px solid rgba(239, 68, 68, 0.4);
      color: #fca5a5;
      animation: pulseAlert 2s infinite;
    }
    @keyframes pulseAlert {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.7; }
    }
    .due-pill.today {
      background: rgba(245, 158, 11, 0.2);
      border: 1px solid rgba(245, 158, 11, 0.4);
      color: #fde047;
    }
    .due-pill.upcoming {
      background: rgba(99, 102, 241, 0.12);
      border: 1px solid rgba(99, 102, 241, 0.25);
      color: #c7d2fe;
    }
    .due-pill.none {
      color: #64748b;
      font-style: italic;
    }

    /* ── Status Select Interactive ── */
    .status-select-wrap select {
      background: rgba(15, 23, 42, 0.8);
      border: 1px solid rgba(255, 255, 255, 0.15);
      border-radius: 8px;
      color: #e2e8f0;
      padding: 0.4rem 0.7rem;
      font-size: 0.8rem;
      font-weight: 600;
      cursor: pointer;
      outline: none;
      transition: all 0.2s;
    }
    .status-select-wrap select:focus {
      border-color: var(--primary);
      box-shadow: 0 0 0 2px var(--primary-glow);
    }

    /* ── Empty & Loading States ── */
    .empty-state {
      text-align: center;
      padding: 4rem 1rem;
      color: var(--text-muted);
    }
    .empty-icon {
      font-size: 3.5rem;
      margin-bottom: 1rem;
      background: linear-gradient(135deg, #6366f1, #ec4899);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      animation: bounceFloat 3s ease-in-out infinite alternate;
    }
    @keyframes bounceFloat {
      0% { transform: translateY(0); }
      100% { transform: translateY(-8px); }
    }
    .spinner {
      display: inline-block;
      width: 32px;
      height: 32px;
      border: 3px solid rgba(255, 255, 255, 0.1);
      border-radius: 50%;
      border-top-color: var(--primary);
      animation: spin 0.8s linear infinite;
      margin-bottom: 0.5rem;
    }
    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    /* ── Modern Toast Notification ── */
    #toast {
      position: fixed;
      bottom: 2rem;
      right: 2rem;
      background: rgba(22, 28, 45, 0.95);
      border: 1px solid var(--card-border);
      color: white;
      padding: 1rem 1.4rem;
      border-radius: 14px;
      font-size: 0.9rem;
      font-weight: 600;
      display: flex;
      align-items: center;
      gap: 0.75rem;
      box-shadow: 0 15px 35px rgba(0,0,0,0.4);
      backdrop-filter: blur(12px);
      transform: translateY(120px) scale(0.9);
      opacity: 0;
      transition: all 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
      z-index: 9999;
    }
    #toast.show {
      transform: translateY(0) scale(1);
      opacity: 1;
    }
    #toast.success { border-left: 4px solid var(--success); }
    #toast.error   { border-left: 4px solid var(--danger); }
    #toast.info    { border-left: 4px solid var(--info); }
  </style>
</head>
<body>

<header>
  <div class="header-badge">
    <i class="fa-solid fa-cloud"></i> Serverless Edge Deployment
  </div>
  <h1>Student Task Manager</h1>
  <p>Automated cloud infrastructure powered by <strong>Terraform</strong> on <strong>Cloudflare Workers &amp; KV</strong></p>
  <div class="tech-pills">
    <span class="tech-pill"><i class="fa-solid fa-code-branch"></i> Git CI/CD</span>
    <span class="tech-pill"><i class="fa-solid fa-bolt"></i> Workers KV</span>
    <span class="tech-pill"><i class="fa-solid fa-cubes"></i> Terraform IaC</span>
    <span class="tech-pill"><i class="fa-solid fa-calendar-check"></i> Due Date Tracking</span>
  </div>
</header>

<div class="container">

  <!-- Stats Grid -->
  <div class="stats-grid" id="statsGrid">
    <div class="stat-card stat-total">
      <div class="stat-icon"><i class="fa-solid fa-layer-group"></i></div>
      <div class="stat-info">
        <h3>Total Tasks</h3>
        <div class="stat-number" id="statTotal">0</div>
      </div>
    </div>
    <div class="stat-card stat-pending">
      <div class="stat-icon"><i class="fa-regular fa-clock"></i></div>
      <div class="stat-info">
        <h3>Pending</h3>
        <div class="stat-number" id="statPending">0</div>
      </div>
    </div>
    <div class="stat-card stat-progress">
      <div class="stat-icon"><i class="fa-solid fa-spinner"></i></div>
      <div class="stat-info">
        <h3>In Progress</h3>
        <div class="stat-number" id="statProgress">0</div>
      </div>
    </div>
    <div class="stat-card stat-done">
      <div class="stat-icon"><i class="fa-solid fa-circle-check"></i></div>
      <div class="stat-info">
        <h3>Completed</h3>
        <div class="stat-number" id="statCompleted">0</div>
      </div>
    </div>
    <div class="stat-card stat-overdue">
      <div class="stat-icon"><i class="fa-solid fa-triangle-exclamation"></i></div>
      <div class="stat-info">
        <h3>Overdue</h3>
        <div class="stat-number" id="statOverdue">0</div>
      </div>
    </div>
  </div>

  <!-- Add Task Card -->
  <div class="glass-card">
    <div class="card-header">
      <h2><i class="fa-solid fa-wand-magic-sparkles" style="color: #a5b4fc;"></i> Create New Academic Task</h2>
    </div>
    <form id="taskForm" onsubmit="event.preventDefault(); addTask();" class="form-grid">
      <div class="form-group form-span-2">
        <label><i class="fa-solid fa-pen"></i> Task Title</label>
        <input type="text" id="taskTitle" class="form-control" placeholder="e.g. Complete Cloud Computing Assignment" required />
      </div>

      <div class="form-group">
        <label><i class="fa-solid fa-flag"></i> Priority</label>
        <select id="taskPriority" class="form-control">
          <option value="High">🔴 High</option>
          <option value="Medium" selected>🟡 Medium</option>
          <option value="Low">🟢 Low</option>
        </select>
      </div>

      <div class="form-group">
        <label><i class="fa-solid fa-calendar-days"></i> Due Date</label>
        <input type="date" id="taskDueDate" class="form-control" />
      </div>

      <div class="form-group">
        <label><i class="fa-solid fa-bars-progress"></i> Status</label>
        <select id="taskStatus" class="form-control">
          <option value="Pending" selected>Pending</option>
          <option value="In Progress">In Progress</option>
          <option value="Completed">Completed</option>
        </select>
      </div>

      <div class="form-group btn-submit-wrap">
        <label>&nbsp;</label>
        <button type="submit" class="btn btn-primary" id="btnSubmit">
          <i class="fa-solid fa-plus"></i> Add Task
        </button>
      </div>
    </form>
  </div>

  <!-- Task List Section -->
  <div class="glass-card">
    <div class="toolbar">
      <div class="search-box">
        <i class="fa-solid fa-magnifying-glass"></i>
        <input type="text" id="searchInput" class="form-control" placeholder="Search tasks by title or ID..." oninput="handleSearch()" />
      </div>
      <div class="filter-pills">
        <button class="filter-btn active" onclick="setFilter('all', this)">All</button>
        <button class="filter-btn" onclick="setFilter('Pending', this)">Pending</button>
        <button class="filter-btn" onclick="setFilter('In Progress', this)">In Progress</button>
        <button class="filter-btn" onclick="setFilter('Completed', this)">Completed</button>
      </div>
    </div>

    <div class="table-container">
      <table id="taskTable">
        <thead>
          <tr>
            <th>Task ID</th>
            <th>Title</th>
            <th>Priority</th>
            <th>Due Date</th>
            <th>Status</th>
            <th>Created</th>
            <th style="text-align: right;">Action</th>
          </tr>
        </thead>
        <tbody id="taskBody">
          <tr>
            <td colspan="7" class="empty-state">
              <div class="spinner"></div>
              <div>Fetching tasks from Cloudflare KV...</div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>

</div>

<!-- Interactive Toast -->
<div id="toast">
  <i id="toastIcon" class="fa-solid fa-circle-check"></i>
  <span id="toastMsg">Notification message</span>
</div>

<script>
  const API = '/api/tasks';
  let allTasks = [];
  let currentFilter = 'all';
  let currentSearch = '';

  // ── Toast Helper ──
  function showToast(message, type = 'success') {
    const t = document.getElementById('toast');
    const msg = document.getElementById('toastMsg');
    const icon = document.getElementById('toastIcon');

    msg.textContent = message;
    t.className = 'show ' + type;

    if (type === 'success') icon.className = 'fa-solid fa-circle-check';
    else if (type === 'error') icon.className = 'fa-solid fa-circle-xmark';
    else icon.className = 'fa-solid fa-circle-info';

    setTimeout(() => { t.className = ''; }, 3200);
  }

  // ── Priority Badge ──
  function priorityBadge(p) {
    const icon = p === 'High' ? 'fa-triangle-exclamation' : (p === 'Low' ? 'fa-arrow-down' : 'fa-minus');
    const cls  = p === 'High' ? 'badge-high' : (p === 'Low' ? 'badge-low' : 'badge-medium');
    return \`<span class="badge \${cls}"><i class="fa-solid \${icon}"></i> \${p}</span>\`;
  }

  // ── Due Date Formatter & Indicator ──
  function renderDueDate(dueDate, status) {
    if (!dueDate) return '<span class="due-pill none"><i class="fa-regular fa-calendar"></i> No Due</span>';

    const due = new Date(dueDate + 'T23:59:59');
    const today = new Date();
    today.setHours(0,0,0,0);
    const dueDay = new Date(dueDate + 'T00:00:00');

    const formatted = new Date(dueDate + 'T00:00:00').toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric'
    });

    if (status === 'Completed') {
      return \`<span class="due-pill upcoming"><i class="fa-regular fa-calendar-check"></i> \${formatted}</span>\`;
    }

    if (dueDay < today) {
      return \`<span class="due-pill overdue"><i class="fa-solid fa-clock"></i> Overdue (\${formatted})</span>\`;
    } else if (dueDay.getTime() === today.getTime()) {
      return \`<span class="due-pill today"><i class="fa-solid fa-bell"></i> Today (\${formatted})</span>\`;
    } else {
      return \`<span class="due-pill upcoming"><i class="fa-regular fa-calendar"></i> \${formatted}</span>\`;
    }
  }

  // ── Format Created Date ──
  function fmtDate(iso) {
    if (!iso) return '-';
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  // ── Escape HTML ──
  function esc(s) {
    return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  // ── Update Dashboard Statistics ──
  function updateStats(tasks) {
    const total     = tasks.length;
    const pending   = tasks.filter(t => t.status === 'Pending').length;
    const progress  = tasks.filter(t => t.status === 'In Progress').length;
    const completed = tasks.filter(t => t.status === 'Completed').length;

    // Overdue count
    const today = new Date();
    today.setHours(0,0,0,0);
    const overdue = tasks.filter(t => {
      if (t.status === 'Completed' || !t.dueDate) return false;
      const d = new Date(t.dueDate + 'T00:00:00');
      return d < today;
    }).length;

    document.getElementById('statTotal').textContent     = total;
    document.getElementById('statPending').textContent   = pending;
    document.getElementById('statProgress').textContent  = progress;
    document.getElementById('statCompleted').textContent = completed;
    document.getElementById('statOverdue').textContent   = overdue;
  }

  // ── Filter & Search Handlers ──
  function setFilter(filter, btn) {
    currentFilter = filter;
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    renderList();
  }

  function handleSearch() {
    currentSearch = document.getElementById('searchInput').value.toLowerCase().trim();
    renderList();
  }

  // ── Render Task Table ──
  function renderList() {
    let filtered = allTasks;

    if (currentFilter !== 'all') {
      filtered = filtered.filter(t => t.status === currentFilter);
    }
    if (currentSearch) {
      filtered = filtered.filter(t =>
        (t.title && t.title.toLowerCase().includes(currentSearch)) ||
        (t.id && t.id.toLowerCase().includes(currentSearch))
      );
    }

    updateStats(allTasks);
    const tbody = document.getElementById('taskBody');

    if (filtered.length === 0) {
      tbody.innerHTML = \`
        <tr>
          <td colspan="7">
            <div class="empty-state">
              <div class="empty-icon"><i class="fa-regular fa-folder-open"></i></div>
              <h3>No tasks found</h3>
              <p style="margin-top:0.4rem; color:#64748b;">\${currentSearch || currentFilter !== 'all' ? 'Try adjusting your filters or search keywords.' : 'Add your first academic task using the form above!'}</p>
            </div>
          </td>
        </tr>\`;
      return;
    }

    tbody.innerHTML = filtered.map(t => {
      const isDone = t.status === 'Completed';
      return \`
        <tr>
          <td><span class="task-id-badge">\${t.id}</span></td>
          <td>
            <div class="task-title \${isDone ? 'completed-title' : ''}">
              \${isDone ? '<i class="fa-solid fa-check" style="color:#10b981; font-size:0.85rem;"></i>' : ''}
              \${esc(t.title)}
            </div>
          </td>
          <td>\${priorityBadge(t.priority)}</td>
          <td>\${renderDueDate(t.dueDate, t.status)}</td>
          <td>
            <div class="status-select-wrap">
              <select onchange="changeStatus('\${t.id}', this.value)">
                <option value="Pending" \${t.status === 'Pending' ? 'selected' : ''}>⏳ Pending</option>
                <option value="In Progress" \${t.status === 'In Progress' ? 'selected' : ''}>⚡ In Progress</option>
                <option value="Completed" \${t.status === 'Completed' ? 'selected' : ''}>✅ Completed</option>
              </select>
            </div>
          </td>
          <td style="color:#64748b; font-size:0.8rem;">\${fmtDate(t.createdAt)}</td>
          <td style="text-align: right;">
            <button class="btn btn-sm btn-action-del" onclick="deleteTask('\${t.id}')" title="Delete Task">
              <i class="fa-regular fa-trash-can"></i>
            </button>
          </td>
        </tr>
      \`;
    }).join('');
  }

  // ── Fetch All Tasks (GET /api/tasks) ──
  async function loadTasks() {
    try {
      const res = await fetch(API);
      const data = await res.json();
      allTasks = data.tasks || [];
      renderList();
    } catch (e) {
      document.getElementById('taskBody').innerHTML = \`
        <tr><td colspan="7" class="empty-state" style="color:#f87171;">
          <i class="fa-solid fa-circle-exclamation" style="font-size:2rem; margin-bottom:0.5rem;"></i>
          <div>Failed to connect to Cloudflare Worker API.</div>
        </td></tr>\`;
    }
  }

  // ── Add New Task (POST /api/tasks) ──
  async function addTask() {
    const titleInput = document.getElementById('taskTitle');
    const priority = document.getElementById('taskPriority').value;
    const dueDate = document.getElementById('taskDueDate').value;
    const status = document.getElementById('taskStatus').value;
    const title = titleInput.value.trim();

    if (!title) {
      showToast('Please enter a task title.', 'error');
      return;
    }

    const submitBtn = document.getElementById('btnSubmit');
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Saving...';

    try {
      const res = await fetch(API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, priority, status, dueDate })
      });
      const data = await res.json();
      if (data.success) {
        titleInput.value = '';
        document.getElementById('taskDueDate').value = '';
        showToast('Task added to Cloudflare KV!', 'success');
        await loadTasks();
      } else {
        showToast(data.message || 'Error adding task.', 'error');
      }
    } catch(err) {
      showToast('Network error contacting Cloudflare.', 'error');
    } finally {
      submitBtn.disabled = false;
      submitBtn.innerHTML = '<i class="fa-solid fa-plus"></i> Add Task';
    }
  }

  // ── Quick Change Status (PUT /api/tasks/:id) ──
  async function changeStatus(id, newStatus) {
    try {
      const getRes = await fetch(API + '/' + id);
      const getData = await getRes.json();
      if (!getData.success) {
        showToast('Task not found.', 'error');
        return;
      }

      const updated = { ...getData.task, status: newStatus };
      const res = await fetch(API + '/' + id, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated)
      });
      const data = await res.json();
      if (data.success) {
        showToast(\`Status updated to "\${newStatus}"\`, 'info');
        await loadTasks();
      } else {
        showToast(data.message || 'Update failed.', 'error');
      }
    } catch(err) {
      showToast('Network error updating task.', 'error');
    }
  }

  // ── Delete Task (DELETE /api/tasks/:id) ──
  async function deleteTask(id) {
    if (!confirm('Are you sure you want to remove this task from Cloudflare KV?')) return;
    try {
      const res = await fetch(API + '/' + id, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        showToast('Task deleted successfully.', 'info');
        await loadTasks();
      } else {
        showToast(data.message || 'Delete failed.', 'error');
      }
    } catch(err) {
      showToast('Network error deleting task.', 'error');
    }
  }

  // Initial load
  loadTasks();
</script>

</body>
</html>`;

// ─── CORS Headers ─────────────────────────────────────────────────────────────
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

// ─── JSON response helper ─────────────────────────────────────────────────────
function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS },
  });
}

// ─── Main fetch handler ───────────────────────────────────────────────────────
export default {
  async fetch(request, env) {
    const url    = new URL(request.url);
    const path   = url.pathname;
    const method = request.method.toUpperCase();

    // ── Handle CORS pre-flight ──
    if (method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS });
    }

    // ── Serve HTML frontend ──
    if (path === '/' || path === '/index.html') {
      return new Response(HTML, {
        status: 200,
        headers: { 'Content-Type': 'text/html;charset=UTF-8' },
      });
    }

    // ── API: /api/tasks ──
    if (path === '/api/tasks') {

      // GET /api/tasks — FR2: List all tasks
      if (method === 'GET') {
        const list  = await env.TASKS_KV.list();
        const tasks = [];
        for (const key of list.keys) {
          const val = await env.TASKS_KV.get(key.name);
          if (val) tasks.push(JSON.parse(val));
        }
        // Sort by creation date descending
        tasks.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        return json({ success: true, count: tasks.length, tasks });
      }

      // POST /api/tasks — FR1: Create a new task
      if (method === 'POST') {
        let body;
        try { body = await request.json(); } catch {
          return json({ success: false, message: 'Invalid JSON body.' }, 400);
        }

        const { title, priority = 'Medium', status = 'Pending', dueDate = null } = body;
        if (!title || typeof title !== 'string' || title.trim() === '') {
          return json({ success: false, message: 'Task title is required.' }, 400);
        }

        const validPriorities = ['High', 'Medium', 'Low'];
        const validStatuses   = ['Pending', 'In Progress', 'Completed'];
        if (!validPriorities.includes(priority)) {
          return json({ success: false, message: 'Priority must be High, Medium, or Low.' }, 400);
        }
        if (!validStatuses.includes(status)) {
          return json({ success: false, message: 'Status must be Pending, In Progress, or Completed.' }, 400);
        }

        const id   = 'T' + Date.now();
        const task = {
          id,
          title:     title.trim(),
          priority,
          status,
          dueDate:   dueDate || null,
          createdAt: new Date().toISOString(),
        };

        await env.TASKS_KV.put(id, JSON.stringify(task));
        return json({ success: true, message: 'Task created successfully.', task }, 201);
      }

      return json({ success: false, message: 'Method not allowed.' }, 405);
    }

    // ── API: /api/tasks/:id ──
    const match = path.match(/^\/api\/tasks\/([^/]+)$/);
    if (match) {
      const id = match[1];

      // GET /api/tasks/:id — Get individual task
      if (method === 'GET') {
        const val = await env.TASKS_KV.get(id);
        if (!val) return json({ success: false, message: `Task ${id} not found.` }, 404);
        return json({ success: true, task: JSON.parse(val) });
      }

      // PUT /api/tasks/:id — FR3: Update task
      if (method === 'PUT') {
        const existing = await env.TASKS_KV.get(id);
        if (!existing) return json({ success: false, message: `Task ${id} not found.` }, 404);

        let body;
        try { body = await request.json(); } catch {
          return json({ success: false, message: 'Invalid JSON body.' }, 400);
        }

        const task = { ...JSON.parse(existing), ...body, id };
        await env.TASKS_KV.put(id, JSON.stringify(task));
        return json({ success: true, message: 'Task updated successfully.', task });
      }

      // DELETE /api/tasks/:id — FR4: Delete task
      if (method === 'DELETE') {
        const existing = await env.TASKS_KV.get(id);
        if (!existing) return json({ success: false, message: `Task ${id} not found.` }, 404);
        await env.TASKS_KV.delete(id);
        return json({ success: true, message: `Task ${id} deleted successfully.` });
      }

      return json({ success: false, message: 'Method not allowed.' }, 405);
    }

    // ── 404 for all unmatched routes ──
    return json({ success: false, message: 'Route not found.' }, 404);
  },
};
