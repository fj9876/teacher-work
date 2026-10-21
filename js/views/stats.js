/**
 * 班主任工作台 - 15. 统计报表 (Statistics & Reports)
 * 包含：班级工作数据大屏看板、出勤/作业/评价多维分析图表、
 * 10大常用报表中心一键生成与导出 (Excel/Word/PDF)
 */

window.renderStatsView = function (container) {
  window.currentStatsTab = window.currentStatsTab || "dashboard";

  container.innerHTML = `
    <div class="module-header">
      <div class="module-title-area">
        <h2>📊 统计报表中心</h2>
        <p>集中汇总班主任日常工作数据，智能生成日记、周结、月报与学期工作总结材料</p>
      </div>
      <div class="module-actions">
        <button class="btn btn-primary" onclick="window.showToast('已开始一键导出全学期汇总压缩包！', 'success')">📦 导出全套总结包</button>
      </div>
    </div>

    <!-- 顶部二级导航切换  -->
    <div class="card" style="padding: 10px 18px; display: flex; align-items: center; justify-content: space-between;">
      <div class="tab-pills" id="statsSubTabs">
        <div class="tab-pill ${window.currentStatsTab === 'dashboard' ? 'active' : ''}" data-tab="dashboard" onclick="window.switchStatsTab('dashboard', this)">📈 数据看板大屏</div>
        <div class="tab-pill ${window.currentStatsTab === 'reports' ? 'active' : ''}" data-tab="reports" onclick="window.switchStatsTab('reports', this)">📑 常用报表中心 (10套)</div>
      </div>
    </div>

    <div id="statsContentArea">
      <!-- 动态填充 -->
    </div>
  `;

  window.renderStatsContent();
};

window.switchStatsTab = function (tab, elem) {
  window.currentStatsTab = tab;
  document.querySelectorAll("#statsSubTabs .tab-pill").forEach(p => {
    if (p === elem || p.getAttribute("data-tab") === tab) {
      p.classList.add("active");
    } else {
      p.classList.remove("active");
    }
  });
  window.renderStatsContent();
};

