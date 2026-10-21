/**
 * 班主任工作台 - 底座管理：数据管理 (Data Management) & 班级设置 (Class Settings)
 * 包含：本地全量数据导出 JSON、导入备份还原、一键清空/重置演示数据、
 * 本地存储占用统计表、班级基础配置与班主任信息修改实时同步
 */

window.renderDataMgmtView = function(container) {
  const usage = window.store.getStorageUsage();

  container.innerHTML = `
    <div class="module-header">
      <div class="module-title-area">
        <h2>💾 数据管理与本地备份</h2>
        <p>所有班级数据均严格保存在本地浏览器中，换电脑前一键导出备份，导入即恢复，隐私无忧</p>
      </div>
      <div class="module-actions">
        <button class="btn btn-primary" onclick="window.store.exportBackupJSON()">📥 立即导出全部备份 (JSON)</button>
      </div>
    </div>

    <!-- 顶部三大数据操作卡片 -->
    <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-bottom: 20px;">
      <!-- 导出全部数据 -->
      <div class="card" style="padding: 20px; border-top: 4px solid #10b981;">
        <div style="font-size: 16px; font-weight: 800; color: #1e293b; margin-bottom: 6px;">
          📤 导出数据
        </div>
        <p style="font-size: 12.5px; color: var(--text-muted); margin-bottom: 16px;">
          将学生档案、考勤记录、历次成绩、班规与安全台账完整打包为本地 JSON 备份文件。
        </p>
        <button class="btn btn-success" style="width: 100%;" onclick="window.store.exportBackupJSON()">
          全部导出 (.json)
        </button>
      </div>

      <!-- 导入全量数据 -->
      <div class="card" style="padding: 20px; border-top: 4px solid #3b82f6;">
        <div style="font-size: 16px; font-weight: 800; color: #1e293b; margin-bottom: 6px;">
          📥 导入数据
        </div>
        <p style="font-size: 12.5px; color: var(--text-muted); margin-bottom: 16px;">
          更换电脑或重装浏览器后，选择此前导出的备份文件即可瞬间恢复所有数据。
        </p>
        <button class="btn btn-primary" style="width: 100%;" onclick="document.getElementById('backupJsonInput').click()">
          选择备份文件恢复
        </button>
        <input type="file" id="backupJsonInput" accept=".json" style="display:none;" onchange="window.handleBackupImport(event)">
      </div>

      <!-- 清空或重置数据 -->
      <div class="card" style="padding: 20px; border-top: 4px solid #ef4444;">
        <div style="font-size: 16px; font-weight: 800; color: #1e293b; margin-bottom: 6px;">
          🔄 重置 / 清空数据
        </div>
        <p style="font-size: 12.5px; color: var(--text-muted); margin-bottom: 16px;">
          一键还原为包含45名学生、真实课表与班务的完整初始示范数据集。
        </p>
        <button class="btn btn-danger" style="width: 100%;" onclick="window.handleResetDefault()">
          还原初始演示数据
        </button>
      </div>
    </div>

    <!-- 本地存储统计表格 -->
    <div class="card">
      <div class="panel-header">
        <div class="panel-title">📊 本地存储空间与数据条目占用统计</div>
        <span class="badge badge-info">当前总占用约 ${usage.kb} KB</span>
      </div>

      <div class="table-responsive">
        <table class="data-table">
          <thead>
            <tr>
              <th>数据模块</th>
              <th>记录条数</th>
              <th>存储空间</th>
              <th>存储状态</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style="font-weight: 700;">学生档案</td>
              <td>${usage.studentsCount} 条</td>
              <td>252.0 KB</td>
              <td><span class="badge badge-success">正常存储</span></td>
              <td><button class="btn btn-sm btn-secondary" onclick="window.store.exportStudentsExcel()">导出Excel</button></td>
            </tr>
            <tr>
              <td style="font-weight: 700;">今日班务</td>
              <td>${usage.tasksCount} 条</td>
              <td>12.5 KB</td>
              <td><span class="badge badge-success">正常存储</span></td>
              <td><button class="btn btn-sm btn-secondary" onclick="window.switchView('tasks')">查看</button></td>
            </tr>
            <tr>
              <td style="font-weight: 700;">考勤记录</td>
              <td>${usage.attendanceCount || '0 条'}</td>
              <td>${usage.attendanceCount && !usage.attendanceCount.startsWith('0') ? '81.0 KB' : '0.5 KB'}</td>
              <td><span class="badge badge-success">正常存储</span></td>
              <td><button class="btn btn-sm btn-secondary" onclick="window.store.exportAttendanceExcel()">导出Excel</button></td>
            </tr>
            <tr>
              <td style="font-weight: 700;">成绩学情记录</td>
              <td>${usage.examsCount} 场考试</td>
              <td>${usage.examsCount > 0 ? '33.6 KB' : '0.5 KB'}</td>
              <td><span class="badge badge-success">正常存储</span></td>
              <td><button class="btn btn-sm btn-secondary" onclick="window.switchView('exams')">查看</button></td>
            </tr>
            <tr>
              <td style="font-weight: 700;">1530 安全教育台账</td>
              <td>${usage.safetyCount} 条</td>
              <td>${usage.safetyCount > 0 ? '10.8 KB' : '0.5 KB'}</td>
              <td><span class="badge badge-success">正常存储</span></td>
              <td><button class="btn btn-sm btn-secondary" onclick="window.store.exportSafety1530Excel()">导出Excel</button></td>
            </tr>
            <tr>
              <td style="font-weight: 700;">班级量化与萌宠系统</td>
              <td>${usage.petsCount || 0} 只宠物</td>
              <td>${usage.petsCount > 0 ? '42.0 KB' : '0.5 KB'}</td>
              <td><span class="badge badge-success">正常存储</span></td>
              <td><button class="btn btn-sm btn-secondary" onclick="window.switchView('pets')">查看</button></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  `;
};

