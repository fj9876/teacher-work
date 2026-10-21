/**
 * 班主任工作台 - 5. 课表与排班 (Schedule)
 * 全面支持在网页端导入/导出 Excel、直接在线修改课程/座位/值日/干部！
 */

window.renderScheduleView = function(container) {
  window.currentScheduleTab = window.currentScheduleTab || "timetable";

  container.innerHTML = `
    <div class="module-header">
      <div class="module-title-area">
        <h2>🗓️ 课表与排班</h2>
        <p>班级课程、可视化座位表、值日保洁与班委团队管理（支持在线实时编辑与 Excel 导入导出）</p>
      </div>
      <div class="module-actions">
        <button class="btn btn-secondary" onclick="window.handleCurrentTabExcelExport()">📤 导出当前表 (Excel)</button>
        <button class="btn btn-secondary" onclick="window.handleCurrentTabExcelImport()">📥 导入当前表 (Excel)</button>
        <button class="btn btn-secondary" onclick="window.print()">🖨️ 打印表格</button>
      </div>
    </div>

    <!-- 4个二级标签页 -->
    <div class="card" style="padding: 10px 18px; display: flex; align-items: center; justify-content: space-between;">
      <div class="tab-pills" id="scheduleSubTabs">
        <div class="tab-pill ${window.currentScheduleTab === 'timetable' ? 'active' : ''}" data-tab="timetable" onclick="window.switchScheduleTab('timetable', this)">📅 班级课表</div>
        <div class="tab-pill ${window.currentScheduleTab === 'seating' ? 'active' : ''}" data-tab="seating" onclick="window.switchScheduleTab('seating', this)">🪑 座位管理</div>
        <div class="tab-pill ${window.currentScheduleTab === 'duty' ? 'active' : ''}" data-tab="duty" onclick="window.switchScheduleTab('duty', this)">🧹 值日安排</div>
        <div class="tab-pill ${window.currentScheduleTab === 'cadres' ? 'active' : ''}" data-tab="cadres" onclick="window.switchScheduleTab('cadres', this)">🎖️ 班干部团队</div>
      </div>
    </div>

    <!-- 模块渲染区域 -->
    <div id="scheduleTabContent">
      <!-- 动态渲染 -->
    </div>
  `;

  window.renderCurrentScheduleTab();
};

window.switchScheduleTab = function(tab, elem) {
  window.currentScheduleTab = tab;
  document.querySelectorAll("#scheduleSubTabs .tab-pill").forEach(p => {
    if (p === elem || p.getAttribute("data-tab") === tab) {
      p.classList.add("active");
    } else {
      p.classList.remove("active");
    }
  });
  window.renderCurrentScheduleTab();
};

window.currentScheduleTab = window.currentScheduleTab || "timetable";
window.currentDutyMode = window.currentDutyMode || "week";
window.currentDutyMonthOffset = window.currentDutyMonthOffset || 0;

