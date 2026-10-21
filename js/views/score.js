/**
 * 班主任工作台 - 12. 班级量化考核 (Score & Quantification)
 * 包含：个人量化积分、周榜/月榜/学期榜、小组积分竞争排行榜、
 * 联动作业/考试/考勤一键自动核算、积分规则配置、Excel 导入导出与快速奖惩
 */

window.currentScoreRange = "week"; // 'week' | 'month' | 'term'

window.renderScoreView = function (container) {
  const students = window.store.data.students || [];
  const rules = window.store.data.scoreRules || {
    baseScore: 80, hwSubmitBonus: 5, hwUnsubmitPenalty: -2,
    examExcellent: 20, examGood: 10, examPass: 5, attNormalBonus: 5
  };

  // 按得分由高到低排序
  const sorted = [...students].sort((a, b) => (b.score || 80) - (a.score || 80));
  const topStudent = sorted[0] || { name: (students[0] && students[0].name) || "暂无", score: 80 };
  const avgScore = students.length > 0 ? (students.reduce((acc, c) => acc + (c.score || 80), 0) / students.length).toFixed(1) : 85;

  // 小组平均分统计（动态读取班级已定义全部小组）
  const definedGroups = (window.store && window.store.data && Array.isArray(window.store.data.groups) && window.store.data.groups.length > 0)
    ? window.store.data.groups
    : ["第1组", "第2组", "第3组", "第4组", "第5组", "第6组"];

  const groups = definedGroups.map(gName => {
    const mems = students.filter(s => window.isStudentInGroup ? window.isStudentInGroup(s.group, gName) : (String(s.group) === gName || `第${s.group}组` === gName));
    const avg = mems.length > 0 ? (mems.reduce((acc, c) => acc + (c.score || 80), 0) / mems.length).toFixed(1) : (students.length > 0 ? avgScore : 85);
    return { group: gName, avg: parseFloat(avg), count: mems.length };
  }).sort((a, b) => b.avg - a.avg);

  container.innerHTML = `
    <div class="module-header">
      <div class="module-title-area">
        <h2>🏆 班级量化考核</h2>
        <p>多维积分制量化管理，自动联动作业、考试成绩与出勤，实时驱动学生萌宠成长进化</p>
      </div>
      <div class="module-actions">
        <button class="btn btn-secondary" onclick="window.openScoreRulesModal()">⚙️ 积分与等级规则</button>
        <button class="btn btn-secondary" onclick="window.recalcScoresFromAcademics()">🔄 联动作业/考试/考勤一键核算</button>
        <button class="btn btn-secondary" onclick="document.getElementById('excelQuantScoreInput').click()">📥 导入表格 (Excel)</button>
        <button class="btn btn-secondary" onclick="window.store.exportQuantScoreExcel()">📤 导出积分表 (Excel)</button>
        <button class="btn btn-primary" onclick="window.openQuickScoreModal()">+ 快速打分</button>
      </div>
    </div>

    <!-- 顶部核心指标看板 -->
    <div class="stat-cards-row">
      <div class="stat-card">
        <div class="stat-info">
          <div class="stat-label">最高量化积分</div>
          <div class="stat-value" style="color: #d97706;">${topStudent.name} (${topStudent.score}分)</div>
        </div>
        <span style="font-size: 24px;">👑</span>
      </div>

      <div class="stat-card">
        <div class="stat-info">
          <div class="stat-label">全班平均积分</div>
          <div class="stat-value" style="color: #2563eb;">${avgScore}<span class="stat-unit">分</span></div>
        </div>
        <span style="font-size: 24px;">📈</span>
      </div>

      <div class="stat-card">
        <div class="stat-info">
          <div class="stat-label">当前流动红旗</div>
          <div class="stat-value" style="color: #10b981;">${groups[0] ? (window.formatGroupName ? window.formatGroupName(groups[0].group) : groups[0].group) : "第1组"}</div>
        </div>
        <span style="font-size: 24px;">🚩</span>
      </div>

      <div class="stat-card">
        <div class="stat-info">
          <div class="stat-label">萌宠满级(Lv.5)学生</div>
          <div class="stat-value" style="color: #7c3aed;">${students.filter(s => (s.petData && s.petData.level >= 5) || s.score >= 200).length}<span class="stat-unit">人</span></div>
        </div>
        <span style="font-size: 24px;">🐾</span>
      </div>
    </div>

    <!-- 主体：左侧学生量化大表，右侧小组PK榜单  -->
    <div style="display: grid; grid-template-columns: 1.35fr 0.85fr; gap: 16px;">
      <!-- 学生积分明细 -->
      <div class="card">
        <div class="panel-header" style="flex-wrap: wrap; gap: 10px;">
          <div class="panel-title">👥 学生量化积分表</div>
          <div class="tab-pills" id="scoreRangeTabs">
            <div class="tab-pill ${window.currentScoreRange === 'week' ? 'active' : ''}" data-range="week" onclick="window.switchScoreTimeRange('week', this)">本周</div>
            <div class="tab-pill ${window.currentScoreRange === 'month' ? 'active' : ''}" data-range="month" onclick="window.switchScoreTimeRange('month', this)">本月</div>
            <div class="tab-pill ${window.currentScoreRange === 'term' ? 'active' : ''}" data-range="term" onclick="window.switchScoreTimeRange('term', this)">本学期</div>
          </div>
          <div class="search-box" style="width: 180px;">
            <input type="text" placeholder="搜索姓名、学号..." id="scoreStudentSearch" oninput="window.filterScoreStudents()">
            <span class="search-icon">🔍</span>
          </div>
        </div>

        <div class="table-responsive" style="max-height: 480px; overflow-y: auto;">
          <table class="data-table" id="scoreTable">
            <thead>
              <tr>
                <th>排名</th>
                <th>学号</th>
                <th>姓名</th>
                <th>小组</th>
                <th>量化积分</th>
                <th>萌宠等级</th>
                <th>快速加扣分</th>
              </tr>
            </thead>
            <tbody id="scoreTableBody">
              ${sorted.map((s, idx) => {
    const petData = s.petData || { level: 1, exp: 0 };
    return `
                  <tr data-name="${s.name}" data-id="${s.id}">
                    <td>
                      <span style="font-weight: 800; font-size: 13px; color: ${idx === 0 ? '#d97706' : idx === 1 ? '#475569' : idx === 2 ? '#b45309' : '#94a3b8'};">
                        ${idx === 0 ? '🥇 1' : idx === 1 ? '🥈 2' : idx === 2 ? '🥉 3' : idx + 1}
                      </span>
                    </td>
                    <td style="font-size: 12px; color: var(--text-muted);">${s.id}</td>
                    <td style="font-weight: 700; color: #1e293b;">${s.name}</td>
                    <td>${window.formatGroupName ? window.formatGroupName(s.group) : ('第' + s.group + '组')}</td>
                    <td style="font-weight: 800; color: #2563eb; font-size: 15px;">${s.score || 80}</td>
                    <td>
                      <span class="badge" style="background: #fdf2f8; color: #db2777; font-weight: 700; font-size: 11.5px;">
                        Lv.${petData.level}
                      </span>
                    </td>
                    <td>
                      <div style="display: flex; gap: 4px;">
                        <button class="btn btn-sm btn-success" style="padding: 2px 7px;" onclick="window.quickAward('${s.id}', 1)" title="快速加1分">+1</button>
                        <button class="btn btn-sm btn-success" style="padding: 2px 7px;" onclick="window.quickAward('${s.id}', 2)" title="快速加2分">+2</button>
                        <button class="btn btn-sm btn-danger" style="padding: 2px 7px;" onclick="window.quickAward('${s.id}', -1)" title="快速扣1分">-1</button>
                        <button class="btn btn-sm btn-secondary" style="padding: 2px 7px;" onclick="window.openQuickScoreModal('${s.name}')" title="打开奖惩弹窗">✏️</button>
                      </div>
                    </td>
                  </tr>
                `;
  }).join("")}
            </tbody>
          </table>
        </div>
      </div>

      <!-- 右侧：小组竞争PK排行榜与折线图  -->
      <div style="display: flex; flex-direction: column; gap: 16px;">
        <!-- 小组积分榜 -->
        <div class="card">
          <div class="panel-header">
            <div class="panel-title">🚩 小组竞争排行榜</div>
            <span class="badge badge-warning">流动红旗争夺</span>
          </div>
          <div style="display: flex; flex-direction: column; gap: 8px;">
            ${groups.map((g, idx) => {
              const displayName = window.formatGroupName ? window.formatGroupName(g.group) : g.group;
              const encG = encodeURIComponent(g.group);
              return `
              <div style="display: flex; align-items: center; justify-content: space-between; padding: 10px 14px; background: ${idx === 0 ? '#fffbeb' : '#f8fafc'}; border: 1px solid ${idx === 0 ? '#fde68a' : 'transparent'}; border-radius: var(--radius-md);">
                <div style="display: flex; align-items: center; gap: 10px;">
                  <span style="font-size: 15px; font-weight: 800; color: ${idx === 0 ? '#d97706' : '#64748b'}; width: 22px;">
                    ${idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : idx + 1}
                  </span>
                  <div>
                    <span style="font-size: 14px; font-weight: 700; color: #1e293b;">${displayName}</span>
                    <span style="font-size: 11px; color: var(--text-muted); margin-left: 6px;">(${g.count}人)</span>
                  </div>
                </div>
                <div style="display: flex; align-items: center; gap: 10px;">
                  <span style="font-size: 14.5px; font-weight: 800; color: #2563eb;">${g.avg} 分</span>
                  <button class="btn btn-sm btn-success" style="padding: 2px 6px; font-size: 11px;" onclick="window.awardGroup('${encG}', 2)" title="为全组每位同学加2分">
                    +2全组
                  </button>
                </div>
              </div>
            `;
            }).join("")}
          </div>
        </div>

        <!-- 小组平均分走势图 -->
        <div class="card">
          <div class="panel-header">
            <div class="panel-title">📈 班级周均分走势</div>
          </div>
          <div style="height: 140px; position: relative;">
            <canvas id="groupTrendChart"></canvas>
          </div>
        </div>
      </div>
    </div>
  `;

  setTimeout(() => {
    initGroupTrendChart();
  }, 50);
};