// 常见大模型服务商预设 (OpenAI 兼容协议)
const AI_PRESETS = [
  {
    id: "zhipu",
    name: "智谱 AI (GLM-4 / GLM-4-flash 推荐)",
    apiUrl: "https://open.bigmodel.cn/api/paas/v4",
    model: "glm-4-flash",
    hint: "国内主流首选，调用稳定，注册即赠数百万免费 Token"
  },
  {
    id: "qwen",
    name: "阿里通义千问 (Qwen-Turbo / Qwen-Plus)",
    apiUrl: "https://dashscope.aliyuncs.com/compatible-mode/v1",
    model: "qwen-turbo",
    hint: "阿里云百炼 OpenAI 兼容模式接口，响应迅速"
  },
  {
    id: "deepseek",
    name: "DeepSeek (V3 / R1 深度思考推理)",
    apiUrl: "https://api.deepseek.com/v1",
    model: "deepseek-chat",
    hint: "深度求索旗舰模型，中文文采与逻辑推理极佳"
  },
  {
    id: "openai",
    name: "OpenAI (GPT-4o-mini / GPT-4o)",
    apiUrl: "https://api.openai.com/v1",
    model: "gpt-4o-mini",
    hint: "国际通用标准接口，需国际网络环境"
  },
  {
    id: "kimi",
    name: "月之暗面 (Moonshot Kimi)",
    apiUrl: "https://api.moonshot.cn/v1",
    model: "moonshot-v1-8k",
    hint: "超长上下文，中文语感细腻生动"
  },
  {
    id: "ollama",
    name: "Ollama 本地私有化部署大模型",
    apiUrl: "http://localhost:11434/v1",
    model: "qwen2.5:7b",
    hint: "完全离线运行，无需外网，数据绝对隐私安全"
  },
  {
    id: "custom",
    name: "自定义第三方兼容接口 / 聚合网关",
    apiUrl: "",
    model: "",
    hint: "填入任意符合 OpenAI Chat Completions 规范的地址"
  }
];

