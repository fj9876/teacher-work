/**
 * 班主任工作台 - 13. 班级宠物系统 (Pets - 创新彩蛋)
 * 15种萌宠领养、学生个人积分换取爱心口粮/装扮、
 * 喂食成长升级互动、宠物排行榜 Top 20 领奖台
 */

window.renderPetsView = function (container) {
  const data = window.store.data;
  const students = data.students || [];
  const petsList = data.petsList || [];
  const petShop = data.petShop || [];
  const maxLevel = students.reduce((max, s) => Math.max(max, (s.petData && s.petData.level) || 1), 1);

  window.currentPetTab = window.currentPetTab || "grid";

  container.innerHTML = `
    <div class="pet-layout">
      <!-- 宠物顶部梦幻横幅  -->
      <div class="pet-banner">
        <div>
          <h2>🐾 班级萌宠乐园 · 趣味激励彩蛋</h2>
          <p>每位学生拥有一只成长伙伴，课堂认真听讲、作业全优所获得的量化积分可用来投喂、装扮与升级进化！</p>
        </div>
        <div class="pet-banner-stats">
          <div class="pet-banner-stat-box">
            <div class="pet-banner-stat-num">${petsList.length || 15}</div>
            <div class="pet-banner-stat-lbl">种专属萌宠</div>
          </div>
          <div class="pet-banner-stat-box">
            <div class="pet-banner-stat-num">${students.length}</div>
            <div class="pet-banner-stat-lbl">只成长中</div>
          </div>
          <div class="pet-banner-stat-box">
            <div class="pet-banner-stat-num">Lv.${students.length > 0 ? maxLevel : 1}</div>
            <div class="pet-banner-stat-lbl">最高等级</div>
          </div>
        </div>
      </div>

      <!-- 标签切换与功能操作条 -->
      <div class="card" style="padding: 10px 18px; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 10px;">
        <div class="tab-pills" id="petSubTabs">
          <div class="tab-pill ${window.currentPetTab === 'grid' ? 'active' : ''}" data-tab="grid" onclick="window.switchPetTab('grid', this)">🏡 全班宠物大厅</div>
          <div class="tab-pill ${window.currentPetTab === 'ranking' ? 'active' : ''}" data-tab="ranking" onclick="window.switchPetTab('ranking', this)">🏆 宠物等级排行榜</div>
          <div class="tab-pill ${window.currentPetTab === 'activities' ? 'active' : ''}" data-tab="activities" onclick="window.switchPetTab('activities', this)">⚡ 各栏目成长联动动态 <span class="badge" style="background:#dbeafe; color:#1d4ed8; margin-left:4px; font-size:11.5px;">${(data.petActivities || []).length}</span></div>
          <div class="tab-pill ${window.currentPetTab === 'shop' ? 'active' : ''}" data-tab="shop" onclick="window.switchPetTab('shop', this)">🛒 积分萌宠小铺</div>
        </div>

        <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
          <button class="btn btn-sm btn-secondary" onclick="window.openScoreRulesModal()">⚙️ 积分与升级规则</button>
          <button class="btn btn-sm btn-secondary" onclick="window.recalcScoresFromAcademics()">🔄 联动作业/考试/考勤一键升级</button>
          <button class="btn btn-sm btn-secondary" onclick="window.store.exportQuantScoreExcel()">📤 导出萌宠总表</button>
        </div>
      </div>

      <!-- 内容区 -->
      <div id="petTabContentArea">
        <!-- 动态渲染 -->
      </div>
    </div>
  `;

  window.renderCurrentPetTabContent();
};

window.switchPetTab = function (tab, elem) {
  window.currentPetTab = tab;
  document.querySelectorAll("#petSubTabs .tab-pill").forEach(p => {
    if (p === elem || p.getAttribute("data-tab") === tab) {
      p.classList.add("active");
    } else {
      p.classList.remove("active");
    }
  });
  window.renderCurrentPetTabContent();
};