// 切换时间周期 (本周 / 本月 / 本学期)
window.switchScoreTimeRange = function (range, elem) {
  window.currentScoreRange = range;
  document.querySelectorAll("#scoreRangeTabs .tab-pill").forEach(p => {
    if (p === elem || p.getAttribute("data-range") === range) {
      p.classList.add("active");
    } else {
      p.classList.remove("active");
    }
  });
  window.showToast(`已切换至【${range === 'week' ? '本周' : range === 'month' ? '本月' : '本学期'}】量化排行！`, "info");
};

// 搜索学生
window.filterScoreStudents = function () {
  const kw = (document.getElementById("scoreStudentSearch") ? document.getElementById("scoreStudentSearch").value : "").trim().toLowerCase();
  const rows = document.querySelectorAll("#scoreTableBody tr");
  rows.forEach(r => {
    const text = r.innerText.toLowerCase();
    r.style.display = text.includes(kw) ? "" : "none";
  });
};

// 快速为单人奖惩
window.quickAward = function (studentId, delta) {
  window.store.adjustStudentScore(studentId, delta, delta > 0 ? "课堂积极表现" : "常规提醒");
  window.showToast(`已${delta > 0 ? '奖励' : '扣除'} ${Math.abs(delta)} 分！`, delta > 0 ? "success" : "info");
  window.renderScoreView(document.getElementById("mainContentArea"));
};