// 班级设置与 AI 接口配置总视图
window.renderClassSettingsView = function(container) {
  const classInfo = window.store.data.classInfo || {};
  let teacher = classInfo.teacher;
  if (typeof teacher === 'string') {
    teacher = { name: teacher, role: "班主任 / 语文", phone: "138-0013-8000" };
  } else if (!teacher) {
    teacher = { name: "周老师", role: "班主任 / 语文", phone: "138-0013-8000" };
  }

  const aiConfig = window.store.getAIConfig ? window.store.getAIConfig() : (window.store.data.aiConfig || {});
  const availableModels = (aiConfig && Array.isArray(aiConfig.availableModels)) ? aiConfig.availableModels : [];
  const isAIConfigured = Boolean(aiConfig.apiUrl && aiConfig.apiUrl.trim() && aiConfig.apiKey && aiConfig.apiKey.trim());
  const prompts = window.store.getAIPrompts ? window.store.getAIPrompts() : (aiConfig.prompts || []);
  const activePromptId = aiConfig.activePromptId || (prompts[0] && prompts[0].id) || "";

  container.innerHTML = `
    <div class="module-header">
      <div class="module-title-area">
        <h2>⚙️ 班级设置 & 大模型接口配置</h2>
        <p>自定义学校与班级档案、学期安排、OpenAI 兼容多大模型 API 接口（智谱/千问/DeepSeek等）及评语系统提示词库</p>
      </div>
      <div class="module-actions">
        <button class="btn btn-primary" onclick="window.saveAllClassAndAISettings()">💾 保存全部设置</button>
      </div>
    </div>

    <!-- 卡片 1：基础班级档案与学期配置 -->
    <div class="card" style="padding: 24px; margin-bottom: 20px;">
      <div class="panel-header" style="margin-bottom: 16px; border-bottom: 1px solid var(--border-color); padding-bottom: 12px;">
        <div class="panel-title" style="display: flex; align-items: center; gap: 8px;">
          <span>🏫 班级基础档案与教师信息</span>
          <span class="badge badge-info">${classInfo.name || '班级信息'}</span>
        </div>
        <span class="panel-subtitle">保存后右上角与全站班级信息实时联动</span>
      </div>

      <div class="form-group">
        <label>学校名称</label>
        <input type="text" class="form-control" id="cfgSchool" value="${classInfo.school || '春晖实验小学'}">
      </div>

      <div class="form-row-2">
        <div class="form-group">
          <label>所属学段与年级</label>
          <input type="text" class="form-control" id="cfgGradeLevel" value="${classInfo.gradeLevel || '小学部 · 三年级'}">
        </div>
        <div class="form-group">
          <label>班级全称</label>
          <input type="text" class="form-control" id="cfgClassName" value="${classInfo.name || '三年级2班'}">
        </div>
      </div>

      <div class="form-row-3">
        <div class="form-group">
          <label>当前学期</label>
          <input type="text" class="form-control" id="cfgTerm" value="${classInfo.term || '2026年秋季学期'}">
        </div>
        <div class="form-group">
          <label>开学基准日 (教学周动态计算)</label>
          <input type="date" class="form-control" id="cfgTermStartDate" value="${classInfo.termStartDate || '2026-09-01'}">
        </div>
        <div class="form-group">
          <label>班级人数</label>
          <input type="number" class="form-control" id="cfgCount" value="${classInfo.studentCount || 45}" readonly style="background: #f1f5f9;">
        </div>
      </div>

      <div class="form-row-3">
        <div class="form-group">
          <label>班主任姓名 *</label>
          <input type="text" class="form-control" id="cfgTeacherName" value="${teacher.name || '周老师'}">
        </div>
        <div class="form-group">
          <label>角色职务/所教学科</label>
          <input type="text" class="form-control" id="cfgTeacherRole" value="${teacher.role || '班主任 / 语文'}">
        </div>
        <div class="form-group">
          <label>联系电话</label>
          <input type="text" class="form-control" id="cfgTeacherPhone" value="${teacher.phone || '138-0013-8000'}">
        </div>
      </div>

      <div class="form-row-2">
        <div class="form-group">
          <label>班级励志口号 / 班训</label>
          <input type="text" class="form-control" id="cfgSlogan" value="${classInfo.slogan || '博学笃行，乐学善思，团结进取'}">
        </div>
        <div class="form-group">
          <label>所在教室</label>
          <input type="text" class="form-control" id="cfgClassroom" value="${classInfo.classroom || '博学楼 302 教室'}">
        </div>
      </div>

      <div style="text-align: right; margin-top: 10px;">
        <button class="btn btn-secondary" onclick="window.saveClassSettings()">💾 保存班级基础档案</button>
      </div>
    </div>

    <!-- 卡片 2：大模型与 AI 评语引擎配置 (OpenAI 兼容协议) -->
    <div class="card" style="padding: 24px; margin-bottom: 20px; border: 1.5px solid #c7d2fe; background: linear-gradient(180deg, #ffffff 0%, #f8faff 100%);">
      <div class="panel-header" style="margin-bottom: 12px; border-bottom: 1px solid #e0e7ff; padding-bottom: 12px; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 10px;">
        <div class="panel-title" style="display: flex; align-items: center; gap: 10px;">
          <span style="font-size: 20px;">🤖</span>
          <span style="font-size: 16px; font-weight: 800; color: #1e1b4b;">大模型与 AI 评语引擎配置 (OpenAI 兼容协议)</span>
          ${isAIConfigured
            ? `<span class="badge" style="background: #dcfce7; color: #15803d; font-weight: 700;">● 已配置在线大模型</span>`
            : `<span class="badge" style="background: #f1f5f9; color: #475569; font-weight: 700;">○ 选填 · 未配置时使用本地全维启发引擎</span>`}
        </div>
        <div style="display: flex; align-items: center; gap: 8px;">
          <button class="btn btn-sm btn-secondary" onclick="window.testAIConnection()" id="btnTestAIConn" style="font-size: 12px; font-weight: 700;">
            ⚡ 测试连通性 (Ping)
          </button>
          <button class="btn btn-sm btn-primary" onclick="window.saveAIModelSettings()" style="font-size: 12px; font-weight: 700; background: #4f46e5;">
            💾 保存大模型配置
          </button>
        </div>
      </div>

      <!-- 教师独立私有配置标识横幅 -->
      <div style="background: #f5f3ff; border: 1px solid #ddd6fe; border-radius: 8px; padding: 10px 14px; margin-bottom: 14px; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 8px;">
        <div style="display: flex; align-items: center; gap: 8px;">
          <span style="font-size: 16px;">👤</span>
          <span style="font-size: 13px; font-weight: 700; color: #4c1d95;">
            当前专属配置教师：${(window.currentUser && (window.currentUser.realName || window.currentUser.name)) || '当前教师'} (${window.store.getCurrentUserKey ? window.store.getCurrentUserKey() : 'demo'})
          </span>
          <span style="font-size: 12px; color: #6b21a8; background: #ede9fe; padding: 1px 8px; border-radius: 10px; font-weight: 600;">
            ${(window.currentUser && window.currentUser.role === 'admin') ? '超级管理员' : ((window.currentUser && window.currentUser.subject) ? `${window.currentUser.subject}任课老师` : '班主任')}
          </span>
        </div>
        <div style="font-size: 12px; font-weight: 700; color: #5b21b6; background: #fff; border: 1px solid #c4b5fd; padding: 3px 10px; border-radius: 20px; display: flex; align-items: center; gap: 4px;">
          <span>🔒</span> 教师私有数据 · 独立隔离互不影响
        </div>
      </div>

      <!-- 说明与降级提示条 -->
      <div style="background: #eff6ff; border-radius: var(--radius-md); border: 1px solid #bfdbfe; padding: 12px 14px; margin-bottom: 16px; display: flex; align-items: flex-start; gap: 10px;">
        <span style="font-size: 18px; line-height: 1.3;">💡</span>
        <div style="font-size: 12.5px; color: #1e40af; line-height: 1.6;">
          <strong>接口兼容性说明：</strong>
          支持市场所有遵循 <strong>OpenAI Chat Completions</strong> 协议的大模型提供商（如智谱 AI、阿里通义千问、DeepSeek、OpenAI、Kimi、本地 unsloth / LM Studio / Ollama 等）。<br>
          <strong>独立隔离与选填支持：</strong>不同教师在班级设置中的 API 地址、密钥及模型均为<strong>独立隔离保存</strong>，相互切换账号互不影响。未填写时自动平滑降级使用本地内置规则引擎；填入后自动无缝联动专属大模型！所有网络请求均由本地服务端安全中转，杜绝浏览器跨域限制。
        </div>
      </div>

      <!-- 快速服务商预设 -->
      <div class="form-group" style="margin-bottom: 14px;">
        <label style="font-weight: 700; color: #334155; display: flex; align-items: center; justify-content: space-between;">
          <span>快速选择大模型服务商预设 (一键自动填入地址与模型名)：</span>
          <span id="presetHintText" style="font-size: 12px; font-weight: normal; color: #6366f1;"></span>
        </label>
        <select class="form-control" id="aiPresetSelect" onchange="window.applyAIPreset(this.value)" style="border-color: #a5b4fc; font-weight: 600; color: #1e1b4b;">
          ${AI_PRESETS.map(p => `
            <option value="${p.id}" ${((aiConfig.provider === p.id) || (!aiConfig.provider && p.id === "zhipu")) ? "selected" : ""}>
              ${p.name}
            </option>
          `).join("")}
        </select>
      </div>

      <div class="form-row-2">
        <div class="form-group">
          <label style="font-weight: 700; color: #334155;">API 接口基准地址 (Base URL) *</label>
          <input type="text" class="form-control" id="aiApiUrl" value="${aiConfig.apiUrl || ''}" placeholder="例如: https://open.bigmodel.cn/api/paas/v4 或 http://127.0.0.1:8888/v1" style="font-family: monospace; font-size: 13px;">
          <div style="font-size: 11px; color: #64748b; margin-top: 3px;">OpenAI 兼容端点地址，系统将自动向 /chat/completions 发送对话请求</div>
        </div>

        <div class="form-group">
          <label style="font-weight: 700; color: #334155; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 6px;">
            <span>大模型名称 (Model) *</span>
            <button type="button" class="btn btn-sm" onclick="window.fetchUpstreamModels()" id="btnFetchModels" style="font-size: 11.5px; padding: 2px 10px; background: #eef2ff; color: #4338ca; border: 1.5px solid #c7d2fe; font-weight: 700; border-radius: 4px; display: inline-flex; align-items: center; gap: 4px; cursor: pointer;" title="根据当前填写的 API 地址与密钥，实时向服务商拉取所有可用模型列表">
              <span id="btnFetchModelsIcon">🔄</span> 一键获取上游所有模型名称
            </button>
          </label>
          <div style="display: flex; gap: 6px;">
            <div style="flex: 1; position: relative;">
              <input type="text" class="form-control" id="aiModel" list="aiModelDatalist" value="${aiConfig.model || 'glm-4-flash'}" placeholder="例如: glm-4-flash，可手动输入或从右侧下拉选择" style="font-family: monospace; font-size: 13px;">
              <datalist id="aiModelDatalist">
                ${availableModels.map(m => `<option value="${m}">${m.includes(':') ? m.replace(':', ' (') + ')' : m}</option>`).join("")}
              </datalist>
            </div>
            <select class="form-control" id="aiModelSelectDropdown" onchange="window.handleModelDropdownSelect(this.value)" style="width: auto; min-width: 140px; max-width: 250px; font-size: 12px; font-weight: 600; color: #4338ca; background: #f5f3ff; border-color: #c7d2fe; cursor: pointer; ${availableModels.length > 0 ? '' : 'display: none;'}" title="点击展开下拉选择获取到的模型">
              <option value="">▼ 下拉选择模型 ${availableModels.length > 0 ? '(' + availableModels.length + ')' : ''}</option>
              ${availableModels.map(m => {
                const label = m.includes(':') ? m.replace(':', ' (') + ')' : m;
                return `<option value="${m}" ${m === aiConfig.model ? 'selected' : ''}>${label}</option>`;
              }).join("")}
            </select>
          </div>
          <div style="font-size: 11px; color: #64748b; margin-top: 3px; display: flex; align-items: center; justify-content: space-between;">
            <span id="aiModelHintText">${availableModels.length > 0 ? `已获取 ${availableModels.length} 个上游模型，输入框支持输入或从右侧下拉快速选用` : '需填入对应服务商开放支持的模型 ID，填入地址与密钥后可点击上方一键获取'}</span>
            <span id="aiModelCountBadge" style="color: #4f46e5; font-weight: 700; ${availableModels.length > 0 ? '' : 'display: none;'}">${availableModels.length > 0 ? '✓ 已同步 ' + availableModels.length + ' 个' : ''}</span>
          </div>
        </div>
      </div>

      <div class="form-group">
        <label style="font-weight: 700; color: #334155;">API 访问密钥 (API Key / Token)</label>
        <div style="display: flex; gap: 8px;">
          <input type="password" class="form-control" id="aiApiKey" value="${aiConfig.apiKey || ''}" placeholder="填入服务商颁发的 API Key (选填，留空则使用本地引擎)" style="font-family: monospace; font-size: 13px;">
          <button type="button" class="btn btn-secondary" onclick="window.toggleApiKeyVisibility()" id="btnToggleKeyVis" title="切换密码明文/暗文" style="flex-shrink: 0; padding: 0 14px;">
            👁️ 显示
          </button>
        </div>
        <div style="font-size: 11px; color: #64748b; margin-top: 3px;">密钥存储在您的本地班级配置中，不会泄露至外部网络</div>
      </div>

      <!-- 高级参数调节 (温度 & Tokens) -->
      <div class="form-row-2" style="margin-top: 10px; padding: 12px; background: #f8fafc; border-radius: var(--radius-md); border: 1px solid var(--border-color);">
        <div class="form-group" style="margin-bottom: 0;">
          <label style="font-size: 12.5px; color: #475569; display: flex; justify-content: space-between;">
            <span>生成创意度 (Temperature):</span>
            <strong id="tempDisplay" style="color: #4f46e5;">${aiConfig.temperature || 0.7}</strong>
          </label>
          <input type="range" class="form-range" id="aiTemperature" min="0.1" max="1.0" step="0.05" value="${aiConfig.temperature || 0.7}" oninput="document.getElementById('tempDisplay').innerText = this.value" style="width: 100%;">
          <div style="font-size: 11px; color: #94a3b8;">数值越低越严谨稳妥，数值越高文采表达越丰富多样</div>
        </div>
        <div class="form-group" style="margin-bottom: 0;">
          <label style="font-size: 12.5px; color: #475569;">单次生成最大 Token 上限</label>
          <input type="number" class="form-control" id="aiMaxTokens" value="${aiConfig.maxTokens || 1200}" min="200" max="4000" step="100" style="padding: 4px 8px; font-size: 13px;">
          <div style="font-size: 11px; color: #94a3b8;">控制评语生成最大篇幅长度，推荐 1000~1500</div>
        </div>
      </div>

      <!-- 测试连通性状态提示区域 -->
      <div id="aiTestStatusArea" style="margin-top: 14px; display: none;"></div>
    </div>

    <!-- 卡片 3：AI 评语系统提示词库管理 -->
    <div class="card" id="aiPromptsSettingsCard" style="padding: 24px;">
      <div class="panel-header" style="margin-bottom: 16px; border-bottom: 1px solid var(--border-color); padding-bottom: 12px; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 10px;">
        <div>
          <div class="panel-title" style="display: flex; align-items: center; gap: 8px;">
            <span>📝 AI 评语系统提示词库 (System Prompts)</span>
            <span class="badge badge-purple">${prompts.length} 套专业模板</span>
          </div>
          <p style="font-size: 12px; color: var(--text-muted); margin-top: 4px;">
            班主任撰写评语时大模型所遵循的角色定位、核心评价导向与段落结构规范。支持自选、修改或添加自定义提示词。
          </p>
        </div>
        <button class="btn btn-primary" onclick="window.openAIPromptEditModal(null)" style="background: linear-gradient(135deg, #7c3aed, #4f46e5); font-weight: 700;">
          ➕ 新增自定义系统提示词
        </button>
      </div>

      <div style="display: flex; flex-direction: column; gap: 12px;">
        ${prompts.map(p => {
          const isActive = p.id === activePromptId;
          const snippet = (p.content || "").replace(/\n/g, " ").slice(0, 110) + "...";
          return `
            <div style="border: 1.5px solid ${isActive ? '#818cf8' : 'var(--border-color)'}; background: ${isActive ? '#f5f3ff' : '#ffffff'}; border-radius: var(--radius-md); padding: 14px 16px; transition: all 0.2s; display: flex; align-items: flex-start; justify-content: space-between; gap: 14px;">
              <div style="flex: 1;">
                <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px;">
                  <span style="font-size: 15px; font-weight: 800; color: #1e1b4b;">${p.title}</span>
                  <span class="badge" style="background: #ede9fe; color: #6d28d9; font-size: 11px;">${p.category || '综合评价'}</span>
                  ${p.isDefault ? `<span class="badge" style="background: #e0f2fe; color: #0284c7; font-size: 10.5px;">系统内置</span>` : `<span class="badge" style="background: #fef3c7; color: #d97706; font-size: 10.5px;">自定义</span>`}
                  ${isActive ? `<span class="badge badge-success" style="font-weight: 700;">🌟 当前启用</span>` : ''}
                </div>
                <div style="font-size: 12.5px; color: #475569; line-height: 1.5; font-family: sans-serif; background: rgba(0,0,0,0.02); padding: 8px 10px; border-radius: 4px; border: 1px dashed rgba(0,0,0,0.08);">
                  ${snippet}
                </div>
              </div>
              <div style="display: flex; flex-direction: column; gap: 6px; flex-shrink: 0;">
                ${isActive ? `
                  <button class="btn btn-sm btn-success" disabled style="font-size: 11.5px; padding: 4px 10px; cursor: default;">✓ 正在使用</button>
                ` : `
                  <button class="btn btn-sm btn-primary" onclick="window.setActiveAIPromptItem('${p.id}')" style="font-size: 11.5px; padding: 4px 10px;">设为默认选用</button>
                `}
                <button class="btn btn-sm btn-secondary" onclick="window.openAIPromptEditModal('${p.id}')" style="font-size: 11.5px; padding: 4px 10px;">✏️ 编辑模板</button>
                ${!p.isDefault ? `
                  <button class="btn btn-sm" onclick="window.deleteAIPromptItem('${p.id}')" style="background: #fee2e2; color: #dc2626; border: 1px solid #fca5a5; font-size: 11.5px; padding: 4px 10px;">🗑️ 删除</button>
                ` : ''}
              </div>
            </div>
          `;
        }).join("")}
      </div>
    </div>
  `;

  // 初始化预设提示文案
  const initPresetId = aiConfig.provider || "zhipu";
  const preset = AI_PRESETS.find(p => p.id === initPresetId);
  const hintEl = document.getElementById("presetHintText");
  if (hintEl && preset) hintEl.innerText = preset.hint || "";
};

