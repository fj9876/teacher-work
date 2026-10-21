/**
 * 班主任工作台 - 14. 班级活动 (Activities)
 * 主题班会、家长会、运动会、研学实践、生日会等活动全流程管理
 * 包含：活动方案、签到留痕、照片相册墙、一键生成图文纪要与总结反思
 */

window.renderActivitiesView = function(container) {
  const activities = window.store.data.activities || [];

  container.innerHTML = `
    <div class="module-header">
      <div class="module-title-area">
        <h2>🎉 班级活动</h2>
        <p>统筹主题班会、家长会、研学实践、艺术节与生日会，沉淀班级成长相册与图文纪要</p>
      </div>
      <div class="module-actions">
        <button class="btn btn-primary" onclick="window.openAddActivityModal()">+ 新建班级活动</button>
      </div>
    </div>

    <!-- 顶部活动统计指标卡 -->
    <div class="stat-cards-row">
      <div class="stat-card">
        <div class="stat-info">
          <div class="stat-label">已举办活动</div>
          <div class="stat-value" style="color: #7c3aed;">${activities.length}<span class="stat-unit">场</span></div>
        </div>
        <span style="font-size: 24px;">🎪</span>
      </div>

      <div class="stat-card">
        <div class="stat-info">
          <div class="stat-label">相册照片归档</div>
          <div class="stat-value" style="color: #2563eb;">${activities.reduce((acc, a) => acc + ((a.photos && a.photos.length) || 0), 0)}<span class="stat-unit">张</span></div>
        </div>
        <span style="font-size: 24px;">📸</span>
      </div>

      <div class="stat-card">
        <div class="stat-info">
          <div class="stat-label">平均全班参与率</div>
          <div class="stat-value" style="color: #10b981;">${activities.length > 0 ? '100' : '0.0'}<span class="stat-unit">%</span></div>
        </div>
        <span style="font-size: 24px;">🎯</span>
      </div>

      <div class="stat-card">
        <div class="stat-info">
          <div class="stat-label">家校志愿者参与</div>
          <div class="stat-value" style="color: #d97706;">${activities.reduce((acc, a) => acc + (Number(a.volunteers) || (a.volunteerList ? a.volunteerList.length : 0)), 0)}<span class="stat-unit">人次</span></div>
        </div>
        <span style="font-size: 24px;">🤝</span>
      </div>
    </div>

    <!-- 活动卡片网格 -->
    <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(340px, 1fr)); gap: 16px;">
      ${activities.length === 0 ? `
        <div class="card" style="text-align: center; padding: 40px; color: var(--text-muted); grid-column: 1 / -1;">
          暂无已发布的班级活动，点击右上角【+ 新建班级活动】开始添加 🎈
        </div>
      ` : activities.map(a => {
        const photoCount = (a.photos && a.photos.length) || 0;
        return `
          <div class="card" style="padding: 18px 20px; border-top: 4px solid #8b5cf6; display: flex; flex-direction: column; justify-content: space-between;">
            <div>
              <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
                <span class="badge badge-purple">${a.type}</span>
                <div style="display: flex; align-items: center; gap: 8px;">
                  <span style="font-size: 11.5px; color: #2563eb; background: #eff6ff; padding: 2px 6px; border-radius: 4px; font-weight: 600;">
                    📷 ${photoCount} 张照片
                  </span>
                  <span style="font-size: 12px; color: var(--text-muted);">📅 ${a.date}</span>
                </div>
              </div>

              <div style="font-size: 16.5px; font-weight: 800; color: #1e293b; margin-bottom: 8px;">
                ${a.name}
              </div>

              <div style="font-size: 12px; color: var(--text-muted); margin-bottom: 10px;">
                📍 地点：${a.location} · 参与：全班 ${a.attendanceCount || ((window.store.data.students || []).length)} 人
              </div>

              <p style="font-size: 13px; color: #475569; line-height: 1.6; background: #f8fafc; padding: 10px 12px; border-radius: var(--radius-md); margin-bottom: 14px;">
                ${a.summary}
              </p>
            </div>

            <div style="display: flex; gap: 8px; border-top: 1px solid var(--border-light); padding-top: 12px;">
              <button class="btn btn-sm btn-secondary" style="flex: 1;" onclick="window.openActivitySummaryModal('${a.id}')">
                📄 生成图文纪要
              </button>
              <button class="btn btn-sm btn-primary" style="flex: 1;" onclick="window.openActivityAlbumModal('${a.id}')">
                📷 成长相册 (${photoCount})
              </button>
              <button class="btn btn-sm btn-secondary" style="padding: 4px 8px;" onclick="window.deleteActivityItem('${a.id}')" title="删除活动">
                🗑️
              </button>
            </div>
          </div>
        `;
      }).join("")}
    </div>
  `;
};

window.deleteActivityItem = function(activityId) {
  if (confirm("确定要删除该班级活动及相关记录吗？")) {
    window.store.deleteActivity(activityId);
    window.showToast("班级活动已删除！", "info");
    window.renderActivitiesView(document.getElementById("mainContentArea"));
  }
};
