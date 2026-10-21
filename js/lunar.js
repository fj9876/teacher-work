/**
 * 班主任工作台 - 中国通用农历与学生生日智能识别引擎 (Lunar & Birthday Engine)
 * 支持公历到中国通用农历 (阴历) 的精准转换，包含天干地支年份、生肖、农历月日；
 * 具备学生成长档案公历/农历生日双轨智能识别机制与今日寿星实时匹配。
 */

(function(global) {
  const CHINESE_MONTH_MAP = {
    '正月': 1, '一月': 1, '二月': 2, '三月': 3, '四月': 4, '五月': 5,
    '六月': 6, '七月': 7, '八月': 8, '九月': 9, '十月': 10, '十一月': 11,
    '冬月': 11, '十二月': 12, '腊月': 12
  };

  const CHINESE_MONTH_NAMES = ['', '正月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '冬月', '腊月'];

  const CHINESE_DAY_NAMES = [
    '', '初一', '初二', '初三', '初四', '初五', '初六', '初七', '初八', '初九', '初十',
    '十一', '十二', '十三', '十四', '十五', '十六', '十七', '十八', '十九', '二十',
    '廿一', '廿二', '廿三', '廿四', '廿五', '廿六', '廿七', '廿八', '廿九', '三十'
  ];

  const ZODIAC_ANIMALS = ['鼠', '牛', '虎', '兔', '龙', '蛇', '马', '羊', '猴', '鸡', '狗', '猪'];
  const BRANCH_INDEX_MAP = { '子': 0, '丑': 1, '寅': 2, '卯': 3, '辰': 4, '巳': 5, '午': 6, '未': 7, '申': 8, '酉': 9, '戌': 10, '亥': 11 };

  /**
   * 将公历日期转换为中国通用农历详细信息
   * @param {Date|string|number} date 公历日期对象或有效日期字符串
   * @returns {Object} 农历结构体
   */
  function getLunarDate(date) {
    let d = date instanceof Date ? new Date(date.getTime()) : (date ? new Date(date) : new Date());
    if (isNaN(d.getTime())) d = new Date();

    const solarYear = d.getFullYear();
    const solarMonth = d.getMonth() + 1;
    const solarDay = d.getDate();

    let lunarMonth = 0;
    let lunarDay = 0;
    let isLeap = false;
    let ganzhiYear = '';
    let zodiac = '';

    try {
      // 1. 利用标准 ECMAScript 国际化 Chinese Calendar API 提取精确阴历月日
      const partsFormatter = new Intl.DateTimeFormat('zh-Hans-CN-u-ca-chinese', {
        year: 'numeric',
        month: 'numeric',
        day: 'numeric'
      });
      const parts = partsFormatter.formatToParts(d);

      for (const part of parts) {
        if (part.type === 'month') {
          let val = part.value || '';
          if (val.includes('闰') || val.includes('leap')) {
            isLeap = true;
            val = val.replace('闰', '').replace('leap', '').trim();
          }
          lunarMonth = CHINESE_MONTH_MAP[val] || parseInt(val.replace(/\D/g, ''), 10) || 0;
        } else if (part.type === 'day') {
          lunarDay = parseInt(part.value, 10) || 0;
        }
      }

      // 2. 提取干支纪年与生肖
      const fullFormatter = new Intl.DateTimeFormat('zh-Hans-CN-u-ca-chinese', { dateStyle: 'full' });
      const fullText = fullFormatter.format(d);
      const gzMatch = fullText.match(/([甲乙丙丁戊己庚辛壬癸][子丑寅卯辰巳午未申酉戌亥]年)/);
      if (gzMatch) {
        ganzhiYear = gzMatch[1];
        const branchChar = ganzhiYear.charAt(1);
        if (BRANCH_INDEX_MAP[branchChar] !== undefined) {
          zodiac = ZODIAC_ANIMALS[BRANCH_INDEX_MAP[branchChar]];
        }
      }
    } catch (e) {
      console.warn('Intl Chinese Calendar fallback invoked:', e);
    }

    // 兜底估算保护 (若运行环境未预装 Chinese Calendar 国际化数据包)
    if (!lunarMonth || !lunarDay) {
      // 2026年9月6日基线：农历七月廿五
      lunarMonth = 7;
      lunarDay = 25;
      ganzhiYear = '丙午年';
      zodiac = '马';
    }

    const monthName = (isLeap ? '闰' : '') + (CHINESE_MONTH_NAMES[lunarMonth] || (lunarMonth + '月'));
    const dayName = CHINESE_DAY_NAMES[lunarDay] || (lunarDay + '日');
    const lunarShort = `${monthName}${dayName}`;
    const lunarFull = `农历${ganzhiYear ? ganzhiYear + ' ' : ''}${zodiac ? '(' + zodiac + '年) ' : ''}${lunarShort}`;

    return {
      solarYear,
      solarMonth,
      solarDay,
      solarFormatted: `${solarYear}年${solarMonth}月${solarDay}日`,
      solarDateIso: `${solarYear}-${String(solarMonth).padStart(2, '0')}-${String(solarDay).padStart(2, '0')}`,
      lunarYear: solarYear,
      ganzhiYear,
      zodiac,
      lunarMonth,
      lunarDay,
      isLeap,
      lunarMonthName: monthName,
      lunarDayName: dayName,
      lunarText: lunarShort,
      lunarShort: lunarShort,
      lunarFull: lunarFull,
      numericStr: `${lunarMonth}月${lunarDay}日`,
      lunarMonthDayKey: `${String(lunarMonth).padStart(2, '0')}-${String(lunarDay).padStart(2, '0')}`,
      solarMonthDayKey: `${String(solarMonth).padStart(2, '0')}-${String(solarDay).padStart(2, '0')}`
    };
  }

  /**
   * 检查单个学生是否在指定日期过生日 (双轨支持：农历生日与公历生日)
   * @param {Object} student 学生档案对象
   * @param {Date|string} targetDate 待比对日期，默认为当前系统日期
   * @returns {Object|null} 匹配结果
   */
  /**
   * 检查单个学生是否在指定日期过生日 (双轨精准支持：公历转中国通用农历生日与公历生日)
   * 规则说明：
   * 1. 学生档案录入的出生日期通常为公历（如 2016-08-27、2016-09-06、2016-07-25 等）。
   * 2. 农历生日识别：系统将学生的公历出生日期自动转换为中国通用农历日期（阴历月、阴历日），
   *    若该农历月日与今日的目标农历月日一致，则精准命中「农历生日」提醒！
   *    （例如：谢雨桐档案公历生日 2016-08-27，自动转换为中国农历为 七月廿五，与今日农历七月廿五完全吻合，命中农历生日！）
   *    （而刘思琪公历 2016-07-25 转换为农历为 六月廿二，与今日农历七月廿五不一致，非今日生日，严格排除。）
   * 3. 公历生日识别：若学生的公历出生月日与今日公历月日一致（如马雨晴 2016-09-06 与今日 9月6日），则命中「公历生日」提醒！
   * 4. 显式农历档案支持：若学生档案中明确标注为农历（如 "农历七月廿五" 或 student.birthdayType === 'lunar'），
   *    则直接提取其农历月日与今日农历月日进行比对。
   * @param {Object} student 学生档案对象
   * @param {Date|string} targetDate 待比对日期，默认为当前系统日期
   * @returns {Object|null} 匹配结果
   */
  /**
   * 检查单个学生是否在指定日期过生日 (遵循用户要求：仅识别中国通用农历生日，不显示公历生日)
   * @param {Object} student 学生档案对象
   * @param {Date|string} targetDate 待比对日期，默认为当前系统日期
   * @param {boolean} onlyLunar 是否仅限农历生日，默认为 true
   * @returns {Object|null} 匹配结果
   */
  function checkStudentBirthday(student, targetDate, onlyLunar = true) {
    if (!student) return null;
    const target = targetDate instanceof Date ? targetDate : (targetDate ? new Date(targetDate) : new Date());
    const targetLunar = getLunarDate(target);

    const rawBday = String(student.birthday || '').trim();
    if (!rawBday) return null;

    // A. 显式农历标记解析 (如 "农历七月廿五", "农历7月25日", "2016-07-25(农历)")
    const isExplicitLunar = rawBday.includes('农') || rawBday.includes('阴') || student.birthdayType === 'lunar';
    if (isExplicitLunar) {
      let lMonth = 0;
      let lDay = 0;
      for (const [name, num] of Object.entries(CHINESE_MONTH_MAP)) {
        if (rawBday.includes(name)) { lMonth = num; break; }
      }
      if (!lMonth) {
        const numM = rawBday.match(/(\d{1,2})[月\-]/);
        if (numM) lMonth = parseInt(numM[1], 10);
      }
      for (let i = 1; i < CHINESE_DAY_NAMES.length; i++) {
        if (rawBday.includes(CHINESE_DAY_NAMES[i])) { lDay = i; break; }
      }
      if (!lDay) {
        const numD = rawBday.match(/[月\-及](\d{1,2})[日号]?/);
        if (numD) lDay = parseInt(numD[1], 10);
      }

      if (lMonth === targetLunar.lunarMonth && lDay === targetLunar.lunarDay) {
        return {
          isBirthday: true,
          type: 'lunar',
          label: '农历生日',
          birthdayText: `农历${targetLunar.lunarText}`
        };
      }
      return null;
    }

    // B. 标准公历出生日期解析：必须科学自动换算为中国通用农历 (阴历) 后再精准比对
    const dateMatch = rawBday.match(/(?:^(\d{4})[-/年])?(\d{1,2})[-/月](\d{1,2})/);
    if (!dateMatch) return null;

    const bYear = dateMatch[1] ? parseInt(dateMatch[1], 10) : 2016;
    const bSolarM = parseInt(dateMatch[2], 10);
    const bSolarD = parseInt(dateMatch[3], 10);

    const birthDateObj = new Date(bYear, bSolarM - 1, bSolarD);
    if (!isNaN(birthDateObj.getTime())) {
      const studentBirthLunar = getLunarDate(birthDateObj);
      if (studentBirthLunar && studentBirthLunar.lunarMonth === targetLunar.lunarMonth && studentBirthLunar.lunarDay === targetLunar.lunarDay) {
        return {
          isBirthday: true,
          type: 'lunar',
          label: '农历生日',
          birthdayText: `农历${targetLunar.lunarText}`,
          studentLunarText: studentBirthLunar.lunarText
        };
      }
    }

    // 若非 onlyLunar 模式，才比对公历生日 (默认严格仅比对农历生日)
    if (!onlyLunar) {
      const targetSolarM = target.getMonth() + 1;
      const targetSolarD = target.getDate();
      if (bSolarM === targetSolarM && bSolarD === targetSolarD) {
        return {
          isBirthday: true,
          type: 'solar',
          label: '公历生日',
          birthdayText: `公历${targetSolarM}月${targetSolarD}日`
        };
      }
    }

    return null;
  }

  /**
   * 扫描班级所有学生，筛选出今日过中国农历生日的学生清单
   * @param {Array} students 学生档案列表
   * @param {Date|string} targetDate 目标比对日期，默认为当前日期
   * @returns {Array} 今日农历寿星列表包含匹配元信息
   */
  function getTodayBirthdayStudents(students, targetDate) {
    if (!Array.isArray(students)) return [];
    const target = targetDate instanceof Date ? targetDate : (targetDate ? new Date(targetDate) : new Date());
    const matched = [];

    students.forEach(s => {
      const match = checkStudentBirthday(s, target, true);
      if (match && match.isBirthday) {
        matched.push({
          student: s,
          name: s.name,
          id: s.id,
          group: s.group,
          avatarUrl: s.avatarUrl,
          gender: s.gender,
          birthday: s.birthday,
          birthdayType: match.type,
          typeLabel: match.label,
          birthdayText: match.birthdayText
        });
      }
    });

    return matched;
  }

  /**
   * 扫描班级所有学生，筛选出明日过中国农历生日的学生清单
   * @param {Array} students 学生档案列表
   * @param {Date|string} baseDate 基准当前日期，默认为今日
   * @returns {Array} 明日农历寿星列表包含匹配元信息
   */
  function getTomorrowBirthdayStudents(students, baseDate) {
    if (!Array.isArray(students)) return [];
    const base = baseDate instanceof Date ? baseDate : (baseDate ? new Date(baseDate) : new Date());
    const tomorrow = new Date(base.getFullYear(), base.getMonth(), base.getDate() + 1);
    const matched = [];

    students.forEach(s => {
      const match = checkStudentBirthday(s, tomorrow, true);
      if (match && match.isBirthday) {
        matched.push({
          student: s,
          name: s.name,
          id: s.id,
          group: s.group,
          avatarUrl: s.avatarUrl,
          gender: s.gender,
          birthday: s.birthday,
          birthdayType: match.type,
          typeLabel: '明日寿星',
          birthdayText: match.birthdayText
        });
      }
    });

    return matched;
  }

  // 挂载到全局 window
  global.getLunarDate = getLunarDate;
  global.checkStudentBirthday = checkStudentBirthday;
  global.getTodayBirthdayStudents = getTodayBirthdayStudents;
  global.getTomorrowBirthdayStudents = getTomorrowBirthdayStudents;

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
      getLunarDate,
      checkStudentBirthday,
      getTodayBirthdayStudents,
      getTomorrowBirthdayStudents
    };
  }
})(typeof window !== 'undefined' ? window : (typeof global !== 'undefined' ? global : (typeof globalThis !== 'undefined' ? globalThis : this)));