// 切换大模型服务商快捷预设
window.applyAIPreset = function(presetId) {
  const preset = AI_PRESETS.find(p => p.id === presetId);
  if (!preset) return;
  const hintEl = document.getElementById("presetHintText");
  if (hintEl) hintEl.innerText = preset.hint || "";

  if (preset.apiUrl) {
    document.getElementById("aiApiUrl").value = preset.apiUrl;
  }
  if (preset.model) {
    document.getElementById("aiModel").value = preset.model;
  }
  window.showToast(`已切换为【${preset.name}】预设参数`, "info");
};

// 切换 API Key 密码明文/掩码状态
window.toggleApiKeyVisibility = function() {
  const keyInput = document.getElementById("aiApiKey");
  const btn = document.getElementById("btnToggleKeyVis");
  if (!keyInput || !btn) return;
  if (keyInput.type === "password") {
    keyInput.type = "text";
    btn.innerHTML = "🙈 隐藏";
  } else {
    keyInput.type = "password";
    btn.innerHTML = "👁️ 显示";
  }
};

// 测试大模型连通性 (后端代理请求，彻底解决 CORS 跨域)
window.testAIConnection = function() {
  const apiUrl = (document.getElementById("aiApiUrl").value || "").trim();
  const apiKey = (document.getElementById("aiApiKey").value || "").trim();
  const model = (document.getElementById("aiModel").value || "").trim();
  const statusArea = document.getElementById("aiTestStatusArea");
  const btn = document.getElementById("btnTestAIConn");

  if (!apiUrl) {
    window.showToast("请先填写 API 接口基准地址 (URL)", "warning");
    if (statusArea) {
      statusArea.style.display = "block";
      statusArea.innerHTML = `
        <div style="background: #fffbeb; border: 1px solid #fef3c7; border-radius: 6px; padding: 10px 14px; color: #b45309; font-size: 13px;">
          ⚠️ 请先输入 API 接口地址后再进行连通性测试。
        </div>
      `;
    }
    return;
  }

  if (statusArea) {
    statusArea.style.display = "block";
    statusArea.innerHTML = `
      <div style="background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 6px; padding: 10px 14px; color: #0284c7; font-size: 13px; display: flex; align-items: center; gap: 8px;">
        <span class="spinner" style="display:inline-block; width:14px; height:14px; border:2px solid #0284c7; border-top-color:transparent; border-radius:50%; animation: spin 0.8s linear infinite;"></span>
        正在向目标模型 【${model || '默认模型'}】 发送测试探测包，请稍候...
      </div>
    `;
  }
  if (btn) btn.disabled = true;

  fetch("/api/ai/test", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ apiUrl, apiKey, model })
  })
  .then(res => res.json())
  .then(res => {
    if (btn) btn.disabled = false;
    if (res.success) {
      if (statusArea) {
        statusArea.innerHTML = `
          <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 6px; padding: 12px 14px; color: #15803d; font-size: 13px;">
            <div style="font-weight: 700; margin-bottom: 4px; display: flex; align-items: center; gap: 6px;">
              <span>✅ 连通性测试成功！大模型就绪</span>
              <span class="badge" style="background: #bbf7d0; color: #166534;">响应延迟 ${res.latencyMs || 0}ms</span>
            </div>
            <div>大模型探测回复：<em>"${res.reply || '连接成功'}"</em></div>
          </div>
        `;
      }
      window.showToast(`连通性测试成功！响应延迟 ${res.latencyMs || 0}ms`, "success");
    } else {
      if (statusArea) {
        statusArea.innerHTML = `
          <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 6px; padding: 12px 14px; color: #b91c1c; font-size: 13px;">
            <div style="font-weight: 700; margin-bottom: 4px;">❌ 连接测试失败</div>
            <div>${res.message || '请检查 API 地址、API 密钥是否正确，或网络是否通畅。'}</div>
          </div>
        `;
      }
      window.showToast(`连接测试失败: ${res.message || '网络异常'}`, "danger");
    }
  })
  .catch(err => {
    if (btn) btn.disabled = false;
    if (statusArea) {
      statusArea.innerHTML = `
        <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 6px; padding: 12px 14px; color: #b91c1c; font-size: 13px;">
          <div style="font-weight: 700; margin-bottom: 4px;">❌ 本地服务代理异常</div>
          <div>无法连接本地服务 proxy: ${err.message}</div>
        </div>
      `;
    }
    window.showToast(`测试请求发送失败: ${err.message}`, "danger");
  });
};

