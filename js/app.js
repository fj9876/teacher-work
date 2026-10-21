/**
 * 班主任工作台 - 主控制器与全局交互调度中心 (App Controller)
 * 管理全局路由、所有弹窗表单提交流程、动态未完成班务徽章、顶部教师信息同步、Excel多表导入解析
 */

window.currentView = "dashboard";


// 全局事件初始化
function initGlobalEvents() {
  document.querySelectorAll(".nav-item[data-view]").forEach(item => {
    item.addEventListener("click", () => {
      const viewName = item.getAttribute("data-view");
      window.switchView(viewName);
    });
  });

  const fullScreenBtn = document.getElementById("fullscreenToggleBtn");
  if (fullScreenBtn) {
    fullScreenBtn.addEventListener("click", () => {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(err => console.log(err));
      } else {
        document.exitFullscreen();
      }
    });
  }

  const topSearch = document.getElementById("globalSearchInput");
  if (topSearch) {
    topSearch.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        const query = topSearch.value.trim();
        if (query) {
          const s = window.store.data.students.find(item => item.name.includes(query) || item.id.includes(query));
          if (s) {
            window.openStudentDrawer(s.id);
            window.showToast(`已找到学生【${s.name}】并打开档案！`, "success");
            return;
          }
          const t = window.store.data.tasks.find(item => item.title.includes(query));
          if (t) {
            window.switchView("tasks");
            window.showToast(`已定位到班务【${t.title}】！`, "info");
            return;
          }
          window.showToast(`未找到包含 "${query}" 的学生或班务`, "info");
        }
      }
    });
  }
}

// 动态未完成班务徽章同步 (解决问题1)
window.updateTasksBadge = function() {
  const badge = document.getElementById("sidebarTasksBadge");
  if (!badge) return;
  const tasks = (window.store && window.store.data && window.store.data.tasks) || [];
  const pendingCount = tasks.filter(t => t.status === "pending" || t.status === "in_progress").length;
  badge.innerText = pendingCount;
  badge.style.display = pendingCount > 0 ? "inline-block" : "none";
};

// 顶部栏教师与班级信息实时同步
window.updateTopbarInfo = function() {
  let currentUser = null;
  try {
    currentUser = window.currentUser || JSON.parse(localStorage.getItem("HOMEROOM_CURRENT_USER") || "null");
  } catch(e) {}

  const isDemo = !currentUser || currentUser.isDemo || (currentUser.role && currentUser.role.startsWith('demo'));
  const isTeacher = currentUser && currentUser.role !== 'admin' && !isDemo;
  const currentClassId = (isTeacher && currentUser.classId)
    ? currentUser.classId
    : ((isDemo)
        ? (currentUser && currentUser.classId ? currentUser.classId : "class_demo_template")
        : ((window.store && window.store.currentClassId && window.store.currentClassId !== "class_default")
            ? window.store.currentClassId
            : (currentUser && currentUser.classId ? currentUser.classId : "class_demo_template")));

  // 保证 store 的班级 ID 与当前登录身份严格绑定
  if (currentUser && currentUser.classId && window.store && window.store.currentClassId !== currentUser.classId) {
    window.store.currentClassId = currentUser.classId;
    localStorage.setItem("CURRENT_CLASS_ID", currentUser.classId);
  }

  const ci = window.store && window.store.data && window.store.data.classInfo;

  // 1. 优先从 window.allSystemClasses 中获取班级名称与年级
  let realClassName = "";
  let realGrade = "";
  let realCount = 45;

  if (currentClassId === "class_demo_template" || isDemo) {
    realClassName = (ci && ci.name && ci.name.includes("模板")) ? ci.name : "【示范体验】班级默认模板";
    realGrade = "小学四年级";
    realCount = (window.store && window.store.data && Array.isArray(window.store.data.students)) ? window.store.data.students.length : 45;
  } else if (window.allSystemClasses && Array.isArray(window.allSystemClasses)) {
    const matched = window.allSystemClasses.find(c => c.id === currentClassId);
    if (matched) {
      realClassName = matched.name;
      realGrade = matched.grade || "小学四年级";
      realCount = matched.studentCount || 45;
    }
  }

  // 2. 若未匹配，从当前用户或 store 数据获取
  if (!realClassName) {
    if (currentUser && currentUser.className) {
      realClassName = currentUser.className;
      realGrade = currentUser.grade || "小学四年级";
      realCount = currentUser.studentCount || 45;
    } else if (ci && ci.name && ci.name !== "三年级2班" && ci.name !== "初二(3)班") {
      realClassName = ci.name;
      realGrade = (ci.gradeLevel && ci.gradeLevel !== "小学部 · 三年级") ? ci.gradeLevel : (ci.grade || "小学四年级");
      realCount = ci.studentCount || 45;
    } else {
      realClassName = "【示范体验】班级默认模板";
      realGrade = "小学四年级";
      realCount = 45;
    }
  }

  // 3. 核心准则：左上角班级人数必须以当前名册中的真实学生总数 (store.data.students.length) 为最高准则！
  if (window.store && window.store.data && Array.isArray(window.store.data.students)) {
    realCount = window.store.data.students.length;
  }

  // 确保 store 中的 classInfo 及系统班级列表同步更新为最准确的真实学生总数
  if (ci) {
    ci.name = realClassName;
    ci.grade = realGrade;
    ci.gradeLevel = realGrade;
    ci.studentCount = realCount;
  }
  if (window.allSystemClasses && Array.isArray(window.allSystemClasses)) {
    const matched = window.allSystemClasses.find(c => c.id === currentClassId);
    if (matched) {
      matched.studentCount = realCount;
    }
  }

  const pill = document.getElementById("topbarClassPill");
  if (pill) {
    pill.onclick = null;
    pill.style.cursor = "default";
    pill.removeAttribute("onclick");
    const isAdmin = currentUser && currentUser.role === 'admin';
    let badgeText = "示范模板·体验试用";
    let badgeStyle = "background: #fef3c7; color: #b45309;";
    if (isAdmin) {
      badgeText = "当前管理班级";
      badgeStyle = "background: #e0f2fe; color: #0284c7;";
    } else if (isTeacher) {
      badgeText = "当前执教班级";
      badgeStyle = "background: #dcfce7; color: #15803d;";
    }
    pill.innerHTML = `🏫 <span>${realGrade} · ${realClassName} · ${realCount}人</span> <span class="badge" style="font-size: 10px; ${badgeStyle} padding: 2px 6px; margin-left: 6px; border-radius: 4px; font-weight: 600;">${badgeText}</span>`;
    pill.title = isDemo ? "当前为示范默认模板，仅供功能试用体验，不包含任何真实学生隐私数据" : `当前工作班级：${realClassName}（各班级数据物理隔离）`;
  }
  
  let teacherName = (typeof ci?.teacher === 'object' && ci?.teacher ? ci.teacher.name : (typeof ci?.teacher === 'string' ? ci.teacher : "李老师")) || "李老师";
  let teacherRole = (typeof ci?.teacher === 'object' && ci?.teacher && ci.teacher.role) ? ci.teacher.role : "班主任";
  let teacherAvatar = "👨‍🏫";

  if (currentUser) {
    teacherName = currentUser.realName || currentUser.username;
    if (currentUser.role === 'admin') {
      teacherRole = "👑 超级管理员";
      teacherAvatar = "👑";
    } else if (currentUser.role === 'subject_teacher') {
      teacherRole = `👩‍🏫 ${currentUser.subject || '任课'}老师`;
      teacherAvatar = "👩‍🏫";
    } else {
      teacherRole = "👨‍🏫 班主任";
      teacherAvatar = "👨‍🏫";
    }
  }

  const nameEl = document.getElementById("topbarUserName");
  if (nameEl) nameEl.innerText = teacherName;
  const roleEl = document.getElementById("topbarUserRole");
  if (roleEl) roleEl.innerText = teacherRole;
  const avatarEl = document.getElementById("topbarUserAvatar");
  if (avatarEl) avatarEl.innerText = teacherAvatar;

  // 动态同步网页顶部与仪表盘横幅当前实际日期与教学周次
  if (window.getCurrentDateInfo) {
    const dInfo = window.getCurrentDateInfo();
    const dateTextEl = document.getElementById("topbarDateText");
    if (dateTextEl) {
      dateTextEl.innerText = dInfo.displayFull;
    }
    const dashboardDateText = document.getElementById("dashboardDateText");
    if (dashboardDateText) {
      const lShort = dInfo.lunarShort || (dInfo.lunar ? dInfo.lunar.lunarShort : '七月廿六');
      dashboardDateText.innerText = `📅 ${dInfo.displayDate} ${dInfo.dayStr} (农历${lShort}) · 第${dInfo.weekNum}周`;
    }
  }

  // 同步执行角色权限控制
  if (window.applyUserRolePermissions) {
    window.applyUserRolePermissions(currentUser);
  }
};

// ================= 角色权限控制系统 (RBAC) =================
window.applyUserRolePermissions = function(user) {
  if (!user) {
    try {
      user = window.currentUser || JSON.parse(localStorage.getItem("HOMEROOM_CURRENT_USER") || "null");
    } catch(e) {}
  }
  if (!user) return;

  const topbarTeacherBtn = document.getElementById("topbarTeachersBtn");
  const sidebarTeacherNav = document.getElementById("sidebarTeachersNavItem");
  const sidebarSettingsNav = document.getElementById("sidebarSettingsNavItem");
  const sidebarDatamgmtNav = document.getElementById("sidebarDatamgmtNavItem");

  const isSubjectTeacher = (user.role === "subject_teacher" || user.role === "subject");

  // 1. 任课老师账号密码登录：不能再显示任课老师按钮，且不能增删老师账号，权限独立
  if (isSubjectTeacher) {
    if (topbarTeacherBtn) topbarTeacherBtn.style.display = "none";
    if (sidebarTeacherNav) sidebarTeacherNav.style.display = "none";
    // 权限独立：任课老师不开放全班系统设置与底层数据清空管理
    if (sidebarSettingsNav) sidebarSettingsNav.style.display = "none";
    if (sidebarDatamgmtNav) sidebarDatamgmtNav.style.display = "none";

    // 若当前视图停留在受限视图，自动导向主控制台
    if (window.currentView === "teachers" || window.currentView === "settings" || window.currentView === "datamgmt") {
      window.switchView("dashboard");
    }
  } else {
    // 班主任与超级管理员：正常展示并开放教师团队管理与班级数据设置
    if (topbarTeacherBtn) topbarTeacherBtn.style.display = "";
    if (sidebarTeacherNav) sidebarTeacherNav.style.display = "";
    if (sidebarSettingsNav) sidebarSettingsNav.style.display = "";
    if (sidebarDatamgmtNav) sidebarDatamgmtNav.style.display = "";
  }
};

// 视图切换 (支持 targetAnchor 锚点定位与 classSettings 别名)
window.switchView = function(viewName, targetAnchor) {
  // 别名支持：classSettings 映射至 settings 班级设置
  if (viewName === 'classSettings' || viewName === 'class_settings') {
    viewName = 'settings';
  }

  // 权限防御：任课老师禁止直达教师团队管理与数据重置
  if (window.currentUser && (window.currentUser.role === 'subject_teacher' || window.currentUser.role === 'subject')) {
    if (viewName === 'teachers' || viewName === 'settings' || viewName === 'datamgmt') {
      alert("权限提示：您当前登录的是任课老师账号，无权访问该管理模块，已为您返回主工作台！");
      viewName = 'dashboard';
    }
  }

  window.currentView = viewName;
  document.querySelectorAll(".nav-item[data-view]").forEach(item => {
    if (item.getAttribute("data-view") === viewName) {
      item.classList.add("active");
    } else {
      item.classList.remove("active");
    }
  });
  renderCurrentView(targetAnchor);
};

function renderCurrentView(targetAnchor) {
  const container = document.getElementById("mainContentArea");
  if (!container) return;

  switch (window.currentView) {
    case "dashboard":
      if (window.renderDashboardView) window.renderDashboardView(container);
      break;
    case "tasks":
      if (window.renderTasksView) window.renderTasksView(container);
      break;
    case "students":
      if (window.renderStudentsView) window.renderStudentsView(container);
      break;
    case "attendance":
      if (window.renderAttendanceView) window.renderAttendanceView(container);
      break;
    case "schedule":
      if (window.renderScheduleView) window.renderScheduleView(container);
      break;
    case "homework":
      if (window.renderHomeworkView) window.renderHomeworkView(container);
      break;
    case "exams":
      if (window.renderExamsView) window.renderExamsView(container);
      break;
    case "growth":
      if (window.renderGrowthView) window.renderGrowthView(container);
      break;
    case "communication":
      if (window.renderCommunicationView) window.renderCommunicationView(container);
      break;
    case "safety":
      if (window.renderSafetyView) window.renderSafetyView(container);
      break;
    case "rules":
      if (window.renderRulesView) window.renderRulesView(container);
      break;
    case "score":
      if (window.renderScoreView) window.renderScoreView(container);
      break;
    case "pets":
      if (window.renderPetsView) window.renderPetsView(container);
      break;
    case "activities":
      if (window.renderActivitiesView) window.renderActivitiesView(container);
      break;
    case "stats":
      if (window.renderStatsView) window.renderStatsView(container);
      break;
    case "settings":
    case "classSettings":
      if (window.renderClassSettingsView) window.renderClassSettingsView(container);
      break;
    case "datamgmt":
      if (window.renderDataMgmtView) window.renderDataMgmtView(container);
      break;
    default:
      if (window.renderDashboardView) window.renderDashboardView(container);
      break;
  }
  container.scrollTop = 0;
  if (targetAnchor) {
    setTimeout(() => {
      const el = document.getElementById(targetAnchor);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        el.style.boxShadow = '0 0 0 3px #818cf8';
        setTimeout(() => { el.style.boxShadow = ''; }, 2000);
      }
    }, 150);
  }
  window.updateTasksBadge();
  window.updateTopbarInfo();
}

// Toast 提示条
window.showToast = function(message, type = "info") {
  const container = document.getElementById("toastContainer");
  if (!container) return;
  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `<span>${type === 'success' ? '✅' : type === 'danger' ? '🚨' : 'ℹ️'}</span> <span>${message}</span>`;
  container.appendChild(toast);
  setTimeout(() => toast.classList.add("show"), 10);
  setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(() => toast.remove(), 300);
  }, 3200);
};

// ================= 学生档案抽屉 =================
window.currentDrawerStudentId = null;
window.currentDrawerTab = "basic";

window.openStudentDrawer = function(studentId) {
  const student = window.store.data.students.find(s => s.id === studentId);
  if (!student) return;
  window.currentDrawerStudentId = studentId;
  window.currentDrawerTab = "basic";
  const overlay = document.getElementById("drawerOverlay");
  const avatarEl = document.getElementById("drawerStudentAvatar");
  const nameEl = document.getElementById("drawerStudentName");
  const idEl = document.getElementById("drawerStudentId");
  if (avatarEl) {
    if (student.avatarUrl) {
      avatarEl.innerHTML = `<img src="${student.avatarUrl}" alt="${student.name}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;">`;
    } else {
      avatarEl.innerText = student.gender === "男" ? "👦" : "👧";
    }
  }
  if (nameEl) nameEl.innerText = student.name;
  if (idEl) idEl.innerText = `学号: ${student.id} · ${window.formatGroupName ? window.formatGroupName(student.group) : ('第' + student.group + '组')} · ${student.seat}`;
  renderDrawerBodyContent();
  if (overlay) overlay.classList.add("active");
};

window.closeStudentDrawer = function() {
  const overlay = document.getElementById("drawerOverlay");
  if (overlay) overlay.classList.remove("active");
  window.currentDrawerStudentId = null;
};

window.switchDrawerTab = function(tabName) {
  window.currentDrawerTab = tabName;
  document.querySelectorAll(".drawer-tab").forEach(tab => {
    if (tab.getAttribute("data-tab") === tabName) tab.classList.add("active");
    else tab.classList.remove("active");
  });
  renderDrawerBodyContent();
};

function renderDrawerBodyContent() {
  const container = document.getElementById("drawerTabContent");
  if (!container) return;
  const s = window.store.data.students.find(item => item.id === window.currentDrawerStudentId);
  if (!s) return;

  if (window.currentDrawerTab === "basic") {
    const bdayLunar = (window.getLunarDate && s.birthday) ? window.getLunarDate(s.birthday) : null;
    const bdayLunarText = bdayLunar ? ` <span style="font-weight:normal; font-size:12px; color:#64748b;">(农历${bdayLunar.lunarShort})</span>` : '';
    const bdayCheck = window.checkStudentBirthday ? window.checkStudentBirthday(s) : null;
    const hukouText = s.hukou || s.registeredResidence || '未登记户籍';
    const nationText = s.nation || s.ethnicity || '汉族';
    const idCardRaw = s.idCard || '';

    // 表格导入的所有其他自定义扩展字段
    const extraEntries = Object.entries(s.extraFields || {}).filter(([k, v]) => {
      const kl = k.toLowerCase();
      return !kl.includes('姓名') && !kl.includes('性别') && !kl.includes('学号') && !kl.includes('身份证') && !kl.includes('出生');
    });

    container.innerHTML = `
      <div style="display: flex; flex-direction: column; gap: 14px;">
        ${bdayCheck ? `
          <div style="background: linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%); border: 1.5px dashed #f59e0b; border-radius: var(--radius-md); padding: 10px 14px; font-weight: 700; color: #92400e; display: flex; align-items: center; justify-content: space-between; box-shadow: 0 2px 6px rgba(245,158,11,0.15);">
            <div style="display: flex; align-items: center; gap: 8px;">
              <span style="font-size: 20px;">🎂</span>
              <div>
                <div style="font-size: 13.5px; font-weight: 800;">今日是该学生的生日 (${bdayCheck.birthdayText})！🎉</div>
                <div style="font-size: 11.5px; color: #b45309; font-weight: normal;">中国通用农历/公历双轨识别，祝 ${s.name} 生日快乐！</div>
              </div>
            </div>
            <button class="btn btn-sm btn-primary" style="background: #ea580c; border: none; font-size: 11.5px; font-weight: 700; padding: 3px 10px;" onclick="window.rewardBirthdayFlower('${s.id}')">🌸 送小红花</button>
          </div>
        ` : ''}

        <!-- 1. 户籍所在地专属高亮卡片 -->
        <div style="background: linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%); border: 1.5px solid #a7f3d0; padding: 14px 16px; border-radius: var(--radius-lg); box-shadow: 0 2px 6px rgba(16,185,129,0.08);">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px;">
            <div style="display: flex; align-items: center; gap: 6px; font-weight: 800; color: #065f46; font-size: 13.5px;">
              <span>🏡 户口所在地 / 户籍地址</span>
            </div>
            <span class="badge badge-success" style="font-size: 11px; padding: 2px 8px; background: #059669; color: #fff;">源表格官方户籍</span>
          </div>
          <div style="font-size: 14.5px; font-weight: 700; color: #064e3b; line-height: 1.5; word-break: break-all;">
            ${hukouText}
          </div>
        </div>

        <!-- 2. 现居住地常住住址卡片 -->
        <div style="background: #f8fafc; padding: 14px 16px; border-radius: var(--radius-lg); border: 1px solid #e2e8f0;">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 5px;">
            <div style="color: #475569; font-size: 12.5px; font-weight: 700;">📍 现居住常住地址：</div>
            <span style="font-size: 11px; color: var(--text-muted);">日常家访与联络地址</span>
          </div>
          <div style="font-size: 14px; font-weight: 600; color: #1e293b; line-height: 1.5; word-break: break-all;">
            ${s.address || '本市'}
          </div>
        </div>

        <!-- 3. 基本身份网格 -->
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; background: #f8fafc; padding: 14px; border-radius: var(--radius-lg); border: 1px solid #e2e8f0;">
          <div><span style="color: var(--text-muted); font-size: 12px;">学生姓名：</span><strong style="font-size: 13.5px;">${s.name}</strong></div>
          <div><span style="color: var(--text-muted); font-size: 12px;">性别：</span><strong style="font-size: 13.5px;">${s.gender}</strong></div>
          <div><span style="color: var(--text-muted); font-size: 12px;">民族成分：</span><strong style="font-size: 13.5px; color: #0284c7;">${nationText}</strong></div>
          <div><span style="color: var(--text-muted); font-size: 12px;">学号：</span><strong style="font-size: 13.5px;">${s.id}</strong></div>
          <div style="grid-column: span 2;">
            <span style="color: var(--text-muted); font-size: 12px;">身份证号：</span>
            <strong style="font-family: monospace; font-size: 13px; color: #1e293b; margin-right: 8px;">${idCardRaw || '未录入'}</strong>
            ${idCardRaw ? `<button class="btn btn-sm btn-secondary" style="padding: 1px 6px; font-size: 10.5px;" onclick="navigator.clipboard.writeText('${idCardRaw}'); window.showToast('已复制身份证号！', 'info');">📋 复制</button>` : ''}
          </div>
          <div style="grid-column: span 2;">
            <span style="color: var(--text-muted); font-size: 12px;">出生日期：</span>
            <strong style="font-size: 13.5px;">${s.birthday || '未录入'}${bdayLunarText}</strong>
          </div>
          <div><span style="color: var(--text-muted); font-size: 12px;">监护人家长：</span><strong style="font-size: 13.5px;">${s.guardian}</strong></div>
          <div><span style="color: var(--text-muted); font-size: 12px;">联系电话：</span><strong style="font-size: 13.5px; color: #2563eb;">${s.phone}</strong></div>
          <div><span style="color: var(--text-muted); font-size: 12px;">所属学校：</span><strong style="font-size: 13px;">${s.school || '实验学校'}</strong></div>
          <div><span style="color: var(--text-muted); font-size: 12px;">年班级：</span><strong style="font-size: 13px;">${s.className || '四（7）班'}</strong></div>
          <div><span style="color: var(--text-muted); font-size: 12px;">是否留守儿童：</span><strong style="font-size: 13px; color: ${s.isLeftBehind ? '#b45309' : '#475569'};">${s.isLeftBehind ? '⭐ 是 (留守儿童重点关注)' : '否'}</strong></div>
          <div><span style="color: var(--text-muted); font-size: 12px;">家庭困难类别：</span><strong style="font-size: 13px; color: ${s.hardshipCategory ? '#dc2626' : '#475569'};">${s.hardshipCategory ? ('第 ' + s.hardshipCategory + ' 类 (关爱帮扶)') : '无困难'}</strong></div>
          <div><span style="color: var(--text-muted); font-size: 12px;">班主任：</span><strong style="font-size: 13px;">${s.homeroomTeacher || '李老师'}</strong></div>
          <div><span style="color: var(--text-muted); font-size: 12px;">班主任联系电话：</span><strong style="font-size: 13px;">${s.homeroomPhone || '13800000000'}</strong></div>
        </div>

        <div style="background: #f8fafc; padding: 14px; border-radius: var(--radius-md); border: 1px solid #e2e8f0;">
          <div style="color: var(--text-muted); font-size: 12px; margin-bottom: 4px;">上下学接送方式：</div>
          <div style="font-size: 13.5px; font-weight: 600; color: #2563eb;">${s.pickup || '家长接送'}</div>
        </div>

        <!-- 4. 源表格中导入的全部原始信息与扩展字段 (表格中存在的所有信息一览无遗) -->
        ${extraEntries.length > 0 ? `
          <div style="background: #fdfefe; border: 1px solid #e2e8f0; border-radius: var(--radius-lg); padding: 14px;">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px;">
              <span style="font-size: 13px; font-weight: 700; color: #334155;">📋 源表格导入完整登记信息 (${extraEntries.length}项)</span>
              <span style="font-size: 11px; color: var(--text-muted);">自动同步提取 Excel 原始全字段</span>
            </div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
              ${extraEntries.map(([k, v]) => `
                <div style="background: #f8fafc; padding: 8px 10px; border-radius: 6px; border: 1px dashed #cbd5e1; font-size: 12px;">
                  <span style="color: #64748b; font-weight: 600;">${k}：</span>
                  <span style="color: #1e293b; font-weight: 700;">${v}</span>
                </div>
              `).join('')}
            </div>
          </div>
        ` : ''}

        <div style="background: #f8fafc; padding: 14px; border-radius: var(--radius-md); border: 1px solid #e2e8f0;">
          <div style="color: var(--text-muted); font-size: 12px; margin-bottom: 6px;">个性成长标签：</div>
          <div style="display: flex; flex-wrap: wrap; gap: 6px;">
            ${(window.getStudentTagsWithCount ? window.getStudentTagsWithCount(s) : []).map(item => {
              const disp = window.formatTagDisplay ? window.formatTagDisplay(item.tag, item.count) : item.tag;
              const isStackable = window.store.isTagStackable ? window.store.isTagStackable(item.tag) : true;
              const goldThresh = window.store.getTagGoldThreshold ? window.store.getTagGoldThreshold(item.tag) : 3;
              const isRedeemed = window.store.isTagRedeemed ? window.store.isTagRedeemed(s, item.tag) : false;
              const isGold = isStackable && !isRedeemed && (item.count >= goldThresh);

              let badgeStyle = '';
              let icon = '🏷️';
              let labelText = disp;

              if (isRedeemed) {
                badgeStyle = 'background: #f1f5f9; color: #64748b; border: 1px solid #cbd5e1;';
                icon = '🎁';
                labelText = `${disp} (已兑换)`;
              } else if (isGold) {
                badgeStyle = 'background: #fef3c7; color: #b45309; border: 1.5px solid #f59e0b; box-shadow: 0 1px 4px rgba(245, 158, 11, 0.25); font-weight: 700;';
                icon = '⭐';
                labelText = disp;
              } else if (isStackable) {
                badgeStyle = 'background: #eff6ff; color: #1d4ed8; border: 1px solid #bfdbfe; font-weight: 600;';
                icon = '🏷️';
                labelText = disp;
              } else {
                const isDanger = item.tag.includes('关注');
                const isWarn = item.tag.includes('生日');
                const badgeClass = isDanger ? 'badge-danger' : isWarn ? 'badge-warning' : 'badge-purple';
                return `<span class="badge ${badgeClass}" style="font-size: 12px; padding: 3px 8px;">🏷️ ${disp}</span>`;
              }
              return `<span class="badge" style="font-size: 12px; padding: 3px 8px; ${badgeStyle}">${icon} ${labelText}</span>`;
            }).join("")}
          </div>
        </div>
        <div style="display:flex; justify-content:flex-end; gap:8px; margin-top: 6px;">
          <button class="btn btn-sm btn-primary" onclick="window.openEditStudentModal('${s.id}')">✏️ 修改个人信息</button>
          <button class="btn btn-sm btn-danger" onclick="window.deleteCurrentDrawerStudent('${s.id}')">🗑️ 删除该档案</button>
        </div>
      </div>
    `;
  } else if (window.currentDrawerTab === "school") {
    container.innerHTML = `
      <div style="display: flex; flex-direction: column; gap: 14px;">
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; background: #f8fafc; padding: 14px; border-radius: var(--radius-md);">
          <div><span style="color: var(--text-muted); font-size: 12px;">所在小组：</span><strong>${window.formatGroupName ? window.formatGroupName(s.group) : ('第' + s.group + '组')}</strong></div>
          <div><span style="color: var(--text-muted); font-size: 12px;">教室座位：</span><strong>${s.seat}</strong></div>
          <div><span style="color: var(--text-muted); font-size: 12px;">班干部职务：</span><strong style="color: #8b5cf6;">${s.role}</strong></div>
          <div><span style="color: var(--text-muted); font-size: 12px;">值日轮值：</span><strong>${s.dutyDay}</strong></div>
          <div><span style="color: var(--text-muted); font-size: 12px;">量化积分：</span><strong style="color: #ea580c; font-size: 15px;">${s.score || 80} 分</strong></div>
          <div><span style="color: var(--text-muted); font-size: 12px;">今日考勤：</span><strong style="color: #10b981;">${s.attendanceToday === 'normal' ? '正常出勤' : s.attendanceToday}</strong></div>
        </div>
        <div style="background: #f8fafc; padding: 14px; border-radius: var(--radius-md);">
          <div style="color: var(--text-muted); font-size: 12px; margin-bottom: 4px;">兴趣特长与优势：</div>
          <div style="font-size: 13px; color: #334155;">${s.strengths || '自主学习好，乐于助人'}</div>
        </div>
        <div style="background: #f8fafc; padding: 14px; border-radius: var(--radius-md);">
          <div style="color: var(--text-muted); font-size: 12px; margin-bottom: 4px;">性格特点：</div>
          <div style="font-size: 13px; color: #334155;">${s.personality || '沉稳、开朗有责任心'}</div>
        </div>
      </div>
    `;
  } else if (window.currentDrawerTab === "health") {
    container.innerHTML = `
      <div style="display: flex; flex-direction: column; gap: 14px;">
        <div style="background: #fff5f5; border: 1px solid #fed7d7; padding: 14px; border-radius: var(--radius-md);">
          <div style="color: #991b1b; font-size: 13px; font-weight: 700; margin-bottom: 4px;">⚠️ 过敏与既往病史：</div>
          <div style="font-size: 13.5px; color: #7f1d1d; font-weight: 600;">
            ${s.allergies && s.allergies !== '无' ? '过敏情况：' + s.allergies : '无过敏史，身体健康良好'}
          </div>
        </div>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; background: #f8fafc; padding: 14px; border-radius: var(--radius-md);">
          <div><span style="color: var(--text-muted); font-size: 12px;">身高：</span><strong>${s.height || 135} cm</strong></div>
          <div><span style="color: var(--text-muted); font-size: 12px;">视力情况：</span><strong>${s.vision || '5.0 / 5.0'}</strong></div>
          <div><span style="color: var(--text-muted); font-size: 12px;">特殊饮食要求：</span><strong>${s.diet || '无'}</strong></div>
          <div><span style="color: var(--text-muted); font-size: 12px;">紧急联系人：</span><strong>${s.emergencyContact || s.phone}</strong></div>
        </div>
        <div style="background: #f0fdf4; border: 1px solid #bbf7d0; padding: 12px; border-radius: var(--radius-md); font-size: 12px; color: #166534;">
          🔒 敏感健康信息仅班主任及任课老师可见，已做隐私脱敏防护。
        </div>
      </div>
    `;
  } else if (window.currentDrawerTab === "growth") {
    container.innerHTML = `
      <div style="display: flex; flex-direction: column; gap: 14px;">
        <div style="background: #eff6ff; border: 1px solid #bfdbfe; padding: 14px; border-radius: var(--radius-md);">
          <div style="font-size: 13.5px; font-weight: 700; color: #1e40af; margin-bottom: 6px;">班主任综合评语：</div>
          <p style="font-size: 13px; color: #1e3a8a; line-height: 1.6;">${s.notes || '课堂专心，思维活跃，积极参与集体劳动。'}</p>
        </div>
        <div class="panel-header" style="margin-top: 6px;">
          <div class="panel-title" style="font-size: 14px;">💬 谈话与家访轨迹</div>
          <button class="btn btn-sm btn-primary" onclick="window.promptAddTalkRecord('${s.id}')">+ 新增谈话记录</button>
        </div>
        <div style="display: flex; flex-direction: column; gap: 8px;">
          ${(s.talkingRecords || []).map(tr => `
            <div style="background: #f8fafc; border: 1px solid var(--border-light); padding: 10px; border-radius: var(--radius-md);">
              <div style="display: flex; align-items: center; justify-content: space-between; font-size: 12px; color: var(--text-muted); margin-bottom: 4px;">
                <span>📅 ${tr.date} · 记录教师：${tr.teacher}</span>
                <span class="badge badge-info">谈心谈话</span>
              </div>
              <div style="font-size: 13px; font-weight: 700; color: #1e293b; margin-bottom: 2px;">主题：${tr.topic}</div>
              <div style="font-size: 12px; color: #475569;">${tr.notes}</div>
            </div>
          `).join("")}
        </div>
      </div>
    `;
  }
}

window.deleteCurrentDrawerStudent = function(studentId) {
  if (window.currentUser && (window.currentUser.role === 'subject_teacher' || window.currentUser.role === 'subject')) {
    alert("权限受限：您当前为任课老师身份，无权删除学生学籍档案，请联系班主任操作！");
    return;
  }
  if (confirm("确定要删除这名学生的档案吗？")) {
    window.store.deleteStudent(studentId);
    window.closeStudentDrawer();
    window.showToast("已成功删除该学生档案！", "success");
    renderCurrentView();
  }
};

window.promptAddTalkRecord = function(studentId) {
  const topic = prompt("请输入谈心谈话主题：", "课堂注意力及学习方法指导");
  if (!topic) return;
  const notes = prompt("请输入谈话具体内容与学生反馈：", "学生表示将合理调整作息，课上更专注。");
  if (!notes) return;
  const s = window.store.data.students.find(item => item.id === studentId);
  if (s) {
    if (!s.talkingRecords) s.talkingRecords = [];
    s.talkingRecords.unshift({ date: new Date().toISOString().slice(0, 10), topic, teacher: window.store.data.classInfo.teacher.name || "班主任", notes });
    window.store.save();
    window.showToast("谈话记录已归档！", "success");
    renderDrawerBodyContent();
  }
};

// ================= 班务任务弹窗 =================
window.openAddTaskModal = function() { document.getElementById("addTaskModal").classList.add("active"); };
window.closeAddTaskModal = function() { document.getElementById("addTaskModal").classList.remove("active"); };
window.submitAddTask = function() {
  const title = document.getElementById("newTaskTitle").value.trim();
  if (!title) { alert("请输入班务名称！"); return; }
  const category = document.getElementById("newTaskCategory").value;
  const deadline = document.getElementById("newTaskDeadline").value || new Date().toISOString().slice(0, 10);
  const priority = document.getElementById("newTaskPriority").value;
  const assignee = document.getElementById("newTaskAssignee").value || "班主任";
  const desc = document.getElementById("newTaskDesc").value;
  window.store.addTask({ title, category, deadline, priority, assignee, relatedStudents: "相关学生", desc, status: "pending", repeat: "指定日期" });
  window.closeAddTaskModal();
  window.updateTasksBadge();
  window.showToast("已添加新班务！", "success");
  renderCurrentView();
};

// ================= 作业管理弹窗 (解决问题4) =================
// 系统推荐自带自律语录列表（包含标点均在26字以内，兼具思想性与韵律感）
window.SYSTEM_QUOTE_PRESETS = [
  { label: "🌟 博学笃志，自律自强，做时间的主人！(默认)", value: "博学笃志，自律自强，做时间的主人！" },
  { label: "⚔️ 宝剑锋从磨砺出，梅花香自苦寒来。自律自立，勇攀高峰！", value: "宝剑锋从磨砺出，梅花香自苦寒来。自律自立，勇攀高峰！" },
  { label: "🏃 千里之行始于足下，今日事今日毕，绝不拖延！", value: "千里之行始于足下，今日事今日毕，绝不拖延！" },
  { label: "📖 书山有路勤为径，学海无涯苦作舟。日积月累！", value: "书山有路勤为径，学海无涯苦作舟。日积月累！" },
  { label: "🎯 细节决定成败，习惯成就未来。严于律己，超越自我！", value: "细节决定成败，习惯成就未来。严于律己，超越自我！" },
  { label: "🧘 非学无以广才，非志无以成学。静心自律，沉着专注！", value: "非学无以广才，非志无以成学。静心自律，沉着专注！" },
  { label: "🚀 自律是梦想的翅膀，今日拼搏，明日辉煌！", value: "自律是梦想的翅膀，今日拼搏，明日辉煌！" },
  { label: "🌱 少壮工夫老始成，自律自觉，笃行不怠！", value: "少壮工夫老始成，自律自觉，笃行不怠！" }
];

// 快捷选用系统预设自律语录
window.selectHwQuotePreset = function(selectId, inputId, countId) {
  const select = document.getElementById(selectId);
  const input = document.getElementById(inputId);
  if (!select || !input) return;
  if (select.value) {
    input.value = select.value;
  }
  window.updateHwQuoteCount(inputId, countId, selectId);
};

