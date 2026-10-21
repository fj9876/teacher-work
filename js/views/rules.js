/**
 * 班主任工作台 - 11. 班规定制 (Class Rules)
 * 包含：小学/初中/高中三大标准班规模板一键套用、当前班规清单、
 * 奖惩明细量化细则对照表（加分/扣分一键执行）
 */

window.renderRulesView = function (container) {
  const rules = window.store.data.classRules || {};
  const templates = rules.templates || [];
  const rulesList = rules.rulesList || [];
  const rewardFineRules = rules.rewardFineRules || [];

  window.currentRulesTab = window.currentRulesTab || "templates";

  container.innerHTML = `
    <div class="module-header">
      <div class="module-title-area">
        <h2>📜 班规定制指南</h2>
    <div class="module-header">
      <div class="module-title-area">
        <h2>📜 班规定制指南</h2>
        <p>班级日常公约、奖惩细则与激励方案制定，形成班级自主管理体系</p>
      </div>
      <div class="module-actions">
        <button class="btn btn-secondary" onclick="window.print()">🖨️ 导出班规海报</button>
        <button class="btn btn-secondary" onclick="window.openAddRuleTemplateModal()">📜 + 新建条约套系</button>
        <button class="btn btn-secondary" onclick="window.openRuleCategoryManageModal()">⚙️ 管理公约板块</button>
        <button class="btn btn-primary" onclick="window.openAddRuleModal()">+ 添加自拟条款</button>
      </div>
    </div>

    <!-- 顶部公约套系模板 (支持增删与自由采纳) -->
    <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 16px; margin-bottom: 20px;">
      ${templates.map(t => {
    const isCurrent = rules.selectedTemplate === t.name;
    return `
          <div class="card" style="padding: 18px; border-top: 4px solid ${isCurrent ? '#2563eb' : '#cbd5e1'}; position: relative;">
            ${isCurrent ? '<span class="badge badge-success" style="position: absolute; top: 14px; right: 14px;">当前已采纳</span>' : ''}
            <div style="font-size: 16px; font-weight: 800; color: #1e293b; margin-bottom: 6px; padding-right: 70px;">
              ${t.name}
            </div>
            <p style="font-size: 12.5px; color: var(--text-muted); min-height: 48px; line-height: 1.5; margin-bottom: 14px;">
              ${t.desc}
            </p>
            <div style="display: flex; align-items: center; justify-content: space-between; border-top: 1px solid var(--border-light); padding-top: 10px;">
              <span style="font-size: 12px; color: #475569; font-weight: 600;">共 ${t.ruleCount || (t.clauses ? t.clauses.length : 0)} 条核心规范</span>
              <div style="display: flex; gap: 6px; align-items: center;">
                <button class="btn btn-sm ${isCurrent ? 'btn-success' : 'btn-primary'}" onclick="window.adoptRuleTemplate('${t.name}')">
                  ${isCurrent ? '已在使用' : '采纳此模板'}
                </button>
                ${templates.length > 1 ? `
                  <button class="btn btn-sm btn-danger" style="padding: 2px 7px; font-size: 11px;" onclick="window.deleteRuleTemplateItem('${t.name}')" title="删除该条约套系">🗑️</button>
                ` : ''}
              </div>
            </div>
          </div>
        `;
  }).join("")}
    </div>

    <!-- 当前班规条款清单与奖惩明细双列  -->
    <div style="display: grid; grid-template-columns: 1.15fr 1fr; gap: 16px;">
      <!-- 当前执行公约条款 -->
      <div class="card">
        <div class="panel-header" style="flex-wrap: wrap; gap: 8px;">
          <div class="panel-title">📌 当前班规公约条款 (${rulesList.length}条)</div>
          <div style="display: flex; gap: 6px;">
            <button class="btn btn-sm btn-secondary" onclick="window.openRuleCategoryManageModal()">⚙️ 板块管理</button>
            <button class="btn btn-sm btn-primary" onclick="window.openAddRuleModal()">+ 新增条款</button>
          </div>
        </div>

        <!-- 板块分类快捷过滤条 -->
        <div style="display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 12px; padding: 4px 0;">
          <div class="tab-pill ${(!window.selectedRuleCategory || window.selectedRuleCategory === 'all') ? 'active' : ''}" style="font-size: 11.5px; padding: 3px 10px;" onclick="window.filterRulesByCategory('all', this)">全部板块</div>
          ${(rules.categories || ["早读与晨会", "课堂自律规范", "课间文明活动"]).map(cat => `
            <div class="tab-pill ${window.selectedRuleCategory === cat ? 'active' : ''}" style="font-size: 11.5px; padding: 3px 10px;" onclick="window.filterRulesByCategory('${cat}', this)">${cat}</div>
          `).join("")}
        </div>

        <div style="display: flex; flex-direction: column; gap: 10px;">
          ${rulesList.filter(r => (!window.selectedRuleCategory || window.selectedRuleCategory === 'all' || r.category === window.selectedRuleCategory)).map((r, idx) => `
            <div style="padding: 10px 14px; background: #f8fafc; border-radius: var(--radius-md); border: 1px solid var(--border-color); display: flex; align-items: center; justify-content: space-between; gap: 10px;">
              <div style="display: flex; align-items: center; gap: 10px; flex: 1;">
                <span style="width: 22px; height: 22px; border-radius: 50%; background: #e2e8f0; color: #334155; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 800; flex-shrink: 0;">
                  ${idx + 1}
                </span>
                <div>
                  <span class="badge badge-gray" style="font-size: 11px; margin-right: 6px;">${r.category}</span>
                  <span style="font-size: 13px; color: #1e293b; font-weight: 600;">${r.content}</span>
                </div>
              </div>
              <div style="display: flex; gap: 6px; flex-shrink: 0; align-items: center;">
                <span style="color: #059669; font-size: 11.5px; font-weight: 700;">${r.reward}</span>
                <span style="color: #dc2626; font-size: 11.5px; font-weight: 700;">${r.penalty}</span>
                <button class="btn btn-sm btn-secondary" style="padding: 2px 7px; font-size: 11px;" onclick="window.openEditRuleModal(${idx})" title="编辑此条公约">✏️</button>
                <button class="btn btn-sm btn-danger" style="padding: 2px 7px; font-size: 11px;" onclick="window.deleteRuleItem(${idx})" title="删除此条公约">🗑️</button>
              </div>
            </div>
          `).join("")}
        </div>
      </div>

      <!-- 奖惩细则对照表  -->
      <div class="card">
        <div class="panel-header">
          <div class="panel-title">⚖️ 量化奖惩细则清单 (${rewardFineRules.length}项)</div>
          <button class="btn btn-sm btn-primary" onclick="window.openAddRewardFineModal()">+ 新增细则</button>
        </div>
        <div style="display: flex; flex-direction: column; gap: 8px;">
          ${rewardFineRules.map((rf, rfIdx) => {
    const isReward = rf.type === "reward";
    return `
              <div style="padding: 8px 12px; background: ${isReward ? '#f0fdf4' : '#fff5f5'}; border: 1px solid ${isReward ? '#bbf7d0' : '#fed7d7'}; border-radius: var(--radius-md); display: flex; align-items: center; justify-content: space-between; gap: 8px;">
                <div>
                  <div style="font-size: 13px; font-weight: 700; color: ${isReward ? '#166534' : '#991b1b'};">
                    ${isReward ? '🏆 ' : '⚠️ '}${rf.title}
                  </div>
                  <div style="font-size: 11px; color: var(--text-muted);">适用对象：${rf.target}</div>
                </div>
                <div style="display: flex; align-items: center; gap: 6px;">
                  <span style="font-size: 14px; font-weight: 800; color: ${isReward ? '#16a34a' : '#ef4444'};">
                    ${rf.points}
                  </span>
                  <button class="btn btn-sm ${isReward ? 'btn-success' : 'btn-danger'}" onclick="window.quickApplyRuleScore('${rf.title}', ${isReward ? 2 : -2})">
                    执行
                  </button>
                  <button class="btn btn-sm btn-secondary" style="padding: 2px 6px; font-size: 11px;" onclick="window.openEditRewardFineModal(${rfIdx})" title="编辑细则">✏️</button>
                  <button class="btn btn-sm btn-danger" style="padding: 2px 6px; font-size: 11px;" onclick="window.deleteRewardFineItem(${rfIdx})" title="删除细则">🗑️</button>
                </div>
              </div>
            `;
  }).join("")}
        </div>
      </div>
    </div>
  `;
};

