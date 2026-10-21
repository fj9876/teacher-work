/**
 * 班主任工作台 - 7. 成绩与学情 (Exams & Academic Analytics)
 * 支持新增考试、在线修改成绩、Excel 导入成绩单、导出完整学情分析表
 */

window.renderExamsView = function(container) {
  const exams = window.store.data.exams || [];
  window.currentExamId = window.currentExamId || (exams[0] ? exams[0].id : "");
  const currentExam = exams.find(e => e.id === window.currentExamId) || exams[0] || null;
  const stats = (currentExam && currentExam.stats) || {};
  const scores = (currentExam && currentExam.scores) || [];

  // 动态根据当前考试学生真实成绩核算三大指标
  const validScores = scores.map(s => (s.totalScore !== undefined ? s.totalScore : s.score)).filter(v => typeof v === 'number' && !isNaN(v));
  const hasScores = validScores.length > 0;
  const avgScore = hasScores ? parseFloat((validScores.reduce((a, b) => a + b, 0) / validScores.length).toFixed(1)) : (stats.avgScore || 0);
  const excellentRate = hasScores ? parseFloat(((validScores.filter(v => v >= 85).length / validScores.length) * 100).toFixed(1)) : (stats.excellentRate || 0);
  const passRate = hasScores ? parseFloat(((validScores.filter(v => v >= 60).length / validScores.length) * 100).toFixed(1)) : (stats.passRate || 0);

  // 动态计算较上次历次考试波动
  let diffAvgText = "暂无对比数据";
  let diffAvgColor = "#94a3b8";
  let diffExcText = "暂无对比数据";
  let diffExcColor = "#94a3b8";
  let diffPassText = "暂无对比数据";
  let diffPassColor = "#94a3b8";

  if (currentExam && exams.length > 1) {
    const sortedExams = [...exams].sort((a, b) => (a.date || '').localeCompare(b.date || ''));
    const currIdx = sortedExams.findIndex(e => e.id === currentExam.id);
    if (currIdx > 0) {
      const prevExam = sortedExams[currIdx - 1];
      const prevScores = (prevExam.scores || []).map(s => (s.totalScore !== undefined ? s.totalScore : s.score)).filter(v => typeof v === 'number' && !isNaN(v));
      if (prevScores.length > 0) {
        const prevAvg = prevScores.reduce((a, b) => a + b, 0) / prevScores.length;
        const prevExc = (prevScores.filter(v => v >= 85).length / prevScores.length) * 100;
        const prevPass = (prevScores.filter(v => v >= 60).length / prevScores.length) * 100;

        const dAvg = (avgScore - prevAvg).toFixed(1);
        diffAvgText = dAvg >= 0 ? `▲ 较上次 +${dAvg}分` : `▼ 较上次 ${dAvg}分`;
        diffAvgColor = dAvg >= 0 ? "#10b981" : "#ef4444";

        const dExc = (excellentRate - prevExc).toFixed(1);
        diffExcText = dExc >= 0 ? `▲ 较上次 +${dExc}%` : `▼ 较上次 ${dExc}%`;
        diffExcColor = dExc >= 0 ? "#10b981" : "#ef4444";

        const dPass = (passRate - prevPass).toFixed(1);
        diffPassText = dPass >= 0 ? `▲ 较上次 +${dPass}%` : `▼ 较上次 ${dPass}%`;
        diffPassColor = dPass >= 0 ? "#10b981" : "#ef4444";
      }
    } else {
      diffAvgText = "首场基准考试";
      diffExcText = "首场基准考试";
      diffPassText = "首场基准考试";
    }
  } else if (currentExam) {
    diffAvgText = "首场基准考试";
    diffExcText = "首场基准考试";
    diffPassText = "首场基准考试";
  }

  window.currentExamTab = window.currentExamTab || "list";

  container.innerHTML = `
    <div class="module-header">
      <div class="module-title-area">
        <h2>📈 成绩与学情</h2>
        <p>小学 · 记录考试成绩，支持 Excel 批量导入导出、在线修改成绩与学情深度诊断</p>
      </div>
      <div class="module-actions">
        <button class="btn btn-secondary" onclick="window.triggerExcelScoreImport()">📥 导入成绩 (Excel)</button>
        <button class="btn btn-secondary" onclick="window.store.exportScoresExcel('${currentExam ? currentExam.id : ''}')">📤 导出成绩单 (Excel)</button>
        <button class="btn btn-primary" onclick="window.openNewExamModal()">+ 新增考试</button>
        <button class="btn btn-danger" onclick="window.deleteCurrentExam()" title="删除当前选中的考试与成绩记录">🗑️ 删除本次考试</button>
      </div>
    </div>

    <!-- 顶部考试选择与三大核心指标 -->
    <div style="display: grid; grid-template-columns: 1.25fr 1fr 1fr 1fr; gap: 14px;">
      <div class="card" style="padding: 16px; display: flex; flex-direction: column; justify-content: space-between; border-top: 3px solid #ef4444;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
          <span style="font-size: 12.5px; font-weight: 700; color: #1e293b;">📋 考试详情与切换</span>
          <button class="btn btn-sm btn-danger" onclick="window.deleteCurrentExam()" style="padding: 3px 8px; font-size: 11.5px; font-weight: 700;" title="删除当前选中的本次考试及其全部成绩记录">
            🗑️ 删除本次考试
          </button>
        </div>
        <select class="form-control" style="font-weight: 700; color: #1e293b; font-size: 14px;" onchange="window.selectCurrentExam(this.value)">
          ${exams.length === 0 ? '<option value="">暂无考试记录 (点击右上角新增)</option>' : exams.map(e => `<option value="${e.id}" ${e.id === (currentExam && currentExam.id) ? 'selected' : ''}>${e.name} (${e.date})</option>`).join("")}
        </select>
        <div style="font-size: 11.5px; color: var(--text-muted); margin-top: 8px; display: flex; justify-content: space-between; align-items: center;">
          <span>${currentExam ? `考核科目：${(currentExam.subjects || ['综合']).join('、')} · 满分: ${currentExam.fullScore || 100}分` : '考核科目：暂无'}</span>
          <span class="badge badge-info" style="font-size: 11px;">参考: ${scores.length}人</span>
        </div>
      </div>

      <div class="stat-card" style="padding: 16px;">
        <div class="stat-info">
          <div class="stat-label">班级平均分</div>
          <div class="stat-value" style="color: #2563eb;">${avgScore}<span class="stat-unit">分</span></div>
          <div style="font-size: 11.5px; color: ${diffAvgColor}; font-weight: 600; margin-top: 4px;">${diffAvgText}</div>
        </div>
        <span style="font-size: 24px;">🎯</span>
      </div>

      <div class="stat-card" style="padding: 16px;">
        <div class="stat-info">
          <div class="stat-label">优秀率 (≥85分)</div>
          <div class="stat-value" style="color: #d97706;">${excellentRate}<span class="stat-unit">%</span></div>
          <div style="font-size: 11.5px; color: ${diffExcColor}; font-weight: 600; margin-top: 4px;">${diffExcText}</div>
        </div>
        <span style="font-size: 24px;">🏆</span>
      </div>

      <div class="stat-card" style="padding: 16px;">
        <div class="stat-info">
          <div class="stat-label">及格率 (≥60分)</div>
          <div class="stat-value" style="color: #059669;">${passRate}<span class="stat-unit">%</span></div>
          <div style="font-size: 11.5px; color: ${diffPassColor}; font-weight: 600; margin-top: 4px;">${diffPassText}</div>
        </div>
        <span style="font-size: 24px;">✅</span>
      </div>
    </div>

    <!-- 导航切换：成绩详情 / 班级分析 / 趋势对比 -->
    <div class="card" style="padding: 10px 18px; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 10px;">
      <div class="tab-pills" id="examSubTabs">
        <div class="tab-pill ${window.currentExamTab === 'list' ? 'active' : ''}" data-tab="list" onclick="window.switchExamTab('list', this)">📋 成绩详情列表</div>
        <div class="tab-pill ${window.currentExamTab === 'charts' ? 'active' : ''}" data-tab="charts" onclick="window.switchExamTab('charts', this)">📊 班级分数段与题型分析</div>
        <div class="tab-pill ${window.currentExamTab === 'trends' ? 'active' : ''}" data-tab="trends" onclick="window.switchExamTab('trends', this)">📈 班级成绩历次变化趋势</div>
      </div>

      <div style="display: flex; align-items: center; gap: 8px;">
        <div class="search-box" style="width: 200px;">
          <input type="text" placeholder="搜索学生姓名、学号..." id="examStudentSearch" oninput="window.filterExamScores()">
          <span class="search-icon">🔍</span>
        </div>
        <button class="btn btn-sm btn-danger" onclick="window.deleteCurrentExam()" style="padding: 4px 10px; font-size: 12px; font-weight: 600;" title="删除当前选中的考试">
          🗑️ 删除本次考试
        </button>
      </div>
    </div>

    <!-- 内容展示容器 -->
    <div id="examTabContent">
      <!-- 动态填充 -->
    </div>
  `;

  window.renderExamTabContent();
};