window.renderCurrentScheduleTab = function() {
  const container = document.getElementById("scheduleTabContent");
  if (!container) return;
  const data = window.store.data;

  if (window.currentScheduleTab === "timetable") {
    // 1. 班级课表
    const periods = data.timetable.periods;
    const schedule = data.timetable.schedule;
    const days = ["周一", "周二", "周三", "周四", "周五"];

    container.innerHTML = `
      <div class="card" style="padding: 14px 20px; display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px; flex-wrap: wrap; gap: 10px;">
        <div style="font-size: 13.5px; color: var(--text-muted); display: flex; align-items: center; gap: 8px;">
          <span>💡 当前课表共 <strong style="color: var(--primary); font-size: 15px;">${periods.length}</strong> 节课。点击课程卡片可在线调课，点击左侧节次或右上角可自定义增删节次与时间</span>
        </div>
        <div style="display: flex; gap: 8px; flex-wrap: wrap;">
          <button class="btn btn-sm btn-primary" onclick="window.quickAddTimetablePeriod()" style="background: #10b981; border-color: #059669;" title="在末尾直接增加一节课">➕ 增加一节</button>
          <button class="btn btn-sm btn-secondary" onclick="window.quickDeleteLastTimetablePeriod()" style="color: #ef4444; border-color: #fecaca;" title="删减最后一节课">➖ 删减末节</button>
          <button class="btn btn-sm btn-primary" onclick="window.openEditTimetablePeriodsModal()">⏰ 修改作息时间</button>
          <button class="btn btn-sm btn-secondary" onclick="window.store.exportTimetableExcel()">📤 导出课表Excel</button>
          <button class="btn btn-sm btn-secondary" onclick="document.getElementById('excelTimetableInput').click()">📥 导入课表Excel</button>
        </div>
      </div>

      <div class="card" style="padding: 20px;">
        <table class="timetable-grid">
          <thead>
            <tr>
              <th class="timetable-period-th" style="cursor: pointer;" onclick="window.openEditTimetablePeriodsModal()" title="点击修改各节次时间或增删节次">
                节次 / 时间 ✏️
              </th>
              ${days.map(d => `<th>${d}</th>`).join("")}
            </tr>
          </thead>
          <tbody>
            ${periods.map((p, pIdx) => `
              <tr>
                <td class="period-cell" style="cursor: pointer; position: relative; user-select: none;" title="点击修改该节次作息时间">
                  <div style="display: flex; align-items: center; justify-content: space-between;">
                    <div onclick="window.openEditTimetablePeriodsModal()" style="flex: 1;">
                      <div class="period-name">${p.name}</div>
                      <div class="period-time">${p.time} ✏️</div>
                    </div>
                    ${periods.length > 1 ? `
                      <button class="btn btn-sm btn-secondary" onclick="event.stopPropagation(); window.quickDeleteTimetablePeriod(${pIdx})" 
                        style="padding: 2px 5px; font-size: 11px; margin-left: 4px; border: none; background: transparent; color: #ef4444; opacity: 0.6;" 
                        onmouseover="this.style.opacity='1'; this.style.background='#fee2e2';" 
                        onmouseout="this.style.opacity='0.6'; this.style.background='transparent';" 
                        title="删除第 ${pIdx + 1} 节【${p.name}】">
                        🗑️
                      </button>
                    ` : ''}
                  </div>
                </td>
                ${days.map(d => {
                  const course = (schedule[d] && schedule[d][pIdx]) || { subject: "自习", teacher: "值班老师", room: "本班", color: "#f1f5f9", textColor: "#475569" };
                  return `
                    <td>
                      <div class="course-card" style="background-color: ${course.color}; color: ${course.textColor};" 
                        onclick="window.openCourseEditModal('${d}', ${pIdx}, '${course.subject}', '${course.teacher}', '${course.room}', '${course.color}')" 
                        title="点击直接在线修改">
                        <div class="course-subject">${course.subject}</div>
                        <div class="course-teacher">${course.teacher} · ${course.room}</div>
                        <span style="font-size: 10px; opacity: 0.7; margin-top: 2px;">✏️ 点击修改</span>
                      </div>
                    </td>
                  `;
                }).join("")}
              </tr>
            `).join("")}
          </tbody>
        </table>
      </div>
    `;
  } else if (window.currentScheduleTab === "seating") {
    // 2. 座位管理
    const students = data.students || [];
    const grid = (window.store.data.seatingGrid && window.store.data.seatingGrid.rows)
      ? window.store.data.seatingGrid
      : { rows: 8, cols: 6 };
    const totalSlots = grid.rows * grid.cols;

    // 构建座位单元格数据列表
    const slots = [];
    for (let i = 0; i < totalSlots; i++) {
      const r = Math.floor(i / grid.cols) + 1;
      const c = (i % grid.cols) + 1;
      const s = students[i];
      slots.push({
        index: i,
        row: r,
        col: c,
        seatLabel: `第${r}排·${c}号`,
        student: s || null
      });
    }

    container.innerHTML = `
      <div class="card" style="padding: 12px 18px; display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px; flex-wrap: wrap; gap: 10px;">
        <div style="display: flex; align-items: center; gap: 12px; flex-wrap: wrap;">
          <div style="display: flex; align-items: center; gap: 6px; font-size: 13px; font-weight: 600; color: #334155; background: #f8fafc; padding: 4px 10px; border-radius: var(--radius-md); border: 1px solid var(--border-color);">
            <span>📐 教室规格:</span>
            <input type="number" id="quickSeatingRows" value="${grid.rows}" min="1" max="15" style="width: 48px; height: 26px; text-align: center; border: 1px solid #cbd5e1; border-radius: 4px;">
            <span>排 ×</span>
            <input type="number" id="quickSeatingCols" value="${grid.cols}" min="1" max="15" style="width: 48px; height: 26px; text-align: center; border: 1px solid #cbd5e1; border-radius: 4px;">
            <span>列</span>
            <button class="btn btn-sm btn-primary" style="padding: 2px 8px; font-size: 12px;" onclick="window.applyQuickSeatingDimension()">应用</button>
          </div>
          <span style="font-size: 12.5px; color: var(--text-muted);">
            💡 按住鼠标直接拖拽对调，或单击选择两张课桌对调，双击课桌可修改学生
          </span>
        </div>
        <div style="display: flex; gap: 8px; flex-wrap: wrap;">
          <button class="btn btn-sm btn-primary" onclick="window.openEditAllSeatsModal()">🪑 批量编辑/重排座位</button>
          <button class="btn btn-sm btn-secondary" onclick="window.autoArrangeSeats('group')">👥 按组排座</button>
          <button class="btn btn-sm btn-secondary" onclick="window.autoArrangeSeats('height')">📏 按身高排座</button>
          <button class="btn btn-sm btn-secondary" onclick="window.autoArrangeSeats('random')">🎲 随机打乱</button>
          <button class="btn btn-sm btn-secondary" onclick="window.store.exportSeatingExcel()">📤 导出座位Excel</button>
          <button class="btn btn-sm btn-secondary" onclick="document.getElementById('excelSeatingInput').click()">📥 导入座位Excel</button>
        </div>
      </div>

      <div class="seating-chart-container">
        <div class="podium">讲 台 (黑 板 方 向)</div>

        <div class="desk-matrix" id="deskMatrixContainer" style="display: grid; grid-template-columns: repeat(${grid.cols}, minmax(116px, 138px)); gap: 14px; justify-content: center;">
          ${slots.map(slot => {
            const s = slot.student;
            if (s) {
              return `
                <div class="desk-seat ${window.selectedSeatId === s.id ? 'selected' : ''}" 
                  draggable="true"
                  ondragstart="window.handleSeatDragStart(event, '${s.id}')"
                  ondragover="window.handleSeatDragOver(event)"
                  ondragenter="window.handleSeatDragEnter(event)"
                  ondragleave="window.handleSeatDragLeave(event)"
                  ondrop="window.handleSeatDrop(event, '${s.id}')"
                  data-student-id="${s.id}" 
                  onclick="window.handleSeatClick('${s.id}')"
                  ondblclick="window.openEditSeatModal('${s.id}', '${s.name}', '${s.seat || slot.seatLabel}')"
                  title="按住鼠标直接拖动换座，或单击选择对调，双击修改学生">
                  <div class="desk-seat-avatar">
                    ${s.avatarUrl 
                      ? `<img src="${s.avatarUrl}" alt="${s.name}">` 
                      : (s.gender === '男' ? '👦' : '👧')}
                  </div>
                  <span class="desk-seat-name">${s.name}</span>
                  <span class="desk-seat-role">${s.seat || slot.seatLabel}</span>
                  <span style="font-size: 10px; color: #2563eb;">${s.role && s.role !== '学生' ? s.role : (window.formatGroupName ? window.formatGroupName(s.group) : ('第' + s.group + '组'))}</span>
                </div>
              `;
            } else {
              return `
                <div class="desk-seat empty-seat" 
                  style="border-style: dashed; background: #f8fafc; opacity: 0.75;"
                  ondragover="window.handleSeatDragOver(event)"
                  ondragenter="window.handleSeatDragEnter(event)"
                  ondragleave="window.handleSeatDragLeave(event)"
                  ondrop="window.handleEmptySeatDrop(event, ${slot.index})"
                  title="空座位 (可将学生拖入此座位)">
                  <div class="desk-seat-avatar" style="width: 38px; height: 38px; background: #f1f5f9; box-shadow: none; border: 1.5px dashed #cbd5e1; font-size: 18px;">🪑</div>
                  <span class="desk-seat-name" style="color: #94a3b8; font-weight: 500;">空位</span>
                  <span class="desk-seat-role" style="color: #94a3b8;">${slot.seatLabel}</span>
                  <span style="font-size: 10px; color: #94a3b8;">未分配</span>
                </div>
              `;
            }
          }).join("")}
        </div>
      </div>
    `;
  } else if (window.currentScheduleTab === "duty") {
    // 3. 值日安排 (支持本周显示与当月显示切换)
    const duties = data.dutySchedule || {};
    const days = ["周一", "周二", "周三", "周四", "周五"];

    container.innerHTML = `
      <div class="card" style="padding: 14px 20px; display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px; flex-wrap: wrap; gap: 10px;">
        <div style="display: flex; align-items: center; gap: 10px;">
          <span style="font-size: 13.5px; color: var(--text-muted);">显示视图：</span>
          <div class="tab-pills">
            <div class="tab-pill ${window.currentDutyMode === 'week' ? 'active' : ''}" onclick="window.setDutyMode('week')">📅 本周显示 (工作日)</div>
            <div class="tab-pill ${window.currentDutyMode === 'month' ? 'active' : ''}" onclick="window.setDutyMode('month')">🗓️ 当月显示 (整月全景)</div>
          </div>
        </div>
        <div style="display: flex; gap: 8px; flex-wrap: wrap;">
          <button class="btn btn-sm btn-secondary" onclick="window.rotateDutySchedule()">🔄 一键轮换值日</button>
          <button class="btn btn-sm btn-secondary" onclick="window.store.exportDutyExcel()">📤 导出值日Excel</button>
          <button class="btn btn-sm btn-primary" onclick="document.getElementById('excelDutyInput').click()">📥 导入值日Excel</button>
        </div>
      </div>

      <div id="dutyDisplayArea">
        <!-- 根据 week 或 month 动态渲染 -->
      </div>
    `;

    const displayArea = document.getElementById("dutyDisplayArea");
    if (window.currentDutyMode === "week") {
      displayArea.innerHTML = `
        <div style="display: grid; grid-template-columns: repeat(5, 1fr); gap: 14px; align-items: start;">
          ${days.map(d => {
            const item = (duties && duties[d]) || { leader: "未分配", members: [], zone: "常规区域", task: "暂未分配", zones: [] };
            const hasDetailedZones = item.zones && item.zones.length > 0;
            return `
              <div class="card" style="padding: 16px; border-top: 4px solid var(--primary); display: flex; flex-direction: column; justify-content: space-between; min-height: 480px;">
                <div>
                  <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px;">
                    <span style="font-size: 16px; font-weight: 800; color: #1e293b;">${d}</span>
                    <span class="badge badge-primary" style="font-size: 11.5px;">★ 组长: ${item.leader || "未指定"}</span>
                  </div>

                  ${hasDetailedZones ? `
                    <div style="margin-bottom: 10px;">
                      <div style="font-size: 12px; font-weight: 700; color: #475569; margin-bottom: 6px; display: flex; align-items: center; justify-content: space-between;">
                        <span>📍 分区域值日分工 (${item.zones.length}个区域)</span>
                        <span style="font-size: 11px; color: var(--primary); font-weight: 600;">共 ${(item.members || []).length} 人</span>
                      </div>
                      <div style="display: flex; flex-direction: column; gap: 6px; max-height: 250px; overflow-y: auto; padding-right: 2px;">
                        ${item.zones.map(z => `
                          <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 6px 8px; font-size: 11.5px;">
                            <div style="font-weight: 700; color: #334155; margin-bottom: 4px; display: flex; align-items: center; justify-content: space-between;">
                              <span style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${z.fullZone || z.zone}">${z.zone}</span>
                            </div>
                            <div style="display: flex; flex-wrap: wrap; gap: 4px;">
                              ${z.students.map(s => `
                                <span class="badge ${s === item.leader ? 'badge-primary' : 'badge-gray'}" style="font-size: 11px; padding: 1px 6px;">
                                  ${s}${s === item.leader ? ' ★' : ''}
                                </span>
                              `).join("")}
                            </div>
                          </div>
                        `).join("")}
                      </div>
                    </div>
                  ` : `
                    <div style="font-size: 12.5px; color: var(--text-muted); margin-bottom: 6px;">
                      <strong style="color: var(--text-main);">清洁区域：</strong><br>
                      ${item.zone || "常规值日区域"}
                    </div>

                    <div style="font-size: 12.5px; color: var(--text-muted); margin-bottom: 10px;">
                      <strong style="color: var(--text-main);">具体任务：</strong><br>
                      ${item.task || "做好卫生保洁"}
                    </div>
                  `}

                  <div style="border-top: 1px dashed var(--border-light); padding-top: 8px; margin-top: 6px;">
                    <div style="font-size: 12px; font-weight: 700; color: #475569; margin-bottom: 6px;">
                      值日生名单 (${(item.members || []).length}人)：
                    </div>
                    <div style="display: flex; flex-wrap: wrap; gap: 4px; max-height: 110px; overflow-y: auto;">
                      ${(item.members || []).map(m => `
                        <span class="badge ${m === item.leader ? 'badge-primary' : 'badge-gray'}" style="font-size: 11px;">${m}</span>
                      `).join("")}
                    </div>
                  </div>
                </div>

                <div style="margin-top: 14px; border-top: 1px solid var(--border-light); padding-top: 10px;">
                  <button class="btn btn-sm btn-primary" style="width: 100%;" onclick="window.openEditDutyModal('${d}')">✏️ 修改${d}值日安排</button>
                </div>
              </div>
            `;
          }).join("")}
        </div>
      `;
    } else {
      // 当月日历全景显示 (Month Calendar View)
      const now = new Date();
      now.setMonth(now.getMonth() + window.currentDutyMonthOffset);
      const curYear = now.getFullYear();
      const curMonth = now.getMonth() + 1; // 1-12
      const firstDay = new Date(curYear, curMonth - 1, 1).getDay(); // 0(周日)-6(周六)
      // 转化为周一为第0天的偏移 (0:周一, 6:周日)
      const firstDayOffset = (firstDay === 0 ? 7 : firstDay) - 1;
      const totalDays = new Date(curYear, curMonth, 0).getDate(); // 当月总天数
      const dayNames = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];

      let cellsHtml = "";
      // 填充前置空格
      for (let i = 0; i < firstDayOffset; i++) {
        cellsHtml += `<div style="min-height: 100px; background: #f8fafc; border: 1px dashed var(--border-light); border-radius: var(--radius-md); opacity: 0.4;"></div>`;
      }

      // 填充日期
      for (let dayNum = 1; dayNum <= totalDays; dayNum++) {
        const dateObj = new Date(curYear, curMonth - 1, dayNum);
        const dayOfWeek = dateObj.getDay(); // 0-6
        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
        const weekDayName = dayNames[dayOfWeek];
        const dutyKey = weekDayName;
        const duty = (!isWeekend && duties[dutyKey]) ? duties[dutyKey] : null;

        cellsHtml += `
          <div class="card" style="min-height: 110px; padding: 10px; border-radius: var(--radius-md); ${isWeekend ? 'background: #f1f5f9; opacity: 0.75;' : 'border-top: 3px solid var(--primary); cursor: pointer;'}"
            ${!isWeekend ? `onclick="window.openEditDutyModal('${weekDayName}')"` : ''} title="${isWeekend ? '周末双休' : '点击修改' + weekDayName + '值日'}">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 4px;">
              <span style="font-size: 14px; font-weight: 800; color: ${isWeekend ? '#94a3b8' : '#1e293b'};">${dayNum}日</span>
              <span style="font-size: 11px; color: var(--text-muted);">${weekDayName}</span>
            </div>
            ${isWeekend ? `
              <div style="font-size: 11px; color: #94a3b8; margin-top: 14px; text-align: center;">周末双休</div>
            ` : duty ? `
              <div style="font-size: 11.5px; color: #2563eb; font-weight: 700; margin-bottom: 2px;">
                组长: ${duty.leader}
              </div>
              <div style="font-size: 11px; color: #475569; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                区: ${duty.zone}
              </div>
              <div style="font-size: 10.5px; color: var(--text-muted); margin-top: 4px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                ${(duty.members || []).slice(0, 3).join("、")}等
              </div>
            ` : `
              <div style="font-size: 11px; color: var(--text-muted); margin-top: 10px;">未设值日</div>
            `}
          </div>
        `;
      }

      displayArea.innerHTML = `
        <div class="card" style="padding: 16px; margin-bottom: 14px; display: flex; align-items: center; justify-content: space-between;">
          <button class="btn btn-sm btn-secondary" onclick="window.changeDutyMonth(-1)">‹ 上一月</button>
          <span style="font-size: 16px; font-weight: 800; color: #1e293b;">🗓️ ${curYear}年${curMonth}月 全班值日排班日历</span>
          <button class="btn btn-sm btn-secondary" onclick="window.changeDutyMonth(1)">下一月 ›</button>
        </div>

        <div style="display: grid; grid-template-columns: repeat(7, 1fr); gap: 10px; margin-bottom: 8px; text-align: center; font-weight: 700; font-size: 13px; color: var(--text-muted);">
          <div>周一</div><div>周二</div><div>周三</div><div>周四</div><div>周五</div><div style="color: #94a3b8;">周六</div><div style="color: #94a3b8;">周日</div>
        </div>

        <div style="display: grid; grid-template-columns: repeat(7, 1fr); gap: 10px;">
          ${cellsHtml}
        </div>
      `;
    }
  } else if (window.currentScheduleTab === "cadres") {
    // 4. 班干部团队
    const cadres = data.cadres || [];

    container.innerHTML = `
      <div class="card" style="padding: 14px 20px; display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px;">
        <div style="font-size: 13.5px; color: var(--text-muted);">
          🎖️ 班委成员职责明确，支持在线编辑任职评价、新增班干部与 Excel 导入导出
        </div>
        <div style="display: flex; gap: 8px;">
          <button class="btn btn-sm btn-secondary" onclick="window.store.exportCadresExcel()">📤 导出干部Excel</button>
          <button class="btn btn-sm btn-secondary" onclick="document.getElementById('excelCadresInput').click()">📥 导入干部Excel</button>
          <button class="btn btn-sm btn-primary" onclick="window.openAddCadreModal()">+ 新增班干部</button>
        </div>
      </div>

      <div class="table-responsive">
        <table class="data-table">
          <thead>
            <tr>
              <th>职务</th>
              <th>姓名</th>
              <th>主要职责与分工</th>
              <th>任职时间</th>
              <th>工作评价</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            ${cadres.length === 0 ? `
              <tr>
                <td colspan="6" style="text-align: center; padding: 36px; color: var(--text-muted);">
                  <div style="font-size: 28px; margin-bottom: 6px;">🎖️</div>
                  <div style="font-size: 14px; font-weight: 600; color: #475569; margin-bottom: 4px;">暂未设置班干部团队</div>
                  <div style="font-size: 12px; color: var(--text-muted);">点击右上角【+ 新增班干部】或【📥 导入干部Excel】为新班级建立班委架构</div>
                </td>
              </tr>
            ` : cadres.map(c => `
              <tr>
                <td><span class="badge badge-purple" style="font-size: 13px;">${c.title}</span></td>
                <td style="font-weight: 700;">${c.name}</td>
                <td style="color: #475569; max-width: 320px;">${c.duties}</td>
                <td>${c.term}</td>
                <td><span class="badge badge-success">${c.rating}</span></td>
                <td>
                  <div style="display: flex; gap: 6px;">
                    <button class="btn btn-sm btn-secondary" onclick="window.editCadre('${c.title}')">✏️ 编辑</button>
                    <button class="btn btn-sm btn-danger" onclick="window.deleteCadreItem('${c.title}')">删除</button>
                  </div>
                </td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      </div>
    `;
  }
};

window.setDutyMode = function(mode) {
  window.currentDutyMode = mode;
  window.renderCurrentScheduleTab();
};

window.changeDutyMonth = function(delta) {
  window.currentDutyMonthOffset = (window.currentDutyMonthOffset || 0) + delta;
  window.renderCurrentScheduleTab();
};

// 顶部导出/导入统一路由
window.handleCurrentTabExcelExport = function() {
  if (window.currentScheduleTab === "timetable") window.store.exportTimetableExcel();
  else if (window.currentScheduleTab === "seating") window.store.exportSeatingExcel();
  else if (window.currentScheduleTab === "duty") window.store.exportDutyExcel();
  else if (window.currentScheduleTab === "cadres") window.store.exportCadresExcel();
};

window.handleCurrentTabExcelImport = function() {
  if (window.currentScheduleTab === "timetable") document.getElementById("excelTimetableInput").click();
  else if (window.currentScheduleTab === "seating") document.getElementById("excelSeatingInput").click();
  else if (window.currentScheduleTab === "duty") document.getElementById("excelDutyInput").click();
  else if (window.currentScheduleTab === "cadres") document.getElementById("excelCadresInput").click();
};

// 座位换座交互 (修复真实在数组中对调)
window.selectedSeatId = null;
window.handleSeatClick = function(studentId) {
  if (!window.selectedSeatId) {
    window.selectedSeatId = studentId;
    window.showToast("已选中第 1 个座位，请点击另 1 个课桌对调（或按住鼠标直接拖拽对调）！", "info");
    window.renderCurrentScheduleTab();
  } else {
    if (window.selectedSeatId === studentId) {
      window.selectedSeatId = null;
      window.renderCurrentScheduleTab();
      return;
    }
    const students = window.store.data.students;
    const idx1 = students.findIndex(s => s.id === window.selectedSeatId);
    const idx2 = students.findIndex(s => s.id === studentId);
    if (idx1 !== -1 && idx2 !== -1) {
      const s1Name = students[idx1].name;
      const s2Name = students[idx2].name;
      // 真实对调数组元素位置！
      const temp = students[idx1];
      students[idx1] = students[idx2];
      students[idx2] = temp;
      // 同步对调座标文字属性
      const tempSeat = students[idx1].seat;
      students[idx1].seat = students[idx2].seat;
      students[idx2].seat = tempSeat;

      window.store.save();
      window.showToast(`已成功对调【${s1Name}】与【${s2Name}】的座位！`, "success");
    }
    window.selectedSeatId = null;
    window.renderCurrentScheduleTab();
  }
};

// HTML5 原生拖拽排座 (Drag & Drop)
window.draggedSeatStudentId = null;

window.handleSeatDragStart = function(event, studentId) {
  window.draggedSeatStudentId = studentId;
  event.dataTransfer.setData("text/plain", studentId);
  event.dataTransfer.effectAllowed = "move";
  event.currentTarget.classList.add("dragging");
};

window.handleSeatDragOver = function(event) {
  event.preventDefault();
  event.dataTransfer.dropEffect = "move";
};

window.handleSeatDragEnter = function(event) {
  event.currentTarget.classList.add("drag-hover");
};

window.handleSeatDragLeave = function(event) {
  event.currentTarget.classList.remove("drag-hover");
};

window.handleSeatDrop = function(event, targetStudentId) {
  event.preventDefault();
  event.currentTarget.classList.remove("drag-hover");
  const srcId = window.draggedSeatStudentId || event.dataTransfer.getData("text/plain");
  if (!srcId || srcId === targetStudentId) return;

  const students = window.store.data.students;
  const idx1 = students.findIndex(s => s.id === srcId);
  const idx2 = students.findIndex(s => s.id === targetStudentId);
  if (idx1 !== -1 && idx2 !== -1) {
    const s1Name = students[idx1].name;
    const s2Name = students[idx2].name;
    const temp = students[idx1];
    students[idx1] = students[idx2];
    students[idx2] = temp;
    const tempSeat = students[idx1].seat;
    students[idx1].seat = students[idx2].seat;
    students[idx2].seat = tempSeat;

    window.store.save();
    window.showToast(`已拖拽对调【${s1Name}】与【${s2Name}】的座位！`, "success");
    window.renderCurrentScheduleTab();
  }
  window.draggedSeatStudentId = null;
};

// 拖拽至空座位处理
window.handleEmptySeatDrop = function(event, targetIndex) {
  event.preventDefault();
  event.currentTarget.classList.remove("drag-hover");
  const srcId = window.draggedSeatStudentId || (event.dataTransfer && event.dataTransfer.getData("text/plain"));
  if (!srcId) return;

  const grid = (window.store.data.seatingGrid && window.store.data.seatingGrid.cols)
    ? window.store.data.seatingGrid
    : { rows: 8, cols: 6 };
  const r = Math.floor(targetIndex / grid.cols) + 1;
  const c = (targetIndex % grid.cols) + 1;
  const students = window.store.data.students || [];
  const s = students.find(item => item.id === srcId);
  if (s) {
    const oldSeat = s.seat;
    s.seat = `第${r}排·${c}号`;
    window.store.save();
    window.showToast(`已将【${s.name}】移至空座位【第${r}排·${c}号】！`, "success");
    window.renderCurrentScheduleTab();
  }
  window.draggedSeatStudentId = null;
};

// 顶部快速调整网格排布尺寸
window.applyQuickSeatingDimension = function() {
  const rInput = document.getElementById("quickSeatingRows");
  const cInput = document.getElementById("quickSeatingCols");
  if (!rInput || !cInput) return;
  const rows = parseInt(rInput.value) || 8;
  const cols = parseInt(cInput.value) || 6;
  window.store.updateSeatingGrid(rows, cols);
  window.showToast(`已成功将教室规格调整为 ${rows}排 × ${cols}列！`, "success");
  window.renderCurrentScheduleTab();
};

// 智能排座策略
window.autoArrangeSeats = function(type) {
  const students = window.store.data.students;
  if (type === "height") {
    students.sort((a, b) => (a.height || 135) - (b.height || 135));
    window.showToast("已按身高由矮到高完成排座！", "success");
  } else if (type === "group") {
    const definedGroups = window.store.data.groups || [];
    const getGroupOrder = (g) => {
      const idx = definedGroups.findIndex(item => window.isStudentInGroup ? window.isStudentInGroup(g, item) : (item === g || `第${g}组` === item));
      return idx !== -1 ? idx : 999;
    };
    students.sort((a, b) => getGroupOrder(a.group) - getGroupOrder(b.group));
    window.showToast("已按小组完成聚拢排座！", "success");
  } else if (type === "random") {
    students.sort(() => Math.random() - 0.5);
    window.showToast("已完成随机洗牌排座！", "success");
  }

  const grid = (window.store.data.seatingGrid && window.store.data.seatingGrid.cols)
    ? window.store.data.seatingGrid
    : { rows: 8, cols: 6 };

  students.forEach((s, idx) => {
    const row = Math.floor(idx / grid.cols) + 1;
    const col = (idx % grid.cols) + 1;
    s.seat = `第${row}排·${col}号`;
  });
  window.store.save();
  window.renderCurrentScheduleTab();
};

window.rotateDutySchedule = function() {
  const days = ["周一", "周二", "周三", "周四", "周五"];
  const duty = window.store.data.dutySchedule || {};
  if (!duty["周一"]) {
    window.showToast("当前暂无值日排班数据，无法轮换！", "info");
    return;
  }
  const first = duty["周一"];
  for (let i = 0; i < days.length - 1; i++) {
    duty[days[i]] = duty[days[i + 1]];
  }
  duty["周五"] = first;
  window.store.save();
  window.showToast("值日生排班表已成功顺延轮换一周！", "success");
  window.renderCurrentScheduleTab();
};

window.deleteCadreItem = function(title) {
  if (confirm(`确定要删除【${title}】班干部吗？`)) {
    window.store.deleteCadre(title);
    window.showToast("已删除该班干部！", "success");
    window.renderCurrentScheduleTab();
  }
};