// 为整个小组集体加分
window.awardGroup = function (groupNameRaw, delta) {
  const gName = decodeURIComponent(groupNameRaw);
  const students = window.store.data.students.filter(s => window.isStudentInGroup ? window.isStudentInGroup(s.group, gName) : (String(s.group) === gName || `第${s.group}组` === gName));
  const displayName = window.formatGroupName ? window.formatGroupName(gName) : gName;
  students.forEach(s => {
    window.store.adjustStudentScore(s.id, delta, `${displayName}优秀团队加分`);
  });
  window.showToast(`已为【${displayName}】全体 ${students.length} 位同学每人加 ${delta} 分！`, "success");
  window.renderScoreView(document.getElementById("mainContentArea"));
};

// 联动作业、考试、出勤、小红花一键重新核算
window.recalcScoresFromAcademics = function () {
  const res = window.store.recalcAllPetScoresAndLevels();
  window.showToast(`✨ 已根据全班作业、考试、出勤及小红花数据，成功重新核算 ${res.studentCount} 名学生的积分与萌宠等级！最高分：${res.maxScore}分`, "success");
  if (window.currentView === "pets") {
    const mainEl = document.getElementById("mainContentArea");
    if (mainEl && window.renderPetsView) window.renderPetsView(mainEl);
  } else if (window.currentView === "score") {
    window.renderScoreView(document.getElementById("mainContentArea"));
  } else if (typeof renderCurrentView === "function") {
    renderCurrentView();
  }
};

function initGroupTrendChart() {
  if (typeof Chart === "undefined") return;
  const canvas = document.getElementById("groupTrendChart");
  if (!canvas) return;

  new Chart(canvas, {
    type: "line",
    data: {
      labels: ["第1周", "第2周", "第3周", "第4周"],
      datasets: [{
        label: "班级平均量化分",
        data: [88.5, 89.2, 90.4, 91.5],
        borderColor: "#8b5cf6",
        backgroundColor: "rgba(139, 92, 246, 0.1)",
        tension: 0.35,
        fill: true,
        pointRadius: 4
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: { y: { min: 80, max: 100 } },
      plugins: { legend: { display: false } }
    }
  });
}