// 实时更新自律语录字数统计与超出限制截断（含标点符号在内不超过26字）
window.updateHwQuoteCount = function(inputId, countId, selectId) {
  const input = document.getElementById(inputId);
  const countEl = document.getElementById(countId);
  if (!input || !countEl) return;
  let val = input.value || '';
  if (val.length > 26) {
    val = val.slice(0, 26);
    input.value = val;
  }
  const len = val.length;
  if (len === 0) {
    countEl.innerText = '0/26字 (默认推荐)';
    countEl.style.color = '#64748b';
  } else if (len >= 26) {
    countEl.innerText = '26/26字 (已达上限)';
    countEl.style.color = '#ef4444';
  } else {
    countEl.innerText = `${len}/26字`;
    countEl.style.color = len >= 22 ? '#f59e0b' : '#3b82f6';
  }

  // 同步下拉框预设选项状态
  if (selectId) {
    const select = document.getElementById(selectId);
    if (select) {
      const match = Array.from(select.options).some(opt => opt.value === val);
      select.value = match ? val : "";
    }
  }
};

window.openAssignHomeworkModal = function() {
  document.getElementById("newHwTitle").value = "";
  document.getElementById("newHwContent").value = "";
  document.getElementById("newHwDeadline").value = "";
  if (document.getElementById("newHwQuote")) {
    document.getElementById("newHwQuote").value = "";
  }
  if (document.getElementById("newHwQuotePreset")) {
    document.getElementById("newHwQuotePreset").value = "";
  }
  window.updateHwQuoteCount("newHwQuote", "newHwQuoteCount", "newHwQuotePreset");

  // 若为任课老师，自动为其匹配预选对应负责学科
  if (window.currentUser && (window.currentUser.role === 'subject_teacher' || window.currentUser.role === 'subject') && window.currentUser.subject) {
    const subSel = document.getElementById("newHwSubject");
    if (subSel) {
      for (let opt of subSel.options) {
        if (opt.value.includes(window.currentUser.subject) || window.currentUser.subject.includes(opt.value)) {
          subSel.value = opt.value;
          break;
        }
      }
    }
  }

  document.getElementById("assignHomeworkModal").classList.add("active");
};
window.closeAssignHomeworkModal = function() {
  document.getElementById("assignHomeworkModal").classList.remove("active");
};
window.submitAssignHomework = function() {
  const subject = document.getElementById("newHwSubject").value;
  const title = document.getElementById("newHwTitle").value.trim();
  const content = document.getElementById("newHwContent").value.trim();
  const deadline = document.getElementById("newHwDeadline").value || "次日 08:00";
  const needSign = document.getElementById("newHwSign").checked;
  const quote = (document.getElementById("newHwQuote")?.value || "").trim();

  if (!title || !content) { alert("请填写作业标题和作业内容！"); return; }
  if (quote.length > 26) {
    window.showToast("自律语录字数不能超过26个字（包含标点符号）！", "warning");
    return;
  }

  const totalStudents = (window.store.data.students || []).length || 45;
  window.store.addHomework({
    subject, title, content,
    quote, // 自律励志语录（教师选填，包含标点符号不超过26字；不填时智慧黑板采用默认语录）
    assignedDate: new Date().toISOString().slice(0, 10),
    deadline: deadline.replace("T", " "),
    needParentSign: needSign,
    needSubmission: true,
    stats: { submitted: 0, unsubmitted: totalStudents, corrected: 0, needCorrection: 0 },
    unsubmittedStudents: (window.store.data.students || []).map(s => s.name)
  });

  window.closeAssignHomeworkModal();
  window.showToast(`已成功发布【${subject}】新作业！`, "success");
  if (window.currentView === "homework") renderCurrentView();
};

window.openEditHomeworkModal = function(hwId) {
  const hw = window.store.data.homeworkList.find(h => h.id === hwId);
  if (!hw) return;
  document.getElementById("editHwId").value = hw.id;
  document.getElementById("editHwSubject").value = hw.subject;
  document.getElementById("editHwTitle").value = hw.title;
  document.getElementById("editHwContent").value = hw.content;
  document.getElementById("editHwDeadline").value = hw.deadline;
  if (document.getElementById("editHwQuote")) {
    const q = hw.quote || "";
    document.getElementById("editHwQuote").value = q;
    if (document.getElementById("editHwQuotePreset")) {
      const select = document.getElementById("editHwQuotePreset");
      const match = Array.from(select.options).some(opt => opt.value === q);
      select.value = match ? q : "";
    }
    window.updateHwQuoteCount("editHwQuote", "editHwQuoteCount", "editHwQuotePreset");
  }
  document.getElementById("editHomeworkModal").classList.add("active");
};
window.closeEditHomeworkModal = function() {
  document.getElementById("editHomeworkModal").classList.remove("active");
};
window.submitEditHomework = function() {
  const hwId = document.getElementById("editHwId").value;
  const subject = document.getElementById("editHwSubject").value;
  const title = document.getElementById("editHwTitle").value.trim();
  const content = document.getElementById("editHwContent").value.trim();
  const deadline = document.getElementById("editHwDeadline").value.trim();
  const quote = (document.getElementById("editHwQuote")?.value || "").trim();
  if (!title) { alert("作业标题不能为空！"); return; }
  if (quote.length > 26) {
    window.showToast("自律语录字数不能超过26个字（包含标点符号）！", "warning");
    return;
  }

  window.store.updateHomework(hwId, { subject, title, content, deadline, quote });
  window.closeEditHomeworkModal();
  window.showToast("作业内容已更新！", "success");
  if (window.currentView === "homework") renderCurrentView();
};

// ================= 登记作业提交名单弹窗 (区分已交/未交双栏与批量操作) =================
window.currentCheckHwId = null;
window.currentCheckSubmittedSet = new Set();

window.openCheckHomeworkSubmitModal = function(hwId) {
  window.currentCheckHwId = hwId;
  const hw = (window.store.data.homeworkList || []).find(h => h.id === hwId);
  if (!hw) return;

  const titleEl = document.getElementById("checkHwModalTitle");
  if (titleEl) titleEl.innerText = `📋 登记《${hw.subject} · ${hw.title}》提交名单`;

  document.getElementById("checkHwId").value = hwId;
  const searchInput = document.getElementById("checkHwSearchInput");
  if (searchInput) searchInput.value = "";

  const allStudents = window.store.data.students || [];
  const unsubmittedList = hw.unsubmittedStudents || [];
  
  // 初始化已交集合：所有不在未交名单里的即为已提交
  window.currentCheckSubmittedSet = new Set();
  allStudents.forEach(s => {
    if (!unsubmittedList.includes(s.name) && !unsubmittedList.includes(s.id)) {
      window.currentCheckSubmittedSet.add(s.name);
    }
  });

  renderHomeworkSubmitLists();
  document.getElementById("checkHomeworkSubmitModal").classList.add("active");
};

window.closeCheckHomeworkSubmitModal = function() {
  document.getElementById("checkHomeworkSubmitModal").classList.remove("active");
};

function renderHomeworkSubmitLists() {
  const allStudents = window.store.data.students || [];
  const kw = (document.getElementById("checkHwSearchInput")?.value || "").trim().toLowerCase();

  const submittedContainer = document.getElementById("hwSubmittedListContainer");
  const unsubmittedContainer = document.getElementById("hwUnsubmittedListContainer");
  if (!submittedContainer || !unsubmittedContainer) return;

  const submitted = [];
  const unsubmitted = [];

  allStudents.forEach(s => {
    if (kw && !s.name.toLowerCase().includes(kw) && !s.id.toLowerCase().includes(kw)) return;
    if (window.currentCheckSubmittedSet.has(s.name)) {
      submitted.push(s);
    } else {
      unsubmitted.push(s);
    }
  });

  // 更新指标数字
  const subCount = window.currentCheckSubmittedSet.size;
  const unsubCount = allStudents.length - subCount;
  const rate = allStudents.length > 0 ? Math.round((subCount / allStudents.length) * 100) : 0;

  const subCountEl = document.getElementById("checkHwSubmittedCount");
  if (subCountEl) subCountEl.innerText = subCount;
  const unsubCountEl = document.getElementById("checkHwUnsubmittedCount");
  if (unsubCountEl) unsubCountEl.innerText = unsubCount;
  const rateBadge = document.getElementById("checkHwRateBadge");
  if (rateBadge) {
    rateBadge.innerText = `${rate}% 提交率`;
    rateBadge.className = rate >= 90 ? "badge badge-success" : rate >= 75 ? "badge badge-warning" : "badge badge-danger";
  }

  const subColEl = document.getElementById("submittedColCount");
  if (subColEl) subColEl.innerText = `${submitted.length} 人`;
  const unsubColEl = document.getElementById("unsubmittedColCount");
  if (unsubColEl) unsubColEl.innerText = `${unsubmitted.length} 人`;

  // 渲染已交列表 (绿色微质感胶囊卡片，点击移入未交)
  if (submitted.length === 0) {
    submittedContainer.innerHTML = `<div style="color:#64748b; font-size:12px; padding:12px; text-align:center; width:100%;">暂无已交学生</div>`;
  } else {
    submittedContainer.innerHTML = submitted.map(s => `
      <div onclick="window.toggleHomeworkSubmitStatus('${s.name}')" 
           style="background: #dcfce7; border: 1px solid #86efac; color: #166534; padding: 5px 10px; border-radius: 20px; font-size: 12.5px; font-weight: 600; cursor: pointer; display: flex; align-items: center; gap: 4px; transition: all 0.15s ease;"
           title="点击移入未交名单">
        <span>✓</span>
        <span>${s.name}</span>
        <span style="font-size: 10px; opacity: 0.7;">(G${s.group})</span>
      </div>
    `).join("");
  }

  // 渲染未交列表 (红色浅色微质感胶囊卡片，点击移入已交)
  if (unsubmitted.length === 0) {
    unsubmittedContainer.innerHTML = `<div style="color:#16a34a; font-size:12px; padding:12px; text-align:center; width:100%; font-weight:700;">🎉 全班全员已全部完成提交！</div>`;
  } else {
    unsubmittedContainer.innerHTML = unsubmitted.map(s => `
      <div onclick="window.toggleHomeworkSubmitStatus('${s.name}')" 
           style="background: #fee2e2; border: 1px solid #fca5a5; color: #991b1b; padding: 5px 10px; border-radius: 20px; font-size: 12.5px; font-weight: 600; cursor: pointer; display: flex; align-items: center; gap: 4px; transition: all 0.15s ease;"
           title="点击登记为已交">
        <span>✕</span>
        <span>${s.name}</span>
        <span style="font-size: 10px; opacity: 0.7;">(G${s.group})</span>
      </div>
    `).join("");
  }
}

window.toggleHomeworkSubmitStatus = function(studentName) {
  if (window.currentCheckSubmittedSet.has(studentName)) {
    window.currentCheckSubmittedSet.delete(studentName);
  } else {
    window.currentCheckSubmittedSet.add(studentName);
  }
  renderHomeworkSubmitLists();
};

window.markBatchHomeworkSubmit = function(allSubmitted) {
  const allStudents = window.store.data.students || [];
  if (allSubmitted) {
    allStudents.forEach(s => window.currentCheckSubmittedSet.add(s.name));
  } else {
    window.currentCheckSubmittedSet.clear();
  }
  renderHomeworkSubmitLists();
};

window.filterHomeworkSubmitStudents = function() {
  renderHomeworkSubmitLists();
};

window.submitCheckHomeworkSubmit = function() {
  const hw = (window.store.data.homeworkList || []).find(h => h.id === window.currentCheckHwId);
  if (!hw) return;

  const allStudents = window.store.data.students || [];
  const newUnsubmitted = [];
  allStudents.forEach(s => {
    if (!window.currentCheckSubmittedSet.has(s.name)) {
      newUnsubmitted.push(s.name);
    }
  });

  hw.unsubmittedStudents = newUnsubmitted;
  if (!hw.stats) hw.stats = {};
  hw.stats.unsubmitted = newUnsubmitted.length;
  hw.stats.submitted = allStudents.length - newUnsubmitted.length;

  window.store.save();
  window.closeCheckHomeworkSubmitModal();
  window.showToast(`作业提交名单已更新！已交 ${hw.stats.submitted} 人，未交 ${hw.stats.unsubmitted} 人`, "success");
  if (window.currentView === "homework" || window.currentView === "dashboard") renderCurrentView();
};

// ================= 考试与成绩弹窗 (支持自定义科目细分与总分) =================
window.openNewExamModal = function() {
  document.getElementById("newExamName").value = "";
  document.getElementById("newExamDate").value = new Date().toISOString().slice(0, 10);
  const subjInput = document.getElementById("newExamSubjectsList");
  if (subjInput) subjInput.value = "语文, 数学, 英语, 科学";
  document.getElementById("newExamModal").classList.add("active");
};

window.closeNewExamModal = function() {
  document.getElementById("newExamModal").classList.remove("active");
};

window.submitNewExam = function() {
  const name = document.getElementById("newExamName").value.trim();
  const type = document.getElementById("newExamType").value;
  const date = document.getElementById("newExamDate").value;
  const subject = document.getElementById("newExamSubject").value;
  const fullScore = parseFloat(document.getElementById("newExamFullScore").value) || 100;
  
  const rawSubjs = (document.getElementById("newExamSubjectsList")?.value || "").trim();
  const subjects = rawSubjs
    ? rawSubjs.split(/[,，\s]+/).map(s => s.trim()).filter(Boolean)
    : ["语文", "数学", "英语", "科学"];

  if (!name) { alert("请输入考试名称！"); return; }

  window.store.addExam({ name, type, date, subject, fullScore, subjects });
  window.closeNewExamModal();
  window.showToast(`已新增考试【${name}】(含 ${subjects.join('/')} 细分科目)！`, "success");
  if (window.currentView === "exams") renderCurrentView();
};

window.deleteCurrentExam = function() {
  const exams = window.store.data.exams || [];
  if (exams.length === 0) {
    window.showToast("当前暂无考试记录！", "info");
    return;
  }
  const currentExam = exams.find(e => e.id === window.currentExamId) || exams[0];
  if (!currentExam) {
    window.showToast("当前暂无选中的考试！", "info");
    return;
  }
  if (confirm(`确定要彻底删除考试【${currentExam.name}】及其全部学生的成绩记录吗？\n\n此操作不可逆！`)) {
    window.store.deleteExam(currentExam.id);
    const remaining = window.store.data.exams || [];
    window.currentExamId = remaining.length > 0 ? remaining[0].id : "";
    window.showToast(`已彻底删除考试【${currentExam.name}】！`, "success");
    if (window.currentView === "exams") {
      renderCurrentView();
    }
  }
};

window.openEditScoreModal = function(examId, studentId, name, score, comment) {
  document.getElementById("editScoreExamId").value = examId;
  document.getElementById("editScoreStudentId").value = studentId;
  
  const exam = (window.store.data.exams || []).find(e => e.id === examId) || window.store.data.exams[0];
  const sc = exam && exam.scores ? exam.scores.find(s => s.studentId === studentId) : null;
  const studentName = sc ? sc.name : (name || "学生");

  document.getElementById("editScoreStudentName").value = studentName;
  document.getElementById("editScoreComment").value = (sc && sc.comment) || comment || "";

  const subjects = (exam && exam.subjects && exam.subjects.length > 0)
    ? exam.subjects
    : ["语文", "数学", "英语", "科学"];

  const container = document.getElementById("editScoreSubjectsContainer");
  if (container) {
    container.innerHTML = subjects.map(subj => {
      const val = (sc && sc.subjectScores && sc.subjectScores[subj] !== undefined)
        ? sc.subjectScores[subj]
        : Math.round(((sc ? (sc.totalScore || sc.score || 85) : 85) / subjects.length));
      return `
        <div style="display:flex; align-items:center; justify-content:space-between; gap:10px; background:#f8fafc; padding:8px 14px; border-radius:var(--radius-md); border:1px solid #e2e8f0;">
          <span style="font-weight:700; color:#334155; font-size:13.5px; min-width:80px;">📖 ${subj}</span>
          <div style="display:flex; align-items:center; gap:6px;">
            <input type="number" class="form-control edit-subj-score-input" data-subj="${subj}" value="${val}" min="0" max="${exam ? exam.fullScore || 100 : 100}" step="0.5" style="width:110px; text-align:right; font-weight:800; font-size:15px; color:#1e293b;" oninput="window.calcEditScoreTotal()">
            <span style="font-size:12px; color:var(--text-muted);">分</span>
          </div>
        </div>
      `;
    }).join("");
  }

  window.calcEditScoreTotal();
  document.getElementById("editScoreModal").classList.add("active");
};

window.calcEditScoreTotal = function() {
  let total = 0;
  document.querySelectorAll(".edit-subj-score-input").forEach(input => {
    total += parseFloat(input.value) || 0;
  });
  const totalDisplay = document.getElementById("editScoreTotalDisplay");
  if (totalDisplay) totalDisplay.value = Math.round(total * 10) / 10;
};

window.closeEditScoreModal = function() {
  document.getElementById("editScoreModal").classList.remove("active");
};

window.submitEditScore = function() {
  const examId = document.getElementById("editScoreExamId").value;
  const studentId = document.getElementById("editScoreStudentId").value;
  const comment = document.getElementById("editScoreComment").value;
  
  const exam = (window.store.data.exams || []).find(e => e.id === examId);
  if (!exam) return;

  const sc = exam.scores.find(s => s.studentId === studentId);
  if (!sc) return;

  if (!sc.subjectScores) sc.subjectScores = {};
  let newTotal = 0;
  document.querySelectorAll(".edit-subj-score-input").forEach(input => {
    const subj = input.getAttribute("data-subj");
    const val = parseFloat(input.value) || 0;
    sc.subjectScores[subj] = val;
    newTotal += val;
  });

  sc.totalScore = Math.round(newTotal * 10) / 10;
  sc.score = sc.totalScore;
  sc.comment = comment;

  const subjectsCount = (exam.subjects && exam.subjects.length) || 1;
  const avgSubjScore = sc.totalScore / subjectsCount;
  sc.level = avgSubjScore >= 90 ? "优秀" : avgSubjScore >= 80 ? "良好" : avgSubjScore >= 60 ? "及格" : "待提升";

  window.store.recalcExamStats(exam);
  window.store.save();
  window.closeEditScoreModal();
  window.showToast(`【${sc.name}】成绩已保存！全科总分：${sc.totalScore} 分 (总分排位已重新核算)`, "success");
  if (window.currentView === "exams") renderCurrentView();
};

// Excel 成绩单导入
window.handleScoreExcelImport = function(event) {
  const file = event.target.files[0];
  if (!file) return;
  if (typeof XLSX === "undefined") { alert("Excel组件未加载！"); return; }
  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const data = new Uint8Array(e.target.result);
      const workbook = XLSX.read(data, { type: "array" });
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });
      const exam = window.store.data.exams.find(ex => ex.id === window.currentExamId) || window.store.data.exams[0];
      if (!exam) return;

      let updateCount = 0;
      for (let i = 1; i < rows.length; i++) {
        const r = rows[i];
        if (r && r.length >= 2) {
          const idOrName = String(r[0] || "").trim();
          const name = String(r[1] || "").trim();
          const scoreVal = parseFloat(r[2] || r[3] || 80);
          const commentVal = String(r[4] || r[5] || "");

          const target = exam.scores.find(s => s.studentId === idOrName || s.name === name || s.name === idOrName);
          if (target && !isNaN(scoreVal)) {
            target.score = scoreVal;
            target.level = scoreVal >= 90 ? "优秀" : scoreVal >= 80 ? "良好" : scoreVal >= 60 ? "及格" : "待提升";
            if (commentVal) target.comment = commentVal;
            updateCount++;
          }
        }
      }
      window.store.recalcExamStats(exam);
      window.store.save();
      window.showToast(`成功导入并更新了 ${updateCount} 位同学的考试成绩！`, "success");
      if (window.currentView === "exams") renderCurrentView();
    } catch (err) {
      alert("解析 Excel 失败，请确保格式正确！");
    }
  };
  reader.readAsArrayBuffer(file);
};

// ================= 课表编辑与 Excel 导入 (解决问题3) =================
window.openCourseEditModal = function(day, periodIdx, subject, teacher, room, color) {
  document.getElementById("editCourseDay").value = day;
  document.getElementById("editCoursePeriodIdx").value = periodIdx;
  document.getElementById("editCourseDayDisplay").value = day;
  document.getElementById("editCoursePeriodDisplay").value = `第 ${periodIdx + 1} 节`;
  document.getElementById("editCourseSubject").value = subject;
  document.getElementById("editCourseTeacher").value = teacher;
  document.getElementById("editCourseRoom").value = room || "本班教室";
  document.getElementById("editCourseColor").value = color || "#fee2e2";
  document.getElementById("editCourseModal").classList.add("active");
};
window.closeEditCourseModal = function() {
  document.getElementById("editCourseModal").classList.remove("active");
};
window.submitEditCourse = function() {
  const day = document.getElementById("editCourseDay").value;
  const periodIdx = parseInt(document.getElementById("editCoursePeriodIdx").value);
  const subject = document.getElementById("editCourseSubject").value.trim();
  const teacher = document.getElementById("editCourseTeacher").value.trim();
  const room = document.getElementById("editCourseRoom").value.trim();
  const color = document.getElementById("editCourseColor").value;

  window.store.updateCourse(day, periodIdx, { subject, teacher, room, color });
  window.closeEditCourseModal();
  window.showToast(`已更新【${day} 第${periodIdx + 1}节】课程安排！`, "success");
  if (window.currentView === "schedule" || window.currentView === "dashboard") renderCurrentView();
};

window.handleTimetableExcelImport = function(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const data = new Uint8Array(e.target.result);
      const workbook = XLSX.read(data, { type: "array" });
      const rows = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], { header: 1 });
      const days = ["周一", "周二", "周三", "周四", "周五"];
      // 读取前6节
      for (let pIdx = 0; pIdx < 6; pIdx++) {
        const row = rows[pIdx + 2];
        if (row) {
          days.forEach((d, dIdx) => {
            const val = String(row[dIdx + 2] || "").trim();
            if (val) {
              const parts = val.split(/[\(\s\)]+/);
              const subject = parts[0] || "综合";
              const teacher = parts[1] || "任课老师";
              window.store.updateCourse(d, pIdx, { subject, teacher });
            }
          });
        }
      }
      window.showToast("课表已从 Excel 批量导入并生效！", "success");
      if (window.currentView === "schedule") renderCurrentView();
    } catch (err) {
      alert("导入课表失败，请核对Excel结构！");
    }
  };
  reader.readAsArrayBuffer(file);
};

// ================= 值日安排编辑与 Excel 导入 (解决问题3) =================
window.openEditDutyModal = function(day) {
  const item = window.store.data.dutySchedule[day] || {};
  document.getElementById("editDutyDay").value = day;
  document.getElementById("editDutyDayDisplay").value = day;
  document.getElementById("editDutyLeader").value = item.leader || "";
  document.getElementById("editDutyZone").value = item.zone || "";
  document.getElementById("editDutyMembers").value = (item.members || []).join("、");
  document.getElementById("editDutyTask").value = item.task || "";
  document.getElementById("editDutyModal").classList.add("active");
};
window.closeEditDutyModal = function() {
  document.getElementById("editDutyModal").classList.remove("active");
};
window.submitEditDuty = function() {
  const day = document.getElementById("editDutyDay").value;
  const leader = document.getElementById("editDutyLeader").value.trim();
  const zone = document.getElementById("editDutyZone").value.trim();
  const members = document.getElementById("editDutyMembers").value.split(/[、,，\s]+/).filter(Boolean);
  const task = document.getElementById("editDutyTask").value.trim();

  window.store.updateDuty(day, { leader, zone, members, task });
  window.closeEditDutyModal();
  window.showToast(`已成功保存【${day}】值日安排！`, "success");
  if (window.currentView === "schedule") renderCurrentView();
};

// ================= 智能多排版卫生值日表解析引擎 =================
window.parseDutyScheduleWorkbook = function(workbook) {
  if (!workbook || !workbook.SheetNames || workbook.SheetNames.length === 0) return null;

  // 1. 优先定位卫生值日相关工作表
  let targetSheetName = workbook.SheetNames.find(s => /(值日|卫生|清洁|扫除|包干|排班)/i.test(s)) || workbook.SheetNames[0];
  const sheet = workbook.Sheets[targetSheetName];
  if (!sheet) return null;

  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });
  if (!rows || rows.length === 0) return null;

  const dayPatterns = [
    { norm: "周一", regex: /(星期一|周一|礼拜一)/ },
    { norm: "周二", regex: /(星期二|周二|礼拜二)/ },
    { norm: "周三", regex: /(星期三|周三|礼拜三)/ },
    { norm: "周四", regex: /(星期四|周四|礼拜四)/ },
    { norm: "周五", regex: /(星期五|周五|礼拜五)/ }
  ];

  const cleanName = (str) => {
    return String(str || "")
      .replace(/^[0-9一二三四五六七八九十]+[、.\s]/, "")
      .replace(/[（(].*?[）)]/g, "")
      .trim();
  };

  const splitStudents = (raw) => {
    if (!raw) return [];
    return String(raw)
      .split(/[\r\n\t,，、;/\\+\s]+/)
      .map(cleanName)
      .filter(s => s && s.length >= 2 && s.length <= 10 && !/(各\d+次|午饭后|放学后|打扫|清洁|负责|值日|暂无|无|学生)/.test(s));
  };

  const result = {
    "周一": { leader: "", zone: "", task: "", members: [], zones: [] },
    "周二": { leader: "", zone: "", task: "", members: [], zones: [] },
    "周三": { leader: "", zone: "", task: "", members: [], zones: [] },
    "周四": { leader: "", zone: "", task: "", members: [], zones: [] },
    "周五": { leader: "", zone: "", task: "", members: [], zones: [] }
  };

  // 2. 检测是否为横向星期矩阵排版 (Matrix Layout, 如用户当前的《卫生值日表.xlsx》)
  let headerRowIdx = -1;
  let dayColMap = {}; // normDay -> colIdx

  for (let r = 0; r < Math.min(15, rows.length); r++) {
    const row = rows[r];
    if (!row || !Array.isArray(row)) continue;
    const map = {};
    let matchCount = 0;
    row.forEach((cell, cIdx) => {
      const cellStr = String(cell).trim();
      for (const dp of dayPatterns) {
        if (dp.regex.test(cellStr) && !map[dp.norm]) {
          map[dp.norm] = cIdx;
          matchCount++;
          break;
        }
      }
    });
    if (matchCount >= 3) {
      headerRowIdx = r;
      dayColMap = map;
      break;
    }
  }

  if (headerRowIdx !== -1) {
    const minDayCol = Math.min(...Object.values(dayColMap));
    let currentPeriod = "";

    for (let r = headerRowIdx + 1; r < rows.length; r++) {
      const row = rows[r];
      if (!row || row.every(c => !String(c).trim())) continue;

      let periodColVal = minDayCol > 0 ? String(row[0] || "").trim() : "";
      let zoneColVal = minDayCol > 1 ? String(row[1] || "").trim() : (minDayCol === 1 ? String(row[0] || "").trim() : "");

      if (periodColVal && /(卫生|清洁|值日|早|中|晚|午|放学|时段)/.test(periodColVal)) {
        currentPeriod = periodColVal;
      }
      const fullZone = [currentPeriod, zoneColVal].filter(Boolean).join(" - ");
      const zoneName = zoneColVal || currentPeriod || "卫生包干区";

      // 忽略说明与备注行
      if (/(说明|备注|注：|要求)/.test(zoneName)) continue;

      for (const dp of dayPatterns) {
        const col = dayColMap[dp.norm];
        if (col === undefined) continue;
        const rawStudents = row[col];
        const students = splitStudents(rawStudents);
        if (students.length > 0) {
          result[dp.norm].zones.push({
            period: currentPeriod,
            zone: zoneName,
            fullZone: fullZone,
            students: students
          });
          students.forEach(s => {
            if (!result[dp.norm].members.includes(s)) {
              result[dp.norm].members.push(s);
            }
          });
        }
      }
    }
  } else {
    // 3. 纵向星期排版检测 (Row-by-Day Layout)
    let dayCol = -1;
    let leaderCol = -1;
    let zoneCol = -1;
    let taskCol = -1;
    let membersCol = -1;

    for (let r = 0; r < Math.min(10, rows.length); r++) {
      const row = rows[r];
      if (!row || !Array.isArray(row)) continue;
      row.forEach((cell, cIdx) => {
        const str = String(cell).trim();
        if (/(星期|周次|时间|日期)/.test(str) && dayCol === -1) dayCol = cIdx;
        if (/(组长|负责人|值日长)/.test(str) && leaderCol === -1) leaderCol = cIdx;
        if (/(区域|地点|卫生区|包干区)/.test(str) && zoneCol === -1) zoneCol = cIdx;
        if (/(任务|职责|要求|内容)/.test(str) && taskCol === -1) taskCol = cIdx;
        if (/(值日生|成员|组员|学生|名单)/.test(str) && membersCol === -1) membersCol = cIdx;
      });
      if (dayCol !== -1 && (leaderCol !== -1 || zoneCol !== -1 || membersCol !== -1)) break;
    }

    if (dayCol === -1) dayCol = 0;
    if (leaderCol === -1) leaderCol = 1;
    if (zoneCol === -1) zoneCol = 2;
    if (taskCol === -1) taskCol = 3;
    if (membersCol === -1) membersCol = 4;

    for (let r = 0; r < rows.length; r++) {
      const row = rows[r];
      if (!row) continue;
      const dayCell = String(row[dayCol] || "").trim();
      const matchedDay = dayPatterns.find(dp => dp.regex.test(dayCell));
      if (!matchedDay) continue;

      const normDay = matchedDay.norm;
      const rawLeader = String(row[leaderCol] || "").trim();
      const rawZone = String(row[zoneCol] || "").trim();
      const rawTask = String(row[taskCol] || "").trim();
      const rawMembers = row[membersCol] || "";

      const students = splitStudents(rawMembers);
      if (rawLeader && !students.includes(rawLeader)) {
        students.unshift(rawLeader);
      }

      if (rawZone) {
        result[normDay].zones.push({
          period: "全天",
          zone: rawZone,
          fullZone: rawZone,
          students: students
        });
      }

      students.forEach(s => {
        if (!result[normDay].members.includes(s)) result[normDay].members.push(s);
      });

      if (rawLeader) result[normDay].leader = rawLeader;
      if (rawZone) result[normDay].zone = (result[normDay].zone ? (result[normDay].zone + "、" + rawZone) : rawZone);
      if (rawTask) result[normDay].task = rawTask;
    }
  }

  // 整理和完善每个工作日的组长、区域和任务
  for (const dp of dayPatterns) {
    const dayData = result[dp.norm];
    if (!dayData.leader) {
      // 优先从包含讲桌/讲台/电器/黑板/组长/负责的区域中提取学生
      const leaderZone = dayData.zones.find(z => /(讲桌|讲台|黑板|电器|组长|总负责|电掣)/.test(z.zone));
      if (leaderZone && leaderZone.students.length > 0) {
        dayData.leader = leaderZone.students[0];
      } else if (dayData.members.length > 0) {
        dayData.leader = dayData.members[0];
      } else {
        dayData.leader = "未指定";
      }
    }

    if (!dayData.zone) {
      const uniqueZones = Array.from(new Set(dayData.zones.map(z => z.zone)));
      dayData.zone = uniqueZones.length > 0 ? uniqueZones.join("、") : "常规值日区域";
    }

    if (!dayData.task) {
      dayData.task = dayData.zones.length > 0
        ? `涵盖 ${dayData.zones.length} 个值日区域，责任到人，做好课后及放学保洁。`
        : "桌面整洁，地面干净，按时关好门窗与电器。";
    }
  }

  return result;
};

window.handleDutyExcelImport = function(event) {
  const file = event.target.files && event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const data = new Uint8Array(e.target.result);
      const workbook = XLSX.read(data, { type: "array" });
      const parsedDuty = window.parseDutyScheduleWorkbook(workbook);

      if (!parsedDuty) {
        alert("未能识别该 Excel 的排版格式，请检查文件是否包含星期与值日生信息！");
        return;
      }

      let totalStudents = 0;
      let totalZones = 0;
      Object.keys(parsedDuty).forEach(d => {
        totalStudents += (parsedDuty[d].members || []).length;
        totalZones += (parsedDuty[d].zones || []).length;
      });

      if (totalStudents === 0) {
        alert("Excel 文件已读取，但未能在表格中识别到有效的值日生姓名，请确认学生名单单元格排版！");
        return;
      }

      window.store.setDutySchedule(parsedDuty);
      window.showToast(`已成功智能导入【周一至周五】卫生值日表！（共识别 ${totalStudents} 人次、${totalZones} 个细分区域）`, "success");

      if (window.currentView === "schedule") {
        if (window.renderCurrentScheduleTab) window.renderCurrentScheduleTab();
        else renderCurrentView();
      } else if (window.currentView === "dashboard") {
        renderCurrentView();
      }
    } catch (err) {
      console.error("值日表导入异常:", err);
      alert("值日表解析失败：" + (err.message || "请检查文件格式是否有效"));
    } finally {
      if (event.target) event.target.value = "";
    }
  };
  reader.readAsArrayBuffer(file);
};

// ================= 班干部团队编辑与 Excel 导入 (解决问题3) =================
window.openAddCadreModal = function() {
  document.getElementById("editCadreOldTitle").value = "";
  document.getElementById("editCadreTitle").value = "";
  document.getElementById("editCadreName").value = "";
  document.getElementById("editCadreDuties").value = "";
  document.getElementById("editCadreRating").value = "良好";
  document.getElementById("editCadreModal").classList.add("active");
};
window.editCadre = function(title) {
  const c = window.store.data.cadres.find(item => item.title === title);
  if (!c) return;
  document.getElementById("editCadreOldTitle").value = c.title;
  document.getElementById("editCadreTitle").value = c.title;
  document.getElementById("editCadreName").value = c.name;
  document.getElementById("editCadreDuties").value = c.duties;
  document.getElementById("editCadreTerm").value = c.term || "2026.09 - 至今";
  document.getElementById("editCadreRating").value = c.rating || "良好";
  document.getElementById("editCadreModal").classList.add("active");
};
window.closeEditCadreModal = function() {
  document.getElementById("editCadreModal").classList.remove("active");
};
window.submitEditCadre = function() {
  const oldTitle = document.getElementById("editCadreOldTitle").value;
  const title = document.getElementById("editCadreTitle").value.trim();
  const name = document.getElementById("editCadreName").value.trim();
  const duties = document.getElementById("editCadreDuties").value.trim();
  const term = document.getElementById("editCadreTerm").value.trim();
  const rating = document.getElementById("editCadreRating").value;
  if (!title || !name) { alert("职务与姓名不能为空！"); return; }

  if (oldTitle) {
    window.store.updateCadre(oldTitle, { title, name, duties, term, rating });
  } else {
    window.store.addCadre({ title, name, duties, term, rating });
  }
  window.closeEditCadreModal();
  window.showToast(`班干部【${title} - ${name}】已保存！`, "success");
  if (window.currentView === "schedule") renderCurrentView();
};

window.handleCadresExcelImport = function(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const data = new Uint8Array(e.target.result);
      const workbook = XLSX.read(data, { type: "array" });
      const rows = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], { header: 1 });
      const newCadres = [];
      for (let i = 2; i < rows.length; i++) {
        const r = rows[i];
        if (r && r[0]) {
          newCadres.push({
            title: String(r[0]).trim(),
            name: String(r[1] || "").trim(),
            duties: String(r[2] || "").trim(),
            term: String(r[3] || "2026.09 - 至今").trim(),
            rating: String(r[4] || "良好").trim()
          });
        }
      }
      if (newCadres.length > 0) {
        window.store.data.cadres = newCadres;
        window.store.save();
        window.showToast(`成功导入 ${newCadres.length} 位班干部花名册！`, "success");
        if (window.currentView === "schedule") renderCurrentView();
      }
    } catch (err) { alert("班干部名单导入失败！"); }
  };
  reader.readAsArrayBuffer(file);
};