window.selectCurrentExam = function(examId) {
  window.currentExamId = examId;
  window.renderExamsView(document.getElementById("mainContentArea"));
};

window.deleteCurrentExam = function() {
  const exams = window.store.data.exams || [];
  const currentExam = exams.find(e => e.id === window.currentExamId) || exams[0];
  if (!currentExam) {
    window.showToast("当前暂无选中的考试！", "info");
    return;
  }
  if (confirm(`确定要彻底删除考试【${currentExam.name}】及其全部学生的成绩记录吗？此操作不可逆！`)) {
    window.store.deleteExam(currentExam.id);
    const remaining = window.store.data.exams || [];
    window.currentExamId = remaining.length > 0 ? remaining[0].id : "";
    window.showToast(`已彻底删除考试【${currentExam.name}】！`, "success");
    window.renderExamsView(document.getElementById("mainContentArea"));
  }
};

window.switchExamTab = function(tab, elem) {
  window.currentExamTab = tab;
  document.querySelectorAll("#examSubTabs .tab-pill").forEach(p => {
    if (p === elem || p.getAttribute("data-tab") === tab) {
      p.classList.add("active");
    } else {
      p.classList.remove("active");
    }
  });
  window.renderExamTabContent();
};

window.examSortKey = window.examSortKey || "total";
window.examSortOrder = window.examSortOrder || "desc";

