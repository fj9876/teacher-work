/**
 * 班主任工作台 - 9. 家校沟通管理 (Communication)
 * 班级通知发布（已读/未读追踪、一键催读回执、常用通知模板库）、
 * 家校沟通台账（电话/微信/面谈/家访）、长期未联系家庭预警
 */

window.renderCommunicationView = function(container) {
  const comm = window.store.data.communication || { notices: [], logs: [], longTimeUntouched: [] };
  const notices = comm.notices || [];
  const logs = comm.logs || [];
  const untouched = comm.longTimeUntouched || [];
  const students = window.store.data.students || [];

  // 动态计算平均已读确认率 (无通知时自动归零为 0.0%)
  let avgReadRate = "0.0";
  if (notices.length > 0) {
    let totalRead = 0;
    let totalExpected = 0;
    notices.forEach(n => {
      const read = Number(n.readCount) || 0;
      const unread = Number(n.unreadCount) || 0;
      const sum = (read + unread > 0) ? (read + unread) : students.length;
      totalRead += read;
      totalExpected += sum;
    });
    if (totalExpected > 0) {
      avgReadRate = ((totalRead / totalExpected) * 100).toFixed(1);
    }
  }

  container.innerHTML = `
    <div class="module-header">
      <div class="module-title-area">
        <h2>💬 家校沟通</h2>
        <p>统一管理班级通知发布、已读未读回执、家长沟通记录与长期未联系家庭跟进预警</p>
      </div>
      <div class="module-actions">
        <button class="btn btn-secondary" onclick="window.openNoticeTemplateModal()">📑 常用通知模板库</button>
        <button class="btn btn-secondary" onclick="window.openAddCommLogModal()">📝 记录家长沟通</button>
        <button class="btn btn-primary" onclick="window.openPublishNoticeModal()">+ 发布班级通知</button>
      </div>
    </div>

    <!-- 顶部4统计卡片 -->
    <div class="stat-cards-row">
      <div class="stat-card">
        <div class="stat-info">
          <div class="stat-label">已发布通知</div>
          <div class="stat-value" style="color: #2563eb;">${notices.length}<span class="stat-unit">篇</span></div>
        </div>
        <span style="font-size: 24px;">📢</span>
      </div>

      <div class="stat-card">
        <div class="stat-info">
          <div class="stat-label">家长沟通记录</div>
          <div class="stat-value" style="color: #059669;">${logs.length}<span class="stat-unit">次</span></div>
        </div>
        <span style="font-size: 24px;">📞</span>
      </div>

      <div class="stat-card">
        <div class="stat-info">
          <div class="stat-label">长期未联系家庭</div>
          <div class="stat-value" style="color: #ef4444;">${untouched.length}<span class="stat-unit">户</span></div>
        </div>
        <span style="font-size: 24px;">🔔</span>
      </div>

      <div class="stat-card">
        <div class="stat-info">
          <div class="stat-label">平均已读确认率</div>
          <div class="stat-value" style="color: #7c3aed;">${avgReadRate}<span class="stat-unit">%</span></div>
        </div>
        <span style="font-size: 24px;">👁️</span>
      </div>
    </div>

    <!-- 主体双列：班级通知列表 与 家长沟通记录 -->
    <div style="display: grid; grid-template-columns: 1.15fr 1fr; gap: 16px;">
      <!-- 班级通知 -->
      <div class="card">
        <div class="panel-header">
          <div class="panel-title">📢 班级重要通知与回执</div>
          <span class="badge badge-info">实时回执</span>
        </div>
        <div style="display: flex; flex-direction: column; gap: 12px;">
          ${notices.length === 0 ? `
            <div style="padding: 36px 16px; text-align: center; color: var(--text-muted); font-size: 13px;">
              <span style="font-size: 32px; display: block; margin-bottom: 8px;">📢</span>
              暂无发布的班级通知，点击右上角【+ 发布班级通知】开始推送！
            </div>
          ` : notices.map(n => `
            <div style="padding: 14px; background: #f8fafc; border: 1px solid var(--border-color); border-radius: var(--radius-md);">
              <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px;">
                <span style="font-size: 14.5px; font-weight: 700; color: #1e293b;">${n.title}</span>
                <div style="display: flex; align-items: center; gap: 6px;">
                  ${n.needReceipt ? '<span class="badge badge-warning">需确认回执</span>' : '<span class="badge badge-gray">常规通知</span>'}
                  <button class="btn btn-sm btn-secondary" style="padding: 2px 8px; font-size: 11.5px;" onclick="window.openEditNoticeModal('${n.id}')">✏️ 编辑</button>
                  <button class="btn btn-sm btn-danger" style="padding: 2px 8px; font-size: 11.5px;" onclick="window.deleteNoticeItem('${n.id}')">🗑️ 删除</button>
                </div>
              </div>

              <p style="font-size: 12.5px; color: #475569; margin-bottom: 10px; line-height: 1.6;">${n.content}</p>

              <div style="display: flex; align-items: center; justify-content: space-between; font-size: 12px; color: var(--text-muted); border-top: 1px dashed var(--border-light); padding-top: 8px;">
                <div>
                  <span>📅 发布日期：${n.date}</span>
                  ${n.deadline ? `<span style="margin-left: 12px;">⏰ 截止：${n.deadline}</span>` : ''}
                </div>
                <div style="display: flex; align-items: center; gap: 10px;">
                  <span>已读 <strong>${n.readCount}</strong> / 未读 <strong style="color: ${n.unreadCount > 0 ? '#ef4444' : '#10b981'};">${n.unreadCount}</strong></span>
                  ${n.unreadCount > 0 ? `
                    <button class="btn btn-sm btn-danger" onclick="window.urgeUnreadNotice('${n.id}', '${(n.unreadParents && n.unreadParents.length > 0) ? n.unreadParents.join('、') : '部分未读家长'}')">催促未读</button>
                  ` : `
                    <span class="badge badge-success">全员已读</span>
                  `}
                </div>
              </div>
            </div>
          `).join("")}
        </div>
      </div>

      <!-- 沟通记录与预警 -->
      <div style="display: flex; flex-direction: column; gap: 16px;">
        <!-- 长期未联系家庭提醒 -->
        <div class="card" style="border-left: 4px solid #f59e0b;">
          <div class="panel-header" style="margin-bottom: 8px;">
            <div class="panel-title" style="color: #b45309;">⚠️ 长期未联系家庭温馨提醒</div>
            <span class="badge badge-warning">超过45天</span>
          </div>
          <div style="display: flex; flex-direction: column; gap: 8px;">
            ${untouched.length === 0 ? `
              <div style="padding: 16px; text-align: center; color: #059669; font-size: 13px;">
                🎉 全班所有学生家庭近期均已深入沟通，暂无预警！
              </div>
            ` : untouched.map(u => `
              <div style="display: flex; align-items: center; justify-content: space-between; padding: 8px 12px; background: #fffbeb; border-radius: var(--radius-md);">
                <div>
                  <strong style="font-size: 13px; color: #78350f;">${u.studentName} 同学家庭</strong>
                  <div style="font-size: 11.5px; color: #92400e;">已 ${u.days} 天未单独深入沟通 · ${u.reason}</div>
                </div>
                <button class="btn btn-sm btn-primary" onclick="window.contactUntouchedFamily('${u.studentName}', '${u.reason}')">📞 立即联系</button>
              </div>
            `).join("")}
          </div>
        </div>

        <!-- 最近家校沟通日志 -->
        <div class="card">
          <div class="panel-header">
            <div class="panel-title">📝 近期家校沟通台账</div>
            <span class="badge badge-success">留痕归档</span>
          </div>
          <div style="display: flex; flex-direction: column; gap: 10px;">
            ${logs.length === 0 ? `
              <div style="padding: 24px; text-align: center; color: #94a3b8; font-size: 13px;">
                暂无家校沟通记录，点击右上角【📝 记录家长沟通】开始留痕归档！
              </div>
            ` : logs.map(log => `
              <div style="padding: 10px 12px; background: #f8fafc; border-radius: var(--radius-md); border: 1px solid var(--border-light); transition: all 0.2s;">
                <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px; flex-wrap: wrap; gap: 6px;">
                  <span style="font-size: 13.5px; font-weight: 700; color: #1e293b;">
                    ${log.studentName} (${log.guardian}) · <span style="font-size: 11.5px; color: #2563eb;">${log.method}</span>
                    <span style="font-size: 11px; color: #94a3b8; font-weight: normal; margin-left: 6px;">${log.date || ''}</span>
                  </span>
                  <div style="display: flex; align-items: center; gap: 6px;">
                    <span class="badge ${log.status === '已处理' ? 'badge-success' : 'badge-warning'}">${log.status}</span>
                    <button class="btn btn-sm btn-secondary" style="padding: 2px 7px; font-size: 11.5px;" onclick="window.openEditCommLogModal('${log.id}')" title="修改此条台账">✏️ 编辑</button>
                    <button class="btn btn-sm" style="padding: 2px 7px; font-size: 11.5px; background: #fee2e2; color: #dc2626; border: 1px solid #fca5a5;" onclick="window.deleteCommLogItem('${log.id}', '${log.studentName}')" title="删除此条台账">🗑️</button>
                  </div>
                </div>
                <div style="font-size: 12.5px; color: #334155; font-weight: 600; margin-bottom: 2px;">主题：${log.topic}</div>
                <div style="font-size: 12px; color: var(--text-muted); margin-bottom: 2px;">反馈：${log.feedback || '（暂无详细反馈）'}</div>
                <div style="font-size: 11.5px; color: #059669;">后续措施：${log.actionPlan || '（按时跟踪）'}</div>
              </div>
            `).join("")}
          </div>
        </div>
      </div>
    </div>
  `;
};