// 一键获取上游所有模型名称
window.fetchUpstreamModels = function() {
  const apiUrl = (document.getElementById("aiApiUrl").value || "").trim();
  const apiKey = (document.getElementById("aiApiKey").value || "").trim();
  const btn = document.getElementById("btnFetchModels");
  const hintText = document.getElementById("aiModelHintText");
  const countBadge = document.getElementById("aiModelCountBadge");
  const selectEl = document.getElementById("aiModelSelectDropdown");
  const datalistEl = document.getElementById("aiModelDatalist");
  const modelInput = document.getElementById("aiModel");

  if (!apiUrl) {
    window.showToast("请先填写左侧的 API 接口基准地址 (Base URL)", "warning");
    document.getElementById("aiApiUrl").focus();
    return;
  }

  if (btn) {
    btn.disabled = true;
    btn.innerHTML = `<span class="spinner" style="display:inline-block; width:12px; height:12px; border:2px solid #4338ca; border-top-color:transparent; border-radius:50%; animation: spin 0.8s linear infinite;"></span> 正在获取模型列表中...`;
  }

  fetch("/api/ai/models", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ apiUrl, apiKey })
  })
  .then(res => res.json())
  .then(res => {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = `<span>🔄</span> 一键获取上游所有模型名称`;
    }

    if (res.success && Array.isArray(res.models) && res.models.length > 0) {
      const models = res.models;
      // 缓存至当前教师专属 store
      if (window.store && window.store.saveAIConfig) {
        const curAI = window.store.getAIConfig ? window.store.getAIConfig() : {};
        curAI.availableModels = models;
        window.store.saveAIConfig(curAI);
      } else if (window.store && window.store.data && window.store.data.aiConfig) {
        window.store.data.aiConfig.availableModels = models;
        window.store.save();
      }

      // 动态装填下拉框 (带量化后缀友好展示)
      if (selectEl) {
        selectEl.innerHTML = `
          <option value="">▼ 下拉选择模型 (${models.length})</option>
          ${models.map(m => {
            const label = m.includes(':') ? m.replace(':', ' (') + ')' : m;
            return `<option value="${m}" ${m === modelInput.value ? 'selected' : ''}>${label}</option>`;
          }).join("")}
        `;
        selectEl.style.display = "block";
      }

      // 动态装填 datalist
      if (datalistEl) {
        datalistEl.innerHTML = models.map(m => {
          const label = m.includes(':') ? m.replace(':', ' (') + ')' : m;
          return `<option value="${m}">${label}</option>`;
        }).join("");
      }

      // 若当前输入框为空，选中匹配或第一个模型
      if (!modelInput.value || !models.includes(modelInput.value)) {
        const matched = models.find(m => m.includes("flash") || m.includes("chat") || m.includes("turbo") || m.includes("plus")) || models[0];
        if (matched) {
          modelInput.value = matched;
          if (selectEl) selectEl.value = matched;
        }
      }

      if (hintText) {
        hintText.innerText = `成功获取到 ${models.length} 个上游可用模型，可在输入框输入或右侧下拉快速选用！`;
      }
      if (countBadge) {
        countBadge.style.display = "inline";
        countBadge.innerText = `✓ 已同步 ${models.length} 个模型`;
      }

      window.showToast(`成功获取到 ${models.length} 个上游模型！已支持下拉选择`, "success");
    } else {
      const errMsg = res.message || "未能获取到上游模型列表";
      window.showToast(errMsg, "danger");
      if (hintText) {
        hintText.innerText = `获取失败: ${errMsg} (部分服务商要求必须填写有效 API Key 才能查询)`;
      }
    }
  })
  .catch(err => {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = `<span>🔄</span> 一键获取上游所有模型名称`;
    }
    window.showToast(`请求服务商模型列表失败: ${err.message}`, "danger");
  });
};

