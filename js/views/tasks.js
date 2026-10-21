/**
 * 班主任工作台 - 2. 今日班务管理 (Tasks)
 * 10大分类筛选、优先级高低排序、状态流转（待处理/进行中/已完成/已逾期）
 * 支持添加新班务、完成打勾、顺延逾期、标红警示
 */

window.renderTasksView = function (container) {
  const tasks = window.store.data.tasks || [];

  // 统计数据
  const total = tasks.length;
  const pending = tasks.filter(t => t.status === "pending").length;
  const inProgress = tasks.filter(t => t.status === "in_progress").length;
  const completed = tasks.filter(t => t.status === "completed").length;
  const overdue = tasks.filter(t => t.status === "overdue").length;

  container.innerHTML = `
    <div class="module-header">
      <div class="module-title-area">
        <h2>📋 今日班务</h2>
        <p>管理班主任每天需要处理的各类学校通知、活动材料、学生谈话与表册填报</p>
      </div>
      <div class="module-actions">
        <button class="btn btn-primary" onclick="window.openAddTaskModal()">+ 添加班务</button>
      </div>
    </div>

    <!-- 顶栏 4 统计卡片  -->
    <div class="stat-cards-row">
      <div class="stat-card">
        <div class="stat-info">
          <div class="stat-label">全部班务</div>
          <div class="stat-value">${total}<span class="stat-unit">项</span></div>
        </div>
        <div class="stat-icon-wrapper" style="background:#eff6ff; color:#2563eb;">📂</div>
      </div>
      <div class="stat-card">
        <div class="stat-info">
          <div class="stat-label">待处理 / 进行中</div>
          <div class="stat-value">${pending + inProgress}<span class="stat-unit">项</span></div>
        </div>
        <div class="stat-icon-wrapper" style="background:#fef3c7; color:#d97706;">⏳</div>
      </div>
      <div class="stat-card">
        <div class="stat-info">
          <div class="stat-label">已完成</div>
          <div class="stat-value">${completed}<span class="stat-unit">项</span></div>
        </div>
        <div class="stat-icon-wrapper" style="background:#dcfce7; color:#059669;">✅</div>
      </div>
      <div class="stat-card">
        <div class="stat-info">
          <div class="stat-label">已逾期</div>
          <div class="stat-value" style="color: #ef4444;">${overdue}<span class="stat-unit">项</span></div>
        </div>
        <div class="stat-icon-wrapper" style="background:#fee2e2; color:#ef4444;">🚨</div>
      </div>
    </div>

    <!-- 筛选条 -->
    <div class="card" style="padding: 12px 18px; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px;">
      <div class="tab-pills" id="taskStatusTabs">
        <div class="tab-pill active" data-status="all" onclick="window.filterTasks('all', this)">全部 (${total})</div>
        <div class="tab-pill" data-status="pending" onclick="window.filterTasks('pending', this)">待处理 (${pending})</div>
        <div class="tab-pill" data-status="in_progress" onclick="window.filterTasks('in_progress', this)">进行中 (${inProgress})</div>
        <div class="tab-pill" data-status="completed" onclick="window.filterTasks('completed', this)">已完成 (${completed})</div>
        <div class="tab-pill" data-status="overdue" onclick="window.filterTasks('overdue', this)">已逾期 (${overdue})</div>
      </div>

      <div style="display: flex; align-items: center; gap: 10px;">
        <select class="form-control" style="width: 140px; height: 34px;" id="taskCategorySelect" onchange="window.filterTasksByCategory()">
          <option value="">全部分类</option>
          <option value="学校通知">学校通知</option>
          <option value="班级任务">班级任务</option>
          <option value="材料收集">材料收集</option>
          <option value="表格填写">表格填写</option>
          <option value="费用收取">费用收取</option>
          <option value="家长回复">家长回复</option>
          <option value="学生谈话">学生谈话</option>
          <option value="活动准备">活动准备</option>
          <option value="安全提醒">安全提醒</option>
          <option value="临时事项">临时事项</option>
        </select>
        <div class="search-box" style="width: 200px;">
          <input type="text" placeholder="搜索班务..." id="taskSearchInput" oninput="window.filterTasksByKeyword()">
          <span class="search-icon">🔍</span>
        </div>
      </div>
    </div>

    <!-- 班务卡片列表  -->
    <div id="tasksListContainer" style="display: flex; flex-direction: column; gap: 12px;">
      <!-- 由 renderTaskItems 渲染 -->
    </div>
  `;

  window.renderTaskItems(tasks);
};