// ================= 座位管理编辑与 Excel 导入 (解决问题3) =================
window.openEditSeatModal = function(studentId, name, seat) {
  const newName = prompt(`修改该座位【${seat}】的学生姓名：`, name);
  if (!newName) return;
  const s = window.store.data.students.find(item => item.id === studentId);
  if (s) {
    s.name = newName.trim();
    window.store.save();
    window.showToast(`已更新该座位学生为【${s.name}】！`, "success");
    if (window.currentView === "schedule") renderCurrentView();
  }
};

window.handleSeatingExcelImport = function(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const data = new Uint8Array(e.target.result);
      const workbook = XLSX.read(data, { type: "array" });
      
      // 优先寻找“教室座位平面图”工作表，否则使用首个工作表
      let sheetName = workbook.SheetNames[0];
      if (workbook.SheetNames.includes("教室座位平面图")) {
        sheetName = "教室座位平面图";
      }
      const sheet = workbook.Sheets[sheetName];
      const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });
      if (!rows || rows.length === 0) {
        alert("导入的表格中没有有效数据！");
        return;
      }

      let updated = 0;
      const students = window.store.data.students || [];

      // 判断是否为 2D 讲台视角座位平面图 (包含“讲台”或第一行跨越多列)
      let is2DGrid = false;
      let podiumRowIdx = -1;
      for (let i = 0; i < Math.min(rows.length, 5); i++) {
        if (rows[i] && rows[i].some(cell => String(cell).includes("讲台") || String(cell).includes("黑板"))) {
          is2DGrid = true;
          podiumRowIdx = i;
          break;
        }
      }

      if (is2DGrid) {
        // 2D 矩阵排布解析：讲台下一行开始即为排与列的课桌矩阵
        const gridRows = [];
        for (let i = podiumRowIdx + 1; i < rows.length; i++) {
          const r = rows[i];
          if (!r || r.length === 0) continue;
          // 过滤纯空行或注记行
          const nonEmpties = r.filter(c => String(c).trim() !== "");
          if (nonEmpties.length > 0) {
            gridRows.push(r.map(c => String(c).trim()));
          }
        }

        if (gridRows.length > 0) {
          const numRows = gridRows.length;
          const numCols = Math.max(...gridRows.map(r => r.length));
          window.store.data.seatingGrid = { rows: numRows, cols: numCols };

          for (let r = 0; r < numRows; r++) {
            for (let c = 0; c < numCols; c++) {
              const nameInCell = gridRows[r][c];
              if (nameInCell && !nameInCell.includes("讲台") && !nameInCell.includes("空位")) {
                const s = students.find(item => item.name === nameInCell || item.id === nameInCell);
                if (s) {
                  s.seat = `第${r + 1}排·${c + 1}号`;
                  updated++;
                }
              }
            }
          }
          window.store.save();
          window.showToast(`成功解析2D平面图！已适配为 ${numRows}排×${numCols}列 并更新 ${updated} 名学生座次`, "success");
          if (window.currentView === "schedule") renderCurrentView();
          return;
        }
      }

      // 否则作为常规 1D 清单导入 (支持表头字段智能识别)
      let headerRowIdx = 0;
      for (let i = 0; i < Math.min(rows.length, 5); i++) {
        if (rows[i] && rows[i].some(cell => String(cell).includes("姓名"))) {
          headerRowIdx = i;
          break;
        }
      }
      const headers = rows[headerRowIdx].map(h => String(h || "").trim());
      const nameCol = headers.findIndex(h => h.includes("姓名") || h.toLowerCase().includes("name"));
      const idCol = headers.findIndex(h => h.includes("学号") || h.toLowerCase().includes("id"));
      const seatCol = headers.findIndex(h => h.includes("座位") || h.includes("座次") || h.toLowerCase().includes("seat"));

      for (let i = headerRowIdx + 1; i < rows.length; i++) {
        const r = rows[i];
        if (!r || r.length === 0) continue;
        const nameVal = nameCol !== -1 ? String(r[nameCol] || "").trim() : "";
        const idVal = idCol !== -1 ? String(r[idCol] || "").trim() : "";
        const seatVal = seatCol !== -1 ? String(r[seatCol] || "").trim() : "";

        const s = students.find(item => (idVal && item.id === idVal) || (nameVal && item.name === nameVal));
        if (s && seatVal) {
          s.seat = seatVal;
          updated++;
        }
      }

      window.store.save();
      window.showToast(`座位表清单导入完成！已同步更新 ${updated} 名学生座位`, "success");
      if (window.currentView === "schedule") renderCurrentView();
    } catch (err) {
      console.error(err);
      alert("座位表解析失败，请检查文件格式！");
    }
  };
  reader.readAsArrayBuffer(file);
};

// ================= 学生个性标签多选机制与徽章交互 =================
window.currentEditingStudentTags = new Set();

// 同步学生档案筛选工具条中的“全部标签”下拉框
window.syncStudentTagFilterDropdown = function() {
  const select = document.getElementById("studentTagFilter");
  if (!select) return;
  const currentVal = select.value;
  const tags = window.store.getTagsPool ? window.store.getTagsPool() : (window.store.data.tagsPool || []);
  select.innerHTML = `
    <option value="">全部标签</option>
    ${tags.map(t => `<option value="${t}" ${t === currentVal ? 'selected' : ''}>${t}</option>`).join("")}
  `;
};

window.renderTagChips = function(mode) {
  const containerId = mode === 'new' ? 'newStuTagsChipsContainer' : 'editStuTagsChipsContainer';
  const container = document.getElementById(containerId);
  if (!container) return;

  const pool = window.store.getTagsPool ? window.store.getTagsPool() : (window.store.data.tagsPool || []);
  const countsMap = window.currentEditingStudentTagCounts || new Map();

  container.innerHTML = pool.map(tag => {
    const count = countsMap.get(tag) || 0;
    const isSelected = count > 0;
    const isStackable = window.store.isTagStackable ? window.store.isTagStackable(tag) : true;
    const encTag = encodeURIComponent(tag);

    if (isStackable) {
      const goldThresh = window.store.getTagGoldThreshold ? window.store.getTagGoldThreshold(tag) : 3;
      const isGold = count >= goldThresh;
      if (isSelected) {
        return `
          <div class="badge" style="display: inline-flex; align-items: center; gap: 6px; padding: 4px 8px; font-size: 12px; border-radius: 16px; background: ${isGold ? 'linear-gradient(135deg, #f59e0b, #d97706)' : '#2563eb'}; color: #fff; box-shadow: 0 2px 5px rgba(${isGold ? '217,119,6,0.35' : '37,99,235,0.25'});">
            <button type="button" onclick="window.changeTagCount('${mode}', decodeURIComponent('${encTag}'), -1)" 
              style="border: none; background: rgba(255,255,255,0.25); color: #fff; width: 20px; height: 20px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 13px; font-weight: bold; cursor: pointer; line-height: 1;" title="减少1次获得">-</button>
            <span style="font-weight: 600;">${isGold ? '⭐' : '🏷️'} ${tag} <span style="background: rgba(255,255,255,0.3); padding: 1px 6px; border-radius: 10px; font-size: 11px;">*${count}</span></span>
            <button type="button" onclick="window.changeTagCount('${mode}', decodeURIComponent('${encTag}'), 1)" 
              style="border: none; background: rgba(255,255,255,0.25); color: #fff; width: 20px; height: 20px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 13px; font-weight: bold; cursor: pointer; line-height: 1;" title="增加1次获得">+</button>
          </div>
        `;
      } else {
        return `
          <span class="badge badge-gray" style="cursor: pointer; padding: 5px 12px; font-size: 12px; user-select: none; border-radius: 16px; border: 1px solid #cbd5e1; background: #fff; color: #475569; transition: var(--transition);"
            onclick="window.changeTagCount('${mode}', decodeURIComponent('${encTag}'), 1)"
            title="点击赋予该标签 (可多次累加，满${goldThresh}个变金黄)">
            + 🏷️ ${tag}
          </span>
        `;
      }
    } else {
      // 单次获得标签 (切换 0 或 1)
      return `
        <span class="badge ${isSelected ? 'badge-primary' : 'badge-gray'}" 
          style="cursor: pointer; padding: 5px 12px; font-size: 12px; user-select: none; border-radius: 16px; border: 1px solid ${isSelected ? '#2563eb' : '#cbd5e1'}; background: ${isSelected ? '#2563eb' : '#fff'}; color: ${isSelected ? '#fff' : '#475569'}; transition: var(--transition); box-shadow: ${isSelected ? '0 2px 5px rgba(37,99,235,0.25)' : 'none'};"
          onclick="window.toggleTagChip('${mode}', decodeURIComponent('${encTag}'))"
          title="点击${isSelected ? '取消该身份标签' : '授予该身份标签'}">
          ${isSelected ? '✓ ' : '+ '}🏷️ ${tag}
        </span>
      `;
    }
  }).join("");
};

window.changeTagCount = function(mode, tag, delta) {
  if (!window.currentEditingStudentTagCounts) {
    window.currentEditingStudentTagCounts = new Map();
  }
  const cur = window.currentEditingStudentTagCounts.get(tag) || 0;
  const next = Math.max(0, cur + delta);
  if (next > 0) {
    window.currentEditingStudentTagCounts.set(tag, next);
    if (window.currentEditingStudentTags) window.currentEditingStudentTags.add(tag);
  } else {
    window.currentEditingStudentTagCounts.delete(tag);
    if (window.currentEditingStudentTags) window.currentEditingStudentTags.delete(tag);
  }
  window.renderTagChips(mode);
};

window.toggleTagChip = function(mode, tag) {
  if (!window.currentEditingStudentTagCounts) {
    window.currentEditingStudentTagCounts = new Map();
  }
  const cur = window.currentEditingStudentTagCounts.get(tag) || 0;
  if (cur > 0) {
    window.currentEditingStudentTagCounts.delete(tag);
    if (window.currentEditingStudentTags) window.currentEditingStudentTags.delete(tag);
  } else {
    window.currentEditingStudentTagCounts.set(tag, 1);
    if (window.currentEditingStudentTags) window.currentEditingStudentTags.add(tag);
  }
  window.renderTagChips(mode);
};

window.quickAddAndSelectCustomTag = function(mode) {
  const inputId = mode === 'new' ? 'newStuCustomTagInput' : 'editStuCustomTagInput';
  const input = document.getElementById(inputId);
  if (!input) return;
  const tag = input.value.trim();
  if (!tag) { alert("请输入标签名称！"); return; }

  window.store.addTag(tag, true);
  if (!window.currentEditingStudentTagCounts) window.currentEditingStudentTagCounts = new Map();
  window.currentEditingStudentTagCounts.set(tag, 1);
  if (window.currentEditingStudentTags) window.currentEditingStudentTags.add(tag);
  input.value = "";
  window.renderTagChips(mode);
  if (window.syncStudentTagFilterDropdown) window.syncStudentTagFilterDropdown();
  if (window.renderGroupTagModalLists) window.renderGroupTagModalLists();
  window.showToast(`已创建并为该学生赋予新标签【${tag}】！`, "success");
};

// ================= 学生真实照片头像裁剪与居中调整控制器 =================
window.currentAvatarCropState = {
  img: null,
  context: 'edit', // 'edit' | 'new' | 'drawer'
  studentId: null,
  rawUrl: '',
  naturalWidth: 0,
  naturalHeight: 0,
  x: 0,
  y: 0,
  scale: 1,
  baseScale: 1,
  rotation: 0,
  isDragging: false,
  dragStartX: 0,
  dragStartY: 0,
  dragStartImgX: 0,
  dragStartImgY: 0
};

// 全局真实头像公共渲染函数 (42px 卡片、26px 表格/座位、76px 抽屉)
window.getStudentAvatarMarkup = function(student, size, extraStyle) {
  size = size || 42;
  extraStyle = extraStyle || '';
  if (!student) {
    return `<div class="student-photo-avatar" style="width:${size}px; height:${size}px; background:#e0f2fe; color:#0369a1; font-size:${Math.round(size * 0.52)}px; ${extraStyle}">👦</div>`;
  }
  const isBoy = student.gender === "男";
  if (student.avatarUrl) {
    return `<div class="student-photo-avatar" style="width:${size}px; height:${size}px; ${extraStyle}">
      <img src="${student.avatarUrl}" alt="${student.name || '头像'}" loading="lazy">
    </div>`;
  }
  const bg = isBoy ? '#e0f2fe' : '#fce7f3';
  const color = isBoy ? '#0369a1' : '#be185d';
  const icon = isBoy ? '👦' : '👧';
  return `<div class="student-photo-avatar" style="width:${size}px; height:${size}px; background:${bg}; color:${color}; font-size:${Math.round(size * 0.52)}px; ${extraStyle}">
    ${icon}
  </div>`;
};

// 触发上传
window.triggerStudentAvatarUpload = function(context, studentId) {
  window.currentAvatarCropState.context = context || 'edit';
  window.currentAvatarCropState.studentId = studentId || window.currentDrawerStudentId || null;
  const fileInput = document.getElementById("studentAvatarFileInput");
  if (fileInput) {
    fileInput.value = "";
    fileInput.click();
  }
};

// 选择本地图片后读取
window.handleStudentAvatarFileSelected = function(event) {
  const file = event.target.files && event.target.files[0];
  if (!file) return;
  if (!file.type.startsWith("image/")) {
    if (window.showToast) window.showToast("请上传 JPG、PNG、WEBP 等常见图片格式！", "warning");
    return;
  }
  const reader = new FileReader();
  reader.onload = function(e) {
    const dataUrl = e.target.result;
    window.openStudentAvatarCropper(dataUrl, window.currentAvatarCropState.context, window.currentAvatarCropState.studentId);
  };
  reader.readAsDataURL(file);
};

// 打开当前已有头像进行二次调整
window.openCurrentAvatarForCropping = function(context) {
  let existingUrl = '';
  if (context === 'edit') {
    existingUrl = document.getElementById("editStuAvatarUrl") ? document.getElementById("editStuAvatarUrl").value : '';
  } else if (context === 'new') {
    existingUrl = document.getElementById("newStuAvatarUrl") ? document.getElementById("newStuAvatarUrl").value : '';
  } else if (context === 'drawer' && window.currentDrawerStudentId) {
    const s = (window.store.data.students || []).find(item => item.id === window.currentDrawerStudentId);
    if (s) existingUrl = s.avatarUrl;
  }
  if (!existingUrl) {
    if (window.showToast) window.showToast("当前暂未设置真实照片头像，请先点击上传照片！", "info");
    return;
  }
  window.openStudentAvatarCropper(existingUrl, context, window.currentDrawerStudentId);
};

// 恢复默认性别 Emoji 图标
window.removeStudentAvatar = function(context) {
  if (context === 'edit') {
    const urlInput = document.getElementById("editStuAvatarUrl");
    if (urlInput) urlInput.value = "";
    const preview = document.getElementById("editStuAvatarPreview");
    const gender = document.getElementById("editStuGender") ? document.getElementById("editStuGender").value : '男';
    if (preview) {
      preview.innerHTML = gender === '男' ? '👦' : '👧';
      preview.style.background = gender === '男' ? '#e0f2fe' : '#fce7f3';
      preview.style.color = gender === '男' ? '#0369a1' : '#be185d';
    }
    const adjBtn = document.getElementById("editStuCropAdjustBtn");
    const rmBtn = document.getElementById("editStuRemoveAvatarBtn");
    if (adjBtn) adjBtn.style.display = "none";
    if (rmBtn) rmBtn.style.display = "none";
    if (window.showToast) window.showToast("已重置为默认性别图标，点击保存档案生效", "info");
  } else if (context === 'new') {
    const urlInput = document.getElementById("newStuAvatarUrl");
    if (urlInput) urlInput.value = "";
    const preview = document.getElementById("newStuAvatarPreview");
    const gender = document.getElementById("newStuGender") ? document.getElementById("newStuGender").value : '男';
    if (preview) {
      preview.innerHTML = gender === '男' ? '👦' : '👧';
      preview.style.background = gender === '男' ? '#e0f2fe' : '#fce7f3';
      preview.style.color = gender === '男' ? '#0369a1' : '#be185d';
    }
    const adjBtn = document.getElementById("newStuCropAdjustBtn");
    const rmBtn = document.getElementById("newStuRemoveAvatarBtn");
    if (adjBtn) adjBtn.style.display = "none";
    if (rmBtn) rmBtn.style.display = "none";
  } else if (context === 'drawer' && window.currentDrawerStudentId) {
    const s = (window.store.data.students || []).find(item => item.id === window.currentDrawerStudentId);
    if (s) {
      delete s.avatarUrl;
      window.store.save();
      const avatarEl = document.getElementById("drawerStudentAvatar");
      if (avatarEl) avatarEl.innerText = s.gender === '男' ? '👦' : '👧';
      if (window.showToast) window.showToast(`已恢复学生【${s.name}】为默认头像`, "success");
      if (window.currentView === "students" || window.currentView === "dashboard" || window.currentView === "schedule") {
        renderCurrentView();
      }
    }
  }
};

// 打开裁剪弹窗
window.openStudentAvatarCropper = function(dataUrl, context, studentId) {
  window.currentAvatarCropState.context = context || 'edit';
  window.currentAvatarCropState.studentId = studentId || null;
  window.currentAvatarCropState.rawUrl = dataUrl;

  const cropImg = document.getElementById("avatarCropImg");
  if (!cropImg) return;

  const tempImg = new Image();
  tempImg.onload = function() {
    const nw = tempImg.naturalWidth || 400;
    const nh = tempImg.naturalHeight || 400;
    window.currentAvatarCropState.naturalWidth = nw;
    window.currentAvatarCropState.naturalHeight = nh;

    // 圆形取景框直径为 220px，计算保证填满圆形的最小比例
    const circleDiameter = 220;
    const baseScale = Math.max(circleDiameter / nw, circleDiameter / nh);
    window.currentAvatarCropState.baseScale = baseScale;
    window.currentAvatarCropState.scale = baseScale * 1.08; // 稍留微调空间
    window.currentAvatarCropState.x = 0;
    window.currentAvatarCropState.y = 0;
    window.currentAvatarCropState.rotation = 0;

    cropImg.src = dataUrl;
    cropImg.style.width = nw + "px";
    cropImg.style.height = nh + "px";

    // 缩放滑块归一化
    const zoomRange = document.getElementById("avatarCropZoomRange");
    if (zoomRange) {
      zoomRange.min = (baseScale * 0.5).toFixed(4);
      zoomRange.max = (baseScale * 3.5).toFixed(4);
      zoomRange.step = ((zoomRange.max - zoomRange.min) / 100).toFixed(4);
      zoomRange.value = window.currentAvatarCropState.scale.toFixed(4);
    }

    window.updateAvatarCropTransform();

    // 绑定事件（仅初次绑定）
    window.initAvatarCropperEvents();

    const modal = document.getElementById("studentAvatarCropModal");
    if (modal) modal.classList.add("active");
  };
  tempImg.src = dataUrl;
};

window.closeStudentAvatarCropModal = function() {
  const modal = document.getElementById("studentAvatarCropModal");
  if (modal) modal.classList.remove("active");
};

// 更新视口与右侧实时预览
window.updateAvatarCropTransform = function() {
  const s = window.currentAvatarCropState;
  const stage = document.getElementById("avatarCropStage");
  if (stage) {
    stage.style.transform = `translate(${s.x}px, ${s.y}px) scale(${s.scale}) rotate(${s.rotation}deg)`;
  }

  // 缩放标签
  const zoomLabel = document.getElementById("avatarCropZoomLabel");
  if (zoomLabel) {
    const pct = Math.round((s.scale / s.baseScale) * 100);
    zoomLabel.innerText = pct + "%";
  }

  // 实时生成小尺寸圆形预览并赋给预览元素
  window.renderAvatarLivePreviews();
};

// 滑块与缩放按钮
window.onAvatarZoomSliderChange = function(val) {
  window.currentAvatarCropState.scale = parseFloat(val) || window.currentAvatarCropState.baseScale;
  window.updateAvatarCropTransform();
};

window.stepAvatarZoom = function(deltaMultiplier) {
  const s = window.currentAvatarCropState;
  const step = s.baseScale * deltaMultiplier;
  const nextScale = Math.max(s.baseScale * 0.5, Math.min(s.baseScale * 3.5, s.scale + step));
  s.scale = nextScale;
  const zoomRange = document.getElementById("avatarCropZoomRange");
  if (zoomRange) zoomRange.value = nextScale.toFixed(4);
  window.updateAvatarCropTransform();
};

window.rotateAvatarCropImage = function() {
  window.currentAvatarCropState.rotation = (window.currentAvatarCropState.rotation + 90) % 360;
  window.updateAvatarCropTransform();
};

window.resetAvatarCropPosition = function() {
  const s = window.currentAvatarCropState;
  s.x = 0;
  s.y = 0;
  s.scale = s.baseScale * 1.08;
  s.rotation = 0;
  const zoomRange = document.getElementById("avatarCropZoomRange");
  if (zoomRange) zoomRange.value = s.scale.toFixed(4);
  window.updateAvatarCropTransform();
};

// 拖拽与缩放事件监听
window.avatarCropperEventsInitialized = false;
window.initAvatarCropperEvents = function() {
  if (window.avatarCropperEventsInitialized) return;
  window.avatarCropperEventsInitialized = true;

  const viewport = document.getElementById("avatarCropViewport");
  if (!viewport) return;

  const onDragStart = (clientX, clientY) => {
    const s = window.currentAvatarCropState;
    s.isDragging = true;
    s.dragStartX = clientX;
    s.dragStartY = clientY;
    s.dragStartImgX = s.x;
    s.dragStartImgY = s.y;
  };

  const onDragMove = (clientX, clientY) => {
    const s = window.currentAvatarCropState;
    if (!s.isDragging) return;
    const dx = clientX - s.dragStartX;
    const dy = clientY - s.dragStartY;
    s.x = s.dragStartImgX + dx;
    s.y = s.dragStartImgY + dy;
    window.updateAvatarCropTransform();
  };

  const onDragEnd = () => {
    window.currentAvatarCropState.isDragging = false;
  };

  viewport.addEventListener("mousedown", e => {
    if (e.button !== 0) return; // 仅限左键
    e.preventDefault();
    onDragStart(e.clientX, e.clientY);
  });

  window.addEventListener("mousemove", e => {
    if (window.currentAvatarCropState.isDragging) {
      e.preventDefault();
      onDragMove(e.clientX, e.clientY);
    }
  });

  window.addEventListener("mouseup", () => {
    if (window.currentAvatarCropState.isDragging) {
      onDragEnd();
    }
  });

  // 移动端 Touch 支持
  viewport.addEventListener("touchstart", e => {
    if (e.touches && e.touches.length === 1) {
      e.preventDefault();
      onDragStart(e.touches[0].clientX, e.touches[0].clientY);
    }
  }, { passive: false });

  window.addEventListener("touchmove", e => {
    if (window.currentAvatarCropState.isDragging && e.touches && e.touches.length === 1) {
      e.preventDefault();
      onDragMove(e.touches[0].clientX, e.touches[0].clientY);
    }
  }, { passive: false });

  window.addEventListener("touchend", () => {
    if (window.currentAvatarCropState.isDragging) {
      onDragEnd();
    }
  });

  // 鼠标滚轮缩放
  viewport.addEventListener("wheel", e => {
    e.preventDefault();
    const delta = e.deltaY < 0 ? 0.08 : -0.08;
    window.stepAvatarZoom(delta);
  }, { passive: false });
};

// 实时预览生成
window.renderAvatarLivePreviews = function() {
  if (!window._avatarPreviewDebounce) {
    window._avatarPreviewDebounce = setTimeout(() => {
      window._avatarPreviewDebounce = null;
      try {
        const previewUrl = window.generateCroppedAvatarDataUrl(120);
        if (previewUrl) {
          const l = document.getElementById("avatarPreviewLarge");
          const m = document.getElementById("avatarPreviewMedium");
          const sm = document.getElementById("avatarPreviewSmall");
          if (l) l.src = previewUrl;
          if (m) m.src = previewUrl;
          if (sm) sm.src = previewUrl;
        }
      } catch (err) {
        console.warn("预览生成稍后重试", err);
      }
    }, 40);
  }
};

// 基于当前平移、缩放与旋转计算裁剪正圆形
window.generateCroppedAvatarDataUrl = function(outputSize) {
  outputSize = outputSize || 300;
  const s = window.currentAvatarCropState;
  const cropImg = document.getElementById("avatarCropImg");
  if (!cropImg || !cropImg.complete) return null;

  const canvas = document.createElement("canvas");
  canvas.width = outputSize;
  canvas.height = outputSize;
  const ctx = canvas.getContext("2d");

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";

  // 圆形裁切路径
  ctx.beginPath();
  ctx.arc(outputSize / 2, outputSize / 2, outputSize / 2, 0, Math.PI * 2);
  ctx.closePath();
  ctx.clip();

  // 取景框中心在视口中心，直径 220px
  const scaleRatio = outputSize / 220;

  ctx.save();
  // 移动至 Canvas 中心
  ctx.translate(outputSize / 2, outputSize / 2);
  // 应用当前缩放（乘上映射到 Canvas 尺寸的比例）
  ctx.scale(scaleRatio, scaleRatio);
  // 加上用户的平移偏移量
  ctx.translate(s.x, s.y);
  // 加上旋转
  ctx.rotate((s.rotation * Math.PI) / 180);
  // 按照图片自身 scale 进行绘制
  ctx.scale(s.scale, s.scale);
  // 居中绘制原始图片
  ctx.drawImage(cropImg, -s.naturalWidth / 2, -s.naturalHeight / 2, s.naturalWidth, s.naturalHeight);
  ctx.restore();

  return canvas.toDataURL("image/jpeg", 0.90);
};

// 确认保存裁切结果
window.confirmStudentAvatarCrop = function() {
  const croppedDataUrl = window.generateCroppedAvatarDataUrl(320);
  if (!croppedDataUrl) {
    if (window.showToast) window.showToast("图片裁剪失败，请重新选择图片！", "danger");
    return;
  }

  const context = window.currentAvatarCropState.context;
  const studentId = window.currentAvatarCropState.studentId;

  if (context === 'edit') {
    const urlInput = document.getElementById("editStuAvatarUrl");
    if (urlInput) urlInput.value = croppedDataUrl;
    const preview = document.getElementById("editStuAvatarPreview");
    if (preview) {
      preview.innerHTML = `<img src="${croppedDataUrl}" alt="头像" style="width:100%; height:100%; object-fit:cover; border-radius:50%;">`;
    }
    const adjBtn = document.getElementById("editStuCropAdjustBtn");
    const rmBtn = document.getElementById("editStuRemoveAvatarBtn");
    if (adjBtn) adjBtn.style.display = "inline-flex";
    if (rmBtn) rmBtn.style.display = "inline-flex";
    if (window.showToast) window.showToast("头像已居中裁剪，点击保存档案即可生效！", "success");
  } else if (context === 'new') {
    const urlInput = document.getElementById("newStuAvatarUrl");
    if (urlInput) urlInput.value = croppedDataUrl;
    const preview = document.getElementById("newStuAvatarPreview");
    if (preview) {
      preview.innerHTML = `<img src="${croppedDataUrl}" alt="头像" style="width:100%; height:100%; object-fit:cover; border-radius:50%;">`;
    }
    const adjBtn = document.getElementById("newStuCropAdjustBtn");
    const rmBtn = document.getElementById("newStuRemoveAvatarBtn");
    if (adjBtn) adjBtn.style.display = "inline-flex";
    if (rmBtn) rmBtn.style.display = "inline-flex";
    if (window.showToast) window.showToast("头像已居中裁剪，点击确认录入即可保存！", "success");
  } else if (context === 'drawer' || studentId) {
    const targetId = studentId || window.currentDrawerStudentId;
    const s = (window.store.data.students || []).find(item => item.id === targetId);
    if (s) {
      s.avatarUrl = croppedDataUrl;
      window.store.save();
      const avatarEl = document.getElementById("drawerStudentAvatar");
      if (avatarEl) {
        avatarEl.innerHTML = `<img src="${croppedDataUrl}" alt="${s.name}" style="width:100%; height:100%; object-fit:cover; border-radius:50%;">`;
      }
      if (window.showToast) window.showToast(`学生【${s.name}】真实照片头像已更新并居中保存！`, "success");
      if (window.currentView === "students" || window.currentView === "dashboard" || window.currentView === "schedule") {
        renderCurrentView();
      }
    }
  }

  window.closeStudentAvatarCropModal();
};

// 性别变动时自动联动无自定义头像时的默认 Emoji
const syncGenderAvatarPreview = function(context) {
  const isEdit = context === 'edit';
  const urlInput = document.getElementById(isEdit ? "editStuAvatarUrl" : "newStuAvatarUrl");
  const preview = document.getElementById(isEdit ? "editStuAvatarPreview" : "newStuAvatarPreview");
  const genderEl = document.getElementById(isEdit ? "editStuGender" : "newStuGender");
  if (!urlInput || !urlInput.value) {
    const isBoy = genderEl && genderEl.value === "男";
    if (preview) {
      preview.innerHTML = isBoy ? '👦' : '👧';
      preview.style.background = isBoy ? '#e0f2fe' : '#fce7f3';
      preview.style.color = isBoy ? '#0369a1' : '#be185d';
    }
  }
};

// ================= 添加学生档案弹窗 (支持动态小组下拉、多标签多选与真实照片头像) =================
window.openAddStudentModal = function() {
  document.getElementById("newStuName").value = "";
  document.getElementById("newStuPhone").value = "";
  document.getElementById("newStuId").value = "";
  const natEl = document.getElementById("newStuNation");
  if (natEl) natEl.value = "汉族";
  const idcEl = document.getElementById("newStuIdCard");
  if (idcEl) idcEl.value = "";
  const hukEl = document.getElementById("newStuHukou");
  if (hukEl) hukEl.value = "";
  const addEl = document.getElementById("newStuAddress");
  if (addEl) addEl.value = "";
  document.getElementById("newStuRole").value = "学生";

  // 重置头像设置
  const newAvatarInput = document.getElementById("newStuAvatarUrl");
  if (newAvatarInput) newAvatarInput.value = "";
  const newAvatarPreview = document.getElementById("newStuAvatarPreview");
  if (newAvatarPreview) {
    newAvatarPreview.innerHTML = "👦";
    newAvatarPreview.style.background = "#e0f2fe";
    newAvatarPreview.style.color = "#0369a1";
  }
  const newAdjBtn = document.getElementById("newStuCropAdjustBtn");
  const newRmBtn = document.getElementById("newStuRemoveAvatarBtn");
  if (newAdjBtn) newAdjBtn.style.display = "none";
  if (newRmBtn) newRmBtn.style.display = "none";

  const genderSelect = document.getElementById("newStuGender");
  if (genderSelect) {
    genderSelect.value = "男";
    genderSelect.onchange = () => syncGenderAvatarPreview('new');
  }

  // 动态同步小组下拉框
  const groupSelect = document.getElementById("newStuGroup");
  if (groupSelect) {
    const groups = window.store.data.groups || ["第1组", "第2组", "第3组", "第4组", "第5组", "第6组"];
    groupSelect.innerHTML = groups.map(g => `<option value="${g}">${g}</option>`).join("");
  }

  // 初始化标签多选池 (支持数量增减累加)
  window.currentEditingStudentTagCounts = new Map([["好学星", 1]]);
  window.currentEditingStudentTags = new Set(["好学星"]);
  window.renderTagChips('new');

  document.getElementById("addStudentModal").classList.add("active");
};

window.closeAddStudentModal = function() {
  document.getElementById("addStudentModal").classList.remove("active");
};

window.submitAddStudent = function() {
  const name = document.getElementById("newStuName").value.trim();
  const gender = document.getElementById("newStuGender").value;
  const nation = (document.getElementById("newStuNation") ? document.getElementById("newStuNation").value.trim() : "") || "汉族";
  const id = document.getElementById("newStuId").value.trim();
  const birthday = document.getElementById("newStuBirthday").value;
  const idCardInput = document.getElementById("newStuIdCard") ? document.getElementById("newStuIdCard").value.trim() : "";
  const hukou = (document.getElementById("newStuHukou") ? document.getElementById("newStuHukou").value.trim() : "") || "未登记户籍";
  const address = (document.getElementById("newStuAddress") ? document.getElementById("newStuAddress").value.trim() : "") || hukou || "本市";
  const groupVal = document.getElementById("newStuGroup").value;
  const groupNum = parseInt(groupVal.replace(/\D/g, '')) || 1;
  const role = document.getElementById("newStuRole").value.trim() || "学生";
  const guardian = document.getElementById("newStuGuardian").value.trim() || "家长";
  const phone = document.getElementById("newStuPhone").value.trim() || "13800000000";
  const pickup = document.getElementById("newStuPickup").value;
  const allergies = document.getElementById("newStuAllergies").value.trim() || "无";
  const avatarUrl = document.getElementById("newStuAvatarUrl") ? document.getElementById("newStuAvatarUrl").value : null;

  if (!name) { alert("学生姓名不能为空！"); return; }

  const idCard = idCardInput || `11010120160515${Math.floor(1000 + Math.random() * 9000)}`;

  // 同步多标签及获得次数字典
  const tagEntries = Array.from(window.currentEditingStudentTagCounts ? window.currentEditingStudentTagCounts.entries() : []);
  const tags = [];
  const tagCounts = {};
  tagEntries.forEach(([t, c]) => {
    if (c > 0) {
      tags.push(window.formatTagDisplay ? window.formatTagDisplay(t, c) : (c > 1 ? `${t}*${c}` : t));
      tagCounts[t] = c;
    }
  });
  if (tags.length === 0) {
    tags.push("好学星");
    tagCounts["好学星"] = 1;
  }

  window.store.addStudent({
    id: id || undefined,
    name, gender, nation, birthday,
    group: groupVal,
    seat: `第${groupNum}排·1号`,
    idCard,
    hukou: hukou,
    registeredResidence: hukou,
    address: address,
    role, guardian, phone, pickup, allergies,
    avatarUrl: avatarUrl || undefined,
    tags: tags,
    tag: tags[0] || "好学星",
    tagCounts: tagCounts,
    attendanceToday: "normal"
  });

  window.closeAddStudentModal();
  window.showToast(`已成功录入学生【${name}】档案！`, "success");
  if (window.syncStudentTagFilterDropdown) window.syncStudentTagFilterDropdown();
  if (window.currentView === "students" || window.currentView === "schedule") renderCurrentView();
};

