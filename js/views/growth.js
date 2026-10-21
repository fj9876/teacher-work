/**
 * 班主任工作台 - 8. 成长评价 (Growth Evaluation)
 * 10大评价维度统计、成长时间线、积分与荣誉徽章、
 * AI 评语生成助手（一键生成周评/月评/学期初稿评语，支持微调复制）
 */

window.renderGrowthView = function(container) {
  const students = window.store.data.students || [];

  // 动态读取综合素质评价指标
  const dimensions = window.store.getGrowthDimensions ? window.store.getGrowthDimensions() : (window.store.data.growthDimensions || []);

  // 动态读取成长事件时间线
  const timelineEvents = (window.store.data.growthEvents && window.store.data.growthEvents.length > 0)
    ? window.store.data.growthEvents.slice(0, 20)
    : [];

  // 统计指标累计评价次数
  const totalCount = (window.store.data.growthEvents && window.store.data.growthEvents.length) || dimensions.reduce((acc, d) => acc + (Number(d.count) || 0), 0);
  const praiseCount = timelineEvents.filter(e => e.tag === "表扬").length;
  const improveCount = timelineEvents.filter(e => e.tag === "待改进").length;

  // 动态统计各学生实际小红花朵数
  const flowerMap = {};
  timelineEvents.forEach(e => {
    if (e.student) {
      let fl = 0;
      if (typeof e.flowerCount === "number" && !isNaN(e.flowerCount)) fl = e.flowerCount;
      else if (e.flower) {
        const m = String(e.flower).match(/\+?(\d+)朵/);
        if (m) fl = parseInt(m[1]);
      }
      flowerMap[e.student] = (flowerMap[e.student] || 0) + fl;
    }
  });

  const rankedStudents = students.map(s => {
    const customFl = flowerMap[s.name] || 0;
    const baseFl = Number(s.flowers) || 0;
    return {
      name: s.name,
      flowers: baseFl + customFl,
      badge: (s.tags && s.tags[0]) || "好学星"
    };
  }).sort((a, b) => b.flowers - a.flowers).slice(0, 5);

  const hasAnyFlowers = rankedStudents.some(s => s.flowers > 0);
  const topFlowerCount = (rankedStudents.length > 0 && hasAnyFlowers) ? rankedStudents[0].flowers : 0;
  const honorMedalsCount = Math.floor(topFlowerCount / 10);

  // 页面结构
  container.innerHTML = `
    <div class="module-header">
      <div class="module-title-area">
        <h2>🌱 成长评价</h2>
        <p>小学 · 记录学生综合素质日常表现与德智体美劳闪光点，坚持正向激励</p>
      </div>
      <div class="module-actions">
        <button class="btn btn-primary" style="background: linear-gradient(135deg, #7c3aed, #4f46e5);" onclick="window.openAIPingyuModal()">
          ✨ AI 评语生成器
        </button>
        <button class="btn btn-secondary" onclick="window.openAddGrowthEventModal()">+ 记录表现</button>
      </div>
    </div>

    <!-- 顶部4统计卡片 -->
    <div class="stat-cards-row">
      <div class="stat-card">
        <div class="stat-info">
          <div class="stat-label">表扬记录</div>
          <div class="stat-value" style="color: #10b981;">${praiseCount}<span class="stat-unit">条</span></div>
        </div>
        <span style="font-size: 24px;">👍</span>
      </div>

      <div class="stat-card">
        <div class="stat-info">
          <div class="stat-label">待改进建议</div>
          <div class="stat-value" style="color: #f59e0b;">${improveCount}<span class="stat-unit">条</span></div>
        </div>
        <span style="font-size: 24px;">💡</span>
      </div>

      <div class="stat-card">
        <div class="stat-info">
          <div class="stat-label">综合评价指标</div>
          <div class="stat-value" style="color: #3b82f6;">${dimensions.length}<span class="stat-unit">项</span></div>
        </div>
        <span style="font-size: 24px;">🌟</span>
      </div>

      <div class="stat-card">
        <div class="stat-info">
          <div class="stat-label">荣誉勋章发放</div>
          <div class="stat-value" style="color: #8b5cf6;">${honorMedalsCount}<span class="stat-unit">枚</span></div>
        </div>
        <span style="font-size: 24px;">🏅</span>
      </div>
    </div>

    <!-- 综合素质评价指标卡片 (更名并支持动态增删改) -->
    <div class="card" style="padding: 18px;">
      <div class="panel-header" style="margin-bottom: 14px; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 8px;">
        <div class="panel-title" style="display: flex; align-items: center; gap: 8px;">
          <span>🏷️ 综合素质评价指标</span>
          <span class="badge" style="background: #e0f2fe; color: #0369a1; font-weight: 700; font-size: 11.5px;">${dimensions.length}项动态维度</span>
        </div>
        <div style="display: flex; align-items: center; gap: 10px;">
          <span class="panel-subtitle">累计评价 ${totalCount} 次</span>
          <button class="btn btn-sm btn-primary" onclick="window.openGrowthDimManageModal()" style="font-size: 12px; padding: 4px 10px; font-weight: 600;">
            ⚙️ 管理指标与增删
          </button>
        </div>
      </div>
      <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(210px, 1fr)); gap: 12px;">
        ${dimensions.map(d => {
          const distinctStudents = window.store.getDistinctStudentsForDim ? window.store.getDistinctStudentsForDim(d.name) : [];
          const distinctCount = distinctStudents.length > 0 ? distinctStudents.length : (d.count || 0);
          return `
          <div style="background: #f8fafc; border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 10px 12px; display: flex; align-items: center; justify-content: space-between; transition: all 0.2s; cursor: pointer;" class="growth-dim-card" onclick="window.openGrowthDimDetailModal('${d.id}')" title="点击查看获得【${d.name}】表扬的学生明细与所获小红花">
            <div style="display: flex; align-items: center; gap: 10px;">
              <span style="font-size: 22px;">${d.icon || '⭐'}</span>
              <div>
                <div style="font-size: 13.5px; font-weight: 700; color: #1e293b;">${d.name}</div>
                <div style="font-size: 11px; color: var(--text-muted);">人获表彰</div>
              </div>
            </div>
            <div style="display: flex; align-items: center; gap: 4px;">
              <span style="font-size: 15px; font-weight: 800; color: #2563eb; margin-right: 4px;" title="${distinctCount}位学生获得此类表彰">${distinctCount}</span>
              <button class="btn btn-sm btn-secondary" title="编辑此指标与查看表彰学生明细" onclick="event.stopPropagation(); window.openGrowthDimDetailModal('${d.id}')" style="font-size: 11px; padding: 2px 6px;">✏️</button>
              <button class="btn btn-sm" title="删除此指标" onclick="event.stopPropagation(); window.deleteSingleGrowthDim('${d.id}')" style="background: #fee2e2; color: #dc2626; border: 1px solid #fca5a5; font-size: 11px; padding: 2px 6px;">🗑️</button>
            </div>
          </div>
        `;}).join("")}
        <div style="background: #fff; border: 1.5px dashed #93c5fd; border-radius: var(--radius-md); padding: 10px 12px; display: flex; align-items: center; justify-content: center; gap: 6px; cursor: pointer; color: #2563eb; font-size: 13px; font-weight: 700; transition: all 0.2s;" onclick="window.openGrowthDimManageModal()" title="添加新的评价维度指标">
          <span style="font-size: 16px;">➕</span> 添加新指标
        </div>
      </div>
    </div>

    <!-- 下部：成长时间线与小红花榜单 -->
    <div style="display: grid; grid-template-columns: 1.3fr 0.9fr; gap: 16px;">
      <!-- 成长时间线 -->
      <div class="card">
        <div class="panel-header">
          <div class="panel-title">📜 近期成长事件时间线</div>
          <span class="badge badge-success">最新记录</span>
        </div>
        <div style="display: flex; flex-direction: column; gap: 12px; max-height: 480px; overflow-y: auto; padding-right: 4px;">
          ${timelineEvents.length === 0 ? `
            <div style="text-align: center; padding: 48px 16px; color: var(--text-muted);">
              <div style="font-size: 36px; margin-bottom: 8px;">🌱</div>
              <div style="font-size: 14px; font-weight: 700; color: #475569; margin-bottom: 4px;">暂无学生成长表现记录</div>
              <div style="font-size: 12px; color: var(--text-muted);">点击右上角【+ 记录表现】为学生发放小红花与德智体美劳表扬</div>
            </div>
          ` : timelineEvents.map(e => `
            <div style="display: flex; gap: 12px; padding: 12px; background: #f8fafc; border-radius: var(--radius-md); border-left: 3px solid ${e.tag === '表扬' ? '#10b981' : '#f59e0b'};">
              <div style="width: 38px; height: 38px; border-radius: 50%; background: #fff; border: 1px solid var(--border-color); display: flex; align-items: center; justify-content: center; font-size: 18px; flex-shrink: 0;">
                ${e.tag === '表扬' ? '🌸' : '💡'}
              </div>
              <div style="flex: 1;">
                <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 4px;">
                  <div style="font-size: 14px; font-weight: 700; color: #1e293b;">
                    ${e.student} · <span style="font-size: 12px; font-weight: normal; color: var(--text-muted);">${e.dim}</span>
                  </div>
                  <div style="display: flex; gap: 6px;">
                    <span class="badge ${e.tag === '表扬' ? 'badge-success' : 'badge-warning'}">${e.tag}</span>
                    <span class="badge badge-purple">${e.flower}</span>
                  </div>
                </div>
                <p style="font-size: 12.5px; color: #475569; margin-bottom: 4px;">${e.content}</p>
                <div style="font-size: 11.5px; color: var(--text-muted); display: flex; justify-content: space-between;">
                  <span>记录教师：${e.teacher || '班主任'} · 发生日期：${e.date}</span>
                  <span style="color: #16a34a; font-weight: 600;">🐾 宠物联动生效</span>
                </div>
              </div>
            </div>
          `).join("")}
        </div>
      </div>

      <!-- 小红花积分排行榜 (动态实时更新) -->
      <div class="card">
        <div class="panel-header">
          <div class="panel-title">🌸 小红花光荣榜</div>
          <span class="badge badge-warning">本月积分 Top 5</span>
        </div>
        <div style="display: flex; flex-direction: column; gap: 8px;">
          ${hasAnyFlowers ? rankedStudents.map((item, idx) => `
            <div style="display: flex; align-items: center; justify-content: space-between; padding: 9px 12px; background: #fffbeb; border: 1px solid #fef3c7; border-radius: var(--radius-md);">
              <div style="display: flex; align-items: center; gap: 10px;">
                <span style="font-size: 16px; font-weight: 800; color: #d97706; width: 16px;">${idx + 1}</span>
                <span style="font-size: 13.5px; font-weight: 700; color: #78350f;">${item.name}</span>
                <span class="badge badge-warning" style="font-size: 11px;">${item.badge}</span>
              </div>
              <div style="font-weight: 800; color: #ea580c; font-size: 14px;">
                🌸 ${item.flowers} <span style="font-size: 11px; font-weight: normal;">朵</span>
              </div>
            </div>
          `).join("") : `
            <div style="text-align: center; padding: 36px 12px; color: var(--text-muted);">
              <div style="font-size: 32px; margin-bottom: 8px;">🌸</div>
              <div style="font-size: 13.5px; font-weight: 700; color: #475569; margin-bottom: 4px;">暂无小红花光荣榜记录</div>
              <div style="font-size: 12px; color: var(--text-muted);">为学生记录日常良好表现并奖励小红花后，榜单将实时在此排榜呈现</div>
            </div>
          `}
        </div>

        <div style="margin-top: 16px; padding: 12px; background: #eff6ff; border-radius: var(--radius-md); border: 1px solid #bfdbfe;">
          <div style="font-size: 13px; font-weight: 700; color: #1e40af; margin-bottom: 4px;">🐾 宠物积分联动说明</div>
          <p style="font-size: 12px; color: #1e3a8a; line-height: 1.5;">
            每一朵奖励的小红花均会按比例折算为班级宠物的成长经验与个人量化积分，激励孩子德智体美劳全方位发展！
          </p>
        </div>
      </div>
    </div>
  `;
};

