/**
 * 班主任工作台 - 6. 作业管理 (Homework)
 * 支持布置新作业、修改作业、删除作业、导出作业统计 Excel、
 * 批量催交通报，以及【智慧黑板打卡看板（校园数字驾驶舱）】
 * 深度复刻《作业完成情况.mp4》视频中的智慧黑板视觉与点击平滑自动飞跃交互
 */

// 音效开关状态 (默认开启)
window.smartBoardSoundEnabled = true;
window.currentSmartBoardHwId = null;

window.renderHomeworkView = function(container) {
  const data = window.store.data;
  const hwList = data.homeworkList || [];
  const students = data.students || [];
  const totalStudents = students.length || 45;

  container.innerHTML = `
    <div class="module-header">
      <div class="module-title-area">
        <h2>📚 作业管理</h2>
        <p>统一管理语数英等各学科作业布置、在线修改、提交进度核验与错题订正跟进</p>
      </div>
      <div class="module-actions">
        <button class="btn btn-secondary" onclick="window.store.exportHomeworkExcel()">📤 导出作业表 (Excel)</button>
        <button class="btn btn-primary" onclick="window.openAssignHomeworkModal()">+ 布置新作业</button>
      </div>
    </div>

    <!-- 作业任务卡片列表 -->
    <div style="display: flex; flex-direction: column; gap: 16px;">
      ${hwList.length === 0 ? `
        <div class="card" style="text-align:center; padding: 40px; color: var(--text-muted);">
          暂无已发布的学科作业，点击右上角【+ 布置新作业】开始添加 ✍️
        </div>
      ` : hwList.map(hw => {
        const totalReq = (hw.stats && typeof hw.stats.total === 'number' && hw.stats.total > 0) ? hw.stats.total : totalStudents;
        const subRate = totalReq > 0 ? (((hw.stats ? hw.stats.submitted : 0) / totalReq) * 100).toFixed(1) : "0.0";
        const corRate = (hw.stats && hw.stats.submitted > 0) ? ((hw.stats.corrected / hw.stats.submitted) * 100).toFixed(1) : "0.0";

        return `
          <div class="card" style="padding: 18px 22px; border-left: 5px solid ${hw.subject === '语文' ? '#ef4444' : hw.subject === '数学' ? '#2563eb' : '#d97706'};">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; flex-wrap: wrap; gap: 8px;">
              <div style="display: flex; align-items: center; gap: 10px;">
                <span class="badge ${hw.subject === '语文' ? 'badge-danger' : hw.subject === '数学' ? 'badge-info' : 'badge-warning'}" style="font-size: 13px;">
                  ${hw.subject}
                </span>
                <!-- 作业标题：点击进入智慧黑板完成状态大屏 -->
                <a href="javascript:void(0)" onclick="window.openHomeworkSmartBoard('${hw.id}')" class="homework-title-link" title="点击进入智慧黑板完成状态大屏">
                  ${hw.title}
                </a>
                ${hw.needParentSign ? '<span class="badge badge-purple">需家长签字</span>' : ''}
              </div>
              <div style="display: flex; gap: 6px; flex-wrap: wrap;">
                <!-- 智慧黑板大屏打卡入口按钮 -->
                <button class="btn btn-sm btn-primary" onclick="window.openHomeworkSmartBoard('${hw.id}')" 
                        style="background: linear-gradient(135deg, #0f172a, #1e293b); border: 1.5px solid #38bdf8; color: #38bdf8; font-weight: 700; box-shadow: 0 0 10px rgba(56,189,248,0.25);"
                        title="进入类似智慧黑板大屏的校园数字驾驶舱打卡状态页">
                  🖥️ 智慧黑板大屏
                </button>
                <button class="btn btn-sm btn-secondary" onclick="window.openEditHomeworkModal('${hw.id}')">✏️ 修改作业</button>
                <button class="btn btn-sm btn-secondary" onclick="window.openCheckHomeworkSubmitModal('${hw.id}')">📋 登记提交名单</button>
                <button class="btn btn-sm btn-success" onclick="window.markAllHomeworkSubmitted('${hw.id}')">✨ 一键全班完成</button>
                <button class="btn btn-sm btn-secondary" onclick="window.remindUnsubmitted('${hw.id}')">📢 批量催交通报</button>
                <button class="btn btn-sm btn-danger" onclick="window.deleteHomeworkItem('${hw.id}')">删除</button>
              </div>
            </div>

            <div style="background-color: #f8fafc; padding: 10px 14px; border-radius: var(--radius-md); font-size: 13px; color: #334155; margin-bottom: 12px; line-height: 1.6;">
              ${hw.content}
            </div>

            <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px; font-size: 12.5px; color: var(--text-muted);">
              <div>
                <span>📅 布置时间：${hw.assignedDate}</span>
                <span style="margin-left: 16px;">⏰ 截止：<strong style="color: #ef4444;">${hw.deadline}</strong></span>
              </div>

              <!-- 提交进度条 -->
              <div style="display: flex; align-items: center; gap: 16px;">
                <div style="display: flex; align-items: center; gap: 8px;">
                  <span>提交率:</span>
                  <div style="width: 100px; height: 8px; background: #e2e8f0; border-radius: 4px; overflow: hidden;">
                    <div style="width: ${subRate}%; height: 100%; background: #2563eb; border-radius: 4px;"></div>
                  </div>
                  <strong style="color: #2563eb;">${hw.stats ? hw.stats.submitted : 0}/${totalReq} (${subRate}%)</strong>
                </div>

                <div style="display: flex; align-items: center; gap: 8px;">
                  <span>订正率:</span>
                  <div style="width: 80px; height: 8px; background: #e2e8f0; border-radius: 4px; overflow: hidden;">
                    <div style="width: ${corRate}%; height: 100%; background: #10b981; border-radius: 4px;"></div>
                  </div>
                  <strong style="color: #10b981;">${corRate}%</strong>
                </div>
              </div>
            </div>

            ${hw.unsubmittedStudents && hw.unsubmittedStudents.length > 0 ? `
              <div style="margin-top: 12px; padding-top: 8px; border-top: 1px dashed var(--border-light); font-size: 12px; display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                <span style="color: #ef4444; font-weight: 700;">⚠️ 未交学生 (${hw.unsubmittedStudents.length}人)：</span>
                ${hw.unsubmittedStudents.map(name => `
                  <span class="badge badge-danger" style="cursor:pointer;" onclick="window.quickToggleSingleStudentSubmit('${hw.id}', '${name}')" title="点击标记该同学为已交">
                    ${name} ✕
                  </span>
                `).join("")}
              </div>
            ` : `
              <div style="margin-top: 12px; padding-top: 8px; border-top: 1px dashed var(--border-light); font-size: 12px; color: #10b981;">
                🎉 全班已全部提交完成！
              </div>
            `}
          </div>
        `;
      }).join("")}
    </div>
  `;
};