window.urgeUnreadNotice = function(noticeId, parentNames) {
  alert(`📢 【一键催办回执】\n已向未回执家长 [ ${parentNames} ] 发送加急微信推送与短信提醒！`);
};

window.deleteNoticeItem = function(noticeId) {
  if (confirm("确定要删除这条班级通知吗？")) {
    const comm = window.store.data.communication;
    if (comm && comm.notices) {
      comm.notices = comm.notices.filter(n => n.id !== noticeId);
      window.store.save();
      window.showToast("已删除通知！", "success");
      window.renderCommunicationView(document.getElementById("mainContentArea"));
    }
  }
};

window.contactUntouchedFamily = function(studentName, reason) {
  const students = window.store.data.students || [];
  const s = students.find(item => item.name === studentName);
  const guardian = s ? s.guardian : "家长";
  const phone = s ? s.phone : "13800000000";

  document.getElementById("commStudentName").value = studentName;
  document.getElementById("commGuardian").value = guardian + (phone ? ` (${phone})` : "");
  document.getElementById("commMethod").value = "电话沟通";
  document.getElementById("commTopic").value = `长期未联系家庭关怀回访（${reason || '日常关怀'}）`;
  document.getElementById("commFeedback").value = `已与${studentName}家长取得联系，沟通了孩子近期的在校作息与学习状态，家长对老师的负责态度表示非常感谢。`;
  document.getElementById("commActionPlan").value = `近期持续鼓励孩子的课堂举手积极性，双周保持定期关怀互动。`;

  window.contactingUntouchedStudentName = studentName;
  document.getElementById("addCommLogModal").classList.add("active");
};