window.sortExamScoresBy = function(key) {
  if (window.examSortKey === key) {
    window.examSortOrder = window.examSortOrder === "desc" ? "asc" : "desc";
  } else {
    window.examSortKey = key;
    window.examSortOrder = "desc";
  }
  window.renderExamTabContent();
};

window.renderExamTabContent = function() {
  const container = document.getElementById("examTabContent");
  if (!container) return;
  const exams = window.store.data.exams || [];
  const currentExam = exams.find(e => e.id === window.currentExamId) || exams[0] || {};
  const scores = currentExam.scores || [];
  const subjects = currentExam.subjects || ["语文", "数学", "英语", "科学"];

  if (window.currentExamTab === "list") {
    // 动态排序与位次重算
    const sortKey = window.examSortKey || "total";
    const sortOrder = window.examSortOrder || "desc";

    const sortedScores = [...scores].sort((a, b) => {
      let valA = 0;
      let valB = 0;
      if (sortKey === "total") {
        valA = a.totalScore !== undefined ? a.totalScore : a.score;
        valB = b.totalScore !== undefined ? b.totalScore : b.score;
      } else if (sortKey === "trend") {
        valA = parseFloat(String(a.trend).replace('+', '')) || 0;
        valB = parseFloat(String(b.trend).replace('+', '')) || 0;
      } else {
        valA = (a.subjectScores && a.subjectScores[sortKey] !== undefined) ? a.subjectScores[sortKey] : (a[sortKey] !== undefined ? a[sortKey] : 0);
        valB = (b.subjectScores && b.subjectScores[sortKey] !== undefined) ? b.subjectScores[sortKey] : (b[sortKey] !== undefined ? b[sortKey] : 0);
      }
      return sortOrder === "desc" ? (valB - valA) : (valA - valB);
    });

    const rankTitle = sortKey === "total" ? "全科总分排名" : sortKey === "trend" ? "变化幅度排名" : `${sortKey}排名`;
    const sortArrow = sortOrder === "desc" ? "▼" : "▲";

    container.innerHTML = `
      <div class="table-responsive">
        <table class="data-table">
          <thead>
            <tr>
              <th style="cursor: pointer; user-select: none; background: #f8fafc; min-width: 95px;" onclick="window.sortExamScoresBy('total')" title="点击按全科总分重新排名">
                <div style="display: flex; align-items: center; justify-content: center; gap: 4px;">
                  <span style="font-weight: 800; color: #1e293b;">${rankTitle}</span>
                  <span style="font-size: 11px; color: #2563eb;">${sortKey === 'total' ? sortArrow : '⇅'}</span>
                </div>
              </th>
              <th>学号</th>
              <th>姓名</th>
              ${subjects.map(s => `
                <th style="cursor: pointer; user-select: none; ${sortKey === s ? 'background: #eff6ff; color: #1d4ed8; font-weight: 800;' : ''}" onclick="window.sortExamScoresBy('${s}')" title="点击按${s}单科成绩排名">
                  <div style="display: flex; align-items: center; justify-content: center; gap: 4px;">
                    <span>${s}</span>
                    <span style="font-size: 11px; color: ${sortKey === s ? '#2563eb' : '#94a3b8'};">${sortKey === s ? sortArrow : '⇅'}</span>
                  </div>
                </th>
              `).join("")}
              <th style="cursor: pointer; user-select: none; ${sortKey === 'total' ? 'background: #eff6ff; color: #1d4ed8; font-weight: 800;' : ''}" onclick="window.sortExamScoresBy('total')" title="点击按全科总分排名">
                <div style="display: flex; align-items: center; justify-content: center; gap: 4px;">
                  <span>全科总分</span>
                  <span style="font-size: 11px; color: ${sortKey === 'total' ? '#2563eb' : '#94a3b8'};">${sortKey === 'total' ? sortArrow : '⇅'}</span>
                </div>
              </th>
              <th>学业评述</th>
              <th style="cursor: pointer; user-select: none; ${sortKey === 'trend' ? 'background: #eff6ff; color: #1d4ed8; font-weight: 800;' : ''}" onclick="window.sortExamScoresBy('trend')" title="点击按变化幅度排名">
                <div style="display: flex; align-items: center; justify-content: center; gap: 4px;">
                  <span>较上次变化</span>
                  <span style="font-size: 11px; color: ${sortKey === 'trend' ? '#2563eb' : '#94a3b8'};">${sortKey === 'trend' ? sortArrow : '⇅'}</span>
                </div>
              </th>
              <th>教师评语</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody id="examScoresTableBody">
            ${sortedScores.length === 0 ? `
              <tr>
                <td colspan="${subjects.length + 6}" style="text-align: center; padding: 48px 16px; color: var(--text-muted);">
                  <div style="font-size: 32px; margin-bottom: 8px;">📝</div>
                  <div style="font-size: 15px; font-weight: 700; color: #475569; margin-bottom: 4px;">当前班级暂无考试成绩数据</div>
                  <div style="font-size: 12.5px; color: #94a3b8;">导入真实学生档案后历史数据已清零，请点击右上角【+ 新增考试】或【📥 导入成绩】开始录入</div>
                </td>
              </tr>
            ` : sortedScores.map((sc, idx) => {
              const totalVal = sc.totalScore !== undefined ? sc.totalScore : sc.score;
              const dynamicRank = idx + 1;
              const rankBadge = dynamicRank === 1 ? '🥇 1' : dynamicRank === 2 ? '🥈 2' : dynamicRank === 3 ? '🥉 3' : dynamicRank;
              const rankColor = dynamicRank === 1 ? '#d97706' : dynamicRank === 2 ? '#475569' : dynamicRank === 3 ? '#b45309' : '#64748b';

              return `
                <tr>
                  <td style="font-weight: 800; color: ${rankColor}; text-align: center;">
                    ${rankBadge}
                  </td>
                  <td style="font-weight: 600;">${sc.studentId}</td>
                  <td style="font-weight: 700; color: #1e293b;">
                    <span style="margin-right: 6px;">${sc.score >= 90 ? '🌟' : '👦'}</span>${sc.name}
                  </td>
                  ${subjects.map(sub => {
                    const val = (sc.subjectScores && sc.subjectScores[sub] !== undefined) ? sc.subjectScores[sub] : (sc[sub] !== undefined ? sc[sub] : '--');
                    const isColActive = sortKey === sub;
                    return `<td style="font-weight: 700; text-align: center; color: ${val >= 90 ? '#16a34a' : val >= 80 ? '#2563eb' : val >= 60 ? '#334155' : '#ef4444'}; ${isColActive ? 'background: #f0f7ff; border-left: 1px solid #bfdbfe; border-right: 1px solid #bfdbfe;' : ''}">${val}</td>`;
                  }).join("")}
                  <td style="font-size: 16px; font-weight: 800; color: #2563eb; text-align: center; ${sortKey === 'total' ? 'background: #f0f7ff; border-left: 1px solid #bfdbfe; border-right: 1px solid #bfdbfe;' : ''}">
                    ${totalVal} <span style="font-size: 11px; font-weight: normal; color: #94a3b8;">分</span>
                  </td>
                  <td>
                    <span class="badge ${sc.level === '优秀' ? 'badge-success' : sc.level === '良好' ? 'badge-info' : 'badge-warning'}">
                      ${sc.level}
                    </span>
                  </td>
                  <td style="font-weight: 700; text-align: center; color: ${sc.trend && sc.trend.startsWith('+') ? '#16a34a' : sc.trend === '--' ? '#64748b' : '#dc2626'}; ${sortKey === 'trend' ? 'background: #f0f7ff;' : ''}">
                    ${sc.trend && sc.trend.startsWith('+') ? '▲ ' + sc.trend : sc.trend && sc.trend.startsWith('-') ? '▼ ' + sc.trend : '--'}
                  </td>
                  <td style="color: #475569; font-size: 12.5px; max-width: 240px;">${sc.comment}</td>
                  <td>
                    <div style="display: flex; gap: 6px;">
                      <button class="btn btn-sm btn-secondary" onclick="window.openEditScoreModal('${currentExam ? currentExam.id : ''}', '${sc.studentId}')">
                        ✏️ 修改各科
                      </button>
                      <button class="btn btn-sm btn-primary" onclick="window.openStudentAcademicDetail('${sc.studentId}', '${sc.name}', ${totalVal}, '${sc.trend}', '${sc.level}', '${sortKey}')">
                        学情诊断 ›
                      </button>
                    </div>
                  </td>
                </tr>
              `;
            }).join("")}
          </tbody>
        </table>
      </div>
    `;

  } else if (window.currentExamTab === "charts") {
    const exams = window.store.data.exams || [];
    const currentExam = exams.find(e => e.id === window.currentExamId) || exams[0] || null;
    const scores = (currentExam && currentExam.scores) || [];

    if (!currentExam || scores.length === 0) {
      container.innerHTML = `
        <div class="card" style="text-align: center; padding: 60px 20px; color: var(--text-muted);">
          <div style="font-size: 36px; margin-bottom: 10px;">📊</div>
          <div style="font-size: 16px; font-weight: 700; color: #334155; margin-bottom: 6px;">暂无班级分数段与各科对比数据</div>
          <div style="font-size: 13px; color: #94a3b8;">导入真实学生档案后历史模板数据已彻底清零，发布或导入考试成绩后将自动生成统计分析图表</div>
        </div>
      `;
      return;
    }

    const validScores = scores.map(s => (s.totalScore !== undefined ? s.totalScore : s.score)).filter(v => typeof v === 'number' && !isNaN(v));
    const count90 = validScores.filter(v => v >= 90).length;
    const rate90 = validScores.length > 0 ? ((count90 / validScores.length) * 100).toFixed(1) : "0.0";

    const subjects = currentExam.subjects || ["语文", "数学", "英语"];
    const subSummaries = [];
    subjects.forEach(sub => {
      const subScores = scores.map(s => (s.subjectScores && s.subjectScores[sub] !== undefined) ? s.subjectScores[sub] : (s[sub] !== undefined ? s[sub] : null)).filter(v => typeof v === 'number' && !isNaN(v));
      if (subScores.length > 0) {
        const subAvg = (subScores.reduce((a, b) => a + b, 0) / subScores.length).toFixed(1);
        subSummaries.push(`${sub} ${subAvg}`);
      }
    });
    const subSubtitle = subSummaries.length > 0 ? subSummaries.join(" | ") : "各科平均分分析";

    container.innerHTML = `
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
        <div class="card">
          <div class="panel-header">
            <div class="panel-title">📊 分数段人数分布</div>
            <span class="panel-subtitle">90分以上占比 ${rate90}%</span>
          </div>
          <div style="height: 220px; position: relative;">
            <canvas id="scoreDistChart"></canvas>
          </div>
        </div>

        <div class="card">
          <div class="panel-header">
            <div class="panel-title">📚 各科平均分与及格率对比</div>
            <span class="panel-subtitle">${subSubtitle}</span>
          </div>
          <div style="height: 220px; position: relative;">
            <canvas id="subjectCompareChart"></canvas>
          </div>
        </div>
      </div>
    `;
    setTimeout(() => { initExamCharts(currentExam); }, 50);
  } else if (window.currentExamTab === "trends") {
    const exams = window.store.data.exams || [];

    if (exams.length === 0) {
      container.innerHTML = `
        <div class="card" style="text-align: center; padding: 60px 20px; color: var(--text-muted);">
          <div style="font-size: 36px; margin-bottom: 10px;">📈</div>
          <div style="font-size: 16px; font-weight: 700; color: #334155; margin-bottom: 6px;">暂无班级成绩历次变化走势</div>
          <div style="font-size: 13px; color: #94a3b8;">导入真实学生档案后历史模板数据已彻底清零，发布或导入日常考试成绩后将自动生成历次平均分走势图</div>
        </div>
      `;
      return;
    }

    container.innerHTML = `
      <div class="card">
        <div class="panel-header">
          <div class="panel-title">📈 班级历次考试平均分走势</div>
          <span class="badge badge-success">共 ${exams.length} 次考试记录</span>
        </div>
        <div style="height: 260px; position: relative;">
          <canvas id="classTrendChart"></canvas>
        </div>
      </div>
    `;
    setTimeout(() => { initClassTrendChart(exams); }, 50);
  }
};

