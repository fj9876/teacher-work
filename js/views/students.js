/**
 * 班主任工作台 - 3. 学生档案管理 (Students)
 * 45名学生档案卡片与表格视图切换、Excel批量导入导出、
 * 点击卡片右侧滑出抽屉（多Tab查看基本/在校/健康/谈话家访轨迹）
 */

window.renderStudentsView = function (container) {
  const students = window.store.data.students || [];

  const groups = (window.store.data.groups && window.store.data.groups.length > 0)
    ? window.store.data.groups
    : ["第1组", "第2组", "第3组", "第4组", "第5组", "第6组"];
  const tagsPool = window.store.getTagsPool ? window.store.getTagsPool() : (window.store.data.tagsPool || []);

  container.innerHTML = `
    <div class="module-header">
      <div class="module-title-area">
        <h2>👨‍🎓 学生档案</h2>
        <p>小学 · 全班共 ${students.length} 名学生的电子成长档案，支持信息查阅、家访谈心与成长跟踪</p>
      </div>
      <div class="module-actions">
        <button class="btn btn-secondary" onclick="window.openGroupTagManageModal()">🏷️ 管理分组与标签</button>
        <button class="btn btn-primary" style="background: linear-gradient(135deg, #0284c7 0%, #0369a1 100%); color: white; border: none; font-weight: 700; box-shadow: 0 2px 8px rgba(2, 132, 199, 0.35);" onclick="window.openSupplementaryImportModal()">📥 导入补充资料</button>
        <button class="btn btn-secondary" onclick="window.triggerExcelImport()" title="用于首次批量新建完整学生档案">📄 初始建档 (Excel)</button>
        <button class="btn btn-secondary" onclick="window.store.exportStudentsExcel()">📤 导出花名册</button>
        <button class="btn btn-secondary" onclick="window.openAddStudentModal()">+ 添加学生</button>
      </div>
    </div>

    <!-- 筛选工具条  -->
    <div class="card" style="padding: 12px 18px; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px;">
      <div style="display: flex; align-items: center; gap: 12px; flex-wrap: wrap;">
        <div class="search-box" style="width: 240px;">
          <input type="text" placeholder="搜索学生姓名、学号..." id="studentSearchInput" oninput="window.filterStudents()">
          <span class="search-icon">🔍</span>
        </div>

        <select class="form-control" style="width: 130px; height: 34px;" id="studentGroupFilter" onchange="window.filterStudents()">
          <option value="">全部小组</option>
          ${groups.map(g => `<option value="${g}">${g}</option>`).join("")}
        </select>

        <select class="form-control" style="width: 140px; height: 34px;" id="studentTagFilter" onchange="window.filterStudents()">
          <option value="">全部标签</option>
          ${tagsPool.map(t => `<option value="${t}">${t}</option>`).join("")}
        </select>
      </div>

      <div style="display: flex; align-items: center; gap: 8px;">
        <button class="btn btn-sm btn-secondary" onclick="window.openCardDisplayConfigModal()" title="设置学生卡片信息显影与文字字号，支持全班批量生效">⚙️ 卡片显示与字号</button>
        <span style="font-size: 13px; color: var(--text-muted);">显示方式：</span>
        <button class="btn btn-sm btn-primary" id="viewModeCardBtn" onclick="window.setStudentViewMode('card')">🗂️ 卡片视图</button>
        <button class="btn btn-sm btn-secondary" id="viewModeTableBtn" onclick="window.setStudentViewMode('table')">📋 列表表格</button>
      </div>
    </div>

    <!-- 学生卡片网格或表格容器 -->
    <div id="studentsContentWrapper">
      <!-- 由 renderStudentList 渲染 -->
    </div>
  `;

  window.studentViewMode = window.studentViewMode || "card";
  window.renderStudentList(students);
};