// 一键标记该作业全班完成
window.markAllHomeworkSubmitted = function(hwId) {
  const hw = window.store.data.homeworkList.find(h => h.id === hwId);
  if (hw) {
    const totalCount = (window.store.data.students || []).length || (hw.stats && hw.stats.total) || 45;
    hw.stats.submitted = totalCount;
    hw.stats.unsubmitted = 0;
    hw.unsubmittedStudents = [];
    window.store.save();
    window.showToast("已成功登记该作业全员完成！", "success");
    window.renderHomeworkView(document.getElementById("mainContentArea"));
  }
};

// 单独标记某学生提交
window.quickToggleSingleStudentSubmit = function(hwId, studentName) {
  const hw = window.store.data.homeworkList.find(h => h.id === hwId);
  if (hw) {
    hw.unsubmittedStudents = (hw.unsubmittedStudents || []).filter(n => n !== studentName);
    const totalCount = (window.store.data.students || []).length || (hw.stats && hw.stats.total) || 45;
    hw.stats.submitted = Math.max(0, totalCount - hw.unsubmittedStudents.length);
    hw.stats.unsubmitted = hw.unsubmittedStudents.length;
    window.store.save();
    window.showToast(`已标记【${studentName}】提交该作业！`, "success");
    window.renderHomeworkView(document.getElementById("mainContentArea"));
  }
};

// 删除作业
window.deleteHomeworkItem = function(hwId) {
  if (confirm("确定要删除此条作业吗？")) {
    window.store.deleteHomework(hwId);
    window.showToast("已删除作业！", "success");
    window.renderHomeworkView(document.getElementById("mainContentArea"));
  }
};

// 批量催交通报
window.remindUnsubmitted = function(hwId) {
  const res = window.store.remindUnsubmittedHomework(hwId);
  if (res && res.count > 0) {
    alert(`📢 【班主任催流通报】\n已向以下 ${res.count} 位同学的家长微信发送作业提交温馨提醒：\n${res.names}`);
  } else {
    window.showToast("该作业暂无未交学生！", "info");
  }
};

/* ==========================================================================
   智慧黑板作业完成状态大屏核心交互引擎
   ========================================================================== */

// 开启智慧黑板大屏
window.openHomeworkSmartBoard = function(hwId) {
  window.currentSmartBoardHwId = hwId;
  const hw = (window.store.data.homeworkList || []).find(h => h.id === hwId);
  if (!hw) {
    window.showToast("未找到对应作业信息", "danger");
    return;
  }

  // 填充顶部任务信息
  const titleEl = document.getElementById("smartboardHomeworkTitle");
  if (titleEl) titleEl.innerText = hw.title || "背诵古诗";
  const descEl = document.getElementById("smartboardHomeworkDesc");
  if (descEl) descEl.innerText = hw.content ? hw.content.slice(0, 45) : "";
  const subBadge = document.getElementById("smartboardSubjectBadge");
  if (subBadge) subBadge.innerText = hw.subject || "学科";

  // 清空搜索框
  const pSearch = document.getElementById("smartboardPendingSearch");
  if (pSearch) pSearch.value = "";
  const cSearch = document.getElementById("smartboardCompletedSearch");
  if (cSearch) cSearch.value = "";

  // 渲染中央卡通教师助威形象
  const mascotContainer = document.getElementById("smartboardTeacherMascot");
  if (mascotContainer) {
    mascotContainer.innerHTML = window.getSmartBoardTeacherMascotSvg();
  }

  // 填充中央自律励志语录（教师发布时填写设置，不填写时采用默认语录，包含标点符号不超过26字）
  const quoteEl = document.getElementById("smartboardQuoteText");
  const defaultQuote = "博学笃志，自律自强，做时间的主人！";
  if (quoteEl) {
    let customQuote = (hw.quote || hw.disciplineQuote || "").trim();
    if (customQuote.length > 26) {
      customQuote = customQuote.slice(0, 26);
    }
    quoteEl.innerText = customQuote || defaultQuote;
    quoteEl.title = customQuote ? `教师寄语：${customQuote}` : `自律语录：${defaultQuote}`;
  }

  // 显示模态弹窗
  const modal = document.getElementById("homeworkSmartBoardModal");
  if (modal) modal.classList.add("active");

  // 即刻首渲染 + requestAnimationFrame 二次测量计算（确保获取弹窗弹出后的真实 clientWidth/clientHeight）
  window.renderSmartBoardPanels(hwId);
  requestAnimationFrame(() => {
    window.renderSmartBoardPanels(hwId);
  });

  // 全局自适应窗口缩放监听（进入全屏或改变视口大小时，毫秒级纯动态重新计算自适应排布）
  if (!window._smartboardResizeBound) {
    window._smartboardResizeBound = true;
    let resizeTimer = null;
    window.addEventListener("resize", () => {
      const curModal = document.getElementById("homeworkSmartBoardModal");
      if (curModal && curModal.classList.contains("active") && window.currentSmartBoardHwId) {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => {
          window.renderSmartBoardPanels(window.currentSmartBoardHwId);
        }, 100);
      }
    });
  }
};

// 关闭智慧黑板大屏
window.closeHomeworkSmartBoard = function() {
  const modal = document.getElementById("homeworkSmartBoardModal");
  if (modal) modal.classList.remove("active");

  // 退出全屏（若已处于全屏）
  if (document.fullscreenElement) {
    try { document.exitFullscreen(); } catch (e) {}
  }
  const frame = document.getElementById("smartboardFrame");
  if (frame) frame.classList.remove("is-fullscreen");

  // 刷新主作业列表视图
  const mainArea = document.getElementById("mainContentArea");
  if (mainArea && window.currentView === "homework") {
    window.renderHomeworkView(mainArea);
  }
};

/* ==========================================================================
   智慧黑板小组化体系与智能布局自适应辅助函数
   ========================================================================== */