window.triggerExcelScoreImport = function() {
  document.getElementById("excelScoreInput").click();
};

window.filterExamScores = function() {
  const kw = document.getElementById("examStudentSearch").value.trim().toLowerCase();
  const rows = document.querySelectorAll("#examScoresTableBody tr");
  rows.forEach(r => {
    r.style.display = r.innerText.toLowerCase().includes(kw) ? "" : "none";
  });
};

function initExamCharts(currentExam) {
  if (typeof Chart === "undefined" || !currentExam) return;
  const scores = currentExam.scores || [];
  if (scores.length === 0) return;

  const validScores = scores.map(s => (s.totalScore !== undefined ? s.totalScore : s.score)).filter(v => typeof v === 'number' && !isNaN(v));
  const count90_100 = validScores.filter(v => v >= 90).length;
  const count80_89 = validScores.filter(v => v >= 80 && v < 90).length;
  const count70_79 = validScores.filter(v => v >= 70 && v < 80).length;
  const count60_69 = validScores.filter(v => v >= 60 && v < 70).length;
  const countUnder60 = validScores.filter(v => v < 60).length;

  const distCanvas = document.getElementById("scoreDistChart");
  if (distCanvas) {
    const existing = Chart.getChart(distCanvas);
    if (existing) existing.destroy();

    new Chart(distCanvas, {
      type: "bar",
      data: {
        labels: ["90-100分", "80-89分", "70-79分", "60-69分", "60分以下"],
        datasets: [{
          label: "人数 (人)",
          data: [count90_100, count80_89, count70_79, count60_69, countUnder60],
          backgroundColor: ["#10b981", "#3b82f6", "#f59e0b", "#fb923c", "#ef4444"],
          borderRadius: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: { y: { beginAtZero: true, ticks: { precision: 0 } } },
        plugins: { legend: { display: false } }
      }
    });
  }

  const subjects = currentExam.subjects || ["语文", "数学", "英语"];
  const subAvgs = [];
  const subPassRates = [];
  subjects.forEach(sub => {
    const subScores = scores.map(s => (s.subjectScores && s.subjectScores[sub] !== undefined) ? s.subjectScores[sub] : (s[sub] !== undefined ? s[sub] : null)).filter(v => typeof v === 'number' && !isNaN(v));
    if (subScores.length > 0) {
      const avg = parseFloat((subScores.reduce((a, b) => a + b, 0) / subScores.length).toFixed(1));
      const passRate = parseFloat(((subScores.filter(v => v >= 60).length / subScores.length) * 100).toFixed(1));
      subAvgs.push(avg);
      subPassRates.push(passRate);
    } else {
      subAvgs.push(0);
      subPassRates.push(0);
    }
  });

  const subCanvas = document.getElementById("subjectCompareChart");
  if (subCanvas) {
    const existing = Chart.getChart(subCanvas);
    if (existing) existing.destroy();

    new Chart(subCanvas, {
      type: "bar",
      data: {
        labels: subjects,
        datasets: [
          { label: "平均分", data: subAvgs, backgroundColor: "#3b82f6", borderRadius: 6 },
          { label: "及格率 (%)", data: subPassRates, backgroundColor: "#10b981", borderRadius: 6 }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: { y: { min: 0, max: 100 } }
      }
    });
  }
}

function initClassTrendChart(exams) {
  if (typeof Chart === "undefined" || !exams || exams.length === 0) return;
  const canvas = document.getElementById("classTrendChart");
  if (!canvas) return;

  const existing = Chart.getChart(canvas);
  if (existing) existing.destroy();

  const sortedExams = [...exams].sort((a, b) => (a.date || '').localeCompare(b.date || ''));
  const labels = sortedExams.map(e => e.name + (e.date ? ` (${e.date.slice(5) || e.date})` : ''));
  const trendData = sortedExams.map(e => {
    const scList = e.scores || [];
    const vals = scList.map(s => (s.totalScore !== undefined ? s.totalScore : s.score)).filter(v => typeof v === 'number' && !isNaN(v));
    if (vals.length > 0) return parseFloat((vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1));
    return (e.stats && typeof e.stats.avgScore === 'number') ? e.stats.avgScore : 0;
  });

  const minVal = trendData.length > 0 ? Math.max(0, Math.floor(Math.min(...trendData) - 10)) : 0;
  const maxVal = trendData.length > 0 ? Math.min(100, Math.ceil(Math.max(...trendData) + 10)) : 100;

  new Chart(canvas, {
    type: "line",
    data: {
      labels: labels,
      datasets: [{
        label: "班级平均分",
        data: trendData,
        borderColor: "#2563eb",
        backgroundColor: "rgba(37, 99, 235, 0.1)",
        tension: 0.35,
        fill: true,
        pointRadius: 5,
        pointBackgroundColor: "#2563eb"
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: { y: { min: minVal, max: maxVal } }
    }
  });
}

window.currentDiagnoseData = null;
window.currentDiagnoseSubject = "total";

window.openStudentAcademicDetail = function(id, name, score, trend, level, defaultSubject) {
  const modal = document.getElementById("studentAcademicModal");
  if (!modal) return;
  const exams = window.store.data.exams || [];
  const currentExam = exams.find(e => e.id === window.currentExamId) || exams[0] || {};
  const scores = currentExam.scores || [];
  const sc = scores.find(s => s.studentId === id || s.name === name) || {
    studentId: id, name: name, score: score, totalScore: score, trend: trend, level: level, subjectScores: {}
  };

  window.currentDiagnoseData = {
    studentId: id,
    name: name,
    exam: currentExam,
    scoreItem: sc,
    allScores: scores
  };

  const initialSubject = (defaultSubject && (defaultSubject === "total" || (currentExam.subjects && currentExam.subjects.includes(defaultSubject)))) ? defaultSubject : "total";
  window.currentDiagnoseSubject = initialSubject;

  // 更新标签高亮
  document.querySelectorAll("#academicSubjectTabs .tab-pill").forEach(p => {
    if (p.getAttribute("data-sub") === initialSubject) {
      p.classList.add("active");
    } else {
      p.classList.remove("active");
    }
  });

  window.renderAcademicSubjectDiagnosis(initialSubject);
  modal.classList.add("active");
};

window.switchAcademicDetailSubject = function(sub, elem) {
  window.currentDiagnoseSubject = sub;
  document.querySelectorAll("#academicSubjectTabs .tab-pill").forEach(p => {
    if (p === elem || p.getAttribute("data-sub") === sub) {
      p.classList.add("active");
    } else {
      p.classList.remove("active");
    }
  });
  window.renderAcademicSubjectDiagnosis(sub);
};

window.renderAcademicSubjectDiagnosis = function(sub) {
  if (!window.currentDiagnoseData) return;
  const { name, exam, scoreItem, allScores } = window.currentDiagnoseData;
  const examName = exam.name || "第三单元质量测验";

  let currentVal = 0;
  let maxScore = 100;
  let rank = 1;
  let level = "良好";
  let advantage = "";
  let suggestion = "";
  let trendLabel = "";
  let subtitle = "";

  if (sub === "total") {
    currentVal = scoreItem.totalScore !== undefined ? scoreItem.totalScore : scoreItem.score;
    maxScore = ((exam.subjects && exam.subjects.length) || 4) * 100;
    // 计算全班总分排名
    const sorted = [...allScores].sort((a, b) => ((b.totalScore !== undefined ? b.totalScore : b.score) - (a.totalScore !== undefined ? a.totalScore : a.score)));
    rank = sorted.findIndex(s => s.studentId === scoreItem.studentId) + 1;
    if (rank <= 0) rank = 1;
    level = scoreItem.level || (currentVal / maxScore >= 0.9 ? "优秀" : currentVal / maxScore >= 0.8 ? "良好" : "及格");
    subtitle = `${examName} · 全科综合学情深度诊断报告`;
    trendLabel = (scoreItem.trend && scoreItem.trend.startsWith('+') ? '较上次进步 ' : '较上次 ') + (scoreItem.trend || '+0') + ' 分';
    advantage = "各学科协同发展均衡，综合认知架构健全；学科基础题与规范作答掌握极其牢固，卷面工整清晰，审题准确率高。";
    suggestion = "保持各科目优势互补与时间规划节奏，在各学科压轴综合题上加强拓展训练，重点提升跨学科知识整合与应用创新能力。";
  } else {
    maxScore = 100;
    currentVal = (scoreItem.subjectScores && scoreItem.subjectScores[sub] !== undefined) ? scoreItem.subjectScores[sub] : (scoreItem[sub] !== undefined ? scoreItem[sub] : 85);
    // 计算该单科在全班的排名
    const sorted = [...allScores].sort((a, b) => {
      const vA = (a.subjectScores && a.subjectScores[sub] !== undefined) ? a.subjectScores[sub] : (a[sub] !== undefined ? a[sub] : 0);
      const vB = (b.subjectScores && b.subjectScores[sub] !== undefined) ? b.subjectScores[sub] : (b[sub] !== undefined ? b[sub] : 0);
      return vB - vA;
    });
    rank = sorted.findIndex(s => s.studentId === scoreItem.studentId) + 1;
    if (rank <= 0) rank = 1;
    level = currentVal >= 90 ? "优秀" : currentVal >= 80 ? "良好" : currentVal >= 60 ? "及格" : "待提升";
    subtitle = `${examName} · 【${sub}】单科学情专项分析与提分诊断`;
    trendLabel = `单科得分率：${((currentVal / maxScore) * 100).toFixed(0)}% · 评定为【${level}】`;

    if (sub === "语文") {
      advantage = "现代文阅读主旨感知敏感，文段意境理解透彻；考场作文立意新颖深刻，卷面字迹秀美整洁，基础字词与病句辨析得分率高。";
      suggestion = "注重文言文实词、虚词典型用法的梳理总结，古诗文名句默写杜绝错别字；建议多阅读经典名著拓展深度思辨视野。";
    } else if (sub === "数学") {
      advantage = "数感敏锐、逻辑推理缜密，对代数式化简与几何辅助线构造有极佳直觉；压轴综合大题第一问与第二问解答完整严谨。";
      suggestion = "建议建立专项草稿纸规范推演习惯，注意细分题型的分类讨论与边界条件验证；对高频错题加强举一反三变式训练。";
    } else if (sub === "英语") {
      advantage = "日常词汇与句型积累丰富，听力抓取关键细节精准迅速；完形填空语境语感极佳，书面表达词汇丰富句式多样。";
      suggestion = "强化复合从句与长难句语法结构拆解；日常早读保持大声朗读并模拟标准语音语调，提升即时听说互动自信心。";
    } else if (sub === "科学") {
      advantage = "对自然物理现象观察细微，探究性实验假设与变量控制思维清晰；能熟练运用所学知识解释生活中的实际科学问题。";
      suggestion = "注重实验器材操作规范名称与实验结论的严密专业表述；定期归纳整理物质与能量等跨学科思维导图。";
    } else {
      advantage = `在${sub}学科的核心知识板块掌握扎实，能灵活运用基础原理分析典型问题。`;
      suggestion = `建议围绕${sub}学科的易错知识盲区查漏补缺，保持端正严谨的学习态度。`;
    }
  }

  // 更新 DOM
  const nameEl = document.getElementById("modalStudentName");
  if (nameEl) nameEl.innerText = name;
  const scoreEl = document.getElementById("modalStudentScore");
  if (scoreEl) scoreEl.innerHTML = `${currentVal} <span style="font-size:13px; font-weight:normal; color:#64748b;">分 / 满分${maxScore}</span>`;
  const trendEl = document.getElementById("modalStudentTrend");
  if (trendEl) trendEl.innerText = trendLabel;
  const subTitleEl = document.getElementById("modalDiagnoseSubtitle");
  if (subTitleEl) subTitleEl.innerText = subtitle;
  const rankBadgeEl = document.getElementById("modalSubjectRankBadge");
  if (rankBadgeEl) rankBadgeEl.innerText = `${sub === 'total' ? '全科总分' : sub + '单科'}排名：第 ${rank} 名 (共${allScores.length}人)`;
  const advTextEl = document.getElementById("modalAdvantageText");
  if (advTextEl) advTextEl.innerText = advantage;
  const sugTextEl = document.getElementById("modalSuggestText");
  if (sugTextEl) sugTextEl.innerText = suggestion;
  const levelEl = document.getElementById("modalStudentLevel");
  if (levelEl) {
    levelEl.innerText = level;
    levelEl.className = `badge ${level === '优秀' ? 'badge-success' : level === '良好' ? 'badge-info' : 'badge-warning'}`;
  }
  const chartTitleEl = document.getElementById("modalTrendChartTitle");
  if (chartTitleEl) chartTitleEl.innerText = `📈 【${sub === 'total' ? '全科总分' : sub}】历次考试走势`;

  // 绘制折线走势图
  setTimeout(() => {
    const canvas = document.getElementById("studentPersonalTrendChart");
    if (canvas && typeof Chart !== "undefined") {
      if (window.personalTrendChartInstance) {
        window.personalTrendChartInstance.destroy();
      }
      // 提取该学生在所有历史考试中的真实成绩记录
      const realHistoryLabels = [];
      const realHistoryData = [];
      const sortedExams = [...(window.store.data.exams || [])].sort((a, b) => (a.date || '').localeCompare(b.date || ''));
      sortedExams.forEach(e => {
        const sc = (e.scores || []).find(item => item.studentId === scoreItem.studentId || item.name === name);
        if (sc) {
          const val = sub === 'total' ? (sc.totalScore !== undefined ? sc.totalScore : sc.score) : ((sc.subjectScores && sc.subjectScores[sub] !== undefined) ? sc.subjectScores[sub] : sc[sub]);
          if (typeof val === 'number' && !isNaN(val)) {
            realHistoryLabels.push(e.name + (e.date ? ` (${e.date.slice(5) || e.date})` : ''));
            realHistoryData.push(val);
          }
        }
      });
      if (realHistoryLabels.length === 0) {
        realHistoryLabels.push(examName || '本次考试');
        realHistoryData.push(currentVal);
      }

      const minVal = Math.max(0, Math.floor(Math.min(...realHistoryData) - 10));

      window.personalTrendChartInstance = new Chart(canvas, {
        type: "line",
        data: {
          labels: realHistoryLabels,
          datasets: [{
            label: `${name} · ${sub === 'total' ? '全科成绩' : sub}走势`,
            data: realHistoryData,
            borderColor: sub === "total" ? "#3b82f6" : sub === "语文" ? "#10b981" : sub === "数学" ? "#f59e0b" : sub === "英语" ? "#8b5cf6" : "#06b6d4",
            backgroundColor: "rgba(59, 130, 246, 0.08)",
            tension: 0.35,
            fill: true,
            pointRadius: 6,
            pointBackgroundColor: "#2563eb"
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: { y: { min: minVal, max: maxScore } }
        }
      });
    }
  }, 40);
};

window.closeStudentAcademicDetail = function() {
  const modal = document.getElementById("studentAcademicModal");
  if (modal) modal.classList.remove("active");
};