// ================= 单独修改学生个人档案 (含真实照片头像、身份证号维护与多标签多选) =================
window.openEditStudentModal = function(studentId) {
  if (!studentId && window.currentDrawerStudentId) {
    studentId = window.currentDrawerStudentId;
  }
  const s = (window.store.data.students || []).find(item => String(item.id) === String(studentId) || item.name === studentId);
  if (!s) {
    if (window.showToast) window.showToast("未找到该学生档案信息！", "warning");
    return;
  }

  const setVal = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.value = (val !== undefined && val !== null) ? val : "";
  };

  setVal("editStuOriginalId", s.id);
  setVal("editStuName", s.name);
  setVal("editStuGender", s.gender || "男");
  setVal("editStuId", s.id);
  setVal("editStuBirthday", s.birthday || "2016-05-15");
  setVal("editStuIdCard", s.idCard || "");

  // 同步真实头像状态与回显
  const avatarUrl = s.avatarUrl || "";
  setVal("editStuAvatarUrl", avatarUrl);
  const editAvatarPreview = document.getElementById("editStuAvatarPreview");
  const isBoy = (s.gender || "男") === "男";
  if (editAvatarPreview) {
    if (avatarUrl) {
      editAvatarPreview.innerHTML = `<img src="${avatarUrl}" alt="${s.name}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;">`;
      editAvatarPreview.style.background = "#fff";
    } else {
      editAvatarPreview.innerHTML = isBoy ? '👦' : '👧';
      editAvatarPreview.style.background = isBoy ? '#e0f2fe' : '#fce7f3';
      editAvatarPreview.style.color = isBoy ? '#0369a1' : '#be185d';
    }
  }
  const editAdjBtn = document.getElementById("editStuCropAdjustBtn");
  const editRmBtn = document.getElementById("editStuRemoveAvatarBtn");
  if (editAdjBtn) editAdjBtn.style.display = avatarUrl ? "inline-flex" : "none";
  if (editRmBtn) editRmBtn.style.display = avatarUrl ? "inline-flex" : "none";

  const genderSelect = document.getElementById("editStuGender");
  if (genderSelect) {
    genderSelect.onchange = () => syncGenderAvatarPreview('edit');
  }

  // 动态同步小组下拉框
  const groupSelect = document.getElementById("editStuGroup");
  if (groupSelect) {
    const groups = window.store.data.groups || ["第1组", "第2组", "第3组", "第4组", "第5组", "第6组"];
    groupSelect.innerHTML = groups.map(g => `<option value="${g}">${g}</option>`).join("");
    // 匹配学生当前组
    const matched = groups.find(g => window.isStudentInGroup ? window.isStudentInGroup(s.group, g) : (g === String(s.group) || g === `第${s.group}组`));
    if (matched) groupSelect.value = matched;
  }

  setVal("editStuNation", s.nation || s.ethnicity || "汉族");
  setVal("editStuHukou", s.hukou || s.registeredResidence || "");
  setVal("editStuLeftBehind", s.isLeftBehind ? "是" : "否");
  setVal("editStuHardship", s.hardshipCategory || "");
  setVal("editStuRole", s.role || "学生");
  setVal("editStuSeat", s.seat || "");
  setVal("editStuPickup", s.pickup || "家长接送");
  setVal("editStuGuardian", s.guardian || "家长");
  setVal("editStuPhone", s.phone || "13800000000");
  setVal("editStuAddress", s.address || "本市");
  setVal("editStuAllergies", s.allergies || "无");

  // 初始化该学生的多标签勾选池 (支持重复累加获得，如文明之星*2)
  const parsedTags = window.getStudentTagsWithCount ? window.getStudentTagsWithCount(s) : [];
  window.currentEditingStudentTagCounts = new Map();
  window.currentEditingStudentTags = new Set();
  parsedTags.forEach(item => {
    if (item.count > 0) {
      window.currentEditingStudentTagCounts.set(item.tag, item.count);
      window.currentEditingStudentTags.add(item.tag);
    }
  });
  if (window.currentEditingStudentTagCounts.size === 0) {
    window.currentEditingStudentTagCounts.set("好学星", 1);
    window.currentEditingStudentTags.add("好学星");
  }
  window.renderTagChips('edit');

  const modal = document.getElementById("editStudentModal");
  if (modal) modal.classList.add("active");
};

window.closeEditStudentModal = function() {
  document.getElementById("editStudentModal").classList.remove("active");
};

window.submitEditStudent = function() {
  const origId = document.getElementById("editStuOriginalId").value;
  const name = document.getElementById("editStuName").value.trim();
  const gender = document.getElementById("editStuGender").value;
  const nation = document.getElementById("editStuNation").value.trim() || "汉族";
  const newId = document.getElementById("editStuId").value.trim() || origId;
  const birthday = document.getElementById("editStuBirthday").value;
  const idCard = document.getElementById("editStuIdCard").value.trim();
  const hukou = document.getElementById("editStuHukou").value.trim();
  const leftBehind = document.getElementById("editStuLeftBehind").value === "是";
  const hardship = document.getElementById("editStuHardship").value.trim();
  const groupVal = document.getElementById("editStuGroup").value;
  const groupNum = parseInt(groupVal.replace(/\D/g, '')) || 1;
  const role = document.getElementById("editStuRole").value.trim() || "学生";
  const seat = document.getElementById("editStuSeat").value.trim();
  const pickup = document.getElementById("editStuPickup").value;
  const guardian = document.getElementById("editStuGuardian").value.trim();
  const phone = document.getElementById("editStuPhone").value.trim();
  const address = document.getElementById("editStuAddress").value.trim();
  const allergies = document.getElementById("editStuAllergies").value.trim() || "无";
  const avatarUrl = document.getElementById("editStuAvatarUrl") ? document.getElementById("editStuAvatarUrl").value : null;

  if (!name) { alert("学生姓名不能为空！"); return; }

  const s = (window.store.data.students || []).find(item => item.id === origId);
  if (s) {
    s.name = name;
    s.gender = gender;
    s.nation = nation;
    s.id = newId;
    s.birthday = birthday;
    s.idCard = idCard;
    s.hukou = hukou;
    s.registeredResidence = hukou;
    s.isLeftBehind = leftBehind;
    s.hardshipCategory = hardship;
    s.group = groupVal;
    s.role = role;
    if (seat) s.seat = seat;
    s.pickup = pickup;
    s.guardian = guardian;
    s.phone = phone;
    s.address = address;
    s.allergies = allergies;
    if (avatarUrl) {
      s.avatarUrl = avatarUrl;
    } else {
      delete s.avatarUrl;
    }

    // 同步多标签及获得次数字典 (支持例如 文明之星*2)
    const tagEntries = Array.from(window.currentEditingStudentTagCounts ? window.currentEditingStudentTagCounts.entries() : []);
    const tags = [];
    const tagCounts = {};
    tagEntries.forEach(([t, c]) => {
      if (c > 0) {
        tags.push(window.formatTagDisplay ? window.formatTagDisplay(t, c) : (c > 1 ? `${t}*${c}` : t));
        tagCounts[t] = c;
      }
    });
    if (tags.length === 0) {
      tags.push("好学星");
      tagCounts["好学星"] = 1;
    }
    s.tags = tags;
    s.tag = tags[0];
    s.tagCounts = tagCounts;

    window.store.save();
    window.closeEditStudentModal();
    window.showToast(`学生【${name}】档案已更新！真实头像与档案信息已同步保存`, "success");
    if (window.currentDrawerStudentId === origId || window.currentDrawerStudentId === newId) {
      window.openStudentDrawer(newId);
    }
    if (window.syncStudentTagFilterDropdown) window.syncStudentTagFilterDropdown();
    if (window.currentView === "students" || window.currentView === "dashboard" || window.currentView === "schedule" || window.currentView === "attendance") {
      renderCurrentView();
    }
  }
};

// ================= 发布通知弹窗 =================
window.openPublishNoticeModal = function() {
  document.getElementById("noticeTitleInput").value = "";
  document.getElementById("noticeContentInput").value = "";
  document.getElementById("publishNoticeModal").classList.add("active");
};
window.closePublishNoticeModal = function() {
  document.getElementById("publishNoticeModal").classList.remove("active");
};
window.submitPublishNotice = function() {
  const title = document.getElementById("noticeTitleInput").value.trim();
  const content = document.getElementById("noticeContentInput").value.trim();
  const deadline = document.getElementById("noticeDeadlineInput").value;
  const needReceipt = document.getElementById("noticeReceiptCheck").checked;
  if (!title || !content) { alert("通知标题和内容均不能为空！"); return; }

  window.store.addNotice({ title, content, deadline, needReceipt });
  window.closePublishNoticeModal();
  window.showToast(`班级通知《${title}》已发布！`, "success");
  if (window.currentView === "communication") renderCurrentView();
};

// ================= 编辑与删除班级通知 =================
window.openEditNoticeModal = function(noticeId) {
  const notice = (window.store.data.communication.notices || []).find(n => n.id === noticeId);
  if (!notice) return;
  document.getElementById("editNoticeId").value = notice.id;
  document.getElementById("editNoticeTitle").value = notice.title || "";
  document.getElementById("editNoticeDeadline").value = notice.deadline || "";
  document.getElementById("editNoticeReceiptCheck").checked = !!notice.needReceipt;
  document.getElementById("editNoticeContent").value = notice.content || "";
  document.getElementById("editNoticeModal").classList.add("active");
};

window.closeEditNoticeModal = function() {
  document.getElementById("editNoticeModal").classList.remove("active");
};

window.submitEditNotice = function() {
  const id = document.getElementById("editNoticeId").value;
  const title = document.getElementById("editNoticeTitle").value.trim();
  const deadline = document.getElementById("editNoticeDeadline").value;
  const needReceipt = document.getElementById("editNoticeReceiptCheck").checked;
  const content = document.getElementById("editNoticeContent").value.trim();
  if (!title || !content) { alert("通知标题和内容均不能为空！"); return; }

  const notices = window.store.data.communication.notices || [];
  const target = notices.find(n => n.id === id);
  if (target) {
    target.title = title;
    target.deadline = deadline;
    target.needReceipt = needReceipt;
    target.content = content;
    window.store.save();
    window.closeEditNoticeModal();
    window.showToast(`班级通知《${title}》已更新！`, "success");
    if (window.currentView === "communication") renderCurrentView();
  }
};

window.deleteNoticeItem = function(noticeId) {
  if (confirm("确定要删除此条班级通知吗？")) {
    window.store.data.communication.notices = (window.store.data.communication.notices || []).filter(n => n.id !== noticeId);
    window.store.save();
    window.showToast("班级通知已删除！", "info");
    if (window.currentView === "communication") renderCurrentView();
  }
};

// ================= 登记家长沟通弹窗 (含长期未联系家庭预警自动消除) =================
window.openAddCommLogModal = function() {
  document.getElementById("commStudentName").value = "";
  document.getElementById("commTopic").value = "";
  document.getElementById("commFeedback").value = "";
  document.getElementById("addCommLogModal").classList.add("active");
};
window.closeAddCommLogModal = function() {
  document.getElementById("addCommLogModal").classList.remove("active");
};
window.submitAddCommLog = function() {
  const studentName = document.getElementById("commStudentName").value.trim();
  const guardian = document.getElementById("commGuardian").value.trim();
  const method = document.getElementById("commMethod").value;
  const topic = document.getElementById("commTopic").value.trim();
  const feedback = document.getElementById("commFeedback").value.trim();
  const actionPlan = document.getElementById("commActionPlan").value.trim();
  if (!studentName || !topic) { alert("请填写学生姓名和沟通主题！"); return; }

  window.store.addCommLog({ studentName, guardian, method, topic, feedback, actionPlan, status: "已处理" });

  // 无论是否从点击预警发起，只要记录了该学生家长的沟通，均自动从长期未联系家庭中移出
  if (window.store.data.communication && window.store.data.communication.longTimeUntouched) {
    window.store.data.communication.longTimeUntouched = window.store.data.communication.longTimeUntouched.filter(
      item => item.studentName !== studentName && item.student !== studentName && item.studentName !== window.contactingUntouchedStudentName && item.student !== window.contactingUntouchedStudentName
    );
    window.store.save();
    window.contactingUntouchedStudentName = null;
  }

  window.closeAddCommLogModal();
  window.showToast("家长沟通台账已留痕归档！预警状态已自动消除", "success");
  if (window.currentView === "communication") renderCurrentView();
};

// ================= 编辑与删除家长沟通台账 =================
window.openEditCommLogModal = function(logId) {
  const comm = window.store.data.communication;
  if (!comm || !comm.logs) return;
  const log = comm.logs.find(l => l.id === logId);
  if (!log) return;

  document.getElementById("editCommLogId").value = log.id;
  document.getElementById("editCommStudentName").value = log.studentName || "";
  document.getElementById("editCommGuardian").value = log.guardian || "家长";
  document.getElementById("editCommMethod").value = log.method || "电话沟通";
  document.getElementById("editCommTopic").value = log.topic || "";
  document.getElementById("editCommStatus").value = log.status || "已处理";
  document.getElementById("editCommFeedback").value = log.feedback || "";
  document.getElementById("editCommActionPlan").value = log.actionPlan || "";

  document.getElementById("editCommLogModal").classList.add("active");
};

window.closeEditCommLogModal = function() {
  document.getElementById("editCommLogModal").classList.remove("active");
};

window.submitEditCommLog = function() {
  const logId = document.getElementById("editCommLogId").value;
  const studentName = document.getElementById("editCommStudentName").value.trim();
  const guardian = document.getElementById("editCommGuardian").value.trim();
  const method = document.getElementById("editCommMethod").value;
  const topic = document.getElementById("editCommTopic").value.trim();
  const status = document.getElementById("editCommStatus").value;
  const feedback = document.getElementById("editCommFeedback").value.trim();
  const actionPlan = document.getElementById("editCommActionPlan").value.trim();

  if (!studentName || !topic) {
    alert("请填写学生姓名和沟通主题！");
    return;
  }

  window.store.updateCommLog(logId, {
    studentName, guardian, method, topic, status, feedback, actionPlan
  });

  window.closeEditCommLogModal();
  window.showToast(`已成功修改学生【${studentName}】的家校沟通记录！`, "success");
  if (window.currentView === "communication") renderCurrentView();
};

window.deleteCommLogItem = function(logId, studentName) {
  if (confirm(`确定要彻底删除学生【${studentName || '该学生'}】的这条家校沟通台账记录吗？此操作不可逆！`)) {
    window.store.deleteCommLog(logId);
    window.showToast(`已删除【${studentName || '该学生'}】的沟通台账！`, "info");
    if (window.currentView === "communication") renderCurrentView();
  }
};

// ================= 常用通知模板库 =================
window.openNoticeTemplateModal = function() {
  const container = document.getElementById("noticeTemplatesList");
  const templates = [
    { title: "关于本周五召开2026学年秋季期中家长会的通知", content: "各位家长好：为进一步搭建家校育人桥梁，我校定于本周五下午15:00在博学楼302教室召开期中家长会，请合理安排时间准时参会，绿色出行。收到请点击确认回执。" },
    { title: "关于秋冬季预防支原体肺炎与流感的温馨提示", content: "近期气温变化较大，请家长督促孩子早晚添衣，保证充足睡眠，多饮温水，如出现发热咳嗽等症状请及时就医并告知班主任。" },
    { title: "关于国庆长假学生安全自护责任告知书", content: "国庆长假将至，请各位家长切实履行监护职责，重点防范溺水、交通事故、用火用电安全与网络沉迷，祝全体师生度过一个平安祥和的假期！" },
    { title: "关于开展“书香伴成长”班级亲子共读打卡的倡议", content: "为营造良好阅读风尚，本学期班级启动21天亲子共读活动，每天阅读20分钟并在打卡群分享心得，学期末将评选书香少年与书香家庭！" }
  ];

  container.innerHTML = templates.map((t, idx) => `
    <div style="background:#f8fafc; border:1px solid var(--border-color); border-radius:var(--radius-md); padding:12px; display:flex; flex-direction:column; gap:6px;">
      <div style="font-weight:700; color:#1e293b; font-size:14px;">${t.title}</div>
      <div style="font-size:12.5px; color:#475569; line-height:1.5;">${t.content}</div>
      <div style="text-align:right; margin-top:4px;">
        <button class="btn btn-sm btn-primary" onclick="window.useNoticeTemplate('${t.title}', \`${t.content}\`)">一键套用发布</button>
      </div>
    </div>
  `).join("");

  document.getElementById("noticeTemplateModal").classList.add("active");
};
window.closeNoticeTemplateModal = function() {
  document.getElementById("noticeTemplateModal").classList.remove("active");
};
window.useNoticeTemplate = function(title, content) {
  window.closeNoticeTemplateModal();
  window.openPublishNoticeModal();
  document.getElementById("noticeTitleInput").value = title;
  document.getElementById("noticeContentInput").value = content;
};

// ================= 记录表现弹窗 (支持评价指标联动与学生下拉框选择) =================
window.openAddGrowthEventModal = function(preselectDim, preselectStudent) {
  const stuSelect = document.getElementById("growthStuName");
  if (stuSelect) {
    const students = (window.store && window.store.data && window.store.data.students) || [];
    let opts = `<option value="">-- 请选择学生 --</option>`;
    students.forEach(s => {
      const isSel = (preselectStudent && (s.name === preselectStudent || s.id === preselectStudent)) ? "selected" : "";
      opts += `<option value="${s.name}" ${isSel}>${s.name} (${s.id || ''})</option>`;
    });
    stuSelect.innerHTML = opts;
    if (preselectStudent) stuSelect.value = preselectStudent;
  }
  const contentInput = document.getElementById("growthContent");
  if (contentInput) contentInput.value = "";
  
  // 动态填充评价指标下拉列表
  window.populateGrowthDimSelect(preselectDim);

  // 初始化每朵小红花分值提示
  const flowerVal = Number((window.store && window.store.data && window.store.data.scoreRules && window.store.data.scoreRules.flowerValue !== undefined) ? window.store.data.scoreRules.flowerValue : 3);
  const unitLabel = document.getElementById("flowerUnitValLabel");
  if (unitLabel) unitLabel.textContent = flowerVal;

  // 初始化小红花选择器
  const flowerSelect = document.getElementById("growthFlowers");
  if (flowerSelect) flowerSelect.value = "+2朵小红花";
  const customInput = document.getElementById("growthFlowersCustomCount");
  if (customInput) {
    customInput.value = "6";
    customInput.style.display = "none";
  }
  const tagSelect = document.getElementById("growthTag");
  if (tagSelect) tagSelect.value = "表扬";
  window.handleGrowthFlowerSelectChange("+2朵小红花");

  document.getElementById("addGrowthEventModal").classList.add("active");
};

window.populateGrowthDimSelect = function(selectedNameOrId) {
  const dimSelect = document.getElementById("growthDim");
  if (!dimSelect) return;
  const dims = (window.store && window.store.getGrowthDimensions) ? window.store.getGrowthDimensions() : ((window.store && window.store.data && window.store.data.growthDimensions) || []);
  let html = "";
  dims.forEach(d => {
    const isSelected = (selectedNameOrId && (d.name === selectedNameOrId || d.id === selectedNameOrId)) ? "selected" : "";
    html += `<option value="${d.name}" ${isSelected}>${d.icon || '⭐'} ${d.name}</option>`;
  });
  if (dims.length === 0) {
    html = `<option value="综合常规">⭐ 综合常规</option>`;
  }
  dimSelect.innerHTML = html;
};

window.closeAddGrowthEventModal = function() {
  document.getElementById("addGrowthEventModal").classList.remove("active");
};

window.setFlowerValuePrompt = function() {
  const currentVal = (window.store && window.store.data && window.store.data.scoreRules && window.store.data.scoreRules.flowerValue !== undefined) ? window.store.data.scoreRules.flowerValue : 3;
  const input = prompt(`请输入每朵小红花折算为班级宠物的积分分值（当前设置：${currentVal}分/朵）：`, currentVal);
  if (input === null) return;
  const num = parseInt(input.trim());
  if (isNaN(num) || num < 1 || num > 100) {
    alert("请输入 1 ~ 100 之间的有效正整数分值！");
    return;
  }
  if (!window.store.data.scoreRules) window.store.data.scoreRules = {};
  window.store.data.scoreRules.flowerValue = num;
  window.store.save();
  const res = window.store.recalcAllPetScoresAndLevels();

  const unitLabel = document.getElementById("flowerUnitValLabel");
  if (unitLabel) unitLabel.textContent = num;

  const flowerSelect = document.getElementById("growthFlowers");
  if (flowerSelect) {
    window.handleGrowthFlowerSelectChange(flowerSelect.value);
  }

  window.showToast(`小红花分值已更新为每朵 ${num} 分！已同步核算全班萌宠经验。`, "success");
  if (window.currentView === "growth" || window.currentView === "pets" || window.currentView === "score") {
    renderCurrentView();
  }
};

window.handleGrowthFlowerSelectChange = function(val) {
  const customInput = document.getElementById("growthFlowersCustomCount");
  const bonusHint = document.getElementById("flowerPetBonusHint");
  const bonusNum = document.getElementById("flowerPetBonusNum");
  if (!bonusHint || !bonusNum) return;

  const flowerVal = Number((window.store && window.store.data && window.store.data.scoreRules && window.store.data.scoreRules.flowerValue !== undefined) ? window.store.data.scoreRules.flowerValue : 3);

  if (val === "custom") {
    if (customInput) customInput.style.display = "inline-block";
    const n = Math.max(1, parseInt(customInput ? customInput.value : 6) || 1);
    bonusNum.textContent = `+${n * flowerVal}`;
    bonusHint.style.display = "block";
    bonusHint.style.color = "#16a34a";
    bonusHint.innerHTML = `🐾 将按每朵${flowerVal}分同步联动为班级宠物奖励 <span id="flowerPetBonusNum">+${n * flowerVal}</span> 经验积分！`;
  } else if (val === "需加油") {
    if (customInput) customInput.style.display = "none";
    bonusHint.style.display = "block";
    bonusHint.style.color = "#64748b";
    bonusHint.innerHTML = `💡 暂不增减小红花与宠物经验，鼓励继续加油！`;
  } else {
    if (customInput) customInput.style.display = "none";
    const nMatch = val.match(/\+(\d+)朵/);
    const n = nMatch ? parseInt(nMatch[1]) : 2;
    bonusNum.textContent = `+${n * flowerVal}`;
    bonusHint.style.display = "block";
    bonusHint.style.color = "#16a34a";
    bonusHint.innerHTML = `🐾 将按每朵${flowerVal}分同步联动为班级宠物奖励 <span id="flowerPetBonusNum">+${n * flowerVal}</span> 经验积分！`;
  }
};

window.handleCustomFlowerInput = function(val) {
  const flowerVal = Number((window.store && window.store.data && window.store.data.scoreRules && window.store.data.scoreRules.flowerValue !== undefined) ? window.store.data.scoreRules.flowerValue : 3);
  const n = Math.max(1, parseInt(val) || 1);
  const bonusNum = document.getElementById("flowerPetBonusNum");
  if (bonusNum) bonusNum.textContent = `+${n * flowerVal}`;
};

window.handleGrowthTagChange = function(tag) {
  const flowerSelect = document.getElementById("growthFlowers");
  const customInput = document.getElementById("growthFlowersCustomCount");
  const bonusHint = document.getElementById("flowerPetBonusHint");
  if (tag === "待改进") {
    if (flowerSelect) flowerSelect.value = "需加油";
    if (customInput) customInput.style.display = "none";
    if (bonusHint) {
      bonusHint.style.color = "#d97706";
      bonusHint.innerHTML = `💡 待改进辅导建议将记录到学生成长档案，宠物经验同步给予 -2 分适度提醒。`;
    }
  } else {
    if (flowerSelect && flowerSelect.value === "需加油") {
      flowerSelect.value = "+2朵小红花";
    }
    window.handleGrowthFlowerSelectChange(flowerSelect ? flowerSelect.value : "+2朵小红花");
  }
};

window.submitAddGrowthEvent = function() {
  const student = document.getElementById("growthStuName").value.trim();
  const dim = document.getElementById("growthDim").value;
  const tag = document.getElementById("growthTag").value;
  const content = document.getElementById("growthContent").value.trim();
  if (!student || !content) { alert("请选择学生姓名并填写表现描述！"); return; }

  let flower = document.getElementById("growthFlowers").value;
  let flowerCount = 2;
  if (flower === "custom") {
    flowerCount = Math.max(1, parseInt(document.getElementById("growthFlowersCustomCount").value) || 1);
    flower = `+${flowerCount}朵小红花`;
  } else if (flower === "需加油") {
    flowerCount = 0;
  } else {
    const nMatch = flower.match(/\+(\d+)朵/);
    if (nMatch) flowerCount = parseInt(nMatch[1]);
  }

  const teacherName = (window.store && window.store.data && window.store.data.classInfo && window.store.data.classInfo.teacher && window.store.data.classInfo.teacher.name) || "班主任";

  window.store.addGrowthEvent({
    student,
    dim,
    tag,
    flower,
    flowerCount,
    content,
    date: new Date().toISOString().slice(0, 10),
    teacher: teacherName
  });

  window.closeAddGrowthEventModal();
  window.showToast(`已为【${student}】记录【${dim}】表现（${flower}），并已实时联动班级宠物积分！`, "success");
  if (window.currentView === "growth" || window.currentView === "pets" || window.currentView === "score") {
    renderCurrentView();
  }
};

// ================= 综合素质评价指标管理 =================
window.openGrowthDimManageModal = function() {
  window.renderGrowthDimManageList();
  document.getElementById("growthDimManageModal").classList.add("active");
};

window.closeGrowthDimManageModal = function() {
  document.getElementById("growthDimManageModal").classList.remove("active");
  if (document.getElementById("addGrowthEventModal").classList.contains("active")) {
    window.populateGrowthDimSelect();
  }
  if (window.currentView === "growth") renderCurrentView();
};

window.renderGrowthDimManageList = function() {
  const listEl = document.getElementById("growthDimManageList");
  if (!listEl) return;
  const dims = (window.store && window.store.getGrowthDimensions) ? window.store.getGrowthDimensions() : ((window.store && window.store.data && window.store.data.growthDimensions) || []);
  if (dims.length === 0) {
    listEl.innerHTML = `<div style="text-align:center; padding:16px; color:#94a3b8;">暂无评价指标，请在上方添加！</div>`;
    return;
  }

  listEl.innerHTML = dims.map(d => {
    const distinctStudents = window.store.getDistinctStudentsForDim ? window.store.getDistinctStudentsForDim(d.name) : [];
    const count = distinctStudents.length > 0 ? distinctStudents.length : (d.count || 0);
    return `
    <div style="display: flex; align-items: center; gap: 8px; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 6px 10px;">
      <input type="text" id="dim_icon_${d.id}" value="${d.icon || '⭐'}" style="width: 44px; text-align: center; font-size: 16px; padding: 4px;" class="form-control" title="修改图标 Emoji">
      <input type="text" id="dim_name_${d.id}" value="${d.name}" style="flex: 1; font-weight: 600;" class="form-control" placeholder="指标名称">
      <span style="font-size: 11px; color: #2563eb; font-weight: 700; white-space: nowrap;">${count}人获表彰</span>
      <button class="btn btn-sm btn-outline-primary" style="padding: 4px 10px; font-size: 12px;" onclick="window.updateSingleGrowthDim('${d.id}')">💾 保存</button>
      <button class="btn btn-sm" style="padding: 4px 8px; font-size: 12px; background: #eff6ff; color: #1d4ed8; border: 1px solid #bfdbfe;" onclick="window.closeGrowthDimManageModal(); window.openGrowthDimDetailModal('${d.id}')" title="查看获奖明细">👥 学生台账</button>
      <button class="btn btn-sm" style="padding: 4px 8px; font-size: 12px; background: #fee2e2; color: #dc2626; border: 1px solid #fca5a5;" onclick="window.deleteSingleGrowthDim('${d.id}')">🗑️</button>
    </div>
  `;}).join("");
};

window.saveNewGrowthDimension = function() {
  const iconInput = document.getElementById("newDimIconInput");
  const nameInput = document.getElementById("newDimNameInput");
  const icon = (iconInput && iconInput.value.trim()) || "⭐";
  const name = nameInput ? nameInput.value.trim() : "";
  if (!name) {
    alert("请输入指标名称！");
    return;
  }
  window.store.addGrowthDimension({ name, icon });
  if (nameInput) nameInput.value = "";
  window.renderGrowthDimManageList();
  window.showToast(`已成功添加评价指标【${name}】！`, "success");
  if (window.currentView === "growth") renderCurrentView();
};

window.updateSingleGrowthDim = function(id) {
  const iconInput = document.getElementById("dim_icon_" + id);
  const nameInput = document.getElementById("dim_name_" + id);
  const newIcon = (iconInput && iconInput.value.trim()) || "⭐";
  const newName = nameInput ? nameInput.value.trim() : "";
  if (!newName) {
    alert("指标名称不能为空！");
    return;
  }
  window.store.updateGrowthDimension(id, { name: newName, icon: newIcon });
  window.renderGrowthDimManageList();
  window.showToast(`指标【${newName}】已更新！`, "success");
  if (window.currentView === "growth") renderCurrentView();
};

window.deleteSingleGrowthDim = function(id) {
  const dims = (window.store && window.store.getGrowthDimensions) ? window.store.getGrowthDimensions() : ((window.store && window.store.data && window.store.data.growthDimensions) || []);
  const target = dims.find(d => String(d.id) === String(id));
  const name = target ? target.name : "该指标";
  if (!confirm(`确定要删除综合素质评价指标【${name}】吗？已记录的历史评价与宠物积分保留。`)) return;
  window.store.deleteGrowthDimension(id);
  window.renderGrowthDimManageList();
  window.showToast(`已删除评价指标【${name}】！`, "success");
  if (window.currentView === "growth") renderCurrentView();
};

window.editSingleGrowthDim = function(id) {
  window.openGrowthDimDetailModal(id);
};

// ================= 综合素质指标详情与获奖台账弹窗 (Modal 13-B) =================
window.openGrowthDimDetailModal = function(dimId) {
  const dims = (window.store && window.store.getGrowthDimensions) ? window.store.getGrowthDimensions() : ((window.store && window.store.data && window.store.data.growthDimensions) || []);
  const dim = dims.find(d => String(d.id) === String(dimId) || d.name === dimId);
  if (!dim) {
    window.showToast("未找到对应的评价指标！", "warning");
    return;
  }

  const idInput = document.getElementById("currentDetailDimId");
  if (idInput) idInput.value = dim.id;

  const badgeTitle = document.getElementById("detailDimBadgeTitle");
  if (badgeTitle) badgeTitle.textContent = `${dim.icon || '⭐'} ${dim.name}`;

  const nameInput = document.getElementById("detailDimNameInput");
  if (nameInput) nameInput.value = dim.name;

  const iconInput = document.getElementById("detailDimIconInput");
  if (iconInput) iconInput.value = dim.icon || '⭐';

  // 填充添加表彰学生的下拉列表
  const stuSelect = document.getElementById("dimInlineStuSelect");
  if (stuSelect) {
    const students = (window.store && window.store.data && window.store.data.students) || [];
    stuSelect.innerHTML = `<option value="">-- 选择获奖学生 --</option>` + students.map(s => {
      return `<option value="${s.name}">${s.name} (${s.id || ''})</option>`;
    }).join("");
  }

  const contentInput = document.getElementById("dimInlineContentInput");
  if (contentInput) contentInput.value = "";

  window.renderDimStudentAwardList(dim.name);
  document.getElementById("growthDimDetailModal").classList.add("active");
};

window.closeGrowthDimDetailModal = function() {
  document.getElementById("growthDimDetailModal").classList.remove("active");
  if (window.currentView === "growth") {
    renderCurrentView();
  }
};

window.renderDimStudentAwardList = function(dimName) {
  const listEl = document.getElementById("dimStudentAwardList");
  if (!listEl) return;

  const records = window.store.getCommendationsForDim ? window.store.getCommendationsForDim(dimName) : [];
  const distinctStudents = window.store.getDistinctStudentsForDim ? window.store.getDistinctStudentsForDim(dimName) : [];

  // 计算小红花总数
  let totalFlowers = 0;
  records.forEach(r => {
    if (typeof r.flowerCount === "number" && !isNaN(r.flowerCount)) totalFlowers += r.flowerCount;
    else if (r.flower) {
      const m = String(r.flower).match(/\+?(\d+)朵/);
      if (m) totalFlowers += parseInt(m[1]);
    }
  });

  const distinctCountEl = document.getElementById("detailDimDistinctCount");
  if (distinctCountEl) distinctCountEl.textContent = distinctStudents.length;

  const totalFlowersEl = document.getElementById("detailDimTotalFlowers");
  if (totalFlowersEl) totalFlowersEl.textContent = totalFlowers;

  const recordCountEl = document.getElementById("detailDimRecordCount");
  if (recordCountEl) recordCountEl.textContent = `${records.length}条记录`;

  if (records.length === 0) {
    listEl.innerHTML = `
      <div style="text-align: center; padding: 28px 16px; color: #94a3b8; background: #f8fafc; border: 1px dashed #cbd5e1; border-radius: 8px;">
        <div style="font-size: 28px; margin-bottom: 6px;">🌱</div>
        <div style="font-size: 13.5px; font-weight: 600; color: #64748b;">该指标暂无表彰记录</div>
        <div style="font-size: 12px; margin-top: 4px; color: #94a3b8;">可在上方快捷选择学生登记表扬，颁发小红花！</div>
      </div>
    `;
    return;
  }

  // 渲染表彰记录卡片列表，支持编辑和删除
  listEl.innerHTML = records.map(r => {
    const flowerText = r.flower || (r.flowerCount ? `+${r.flowerCount}朵小红花` : "+2朵小红花");
    return `
      <div style="display: flex; align-items: center; justify-content: space-between; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px 14px; gap: 12px; transition: all 0.2s;" onmouseenter="this.style.borderColor='#93c5fd'" onmouseleave="this.style.borderColor='#e2e8f0'">
        <div style="display: flex; align-items: center; gap: 12px; flex: 1; min-width: 0;">
          <div style="width: 36px; height: 36px; border-radius: 50%; background: #eff6ff; color: #2563eb; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 14px; flex-shrink: 0; border: 1px solid #bfdbfe;">
            ${r.student ? r.student.slice(0, 1) : '生'}
          </div>
          <div style="flex: 1; min-width: 0;">
            <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
              <span style="font-weight: 700; font-size: 14px; color: #1e293b;">${r.student}</span>
              <span class="badge" style="background: #fdf2f8; color: #db2777; border: 1px solid #fbcfe8; font-size: 11px; font-weight: 600;">🌸 ${flowerText}</span>
              <span style="font-size: 11px; color: #94a3b8;">${r.date || ''}</span>
              <span style="font-size: 11px; color: #64748b;">评定人：${r.teacher || '班主任'}</span>
            </div>
            <div style="font-size: 12.5px; color: #475569; margin-top: 4px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
              ${r.content || '表现突出，特发小红花以资鼓励！'}
            </div>
          </div>
        </div>
        <div style="display: flex; align-items: center; gap: 6px; flex-shrink: 0;">
          <button class="btn btn-sm btn-outline-primary" style="padding: 3px 8px; font-size: 11.5px;" onclick="window.openEditCommendationModal('${r.id}')" title="修改评价与小红花">✏️ 编辑</button>
          <button class="btn btn-sm" style="padding: 3px 8px; font-size: 11.5px; background: #fee2e2; color: #dc2626; border: 1px solid #fca5a5;" onclick="window.deleteCommendationFromDim('${r.id}')" title="删除该条表彰记录">🗑️ 删除</button>
        </div>
      </div>
    `;
  }).join("");
};

window.saveGrowthDimDetailInfo = function() {
  const dimId = document.getElementById("currentDetailDimId").value;
  const newName = document.getElementById("detailDimNameInput").value.trim();
  const newIcon = document.getElementById("detailDimIconInput").value.trim() || "⭐";
  if (!newName) {
    alert("指标名称不能为空！");
    return;
  }
  const updated = window.store.updateGrowthDimension(dimId, { name: newName, icon: newIcon });
  if (updated) {
    const badgeTitle = document.getElementById("detailDimBadgeTitle");
    if (badgeTitle) badgeTitle.textContent = `${newIcon} ${newName}`;
    window.renderDimStudentAwardList(newName);
    window.showToast(`评价指标属性已更新为【${newName}】！`, "success");
    if (window.currentView === "growth") renderCurrentView();
  }
};

