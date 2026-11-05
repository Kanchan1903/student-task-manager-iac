/**
 * worker.js — Cloudflare Worker
 *
 * This single file serves as both the web server and REST API
 * for the Student Task Management Application.
 *
 * Routing:
 *   GET  /                → Serves the HTML frontend
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
  <title>Student Task Manager</title>
  <style>
    /* ── Reset & Base ── */
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      background: #f0f4f8;
      color: #2d3748;
      min-height: 100vh;
    }

    /* ── Header ── */
    header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 1.5rem 2rem;
      box-shadow: 0 2px 8px rgba(0,0,0,0.2);
    }
    header h1 { font-size: 1.75rem; font-weight: 700; }
    header p  { font-size: 0.9rem; opacity: 0.85; margin-top: 0.25rem; }

    /* ── Layout ── */
    .container { max-width: 1100px; margin: 2rem auto; padding: 0 1rem; }

    /* ── Card ── */
    .card {
      background: white;
      border-radius: 12px;
      box-shadow: 0 2px 12px rgba(0,0,0,0.08);
      padding: 1.5rem;
      margin-bottom: 1.5rem;
    }
    .card h2 { font-size: 1.1rem; font-weight: 600; margin-bottom: 1rem; color: #4a5568; }

    /* ── Form ── */
    .form-row { display: flex; gap: 0.75rem; flex-wrap: wrap; }
    .form-group { display: flex; flex-direction: column; gap: 0.3rem; flex: 1; min-width: 150px; }
    .form-group label { font-size: 0.8rem; font-weight: 600; color: #718096; text-transform: uppercase; letter-spacing: 0.05em; }
    .form-group input,
    .form-group select {
      padding: 0.6rem 0.8rem;
      border: 2px solid #e2e8f0;
      border-radius: 8px;
      font-size: 0.9rem;
      outline: none;
      transition: border-color 0.2s;
    }
    .form-group input:focus,
    .form-group select:focus { border-color: #667eea; }
    .form-group.flex-2 { flex: 2; min-width: 250px; }

    /* ── Buttons ── */
    .btn {
      padding: 0.6rem 1.2rem;
      border: none;
      border-radius: 8px;
      font-size: 0.875rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
    }
    .btn-primary { background: #667eea; color: white; }
    .btn-primary:hover { background: #5a6fd6; transform: translateY(-1px); }
    .btn-success { background: #48bb78; color: white; }
    .btn-success:hover { background: #38a169; }
    .btn-warning { background: #ed8936; color: white; font-size: 0.75rem; padding: 0.4rem 0.75rem; }
    .btn-warning:hover { background: #dd6b20; }
    .btn-danger  { background: #fc8181; color: white; font-size: 0.75rem; padding: 0.4rem 0.75rem; }
    .btn-danger:hover { background: #e53e3e; }
    .btn-add { align-self: flex-end; padding: 0.6rem 1.5rem; }

    /* ── Stats Bar ── */
    .stats { display: flex; gap: 1rem; flex-wrap: wrap; margin-bottom: 1.5rem; }
    .stat-pill {
      background: white;
      border-radius: 20px;
      padding: 0.5rem 1rem;
      font-size: 0.85rem;
      font-weight: 600;
      box-shadow: 0 1px 6px rgba(0,0,0,0.08);
    }
    .stat-pill span { color: #667eea; }

    /* ── Table ── */
    .table-wrapper { overflow-x: auto; }
    table { width: 100%; border-collapse: collapse; font-size: 0.9rem; }
    thead th {
      background: #f7fafc;
      padding: 0.75rem 1rem;
      text-align: left;
      font-size: 0.75rem;
      font-weight: 700;
      color: #718096;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      border-bottom: 2px solid #e2e8f0;
    }
    tbody tr { border-bottom: 1px solid #edf2f7; transition: background 0.15s; }
    tbody tr:hover { background: #f7fafc; }
    tbody td { padding: 0.85rem 1rem; vertical-align: middle; }

    /* ── Priority Badges ── */
    .badge {
      display: inline-block;
      padding: 0.25rem 0.65rem;
      border-radius: 20px;
      font-size: 0.75rem;
      font-weight: 700;
      text-transform: uppercase;
    }
    .badge-high    { background: #fed7d7; color: #c53030; }
    .badge-medium  { background: #fefcbf; color: #b7791f; }
    .badge-low     { background: #c6f6d5; color: #276749; }
    .badge-pending   { background: #bee3f8; color: #2b6cb0; }
    .badge-progress  { background: #fbd38d; color: #c05621; }
    .badge-completed { background: #c6f6d5; color: #276749; }

    /* ── Task ID ── */
    .task-id { font-family: monospace; font-size: 0.8rem; color: #a0aec0; }

    /* ── Actions ── */
    .actions { display: flex; gap: 0.4rem; }

    /* ── Status select inline ── */
    .status-select {
      padding: 0.3rem 0.5rem;
      border: 2px solid #e2e8f0;
      border-radius: 6px;
      font-size: 0.8rem;
      cursor: pointer;
    }

    /* ── Empty State ── */
    .empty {
      text-align: center;
      padding: 3rem;
      color: #a0aec0;
    }
    .empty .icon { font-size: 3rem; margin-bottom: 0.5rem; }

    /* ── Toast Notification ── */
    #toast {
      position: fixed;
      bottom: 2rem;
      right: 2rem;
      background: #2d3748;
      color: white;
      padding: 0.85rem 1.25rem;
      border-radius: 10px;
      font-size: 0.875rem;
      font-weight: 500;
      box-shadow: 0 4px 16px rgba(0,0,0,0.2);
      transform: translateY(100px);
      opacity: 0;
      transition: all 0.3s ease;
      z-index: 1000;
      max-width: 320px;
    }
    #toast.show { transform: translateY(0); opacity: 1; }
    #toast.success { background: #276749; }
    #toast.error   { background: #c53030; }

    /* ── Loading ── */
    .loading { text-align: center; color: #a0aec0; padding: 2rem; }

    @media (max-width: 600px) {
      .form-row { flex-direction: column; }
      .stats { gap: 0.5rem; }
    }
  </style>
</head>
<body>

<header>
  <h1>&#127891; Student Task Manager</h1>
  <p>Deployed on Cloudflare Workers &bull; Powered by Infrastructure as Code (Terraform)</p>
</header>

<div class="container">

  <!-- Add Task Form -->
  <div class="card">
    <h2>&#10133; Add New Task</h2>
    <div class="form-row">
      <div class="form-group flex-2">
        <label>Task Title</label>
        <input type="text" id="taskTitle" placeholder="e.g. Submit Cloud Computing Assignment" />
      </div>
      <div class="form-group">
        <label>Priority</label>
        <select id="taskPriority">
          <option value="High">High</option>
          <option value="Medium" selected>Medium</option>
          <option value="Low">Low</option>
        </select>
      </div>
      <div class="form-group">
        <label>Status</label>
        <select id="taskStatus">
          <option value="Pending" selected>Pending</option>
          <option value="In Progress">In Progress</option>
          <option value="Completed">Completed</option>
        </select>
      </div>
      <div class="form-group">
        <label>&nbsp;</label>
        <button class="btn btn-primary btn-add" onclick="addTask()">&#43; Add Task</button>
      </div>
    </div>
  </div>

  <!-- Stats -->
  <div class="stats" id="stats"></div>

  <!-- Task List -->
  <div class="card">
    <h2>&#128203; Task List</h2>
    <div class="table-wrapper">
      <table id="taskTable">
        <thead>
          <tr>
            <th>Task ID</th>
            <th>Title</th>
            <th>Priority</th>
            <th>Status</th>
            <th>Created</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody id="taskBody">
          <tr><td colspan="6" class="loading">Loading tasks...</td></tr>
        </tbody>
      </table>
    </div>
  </div>

</div>

<!-- Toast -->
<div id="toast"></div>

<script>
  // ── API base URL (same origin, Worker handles both frontend & API) ──
  const API = '/api/tasks';

  // ── Toast notification helper ──
  function showToast(message, type = 'success') {
    const t = document.getElementById('toast');
    t.textContent = message;
    t.className = 'show ' + type;
    setTimeout(() => { t.className = ''; }, 3000);
  }

  // ── Priority badge helper ──
  function priorityBadge(p) {
    const cls = p === 'High' ? 'badge-high' : p === 'Low' ? 'badge-low' : 'badge-medium';
    return '<span class="badge ' + cls + '">' + p + '</span>';
  }

  // ── Status badge helper ──
  function statusBadge(s) {
    const cls = s === 'Completed' ? 'badge-completed' : s === 'In Progress' ? 'badge-progress' : 'badge-pending';
    return '<span class="badge ' + cls + '">' + s + '</span>';
  }

  // ── Format date ──
  function fmtDate(iso) {
    return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  // ── Render stats bar ──
  function renderStats(tasks) {
    const total     = tasks.length;
    const pending   = tasks.filter(t => t.status === 'Pending').length;
    const progress  = tasks.filter(t => t.status === 'In Progress').length;
    const completed = tasks.filter(t => t.status === 'Completed').length;
    document.getElementById('stats').innerHTML =
      '<div class="stat-pill">Total: <span>' + total + '</span></div>' +
      '<div class="stat-pill">Pending: <span>' + pending + '</span></div>' +
      '<div class="stat-pill">In Progress: <span>' + progress + '</span></div>' +
      '<div class="stat-pill">Completed: <span>' + completed + '</span></div>';
  }

  // ── Render task table ──
  function renderTable(tasks) {
    renderStats(tasks);
    const tbody = document.getElementById('taskBody');
    if (tasks.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6"><div class="empty"><div class="icon">&#128203;</div>No tasks yet. Add your first task above!</div></td></tr>';
      return;
    }
    tbody.innerHTML = tasks.map(task => \`
      <tr>
        <td><span class="task-id">\${task.id}</span></td>
        <td><strong>\${escHtml(task.title)}</strong></td>
        <td>\${priorityBadge(task.priority)}</td>
        <td>\${statusBadge(task.status)}</td>
        <td>\${fmtDate(task.createdAt)}</td>
        <td>
          <div class="actions">
            <select class="status-select" id="sel-\${task.id}" onchange="updateTask('\${task.id}')">
              <option \${task.status==='Pending'?'selected':''}>Pending</option>
              <option \${task.status==='In Progress'?'selected':''}>In Progress</option>
              <option \${task.status==='Completed'?'selected':''}>Completed</option>
            </select>
            <button class="btn btn-warning" onclick="updateTask('\${task.id}')">&#10003; Update</button>
            <button class="btn btn-danger"  onclick="deleteTask('\${task.id}')">&#128465; Delete</button>
          </div>
        </td>
      </tr>
    \`).join('');
  }

  // ── XSS protection ──
  function escHtml(str) {
    return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }

  // ── FR2: Load all tasks ──
  async function loadTasks() {
    try {
      const res  = await fetch(API);
      const data = await res.json();
      renderTable(data.tasks || []);
    } catch (e) {
      document.getElementById('taskBody').innerHTML =
        '<tr><td colspan="6" style="color:red;text-align:center">Failed to load tasks. Is the Worker running?</td></tr>';
    }
  }

  // ── FR1: Add task ──
  async function addTask() {
    const title    = document.getElementById('taskTitle').value.trim();
    const priority = document.getElementById('taskPriority').value;
    const status   = document.getElementById('taskStatus').value;
    if (!title) { showToast('Please enter a task title.', 'error'); return; }

    try {
      const res  = await fetch(API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, priority, status })
      });
      const data = await res.json();
      if (data.success) {
        document.getElementById('taskTitle').value = '';
        showToast('Task created successfully!', 'success');
        loadTasks();
      } else {
        showToast(data.message || 'Failed to create task.', 'error');
      }
    } catch(e) { showToast('Network error.', 'error'); }
  }

  // ── FR3: Update task status ──
  async function updateTask(id) {
    const sel    = document.getElementById('sel-' + id);
    const status = sel ? sel.value : 'Pending';

    try {
      const getRes  = await fetch(API + '/' + id);
      const getData = await getRes.json();
      if (!getData.success) { showToast('Task not found.', 'error'); return; }

      const updated = { ...getData.task, status };
      const res  = await fetch(API + '/' + id, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated)
      });
      const data = await res.json();
      if (data.success) {
        showToast('Task updated to "' + status + '"!', 'success');
        loadTasks();
      } else {
        showToast(data.message || 'Failed to update.', 'error');
      }
    } catch(e) { showToast('Network error.', 'error'); }
  }

  // ── FR4: Delete task ──
  async function deleteTask(id) {
    if (!confirm('Delete this task? This cannot be undone.')) return;
    try {
      const res  = await fetch(API + '/' + id, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        showToast('Task deleted successfully.', 'success');
        loadTasks();
      } else {
        showToast(data.message || 'Failed to delete.', 'error');
      }
    } catch(e) { showToast('Network error.', 'error'); }
  }

  // ── Load tasks on page ready ──
  loadTasks();

  // Enter key support in task title field
  document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('taskTitle').addEventListener('keydown', e => {
      if (e.key === 'Enter') addTask();
    });
  });
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

        const { title, priority = 'Medium', status = 'Pending' } = body;
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