// AI 评语生成助手弹窗 (支持全班真实学生多维画像动态联动、OpenAI 兼容大模型与自定义提示词)
window.openAIPingyuModal = function(targetStudentName) {
  const modal = document.getElementById("aiPingyuModal");
  if (!modal) return;

  const students = (window.store && window.store.data && window.store.data.students) || [];
  const select = document.getElementById("aiStudentSelect");
  if (select) {
    let html = "";
    students.forEach((s, idx) => {
      const isSelected = targetStudentName ? (s.name === targetStudentName) : (idx === 0);
      const roleText = s.role ? `【${s.role}】` : "";
      const groupText = window.formatGroupName ? window.formatGroupName(s.group) : ('第' + (s.group || 1) + '组');
      const flowerCount = Number(s.flowers) || 0;
      html += `<option value="${s.name}" ${isSelected ? "selected" : ""}>${s.name} (${roleText}${groupText} · 综合${s.score || 85}分 · 🌸${flowerCount}朵)</option>`;
    });
    select.innerHTML = html;
  }

  // 装配系统提示词下拉菜单
  if (window.refreshAIPingyuPromptSelect) {
    window.refreshAIPingyuPromptSelect();
  } else {
    const promptSelect = document.getElementById("aiPingyuPromptSelect");
    if (promptSelect) {
      const prompts = window.store.getAIPrompts ? window.store.getAIPrompts() : [];
      const aiCfg = window.store.getAIConfig ? window.store.getAIConfig() : {};
      const activeId = aiCfg.activePromptId || (prompts[0] && prompts[0].id) || "";
      promptSelect.innerHTML = prompts.map(p => `
        <option value="${p.id}" ${p.id === activeId ? "selected" : ""}>
          ${p.title} (${p.category || '综合'})
        </option>
      `).join("");
    }
  }

  // 刷新大模型就绪状态徽章
  const aiCfg = window.store.getAIConfig ? window.store.getAIConfig() : {};
  const badgeEl = document.getElementById("aiEngineBadge");
  if (badgeEl) {
    if (aiCfg.apiUrl && aiCfg.apiKey) {
      badgeEl.style.background = "#dcfce7";
      badgeEl.style.color = "#15803d";
      badgeEl.innerText = `● 大模型已就绪: ${aiCfg.model || 'glm-4-flash'}`;
      badgeEl.title = `已连接 ${aiCfg.apiUrl}。当前默认使用系统评分系统生成，点击【⚡ 立即生成个性化评语】启用大模型在线深度撰写`;
    } else {
      badgeEl.style.background = "#f1f5f9";
      badgeEl.style.color = "#475569";
      badgeEl.innerText = "○ 系统评分系统 (未配置API)";
      badgeEl.title = "大模型接口未配置，使用系统全维学情与评分系统生成评语";
    }
  }

  // 渲染首个选中的学生的学情画像卡片
  const currentStudentName = (select && select.value) || (students[0] && students[0].name) || "";
  window.renderAIPingyuStudentProfileCard(currentStudentName);

  // 默认使用系统评分系统生成评语初稿，绝不自动调用大模型
  window.generateSystemPingyu({ silent: true });

  modal.classList.add("active");
};