// 下拉选择模型名称时同步填入输入框
window.handleModelDropdownSelect = function(val) {
  if (!val) return;
  const modelInput = document.getElementById("aiModel");
  if (modelInput) {
    modelInput.value = val;
    window.showToast(`已选用模型: ${val}`, "info");
  }
};

// 保存大模型配置 (基于当前教师独立私有分槽保存)
window.saveAIModelSettings = function() {
  const provider = document.getElementById("aiPresetSelect").value;
  const apiUrl = (document.getElementById("aiApiUrl").value || "").trim();
  const apiKey = (document.getElementById("aiApiKey").value || "").trim();
  const model = (document.getElementById("aiModel").value || "").trim();
  const temperature = parseFloat(document.getElementById("aiTemperature").value) || 0.7;
  const maxTokens = parseInt(document.getElementById("aiMaxTokens").value) || 1200;

  const prevConfig = (window.store.getAIConfig ? window.store.getAIConfig() : window.store.data.aiConfig) || {};

  window.store.saveAIConfig({
    ...prevConfig,
    provider,
    apiUrl,
    apiKey,
    model,
    temperature,
    maxTokens,
    enabled: Boolean(apiUrl && apiKey)
  });

  const teacherDisplayName = (window.currentUser && (window.currentUser.realName || window.currentUser.name)) || "当前教师";
  window.showToast(
    apiUrl && apiKey
      ? `【${teacherDisplayName}】专属大模型配置已保存！已启用【${model || '在线大模型'}】深度联动`
      : `【${teacherDisplayName}】大模型配置已更新（未填完整，自动降级为内置全维规则引擎）`,
    "success"
  );

  const container = document.getElementById("viewContainer");
  if (container) window.renderClassSettingsView(container);
};

// 保存班级基础设置
window.saveClassSettings = function() {
  const ci = window.store.data.classInfo;
  ci.school = document.getElementById("cfgSchool").value.trim();
  ci.gradeLevel = document.getElementById("cfgGradeLevel").value.trim();
  ci.name = document.getElementById("cfgClassName").value.trim();
  ci.term = document.getElementById("cfgTerm").value.trim();
  const termStartEl = document.getElementById("cfgTermStartDate");
  if (termStartEl && termStartEl.value) {
    ci.termStartDate = termStartEl.value.trim();
  }
  if (!ci.teacher) ci.teacher = {};
  ci.teacher.name = document.getElementById("cfgTeacherName").value.trim() || "周老师";
  ci.teacher.role = document.getElementById("cfgTeacherRole").value.trim() || "班主任 / 语文";
  ci.teacher.phone = document.getElementById("cfgTeacherPhone").value.trim();
  ci.slogan = document.getElementById("cfgSlogan").value.trim();
  ci.classroom = document.getElementById("cfgClassroom").value.trim();

  window.store.save();
  window.updateTopbarInfo();
  window.showToast(`班级基础设置已更新！右上角教师信息已同步为【${ci.teacher.name}】`, "success");
};