window.renderStudentList = function (studentsToRender) {
  const container = document.getElementById("studentsContentWrapper");
  if (!container) return;

  if (studentsToRender.length === 0) {
    container.innerHTML = `
      <div class="card" style="text-align: center; padding: 40px; color: var(--text-muted);">
        未找到匹配的学生档案 🔍
      </div>
    `;
    return;
  }

  if (window.studentViewMode === "card") {
    // 学生卡片网格模式：支持详细信息显隐配置与字号调节，同一学生可重复获得标签(如*2)
    const cardCfg = window.store.getCardDisplayConfig ? window.store.getCardDisplayConfig() : null;
    container.innerHTML = `
      <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 14px;">
        ${studentsToRender.map(s => window.renderSingleStudentCardHtml(s, cardCfg, false)).join("")}
      </div>
    `;
  } else {
    // 列表表格模式：全量多维度呈现
    container.innerHTML = `
      <div class="table-responsive">
        <table class="data-table">
          <thead>
            <tr>
              <th>学号</th>
              <th>姓名</th>
              <th>性别</th>
              <th>民族</th>
              <th>身份证号码</th>
              <th style="min-width: 140px;">户口所在地 (户籍)</th>
              <th style="min-width: 140px;">现居住常住地址</th>
              <th>监护人</th>
              <th>联系电话</th>
              <th>关爱标签</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            ${studentsToRender.map(s => `
              <tr>
                <td style="font-weight: 600;">${s.id}</td>
                <td>
                  <div style="display: flex; align-items: center; gap: 8px; font-weight: 700;">
                    ${window.getStudentAvatarMarkup ? window.getStudentAvatarMarkup(s, 32) : `<span>${s.gender === '男' ? '👦' : '👧'}</span>`}
                    <div>
                      <div>${s.name}</div>
                      <div style="font-size: 11px; color: var(--text-muted); font-weight: normal;">${window.formatGroupName ? window.formatGroupName(s.group) : ('第' + s.group + '组')}</div>
                    </div>
                  </div>
                </td>
                <td>${s.gender}</td>
                <td><span class="badge" style="background: #f1f5f9; color: #475569; font-size: 11px;">${s.nation || s.ethnicity || '汉族'}</span></td>
                <td style="font-family: monospace; font-size: 11.5px; color: #475569;">${s.idCard || '--'}</td>
                <td style="font-size: 12px; color: #065f46; font-weight: 600;">
                  🏡 ${s.hukou || s.registeredResidence || '未登记'}
                </td>
                <td style="font-size: 12px; color: #1e293b;">
                  📍 ${s.address || '本市'}
                </td>
                <td>${s.guardian || '家长'}</td>
                <td style="font-family: monospace; font-size: 11.5px;">${s.phone}</td>
                <td>
                  <div style="display: flex; flex-wrap: wrap; gap: 3px;">
                    ${s.isLeftBehind ? `<span class="badge" style="background: #fef3c7; color: #b45309; font-size: 10px;">留守</span>` : ''}
                    ${s.hardshipCategory ? `<span class="badge" style="background: #fee2e2; color: #991b1b; font-size: 10px;">困难</span>` : ''}
                    ${s.role && s.role !== '学生' ? `<span class="badge badge-purple" style="font-size: 10px;">${s.role}</span>` : ''}
                  </div>
                </td>
                <td>
                  <div style="display: flex; gap: 6px;">
                    <button class="btn btn-sm btn-primary" onclick="window.openEditStudentModal('${s.id}')">✏️ 编辑</button>
                    <button class="btn btn-sm btn-secondary" onclick="window.openStudentDrawer('${s.id}')">详情</button>
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

window.setStudentViewMode = function (mode) {
  window.studentViewMode = mode;
  document.getElementById("viewModeCardBtn").className = mode === "card" ? "btn btn-sm btn-primary" : "btn btn-sm btn-secondary";
  document.getElementById("viewModeTableBtn").className = mode === "table" ? "btn btn-sm btn-primary" : "btn btn-sm btn-secondary";
  window.filterStudents();
};

window.filterStudents = function () {
  const students = window.store.data.students || [];
  const kw = document.getElementById("studentSearchInput") ? document.getElementById("studentSearchInput").value.trim().toLowerCase() : "";
  const group = document.getElementById("studentGroupFilter") ? document.getElementById("studentGroupFilter").value : "";
  const tag = document.getElementById("studentTagFilter") ? document.getElementById("studentTagFilter").value : "";

  const filtered = students.filter(s => {
    let matchKw = true;
    if (kw) {
      const nameMatch = s.name && s.name.toLowerCase().includes(kw);
      const idMatch = s.id && String(s.id).includes(kw);
      const idCardMatch = s.idCard && s.idCard.toLowerCase().includes(kw);
      const hukouMatch = (s.hukou && s.hukou.toLowerCase().includes(kw)) || (s.registeredResidence && s.registeredResidence.toLowerCase().includes(kw));
      const addrMatch = s.address && s.address.toLowerCase().includes(kw);
      const phoneMatch = s.phone && String(s.phone).includes(kw);
      const guardianMatch = s.guardian && s.guardian.toLowerCase().includes(kw);
      const nationMatch = s.nation && s.nation.toLowerCase().includes(kw);
      matchKw = nameMatch || idMatch || idCardMatch || hukouMatch || addrMatch || phoneMatch || guardianMatch || nationMatch;
    }
    let matchGroup = true;
    if (group) {
      matchGroup = window.isStudentInGroup ? window.isStudentInGroup(s.group, group) : (String(s.group) === group || `第${s.group}组` === group);
    }
    let matchTag = true;
    if (tag) {
      matchTag = window.isStudentHasTag ? window.isStudentHasTag(s, tag) : ((Array.isArray(s.tags) && s.tags.includes(tag)) || (s.tag === tag));
    }
    return matchKw && matchGroup && matchTag;
  });

  window.renderStudentList(filtered);
};

// ================= 单个学生卡片 HTML 渲染器 (严格联动 cardDisplayConfig 显影与字号) =================
window.renderSingleStudentCardHtml = function(s, cardCfg, isPreview) {
  if (!s) return "";
  const cfg = cardCfg || (window.store.getCardDisplayConfig ? window.store.getCardDisplayConfig() : null) || {
    visibleFields: { name: true, avatar: true, nation: true, role: true, idAndGroup: true, idCard: true, hukou: true, address: true, guardian: true, careTags: true, growthTags: true },
    fontSizes: { name: 16, idAndGroup: 12, idCard: 11, hukou: 12, address: 12, guardian: 12, careTags: 10.5, growthTags: 10.5 }
  };
  const vis = cfg.visibleFields || {};
  const fsz = cfg.fontSizes || {};

  const isBoy = s.gender === "男";
  const idCardDisplay = s.idCard ? (s.idCard.length >= 18 ? (s.idCard.slice(0, 6) + '********' + s.idCard.slice(14)) : s.idCard) : '未录入';
  const hukouDisplay = s.hukou || s.registeredResidence || '未登记户籍';
  const nationDisplay = s.nation || s.ethnicity || '汉族';
  const groupDisplay = window.formatGroupName ? window.formatGroupName(s.group) : ('第' + s.group + '组');

  // 成长标签解析 (含重复获得次数，如 文明之星*2)
  const tagsWithCount = window.getStudentTagsWithCount ? window.getStudentTagsWithCount(s) : [];
  const displayTags = tagsWithCount.filter(item => item.tag !== '新导入');

  // 学号与所在小组分别设置显隐及字号大小
  const showStudentId = (vis.studentId !== undefined) ? (vis.studentId !== false) : (vis.idAndGroup !== false);
  const showGroup = (vis.group !== undefined) ? (vis.group !== false) : (vis.idAndGroup !== false);
  const fszStudentId = fsz.studentId || fsz.idAndGroup || 12;
  const fszGroup = fsz.group || fsz.idAndGroup || 12;

  let subtitleHtml = '';
  if (showStudentId && showGroup) {
    subtitleHtml = `
      <div style="display: flex; align-items: center; gap: 5px; color: var(--text-muted); margin-top: 2px; flex-wrap: wrap;">
        <span style="font-size: ${fszStudentId}px;">学号 ${s.id}</span>
        <span style="font-size: 11px; opacity: 0.6;">·</span>
        <span style="font-size: ${fszGroup}px;">${groupDisplay}</span>
      </div>
    `;
  } else if (showStudentId) {
    subtitleHtml = `
      <div style="color: var(--text-muted); margin-top: 2px;">
        <span style="font-size: ${fszStudentId}px;">学号 ${s.id}</span>
      </div>
    `;
  } else if (showGroup) {
    subtitleHtml = `
      <div style="color: var(--text-muted); margin-top: 2px;">
        <span style="font-size: ${fszGroup}px;">${groupDisplay}</span>
      </div>
    `;
  }

  // 是否有中间详细信息栏项目需要显示
  const hasDetailRow = (vis.idCard !== false) || (vis.hukou !== false) || (vis.address !== false) || (vis.guardian !== false);
  // 是否有底部标签行需要显示
  const hasCareTags = (vis.careTags !== false) && (s.isLeftBehind || s.hardshipCategory);
  const hasGrowthTags = (vis.growthTags !== false) && (displayTags.length > 0);
  const hasTagsRow = hasCareTags || hasGrowthTags;

  const onClickAttr = isPreview ? "" : `onclick="window.openStudentDrawer('${s.id}')"`;
  const cursorStyle = isPreview ? "cursor: default;" : "cursor: pointer;";

  return `
    <div class="card" style="padding: 16px; ${cursorStyle} transition: var(--transition); position: relative; border-radius: var(--radius-lg); border-top: 3px solid ${isBoy ? '#3b82f6' : '#ec4899'}; background: #fff; box-shadow: 0 2px 8px rgba(0,0,0,0.05);" 
      ${onClickAttr}>
      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: ${hasDetailRow || hasTagsRow ? '12px' : '0'};">
        <div style="display: flex; align-items: center; gap: 12px; overflow: hidden;">
          ${vis.avatar !== false ? (
            window.getStudentAvatarMarkup ? window.getStudentAvatarMarkup(s, 56) : `
              <div style="width: 56px; height: 56px; border-radius: 50%; background: ${isBoy ? '#e0f2fe' : '#fce7f3'}; color: ${isBoy ? '#0369a1' : '#be185d'}; display: flex; align-items: center; justify-content: center; font-size: 26px; flex-shrink: 0;">
                ${isBoy ? '👦' : '👧'}
              </div>
            `
          ) : ''}
          <div style="overflow: hidden;">
            <div style="font-size: ${fsz.name || 16}px; font-weight: 700; color: var(--text-main); display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
              <span>${s.name}</span>
              ${vis.nation !== false ? `<span class="badge" style="font-size: 10px; padding: 1px 5px; background: #f1f5f9; color: #475569;">${nationDisplay}</span>` : ''}
              ${(vis.role !== false && s.role && s.role !== '学生') ? `<span class="badge badge-purple" style="font-size: 10.5px; padding: 1px 5px;">${s.role}</span>` : ''}
            </div>
            ${subtitleHtml}
          </div>
        </div>
        ${!isPreview ? `
          <button class="btn btn-sm btn-primary" style="padding: 4px 10px; font-size: 12px; font-weight: 600; border-radius: 6px; box-shadow: 0 2px 4px rgba(37,99,235,0.2); flex-shrink: 0;" 
            onclick="event.stopPropagation(); window.openEditStudentModal('${s.id}')" title="单独修改该学生档案信息">
            ✏️ 编辑
          </button>
        ` : `
          <button class="btn btn-sm btn-primary" style="padding: 4px 10px; font-size: 12px; font-weight: 600; border-radius: 6px; pointer-events: none; opacity: 0.9; flex-shrink: 0;">
            ✏️ 编辑
          </button>
        `}
      </div>

      ${hasDetailRow ? `
        <div style="display: flex; flex-direction: column; gap: 5px; border-top: 1px dashed var(--border-light); padding-top: 8px;">
          ${vis.idCard !== false ? `
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <span style="font-size: ${fsz.idCard || 11}px; color: var(--text-muted);">身份证号:</span>
              <strong style="font-family: monospace; font-size: ${fsz.idCard || 11}px; color: var(--text-main);">${idCardDisplay}</strong>
            </div>
          ` : ''}
          ${vis.hukou !== false ? `
            <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 8px;">
              <span style="flex-shrink: 0; color: #059669; font-weight: 600; font-size: ${fsz.hukou || 12}px;">🏡 户籍地:</span>
              <span style="color: #065f46; font-weight: 600; font-size: ${fsz.hukou || 12}px; text-align: right; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${hukouDisplay}">
                ${hukouDisplay}
              </span>
            </div>
          ` : ''}
          ${vis.address !== false ? `
            <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 8px;">
              <span style="flex-shrink: 0; font-size: ${fsz.address || 12}px; color: var(--text-muted);">📍 现住址:</span>
              <span style="color: var(--text-main); font-size: ${fsz.address || 12}px; text-align: right; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${s.address || '本市'}">
                ${s.address || '本市'}
              </span>
            </div>
          ` : ''}
          ${vis.guardian !== false ? `
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <span style="font-size: ${fsz.guardian || 12}px; color: var(--text-muted);">监护人:</span>
              <span style="color: var(--text-main); font-size: ${fsz.guardian || 12}px;">${s.guardian || '家长'} (${s.phone || '无'})</span>
            </div>
          ` : ''}
        </div>
      ` : ''}

      ${hasTagsRow ? `
        <div style="display: flex; flex-wrap: wrap; gap: 4px; margin-top: 10px; border-top: ${!hasDetailRow ? '1px dashed var(--border-light); padding-top: 8px;' : 'none;'}">
          ${(vis.careTags !== false && s.isLeftBehind) ? `<span class="badge badge-warning" style="font-size: ${fsz.careTags || 10.5}px; background: #fef3c7; color: #b45309;">🌟 留守儿童</span>` : ''}
          ${(vis.careTags !== false && s.hardshipCategory) ? `<span class="badge badge-danger" style="font-size: ${fsz.careTags || 10.5}px; background: #fee2e2; color: #991b1b;">❤️ 困难帮扶</span>` : ''}
          ${vis.growthTags !== false ? displayTags.map(item => {
            const isStackable = window.store.isTagStackable ? window.store.isTagStackable(item.tag) : true;
            const goldThresh = window.store.getTagGoldThreshold ? window.store.getTagGoldThreshold(item.tag) : 3;
            const isRedeemed = window.store.isTagRedeemed ? window.store.isTagRedeemed(s, item.tag) : false;
            const isGold = isStackable && !isRedeemed && (item.count >= goldThresh);
            const encTag = encodeURIComponent(item.tag);
            const disp = window.formatTagDisplay ? window.formatTagDisplay(item.tag, item.count) : item.tag;

            let badgeStyle = '';
            let icon = '🏷️';
            let labelText = disp;

            if (isRedeemed) {
              // 状态：已兑换 (文字变灰)
              badgeStyle = 'background: #f1f5f9; color: #64748b; border: 1px solid #cbd5e1;';
              icon = '🎁';
              labelText = `${disp} (已兑换)`;
            } else if (isGold) {
              // 状态：达到设定阈值 (高光金黄色)
              badgeStyle = 'background: #fef3c7; color: #b45309; border: 1.5px solid #f59e0b; box-shadow: 0 1px 4px rgba(245, 158, 11, 0.25); font-weight: 700;';
              icon = '⭐';
              labelText = disp;
            } else if (isStackable) {
              // 状态：未达阈值可增减 (普通蓝色)
              badgeStyle = 'background: #eff6ff; color: #1d4ed8; border: 1px solid #bfdbfe; font-weight: 600;';
              icon = '🏷️';
              labelText = disp;
            } else {
              // 单次固定身份标签 (如班干部)
              const isDanger = item.tag.includes('关注');
              const isWarn = item.tag.includes('生日');
              const badgeClass = isDanger ? 'badge-danger' : isWarn ? 'badge-warning' : 'badge-purple';
              badgeStyle = '';
              icon = '🏷️';
              labelText = disp;
            }

            const clickHandler = isPreview ? "" : `onclick="event.stopPropagation(); window.openTagQuickStepper(event, '${s.id}', decodeURIComponent('${encTag}'))"`;
            const contextHandler = isPreview ? "" : `oncontextmenu="event.preventDefault(); event.stopPropagation(); window.handleTagContextMenu('${s.id}', decodeURIComponent('${encTag}'))"`;
            const titleText = isRedeemed
              ? `已兑换 | 左键单击修改数量，右键单击撤销兑换`
              : (isGold
                ? `⭐ 满${goldThresh}个已变高光金黄色 | 左键单击增减数量，右键单击兑换`
                : (isStackable
                  ? `普通蓝色 (满${goldThresh}个变金黄) | 左键单击增减数量，右键单击兑换`
                  : `身份标签 | 右键单击兑换`));

            return `
              <span class="badge" style="font-size: ${fsz.growthTags || 10.5}px; padding: 2.5px 8px; border-radius: 12px; cursor: pointer; user-select: none; transition: var(--transition); display: inline-flex; align-items: center; gap: 3px; ${badgeStyle}"
                ${clickHandler}
                ${contextHandler}
                title="${titleText}">
                ${icon} ${labelText}
              </span>
            `;
          }).join("") : ''}
        </div>
      ` : ''}

      ${!isPreview ? `
        <div style="display: flex; align-items: center; justify-content: space-between; margin-top: 8px; padding-top: 6px; border-top: 1px dashed var(--border-light); gap: 6px;" onclick="event.stopPropagation();">
          <span style="font-size: 11px; color: var(--text-muted); flex-shrink: 0;">➕ 快速加标签:</span>
          <select class="form-control" style="height: 24px; font-size: 11px; padding: 0 6px; border-radius: 12px; border: 1px dashed #3b82f6; color: #1d4ed8; background: #f0f7ff; cursor: pointer; flex: 1; min-width: 100px;"
            onchange="event.stopPropagation(); if(this.value){ window.quickAwardTagToStudent('${s.id}', this.value); this.value=''; }"
            onclick="event.stopPropagation();"
            title="快速为该学生增加标签库中的可增减成长标签（自动忽略固定的单次标签）">
            <option value="" disabled selected>选择可增减标签...</option>
            ${((window.store.getTagsPool ? window.store.getTagsPool() : []).filter(t => window.store.isTagStackable ? window.store.isTagStackable(t) : true)).map(t => `<option value="${t}">🏷️ ${t}</option>`).join('')}
          </select>
        </div>
      ` : ''}
    </div>
  `;
};

// ================= 学生档案卡片标签快捷赋分与左键单击/右键兑换处理器 =================
window.quickAwardTagToStudent = function(studentId, tag) {
  if (!studentId || !tag) return;
  const s = (window.store.data.students || []).find(item => String(item.id) === String(studentId));
  if (!s) return;
  window.store.changeStudentTagCount(studentId, tag, 1);
  const goldThresh = window.store.getTagGoldThreshold ? window.store.getTagGoldThreshold(tag) : 3;
  const list = window.getStudentTagsWithCount ? window.getStudentTagsWithCount(s) : [];
  const found = list.find(item => item.tag === tag);
  const curCount = found ? found.count : 1;
  const goldMsg = curCount >= goldThresh ? '，达到变金黄色条件⭐！' : '';
  if (window.showToast) {
    window.showToast(`已快速为【${s.name}】增加标签【${tag}】+1 (当前${curCount}次${goldMsg})！`, "success");
  }
  if (typeof renderCurrentView === "function" && window.currentView === "students") {
    renderCurrentView();
  } else if (window.filterStudents) {
    window.filterStudents();
  }
};

window.changeStudentTagCountOnCard = function(studentId, tag, delta) {
  if (!studentId || !tag) return;
  window.store.changeStudentTagCount(studentId, tag, delta);
  if (typeof renderCurrentView === "function" && window.currentView === "students") {
    renderCurrentView();
  } else if (window.filterStudents) {
    window.filterStudents();
  }
  const pop = document.getElementById("tagQuickStepperPopover");
  if (pop && pop.dataset.studentId === String(studentId) && pop.dataset.tag === tag) {
    const s = (window.store.data.students || []).find(item => String(item.id) === String(studentId));
    const list = s ? window.getStudentTagsWithCount(s) : [];
    const found = list.find(item => item.tag === tag);
    if (!found || found.count <= 0) {
      window.closeTagQuickStepper();
    } else {
      window.renderTagQuickStepperContent(pop, s, tag, found.count);
    }
  }
};

window.toggleStudentTagRedeemed = function(studentId, tag) {
  if (!studentId || !tag) return;
  const s = (window.store.data.students || []).find(item => String(item.id) === String(studentId));
  if (!s) return;
  const isRedeemed = window.store.isTagRedeemed ? window.store.isTagRedeemed(s, tag) : false;
  window.store.setTagRedeemed(studentId, tag, !isRedeemed);
  if (window.showToast) {
    window.showToast(`已将【${s.name}】的标签【${tag}】${!isRedeemed ? '标记为已兑换（字体变灰）' : '恢复为未兑换'}！`, !isRedeemed ? "info" : "success");
  }
  if (typeof renderCurrentView === "function" && window.currentView === "students") {
    renderCurrentView();
  } else if (window.filterStudents) {
    window.filterStudents();
  }
  const pop = document.getElementById("tagQuickStepperPopover");
  if (pop && pop.dataset.studentId === String(studentId) && pop.dataset.tag === tag) {
    const list = window.getStudentTagsWithCount ? window.getStudentTagsWithCount(s) : [];
    const found = list.find(item => item.tag === tag);
    if (found) {
      window.renderTagQuickStepperContent(pop, s, tag, found.count);
    }
  }
};

window.openTagQuickStepper = function(event, studentId, tag) {
  event.stopPropagation();
  let pop = document.getElementById("tagQuickStepperPopover");
  if (!pop) {
    pop = document.createElement("div");
    pop.id = "tagQuickStepperPopover";
    pop.style.cssText = "position: fixed; z-index: 99999; background: #fff; border-radius: 12px; box-shadow: 0 10px 30px rgba(0,0,0,0.22); border: 1px solid #cbd5e1; padding: 14px 16px; min-width: 250px; font-family: inherit;";
    document.body.appendChild(pop);

    document.addEventListener("click", function(e) {
      const p = document.getElementById("tagQuickStepperPopover");
      if (p && p.style.display !== "none" && !p.contains(e.target)) {
        p.style.display = "none";
      }
    });
  }

  pop.dataset.studentId = String(studentId);
  pop.dataset.tag = tag;

  const s = (window.store.data.students || []).find(item => String(item.id) === String(studentId));
  if (!s) return;
  const list = window.getStudentTagsWithCount ? window.getStudentTagsWithCount(s) : [];
  const found = list.find(item => item.tag === tag);
  const count = found ? found.count : 1;

  window.renderTagQuickStepperContent(pop, s, tag, count);

  pop.style.display = "block";
  const rect = event.currentTarget.getBoundingClientRect();
  let left = rect.left;
  let top = rect.bottom + 6;

  if (left + 265 > window.innerWidth) {
    left = window.innerWidth - 275;
  }
  if (top + 170 > window.innerHeight) {
    top = rect.top - 175;
  }
  pop.style.left = `${Math.max(10, left)}px`;
  pop.style.top = `${Math.max(10, top)}px`;
};

window.closeTagQuickStepper = function() {
  const pop = document.getElementById("tagQuickStepperPopover");
  if (pop) pop.style.display = "none";
};

window.renderTagQuickStepperContent = function(pop, s, tag, count) {
  const isStackable = window.store.isTagStackable ? window.store.isTagStackable(tag) : true;
  const goldThresh = window.store.getTagGoldThreshold ? window.store.getTagGoldThreshold(tag) : 3;
  const isRedeemed = window.store.isTagRedeemed ? window.store.isTagRedeemed(s, tag) : false;
  const isGold = isStackable && !isRedeemed && (count >= goldThresh);
  const encTag = encodeURIComponent(tag);

  pop.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
      <div style="font-weight: 700; font-size: 13.5px; color: #1e293b;">
        ${s.name} · <span style="color: ${isRedeemed ? '#64748b' : isGold ? '#b45309' : '#1d4ed8'};">🏷️ ${tag}</span>
      </div>
      <button style="border: none; background: transparent; cursor: pointer; font-size: 14px; color: #94a3b8;" onclick="window.closeTagQuickStepper()">✕</button>
    </div>

    <div style="font-size: 11px; margin-bottom: 8px; display: flex; align-items: center; gap: 6px;">
      ${isRedeemed ? `
        <span class="badge" style="background: #f1f5f9; color: #64748b; font-size: 10.5px; border: 1px solid #cbd5e1;">🎁 已兑换状态 (文字变灰)</span>
      ` : isGold ? `
        <span class="badge" style="background: #fef3c7; color: #b45309; font-size: 10.5px; border: 1px solid #f59e0b; font-weight: 700;">⭐ 已达标 (${count}>=${goldThresh}) 高光金黄</span>
      ` : `
        <span class="badge" style="background: #eff6ff; color: #1d4ed8; font-size: 10.5px; border: 1px solid #bfdbfe;">🔵 普通蓝色 (满${goldThresh}个变金黄)</span>
      `}
    </div>

    <div style="display: flex; align-items: center; justify-content: center; gap: 12px; margin: 10px 0; background: #f8fafc; padding: 8px 10px; border-radius: 8px; border: 1px solid #e2e8f0;">
      <button class="btn btn-sm btn-secondary" style="padding: 2px 10px; font-weight: bold; font-size: 14px;" 
        onclick="window.changeStudentTagCountOnCard('${s.id}', decodeURIComponent('${encTag}'), -1)" title="减少1次获得">-</button>
      <span style="font-size: 16px; font-weight: 800; min-width: 50px; text-align: center; color: ${isRedeemed ? '#64748b' : isGold ? '#b45309' : '#1d4ed8'};">
        ${count} 次
      </span>
      <button class="btn btn-sm btn-primary" style="padding: 2px 10px; font-weight: bold; font-size: 14px;" 
        onclick="window.changeStudentTagCountOnCard('${s.id}', decodeURIComponent('${encTag}'), 1)" title="增加1次获得">+</button>
    </div>

    <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px dashed #e2e8f0; padding-top: 8px; margin-top: 6px;">
      <button class="btn btn-sm ${isRedeemed ? 'btn-secondary' : 'btn-primary'}" style="font-size: 11.5px; padding: 3px 8px;"
        onclick="window.toggleStudentTagRedeemed('${s.id}', decodeURIComponent('${encTag}'))">
        ${isRedeemed ? '↩️ 撤销已兑换' : '🎁 标记为已兑换'}
      </button>
      <button class="btn btn-sm btn-danger" style="font-size: 11.5px; padding: 3px 8px;"
        onclick="if(confirm('确定要为该学生移除标签【${tag}】吗？')) window.changeStudentTagCountOnCard('${s.id}', decodeURIComponent('${encTag}'), -999)">
        🗑️ 移除
      </button>
    </div>
  `;
};

window.handleTagContextMenu = function(studentId, tag) {
  if (!studentId || !tag) return;
  const s = (window.store.data.students || []).find(item => String(item.id) === String(studentId));
  if (!s) return;
  const isRedeemed = window.store.isTagRedeemed ? window.store.isTagRedeemed(s, tag) : false;
  const list = window.getStudentTagsWithCount ? window.getStudentTagsWithCount(s) : [];
  const found = list.find(item => item.tag === tag);
  const count = found ? found.count : 1;
  const disp = window.formatTagDisplay ? window.formatTagDisplay(tag, count) : tag;

  if (!isRedeemed) {
    if (confirm(`🎁 标签奖励兑换提示：\n\n确定要将学生【${s.name}】获得的标签【${disp}】标记为【已兑换】吗？\n\n（兑换后该标签字体颜色将变灰显示）`)) {
      window.store.setTagRedeemed(studentId, tag, true);
      if (window.showToast) window.showToast(`已成功将学生【${s.name}】的标签【${disp}】标记为已兑换！`, "info");
      if (typeof renderCurrentView === "function" && window.currentView === "students") {
        renderCurrentView();
      } else if (window.filterStudents) {
        window.filterStudents();
      }
    }
  } else {
    if (confirm(`🎁 标签奖励兑换提示：\n\n学生【${s.name}】的标签【${disp}】当前处于【已兑换】状态。\n\n是否撤销兑换，恢复为正常字体颜色？`)) {
      window.store.setTagRedeemed(studentId, tag, false);
      if (window.showToast) window.showToast(`已撤销学生【${s.name}】的标签【${disp}】兑换状态，恢复正常！`, "success");
      if (typeof renderCurrentView === "function" && window.currentView === "students") {
        renderCurrentView();
      } else if (window.filterStudents) {
        window.filterStudents();
      }
    }
  }
};

// ================= 学生档案卡片信息显影与字号设置中心控制器 =================
window.getCurrentCardConfigFromModal = function() {
  const getChecked = (id, def = true) => {
    const el = document.getElementById(id);
    return el ? el.checked : def;
  };
  const getNum = (id, def = 12) => {
    const el = document.getElementById(id);
    return el ? (parseFloat(el.value) || def) : def;
  };

  const studentIdVis = getChecked("cfgVisible_studentId", true);
  const groupVis = getChecked("cfgVisible_group", true);
  const studentIdFsz = getNum("cfgFontSize_studentId", 12);
  const groupFsz = getNum("cfgFontSize_group", 12);

  return {
    visibleFields: {
      name: true, // 姓名固定必显
      avatar: getChecked("cfgVisible_avatar", true),
      nation: getChecked("cfgVisible_nation", true),
      role: getChecked("cfgVisible_role", true),
      studentId: studentIdVis,
      group: groupVis,
      idAndGroup: studentIdVis || groupVis,
      idCard: getChecked("cfgVisible_idCard", true),
      hukou: getChecked("cfgVisible_hukou", true),
      address: getChecked("cfgVisible_address", true),
      guardian: getChecked("cfgVisible_guardian", true),
      careTags: getChecked("cfgVisible_careTags", true),
      growthTags: getChecked("cfgVisible_growthTags", true)
    },
    fontSizes: {
      name: getNum("cfgFontSize_name", 16),
      studentId: studentIdFsz,
      group: groupFsz,
      idAndGroup: studentIdFsz,
      idCard: getNum("cfgFontSize_idCard", 11),
      hukou: getNum("cfgFontSize_hukou", 12),
      address: getNum("cfgFontSize_address", 12),
      guardian: getNum("cfgFontSize_guardian", 12),
      careTags: getNum("cfgFontSize_careTags", 10.5),
      growthTags: getNum("cfgFontSize_growthTags", 10.5)
    }
  };
};

window.openCardDisplayConfigModal = function() {
  const modal = document.getElementById("cardDisplayConfigModal");
  if (!modal) return;
  const cfg = window.store.getCardDisplayConfig ? window.store.getCardDisplayConfig() : null;
  if (cfg) {
    const vis = cfg.visibleFields || {};
    const fsz = cfg.fontSizes || {};

    const setChecked = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.checked = val !== false;
    };
    const setNum = (id, val, def) => {
      const el = document.getElementById(id);
      const valEl = document.getElementById(id.replace("cfgFontSize_", "cfgFontSizeVal_"));
      const num = val !== undefined ? val : def;
      if (el) el.value = num;
      if (valEl) valEl.textContent = `${num}px`;
    };

    setChecked("cfgVisible_avatar", vis.avatar);
    setChecked("cfgVisible_nation", vis.nation);
    setChecked("cfgVisible_role", vis.role);
    setChecked("cfgVisible_studentId", vis.studentId !== undefined ? vis.studentId : vis.idAndGroup);
    setChecked("cfgVisible_group", vis.group !== undefined ? vis.group : vis.idAndGroup);
    setChecked("cfgVisible_idCard", vis.idCard);
    setChecked("cfgVisible_hukou", vis.hukou);
    setChecked("cfgVisible_address", vis.address);
    setChecked("cfgVisible_guardian", vis.guardian);
    setChecked("cfgVisible_careTags", vis.careTags);
    setChecked("cfgVisible_growthTags", vis.growthTags);

    setNum("cfgFontSize_name", fsz.name, 16);
    setNum("cfgFontSize_studentId", fsz.studentId || fsz.idAndGroup, 12);
    setNum("cfgFontSize_group", fsz.group || fsz.idAndGroup, 12);
    setNum("cfgFontSize_idCard", fsz.idCard, 11);
    setNum("cfgFontSize_hukou", fsz.hukou, 12);
    setNum("cfgFontSize_address", fsz.address, 12);
    setNum("cfgFontSize_guardian", fsz.guardian, 12);
    setNum("cfgFontSize_careTags", fsz.careTags, 10.5);
    setNum("cfgFontSize_growthTags", fsz.growthTags, 10.5);
  }
  window.previewCardDisplayConfig();
  modal.classList.add("active");
};

window.closeCardDisplayConfigModal = function() {
  const modal = document.getElementById("cardDisplayConfigModal");
  if (modal) modal.classList.remove("active");
};

window.previewCardDisplayConfig = function() {
  const previewContainer = document.getElementById("cardDisplayPreviewContainer");
  if (!previewContainer) return;
  const cfg = window.getCurrentCardConfigFromModal();

  // 更新各滑块对应的数字展示
  const fields = ['name', 'studentId', 'group', 'idCard', 'hukou', 'address', 'guardian', 'careTags', 'growthTags'];
  fields.forEach(f => {
    const valEl = document.getElementById(`cfgFontSizeVal_${f}`);
    const inputEl = document.getElementById(`cfgFontSize_${f}`);
    if (valEl && inputEl) {
      valEl.textContent = `${inputEl.value}px`;
    }
  });

  // 获取一个示例学生进行预览展示
  const firstStudent = (window.store.data.students && window.store.data.students.length > 0) ? window.store.data.students[0] : null;
  const sampleStudent = firstStudent ? JSON.parse(JSON.stringify(firstStudent)) : {
    id: "2026040101",
    name: "陈思远",
    gender: "男",
    nation: "汉族",
    group: "1",
    seat: "第1排·1号",
    role: "班长",
    idCard: "110101201604150011",
    hukou: "北京市海淀区中关村街道",
    address: "阳光花园小区3号楼502",
    guardian: "陈先生",
    phone: "13900001000",
    isLeftBehind: false,
    hardshipCategory: "",
    tags: ["文明之星*2", "好学星"],
    tagCounts: { "文明之星": 2, "好学星": 1 }
  };

  // 确保示例卡片有丰富的成长标签和次数可供测试
  if (!sampleStudent.tagCounts || Object.keys(sampleStudent.tagCounts).length === 0) {
    sampleStudent.tagCounts = { "文明之星": 2, "好学星": 1 };
    sampleStudent.tags = ["文明之星*2", "好学星"];
  }

  previewContainer.innerHTML = window.renderSingleStudentCardHtml(sampleStudent, cfg, true);
};

window.resetCardDisplayConfigToDefault = function() {
  const setChecked = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.checked = val;
  };
  const setNum = (id, num) => {
    const el = document.getElementById(id);
    const valEl = document.getElementById(id.replace("cfgFontSize_", "cfgFontSizeVal_"));
    if (el) el.value = num;
    if (valEl) valEl.textContent = `${num}px`;
  };

  setChecked("cfgVisible_avatar", true);
  setChecked("cfgVisible_nation", true);
  setChecked("cfgVisible_role", true);
  setChecked("cfgVisible_studentId", true);
  setChecked("cfgVisible_group", true);
  setChecked("cfgVisible_idCard", true);
  setChecked("cfgVisible_hukou", true);
  setChecked("cfgVisible_address", true);
  setChecked("cfgVisible_guardian", true);
  setChecked("cfgVisible_careTags", true);
  setChecked("cfgVisible_growthTags", true);

  setNum("cfgFontSize_name", 16);
  setNum("cfgFontSize_studentId", 12);
  setNum("cfgFontSize_group", 12);
  setNum("cfgFontSize_idCard", 11);
  setNum("cfgFontSize_hukou", 12);
  setNum("cfgFontSize_address", 12);
  setNum("cfgFontSize_guardian", 12);
  setNum("cfgFontSize_careTags", 10.5);
  setNum("cfgFontSize_growthTags", 10.5);

  window.previewCardDisplayConfig();
  if (window.showToast) window.showToast("已恢复默认卡片显示标准设置", "info");
};

window.applyAndSaveCardDisplayConfig = function() {
  const cfg = window.getCurrentCardConfigFromModal();
  window.store.saveCardDisplayConfig(cfg);
  window.closeCardDisplayConfigModal();
  if (window.showToast) {
    window.showToast("🚀 已成功批量应用卡片显示与字号设置至全班所有学生！", "success");
  } else {
    alert("已成功批量应用设置至全班！");
  }
  if (typeof renderCurrentView === "function" && window.currentView === "students") {
    renderCurrentView();
  } else if (window.filterStudents) {
    window.filterStudents();
  }
};

// Excel 批量导入处理 (超级自适应、防多级表头与异形格式异常、全字段深度保存引擎)
window.triggerExcelImport = function () {
  document.getElementById("excelStudentInput").click();
};

window.handleStudentExcelImport = function (event) {
  const file = event.target.files[0];
  if (!file) return;

  if (typeof XLSX === "undefined") {
    alert("Excel 组件未就绪！");
    if (event.target) event.target.value = "";
    return;
  }

  const reader = new FileReader();
  reader.onload = function (e) {
    try {
      const data = new Uint8Array(e.target.result);
      const workbook = XLSX.read(data, { type: "array" });
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });
      if (!rows || rows.length < 2) {
        alert("导入的表格中没有有效数据行！");
        if (event.target) event.target.value = "";
        return;
      }

      // 1. 智能自适应表头评分算法（解决任意表格格式、大标题占多行等异常）
      let bestHeaderIdx = -1;
      let maxScore = -1;

      const scoreKeywords = [
        { kws: ["姓名", "学生姓名", "名字"], weight: 20 },
        { kws: ["性别"], weight: 10 },
        { kws: ["身份证", "身份证号", "身份证号码", "证件号", "公民身份"], weight: 15 },
        { kws: ["学号", "学籍号", "序号", "编号"], weight: 8 },
        { kws: ["户口", "户籍", "户口所在地", "户籍地"], weight: 12 },
        { kws: ["现居住地", "居住地", "家庭住址", "住址", "常住地址"], weight: 12 },
        { kws: ["联系电话", "电话", "手机", "家长电话"], weight: 10 },
        { kws: ["监护人", "家长", "家长姓名", "父亲", "母亲"], weight: 10 },
        { kws: ["民族"], weight: 8 },
        { kws: ["留守", "留守儿童"], weight: 8 },
        { kws: ["困难", "贫困", "资助"], weight: 8 }
      ];

      for (let i = 0; i < Math.min(rows.length, 15); i++) {
        const row = rows[i];
        if (!row || !Array.isArray(row)) continue;
        let score = 0;
        const rowStr = row.map(cell => String(cell || "").trim().toLowerCase()).join(" ");
        scoreKeywords.forEach(item => {
          if (item.kws.some(k => rowStr.includes(k.toLowerCase()))) {
            score += item.weight;
          }
        });
        if (score > maxScore) {
          maxScore = score;
          bestHeaderIdx = i;
        }
      }

      let headerRowIdx = (maxScore >= 15 && bestHeaderIdx !== -1) ? bestHeaderIdx : 0;

      // 2. 表头数组扁平安全化，彻底消除合并单元格产生的稀疏空洞
      const rawHeaderRow = rows[headerRowIdx] || [];
      const headers = [];
      for (let c = 0; c < Math.max(rawHeaderRow.length, 35); c++) {
        headers[c] = String(rawHeaderRow[c] || "").trim().replace(/\r?\n/g, "");
      }

      // 3. 智能检测是否有多级复合子表头（例如第 1 行是“户口所在地”，第 2 行是“乡镇、村/社区、门牌号”）
      let subHeaderRowIdx = -1;
      let startDataRowIdx = headerRowIdx + 1;
      if (rows[startDataRowIdx] && rows[startDataRowIdx].some(cell => {
        const s = String(cell || "").trim();
        return s.includes("乡镇") || s.includes("村") || s.includes("社区") || s.includes("路") || s.includes("号") || s.includes("组");
      })) {
        subHeaderRowIdx = startDataRowIdx;
        startDataRowIdx = subHeaderRowIdx + 1;
      }

      // 4. 字段定位匹配器
      const getColIdx = (keywords) => {
        return headers.findIndex(h => typeof h === "string" && h.length > 0 && keywords.some(k => h.toLowerCase().includes(k.toLowerCase())));
      };

      const nameIdx = getColIdx(["学生姓名", "姓名", "名字", "name"]);
      if (nameIdx === -1) {
        alert("未能在导入的 Excel 表格中识别到【姓名】或【学生姓名】列，请检查表格表头！");
        if (event.target) event.target.value = "";
        return;
      }

      const seqIdx = getColIdx(["序号"]);
      const idIdx = getColIdx(["学号", "学籍号", "编号", "id", "code"]);
      const idCardIdx = getColIdx(["身份证号", "身份证号码", "身份证", "证件号", "公民身份", "idcard", "id_card"]);
      const genderIdx = getColIdx(["性别", "gender", "sex"]);
      const nationIdx = getColIdx(["民族", "nation", "ethnicity"]);
      const birthdayIdx = getColIdx(["出生日期", "生日", "出生年月", "出生时间", "birthday", "birth"]);

      // 户籍信息与户口所在地 (优先精准识别)
      const hukouIdx = getColIdx(["户口所在地", "户籍所在地", "户籍地址", "户籍", "户口地址", "户籍地", "籍贯", "户口", "registered_residence", "hukou"]);

      // 现居住常住住址 (智能排除户籍列，杜绝因“地址”通用词导致的列歧义)
      let addressIdx = headers.findIndex((h, idx) =>
        idx !== hukouIdx &&
        typeof h === "string" && h.length > 0 &&
        !h.includes("户籍") && !h.includes("户口") && !h.includes("籍贯") &&
        ["现居住地", "家庭常住地址", "常住地址", "常住家庭地址", "居住地", "家庭住址", "现住址", "住址", "家庭地址", "详细地址", "地址", "address"].some(k => h.toLowerCase().includes(k.toLowerCase()))
      );

      const guardianIdx = getColIdx(["家长姓名", "监护人姓名", "监护人", "家长", "母亲", "父亲", "联系人", "guardian", "parent"]);
      const phoneIdx = getColIdx(["联系电话", "家长电话", "监护人电话", "手机", "手机号", "电话", "联系方式", "phone", "tel"]);
      const schoolIdx = getColIdx(["学校", "学校名称", "所在学校", "school"]);
      const classIdx = getColIdx(["年班级", "班级", "所在班级", "class"]);
      const leftBehindIdx = getColIdx(["是否留守儿童", "留守儿童", "留守"]);
      const hardshipIdx = getColIdx(["家庭困难类别", "困难类别", "贫困类别", "困难", "贫困", "资助"]);
      const homeroomTeacherIdx = getColIdx(["班主任", "负责老师", "班主任姓名", "teacher"]);
      const homeroomPhoneIdx = getColIdx(["班主任联系电话", "班主任电话", "老师电话"]);
      const roleIdx = getColIdx(["职务", "班级职务", "班干部", "role"]);
      const groupIdx = getColIdx(["小组", "组别", "所在小组", "group"]);
      const seatIdx = getColIdx(["座位", "座位号", "座次", "seat"]);
      const pickupIdx = getColIdx(["接送方式", "接送", "上下学方式", "pickup"]);
      const allergiesIdx = getColIdx(["过敏", "健康", "健康状况", "健康提示", "病史", "allergies", "health"]);
      const remarkIdx = getColIdx(["备注", "其他说明", "说明", "remark", "notes"]);

      // 提取相邻多列地址的辅助函数（仅当后续相邻列属于合并单元格或属于乡镇/村组/社区/路号子级时才拼合，遇到独立列名自动停止）
      const extractMergedAddress = (row, startIdx) => {
        if (startIdx === -1 || !row) return "";
        const parts = [];
        const firstVal = (row[startIdx] !== undefined && row[startIdx] !== null) ? String(row[startIdx]).trim() : "";
        if (firstVal && !firstVal.includes("乡镇") && !firstVal.includes("村/社区") && !firstVal.includes("XX路")) {
          parts.push(firstVal);
        }

        // 检查紧邻的后续 1~2 列是否为地址子列
        for (let c = startIdx + 1; c <= startIdx + 2 && c < row.length; c++) {
          const colHeader = headers[c] || "";
          const subHeaderCell = (subHeaderRowIdx !== -1 && rows[subHeaderRowIdx]) ? String(rows[subHeaderRowIdx][c] || "").trim() : "";
          const isAddressSubCol = !colHeader ||
            colHeader === headers[startIdx] ||
            subHeaderCell.includes("村") || subHeaderCell.includes("社区") || subHeaderCell.includes("路") ||
            subHeaderCell.includes("号") || subHeaderCell.includes("组") || subHeaderCell.includes("镇") || subHeaderCell.includes("乡");

          if (isAddressSubCol && row[c] !== undefined && row[c] !== null) {
            const p = String(row[c]).trim();
            if (p && !p.includes("乡镇") && !p.includes("村/社区") && !p.includes("XX路")) {
              parts.push(p);
            }
          } else {
            // 一旦遇到独立命名的列（如电话、性别等），立即停止向后拼接
            break;
          }
        }
        return parts.join("");
      };

      const importedStudents = [];

      for (let i = startDataRowIdx; i < rows.length; i++) {
        const r = rows[i];
        if (!r || !Array.isArray(r)) continue;
        const nameVal = (nameIdx !== -1 && r[nameIdx]) ? String(r[nameIdx]).trim() : "";
        if (!nameVal || nameVal === "学生姓名" || nameVal === "姓名" || nameVal === "序号") continue;

        let idCardVal = (idCardIdx !== -1 && r[idCardIdx]) ? String(r[idCardIdx]).trim().toUpperCase() : "";
        let genderVal = (genderIdx !== -1 && r[genderIdx]) ? String(r[genderIdx]).trim() : "";
        let birthdayVal = (birthdayIdx !== -1 && r[birthdayIdx]) ? String(r[birthdayIdx]).trim() : "";
        let nationVal = (nationIdx !== -1 && r[nationIdx]) ? String(r[nationIdx]).trim() : "汉族";

        // 从 18 位身份证号码智能提取出生日期 (YYYY-MM-DD) 与性别
        if (idCardVal && idCardVal.length === 18) {
          const y = idCardVal.slice(6, 10);
          const m = idCardVal.slice(10, 12);
          const d = idCardVal.slice(12, 14);
          if (/^\d{4}$/.test(y) && /^\d{2}$/.test(m) && /^\d{2}$/.test(d)) {
            if (!birthdayVal || birthdayVal === "2016-05-15") {
              birthdayVal = `${y}-${m}-${d}`;
            }
          }
          const genderDigit = parseInt(idCardVal.charAt(16));
          if (!isNaN(genderDigit) && !genderVal) {
            genderVal = (genderDigit % 2 === 1) ? "男" : "女";
          }
        }

        // 户籍地址提取（多列智能拼合）
        let hukouVal = extractMergedAddress(r, hukouIdx);
        if (!hukouVal && hukouIdx !== -1 && r[hukouIdx]) {
          hukouVal = String(r[hukouIdx]).trim();
        }

        // 现居住常住住址提取（多列智能拼合）
        let addressVal = extractMergedAddress(r, addressIdx);
        if (!addressVal && addressIdx !== -1 && r[addressIdx]) {
          addressVal = String(r[addressIdx]).trim();
        }

        const phoneVal = (phoneIdx !== -1 && r[phoneIdx]) ? String(r[phoneIdx]).trim() : "13800000000";
        const guardianVal = (guardianIdx !== -1 && r[guardianIdx]) ? String(r[guardianIdx]).trim() : "家长";
        const schoolVal = (schoolIdx !== -1 && r[schoolIdx]) ? String(r[schoolIdx]).trim() : "";
        const classVal = (classIdx !== -1 && r[classIdx]) ? String(r[classIdx]).trim() : "";
        const leftBehindVal = (leftBehindIdx !== -1 && r[leftBehindIdx]) ? String(r[leftBehindIdx]).trim() : "";
        const isLeftBehind = leftBehindVal.includes("是") || leftBehindVal === "1";
        const hardshipVal = (hardshipIdx !== -1 && r[hardshipIdx]) ? String(r[hardshipIdx]).trim() : "";
        const isHardship = hardshipVal && hardshipVal !== "0" && hardshipVal !== "无" && hardshipVal !== "否";
        const homeroomVal = (homeroomTeacherIdx !== -1 && r[homeroomTeacherIdx]) ? String(r[homeroomTeacherIdx]).trim() : "";
        const homeroomPhoneVal = (homeroomPhoneIdx !== -1 && r[homeroomPhoneIdx]) ? String(r[homeroomPhoneIdx]).trim() : "";
        const remarkVal = (remarkIdx !== -1 && r[remarkIdx]) ? String(r[remarkIdx]).trim() : "";

        // 标签自动构建
        const tags = ["新导入"];
        if (nationVal && nationVal !== "汉族") tags.push(nationVal);
        if (isLeftBehind) tags.push("留守儿童");
        if (isHardship) tags.push("关爱帮扶");

        // 深度收集表格中包含的所有原始字段 (extraFields)，确保源表格中存在的全部信息都留存展示
        const extraFields = {};
        for (let col = 0; col < r.length; col++) {
          const rawColName = headers[col];
          const cellVal = r[col];
          if (rawColName && cellVal !== undefined && cellVal !== null && String(cellVal).trim() !== "") {
            extraFields[rawColName] = String(cellVal).trim();
          }
        }

        // 学号分配
        const idVal = (idIdx !== -1 && r[idIdx]) ? String(r[idIdx]).trim() : "";
        const seqVal = (seqIdx !== -1 && r[seqIdx]) ? String(r[seqIdx]).trim() : "";
        let finalId = idVal;
        if (!finalId) {
          if (seqVal && !isNaN(parseInt(seqVal))) {
            const num = parseInt(seqVal);
            finalId = `20260407${num < 10 ? '0' + num : num}`;
          } else {
            finalId = String(2026040700 + importedStudents.length + 1);
          }
        }

        const studentData = {
          name: nameVal,
          gender: genderVal || "男",
          nation: nationVal || "汉族",
          birthday: birthdayVal || "2016-05-15",
          idCard: idCardVal || "",
          hukou: hukouVal || "未登记户籍",
          registeredResidence: hukouVal || "未登记户籍",
          address: addressVal || hukouVal || "本市",
          guardian: guardianVal,
          phone: phoneVal,
          school: schoolVal || "实验学校",
          className: classVal || "四（7）班",
          isLeftBehind: isLeftBehind,
          hardshipCategory: hardshipVal,
          homeroomTeacher: homeroomVal,
          homeroomPhone: homeroomPhoneVal,
          remark: remarkVal,
          extraFields: extraFields,
          group: (groupIdx !== -1 && r[groupIdx]) ? (parseInt(r[groupIdx]) || 1) : ((importedStudents.length % 6) + 1),
          seat: (seatIdx !== -1 && r[seatIdx]) ? String(r[seatIdx]).trim() : `第${Math.floor(importedStudents.length / 8) + 1}排·${(importedStudents.length % 8) + 1}号`,
          role: (roleIdx !== -1 && r[roleIdx]) ? String(r[roleIdx]).trim() : "学生",
          pickup: (pickupIdx !== -1 && r[pickupIdx]) ? String(r[pickupIdx]).trim() : "家长接送",
          allergies: (allergiesIdx !== -1 && r[allergiesIdx]) ? String(r[allergiesIdx]).trim() : "无",
          id: finalId,
          tags: tags,
          attendanceToday: "normal",
          score: 80,
          flowers: 0
        };

        // 补齐身份证号如果为空
        if (!studentData.idCard) {
          const b = (studentData.birthday || "2016-05-15").replace(/-/g, "");
          const seq = String(1001 + importedStudents.length).slice(1);
          studentData.idCard = `110101${b}${seq}${studentData.gender === "女" ? "2" : "1"}`;
        }

        importedStudents.push(studentData);
      }

      if (importedStudents.length === 0) {
        alert("导入的表格中没有找到有效学生数据！");
        if (event.target) event.target.value = "";
        return;
      }

      // 检测是否为首次导入真实学生档案（若从未导入过真实花名册、处于模板状态或存在模板残留信息，则深度清空旧模板数据）
      const hasRemnants = (window.store && typeof window.store.hasTemplateRemnants === 'function') ? window.store.hasTemplateRemnants() : false;
      const isFirstRealImport = !window.store.data.hasImportedRealStudents ||
        window.store.data.isTemplateData ||
        (window.store.data.students && window.store.data.students.some(s => s.name === "陈思远" && s.id === "20240001")) ||
        hasRemnants;

      if (isFirstRealImport) {
        window.store.cleanTemplateDataOnFirstImport(importedStudents);
        window.showToast(`🎉 成功导入全班 ${importedStudents.length} 名学生！原模板残留数据已彻底清空净化，全部字段已同步入库！`, "success");
      } else {
        let updatedCount = 0;
        let addedCount = 0;
        importedStudents.forEach(stu => {
          let existing = null;
          if (stu.idCard) existing = window.store.data.students.find(s => s.idCard === stu.idCard);
          if (!existing && stu.id) existing = window.store.data.students.find(s => s.id === stu.id);
          if (!existing) existing = window.store.data.students.find(s => s.name === stu.name);

          if (existing) {
            Object.assign(existing, stu);
            updatedCount++;
          } else {
            window.store.addStudent(stu);
            addedCount++;
          }
        });
        window.store.save();
        window.showToast(`Excel 同步导入成功！已同步更新 ${updatedCount} 名已有学生，新增录入 ${addedCount} 名学生。`, "success");
      }

      if (event.target) event.target.value = "";
      window.renderStudentsView(document.getElementById("mainContentArea"));
    } catch (err) {
      console.error("解析 Excel 出错:", err);
      alert("解析 Excel 失败：" + (err && err.message ? err.message : "请检查文件格式是否有效！"));
      if (event.target) event.target.value = "";
    }
  };
  reader.readAsArrayBuffer(file);
};

/* ==========================================================================
   智能多格式学生补充资料导入引擎 (Supplementary Import Engine)
   支持：
   1. 横向分组表（如《四年级7班各小组成员.xlsx》，行首为第X组，同行后续平铺成员）
   2. 纵向分组分栏表（首行为各组名，向下平铺成员）
   3. 任意二维属性补充表（表头含姓名/学号，其余列为角色、职务、电话、住址、特异体质等）
   具备：自动探测矩阵形态、同音/形近字模糊对齐、自动扩充班级小组库、非破坏式安全增量合并
   ========================================================================== */

window.currentSupplementaryAnalysis = null;

// 打开导入补充资料弹窗
window.openSupplementaryImportModal = function () {
  const modal = document.getElementById("supplementaryImportModal");
  if (!modal) return;

  // 重置状态
  const fileInput = document.getElementById("suppExcelFileInput");
  if (fileInput) fileInput.value = "";

  const dropzone = document.getElementById("suppUploadDropzone");
  if (dropzone) dropzone.style.display = "block";

  const hud = document.getElementById("suppAnalysisHud");
  if (hud) {
    hud.style.display = "none";
    hud.innerHTML = "";
  }

  const diffSection = document.getElementById("suppDiffSection");
  if (diffSection) diffSection.style.display = "none";

  const confirmBtn = document.getElementById("suppConfirmBtn");
  if (confirmBtn) {
    confirmBtn.disabled = true;
    confirmBtn.innerHTML = "🚀 确认执行补充更新";
  }

  const statusText = document.getElementById("suppFooterStatus");
  if (statusText) statusText.innerHTML = "💡 请先上传需要补充更新的 Excel 表格";

  const onlyChangesCb = document.getElementById("suppFilterOnlyChanges");
  if (onlyChangesCb) onlyChangesCb.checked = false;

  window.currentSupplementaryAnalysis = null;
  modal.classList.add("active");
};

// 关闭弹窗
window.closeSupplementaryImportModal = function () {
  const modal = document.getElementById("supplementaryImportModal");
  if (modal) modal.classList.remove("active");
  window.currentSupplementaryAnalysis = null;
};

// 文件拖拽处理
window.handleSupplementaryFileDrop = function (e) {
  e.preventDefault();
  const dropzone = document.getElementById("suppUploadDropzone");
  if (dropzone) dropzone.style.background = "#f8fafc";

  const files = e.dataTransfer ? e.dataTransfer.files : null;
  if (!files || files.length === 0) return;
  window.processSupplementaryExcelFile(files[0]);
};

// 文件选择处理
window.handleSupplementaryFileSelect = function (e) {
  const files = e.target ? e.target.files : null;
  if (!files || files.length === 0) return;
  window.processSupplementaryExcelFile(files[0]);
};

// 读取并解析 Excel 文件
window.processSupplementaryExcelFile = function (file) {
  if (!file) return;

  const validExts = [".xlsx", ".xls", ".csv"];
  const fileName = file.name.toLowerCase();
  const isValid = validExts.some(ext => fileName.endsWith(ext));
  if (!isValid) {
    alert("请上传有效的 Excel 或 CSV 表格文件（.xlsx / .xls / .csv）");
    return;
  }

  const statusText = document.getElementById("suppFooterStatus");
  if (statusText) statusText.innerHTML = `⏳ 正在读取分析表格 <strong>${file.name}</strong> ...`;

  const reader = new FileReader();
  reader.onload = function (e) {
    try {
      const data = new Uint8Array(e.target.result);
      if (typeof XLSX === "undefined") {
        throw new Error("表格解析库 XLSX 未就绪，请刷新重试！");
      }
      const workbook = XLSX.read(data, { type: "array" });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const rawRows = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: "" });

      if (!rawRows || rawRows.length === 0) {
        alert("表格内容为空，请选择有效的学生资料表格！");
        if (statusText) statusText.innerHTML = "💡 请先上传需要补充更新的 Excel 表格";
        return;
      }

      const existingStudents = (window.store && window.store.data && window.store.data.students) ? window.store.data.students : [];
      const analysisResult = window.analyzeSupplementarySpreadsheet(rawRows, existingStudents, file.name);
      window.currentSupplementaryAnalysis = analysisResult;
      window.renderSupplementaryPreview(analysisResult);
    } catch (err) {
      console.error("解析补充表格出错:", err);
      alert("解析补充表格失败：" + (err && err.message ? err.message : "请检查文件结构！"));
      if (statusText) statusText.innerHTML = "❌ 解析失败，请重试";
    }
  };
  reader.readAsArrayBuffer(file);
};

// 辅助工具：中文数字解析
window.parseChineseGroupNumber = function (str) {
  if (!str) return null;
  const s = String(str).trim();
  const numMap = { '一': 1, '二': 2, '三': 3, '四': 4, '五': 5, '六': 6, '七': 7, '八': 8, '九': 9, '十': 10, '十一': 11, '十二': 12, '十三': 13, '十四': 14, '十五': 15, '十六': 16 };
  const m = s.match(/第?\s*([一二三四五六七八九十0-9]+)\s*[组队]/);
  if (m) {
    const raw = m[1];
    if (numMap[raw]) return numMap[raw];
    const n = parseInt(raw, 10);
    if (!isNaN(n)) return n;
  }
  const pureDigits = s.match(/^([0-9]{1,2})$/);
  if (pureDigits) return parseInt(pureDigits[1], 10);
  return null;
};

// 辅助工具：计算学生姓名相似度（支持近音字、同音字、形近字智能对齐）
window.calcStudentNameSimilarity = function (str1, str2) {
  if (!str1 || !str2) return 0;
  str1 = String(str1).trim().replace(/\s+/g, "");
  str2 = String(str2).trim().replace(/\s+/g, "");
  if (str1 === str2) return 1.0;
  if (str1.length === 0 || str2.length === 0) return 0;

  // 统计字符交集
  let common = 0;
  const chars2 = str2.split("");
  for (let i = 0; i < str1.length; i++) {
    const idx = chars2.indexOf(str1[i]);
    if (idx !== -1) {
      common++;
      chars2.splice(idx, 1);
    }
  }
  const maxLen = Math.max(str1.length, str2.length);
  return common / maxLen;
};

/**
 * 核心智能矩阵探测算法 (analyzeSupplementarySpreadsheet)
 * 输入：原始二维数组、当前班级学生名单、文件名
 * 输出：识别形态、逐项对齐比对数据、自动扩充的小组清单、变动字段汇总
 */
window.analyzeSupplementarySpreadsheet = function (rawRows, existingStudents, fileName) {
  // 1. 清洗过滤空行
  const cleanRows = rawRows.map(row => (row || []).map(cell => String(cell != null ? cell : "").trim()))
                           .filter(row => row.some(cell => cell.length > 0));

  if (cleanRows.length === 0) {
    return { error: "表格无有效数据" };
  }

  // 现有学生索引加速
  const nameMap = new Map();
  const idMap = new Map();
  existingStudents.forEach(s => {
    if (s.name) nameMap.set(s.name.trim(), s);
    if (s.id) idMap.set(String(s.id).trim(), s);
  });

  // 2. 探测三种形态特征得分
  let horizontalGroupHits = 0;
  let horizontalGroupNamesDetected = 0;
  cleanRows.forEach(row => {
    const firstCell = row[0] || "";
    const gNum = window.parseChineseGroupNumber(firstCell);
    if (gNum !== null) {
      horizontalGroupNamesDetected++;
      // 检查同行其余单元格命中现有学生数
      for (let c = 1; c < row.length; c++) {
        const val = row[c];
        if (val && nameMap.has(val)) {
          horizontalGroupHits++;
        }
      }
    }
  });

  // 探测纵向分栏（前2行包含多个第X组，且向下为学生名）
  let verticalGroupCols = [];
  if (cleanRows.length >= 2) {
    const headerRow = cleanRows[0];
    headerRow.forEach((cell, colIdx) => {
      const gNum = window.parseChineseGroupNumber(cell);
      if (gNum !== null) {
        // 检查该列向下命中学生数
        let colHits = 0;
        for (let r = 1; r < Math.min(cleanRows.length, 15); r++) {
          const val = cleanRows[r][colIdx];
          if (val && nameMap.has(val)) colHits++;
        }
        if (colHits >= 1) {
          verticalGroupCols.push({ colIdx, groupNum: gNum, title: cell });
        }
      }
    });
  }

  // 探测属性二维表（表头含有“姓名/学生姓名/学号”等，其余列为各类属性）
  let attributeHeaderRowIdx = -1;
  let nameColIdx = -1;
  let idColIdx = -1;
  for (let r = 0; r < Math.min(cleanRows.length, 5); r++) {
    const row = cleanRows[r];
    for (let c = 0; c < row.length; c++) {
      const text = row[c].toLowerCase();
      if (/^(学生)?姓名$|^名字$|^name$/i.test(text) && nameColIdx === -1) {
        nameColIdx = c;
        attributeHeaderRowIdx = r;
      }
      if (/^学号$|^编号$|^student_?id$/i.test(text) && idColIdx === -1) {
        idColIdx = c;
        attributeHeaderRowIdx = r;
      }
    }
    if (nameColIdx !== -1 || idColIdx !== -1) break;
  }

  // 3. 判定最终表格类型
  let tableType = "UNKNOWN";
  if (horizontalGroupNamesDetected >= 2 && horizontalGroupHits >= 2) {
    tableType = "HORIZONTAL_GROUPS";
  } else if (verticalGroupCols.length >= 2) {
    tableType = "VERTICAL_GROUPS";
  } else if (attributeHeaderRowIdx !== -1) {
    tableType = "ATTRIBUTE_TABLE";
  } else {
    // 启发式容错：若含有分组关键词，仍按横向分组尝试
    if (horizontalGroupNamesDetected >= 1) {
      tableType = "HORIZONTAL_GROUPS";
    } else {
      tableType = "ATTRIBUTE_TABLE";
      nameColIdx = 0; // 默认将第一列视为姓名
      attributeHeaderRowIdx = 0;
    }
  }

  // 4. 根据类型解析记录并对齐学生
  const records = [];
  const usedStudentIds = new Set();
  const detectedNewGroups = new Set();
  const currentGroups = (window.store && window.store.data && window.store.data.groups) || ["第1组", "第2组", "第3组", "第4组", "第5组", "第6组"];
  const currentGroupCount = currentGroups.length;

  if (tableType === "HORIZONTAL_GROUPS") {
    cleanRows.forEach(row => {
      const firstCell = row[0] || "";
      const gNum = window.parseChineseGroupNumber(firstCell);
      if (gNum === null) return;

      if (gNum > currentGroupCount) {
        detectedNewGroups.add(gNum);
      }

      for (let c = 1; c < row.length; c++) {
        const rawName = row[c];
        if (!rawName || rawName.length > 8) continue; // 过滤过长噪声

        // 尝试精确匹配
        let matchedStu = nameMap.get(rawName) || null;
        let matchType = "exact";
        let similarity = 1.0;

        if (!matchedStu) {
          // 智能形近字/同音字/错别字推荐匹配
          let bestSim = 0;
          let bestStu = null;
          existingStudents.forEach(s => {
            if (usedStudentIds.has(s.id)) return;
            const sim = window.calcStudentNameSimilarity(rawName, s.name);
            if (sim > bestSim) {
              bestSim = sim;
              bestStu = s;
            }
          });

          if (bestSim >= 0.6 && bestStu) {
            matchedStu = bestStu;
            matchType = "fuzzy";
            similarity = bestSim;
          } else {
            matchType = "none";
            similarity = 0;
          }
        }

        if (matchedStu) {
          usedStudentIds.add(matchedStu.id);
        }

        const oldGroup = matchedStu ? (matchedStu.group || 1) : null;
        const isChanged = matchedStu ? (oldGroup !== gNum) : true;

        records.push({
          rawName: rawName,
          matchType: matchType,
          matchedStudent: matchedStu,
          similarity: similarity,
          selected: true,
          isChanged: isChanged,
          changes: {
            group: {
              fieldLabel: "小组分配",
              oldVal: oldGroup ? `第${oldGroup}组` : "未分配",
              newVal: `第${gNum}组`,
              val: gNum
            }
          }
        });
      }
    });
  } else if (tableType === "VERTICAL_GROUPS") {
    verticalGroupCols.forEach(colInfo => {
      const gNum = colInfo.groupNum;
      if (gNum > currentGroupCount) {
        detectedNewGroups.add(gNum);
      }

      for (let r = 1; r < cleanRows.length; r++) {
        const rawName = cleanRows[r][colInfo.colIdx];
        if (!rawName || rawName.length > 8) continue;

        let matchedStu = nameMap.get(rawName) || null;
        let matchType = "exact";
        let similarity = 1.0;

        if (!matchedStu) {
          let bestSim = 0;
          let bestStu = null;
          existingStudents.forEach(s => {
            if (usedStudentIds.has(s.id)) return;
            const sim = window.calcStudentNameSimilarity(rawName, s.name);
            if (sim > bestSim) {
              bestSim = sim;
              bestStu = s;
            }
          });
          if (bestSim >= 0.6 && bestStu) {
            matchedStu = bestStu;
            matchType = "fuzzy";
            similarity = bestSim;
          } else {
            matchType = "none";
            similarity = 0;
          }
        }

        if (matchedStu) usedStudentIds.add(matchedStu.id);
        const oldGroup = matchedStu ? (matchedStu.group || 1) : null;
        const isChanged = matchedStu ? (oldGroup !== gNum) : true;

        records.push({
          rawName: rawName,
          matchType: matchType,
          matchedStudent: matchedStu,
          similarity: similarity,
          selected: true,
          isChanged: isChanged,
          changes: {
            group: {
              fieldLabel: "小组分配",
              oldVal: oldGroup ? `第${oldGroup}组` : "未分配",
              newVal: `第${gNum}组`,
              val: gNum
            }
          }
        });
      }
    });
  } else {
    // ATTRIBUTE_TABLE: 二维属性补充表
    const headerRow = cleanRows[attributeHeaderRowIdx >= 0 ? attributeHeaderRowIdx : 0];
    const colDefinitions = [];

    headerRow.forEach((colName, cIdx) => {
      if (cIdx === nameColIdx || cIdx === idColIdx) return;
      const cn = colName.trim();
      if (!cn) return;

      let key = null;
      let label = cn;
      if (/组别|小组|分组|group/i.test(cn)) key = "group";
      else if (/职务|角色|班委|role/i.test(cn)) key = "role";
      else if (/联系方式|电话|手机|家长电话|phone/i.test(cn)) key = "phone";
      else if (/家长|监护人|联系人|guardian/i.test(cn)) key = "guardian";
      else if (/住址|现住址|家庭地址|address/i.test(cn)) key = "address";
      else if (/户籍|籍贯|hukou/i.test(cn)) key = "hukou";
      else if (/民族|nation/i.test(cn)) key = "nation";
      else if (/过敏|特异体质|健康|allergies/i.test(cn)) key = "allergies";
      else if (/接送|上下学|pickup/i.test(cn)) key = "pickup";
      else if (/座位|seat/i.test(cn)) key = "seat";
      else if (/备注|remark/i.test(cn)) key = "remark";
      else {
        key = "extra_" + cn;
      }

      colDefinitions.push({ colIdx: cIdx, key: key, label: label });
    });

    const startRow = (attributeHeaderRowIdx >= 0 ? attributeHeaderRowIdx : 0) + 1;
    for (let r = startRow; r < cleanRows.length; r++) {
      const row = cleanRows[r];
      const rawName = nameColIdx !== -1 ? row[nameColIdx] : "";
      const rawId = idColIdx !== -1 ? row[idColIdx] : "";

      if (!rawName && !rawId) continue;

      let matchedStu = null;
      let matchType = "none";
      let similarity = 0;

      if (rawId && idMap.has(rawId)) {
        matchedStu = idMap.get(rawId);
        matchType = "exact";
        similarity = 1.0;
      } else if (rawName && nameMap.has(rawName)) {
        matchedStu = nameMap.get(rawName);
        matchType = "exact";
        similarity = 1.0;
      } else if (rawName) {
        let bestSim = 0;
        let bestStu = null;
        existingStudents.forEach(s => {
          if (usedStudentIds.has(s.id)) return;
          const sim = window.calcStudentNameSimilarity(rawName, s.name);
          if (sim > bestSim) {
            bestSim = sim;
            bestStu = s;
          }
        });
        if (bestSim >= 0.6 && bestStu) {
          matchedStu = bestStu;
          matchType = "fuzzy";
          similarity = bestSim;
        }
      }

      if (matchedStu) usedStudentIds.add(matchedStu.id);

      const changes = {};
      let hasAnyChange = false;

      colDefinitions.forEach(col => {
        let cellVal = row[col.colIdx];
        if (cellVal === "" || cellVal == null) return; // 空白不覆盖

        let parsedVal = cellVal;
        if (col.key === "group") {
          const gNum = window.parseChineseGroupNumber(cellVal);
          if (gNum !== null) {
            parsedVal = gNum;
            if (gNum > currentGroupCount) detectedNewGroups.add(gNum);
          }
        }

        const oldVal = matchedStu ? (matchedStu[col.key] || (matchedStu.extraFields ? matchedStu.extraFields[col.label] : "")) : "";
        const isDiff = String(oldVal).trim() !== String(parsedVal).trim();
        if (isDiff) hasAnyChange = true;

        changes[col.key] = {
          fieldLabel: col.label,
          oldVal: oldVal ? String(oldVal) : "（空）",
          newVal: String(parsedVal),
          val: parsedVal
        };
      });

      records.push({
        rawName: rawName || `学号:${rawId}`,
        matchType: matchType,
        matchedStudent: matchedStu,
        similarity: similarity,
        selected: true,
        isChanged: hasAnyChange,
        changes: changes
      });
    }
  }

  const exactCount = records.filter(r => r.matchType === "exact").length;
  const fuzzyCount = records.filter(r => r.matchType === "fuzzy").length;
  const unmatchedCount = records.filter(r => r.matchType === "none").length;
  const changedCount = records.filter(r => r.isChanged && r.matchedStudent).length;

  return {
    fileName: fileName || "导入表格",
    tableType: tableType,
    totalCount: records.length,
    exactCount: exactCount,
    fuzzyCount: fuzzyCount,
    unmatchedCount: unmatchedCount,
    changedCount: changedCount,
    newGroups: Array.from(detectedNewGroups).sort((a, b) => a - b),
    records: records,
    existingStudents: existingStudents
  };
};

/**
 * 渲染补充导入分析预览 UI
 */
window.renderSupplementaryPreview = function (res) {
  const hud = document.getElementById("suppAnalysisHud");
  const diffSection = document.getElementById("suppDiffSection");
  const dropzone = document.getElementById("suppUploadDropzone");
  const statusText = document.getElementById("suppFooterStatus");
  const confirmBtn = document.getElementById("suppConfirmBtn");

  if (!hud || !diffSection) return;

  // 隐藏上传拖拽区，展开分析与比对
  if (dropzone) dropzone.style.display = "none";
  hud.style.display = "block";
  diffSection.style.display = "block";

  // 表格类型友好名称
  const typeMap = {
    "HORIZONTAL_GROUPS": { title: "📊 横向小组成员分工表", desc: "自动识别每行组名并平铺提取小组成员" },
    "VERTICAL_GROUPS": { title: "📑 纵向分组分栏表", desc: "按各列组名纵向对齐提取学生" },
    "ATTRIBUTE_TABLE": { title: "📋 学生多维信息补充表", desc: "按学生姓名/学号多字段增量对齐更新" },
    "UNKNOWN": { title: "📂 自适应表格", desc: "启发式自适应解析" }
  };
  const typeInfo = typeMap[res.tableType] || typeMap["UNKNOWN"];

  // 渲染分析 HUD 状态卡
  hud.innerHTML = `
    <div style="background: #ffffff; border: 1px solid #bae6fd; border-radius: 12px; padding: 14px 18px; box-shadow: 0 4px 12px rgba(14, 165, 233, 0.08);">
      <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 8px; margin-bottom: 12px;">
        <div style="display: flex; align-items: center; gap: 10px;">
          <span class="badge" style="background: #0284c7; color: #fff; font-size: 12px; padding: 4px 10px; border-radius: 6px;">
            ${typeInfo.title}
          </span>
          <span style="font-size: 13px; font-weight: 700; color: #0f172a;">文件：${res.fileName}</span>
          <span style="font-size: 12px; color: #64748b;">(${typeInfo.desc})</span>
        </div>
        <button class="btn btn-sm btn-secondary" onclick="window.resetSupplementaryUpload()" style="font-size: 11.5px;">
          🔄 重新选择表格
        </button>
      </div>

      <!-- 四项核心识别指标 -->
      <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px;">
        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 8px 12px; text-align: center;">
          <div style="font-size: 11px; color: #64748b;">识别学生人次</div>
          <div style="font-size: 20px; font-weight: 800; color: #0f172a; margin-top: 2px;">${res.totalCount}</div>
        </div>
        <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 8px 12px; text-align: center;">
          <div style="font-size: 11px; color: #166534;">✅ 精确匹配</div>
          <div style="font-size: 20px; font-weight: 800; color: #16a34a; margin-top: 2px;">${res.exactCount}</div>
        </div>
        <div style="background: #fffbeb; border: 1px solid #fde68a; border-radius: 8px; padding: 8px 12px; text-align: center;">
          <div style="font-size: 11px; color: #92400e;">💡 推荐匹配 (近音/形近)</div>
          <div style="font-size: 20px; font-weight: 800; color: #d97706; margin-top: 2px;">${res.fuzzyCount}</div>
        </div>
        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 8px 12px; text-align: center;">
          <div style="font-size: 11px; color: #0284c7;">⚡ 产生字段变更</div>
          <div style="font-size: 20px; font-weight: 800; color: #0284c7; margin-top: 2px;">${res.changedCount}</div>
        </div>
      </div>

      ${res.newGroups.length > 0 ? `
        <div style="margin-top: 10px; background: #fff7ed; border: 1px solid #fdba74; border-radius: 8px; padding: 8px 12px; display: flex; align-items: center; gap: 8px; font-size: 12px; color: #9a3412;">
          <span style="font-size: 16px;">✨</span>
          <span><strong>自动扩容提示</strong>：表格包含 <strong>${res.newGroups.map(g => `第${g}组`).join("、")}</strong>，当前班级库仅有 ${res.existingStudents.length > 0 && window.store.data.groups ? window.store.data.groups.length : 6} 个小组，确认后将自动为您扩充班级小组库！</span>
        </div>
      ` : ""}
    </div>
  `;

  // 渲染顶部对齐徽章
  const matchSummaryBadge = document.getElementById("suppMatchSummaryBadge");
  if (matchSummaryBadge) {
    matchSummaryBadge.innerHTML = `可安全补充更新 ${res.exactCount + res.fuzzyCount} 名学生`;
  }

  // 渲染逐人比对明细列表
  window.renderSupplementaryDiffTableRows();

  // 更新底部按钮
  if (confirmBtn) {
    confirmBtn.disabled = false;
    confirmBtn.innerHTML = `🚀 确认增量合并到当前班级档案 (${res.exactCount + res.fuzzyCount}人)`;
  }
  if (statusText) {
    statusText.innerHTML = `✅ 分析完成：匹配到 <strong>${res.exactCount + res.fuzzyCount}</strong> 人，其中 <strong>${res.changedCount}</strong> 人存在信息变更`;
  }
};

// 重置上传
window.resetSupplementaryUpload = function () {
  const dropzone = document.getElementById("suppUploadDropzone");
  const hud = document.getElementById("suppAnalysisHud");
  const diffSection = document.getElementById("suppDiffSection");
  const fileInput = document.getElementById("suppExcelFileInput");
  const confirmBtn = document.getElementById("suppConfirmBtn");
  const statusText = document.getElementById("suppFooterStatus");

  if (fileInput) fileInput.value = "";
  if (dropzone) dropzone.style.display = "block";
  if (hud) {
    hud.style.display = "none";
    hud.innerHTML = "";
  }
  if (diffSection) diffSection.style.display = "none";
  if (confirmBtn) {
    confirmBtn.disabled = true;
    confirmBtn.innerHTML = "🚀 确认执行补充更新";
  }
  if (statusText) statusText.innerHTML = "💡 请先上传需要补充更新的 Excel 表格";
  window.currentSupplementaryAnalysis = null;
};

// 渲染逐行比对明细
window.renderSupplementaryDiffTableRows = function () {
  const wrapper = document.getElementById("suppDiffTableWrapper");
  const res = window.currentSupplementaryAnalysis;
  if (!wrapper || !res) return;

  const onlyChanges = document.getElementById("suppFilterOnlyChanges") ? document.getElementById("suppFilterOnlyChanges").checked : false;

  let displayRecords = res.records;
  if (onlyChanges) {
    displayRecords = displayRecords.filter(r => r.isChanged);
  }

  if (displayRecords.length === 0) {
    wrapper.innerHTML = `
      <div style="text-align: center; padding: 24px; color: #64748b; font-size: 13px;">
        暂无符合筛选条件的学生比对记录
      </div>
    `;
    return;
  }

  let rowsHtml = displayRecords.map((r, idx) => {
    const isFuzzy = r.matchType === "fuzzy";
    const isExact = r.matchType === "exact";
    const isUnmatched = r.matchType === "none";

    let statusBadge = "";
    if (isExact) {
      statusBadge = `<span class="badge" style="background: #dcfce7; color: #15803d; font-size: 11px;">✅ 精确匹配</span>`;
    } else if (isFuzzy) {
      statusBadge = `<span class="badge" style="background: #fef3c7; color: #b45309; font-size: 11px;" title="形近字/同音字相似度: ${(r.similarity * 100).toFixed(0)}%">💡 推荐匹配 (${(r.similarity * 100).toFixed(0)}%)</span>`;
    } else {
      statusBadge = `<span class="badge" style="background: #f1f5f9; color: #64748b; font-size: 11px;">❓ 库中无此人</span>`;
    }

    // 变动内容格式化
    let changesDesc = "";
    const changeKeys = Object.keys(r.changes);
    if (changeKeys.length === 0) {
      changesDesc = `<span style="color: #94a3b8;">无信息变更</span>`;
    } else {
      changesDesc = changeKeys.map(k => {
        const c = r.changes[k];
        const isDiff = c.oldVal !== c.newVal;
        return `
          <div style="font-size: 12px; margin: 2px 0;">
            <span style="color: #64748b;">${c.fieldLabel}：</span>
            <span style="text-decoration: ${isDiff ? 'line-through' : 'none'}; color: #94a3b8;">${c.oldVal}</span>
            ${isDiff ? ` ➡️ <strong style="color: #0284c7;">${c.newVal}</strong>` : `<span style="color: #10b981; margin-left: 4px;">(保持)</span>`}
          </div>
        `;
      }).join("");
    }

    return `
      <div style="display: grid; grid-template-columns: 44px 100px 90px 150px 1fr; align-items: center; padding: 8px 12px; border-bottom: 1px solid #f1f5f9; font-size: 12.5px; background: ${idx % 2 === 0 ? '#ffffff' : '#f8fafc'}; transition: background 0.15s;"
           onmouseover="this.style.background='#f0f9ff';" onmouseout="this.style.background='${idx % 2 === 0 ? '#ffffff' : '#f8fafc'}';">
        <div>
          <input type="checkbox" ${r.selected && !isUnmatched ? 'checked' : ''} ${isUnmatched ? 'disabled' : ''} 
                 onchange="window.toggleSupplementaryRecordSelected(${idx}, this.checked)">
        </div>
        <div>${statusBadge}</div>
        <div style="font-weight: 700; color: #0f172a;">${r.rawName}</div>
        <div style="color: #334155;">
          ${r.matchedStudent ? `
            <div style="display: flex; align-items: center; gap: 4px;">
              <span>👤 ${r.matchedStudent.name}</span>
              ${isFuzzy ? `<span style="font-size: 10px; color: #d97706; background: #fffbeb; padding: 1px 4px; border-radius: 3px;">同音/形近</span>` : ''}
            </div>
          ` : `
            <span style="color: #94a3b8; font-style: italic;">未在班级库找到</span>
          `}
        </div>
        <div>${changesDesc}</div>
      </div>
    `;
  }).join("");

  wrapper.innerHTML = `
    <div style="display: grid; grid-template-columns: 44px 100px 90px 150px 1fr; padding: 8px 12px; background: #f1f5f9; font-weight: 700; font-size: 12px; color: #475569; position: sticky; top: 0; z-index: 2;">
      <div>
        <input type="checkbox" checked onchange="window.toggleAllSupplementaryRecords(this.checked)">
      </div>
      <div>识别状态</div>
      <div>表格姓名</div>
      <div>对应系统学生</div>
      <div>拟更新项目 (原值 ➡️ 补充后新值)</div>
    </div>
    ${rowsHtml}
  `;
};

// 切换单条记录选中
window.toggleSupplementaryRecordSelected = function (idx, checked) {
  const res = window.currentSupplementaryAnalysis;
  if (!res || !res.records[idx]) return;
  res.records[idx].selected = checked;
  window.updateSupplementaryConfirmButtonText();
};

// 全选/全不选
window.toggleAllSupplementaryRecords = function (checked) {
  const res = window.currentSupplementaryAnalysis;
  if (!res) return;
  res.records.forEach(r => {
    if (r.matchedStudent) r.selected = checked;
  });
  window.renderSupplementaryDiffTableRows();
  window.updateSupplementaryConfirmButtonText();
};

// 筛选切换
window.filterSupplementaryDiffTable = function () {
  window.renderSupplementaryDiffTableRows();
};

// 更新底部确认按钮计数
window.updateSupplementaryConfirmButtonText = function () {
  const res = window.currentSupplementaryAnalysis;
  const btn = document.getElementById("suppConfirmBtn");
  if (!res || !btn) return;
  const selectedCount = res.records.filter(r => r.selected && r.matchedStudent).length;
  btn.disabled = selectedCount === 0;
  btn.innerHTML = `🚀 确认增量合并到当前班级档案 (${selectedCount}人)`;
};

// 确认执行补充更新
window.confirmApplySupplementaryUpdate = function () {
  const res = window.currentSupplementaryAnalysis;
  if (!res) return;

  const autoExpandGroups = document.getElementById("suppOptAutoExpandGroups") ? document.getElementById("suppOptAutoExpandGroups").checked : true;
  const createNewStudents = document.getElementById("suppOptCreateNewStudents") ? document.getElementById("suppOptCreateNewStudents").checked : false;

  // 收集待更新数据
  const updates = [];
  res.records.forEach(r => {
    if (!r.selected) return;

    if (r.matchedStudent) {
      const studentUpdate = {
        studentId: r.matchedStudent.id,
        name: r.matchedStudent.name,
        fields: {}
      };
      Object.keys(r.changes).forEach(k => {
        studentUpdate.fields[k] = r.changes[k].val;
      });
      updates.push(studentUpdate);
    } else if (createNewStudents && r.rawName) {
      // 勾选了创建新学生
      const newStuFields = {
        name: r.rawName
      };
      Object.keys(r.changes).forEach(k => {
        newStuFields[k] = r.changes[k].val;
      });
      updates.push({
        studentId: null,
        name: r.rawName,
        isNew: true,
        fields: newStuFields
      });
    }
  });

  if (updates.length === 0) {
    alert("未选择任何需要更新的学生记录！");
    return;
  }

  // 执行 store 的增量非破坏式合并
  if (window.store && typeof window.store.applyStudentSupplementaryUpdates === "function") {
    const updateResult = window.store.applyStudentSupplementaryUpdates(updates, {
      autoExpandGroups: autoExpandGroups,
      allowCreateNew: createNewStudents
    });

    let msg = `🎉 补充资料导入成功！已更新 ${updateResult.updatedStudentsCount || updates.length} 位学生的资料。`;
    if (updateResult.newGroupsAdded && updateResult.newGroupsAdded.length > 0) {
      msg += ` 班级小组库已自动扩充 ${updateResult.newGroupsAdded.length} 个小组（现共 ${window.store.data.groups.length} 组）。`;
    }

    window.closeSupplementaryImportModal();
    if (window.showToast) {
      window.showToast(msg, "success");
    } else {
      alert(msg);
    }

    // 重新渲染当前视图
    const container = document.getElementById("mainContentArea");
    if (container) {
      window.renderStudentsView(container);
    }
  } else {
    alert("未找到更新接口，请检查 store.js 配置！");
  }
};