window.closeAIPingyuModal = function() {
  const modal = document.getElementById("aiPingyuModal");
  if (modal) modal.classList.remove("active");
};

// 切换选择学生时实时响应：默认使用系统评分系统生成，不自动调用大模型
window.handleAIPingyuStudentChange = function(studentName) {
  window.renderAIPingyuStudentProfileCard(studentName);
  window.generateSystemPingyu({ silent: true });
};

// 切换评语场景时实时响应：默认使用系统评分系统生成，不自动调用大模型
window.handleAIPingyuSceneChange = function(sceneVal) {
  window.generateSystemPingyu({ silent: true });
};

// 切换提示词模板时实时响应：默认使用系统评分系统生成，不自动调用大模型
window.handleAIPingyuPromptChange = function(promptId) {
  window.generateSystemPingyu({ silent: true });
};

// 渲染学生全维学情画像雷达简报卡片
window.renderAIPingyuStudentProfileCard = function(studentName) {
  const card = document.getElementById("aiStudentProfileCard");
  if (!card) return;

  const profile = window.store.buildStudentComprehensiveProfile ? window.store.buildStudentComprehensiveProfile(studentName) : null;
  if (!profile) {
    card.innerHTML = `<div style="font-size: 12px; color: var(--text-muted);">暂无该学生档案</div>`;
    return;
  }

  const { student, quickStats } = profile;
  const tagsHtml = (quickStats.tags && quickStats.tags.length > 0)
    ? quickStats.tags.map(t => `<span class="badge" style="background: #e0f2fe; color: #0369a1; font-size: 11px; padding: 2px 6px;">${t}</span>`).join(" ")
    : `<span style="color: #94a3b8; font-size: 11.5px;">暂无个性标签</span>`;

  card.innerHTML = `
    <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 1px dashed #cbd5e1; padding-bottom: 8px; margin-bottom: 10px; flex-wrap: wrap; gap: 6px;">
      <div style="display: flex; align-items: center; gap: 8px;">
        <span style="font-size: 16px; font-weight: 800; color: #1e293b;">👤 ${student.name}</span>
        <span class="badge" style="background: #f1f5f9; color: #475569; font-size: 11px;">${window.formatGroupName ? window.formatGroupName(quickStats.group) : ('第' + quickStats.group + '组')} · ${quickStats.role}</span>
        <span class="badge" style="background: #fef3c7; color: #b45309; font-size: 11px; font-weight: 700;">🎖️ 综合素养: ${student.score || 85}分</span>
      </div>
      <div style="display: flex; align-items: center; gap: 4px;">
        ${tagsHtml}
      </div>
    </div>

    <!-- 4 大核心维度雷达指示器 -->
    <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px;">
      <!-- 1. 考试学情 -->
      <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 6px; padding: 6px 10px;">
        <div style="font-size: 11px; color: #64748b; margin-bottom: 2px;">📚 阶段学情 (${quickStats.examCount}次考试)</div>
        <div style="font-size: 13.5px; font-weight: 800; color: #2563eb;">
          ${quickStats.avgScore}<span style="font-size: 11px; font-weight: normal;">分 · ${quickStats.overallLevel}</span>
        </div>
        <div style="font-size: 10.5px; color: #059669; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="优势学科: ${quickStats.strongSubjects.join('、') || '各科均衡'}">
          强: ${quickStats.strongSubjects.join('/') || '均衡'}
        </div>
      </div>

      <!-- 2. 考勤纪律 -->
      <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 6px; padding: 6px 10px;">
        <div style="font-size: 11px; color: #64748b; margin-bottom: 2px;">⏰ 出勤纪律常规</div>
        <div style="font-size: 13.5px; font-weight: 800; color: #059669;">
          ${quickStats.attendanceRate}
        </div>
        <div style="font-size: 10.5px; color: ${quickStats.lateCount > 0 ? '#dc2626' : '#64748b'};">
          迟到 ${quickStats.lateCount} 次 · 请假 ${quickStats.leaveCount} 次
        </div>
      </div>

      <!-- 3. 作业完成 -->
      <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 6px; padding: 6px 10px;">
        <div style="font-size: 11px; color: #64748b; margin-bottom: 2px;">✍️ 课程作业提交</div>
        <div style="font-size: 13.5px; font-weight: 800; color: #7c3aed;">
          ${quickStats.hwSubmitRate}
        </div>
        <div style="font-size: 10.5px; color: ${quickStats.unsubmittedHwCount > 0 ? '#dc2626' : '#64748b'};">
          欠交 ${quickStats.unsubmittedHwCount} 次 / 共${quickStats.totalHwCount}次
        </div>
      </div>

      <!-- 4. 小红花闪光点 -->
      <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 6px; padding: 6px 10px;">
        <div style="font-size: 11px; color: #64748b; margin-bottom: 2px;">🌸 获得小红花</div>
        <div style="font-size: 13.5px; font-weight: 800; color: #ea580c;">
          ${quickStats.flowerCount}<span style="font-size: 11px; font-weight: normal;">朵</span>
        </div>
        <div style="font-size: 10.5px; color: #059669;">
          表扬 ${quickStats.praiseCount} 条 · 建议 ${quickStats.improveCount} 条
        </div>
      </div>
    </div>
  `;
};