// 保存全部设置 (班级 + 大模型)
window.saveAllClassAndAISettings = function() {
  window.saveClassSettings();
  window.saveAIModelSettings();
};

// 刷新评语生成助手弹窗中的系统提示词下拉菜单
window.refreshAIPingyuPromptSelect = function(selectedId) {
  const promptSelect = document.getElementById("aiPingyuPromptSelect");
  if (!promptSelect) return;
  const prompts = window.store.getAIPrompts ? window.store.getAIPrompts() : [];
  const aiCfg = window.store.getAIConfig ? window.store.getAIConfig() : {};
  const activeId = selectedId || promptSelect.value || aiCfg.activePromptId || (prompts[0] && prompts[0].id) || "";
  promptSelect.innerHTML = prompts.map(p => `
    <option value="${p.id}" ${p.id === activeId ? "selected" : ""}>
      ${p.title} (${p.category || '综合'})
    </option>
  `).join("");
  promptSelect.value = activeId;
};

// 设为当前启用的系统提示词
window.setActiveAIPromptItem = function(promptId) {
  window.store.setActiveAIPrompt(promptId);
  window.showToast("已将此模板设为默认系统提示词！", "success");
  window.refreshAIPingyuPromptSelect(promptId);
  if (document.getElementById("aiPromptManagerModal")?.classList.contains("active")) {
    window.renderAIPromptManagerList();
  }
  const container = document.getElementById("mainContentArea") || document.getElementById("viewContainer");
  if (container && window.currentView === "settings") window.renderClassSettingsView(container);
};

// 删除自定义系统提示词
window.deleteAIPromptItem = function(promptId) {
  if (confirm("确定要删除此自定义系统提示词模板吗？")) {
    try {
      window.store.deleteAIPrompt(promptId);
      window.showToast("已成功删除该提示词模板", "success");
      window.refreshAIPingyuPromptSelect();
      if (document.getElementById("aiPromptManagerModal")?.classList.contains("active")) {
        window.renderAIPromptManagerList();
      }
      const container = document.getElementById("mainContentArea") || document.getElementById("viewContainer");
      if (container && window.currentView === "settings") window.renderClassSettingsView(container);
    } catch (e) {
      window.showToast(e.message || "删除失败", "danger");
    }
  }
};

// ==================== AI 评语系统提示词库集中管理浮层/弹窗 ====================

window.openAIPromptManagerModal = function() {
  const modal = document.getElementById("aiPromptManagerModal");
  if (!modal) return;
  const searchInput = document.getElementById("aiPromptSearchInput");
  if (searchInput) searchInput.value = "";
  window.renderAIPromptManagerList();
  modal.classList.add("active");
};

window.closeAIPromptManagerModal = function() {
  const modal = document.getElementById("aiPromptManagerModal");
  if (modal) modal.classList.remove("active");
};

window.renderAIPromptManagerList = function() {
  const container = document.getElementById("aiPromptManagerListContainer");
  if (!container) return;

  const prompts = window.store.getAIPrompts ? window.store.getAIPrompts() : [];
  const aiCfg = window.store.getAIConfig ? window.store.getAIConfig() : {};
  
  // 优先获取当前评语生成器下拉框中正在选中的 promptId
  const promptSelect = document.getElementById("aiPingyuPromptSelect");
  const activePromptId = (promptSelect && promptSelect.value) || aiCfg.activePromptId || (prompts[0] && prompts[0].id) || "";

  const searchVal = (document.getElementById("aiPromptSearchInput")?.value || "").trim().toLowerCase();
  const filtered = prompts.filter(p => {
    if (!searchVal) return true;
    return (p.title || "").toLowerCase().includes(searchVal) ||
           (p.category || "").toLowerCase().includes(searchVal) ||
           (p.content || "").toLowerCase().includes(searchVal);
  });

  const countBadge = document.getElementById("aiPromptManagerCountBadge");
  if (countBadge) {
    countBadge.innerText = `${prompts.length} 套专业模板`;
  }

  if (filtered.length === 0) {
    container.innerHTML = `
      <div style="padding: 30px; text-align: center; color: #94a3b8; background: #f8fafc; border: 1px dashed #cbd5e1; border-radius: 8px; font-size: 13px;">
        未匹配到符合关键词的系统提示词模板，请换个词重试或点击右上角【➕ 新增自定义提示词】
      </div>
    `;
    return;
  }

  container.innerHTML = filtered.map(p => {
    const isActive = p.id === activePromptId;
    const snippet = (p.content || "").replace(/\n/g, " ").slice(0, 110) + "...";
    return `
      <div class="card prompt-item-card" style="border: 1.5px solid ${isActive ? '#818cf8' : '#e2e8f0'}; background: ${isActive ? '#f5f3ff' : '#ffffff'}; border-radius: 8px; padding: 12px 14px; display: flex; flex-direction: column; gap: 8px; transition: all 0.2s;">
        <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 8px;">
          <div style="display: flex; align-items: center; gap: 8px;">
            <span style="font-size: 14.5px; font-weight: 800; color: #1e1b4b;">${p.title}</span>
            <span class="badge" style="background: #ede9fe; color: #6d28d9; font-size: 11px; font-weight: 600;">${p.category || '综合评价'}</span>
            ${p.isDefault ? `<span class="badge" style="background: #e0f2fe; color: #0284c7; font-size: 10.5px;">系统内置</span>` : `<span class="badge" style="background: #fef3c7; color: #d97706; font-size: 10.5px;">自定义</span>`}
            ${isActive ? `<span class="badge badge-success" style="font-weight: 700;">🌟 当前选用中</span>` : ''}
          </div>
          <div style="display: flex; align-items: center; gap: 6px;">
            ${isActive ? `
              <button class="btn btn-sm btn-success" disabled style="font-size: 11.5px; padding: 3px 10px; cursor: default;">✓ 当前选用中</button>
            ` : `
              <button class="btn btn-sm btn-primary" onclick="window.selectAIPromptFromManager('${p.id}')" style="font-size: 11.5px; padding: 3px 10px; font-weight: 700; background: #6366f1;">🎯 选用此模板</button>
            `}
            <button class="btn btn-sm btn-secondary" onclick="window.openAIPromptEditModal('${p.id}')" style="font-size: 11.5px; padding: 3px 8px;">✏️ 编辑</button>
            ${!p.isDefault ? `
              <button class="btn btn-sm" onclick="window.deleteAIPromptFromManager('${p.id}')" style="background: #fee2e2; color: #dc2626; border: 1px solid #fca5a5; font-size: 11.5px; padding: 3px 8px;" title="删除此自定义模板">🗑️</button>
            ` : ''}
          </div>
        </div>

        <div style="font-size: 12px; color: #475569; line-height: 1.5; background: rgba(0,0,0,0.02); padding: 8px 10px; border-radius: 6px; border: 1px dashed rgba(0,0,0,0.08);">
          ${snippet}
        </div>
      </div>
    `;
  }).join("");
};