window.renderStatsContent = function () {
  const container = document.getElementById("statsContentArea");
  if (!container) return;

  if (window.currentStatsTab === "dashboard") {
    // 数据看板大屏 
    const data = window.store.data || {};
    const students = data.students || [];
    const totalStudents = students.length;

    // 1. 出勤率与请假人数计算
    let normal = 0, late = 0, earlyLeave = 0, casualLeave = 0, sickLeave = 0, absent = 0, officialLeave = 0;
    students.forEach(s => {
      switch (s.attendanceToday) {
        case "normal": normal++; break;
        case "late": late++; break;
        case "early_leave": earlyLeave++; break;
        case "casual_leave": casualLeave++; break;
        case "sick_leave": sickLeave++; break;
        case "absent": absent++; break;
        case "official_leave": officialLeave++; break;
        default: normal++; break;
      }
    });
    const attRate = totalStudents > 0 ? ((normal / totalStudents) * 100).toFixed(1) : "0.0";
    const totalLeave = sickLeave + casualLeave + earlyLeave + officialLeave;
    let leaveDetail = "今日全员在校，无请假";
    if (totalLeave > 0) {
      const parts = [];
      if (sickLeave > 0) parts.push(`病假${sickLeave}`);
      if (casualLeave > 0) parts.push(`事假${casualLeave}`);
      if (earlyLeave > 0) parts.push(`早退${earlyLeave}`);
      if (officialLeave > 0) parts.push(`公假${officialLeave}`);
      leaveDetail = parts.join(" · ") || `请假${totalLeave}人`;
    }

    // 2. 作业完成率计算 (动态核算，无作业归零)
    const hwList = data.homeworkList || [];
    let hwRate = "0.0";
    let hwSub = "暂无作业数据";
    if (hwList.length > 0 && totalStudents > 0) {
      let totalSubmitted = 0;
      let totalRequired = 0;
      hwList.forEach(h => {
        const sub = (h.stats && typeof h.stats.submitted === 'number') ? h.stats.submitted : 0;
        const tot = (h.stats && typeof h.stats.total === 'number' && h.stats.total > 0) ? h.stats.total : totalStudents;
        totalSubmitted += sub;
        totalRequired += tot;
      });
      if (totalRequired > 0) {
        hwRate = ((totalSubmitted / totalRequired) * 100).toFixed(1);
        hwSub = `共发布 ${hwList.length} 项学科作业`;
      }
    }

    // 3. 表扬激励与成长评价记录
    const growthEvents = data.growthEvents || [];
    const praiseCount = growthEvents.filter(e => e.tag === "表扬" || (e.flowerCount && e.flowerCount > 0)).length;
    const dimensions = window.store.getGrowthDimensions ? window.store.getGrowthDimensions() : (data.growthDimensions || []);
    const evalCount = growthEvents.length || dimensions.reduce((acc, d) => acc + (Number(d.count) || 0), 0);
    const evalSub = evalCount > 0 ? (praiseCount > 0 ? `其中表扬激励 ${praiseCount} 条` : `累计记录 ${evalCount} 条评价`) : "暂无评价记录";

    // 4. 家校沟通记录
    const comm = data.communication || {};
    const commLogs = comm.logs || [];
    const commNotices = comm.notices || [];
    const commSub = commLogs.length > 0 ? `通知${commNotices.length}篇 · 沟通${commLogs.length}次` : "暂无沟通记录";

    // 5. 安全教育台账
    const safety1530 = data.safety1530 || [];
    const safetySub = safety1530.length > 0 ? "1530按时留痕归档" : "暂无安全教育台账";

    // 6. 班级活动开展
    const activities = data.activities || [];
    const actSub = activities.length > 0 ? `已开展 ${activities.length} 场主题活动` : "暂无班级活动记录";

    // 7. 班务完成率
    const tasks = data.tasks || [];
    const completedTasks = tasks.filter(t => t.status === "completed").length;
    const taskRate = tasks.length > 0 ? ((completedTasks / tasks.length) * 100).toFixed(1) : "0.0";
    const taskSub = tasks.length > 0 ? `已完成 ${completedTasks}/${tasks.length} 项班务` : "暂无班务任务";

    // 考勤与评价图表数据源判断
    const attRecords = (data.attendance && data.attendance.records) || {};
    const hasAttRecords = Object.keys(attRecords).length > 0;
    const hasEvalData = growthEvents.length > 0 || dimensions.some(d => (Number(d.count) || 0) > 0);

    container.innerHTML = `
      <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; margin-bottom: 16px;">
        <div class="stat-card" style="padding: 14px;">
          <div class="stat-info">
            <div class="stat-label">出勤率</div>
            <div class="stat-value" style="color: #2563eb;">${attRate}<span class="stat-unit">%</span></div>
            <div style="font-size: 11px; color: #10b981; font-weight: 600;">实到 ${normal} / 应到 ${totalStudents} 人</div>
          </div>
          <span style="font-size: 24px;">📈</span>
        </div>

        <div class="stat-card" style="padding: 14px;">
          <div class="stat-info">
            <div class="stat-label">今日请假人数</div>
            <div class="stat-value" style="color: #f59e0b;">${totalLeave}<span class="stat-unit">人</span></div>
            <div style="font-size: 11px; color: #64748b;">${leaveDetail}</div>
          </div>
          <span style="font-size: 24px;">👥</span>
        </div>

        <div class="stat-card" style="padding: 14px;">
          <div class="stat-info">
            <div class="stat-label">作业完成率</div>
            <div class="stat-value" style="color: #059669;">${hwRate}<span class="stat-unit">%</span></div>
            <div style="font-size: 11px; color: #10b981; font-weight: 600;">${hwSub}</div>
          </div>
          <span style="font-size: 24px;">📚</span>
        </div>

        <div class="stat-card" style="padding: 14px;">
          <div class="stat-info">
            <div class="stat-label">表扬激励记录</div>
            <div class="stat-value" style="color: #7c3aed;">${evalCount}<span class="stat-unit">条</span></div>
            <div style="font-size: 11px; color: #10b981; font-weight: 600;">${evalSub}</div>
          </div>
          <span style="font-size: 24px;">🌸</span>
        </div>

        <div class="stat-card" style="padding: 14px;">
          <div class="stat-info">
            <div class="stat-label">家校沟通次数</div>
            <div class="stat-value" style="color: #0891b2;">${commLogs.length}<span class="stat-unit">次</span></div>
            <div style="font-size: 11px; color: #10b981;">${commSub}</div>
          </div>
          <span style="font-size: 24px;">📞</span>
        </div>

        <div class="stat-card" style="padding: 14px;">
          <div class="stat-info">
            <div class="stat-label">安全教育台账</div>
            <div class="stat-value" style="color: #16a34a;">${safety1530.length}<span class="stat-unit">次</span></div>
            <div style="font-size: 11px; color: #16a34a;">${safetySub}</div>
          </div>
          <span style="font-size: 24px;">🛡️</span>
        </div>

        <div class="stat-card" style="padding: 14px;">
          <div class="stat-info">
            <div class="stat-label">班级活动开展</div>
            <div class="stat-value" style="color: #ec4899;">${activities.length}<span class="stat-unit">次</span></div>
            <div style="font-size: 11px; color: #64748b;">${actSub}</div>
          </div>
          <span style="font-size: 24px;">🎉</span>
        </div>

        <div class="stat-card" style="padding: 14px;">
          <div class="stat-info">
            <div class="stat-label">班务按期完成率</div>
            <div class="stat-value" style="color: #4f46e5;">${taskRate}<span class="stat-unit">%</span></div>
            <div style="font-size: 11px; color: #10b981;">${taskSub}</div>
          </div>
          <span style="font-size: 24px;">✅</span>
        </div>
      </div>

      <!-- 核心多维分析图表  -->
      <div style="display: grid; grid-template-columns: 1.2fr 1fr; gap: 16px;">
        <div class="card">
          <div class="panel-header">
            <div class="panel-title">📈 月度出勤率变化走势</div>
            <span class="badge ${hasAttRecords ? 'badge-success' : 'badge-info'}">${hasAttRecords ? '动态走势' : '暂无历史记录'}</span>
          </div>
          <div style="height: 220px; position: relative;">
            ${hasAttRecords ? '<canvas id="monthlyAttTrendChart"></canvas>' : `
              <div style="height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; color: var(--text-muted); font-size: 13px;">
                <span style="font-size: 28px; margin-bottom: 6px;">📅</span>
                暂无历史考勤走势数据，日常点名后将自动按日/周绘制变化趋势
              </div>
            `}
          </div>
        </div>

        <div class="card">
          <div class="panel-header">
            <div class="panel-title">🏷️ 成长评价十维分布</div>
            <span class="panel-subtitle">${hasEvalData ? '各维度评价分布均衡' : '暂无评价记录'}</span>
          </div>
          <div style="height: 220px; position: relative;">
            ${hasEvalData ? '<canvas id="evalDoughnutChart"></canvas>' : `
              <div style="height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; color: var(--text-muted); font-size: 13px;">
                <span style="font-size: 28px; margin-bottom: 6px;">🌱</span>
                暂无成长评价数据，在【成长评价】记录表现后将自动展示十维分布
              </div>
            `}
          </div>
        </div>
      </div>
    `;

    setTimeout(() => {
      initStatsCharts();
    }, 50);
  } else if (window.currentStatsTab === "reports") {
    // 常用报表中心 (支持系统内置与自定义模板增删改查)
    const reportTemplates = (window.store.data.reportTemplates && window.store.data.reportTemplates.length > 0)
      ? window.store.data.reportTemplates
      : [
        { id: "r1", name: "每日班级日志", cycle: "每天生成", desc: "汇总今日出勤、请假、课表、值日及重要事项记录", format: "Excel / PDF" },
        { id: "r2", name: "每周班务总结", cycle: "每周更新", desc: "本周事务完成情况、重点学生跟进、安全教育留痕", format: "Excel / Word" },
        { id: "r3", name: "月度工作总结", cycle: "每月生成", desc: "出勤率汇总、学情月考分析、家校沟通月度报表", format: "Word / PDF" },
        { id: "r4", name: "学生考勤明细表", cycle: "每月生成", desc: "全班45名学生每日出勤、病事假、迟到累计汇总表", format: "Excel" },
        { id: "r5", name: "作业完成情况表", cycle: "每周更新", desc: "各科作业提交率、未交清单、订正率周报表", format: "Excel" },
        { id: "r6", name: "学生成长记录表", cycle: "每月生成", desc: "包含十维评价表现、小红花积分榜、荣誉勋章明细", format: "Excel / PDF" },
        { id: "r7", name: "家校沟通记录表", cycle: "每周生成", desc: "电话/微信/面谈/家访台账留痕，便于督导检查", format: "Excel / Word" },
        { id: "r8", name: "1530安全教育台账", cycle: "活动后更新", desc: "1分钟放学提醒、5分钟周末教育、长假30分钟专题归档", format: "Excel / PDF" },
        { id: "r9", name: "班级活动纪要相册", cycle: "活动后更新", desc: "班会、家长会、研学活动图文纪要与总结报告", format: "PDF" },
        { id: "r10", name: "学期班主任工作总结", cycle: "学期末生成", desc: "全学期班级建设全景式述职总结报告（配图表）", format: "Word / PDF" }
      ];

    container.innerHTML = `
      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px; flex-wrap: wrap; gap: 10px;">
        <div style="font-size: 13.5px; color: var(--text-muted);">
          共收录 <strong>${reportTemplates.length}</strong> 套标准与自定义报表模板，支持实时动态绑定班级数据直接导出。
        </div>
        <div style="display: flex; gap: 8px;">
          <button class="btn btn-sm btn-primary" onclick="window.openAddReportTemplateModal()">+ 添加自定义模板</button>
          <button class="btn btn-sm btn-secondary" onclick="document.getElementById('customReportTemplateFileInput').click()">📁 上传本地模板文件</button>
          <button class="btn btn-sm btn-secondary" onclick="window.store.exportStudentsExcel()">📤 导出全员花名册</button>
        </div>
      </div>

      <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(290px, 1fr)); gap: 14px;">
        ${reportTemplates.map((r, idx) => `
          <div class="card" style="padding: 16px; border-top: 3px solid var(--primary); display: flex; flex-direction: column; justify-content: space-between;">
            <div>
              <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px;">
                <span style="font-size: 15px; font-weight: 800; color: #1e293b;">📄 ${r.name}</span>
                <span class="badge badge-info">${r.cycle || '常用'}</span>
              </div>
              <p style="font-size: 12px; color: var(--text-muted); line-height: 1.5; margin-bottom: 12px; min-height: 36px;">
                ${r.desc || '汇总班级各项业务数据，支持格式化导出与留痕归档。'}
              </p>
            </div>

            <div style="display: flex; align-items: center; justify-content: space-between; border-top: 1px solid var(--border-light); padding-top: 10px; gap: 6px;">
              <span style="font-size: 11px; color: #64748b;">格式: <strong>${r.format || 'Excel'}</strong></span>
              <div style="display: flex; gap: 4px;">
                <button class="btn btn-sm btn-primary" style="padding: 3px 8px; font-size: 12px;" onclick="window.handleExportReport('${r.name}')">
                  📥 导出
                </button>
                <button class="btn btn-sm btn-secondary" style="padding: 3px 6px; font-size: 12px;" onclick="window.openEditReportTemplateModal(${idx})" title="编辑模板信息">
                  ✏️
                </button>
                <button class="btn btn-sm btn-secondary" style="padding: 3px 6px; font-size: 12px;" onclick="window.deleteReportTemplateItem(${idx})" title="删除模板">
                  🗑️
                </button>
              </div>
            </div>
          </div>
        `).join("")}
      </div>
    `;
  }
};