// 统一标准化小组名称（如 1 -> "第1组"，"1组" -> "第1组"，空 -> "未分组"）
window.normalizeSmartBoardGroupName = function(rawGroup) {
  if (rawGroup === undefined || rawGroup === null || rawGroup === "") {
    return "未分组";
  }
  const str = String(rawGroup).trim();
  if (!str) return "未分组";
  if (/^\d+$/.test(str)) {
    return `第${str}组`;
  }
  return str;
};

// 获取小组主题色调编号 (1 ~ 8)
window.getGroupThemeIndex = function(groupName, fallbackIdx) {
  const match = String(groupName).match(/\d+/);
  if (match) {
    const num = parseInt(match[0], 10);
    return ((num - 1) % 8) + 1;
  }
  return ((fallbackIdx || 0) % 8) + 1;
};

// 获取小组主题图标
window.getGroupThemeIcon = function(themeIndex) {
  const icons = ["🚩", "🚀", "🌟", "⚡", "🍀", "☀️", "🎯", "💎"];
  return icons[(themeIndex - 1) % icons.length] || "🚩";
};

// ==========================================================================
// 智慧黑板纯动态排列计算引擎：根据当前班级实际人数、实际小组数与屏幕空间毫秒级自适应
// （彻底杜绝固定 px 与死板 8 组 53 人硬编码，无论 3 组 15 人、6 组 45 人还是 12 组 60 人均完美自适应）
// ==========================================================================
window.calculateSmartBoardDynamicParams = function(groupCount, maxGroupMembers, totalStudents, layoutMode, containerEl) {
  // 1. 读取容器真实物理尺寸（严谨保底，防止首帧取0时溢出）
  let H = containerEl ? containerEl.clientHeight : 0;
  let W = containerEl ? containerEl.clientWidth : 0;
  if (H <= 100) {
    H = Math.max(420, Math.round(window.innerHeight * 0.60));
  }
  if (W <= 150) {
    W = Math.max(520, Math.round(window.innerWidth * 0.44));
  }

  const G = Math.max(1, groupCount || 1);
  const M = Math.max(1, maxGroupMembers || 1);
  const N = Math.max(1, totalStudents || 1);

  if (layoutMode === "vertical") {
    // =============================================================
    // 模式 A：小组竖排模式（严禁滚动！所有 M 个学生必须 100% 完整呈现在屏内）
    // =============================================================
    const colGapBetween = G <= 5 ? 6 : (G <= 8 ? 4 : 3);
    const colWidth = Math.max(46, Math.floor((W - (G - 1) * colGapBetween) / G));

    // 列头表头高约 26px，内边距与外框预留 10px，严格保证可用净预算
    const usableH = Math.max(180, H - 36);
    // 每名学生所分配的最大高度预算（包含卡片高度与卡片间距）
    const slotH = usableH / M;

    // 动态垂直间距：人数越多间距越紧凑，严禁溢出
    const colGap = Math.max(2, Math.min(12, Math.floor(slotH * 0.08)));

    // 单个卡片净高度
    const netCardH = slotH - (M > 1 ? ((M - 1) / M) * colGap : 0);

    // 卡片内边距与文字大小动态分配
    let cardPadding = "2px 1px";
    let nameFont = 11;
    let textReserved = 16;
    if (netCardH >= 75) {
      cardPadding = "4px 2px";
      nameFont = 13;
      textReserved = 20;
    } else if (netCardH >= 56) {
      cardPadding = "3px 1px";
      nameFont = 12;
      textReserved = 18;
    } else if (netCardH >= 44) {
      cardPadding = "2px 1px";
      nameFont = 11;
      textReserved = 16;
    } else {
      cardPadding = "1px 1px";
      nameFont = 10;
      textReserved = 14;
    }

    // 头像尺寸严格受净卡片高与可用宽制约，绝不挤压卡片
    const maxAvatarFromH = Math.floor(netCardH - textReserved);
    const maxAvatarFromW = Math.floor(colWidth - 14);
    const avatarSize = Math.max(18, Math.min(46, Math.min(maxAvatarFromH, maxAvatarFromW)));

    // 列头标题字号与图标
    const headerFont = G <= 4 ? 13 : (G <= 7 ? 12 : (G <= 9 ? 11 : 10));
    const headerIcon = G <= 4 ? 14 : (G <= 7 ? 13 : (G <= 9 ? 12 : 11));

    return {
      avatarSize,
      nameFont,
      colGap,
      colGapBetween,
      cardGap: 6,
      cardPadding,
      headerFont,
      headerIcon,
      headerWidth: 66,
      cardMinWidth: 44,
      cardMaxWidth: 72,
      cardMaxHeight: Math.max(28, Math.round(netCardH)),
      rowHeight: 48,
      rowGap: 4
    };
  } else {
    // =============================================================
    // 模式 B：小组横排模式（严禁滚动！所有 G 个小组必须 100% 完整呈现在屏内）
    // =============================================================
    const rowGap = G <= 4 ? 6 : (G <= 7 ? 4 : (G <= 9 ? 3 : 2));
    const usableH = Math.max(200, H - (G - 1) * rowGap - 4);
    const rowHeight = Math.max(30, Math.min(94, Math.floor(usableH / G)));

    let cardPadding = "3px 6px";
    let nameFont = 12;
    let textReserved = 18;
    if (rowHeight >= 72) {
      cardPadding = "4px 8px";
      nameFont = 13.5;
      textReserved = 22;
    } else if (rowHeight >= 52) {
      cardPadding = "3px 6px";
      nameFont = 12;
      textReserved = 18;
    } else {
      cardPadding = "2px 4px";
      nameFont = 10.5;
      textReserved = 15;
    }

    // 头像尺寸受行高与保留空间制约
    const avatarSize = Math.max(20, Math.min(50, Math.floor(rowHeight - textReserved)));

    // 行首表头宽度与字号
    const headerWidth = G <= 4 ? 76 : (G <= 8 ? 66 : 56);
    const headerFont = G <= 4 ? 13 : (G <= 8 ? 12 : 11);
    const headerIcon = G <= 4 ? 14 : (G <= 8 ? 13 : 12);

    // 组内学生卡片横向平铺算法
    const availStudentsW = Math.max(280, W - headerWidth - 28);
    const targetCardW = Math.max(avatarSize + 12, Math.min(avatarSize + 36, Math.floor((availStudentsW * 0.90) / M)));
    const rawCardGap = (availStudentsW - M * targetCardW) / (M + 1);
    const cardGap = Math.max(3, Math.min(22, Math.round(rawCardGap)));
    const cardMinWidth = Math.max(avatarSize + 10, targetCardW - 6);
    const cardMaxWidth = Math.max(cardMinWidth + 8, targetCardW + 6);

    return {
      avatarSize,
      nameFont,
      rowHeight,
      cardGap,
      colGap: 4,
      colGapBetween: 4,
      cardMinWidth,
      cardMaxWidth,
      cardMaxHeight: Math.max(30, Math.round(rowHeight)),
      headerWidth,
      headerFont,
      headerIcon,
      cardPadding,
      rowGap
    };
  }
};

