/**
 * 班主任工作台 - 1. 班级总览视图 (Dashboard)
 * 具备：问候卡片、4核心统计卡片、8个快捷操作、今日课表、
 * 今日出勤环形图、重点关注学生、各科作业柱状图、近期考试活动、待办班务
 */

window.renderDashboardView = function (container) {
  const data = window.store.data;
  const students = data.students || [];
  const tasks = data.tasks || [];
  const hwList = data.homeworkList || [];
  const classInfo = data.classInfo || {};

  // 计算今日出勤人数统计
  let normalCount = 0, lateCount = 0, leaveCount = 0, absentCount = 0;
  students.forEach(s => {
    if (s.attendanceToday === "normal") normalCount++;
    else if (s.attendanceToday === "late") lateCount++;
    else if (s.attendanceToday === "absent") absentCount++;
    else leaveCount++;
  });

  const pendingTasksCount = tasks.filter(t => t.status === "pending" || t.status === "in_progress").length;

  // 动态根据真实作业列表计算作业完成率 (无作业时自动归零)
  let hwRate = "0.0";
  if (hwList.length > 0 && students.length > 0) {
    let totalSubmitted = 0;
    let totalRequired = 0;
    hwList.forEach(h => {
      const sub = (h.stats && typeof h.stats.submitted === 'number') ? h.stats.submitted : 0;
      const tot = (h.stats && typeof h.stats.total === 'number' && h.stats.total > 0) ? h.stats.total : students.length;
      totalSubmitted += sub;
      totalRequired += tot;
    });
    if (totalRequired > 0) {
      hwRate = ((totalSubmitted / totalRequired) * 100).toFixed(1);
    }
  }

  // 智能动态筛选重点关注学生（留守儿童、困难家庭、标签含需要/重点关注或备注含重点）
  const focusStudents = students.filter(s =>
    (s.tags && (s.tags.includes("需要关注") || s.tags.includes("重点关注"))) ||
    s.isLeftBehind ||
    s.hardshipCategory ||
    (s.notes && (s.notes.includes("重点") || s.notes.includes("关注")))
  ).slice(0, 3);

  const now = new Date();
  const lunarInfo = (window.getLunarDate && typeof window.getLunarDate === 'function')
    ? window.getLunarDate(now)
    : { lunarText: '七月廿五', lunarShort: '七月廿五', lunarFull: '农历丙午年七月廿五', ganzhiYear: '丙午年', zodiac: '马' };

  // 智能识别今日与明日过中国通用农历生日的学生清单 (严格仅限农历生日，不显示公历生日)
  const todayBirthdayStudents = (window.getTodayBirthdayStudents && typeof window.getTodayBirthdayStudents === 'function')
    ? window.getTodayBirthdayStudents(students, now)
    : [];

  const tomorrowBirthdayStudents = (window.getTomorrowBirthdayStudents && typeof window.getTomorrowBirthdayStudents === 'function')
    ? window.getTomorrowBirthdayStudents(students, now)
    : [];

  const teacherName = (typeof classInfo.teacher === 'object' && classInfo.teacher ? classInfo.teacher.name : (typeof classInfo.teacher === 'string' ? classInfo.teacher : "周老师")) || "周老师";

  const dateInfo = (window.getCurrentDateInfo && typeof window.getCurrentDateInfo === 'function')
    ? window.getCurrentDateInfo()
    : {
      displayDate: `${now.getFullYear()}年${now.getMonth() + 1}月${now.getDate()}日`,
      displayFull: `${now.getFullYear()}年${now.getMonth() + 1}月${now.getDate()}日 ${["周日", "周一", "周二", "周三", "周四", "周五", "周六"][now.getDay()]} (农历${lunarInfo.lunarShort}) · 第${(function(){
        const m = now.getMonth() + 1;
        const start = (m >= 9 || m === 1 || (m === 8 && now.getDate() >= 25)) ? new Date((m === 1 ? now.getFullYear() - 1 : now.getFullYear()), 8, 1) : new Date(now.getFullYear(), 1, 20);
        const getMon = d => { const dt = new Date(d.getFullYear(), d.getMonth(), d.getDate()); dt.setDate(dt.getDate() + (dt.getDay() === 0 ? -6 : 1 - dt.getDay())); dt.setHours(0,0,0,0); return dt; };
        return Math.max(1, Math.round((getMon(now) - getMon(start))/(7*24*3600*1000)) + 1);
      })()}周`,
      dayStr: ["周日", "周一", "周二", "周三", "周四", "周五", "周六"][now.getDay()],
      weekDayFullStr: ["星期日", "星期一", "星期二", "星期三", "星期四", "星期五", "星期六"][now.getDay()],
      weekNum: (function(){
        const m = now.getMonth() + 1;
        const start = (m >= 9 || m === 1 || (m === 8 && now.getDate() >= 25)) ? new Date((m === 1 ? now.getFullYear() - 1 : now.getFullYear()), 8, 1) : new Date(now.getFullYear(), 1, 20);
        const getMon = d => { const dt = new Date(d.getFullYear(), d.getMonth(), d.getDate()); dt.setDate(dt.getDate() + (dt.getDay() === 0 ? -6 : 1 - dt.getDay())); dt.setHours(0,0,0,0); return dt; };
        return Math.max(1, Math.round((getMon(now) - getMon(start))/(7*24*3600*1000)) + 1);
      })()
    };
  const hour = now.getHours();
  const greetingWord = hour < 9 ? "早上好" : hour < 12 ? "上午好" : hour < 14 ? "中午好" : hour < 18 ? "下午好" : "晚上好";

  // HTML 结构 
  container.innerHTML = `
    <div class="dashboard-grid">
      <!-- 1. 橙色/珊瑚红问候横幅 -->
      <div class="greeting-banner" style="display: flex; align-items: center; justify-content: space-between; gap: 20px;">
        <!-- 左侧：问候语与日期天气 -->
        <div class="greeting-content" style="display: flex; flex-direction: column; gap: 6px; flex-shrink: 0;">
          <h1 style="margin: 0; font-size: 24px; font-weight: 700; display: flex; align-items: center; gap: 8px;">
            ${greetingWord}，${teacherName} ☀️
          </h1>
          <div class="greeting-meta" style="display: flex; align-items: center; flex-wrap: wrap; gap: 10px;">
            <span id="dashboardDateText">📅 ${dateInfo.displayDate || (now.getFullYear() + '年' + (now.getMonth() + 1) + '月' + now.getDate() + '日')} ${dateInfo.dayStr || '周日'} (农历${dateInfo.lunarShort || lunarInfo.lunarShort}) · 第${dateInfo.weekNum || 1}周</span>
            <span class="greeting-tag" id="dashboardWeatherText" onclick="window.refreshRealTimeWeather && window.refreshRealTimeWeather()" title="点击刷新当地实时天气" style="cursor: pointer; user-select: none; transition: transform 0.2s;" onmouseover="this.style.transform='scale(1.04)'" onmouseout="this.style.transform='scale(1)'">
              ${window.currentWeatherData ? `${window.currentWeatherData.icon || '🌤️'} ${window.currentWeatherData.city ? window.currentWeatherData.city + ' ' : ''}${window.currentWeatherData.weather || '晴'} ${window.currentWeatherData.temp || '28℃'}` : '🌤️ 加载天气中...'}
            </span>
          </div>
        </div>

        <!-- 中间：生日提醒专区 (居中显示，今日在上，明日在下) -->
        <div class="greeting-center-birthday" style="flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; text-align: center;">
          ${todayBirthdayStudents.length > 0 ? `
            <div style="display: flex; justify-content: center; width: 100%;">
              <span class="greeting-tag birthday-celebrate-pill" 
                onclick="window.openBirthdayCelebrationModal && window.openBirthdayCelebrationModal('today')"
                style="background: linear-gradient(135deg, #fffbeb 0%, #fde047 100%); color: #78350f; font-weight: 800; border: 1.5px solid #fef08a; box-shadow: 0 3px 10px rgba(0,0,0,0.18); cursor: pointer; display: inline-flex; align-items: center; gap: 6px; padding: 5px 16px; border-radius: 20px; transition: transform 0.2s; user-select: none; white-space: nowrap;"
                onmouseover="this.style.transform='scale(1.04)'" onmouseout="this.style.transform='scale(1)'"
                title="点击查看今日寿星与班级集体生日祝福">
                🎂 今日生日：${todayBirthdayStudents.map(b => `${b.name} (${b.birthdayText})`).join("、")} 🎉 祝TA生日快乐！
              </span>
            </div>
          ` : ''}

          ${tomorrowBirthdayStudents.length > 0 ? `
            <div style="display: flex; justify-content: center; width: 100%;">
              <span class="greeting-tag tomorrow-birthday-pill" 
                onclick="window.openBirthdayCelebrationModal && window.openBirthdayCelebrationModal('tomorrow')"
                style="background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%); color: #1e40af; font-weight: 800; border: 1.5px solid #bfdbfe; box-shadow: 0 2px 8px rgba(37,99,235,0.15); cursor: pointer; display: inline-flex; align-items: center; gap: 6px; padding: 4px 14px; border-radius: 20px; transition: transform 0.2s; user-select: none; font-size: 12px; white-space: nowrap;"
                onmouseover="this.style.transform='scale(1.04)'" onmouseout="this.style.transform='scale(1)'"
                title="点击查看明日预告寿星与准备集体祝福">
                🎁 明日生日：${tomorrowBirthdayStudents.map(b => `${b.name} (${b.birthdayText})`).join("、")} 🎈 提前准备祝福！
              </span>
            </div>
          ` : ''}

          ${(todayBirthdayStudents.length === 0 && tomorrowBirthdayStudents.length === 0) ? `
            <div style="display: flex; justify-content: center; width: 100%;">
              <span class="greeting-tag" style="background: rgba(255,255,255,0.18); opacity: 0.9; padding: 4px 14px;">
                🎋 今日农历：${lunarInfo.lunarShort}
              </span>
            </div>
          ` : ''}
        </div>

        <!-- 右侧：今日待办卡片 -->
        <div class="greeting-right-card" style="flex-shrink: 0;">
          <div>
            <div style="font-size: 11px; opacity: 0.85;">今日待办</div>
            <div class="greeting-stat-num">${pendingTasksCount} <span style="font-size: 14px; font-weight: normal;">项</span></div>
          </div>
          <button class="btn btn-sm" style="background: white; color: #ea580c; font-weight: 700;" onclick="window.switchView('tasks')">查看待办 ›</button>
        </div>
      </div>

      <!-- 2. 四大核心统计卡片 -->
      <div class="stat-cards-row">
        <div class="stat-card">
          <div class="stat-info">
            <div class="stat-label">班级学生</div>
            <div class="stat-value">${students.length}<span class="stat-unit">人</span></div>
          </div>
          <div class="stat-icon-wrapper" style="background-color: #eff6ff; color: #2563eb;">
            👨‍🎓
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-info">
            <div class="stat-label">今日出勤</div>
            <div class="stat-value">${normalCount}<span class="stat-unit">人</span></div>
          </div>
          <div class="stat-icon-wrapper" style="background-color: #ecfdf5; color: #059669;">
            ✅
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-info">
            <div class="stat-label">待办班务</div>
            <div class="stat-value">${pendingTasksCount}<span class="stat-unit">项</span></div>
          </div>
          <div class="stat-icon-wrapper" style="background-color: #fef3c7; color: #d97706;">
            📝
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-info">
            <div class="stat-label">作业完成率</div>
            <div class="stat-value">${hwRate}<span class="stat-unit">%</span></div>
          </div>
          <div class="stat-icon-wrapper" style="background-color: #f3e8ff; color: #7e22ce;">
            📚
          </div>
        </div>
      </div>

      <!-- 3. 八个快捷操作按钮网格  -->
      <div class="quick-actions-card">
        <div class="quick-actions-title">⚡ 快捷操作</div>
        <div class="quick-actions-grid">
          <div class="quick-action-item" onclick="window.switchView('attendance')">
            <div class="quick-action-icon" style="background-color: #eff6ff; color: #2563eb;">📋</div>
            <span class="quick-action-text">快速点名</span>
          </div>
          <div class="quick-action-item" onclick="window.openRegisterLeaveModal()">
            <div class="quick-action-icon" style="background-color: #fef3c7; color: #d97706;">📝</div>
            <span class="quick-action-text">登记请假</span>
          </div>
          <div class="quick-action-item" onclick="window.switchView('communication')">
            <div class="quick-action-icon" style="background-color: #f3e8ff; color: #9333ea;">📢</div>
            <span class="quick-action-text">发布通知</span>
          </div>
          <div class="quick-action-item" onclick="window.switchView('homework')">
            <div class="quick-action-icon" style="background-color: #ecfdf5; color: #059669;">📖</div>
            <span class="quick-action-text">布置作业</span>
          </div>
          <div class="quick-action-item" onclick="window.openAddTaskModal()">
            <div class="quick-action-icon" style="background-color: #e0f2fe; color: #0284c7;">➕</div>
            <span class="quick-action-text">添加班务</span>
          </div>
          <div class="quick-action-item" onclick="window.switchView('growth')">
            <div class="quick-action-icon" style="background-color: #fef2f2; color: #dc2626;">⭐</div>
            <span class="quick-action-text">记录表现</span>
          </div>
          <div class="quick-action-item" onclick="window.switchView('communication')">
            <div class="quick-action-icon" style="background-color: #ecfeff; color: #0891b2;">📞</div>
            <span class="quick-action-text">联系家长</span>
          </div>
          <div class="quick-action-item" onclick="window.switchView('safety')">
            <div class="quick-action-icon" style="background-color: #fff1f2; color: #e11d48;">🛡️</div>
            <span class="quick-action-text">安全事件</span>
          </div>
        </div>
      </div>

      <!-- 4. 中间三列核心板块：今日课表、今日出勤环形图、重点关注学生  -->
      <div class="dashboard-columns-3">
        <!-- 今日课表 -->
        <div class="card">
          <div class="panel-header">
            <div class="panel-title">📅 今日课表</div>
            <span class="badge badge-info">周二</span>
          </div>
          <div style="display: flex; flex-direction: column; gap: 8px;">
            ${(data.timetable.schedule["周二"] || []).slice(0, 5).map((c, i) => `
              <div style="display: flex; align-items: center; justify-content: space-between; padding: 7px 10px; background-color: #f8fafc; border-radius: var(--radius-md); border-left: 3px solid ${c.textColor};">
                <div style="display: flex; align-items: center; gap: 10px;">
                  <span style="font-size: 11.5px; color: var(--text-muted); font-weight: 600;">第${i + 1}节</span>
                  <span style="font-size: 13.5px; font-weight: 700; color: #1e293b;">${c.subject}</span>
                </div>
                <div style="font-size: 12px; color: var(--text-muted);">${c.teacher} · ${c.room}</div>
              </div>
            `).join("")}
          </div>
          <div style="text-align: center; margin-top: 10px;">
            <button class="btn btn-sm btn-secondary" style="width: 100%;" onclick="window.switchView('schedule')">查看全周完整课表 ›</button>
          </div>
        </div>

        <!-- 今日出勤环形图 -->
        <div class="card">
          <div class="panel-header">
            <div class="panel-title">👥 今日出勤概况</div>
            <span class="badge badge-success">正常率 ${((normalCount / students.length) * 100).toFixed(1)}%</span>
          </div>
          <div style="height: 155px; position: relative; display: flex; align-items: center; justify-content: center;">
            <canvas id="dashboardAttendanceChart"></canvas>
          </div>
          <div style="display: grid; grid-template-columns: repeat(4, 1fr); text-align: center; margin-top: 8px; font-size: 12px; border-top: 1px solid var(--border-light); padding-top: 8px;">
            <div><span style="color: #10b981; font-weight: 700; font-size: 15px;">${normalCount}</span><br><span style="color: var(--text-muted);">正常</span></div>
            <div><span style="color: #f59e0b; font-weight: 700; font-size: 15px;">${lateCount}</span><br><span style="color: var(--text-muted);">迟到</span></div>
            <div><span style="color: #3b82f6; font-weight: 700; font-size: 15px;">${leaveCount}</span><br><span style="color: var(--text-muted);">请假</span></div>
            <div><span style="color: #ef4444; font-weight: 700; font-size: 15px;">${absentCount}</span><br><span style="color: var(--text-muted);">缺勤</span></div>
          </div>
        </div>

        <!-- 重点关注学生  -->
        <div class="card">
          <div class="panel-header">
            <div class="panel-title">⚠️ 重点关注学生</div>
            <span class="badge ${focusStudents.length > 0 ? 'badge-danger' : 'badge-success'}">${focusStudents.length} 人</span>
          </div>
          <div style="display: flex; flex-direction: column; gap: 10px;">
            ${focusStudents.length === 0 ? `
              <div style="text-align: center; padding: 28px 10px; color: var(--text-muted); font-size: 13px;">
                <span style="font-size: 26px; display: block; margin-bottom: 6px;">🌿</span>
                全班学生状态优良，暂无重点关注学生
              </div>
            ` : focusStudents.map(s => `
              <div style="display: flex; align-items: center; justify-content: space-between; padding: 8px; background: #fff5f5; border: 1px solid #fed7d7; border-radius: var(--radius-md); cursor: pointer;" onclick="window.openStudentDrawer('${s.id}')">
                <div style="display: flex; align-items: center; gap: 8px;">
                  <span style="font-size: 18px;">${s.gender === '女' ? '👧' : '👦'}</span>
                  <div>
                    <div style="font-size: 13px; font-weight: 700; color: #9b2c2c;">${s.name} (学号: ${s.id})</div>
                    <div style="font-size: 11.5px; color: #c53030;">${s.notes || (s.isLeftBehind ? '留守儿童关怀' : s.hardshipCategory ? `困难帮扶：${s.hardshipCategory}` : '日常学情重点跟进')}</div>
                  </div>
                </div>
                <span class="badge badge-danger">跟进中</span>
              </div>
            `).join("")}
          </div>
        </div>
      </div>

      <!-- 5. 底部双列：各科作业完成率、近期安排与待办事项  -->
      <div class="dashboard-columns-2">
        <!-- 各科作业完成率柱状图 -->
        <div class="card">
          <div class="panel-header">
            <div class="panel-title">📊 各科作业提交与订正率</div>
            <button class="btn btn-sm btn-secondary" onclick="window.switchView('homework')">查看详情 ›</button>
          </div>
          <div style="height: 180px; position: relative;">
            ${hwList.length === 0 ? `
              <div style="height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; color: var(--text-muted); font-size: 13px;">
                <span style="font-size: 28px; margin-bottom: 6px;">✍️</span>
                暂无作业布置数据，点击右上角【查看详情】添加
              </div>
            ` : `<canvas id="dashboardHomeworkChart"></canvas>`}
          </div>
        </div>

        <!-- 近期安排与班务 -->
        <div class="card">
          <div class="panel-header">
            <div class="panel-title">📌 待办班务与近期安排</div>
            <span class="badge ${tasks.length > 0 ? 'badge-warning' : 'badge-success'}">${tasks.length > 0 ? '待处理' : '全部完成'}</span>
          </div>
          <div style="display: flex; flex-direction: column; gap: 8px;">
            ${tasks.length === 0 ? `
              <div style="text-align: center; padding: 26px 10px; color: var(--text-muted); font-size: 13px;">
                <span style="font-size: 26px; display: block; margin-bottom: 6px;">🎉</span>
                暂无待办班务，班级事务井井有条！
              </div>
            ` : tasks.slice(0, 3).map(t => `
              <div style="display: flex; align-items: center; justify-content: space-between; padding: 8px 12px; background-color: #f8fafc; border-radius: var(--radius-md); border: 1px solid var(--border-color);">
                <div>
                  <div style="font-size: 13px; font-weight: 700; color: var(--text-main);">
                    ${t.status === "overdue" ? '<span style="color:#ef4444;">[逾期]</span> ' : ''}${t.title}
                  </div>
                  <div style="font-size: 11.5px; color: var(--text-muted);">
                    截止：${t.deadline} · 负责人：${t.assignee}
                  </div>
                </div>
                <span class="badge ${t.status === 'in_progress' ? 'badge-info' : t.status === 'overdue' ? 'badge-danger' : 'badge-warning'}">
                  ${t.status === 'in_progress' ? '进行中' : t.status === 'overdue' ? '已逾期' : '待处理'}
                </span>
              </div>
            `).join("")}
          </div>
          <div style="display: flex; gap: 10px; margin-top: 10px;">
            <button class="btn btn-sm btn-primary" style="flex: 1;" onclick="window.openAddTaskModal()">+ 添加新班务</button>
            <button class="btn btn-sm btn-secondary" style="flex: 1;" onclick="window.switchView('tasks')">全部班务列表</button>
          </div>
        </div>
      </div>
    </div>
  `;

  // 渲染两个 Chart.js 图表
  setTimeout(() => {
    initDashboardCharts(normalCount, lateCount, leaveCount, absentCount);
  }, 50);
};