window.adoptRuleTemplate = function (templateName) {
  window.store.data.classRules.selectedTemplate = templateName;
  window.store.save();
  window.showToast(`已成功采纳【${templateName}】作为本班规约基准！`, "success");
  window.renderRulesView(document.getElementById("mainContentArea"));
};

window.deleteRuleItem = function (idx) {
  if (confirm("确定要删除这条班规公约条款吗？")) {
    window.store.deleteClassRule(idx);
    window.showToast("已删除该条款！", "success");
    window.renderRulesView(document.getElementById("mainContentArea"));
  }
};

window.deleteRewardFineItem = function (idx) {
  if (confirm("确定要删除这条量化奖惩细则吗？")) {
    window.store.deleteRewardFine(idx);
    window.showToast("已删除该奖惩细则！", "success");
    window.renderRulesView(document.getElementById("mainContentArea"));
  }
};

window.quickApplyRuleScore = function (ruleTitle, defaultDelta) {
  const students = window.store.data.students || [];
  const defaultName = (students[0] && students[0].name) || "";
  const targetStudent = prompt(`请输入需要执行【${ruleTitle} (${defaultDelta > 0 ? '+' : ''}${defaultDelta}分)】的学生姓名或学号：${defaultName ? `\n例如：${defaultName}` : ''}`, defaultName);
  if (!targetStudent) return;

  const s = students.find(item => item.name === targetStudent || item.id === targetStudent);
  if (s) {
    window.store.adjustStudentScore(s.id, defaultDelta, ruleTitle);
    window.showToast(`已为【${s.name}】记录量化分：${defaultDelta > 0 ? '+' : ''}${defaultDelta}分（原因：${ruleTitle}），当前总积分：${s.score}`, "success");
  } else {
    alert("未找到该学生，请确认姓名输入无误！");
  }
};

window.deleteRuleTemplateItem = function (name) {
  if (confirm(`确定要删除公约套系模板【${name}】吗？`)) {
    window.store.deleteClassRuleTemplate(name);
    window.showToast(`已删除公约套系模板【${name}】！`, "success");
    window.renderRulesView(document.getElementById("mainContentArea"));
  }
};