// 将动态计算出的样式参数应用到指定容器上
window.applySmartBoardDynamicStyles = function(containerEl, params) {
  if (!containerEl || !params) return;
  containerEl.style.setProperty("--sb-avatar-size", `${params.avatarSize}px`);
  containerEl.style.setProperty("--sb-name-font", `${params.nameFont}px`);
  containerEl.style.setProperty("--sb-row-height", `${params.rowHeight}px`);
  containerEl.style.setProperty("--sb-row-gap", `${params.rowGap || 3}px`);
  containerEl.style.setProperty("--sb-card-gap", `${params.cardGap}px`);
  containerEl.style.setProperty("--sb-col-gap", `${params.colGap}px`);
  containerEl.style.setProperty("--sb-col-gap-between", `${params.colGapBetween || 4}px`);
  containerEl.style.setProperty("--sb-card-min-width", `${params.cardMinWidth}px`);
  containerEl.style.setProperty("--sb-card-max-width", `${params.cardMaxWidth}px`);
  containerEl.style.setProperty("--sb-card-max-height", `${params.cardMaxHeight || 85}px`);
  containerEl.style.setProperty("--sb-header-width", `${params.headerWidth}px`);
  containerEl.style.setProperty("--sb-header-font", `${params.headerFont}px`);
  containerEl.style.setProperty("--sb-header-icon-font", `${params.headerIcon}px`);
  containerEl.style.setProperty("--sb-card-padding", params.cardPadding);
};

// 读取当前小组布局模式设置 (horizontal | vertical)
window.getSmartBoardLayoutMode = function() {
  const saved = localStorage.getItem("smartboard_layout_mode");
  if (saved === "vertical" || saved === "horizontal") {
    return saved;
  }
  return "horizontal"; // 默认横向排列，彻底去除智能自动按钮
};

// 设置当前小组布局模式并重新渲染
window.setSmartBoardLayout = function(mode) {
  const validMode = (mode === "vertical") ? "vertical" : "horizontal";
  localStorage.setItem("smartboard_layout_mode", validMode);
  if (window.currentSmartBoardHwId) {
    window.renderSmartBoardPanels(window.currentSmartBoardHwId);
  }
};

// 获取最终生效的布局模式 (根据用户选择的横排或竖排直接生效)
window.getSmartBoardEffectiveLayout = function(groupCount, totalCount) {
  return window.getSmartBoardLayoutMode();
};