function initDashboardCharts(normal, late, leave, absent) {
  if (typeof Chart === "undefined") return;

  // 1. 出勤环形图
  const attCanvas = document.getElementById("dashboardAttendanceChart");
  if (attCanvas) {
    new Chart(attCanvas, {
      type: "doughnut",
      data: {
        labels: ["正常", "迟到", "请假", "缺勤"],
        datasets: [{
          data: [normal, late, leave, absent],
          backgroundColor: ["#10b981", "#f59e0b", "#3b82f6", "#ef4444"],
          borderWidth: 0,
          hoverOffset: 4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: "70%",
        plugins: {
          legend: { display: false }
        }
      }
    });
  }

  // 2. 各科作业完成率柱状图
  const hwCanvas = document.getElementById("dashboardHomeworkChart");
  const data = window.store.data;
  const hwList = (data && data.homeworkList) || [];
  const students = (data && data.students) || [];
  const studentTotal = Math.max(1, students.length);

  if (hwCanvas && hwList.length > 0) {
    const displayHw = hwList.slice(0, 4);
    const labels = displayHw.map(h => `${h.subject || '学科'} · ${h.title ? (h.title.length > 6 ? h.title.slice(0, 6) + '…' : h.title) : '作业'}`);
    const submitRates = displayHw.map(h => {
      const sub = (h.stats && typeof h.stats.submitted === 'number') ? h.stats.submitted : 0;
      return Math.min(100, Math.round((sub / studentTotal) * 100));
    });
    const correctRates = displayHw.map(h => {
      const sub = (h.stats && typeof h.stats.submitted === 'number') ? h.stats.submitted : 0;
      const cor = (h.stats && typeof h.stats.corrected === 'number') ? h.stats.corrected : 0;
      return sub > 0 ? Math.min(100, Math.round((cor / sub) * 100)) : 0;
    });

    new Chart(hwCanvas, {
      type: "bar",
      data: {
        labels: labels,
        datasets: [
          {
            label: "已提交率 (%)",
            data: submitRates,
            backgroundColor: "#2563eb",
            borderRadius: 6
          },
          {
            label: "订正率 (%)",
            data: correctRates,
            backgroundColor: "#93c5fd",
            borderRadius: 6
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: { min: 0, max: 100 }
        },
        plugins: {
          legend: { position: "top", labels: { boxWidth: 12, font: { size: 11 } } }
        }
      }
    });
  }

  // 动态加载实时天气
  if (typeof window.loadRealTimeWeather === "function") {
    window.loadRealTimeWeather();
  }
}