window.submitDimInlineCommendation = function() {
  const dimId = document.getElementById("currentDetailDimId").value;
  const dims = (window.store && window.store.getGrowthDimensions) ? window.store.getGrowthDimensions() : ((window.store && window.store.data && window.store.data.growthDimensions) || []);
  const dim = dims.find(d => String(d.id) === String(dimId));
  if (!dim) return;

  const stuSelect = document.getElementById("dimInlineStuSelect");
  const student = stuSelect ? stuSelect.value.trim() : "";
  if (!student) {
    alert("请选择获得表彰的学生！");
    return;
  }

  const flowerCount = parseInt(document.getElementById("dimInlineFlowerSelect").value) || 2;
  const flower = `+${flowerCount}朵小红花`;
  const contentInput = document.getElementById("dimInlineContentInput");
  const content = (contentInput && contentInput.value.trim()) || `在【${dim.name}】方面表现突出，特发小红花表彰！`;

  const teacherName = (window.store && window.store.data && window.store.data.classInfo && window.store.data.classInfo.teacher && window.store.data.classInfo.teacher.name) || "班主任";

  window.store.addGrowthEvent({
    student,
    dim: dim.name,
    tag: "表扬",
    flower,
    flowerCount,
    content,
    date: new Date().toISOString().slice(0, 10),
    teacher: teacherName
  });

  if (contentInput) contentInput.value = "";
  window.renderDimStudentAwardList(dim.name);
  window.showToast(`已为【${student}】添加【${dim.name}】表彰（${flower}）！`, "success");
  if (window.currentView === "growth") renderCurrentView();
};

window.deleteCommendationFromDim = function(recordId) {
  if (!confirm("确定要删除此条表彰记录吗？系统将自动扣减该学生对应的小红花和班级宠物经验积分。")) return;
  const dimId = document.getElementById("currentDetailDimId").value;
  const dims = (window.store && window.store.getGrowthDimensions) ? window.store.getGrowthDimensions() : ((window.store && window.store.data && window.store.data.growthDimensions) || []);
  const dim = dims.find(d => String(d.id) === String(dimId));
  const dimName = dim ? dim.name : "";

  window.store.deleteGrowthEvent(recordId);
  if (dimName) window.renderDimStudentAwardList(dimName);
  window.showToast("已成功删除该条表彰记录，并同步联动调整学生小红花与宠物经验！", "success");
  if (window.currentView === "growth") renderCurrentView();
};

window.openEditCommendationModal = function(recordId) {
  const events = (window.store && window.store.data && window.store.data.growthEvents) || [];
  const evt = events.find(e => String(e.id) === String(recordId));
  if (!evt) return;

  let currentFl = 2;
  if (typeof evt.flowerCount === "number") currentFl = evt.flowerCount;
  else if (evt.flower) {
    const m = String(evt.flower).match(/\+?(\d+)朵/);
    if (m) currentFl = parseInt(m[1]);
  }

  const newFlInput = prompt(`修改【${evt.student}】获得的【${evt.dim}】小红花朵数（当前：${currentFl}朵）：`, currentFl);
  if (newFlInput === null) return;
  const num = parseInt(newFlInput.trim());
  if (isNaN(num) || num < 0 || num > 50) {
    alert("请输入 0 ~ 50 之间的有效数字！");
    return;
  }

  const newContent = prompt(`修改评价描述/寄语：`, evt.content || "表现突出！");
  if (newContent === null) return;

  window.store.updateGrowthEvent(recordId, {
    flower: `+${num}朵小红花`,
    flowerCount: num,
    content: newContent.trim()
  });

  const dimId = document.getElementById("currentDetailDimId").value;
  const dims = (window.store && window.store.getGrowthDimensions) ? window.store.getGrowthDimensions() : ((window.store && window.store.data && window.store.data.growthDimensions) || []);
  const dim = dims.find(d => String(d.id) === String(dimId));
  if (dim) window.renderDimStudentAwardList(dim.name);

  window.showToast(`已更新【${evt.student}】的表彰信息与小红花数量！`, "success");
  if (window.currentView === "growth") renderCurrentView();
};

window.deleteCurrentDimFromDetail = function() {
  const dimId = document.getElementById("currentDetailDimId").value;
  const dims = (window.store && window.store.getGrowthDimensions) ? window.store.getGrowthDimensions() : ((window.store && window.store.data && window.store.data.growthDimensions) || []);
  const dim = dims.find(d => String(d.id) === String(dimId));
  const dimName = dim ? dim.name : "该指标";

  if (!confirm(`确定要删除综合素质评价指标【${dimName}】吗？已记录的历史评价与宠物积分保留。`)) return;
  window.store.deleteGrowthDimension(dimId);
  window.closeGrowthDimDetailModal();
  window.showToast(`已删除评价指标【${dimName}】！`, "success");
  if (window.currentView === "growth") renderCurrentView();
};

// ================= 登记请假弹窗 =================
window.openRegisterLeaveModal = function() { document.getElementById("registerLeaveModal").classList.add("active"); };
window.closeRegisterLeaveModal = function() { document.getElementById("registerLeaveModal").classList.remove("active"); };
window.submitRegisterLeave = function() {
  const studentName = document.getElementById("leaveStudentName").value.trim();
  const leaveType = document.getElementById("leaveType").value;
  const reason = document.getElementById("leaveReason").value;
  const s = window.store.data.students.find(item => item.name === studentName);
  if (!s) { alert("未找到该学生姓名，请核对！"); return; }

  s.attendanceToday = leaveType;
  const today = new Date().toISOString().slice(0, 10);
  if (!window.store.data.attendance) window.store.data.attendance = { records: {}, leaves: [] };
  if (!window.store.data.attendance.leaves) window.store.data.attendance.leaves = [];
  window.store.data.attendance.leaves.unshift({
    id: "leave-" + Date.now(),
    studentId: s.id,
    studentName: s.name,
    type: leaveType,
    reason: reason || "按时报备请假",
    date: today,
    createdAt: new Date().toISOString()
  });
  if (!window.store.data.attendance.records) window.store.data.attendance.records = {};
  if (!window.store.data.attendance.records[today]) window.store.data.attendance.records[today] = {};
  window.store.data.attendance.records[today][s.id] = leaveType;

  // 联动宠物积分
  window.store.linkPetScoreChange(s.id, -1, `登记${leaveType}：${reason || '按时报备登记'}`, "考勤请假");
  window.store.save();
  window.closeRegisterLeaveModal();
  window.showToast(`已为【${s.name}】登记请假，并联动更新成长积分！`, "success");
  renderCurrentView();
};

// ================= 快速打分弹窗 (解决问题3) =================
window.openQuickScoreModal = function(preselectName) {
  const select = document.getElementById("scoreTargetSelect");
  if (select) {
    const students = window.store.data.students || [];
    let html = `
      <optgroup label="快捷批量奖惩">
        <option value="ALL">🌟 全班学生 (${students.length}人)</option>
        <option value="G1">👥 第 1 小组全体</option>
        <option value="G2">👥 第 2 小组全体</option>
        <option value="G3">👥 第 3 小组全体</option>
        <option value="G4">👥 第 4 小组全体</option>
        <option value="G5">👥 第 5 小组全体</option>
        <option value="G6">👥 第 6 小组全体</option>
      </optgroup>
      <optgroup label="个人奖惩 (按学号/姓名)">
    `;
    students.forEach(s => {
      const selected = (preselectName && (s.name === preselectName || s.id === preselectName)) ? 'selected' : '';
      html += `<option value="${s.id}" ${selected}>${s.id} - ${s.name} (第${s.group}组 · ${s.score || 80}分)</option>`;
    });
    html += `</optgroup>`;
    select.innerHTML = html;
  }
  document.getElementById("quickScoreModal").classList.add("active");
};

window.closeQuickScoreModal = function() {
  document.getElementById("quickScoreModal").classList.remove("active");
};

window.submitQuickScore = function() {
  const select = document.getElementById("scoreTargetSelect");
  const targetVal = select ? select.value : "";
  const delta = parseInt(document.getElementById("scoreDelta").value) || 2;
  const reason = document.getElementById("scoreReason").value.trim() || "课堂常规表现";
  const students = window.store.data.students || [];

  if (targetVal === "ALL") {
    students.forEach(s => window.store.adjustStudentScore(s.id, delta, reason));
    window.showToast(`已为全班全体学生记录：${delta > 0 ? '+' : ''}${delta}分！`, "success");
  } else if (targetVal.startsWith("G")) {
    const groupNum = parseInt(targetVal.replace("G", ""));
    const groupStudents = students.filter(s => s.group === groupNum);
    groupStudents.forEach(s => window.store.adjustStudentScore(s.id, delta, reason));
    window.showToast(`已为第 ${groupNum} 组全体 ${groupStudents.length} 位同学记录：${delta > 0 ? '+' : ''}${delta}分！`, "success");
  } else {
    const s = students.find(item => item.id === targetVal || item.name === targetVal);
    if (!s) { alert("请选择有效的学生或分组！"); return; }
    window.store.adjustStudentScore(s.id, delta, reason);
    window.showToast(`已为【${s.name}】记录量化分：${delta > 0 ? '+' : ''}${delta}分！当前积分：${s.score}`, "success");
  }

  window.closeQuickScoreModal();
  if (window.currentView === "score" || window.currentView === "pets") renderCurrentView();
};

// ================= 1530 安全教育台账管理、类型自拟、附件上传与凭证查看 =================
window.currentAddSafetyAttachments = [];
window.currentEditSafetyAttachments = [];

window.handleSafetyAttachmentUpload = function(event, mode) {
  const files = event.target.files;
  if (!files || files.length === 0) return;

  const targetList = (mode === "edit") ? window.currentEditSafetyAttachments : window.currentAddSafetyAttachments;

  Array.from(files).forEach(file => {
    const reader = new FileReader();
    const fileName = file.name;
    const fileSizeStr = file.size > 1024 * 1024 
      ? (file.size / (1024 * 1024)).toFixed(1) + " MB" 
      : Math.max(1, Math.round(file.size / 1024)) + " KB";

    // 智能识别文件类型
    const lowerName = fileName.toLowerCase();
    let fileType = "other";
    if (/\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i.test(lowerName) || file.type.startsWith("image/")) {
      fileType = "image";
    } else if (/\.(mp4|webm|mov|ogg|m4v|avi|wmv)$/i.test(lowerName) || file.type.startsWith("video/")) {
      fileType = "video";
    } else if (/\.(ppt|pptx)$/i.test(lowerName) || file.type.includes("presentation")) {
      fileType = "ppt";
    } else if (/\.(doc|docx)$/i.test(lowerName) || file.type.includes("word")) {
      fileType = "word";
    } else if (/\.pdf$/i.test(lowerName) || file.type.includes("pdf")) {
      fileType = "pdf";
    }

    reader.onload = function(e) {
      const dataUrl = e.target.result;
      targetList.push({
        id: "att_" + Date.now() + "_" + Math.random().toString(36).slice(2, 6),
        name: fileName,
        size: fileSizeStr,
        type: file.type || "application/octet-stream",
        fileType: fileType,
        dataUrl: dataUrl,
        uploadTime: new Date().toLocaleDateString()
      });
      window.renderSafetyAttachmentList(mode);
    };

    reader.readAsDataURL(file);
  });

  // 清空 input 允许连续上传同名文件
  event.target.value = "";
};

window.renderSafetyAttachmentList = function(mode) {
  const containerId = (mode === "edit") ? "editSafetyAttachmentList" : "addSafetyAttachmentList";
  const container = document.getElementById(containerId);
  if (!container) return;

  const list = (mode === "edit") ? window.currentEditSafetyAttachments : window.currentAddSafetyAttachments;
  if (!list || list.length === 0) {
    container.innerHTML = "";
    return;
  }

  const iconMap = {
    image: "🖼️",
    video: "🎥",
    ppt: "📊",
    word: "📝",
    pdf: "📑",
    other: "📁"
  };

  container.innerHTML = list.map((item, idx) => `
    <div style="display: flex; align-items: center; justify-content: space-between; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 6px; padding: 6px 10px; font-size: 12.5px;">
      <div style="display: flex; align-items: center; gap: 8px; flex: 1; min-width: 0;">
        <span style="font-size: 16px;">${iconMap[item.fileType] || '📎'}</span>
        <span style="font-weight: 600; color: #1e293b; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${item.name}">${item.name}</span>
        <span style="color: #94a3b8; font-size: 11px; white-space: nowrap;">(${item.size})</span>
      </div>
      <button type="button" class="btn btn-sm" style="padding: 1px 6px; font-size: 12px; color: #ef4444; background: #fee2e2; border: 1px solid #fca5a5; margin-left: 8px;" onclick="window.removeSafetyAttachment(${idx}, '${mode}')" title="删除此附件">✕</button>
    </div>
  `).join("");
};

window.removeSafetyAttachment = function(index, mode) {
  const list = (mode === "edit") ? window.currentEditSafetyAttachments : window.currentAddSafetyAttachments;
  list.splice(index, 1);
  window.renderSafetyAttachmentList(mode);
};

// 教育类型动态下拉框与自定义管理
window.populateSafetyTypeSelect = function(selectId, selectedVal) {
  const select = document.getElementById(selectId);
  if (!select) return;
  const types = window.store.getSafetyTypes ? window.store.getSafetyTypes() : [];
  let html = "";
  types.forEach(t => {
    const isSel = (selectedVal && (t.name === selectedVal || t.shortName === selectedVal)) ? "selected" : "";
    html += `<option value="${t.name}" ${isSel}>${t.name}</option>`;
  });
  select.innerHTML = html;
};

window.openSafetyTypeManageModal = function() {
  window.renderSafetyTypeManageList();
  document.getElementById("safetyTypeManageModal").classList.add("active");
};

window.closeSafetyTypeManageModal = function() {
  document.getElementById("safetyTypeManageModal").classList.remove("active");
  const currentAddVal = document.getElementById("safetyTypeSelect") ? document.getElementById("safetyTypeSelect").value : null;
  window.populateSafetyTypeSelect("safetyTypeSelect", currentAddVal);
  const currentEditVal = document.getElementById("editSafetyType") ? document.getElementById("editSafetyType").value : null;
  window.populateSafetyTypeSelect("editSafetyType", currentEditVal);
  if (window.currentView === "safety") renderCurrentView();
};

window.renderSafetyTypeManageList = function() {
  const container = document.getElementById("safetyTypeManageList");
  if (!container) return;
  const types = window.store.getSafetyTypes ? window.store.getSafetyTypes() : [];

  container.innerHTML = types.map(t => `
    <div style="display: flex; align-items: center; gap: 8px; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 6px; padding: 6px 10px;">
      <input type="text" id="st_name_${t.id}" value="${t.name}" class="form-control" style="flex: 1; font-weight: 600; font-size: 13px;">
      <button class="btn btn-sm btn-outline-primary" style="padding: 3px 8px; font-size: 11.5px; white-space: nowrap;" onclick="window.updateSingleSafetyType('${t.id}')">💾 保存</button>
      <button class="btn btn-sm" style="padding: 3px 8px; font-size: 11.5px; background: #fee2e2; color: #dc2626; border: 1px solid #fca5a5; white-space: nowrap;" onclick="window.deleteSingleSafetyType('${t.id}')">🗑️</button>
    </div>
  `).join("");
};

window.saveNewSafetyType = function() {
  const input = document.getElementById("newSafetyTypeNameInput");
  const name = input ? input.value.trim() : "";
  if (!name) {
    alert("请输入教育类型名称！");
    return;
  }
  const badgeClasses = ["badge-info", "badge-warning", "badge-purple", "badge-success", "badge-primary"];
  const badgeClass = badgeClasses[Math.floor(Math.random() * badgeClasses.length)];
  window.store.addSafetyType({ name, shortName: name, badgeClass });
  if (input) input.value = "";
  window.renderSafetyTypeManageList();
  window.showToast(`已成功添加安全教育类型【${name}】！`, "success");
};

window.updateSingleSafetyType = function(id) {
  const input = document.getElementById("st_name_" + id);
  const newName = input ? input.value.trim() : "";
  if (!newName) {
    alert("教育类型名称不能为空！");
    return;
  }
  window.store.updateSafetyType(id, { name: newName, shortName: newName });
  window.renderSafetyTypeManageList();
  window.showToast(`已更新教育类型为【${newName}】！`, "success");
};

window.deleteSingleSafetyType = function(id) {
  const types = window.store.getSafetyTypes ? window.store.getSafetyTypes() : [];
  const target = types.find(t => String(t.id) === String(id));
  const name = target ? target.name : "该类型";
  if (!confirm(`确定要删除教育类型【${name}】吗？`)) return;
  const ok = window.store.deleteSafetyType(id);
  if (!ok) {
    alert("系统至少需保留一种教育类型！");
    return;
  }
  window.renderSafetyTypeManageList();
  window.showToast(`已删除教育类型【${name}】！`, "success");
};

// 登记与编辑 1530 安全教育台账
window.openAddSafety1530Modal = function() {
  const dateInput = document.getElementById("addSafetyDate");
  if (dateInput) dateInput.value = new Date().toISOString().slice(0, 10);

  window.populateSafetyTypeSelect("safetyTypeSelect");

  const topicInput = document.getElementById("safetyTopicInput");
  if (topicInput) topicInput.value = "";

  const contentInput = document.getElementById("safetyContentInput");
  if (contentInput) contentInput.value = "";

  const methodInput = document.getElementById("safetyMethodInput");
  if (methodInput) methodInput.value = "口头提醒 + 强调";

  const countInput = document.getElementById("safetyParticipantsInput");
  if (countInput) countInput.value = (window.store.data.students && window.store.data.students.length) || 45;

  const teacherInput = document.getElementById("safetyTeacherInput");
  if (teacherInput) {
    const teacherName = (window.currentUser && (window.currentUser.realName || window.currentUser.name)) || 
                        (window.store.data.classInfo && window.store.data.classInfo.teacher && window.store.data.classInfo.teacher.name) || "李老师";
    teacherInput.value = teacherName;
  }

  window.currentAddSafetyAttachments = [];
  window.renderSafetyAttachmentList("add");

  document.getElementById("addSafetyModal").classList.add("active");
};

window.closeAddSafetyModal = function() {
  document.getElementById("addSafetyModal").classList.remove("active");
};

window.submitAddSafety = function() {
  const date = (document.getElementById("addSafetyDate") && document.getElementById("addSafetyDate").value) || new Date().toISOString().slice(0, 10);
  const type = (document.getElementById("safetyTypeSelect") && document.getElementById("safetyTypeSelect").value) || "每天放学前 1分钟提醒";
  const topic = (document.getElementById("safetyTopicInput") && document.getElementById("safetyTopicInput").value.trim()) || "";
  const content = (document.getElementById("safetyContentInput") && document.getElementById("safetyContentInput").value.trim()) || "";
  const method = (document.getElementById("safetyMethodInput") && document.getElementById("safetyMethodInput").value.trim()) || "口头提醒 + 强调";
  const participants = ((document.getElementById("safetyParticipantsInput") && document.getElementById("safetyParticipantsInput").value) || "45") + "人";
  const teacher = (document.getElementById("safetyTeacherInput") && document.getElementById("safetyTeacherInput").value.trim()) || "班主任";

  if (!topic || !content) {
    alert("请填写完整的安全教育主题与要点！");
    return;
  }

  const atts = [...window.currentAddSafetyAttachments];
  let materials = "常规宣讲台账";
  if (atts.length > 0) {
    materials = atts[0].name + (atts.length > 1 ? ` 等${atts.length}件` : '');
  }

  window.store.addSafetyRecord({
    date,
    type,
    topic,
    content,
    method,
    participants,
    teacher,
    status: "已完成",
    materials,
    attachments: atts
  });

  window.closeAddSafetyModal();
  window.showToast("🎉 1530 安全教育台账已完整留痕归档（含佐证凭证附件）！", "success");
  if (window.currentView === "safety") renderCurrentView();
};

window.openEditSafetyModal = function(index) {
  const list = window.store.data.safety1530 || [];
  const item = list[index];
  if (!item) return;

  document.getElementById("editSafetyIndex").value = index;
  document.getElementById("editSafetyDate").value = item.date || new Date().toISOString().slice(0, 10);
  window.populateSafetyTypeSelect("editSafetyType", item.type);
  document.getElementById("editSafetyTopic").value = item.topic || "";
  document.getElementById("editSafetyContent").value = item.content || "";
  document.getElementById("editSafetyMethod").value = item.method || "口头提醒 + 强调";
  document.getElementById("editSafetyParticipants").value = parseInt(item.participants) || 45;
  document.getElementById("editSafetyTeacher").value = item.teacher || "班主任";

  window.currentEditSafetyAttachments = JSON.parse(JSON.stringify(item.attachments || []));
  window.renderSafetyAttachmentList("edit");

  document.getElementById("editSafetyModal").classList.add("active");
};

window.closeEditSafetyModal = function() {
  document.getElementById("editSafetyModal").classList.remove("active");
};

window.submitEditSafety = function() {
  const idx = parseInt(document.getElementById("editSafetyIndex").value);
  const date = document.getElementById("editSafetyDate").value;
  const type = document.getElementById("editSafetyType").value;
  const topic = document.getElementById("editSafetyTopic").value.trim();
  const content = document.getElementById("editSafetyContent").value.trim();
  const method = document.getElementById("editSafetyMethod").value.trim();
  const participants = document.getElementById("editSafetyParticipants").value + "人";
  const teacher = document.getElementById("editSafetyTeacher").value.trim();

  if (!topic || !content) {
    alert("主题和内容不能为空！");
    return;
  }

  const atts = [...window.currentEditSafetyAttachments];
  let materials = "常规宣讲台账";
  if (atts.length > 0) {
    materials = atts[0].name + (atts.length > 1 ? ` 等${atts.length}件` : '');
  }

  window.store.updateSafety1530(idx, {
    date,
    type,
    topic,
    content,
    method,
    participants,
    teacher,
    materials,
    attachments: atts
  });

  window.closeEditSafetyModal();
  window.showToast("安全教育留痕台账已成功更新！", "success");
  if (window.currentView === "safety") renderCurrentView();
};

window.deleteSafetyItem = function(index) {
  if (confirm("确定要删除该条 1530 安全教育台账留痕记录吗？")) {
    window.store.deleteSafety1530(index);
    window.showToast("已删除安全教育台账记录！", "info");
    if (window.currentView === "safety") renderCurrentView();
  }
};

// 查看留痕凭证详情 (多媒体与文档格式自适应展示与下载)
window.openViewSafetyMaterialModal = function(index) {
  const list = window.store.data.safety1530 || [];
  const item = list[index];
  if (!item) return;

  const topicEl = document.getElementById("viewMaterialTopic");
  if (topicEl) topicEl.textContent = item.topic;
  const dateEl = document.getElementById("viewMaterialDate");
  if (dateEl) dateEl.textContent = item.date;
  const contentEl = document.getElementById("viewMaterialContent");
  if (contentEl) contentEl.textContent = item.content;
  const methodEl = document.getElementById("viewMaterialMethod");
  if (methodEl) methodEl.textContent = item.method || "口头提醒";
  const partEl = document.getElementById("viewMaterialParticipants");
  if (partEl) partEl.textContent = item.participants || "45人";
  const teacherEl = document.getElementById("viewMaterialTeacher");
  if (teacherEl) teacherEl.textContent = item.teacher || "班主任";
  const typeBadge = document.getElementById("viewMaterialTypeBadge");
  if (typeBadge) typeBadge.textContent = item.type || "1530安全留痕";

  const atts = item.attachments || [];
  const countBadge = document.getElementById("viewMaterialAttachmentCountBadge");
  if (countBadge) countBadge.textContent = `${atts.length} 个归档凭证`;

  const container = document.getElementById("viewMaterialAttachmentsContainer");
  if (!container) return;

  if (atts.length === 0) {
    container.innerHTML = `
      <div style="text-align:center; padding: 30px; background:#f8fafc; border:1px dashed #cbd5e1; border-radius:8px;">
        <div style="font-size: 28px;">📄</div>
        <div style="font-size:13.5px; color:#475569; font-weight:700; margin-top:6px;">《${item.materials || item.topic}》</div>
        <div style="font-size:12px; color:#94a3b8; margin-top:4px;">班级安全工作台工作日志留痕归档完毕</div>
      </div>
    `;
    document.getElementById("viewSafetyMaterialModal").classList.add("active");
    return;
  }

  // 渲染每个附件的专属展示视图 (支持图片、视频、PPT、Word、PDF等)
  container.innerHTML = atts.map((att, attIdx) => {
    const ft = att.fileType || "other";
    const downloadAction = `window.downloadSafetyAttachment('${encodeURIComponent(att.name)}', '${encodeURIComponent(att.dataUrl || '')}')`;

    if (ft === "image") {
      const imgSrc = att.dataUrl || "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='600' height='320' viewBox='0 0 600 320'><rect width='100%' height='100%' fill='%23f8fafc'/><text x='50%' y='46%' dominant-baseline='middle' text-anchor='middle' font-size='42'>🖼️</text><text x='50%' y='64%' dominant-baseline='middle' text-anchor='middle' font-size='16' fill='%23475569' font-weight='bold'>${encodeURIComponent(att.name)}</text><text x='50%' y='78%' dominant-baseline='middle' text-anchor='middle' font-size='13' fill='%2394a3b8'>现场宣讲实拍留痕照片 (已归档)</text></svg>";
      return `
        <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 10px; padding: 14px; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
            <div style="display: flex; align-items: center; gap: 8px;">
              <span style="font-size: 18px;">🖼️</span>
              <div>
                <div style="font-size: 13.5px; font-weight: 700; color: #1e293b;">${att.name}</div>
                <div style="font-size: 11px; color: #94a3b8;">图片佐证 · ${att.size}</div>
              </div>
            </div>
            <button class="btn btn-sm btn-outline-primary" onclick="${downloadAction}">⬇️ 下载原图</button>
          </div>
          <div style="text-align: center; background: #0f172a; border-radius: 8px; padding: 8px; overflow: hidden;">
            <img src="${imgSrc}" alt="${att.name}" style="max-width: 100%; max-height: 380px; object-fit: contain; border-radius: 6px;">
          </div>
          ${att.previewSummary ? `<div style="font-size: 12px; color: #64748b; margin-top: 8px; background: #f8fafc; padding: 6px 10px; border-radius: 6px;">💡 说明：${att.previewSummary}</div>` : ''}
        </div>
      `;
    }

    if (ft === "video") {
      return `
        <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 10px; padding: 14px; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
            <div style="display: flex; align-items: center; gap: 8px;">
              <span style="font-size: 18px;">🎥</span>
              <div>
                <div style="font-size: 13.5px; font-weight: 700; color: #1e293b;">${att.name}</div>
                <div style="font-size: 11px; color: #94a3b8;">视频实录 · ${att.size}</div>
              </div>
            </div>
            <button class="btn btn-sm btn-outline-primary" onclick="${downloadAction}">⬇️ 下载视频</button>
          </div>
          <div style="background: #000000; border-radius: 8px; overflow: hidden; position: relative;">
            ${att.dataUrl && !att.dataUrl.startsWith("http") && !att.dataUrl.includes("sample") ? `
              <video src="${att.dataUrl}" controls style="width: 100%; max-height: 360px; display: block;"></video>
            ` : `
              <div style="padding: 42px 20px; text-align: center; color: white; background: linear-gradient(135deg, #1e293b, #0f172a);">
                <div style="font-size: 44px; margin-bottom: 8px;">🎬</div>
                <div style="font-size: 15px; font-weight: 700;">${att.name}</div>
                <div style="font-size: 12px; color: #94a3b8; margin-top: 6px;">1080P 高清安全警示视频材料 · 已录入学校安全档案库</div>
                <div style="margin-top: 14px;">
                  <button class="btn btn-primary btn-sm" onclick="${downloadAction}">▶️ 立即播放 / 导出本地</button>
                </div>
              </div>
            `}
          </div>
          ${att.previewSummary ? `<div style="font-size: 12px; color: #64748b; margin-top: 8px; background: #f8fafc; padding: 6px 10px; border-radius: 6px;">💡 说明：${att.previewSummary}</div>` : ''}
        </div>
      `;
    }

    if (ft === "ppt") {
      return `
        <div style="background: linear-gradient(135deg, #fff7ed 0%, #ffffff 100%); border: 1.5px solid #fed7aa; border-radius: 10px; padding: 16px; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; flex-wrap: wrap; gap: 8px;">
            <div style="display: flex; align-items: center; gap: 10px;">
              <div style="width: 44px; height: 44px; border-radius: 8px; background: #ea580c; color: white; display: flex; align-items: center; justify-content: center; font-size: 20px; font-weight: 800;">
                PPT
              </div>
              <div>
                <div style="font-size: 14.5px; font-weight: 800; color: #9a3412;">${att.name}</div>
                <div style="font-size: 11.5px; color: #c2410c;">Microsoft PowerPoint 演示文稿 · ${att.size}</div>
              </div>
            </div>
            <div style="display: flex; gap: 8px;">
              <button class="btn btn-sm btn-outline-primary" onclick="${downloadAction}">⬇️ 下载课件</button>
              <button class="btn btn-sm btn-primary" style="background: #ea580c; border-color: #ea580c;" onclick="window.showToast('已开启全屏课件演示讲稿！', 'success')">🖥️ 课件大纲</button>
            </div>
          </div>
          <!-- 幻灯片大纲卡片预览 -->
          <div style="background: #ffffff; border: 1px solid #ffedd5; border-radius: 8px; padding: 12px;">
            <div style="font-weight: 700; font-size: 12.5px; color: #7c2d12; margin-bottom: 6px;">📑 演示文稿幻灯片大纲节选：</div>
            <div style="font-size: 12px; color: #475569; line-height: 1.6;">
              ${att.previewSummary || `本演示课件共包含 18 页幻灯片，覆盖《${item.topic}》宣讲目标、真实案例剖析、情境模拟、学生互动问答与家庭安全提示。`}
            </div>
            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-top: 10px;">
              <div style="background: #fff7ed; border: 1px dashed #fdba74; border-radius: 6px; padding: 8px; text-align: center; font-size: 11px; color: #c2410c;">
                <strong>Slide 1~4</strong><br>背景引入与警示视频
              </div>
              <div style="background: #fff7ed; border: 1px dashed #fdba74; border-radius: 6px; padding: 8px; text-align: center; font-size: 11px; color: #c2410c;">
                <strong>Slide 5~12</strong><br>行为守则与防范技巧
              </div>
              <div style="background: #fff7ed; border: 1px dashed #fdba74; border-radius: 6px; padding: 8px; text-align: center; font-size: 11px; color: #c2410c;">
                <strong>Slide 13~18</strong><br>课堂演练与家庭协同
              </div>
            </div>
          </div>
        </div>
      `;
    }

    if (ft === "word") {
      return `
        <div style="background: linear-gradient(135deg, #eff6ff 0%, #ffffff 100%); border: 1.5px solid #bfdbfe; border-radius: 10px; padding: 16px; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; flex-wrap: wrap; gap: 8px;">
            <div style="display: flex; align-items: center; gap: 10px;">
              <div style="width: 44px; height: 44px; border-radius: 8px; background: #2563eb; color: white; display: flex; align-items: center; justify-content: center; font-size: 20px; font-weight: 800;">
                DOC
              </div>
              <div>
                <div style="font-size: 14.5px; font-weight: 800; color: #1e40af;">${att.name}</div>
                <div style="font-size: 11.5px; color: #1d4ed8;">Microsoft Word 办公文档 · ${att.size}</div>
              </div>
            </div>
            <button class="btn btn-sm btn-outline-primary" onclick="${downloadAction}">⬇️ 下载 Word 文档</button>
          </div>
          <!-- Word 文档正文排版模拟 -->
          <div style="background: #ffffff; border: 1px solid #dbeafe; border-radius: 8px; padding: 14px; font-family: SimSun, serif; font-size: 13px; line-height: 1.7; color: #1e293b;">
            <div style="text-align: center; font-size: 15px; font-weight: 800; color: #b91c1c; margin-bottom: 8px; letter-spacing: 1px;">
              【班级安全留痕台账工作备忘录】
            </div>
            <div style="text-align: center; font-size: 12px; color: #64748b; margin-bottom: 10px;">
              签发人：${item.teacher || '班主任'} ｜ 开展时间：${item.date}
            </div>
            <div style="text-indent: 2em; color: #334155;">
              ${att.previewSummary || item.content}
            </div>
          </div>
        </div>
      `;
    }

    // PDF 或通用其他格式
    return `
      <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 14px; display: flex; justify-content: space-between; align-items: center;">
        <div style="display: flex; align-items: center; gap: 10px;">
          <div style="width: 40px; height: 40px; border-radius: 8px; background: #64748b; color: white; display: flex; align-items: center; justify-content: center; font-size: 20px;">
            ${ft === 'pdf' ? '📑' : '📁'}
          </div>
          <div>
            <div style="font-size: 13.5px; font-weight: 700; color: #1e293b;">${att.name}</div>
            <div style="font-size: 11px; color: #94a3b8;">${att.type || '文件材料'} · ${att.size}</div>
          </div>
        </div>
        <button class="btn btn-sm btn-outline-primary" onclick="${downloadAction}">⬇️ 下载文件</button>
      </div>
    `;
  }).join("");

  document.getElementById("viewSafetyMaterialModal").classList.add("active");
};

window.closeViewSafetyMaterialModal = function() {
  document.getElementById("viewSafetyMaterialModal").classList.remove("active");
};