window.selectAIPromptFromManager = function(promptId) {
  window.store.setActiveAIPrompt(promptId);
  window.refreshAIPingyuPromptSelect(promptId);
  window.closeAIPromptManagerModal();

  const prompts = window.store.getAIPrompts ? window.store.getAIPrompts() : [];
  const target = prompts.find(p => p.id === promptId);
  window.showToast(`已成功选用【${target ? target.title : '指定'}】提示词模板！`, "success");

  // 若评语生成助手窗口处于活动状态，使用系统评分系统重新生成当前学生的评语（不自动调用大模型）
  if (document.getElementById("aiPingyuModal")?.classList.contains("active")) {
    if (window.generateSystemPingyu) {
      window.generateSystemPingyu({ silent: true });
    } else {
      window.generateAIPingyu(false);
    }
  }
};

window.deleteAIPromptFromManager = function(promptId) {
  if (confirm("确定要删除此自定义系统提示词模板吗？")) {
    try {
      window.store.deleteAIPrompt(promptId);
      window.showToast("已成功删除该提示词模板", "success");
      window.renderAIPromptManagerList();
      window.refreshAIPingyuPromptSelect();
      const container = document.getElementById("mainContentArea") || document.getElementById("viewContainer");
      if (container && window.currentView === "settings") window.renderClassSettingsView(container);
    } catch (e) {
      window.showToast(e.message || "删除失败", "danger");
    }
  }
};

window.goToClassSettingsPrompts = function() {
  if (window.closeAIPromptManagerModal) window.closeAIPromptManagerModal();
  if (window.closeAIPingyuModal) window.closeAIPingyuModal();
  if (window.switchView) window.switchView("settings", "aiPromptsSettingsCard");
};

// 打开系统提示词新增/编辑弹窗
window.openAIPromptEditModal = function(promptId) {
  const modal = document.getElementById("aiPromptEditModal");
  if (!modal) return;
  const titleInput = document.getElementById("aiPromptEditTitle");
  const catInput = document.getElementById("aiPromptEditCategory");
  const contentInput = document.getElementById("aiPromptEditContent");
  const idInput = document.getElementById("aiPromptEditId");
  const modalTitle = document.getElementById("aiPromptModalTitle");

  if (promptId) {
    const prompts = window.store.getAIPrompts();
    const target = prompts.find(p => p.id === promptId);
    if (target) {
      if (modalTitle) modalTitle.innerText = "✏️ 编辑系统提示词模板";
      if (idInput) idInput.value = target.id;
      if (titleInput) titleInput.value = target.title;
      if (catInput) catInput.value = target.category || "综合评价";
      if (contentInput) contentInput.value = target.content;
    }
  } else {
    if (modalTitle) modalTitle.innerText = "➕ 新增自定义系统提示词";
    if (idInput) idInput.value = "";
    if (titleInput) titleInput.value = "";
    if (catInput) catInput.value = "自定义评价";
    if (contentInput) contentInput.value = "你是一位资深优秀的小学班主任。请根据该学生的全维成长画像数据（包含基本信息、学科历次成绩、考勤出勤、日常作业、小红花表现等），为该学生撰写一份充满温暖关怀与明确成长方向的评语。\n\n【撰写要求】：\n1. 重点突出真实闪光点，针对薄弱环节提出具有针对性、温和可行的具体建议；\n2. 语言亲切诚恳、立德树人，符合小学生心理特征；\n3. 篇幅 200 字左右。";
  }

  modal.classList.add("active");
};

window.closeAIPromptEditModal = function() {
  const modal = document.getElementById("aiPromptEditModal");
  if (modal) modal.classList.remove("active");
};

// 从弹窗提交保存系统提示词
window.saveAIPromptFromModal = function() {
  const id = (document.getElementById("aiPromptEditId").value || "").trim();
  const title = (document.getElementById("aiPromptEditTitle").value || "").trim();
  const category = (document.getElementById("aiPromptEditCategory").value || "").trim();
  const content = (document.getElementById("aiPromptEditContent").value || "").trim();

  if (!title) {
    window.showToast("请输入系统提示词标题！", "warning");
    return;
  }
  if (!content) {
    window.showToast("请输入系统提示词核心内容！", "warning");
    return;
  }

  let savedId = id;
  if (id) {
    window.store.updateAIPrompt(id, { title, category, content });
    window.showToast(`系统提示词【${title}】已更新！`, "success");
  } else {
    const newP = window.store.addAIPrompt({ title, category, content });
    savedId = newP.id;
    window.store.setActiveAIPrompt(newP.id);
    window.showToast(`自定义提示词【${title}】已创建并设为默认启用！`, "success");
  }

  window.closeAIPromptEditModal();
  window.refreshAIPingyuPromptSelect(savedId);
  if (document.getElementById("aiPromptManagerModal")?.classList.contains("active")) {
    window.renderAIPromptManagerList();
  }
  const container = document.getElementById("mainContentArea") || document.getElementById("viewContainer");
  if (container && window.currentView === "settings") window.renderClassSettingsView(container);
};

window.handleBackupImport = function(event) {
  const file = event.target.files[0];
  if (!file) return;

  window.store.importBackupJSON(file, (success, msg) => {
    if (success) {
      window.showToast(msg, "success");
      setTimeout(() => { location.reload(); }, 600);
    } else {
      alert(msg);
    }
  });
};

window.handleResetDefault = function() {
  if (confirm("⚠️ 确定要重置并恢复到初始预置演示数据吗？当前新增的内容将被覆盖！")) {
    window.store.resetToDefault();
    window.showToast("已恢复到出厂预置演示数据！", "success");
    setTimeout(() => { location.reload(); }, 600);
  }
};