// 渲染左右双面板（左：待完成，右：已完成 —— 全面支持小组化排列与动态自适应）
window.renderSmartBoardPanels = function(hwId, highlightStudentName) {
  const hw = (window.store.data.homeworkList || []).find(h => h.id === hwId);
  if (!hw) return;

  const allStudents = window.store.data.students || [];
  const totalCount = allStudents.length || 45;
  const unsubmittedList = hw.unsubmittedStudents || [];

  // 获取搜索过滤词
  const pendingKw = (document.getElementById("smartboardPendingSearch")?.value || "").trim().toLowerCase();
  const completedKw = (document.getElementById("smartboardCompletedSearch")?.value || "").trim().toLowerCase();

  // 1. 整理班级小组列表（优先使用系统设定的班级小组顺序，保证第1组~第8组顺序井然）
  const definedGroups = Array.isArray(window.store.data.groups) && window.store.data.groups.length > 0 
    ? window.store.data.groups.map(g => window.normalizeSmartBoardGroupName(g))
    : [];

  const uniqueGroups = [...definedGroups];
  allStudents.forEach(s => {
    const gName = window.normalizeSmartBoardGroupName(s.group);
    if (!uniqueGroups.includes(gName)) {
      uniqueGroups.push(gName);
    }
  });

  // 若存在“未分组”，将其置于末尾；对带数字的组自然递增排序
  uniqueGroups.sort((a, b) => {
    if (a === "未分组") return 1;
    if (b === "未分组") return -1;
    const numA = (a.match(/\d+/) || [0])[0];
    const numB = (b.match(/\d+/) || [0])[0];
    if (numA && numB) return parseInt(numA, 10) - parseInt(numB, 10);
    return a.localeCompare(b, "zh-CN");
  });

  // 建立小组数据聚合容器
  const groupMap = {};
  uniqueGroups.forEach(gName => {
    groupMap[gName] = {
      name: gName,
      allMembers: [],
      pendingMembers: [],
      completedMembers: []
    };
  });

  let totalPendingFilteredCount = 0;
  let totalCompletedFilteredCount = 0;

  allStudents.forEach(s => {
    const gName = window.normalizeSmartBoardGroupName(s.group);
    if (!groupMap[gName]) {
      groupMap[gName] = { name: gName, allMembers: [], pendingMembers: [], completedMembers: [] };
      uniqueGroups.push(gName);
    }
    groupMap[gName].allMembers.push(s);

    const isUnsubmitted = unsubmittedList.includes(s.name) || unsubmittedList.includes(s.id);
    if (isUnsubmitted) {
      if (!pendingKw || s.name.toLowerCase().includes(pendingKw)) {
        groupMap[gName].pendingMembers.push(s);
        totalPendingFilteredCount++;
      }
    } else {
      if (!completedKw || s.name.toLowerCase().includes(completedKw)) {
        groupMap[gName].completedMembers.push(s);
        totalCompletedFilteredCount++;
      }
    }
  });

  // 2. 更新 HUD 统计指标
  const realUnsubCount = unsubmittedList.length;
  const realSubCount = Math.max(0, totalCount - realUnsubCount);
  const percent = totalCount > 0 ? ((realSubCount / totalCount) * 100).toFixed(1) : "0.0";

  const unsubEl = document.getElementById("smartboardUnsubmittedCount");
  if (unsubEl) unsubEl.innerText = realUnsubCount;
  const subEl = document.getElementById("smartboardSubmittedCount");
  if (subEl) subEl.innerText = realSubCount;

  const pendBadge = document.getElementById("smartboardPendingBadge");
  if (pendBadge) pendBadge.innerText = `${realUnsubCount}人`;
  const compBadge = document.getElementById("smartboardCompletedBadge");
  if (compBadge) compBadge.innerText = `${realSubCount}人`;

  const percentEl = document.getElementById("smartboardProgressPercent");
  if (percentEl) percentEl.innerText = `${percent}%`;
  const barEl = document.getElementById("smartboardProgressBar");
  if (barEl) barEl.style.width = `${percent}%`;

  // 3. 核心纯动态排列引擎：根据当前班级实际人数、实际小组数与当前屏幕尺寸动态计算
  const effectiveLayout = window.getSmartBoardEffectiveLayout(uniqueGroups.length, totalCount);
  const layoutClass = effectiveLayout === "vertical" ? "layout-vertical" : "layout-horizontal";

  // 计算班级内各小组的最大成员人数（例如有些组7人，有些组6人，取最大值）
  const maxGroupMembers = Math.max(
    ...uniqueGroups.map(g => (groupMap[g] ? groupMap[g].allMembers.length : 0)),
    1
  );

  const pendingListEl = document.getElementById("smartboardPendingList");
  const completedListEl = document.getElementById("smartboardCompletedList");

  // 执行核心纯动态算法：根据实际小组数、最大单组人数、总人数和当前容器物理尺寸毫秒级自适应
  const dynamicStyles = window.calculateSmartBoardDynamicParams(
    uniqueGroups.length,
    maxGroupMembers,
    totalCount,
    effectiveLayout,
    pendingListEl
  );

  // 记录当前生效的动态头像大小与字号，以便飞跃动效和全局统一
  window.currentSmartBoardAvatarSize = dynamicStyles.avatarSize;
  window.currentSmartBoardNameFont = dynamicStyles.nameFont;

  if (pendingListEl) {
    pendingListEl.className = `smartboard-group-wall ${layoutClass}`;
    window.applySmartBoardDynamicStyles(pendingListEl, dynamicStyles);
  }
  if (completedListEl) {
    completedListEl.className = `smartboard-group-wall ${layoutClass}`;
    window.applySmartBoardDynamicStyles(completedListEl, dynamicStyles);
  }

  // 同步布局切换按钮的高亮状态
  const activeMode = window.getSmartBoardLayoutMode();
  document.querySelectorAll(".smartboard-layout-btn").forEach(btn => {
    btn.classList.toggle("active", btn.getAttribute("data-layout") === activeMode);
  });

  // 4. 渲染左侧待完成学生角色卡片墙（按小组排列）
  if (pendingListEl) {

    if (realUnsubCount === 0 && !pendingKw) {
      pendingListEl.innerHTML = `
        <div class="smartboard-empty-tip">
          <div class="tip-icon">🎉</div>
          <div style="font-size: 16px; font-weight: 800; color: #10b981;">太棒了！全班同学已全部打卡完成！</div>
          <div style="font-size: 12px; color: #94a3b8;">所有小组均已百分之百达成今日学习任务</div>
        </div>
      `;
    } else if (totalPendingFilteredCount === 0 && pendingKw) {
      pendingListEl.innerHTML = `
        <div class="smartboard-empty-tip">
          <div class="tip-icon">🔍</div>
          <div>未找到包含“${pendingKw}”的待完成学生</div>
        </div>
      `;
    } else {
      pendingListEl.innerHTML = uniqueGroups.map((gName, idx) => {
        const grp = groupMap[gName];
        if (!grp || grp.allMembers.length === 0) return "";
        if (pendingKw && grp.pendingMembers.length === 0) return "";

        const themeIdx = window.getGroupThemeIndex(gName, idx);
        const groupIcon = window.getGroupThemeIcon(themeIdx);
        const isGroupAllDone = grp.pendingMembers.length === 0;

        let studentsMarkup = "";
        if (isGroupAllDone) {
          studentsMarkup = effectiveLayout === "vertical"
            ? `<div class="excel-col-alldone"><span>🎉<br>全组<br>完成</span></div>`
            : `<div class="excel-row-alldone"><span>🎉 全组打卡完成</span></div>`;
        } else {
          studentsMarkup = grp.pendingMembers.map(s => {
            const avatarMarkup = window.getSmartBoardStudentAvatarMarkup(s);
            return `
              <div class="student-character-card" 
                   id="card-pending-${encodeURIComponent(s.name)}"
                   onclick="window.toggleSmartBoardStudent('${hw.id}', '${s.name}', false, event)" 
                   title="点击【${s.name}】自动打卡完成">
                <div class="student-character-avatar">
                  ${avatarMarkup}
                </div>
                <!-- 严格按要求：仅显示头像 + 姓名 -->
                <div class="student-character-name">${s.name}</div>
              </div>
            `;
          }).join("");
        }

        return `
          <div class="smartboard-group-block group-theme-${themeIdx}" id="group-pending-${encodeURIComponent(gName)}">
            <div class="smartboard-group-header">
              <div class="smartboard-group-title">
                <span class="smartboard-group-icon">${groupIcon}</span>
                <span>${gName}</span>
              </div>
            </div>
            <div class="smartboard-group-students">
              ${studentsMarkup}
            </div>
          </div>
        `;
      }).join("");
    }
  }

  // 5. 渲染右侧已完成学生角色卡片墙（按小组排列，纯净无冗余数字）
  if (completedListEl) {

    if (realSubCount === 0 && !completedKw) {
      completedListEl.innerHTML = `
        <div class="smartboard-empty-tip">
          <div class="tip-icon">⏳</div>
          <div style="font-size: 15px; font-weight: 700;">暂无已完成学生</div>
          <div style="font-size: 12px; color: #94a3b8;">点击左侧待完成学生头像卡片，立即飞跃打卡</div>
        </div>
      `;
    } else if (totalCompletedFilteredCount === 0 && completedKw) {
      completedListEl.innerHTML = `
        <div class="smartboard-empty-tip">
          <div class="tip-icon">🔍</div>
          <div>未找到包含“${completedKw}”的已完成学生</div>
        </div>
      `;
    } else {
      completedListEl.innerHTML = uniqueGroups.map((gName, idx) => {
        const grp = groupMap[gName];
        if (!grp || grp.allMembers.length === 0) return "";
        if (completedKw && grp.completedMembers.length === 0) return "";

        const themeIdx = window.getGroupThemeIndex(gName, idx);
        const groupIcon = window.getGroupThemeIcon(themeIdx);
        const completedCount = grp.completedMembers.length;

        let studentsMarkup = "";
        if (completedCount === 0) {
          studentsMarkup = effectiveLayout === "vertical"
            ? `<div class="excel-col-empty"><span>暂无</span></div>`
            : `<div class="excel-row-empty"><span>暂无打卡</span></div>`;
        } else {
          studentsMarkup = grp.completedMembers.map(s => {
            const avatarMarkup = window.getSmartBoardStudentAvatarMarkup(s);
            const isHighlight = highlightStudentName && highlightStudentName === s.name;
            return `
              <div class="student-character-card ${isHighlight ? 'smartboard-pop-in' : ''}" 
                   id="card-completed-${encodeURIComponent(s.name)}"
                   onclick="window.toggleSmartBoardStudent('${hw.id}', '${s.name}', true, event)" 
                   title="已完成 · 点击可撤回移回待完成">
                <div class="student-character-avatar">
                  ${avatarMarkup}
                  <span class="completed-badge">✓</span>
                </div>
                <!-- 严格按要求：仅显示头像 + 姓名 -->
                <div class="student-character-name">${s.name}</div>
              </div>
            `;
          }).join("");
        }

        return `
          <div class="smartboard-group-block group-theme-${themeIdx}" id="group-completed-${encodeURIComponent(gName)}">
            <div class="smartboard-group-header">
              <div class="smartboard-group-title">
                <span class="smartboard-group-icon">${groupIcon}</span>
                <span>${gName}</span>
              </div>
            </div>
            <div class="smartboard-group-students">
              ${studentsMarkup}
            </div>
          </div>
        `;
      }).join("");
    }
  }
};