// 智能生成评语主算法 (默认使用系统评分系统规则引擎；仅在用户点击【立即生成个性化评语】且配置了大模型时才调用大模型)
window.generateAIPingyu = function(invokeLLM = false) {
  const select = document.getElementById("aiStudentSelect");
  const students = (window.store && window.store.data && window.store.data.students) || [];
  const defaultStu = (students[0] && students[0].name) || "";
  const studentName = (select && select.value) ? select.value : defaultStu;

  const promptSelect = document.getElementById("aiPingyuPromptSelect");
  const promptId = promptSelect ? promptSelect.value : "";
  const prompts = window.store.getAIPrompts ? window.store.getAIPrompts() : [];
  const currentPrompt = prompts.find(p => p.id === promptId) || prompts[0] || {
    title: "官方标准·五育并举期末综合评语",
    content: "你是一位优秀小学班主任，请结合学生全维学情画像撰写立德树人、客观温暖的综合评语。"
  };

  const sceneSelect = document.getElementById("aiPingyuTypeSelect");
  const sceneVal = sceneSelect ? sceneSelect.value : "term";
  const sceneMap = {
    term: "期末学生素质成长手册正式综合评语",
    monthly: "月度常规与学情综合表现评述",
    weekly: "每周习惯与自律常规小结",
    parent: "家校协同温情关怀与期许寄语"
  };
  const sceneTitle = sceneMap[sceneVal] || "期末学生素质成长手册正式综合评语";

  const customFocusInput = document.getElementById("aiTeacherFocusInput");
  const customFocus = customFocusInput ? customFocusInput.value.trim() : "";

  // 1. 构建该学生深度的全维综合成长画像
  const profile = window.store.buildStudentComprehensiveProfile
    ? window.store.buildStudentComprehensiveProfile(studentName, customFocus)
    : null;

  const s = (profile && profile.student) || students.find(item => item.name === studentName) || { name: studentName, score: 85, group: 1 };
  const quick = (profile && profile.quickStats) || {};

  const aiCfg = window.store.getAIConfig ? window.store.getAIConfig() : {};
  const statusArea = document.getElementById("aiGenerateStatusArea");
  const btn = document.getElementById("btnDoGeneratePingyu");
  const textBox = document.getElementById("aiGeneratedText");

  // 判断是否配置了大模型 API
  const hasLLMConfig = Boolean(aiCfg.apiUrl && aiCfg.apiUrl.trim() && aiCfg.apiKey && aiCfg.apiKey.trim());

  // 关键控制：必须由用户主动点击【立即生成个性化评语】（invokeLLM === true）且配置了大模型，才调用大模型！
  if (invokeLLM === true && hasLLMConfig) {
    // 走大模型接口 (POST /api/ai/chat)
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = `<span class="spinner" style="display:inline-block; width:13px; height:13px; border:2px solid #ffffff; border-top-color:transparent; border-radius:50%; animation: spin 0.8s linear infinite; vertical-align: middle; margin-right: 4px;"></span> 大模型生成中...`;
    }
    if (statusArea) {
      statusArea.innerHTML = `
        <span class="spinner" style="display:inline-block; width:13px; height:13px; border:2px solid #7c3aed; border-top-color:transparent; border-radius:50%; animation: spin 0.8s linear infinite;"></span>
        <span style="color: #6d28d9; font-weight: 700;">正在调用大模型【${aiCfg.model || '在线大模型'}】进行个性化深度撰写，请稍候...</span>
      `;
    }

    const systemMessage = `${currentPrompt.content}\n\n【当前撰写评语的业务场景】：${sceneTitle}`;
    const userMessage = `请结合以下该生全维成长画像数据与教师特别要求，为该生撰写评语：\n\n${profile ? profile.promptContext : `姓名：${s.name}`}`;

    fetch("/api/ai/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        apiUrl: aiCfg.apiUrl,
        apiKey: aiCfg.apiKey,
        model: aiCfg.model,
        temperature: aiCfg.temperature || 0.7,
        max_tokens: aiCfg.maxTokens || 1200,
        messages: [
          { role: "system", content: systemMessage },
          { role: "user", content: userMessage }
        ]
      })
    })
    .then(res => res.json())
    .then(res => {
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = `⚡ 立即生成个性化评语`;
      }
      if (res.success && res.content) {
        if (textBox) textBox.value = res.content.trim();
        window.updateAIPingyuWordCount();
        if (statusArea) {
          statusArea.innerHTML = `
            <span style="color: #15803d; font-weight: 700;">✅ 大模型已成功生成个性化评语 (耗时 ${res.latencyMs || 0}ms · 模型: ${res.model || aiCfg.model})</span>
          `;
        }
        window.showToast(`大模型个性化评语已生成！(耗时 ${res.latencyMs || 0}ms)`, "success");
      } else {
        // 大模型返回报错，平滑降级使用系统评分系统生成
        console.warn("大模型调用异常，降级为系统评分系统生成:", res.message);
        generateSystemScorePingyu(res.message, true);
      }
    })
    .catch(err => {
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = `⚡ 立即生成个性化评语`;
      }
      console.warn("网络异常，降级为系统评分系统生成:", err);
      generateSystemScorePingyu(err.message, true);
    });
  } else {
    // 默认或未配置大模型：使用系统评分系统生成，绝不自动调用大模型
    generateSystemScorePingyu(null, invokeLLM);
  }

  // 系统评分系统核心生成引擎 (基于全维学情：考试成绩/综合素养评分/考勤常规/作业提交/小红花/个性标签)
  function generateSystemScorePingyu(errorMsg, isManualClick = false) {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = `⚡ 立即生成个性化评语`;
    }

    const roleStr = s.role ? `作为本班的${s.role}，` : (s.duty ? `作为本班的${s.duty}，` : "");
    const tagsStr = (quick.tags && quick.tags.length > 0) ? `展现出【${quick.tags.join('、')}】等良好素养，` : "";

    // 综合素养与学业成绩评分维度
    const compScore = Number(s.score) || 85;
    const effectiveAvg = (quick.examCount > 0 && quick.avgScore > 0) ? quick.avgScore : compScore;

    let academicStr = "";
    if (effectiveAvg >= 93) {
      academicStr = `学业成绩出类拔萃（综合学业达 ${effectiveAvg} 分），在${quick.strongSubjects && quick.strongSubjects.length > 0 ? quick.strongSubjects.join('、') : '各门学科'}学习中敏锐灵动、善于深究，课堂听讲专心致志，自律自觉。`;
    } else if (effectiveAvg >= 85) {
      academicStr = `学业基础扎实稳步上扬（综合均分 ${effectiveAvg} 分），课堂听讲认真，${quick.strongSubjects && quick.strongSubjects.length > 0 ? '尤其在' + quick.strongSubjects.join('、') + '上展现出良好的思维品质，' : ''}作业保质保量，学习态度严谨端正。`;
    } else if (effectiveAvg >= 75) {
      academicStr = `在日常学习中积极进取（综合学分 ${effectiveAvg} 分），课堂乐于发言思考，${quick.improveSubjects && quick.improveSubjects.length > 0 ? '如能在' + quick.improveSubjects.join('、') + '等科目上加强基础巩固与错题整理，成绩必将迎来更大突破。' : '具备坚实的学习后劲与潜力。'}`;
    } else {
      academicStr = `头脑聪颖、思维开阔，身上蕴藏着很大的成长潜能。若能在课堂专注力与课后复习规划上下足功夫，沉心静气，成绩定能迎来质的飞跃。`;
    }

    // 考勤常规与品德纪律维度
    let disciplineStr = "";
    if (quick.attendanceRate === "100.0%" || quick.attendanceRate === "100%") {
      disciplineStr = `在日常行为规范上，你守纪自律，本学期全勤出勤、严于律己。`;
    } else if (quick.lateCount > 0) {
      disciplineStr = `在班级日常中懂事守规，若能进一步强化时间观念，避免偶发清晨迟到，整体表现将更为干练严谨。`;
    } else {
      disciplineStr = `在集体生活中遵规守矩，尊敬师长，考勤与日常规范执行良好。`;
    }

    // 课业完成与作业规范维度
    let hwStr = "";
    if (quick.unsubmittedHwCount === 0) {
      hwStr = `课堂与阶段作业按时按量上交，书写清秀整洁，始终保持高标准。`;
    } else {
      hwStr = `作业整体完成态度认真，建议今后进一步提升订正效率，养成今日事今日毕的良好习惯。`;
    }

    // 小红花荣誉与集体表现闪光点
    let growthStr = "";
    const flowers = quick.flowerCount !== undefined ? quick.flowerCount : (Number(s.flowers) || 0);
    if (flowers > 0) {
      growthStr = `在班级五育综合评价中累计荣获 ${flowers} 朵成长小红花，表现备受师生认可。`;
    } else {
      growthStr = `在班级集体各项活动中热心参与，待人纯真友善，与同学们互助互爱。`;
    }

    // 教师个性化关注重点
    let focusStr = customFocus ? `特别令人欣喜的是，${customFocus}。` : "";

    let finalComment = "";
    if (sceneVal === "term") {
      finalComment = `${s.name}同学温润端庄、纯真上进。${roleStr}${tagsStr}在德智体美劳各方面展现出朝气蓬勃的少年风貌。${academicStr}${disciplineStr}${hwStr}${growthStr}${focusStr}愿你怀揣对求知的敬畏与对生活的热忱，在新的学期笃行致远，奔赴更绚烂的星辰大海！`;
    } else if (sceneVal === "monthly") {
      finalComment = `回望过去的一个月，${s.name}用踏实的脚印书写着属于自己的成长篇章。${roleStr}${academicStr}${disciplineStr}${growthStr}${focusStr}老师格外赞赏你眼里的求知光芒，愿你如春竹般拔节生长，向阳而生！`;
    } else if (sceneVal === "weekly") {
      finalComment = `${s.name}本周在校状态昂扬饱满，常规守纪规范！${roleStr}${academicStr}${disciplineStr}${focusStr}下周继续全力以赴，做更闪闪发光的自己！`;
    } else {
      finalComment = `亲爱的${s.name}及家长：孩子在本阶段的在校成长令人倍感欣慰。${roleStr}${academicStr}${disciplineStr}${growthStr}${focusStr}感谢家长的密切配合与用心培育，让我们家校同心同德，携手静待花开！`;
    }

    if (textBox) textBox.value = finalComment;
    window.updateAIPingyuWordCount();

    if (statusArea) {
      if (errorMsg) {
        statusArea.innerHTML = `
          <span style="color: #b45309; font-weight: 700;">⚠️ 大模型连接受阻 (${errorMsg})，已回退为系统评分系统生成</span>
        `;
      } else if (hasLLMConfig) {
        statusArea.innerHTML = `
          <span style="color: #4338ca; font-weight: 600;">💡 已由系统评分系统生成评语初稿。如需大模型深度润色，请点击右侧【⚡ 立即生成个性化评语】</span>
        `;
      } else {
        statusArea.innerHTML = `
          <span style="color: #0369a1; font-weight: 600;">💡 已由系统全维学情与评分系统生成 (在班级设置中配置 API Key 后可启用大模型)</span>
        `;
      }
    }

    if (isManualClick) {
      if (errorMsg) {
        window.showToast("大模型请求异常，已使用系统评分系统生成！", "warning");
      } else if (!hasLLMConfig) {
        window.showToast("已基于系统评分系统生成评语 (尚未配置大模型 API)", "info");
      }
    }
  }
};

