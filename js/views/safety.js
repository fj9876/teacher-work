/**
 * 班主任工作台 - 10. 安全与健康 (Safety & Health)
 * 包含：每日健康晨检/午检、突发安全事件台账、
 * 1530 安全教育台账（1分钟放学提醒、5分钟节前教育、30分钟长假专题、Excel导出）
 */

window.renderSafetyView = function (container) {
  const data = window.store.data;
  const safety1530 = data.safety1530 || [];
  const studentCount = (data.students || []).length;
  const rawHealth = data.healthDaily || {};
  const abnormalDetails = rawHealth.abnormalDetails || [];
  const abnormalCount = abnormalDetails.length;
  // 严格按当前班级实际人数动态核准检测人数，彻底杜绝模板残留写死45
  const testedCount = (rawHealth.testedCount && rawHealth.testedCount === studentCount) ? rawHealth.testedCount : studentCount;
  const normalCount = Math.max(0, testedCount - abnormalCount);
  const health = {
    date: rawHealth.date || new Date().toISOString().slice(0, 10),
    normalCount: normalCount,
    testedCount: testedCount,
    abnormalCount: abnormalCount,
    abnormalDetails: abnormalDetails
  };
  const safetyTypes = window.store.getSafetyTypes ? window.store.getSafetyTypes() : [
    { id: "st_1", name: "每天放学前 1分钟提醒", shortName: "1分钟提醒", badgeClass: "badge-info" },
    { id: "st_2", name: "周末节假日前 5分钟教育", shortName: "5分钟教育", badgeClass: "badge-warning" },
    { id: "st_3", name: "长假前 30分钟专题安全班会", shortName: "30分钟专题", badgeClass: "badge-purple" }
  ];

  // 动态类型统计
  const typeCounts = {};
  safetyTypes.forEach(t => {
    typeCounts[t.name] = safety1530.filter(s => s.type === t.name || (t.shortName && s.type.includes(t.shortName))).length;
  });

  window.currentSafetyTab = window.currentSafetyTab || "1530";

  container.innerHTML = `
    <div class="module-header">
      <div class="module-title-area">
        <h2>🛡️ 安全与健康</h2>
        <p>小学 · 记录学生健康状态、1530安全教育留痕与突发事件应急处置台账（支持教育类型自拟与凭证附件查阅）</p>
      </div>
      <div class="module-actions">
        <button class="btn btn-secondary" onclick="window.openSafetyTypeManageModal()">🏷️ 管理教育类型</button>
        <button class="btn btn-secondary" onclick="window.store.exportSafety1530Excel()">📤 导出安全台账 (Excel)</button>
        <button class="btn btn-primary" onclick="window.openAddSafety1530Modal()">+ 登记1530教育</button>
      </div>
    </div>

    <!-- 顶部核心指标 -->
    <div class="stat-cards-row">
      <div class="stat-card">
        <div class="stat-info">
          <div class="stat-label">今日健康正常</div>
          <div class="stat-value" style="color: #10b981;">${health.normalCount}<span class="stat-unit">人</span></div>
        </div>
        <span style="font-size: 24px;">🩺</span>
      </div>

      <div class="stat-card">
        <div class="stat-info">
          <div class="stat-label">今日体温检测</div>
          <div class="stat-value" style="color: #2563eb;">${health.testedCount}<span class="stat-unit">人</span></div>
        </div>
        <span style="font-size: 24px;">🌡️</span>
      </div>

      <div class="stat-card">
        <div class="stat-info">
          <div class="stat-label">异常情况跟进</div>
          <div class="stat-value" style="color: #f59e0b;">${health.abnormalCount}<span class="stat-unit">人</span></div>
        </div>
        <span style="font-size: 24px;">⚠️</span>
      </div>

      <div class="stat-card">
        <div class="stat-info">
          <div class="stat-label">1530安全教育覆盖</div>
          <div class="stat-value" style="color: #059669;">${safety1530.length > 0 ? '100' : '0.0'}<span class="stat-unit">%</span></div>
        </div>
        <span style="font-size: 24px;">🛡️</span>
      </div>
    </div>

    <!-- 1530 专项数据指标条 (自适应展示自定义教育类型) -->
    <div class="card" style="padding: 16px 22px; background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%); border-color: #86efac;">
      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; flex-wrap: wrap; gap: 8px;">
        <div style="display: flex; align-items: center; gap: 10px;">
          <span style="font-size: 16px; font-weight: 800; color: #166534;">📌 1530 安全教育专项看板</span>
          <span style="font-size: 12px; color: #15803d;">（支持教育类型自由配置 · 实时归档留痕）</span>
        </div>
        <div style="display: flex; gap: 8px; align-items: center;">
          <span class="badge badge-success">本学期已落实 ${safety1530.length} 次</span>
          <button class="btn btn-sm btn-outline-primary" style="font-size: 11px; padding: 2px 8px; background: #fff;" onclick="window.openSafetyTypeManageModal()">⚙️ 自定义类型</button>
        </div>
      </div>

      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px;">
        <div style="background: white; border-radius: var(--radius-md); padding: 12px; border: 1px solid #bbf7d0; text-align: center;">
          <div style="font-size: 11px; color: #166534;">累计安全教育总数</div>
          <div style="font-size: 22px; font-weight: 800; color: #15803d;">${safety1530.length} <span style="font-size: 11px; font-weight: normal;">次</span></div>
        </div>
        ${safetyTypes.map(t => {
    const c = typeCounts[t.name] || 0;
    return `
            <div style="background: white; border-radius: var(--radius-md); padding: 12px; border: 1px solid #bbf7d0; text-align: center;">
              <div style="font-size: 11px; color: #166534; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${t.name}">${t.shortName || t.name}</div>
              <div style="font-size: 22px; font-weight: 800; color: #0284c7;">${c} <span style="font-size: 11px; font-weight: normal;">次</span></div>
            </div>
          `;
  }).join("")}
      </div>
    </div>

    <!-- 1530 安全教育明细表格 -->
    <div class="card">
      <div class="panel-header" style="flex-wrap: wrap; gap: 8px;">
        <div class="panel-title" style="display: flex; align-items: center; gap: 8px;">
          <span>📋 1530 安全教育工作记录台账</span>
          <span class="badge" style="background: #e0f2fe; color: #0369a1; font-size: 11.5px;">${safety1530.length} 条记录已归档</span>
        </div>
        <div style="display: flex; gap: 8px;">
          <button class="btn btn-sm btn-primary" onclick="window.openAddSafety1530Modal()">+ 新增留痕</button>
          <button class="btn btn-sm btn-secondary" onclick="window.store.exportSafety1530Excel()">📤 导出 Excel</button>
        </div>
      </div>

      <div class="table-responsive">
        <table class="data-table">
          <thead>
            <tr>
              <th>序号</th>
              <th>开展日期</th>
              <th>教育类型</th>
              <th>教育主题</th>
              <th>教育核心内容要点</th>
              <th>教育形式</th>
              <th>受教人数</th>
              <th>宣讲人</th>
              <th>留痕佐证材料 (凭证)</th>
              <th style="text-align: right;">操作</th>
            </tr>
          </thead>
          <tbody>
            ${safety1530.length === 0 ? `
              <tr>
                <td colspan="10" style="text-align: center; padding: 32px; color: #94a3b8;">
                  暂无安全教育留痕记录，请点击右上角【+ 新增留痕】添加！
                </td>
              </tr>
            ` : safety1530.map((s, idx) => {
    const matchedType = safetyTypes.find(t => t.name === s.type || (t.shortName && s.type.includes(t.shortName)));
    const badgeClass = matchedType ? matchedType.badgeClass : (s.type.includes("1分钟") ? "badge-info" : s.type.includes("5分钟") ? "badge-warning" : "badge-purple");

    // 解析附件佐证
    const atts = s.attachments || [];
    let firstIcon = "📎";
    if (atts.length > 0) {
      const ft = atts[0].fileType;
      if (ft === "ppt") firstIcon = "📊";
      else if (ft === "video") firstIcon = "🎥";
      else if (ft === "word") firstIcon = "📝";
      else if (ft === "image") firstIcon = "🖼️";
      else if (ft === "pdf") firstIcon = "📑";
    } else if (s.materials) {
      if (s.materials.includes("PPT")) firstIcon = "📊";
      else if (s.materials.includes("视频")) firstIcon = "🎥";
      else if (s.materials.includes("海报") || s.materials.includes("图")) firstIcon = "🖼️";
      else if (s.materials.includes("手册") || s.materials.includes("文档")) firstIcon = "📝";
    }

    const matLabel = (atts.length > 0) ? `${atts[0].name}${atts.length > 1 ? ` 等${atts.length}件` : ''}` : (s.materials || "查看凭证");

    return `
                <tr>
                  <td style="font-weight: 600;">${idx + 1}</td>
                  <td style="white-space: nowrap;">${s.date}</td>
                  <td>
                    <span class="badge ${badgeClass}" style="white-space: nowrap;">
                      ${s.type}
                    </span>
                  </td>
                  <td style="font-weight: 700; color: #1e293b; min-width: 140px;">${s.topic}</td>
                  <td style="font-size: 12.5px; color: #475569; max-width: 280px; line-height: 1.4;">${s.content}</td>
                  <td><span class="badge badge-gray" style="white-space: nowrap;">${s.method || '口头提醒'}</span></td>
                  <td>${s.participants || `${studentCount}人`}</td>
                  <td><strong>${s.teacher || '班主任'}</strong></td>
                  <td>
                    <button class="btn btn-sm btn-outline-primary" style="padding: 3px 8px; font-size: 11.5px; border-radius: 4px; display: inline-flex; align-items: center; gap: 4px; white-space: nowrap;" onclick="window.openViewSafetyMaterialModal(${idx})" title="点击查看与下载该留痕附件（支持图片/视频/PPT/Word等多媒体查看）">
                      <span>${firstIcon}</span>
                      <span>${matLabel}</span>
                    </button>
                  </td>
                  <td style="text-align: right;">
                    <div style="display: inline-flex; gap: 6px;">
                      <button class="btn btn-sm btn-secondary" onclick="window.openEditSafetyModal(${idx})" title="编辑此条台账">✏️ 编辑</button>
                      <button class="btn btn-sm btn-danger" onclick="window.deleteSafetyItem(${idx})" title="删除此条台账">🗑️ 删除</button>
                    </div>
                  </td>
                </tr>
              `;
  }).join("")}
          </tbody>
        </table>
      </div>
  `;
};

window.deleteSafetyItem = function (idx) {
  if (confirm("确定要删除这条 1530 安全教育台账留痕记录吗？")) {
    window.store.deleteSafety1530(idx);
    window.showToast("已成功删除安全教育记录！", "success");
    window.renderSafetyView(document.getElementById("mainContentArea"));
  }
};