// 点击学生头像卡片：待完成 -> 已完成（触发平滑定向飞跃动效 + 真实音效）
window.toggleSmartBoardStudent = function(hwId, studentName, fromCompleted, clickEvent) {
  const hw = (window.store.data.homeworkList || []).find(h => h.id === hwId);
  if (!hw) return;

  const totalCount = (window.store.data.students || []).length || 45;
  if (!Array.isArray(hw.unsubmittedStudents)) {
    hw.unsubmittedStudents = [];
  }

  if (!fromCompleted) {
    // 【核心交互】：从待完成跳转到已完成
    // 1. 播放清脆打卡音效
    window.playSmartBoardChime();

    // 2. 获取源卡片位置并触发飞行幽灵动效，智能定向飞跃至右侧对应小组
    const cardEl = clickEvent ? clickEvent.currentTarget : null;
    const sObj = (window.store.data.students || []).find(item => item.name === studentName);
    const groupName = window.normalizeSmartBoardGroupName(sObj?.group);

    // 寻找右侧对应的小组卡片区块
    const targetGroupEl = document.getElementById(`group-completed-${encodeURIComponent(groupName)}`);
    const targetContainer = targetGroupEl ? (targetGroupEl.querySelector(".smartboard-group-students") || targetGroupEl) : document.getElementById("smartboardCompletedList");

    if (cardEl && targetContainer) {
      const startRect = cardEl.getBoundingClientRect();
      const avatarHtml = window.getSmartBoardStudentAvatarMarkup(sObj);
      window.triggerSmartBoardFlyAnimation(startRect, targetContainer, avatarHtml, studentName);
    }

    // 3. 更新数据
    hw.unsubmittedStudents = hw.unsubmittedStudents.filter(n => n !== studentName);
    hw.stats.submitted = Math.max(0, totalCount - hw.unsubmittedStudents.length);
    hw.stats.unsubmitted = hw.unsubmittedStudents.length;
    window.store.save();

    // 4. 短暂延迟后刷新面板呈现弹跳高亮
    setTimeout(() => {
      window.renderSmartBoardPanels(hwId, studentName);
    }, 180);
  } else {
    // 容错机制：误点击已完成，将其退回待完成
    if (!hw.unsubmittedStudents.includes(studentName)) {
      hw.unsubmittedStudents.push(studentName);
    }
    hw.stats.submitted = Math.max(0, totalCount - hw.unsubmittedStudents.length);
    hw.stats.unsubmitted = hw.unsubmittedStudents.length;
    window.store.save();

    window.renderSmartBoardPanels(hwId);
    window.showToast(`已将【${studentName}】移回待完成列表`, "info");
  }
};

// 飞跃过渡动效执行器 (定向滑跃至右侧对应小组区块)
window.triggerSmartBoardFlyAnimation = function(startRect, targetContainer, avatarHtml, name) {
  const ghost = document.createElement("div");
  ghost.className = "smartboard-flying-ghost";
  ghost.style.left = `${startRect.left}px`;
  ghost.style.top = `${startRect.top}px`;
  ghost.style.width = `${startRect.width}px`;
  ghost.style.height = `${startRect.height}px`;

  const curAvatarSize = window.currentSmartBoardAvatarSize || 36;
  const curNameFont = window.currentSmartBoardNameFont || 12;

  ghost.innerHTML = `
    <div class="student-character-avatar" style="width:${curAvatarSize}px; height:${curAvatarSize}px; margin-bottom:2px;">
      ${avatarHtml}
    </div>
    <div class="student-character-name" style="color:#059669; font-weight:800; font-size:${curNameFont}px;">${name}</div>
  `;

  document.body.appendChild(ghost);

  // 计算目标位置（精准飞往右侧已完成对应小组区块内）
  const targetRect = targetContainer.getBoundingClientRect();
  const destX = targetRect.left + Math.min(targetRect.width * 0.45, 140);
  const destY = targetRect.top + Math.min(targetRect.height * 0.5, 60);

  requestAnimationFrame(() => {
    ghost.style.left = `${destX}px`;
    ghost.style.top = `${destY}px`;
    ghost.style.transform = "scale(1.15) rotate(5deg)";
    ghost.style.opacity = "0.95";

    setTimeout(() => {
      ghost.style.opacity = "0";
      ghost.style.transform = "scale(0.85) rotate(0deg)";
      setTimeout(() => {
        if (ghost.parentNode) ghost.parentNode.removeChild(ghost);
      }, 150);
    }, 280);
  });
};

