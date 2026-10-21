/**
 * 班主任工作台 - 4. 考勤请假管理 (Attendance)
 * 8种考勤状态、一键全员出勤、点击学生头像快捷轮换/弹窗修改状态、
 * 本周出勤趋势柱状图、本月请假类型分布堆叠图、迟到次数排行榜、月度考勤表 Excel 导出
 */

window.renderAttendanceView = function (container) {
  const students = window.store.data.students || [];
  window.currentAttendancePeriod = window.currentAttendancePeriod || "morning";
  const isMorning = window.currentAttendancePeriod === "morning";

  // 计算考勤统计 (按当前选中的 上午/下午 时段动态统计)
  let normal = 0, late = 0, earlyLeave = 0, casualLeave = 0, sickLeave = 0, absent = 0, officialLeave = 0;
  students.forEach(s => {
    const status = (isMorning ? s.attendanceMorning : s.attendanceAfternoon) || s.attendanceToday || "normal";
    switch (status) {
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

  const attRate = students.length > 0 ? ((normal / students.length) * 100).toFixed(1) : "100.0";

  // 统计真实迟到学生列表
  const lateStudents = [];
  const attRecords = (window.store.data.attendance && window.store.data.attendance.records) || {};
  const lateCountMap = {};
  Object.values(attRecords).forEach(dayRec => {
    if (dayRec && typeof dayRec === "object") {
      Object.keys(dayRec).forEach(stuId => {
        if (dayRec[stuId] === "late") {
          lateCountMap[stuId] = (lateCountMap[stuId] || 0) + 1;
        }
      });
    }
  });
  const todayStr = new Date().toISOString().slice(0, 10);
  const hasTodayRecorded = Boolean(attRecords[todayStr]);
  if (!hasTodayRecorded) {
    students.forEach(s => {
      if (s.attendanceMorning === "late" || s.attendanceAfternoon === "late" || s.attendanceToday === "late") {
        lateCountMap[s.id] = (lateCountMap[s.id] || 0) + 1;
      }
    });
  }
  Object.keys(lateCountMap).forEach(stuId => {
    const s = students.find(item => item.id === stuId || item.name === stuId);
    if (s) {
      lateStudents.push({ name: s.name, count: lateCountMap[stuId] });
    }
  });
  lateStudents.sort((a, b) => b.count - a.count);

  // 底部图表分析与迟到排行数据源判断
  const hasWeekData = Object.keys(attRecords).length > 0;
  const leaves = (window.store.data.attendance && window.store.data.attendance.leaves) || [];
  const activeLeavesCount = sickLeave + casualLeave + earlyLeave + officialLeave;
  const hasLeaveData = leaves.length > 0 || activeLeavesCount > 0;

  // HTML 结构 
  container.innerHTML = `
    <div class="module-header">
      <div class="module-title-area">
        <h2>⏱️ 考勤请假</h2>
        <p>小学 · 每日点名和请假管理，全班共 ${students.length} 名学生</p>
      </div>
      <div class="module-actions">
        <button class="btn btn-secondary" onclick="window.store.exportAttendanceExcel()">📤 导出月度考勤 (Excel)</button>
        <button class="btn btn-primary" onclick="window.openRegisterLeaveModal()">+ 登记请假</button>
      </div>
    </div>

    <!-- 顶部 6 个考勤分类指标卡  -->
    <div style="display: grid; grid-template-columns: repeat(6, 1fr); gap: 12px;">
      <div class="stat-card" style="padding: 14px;">
        <div class="stat-info">
          <div class="stat-label">正常出勤</div>
          <div class="stat-value" style="color: #10b981;">${normal}<span class="stat-unit">人</span></div>
        </div>
        <span style="font-size: 20px;">✅</span>
      </div>

      <div class="stat-card" style="padding: 14px;">
        <div class="stat-info">
          <div class="stat-label">迟到</div>
          <div class="stat-value" style="color: #f59e0b;">${late}<span class="stat-unit">人</span></div>
        </div>
        <span style="font-size: 20px;">⏰</span>
      </div>

      <div class="stat-card" style="padding: 14px;">
        <div class="stat-info">
          <div class="stat-label">病假</div>
          <div class="stat-value" style="color: #06b6d4;">${sickLeave}<span class="stat-unit">人</span></div>
        </div>
        <span style="font-size: 20px;">🏥</span>
      </div>

      <div class="stat-card" style="padding: 14px;">
        <div class="stat-info">
          <div class="stat-label">事假</div>
          <div class="stat-value" style="color: #3b82f6;">${casualLeave}<span class="stat-unit">人</span></div>
        </div>
        <span style="font-size: 20px;">📝</span>
      </div>

      <div class="stat-card" style="padding: 14px;">
        <div class="stat-info">
          <div class="stat-label">缺勤</div>
          <div class="stat-value" style="color: #ef4444;">${absent}<span class="stat-unit">人</span></div>
        </div>
        <span style="font-size: 20px;">🚨</span>
      </div>

      <div class="stat-card" style="padding: 14px; background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%); border-color: #bfdbfe;">
        <div class="stat-info">
          <div class="stat-label" style="color: #1e40af; font-weight: 700;">出勤率</div>
          <div class="stat-value" style="color: #1d4ed8;">${attRate}<span class="stat-unit">%</span></div>
        </div>
        <span style="font-size: 20px;">📈</span>
      </div>
    </div>

    <!-- 点名控制条 (支持上午/下午无缝交互切换) -->
    <div class="card" style="padding: 12px 18px; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 10px;">
      <div style="display: flex; align-items: center; gap: 12px;">
        <span style="font-size: 15px; font-weight: 700; color: #1e293b;">今日考勤点名 · <span style="color: var(--primary); font-weight: 800;">${isMorning ? '☀️ 上午点名 (晨检)' : '🌤️ 下午点名 (午检)'}</span></span>
        <span style="font-size: 12.5px; color: var(--text-muted);">（点击任一学生头像可直接修改或轮换【${isMorning ? '上午' : '下午'}】考勤状态）</span>
      </div>

      <div style="display: flex; align-items: center; gap: 12px;">
        <div class="tab-pills">
          <div class="tab-pill ${isMorning ? 'active' : ''}" id="attTimeMorning" onclick="window.switchAttendancePeriod('morning')" style="cursor: pointer; user-select: none;">上午</div>
          <div class="tab-pill ${!isMorning ? 'active' : ''}" id="attTimeAfternoon" onclick="window.switchAttendancePeriod('afternoon')" style="cursor: pointer; user-select: none;">下午</div>
        </div>
        <button class="btn btn-success" onclick="window.handleAllNormalClick()">
          ✨ 一键全员出勤
        </button>
      </div>
    </div>

    <!-- 全班学生考勤头像网格  -->
    <div class="card" style="padding: 20px;">
      <div class="attendance-students-grid">
        ${students.map(s => {
    const isBoy = s.gender === "男";
    const statusKey = (isMorning ? s.attendanceMorning : s.attendanceAfternoon) || s.attendanceToday || "normal";
    const statusLabelMap = {
      normal: "正常", late: "迟到", early_leave: "早退",
      casual_leave: "事假", sick_leave: "病假", absent: "缺勤",
      official_leave: "公假", other: "其他"
    };
    return `
            <div class="student-att-card" onclick="window.cycleStudentAttendance('${s.id}')" title="点击切换【${isMorning ? '上午' : '下午'}】考勤状态">
              <div class="student-att-avatar ${statusKey === 'normal' ? 'status-normal' : statusKey === 'late' ? 'status-late' : statusKey === 'absent' ? 'status-absent' : 'status-casual_leave'}" 
                style="border-width: 2px; overflow: hidden; padding: 0;">
                ${s.avatarUrl
        ? `<img src="${s.avatarUrl}" alt="${s.name}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;">`
        : (isBoy ? '👦' : '👧')}
              </div>
              <div class="student-att-name">${s.name}</div>
              <span class="student-att-status-pill status-${statusKey}">
                ${statusLabelMap[statusKey] || '正常'}
              </span>
            </div>
          `;
  }).join("")}
      </div>
    </div>

    <!-- 底部图表分析与迟到排行  -->
    <div style="display: grid; grid-template-columns: 1.2fr 1fr 0.8fr; gap: 16px;">
      <!-- 本周出勤趋势柱状图 -->
      <div class="card">
        <div class="panel-header">
          <div class="panel-title">📊 本周出勤趋势</div>
          <span class="panel-subtitle">${hasWeekData ? '实际出勤率波动' : '暂无走势'}</span>
        </div>
        <div style="height: 180px; position: relative;">
          ${hasWeekData ? '<canvas id="weeklyAttendanceChart"></canvas>' : `
            <div style="height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; color: var(--text-muted); font-size: 13px;">
              <span style="font-size: 28px; margin-bottom: 6px;">📅</span>
              暂无本周出勤趋势数据，日常点名后自动绘制出勤率波动
            </div>
          `}
        </div>
      </div>

      <!-- 本月请假类型分布堆叠图 -->
      <div class="card">
        <div class="panel-header">
          <div class="panel-title">📉 本月请假类型统计</div>
          <span class="panel-subtitle">${hasLeaveData ? '病假/事假/公假分布' : '暂无请假'}</span>
        </div>
        <div style="height: 180px; position: relative;">
          ${hasLeaveData ? '<canvas id="monthlyLeaveChart"></canvas>' : `
            <div style="height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; color: var(--text-muted); font-size: 13px;">
              <span style="font-size: 28px; margin-bottom: 6px;">🌿</span>
              本月暂无学生请假记录，全勤习惯优良！
            </div>
          `}
        </div>
      </div>

      <!-- 近期迟到排行 -->
      <div class="card">
        <div class="panel-header">
          <div class="panel-title">⏰ 近期迟到排行</div>
          <span class="badge ${lateStudents.length > 0 ? 'badge-warning' : 'badge-success'}">${lateStudents.length > 0 ? '本月累计' : '全勤标兵'}</span>
        </div>
        <div style="display: flex; flex-direction: column; gap: 8px;">
          ${lateStudents.length === 0 ? `
            <div style="text-align: center; padding: 28px 10px; color: var(--text-muted); font-size: 13px;">
              <span style="font-size: 26px; display: block; margin-bottom: 6px;">🎉</span>
              暂无迟到记录，全班出勤习惯优良！
            </div>
          ` : lateStudents.slice(0, 5).map((item, idx) => `
            <div style="display: flex; align-items: center; justify-content: space-between; padding: 6px 10px; background: ${idx === 0 ? '#fff7ed' : '#f8fafc'}; border-radius: 6px;">
              <div style="display: flex; align-items: center; gap: 8px; font-size: 13px; font-weight: 700;">
                <span style="color: ${idx === 0 ? '#ea580c' : '#64748b'}; width: 16px;">${idx + 1}</span>
                <span>${item.name}</span>
              </div>
              <span class="badge ${idx === 0 ? 'badge-danger' : 'badge-warning'}">${item.count} 次</span>
            </div>
          `).join("")}
        </div>
      </div>
    </div>
  `;

  setTimeout(() => {
    initAttendanceCharts();
  }, 50);
};

// 切换上午/下午考勤时段
window.switchAttendancePeriod = function (period) {
  window.currentAttendancePeriod = period;
  const label = period === "morning" ? "上午 (晨检)" : "下午 (午检)";
  if (window.showToast) window.showToast(`已切换至【${label}】考勤点名`, "info");
  window.renderAttendanceView(document.getElementById("mainContentArea"));
};

// 循环轮换学生考勤状态 (正常 -> 迟到 -> 事假 -> 病假 -> 缺勤 -> 早退 -> 公假 -> 正常)
window.cycleStudentAttendance = function (studentId) {
  const isMorning = (window.currentAttendancePeriod || "morning") === "morning";
  const s = window.store.data.students.find(item => item.id === studentId);
  if (!s) return;
  const currentStatus = (isMorning ? s.attendanceMorning : s.attendanceAfternoon) || s.attendanceToday || "normal";
  const cycleMap = {
    normal: "late",
    late: "casual_leave",
    casual_leave: "sick_leave",
    sick_leave: "absent",
    absent: "early_leave",
    early_leave: "official_leave",
    official_leave: "normal"
  };
  const nextStatus = cycleMap[currentStatus] || "normal";
  window.store.toggleStudentAttendance(studentId, nextStatus, window.currentAttendancePeriod || "morning");
  window.renderAttendanceView(document.getElementById("mainContentArea"));
};

// 一键全员正常
window.handleAllNormalClick = function () {
  const period = window.currentAttendancePeriod || "morning";
  window.store.setAllAttendanceNormal(period);
  const label = period === "morning" ? "上午" : "下午";
  window.showToast(`已将全班所有学生【${label}】考勤设置为【正常出勤】！`, "success");
  window.renderAttendanceView(document.getElementById("mainContentArea"));
};

function initAttendanceCharts() {
  if (typeof Chart === "undefined") return;
  const data = window.store.data || {};
  const students = data.students || [];
  const attRecords = (data.attendance && data.attendance.records) || {};
  const recordDates = Object.keys(attRecords).sort();

  // 1. 周出勤走势柱状图 
  const weekCanvas = document.getElementById("weeklyAttendanceChart");
  if (weekCanvas && recordDates.length > 0 && students.length > 0) {
    const existing = Chart.getChart(weekCanvas);
    if (existing) existing.destroy();

    const recentDates = recordDates.slice(-5);
    const dayNames = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];
    const labels = recentDates.map(d => {
      try {
        const dt = new Date(d);
        return `${dayNames[dt.getDay()]} (${d.slice(5)})`;
      } catch (e) {
        return d;
      }
    });

    const rates = recentDates.map(d => {
      const rec = attRecords[d] || {};
      let norm = 0;
      students.forEach(s => {
        const st = rec[s.id] || rec[s.name] || "normal";
        if (st === "normal") norm++;
      });
      return parseFloat(((norm / students.length) * 100).toFixed(1));
    });

    const minRate = Math.max(0, Math.min(...rates, 80) - 10);

    new Chart(weekCanvas, {
      type: "bar",
      data: {
        labels: labels,
        datasets: [{
          label: "出勤率 (%)",
          data: rates,
          backgroundColor: "#3b82f6",
          hoverBackgroundColor: "#2563eb",
          borderRadius: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            min: minRate,
            max: 100,
            ticks: {
              callback: function (value) { return value + "%"; }
            }
          }
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: function (ctx) { return "出勤率: " + ctx.parsed.y + "%"; }
            }
          }
        }
      }
    });
  }

  // 2. 本月请假类型分布堆叠图
  const leaveCanvas = document.getElementById("monthlyLeaveChart");
  const leaves = (data.attendance && data.attendance.leaves) || [];
  let sickCount = 0, casualCount = 0, officialCount = 0;
  students.forEach(s => {
    if (s.attendanceToday === "sick_leave") sickCount++;
    else if (s.attendanceToday === "casual_leave") casualCount++;
    else if (s.attendanceToday === "official_leave" || s.attendanceToday === "early_leave") officialCount++;
  });
  const hasLeaveData = leaves.length > 0 || (sickCount + casualCount + officialCount) > 0;

  if (leaveCanvas && hasLeaveData) {
    const existing = Chart.getChart(leaveCanvas);
    if (existing) existing.destroy();

    // 动态按周聚合请假数据
    const weeks = ["第1周", "第2周", "第3周", "第4周"];
    const sickData = [0, 0, 0, 0];
    const casualData = [0, 0, 0, 0];
    const officialData = [0, 0, 0, 0];

    leaves.forEach(l => {
      const dt = l.date ? new Date(l.date) : new Date();
      const weekIdx = Math.min(3, Math.floor((dt.getDate() - 1) / 7));
      const type = l.type || "";
      if (type.includes("sick") || type.includes("病")) {
        sickData[weekIdx]++;
      } else if (type.includes("casual") || type.includes("事")) {
        casualData[weekIdx]++;
      } else {
        officialData[weekIdx]++;
      }
    });

    if (leaves.length === 0) {
      const todayWeekIdx = Math.min(3, Math.floor((new Date().getDate() - 1) / 7));
      sickData[todayWeekIdx] += sickCount;
      casualData[todayWeekIdx] += casualCount;
      officialData[todayWeekIdx] += officialCount;
    }

    new Chart(leaveCanvas, {
      type: "bar",
      data: {
        labels: weeks,
        datasets: [
          { label: "病假", data: sickData, backgroundColor: "#06b6d4" },
          { label: "事假", data: casualData, backgroundColor: "#3b82f6" },
          { label: "公假", data: officialData, backgroundColor: "#8b5cf6" }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: { stacked: true },
          y: { stacked: true, beginAtZero: true, ticks: { stepSize: 1 } }
        },
        plugins: {
          legend: { position: "bottom", labels: { boxWidth: 10, font: { size: 10 } } }
        }
      }
    });
  }
}