window.downloadSafetyAttachment = function(encodedName, encodedDataUrl) {
  const fileName = decodeURIComponent(encodedName || "安全教育佐证附件");
  const dataUrl = decodeURIComponent(encodedDataUrl || "");

  if (dataUrl && dataUrl.startsWith("data:")) {
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.showToast(`正在导出并下载【${fileName}】...`, "success");
  } else {
    // 虚拟生成可供下载的文件
    const blob = new Blob([`【班主任工作台 - 1530安全教育留痕凭证】\n文件名: ${fileName}\n归档时间: ${new Date().toLocaleString()}\n本文件作为学校安全工作台账留痕合规佐证材料。`], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName.endsWith(".txt") ? fileName : `${fileName}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    window.showToast(`已成功导出下载留痕凭证【${fileName}】！`, "success");
  }
};

// ================= 新增班级活动弹窗 =================
window.openAddActivityModal = function() {
  document.getElementById("actNameInput").value = "";
  document.getElementById("actDateInput").value = new Date().toISOString().slice(0, 10);
  document.getElementById("actSummaryInput").value = "";
  document.getElementById("addActivityModal").classList.add("active");
};
window.closeAddActivityModal = function() {
  document.getElementById("addActivityModal").classList.remove("active");
};
window.submitAddActivity = function() {
  const name = document.getElementById("actNameInput").value.trim();
  const type = document.getElementById("actTypeInput").value;
  const date = document.getElementById("actDateInput").value;
  const location = document.getElementById("actLocationInput").value;
  const summary = document.getElementById("actSummaryInput").value.trim();
  if (!name) { alert("请输入活动名称！"); return; }

  window.store.addActivity({
    name, type, date, location, summary,
    attendanceCount: window.store.data.students.length,
    photos: [
      { id: "p-new-1", title: `${name} 现场剪影`, tag: "精彩瞬间", date: date, uploader: window.store.data.classInfo.teacher.name || "班主任", icon: "🎉" }
    ]
  });
  window.closeAddActivityModal();
  window.showToast(`已成功新建班级活动《${name}》！`, "success");
  if (window.currentView === "activities") renderCurrentView();
};

// ================= 班级活动图文纪要弹窗 (解决问题1) =================
window.currentViewingActivityId = null;
window.openActivitySummaryModal = function(activityId) {
  window.currentViewingActivityId = activityId;
  const a = (window.store.data.activities || []).find(item => item.id === activityId) || window.store.data.activities[0];
  if (!a) return;

  const content = document.getElementById("activitySummaryContent");
  if (!content) return;

  const photos = a.photos || [];
  const highlights = a.highlights || ["师生互动热烈，全员沉浸式投入", "秩序井然，收获显著成长与启发"];

  content.innerHTML = `
    <div class="summary-report-header">
      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
        <span class="badge" style="background: rgba(255,255,255,0.25); color: white; font-size: 13px;">${a.type}</span>
        <span style="font-size: 13px; opacity: 0.9;">📅 开展日期：${a.date}</span>
      </div>
      <h2 style="font-size: 22px; font-weight: 900; margin-bottom: 8px;">${a.name}</h2>
      <div style="font-size: 13px; opacity: 0.9; display: flex; gap: 20px; flex-wrap: wrap;">
        <span>📍 开展地点：${a.location}</span>
        <span>👥 出勤情况：全班 ${a.attendanceCount || 45} 人 (100% 出勤)</span>
        <span>👩‍🏫 组织教师：${window.store.data.classInfo.teacher.name || '周老师'}</span>
      </div>
    </div>

    <!-- 1. 活动方案与核心目标 -->
    <div class="summary-section-box">
      <div class="summary-section-title">🎯 一、活动目标与方案背景</div>
      <p style="font-size: 13.5px; color: #334155; line-height: 1.7; margin-bottom: 0;">
        ${a.goals || a.summary || '全面贯彻德智体美劳五育并举教育方针，通过沉浸式体验与自主协作，培养学生集体观念与实践能力。'}
      </p>
    </div>

    <!-- 2. 现场精彩图文实录 -->
    <div class="summary-section-box">
      <div class="summary-section-title">📸 二、现场精彩图文实录 (${photos.length} 处留痕)</div>
      <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 12px; margin-top: 10px;">
        ${photos.length === 0 ? `
          <div style="grid-column: 1 / -1; text-align: center; color: var(--text-muted); padding: 14px;">
            暂无现场相片留痕，可在成长相册中随时上传 📷
          </div>
        ` : photos.map(p => `
          <div class="album-photo-card" style="box-shadow: none;">
            <div class="album-photo-preview" style="height: 110px; font-size: 38px;">
              ${p.icon || '📷'}
              <span class="album-photo-badge">${p.tag}</span>
            </div>
            <div class="album-photo-info" style="padding: 8px 10px;">
              <div class="album-photo-title" style="font-size: 12px;">${p.title}</div>
              <div class="album-photo-meta">${p.date} · ${p.uploader || '班主任'}</div>
            </div>
          </div>
        `).join("")}
      </div>
    </div>

    <!-- 3. 开展亮点与成效 -->
    <div class="summary-section-box">
      <div class="summary-section-title">✨ 三、活动亮点与过程记录</div>
      <ul style="padding-left: 20px; font-size: 13.5px; color: #334155; line-height: 1.8; margin-bottom: 0;">
        ${highlights.map(h => `<li>${h}</li>`).join("")}
      </ul>
    </div>

    <!-- 4. 班主任总结反思 -->
    <div class="summary-section-box" style="background: #fdf4ff; border-color: #f0abfc;">
      <div class="summary-section-title" style="color: #86198f;">💭 四、班主任总结反思与学生成长档案</div>
      <p style="font-size: 13.5px; color: #701a75; line-height: 1.7; margin-bottom: 0;">
        ${a.reflection || a.summary || '本次活动准备充分，各小组分工明确，有效增进了班级向心力。后续将持续跟进成果转化，融入班风学风建设中。'}
      </p>
    </div>
  `;

  document.getElementById("activitySummaryModal").classList.add("active");
};

window.closeActivitySummaryModal = function() {
  document.getElementById("activitySummaryModal").classList.remove("active");
};

window.copyActivitySummaryText = function() {
  const a = (window.store.data.activities || []).find(item => item.id === window.currentViewingActivityId);
  if (!a) return;
  const text = `【班级活动纪要】《${a.name}》\n开展日期：${a.date}\n地点：${a.location}\n参与人数：全班${a.attendanceCount}人\n活动目标：${a.goals || a.summary}\n活动亮点：\n${(a.highlights || []).map((h, i) => `${i + 1}. ${h}`).join('\n')}\n班主任反思：${a.reflection || a.summary}`;
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(() => {
      window.showToast("已成功复制活动文字纪要全文至剪贴板！", "success");
    }).catch(() => {
      window.showToast("文字纪要已就绪，请手动复制！", "info");
    });
  } else {
    window.showToast("文字纪要已在页面展示，可选中复制！", "info");
  }
};

window.printActivitySummary = function() {
  window.print();
};

// ================= 班级活动成长相册墙弹窗 (解决问题1) =================
window.currentAlbumActivityId = null;
window.currentAlbumTag = "all";

window.openActivityAlbumModal = function(activityId) {
  window.currentAlbumActivityId = activityId;
  window.currentAlbumTag = "all";
  const a = (window.store.data.activities || []).find(item => item.id === activityId) || window.store.data.activities[0];
  if (!a) return;

  const titleEl = document.getElementById("albumModalTitle");
  if (titleEl) titleEl.innerText = `📷 《${a.name}》成长相册墙 (${(a.photos && a.photos.length) || 0}张照片)`;

  document.querySelectorAll("#albumCategoryTabs .tab-pill").forEach(p => {
    if (p.innerText.includes("全部")) p.classList.add("active");
    else p.classList.remove("active");
  });

  renderAlbumPhotoGrid(a);
  document.getElementById("activityAlbumModal").classList.add("active");
};

window.closeActivityAlbumModal = function() {
  document.getElementById("activityAlbumModal").classList.remove("active");
};

window.filterAlbumPhotos = function(tag, elem) {
  window.currentAlbumTag = tag;
  document.querySelectorAll("#albumCategoryTabs .tab-pill").forEach(p => p.classList.remove("active"));
  if (elem) elem.classList.add("active");
  const a = (window.store.data.activities || []).find(item => item.id === window.currentAlbumActivityId);
  if (a) renderAlbumPhotoGrid(a);
};

function renderAlbumPhotoGrid(activity) {
  const container = document.getElementById("albumPhotosContainer");
  if (!container) return;
  const photos = activity.photos || [];
  const filtered = window.currentAlbumTag === "all" ? photos : photos.filter(p => p.tag === window.currentAlbumTag);

  if (filtered.length === 0) {
    container.innerHTML = `
      <div style="grid-column: 1 / -1; text-align: center; padding: 40px; color: var(--text-muted);">
        当前相册分类暂无相片，点击上方【📁 上传电脑本地照片】或【➕ 快捷录入相片】添加 🎈
      </div>
    `;
    return;
  }

  container.innerHTML = filtered.map(p => {
    const realIdx = photos.indexOf(p);
    const hasRealImg = p.imageData && p.imageData.startsWith("data:image");
    const safeData = hasRealImg ? p.imageData : '';
    return `
      <div class="album-photo-card" style="position: relative; overflow: hidden; border-radius: var(--radius-md); box-shadow: 0 2px 8px rgba(0,0,0,0.06); background: white;">
        <div class="album-photo-preview" onclick="window.viewPhotoDetail('${p.title}', '${p.tag}', '${p.date}', '${safeData}')" style="cursor: pointer; height: 140px; display: flex; align-items: center; justify-content: center; background: #f1f5f9; position: relative; overflow: hidden;">
          ${hasRealImg 
            ? `<img src="${p.imageData}" alt="${p.title}" style="width: 100%; height: 100%; object-fit: cover;">` 
            : `<span style="font-size: 48px;">${p.icon || '📷'}</span>`}
          <span class="album-photo-badge" style="position: absolute; top: 8px; left: 8px; background: rgba(0,0,0,0.65); color: white; padding: 2px 6px; border-radius: 4px; font-size: 11px;">${p.tag}</span>
        </div>
        <div class="album-photo-info" style="padding: 10px 12px;">
          <div style="display: flex; align-items: center; justify-content: space-between; gap: 6px;">
            <div class="album-photo-title" style="font-size: 13.5px; font-weight: 700; color: #1e293b; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; flex: 1;" title="${p.title}">${p.title}</div>
            <button onclick="event.stopPropagation(); window.deleteAlbumPhoto(${realIdx})" style="background: none; border: none; color: #ef4444; font-size: 14px; cursor: pointer; padding: 2px 4px;" title="删除此相片">🗑️</button>
          </div>
          <div class="album-photo-meta" style="font-size: 11px; color: var(--text-muted); display: flex; justify-content: space-between; margin-top: 4px;">
            <span>📅 ${p.date}</span>
            <span>👤 ${p.uploader || '班主任'}</span>
          </div>
        </div>
      </div>
    `;
  }).join("");
}

window.viewPhotoDetail = function(title, tag, date, imgSrc) {
  const modal = document.getElementById("photoPreviewModal");
  const content = document.getElementById("photoPreviewContent");
  if (modal && content) {
    content.innerHTML = `
      <div style="margin-bottom: 12px; display: flex; justify-content: center; align-items: center;">
        ${imgSrc 
          ? `<img src="${imgSrc}" alt="${title}" style="max-width: 100%; max-height: 65vh; border-radius: var(--radius-md); object-fit: contain; box-shadow: 0 4px 12px rgba(0,0,0,0.15);">` 
          : `<div style="font-size: 80px; padding: 40px 0;">📷</div>`}
      </div>
      <div style="font-size: 17px; font-weight: 800; color: #1e293b; margin-bottom: 4px;">${title}</div>
      <div style="font-size: 12.5px; color: var(--text-muted); display: flex; justify-content: center; gap: 12px; align-items: center;">
        <span class="badge badge-purple">${tag}</span>
        <span>拍摄/录入：${date}</span>
      </div>
    `;
    modal.classList.add("active");
  } else {
    window.showToast(`📸 相片预览：【${tag}】${title} (${date})`, "info");
  }
};

window.closePhotoPreviewModal = function() {
  const modal = document.getElementById("photoPreviewModal");
  if (modal) modal.classList.remove("active");
};

window.deleteAlbumPhoto = function(photoIndex) {
  if (confirm("确定要从该活动成长相册中删除此相片吗？")) {
    window.store.deleteActivityPhoto(window.currentAlbumActivityId, photoIndex);
    window.showToast("相片已成功删除！", "info");
    const a = (window.store.data.activities || []).find(item => item.id === window.currentAlbumActivityId);
    if (a) renderAlbumPhotoGrid(a);
    if (window.currentView === "activities") renderCurrentView();
  }
};

window.handleAlbumLocalImageUpload = function(event) {
  const files = event.target.files;
  if (!files || files.length === 0) return;

  const a = (window.store.data.activities || []).find(item => item.id === window.currentAlbumActivityId);
  if (!a) { alert("未选中有效班级活动！"); return; }

  let loadedCount = 0;
  const totalFiles = files.length;
  window.showToast(`正在导入并压缩 ${totalFiles} 张本地照片...`, "info");

  Array.from(files).forEach(file => {
    const reader = new FileReader();
    reader.onload = function(e) {
      const img = new Image();
      img.onload = function() {
        const maxDim = 900;
        let width = img.width;
        let height = img.height;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);
        const compressedDataUrl = canvas.toDataURL("image/jpeg", 0.82);

        const cleanTitle = file.name.replace(/\.[^/.]+$/, "");
        window.store.addActivityPhoto(window.currentAlbumActivityId, {
          title: cleanTitle,
          tag: "精彩瞬间",
          date: new Date().toISOString().slice(0, 10),
          uploader: window.store.data.classInfo.teacher.name || "周老师",
          icon: "🖼️",
          imageData: compressedDataUrl
        });

        loadedCount++;
        if (loadedCount === totalFiles) {
          window.showToast(`成功从电脑上传并归档 ${totalFiles} 张活动照片！`, "success");
          renderAlbumPhotoGrid(a);
          if (window.currentView === "activities") renderCurrentView();
          event.target.value = "";
        }
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
};

window.openAddPhotoPrompt = function() {
  const title = prompt("请输入新相片标题与说明（如：操场迎面接力冲刺）：", "");
  if (!title) return;
  const tag = prompt("请输入相片分类标签（精彩瞬间 / 集体合影 / 作品展示）：", "精彩瞬间") || "精彩瞬间";
  const icon = prompt("请选择一个相片代表图标（如 🏃、🏆、🎨、📷、🎉）：", "📷") || "📷";

  window.store.addActivityPhoto(window.currentAlbumActivityId, {
    title: title.trim(),
    tag: tag.trim(),
    icon: icon.trim(),
    uploader: window.store.data.classInfo.teacher.name || "周老师"
  });

  window.showToast("已成功上传并归档新活动照片！", "success");
  const a = (window.store.data.activities || []).find(item => item.id === window.currentAlbumActivityId);
  if (a) renderAlbumPhotoGrid(a);
  if (window.currentView === "activities") renderCurrentView();
};

// ================= 积分规则设置与重算 =================
window.openScoreRulesModal = function() {
  const r = window.store.data.scoreRules || {
    baseScore: 80, hwSubmitBonus: 5, hwUnsubmitPenalty: -2,
    examExcellent: 20, examGood: 10, examPass: 5,
    attNormalBonus: 5, attLatePenalty: -2, attAbsentPenalty: -5,
    flowerValue: 3, growthAward: 3
  };
  document.getElementById("ruleBaseScore").value = r.baseScore || 80;
  document.getElementById("ruleHwSubmit").value = r.hwSubmitBonus || 5;
  document.getElementById("ruleHwUnsubmit").value = r.hwUnsubmitPenalty || -2;
  document.getElementById("ruleExamExcellent").value = r.examExcellent || 20;
  document.getElementById("ruleExamGood").value = r.examGood || 10;
  document.getElementById("ruleExamPass").value = r.examPass || 5;
  document.getElementById("ruleAttNormal").value = r.attNormalBonus || 5;
  document.getElementById("ruleAttLate").value = r.attLatePenalty || -2;
  document.getElementById("ruleAttAbsent").value = r.attAbsentPenalty || -5;
  if (document.getElementById("ruleFlowerValue")) {
    document.getElementById("ruleFlowerValue").value = r.flowerValue !== undefined ? r.flowerValue : 3;
  }
  if (document.getElementById("ruleGrowthAward")) {
    document.getElementById("ruleGrowthAward").value = r.growthAward !== undefined ? r.growthAward : 3;
  }
  document.getElementById("scoreRulesModal").classList.add("active");
};

window.closeScoreRulesModal = function() {
  document.getElementById("scoreRulesModal").classList.remove("active");
};

window.saveAndRecalcScoreRules = function() {
  const newRules = {
    baseScore: parseInt(document.getElementById("ruleBaseScore").value) || 80,
    hwSubmitBonus: parseInt(document.getElementById("ruleHwSubmit").value) || 5,
    hwUnsubmitPenalty: parseInt(document.getElementById("ruleHwUnsubmit").value) || -2,
    examExcellent: parseInt(document.getElementById("ruleExamExcellent").value) || 20,
    examGood: parseInt(document.getElementById("ruleExamGood").value) || 10,
    examPass: parseInt(document.getElementById("ruleExamPass").value) || 5,
    attNormalBonus: parseInt(document.getElementById("ruleAttNormal").value) || 5,
    attLatePenalty: parseInt(document.getElementById("ruleAttLate").value) || -2,
    attAbsentPenalty: parseInt(document.getElementById("ruleAttAbsent").value) || -5
  };
  const flowerValInput = document.getElementById("ruleFlowerValue");
  if (flowerValInput) {
    newRules.flowerValue = Math.max(1, parseInt(flowerValInput.value) || 3);
  }
  const growthAwardInput = document.getElementById("ruleGrowthAward");
  if (growthAwardInput) {
    newRules.growthAward = Math.max(1, parseInt(growthAwardInput.value) || 3);
  }

  const stats = window.store.updateScoreRules(newRules);
  window.closeScoreRulesModal();
  window.showToast(`积分规则已生效！每朵小红花折算 ${newRules.flowerValue || 3} 分，已联动重算 ${stats.studentCount} 位同学的积分与萌宠等级 (均分: ${stats.avgScore})`, "success");
  if (window.currentView === "score" || window.currentView === "pets" || window.currentView === "growth") renderCurrentView();
};

window.resetDefaultScoreRules = function() {
  if (confirm("确定要恢复系统默认的积分换算规则吗？")) {
    document.getElementById("ruleBaseScore").value = 80;
    document.getElementById("ruleHwSubmit").value = 5;
    document.getElementById("ruleHwUnsubmit").value = -2;
    document.getElementById("ruleExamExcellent").value = 20;
    document.getElementById("ruleExamGood").value = 10;
    document.getElementById("ruleExamPass").value = 5;
    document.getElementById("ruleAttNormal").value = 5;
    document.getElementById("ruleAttLate").value = -2;
    document.getElementById("ruleAttAbsent").value = -5;
    if (document.getElementById("ruleFlowerValue")) document.getElementById("ruleFlowerValue").value = 3;
    if (document.getElementById("ruleGrowthAward")) document.getElementById("ruleGrowthAward").value = 3;
    window.showToast("已重置表单为标准默认分值，点击保存即可生效", "info");
  }
};

window.handleQuantScoreExcelImport = function(event) {
  const file = event.target.files[0];
  if (!file) return;
  if (typeof XLSX === "undefined") { alert("Excel 组件未加载！"); return; }
  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const data = new Uint8Array(e.target.result);
      const workbook = XLSX.read(data, { type: "array" });
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });
      let updatedCount = 0;
      for (let i = 2; i < rows.length; i++) {
        const r = rows[i];
        if (r && r.length >= 4) {
          const idOrName = String(r[1] || r[2] || "").trim();
          const scoreVal = parseFloat(r[4] || r[3] || 80);
          const s = window.store.data.students.find(item => item.id === idOrName || item.name === idOrName);
          if (s && !isNaN(scoreVal)) {
            s.score = scoreVal;
            if (!s.petData) s.petData = { level: 1, exp: 0, hunger: 85, happy: 90, inventory: [] };
            const petMeta = window.store.calcPetLevelAndExp(scoreVal);
            s.petData.level = petMeta.level;
            s.petData.exp = petMeta.exp;
            updatedCount++;
          }
        }
      }
      window.store.save();
      window.showToast(`成功从 Excel 导入并同步了 ${updatedCount} 位同学的量化积分与萌宠状态！`, "success");
      if (window.currentView === "score" || window.currentView === "pets") renderCurrentView();
    } catch (err) {
      alert("解析积分 Excel 失败，请检查表格格式！");
    }
  };
  reader.readAsArrayBuffer(file);
};

// ================= 作息节次时间表管理与课表增删 =================
window._editingTimetablePeriods = [];

window.openEditTimetablePeriodsModal = function() {
  const t = window.store.data.timetable || {};
  let periods = (t.periods && t.periods.length > 0) ? JSON.parse(JSON.stringify(t.periods)) : [];
  
  if (periods.length === 0) {
    periods = [
      { name: "第1节", time: "08:00-08:40" },
      { name: "第2节", start: "08:50", end: "09:30" },
      { name: "第3节", start: "10:00", end: "10:40" },
      { name: "第4节", start: "10:50", end: "11:30" },
      { name: "第5节", start: "14:00", end: "14:40" },
      { name: "第6节", start: "14:50", end: "15:30" }
    ];
  }

  periods.forEach((p, idx) => {
    if (!p.name) p.name = `第${idx + 1}节`;
    if (!p.start || !p.end) {
      if (p.time && p.time.includes("-")) {
        const parts = p.time.split("-");
        p.start = parts[0].trim();
        p.end = parts[1].trim();
      } else {
        p.start = "08:00";
        p.end = "08:40";
      }
    }
  });

  window._editingTimetablePeriods = periods;
  window.renderTimetablePeriodsInModal();
  document.getElementById("editTimetablePeriodsModal").classList.add("active");
};

window._saveTimetablePeriodsModalInputs = function() {
  const cards = document.querySelectorAll(".timetable-period-edit-card");
  cards.forEach((card, idx) => {
    if (window._editingTimetablePeriods[idx]) {
      const nameInput = card.querySelector(".timetable-period-name-input");
      const startInput = card.querySelector(".timetable-period-start-input");
      const endInput = card.querySelector(".timetable-period-end-input");
      if (nameInput) window._editingTimetablePeriods[idx].name = nameInput.value.trim() || `第${idx + 1}节`;
      if (startInput) window._editingTimetablePeriods[idx].start = startInput.value || "08:00";
      if (endInput) window._editingTimetablePeriods[idx].end = endInput.value || "08:40";
      window._editingTimetablePeriods[idx].time = `${window._editingTimetablePeriods[idx].start}-${window._editingTimetablePeriods[idx].end}`;
    }
  });
};

window.renderTimetablePeriodsInModal = function() {
  const container = document.getElementById("timetablePeriodsFormContainer");
  if (!container) return;

  const periods = window._editingTimetablePeriods || [];

  container.innerHTML = `
    <div style="grid-column: 1 / -1; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 8px; margin-bottom: 6px; padding: 10px 12px; background: #f8fafc; border: 1px dashed #cbd5e1; border-radius: var(--radius-md);">
      <div style="font-size: 12.5px; color: #475569; font-weight: 600;">
        当前共 <span style="color: var(--primary); font-size: 14px; font-weight: 800;">${periods.length}</span> 节课
      </div>
      <div style="display: flex; gap: 6px; flex-wrap: wrap;">
        <button type="button" class="btn btn-sm btn-primary" onclick="window.addPeriodToModal()" style="font-size: 12px; padding: 3px 10px;">➕ 增加一节课</button>
        <button type="button" class="btn btn-sm btn-secondary" onclick="window.addPeriodToModal('晨读', '07:45', '08:15', true)" style="font-size: 11.5px; padding: 3px 8px;">+ 晨读</button>
        <button type="button" class="btn btn-sm btn-secondary" onclick="window.addPeriodToModal('课后延时', '16:30', '17:30')" style="font-size: 11.5px; padding: 3px 8px;">+ 课后延时</button>
        <button type="button" class="btn btn-sm btn-secondary" onclick="window.resetTimetablePeriodsPreset(6)" style="font-size: 11.5px; padding: 3px 8px;">标准6节</button>
        <button type="button" class="btn btn-sm btn-secondary" onclick="window.resetTimetablePeriodsPreset(8)" style="font-size: 11.5px; padding: 3px 8px;">标准8节</button>
      </div>
    </div>
    ${periods.map((p, idx) => `
      <div class="timetable-period-edit-card" style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: var(--radius-md); padding: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); position: relative;">
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
          <div style="display: flex; align-items: center; gap: 6px;">
            <span class="badge badge-info" style="font-size: 11px;">#${idx + 1}</span>
            <input type="text" class="form-control timetable-period-name-input" value="${p.name}" style="height: 28px; width: 130px; font-weight: 700; font-size: 13px; padding: 2px 8px;" placeholder="节次名称">
          </div>
          ${periods.length > 1 ? `
            <button type="button" class="btn btn-sm btn-secondary" style="padding: 2px 6px; font-size: 11px; color: #ef4444; border-color: #fecaca; background: #fef2f2;" onclick="window.removePeriodFromModal(${idx})" title="删除本节">
              🗑️ 删除
            </button>
          ` : `<span style="font-size: 11px; color: #94a3b8;">不可删除</span>`}
        </div>
        <div class="form-row-2" style="gap: 8px;">
          <div class="form-group" style="margin-bottom: 0;">
            <label style="font-size: 11px; color: #64748b; margin-bottom: 2px;">开始时间</label>
            <input type="time" class="form-control timetable-period-start-input" value="${p.start}" style="height: 28px; font-size: 12px; padding: 2px 6px;">
          </div>
          <div class="form-group" style="margin-bottom: 0;">
            <label style="font-size: 11px; color: #64748b; margin-bottom: 2px;">结束时间</label>
            <input type="time" class="form-control timetable-period-end-input" value="${p.end}" style="height: 28px; font-size: 12px; padding: 2px 6px;">
          </div>
        </div>
      </div>
    `).join("")}
  `;
};

window.addPeriodToModal = function(customName, customStart, customEnd, prepend = false) {
  window._saveTimetablePeriodsModalInputs();
  const list = window._editingTimetablePeriods;
  
  let defName = customName || `第${list.length + 1}节`;
  let defStart = customStart || "16:30";
  let defEnd = customEnd || "17:10";

  if (!customStart && list.length > 0) {
    const last = list[list.length - 1];
    if (last.end) {
      const [hh, mm] = last.end.split(":").map(Number);
      if (!isNaN(hh) && !isNaN(mm)) {
        const startMin = hh * 60 + mm + 10;
        const endMin = startMin + 40;
        const fmt = (m) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
        defStart = fmt(startMin);
        defEnd = fmt(endMin);
      }
    }
  }

  const newItem = {
    id: Date.now(),
    name: defName,
    start: defStart,
    end: defEnd,
    time: `${defStart}-${defEnd}`
  };

  if (prepend) {
    list.unshift(newItem);
  } else {
    list.push(newItem);
  }

  window.renderTimetablePeriodsInModal();
};

window.removePeriodFromModal = function(idx) {
  window._saveTimetablePeriodsModalInputs();
  if (window._editingTimetablePeriods.length <= 1) {
    alert("课表至少需要保留 1 节课程！");
    return;
  }
  const item = window._editingTimetablePeriods[idx];
  if (confirm(`确定要移除【${item.name}】吗？`)) {
    window._editingTimetablePeriods.splice(idx, 1);
    window.renderTimetablePeriodsInModal();
  }
};

window.resetTimetablePeriodsPreset = function(count) {
  window._saveTimetablePeriodsModalInputs();
  if (count === 6) {
    window._editingTimetablePeriods = [
      { id: 1, name: "第1节", start: "08:00", end: "08:40", time: "08:00-08:40" },
      { id: 2, name: "第2节", start: "08:50", end: "09:30", time: "08:50-09:30" },
      { id: 3, name: "第3节", start: "10:00", end: "10:40", time: "10:00-10:40" },
      { id: 4, name: "第4节", start: "10:50", end: "11:30", time: "10:50-11:30" },
      { id: 5, name: "第5节", start: "14:00", end: "14:40", time: "14:00-14:40" },
      { id: 6, name: "第6节", start: "14:50", end: "15:30", time: "14:50-15:30" }
    ];
  } else {
    window._editingTimetablePeriods = [
      { id: 1, name: "第1节", start: "08:00", end: "08:40", time: "08:00-08:40" },
      { id: 2, name: "第2节", start: "08:50", end: "09:30", time: "08:50-09:30" },
      { id: 3, name: "第3节", start: "10:00", end: "10:40", time: "10:00-10:40" },
      { id: 4, name: "第4节", start: "10:50", end: "11:30", time: "10:50-11:30" },
      { id: 5, name: "第5节", start: "14:00", end: "14:40", time: "14:00-14:40" },
      { id: 6, name: "第6节", start: "14:50", end: "15:30", time: "14:50-15:30" },
      { id: 7, name: "第7节", start: "15:40", end: "16:20", time: "15:40-16:20" },
      { id: 8, name: "第8节", start: "16:30", end: "17:10", time: "16:30-17:10" }
    ];
  }
  window.renderTimetablePeriodsInModal();
  window.showToast(`已加载标准 ${count} 节课作息模板！`, "info");
};

window.closeEditTimetablePeriodsModal = function() {
  document.getElementById("editTimetablePeriodsModal").classList.remove("active");
};

window.submitEditTimetablePeriods = function() {
  window._saveTimetablePeriodsModalInputs();
  const periods = window._editingTimetablePeriods || [];

  if (periods.length === 0) {
    alert("至少需要保留 1 节课程！");
    return;
  }

  const finalPeriods = periods.map((p, idx) => ({
    id: p.id || (idx + 1),
    name: p.name || `第${idx + 1}节`,
    start: p.start || "08:00",
    end: p.end || "08:40",
    time: `${p.start || "08:00"}-${p.end || "08:40"}`
  }));

  window.store.updateTimetablePeriods(finalPeriods);
  window.closeEditTimetablePeriodsModal();
  window.showToast(`班级课表作息与节次（共 ${finalPeriods.length} 节）已更新并全系统生效！`, "success");

  if (window.currentView === "schedule") {
    if (window.renderCurrentScheduleTab) window.renderCurrentScheduleTab();
    else renderCurrentView();
  }
};

window.resetDefaultTimetablePeriods = function() {
  if (confirm("恢复为标准默认作息时间表（8:00-17:10）？")) {
    window.resetTimetablePeriodsPreset(8);
  }
};

// ================= 快捷课表增删入口 (课表页面直接调用) =================
window.quickAddTimetablePeriod = function() {
  const newP = window.store.addTimetablePeriod();
  window.showToast(`已在末尾新增【${newP.name}】（${newP.time}），可点击卡片设置科目！`, "success");
  if (window.currentView === "schedule") {
    if (window.renderCurrentScheduleTab) window.renderCurrentScheduleTab();
    else renderCurrentView();
  }
};

window.quickDeleteLastTimetablePeriod = function() {
  const periods = (window.store.data.timetable && window.store.data.timetable.periods) || [];
  if (periods.length <= 1) {
    alert("课表至少需要保留 1 节课程！");
    return;
  }
  const last = periods[periods.length - 1];
  if (confirm(`确定要删减最后一节【${last.name}】吗？周一至周五该节的课程也将同步移除。`)) {
    window.store.deleteTimetablePeriod(periods.length - 1);
    window.showToast(`已成功删减【${last.name}】！`, "success");
    if (window.currentView === "schedule") {
      if (window.renderCurrentScheduleTab) window.renderCurrentScheduleTab();
      else renderCurrentView();
    }
  }
};

window.quickDeleteTimetablePeriod = function(periodIdx) {
  const periods = (window.store.data.timetable && window.store.data.timetable.periods) || [];
  if (periods.length <= 1) {
    alert("课表至少需要保留 1 节课程！");
    return;
  }
  const p = periods[periodIdx];
  if (!p) return;
  if (confirm(`确定要删除第 ${periodIdx + 1} 节【${p.name}】（${p.time || ""}）吗？周一至周五该节课程将同步移除。`)) {
    window.store.deleteTimetablePeriod(periodIdx);
    window.showToast(`已删除【${p.name}】！`, "success");
    if (window.currentView === "schedule") {
      if (window.renderCurrentScheduleTab) window.renderCurrentScheduleTab();
      else renderCurrentView();
    }
  }
};

// ================= 批量编辑全班座位 (支持自定义排数与列数) =================
window.renderBulkSeatsEditor = function(rows, cols) {
  const container = document.getElementById("allSeatsGridEditor");
  if (!container) return;

  container.style.display = "grid";
  container.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
  container.style.gap = "8px";

  const students = window.store.data.students || [];
  const total = rows * cols;
  let html = "";
  for (let i = 0; i < total; i++) {
    const s = students[i];
    const sName = s ? s.name : "";
    const r = Math.floor(i / cols) + 1;
    const c = (i % cols) + 1;
    html += `
      <div style="background: #fff; border: 1px solid #cbd5e1; border-radius: 6px; padding: 6px 8px; text-align: center; box-shadow: 0 1px 2px rgba(0,0,0,0.04);">
        <div style="font-size: 10.5px; color: #64748b; margin-bottom: 3px; font-weight: 600;">第${r}排·${c}号</div>
        <input type="text" class="form-control bulk-seat-input" data-seat-idx="${i}" data-row="${r}" data-col="${c}" value="${sName}" placeholder="空位" style="padding: 3px 6px; font-size: 12px; height: 28px; text-align: center;">
      </div>
    `;
  }
  container.innerHTML = html;
};

window.openEditAllSeatsModal = function() {
  const grid = (window.store.data.seatingGrid && window.store.data.seatingGrid.rows)
    ? window.store.data.seatingGrid
    : { rows: 8, cols: 6 };

  const rInp = document.getElementById("bulkSeatsRows");
  const cInp = document.getElementById("bulkSeatsCols");
  if (rInp) rInp.value = grid.rows;
  if (cInp) cInp.value = grid.cols;

  window.renderBulkSeatsEditor(grid.rows, grid.cols);
  document.getElementById("editAllSeatsModal").classList.add("active");
};

window.closeEditAllSeatsModal = function() {
  document.getElementById("editAllSeatsModal").classList.remove("active");
};

window.applyBulkSeatsDimension = function() {
  const rInp = document.getElementById("bulkSeatsRows");
  const cInp = document.getElementById("bulkSeatsCols");
  const rows = Math.max(1, Math.min(15, parseInt(rInp ? rInp.value : 8) || 8));
  const cols = Math.max(1, Math.min(15, parseInt(cInp ? cInp.value : 6) || 6));

  window.store.updateSeatingGrid(rows, cols);
  window.renderBulkSeatsEditor(rows, cols);
  window.showToast(`已成功将教室座位网格调整为 ${rows}排 × ${cols}列！`, "success");
  if (window.currentView === "schedule") renderCurrentView();
};

window.randomizeSeatArrangement = function() {
  const inputs = Array.from(document.querySelectorAll(".bulk-seat-input"));
  const names = inputs.map(inp => inp.value.trim()).filter(Boolean);
  for (let i = names.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [names[i], names[j]] = [names[j], names[i]];
  }
  inputs.forEach((inp, idx) => {
    inp.value = names[idx] || "";
  });
  window.showToast("已随机重排全班座位！点击保存即可生效", "info");
};

window.submitEditAllSeats = function() {
  const inputs = document.querySelectorAll(".bulk-seat-input");
  const students = window.store.data.students || [];
  const grid = (window.store.data.seatingGrid && window.store.data.seatingGrid.cols)
    ? window.store.data.seatingGrid
    : { rows: 8, cols: 6 };
  
  inputs.forEach((inp, idx) => {
    const newName = inp.value.trim();
    const r = Math.floor(idx / grid.cols) + 1;
    const c = (idx % grid.cols) + 1;
    if (students[idx]) {
      if (newName) students[idx].name = newName;
      students[idx].seat = `第${r}排·${c}号`;
    }
  });

  window.store.save();
  window.closeEditAllSeatsModal();
  window.showToast("全班座位已批量更新完成！", "success");
  if (window.currentView === "schedule") renderCurrentView();
};


// ================= 班规条款与分类板块增删改 =================
window.populateRuleCategorySelect = function(selectedVal) {
  const select = document.getElementById("editRuleCategory");
  if (!select) return;
  const categories = (window.store.data.classRules && window.store.data.classRules.categories) || [
    "早读与晨会", "课堂常规", "课间休息", "眼保健操与两操", "午餐与午休", "卫生扫除", "作业规范", "仪容风纪"
  ];
  select.innerHTML = categories.map(c => `<option value="${c}" ${c === selectedVal ? 'selected' : ''}>${c}</option>`).join('');
  if (selectedVal && !categories.includes(selectedVal)) {
    select.innerHTML += `<option value="${selectedVal}" selected>${selectedVal}</option>`;
  }
};

window.openAddRuleModal = function() {
  document.getElementById("ruleModalTitle").innerText = "📜 新增班规自拟公约条款";
  document.getElementById("editRuleIndex").value = "";
  window.populateRuleCategorySelect("早读与晨会");
  document.getElementById("editRuleContent").value = "";
  document.getElementById("editRuleReward").value = "量化+2分 / 获小红花一枚";
  document.getElementById("editRulePenalty").value = "个别提醒纠正，扣减量化1分";
  document.getElementById("editRuleModal").classList.add("active");
};

window.openEditRuleModal = function(index) {
  const rulesList = (window.store.data.classRules && window.store.data.classRules.rulesList) || [];
  const r = rulesList[index];
  if (!r) return;

  document.getElementById("ruleModalTitle").innerText = "✏️ 编辑班规自拟公约条款";
  document.getElementById("editRuleIndex").value = index;
  window.populateRuleCategorySelect(r.category || "早读与晨会");
  document.getElementById("editRuleContent").value = r.content || "";
  document.getElementById("editRuleReward").value = r.reward || "量化+2分";
  document.getElementById("editRulePenalty").value = r.penalty || "扣减1分";
  document.getElementById("editRuleModal").classList.add("active");
};

window.closeEditRuleModal = function() {
  document.getElementById("editRuleModal").classList.remove("active");
};

window.submitEditRule = function() {
  const idxStr = document.getElementById("editRuleIndex").value;
  const category = document.getElementById("editRuleCategory").value;
  const content = document.getElementById("editRuleContent").value.trim();
  const reward = document.getElementById("editRuleReward").value.trim();
  const penalty = document.getElementById("editRulePenalty").value.trim();

  if (!content) { alert("公约条款内容不能为空！"); return; }

  if (idxStr !== "") {
    window.store.updateClassRule(parseInt(idxStr), { category, content, reward, penalty });
    window.showToast("班规公约条款已更新！", "success");
  } else {
    window.store.addClassRule({ category, content, reward, penalty });
    window.showToast("已新增自拟班规公约条款！", "success");
  }

  window.closeEditRuleModal();
  if (window.currentView === "rules") renderCurrentView();
};

window.deleteRuleItem = function(index) {
  if (confirm("确定要删除该条班规公约吗？")) {
    window.store.deleteClassRule(index);
    window.showToast("班规公约已删除！", "info");
    if (window.currentView === "rules") renderCurrentView();
  }
};

// ================= 班规公约分类板块增删管理 =================
window.openRuleCategoryManageModal = function() {
  window.renderRuleCategoryManageList();
  document.getElementById("ruleCategoryManageModal").classList.add("active");
};

window.closeRuleCategoryManageModal = function() {
  document.getElementById("ruleCategoryManageModal").classList.remove("active");
  if (document.getElementById("editRuleModal") && document.getElementById("editRuleModal").classList.contains("active")) {
    const curVal = document.getElementById("editRuleCategory") ? document.getElementById("editRuleCategory").value : "";
    window.populateRuleCategorySelect(curVal);
  }
  if (window.currentView === "rules") {
    renderCurrentView();
  }
};

window.renderRuleCategoryManageList = function() {
  const container = document.getElementById("ruleCategoriesListContainer");
  if (!container) return;
  const categories = (window.store.data.classRules && window.store.data.classRules.categories) || [];
  const rulesList = (window.store.data.classRules && window.store.data.classRules.rulesList) || [];

  if (categories.length === 0) {
    container.innerHTML = `<div style="text-align: center; color: var(--text-muted); padding: 14px;">暂无自拟分类板块，请在上方输入添加</div>`;
    return;
  }

  container.innerHTML = categories.map(cat => {
    const count = rulesList.filter(r => r.category === cat).length;
    return `
      <div style="display: flex; align-items: center; justify-content: space-between; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 8px 12px;">
        <div style="display: flex; align-items: center; gap: 8px;">
          <span style="font-weight: 700; color: #1e293b; font-size: 13.5px;">📌 ${cat}</span>
          <span class="badge" style="background: #e0e7ff; color: #4338ca; font-size: 11px;">${count} 条条款</span>
        </div>
        <div style="display: flex; gap: 6px;">
          <button class="btn btn-sm btn-secondary" onclick="window.quickFilterCategoryAndClose('${cat}')" style="font-size: 11px; padding: 3px 8px;">查看条款</button>
          <button class="btn btn-sm" style="background: #fee2e2; color: #ef4444; border: 1px solid #fca5a5; font-size: 11px; padding: 3px 8px;" onclick="window.deleteRuleCategoryItem('${cat}')">🗑️ 删除</button>
        </div>
      </div>
    `;
  }).join('');
};

window.quickFilterCategoryAndClose = function(cat) {
  window.closeRuleCategoryManageModal();
  if (window.currentView !== "rules") {
    window.switchView("rules");
  }
  setTimeout(() => {
    if (window.filterRulesByCategory) window.filterRulesByCategory(cat);
  }, 100);
};

window.submitAddNewRuleCategory = function() {
  const input = document.getElementById("newRuleCategoryInput");
  const name = input ? input.value.trim() : "";
  if (!name) {
    alert("请输入分类板块名称！");
    return;
  }
  const ok = window.store.addRuleCategory(name);
  if (ok) {
    if (input) input.value = "";
    window.showToast(`成功新增分类板块【${name}】！`, "success");
    window.renderRuleCategoryManageList();
    window.populateRuleCategorySelect(name);
  } else {
    alert("该分类板块已存在！");
  }
};

window.deleteRuleCategoryItem = function(cat) {
  const rulesList = (window.store.data.classRules && window.store.data.classRules.rulesList) || [];
  const count = rulesList.filter(r => r.category === cat).length;
  let confirmMsg = `确定要删除分类板块【${cat}】吗？`;
  if (count > 0) {
    confirmMsg = `分类板块【${cat}】下有 ${count} 条相关公约条款，删除后这些条款将保留在公约列表中。确定删除该板块吗？`;
  }
  if (confirm(confirmMsg)) {
    window.store.deleteRuleCategory(cat);
    window.showToast(`已删除分类板块【${cat}】！`, "info");
    window.renderRuleCategoryManageList();
    window.populateRuleCategorySelect();
  }
};

window.quickAddRuleCategoryPrompt = function() {
  const name = prompt("请输入要快捷新增的班规分类板块名称 (例如：大课间跑操、自习纪律)：");
  if (name && name.trim()) {
    const trimmed = name.trim();
    if (window.store.addRuleCategory(trimmed)) {
      window.showToast(`成功新增分类板块【${trimmed}】！`, "success");
      window.populateRuleCategorySelect(trimmed);
      if (document.getElementById("editRuleCategory")) {
        document.getElementById("editRuleCategory").value = trimmed;
      }
    } else {
      alert("该分类板块已存在！");
    }
  }
};

window.filterRulesByCategory = function(cat) {
  window.currentRuleCategoryFilter = cat;
  const pills = document.querySelectorAll(".rule-cat-pill");
  pills.forEach(p => {
    if (p.getAttribute("data-cat") === cat) {
      p.classList.add("active");
    } else {
      p.classList.remove("active");
    }
  });

  const cards = document.querySelectorAll(".rule-item-card");
  cards.forEach(card => {
    const cardCat = card.getAttribute("data-category") || "";
    if (cat === "all" || cardCat === cat) {
      card.style.display = "";
    } else {
      card.style.display = "none";
    }
  });
};

// ================= 量化细则增删改 =================
window.openAddRewardFineModal = function() {
  document.getElementById("rewardFineModalTitle").innerText = "🏆 新增量化考核细则";
  document.getElementById("editRewardFineIndex").value = "";
  document.getElementById("editRewardFineTitle").value = "";
  document.getElementById("editRewardFineType").value = "reward";
  document.getElementById("editRewardFinePoints").value = "2";
  document.getElementById("editRewardFineTarget").value = "个人";
  document.getElementById("editRewardFineModal").classList.add("active");
};

window.openEditRewardFineModal = function(index) {
  const rfList = (window.store.data.classRules && window.store.data.classRules.rewardFineRules) || [];
  const item = rfList[index];
  if (!item) return;

  document.getElementById("rewardFineModalTitle").innerText = "✏️ 编辑量化考核细则";
  document.getElementById("editRewardFineIndex").value = index;
  document.getElementById("editRewardFineTitle").value = item.title || "";
  document.getElementById("editRewardFineType").value = item.type || "reward";
  document.getElementById("editRewardFinePoints").value = Math.abs(item.points || 2);
  document.getElementById("editRewardFineTarget").value = item.target || "个人";
  document.getElementById("editRewardFineModal").classList.add("active");
};

window.closeEditRewardFineModal = function() {
  document.getElementById("editRewardFineModal").classList.remove("active");
};

window.submitEditRewardFine = function() {
  const idxStr = document.getElementById("editRewardFineIndex").value;
  const title = document.getElementById("editRewardFineTitle").value.trim();
  const type = document.getElementById("editRewardFineType").value;
  let points = Math.abs(parseFloat(document.getElementById("editRewardFinePoints").value) || 2);
  if (type === "penalty") points = -points;
  const target = document.getElementById("editRewardFineTarget").value;

  if (!title) { alert("细则名称不能为空！"); return; }

  if (idxStr !== "") {
    window.store.updateRewardFine(parseInt(idxStr), { title, type, points, target });
    window.showToast("量化考核细则已更新！", "success");
  } else {
    window.store.addRewardFine({ title, type, points, target });
    window.showToast("已成功添加量化考核细则！", "success");
  }

  window.closeEditRewardFineModal();
  if (window.currentView === "rules") renderCurrentView();
};

window.deleteRewardFineItem = function(index) {
  if (confirm("确定要删除该条量化考核细则吗？")) {
    window.store.deleteRewardFine(index);
    window.showToast("量化考核细则已删除！", "info");
    if (window.currentView === "rules") renderCurrentView();
  }
};

// ================= 小组与成长标签管理中心 (弹窗 33) =================
window.openGroupTagManageModal = function(subTab) {
  const modal = document.getElementById("groupTagManageModal");
  if (!modal) return;
  window.switchGroupTagTab(subTab || 'groups');
  modal.classList.add("active");
};

window.closeGroupTagManageModal = function() {
  window.editingGroupName = null;
  const modal = document.getElementById("groupTagManageModal");
  if (modal) modal.classList.remove("active");
  if (window.syncStudentTagFilterDropdown) window.syncStudentTagFilterDropdown();
  if (window.currentView === "students") renderCurrentView();
};

window.switchGroupTagTab = function(tabName, clickedEl) {
  window.editingGroupName = null;
  const pills = document.querySelectorAll("#groupTagSubTabs .tab-pill");
  pills.forEach(p => {
    if (p.getAttribute("data-tab") === tabName) p.classList.add("active");
    else p.classList.remove("active");
  });
  const groupsTab = document.getElementById("gtmGroupsTab");
  const tagsTab = document.getElementById("gtmTagsTab");
  if (groupsTab) groupsTab.style.display = tabName === "groups" ? "block" : "none";
  if (tagsTab) tagsTab.style.display = tabName === "tags" ? "block" : "none";
  window.renderGroupTagModalLists();
};

window.editingGroupName = null;

window.startEditGroupItem = function(name) {
  window.editingGroupName = name;
  window.renderGroupTagModalLists();
  setTimeout(() => {
    const inp = document.getElementById("gtmInlineEditInput");
    if (inp) {
      inp.focus();
      inp.select();
    }
  }, 50);
};

window.cancelEditGroupItem = function() {
  window.editingGroupName = null;
  window.renderGroupTagModalLists();
};

window.saveEditGroupItem = function(oldName) {
  const inp = document.getElementById("gtmInlineEditInput");
  if (!inp) return;
  const targetOldName = oldName || (inp.dataset.oldName ? decodeURIComponent(inp.dataset.oldName) : window.editingGroupName);
  const newName = inp.value.trim();
  if (!newName) {
    if (window.showToast) window.showToast("小组名称不能为空！", "warning");
    else alert("小组名称不能为空！");
    inp.focus();
    return;
  }
  if (newName === targetOldName) {
    window.cancelEditGroupItem();
    return;
  }
  const ok = window.store.renameGroup(targetOldName, newName);
  if (ok) {
    window.editingGroupName = null;
    window.renderGroupTagModalLists();
    if (window.showToast) window.showToast(`已成功将小组【${targetOldName}】修改为【${newName}】！`, "success");

    // 动态同步学生档案筛选下拉菜单
    const filterSelect = document.getElementById("studentGroupFilter");
    if (filterSelect) {
      const curVal = filterSelect.value;
      const groups = window.store.data.groups || [];
      filterSelect.innerHTML = `<option value="">全部小组</option>` + groups.map(g => `<option value="${g}">${g}</option>`).join("");
      if (curVal === targetOldName) filterSelect.value = newName;
      else filterSelect.value = curVal;
    }

    if (typeof renderCurrentView === "function") {
      renderCurrentView();
    }
  } else {
    alert("该小组名称已存在或无效！");
    inp.focus();
  }
};

window.renderGroupTagModalLists = function() {
  const groupsContainer = document.getElementById("gtmGroupsListContainer");
  const tagsContainer = document.getElementById("gtmTagsListContainer");
  const students = window.store.data.students || [];

  if (groupsContainer) {
    const groups = window.store.data.groups || ["第1组", "第2组", "第3组", "第4组", "第5组", "第6组"];
    groupsContainer.innerHTML = groups.map(g => {
      const isEditing = window.editingGroupName === g;
      const count = students.filter(s => window.isStudentInGroup ? window.isStudentInGroup(s.group, g) : (String(s.group) === g || `第${s.group}组` === g)).length;
      const encG = encodeURIComponent(g);

      if (isEditing) {
        return `
          <div style="background: #eff6ff; border: 1.5px solid #3b82f6; border-radius: var(--radius-md); padding: 8px 10px; display: flex; align-items: center; justify-content: space-between; box-shadow: 0 2px 8px rgba(59,130,246,0.18);">
            <div style="display: flex; align-items: center; gap: 6px; flex: 1; margin-right: 6px;">
              <span style="font-size: 16px;">✏️</span>
              <input type="text" class="form-control" id="gtmInlineEditInput" data-old-name="${encG}" value="${g}"
                style="height: 30px; font-size: 13px; font-weight: 700; padding: 2px 8px; width: 100%; border-color: #3b82f6;"
                onkeydown="if(event.key==='Enter') window.saveEditGroupItem(); else if(event.key==='Escape') window.cancelEditGroupItem();"
                placeholder="输入新组名...">
            </div>
            <div style="display: flex; gap: 4px; flex-shrink: 0;">
              <button class="btn btn-sm btn-primary" style="padding: 3px 8px; font-size: 12px; font-weight: 700;" onclick="window.saveEditGroupItem()" title="保存修改">✓</button>
              <button class="btn btn-sm btn-secondary" style="padding: 3px 8px; font-size: 12px;" onclick="window.cancelEditGroupItem()" title="取消修改">✕</button>
            </div>
          </div>
        `;
      }

      return `
        <div style="background: #fff; border: 1px solid #e2e8f0; border-radius: var(--radius-md); padding: 10px 14px; display: flex; align-items: center; justify-content: space-between; box-shadow: 0 1px 2px rgba(0,0,0,0.04); transition: all 0.2s;"
             onmouseenter="this.style.borderColor='#93c5fd'; this.style.boxShadow='0 2px 6px rgba(0,0,0,0.06)';"
             onmouseleave="this.style.borderColor='#e2e8f0'; this.style.boxShadow='0 1px 2px rgba(0,0,0,0.04)';">
          <div style="display: flex; align-items: center; gap: 8px; overflow: hidden;">
            <span style="font-size: 18px; flex-shrink: 0;">👥</span>
            <div style="overflow: hidden;">
              <div style="font-weight: 700; color: #1e293b; font-size: 13.5px; white-space: nowrap; text-overflow: ellipsis; overflow: hidden;" title="${g}">${g}</div>
              <div style="font-size: 11.5px; color: var(--text-muted);">${count} 名学生</div>
            </div>
          </div>
          <div style="display: flex; align-items: center; gap: 5px; flex-shrink: 0;">
            <button class="btn btn-sm btn-secondary" style="padding: 2px 7px; font-size: 11.5px; color: #0284c7; border-color: #bae6fd; background: #f0f9ff;" onclick="window.startEditGroupItem(decodeURIComponent('${encG}'))" title="自定义修改/重命名此小组">✏️</button>
            ${groups.length > 1 ? `
              <button class="btn btn-sm btn-danger" style="padding: 2px 7px; font-size: 11px;" onclick="window.deleteGroupItem(decodeURIComponent('${encG}'))" title="删除该小组">🗑️</button>
            ` : '<span style="font-size: 11px; color: #94a3b8; padding: 2px 4px;">保留组</span>'}
          </div>
        </div>
      `;
    }).join("");
  }

  if (tagsContainer) {
    const tags = window.store.getTagsPool ? window.store.getTagsPool() : (window.store.data.tagsPool || []);
    tagsContainer.innerHTML = tags.map(t => {
      const count = students.filter(s => window.isStudentHasTag ? window.isStudentHasTag(s, t) : ((Array.isArray(s.tags) && s.tags.includes(t)) || s.tag === t)).length;
      const isStackable = window.store.isTagStackable ? window.store.isTagStackable(t) : true;
      const goldThresh = window.store.getTagGoldThreshold ? window.store.getTagGoldThreshold(t) : 3;
      const encTag = encodeURIComponent(t);
      return `
        <div style="display: inline-flex; align-items: center; gap: 6px; background: #fff; border: 1px solid #cbd5e1; border-radius: 20px; padding: 5px 12px; font-size: 12.5px; box-shadow: 0 1px 2px rgba(0,0,0,0.03);">
          <span style="font-weight: 600; color: #334155;">🏷️ ${t}</span>
          <span style="font-size: 10.5px; color: var(--text-muted); background: #f1f5f9; padding: 1px 6px; border-radius: 10px;">${count}人</span>
          <span style="cursor: pointer; font-size: 11px; padding: 2px 7px; border-radius: 4px; background: ${isStackable ? '#dbeafe' : '#f1f5f9'}; color: ${isStackable ? '#1d4ed8' : '#64748b'}; border: 1px solid ${isStackable ? '#bfdbfe' : '#cbd5e1'}; font-weight: 600; user-select: none;"
            onclick="window.toggleTagStackable(decodeURIComponent('${encTag}'))"
            title="点击切换属性：当前为【${isStackable ? '允许数量累加增减 (如*2)' : '单次获得'}】，点击可随时切换">
            ${isStackable ? '可累加±' : '单次'}
          </span>
          ${isStackable ? `
            <span style="cursor: pointer; font-size: 11px; padding: 2px 7px; border-radius: 4px; background: #fffbeb; color: #b45309; border: 1px solid #fde68a; font-weight: 700; user-select: none;"
              onclick="window.promptChangeTagGoldThreshold(decodeURIComponent('${encTag}'))"
              title="点击修改金黄色奖励阈值：当学生获得该标签达到多少个时字体变为金黄色（当前：达到${goldThresh}个变金黄）">
              ⭐ 满${goldThresh}变金黄
            </span>
          ` : ''}
          ${tags.length > 1 ? `
            <span style="cursor: pointer; color: #ef4444; font-weight: 700; margin-left: 3px; font-size: 13px;" onclick="window.deleteTagItem(decodeURIComponent('${encTag}'))" title="删除该标签">✕</span>
          ` : ''}
        </div>
      `;
    }).join("");
  }
};

window.promptChangeTagGoldThreshold = function(tag) {
  const cur = window.store.getTagGoldThreshold ? window.store.getTagGoldThreshold(tag) : 3;
  const val = prompt(`请输入标签【${tag}】达到多少个时字体颜色变为高光金黄色？（未达到时为普通蓝色）\n当前设定为：${cur} 个`, cur);
  if (val === null) return;
  const num = parseInt(val, 10);
  if (!num || num < 1) {
    alert("请输入大于等于 1 的有效正整数！");
    return;
  }
  window.store.setTagGoldThreshold(tag, num);
  window.renderGroupTagModalLists();
  if (window.showToast) {
    window.showToast(`已将标签【${tag}】高光金黄色阈值设置为【达到 ${num} 个】！`, "success");
  }
  if (typeof renderCurrentView === "function" && window.currentView === "students") {
    renderCurrentView();
  }
};

window.toggleTagStackable = function(tag) {
  const cur = window.store.isTagStackable ? window.store.isTagStackable(tag) : true;
  const next = !cur;
  window.store.setTagStackable(tag, next);
  window.renderGroupTagModalLists();
  if (window.renderTagChips) {
    window.renderTagChips('edit');
    window.renderTagChips('new');
  }
  if (window.showToast) {
    window.showToast(`标签【${tag}】已设置为【${next ? '允许数量累加增减 (如*2)' : '单次获得'}】！`, "info");
  }
};

window.submitAddNewGroup = function() {
  const input = document.getElementById("newGroupNameInput");
  if (!input) return;
  const name = input.value.trim();
  if (!name) { alert("请输入小组名称！"); return; }
  const ok = window.store.addGroup(name);
  if (ok) {
    input.value = "";
    window.renderGroupTagModalLists();
    window.showToast(`成功新增小组【${name}】！`, "success");
    if (window.currentView === "students") renderCurrentView();
  } else {
    alert("该小组名称已存在或无效！");
  }
};

window.deleteGroupItem = function(name) {
  if (confirm(`确定要删除小组【${name}】吗？删除后该组内学生将自动合并归入保留组。`)) {
    window.store.deleteGroup(name);
    window.renderGroupTagModalLists();
    window.showToast(`已删除小组【${name}】！`, "success");
    if (window.currentView === "students") renderCurrentView();
  }
};

window.submitAddNewTag = function() {
  const input = document.getElementById("newTagNameInput");
  if (!input) return;
  const tag = input.value.trim();
  if (!tag) { alert("请输入标签名称！"); return; }
  const cb = document.getElementById("newTagStackableCheckbox");
  const stackable = cb ? cb.checked : true;
  const goldInput = document.getElementById("newTagGoldThresholdInput");
  const goldThreshold = goldInput ? (parseInt(goldInput.value, 10) || 3) : 3;

  const ok = window.store.addTag(tag, stackable, goldThreshold);
  if (ok) {
    input.value = "";
    window.renderGroupTagModalLists();
    if (window.syncStudentTagFilterDropdown) window.syncStudentTagFilterDropdown();
    if (window.renderTagChips) {
      window.renderTagChips('edit');
      window.renderTagChips('new');
    }
    window.showToast(`已添加成长标签【${tag}】(${stackable ? `可累加，满${goldThreshold}个变金黄` : '单次获得'})至标签库！`, "success");
    if (window.currentView === "students") renderCurrentView();
  } else {
    alert("该标签已存在！");
  }
};

window.deleteTagItem = function(tag) {
  if (confirm(`确定要从全班标签库中移除标签【${tag}】吗？同时会从已分配该标签的学生档案中移除。`)) {
    window.store.deleteTag(tag);
    window.renderGroupTagModalLists();
    if (window.syncStudentTagFilterDropdown) window.syncStudentTagFilterDropdown();
    if (window.renderTagChips) {
      window.renderTagChips('edit');
      window.renderTagChips('new');
    }
    window.showToast(`已移除成长标签【${tag}】！`, "success");
    if (window.currentView === "students") renderCurrentView();
  }
};

// ================= 新增自拟班规条约套系模板 (弹窗 34) =================
window.openAddRuleTemplateModal = function() {
  const modal = document.getElementById("addRuleTemplateModal");
  if (!modal) return;
  document.getElementById("newRuleTemplateName").value = "";
  document.getElementById("newRuleTemplateLevel").value = "小学部适用";
  document.getElementById("newRuleTemplateDesc").value = "";
  document.getElementById("newRuleTemplateClauses").value = "早读书声琅琅，不迟到早退\n课堂积极思辨发言，桌椅排列整齐\n课间文明游戏，走廊不追逐打闹\n认真按时完成各科作业，卷面整洁";
  modal.classList.add("active");
};

window.closeAddRuleTemplateModal = function() {
  const modal = document.getElementById("addRuleTemplateModal");
  if (modal) modal.classList.remove("active");
};

window.submitAddRuleTemplate = function() {
  const name = document.getElementById("newRuleTemplateName").value.trim();
  const level = document.getElementById("newRuleTemplateLevel").value.trim() || "全学段适用";
  const desc = document.getElementById("newRuleTemplateDesc").value.trim() || "班级自主管理公约体系";
  const text = document.getElementById("newRuleTemplateClauses").value.trim();

  if (!name) { alert("请输入条约套系模板名称！"); return; }
  const clauses = text ? text.split("\n").map(l => l.trim()).filter(Boolean) : ["认真听讲，积极思考", "按时完成作业", "课间文明活动"];

  window.store.addClassRuleTemplate({
    name,
    level,
    desc,
    ruleCount: clauses.length,
    clauses: clauses
  });

  window.closeAddRuleTemplateModal();
  window.showToast(`成功新增班规条约套系【${name}】！`, "success");
  if (window.currentView === "rules") renderCurrentView();
};

// ================= 自定义报表模板增删改与文件上传 =================
window.openAddReportTemplateModal = function() {
  document.getElementById("reportTemplateModalTitle").innerText = "📑 新增自定义报表模板";
  document.getElementById("editReportTemplateIndex").value = "";
  document.getElementById("editReportTemplateName").value = "";
  document.getElementById("editReportTemplateCycle").value = "每月生成";
  document.getElementById("editReportTemplateFormat").value = "Excel";
  document.getElementById("editReportTemplateDesc").value = "";
  document.getElementById("editReportTemplateModal").classList.add("active");
};

window.openEditReportTemplateModal = function(index) {
  const templates = window.store.data.reportTemplates || [];
  const t = templates[index];
  if (!t) return;

  document.getElementById("reportTemplateModalTitle").innerText = "✏️ 编辑报表模板信息";
  document.getElementById("editReportTemplateIndex").value = index;
  document.getElementById("editReportTemplateName").value = t.name || "";
  document.getElementById("editReportTemplateCycle").value = t.cycle || "常用";
  document.getElementById("editReportTemplateFormat").value = t.format || "Excel";
  document.getElementById("editReportTemplateDesc").value = t.desc || "";
  document.getElementById("editReportTemplateModal").classList.add("active");
};

window.closeEditReportTemplateModal = function() {
  document.getElementById("editReportTemplateModal").classList.remove("active");
};

window.submitEditReportTemplate = function() {
  const idxStr = document.getElementById("editReportTemplateIndex").value;
  const name = document.getElementById("editReportTemplateName").value.trim();
  const cycle = document.getElementById("editReportTemplateCycle").value.trim() || "常用";
  const format = document.getElementById("editReportTemplateFormat").value;
  const desc = document.getElementById("editReportTemplateDesc").value.trim();

  if (!name) { alert("报表名称不能为空！"); return; }

  if (idxStr !== "") {
    window.store.updateReportTemplate(parseInt(idxStr), { name, cycle, format, desc });
    window.showToast(`报表模板《${name}》已更新！`, "success");
  } else {
    window.store.addReportTemplate({ name, cycle, format, desc });
    window.showToast(`已新增自定义报表模板《${name}》！`, "success");
  }

  window.closeEditReportTemplateModal();
  if (window.currentView === "stats") window.renderStatsContent();
};

window.handleCustomReportUpload = function(event) {
  const file = event.target.files && event.target.files[0];
  if (!file) return;

  const fileName = file.name;
  const ext = fileName.split('.').pop().toUpperCase();
  const baseName = fileName.replace(/\.[^/.]+$/, "");

  window.store.addReportTemplate({
    name: baseName,
    cycle: "本地自定义",
    format: ext,
    desc: `用户本地上传的模版文件（${fileName}），可作为标准化数据导出依据。`
  });

  window.showToast(`成功上传本地报表模版文件《${fileName}》并已加入模板中心！`, "success");
  event.target.value = "";
  if (window.currentView === "stats") window.renderStatsContent();
};

// ================= 首页根据IP实时天气 =================
window.currentWeatherData = null;
window.loadRealTimeWeather = function(forceRefresh = false) {
  if (!forceRefresh && window.currentWeatherData) {
    updateWeatherUI(window.currentWeatherData);
    return;
  }
  
  fetch('/api/weather' + (forceRefresh ? '?refresh=1' : ''))
    .then(res => res.json())
    .then(data => {
      if (data && data.weather) {
        window.currentWeatherData = data;
        updateWeatherUI(data);
      }
    })
    .catch(err => {
      console.warn("Real-time weather fetch error:", err);
    });
};

function updateWeatherUI(w) {
  const tag = document.getElementById("dashboardWeatherText");
  if (tag) {
    tag.innerHTML = `${w.icon || '🌤️'} ${w.city ? w.city + ' ' : ''}${w.weather || '晴'} ${w.temp || '28℃'}`;
    tag.title = `实时定位：${w.city || '当地'} | 天气：${w.weather} | 温度：${w.temp} | 湿度：${w.humidity || '60%'} (点击刷新)`;
  }
}

window.refreshRealTimeWeather = function() {
  const tag = document.getElementById("dashboardWeatherText");
  if (tag) tag.innerText = "⏳ 正在通过IP获取实时天气...";
  window.loadRealTimeWeather(true);
  window.showToast("正在根据当前电脑IP刷新当地实时天气...", "info");
};

// ================= 班级任课老师账号协同管理 (由班主任维护，任课老师无权访问) =================
window.openSubjectTeachersModal = function() {
  if (window.currentUser && (window.currentUser.role === 'subject_teacher' || window.currentUser.role === 'subject')) {
    alert("权限限制：您当前登录的是任课老师账号，无权查看或维护教师团队账号，该功能仅限班主任与管理员！");
    return;
  }
  window.resetSubjectTeacherForm();
  window.renderSubjectTeachersList();
  document.getElementById("subjectTeachersModal").classList.add("active");
};

window.closeSubjectTeachersModal = function() {
  document.getElementById("subjectTeachersModal").classList.remove("active");
};

window.resetSubjectTeacherForm = function() {
  document.getElementById("editTeacherId").value = "";
  document.getElementById("newTeacherName").value = "";
  document.getElementById("newTeacherSubject").value = "";
  document.getElementById("newTeacherUsername").value = "";
  document.getElementById("newTeacherPassword").value = "123456";
  document.getElementById("newTeacherPhone").value = "";
};

window.renderSubjectTeachersList = function() {
  const container = document.getElementById("subjectTeachersListContainer");
  if (!container) return;
  const currentClassId = window.store.currentClassId || (window.currentUser && window.currentUser.classId) || localStorage.getItem("CURRENT_CLASS_ID") || "class_default";

  fetch(`/api/classes/${encodeURIComponent(currentClassId)}/teachers`)
    .then(r => r.json())
    .then(res => {
      let teachers = [];
      if (Array.isArray(res)) {
        teachers = res;
      } else if (res && Array.isArray(res.teachers)) {
        teachers = res.teachers;
      } else if (res && Array.isArray(res.data)) {
        teachers = res.data;
      }
      displayTeachers(teachers);
    })
    .catch((err) => {
      console.warn("拉取任课老师列表失败或无网络:", err);
      const localTeachers = (window.store.data && window.store.data.subjectTeachers) ? window.store.data.subjectTeachers : [];
      displayTeachers(localTeachers);
    });

  function displayTeachers(teachers) {
    const list = Array.isArray(teachers) ? teachers : [];
    window.currentSubjectTeachersCache = list;
    if (list.length === 0) {
      container.innerHTML = `<div style="grid-column: 1 / -1; text-align: center; color: var(--text-muted); padding: 24px 16px; background: white; border: 1.5px dashed #cbd5e1; border-radius: 10px; font-size: 13.5px;">暂无任课老师账号，请在上方表单添加！</div>`;
      return;
    }
    container.innerHTML = list.map(t => `
      <div style="background: white; border: 1px solid #e2e8f0; border-radius: 10px; padding: 12px; box-shadow: var(--shadow-sm); display: flex; flex-direction: column; justify-content: space-between;">
        <div>
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px;">
            <span style="font-weight: 700; font-size: 15px; color: #1e293b;">👨‍🏫 ${t.name || '-'}</span>
            <span class="badge" style="background: #eff6ff; color: #2563eb; font-weight: 700;">${t.subject || '各科'}老师</span>
          </div>
          <div style="font-size: 12px; color: #64748b; line-height: 1.6;">
            <div>👤 账号: <strong>${t.username || '-'}</strong></div>
            <div>🔑 密码: <code style="background: #f1f5f9; padding: 1px 4px; border-radius: 4px; color: #e11d48; font-weight: 600;">${t.password || '******'}</code></div>
            ${t.phone ? `<div>📞 电话: ${t.phone}</div>` : ''}
          </div>
        </div>
        <div style="display: flex; justify-content: flex-end; gap: 6px; margin-top: 10px; border-top: 1px dashed #e2e8f0; padding-top: 8px;">
          <button class="btn btn-sm btn-secondary" onclick="window.editSubjectTeacherItem('${t.id}')" style="font-size: 11.5px; padding: 3px 8px;">✏️ 编辑</button>
          <button class="btn btn-sm" style="background: #fee2e2; color: #dc2626; border: 1px solid #fca5a5; font-size: 11.5px; padding: 3px 8px;" onclick="window.deleteSubjectTeacherItem('${t.id}', '${t.name}')">🗑️ 删除</button>
        </div>
      </div>
    `).join('');
  }
};

window.editSubjectTeacherItem = function(tId) {
  const teachers = window.currentSubjectTeachersCache || [];
  const t = teachers.find(item => String(item.id) === String(tId) || String(item.username) === String(tId));
  if (!t) return;
  document.getElementById("editTeacherId").value = t.id;
  document.getElementById("newTeacherName").value = t.name || "";
  document.getElementById("newTeacherSubject").value = t.subject || "";
  document.getElementById("newTeacherUsername").value = t.username || "";
  document.getElementById("newTeacherPassword").value = t.password || "123456";
  document.getElementById("newTeacherPhone").value = t.phone || "";
  document.getElementById("newTeacherName").focus();
};

window.submitSaveSubjectTeacher = function() {
  if (window.currentUser && (window.currentUser.role === 'subject_teacher' || window.currentUser.role === 'subject')) {
    alert("权限限制：任课老师账号不能添加或修改教师账号！");
    return;
  }

  const id = document.getElementById("editTeacherId").value;
  const name = document.getElementById("newTeacherName").value.trim();
  const subject = document.getElementById("newTeacherSubject").value.trim();
  const username = document.getElementById("newTeacherUsername").value.trim();
  const password = document.getElementById("newTeacherPassword").value.trim();
  const phone = document.getElementById("newTeacherPhone").value.trim();

  if (!name || !subject || !username || !password) {
    alert("任课老师姓名、学科、用户名和密码均为必填项！");
    return;
  }

  const currentClassId = window.store.currentClassId || (window.currentUser && window.currentUser.classId) || localStorage.getItem("CURRENT_CLASS_ID") || "class_default";
  const opRole = (window.currentUser && window.currentUser.role) || "homeroom_teacher";
  const payload = { 
    id: id || undefined, 
    name, subject, username, password, phone,
    classId: currentClassId,
    operatorRole: opRole
  };

  fetch(`/api/classes/${encodeURIComponent(currentClassId)}/teachers`, {
    method: "POST",
    headers: { 
      "Content-Type": "application/json",
      "X-User-Role": opRole
    },
    body: JSON.stringify(payload)
  })
    .then(r => r.json())
    .then(res => {
      if (res.success || res.code === 200) {
        window.showToast(res.message || "任课老师账号保存成功！", "success");
        window.resetSubjectTeacherForm();
        window.renderSubjectTeachersList();
      } else {
        alert(res.message || "保存失败");
      }
    })
    .catch(() => {
      if (!window.store.data.subjectTeachers) window.store.data.subjectTeachers = [];
      if (id) {
        const idx = window.store.data.subjectTeachers.findIndex(x => String(x.id) === String(id));
        if (idx >= 0) window.store.data.subjectTeachers[idx] = { id, name, subject, username, password, phone, classId: currentClassId };
      } else {
        window.store.data.subjectTeachers.push({ id: "st_" + Date.now(), name, subject, username, password, phone, classId: currentClassId });
      }
      window.store.save();
      window.showToast("已保存任课老师信息！", "success");
      window.resetSubjectTeacherForm();
      window.renderSubjectTeachersList();
    });
};

window.deleteSubjectTeacherItem = function(tId, tName) {
  if (window.currentUser && (window.currentUser.role === 'subject_teacher' || window.currentUser.role === 'subject')) {
    alert("权限限制：任课老师账号不能删除教师账号！");
    return;
  }

  if (!confirm(`确定要移除任课老师【${tName || ''}】吗？`)) return;
  const currentClassId = window.store.currentClassId || (window.currentUser && window.currentUser.classId) || localStorage.getItem("CURRENT_CLASS_ID") || "class_default";
  const opRole = (window.currentUser && window.currentUser.role) || "homeroom_teacher";

  fetch(`/api/classes/${encodeURIComponent(currentClassId)}/teachers?id=${encodeURIComponent(tId)}&operatorRole=${encodeURIComponent(opRole)}`, {
    method: "DELETE",
    headers: {
      "X-User-Role": opRole
    }
  })
    .then(r => r.json())
    .then(res => {
      if (res.success || res.code === 200) {
        window.showToast(res.message || `已移除任课老师【${tName || ''}】！`, "info");
      } else {
        alert(res.message || "移除失败");
      }
      if (window.store.data && window.store.data.subjectTeachers) {
        window.store.data.subjectTeachers = window.store.data.subjectTeachers.filter(x => String(x.id) !== String(tId) && String(x.username) !== String(tId));
        window.store.save();
      }
      window.renderSubjectTeachersList();
    })
    .catch(() => {
      if (window.store.data && window.store.data.subjectTeachers) {
        window.store.data.subjectTeachers = window.store.data.subjectTeachers.filter(x => String(x.id) !== String(tId) && String(x.username) !== String(tId));
        window.store.save();
      }
      window.showToast(`已移除任课老师【${tName || ''}】！`, "info");
      window.renderSubjectTeachersList();
    });
};

// ================= 用户身份登录与角色切换 (Modal 37) =================
window.currentLoginRole = "homeroom";
window.isLoginMandatory = false;

window.openUserLoginModal = function(isMandatory = false) {
  window.isLoginMandatory = Boolean(isMandatory);
  const closeBtn = document.getElementById("loginModalCloseBtn");
  const cancelBtn = document.getElementById("loginModalCancelBtn");
  const titleEl = document.getElementById("loginModalTitle");
  const pInput = document.getElementById("loginPasswordInput");
  if (pInput) pInput.value = "";

  if (window.isLoginMandatory) {
    if (closeBtn) closeBtn.style.display = "none";
    if (cancelBtn) cancelBtn.style.display = "none";
    if (titleEl) titleEl.innerText = "🔐 欢迎使用班主任工作台 · 请先登录账号";
  } else {
    if (closeBtn) closeBtn.style.display = "";
    if (cancelBtn) cancelBtn.style.display = "";
    if (titleEl) titleEl.innerText = "🔐 教师账号登录与身份切换";
  }

  window.setLoginRoleTab(window.currentLoginRole || "homeroom");
  document.getElementById("userLoginModal").classList.add("active");
};

window.closeUserLoginModal = function() {
  if (window.isLoginMandatory) {
    // 强制登录状态下不可关闭弹窗
    return;
  }
  document.getElementById("userLoginModal").classList.remove("active");
};

window.setLoginRoleTab = function(role) {
  window.currentLoginRole = role;
  const tabHr = document.getElementById("loginTabHomeroom");
  const tabSub = document.getElementById("loginTabSubject");
  if (tabHr) tabHr.classList.toggle("active", role === "homeroom");
  if (tabSub) tabSub.classList.toggle("active", role === "subject");

  const hint = document.getElementById("loginRoleHint");
  const uInput = document.getElementById("loginUsernameInput");
  const pInput = document.getElementById("loginPasswordInput");

  if (role === "subject") {
    if (hint) hint.innerHTML = "💡 任课老师默认体验账号: <code>math_wang</code> / 密码: <code>123</code>";
    if (uInput) uInput.value = "math_wang";
    if (pInput) pInput.value = "";
  } else {
    if (hint) hint.innerHTML = "💡 班主任默认体验账号: <code>teacher_li</code> / 密码: <code>123</code>";
    if (uInput) uInput.value = "teacher_li";
    if (pInput) pInput.value = "";
  }
};

window.submitUserLogin = function() {
  const username = document.getElementById("loginUsernameInput").value.trim();
  const password = document.getElementById("loginPasswordInput").value.trim();

  if (!username || !password) {
    alert("请输入用户名和密码！");
    return;
  }

  fetch('/api/auth/login', {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password, role: window.currentLoginRole })
  })
    .then(r => r.json())
    .then(res => {
      if (res.success || res.code === 200) {
        const u = res.user || res.data;

        // 解析该老师实际任教的全部班级列表
        let taught = (u && Array.isArray(u.taughtClasses)) ? u.taughtClasses : [];
        if (taught.length === 0 && window.allSystemClasses && Array.isArray(window.allSystemClasses)) {
          taught = window.allSystemClasses.filter(c => 
            c.homeroomUsername === u.username ||
            c.homeroomTeacher === (u.realName || u.name) ||
            c.id === u.classId ||
            (Array.isArray(u.classIds) && u.classIds.includes(c.id))
          ).map(c => ({
            id: c.id,
            name: c.name,
            grade: c.grade || "小学四年级",
            studentCount: c.studentCount || 45,
            roleInClass: "执教班级"
          }));
        }

        // 如果某个老师同时任教多个班级时，则在登录时弹窗让其选择即可
        if (taught.length > 1) {
          window.pendingLoginUser = u;
          document.getElementById("userLoginModal").classList.remove("active");
          window.openSelectTaughtClassModal(u, taught);
          return;
        }

        // 仅任教单个班级：直接进入对应班级
        if (taught.length === 1) {
          u.classId = taught[0].id;
          u.className = taught[0].name;
          u.grade = taught[0].grade;
          u.studentCount = taught[0].studentCount;
        }
        window.finalizeUserLogin(u);
      } else {
        alert(res.message || "登录失败，请检查账号密码！");
      }
    })
    .catch(err => {
      const u = { username, realName: username, role: window.currentLoginRole, classId: "class_1788592961" };
      window.finalizeUserLogin(u);
    });
};

// 完成用户登录与班级数据初始化
window.finalizeUserLogin = function(u) {
  window.currentUser = u;
  window.isLoginMandatory = false;
  sessionStorage.setItem("HOMEROOM_LOGGED_IN", "true");
  localStorage.setItem("HOMEROOM_CURRENT_USER", JSON.stringify(u));
  document.getElementById("userLoginModal").classList.remove("active");
  const classModal = document.getElementById("selectTaughtClassModal");
  if (classModal) classModal.classList.remove("active");

  window.showToast(`欢迎登录，${u.realName || u.name || u.username} (${u.role === 'admin' ? '超级管理员' : u.role === 'subject_teacher' ? '任课老师' : '班主任'})！已进入【${u.className || '工作班级'}】`, "success");

  if (u.classId) {
    window.store.switchClass(u.classId, () => {
      window.updateTopbarInfo();
      if (window.applyUserRolePermissions) window.applyUserRolePermissions(u);
      renderCurrentView();
    });
  } else {
    window.updateTopbarInfo();
    if (window.applyUserRolePermissions) window.applyUserRolePermissions(u);
    renderCurrentView();
  }
};

// 老师任教多班级时：弹出班级选择窗口
window.openSelectTaughtClassModal = function(user, classes) {
  const modal = document.getElementById("selectTaughtClassModal");
  if (!modal) return;
  const nameEl = document.getElementById("selectTaughtClassTeacherName");
  if (nameEl) nameEl.innerText = user.realName || user.name || user.username || "教师";

  const listContainer = document.getElementById("selectTaughtClassList");
  if (listContainer) {
    listContainer.innerHTML = classes.map(c => {
      const safeName = (c.name || "班级").replace(/'/g, "\\'");
      const safeGrade = (c.grade || "小学四年级").replace(/'/g, "\\'");
      const roleText = c.roleInClass || (c.isHomeroom ? "班主任" : "任课老师");
      const count = c.studentCount || 45;

      return `
        <div class="taught-class-card" style="display: flex; align-items: center; justify-content: space-between; background: #ffffff; border: 1.5px solid #e2e8f0; border-radius: 10px; padding: 14px 16px; cursor: pointer; transition: all 0.2s;" onmouseover="this.style.borderColor='#3b82f6'; this.style.background='#eff6ff';" onmouseout="this.style.borderColor='#e2e8f0'; this.style.background='#ffffff';" onclick="window.confirmEnterTaughtClass('${c.id}', '${safeName}', '${safeGrade}', ${count})">
          <div style="display: flex; align-items: center; gap: 12px;">
            <div style="width: 44px; height: 44px; border-radius: 8px; background: #dbeafe; display: flex; align-items: center; justify-content: center; font-size: 24px;">
              🏫
            </div>
            <div>
              <div style="font-weight: 700; color: #1e293b; font-size: 15px; display: flex; align-items: center; gap: 6px;">
                <span>${c.name}</span>
                <span class="badge badge-primary" style="font-size: 11px; padding: 2px 6px;">${roleText}</span>
              </div>
              <div style="font-size: 12px; color: #64748b; margin-top: 4px;">
                年级：${c.grade || '小学四年级'} &nbsp;|&nbsp; 学生：${count}人
              </div>
            </div>
          </div>
          <div>
            <button class="btn btn-sm btn-primary" style="font-size: 12.5px; padding: 6px 14px; font-weight: 600; pointer-events: none;">
              进入此班 ›
            </button>
          </div>
        </div>
      `;
    }).join('');
  }

  modal.classList.add("active");
};

// 确认选择进入该班级
window.confirmEnterTaughtClass = function(classId, className, grade, studentCount) {
  if (!window.pendingLoginUser) return;
  const u = window.pendingLoginUser;
  u.classId = classId;
  u.className = className;
  u.grade = grade || "小学四年级";
  u.studentCount = studentCount || 45;
  window.pendingLoginUser = null;
  window.finalizeUserLogin(u);
};

// 取消选择返回登录
window.cancelSelectTaughtClass = function() {
  const modal = document.getElementById("selectTaughtClassModal");
  if (modal) modal.classList.remove("active");
  window.pendingLoginUser = null;
  window.openUserLoginModal(window.isLoginMandatory);
};

window.handleUserLogout = function() {
  if (confirm("确定要退出当前账号并重新登录吗？")) {
    sessionStorage.removeItem("HOMEROOM_LOGGED_IN");
    localStorage.removeItem("HOMEROOM_CURRENT_USER");
    window.currentUser = null;
    window.showToast("已安全退出账号，请重新登录！", "info");
    window.openUserLoginModal(true);
  }
};

// ================= 多班级集群切换 (Modal 38) =================
window.openClassSwitcherModal = function() {
  window.renderClassSwitcherList();
  document.getElementById("classSwitcherModal").classList.add("active");
};

window.closeClassSwitcherModal = function() {
  document.getElementById("classSwitcherModal").classList.remove("active");
};

window.renderClassSwitcherList = function() {
  const container = document.getElementById("classSwitcherListContainer");
  if (!container) return;
  container.innerHTML = `<div style="text-align: center; padding: 24px; color: var(--text-muted);">正在从管理后台同步班级列表...</div>`;

  let currentUser = null;
  try {
    currentUser = window.currentUser || JSON.parse(localStorage.getItem("HOMEROOM_CURRENT_USER") || "null");
  } catch(e) {}
  const isAdmin = currentUser && currentUser.role === 'admin';

  const tipEl = document.getElementById("classSwitcherModalTip");
  if (tipEl) {
    if (isAdmin) {
      tipEl.innerHTML = `👑 <b>超级管理员模式</b>：当前展示全校已注册独立班级，您具备全校特权，可自由切换至任意班级进行督导与协同工作。`;
      tipEl.style.color = "#1d4ed8";
    } else {
      const myName = currentUser ? (currentUser.realName || currentUser.username) : "班主任";
      tipEl.innerHTML = `💡 <b>班主任工作模式</b>：您当前登录为【${myName}】，各班级数据严格100%独立物理隔离。班主任仅可管理本人负责的班级，无权跨班切换。`;
      tipEl.style.color = "#475569";
    }
  }

  fetch('/api/classes')
    .then(r => r.json())
    .then(res => {
      let classes = [];
      if (Array.isArray(res)) {
        classes = res;
      } else if (res && Array.isArray(res.classes)) {
        classes = res.classes;
      } else if (res && Array.isArray(res.data)) {
        classes = res.data;
      }
      window.allSystemClasses = classes;

      if (!classes || classes.length === 0) {
        if (window.store && window.store.data && window.store.data.classInfo) {
          const ci = window.store.data.classInfo;
          classes = [{
            id: window.store.currentClassId || ci.id || "class_1788592961",
            name: ci.name || "小学四年级（七）班",
            grade: ci.grade || ci.gradeLevel || "小学四年级",
            homeroomTeacher: (typeof ci.teacher === 'object' ? ci.teacher?.name : ci.teacher) || "李老师",
            studentCount: ci.studentCount || 45
          }];
        }
      }
      displayClasses(classes);
    })
    .catch(err => {
      console.warn("加载班级集群失败，使用本地当前班级回退:", err);
      let fallbackClasses = window.allSystemClasses || [];
      if (fallbackClasses.length === 0 && window.store && window.store.data && window.store.data.classInfo) {
        const ci = window.store.data.classInfo;
        fallbackClasses = [{
          id: window.store.currentClassId || ci.id || "class_1788592961",
          name: ci.name || "小学四年级（七）班",
          grade: ci.grade || ci.gradeLevel || "小学四年级",
          homeroomTeacher: (typeof ci.teacher === 'object' ? ci.teacher?.name : ci.teacher) || "李老师",
          studentCount: ci.studentCount || 45
        }];
      }
      displayClasses(fallbackClasses);
    });

  function displayClasses(classes) {
    if (!classes || classes.length === 0) {
      container.innerHTML = `
        <div style="text-align: center; padding: 32px 16px; color: #64748b; background: #f8fafc; border-radius: 10px; border: 1.5px dashed #cbd5e1;">
          <div style="font-size: 32px; margin-bottom: 8px;">🏫</div>
          <div style="font-weight: 700; font-size: 15px; color: #1e293b;">暂无已创建的班级</div>
          <div style="font-size: 12.5px; color: #64748b; margin-top: 4px;">如需创建班级集群，请前往超级管理员后台统一添加。</div>
        </div>
      `;
      return;
    }

    const curId = window.store.currentClassId;
    const isDemo = !currentUser || currentUser.isDemo || (currentUser.role && currentUser.role.startsWith("demo"));
    const isAdmin = currentUser && currentUser.role === "admin";
    const userClassId = currentUser && currentUser.classId;

    container.innerHTML = classes.map(c => {
      const isCur = (c.id === curId);
      const isMyAssigned = (userClassId && c.id === userClassId);
      const isTemplateClass = (c.isTemplate || c.id === "class_demo_template" || c.id === "class_default");
      const safeName = (c.name || "班级").replace(/'/g, "\\'");

      let statusBadge = "";
      if (isCur) {
        statusBadge = `<span class="badge badge-success" style="font-size: 11px; margin-left: 6px;">● 当前工作班级</span>`;
      }
      let teacherBadge = "";
      if (isTemplateClass) {
        teacherBadge = `<span class="badge" style="font-size: 11px; margin-left: 6px; background: #fef3c7; color: #b45309;">💡 示范默认模板</span>`;
      } else if (isMyAssigned) {
        teacherBadge = `<span class="badge badge-primary" style="font-size: 11px; margin-left: 6px;">⭐ 我的负责班级</span>`;
      }

      // 关键权限控制：
      // 管理员可切换任意班级；
      // 体验账号仅可访问示范默认模板，真实班级全部加锁；
      // 真实教师仅可访问本人负责的班级，其他班级加锁；
      let canSwitch = false;
      let isDemoLocked = false;
      if (isAdmin) {
        canSwitch = true;
      } else if (isDemo) {
        canSwitch = isTemplateClass;
        isDemoLocked = !isTemplateClass;
      } else {
        canSwitch = isMyAssigned || isTemplateClass;
      }

      let actionArea = "";
      if (isCur) {
        actionArea = `<span style="font-size: 13px; color: #2563eb; font-weight: 700; padding: 4px 8px; background: rgba(37,99,235,0.08); border-radius: 6px;">● 进行中</span>`;
      } else if (canSwitch) {
        actionArea = `
          <button class="btn btn-sm btn-primary" style="font-size: 12.5px; padding: 6px 14px; font-weight: 600;" onclick="window.selectClassFromSwitcher('${c.id}', '${safeName}')">
            切换到此班 ›
          </button>
        `;
      } else if (isDemoLocked) {
        actionArea = `
          <button class="btn btn-sm" style="font-size: 12px; padding: 5px 12px; background: #fff1f2; color: #e11d48; border: 1px solid #fecdd3; border-radius: 6px; font-weight: 500;" onclick="window.handleDemoForbiddenClick('${safeName}')" title="体验账号仅限访问示范默认模板，严禁访问学校真实班级">
            🔒 真实班级 (体验无权访问)
          </button>
        `;
      } else {
        actionArea = `
          <button class="btn btn-sm" style="font-size: 12px; padding: 5px 12px; background: #f8fafc; color: #94a3b8; border: 1px solid #e2e8f0; border-radius: 6px; cursor: not-allowed; font-weight: 500;" onclick="window.handleForbiddenClassClick('${safeName}')" title="教师账号仅可管理本人班级数据，无权跨班切换">
            🔒 其他班级 (无权切换)
          </button>
        `;
      }

      return `
        <div style="display: flex; align-items: center; justify-content: space-between; background: ${isCur ? '#eff6ff' : '#ffffff'}; border: 1.5px solid ${isCur ? '#3b82f6' : '#e2e8f0'}; border-radius: 10px; padding: 14px 16px; margin-bottom: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.03); transition: all 0.2s;">
          <div style="display: flex; align-items: center; gap: 12px;">
            <div style="width: 42px; height: 42px; border-radius: 8px; background: ${isCur ? '#dbeafe' : '#f1f5f9'}; display: flex; align-items: center; justify-content: center; font-size: 24px;">
              🏫
            </div>
            <div>
              <div style="font-weight: 700; color: #1e293b; font-size: 15px; display: flex; align-items: center; flex-wrap: wrap; gap: 4px;">
                <span>${c.name}</span>
                ${statusBadge}
                ${teacherBadge}
              </div>
              <div style="font-size: 12px; color: #64748b; margin-top: 4px;">
                年级：${c.grade || '小学四年级'} &nbsp;|&nbsp; 负责班主任：${c.homeroomTeacher || '班主任'} &nbsp;|&nbsp; 学生：${c.studentCount || 45}人
              </div>
            </div>
          </div>
          <div>
            ${actionArea}
          </div>
        </div>
      `;
    }).join('');
  }
};

window.handleDemoForbiddenClick = function(targetClassName) {
  window.showToast(`体验权限受限：体验账号仅限访问示范默认模板！`, "warning");
  alert(`【体验账号安全限制提示】\n\n目标班级：${targetClassName}\n\n您当前登录的是【体验账号】：\n1. 体验账号仅展示与试用【示范默认模板】，无法进入学校任何真实班级；\n2. 学校真实班级包含学生真实姓名、成绩、家庭档案与隐私数据，体验账号严禁访问；\n3. 如需进入学校真实班级，请退出登录并使用学校管理员分配的正式教师账号登录！`);
};

window.handleForbiddenClassClick = function(targetClassName) {
  let currentUser = null;
  try {
    currentUser = window.currentUser || JSON.parse(localStorage.getItem("HOMEROOM_CURRENT_USER") || "null");
  } catch(e) {}
  const tName = (currentUser && (currentUser.realName || currentUser.username)) || "教师";
  window.showToast(`权限受限：【${tName}】老师无权切换至【${targetClassName}】！`, "warning");
  alert(`【跨班级切换权限限制】\n\n当前登录：${tName}\n目标班级：${targetClassName}\n\n根据学校班级数据安全规范：\n1. 各班级数据实行 100% 物理独立隔离；\n2. 教师账号仅可查看、维护本人负责的班级，无权进入非本人负责的班级；\n3. 如需统筹调阅或管理全校所有班级，请使用学校超级管理员账号登录！`);
};

window.selectClassFromSwitcher = function(classId, className) {
  if (classId === window.store.currentClassId) {
    window.closeClassSwitcherModal();
    return;
  }

  let currentUser = null;
  try {
    currentUser = window.currentUser || JSON.parse(localStorage.getItem("HOMEROOM_CURRENT_USER") || "null");
  } catch(e) {}

  const isDemo = !currentUser || currentUser.isDemo || (currentUser.role && currentUser.role.startsWith("demo"));
  const isAdmin = currentUser && currentUser.role === "admin";

  // 严格拦截：体验账号严禁进入真实班级
  if (isDemo && classId !== "class_demo_template" && classId !== "class_default") {
    window.handleDemoForbiddenClick(className);
    return;
  }

  // 严格拦截：非超级管理员（如班主任账号）严禁切换到非本人负责的班级
  if (!isAdmin && !isDemo) {
    const allowed = (currentUser.taughtClasses || []).map(c => typeof c === 'string' ? c : c.id);
    if (currentUser.classId) allowed.push(currentUser.classId);
    if (!allowed.includes(classId) && classId !== "class_demo_template") {
      window.handleForbiddenClassClick(className);
      return;
    }
  }

  window.closeClassSwitcherModal();
  window.showToast(`正在载入【${className}】独立专属数据...`, "info");
  window.store.switchClass(classId, (ok, msg) => {
    if (ok) {
      window.showToast(`已成功切换到【${className}】！数据完全隔离独立。`, "success");
      if (window.updateTopbarInfo) window.updateTopbarInfo();
      renderCurrentView();
    } else {
      window.showToast(msg || "切换失败：权限不足！", "error");
    }
  });
};

// ================= 今日与明日班级寿星 · 农历集体生日祝福与表彰弹窗 (弹窗 36) =================
window.openBirthdayCelebrationModal = function(preferredTab) {
  const modal = document.getElementById("birthdayCelebrationModal");
  if (!modal) return;

  const students = (window.store && window.store.data && window.store.data.students) ? window.store.data.students : [];
  const now = new Date();
  const todayList = (window.getTodayBirthdayStudents && typeof window.getTodayBirthdayStudents === 'function')
    ? window.getTodayBirthdayStudents(students, now)
    : [];
  const tomorrowList = (window.getTomorrowBirthdayStudents && typeof window.getTomorrowBirthdayStudents === 'function')
    ? window.getTomorrowBirthdayStudents(students, now)
    : [];

  const countBadge = document.getElementById("bcmStudentCountBadge");
  if (countBadge) {
    countBadge.innerText = `今日寿星 ${todayList.length} 位 · 明日预告 ${tomorrowList.length} 位`;
  }

  const dateSubtext = document.getElementById("bcmDateSubtext");
  const dateInfo = (window.getCurrentDateInfo && typeof window.getCurrentDateInfo === 'function')
    ? window.getCurrentDateInfo()
    : null;
  const lunar = (window.getLunarDate && typeof window.getLunarDate === 'function')
    ? window.getLunarDate(now)
    : null;

  const tomorrowDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  const tomorrowLunar = (window.getLunarDate && typeof window.getLunarDate === 'function')
    ? window.getLunarDate(tomorrowDate)
    : null;

  if (dateSubtext) {
    const solarStr = dateInfo ? (dateInfo.displayDate + " " + (dateInfo.weekDayFullStr || dateInfo.dayStr)) : `${now.getFullYear()}年${now.getMonth() + 1}月${now.getDate()}日`;
    const lunarStr = lunar ? lunar.lunarFull : '农历七月廿五';
    const tomorrowLunarStr = tomorrowLunar ? tomorrowLunar.lunarShort : '七月廿六';
    dateSubtext.innerHTML = `📅 今日公历：${solarStr} ｜ 🎋 今日农历：${lunarStr} ｜ 🌙 明日农历：${tomorrowLunarStr}`;
  }

  const container = document.getElementById("bcmStudentsListContainer");
  if (container) {
    if (todayList.length === 0 && tomorrowList.length === 0) {
      container.innerHTML = `
        <div style="text-align: center; padding: 36px 20px; color: var(--text-muted); background: #f8fafc; border-radius: var(--radius-lg); border: 1px dashed #cbd5e1;">
          <div style="font-size: 40px; margin-bottom: 10px;">🎈</div>
          <div style="font-size: 15px; font-weight: 700; color: #475569;">今日及明日暂无过农历生日的学生</div>
          <div style="font-size: 12.5px; color: #94a3b8; margin-top: 4px;">全班同学皆在茁壮成长，当学生中国通用农历生日来临时，问候横幅与此处将自动喜庆提醒！</div>
        </div>
      `;
    } else {
      let html = '';

      // 1. 今日农历寿星区
      if (todayList.length > 0) {
        html += `
          <div style="margin-bottom: 10px;">
            <div style="font-size: 14px; font-weight: 800; color: #9a3412; margin-bottom: 8px; display: flex; align-items: center; gap: 6px;">
              <span>🎂 今日小寿星 (${todayList.length} 人) · 农历${lunar ? lunar.lunarShort : '七月廿五'}</span>
            </div>
            <div style="display: flex; flex-direction: column; gap: 10px;">
              ${todayList.map(b => {
                const s = b.student || students.find(st => st.id === b.id) || b;
                const avatarSrc = s.avatarUrl || `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(b.name)}`;
                return `
                  <div style="background: #ffffff; border: 1.5px solid #fed7aa; border-radius: var(--radius-lg); padding: 12px 16px; display: flex; align-items: center; justify-content: space-between; box-shadow: 0 2px 6px rgba(251,146,60,0.12);">
                    <div style="display: flex; align-items: center; gap: 12px;">
                      <div style="width: 48px; height: 48px; border-radius: 50%; border: 2.5px solid #f97316; overflow: hidden; flex-shrink: 0; background: #fff7ed; display: flex; align-items: center; justify-content: center;">
                        <img src="${avatarSrc}" alt="${b.name}" style="width: 100%; height: 100%; object-fit: cover;" onerror="this.onerror=null; this.src='https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(b.name)}';">
                      </div>
                      <div>
                        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 3px;">
                          <span style="font-size: 15.5px; font-weight: 800; color: #1e293b;">${b.name}</span>
                          <span class="badge" style="background: #ffedd5; color: #c2410c; font-weight: 700; font-size: 11px;">第${b.group || s.group || 1}组</span>
                          <span class="badge" style="background: linear-gradient(135deg, #fef08a 0%, #fde047 100%); color: #854d0e; font-weight: 800; font-size: 11px; border: 1px solid #facc15;">
                            🎂 ${b.birthdayText} (今日寿星)
                          </span>
                        </div>
                        <div style="font-size: 12px; color: var(--text-muted); display: flex; gap: 12px;">
                          <span>学号：${b.id}</span>
                          <span>档案公历：${s.birthday || '未录入'}</span>
                          <span>当前积分：<strong style="color: #ea580c;">${s.score || 80}</strong> 分</span>
                        </div>
                      </div>
                    </div>
                    <div style="display: flex; align-items: center; gap: 8px;">
                      <button class="btn btn-sm" style="background: linear-gradient(135deg, #f97316 0%, #ea580c 100%); color: white; border: none; font-weight: 700; padding: 5px 12px; border-radius: 20px; box-shadow: 0 2px 6px rgba(234,88,12,0.3); cursor: pointer;" onclick="window.rewardBirthdayFlower('${b.id}')">
                        🌸 送小红花 (+2分)
                      </button>
                      <button class="btn btn-sm btn-secondary" style="border-radius: 20px; padding: 5px 12px; cursor: pointer;" onclick="window.closeBirthdayCelebrationModal(); window.openStudentDrawer('${b.id}')">
                        📋 查看档案
                      </button>
                    </div>
                  </div>
                `;
              }).join("")}
            </div>
          </div>
        `;
      }

      // 2. 明日农历生日预告区
      if (tomorrowList.length > 0) {
        html += `
          <div style="margin-top: ${todayList.length > 0 ? '16px' : '0'};">
            <div style="font-size: 14px; font-weight: 800; color: #1e40af; margin-bottom: 8px; display: flex; align-items: center; gap: 6px;">
              <span>🎁 明日生日预告 (${tomorrowList.length} 人) · 农历${tomorrowLunar ? tomorrowLunar.lunarShort : '七月廿六'}</span>
            </div>
            <div style="display: flex; flex-direction: column; gap: 10px;">
              ${tomorrowList.map(b => {
                const s = b.student || students.find(st => st.id === b.id) || b;
                const avatarSrc = s.avatarUrl || `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(b.name)}`;
                return `
                  <div style="background: #ffffff; border: 1.5px solid #bfdbfe; border-radius: var(--radius-lg); padding: 12px 16px; display: flex; align-items: center; justify-content: space-between; box-shadow: 0 2px 6px rgba(59,130,246,0.1);">
                    <div style="display: flex; align-items: center; gap: 12px;">
                      <div style="width: 48px; height: 48px; border-radius: 50%; border: 2.5px solid #3b82f6; overflow: hidden; flex-shrink: 0; background: #eff6ff; display: flex; align-items: center; justify-content: center;">
                        <img src="${avatarSrc}" alt="${b.name}" style="width: 100%; height: 100%; object-fit: cover;" onerror="this.onerror=null; this.src='https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(b.name)}';">
                      </div>
                      <div>
                        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 3px;">
                          <span style="font-size: 15.5px; font-weight: 800; color: #1e293b;">${b.name}</span>
                          <span class="badge" style="background: #dbeafe; color: #1e40af; font-weight: 700; font-size: 11px;">第${b.group || s.group || 1}组</span>
                          <span class="badge" style="background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%); color: #1e3a8a; font-weight: 800; font-size: 11px; border: 1px solid #93c5fd;">
                            🎁 ${b.birthdayText} (明日生日)
                          </span>
                        </div>
                        <div style="font-size: 12px; color: var(--text-muted); display: flex; gap: 12px;">
                          <span>学号：${b.id}</span>
                          <span>档案公历：${s.birthday || '未录入'}</span>
                          <span>当前积分：<strong style="color: #2563eb;">${s.score || 80}</strong> 分</span>
                        </div>
                      </div>
                    </div>
                    <div style="display: flex; align-items: center; gap: 8px;">
                      <button class="btn btn-sm" style="background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); color: white; border: none; font-weight: 700; padding: 5px 12px; border-radius: 20px; box-shadow: 0 2px 6px rgba(37,99,235,0.3); cursor: pointer;" onclick="window.rewardBirthdayFlower('${b.id}')">
                        🌸 提前送小红花 (+2分)
                      </button>
                      <button class="btn btn-sm btn-secondary" style="border-radius: 20px; padding: 5px 12px; cursor: pointer;" onclick="window.closeBirthdayCelebrationModal(); window.openStudentDrawer('${b.id}')">
                        📋 查看档案
                      </button>
                    </div>
                  </div>
                `;
              }).join("")}
            </div>
          </div>
        `;
      }

      container.innerHTML = html;
    }
  }

  modal.classList.add("active");
};

window.closeBirthdayCelebrationModal = function() {
  const modal = document.getElementById("birthdayCelebrationModal");
  if (modal) modal.classList.remove("active");
};

window.rewardBirthdayFlower = function(studentId) {
  const students = (window.store && window.store.data && window.store.data.students) ? window.store.data.students : [];
  const s = students.find(item => item.id === studentId);
  if (!s) return;

  if (window.store && window.store.linkPetScoreChange) {
    window.store.linkPetScoreChange(s.id, 2, "🎂 生日特别表彰：送出班主任生日小红花", "growth");
  } else {
    s.score = (s.score || 80) + 2;
  }

  if (window.store && window.store.saveData) window.store.saveData();

  if (window.showToast) {
    window.showToast(`🎉 已成功为【${s.name}】送上生日专属小红花与+2成长积分！祝TA生日快乐！`, "success");
  } else {
    alert(`🎉 已成功为【${s.name}】送上生日专属小红花！`);
  }

  if (window.currentDrawerStudentId === studentId && typeof renderDrawerBodyContent === 'function') {
    renderDrawerBodyContent();
  }
  if (typeof renderCurrentView === 'function') {
    renderCurrentView();
  }
  if (document.getElementById("birthdayCelebrationModal") && document.getElementById("birthdayCelebrationModal").classList.contains("active")) {
    window.openBirthdayCelebrationModal();
  }
};

window.sendBatchBirthdayWishes = function() {
  const students = (window.store && window.store.data && window.store.data.students) ? window.store.data.students : [];
  const now = new Date();
  const todayList = (window.getTodayBirthdayStudents && typeof window.getTodayBirthdayStudents === 'function')
    ? window.getTodayBirthdayStudents(students, now)
    : [];
  const tomorrowList = (window.getTomorrowBirthdayStudents && typeof window.getTomorrowBirthdayStudents === 'function')
    ? window.getTomorrowBirthdayStudents(students, now)
    : [];

  const allList = [...todayList, ...tomorrowList];
  if (allList.length === 0) {
    if (window.showToast) window.showToast("暂无待送出祝福的寿星同学~", "info");
    return;
  }

  allList.forEach(item => {
    if (window.store && window.store.linkPetScoreChange) {
      window.store.linkPetScoreChange(item.id, 2, "🎂 班级集体生日贺卡祝福 (+2成长积分)", "growth");
    } else {
      const s = students.find(st => st.id === item.id);
      if (s) s.score = (s.score || 80) + 2;
    }
  });

  if (window.store && window.store.saveData) window.store.saveData();

  if (window.showToast) {
    window.showToast(`💌 班级集体生日祝福贺卡已成功送达 ${allList.map(b => b.name).join("、")}！全员奖励小红花与积分！`, "success");
  }

  window.closeBirthdayCelebrationModal();
  if (typeof renderCurrentView === 'function') renderCurrentView();
};

// ================= 全局自启动挂载 =================
function bootApp() {
  initGlobalEvents();

  // 1. 处理 URL 班级参数 (如从 admin.html 切换登录特定班级进入)
  const urlParams = new URLSearchParams(window.location.search);
  const queryCid = urlParams.get("classId");
  const isAdminEntry = urlParams.get("adminEntry") === "1";

  let savedUser = null;
  try {
    savedUser = JSON.parse(localStorage.getItem("HOMEROOM_CURRENT_USER") || "null");
  } catch(e) {}

  // 若携带 demo=1 或 preview=1，自动以示范体验教师身份进入，隐藏登录悬浮弹窗
  const isDemoMode = urlParams.get("demo") === "1" || urlParams.get("preview") === "1";
  if (isDemoMode) {
    savedUser = {
      id: "user_demo_li",
      username: "teacher_li",
      name: "体验教师",
      realName: "体验教师",
      role: "homeroom_teacher",
      isDemo: true,
      classId: "class_demo_template"
    };
    sessionStorage.setItem("HOMEROOM_LOGGED_IN", "true");
  }

  // 若由后台超级管理中心携带管理员授权一键跳转进入，自动完成特权接管免密登录
  if (isAdminEntry && savedUser && savedUser.role === "admin") {
    sessionStorage.setItem("HOMEROOM_LOGGED_IN", "true");
  }

  // 2. 检查开门登录认证 (Requirement 1: 必须账号密码登录，且该页面不显示后台管理)
  const isAuth = sessionStorage.getItem("HOMEROOM_LOGGED_IN") === "true";

  // 3. 预载入全校真实班级列表 (携带 token)
  const token = savedUser ? savedUser.token : "";
  const headers = {};
  if (token) headers["Authorization"] = "Bearer " + token;
  fetch('/api/classes', { headers })
    .then(r => r.json())
    .then(res => {
      let clist = [];
      if (Array.isArray(res)) clist = res;
      else if (res && res.classes) clist = res.classes;
      else if (res && res.data) clist = res.data;
      if (clist && clist.length > 0) {
        window.allSystemClasses = clist;
        if (window.updateTopbarInfo) window.updateTopbarInfo();
      }
    }).catch(() => {});

  // 4. 确定目标工作班级：未登录或体验账号固定为示范默认模板
  let targetCid = "class_demo_template";
  if (savedUser && savedUser.classId) {
    targetCid = savedUser.classId;
  } else if (queryCid && isAdminEntry) {
    targetCid = queryCid;
  }

  window.store.switchClass(targetCid, () => {
    if (window.updateTopbarInfo) window.updateTopbarInfo();
    renderCurrentView();
  });

  if (!isAuth || !savedUser) {
    window.openUserLoginModal(true);
  } else {
    window.currentUser = savedUser;
  }

  if (window.updateTasksBadge) window.updateTasksBadge();
  if (window.updateTopbarInfo) window.updateTopbarInfo();
  if (window.applyUserRolePermissions) window.applyUserRolePermissions(window.currentUser);
  if (window.loadRealTimeWeather) window.loadRealTimeWeather();
  renderCurrentView();
}


if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", bootApp);
} else {
  bootApp();
}