// 搜索实时联动过滤
window.filterSmartBoardStudents = function() {
  if (window.currentSmartBoardHwId) {
    window.renderSmartBoardPanels(window.currentSmartBoardHwId);
  }
};

// 一键全员完成 / 全部重置
window.markAllSmartBoardSubmit = function(allDone) {
  if (!window.currentSmartBoardHwId) return;
  const hw = (window.store.data.homeworkList || []).find(h => h.id === window.currentSmartBoardHwId);
  if (!hw) return;

  const allStudents = window.store.data.students || [];
  const totalCount = allStudents.length || 45;

  if (allDone) {
    hw.unsubmittedStudents = [];
    hw.stats.submitted = totalCount;
    hw.stats.unsubmitted = 0;
    window.playSmartBoardChime();
    window.showToast("🎉 已一键登记全班打卡完成！", "success");
  } else {
    hw.unsubmittedStudents = allStudents.map(s => s.name);
    hw.stats.submitted = 0;
    hw.stats.unsubmitted = totalCount;
    window.showToast("已重置该作业为全部待完成状态", "info");
  }

  window.store.save();
  window.renderSmartBoardPanels(window.currentSmartBoardHwId);
};

// 切换全屏沉浸驾驶舱模式
window.toggleSmartBoardFullscreen = function() {
  const frame = document.getElementById("smartboardFrame");
  if (!frame) return;

  if (!document.fullscreenElement) {
    if (frame.requestFullscreen) {
      frame.requestFullscreen();
    } else if (frame.webkitRequestFullscreen) {
      frame.webkitRequestFullscreen();
    }
    frame.classList.add("is-fullscreen");
  } else {
    if (document.exitFullscreen) {
      document.exitFullscreen();
    }
    frame.classList.remove("is-fullscreen");
  }
};

// 切换打卡音效
window.toggleSmartBoardSound = function() {
  window.smartBoardSoundEnabled = !window.smartBoardSoundEnabled;
  const btn = document.getElementById("smartboardSoundToggleBtn");
  if (btn) {
    btn.innerText = window.smartBoardSoundEnabled ? "🔊 音效开" : "🔇 静音";
  }
  if (window.smartBoardSoundEnabled) {
    window.playSmartBoardChime();
  }
};

// Web Audio API 极速合成真实清脆打卡提示音（零外部资源依赖）
window.playSmartBoardChime = function() {
  if (!window.smartBoardSoundEnabled) return;
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    if (!window._smartBoardAudioCtx) {
      window._smartBoardAudioCtx = new AudioCtx();
    }
    const ctx = window._smartBoardAudioCtx;
    if (ctx.state === "suspended") {
      ctx.resume();
    }
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    const now = ctx.currentTime;
    osc.frequency.setValueAtTime(587.33, now); // D5
    osc.frequency.exponentialRampToValueAtTime(880.00, now + 0.08); // A5
    osc.frequency.exponentialRampToValueAtTime(1174.66, now + 0.18); // D6
    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.32);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.32);
  } catch (e) {
    console.log("Audio play error", e);
  }
};

/* ==========================================================================
   高清矢量卡通学生头像与卡通教师 Mascot 生成器 (复刻视频卡通校服学生风格)
   ========================================================================== */

window.getSmartBoardStudentAvatarMarkup = function(student) {
  if (!student) {
    return `<div style="font-size:24px;">👦</div>`;
  }

  // 1. 若学生档案中已上传真实头像，优先使用真实头像
  if (student.avatarUrl) {
    return `<img src="${student.avatarUrl}" alt="${student.name || '头像'}" loading="lazy">`;
  }

  // 2. 否则使用根据学生姓名哈希选取的对应高清矢量卡通校服角色（复刻视频小红、小橙、小黄、小绿、小蓝等形象）
  const name = student.name || "学生";
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash << 5) - hash + name.charCodeAt(i);
    hash |= 0;
  }
  const isBoy = student.gender === "男" || (Math.abs(hash) % 2 === 0);
  const avatarIndex = Math.abs(hash) % 8;

  return window.renderCartoonStudentSvg(avatarIndex, isBoy);
};

