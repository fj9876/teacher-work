/**
 * 班主任工作台 - 数据持久化与核心状态管理中心 (Store)
 * 具备：localStorage 自动保存、增删改查、JSON 备份导出与还原、
 * Excel (XLSX) 多表导入与导出、响应式状态监听器
 */

const STORAGE_KEY = "HOMEROOM_WORKBENCH_DATA_V1";

// 统一格式化小组显示名称（如 1 -> "第1组"，"1" -> "第1组"，"卓越组" -> "卓越组"，"第一组" -> "第一组"）
window.formatGroupName = function(g) {
  if (g === undefined || g === null || g === "") return "未分组";
  const str = String(g).trim();
  if (!str) return "未分组";
  if (/^\d+$/.test(str)) {
    return `第${str}组`;
  }
  return str;
};
window.normalizeSmartBoardGroupName = window.formatGroupName;

// 统一判断学生是否属于指定小组（兼容数字、带“第”前缀、自定义名称如“卓越组”、“第一组”）
window.isStudentInGroup = function(studentGroup, targetGroupName) {
  if (studentGroup === undefined || studentGroup === null || studentGroup === "") {
    return !targetGroupName || targetGroupName === "未分组";
  }
  if (!targetGroupName || targetGroupName === "全部小组") return true;
  const sgStr = String(studentGroup).trim();
  const tgStr = String(targetGroupName).trim();
  if (sgStr === tgStr) return true;
  const normS = window.formatGroupName(sgStr);
  const normT = window.formatGroupName(tgStr);
  if (normS === normT) return true;
  // 提取纯数字比对（仅当双方都含有“组”或纯数字时）
  const digitS = sgStr.replace(/\D/g, '');
  const digitT = tgStr.replace(/\D/g, '');
  if (digitS && digitT && digitS === digitT) {
    if ((sgStr.includes('组') || /^\d+$/.test(sgStr)) && (tgStr.includes('组') || /^\d+$/.test(tgStr))) {
      return true;
    }
  }
  return false;
};

// 解析学生拥有的全部标签及其获得次数
window.getStudentTagsWithCount = function(s) {
  if (!s) return [];
  const map = {};
  const rawList = Array.isArray(s.tags) ? s.tags : (s.tag ? [s.tag] : []);
  rawList.forEach(item => {
    if (!item) return;
    const str = String(item).trim();
    if (!str) return;
    // 匹配类似 "文明之星*2" 或 "文明之星 * 2" 或 "文明之星×2"
    const m = str.match(/^(.*?)\s*[*×x]\s*(\d+)$/);
    if (m) {
      const t = m[1].trim();
      const c = parseInt(m[2], 10) || 1;
      map[t] = Math.max(map[t] || 0, c);
    } else {
      map[str] = (map[str] || 0) + 1;
    }
  });

  // 合并 s.tagCounts 显式字典 (权重更高)
  if (s.tagCounts && typeof s.tagCounts === "object") {
    Object.entries(s.tagCounts).forEach(([t, c]) => {
      const num = parseInt(c, 10);
      if (num > 0) {
        map[t] = num;
      } else if (num === 0) {
        delete map[t];
      }
    });
  }

  return Object.entries(map).map(([tag, count]) => ({ tag, count }));
};

// 格式化标签展示文案（如 count > 1 时显示 "文明之星*2"）
window.formatTagDisplay = function(tag, count) {
  if (!tag) return "";
  const num = parseInt(count, 10) || 1;
  return num > 1 ? `${tag}*${num}` : tag;
};

// 判断学生是否拥有指定标签（无论1次还是多次）
window.isStudentHasTag = function(s, targetTag) {
  if (!s || !targetTag) return false;
  const list = window.getStudentTagsWithCount(s);
  return list.some(item => item.tag === targetTag && item.count > 0);
};

class DataStore {
  constructor() {
    this.listeners = [];
    let savedUser = null;
    try {
      savedUser = JSON.parse(localStorage.getItem("HOMEROOM_CURRENT_USER") || "null");
    } catch(e) {}
    if (savedUser && savedUser.classId) {
      this.currentClassId = savedUser.classId;
    } else {
      const savedCid = localStorage.getItem("CURRENT_CLASS_ID");
      this.currentClassId = (savedCid && savedCid !== "class_default" && savedCid !== "class_1788592961") ? savedCid : "class_demo_template";
    }
    this.initData();
  }

  // 初始化或从本地读取
  initData() {
    try {
      const classKey = STORAGE_KEY + "_" + this.currentClassId;
      const localStr = localStorage.getItem(classKey) || localStorage.getItem(STORAGE_KEY);
      if (localStr) {
        this.data = JSON.parse(localStr);
        if (!this.data.students || this.data.students.length === 0) {
          this.data = JSON.parse(JSON.stringify(window.DEFAULT_DATA));
          this.save();
        }
      } else {
        this.data = JSON.parse(JSON.stringify(window.DEFAULT_DATA));
        this.save();
      }
    } catch (e) {
      console.warn("读取本地缓存失败，使用预置数据", e);
      this.data = JSON.parse(JSON.stringify(window.DEFAULT_DATA));
      this.save();
    }

    if (this.data && this.data.classInfo) {
      if (this.data.classInfo.name === "三年级2班" || !this.data.classInfo.name) {
        if (this.currentClassId === "class_1788592961") {
          this.data.classInfo.name = "小学四年级（七）班";
          this.data.classInfo.grade = "小学四年级";
          this.data.classInfo.gradeLevel = "小学四年级";
        } else if (this.currentClassId === "class_demo_template" || !this.currentClassId) {
          this.data.classInfo.name = "【示范体验】班级默认模板";
          this.data.classInfo.grade = "小学四年级";
          this.data.classInfo.gradeLevel = "小学四年级";
        }
      }
      if (Array.isArray(this.data.students)) {
        this.data.classInfo.studentCount = this.data.students.length;
      }
    }

    // 自动自愈清理非体验班级中残留的模板数据
    this.purgeTemplateRemnants();

    // 确保积分规则存在
    if (!this.data.scoreRules) {
      this.data.scoreRules = (window.DEFAULT_DATA && window.DEFAULT_DATA.scoreRules) ?
        JSON.parse(JSON.stringify(window.DEFAULT_DATA.scoreRules)) : {
          baseScore: 80, hwSubmitBonus: 5, hwUnsubmitPenalty: -2,
          examExcellent: 20, examGood: 10, examPass: 5, examFail: 0,
          attNormalBonus: 5, attLatePenalty: -2, attAbsentPenalty: -5, growthAward: 3, flowerValue: 3
        };
    }
    if (this.data.scoreRules && this.data.scoreRules.flowerValue === undefined) {
      this.data.scoreRules.flowerValue = 3;
    }

    // 确保综合素质评价指标与成长事件存在
    if (!this.data.growthDimensions || this.data.growthDimensions.length === 0) {
      this.data.growthDimensions = [
        { id: "dim_1", name: "课堂表现", count: 15, icon: "🙋" },
        { id: "dim_2", name: "学习习惯", count: 12, icon: "📖" },
        { id: "dim_3", name: "作业完成", count: 18, icon: "✍️" },
        { id: "dim_4", name: "文明礼仪", count: 10, icon: "🤝" },
        { id: "dim_5", name: "劳动卫生", count: 8, icon: "🧹" },
        { id: "dim_6", name: "团结合作", count: 14, icon: "🌈" },
        { id: "dim_7", name: "纪律表现", count: 9, icon: "🛡️" },
        { id: "dim_8", name: "体育锻炼", count: 11, icon: "⚽" },
        { id: "dim_9", name: "兴趣特长", count: 7, icon: "🎨" },
        { id: "dim_10", name: "责任意识", count: 13, icon: "🎖️" }
      ];
    }
    if (!this.data.growthEvents) {
      this.data.growthEvents = [];
    }
    this.updateDimCounts();

    if (this.data.hasImportedRealStudents === undefined) {
      const isDefaultDemoClass = this.data.students && this.data.students.some(s => s.name === "陈思远" && s.id === "20240001");
      this.data.hasImportedRealStudents = !isDefaultDemoClass;
      this.data.isTemplateData = isDefaultDemoClass;
    }
    // 确保活动数据具备丰富相册与纪要
    if (!this.data.activities || this.data.activities.length === 0 || !this.data.activities[0].goals) {
      if (window.DEFAULT_DATA && window.DEFAULT_DATA.activities) {
        this.data.activities = JSON.parse(JSON.stringify(window.DEFAULT_DATA.activities));
      }
    }
    // 确保学生档案均包含 18 位身份证号码 (idCard)
    if (this.data.students) {
      this.data.students.forEach((s, idx) => {
        if (!s.idCard) {
          const b = (s.birthday || "2016-05-15").replace(/-/g, "");
          const seq = String(1001 + idx).slice(1);
          const genderDigit = s.gender === "女" ? "2" : "1";
          s.idCard = `110101${b}${seq}${genderDigit}`;
        }
      });
    }
    // 确保考试具备自定义科目结构与总分统计
    if (this.data.exams) {
      this.data.exams.forEach(e => {
        if (!e.subjects || e.subjects.length === 0) e.subjects = ["语文", "数学", "英语", "科学"];
        if (e.scores) {
          e.scores.forEach((sc, i) => {
            if (!sc.subjectScores) {
              const base = sc.score || 85;
              const c = Math.min(100, Math.max(55, Math.round(base + (i % 3 === 0 ? 2 : -2))));
              const m = Math.min(100, Math.max(55, Math.round(base + (i % 2 === 0 ? 3 : -1))));
              const en = Math.min(100, Math.max(55, Math.round(base + (i % 4 === 0 ? 1 : -3))));
              const sci = Math.min(100, Math.max(55, Math.round(base + (i % 5 === 0 ? 2 : 0))));
              sc.subjectScores = { "语文": c, "数学": m, "英语": en, "科学": sci };
              sc.chinese = c;
              sc.math = m;
              sc.english = en;
              sc.science = sci;
              sc.totalScore = c + m + en + sci;
            } else if (sc.totalScore === undefined) {
              let sum = 0;
              Object.values(sc.subjectScores).forEach(v => { sum += (parseFloat(v) || 0); });
              sc.totalScore = sum;
              sc.score = sum;
            }
          });
        }
      });
    }
    // 确保报表模板库存在
    if (!this.data.reportTemplates || this.data.reportTemplates.length === 0) {
      if (window.DEFAULT_DATA && window.DEFAULT_DATA.reportTemplates) {
        this.data.reportTemplates = JSON.parse(JSON.stringify(window.DEFAULT_DATA.reportTemplates));
      }
    }

    // 确保班级小组列表存在并支持自拟增删
    if (!this.data.groups || this.data.groups.length === 0) {
      this.data.groups = ["第1组", "第2组", "第3组", "第4组", "第5组", "第6组"];
    }

    // 确保个性化成长标签库存在并自动聚合同步学生档案已有标签
    this.getTagsPool();

    // 确保教室课桌排布网格维度配置存在 (默认 8排 × 6列，可自定义缩放)
    if (!this.data.seatingGrid || !this.data.seatingGrid.rows || !this.data.seatingGrid.cols) {
      this.data.seatingGrid = { rows: 8, cols: 6 };
    }

    // 确保三大班规模板与公约列表完整
    if (!this.data.classRules) {
      this.data.classRules = (window.DEFAULT_DATA && window.DEFAULT_DATA.classRules)
        ? JSON.parse(JSON.stringify(window.DEFAULT_DATA.classRules))
        : { templates: [], rulesList: [], rewardFineRules: [] };
    }
    if (!this.data.classRules.templates || this.data.classRules.templates.length === 0) {
      if (window.DEFAULT_DATA && window.DEFAULT_DATA.classRules && window.DEFAULT_DATA.classRules.templates) {
        this.data.classRules.templates = JSON.parse(JSON.stringify(window.DEFAULT_DATA.classRules.templates));
      }
    }

    // 确保班规公约分类板块列表存在并支持自拟增删
    if (!this.data.classRules.categories || this.data.classRules.categories.length === 0) {
      this.data.classRules.categories = [
        "早读与晨会", "课堂自律规范", "课间文明活动", "午餐与午间静校",
        "作业书写规范", "卫生值日要求", "放学离校规范", "仪容仪表礼仪"
      ];
    }

    // 确保 1530 安全教育类型支持自定义增删
    if (!this.data.safetyTypes || this.data.safetyTypes.length === 0) {
      this.data.safetyTypes = [
        { id: "st_1", name: "每天放学前 1分钟提醒", shortName: "1分钟提醒", badgeClass: "badge-info" },
        { id: "st_2", name: "周末节假日前 5分钟教育", shortName: "5分钟教育", badgeClass: "badge-warning" },
        { id: "st_3", name: "长假前 30分钟专题安全班会", shortName: "30分钟专题", badgeClass: "badge-purple" }
      ];
    }

    // 确保 1530 留痕记录均包含多附件结构支持 (图片、视频、PPT、Word、PDF)
    if (this.data.safety1530 && Array.isArray(this.data.safety1530)) {
      this.data.safety1530.forEach((s, idx) => {
        if (!s.attachments || !Array.isArray(s.attachments) || s.attachments.length === 0) {
          const top = s.topic || "安全教育";
          const mat = s.materials || "";
          const defaultAtts = [];
          if (mat.includes("PPT") || top.includes("交通") || idx % 2 === 0) {
            defaultAtts.push({
              id: "att_sample_ppt_" + idx,
              name: `${top}专题课件.pptx`,
              size: "3.8 MB",
              type: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
              fileType: "ppt",
              previewSummary: `包含《${top}》完整18页幻灯片、警示案例分析、红绿灯路队通行动画演示与随堂互动问答。`,
              uploadTime: s.date || "2026-09-04"
            });
          }
          if (mat.includes("视频") || top.includes("防溺水") || top.includes("消防") || idx % 3 === 0) {
            defaultAtts.push({
              id: "att_sample_vid_" + idx,
              name: `${top}警示教育宣传片.mp4`,
              size: "14.6 MB",
              type: "video/mp4",
              fileType: "video",
              previewSummary: `时长 3 分钟，高保真演练《${top}》情景再现与自救自护科普教学视频。`,
              uploadTime: s.date || "2026-09-04"
            });
          }
          defaultAtts.push({
            id: "att_sample_img_" + idx,
            name: `${top}班会宣讲现场照片.jpg`,
            size: "1.9 MB",
            type: "image/jpeg",
            fileType: "image",
            previewSummary: `本班教室现场宣讲《${top}》留痕实拍记录，全员参与。`,
            uploadTime: s.date || "2026-09-04"
          });
          defaultAtts.push({
            id: "att_sample_doc_" + idx,
            name: `${top}教师宣讲教案与纪要.docx`,
            size: "72 KB",
            type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            fileType: "word",
            previewSummary: `公文格式排版，详尽记载宣讲核心条款、强调要点、学生反馈及家校协同叮嘱。`,
            uploadTime: s.date || "2026-09-04"
          });
          s.attachments = defaultAtts;
        }
      });
    }

    // 确保十维评价指标配置结构存在且可维护
    if (!this.data.growthDimensions || !Array.isArray(this.data.growthDimensions) || this.data.growthDimensions.length === 0) {
      this.data.growthDimensions = [
        { id: "dim_1", name: "学习习惯", count: 28, icon: "📚" },
        { id: "dim_2", name: "课堂表现", count: 34, icon: "🙋‍♂️" },
        { id: "dim_3", name: "作业质量", count: 42, icon: "✏️" },
        { id: "dim_4", name: "纪律规范", count: 19, icon: "⭐" },
        { id: "dim_5", name: "劳动卫生", count: 25, icon: "🧹" },
        { id: "dim_6", name: "团结友善", count: 31, icon: "🤝" },
        { id: "dim_7", name: "体育锻炼", count: 22, icon: "🏃" },
        { id: "dim_8", name: "艺术素养", count: 16, icon: "🎨" },
        { id: "dim_9", name: "科学探究", count: 18, icon: "🔬" },
        { id: "dim_10", name: "责任意识", count: 13, icon: "🎖️" }
      ];
    }

    // 确保班级萌宠全栏目成长动态流水存在
    if (!this.data.petActivities) {
      this.data.petActivities = [
        { id: "pa_1", date: "2026-09-04", time: "16:20", studentName: "陈思远", delta: 6, reason: "成长评价【责任意识】获2朵小红花", category: "growth", icon: "🌸", newScore: 92, petLevel: 3 },
        { id: "pa_2", date: "2026-09-04", time: "14:10", studentName: "刘思琪", delta: 15, reason: "语文测验成绩98分优异", category: "exam", icon: "💯", newScore: 95, petLevel: 3 },
        { id: "pa_3", date: "2026-09-04", time: "08:15", studentName: "邹雅洁", delta: 5, reason: "早读考勤全勤正常", category: "attendance", icon: "⏰", newScore: 85, petLevel: 2 }
      ];
    }

    // 确保 OpenAI 兼容多大模型与系统提示词库配置就绪
    this.initAIConfig();
  }