window.generateSystemPingyu = function(options = {}) {
  return window.generateAIPingyu(false);
};

// 实时更新字数统计徽章
window.updateAIPingyuWordCount = function() {
  const textBox = document.getElementById("aiGeneratedText");
  const badge = document.getElementById("aiWordCountBadge");
  if (!textBox || !badge) return;
  const count = textBox.value ? textBox.value.length : 0;
  badge.innerText = `${count} 字`;
};

// 一键复制评语到剪贴板
window.copyAIPingyu = function() {
  const text = document.getElementById("aiGeneratedText").value;
  if (!text) {
    window.showToast("请先生成评语！", "warning");
    return;
  }
  navigator.clipboard.writeText(text).then(() => {
    window.showToast("已成功复制评语到剪贴板！可直接粘贴至成长手册或微信群中。", "success");
  }).catch(() => {
    // 兼容剪贴板权限
    const ta = document.createElement("textarea");
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand("copy");
    document.body.removeChild(ta);
    window.showToast("已成功复制评语到剪贴板！", "success");
  });
};

// 一键将生成的评语存入该生成长事件表现中
window.savePingyuToGrowthEvent = function() {
  const text = (document.getElementById("aiGeneratedText").value || "").trim();
  if (!text) {
    window.showToast("评语内容为空，请先生成评语后再存入！", "warning");
    return;
  }

  const select = document.getElementById("aiStudentSelect");
  const studentName = (select && select.value) || "";
  const students = (window.store && window.store.data && window.store.data.students) || [];
  const student = students.find(s => s.name === studentName) || students[0];

  if (!student) {
    window.showToast("未找到目标学生", "danger");
    return;
  }

  const today = new Date().toISOString().slice(0, 10);
  const eventObj = {
    id: "growth_" + Date.now(),
    student: student.name,
    studentId: student.id,
    date: today,
    tag: "表扬",
    type: "praise",
    dim: "综合评语",
    dimension: "综合评语",
    category: "综合评价",
    flower: "+2朵",
    flowerCount: 2,
    title: "获得班主任期末/阶段综合评语寄语",
    desc: text,
    source: "AI评语生成助手"
  };

  if (!window.store.data.growthEvents) {
    window.store.data.growthEvents = [];
  }
  window.store.data.growthEvents.unshift(eventObj);

  // 奖励学生小红花
  if (typeof student.flowers !== "number") student.flowers = 0;
  student.flowers += 2;

  // 联动宠物积分
  if (window.store.linkPetScoreChange) {
    window.store.linkPetScoreChange(student.id, 6, "综合评语优秀表现奖励", "成长评价");
  }

  window.store.save();
  window.showToast(`评语已成功存入【${student.name}】的成长事件档案，并奖励 2 朵小红花！`, "success");

  // 若在成长评价视图，则刷新时间线
  const viewContainer = document.getElementById("viewContainer");
  if (window.currentView === "growth" && viewContainer && window.renderGrowthView) {
    window.renderGrowthView(viewContainer);
  }
};