// 绘制多样化矢量卡通小学生校服角色头像 (SVG)
window.renderCartoonStudentSvg = function(index, isBoy) {
  // 8 套缤纷校服卡通风格（蓝卫衣、红毛衣、橙色运动衫、绿校服、黄领结、紫开衫、青棒球服、粉水手领）
  const styles = [
    { bg: "#dbeafe", skin: "#fde68a", hair: "#1e293b", shirt: "#3b82f6", collar: "#ffffff", hairType: "spiky" },
    { bg: "#ffe4e6", skin: "#fed7aa", hair: "#78350f", shirt: "#ef4444", collar: "#fecdd3", hairType: "braids" },
    { bg: "#ffedd5", skin: "#fde68a", hair: "#0f172a", shirt: "#f97316", collar: "#fed7aa", hairType: "short" },
    { bg: "#dcfce7", skin: "#fed7aa", hair: "#451a03", shirt: "#10b981", collar: "#ffffff", hairType: "bob" },
    { bg: "#fef9c3", skin: "#fde68a", hair: "#172554", shirt: "#eab308", collar: "#fef08a", hairType: "parted", glasses: true },
    { bg: "#f3e8ff", skin: "#fed7aa", hair: "#312e81", shirt: "#a855f7", collar: "#f5d0fe", hairType: "ribbon" },
    { bg: "#cffafe", skin: "#fde68a", hair: "#042f2e", shirt: "#06b6d4", collar: "#a5f3fc", hairType: "short" },
    { bg: "#fce7f3", skin: "#fed7aa", hair: "#701a75", shirt: "#ec4899", collar: "#ffffff", hairType: "buns" }
  ];

  const s = styles[index % styles.length];

  // 头发路径
  let hairPath = "";
  if (s.hairType === "spiky") {
    hairPath = `<path d="M28,42 C25,28 35,18 50,18 C65,18 75,28 72,42 C68,36 60,34 50,34 C40,34 32,36 28,42 Z" fill="${s.hair}" />
                <path d="M35,22 L42,12 L46,20 L54,10 L58,20 L68,14 L65,26 Z" fill="${s.hair}" />`;
  } else if (s.hairType === "braids") {
    hairPath = `<path d="M26,45 C24,25 36,16 50,16 C64,16 76,25 74,45 C70,36 60,34 50,34 C40,34 30,36 26,45 Z" fill="${s.hair}" />
                <circle cx="20" cy="50" r="7" fill="${s.hair}" /><circle cx="16" cy="62" r="6" fill="${s.hair}" />
                <circle cx="80" cy="50" r="7" fill="${s.hair}" /><circle cx="84" cy="62" r="6" fill="${s.hair}" />
                <circle cx="20" cy="46" r="3" fill="#ef4444" /><circle cx="80" cy="46" r="3" fill="#ef4444" />`;
  } else if (s.hairType === "bob") {
    hairPath = `<path d="M24,46 C24,24 35,16 50,16 C65,16 76,24 76,46 C76,58 72,64 70,64 C68,52 64,36 50,36 C36,36 32,52 30,64 C28,64 24,58 24,46 Z" fill="${s.hair}" />`;
  } else if (s.hairType === "buns") {
    hairPath = `<path d="M28,44 C26,26 36,18 50,18 C64,18 74,26 72,44 C68,36 60,35 50,35 C40,35 32,36 28,44 Z" fill="${s.hair}" />
                <circle cx="28" cy="18" r="9" fill="${s.hair}" /><circle cx="28" cy="18" r="4" fill="#ec4899" />
                <circle cx="72" cy="18" r="9" fill="${s.hair}" /><circle cx="72" cy="18" r="4" fill="#ec4899" />`;
  } else {
    hairPath = `<path d="M26,42 C25,26 35,18 50,18 C65,18 75,26 74,42 C68,34 60,32 50,32 C40,32 32,34 26,42 Z" fill="${s.hair}" />`;
  }

  // 眼镜元素
  const glassesMarkup = s.glasses ? `
    <circle cx="41" cy="46" r="6.5" fill="none" stroke="#1e293b" stroke-width="2" />
    <circle cx="59" cy="46" r="6.5" fill="none" stroke="#1e293b" stroke-width="2" />
    <line x1="47.5" y1="46" x2="52.5" y2="46" stroke="#1e293b" stroke-width="2" />
  ` : '';

  return `
    <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <!-- 背景圆底 -->
      <circle cx="50" cy="50" r="48" fill="${s.bg}" />
      
      <!-- 身体与校服 -->
      <path d="M22,96 C24,72 35,68 50,68 C65,68 76,72 78,96 Z" fill="${s.shirt}" />
      <!-- 领口 -->
      <path d="M42,68 L50,78 L58,68 L50,65 Z" fill="${s.collar}" />
      <path d="M50,74 L50,86" stroke="#ffffff" stroke-width="2" stroke-linecap="round" />

      <!-- 头部与脸庞 -->
      <circle cx="50" cy="48" r="22" fill="${s.skin}" />
      <!-- 红润腮红 -->
      <ellipse cx="36" cy="52" rx="4" ry="2.5" fill="#fca5a5" opacity="0.6" />
      <ellipse cx="64" cy="52" rx="4" ry="2.5" fill="#fca5a5" opacity="0.6" />

      <!-- 眼睛 -->
      <ellipse cx="41" cy="46" rx="2.5" ry="3" fill="#1e293b" />
      <ellipse cx="59" cy="46" rx="2.5" ry="3" fill="#1e293b" />
      <!-- 眼睛高光 -->
      <circle cx="42" cy="45" r="0.9" fill="#ffffff" />
      <circle cx="60" cy="45" r="0.9" fill="#ffffff" />

      <!-- 微笑嘴巴 -->
      <path d="M45,54 Q50,58 55,54" fill="none" stroke="#b91c1c" stroke-width="2" stroke-linecap="round" />

      <!-- 发型 -->
      ${hairPath}

      <!-- 眼镜 -->
      ${glassesMarkup}
    </svg>
  `;
};

// 绘制中央卡通助威班主任 Mascot (SVG)
window.getSmartBoardTeacherMascotSvg = function() {
  return `
    <svg viewBox="0 0 100 120" xmlns="http://www.w3.org/2000/svg">
      <!-- 班主任大衣/西服身体 -->
      <path d="M20,118 C20,85 32,75 50,75 C68,75 80,85 80,118 Z" fill="#831843" />
      <!-- 白色衬衣内搭 -->
      <polygon points="50,75 42,92 58,92" fill="#ffffff" />
      <!-- 红色领带/围巾 -->
      <polygon points="50,82 46,110 50,114 54,110" fill="#dc2626" />
      <!-- 大衣翻领 -->
      <path d="M38,75 L45,98 L34,98 Z" fill="#701a75" />
      <path d="M62,75 L55,98 L66,98 Z" fill="#701a75" />

      <!-- 脸部 -->
      <ellipse cx="50" cy="45" rx="21" ry="23" fill="#fde68a" />
      <!-- 腮红 -->
      <ellipse cx="36" cy="51" rx="3.5" ry="2" fill="#fca5a5" opacity="0.7" />
      <ellipse cx="64" cy="51" rx="3.5" ry="2" fill="#fca5a5" opacity="0.7" />

      <!-- 教师眼镜 -->
      <circle cx="41" cy="44" r="7" fill="none" stroke="#1e293b" stroke-width="2.2" />
      <circle cx="59" cy="44" r="7" fill="none" stroke="#1e293b" stroke-width="2.2" />
      <line x1="48" y1="44" x2="52" y2="44" stroke="#1e293b" stroke-width="2.2" />

      <!-- 笑眯眯眼睛 -->
      <path d="M38,43 Q41,40 44,43" fill="none" stroke="#1e293b" stroke-width="2" stroke-linecap="round" />
      <path d="M56,43 Q59,40 62,43" fill="none" stroke="#1e293b" stroke-width="2" stroke-linecap="round" />

      <!-- 热情笑容 -->
      <path d="M44,53 Q50,61 56,53 Z" fill="#dc2626" />
      <path d="M47,54 Q50,57 53,54" fill="#ffffff" />

      <!-- 教师干练发型 -->
      <path d="M27,42 C25,24 35,16 50,16 C65,16 75,24 73,42 C67,32 58,30 50,30 C42,30 33,32 27,42 Z" fill="#1e293b" />
      <path d="M32,24 Q45,14 62,20" fill="none" stroke="#334155" stroke-width="2" />

      <!-- 竖大拇指点赞手势 -->
      <ellipse cx="78" cy="78" rx="8" ry="7" fill="#fde68a" />
      <path d="M78,74 L78,64 C78,62 82,62 82,64 L82,75" fill="#fde68a" stroke="#d97706" stroke-width="1.5" />
    </svg>
  `;
};