window.renderCurrentPetTabContent = function () {
  const container = document.getElementById("petTabContentArea");
  if (!container) return;
  const data = window.store.data;
  const students = data.students || [];
  const petsList = data.petsList || [];
  const petShop = data.petShop || [];
  const activities = data.petActivities || [];

  if (window.currentPetTab === "grid") {
    // 宠物卡片网格 
    container.innerHTML = `
      <div class="card" style="padding: 12px 18px; margin-bottom: 16px; background: linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%); border: 1px solid #bbf7d0; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 10px;">
        <div style="display: flex; align-items: center; gap: 12px;">
          <span style="font-size: 26px;">🔗</span>
          <div>
            <div style="font-weight: 700; font-size: 14px; color: #166534;">全栏目联动机制已深度激活</div>
            <div style="font-size: 12px; color: #15803d; margin-top: 2px;">
              【成长评价 · 小红花】1朵 = +3宠物分 | 【学科考试】优秀 +5分 / 良好 +3分 | 【考勤请假】正常出勤 +1分 / 迟到 -2分 / 旷课 -4分 / 请假 -1分
            </div>
          </div>
        </div>
        <button class="btn btn-sm" style="background: #16a34a; color: #fff; font-weight: 600; border: none; padding: 6px 14px; border-radius: var(--radius-sm); cursor: pointer;" onclick="window.switchPetTab('activities')">
          查看全栏目联动日志 (${activities.length}) →
        </button>
      </div>

      <div class="pets-grid">
        ${students.map(s => {
      const petConfig = petsList.find(p => p.id === s.petId) || petsList[0];
      const petData = s.petData || { level: 2, exp: 40, hunger: 85, happy: 90 };

      return `
            <div class="pet-card">
              <div class="pet-card-owner">
                <span>👤</span> ${s.name}
              </div>
              <div class="pet-card-score">
                ${s.score || 80} 积分
              </div>

              <div class="pet-avatar-circle">
                ${petConfig.icon}
              </div>

              <div class="pet-card-name">${petConfig.name} <span style="font-size: 11.5px; color: #ec4899; font-weight: 800;">Lv.${petData.level}</span></div>
              <div class="pet-card-species">${petConfig.species} · ${petConfig.rarity}</div>

              <div class="pet-stat-bars">
                <div class="pet-bar-item">
                  <span class="pet-bar-label">饱食度</span>
                  <div class="pet-progress-bg">
                    <div class="pet-progress-fill fill-hunger" style="width: ${petData.hunger || 85}%;"></div>
                  </div>
                  <span style="font-size: 10.5px; color: #64748b;">${petData.hunger || 85}%</span>
                </div>

                <div class="pet-bar-item">
                  <span class="pet-bar-label">心情值</span>
                  <div class="pet-progress-bg">
                    <div class="pet-progress-fill fill-happy" style="width: ${petData.happy || 90}%;"></div>
                  </div>
                  <span style="font-size: 10.5px; color: #64748b;">${petData.happy || 90}%</span>
                </div>

                <div class="pet-bar-item">
                  <span class="pet-bar-label">经验值</span>
                  <div class="pet-progress-bg">
                    <div class="pet-progress-fill fill-exp" style="width: ${petData.exp || 40}%;"></div>
                  </div>
                  <span style="font-size: 10.5px; color: #64748b;">${petData.exp || 40}%</span>
                </div>
              </div>

              <button class="pet-interact-btn" onclick="window.openPetFeedModal('${s.id}', '${s.name}', '${petConfig.name}', '${petConfig.icon}')">
                🍖 投喂与互动
              </button>
            </div>
          `;
    }).join("")}
      </div>
    `;
  } else if (window.currentPetTab === "ranking") {
    // 宠物排行榜 
    const sorted = [...students].sort((a, b) => ((b.petData ? b.petData.level : 2) * 100 + (b.score || 80)) - ((a.petData ? a.petData.level : 2) * 100 + (a.score || 80)));
    const top1 = sorted[0];
    const top2 = sorted[1];
    const top3 = sorted[2];

    const getPetIcon = (s) => (petsList.find(p => p.id === s.petId) || petsList[0]).icon;
    const getPetName = (s) => (petsList.find(p => p.id === s.petId) || petsList[0]).name;

    container.innerHTML = `
      <div class="card" style="padding: 24px;">
        <div class="pet-ranking-top3">
          <!-- 亚军 -->
          <div class="top-pet-podium rank-2">
            <span class="rank-crown">🥈</span>
            <div style="font-size: 40px; margin: 10px 0 4px;">${getPetIcon(top2)}</div>
            <div style="font-size: 14px; font-weight: 800; color: #334155;">${getPetName(top2)}</div>
            <div style="font-size: 12px; color: #64748b;">主人: ${top2.name}</div>
            <span class="badge badge-info" style="margin-top: 6px;">Lv.${top2.petData ? top2.petData.level : 3}</span>
          </div>

          <!-- 冠军 -->
          <div class="top-pet-podium rank-1">
            <span class="rank-crown">👑</span>
            <div style="font-size: 48px; margin: 12px 0 4px;">${getPetIcon(top1)}</div>
            <div style="font-size: 16px; font-weight: 800; color: #b45309;">${getPetName(top1)}</div>
            <div style="font-size: 13px; font-weight: 700; color: #78350f;">主人: ${top1.name}</div>
            <span class="badge badge-warning" style="margin-top: 8px; font-size: 12px;">🌟 顶级萌宠 Lv.${top1.petData ? top1.petData.level : 4}</span>
          </div>

          <!-- 季军 -->
          <div class="top-pet-podium rank-3">
            <span class="rank-crown">🥉</span>
            <div style="font-size: 36px; margin: 10px 0 4px;">${getPetIcon(top3)}</div>
            <div style="font-size: 14px; font-weight: 800; color: #334155;">${getPetName(top3)}</div>
            <div style="font-size: 12px; color: #64748b;">主人: ${top3.name}</div>
            <span class="badge badge-purple" style="margin-top: 6px;">Lv.${top3.petData ? top3.petData.level : 2}</span>
          </div>
        </div>

        <!-- 排名列表 -->
        <div class="table-responsive" style="margin-top: 20px;">
          <table class="data-table">
            <thead>
              <tr>
                <th>排名</th>
                <th>宠物</th>
                <th>名称</th>
                <th>主人</th>
                <th>当前等级</th>
                <th>主人当前可用积分</th>
                <th>状态</th>
              </tr>
            </thead>
            <tbody>
              ${sorted.slice(0, 15).map((s, idx) => `
                <tr>
                  <td><span style="font-weight: 800;">${idx + 1}</span></td>
                  <td style="font-size: 22px;">${getPetIcon(s)}</td>
                  <td style="font-weight: 700;">${getPetName(s)}</td>
                  <td>${s.name}</td>
                  <td><span class="badge badge-purple">Lv.${s.petData ? s.petData.level : 2}</span></td>
                  <td><strong style="color: #f59e0b;">${s.score || 80} 积分</strong></td>
                  <td><span class="badge badge-success">生机勃勃</span></td>
                </tr>
              `).join("")}
            </tbody>
          </table>
        </div>
      </div>
    `;
  } else if (window.currentPetTab === "activities") {
    // 萌宠各栏目成长联动动态 
    const recentActivities = activities.slice(0, 60);
    const growthCount = activities.filter(a => a.category === "成长评价").length;
    const attendCount = activities.filter(a => (a.category || "").includes("考勤")).length;
    const examCount = activities.filter(a => a.category === "成绩考核").length;

    container.innerHTML = `
      <div style="display: flex; flex-direction: column; gap: 16px;">
        <!-- 统计指标 -->
        <div class="stat-cards-row">
          <div class="stat-card">
            <div class="stat-info">
              <div class="stat-label">全栏目联动总记录</div>
              <div class="stat-value" style="color: #2563eb;">${activities.length}<span class="stat-unit">条</span></div>
            </div>
            <span style="font-size: 24px;">⚡</span>
          </div>

          <div class="stat-card">
            <div class="stat-info">
              <div class="stat-label">成长评价与红花折算</div>
              <div class="stat-value" style="color: #10b981;">${growthCount}<span class="stat-unit">次</span></div>
            </div>
            <span style="font-size: 24px;">🌸</span>
          </div>

          <div class="stat-card">
            <div class="stat-info">
              <div class="stat-label">考勤打卡与请假关联</div>
              <div class="stat-value" style="color: #f59e0b;">${attendCount}<span class="stat-unit">次</span></div>
            </div>
            <span style="font-size: 24px;">📅</span>
          </div>

          <div class="stat-card">
            <div class="stat-info">
              <div class="stat-label">学科考试成绩激励</div>
              <div class="stat-value" style="color: #8b5cf6;">${examCount}<span class="stat-unit">次</span></div>
            </div>
            <span style="font-size: 24px;">📝</span>
          </div>
        </div>

        <!-- 联动动态流水明细 -->
        <div class="card" style="padding: 18px;">
          <div class="panel-header" style="margin-bottom: 14px; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 8px;">
            <div class="panel-title" style="display: flex; align-items: center; gap: 8px;">
              <span>🐾 萌宠各栏目成长联动动态实时流水</span>
              <span class="badge badge-success">实时联动生效</span>
            </div>
            <div style="display: flex; align-items: center; gap: 10px;">
              <span style="font-size: 12px; color: #64748b;">支持成长评价、小红花、考勤请假、学科考试多维增减分</span>
              <button class="btn btn-sm btn-primary" onclick="window.recalcScoresFromAcademics()">🔄 重新综合核算</button>
            </div>
          </div>

          <div class="table-responsive">
            <table class="table" style="font-size: 13px;">
              <thead>
                <tr>
                  <th style="width: 130px;">记录时间</th>
                  <th style="width: 140px;">学生及萌宠</th>
                  <th style="width: 110px;">联动来源</th>
                  <th style="width: 100px;">积分变动</th>
                  <th>变动原因与详细记录</th>
                  <th style="width: 120px;">更新后萌宠</th>
                </tr>
              </thead>
              <tbody>
                ${recentActivities.length === 0 ? `
                  <tr><td colspan="6" style="text-align:center; padding: 24px; color: #94a3b8;">暂无变动记录，在成长评价、考勤或成绩栏目操作后将实时展示于此！</td></tr>
                ` : recentActivities.map(a => {
      const student = students.find(s => s.name === a.studentName || s.id === a.studentId);
      const petCfg = (student && petsList.find(p => p.id === student.petId)) || petsList[0];
      const isPositive = a.delta > 0;
      const isZero = a.delta === 0;
      const deltaColor = isPositive ? "#16a34a" : isZero ? "#64748b" : "#dc2626";
      const deltaBg = isPositive ? "#dcfce7" : isZero ? "#f1f5f9" : "#fee2e2";
      const deltaSign = isPositive ? `+${a.delta}` : `${a.delta}`;
      const catBadgeStyle = a.category === "成长评价" ? "background:#fdf2f8; color:#db2777; border:1px solid #fbcfe8;" :
        (a.category || "").includes("考勤") ? "background:#eff6ff; color:#1d4ed8; border:1px solid #bfdbfe;" :
          a.category === "成绩考核" ? "background:#f5f3ff; color:#7c3aed; border:1px solid #ddd6fe;" :
            "background:#f8fafc; color:#475569; border:1px solid #e2e8f0;";

      return `
                    <tr>
                      <td style="color: #64748b; font-size: 12px;">${a.date || ''} <span style="color:#94a3b8;">${a.time || ''}</span></td>
                      <td>
                        <div style="display: flex; align-items: center; gap: 6px;">
                          <span style="font-size: 18px;">${petCfg.icon}</span>
                          <span style="font-weight: 700;">${a.studentName}</span>
                        </div>
                      </td>
                      <td>
                        <span class="badge" style="${catBadgeStyle}">${a.icon || '📌'} ${a.category || '联动记录'}</span>
                      </td>
                      <td>
                        <span style="display: inline-block; padding: 2px 8px; border-radius: 999px; font-weight: 800; font-size: 12.5px; background: ${deltaBg}; color: ${deltaColor};">
                          ${deltaSign} 积分
                        </span>
                      </td>
                      <td style="color: #334155; line-height: 1.4;">${a.reason}</td>
                      <td>
                        <div style="display: flex; align-items: center; gap: 4px;">
                          <span class="badge badge-purple" style="font-size: 11px;">Lv.${a.petLevel || 2}</span>
                          <strong style="color: #f59e0b; font-size: 12px;">${a.newScore || 80}分</strong>
                        </div>
                      </td>
                    </tr>
                  `;
    }).join("")}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;
  } else if (window.currentPetTab === "shop") {
    // 宠物商店 
    container.innerHTML = `
      <div class="card" style="padding: 20px;">
        <div class="panel-header">
          <div class="panel-title">🛒 萌宠积分小卖部</div>
          <span class="panel-subtitle">使用日常表现获得的量化积分选购道具与美装</span>
        </div>

        <div class="pet-shop-grid">
          ${petShop.map(item => `
            <div class="shop-item-card">
              <div class="shop-item-icon">${item.icon}</div>
              <div class="shop-item-name">${item.name}</div>
              <div class="shop-item-desc">${item.desc}</div>
              <div class="shop-item-cost">🪙 ${item.cost} 积分</div>
              <button class="btn btn-sm btn-primary" style="width: 100%;" onclick="window.handleShopBuy('${item.id}')">
                兑换给宠物
              </button>
            </div>
          `).join("")}
        </div>
      </div>
    `;
  }
};

window.openPetFeedModal = function (studentId, studentName, petName, petIcon) {
  const targetItem = window.store.data.petShop[0]; // 默认饼干
  const res = window.store.feedPet(studentId, targetItem);
  if (res.success) {
    window.showToast(res.msg, "success");
    window.renderCurrentPetTabContent();
  } else {
    alert(res.msg);
  }
};

window.handleShopBuy = function (itemId) {
  const students = window.store.data.students || [];
  const defaultName = (students[0] && students[0].name) || "";
  const targetStudent = prompt("请输入要为哪位学生的宠物兑换此物品（输入学生姓名）：", defaultName);
  if (!targetStudent) return;
  const s = students.find(item => item.name === targetStudent);
  if (s) {
    const item = window.store.data.petShop.find(p => p.id === itemId);
    const res = window.store.feedPet(s.id, item);
    if (res.success) {
      window.showToast(res.msg, "success");
      window.renderCurrentPetTabContent();
    } else {
      alert(res.msg);
    }
  } else {
    alert("未找到该学生！");
  }
};