window.deleteReportTemplateItem = function (index) {
  if (confirm("确定要删除该报表模板吗？")) {
    window.store.deleteReportTemplate(index);
    window.showToast("报表模板已删除！", "info");
    window.renderStatsContent();
  }
};

window.handleExportReport = function (name) {
  if (name.includes("考勤")) {
    window.store.exportAttendanceExcel();
  } else if (name.includes("安全")) {
    window.store.exportSafety1530Excel();
  } else if (name.includes("名单") || name.includes("花名册") || name.includes("档案")) {
    window.store.exportStudentsExcel();
  } else {
    window.showToast(`已成功导出《${name}》数据包！`, "success");
  }
};

function initStatsCharts() {
  if (typeof Chart === "undefined") return;
  const data = window.store.data || {};
  const students = data.students || [];
  const attRecords = (data.attendance && data.attendance.records) || {};
  const recordDates = Object.keys(attRecords).sort();

  // 1. 月度出勤率变化走势
  const attCanvas = document.getElementById("monthlyAttTrendChart");
  if (attCanvas && recordDates.length > 0 && students.length > 0) {
    const existing = Chart.getChart(attCanvas);
    if (existing) existing.destroy();

    const labels = [];
    const rateValues = [];
    recordDates.slice(-7).forEach(d => {
      const dayRec = attRecords[d] || {};
      let dayNormal = 0;
      students.forEach(s => {
        const status = dayRec[s.id] || dayRec[s.name] || "normal";
        if (status === "normal") dayNormal++;
      });
      labels.push(d.length > 5 ? d.slice(5) : d);
      rateValues.push(parseFloat(((dayNormal / students.length) * 100).toFixed(1)));
    });

    new Chart(attCanvas, {
      type: "line",
      data: {
        labels: labels,
        datasets: [{
          label: "出勤率 (%)",
          data: rateValues,
          borderColor: "#2563eb",
          backgroundColor: "rgba(37, 99, 235, 0.1)",
          tension: 0.35,
          fill: true,
          pointRadius: 5
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: { y: { min: 60, max: 100 } }
      }
    });
  }

  // 2. 成长评价十维分布
  const evalCanvas = document.getElementById("evalDoughnutChart");
  if (evalCanvas) {
    const existing = Chart.getChart(evalCanvas);
    if (existing) existing.destroy();

    const growthEvents = data.growthEvents || [];
    const dimensions = window.store.getGrowthDimensions ? window.store.getGrowthDimensions() : (data.growthDimensions || []);
    
    // 动态提取各维度评价数量
    const dimMap = {};
    dimensions.forEach(d => {
      if (d.name) dimMap[d.name] = Number(d.count) || 0;
    });
    growthEvents.forEach(e => {
      const dim = e.dimension || e.category || "综合表现";
      dimMap[dim] = (dimMap[dim] || 0) + 1;
    });

    const activeLabels = Object.keys(dimMap).filter(k => dimMap[k] > 0);
    if (activeLabels.length > 0) {
      const activeData = activeLabels.map(k => dimMap[k]);
      const palette = ["#3b82f6", "#10b981", "#f59e0b", "#8b5cf6", "#ec4899", "#06b6d4", "#f97316", "#14b8a6", "#6366f1", "#84cc16"];

      new Chart(evalCanvas, {
        type: "doughnut",
        data: {
          labels: activeLabels,
          datasets: [{
            data: activeData,
            backgroundColor: palette.slice(0, activeLabels.length)
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { position: "right", labels: { boxWidth: 10, font: { size: 10.5 } } } }
        }
      });
    }
  }
}