  // 持久化到 localStorage 与本地后端服务并同步界面
  save() {
    try {
      if (this.data && this.data.classInfo && Array.isArray(this.data.students)) {
        this.data.classInfo.studentCount = this.data.students.length;
      }
      const classId = this.currentClassId || "class_demo_template";
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data));
      localStorage.setItem(STORAGE_KEY + "_" + classId, JSON.stringify(this.data));
      this.notify();
      if (window.updateTasksBadge) window.updateTasksBadge();
      if (window.updateTopbarInfo) window.updateTopbarInfo();

      // 异步持久化至本地后端服务 (携带当前用户 Token 鉴权)
      if (typeof fetch !== "undefined") {
        let currentUser = null;
        try {
          currentUser = window.currentUser || JSON.parse(localStorage.getItem("HOMEROOM_CURRENT_USER") || "null");
        } catch(e) {}
        const token = currentUser ? currentUser.token : "";
        const headers = { "Content-Type": "application/json" };
        if (token) headers["Authorization"] = "Bearer " + token;

        fetch(`/api/classes/${classId}/data`, {
          method: "POST",
          headers: headers,
          body: JSON.stringify(this.data)
        }).then(r => r.json()).then(res => {
          if (res && res.code === 403) {
            if (window.showToast) window.showToast(res.message || "权限拦截：无权修改该班级数据", "error");
          }
        }).catch(() => {});
      }
    } catch (e) {
      console.error("保存本地存储失败", e);
      alert("本地存储空间可能已满或受限！");
    }
  }

  // 切换班级数据 (100% 独立隔离与权限保护)
  async switchClass(classId, callback) {
    if (!classId) return;
    this.currentClassId = classId;
    localStorage.setItem("CURRENT_CLASS_ID", classId);

    let currentUser = null;
    try {
      currentUser = window.currentUser || JSON.parse(localStorage.getItem("HOMEROOM_CURRENT_USER") || "null");
    } catch(e) {}
    const token = currentUser ? currentUser.token : "";
    const headers = {};
    if (token) headers["Authorization"] = "Bearer " + token;

    // 优先尝试从后端获取该班级最新独立数据
    try {
      const res = await fetch(`/api/classes/${classId}/data`, { headers });
      const json = await res.json();
      if (json && (json.code === 200 || json.success) && json.data) {
        this.data = json.data;
        if (!this.data.students) this.data.students = [];
        if (this.data.classInfo) {
          this.data.classInfo.studentCount = this.data.students.length;
          if (this.data.classInfo.name === "三年级2班" || !this.data.classInfo.name) {
            if (classId === "class_1788592961") {
              this.data.classInfo.name = "小学四年级（七）班";
            } else if (classId === "class_demo_template") {
              this.data.classInfo.name = "【示范体验】班级默认模板";
            }
          }
        }
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data));
        localStorage.setItem(STORAGE_KEY + "_" + classId, JSON.stringify(this.data));
        this.notify();
        if (window.updateTopbarInfo) window.updateTopbarInfo();
        if (callback) callback(true, "已成功拉取并切换至该班级数据！");
        return;
      } else if (json && json.code === 403) {
        const msg = json.message || "权限不足：您无权访问该班级数据！";
        if (window.showToast) window.showToast(msg, "warning");
        if (callback) callback(false, msg);
        return;
      }
    } catch (err) {
      // 离线环境从本地存储读取
    }

    const localStr = localStorage.getItem(STORAGE_KEY + "_" + classId) || localStorage.getItem(STORAGE_KEY);
    if (localStr) {
      try {
        this.data = JSON.parse(localStr);
      } catch (e) {
        this.data = JSON.parse(JSON.stringify(window.DEFAULT_DATA));
      }
    } else {
      this.data = JSON.parse(JSON.stringify(window.DEFAULT_DATA));
    }
    if (this.data && this.data.classInfo) {
      if (this.data.classInfo.name === "三年级2班" || !this.data.classInfo.name) {
        if (classId === "class_1788592961") {
          this.data.classInfo.name = "小学四年级（七）班";
        } else if (classId === "class_demo_template") {
          this.data.classInfo.name = "【示范体验】班级默认模板";
        }
      }
    }
    this.save();
    if (window.updateTopbarInfo) window.updateTopbarInfo();
    if (callback) callback(true, "已切换班级数据！");
  }

  subscribe(fn) {
    this.listeners.push(fn);
  }

  notify() {
    this.listeners.forEach(fn => {
      try { fn(this.data); } catch (err) { console.error(err); }
    });
  }

  resetToDefault() {
    this.data = JSON.parse(JSON.stringify(window.DEFAULT_DATA));
    this.save();
  }

  exportBackupJSON() {
    const jsonStr = JSON.stringify(this.data, null, 2);
    const blob = new Blob([jsonStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const dateStr = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = `班主任工作台_完整数据备份_${dateStr}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  importBackupJSON(file, callback) {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const imported = JSON.parse(e.target.result);
        if (imported.students && imported.classInfo) {
          this.data = imported;
          this.save();
          if (callback) callback(true, "导入成功！已恢复全部班级数据。");
        } else {
          if (callback) callback(false, "文件格式不正确，缺少班级核心数据！");
        }
      } catch (err) {
        if (callback) callback(false, "无法解析该 JSON 备份文件！");
      }
    };
    reader.readAsText(file);
  }

  getStorageUsage() {
    const str = localStorage.getItem(STORAGE_KEY) || "";
    const bytes = new Blob([str]).size;
    const attRecs = (this.data.attendance && this.data.attendance.records) ? Object.keys(this.data.attendance.records).length : 0;
    const attLeaves = (this.data.attendance && this.data.attendance.leaves) ? this.data.attendance.leaves.length : 0;
    return {
      bytes: bytes,
      kb: (bytes / 1024).toFixed(1),
      studentsCount: this.data.students ? this.data.students.length : 0,
      tasksCount: this.data.tasks ? this.data.tasks.length : 0,
      safetyCount: this.data.safety1530 ? this.data.safety1530.length : 0,
      examsCount: this.data.exams ? this.data.exams.length : 0,
      attendanceCount: attRecs > 0 ? `${attRecs} 天记录` : (attLeaves > 0 ? `${attLeaves} 条请假` : '0 条'),
      petsCount: this.data.students ? this.data.students.length : 0
    };
  }

  // ================= 1. 班务管理 =================
  addTask(task) {
    task.id = "task-" + Date.now();
    if (!this.data.tasks) this.data.tasks = [];
    this.data.tasks.unshift(task);
    this.save();
  }

  updateTask(taskId, fields) {
    const t = this.data.tasks.find(item => item.id === taskId);
    if (t) {
      Object.assign(t, fields);
      this.save();
    }
  }

  updateTaskStatus(taskId, status) {
    const t = this.data.tasks.find(item => item.id === taskId);
    if (t) {
      t.status = status;
      this.save();
    }
  }

  deleteTask(taskId) {
    this.data.tasks = this.data.tasks.filter(item => item.id !== taskId);
    this.save();
  }

  // ================= 2. 学生档案 =================
  addStudent(student) {
    if (!student.id) {
      const maxId = this.data.students.reduce((max, cur) => Math.max(max, parseInt(cur.id) || 0), 20240000);
      student.id = String(maxId + 1);
    }
    if (!student.score) student.score = 80;
    if (!student.petId) student.petId = "cat";
    if (!student.attendanceToday) student.attendanceToday = "normal";
    this.data.students.push(student);
    this.data.classInfo.studentCount = this.data.students.length;
    this.save();
  }

  updateStudent(studentId, fields) {
    const idx = this.data.students.findIndex(s => s.id === studentId);
    if (idx !== -1) {
      this.data.students[idx] = { ...this.data.students[idx], ...fields };
      this.save();
    }
  }

  // 智能补充更新已有学生档案 (支持多表格形态增量对齐、新字段补齐与小组自动扩充)
  applyStudentSupplementaryUpdates(updates = [], options = {}) {
    if (!Array.isArray(updates) || updates.length === 0) return { updatedCount: 0, addedCount: 0 };
    if (!Array.isArray(this.data.students)) this.data.students = [];
    if (!Array.isArray(this.data.groups) || this.data.groups.length === 0) {
      this.data.groups = ["第1组", "第2组", "第3组", "第4组", "第5组", "第6组"];
    }

    let updatedCount = 0;
    let addedCount = 0;
    const maxGroupDetected = [];

    updates.forEach(item => {
      let existing = null;
      if (item.targetStudentId) {
        existing = this.data.students.find(s => s.id === item.targetStudentId);
      }
      if (!existing && item.name) {
        existing = this.data.students.find(s => s.name === item.name);
      }
      if (!existing && item.id) {
        existing = this.data.students.find(s => s.id === item.id);
      }
      if (!existing && item.idCard) {
        existing = this.data.students.find(s => s.idCard === item.idCard);
      }

      if (item.fields && item.fields.group) {
        const gNum = parseInt(item.fields.group);
        if (!isNaN(gNum) && gNum > 0) {
          maxGroupDetected.push(gNum);
        }
      }

      if (existing) {
        if (item.fields && typeof item.fields === "object") {
          Object.keys(item.fields).forEach(k => {
            const val = item.fields[k];
            if (val !== undefined && val !== null && String(val).trim() !== "") {
              if (k === "extraFields") {
                existing.extraFields = { ...(existing.extraFields || {}), ...val };
              } else if (k === "tags" && Array.isArray(val)) {
                existing.tags = Array.from(new Set([...(existing.tags || []), ...val]));
              } else {
                existing[k] = val;
              }
            }
          });
        }
        updatedCount++;
      } else if (options.createNewIfNotMatched && item.name) {
        const newStu = {
          id: item.id || `20260407${String(100 + this.data.students.length + 1).slice(1)}`,
          name: item.name,
          gender: item.fields?.gender || "男",
          group: item.fields?.group || 1,
          role: item.fields?.role || "学生",
          score: 80,
          flowers: 0,
          tags: ["补充新增"],
          ...(item.fields || {})
        };
        this.data.students.push(newStu);
        addedCount++;
      }
    });

    // 自动扩展班级小组列表（如出现第7组、第8组）
    if (options.autoExpandGroups !== false && maxGroupDetected.length > 0) {
      const maxG = Math.max(...maxGroupDetected);
      for (let g = 1; g <= maxG; g++) {
        const gName = `第${g}组`;
        if (!this.data.groups.includes(gName)) {
          this.data.groups.push(gName);
        }
      }
    }

    if (this.data.classInfo) {
      this.data.classInfo.studentCount = this.data.students.length;
    }
    this.save();
    return { updatedCount, addedCount };
  }

  deleteStudent(studentId) {
    this.data.students = this.data.students.filter(s => s.id !== studentId);
    this.data.classInfo.studentCount = this.data.students.length;
    this.save();
  }

  // ================= 3. 考勤操作 =================
  setAllAttendanceNormal(period = "morning") {
    const today = new Date().toISOString().slice(0, 10);
    const dateKey = period === "afternoon" ? `${today}_pm` : today;
    if (!this.data.attendance) this.data.attendance = { records: {}, leaves: [] };
    if (!this.data.attendance.records) this.data.attendance.records = {};
    if (!this.data.attendance.records[dateKey]) this.data.attendance.records[dateKey] = {};
    if (!this.data.attendance.records[today]) this.data.attendance.records[today] = {};

    this.data.students.forEach(s => {
      if (period === "afternoon") {
        s.attendanceAfternoon = "normal";
      } else {
        s.attendanceMorning = "normal";
        s.attendanceToday = "normal";
      }
      this.data.attendance.records[dateKey][s.id] = "normal";
      this.data.attendance.records[today][s.id] = "normal";
    });
    this.save();
  }

  toggleStudentAttendance(studentId, newStatus, period = "morning") {
    const s = this.data.students.find(item => item.id === studentId);
    if (s) {
      const today = new Date().toISOString().slice(0, 10);
      const dateKey = period === "afternoon" ? `${today}_pm` : today;
      if (!this.data.attendance) this.data.attendance = { records: {}, leaves: [] };
      if (!this.data.attendance.records) this.data.attendance.records = {};
      if (!this.data.attendance.records[dateKey]) this.data.attendance.records[dateKey] = {};
      if (!this.data.attendance.records[today]) this.data.attendance.records[today] = {};

      const oldStatus = (period === "afternoon" ? s.attendanceAfternoon : s.attendanceMorning) || s.attendanceToday || "normal";
      if (period === "afternoon") {
        s.attendanceAfternoon = newStatus;
      } else {
        s.attendanceMorning = newStatus;
        s.attendanceToday = newStatus;
      }
      this.data.attendance.records[dateKey][s.id] = newStatus;
      this.data.attendance.records[today][s.id] = newStatus;

      if (newStatus !== oldStatus) {
        const periodLabel = period === "afternoon" ? "午检" : "晨检";
        if (newStatus === "normal") {
          this.linkPetScoreChange(s.id, 1, `今日${periodLabel}正常出勤打卡`, "考勤打卡");
        } else if (newStatus === "late") {
          this.linkPetScoreChange(s.id, -2, `${periodLabel}迟到扣减`, "考勤打卡");
        } else if (newStatus === "absent") {
          this.linkPetScoreChange(s.id, -4, `无故缺勤/旷课扣减`, "考勤打卡");
        } else if (newStatus && newStatus.includes("leave")) {
          this.linkPetScoreChange(s.id, -1, `请假报备登记扣减`, "考勤请假");
        }
      }
      this.save();
    }
  }

  // ================= 4. 作业管理 =================
  addHomework(hw) {
    hw.id = "hw-" + Date.now();
    if (!hw.stats) {
      hw.stats = { submitted: 0, unsubmitted: this.data.students.length, corrected: 0, needCorrection: 0 };
    }
    if (!hw.unsubmittedStudents) {
      hw.unsubmittedStudents = this.data.students.map(s => s.name);
    }
    if (!this.data.homeworkList) this.data.homeworkList = [];
    this.data.homeworkList.unshift(hw);
    this.save();
  }

  updateHomework(hwId, fields) {
    const hw = this.data.homeworkList.find(h => h.id === hwId);
    if (hw) {
      Object.assign(hw, fields);
      this.save();
    }
  }

  deleteHomework(hwId) {
    this.data.homeworkList = this.data.homeworkList.filter(h => h.id !== hwId);
    this.save();
  }

  remindUnsubmittedHomework(hwId) {
    const hw = this.data.homeworkList.find(h => h.id === hwId);
    if (hw) {
      return {
        success: true,
        count: hw.unsubmittedStudents ? hw.unsubmittedStudents.length : 0,
        names: hw.unsubmittedStudents ? hw.unsubmittedStudents.join("、") : ""
      };
    }
    return { success: false };
  }

  // ================= 5. 考试管理 =================
  addExam(exam) {
    exam.id = exam.id || ("exam-" + Date.now());
    if (!exam.subjects || exam.subjects.length === 0) {
      exam.subjects = ["语文", "数学", "英语", "科学"];
    }
    if (!exam.scores) {
      exam.scores = this.data.students.map((s, idx) => {
        const subScores = {};
        let total = 0;
        exam.subjects.forEach(sub => {
          const val = 85;
          subScores[sub] = val;
          total += val;
        });
        return {
          studentId: s.id,
          name: s.name,
          subjectScores: subScores,
          chinese: subScores["语文"] || 85,
          math: subScores["数学"] || 85,
          english: subScores["英语"] || 85,
          science: subScores["科学"] || 85,
          totalScore: total,
          score: total,
          rank: idx + 1,
          level: "良好",
          trend: "+0",
          comment: "发挥稳定，保持积极学习态度！"
        };
      });
    }
    this.recalcExamStats(exam);
    if (!this.data.exams) this.data.exams = [];
    this.data.exams.unshift(exam);
    this.save();
  }

  deleteExam(examId) {
    this.data.exams = (this.data.exams || []).filter(e => e.id !== examId);
    this.save();
  }

  updateExamScore(examId, studentId, subjectScores, newComment) {
    const exam = this.data.exams.find(e => e.id === examId) || this.data.exams[0];
    if (!exam) return;
    const scoreItem = exam.scores.find(s => s.studentId === studentId);
    if (scoreItem) {
      if (typeof subjectScores === "object" && subjectScores !== null) {
        scoreItem.subjectScores = { ...(scoreItem.subjectScores || {}), ...subjectScores };
        let sum = 0;
        Object.values(scoreItem.subjectScores).forEach(val => { sum += (parseFloat(val) || 0); });
        scoreItem.totalScore = sum;
        scoreItem.score = sum;
        if (scoreItem.subjectScores["语文"] !== undefined) scoreItem.chinese = scoreItem.subjectScores["语文"];
        if (scoreItem.subjectScores["数学"] !== undefined) scoreItem.math = scoreItem.subjectScores["数学"];
        if (scoreItem.subjectScores["英语"] !== undefined) scoreItem.english = scoreItem.subjectScores["英语"];
        if (scoreItem.subjectScores["科学"] !== undefined) scoreItem.science = scoreItem.subjectScores["科学"];
      } else {
        scoreItem.score = parseFloat(subjectScores);
        scoreItem.totalScore = scoreItem.score;
      }
      const subjectsCount = (exam.subjects && exam.subjects.length) || 4;
      const avgPerSubject = scoreItem.totalScore / subjectsCount;
      scoreItem.level = avgPerSubject >= 90 ? "优秀" : avgPerSubject >= 80 ? "良好" : avgPerSubject >= 60 ? "及格" : "待提升";
      if (newComment) scoreItem.comment = newComment;
      this.recalcExamStats(exam);
      // 联动宠物积分
      const petDelta = avgPerSubject >= 90 ? 5 : avgPerSubject >= 80 ? 3 : avgPerSubject >= 60 ? 1 : -2;
      this.linkPetScoreChange(studentId, petDelta, `学科考试【${exam.name || '阶段考核'}】成绩核定为${scoreItem.level}`, "成绩考核");
      this.save();
    }
  }

  recalcExamStats(exam) {
    if (!exam.scores || exam.scores.length === 0) return;
    const subjectsCount = (exam.subjects && exam.subjects.length) || 4;
    const totalsArr = exam.scores.map(s => s.totalScore !== undefined ? s.totalScore : s.score);
    const sum = totalsArr.reduce((a, b) => a + b, 0);
    const avg = (sum / totalsArr.length).toFixed(1);
    const highest = Math.max(...totalsArr);
    const lowest = Math.min(...totalsArr);
    const excCount = exam.scores.filter(s => ((s.totalScore !== undefined ? s.totalScore : s.score) / subjectsCount) >= 85).length;
    const passCount = exam.scores.filter(s => ((s.totalScore !== undefined ? s.totalScore : s.score) / subjectsCount) >= 60).length;

    exam.stats = {
      avgScore: parseFloat(avg),
      highest: highest,
      lowest: lowest,
      excellentRate: parseFloat(((excCount / totalsArr.length) * 100).toFixed(1)),
      passRate: parseFloat(((passCount / totalsArr.length) * 100).toFixed(1)),
      totalParticipants: totalsArr.length,
      trend: "+2.0"
    };

    // 重新根据总分排序并赋予名次
    exam.scores.sort((a, b) => (b.totalScore !== undefined ? b.totalScore : b.score) - (a.totalScore !== undefined ? a.totalScore : a.score));
    exam.scores.forEach((s, idx) => { s.rank = idx + 1; });
  }

  // ================= 6. 课表、座位、值日、干部 =================
  updateTimetablePeriods(periods) {
    if (!this.data.timetable) {
      this.data.timetable = { periods: [], schedule: {} };
    }
    this.data.timetable.periods = periods;
    this.data.timetablePeriods = periods;

    // 确保周一至周五 schedule 长度与 periods 严格对齐
    const days = ["周一", "周二", "周三", "周四", "周五"];
    if (!this.data.timetable.schedule) this.data.timetable.schedule = {};
    days.forEach(d => {
      if (!this.data.timetable.schedule[d]) this.data.timetable.schedule[d] = [];
      const currentList = this.data.timetable.schedule[d];
      if (currentList.length < periods.length) {
        while (currentList.length < periods.length) {
          currentList.push({
            subject: "自习",
            teacher: "值班老师",
            room: "本班教室",
            color: "#f1f5f9",
            textColor: "#475569"
          });
        }
      } else if (currentList.length > periods.length) {
        this.data.timetable.schedule[d] = currentList.slice(0, periods.length);
      }
    });

    this.save();
  }

  addTimetablePeriod(periodData) {
    if (!this.data.timetable) this.data.timetable = { periods: [], schedule: {} };
    if (!this.data.timetable.periods) this.data.timetable.periods = [];
    const list = this.data.timetable.periods;
    const nextIdx = list.length + 1;
    
    // 智能推算默认名称与起止时间
    let defName = `第${nextIdx}节`;
    let defTime = "16:30-17:10";
    if (list.length > 0) {
      const last = list[list.length - 1];
      if (last.time && last.time.includes("-")) {
        const parts = last.time.split("-");
        const endPart = parts[1].trim();
        const [hh, mm] = endPart.split(":").map(Number);
        if (!isNaN(hh) && !isNaN(mm)) {
          const startMin = hh * 60 + mm + 10;
          const endMin = startMin + 40;
          const fmt = (m) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
          defTime = `${fmt(startMin)}-${fmt(endMin)}`;
        }
      }
    }

    const newPeriod = {
      id: Date.now(),
      name: (periodData && periodData.name) || defName,
      time: (periodData && periodData.time) || defTime
    };

    list.push(newPeriod);
    this.updateTimetablePeriods(list);
    return newPeriod;
  }

  deleteTimetablePeriod(periodIdx) {
    if (!this.data.timetable || !this.data.timetable.periods) return;
    if (periodIdx < 0 || periodIdx >= this.data.timetable.periods.length) return;
    
    this.data.timetable.periods.splice(periodIdx, 1);
    
    const days = ["周一", "周二", "周三", "周四", "周五"];
    days.forEach(d => {
      if (this.data.timetable.schedule && this.data.timetable.schedule[d]) {
        if (this.data.timetable.schedule[d].length > periodIdx) {
          this.data.timetable.schedule[d].splice(periodIdx, 1);
        }
      }
    });

    this.data.timetablePeriods = this.data.timetable.periods;
    this.save();
  }

  updateCourse(day, periodIdx, fields) {
    if (!this.data.timetable) this.data.timetable = { periods: [], schedule: {} };
    if (!this.data.timetable.schedule) this.data.timetable.schedule = {};
    if (!this.data.timetable.schedule[day]) this.data.timetable.schedule[day] = [];
    
    while (this.data.timetable.schedule[day].length <= periodIdx) {
      this.data.timetable.schedule[day].push({
        subject: "自习",
        teacher: "值班老师",
        room: "本班教室",
        color: "#f1f5f9",
        textColor: "#475569"
      });
    }

    Object.assign(this.data.timetable.schedule[day][periodIdx], fields);
    this.save();
  }

  updateDuty(day, fields) {
    if (!this.data.dutySchedule) this.data.dutySchedule = {};
    if (!this.data.dutySchedule[day]) this.data.dutySchedule[day] = {};
    Object.assign(this.data.dutySchedule[day], fields);
    this.save();
  }

  setDutySchedule(newSchedule) {
    this.data.dutySchedule = newSchedule || {};
    this.save();
  }

  updateCadre(oldTitle, fields) {
    const c = this.data.cadres.find(item => item.title === oldTitle);
    if (c) {
      Object.assign(c, fields);
      this.save();
    }
  }

  addCadre(cadre) {
    if (!this.data.cadres) this.data.cadres = [];
    this.data.cadres.push(cadre);
    this.save();
  }

  deleteCadre(title) {
    this.data.cadres = this.data.cadres.filter(item => item.title !== title);
    this.save();
  }

  // ================= 7. 安全与健康 (1530安全台账与自定义教育类型) =================
  getSafetyTypes() {
    if (!this.data.safetyTypes || this.data.safetyTypes.length === 0) {
      this.data.safetyTypes = [
        { id: "st_1", name: "每天放学前 1分钟提醒", shortName: "1分钟提醒", badgeClass: "badge-info" },
        { id: "st_2", name: "周末节假日前 5分钟教育", shortName: "5分钟教育", badgeClass: "badge-warning" },
        { id: "st_3", name: "长假前 30分钟专题安全班会", shortName: "30分钟专题", badgeClass: "badge-purple" }
      ];
    }
    return this.data.safetyTypes;
  }

  addSafetyType(typeObj) {
    if (!this.data.safetyTypes) this.data.safetyTypes = [];
    const name = (typeObj.name || "").trim();
    if (!name) return null;
    const shortName = (typeObj.shortName || name).trim();
    const newType = {
      id: "st_" + Date.now(),
      name,
      shortName,
      badgeClass: typeObj.badgeClass || "badge-primary"
    };
    this.data.safetyTypes.push(newType);
    this.save();
    return newType;
  }

  updateSafetyType(id, updated) {
    if (!this.data.safetyTypes) return null;
    const target = this.data.safetyTypes.find(t => String(t.id) === String(id));
    if (target) {
      const oldName = target.name;
      if (updated.name) target.name = updated.name.trim();
      if (updated.shortName) target.shortName = updated.shortName.trim();
      if (updated.badgeClass) target.badgeClass = updated.badgeClass;

      // 如果改名，同步更新 safety1530 记录中的 type
      if (updated.name && oldName !== target.name && this.data.safety1530) {
        this.data.safety1530.forEach(s => {
          if (s.type === oldName) s.type = target.name;
        });
      }
      this.save();
      return target;
    }
    return null;
  }

  deleteSafetyType(id) {
    if (!this.data.safetyTypes || this.data.safetyTypes.length <= 1) {
      return false; // 至少保留一项类型
    }
    this.data.safetyTypes = this.data.safetyTypes.filter(t => String(t.id) !== String(id));
    this.save();
    return true;
  }

  addSafetyRecord(record) {
    record.id = "safe-" + Date.now();
    if (!record.attachments) record.attachments = [];
    if (!this.data.safety1530) this.data.safety1530 = [];
    this.data.safety1530.unshift(record);
    this.save();
    return record;
  }

  updateSafety1530(index, fields) {
    if (this.data.safety1530 && this.data.safety1530[index]) {
      Object.assign(this.data.safety1530[index], fields);
      this.save();
      return this.data.safety1530[index];
    }
    return null;
  }

  deleteSafety1530(idOrIndex) {
    if (typeof idOrIndex === "number") {
      this.data.safety1530.splice(idOrIndex, 1);
    } else {
      this.data.safety1530 = (this.data.safety1530 || []).filter(item => item.id !== idOrIndex);
    }
    this.save();
  }

  // ================= 8. 班规定制 =================
  addClassRule(rule) {
    if (!this.data.classRules) this.data.classRules = { rulesList: [], rewardFineRules: [] };
    if (!this.data.classRules.rulesList) this.data.classRules.rulesList = [];
    this.data.classRules.rulesList.push(rule);
    this.save();
  }

  updateClassRule(index, fields) {
    if (this.data.classRules && this.data.classRules.rulesList && this.data.classRules.rulesList[index]) {
      Object.assign(this.data.classRules.rulesList[index], fields);
      this.save();
    }
  }

  deleteClassRule(index) {
    if (this.data.classRules && this.data.classRules.rulesList) {
      this.data.classRules.rulesList.splice(index, 1);
      this.save();
    }
  }

  addRewardFine(item) {
    if (!this.data.classRules) this.data.classRules = { rulesList: [], rewardFineRules: [] };
    if (!this.data.classRules.rewardFineRules) this.data.classRules.rewardFineRules = [];
    this.data.classRules.rewardFineRules.push(item);
    this.save();
  }

  updateRewardFine(index, fields) {
    if (this.data.classRules && this.data.classRules.rewardFineRules && this.data.classRules.rewardFineRules[index]) {
      Object.assign(this.data.classRules.rewardFineRules[index], fields);
      this.save();
    }
  }

  deleteRewardFine(index) {
    if (this.data.classRules && this.data.classRules.rewardFineRules) {
      this.data.classRules.rewardFineRules.splice(index, 1);
      this.save();
    }
  }

  addClassRuleTemplate(template) {
    if (!this.data.classRules) this.data.classRules = { templates: [], rulesList: [], rewardFineRules: [] };
    if (!this.data.classRules.templates) this.data.classRules.templates = [];
    this.data.classRules.templates.push(template);
    this.save();
  }

  deleteClassRuleTemplate(name) {
    if (this.data.classRules && this.data.classRules.templates) {
      this.data.classRules.templates = this.data.classRules.templates.filter(t => t.name !== name);
      this.save();
    }
  }

  // ================= 8-A1. 班规公约分类板块增删管理 =================
  addRuleCategory(category) {
    category = (category || "").trim();
    if (!category) return false;
    if (!this.data.classRules) this.data.classRules = { templates: [], rulesList: [], rewardFineRules: [], categories: [] };
    if (!this.data.classRules.categories) {
      this.data.classRules.categories = [
        "早读与晨会", "课堂自律规范", "课间文明活动", "午餐与午间静校",
        "作业书写规范", "卫生值日要求", "放学离校规范", "仪容仪表礼仪"
      ];
    }
    if (!this.data.classRules.categories.includes(category)) {
      this.data.classRules.categories.push(category);
      this.save();
      return true;
    }
    return false;
  }

  deleteRuleCategory(category) {
    if (!this.data.classRules || !this.data.classRules.categories) return false;
    const idx = this.data.classRules.categories.indexOf(category);
    if (idx !== -1) {
      this.data.classRules.categories.splice(idx, 1);
      if (this.data.classRules.categories.length === 0) {
        this.data.classRules.categories.push("常规自律规范");
      }
      this.save();
      return true;
    }
    return false;
  }

  // ================= 8-A. 小组管理 (增删与重命名小组) =================
  addGroup(name) {
    name = (name || "").trim();
    if (!name) return false;
    if (!this.data.groups) this.data.groups = [];
    if (!this.data.groups.includes(name)) {
      this.data.groups.push(name);
      this.save();
      return true;
    }
    return false;
  }

  renameGroup(oldName, newName) {
    oldName = (oldName || "").trim();
    newName = (newName || "").trim();
    if (!oldName || !newName || oldName === newName) return false;
    if (!this.data.groups) this.data.groups = [];
    const idx = this.data.groups.indexOf(oldName);
    if (idx === -1) return false;
    // 检查新名称是否与已有其他组冲突
    if (this.data.groups.includes(newName)) {
      return false;
    }

    // 保持小组排列顺序，原位替换组名
    this.data.groups[idx] = newName;

    // 同步更新所有属于原小组的学生档案
    (this.data.students || []).forEach(s => {
      if (window.isStudentInGroup && window.isStudentInGroup(s.group, oldName)) {
        s.group = newName;
      }
    });

    this.save();
    return true;
  }

  deleteGroup(name) {
    if (!this.data.groups) return false;
    const idx = this.data.groups.indexOf(name);
    if (idx !== -1) {
      this.data.groups.splice(idx, 1);
      if (this.data.groups.length === 0) {
        this.data.groups.push("第1组");
      }
      const fallbackGroup = this.data.groups[0];
      // 同步把原先属于该组的学生转入保留组（支持自定义保留组名）
      (this.data.students || []).forEach(s => {
        if (window.isStudentInGroup && window.isStudentInGroup(s.group, name)) {
          s.group = fallbackGroup;
        }
      });
      this.save();
      return true;
    }
    return false;
  }

  // ================= 8-B. 标签库管理 (增删标签与多标签池) =================
  getTagsPool() {
    if (!this.data) return [];
    if (!Array.isArray(this.data.tagsPool) || this.data.tagsPool.length === 0) {
      const defaultTags = [
        "好学星", "班干部", "文明标兵", "自律典范", "积极分子",
        "需要关注", "今日生日🎂", "劳动积极", "劳动模范",
        "才艺特长", "书写端正", "互助标兵", "纪律标兵",
        "体育之星", "数学达人", "画画小天才", "学习之星",
        "朗诵达人", "环保小卫士", "热心助人"
      ];
      this.data.tagsPool = [...defaultTags];
    }
    const pool = this.data.tagsPool;

    // 动态提取全班所有学生已贴上的所有标签，绝不遗漏或产生孤立标签（自动净化剥离 *N 计数后缀）
    (this.data.students || []).forEach(s => {
      if (Array.isArray(s.tags)) {
        s.tags.forEach(t => {
          t = (t || "").trim();
          const cleanTag = t.replace(/\s*[*×x]\s*\d+$/, '').trim();
          if (cleanTag && !pool.includes(cleanTag)) pool.push(cleanTag);
        });
      }
      if (s.tag) {
        const cleanTag = (s.tag || "").replace(/\s*[*×x]\s*\d+$/, '').trim();
        if (cleanTag && !pool.includes(cleanTag)) pool.push(cleanTag);
      }
      if (s.tagCounts && typeof s.tagCounts === "object") {
        Object.keys(s.tagCounts).forEach(cleanTag => {
          cleanTag = (cleanTag || "").trim();
          if (cleanTag && !pool.includes(cleanTag)) pool.push(cleanTag);
        });
      }
    });

    // 剔除任何含有 *N 后缀的历史污染项
    this.data.tagsPool = pool.filter(t => !/\s*[*×x]\s*\d+$/.test(t));
    return this.data.tagsPool;
  }

  isTagStackable(tag) {
    if (!tag) return false;
    tag = tag.trim().replace(/\s*[*×x]\s*\d+$/, '');
    if (!this.data.tagConfigs) this.data.tagConfigs = {};
    if (this.data.tagConfigs[tag] !== undefined && this.data.tagConfigs[tag].stackable !== undefined) {
      return Boolean(this.data.tagConfigs[tag].stackable);
    }
    // 默认判断：非身份类的成长/荣誉/表现标签默认支持累加，特定身份类默认单次
    const singleTags = ["班干部", "今日生日🎂", "需要关注", "需要重点关注", "新导入"];
    return !singleTags.includes(tag);
  }

  setTagStackable(tag, stackable) {
    if (!tag) return false;
    tag = tag.trim().replace(/\s*[*×x]\s*\d+$/, '');
    if (!this.data.tagConfigs) this.data.tagConfigs = {};
    if (!this.data.tagConfigs[tag]) this.data.tagConfigs[tag] = { stackable: true, goldThreshold: 3 };
    this.data.tagConfigs[tag].stackable = Boolean(stackable);
    this.save();
    return true;
  }

  getTagGoldThreshold(tag) {
    if (!tag) return 3;
    tag = tag.trim().replace(/\s*[*×x]\s*\d+$/, '');
    if (this.data.tagConfigs && this.data.tagConfigs[tag] && this.data.tagConfigs[tag].goldThreshold !== undefined) {
      return parseInt(this.data.tagConfigs[tag].goldThreshold, 10) || 3;
    }
    return 3;
  }

  setTagGoldThreshold(tag, threshold) {
    if (!tag) return false;
    tag = tag.trim().replace(/\s*[*×x]\s*\d+$/, '');
    if (!this.data.tagConfigs) this.data.tagConfigs = {};
    if (!this.data.tagConfigs[tag]) this.data.tagConfigs[tag] = { stackable: true };
    this.data.tagConfigs[tag].goldThreshold = Math.max(1, parseInt(threshold, 10) || 3);
    this.save();
    return true;
  }

  isTagRedeemed(student, tag) {
    if (!student || !tag) return false;
    const cleanTag = tag.trim().replace(/\s*[*×x]\s*\d+$/, '');
    if (student.redeemedTags && (student.redeemedTags[cleanTag] || student.redeemedTags[tag])) {
      return true;
    }
    return false;
  }

  setTagRedeemed(studentId, tag, redeemed) {
    if (!studentId || !tag) return false;
    const s = (this.data.students || []).find(item => String(item.id) === String(studentId));
    if (!s) return false;
    const cleanTag = tag.trim().replace(/\s*[*×x]\s*\d+$/, '');
    if (!s.redeemedTags) s.redeemedTags = {};
    if (redeemed) {
      s.redeemedTags[cleanTag] = true;
    } else {
      delete s.redeemedTags[cleanTag];
      delete s.redeemedTags[tag];
    }
    this.save();
    return true;
  }

  changeStudentTagCount(studentId, tag, delta) {
    if (!studentId || !tag) return false;
    const s = (this.data.students || []).find(item => String(item.id) === String(studentId));
    if (!s) return false;
    const cleanTag = tag.trim().replace(/\s*[*×x]\s*\d+$/, '');

    if (!s.tagCounts) s.tagCounts = {};
    const list = window.getStudentTagsWithCount ? window.getStudentTagsWithCount(s) : [];
    const found = list.find(item => item.tag === cleanTag);
    let curCount = found ? found.count : 0;

    let newCount = curCount + delta;
    if (delta <= -999) newCount = 0; // 彻底移除
    newCount = Math.max(0, newCount);

    if (newCount > 0) {
      s.tagCounts[cleanTag] = newCount;
    } else {
      delete s.tagCounts[cleanTag];
      if (s.redeemedTags) {
        delete s.redeemedTags[cleanTag];
        delete s.redeemedTags[tag];
      }
    }

    // 重构 s.tags 数组
    const newTags = [];
    Object.entries(s.tagCounts).forEach(([t, c]) => {
      if (c > 0) {
        newTags.push(window.formatTagDisplay ? window.formatTagDisplay(t, c) : (c > 1 ? `${t}*${c}` : t));
      }
    });
    // 保留原本存在且不可累加的单次标签
    if (Array.isArray(s.tags)) {
      s.tags.forEach(origT => {
        const origClean = origT.trim().replace(/\s*[*×x]\s*\d+$/, '');
        if (!this.isTagStackable(origClean) && !newTags.some(nt => nt.includes(origClean))) {
          newTags.push(origT);
        }
      });
    }

    s.tags = newTags;
    s.tag = newTags[0] || "";
    this.save();
    return true;
  }

  addTag(tag, stackable, goldThreshold) {
    tag = (tag || "").trim().replace(/\s*[*×x]\s*\d+$/, '').trim();
    if (!tag) return false;
    const pool = this.getTagsPool();
    if (!pool.includes(tag)) {
      pool.push(tag);
      this.data.tagsPool = pool;
      if (!this.data.tagConfigs) this.data.tagConfigs = {};
      this.data.tagConfigs[tag] = {
        stackable: stackable !== undefined ? Boolean(stackable) : true,
        goldThreshold: Math.max(1, parseInt(goldThreshold, 10) || 3)
      };
      this.save();
      if (window.syncStudentTagFilterDropdown) {
        window.syncStudentTagFilterDropdown();
      }
      return true;
    }
    return false;
  }

  deleteTag(tag) {
    const pool = this.getTagsPool();
    const idx = pool.indexOf(tag);
    if (idx !== -1) {
      pool.splice(idx, 1);
      this.data.tagsPool = pool;
      if (this.data.tagConfigs && this.data.tagConfigs[tag]) {
        delete this.data.tagConfigs[tag];
      }
      // 同时从全班学生的已分配标签中同步剔除
      (this.data.students || []).forEach(s => {
        if (Array.isArray(s.tags)) {
          s.tags = s.tags.filter(t => t !== tag && !t.startsWith(tag + "*") && !t.startsWith(tag + "×"));
        }
        if (s.tagCounts && s.tagCounts[tag]) {
          delete s.tagCounts[tag];
        }
        if (s.tag === tag) {
          delete s.tag;
        }
      });
      this.save();
      if (window.syncStudentTagFilterDropdown) {
        window.syncStudentTagFilterDropdown();
      }
      return true;
    }
    return false;
  }

  // ================= 8-C. 学生档案卡片信息显影与字号批量设置 =================
  getCardDisplayConfig() {
    if (!this.data.cardDisplayConfig) {
      this.data.cardDisplayConfig = {
        visibleFields: {
          name: true,           // 固定显示
          avatar: true,
          nation: true,
          role: true,
          studentId: true,      // 学号独立显隐
          group: true,          // 所在小组独立显隐
          idAndGroup: true,     // 兼容历史字段
          idCard: true,
          hukou: true,
          address: true,
          guardian: true,
          careTags: true,
          growthTags: true
        },
        fontSizes: {
          name: 16,
          studentId: 12,        // 学号独立字号
          group: 12,            // 所在小组独立字号
          idAndGroup: 12,       // 兼容历史字段
          idCard: 11,
          hukou: 12,
          address: 12,
          guardian: 12,
          careTags: 10.5,
          growthTags: 10.5
        }
      };
    }
    if (!this.data.cardDisplayConfig.visibleFields) {
      this.data.cardDisplayConfig.visibleFields = {};
    }
    // 兼容历史配置：如果旧数据中只有 idAndGroup，自动派生 studentId 和 group
    const vf = this.data.cardDisplayConfig.visibleFields;
    if (vf.studentId === undefined) vf.studentId = (vf.idAndGroup !== undefined ? vf.idAndGroup : true);
    if (vf.group === undefined) vf.group = (vf.idAndGroup !== undefined ? vf.idAndGroup : true);

    if (!this.data.cardDisplayConfig.fontSizes) {
      this.data.cardDisplayConfig.fontSizes = {};
    }
    const fz = this.data.cardDisplayConfig.fontSizes;
    if (fz.studentId === undefined) fz.studentId = (fz.idAndGroup !== undefined ? fz.idAndGroup : 12);
    if (fz.group === undefined) fz.group = (fz.idAndGroup !== undefined ? fz.idAndGroup : 12);

    this.data.cardDisplayConfig.visibleFields.name = true; // 姓名强制为 true，不可隐藏
    return this.data.cardDisplayConfig;
  }

  saveCardDisplayConfig(config) {
    if (!config) return false;
    const safeCfg = JSON.parse(JSON.stringify(config));
    if (!safeCfg.visibleFields) safeCfg.visibleFields = {};
    safeCfg.visibleFields.name = true; // 姓名强制为 true
    this.data.cardDisplayConfig = safeCfg;
    this.save();
    return true;
  }

  // ================= 8-C. 座位网格自定义行列 =================
  updateSeatingGrid(rows, cols) {
    rows = Math.max(1, Math.min(15, parseInt(rows) || 8));
    cols = Math.max(1, Math.min(15, parseInt(cols) || 6));
    this.data.seatingGrid = { rows, cols };
    (this.data.students || []).forEach((s, idx) => {
      const r = Math.floor(idx / cols) + 1;
      const c = (idx % cols) + 1;
      s.seat = `第${r}排·${c}号`;
    });
    this.save();
  }

  // ================= 9. 报表模板 =================
  addReportTemplate(template) {
    if (!this.data.reportTemplates) this.data.reportTemplates = [];
    if (!template.id) template.id = "rpt-" + Date.now();
    this.data.reportTemplates.push(template);
    this.save();
  }

  updateReportTemplate(id, fields) {
    const item = (this.data.reportTemplates || []).find(r => r.id === id);
    if (item) {
      Object.assign(item, fields);
      this.save();
    }
  }

  deleteReportTemplate(id) {
    this.data.reportTemplates = (this.data.reportTemplates || []).filter(r => r.id !== id);
    this.save();
  }

  // ================= 10. 活动相册照片管理 =================
  deleteActivityPhoto(activityId, photoIndexOrId) {
    const act = (this.data.activities || []).find(a => a.id === activityId);
    if (act && act.photos) {
      if (typeof photoIndexOrId === "number") {
        act.photos.splice(photoIndexOrId, 1);
      } else {
        act.photos = act.photos.filter(p => p.id !== photoIndexOrId);
      }
      this.save();
    }
  }


  calcPetLevelAndExp(score) {
    let level = 1;
    let exp = 0;
    if (score < 90) {
      level = 1;
      exp = Math.min(100, Math.max(0, Math.round((score / 90) * 100)));
    } else if (score < 120) {
      level = 2;
      exp = Math.min(100, Math.max(0, Math.round(((score - 90) / 30) * 100)));
    } else if (score < 160) {
      level = 3;
      exp = Math.min(100, Math.max(0, Math.round(((score - 120) / 40) * 100)));
    } else if (score < 200) {
      level = 4;
      exp = Math.min(100, Math.max(0, Math.round(((score - 160) / 40) * 100)));
    } else {
      level = 5;
      exp = 100;
    }
    return { level, exp };
  }

  adjustStudentScore(studentId, delta, reason) {
    const s = this.data.students.find(item => item.id === studentId);
    if (s) {
      s.score = Math.max(0, (s.score || 80) + delta);
      if (!s.scoreHistory) s.scoreHistory = [];
      s.scoreHistory.unshift({
        date: new Date().toISOString().slice(0, 10),
        delta: delta,
        reason: reason || "常规表现"
      });
      // 联动更新宠物等级与经验
      if (!s.petData) s.petData = { level: 1, exp: 0, hunger: 85, happy: 90, inventory: [] };
      const petMeta = this.calcPetLevelAndExp(s.score);
      s.petData.level = petMeta.level;
      s.petData.exp = petMeta.exp;
      this.save();
    }
  }

  feedPet(studentId, item) {
    const s = this.data.students.find(item => item.id === studentId);
    if (!s) return { success: false, msg: "未找到该学生" };
    if ((s.score || 0) < item.cost) {
      return { success: false, msg: `积分不足！需要 ${item.cost} 积分，当前仅有 ${s.score || 0} 积分。` };
    }
    s.score -= item.cost;
    if (!s.petData) {
      s.petData = { level: 1, exp: 0, hunger: 80, happy: 80, inventory: [] };
    }
    if (item.hunger) s.petData.hunger = Math.min(100, (s.petData.hunger || 80) + item.hunger);
    if (item.happy) s.petData.happy = Math.min(100, (s.petData.happy || 80) + item.happy);
    if (item.exp) {
      s.petData.exp = (s.petData.exp || 0) + item.exp;
      if (s.petData.exp >= s.petData.level * 100) {
        s.petData.level += 1;
        s.petData.exp = 0;
      }
    }
    s.petData.inventory.push(item.name);
    this.save();
    return { success: true, msg: `投喂/装扮成功！${s.name} 的宠物升到 Lv.${s.petData.level}` };
  }

  // ================= 综合素质评价指标管理 (增删改及获奖人次统计) =================
  getGrowthDimensions() {
    if (!this.data.growthDimensions || this.data.growthDimensions.length === 0) {
      this.data.growthDimensions = [
        { id: "dim_1", name: "课堂表现", count: 15, icon: "🙋" },
        { id: "dim_2", name: "学习习惯", count: 12, icon: "📖" },
        { id: "dim_3", name: "作业完成", count: 18, icon: "✍️" },
        { id: "dim_4", name: "文明礼仪", count: 10, icon: "🤝" },
        { id: "dim_5", name: "劳动卫生", count: 8, icon: "🧹" },
        { id: "dim_6", name: "团结合作", count: 14, icon: "🌈" },
        { id: "dim_7", name: "纪律表现", count: 9, icon: "🛡️" },
        { id: "dim_8", name: "体育锻炼", count: 11, icon: "⚽" },
        { id: "dim_9", name: "兴趣特长", count: 7, icon: "🎨" },
        { id: "dim_10", name: "责任意识", count: 13, icon: "🎖️" }
      ];
    }
    return this.data.growthDimensions;
  }

  getDistinctStudentsForDim(dimName) {
    if (!this.data.growthEvents) return [];
    const events = this.data.growthEvents.filter(e => e.dim === dimName && (e.tag === '表扬' || !e.tag));
    return Array.from(new Set(events.map(e => e.student).filter(Boolean)));
  }

  getCommendationsForDim(dimName) {
    if (!this.data.growthEvents) return [];
    return this.data.growthEvents.filter(e => e.dim === dimName);
  }

  updateDimCounts() {
    if (!this.data.growthDimensions) return;
    this.data.growthDimensions.forEach(d => {
      const distinct = this.getDistinctStudentsForDim(d.name);
      d.count = distinct.length;
    });
  }

  addGrowthDimension(dim) {
    if (!this.data.growthDimensions) this.data.growthDimensions = [];
    const newDim = {
      id: "dim_" + Date.now(),
      name: (dim.name || "新指标").trim(),
      icon: (dim.icon || "🌟").trim(),
      count: 0
    };
    this.data.growthDimensions.push(newDim);
    this.save();
    return newDim;
  }

  updateGrowthDimension(dimId, updated) {
    if (!this.data.growthDimensions) return null;
    const target = this.data.growthDimensions.find(d => String(d.id) === String(dimId));
    if (target) {
      const oldName = target.name;
      if (updated.name) target.name = updated.name.trim();
      if (updated.icon) target.icon = updated.icon.trim();

      // 如果指标改名，同步更新所有关联的成长事件
      if (updated.name && oldName !== updated.name.trim() && this.data.growthEvents) {
        this.data.growthEvents.forEach(e => {
          if (e.dim === oldName) e.dim = updated.name.trim();
        });
      }

      this.updateDimCounts();
      this.save();
      return target;
    }
    return null;
  }

  deleteGrowthDimension(dimId) {
    if (!this.data.growthDimensions) return false;
    this.data.growthDimensions = this.data.growthDimensions.filter(d => String(d.id) !== String(dimId));
    this.save();
    return true;
  }

  deleteGrowthEvent(eventId) {
    if (!this.data.growthEvents) return false;
    const idx = this.data.growthEvents.findIndex(e => String(e.id) === String(eventId));
    if (idx === -1) return false;
    const evt = this.data.growthEvents[idx];

    // 回退关联学生的小红花与宠物积分
    if (evt.student) {
      const s = (this.data.students || []).find(x => x.name === evt.student || x.id === evt.student);
      if (s) {
        let flowers = 0;
        if (typeof evt.flowerCount === "number" && !isNaN(evt.flowerCount)) flowers = evt.flowerCount;
        else if (evt.flower) {
          const m = String(evt.flower).match(/\+?(\d+)朵/);
          if (m) flowers = parseInt(m[1]);
        }
        if (flowers > 0 && s.flowers) {
          s.flowers = Math.max(0, s.flowers - flowers);
        }
        const flowerVal = Number((this.data.scoreRules && this.data.scoreRules.flowerValue) !== undefined ? this.data.scoreRules.flowerValue : 3);
        const delta = flowers > 0 ? -(flowers * flowerVal) : -2;
        this.linkPetScoreChange(s.name, delta, `撤销成长表扬记录【${evt.dim}】`, "growth");
      }
    }

    this.data.growthEvents.splice(idx, 1);
    this.updateDimCounts();
    this.save();
    return true;
  }

  updateGrowthEvent(eventId, updated) {
    if (!this.data.growthEvents) return false;
    const evt = this.data.growthEvents.find(e => String(e.id) === String(eventId));
    if (!evt) return false;

    // 解析旧小红花
    let oldFlowers = 0;
    if (typeof evt.flowerCount === "number") oldFlowers = evt.flowerCount;
    else if (evt.flower) {
      const m = String(evt.flower).match(/\+?(\d+)朵/);
      if (m) oldFlowers = parseInt(m[1]);
    }

    // 解析新小红花
    let newFlowers = oldFlowers;
    if (typeof updated.flowerCount === "number") newFlowers = updated.flowerCount;
    else if (updated.flower) {
      const m = String(updated.flower).match(/\+?(\d+)朵/);
      if (m) newFlowers = parseInt(m[1]);
    }

    const diffFlowers = newFlowers - oldFlowers;
    Object.assign(evt, updated);

    if (diffFlowers !== 0 && evt.student) {
      const s = (this.data.students || []).find(x => x.name === evt.student || x.id === evt.student);
      if (s) {
        s.flowers = Math.max(0, (s.flowers || 0) + diffFlowers);
        const flowerVal = Number((this.data.scoreRules && this.data.scoreRules.flowerValue) !== undefined ? this.data.scoreRules.flowerValue : 3);
        this.linkPetScoreChange(s.name, diffFlowers * flowerVal, `调整成长表扬【${evt.dim}】小红花`, "growth");
      }
    }

    this.updateDimCounts();
    this.save();
    return true;
  }

  // 检查当前班级是否含有原模板自带的未清理残留信息
  hasTemplateRemnants() {
    if (!this.data) return false;
    const realStudentNames = new Set((this.data.students || []).map(s => s.name));

    // 1. 检查今日班务是否包含模板假任务
    const demoTaskIds = ["task-001", "task-002", "task-003", "task-004", "task-005", "task-006"];
    const hasDemoTasks = (this.data.tasks || []).some(t => demoTaskIds.includes(t.id) || (t.title && t.title.includes("期中家长会筹备")));
    // 2. 检查作业管理是否包含模板假作业
    const demoHwIds = ["hw-01", "hw-02", "hw-03"];
    const hasDemoHw = (this.data.homeworkList || []).some(h => demoHwIds.includes(h.id) || (h.title && h.title.includes("秋天")));
    // 3. 检查考试/学情是否包含模板假考试或非本班假学生成绩
    const demoExamIds = ["exam-01", "exam-02", "exam-03"];
    const hasDemoExams = (this.data.exams || []).some(e =>
      demoExamIds.includes(e.id) ||
      (e.name && (e.name.includes("摸底考") || e.name.includes("第一单元检测"))) ||
      (e.scores && e.scores.some(sc => sc.name && (sc.name === "陈思远" || sc.name === "李小红") && !realStudentNames.has(sc.name)))
    );
    // 4. 检查班干部/值日生是否残留模板学生
    const hasDemoCadres = (this.data.cadres || []).some(c => (c.name === "陈思远" || c.name === "李小红") && !realStudentNames.has(c.name));
    const hasDemoDuty = this.data.dutySchedule && Object.values(this.data.dutySchedule).some(d => d.leader && (d.leader === "陈思远" || d.leader === "刘思琪") && !realStudentNames.has(d.leader));
    // 5. 检查安全教育台账是否残留模板数据
    const hasDemoSafety = (this.data.safety1530 || []).some(s => s.id && s.id.startsWith("safe-00"));
    // 7. 检查健康检测是否残留赵小美假发热记录或人数写死45不符
    const hasDemoHealth = this.data.healthDaily && (
      (this.data.healthDaily.abnormalDetails || []).some(d => d.studentName === "赵小美" && !realStudentNames.has("赵小美")) ||
      (this.data.students && this.data.students.length > 0 && this.data.healthDaily.testedCount !== this.data.students.length)
    );
    // 8. 检查家校沟通是否包含模板假通知或非本班学生台账/长期未联系名单
    const hasDemoComm = Boolean(this.data.communication && (
      (this.data.communication.notices || []).some(n => n.id === "nt-01" || n.id === "nt-02") ||
      (this.data.communication.logs || []).some(l => (l.studentName || l.student) && !realStudentNames.has(l.studentName || l.student)) ||
      (this.data.communication.longTimeUntouched || []).some(u => u.studentName && !realStudentNames.has(u.studentName))
    ));
    // 9. 检查考勤与请假是否残留模板学生
    const hasDemoAttendance = Boolean(this.data.attendance && (
      (this.data.attendance.leaves || []).some(l => (l.studentName || l.student) && !realStudentNames.has(l.studentName || l.student)) ||
      (this.data.attendance.records && Object.values(this.data.attendance.records).some(rec =>
        rec && typeof rec === "object" && Object.keys(rec).some(k => !realStudentNames.has(k) && !(this.data.students || []).some(s => s.id === k))
      ))
    ));

    return hasDemoTasks || hasDemoHw || hasDemoExams || hasDemoCadres || hasDemoDuty || hasDemoSafety || hasDemoHealth || hasDemoComm || hasDemoAttendance;
  }

  // 深度净化清除残留的模板数据 (对真实班级生效)
  purgeTemplateRemnants() {
    if (!this.data) return false;
    // 若当前为体验班级模板且尚未导入真实学生，则保留示范数据
    const isDemoTemplateClass = (this.currentClassId === "class_demo_template" || !this.currentClassId) && !this.data.hasImportedRealStudents;
    if (isDemoTemplateClass) return false;

    let modified = false;
    const realStudentNames = new Set((this.data.students || []).map(s => s.name));

    // 1. 清理今日班务残留
    const demoTaskIds = ["task-001", "task-002", "task-003", "task-004", "task-005", "task-006"];
    if (this.data.tasks && this.data.tasks.length > 0) {
      const filteredTasks = this.data.tasks.filter(t => !demoTaskIds.includes(t.id) && !(t.title && t.title.includes("期中家长会筹备")));
      if (filteredTasks.length !== this.data.tasks.length) {
        this.data.tasks = filteredTasks;
        modified = true;
      }
    }

    // 2. 清理作业管理残留
    const demoHwIds = ["hw-01", "hw-02", "hw-03"];
    if (this.data.homeworkList && this.data.homeworkList.length > 0) {
      const filteredHw = this.data.homeworkList.filter(h => !demoHwIds.includes(h.id) && !(h.title && h.title.includes("秋天")));
      filteredHw.forEach(hw => {
        if (hw.unsubmittedStudents && Array.isArray(hw.unsubmittedStudents)) {
          const filteredUnsub = hw.unsubmittedStudents.filter(name => realStudentNames.has(name));
          if (filteredUnsub.length !== hw.unsubmittedStudents.length) {
            hw.unsubmittedStudents = filteredUnsub;
            hw.stats.unsubmitted = filteredUnsub.length;
            hw.stats.submitted = Math.max(0, (this.data.students || []).length - filteredUnsub.length);
            modified = true;
          }
        }
      });
      if (filteredHw.length !== this.data.homeworkList.length) {
        this.data.homeworkList = filteredHw;
        modified = true;
      }
    }
    if (this.data.homework && this.data.homework.length > 0) {
      this.data.homework = [];
      modified = true;
    }

    // 3. 清理班干部残留 (移除不在当前班级真实名册中的成员)
    if (this.data.cadres && this.data.cadres.length > 0) {
      const filteredCadres = this.data.cadres.filter(c => realStudentNames.has(c.name));
      if (filteredCadres.length !== this.data.cadres.length) {
        this.data.cadres = filteredCadres;
        modified = true;
      }
    }

    // 4. 清理值日生残留
    if (this.data.dutySchedule && typeof this.data.dutySchedule === "object") {
      let hasAlienLeader = false;
      Object.keys(this.data.dutySchedule).forEach(day => {
        const item = this.data.dutySchedule[day];
        if (item && item.leader && !realStudentNames.has(item.leader)) {
          hasAlienLeader = true;
        }
      });
      if (hasAlienLeader) {
        this.data.dutySchedule = {};
        modified = true;
      }
    }

    // 5. 清理安全教育台账模板假数据
    if (this.data.safety1530 && this.data.safety1530.length > 0) {
      const filteredSafe = this.data.safety1530.filter(s => !(s.id && s.id.startsWith("safe-00")));
      if (filteredSafe.length !== this.data.safety1530.length) {
        this.data.safety1530 = filteredSafe;
        modified = true;
      }
    }

    // 6. 清理健康检测异常假记录与核准检测总人数
    if (this.data.healthDaily) {
      const stuCount = (this.data.students || []).length;
      if (this.data.healthDaily.abnormalDetails) {
        const filteredDetails = (this.data.healthDaily.abnormalDetails || []).filter(d => realStudentNames.has(d.studentName));
        if (filteredDetails.length !== this.data.healthDaily.abnormalDetails.length) {
          this.data.healthDaily.abnormalDetails = filteredDetails;
          this.data.healthDaily.abnormalCount = filteredDetails.length;
          modified = true;
        }
      }
      const abnormalCount = (this.data.healthDaily.abnormalDetails || []).length;
      if (stuCount > 0 && (this.data.healthDaily.testedCount !== stuCount || this.data.healthDaily.normalCount !== (stuCount - abnormalCount))) {
        this.data.healthDaily.testedCount = stuCount;
        this.data.healthDaily.normalCount = Math.max(0, stuCount - abnormalCount);
        this.data.healthDaily.abnormalCount = abnormalCount;
        modified = true;
      }
    }

    // 7. 清理宠物全班动态残留
    if (this.data.petActivities && this.data.petActivities.length > 0) {
      const filteredAct = this.data.petActivities.filter(a => realStudentNames.has(a.studentName));
      if (filteredAct.length !== this.data.petActivities.length) {
        this.data.petActivities = filteredAct;
        modified = true;
      }
    }

    // 8. 重置小红花指标累计数与学生初始花数 (若成长事件为空但指标计数仍留存)
    if ((!this.data.growthEvents || this.data.growthEvents.length === 0) && this.data.growthDimensions) {
      let resetDim = false;
      this.data.growthDimensions.forEach(d => {
        if (d.count > 0) {
          d.count = 0;
          resetDim = true;
        }
      });
      if (resetDim) modified = true;
    }

    // 9. 清理考试成绩模板假数据与非当前班级学生成绩
    const demoExamIds = ["exam-01", "exam-02", "exam-03"];
    if (this.data.exams && this.data.exams.length > 0) {
      const filteredExams = this.data.exams.filter(e =>
        !demoExamIds.includes(e.id) &&
        !(e.name && (e.name.includes("摸底考") || e.name.includes("第一单元检测")))
      );
      filteredExams.forEach(e => {
        if (e.scores && Array.isArray(e.scores)) {
          const validScores = e.scores.filter(sc => realStudentNames.has(sc.name) || realStudentNames.has(sc.studentName));
          if (validScores.length !== e.scores.length) {
            e.scores = validScores;
            modified = true;
          }
        }
      });
      if (filteredExams.length !== this.data.exams.length) {
        this.data.exams = filteredExams;
        modified = true;
      }
    }
    if (this.data.scores && this.data.scores.length > 0) {
      const filteredScores = this.data.scores.filter(sc => realStudentNames.has(sc.name) || realStudentNames.has(sc.studentName));
      if (filteredScores.length !== this.data.scores.length) {
        this.data.scores = filteredScores;
        modified = true;
      }
    }

    // 10. 清理家校沟通模板假通知与非本班学生台账/长期未联系预警
    if (this.data.communication) {
      if (this.data.communication.notices && this.data.communication.notices.length > 0) {
        const filteredNotices = this.data.communication.notices.filter(n => n.id !== "nt-01" && n.id !== "nt-02");
        if (filteredNotices.length !== this.data.communication.notices.length) {
          this.data.communication.notices = filteredNotices;
          modified = true;
        }
      }
      if (this.data.communication.logs && this.data.communication.logs.length > 0) {
        const filteredLogs = this.data.communication.logs.filter(l => realStudentNames.has(l.studentName || l.student));
        if (filteredLogs.length !== this.data.communication.logs.length) {
          this.data.communication.logs = filteredLogs;
          modified = true;
        }
      }
      if (this.data.communication.longTimeUntouched && this.data.communication.longTimeUntouched.length > 0) {
        const filteredUntouched = this.data.communication.longTimeUntouched.filter(u => realStudentNames.has(u.studentName));
        if (filteredUntouched.length !== this.data.communication.longTimeUntouched.length) {
          this.data.communication.longTimeUntouched = filteredUntouched;
          modified = true;
        }
      }
    }

    // 11. 清理考勤与请假模板残留 (过滤非当前班级学生的考勤记录与假请假单)
    if (this.data.attendance) {
      if (this.data.attendance.records && typeof this.data.attendance.records === "object") {
        let changed = false;
        const cleanedRecords = {};
        Object.keys(this.data.attendance.records).forEach(date => {
          const dayRec = this.data.attendance.records[date];
          if (dayRec && typeof dayRec === "object") {
            const validDayRec = {};
            let hasValid = false;
            Object.keys(dayRec).forEach(stuIdOrName => {
              if (realStudentNames.has(stuIdOrName) || (this.data.students || []).some(s => s.id === stuIdOrName)) {
                validDayRec[stuIdOrName] = dayRec[stuIdOrName];
                hasValid = true;
              } else {
                changed = true;
              }
            });
            if (hasValid) {
              cleanedRecords[date] = validDayRec;
            } else {
              changed = true;
            }
          }
        });
        if (changed) {
          this.data.attendance.records = cleanedRecords;
          modified = true;
        }
      }

      if (this.data.attendance.leaves && Array.isArray(this.data.attendance.leaves)) {
        const filteredLeaves = this.data.attendance.leaves.filter(l =>
          realStudentNames.has(l.studentName || l.student) || (this.data.students || []).some(s => s.id === l.studentId)
        );
        if (filteredLeaves.length !== this.data.attendance.leaves.length) {
          this.data.attendance.leaves = filteredLeaves;
          modified = true;
        }
      }
    }

    if (modified) {
      this.save();
    }
    return modified;
  }

  // 首次导入学生档案时自动清理其它栏目对应班级创建时的模板信息
  cleanTemplateDataOnFirstImport(newStudents) {
    this.data.students = newStudents;
    this.data.tasks = [];
    this.data.homeworkList = [];
    this.data.homework = [];
    this.data.growthEvents = [];
    this.data.petActivities = [];
    this.data.cadres = [];
    this.data.dutySchedule = {};
    this.data.safety1530 = [];
    this.data.healthDaily = {
      date: new Date().toISOString().slice(0, 10),
      normalCount: newStudents.length,
      testedCount: newStudents.length,
      abnormalCount: 0,
      abnormalDetails: []
    };
    this.data.attendance = { records: {}, leaves: [] };
    this.data.exams = [];
    this.data.scores = [];
    this.data.communication = { notices: [], logs: [], longTimeUntouched: [], followUpPlans: [] };
    this.data.activities = [];
    this.data.rules = [];
    this.data.hasImportedRealStudents = true;
    this.data.isTemplateData = false;

    if (this.data.growthDimensions) {
      this.data.growthDimensions.forEach(d => d.count = 0);
    }
    if (this.data.classInfo) {
      this.data.classInfo.studentCount = newStudents.length;
    }

    // 为导入的每名学生初始化专属萌宠，重置花数为 0
    const petSpeciesList = ["panda", "seal", "husky", "cat", "dog", "rabbit", "fox", "deer", "koala", "penguin"];
    this.data.students.forEach((s, idx) => {
      s.petId = petSpeciesList[idx % petSpeciesList.length];
      s.score = 80;
      s.flowers = 0;
      s.petData = {
        name: s.name + "的守护宠",
        level: 1,
        exp: 0,
        mood: "开心",
        inventory: []
      };
    });

    this.save();
  }

  // ================= 班级宠物全栏目积分联动统一调度器 =================
  linkPetScoreChange(studentIdOrName, delta, reason, category = "general") {
    if (!studentIdOrName || typeof delta !== "number" || delta === 0) return null;
    const students = this.data.students || [];
    const s = students.find(item => item.id === studentIdOrName || item.name === studentIdOrName);
    if (!s) return null;

    const oldScore = Number(s.score || 80);
    const newScore = Math.max(0, oldScore + delta);
    s.score = newScore;

    // 1. 记录个人量化积分流水
    if (!s.scoreHistory) s.scoreHistory = [];
    const now = new Date();
    const timeStr = now.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
    const histItem = {
      id: "sh_" + Date.now() + "_" + Math.floor(Math.random() * 1000),
      date: now.toISOString().slice(0, 10),
      time: timeStr,
      delta: delta,
      reason: reason || "日常综合表现",
      category: category // "growth", "attendance", "leave", "exam", "homework"
    };
    s.scoreHistory.unshift(histItem);

    // 2. 实时联动更新宠物等级、经验值与身心状态
    if (!s.petData) s.petData = { level: 1, exp: 0, hunger: 85, happy: 90, inventory: [] };
    const petMeta = this.calcPetLevelAndExp(newScore);
    s.petData.level = petMeta.level;
    s.petData.exp = petMeta.exp;
    s.petData.hunger = Math.min(100, Math.max(50, 70 + Math.floor(petMeta.exp * 0.3)));
    s.petData.happy = Math.min(100, Math.max(60, 75 + Math.floor(petMeta.exp * 0.25)));

    // 3. 全局班级萌宠动态实时播报流水
    if (!this.data.petActivities) this.data.petActivities = [];
    const iconMap = {
      growth: "🌸",
      attendance: "⏰",
      leave: "📋",
      exam: "💯",
      homework: "✍️",
      general: "🐾"
    };
    this.data.petActivities.unshift({
      id: "pa_" + Date.now() + "_" + Math.floor(Math.random() * 100),
      date: now.toISOString().slice(0, 10),
      time: timeStr,
      studentName: s.name,
      delta: delta,
      reason: reason || "综合表现提升",
      category: category,
      icon: iconMap[category] || "🐾",
      newScore: newScore,
      petLevel: s.petData.level
    });
    if (this.data.petActivities.length > 30) {
      this.data.petActivities = this.data.petActivities.slice(0, 30);
    }

    this.save();
    return { student: s, oldScore, newScore, delta, petLevel: s.petData.level, petExp: s.petData.exp };
  }

  // 记录成长事件，并深度联动指标统计、小红花累积与班级宠物积分经验
  addGrowthEvent(evt) {
    evt.id = "growth-" + Date.now();
    if (!this.data.growthEvents) this.data.growthEvents = [];
    this.data.growthEvents.unshift(evt);

    // 1. 对应评价维度自动按获得表彰的独立学生人数更新
    this.updateDimCounts();

    // 2. 解析小红花朵数 (支持自定义朵数与预设朵数)
    let flowers = 0;
    if (typeof evt.flowerCount === "number" && !isNaN(evt.flowerCount)) {
      flowers = evt.flowerCount;
    } else if (evt.flower) {
      const match = String(evt.flower).match(/\+?(\d+)朵/);
      if (match) {
        flowers = parseInt(match[1]);
      }
    }

    // 3. 深度联动关联学生的小红花光荣榜与班级宠物积分
    if (evt.student) {
      const students = this.data.students || [];
      const s = students.find(x => x.name === evt.student || x.id === evt.student);
      if (s) {
        if (flowers > 0) {
          s.flowers = (s.flowers || 0) + flowers;
        }
        const flowerVal = Number((this.data.scoreRules && this.data.scoreRules.flowerValue) !== undefined ? this.data.scoreRules.flowerValue : 3);
        let delta = 0;
        let reason = "";
        if (evt.tag === "表扬") {
          delta = flowers > 0 ? (flowers * flowerVal) : 2; // 每朵小红花奖 flowerVal 分
          reason = `成长评价【${evt.dim}】获${evt.flower || `+${flowers}朵小红花`}`;
        } else {
          delta = -2; // 待改进关注
          reason = `成长评价【${evt.dim}】待改进辅导建议`;
        }
        this.linkPetScoreChange(s.name, delta, reason, "growth");
      }
    }

    this.save();
  }

  addNotice(notice) {
    notice.id = "nt-" + Date.now();
    notice.date = new Date().toISOString().slice(0, 10);
    notice.readCount = 0;
    notice.unreadCount = this.data.students.length;
    notice.unreadParents = this.data.students.map(s => s.name + "家长");
    if (!this.data.communication) this.data.communication = { notices: [], logs: [], longTimeUntouched: [] };
    this.data.communication.notices.unshift(notice);
    this.save();
  }

  addCommLog(log) {
    log.id = "comm-" + Date.now();
    log.date = new Date().toISOString().slice(0, 10);
    if (!this.data.communication) this.data.communication = { notices: [], logs: [], longTimeUntouched: [] };
    this.data.communication.logs.unshift(log);
    // 自动消除该学生的长期未联系预警
    if (this.data.communication.longTimeUntouched && log.studentName) {
      this.data.communication.longTimeUntouched = this.data.communication.longTimeUntouched.filter(
        item => item.studentName !== log.studentName && item.student !== log.studentName
      );
    }
    this.save();
  }

  updateCommLog(logId, fields) {
    if (!this.data.communication || !this.data.communication.logs) return;
    const log = this.data.communication.logs.find(l => l.id === logId);
    if (log) {
      Object.assign(log, fields);
      this.save();
    }
  }

  deleteCommLog(logId) {
    if (!this.data.communication || !this.data.communication.logs) return;
    this.data.communication.logs = this.data.communication.logs.filter(l => l.id !== logId);
    this.save();
  }

  addActivity(act) {
    act.id = "act-" + Date.now();
    if (!this.data.activities) this.data.activities = [];
    this.data.activities.unshift(act);
    this.save();
  }

  // ================= Excel 导出全部表格 (基于 SheetJS) =================

  // 1. 导出课表
  exportTimetableExcel() {
    if (typeof XLSX === "undefined") { alert("Excel 模块未就绪！"); return; }
    const periods = this.data.timetable.periods;
    const schedule = this.data.timetable.schedule;
    const days = ["周一", "周二", "周三", "周四", "周五"];
    const rows = [
      [`${this.data.classInfo.name} 班级总课表`],
      ["节次", "时间", ...days]
    ];
    periods.forEach((p, idx) => {
      const row = [p.name, p.time];
      days.forEach(d => {
        const c = (schedule[d] && schedule[d][idx]) || { subject: "自习", teacher: "" };
        row.push(`${c.subject} (${c.teacher})`);
      });
      rows.push(row);
    });
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, "班级课表");
    XLSX.writeFile(wb, `${this.data.classInfo.name}_课程表.xlsx`);
  }

  // 2. 导出座位表 (含 2D 讲台视角教室网格 + 详细清单双工作表)
  exportSeatingExcel() {
    if (typeof XLSX === "undefined") { alert("Excel 模块未就绪！"); return; }
    const wb = XLSX.utils.book_new();
    const students = this.data.students || [];
    const grid = this.data.seatingGrid || { rows: 8, cols: 6 };
    const rCount = grid.rows;
    const cCount = grid.cols;

    // 工作表 1: 2D 教室立体课桌排布视图 (直观对应教室讲台)
    const gridRows = [];
    gridRows.push([`🏫 ${this.data.classInfo.name} 教室课桌座次平面排布表 (当前布局: ${rCount}排 × ${cCount}列)`]);
    
    // 讲台指示行
    const podiumRow = ["【讲台】"];
    for (let c = 1; c <= cCount; c++) podiumRow.push(`第${c}列`);
    gridRows.push(podiumRow);

    for (let r = 1; r <= rCount; r++) {
      const rowArr = [`第${r}排`];
      for (let c = 1; c <= cCount; c++) {
        const seatIdx = (r - 1) * cCount + (c - 1);
        const s = students[seatIdx];
        rowArr.push(s ? s.name : "（空位）");
      }
      gridRows.push(rowArr);
    }
    const wsGrid = XLSX.utils.aoa_to_sheet(gridRows);
    XLSX.utils.book_append_sheet(wb, wsGrid, "教室座位平面图");

    // 工作表 2: 学生座次明细名册
    const detailRows = [
      [`${this.data.classInfo.name} 座次详细档案名册`],
      ["学号", "学生姓名", "小组", "座位编号", "班级职务", "接送方式"]
    ];
    students.forEach(s => {
      detailRows.push([s.id, s.name, `第${s.group}组`, s.seat, s.role, s.pickup || "家长接送"]);
    });
    const wsDetail = XLSX.utils.aoa_to_sheet(detailRows);
    XLSX.utils.book_append_sheet(wb, wsDetail, "座次详细名单");

    XLSX.writeFile(wb, `${this.data.classInfo.name}_教室座位表.xlsx`);
  }

  // 3. 导出值日安排 (同时导出汇总表与细分区域分工明细表)
  exportDutyExcel() {
    if (typeof XLSX === "undefined") { alert("Excel 模块未就绪！"); return; }
    const duties = this.data.dutySchedule || {};
    const days = ["周一", "周二", "周三", "周四", "周五"];
    const rows = [
      [`${this.data.classInfo.name} 每日值日生与清洁区域安排`],
      ["星期", "值日组长", "清洁区域", "具体职责", "值日生名单"]
    ];
    days.forEach(d => {
      const item = duties[d] || {};
      rows.push([d, item.leader || "", item.zone || "", item.task || "", (item.members || []).join("、")]);
    });
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, "值日安排汇总");

    // 若有细分区域分工数据，一并导出精细区域分工明细表
    const hasZones = days.some(d => duties[d] && duties[d].zones && duties[d].zones.length > 0);
    if (hasZones) {
      const zoneRows = [
        [`${this.data.classInfo.name} 卫生值日细分区域分工明细表`],
        ["星期", "值日时段", "清洁区域", "负责学生名单", "组长标识"]
      ];
      days.forEach(d => {
        const item = duties[d] || {};
        if (item.zones && item.zones.length > 0) {
          item.zones.forEach(z => {
            const hasLeader = item.leader && z.students.includes(item.leader);
            zoneRows.push([d, z.period || "常规时段", z.zone, z.students.join("、"), hasLeader ? `★ 组长 (${item.leader})` : ""]);
          });
        }
      });
      const wsZones = XLSX.utils.aoa_to_sheet(zoneRows);
      XLSX.utils.book_append_sheet(wb, wsZones, "区域分工明细");
    }

    XLSX.writeFile(wb, `${this.data.classInfo.name}_值日安排表.xlsx`);
  }

  // 4. 导出班干部名单
  exportCadresExcel() {
    if (typeof XLSX === "undefined") { alert("Excel 模块未就绪！"); return; }
    const rows = [
      [`${this.data.classInfo.name} 班干部团队花名册`],
      ["职务", "姓名", "主要职责", "任期", "学期评价"]
    ];
    (this.data.cadres || []).forEach(c => {
      rows.push([c.title, c.name, c.duties, c.term, c.rating]);
    });
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, "班干部");
    XLSX.writeFile(wb, `${this.data.classInfo.name}_班干部名单.xlsx`);
  }

  // 5. 导出成绩单
  exportScoresExcel(examId) {
    if (typeof XLSX === "undefined") { alert("Excel 模块未就绪！"); return; }
    const exam = (this.data.exams && this.data.exams.find(e => e.id === examId)) || (this.data.exams && this.data.exams[0]);
    if (!exam) return;
    const subjects = exam.subjects || ["语文", "数学", "英语", "科学"];
    const rows = [
      [`${this.data.classInfo.name} ${exam.name} 成绩与学情分析表`],
      [`考试日期: ${exam.date}`, `考核科目: ${subjects.join("、")}`, `班级平均分: ${exam.stats.avgScore}`, `优秀率: ${exam.stats.excellentRate}%`],
      ["排名", "学号", "姓名", ...subjects, "总分", "等级", "较上次变化", "教师评语"]
    ];
    (exam.scores || []).forEach(s => {
      const subVals = subjects.map(sub => (s.subjectScores && s.subjectScores[sub] !== undefined) ? s.subjectScores[sub] : (s[sub] !== undefined ? s[sub] : ""));
      rows.push([s.rank, s.studentId, s.name, ...subVals, s.totalScore !== undefined ? s.totalScore : s.score, s.level, s.trend, s.comment]);
    });
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, "成绩单");
    XLSX.writeFile(wb, `${this.data.classInfo.name}_${exam.name}_成绩单.xlsx`);
  }

  // 6. 导出作业总表
  exportHomeworkExcel() {
    if (typeof XLSX === "undefined") { alert("Excel 模块未就绪！"); return; }
    const rows = [
      [`${this.data.classInfo.name} 学科作业布置与完成情况统计表`],
      ["序号", "学科", "作业标题", "布置日期", "截止时间", "已提交人数", "未交人数", "未交学生清单"]
    ];
    (this.data.homeworkList || []).forEach((hw, idx) => {
      rows.push([
        idx + 1, hw.subject, hw.title, hw.assignedDate, hw.deadline,
        hw.stats.submitted, hw.stats.unsubmitted, (hw.unsubmittedStudents || []).join("、")
      ]);
    });
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, "作业汇总");
    XLSX.writeFile(wb, `${this.data.classInfo.name}_作业管理表.xlsx`);
  }

  // 7. 导出考勤表
  exportAttendanceExcel() {
    if (typeof XLSX === "undefined") { alert("Excel 导出组件未加载！"); return; }
    const rows = [
      [`${this.data.classInfo.name} 月度考勤明细表`],
      ["导出日期：" + new Date().toLocaleDateString(), "班级总人数：" + this.data.students.length],
      ["学号", "姓名", "性别", "小组", "今日状态", "本月累计请假(次)", "本月迟到(次)"]
    ];
    const statusMap = {
      normal: "正常出勤", late: "迟到", early_leave: "早退",
      casual_leave: "事假", sick_leave: "病假", absent: "缺勤",
      official_leave: "公假", other: "其他"
    };
    this.data.students.forEach(s => {
      rows.push([
        s.id, s.name, s.gender, "第" + s.group + "组",
        statusMap[s.attendanceToday] || "正常出勤",
        s.attendanceToday.includes("leave") ? 1 : 0,
        s.attendanceToday === "late" ? 1 : 0
      ]);
    });
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, "考勤表");
    XLSX.writeFile(wb, `${this.data.classInfo.name}_月度考勤表_${new Date().toISOString().slice(0, 10)}.xlsx`);
  }

  // 8. 导出安全台账
  exportSafety1530Excel() {
    if (typeof XLSX === "undefined") { alert("Excel 导出组件未加载！"); return; }
    const rows = [
      [`${this.data.classInfo.name} 1530安全教育与提醒台账`],
      ["制度要求：每天放学前1分钟、周末放学前5分钟、长假前30分钟安全教育留痕"],
      ["序号", "教育日期", "教育类型", "安全主题", "教育内容概要", "宣讲方式", "参与人数", "组织老师", "完成状态"]
    ];
    this.data.safety1530.forEach((item, idx) => {
      rows.push([
        idx + 1, item.date, item.type, item.topic, item.content, item.method, item.participants, item.teacher, item.status
      ]);
    });
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, "1530安全台账");
    XLSX.writeFile(wb, `${this.data.classInfo.name}_1530安全教育台账_${new Date().toISOString().slice(0, 10)}.xlsx`);
  }

  // 9. 导出花名册
  exportStudentsExcel() {
    if (typeof XLSX === "undefined") { alert("Excel 导出组件未加载！"); return; }
    const rows = [
      [`${this.data.classInfo.name} 学生全量花名册与电子学籍档案表`],
      ["学号", "姓名", "性别", "民族", "身份证号码", "出生日期", "户口所在地 (户籍)", "现居住常住地址", "监护人", "联系电话", "上下学接送方式", "是否留守儿童", "家庭困难类别", "小组", "座位", "班级职务", "过敏/健康信息"]
    ];
    this.data.students.forEach(s => {
      rows.push([
        s.id, s.name, s.gender, s.nation || s.ethnicity || "汉族", s.idCard || "", s.birthday,
        s.hukou || s.registeredResidence || "未登记", s.address || "本市",
        s.guardian, s.phone, s.pickup || "家长接送",
        s.isLeftBehind ? "是" : "否", s.hardshipCategory || "无",
        "第" + s.group + "组", s.seat, s.role, s.allergies || "无"
      ]);
    });
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, "学生档案花名册");
    XLSX.writeFile(wb, `${this.data.classInfo.name}_学生档案花名册_${new Date().toISOString().slice(0, 10)}.xlsx`);
  }


  // 10. 导出班级量化与萌宠总表 Excel
  exportQuantScoreExcel() {
    if (typeof XLSX === "undefined") { alert("Excel 导出组件未加载！"); return; }
    const sorted = [...this.data.students].sort((a, b) => (b.score || 0) - (a.score || 0));
    const petsList = this.data.petsList || [];
    const rows = [
      [`${this.data.classInfo.name} 班级学生量化考核与萌宠成长总表`],
      [`生成时间：${new Date().toLocaleString()} · 考核依据：作业完成情况、历次考试得分、日常出勤及行为奖惩`],
      ["全班排名", "学号", "姓名", "所属小组", "综合量化分", "领养萌宠", "萌宠等级", "成长经验", "作业积分", "考试积分", "出勤积分", "综合评定"]
    ];
    sorted.forEach((s, idx) => {
      const petConfig = petsList.find(p => p.id === s.petId) || petsList[0] || { name: "萌宠" };
      const petData = s.petData || { level: 1, exp: 0 };
      const det = s.scoreDetails || { hwPoints: "+15", examPoints: "+20", attPoints: "+5" };
      const comment = (s.score || 0) >= 120 ? "品学兼优，全面发展" : (s.score || 0) >= 100 ? "表现积极，稳步提高" : "需多加督促，按时订正作业";
      rows.push([
        idx + 1, s.id, s.name, "第" + s.group + "组", s.score || 80,
        petConfig.name, "Lv." + petData.level, petData.exp + "%",
        det.hwPoints, det.examPoints, det.attPoints, comment
      ]);
    });
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, "量化与萌宠总表");
    XLSX.writeFile(wb, `${this.data.classInfo.name}_量化积分与萌宠总表_${new Date().toISOString().slice(0, 10)}.xlsx`);
  }

  // 11. 导出积分规则模板 Excel
  exportScoreRulesExcel() {
    if (typeof XLSX === "undefined") { alert("Excel 导出组件未加载！"); return; }
    const r = this.data.scoreRules || {};
    const rows = [
      ["班级量化积分与萌宠成长换算规则配置表"],
      ["规则项标识", "规则名称", "配置分值", "规则说明"],
      ["baseScore", "基础起步分", r.baseScore || 80, "每位学生的初始基础积分"],
      ["hwSubmitBonus", "作业按时提交奖励", r.hwSubmitBonus || 5, "每完成一次学科作业加分"],
      ["hwUnsubmitPenalty", "作业欠交拖欠扣除", r.hwUnsubmitPenalty || -2, "每欠交一次作业扣分"],
      ["examExcellent", "考试成绩优秀(>=90分)", r.examExcellent || 20, "测验达到优秀等级奖励分"],
      ["examGood", "考试成绩良好(80-89分)", r.examGood || 10, "测验达到良好等级奖励分"],
      ["examPass", "考试成绩及格(60-79分)", r.examPass || 5, "测验及格奖励分"],
      ["examFail", "考试成绩待提升(<60分)", r.examFail || 0, "不及格不加分"],
      ["attNormalBonus", "今日全勤奖励", r.attNormalBonus || 5, "今日出勤正常奖励分"],
      ["attLatePenalty", "迟到行为扣除", r.attLatePenalty || -2, "每次迟到扣除分"],
      ["attAbsentPenalty", "旷课缺勤扣除", r.attAbsentPenalty || -5, "每次无故缺勤扣除分"],
      ["growthAward", "好人好事/表扬加分", r.growthAward || 3, "记录正面表现单次奖励分"]
    ];
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, "积分规则");
    XLSX.writeFile(wb, `班级量化积分规则配置表_${new Date().toISOString().slice(0, 10)}.xlsx`);
  }

  // 12. 根据学生作业、考试、考勤等实际数据一键重新核算全员积分与等级
  recalcAllPetScoresAndLevels() {
    const rules = this.data.scoreRules || {
      baseScore: 80, hwSubmitBonus: 5, hwUnsubmitPenalty: -2,
      examExcellent: 20, examGood: 10, examPass: 5, examFail: 0,
      attNormalBonus: 5, attLatePenalty: -2, attAbsentPenalty: -5, growthAward: 3
    };
    const hwList = this.data.homeworkList || [];
    const exams = this.data.exams || [];
    const students = this.data.students || [];

    students.forEach(s => {
      let score = Number(rules.baseScore || 80);
      let hwPoints = 0;
      let examPoints = 0;
      let attPoints = 0;

      // 1. 作业提交情况
      hwList.forEach(hw => {
        const unsubmitted = hw.unsubmittedStudents || [];
        if (unsubmitted.includes(s.name)) {
          hwPoints += Number(rules.hwUnsubmitPenalty || -2);
        } else {
          hwPoints += Number(rules.hwSubmitBonus || 5);
        }
      });

      // 2. 考试质量情况
      exams.forEach(ex => {
        const studentScoreObj = (ex.scores || []).find(sc => sc.studentId === s.id || sc.name === s.name);
        if (studentScoreObj && typeof studentScoreObj.score === 'number') {
          const sc = studentScoreObj.score;
          if (sc >= 90) examPoints += Number(rules.examExcellent || 20);
          else if (sc >= 80) examPoints += Number(rules.examGood || 10);
          else if (sc >= 60) examPoints += Number(rules.examPass || 5);
          else examPoints += Number(rules.examFail || 0);
        }
      });

      // 3. 今日考勤
      if (s.attendanceToday === "normal") {
        attPoints += Number(rules.attNormalBonus || 5);
      } else if (s.attendanceToday === "late") {
        attPoints += Number(rules.attLatePenalty || -2);
      } else if (s.attendanceToday === "absent") {
        attPoints += Number(rules.attAbsentPenalty || -5);
      }

      // 4. 成长评价与小红花综合奖励
      const growthEvents = this.data.growthEvents || [];
      const flowerVal = Number((rules && rules.flowerValue) !== undefined ? rules.flowerValue : 3);
      let growthPoints = 0;
      let totalFlowers = 0;
      growthEvents.forEach(ge => {
        if (ge.student === s.name || ge.student === s.id) {
          let fl = 0;
          if (typeof ge.flowerCount === "number" && !isNaN(ge.flowerCount)) fl = ge.flowerCount;
          else if (ge.flower) {
            const m = String(ge.flower).match(/\+?(\d+)朵/);
            if (m) fl = parseInt(m[1]);
          }
          if (ge.tag === "表扬") {
            growthPoints += fl > 0 ? (fl * flowerVal) : Number(rules.growthAward || flowerVal);
            totalFlowers += fl;
          } else {
            growthPoints -= 2;
          }
        }
      });
      if (totalFlowers > 0) {
        s.flowers = totalFlowers;
      }

      // 5. 手动历史奖惩
      let customPoints = 0;
      if (s.scoreHistory && s.scoreHistory.length > 0) {
        customPoints = s.scoreHistory
          .filter(cur => !cur.category || cur.category === "general" || cur.category === "manual")
          .reduce((acc, cur) => acc + (Number(cur.delta) || 0), 0);
      }

      const finalScore = Math.max(0, score + hwPoints + examPoints + attPoints + growthPoints + customPoints);
      s.score = finalScore;
      s.scoreDetails = { hwPoints, examPoints, attPoints, growthPoints, customPoints };

      // 同步联动更新宠物等级与状态
      if (!s.petData) s.petData = { level: 1, exp: 0, hunger: 85, happy: 90, inventory: [] };
      const petMeta = this.calcPetLevelAndExp(finalScore);
      s.petData.level = petMeta.level;
      s.petData.exp = petMeta.exp;
      s.petData.hunger = Math.min(100, Math.max(50, 70 + Math.floor(petMeta.exp * 0.3)));
      s.petData.happy = Math.min(100, Math.max(60, 75 + Math.floor(petMeta.exp * 0.25)));
    });

    this.save();
    return {
      success: true,
      studentCount: students.length,
      avgScore: (students.reduce((a, b) => a + (b.score || 0), 0) / (students.length || 1)).toFixed(1),
      maxScore: Math.max(...students.map(s => s.score || 0))
    };
  }

  updateScoreRules(newRules) {
    this.data.scoreRules = Object.assign({}, this.data.scoreRules || {}, newRules);
    this.save();
    return this.recalcAllPetScoresAndLevels();
  }

  // 13. 班级活动与相册管理
  addActivity(act) {
    act.id = "act-" + Date.now();
    if (!act.photos) act.photos = [];
    if (!act.goals) act.goals = act.summary || "全面提升综合素质，促进班集体健康成长。";
    if (!act.highlights) act.highlights = ["师生互动热烈，全员全流程积极参与", "秩序井然，反响强烈"];
    if (!act.reflection) act.reflection = "活动达到预期教育教学效果，学生收获颇丰。";
    if (!this.data.activities) this.data.activities = [];
    this.data.activities.unshift(act);
    this.save();
  }

  updateActivity(actId, updated) {
    const a = (this.data.activities || []).find(item => item.id === actId);
    if (a) {
      Object.assign(a, updated);
      this.save();
    }
  }

  deleteActivity(actId) {
    this.data.activities = (this.data.activities || []).filter(item => item.id !== actId);
    this.save();
  }

  addActivityPhoto(actId, photo) {
    const a = (this.data.activities || []).find(item => item.id === actId);
    if (a) {
      if (!a.photos) a.photos = [];
      photo.id = "p-" + Date.now();
      photo.date = new Date().toISOString().slice(0, 10);
      a.photos.push(photo);
      this.save();
    }
  }

  // ==================== 🤖 大模型与 AI 评语引擎模块 (支持多教师私有配置独立隔离) ====================

  // 获取当前操作教师的身份唯一键 (用于多教师大模型配置 100% 独立隔离)
  getCurrentUserKey() {
    let u = window.currentUser;
    if (!u) {
      try {
        u = JSON.parse(localStorage.getItem("HOMEROOM_CURRENT_USER") || "null");
      } catch (e) {}
    }
    if (u && u.username) {
      return String(u.username).trim();
    }
    if (u && u.id) {
      return String(u.id).trim();
    }
    return "demo";
  }

  initAIConfig(teacherKey = null) {
    const userKey = teacherKey || this.getCurrentUserKey();
    if (!this.data.aiConfigs || typeof this.data.aiConfigs !== "object") {
      this.data.aiConfigs = {};
    }

    const defaultPrompts = [
      {
        id: "prompt_comprehensive_1",
        title: "官方标准·五育并举期末综合评语",
        isDefault: true,
        category: "期末综合",
        content: "你是一位具备二十年一线带班经验的资深优秀小学班主任，精通儿童心理学与现代教育评价理论。请根据下方提供的该学生真实全维成长画像（包含基本信息、学科历次成绩学情、考勤纪律、作业习惯、小红花表扬/改进事件、职务特长等），为该学生撰写一份有温度、有洞察、具建设性的期末综合素质评语。\n\n【撰写核心原则】：\n1. 语气亲切诚恳、关怀温暖、立德树人，符合小学生认知特点与家校沟通规范；\n2. 杜绝千篇一律的套话！必须深度结合该学生的真实学科优势/薄弱点、出勤、作业提交、课堂表现及小红花闪光点进行具体点题表扬；\n3. 结构清晰规范：\n   - 第一段【闪光点与综合表现】：肯定品德、班级责任、性格特长或进步亮点；\n   - 第二段【学科学情与习惯复盘】：针对其优势学科肯定方法，针对薄弱学科或作业考勤中肯指出可提升空间；\n   - 第三段【新学期期望与寄语】：给予饱含信心与方向感的明确期许；\n4. 字数控制在 180~280 字之间，语言流畅优美，极具师者关怀。"
      },
      {
        id: "prompt_study_habit_2",
        title: "学法指导·学习习惯与自主提升评语",
        isDefault: false,
        category: "学科学法",
        content: "你是一位注重培养学生自主学习力与终身习惯的智慧型班主任。请根据提供的学生各项学科学情、历次考试走势、作业提交与课堂互动数据，重点从“学习习惯、思维方法、专注力与学科突破”三个维度展开评价。\n\n【撰写原则】：\n1. 肯定学生在优势科目上的钻研精神与良好习惯；\n2. 针对波动较大或薄弱学科，给出具体的学法建议（如错题归纳、课前预习、时间管理等）；\n3. 寄语激发内在驱动力，字数 180~250 字左右。"
      },
      {
        id: "prompt_growth_flower_3",
        title: "闪光发现·个性特长与潜能激励评语",
        isDefault: false,
        category: "个性激励",
        content: "你是一位极具爱心与教育敏锐度的班主任，信奉“每个孩子都是一颗独特的种子”。请深入挖掘该学生在成长小红花、个性标签、集体劳动、文体特长或默默奉献等方面的独特闪光点。\n\n【撰写原则】：\n1. 重点结合学生获得的小红花维度与具体表扬事件，用放大镜发现其闪光点；\n2. 鼓励其自信自强，将特长优势迁移到学科学习与日常自律中；\n3. 语言生动活泼、富有诗意与感染力，字数 160~240 字。"
      },
      {
        id: "prompt_home_care_4",
        title: "家校共育·温情沟通与关怀寄语",
        isDefault: false,
        category: "家校温情",
        content: "你是一位深受家长信赖的温情班主任。请从家校协同育人的视角，结合学生的考勤出勤、日常身心健康、待人接物与学业表现，撰写一份写给学生和家长的暖心评语。\n\n【撰写原则】：\n1. 感谢家长的默契配合，肯定孩子在校的懂事与点滴成长；\n2. 温和提出家校共同督促关注的细节（如视力用眼、作息作息、阅读陪伴等）；\n3. 充满信任与期盼，字数 180~260 字。"
      }
    ];

    const defaultTemplate = {
      enabled: false,
      apiUrl: "",
      apiKey: "",
      model: "glm-4-flash",
      provider: "zhipu",
      temperature: 0.7,
      maxTokens: 1200,
      activePromptId: "prompt_comprehensive_1",
      prompts: defaultPrompts,
      availableModels: []
    };

    // 若当前班级历史已有全局 aiConfig，作为初始模板
    const globalBase = (this.data.aiConfig && typeof this.data.aiConfig === "object") ? this.data.aiConfig : defaultTemplate;

    // 若当前教师尚无专属分槽，尝试从 localStorage 私有缓存读取或从底包继承
    if (!this.data.aiConfigs[userKey]) {
      let localCache = null;
      try {
        localCache = JSON.parse(localStorage.getItem("TEACHER_AI_CONFIG_" + userKey) || "null");
      } catch (e) {}

      if (localCache && typeof localCache === "object") {
        this.data.aiConfigs[userKey] = localCache;
      } else {
        this.data.aiConfigs[userKey] = JSON.parse(JSON.stringify(globalBase));
      }
    }

    const tCfg = this.data.aiConfigs[userKey];
    if (!Array.isArray(tCfg.availableModels)) {
      tCfg.availableModels = [];
    }
    if (!Array.isArray(tCfg.prompts) || tCfg.prompts.length === 0) {
      tCfg.prompts = JSON.parse(JSON.stringify(defaultPrompts));
    } else {
      defaultPrompts.forEach(dp => {
        if (!tCfg.prompts.some(p => p.id === dp.id)) {
          tCfg.prompts.push(dp);
        }
      });
    }
    if (!tCfg.activePromptId) {
      tCfg.activePromptId = "prompt_comprehensive_1";
    }

    // 映射回 this.data.aiConfig 以保证所有向下调用的全方位兼容性
    this.data.aiConfig = this.data.aiConfigs[userKey];
    return tCfg;
  }

  getAIConfig(teacherKey = null) {
    const userKey = teacherKey || this.getCurrentUserKey();
    this.initAIConfig(userKey);
    return JSON.parse(JSON.stringify(this.data.aiConfigs[userKey]));
  }

  saveAIConfig(cfg, teacherKey = null) {
    const userKey = teacherKey || this.getCurrentUserKey();
    this.initAIConfig(userKey);
    const current = this.data.aiConfigs[userKey];
    const updated = {
      ...current,
      ...cfg
    };
    if (updated.apiUrl && updated.apiUrl.trim()) {
      updated.enabled = true;
    }
    this.data.aiConfigs[userKey] = updated;
    this.data.aiConfig = updated;

    // 教师私有配置持久化缓存 (支持跨设备与防覆盖隔离)
    try {
      localStorage.setItem("TEACHER_AI_CONFIG_" + userKey, JSON.stringify(updated));
    } catch (e) {}

    this.save();
    return updated;
  }

  getAIPrompts(teacherKey = null) {
    const userKey = teacherKey || this.getCurrentUserKey();
    const cfg = this.initAIConfig(userKey);
    return cfg.prompts || [];
  }

  getActiveAIPrompt(teacherKey = null) {
    const userKey = teacherKey || this.getCurrentUserKey();
    const cfg = this.initAIConfig(userKey);
    const prompts = cfg.prompts || [];
    const active = prompts.find(p => p.id === cfg.activePromptId);
    return active || prompts[0] || null;
  }

  setActiveAIPrompt(promptId, teacherKey = null) {
    const userKey = teacherKey || this.getCurrentUserKey();
    const cfg = this.initAIConfig(userKey);
    const prompt = (cfg.prompts || []).find(p => p.id === promptId);
    if (prompt) {
      cfg.activePromptId = promptId;
      this.saveAIConfig(cfg, userKey);
      return true;
    }
    return false;
  }

  addAIPrompt({ title, content, category }, teacherKey = null) {
    const userKey = teacherKey || this.getCurrentUserKey();
    const cfg = this.initAIConfig(userKey);
    const newPrompt = {
      id: "prompt_" + Date.now(),
      title: (title || "未命名系统提示词").trim(),
      content: (content || "").trim(),
      category: (category || "自定义").trim(),
      isDefault: false,
      createdAt: new Date().toISOString()
    };
    cfg.prompts.push(newPrompt);
    this.saveAIConfig(cfg, userKey);
    return newPrompt;
  }

  updateAIPrompt(promptId, updates, teacherKey = null) {
    const userKey = teacherKey || this.getCurrentUserKey();
    const cfg = this.initAIConfig(userKey);
    const prompt = (cfg.prompts || []).find(p => p.id === promptId);
    if (prompt) {
      if (updates.title) prompt.title = updates.title.trim();
      if (updates.content) prompt.content = updates.content.trim();
      if (updates.category) prompt.category = updates.category.trim();
      prompt.updatedAt = new Date().toISOString();
      this.saveAIConfig(cfg, userKey);
      return true;
    }
    return false;
  }

  deleteAIPrompt(promptId, teacherKey = null) {
    const userKey = teacherKey || this.getCurrentUserKey();
    const cfg = this.initAIConfig(userKey);
    const prompts = cfg.prompts || [];
    const idx = prompts.findIndex(p => p.id === promptId);
    if (idx !== -1) {
      if (prompts[idx].isDefault && prompts.filter(p => p.isDefault).length <= 1) {
        throw new Error("不可删除系统预置的核心默认提示词");
      }
      prompts.splice(idx, 1);
      if (cfg.activePromptId === promptId) {
        cfg.activePromptId = prompts[0] ? prompts[0].id : "";
      }
      this.saveAIConfig(cfg, userKey);
      return true;
    }
    return false;
  }

  // 综合画像聚合引擎：精准提取学生基本档案、历次学科考试、考勤出勤、日常作业、小红花表现、个性标签与教师要求
  buildStudentComprehensiveProfile(studentIdOrName, customInstruction = "") {
    const students = this.data.students || [];
    const student = students.find(s => s.id === studentIdOrName || s.name === studentIdOrName) || students[0] || {
      id: "unknown",
      name: studentIdOrName || "未知学生",
      gender: "未知",
      group: 1,
      role: "组员",
      tags: [],
      score: 85
    };

    const sName = student.name;
    const sId = student.id;

    // 1. 历次学科学情与成绩画像
    const exams = this.data.exams || [];
    const studentExamScores = [];
    exams.forEach(ex => {
      const sc = (ex.scores || []).find(item => item.studentId === sId || item.name === sName);
      if (sc) {
        studentExamScores.push({
          examName: ex.name,
          examDate: ex.date || "",
          totalScore: sc.totalScore !== undefined ? sc.totalScore : sc.score,
          score: sc.score,
          rank: sc.rank,
          level: sc.level,
          trend: sc.trend,
          subjectScores: sc.subjectScores || {
            "语文": sc.chinese,
            "数学": sc.math,
            "英语": sc.english,
            "科学": sc.science
          }
        });
      }
    });

    let avgScore = 0;
    let latestScoresText = "暂无具体单科考试记录";
    const strongSubjects = [];
    const improveSubjects = [];
    let overallLevel = "良好";
    let latestTrend = "持平";

    if (studentExamScores.length > 0) {
      const sum = studentExamScores.reduce((acc, cur) => acc + (Number(cur.score) || Number(cur.totalScore) || 0), 0);
      avgScore = Math.round((sum / studentExamScores.length) * 10) / 10;
      const latest = studentExamScores[studentExamScores.length - 1];
      latestTrend = latest.trend || "稳中有升";
      overallLevel = avgScore >= 90 ? "优秀" : (avgScore >= 80 ? "良好" : "及格");

      if (latest.subjectScores && typeof latest.subjectScores === "object") {
        const lines = [];
        Object.entries(latest.subjectScores).forEach(([sub, score]) => {
          if (score !== undefined && score !== null && !isNaN(score)) {
            const numScore = Number(score);
            lines.push(`  - ${sub}: ${numScore}分 (${numScore >= 90 ? '优势学科' : (numScore >= 80 ? '发挥稳健' : '有待巩固')})`);
            if (numScore >= 90) strongSubjects.push(sub);
            else if (numScore < 80) improveSubjects.push(sub);
          }
        });
        if (lines.length > 0) latestScoresText = lines.join("\n");
      }
    } else {
      avgScore = student.score || 85;
      overallLevel = avgScore >= 90 ? "优秀" : "良好";
    }

    // 2. 出勤与日常纪律
    let normalAttDays = 0;
    let lateCount = 0;
    let absentCount = 0;
    let leaveCount = 0;
    let totalChecks = 0;

    const attRecords = (this.data.attendance && this.data.attendance.records) || {};
    Object.values(attRecords).forEach(dayRec => {
      if (dayRec && dayRec[sId]) {
        totalChecks++;
        const st = dayRec[sId];
        if (st === "normal") normalAttDays++;
        else if (st === "late") lateCount++;
        else if (st === "absent") absentCount++;
        else if (st && st.includes("leave")) leaveCount++;
      }
    });

    const allLeaves = (this.data.attendance && this.data.attendance.leaves) || [];
    const studentLeaves = allLeaves.filter(l => l.studentId === sId || l.studentName === sName || l.student === sName);
    if (studentLeaves.length > leaveCount) leaveCount = studentLeaves.length;

    const attRateVal = totalChecks > 0 ? Math.round((normalAttDays / totalChecks) * 1000) / 10 : 100.0;
    const attendanceRate = `${attRateVal}%`;

    const morningStatus = student.attendanceMorning === "late" ? "迟到" : (student.attendanceMorning === "absent" ? "缺勤" : (student.attendanceMorning && student.attendanceMorning.includes("leave") ? "请假" : "正常到校"));
    const afternoonStatus = student.attendanceAfternoon === "late" ? "迟到" : (student.attendanceAfternoon === "absent" ? "缺勤" : (student.attendanceAfternoon && student.attendanceAfternoon.includes("leave") ? "请假" : "正常到校"));

    // 3. 课程作业完成情况
    const hwList = this.data.homeworkList || [];
    let totalHwCount = hwList.length;
    let unsubmittedHwCount = 0;
    hwList.forEach(hw => {
      const unsubs = hw.unsubmittedStudents || [];
      if (Array.isArray(unsubs) && unsubs.includes(sName)) {
        unsubmittedHwCount++;
      } else if (typeof unsubs === "string" && unsubs.includes(sName)) {
        unsubmittedHwCount++;
      }
    });
    const submittedHwCount = Math.max(0, totalHwCount - unsubmittedHwCount);
    const hwSubmitRate = totalHwCount > 0 ? `${Math.round((submittedHwCount / totalHwCount) * 1000) / 10}%` : "100.0%";

    // 4. 成长评价事件与小红花
    const growthEvents = this.data.growthEvents || [];
    const studentEvents = growthEvents.filter(e => e.student === sName || e.studentId === sId);
    let flowerCount = Number(student.flowers) || 0;
    const praiseEvents = [];
    const improveEvents = [];

    studentEvents.forEach(e => {
      let fl = 0;
      if (typeof e.flowerCount === "number") fl = e.flowerCount;
      else if (e.flower) {
        const m = String(e.flower).match(/\+?(\d+)朵/);
        if (m) fl = parseInt(m[1]);
      }
      flowerCount += fl;

      const dim = e.dim || e.dimension || e.category || "综合表现";
      const desc = e.desc || e.title || e.reason || "";
      if (e.tag === "待改进" || e.type === "improve") {
        improveEvents.push(`  - 【${dim}】${desc || '需进一步端正态度，规范自律'}`);
      } else {
        praiseEvents.push(`  - 【${dim}】${desc || '表现优异，受到表扬'}${fl > 0 ? ` (+${fl}朵小红花)` : ''}`);
      }
    });

    const tags = Array.isArray(student.tags) ? student.tags : (student.tags ? [student.tags] : []);

    // 格式化文本画像供大模型或本地启发式引擎直接使用
    const promptContext = `【学生全维成长学情画像档案】
■ 基本档案与班级角色：
- 姓名：${student.name} (${student.gender || '学生'}) | 组别：第 ${student.group || 1} 组 | 担任职务：${student.role || student.duty || '组员'}
- 个性成长标签：${tags.length > 0 ? tags.join("、") : "勤勉自律、踏实合群"}
- 性格特质与闪光优势：${student.strengths || student.personality || student.notes || '听讲认真，待人友善'}
- 综合素养量化表现：${student.score || 85} 分

■ 学科学情与历次成绩复盘：
- 阶段检测情况：共参加 ${studentExamScores.length || 1} 次统一学业检测，全科平均分 ${avgScore} 分 (综合等级：${overallLevel}，学情走势：${latestTrend})
- 最新单科考查明细：
${latestScoresText}
- 学科特点洞察：优势学科为【${strongSubjects.length > 0 ? strongSubjects.join("、") : '各科发展均衡'}】，可重点关注突破学科为【${improveSubjects.length > 0 ? improveSubjects.join("、") : '暂无明显偏科'}】

■ 日常出勤与作息常规：
- 考勤出勤率：${attendanceRate} (全勤正常 ${normalAttDays} 次，迟到 ${lateCount} 次，请假 ${leaveCount} 次，缺勤 ${absentCount} 次)
- 今日考勤状态：晨检 ${morningStatus}，午检 ${afternoonStatus}

■ 课堂作业与学习态度：
- 课程作业完成度：累计提交率 ${hwSubmitRate} (已布置 ${totalHwCount} 次，按时保质完成 ${submittedHwCount} 次，欠交未交 ${unsubmittedHwCount} 次)

■ 德智体美劳综合素质表现与小红花：
- 累计获得成长小红花：${flowerCount} 朵
- 近期表扬闪光点：
${praiseEvents.length > 0 ? praiseEvents.slice(0, 4).join("\n") : "  - 平时表现稳定自律，遵守各项班规纪律，受到师生一致好评"}
- 关注改进点与教师叮嘱：
${improveEvents.length > 0 ? improveEvents.slice(0, 3).join("\n") : "  - 暂无不良违纪记录，建议继续精益求精，勇敢突破自我"}

■ 班主任重点关照与寄语期望（如有填写）：
${(customInstruction && customInstruction.trim()) ? customInstruction.trim() : "无额外特殊说明，请结合上述该生全面真实的表现，给予客观、温暖、富有建设性的专业评价。"}`;

    return {
      student,
      promptContext,
      quickStats: {
        avgScore,
        examCount: studentExamScores.length,
        overallLevel,
        latestTrend,
        attendanceRate,
        lateCount,
        leaveCount,
        totalHwCount,
        unsubmittedHwCount,
        hwSubmitRate,
        flowerCount,
        praiseCount: praiseEvents.length,
        improveCount: improveEvents.length,
        strongSubjects,
        improveSubjects,
        tags,
        role: student.role || student.duty || "组员",
        group: student.group || 1
      }
    };
  }
}

// 暴露全局单例
window.store = new DataStore();

// 全局真实时间与学期周期计算器 (动态同步电脑本地真实系统时间与中国自然教学周)
window.getCurrentDateInfo = function(customDate) {
  const now = customDate ? new Date(customDate) : new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const date = now.getDate();
  const days = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];
  const weekDaysFull = ["星期日", "星期一", "星期二", "星期三", "星期四", "星期五", "星期六"];
  const dayIndex = now.getDay();
  const dayStr = days[dayIndex];
  const weekDayFullStr = weekDaysFull[dayIndex];

  // 1. 获取学期开学基准日期 semStart (支持自定义配置开学日)
  let semStart = null;
  if (window.store && window.store.data && window.store.data.classInfo && window.store.data.classInfo.termStartDate) {
    try {
      const customStart = new Date(window.store.data.classInfo.termStartDate);
      if (!isNaN(customStart.getTime())) {
        semStart = customStart;
      }
    } catch (e) { }
  }

  if (!semStart) {
    // 中国中小学校历常规规则：
    // 秋季学期：8月25日之后至次年1月31日，以当年9月1日（次年1月对应上一年度9月1日）为基准
    // 春季学期：2月1日至8月24日，通常以当年2月20日（或农历元宵节前后）为基准
    if (month >= 9 || month === 1 || (month === 8 && date >= 25)) {
      const startYear = (month === 1) ? year - 1 : year;
      semStart = new Date(startYear, 8, 1);
    } else {
      semStart = new Date(year, 1, 20);
    }
  }

  // 2. 严格按中国自然教学周（周一为一周起始日，周日为结束日）动态推算开学教学周次
  const getMonday = function(d) {
    const dt = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const day = dt.getDay(); // 0 是周日, 1 是周一... 6 是周六
    const diff = (day === 0 ? -6 : 1 - day);
    dt.setDate(dt.getDate() + diff);
    dt.setHours(0, 0, 0, 0);
    return dt;
  };

  const semStartMonday = getMonday(semStart);
  const nowMonday = getMonday(now);
  const diffMs = nowMonday.getTime() - semStartMonday.getTime();
  const diffWeeks = Math.round(diffMs / (7 * 24 * 60 * 60 * 1000));
  const weekNum = Math.max(1, diffWeeks + 1);

  // 3. 实时结合中国通用农历
  let lunar = null;
  if (window.getLunarDate && typeof window.getLunarDate === 'function') {
    try {
      lunar = window.getLunarDate(now);
    } catch (e) { }
  }
  const lunarShort = (lunar && lunar.lunarShort) ? lunar.lunarShort : '七月廿六';
  const lunarFull = (lunar && lunar.lunarFull) ? lunar.lunarFull : '农历七月廿六';

  return {
    year,
    month,
    date,
    dayStr,
    weekDayFullStr,
    weekNum,
    lunar: lunar || { lunarShort, lunarFull },
    lunarShort,
    lunarFull,
    displayDate: `${year}年${month}月${date}日`,
    displayFull: `${year}年${month}月${date}日 ${dayStr} (农历${lunarShort}) · 第${weekNum}周`,
    displayWeekFull: `${year}年${month}月${date}日 ${weekDayFullStr} (农历${lunarShort}) · 第${weekNum}周`,
    displayShort: `${year}年${month}月${date}日 ${dayStr}`,
    dateIso: `${year}-${String(month).padStart(2, '0')}-${String(date).padStart(2, '0')}`
  };
};