window.renderTaskItems = function (tasksToRender) {
  const container = document.getElementById("tasksListContainer");
  if (!container) return;

  if (tasksToRender.length === 0) {
    container.innerHTML = `
      <div class="card" style="text-align: center; padding: 40px; color: var(--text-muted);">
        暂无符合条件的班务事项 🎉
      </div>
    `;
    return;
  }

  container.innerHTML = tasksToRender.map(t => {
    const isOverdue = t.status === "overdue";
    const isDone = t.status === "completed";
    const priorityColor = t.priority === "high" ? "#ef4444" : t.priority === "medium" ? "#f59e0b" : "#10b981";
    const priorityLabel = t.priority === "high" ? "高优先级" : t.priority === "medium" ? "中优先级" : "普通";

    return `
      <div class="card" style="border-left: 4px solid ${isOverdue ? '#ef4444' : isDone ? '#10b981' : priorityColor}; display: flex; align-items: center; justify-content: space-between; padding: 14px 20px;">
        <div style="display: flex; align-items: center; gap: 14px; flex: 1;">
          <input type="checkbox" style="width: 18px; height: 18px; cursor: pointer; accent-color: #2563eb;" 
            ${isDone ? "checked" : ""} 
            onchange="window.toggleTaskComplete('${t.id}', this.checked)">
          
          <div style="flex: 1;">
            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
              <span style="font-size: 14.5px; font-weight: 700; color: ${isDone ? 'var(--text-muted)' : 'var(--text-main)'}; text-decoration: ${isDone ? 'line-through' : 'none'};">
                ${t.title}
              </span>
              <span class="badge badge-info" style="font-size: 11px;">${t.category}</span>
              <span class="badge" style="background: #f1f5f9; color: ${priorityColor}; font-size: 11px;">${priorityLabel}</span>
              ${t.repeat ? `<span class="badge badge-gray" style="font-size: 11px;">🔁 ${t.repeat}</span>` : ""}
            </div>

            <div style="font-size: 12.5px; color: var(--text-muted); display: flex; align-items: center; gap: 16px;">
              <span>⏰ 截止：<strong style="color: ${isOverdue ? '#ef4444' : 'inherit'};">${t.deadline}</strong></span>
              <span>👤 负责人：${t.assignee}</span>
              ${t.relatedStudents ? `<span>👥 涉及：${t.relatedStudents}</span>` : ""}
            </div>

            ${t.desc ? `<div style="font-size: 12px; color: #475569; margin-top: 4px; background: #f8fafc; padding: 4px 8px; border-radius: 4px;">${t.desc}</div>` : ""}
          </div>
        </div>

        <div style="display: flex; align-items: center; gap: 10px; margin-left: 16px;">
          <span class="badge ${t.status === 'completed' ? 'badge-success' : t.status === 'overdue' ? 'badge-danger' : t.status === 'in_progress' ? 'badge-info' : 'badge-warning'}">
            ${t.status === 'completed' ? '已完成' : t.status === 'overdue' ? '已逾期' : t.status === 'in_progress' ? '进行中' : '待处理'}
          </span>
          <button class="btn btn-sm btn-secondary" onclick="window.deleteTaskItem('${t.id}')">删除</button>
        </div>
      </div>
    `;
  }).join("");
};

// 过滤交互
window.currentTaskFilter = "all";
window.filterTasks = function (status, elem) {
  window.currentTaskFilter = status;
  document.querySelectorAll("#taskStatusTabs .tab-pill").forEach(p => {
    if (p === elem || p.getAttribute("data-status") === status) {
      p.classList.add("active");
    } else {
      p.classList.remove("active");
    }
  });
  applyTaskFilters();
};

window.filterTasksByCategory = function () {
  applyTaskFilters();
};

window.filterTasksByKeyword = function () {
  applyTaskFilters();
};

function applyTaskFilters() {
  const tasks = window.store.data.tasks || [];
  const cat = document.getElementById("taskCategorySelect") ? document.getElementById("taskCategorySelect").value : "";
  const kw = document.getElementById("taskSearchInput") ? document.getElementById("taskSearchInput").value.trim().toLowerCase() : "";

  const filtered = tasks.filter(t => {
    let matchStatus = true;
    if (window.currentTaskFilter !== "all") {
      matchStatus = t.status === window.currentTaskFilter;
    }
    let matchCat = true;
    if (cat) matchCat = t.category === cat;
    let matchKw = true;
    if (kw) matchKw = t.title.toLowerCase().includes(kw) || (t.desc && t.desc.toLowerCase().includes(kw));
    return matchStatus && matchCat && matchKw;
  });

  window.renderTaskItems(filtered);
}

// 切换完成
window.toggleTaskComplete = function (taskId, checked) {
  window.store.updateTaskStatus(taskId, checked ? "completed" : "pending");
  window.showToast(checked ? "班务已标记完成！" : "班务已恢复待处理");
  window.renderTasksView(document.getElementById("mainContentArea"));
};

// 删除班务
window.deleteTaskItem = function (taskId) {
  if (confirm("确定要删除此条班务事项吗？")) {
    window.store.deleteTask(taskId);
    window.showToast("班务已删除");
    window.renderTasksView(document.getElementById("mainContentArea"));
  }
};
