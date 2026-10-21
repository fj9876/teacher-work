/**
 * 班主任工作台 - 预置基础演示数据集
 * 涵盖：45名真实感学生、课表排班、今日班务、考勤请假、作业、成绩学情、
 * 1530安全教育台账、成长评价、班规量化、15种班级宠物、家校沟通与活动报表
 */

const DEFAULT_DATA = {
  classInfo: {
    id: "class_demo_template",
    name: "【示范体验】班级默认模板",
    school: "阳光实验学校",
    grade: "小学四年级",
    gradeLevel: "小学四年级",
    studentCount: 45,
    term: "2026年秋季学期",
    week: 1,
    currentDay: "周六",
    teacher: {
      name: "李老师",
      role: "班主任",
      phone: "13800000000",
      avatar: "👨‍🏫"
    },
    slogan: "博学笃行，乐学善思，团结进取",
    classroom: "博学楼 407 教室"
  },

  // 45名学生电子档案
  students: [
    {
      id: "20240001", name: "陈思远", gender: "男", birthday: "2016-04-15",
      group: 1, seat: "第1排·1号", role: "班长", dutyDay: "周一", height: 138,
      vision: "5.0 / 5.0", allergies: "无", medicalHistory: "无", diet: "无特殊",
      guardian: "陈先生", phone: "139****1000", address: "阳光花园小区3号楼502", pickup: "家长接送",
      emergencyContact: "陈先生 (139****1000)", tags: ["好学星", "班干部", "文明标兵"],
      strengths: "有较强组织协调能力，乐于助人，各科成绩优异", personality: "开朗、沉稳有担当",
      score: 98, petId: "cat", attendanceToday: "normal",
      notes: "课堂发言积极，本学期主动组织班级晨读领诵。"
    },
    {
      id: "20240002", name: "李小红", gender: "女", birthday: "2016-06-20",
      group: 1, seat: "第1排·2号", role: "中等生", dutyDay: "周一", height: 132,
      vision: "4.8 / 4.9", allergies: "芒果过敏", medicalHistory: "无", diet: "禁食芒果",
      guardian: "李女士", phone: "138****2001", address: "碧水蓝天A区8栋", pickup: "校车接送",
      emergencyContact: "李女士 (138****2001)", tags: ["积极分子", "舞蹈特长"],
      strengths: "有艺术天赋，舞蹈比赛获奖，待人礼貌", personality: "活泼热情、偶有小马虎",
      score: 88, petId: "dog", attendanceToday: "late",
      notes: "近期早读偶尔迟到几分钟，已与家长沟通调整作息。"
    },
    {
      id: "20240003", name: "王小刚", gender: "男", birthday: "2016-02-11",
      group: 1, seat: "第2排·1号", role: "体育委员", dutyDay: "周二", height: 142,
      vision: "5.1 / 5.1", allergies: "无", medicalHistory: "无", diet: "无特殊",
      guardian: "王先生", phone: "137****3002", address: "学府芳邻2单元401", pickup: "自行回家",
      emergencyContact: "王先生 (137****3002)", tags: ["体育之星", "劳动模范"],
      strengths: "运动能力出众，课间操领操负责，热心班级集体劳动", personality: "耿直勇敢、执行力强",
      score: 91, petId: "panda", attendanceToday: "casual_leave",
      notes: "今日因参加区少年足球选拔请事假半天。"
    },
    {
      id: "20240004", name: "赵小美", gender: "女", birthday: "2016-08-09",
      group: 1, seat: "第2排·2号", role: "文艺委员", dutyDay: "周二", height: 135,
      vision: "5.0 / 5.0", allergies: "花粉过敏", medicalHistory: "轻度鼻炎", diet: "清淡饮食",
      guardian: "赵女士", phone: "136****4003", address: "龙湖香醍漫步12号", pickup: "家长接送",
      emergencyContact: "赵女士 (136****4003)", tags: ["画画小天才", "书写工整"],
      strengths: "绘画功底扎实，多次为班级设计黑板报，字迹娟秀", personality: "温和文静、心思细腻",
      score: 93, petId: "unicorn", attendanceToday: "sick_leave",
      notes: "因季节性感冒发热在医院输液请病假1天，已叮嘱安心休养。"
    },
    {
      id: "20240005", name: "张明", gender: "男", birthday: "2016-05-18",
      group: 2, seat: "第1排·3号", role: "组长", dutyDay: "周三", height: 136,
      vision: "4.7 / 4.8", allergies: "海鲜过敏", medicalHistory: "无", diet: "无海鲜",
      guardian: "张先生", phone: "135****5004", address: "万科城市之光5栋", pickup: "家长接送",
      emergencyContact: "张先生 (135****5004)", tags: ["数学达人", "需要关注"],
      strengths: "数学逻辑思维敏锐，计算速度极快", personality: "聪明但课堂偶尔注意力分散",
      score: 82, petId: "penguin", attendanceToday: "normal",
      notes: "【重点关注学生】上周数学小测有退步，课堂偶尔走神，需课间加强谈心激励。"
    },
    {
      id: "20240006", name: "刘思琪", gender: "女", birthday: "2016-07-25",
      group: 2, seat: "第1排·4号", role: "学习委员", dutyDay: "周三", height: 137,
      vision: "5.0 / 5.0", allergies: "无", medicalHistory: "无", diet: "无特殊",
      guardian: "刘先生", phone: "139****6005", address: "保利花园3期7幢", pickup: "校车接送",
      emergencyContact: "刘先生 (139****6005)", tags: ["学习之星", "自律典范"],
      strengths: "学习主动性极高，各科作业均是免检标兵，乐于辅导同学", personality: "沉着冷静、谦虚严谨",
      score: 99, petId: "koala", attendanceToday: "normal",
      notes: "各科成绩稳居班级前列，作业书写极规范，乐于辅导同学。"
    },
    {
      id: "20240007", name: "孙浩然", gender: "男", birthday: "2016-08-27",
      group: 2, seat: "第2排·3号", role: "学生", dutyDay: "周四", height: 140,
      vision: "4.9 / 5.0", allergies: "无", medicalHistory: "无", diet: "无特殊",
      guardian: "孙先生", phone: "138****7006", address: "金地格林世界10号", pickup: "自行回家",
      emergencyContact: "孙先生 (138****7006)", tags: ["朗诵达人"],
      strengths: "声音洪亮，普通话甲等水准，班级朗诵主力", personality: "阳光开朗、热情洋溢",
      score: 90, petId: "hamster", attendanceToday: "normal",
      notes: "声音洪亮，普通话甲等水准，班级朗诵主力。"
    },
    {
      id: "20240008", name: "周雨萱", gender: "女", birthday: "2016-08-28",
      group: 2, seat: "第2排·4号", role: "卫生委员", dutyDay: "周四", height: 134,
      vision: "5.0 / 5.0", allergies: "无", medicalHistory: "无", diet: "无特殊",
      guardian: "周女士", phone: "137****8007", address: "恒大名都6栋1201", pickup: "家长接送",
      emergencyContact: "周女士 (137****8007)", tags: ["环保小卫士", "热心助人"],
      strengths: "责任心爆棚，每天离校前细致检查门窗和垃圾分类", personality: "勤勉耐劳、严谨细致",
      score: 95, petId: "rabbit", attendanceToday: "normal",
      notes: "带领卫生小组多次获得流动红旗。"
    },
    {
      id: "20240009", name: "吴俊杰", gender: "男", birthday: "2016-11-12",
      group: 3, seat: "第1排·5号", role: "纪律委员", dutyDay: "周五", height: 141,
      vision: "4.8 / 4.8", allergies: "牛奶不耐受", medicalHistory: "无", diet: "避免纯牛奶",
      guardian: "吴先生", phone: "136****9008", address: "绿城西溪诚园3幢", pickup: "自行回家",
      emergencyContact: "吴先生 (136****9008)", tags: ["公道正派", "象棋冠军"],
      strengths: "原则性强，管理路队和眼保健操一丝不苟", personality: "正直坦荡、威信高",
      score: 94, petId: "seal", attendanceToday: "normal",
      notes: "路队纪律抓得很紧，路队评比连续第一。"
    },
    {
      id: "20240010", name: "郑宇轩", gender: "男", birthday: "2016-01-22",
      group: 3, seat: "第1排·6号", role: "劳动委员", dutyDay: "周五", height: 143,
      vision: "5.1 / 5.1", allergies: "无", medicalHistory: "无", diet: "无特殊",
      guardian: "郑先生", phone: "135****0009", address: "世茂滨江一期", pickup: "家长接送",
      emergencyContact: "郑先生 (135****0009)", tags: ["小发明家", "动手能手"],
      strengths: "科学实验动手能力强，主动修理班级图书架", personality: "务实勤快、随和",
      score: 92, petId: "fox", attendanceToday: "normal",
      notes: "班级绿植养护得生机勃勃。"
    },
    {
      id: "20240011", name: "费伟涵", gender: "男", birthday: "2016-10-05",
      group: 3, seat: "第2排·5号", role: "学生", dutyDay: "周一", height: 139,
      vision: "4.6 / 4.7", allergies: "尘螨过敏", medicalHistory: "无", diet: "无特殊",
      guardian: "费先生", phone: "139****1110", address: "东城印象8号楼", pickup: "家长接送",
      emergencyContact: "费先生 (139****1110)", tags: ["需要重点关注", "作业催交"],
      strengths: "头脑灵活，对自然科学极感兴趣", personality: "好动、自控力较弱、偶有拖延",
      score: 72, petId: "husky", attendanceToday: "absent",
      notes: "【重点关注学生】连续2次作业未完成，今晨无故缺勤，早读已电话家长核实为睡过头，稍后由家长送来。"
    },
    {
      id: "20240012", name: "林诗涵", gender: "女", birthday: "2016-12-08",
      group: 3, seat: "第2排·6号", role: "学生", dutyDay: "周二", height: 133,
      vision: "5.0 / 5.0", allergies: "无", medicalHistory: "无", diet: "无特殊",
      guardian: "林女士", phone: "138****2221", address: "锦绣江南4栋", pickup: "校车接送",
      emergencyContact: "林女士 (138****2221)", tags: ["古筝九级", "优雅小仙女"],
      strengths: "音准极好，古筝弹奏曾获市级特等奖，英语发音纯正", personality: "文雅秀气、温和好学",
      score: 96, petId: "deer", attendanceToday: "normal",
      notes: "代表学校参选区少儿合唱团领唱。"
    },
    {
      id: "20240013", name: "黄子轩", gender: "男", birthday: "2016-04-03",
      group: 4, seat: "第3排·1号", role: "组长", dutyDay: "周三", height: 140,
      vision: "5.0 / 4.9", allergies: "无", medicalHistory: "无", diet: "无特殊",
      guardian: "黄先生", phone: "137****3332", address: "中海寰宇天下2号", pickup: "家长接送",
      emergencyContact: "黄先生 (137****3332)", tags: ["阅读狂人", "思维开阔"],
      strengths: "阅读面广泛，历史与地理百科知识丰富", personality: "幽默风趣、善于交流",
      score: 93, petId: "alpaca", attendanceToday: "normal",
      notes: "本学期已在班级读书角借阅图书15本。"
    },
    {
      id: "20240014", name: "马雨晴", gender: "女", birthday: "2016-09-06",
      group: 4, seat: "第3排·2号", role: "学生", dutyDay: "周四", height: 136,
      vision: "4.9 / 4.9", allergies: "花生过敏", medicalHistory: "无", diet: "严禁坚果花生",
      guardian: "马女士", phone: "136****4443", address: "华润中央公园7幢", pickup: "自行回家",
      emergencyContact: "马女士 (136****4443)", tags: ["今日生日🎂", "积极向上"],
      strengths: "手抄报制作精良，性格阳光，人缘极好", personality: "乐观大方、乐于分享",
      score: 91, petId: "canary", attendanceToday: "normal",
      notes: "今天也是公历生日（9月6日）！全班送上生日祝福。"
    },
    {
      id: "20240015", name: "韩雨哲", gender: "男", birthday: "2016-07-14",
      group: 4, seat: "第3排·3号", role: "图书管理员", dutyDay: "周五", height: 137,
      vision: "5.0 / 5.0", allergies: "无", medicalHistory: "无", diet: "无特殊",
      guardian: "韩先生", phone: "135****5554", address: "融创望江府1幢", pickup: "校车接送",
      emergencyContact: "韩先生 (135****5554)", tags: ["整理能手", "诚实守信"],
      strengths: "图书借阅台账记录井井有条，责任感强", personality: "踏实认真、耐得住性子",
      score: 89, petId: "raccoon", attendanceToday: "normal",
      notes: "每天午休前主动归拢整理班级图书。"
    },
    {
      id: "20240016", name: "徐子恒", gender: "男", birthday: "2016-03-19",
      group: 4, seat: "第3排·4号", role: "组长", dutyDay: "周一", height: 141,
      vision: "4.8 / 4.9", allergies: "无", medicalHistory: "无", diet: "无特殊",
      guardian: "徐先生", phone: "134****6665", address: "万科金域缇香6栋", pickup: "自行回家",
      emergencyContact: "徐先生 (134****6665)", tags: ["逻辑之星"],
      strengths: "魔方还原高手，空间几何想象力好", personality: "沉静善思",
      score: 92, petId: "cat", attendanceToday: "normal", notes: "数学思维突出。"
    },
    {
      id: "20240017", name: "胡博文", gender: "男", birthday: "2016-05-11",
      group: 5, seat: "第4排·1号", role: "学生", dutyDay: "周二", height: 144,
      vision: "5.0 / 5.0", allergies: "无", medicalHistory: "无", diet: "无特殊",
      guardian: "胡先生", phone: "133****7776", address: "龙湖天街名邸", pickup: "家长接送",
      emergencyContact: "胡先生 (133****7776)", tags: ["书法小能手"],
      strengths: "毛笔软笔书法获校级一等奖", personality: "端庄稳重",
      score: 94, petId: "dog", attendanceToday: "normal", notes: "负责本期班级板报标题书写。"
    },
    {
      id: "20240018", name: "谢雨桐", gender: "女", birthday: "2016-08-27",
      group: 5, seat: "第4排·2号", role: "组长", dutyDay: "周三", height: 135,
      vision: "4.9 / 5.0", allergies: "无", medicalHistory: "无", diet: "无特殊",
      guardian: "谢女士", phone: "139****8887", address: "翡翠城玉泉苑", pickup: "校车接送",
      emergencyContact: "谢女士 (139****8887)", tags: ["朗读小明星"],
      strengths: "语文课文感情充沛，语音标准", personality: "活泼友善",
      score: 95, petId: "panda", attendanceToday: "normal", notes: "语文背诵打卡全优。"
    },
    {
      id: "20240019", name: "彭俊逸", gender: "男", birthday: "2016-10-18",
      group: 5, seat: "第4排·3号", role: "学生", dutyDay: "周四", height: 139,
      vision: "4.7 / 4.7", allergies: "无", medicalHistory: "无", diet: "无特殊",
      guardian: "彭先生", phone: "138****9998", address: "大华西溪风情5期", pickup: "自行回家",
      emergencyContact: "彭先生 (138****9998)", tags: ["科技达人"],
      strengths: "乐高机器人与少儿编程很有天赋", personality: "好奇心强",
      score: 87, petId: "unicorn", attendanceToday: "normal", notes: "课下爱探索科学问题。"
    },
    {
      id: "20240020", name: "沈雅琪", gender: "女", birthday: "2016-02-05",
      group: 5, seat: "第4排·4号", role: "宣传委员", dutyDay: "周五", height: 133,
      vision: "5.0 / 5.0", allergies: "无", medicalHistory: "无", diet: "无特殊",
      guardian: "沈女士", phone: "137****0011", address: "运河家园2幢", pickup: "家长接送",
      emergencyContact: "沈女士 (137****0011)", tags: ["手作达人", "美工小天才"],
      strengths: "剪纸、泥塑手工艺精湛", personality: "灵巧温和",
      score: 96, petId: "penguin", attendanceToday: "normal", notes: "班级走廊文化墙布置主力。"
    },
    {
      id: "20240021", name: "潘昱辰", gender: "男", birthday: "2016-06-16",
      group: 6, seat: "第5排·1号", role: "组长", dutyDay: "周一", height: 145,
      vision: "5.1 / 5.1", allergies: "无", medicalHistory: "无", diet: "无特殊",
      guardian: "潘先生", phone: "136****1122", address: "金成竹海水韵", pickup: "校车接送",
      emergencyContact: "潘先生 (136****1122)", tags: ["篮球健将"],
      strengths: "班级篮球队队长，团队凝聚力好", personality: "爽朗大方",
      score: 90, petId: "koala", attendanceToday: "normal", notes: "带领全组积极争当文明小组。"
    },
    {
      id: "20240022", name: "方晨熙", gender: "女", birthday: "2016-09-29",
      group: 6, seat: "第5排·2号", role: "学生", dutyDay: "周二", height: 134,
      vision: "4.8 / 4.9", allergies: "无", medicalHistory: "无", diet: "无特殊",
      guardian: "方女士", phone: "135****2233", address: "盛世嘉园7栋", pickup: "家长接送",
      emergencyContact: "方女士 (135****2233)", tags: ["英语之星"],
      strengths: "英语情景剧表演极具感染力", personality: "自信阳光",
      score: 93, petId: "hamster", attendanceToday: "normal", notes: "英语角表现亮眼。"
    },
    {
      id: "20240023", name: "杜雨桐", gender: "女", birthday: "2016-01-08",
      group: 6, seat: "第5排·3号", role: "学生", dutyDay: "周三", height: 132,
      vision: "5.0 / 5.0", allergies: "无", medicalHistory: "无", diet: "无特殊",
      guardian: "杜女士", phone: "134****3344", address: "白马湖壹号", pickup: "自行回家",
      emergencyContact: "杜女士 (134****3344)", tags: ["认真细致"],
      strengths: "课堂笔记条理分明", personality: "踏实文静",
      score: 92, petId: "rabbit", attendanceToday: "normal", notes: "学习态度非常端正。"
    },
    {
      id: "20240024", name: "叶家豪", gender: "男", birthday: "2016-04-28",
      group: 6, seat: "第5排·4号", role: "电教委员", dutyDay: "周四", height: 142,
      vision: "4.7 / 4.8", allergies: "无", medicalHistory: "无", diet: "无特殊",
      guardian: "叶先生", phone: "133****4455", address: "湖滨公寓5号", pickup: "家长接送",
      emergencyContact: "叶先生 (133****4455)", tags: ["电脑小能手"],
      strengths: "熟练操作班级多媒体设备，负责课件调试", personality: "乐于服务",
      score: 88, petId: "seal", attendanceToday: "normal", notes: "课间能协助任课老师调试投影。"
    },
    {
      id: "20240025", name: "钱思齐", gender: "女", birthday: "2016-11-23",
      group: 1, seat: "第3排·5号", role: "学生", dutyDay: "周五", height: 136,
      vision: "5.0 / 5.0", allergies: "无", medicalHistory: "无", diet: "无特殊",
      guardian: "钱女士", phone: "139****5566", address: "西子国际公寓", pickup: "校车接送",
      emergencyContact: "钱女士 (139****5566)", tags: ["数学进步之星"],
      strengths: "遇到不会题目敢于主动提问老师", personality: "勤勉有韧性",
      score: 89, petId: "fox", attendanceToday: "normal", notes: "近期错题订正非常及时。"
    },
    {
      id: "20240026", name: "蒋子轩", gender: "男", birthday: "2016-07-09",
      group: 2, seat: "第3排·6号", role: "学生", dutyDay: "周一", height: 140,
      vision: "4.8 / 4.8", allergies: "无", medicalHistory: "无", diet: "无特殊",
      guardian: "蒋先生", phone: "138****6677", address: "亲亲家园二期", pickup: "自行回家",
      emergencyContact: "蒋先生 (138****6677)", tags: ["拼装大师"],
      strengths: "立体空间构想能力很强", personality: "聪明好学",
      score: 86, petId: "husky", attendanceToday: "normal", notes: "课堂上发言有独到见解。"
    },
    {
      id: "20240027", name: "沈嘉怡", gender: "女", birthday: "2016-03-12",
      group: 3, seat: "第4排·5号", role: "学生", dutyDay: "周二", height: 131,
      vision: "5.0 / 5.1", allergies: "无", medicalHistory: "无", diet: "无特殊",
      guardian: "沈先生", phone: "137****7788", address: "河畔花园1幢", pickup: "家长接送",
      emergencyContact: "沈先生 (137****7788)", tags: ["歌唱小百灵"],
      strengths: "音乐课表现优异，多次领唱", personality: "甜美大方",
      score: 95, petId: "deer", attendanceToday: "normal", notes: "班级联欢会筹备积极。"
    },
    {
      id: "20240028", name: "汪子涵", gender: "男", birthday: "2016-05-27",
      group: 4, seat: "第4排·6号", role: "学生", dutyDay: "周三", height: 138,
      vision: "4.9 / 4.9", allergies: "无", medicalHistory: "无", diet: "无特殊",
      guardian: "汪先生", phone: "136****8899", address: "新城香悦半岛", pickup: "校车接送",
      emergencyContact: "汪先生 (136****8899)", tags: ["围棋好手"],
      strengths: "棋风沉稳，大局观好", personality: "专注有耐力",
      score: 91, petId: "alpaca", attendanceToday: "normal", notes: "做题时审题很细致。"
    },
    {
      id: "20240029", name: "邹雅洁", gender: "女", birthday: "2016-08-14",
      group: 5, seat: "第5排·5号", role: "学生", dutyDay: "周四", height: 137,
      vision: "5.0 / 5.0", allergies: "无", medicalHistory: "无", diet: "无特殊",
      guardian: "邹女士", phone: "135****9900", address: "天鸿香榭里", pickup: "自行回家",
      emergencyContact: "邹女士 (135****9900)", tags: ["写作新星"],
      strengths: "作文多次作为范文在班级展读", personality: "文静内秀",
      score: 97, petId: "canary", attendanceToday: "normal", notes: "习作《美丽的秋天》刊登在校报。"
    },
    {
      id: "20240030", name: "卢俊皓", gender: "男", birthday: "2016-12-30",
      group: 6, seat: "第5排·6号", role: "学生", dutyDay: "周五", height: 141,
      vision: "4.8 / 4.9", allergies: "无", medicalHistory: "无", diet: "无特殊",
      guardian: "卢先生", phone: "134****0012", address: "万科西望府", pickup: "家长接送",
      emergencyContact: "卢先生 (134****0012)", tags: ["跑步飞毛腿"],
      strengths: "短跑爆发力极强，运动会60米金牌", personality: "活泼好动",
      score: 85, petId: "raccoon", attendanceToday: "normal", notes: "下课爱打闹，需引导课间安全。"
    },
    {
      id: "20240031", name: "顾天宇", gender: "男", birthday: "2016-02-18",
      group: 1, seat: "第6排·1号", role: "学生", dutyDay: "周一", height: 146,
      vision: "5.0 / 5.0", allergies: "无", medicalHistory: "无", diet: "无特殊",
      guardian: "顾先生", phone: "133****1123", address: "金色蓝庭2号", pickup: "自行回家",
      emergencyContact: "顾先生 (133****1123)", tags: ["热心肠"],
      strengths: "个子高力气大，主动帮同学搬水擦黑板", personality: "淳朴热心",
      score: 89, petId: "dog", attendanceToday: "normal", notes: "班级后勤保障小助手。"
    },
    {
      id: "20240032", name: "陶梦琪", gender: "女", birthday: "2016-06-03",
      group: 1, seat: "第6排·2号", role: "学生", dutyDay: "周二", height: 136,
      vision: "4.7 / 4.8", allergies: "无", medicalHistory: "无", diet: "无特殊",
      guardian: "陶女士", phone: "139****2234", address: "金成江南春城", pickup: "校车接送",
      emergencyContact: "陶女士 (139****2234)", tags: ["微笑天使"],
      strengths: "待人谦和有礼貌，从不与同学争吵", personality: "温柔善良",
      score: 93, petId: "cat", attendanceToday: "normal", notes: "小组合作时极具亲和力。"
    },
    {
      id: "20240033", name: "严俊杰", gender: "男", birthday: "2016-09-15",
      group: 2, seat: "第6排·3号", role: "学生", dutyDay: "周三", height: 143,
      vision: "4.9 / 5.0", allergies: "无", medicalHistory: "无", diet: "无特殊",
      guardian: "严先生", phone: "138****3345", address: "东海柠檬郡", pickup: "家长接送",
      emergencyContact: "严先生 (138****3345)", tags: ["科学迷"],
      strengths: "常带科学小标本到班级分享", personality: "求知欲旺盛",
      score: 90, petId: "panda", attendanceToday: "normal", notes: "善于观察大自然。"
    },
    {
      id: "20240034", name: "孔令仪", gender: "女", birthday: "2016-04-20",
      group: 2, seat: "第6排·4号", role: "学生", dutyDay: "周四", height: 135,
      vision: "5.0 / 5.0", allergies: "无", medicalHistory: "无", diet: "无特殊",
      guardian: "孔女士", phone: "137****4456", address: "远洋心里3幢", pickup: "自行回家",
      emergencyContact: "孔女士 (137****4456)", tags: ["温文尔雅"],
      strengths: "诗词背诵量大，国学知识储备好", personality: "知书达礼",
      score: 96, petId: "unicorn", attendanceToday: "normal", notes: "积极参加古诗词飞花令活动。"
    },
    {
      id: "20240035", name: "姜皓文", gender: "男", birthday: "2016-11-04",
      group: 3, seat: "第6排·5号", role: "学生", dutyDay: "周五", height: 142,
      vision: "4.8 / 4.8", allergies: "无", medicalHistory: "无", diet: "无特殊",
      guardian: "姜先生", phone: "136****5567", address: "合景瑜翠园", pickup: "家长接送",
      emergencyContact: "姜先生 (136****5567)", tags: ["天文小博士"],
      strengths: "熟悉八大行星与宇宙航天故事", personality: "思维敏捷",
      score: 87, petId: "penguin", attendanceToday: "normal", notes: "班会课做过精彩的天文主题演讲。"
    },
    {
      id: "20240036", name: "崔雨萱", gender: "女", birthday: "2016-01-19",
      group: 3, seat: "第6排·6号", role: "学生", dutyDay: "周一", height: 134,
      vision: "5.0 / 4.9", allergies: "无", medicalHistory: "无", diet: "无特殊",
      guardian: "崔女士", phone: "135****6678", address: "新湖香格里拉", pickup: "校车接送",
      emergencyContact: "崔女士 (135****6678)", tags: ["自律小标兵"],
      strengths: "桌面整洁，学习习惯非常规范", personality: "井井有条",
      score: 94, petId: "koala", attendanceToday: "normal", notes: "课前两分钟准备极为规范。"
    },
    {
      id: "20240037", name: "邵逸飞", gender: "男", birthday: "2016-05-02",
      group: 4, seat: "第7排·1号", role: "学生", dutyDay: "周二", height: 147,
      vision: "4.9 / 4.9", allergies: "无", medicalHistory: "无", diet: "无特殊",
      guardian: "邵先生", phone: "134****7789", address: "万科桂语东方", pickup: "自行回家",
      emergencyContact: "邵先生 (134****7789)", tags: ["跳高健将"],
      strengths: "身体协调能力优秀，运动积极分子", personality: "豪爽果断",
      score: 88, petId: "hamster", attendanceToday: "normal", notes: "大课间跳绳表现突出。"
    },
    {
      id: "20240038", name: "夏子琪", gender: "女", birthday: "2016-08-31",
      group: 4, seat: "第7排·2号", role: "学生", dutyDay: "周三", height: 137,
      vision: "5.0 / 5.0", allergies: "无", medicalHistory: "无", diet: "无特殊",
      guardian: "夏女士", phone: "133****8890", address: "西溪明珠花园", pickup: "家长接送",
      emergencyContact: "夏女士 (133****8890)", tags: ["朗读小能手"],
      strengths: "普通话发音纯正，绘本剧表演生动", personality: "自信乐观",
      score: 93, petId: "rabbit", attendanceToday: "normal", notes: "多次担任班级升旗仪式主持人。"
    },
    {
      id: "20240039", name: "毛博文", gender: "男", birthday: "2016-10-14",
      group: 5, seat: "第7排·3号", role: "学生", dutyDay: "周四", height: 141,
      vision: "4.8 / 4.8", allergies: "无", medicalHistory: "无", diet: "无特殊",
      guardian: "毛先生", phone: "139****9901", address: "蓝城春风江南", pickup: "校车接送",
      emergencyContact: "毛先生 (139****9901)", tags: ["书法之星"],
      strengths: "硬笔书法规范端正，曾获校级优秀奖", personality: "沉静专注",
      score: 91, petId: "seal", attendanceToday: "normal", notes: "班级作业本字迹示范标兵。"
    },
    {
      id: "20240040", name: "邱佳怡", gender: "女", birthday: "2016-03-08",
      group: 5, seat: "第7排·4号", role: "学生", dutyDay: "周五", height: 133,
      vision: "5.0 / 5.0", allergies: "无", medicalHistory: "无", diet: "无特殊",
      guardian: "邱女士", phone: "138****0012", address: "融创金成江南府", pickup: "自行回家",
      emergencyContact: "邱女士 (138****0012)", tags: ["劳动积极分子"],
      strengths: "每次轮到值日打扫格外卖力彻底", personality: "勤勉务实",
      score: 92, petId: "fox", attendanceToday: "normal", notes: "教室窗明几净全靠值日认真。"
    },
    {
      id: "20240041", name: "秦天瑞", gender: "男", birthday: "2016-07-22",
      group: 6, seat: "第7排·5号", role: "学生", dutyDay: "周一", height: 144,
      vision: "4.7 / 4.8", allergies: "无", medicalHistory: "无", diet: "无特殊",
      guardian: "秦先生", phone: "137****1123", address: "未来科技城绿汀雅苑", pickup: "家长接送",
      emergencyContact: "秦先生 (137****1123)", tags: ["数学达人"],
      strengths: "速算能力突出，二十四点挑战冠军", personality: "思维跳跃",
      score: 90, petId: "husky", attendanceToday: "normal", notes: "思维活跃，善于发掘新解法。"
    },
    {
      id: "20240042", name: "万宇航", gender: "男", birthday: "2016-12-19",
      group: 6, seat: "第7排·6号", role: "学生", dutyDay: "周二", height: 140,
      vision: "5.0 / 5.0", allergies: "无", medicalHistory: "无", diet: "无特殊",
      guardian: "万先生", phone: "136****2234", address: "富力十号院", pickup: "校车接送",
      emergencyContact: "万先生 (136****2234)", tags: ["环保小先锋"],
      strengths: "自发在班级推行废纸回收计划", personality: "热心公益",
      score: 91, petId: "deer", attendanceToday: "normal", notes: "有强烈的绿色环保观念。"
    },
    {
      id: "20240043", name: "苏梓晴", gender: "女", birthday: "2016-04-10",
      group: 1, seat: "第8排·1号", role: "学生", dutyDay: "周三", height: 138,
      vision: "4.9 / 4.9", allergies: "无", medicalHistory: "无", diet: "无特殊",
      guardian: "苏女士", phone: "135****3345", address: "华元美林公馆", pickup: "自行回家",
      emergencyContact: "苏女士 (135****3345)", tags: ["音乐小达人"],
      strengths: "擅长尤克里里弹唱，乐感很好", personality: "落落大方",
      score: 94, petId: "alpaca", attendanceToday: "normal", notes: "文艺活动积极分子。"
    },
    {
      id: "20240044", name: "董浩宇", gender: "男", birthday: "2016-09-18",
      group: 2, seat: "第8排·2号", role: "学生", dutyDay: "周四", height: 148,
      vision: "5.0 / 5.0", allergies: "无", medicalHistory: "无", diet: "无特殊",
      guardian: "董先生", phone: "134****4456", address: "中港罗兰小镇", pickup: "家长接送",
      emergencyContact: "董先生 (134****4456)", tags: ["体育能手"],
      strengths: "耐力跑出众，热爱足球", personality: "坚韧勇敢",
      score: 87, petId: "canary", attendanceToday: "normal", notes: "课外体育锻炼习惯好。"
    },
    {
      id: "20240045", name: "卢思辰", gender: "男", birthday: "2016-05-30",
      group: 3, seat: "第8排·3号", role: "学生", dutyDay: "周五", height: 143,
      vision: "4.8 / 4.8", allergies: "无", medicalHistory: "无", diet: "无特殊",
      guardian: "卢先生", phone: "133****5567", address: "绿城桃源小镇", pickup: "校车接送",
      emergencyContact: "卢先生 (133****5567)", tags: ["阅读标兵"],
      strengths: "酷爱阅读文学名著，词汇量大", personality: "从容沉静",
      score: 92, petId: "raccoon", attendanceToday: "normal", notes: "课外阅读积累深厚。"
    }
  ],

  // 今日班务列表 
  tasks: [
    {
      id: "task-001",
      title: "期中家长会筹备",
      category: "活动准备",
      deadline: "2026-11-15 11:04",
      priority: "high",
      assignee: "班主任",
      relatedStudents: "全班家长",
      desc: "准备多媒体PPT、期中总结发言稿、学生成长档案册展示台布置。",
      status: "in_progress",
      repeat: "指定日期"
    },
    {
      id: "task-002",
      title: "学籍信息核对与确认",
      category: "表格填写",
      deadline: "2026-11-06 17:00",
      priority: "medium",
      assignee: "班主任",
      relatedStudents: "全班45人",
      desc: "核对学生全国学籍号、家庭常住地址及监护人联系方式，确保无误并打印确认表签字。",
      status: "pending",
      repeat: "指定日期"
    },
    {
      id: "task-003",
      title: "阳光医保参保申请收集",
      category: "材料收集",
      deadline: "2026-11-05 16:00",
      priority: "medium",
      assignee: "班主任",
      relatedStudents: "全班45人",
      desc: "收取未在社区参保学生的基本医保申请回执与户口本复印件，汇总至教导处。",
      status: "pending",
      repeat: "指定日期"
    },
    {
      id: "task-004",
      title: "学生体检信息更新",
      category: "班级任务",
      deadline: "2026-11-01 12:00",
      priority: "medium",
      assignee: "班主任",
      relatedStudents: "全班45人",
      desc: "录入本学期视力筛查、身高体重常规体检数据，对视力低于5.0学生做重点提醒并反馈家长。",
      status: "overdue",
      repeat: "指定日期"
    },
    {
      id: "task-005",
      title: "评选优秀班干部及表彰",
      category: "班级任务",
      deadline: "2026-11-08 15:30",
      priority: "low",
      assignee: "班主任",
      relatedStudents: "班干部团队",
      desc: "根据前半学期履职尽责情况民主测评，表彰5名优秀班委，颁发荣誉奖状。",
      status: "completed",
      repeat: "指定日期"
    },
    {
      id: "task-006",
      title: "流感疫苗接种知情同意书回收",
      category: "安全提醒",
      deadline: "2026-11-10 16:00",
      priority: "high",
      assignee: "周老师",
      relatedStudents: "全班学生",
      desc: "回收校医室分发的秋冬季流感疫苗知情同意书回执（签字版）。",
      status: "pending",
      repeat: "指定日期"
    }
  ],

  // 课表排班 (周一~周五, 6节课)
  timetable: {
    periods: [
      { id: 1, name: "第1节", time: "08:00-08:40" },
      { id: 2, name: "第2节", time: "08:50-09:30" },
      { id: 3, name: "第3节", time: "10:00-10:40" },
      { id: 4, name: "第4节", time: "10:50-11:30" },
      { id: 5, name: "第5节", time: "14:00-14:40" },
      { id: 6, name: "第6节", time: "14:50-15:30" }
    ],
    schedule: {
      "周一": [
        { subject: "语文", teacher: "周老师", room: "本班教室", color: "#fee2e2", textColor: "#b91c1c" },
        { subject: "数学", teacher: "张老师", room: "本班教室", color: "#e0e7ff", textColor: "#4338ca" },
        { subject: "英语", teacher: "王老师", room: "本班教室", color: "#fef3c7", textColor: "#b45309" },
        { subject: "体育", teacher: "刘老师", room: "操场", color: "#d1fae5", textColor: "#047857" },
        { subject: "美术", teacher: "陈老师", room: "美术教室", color: "#fce7f3", textColor: "#be185d" },
        { subject: "科学", teacher: "刘老师", room: "科学实验室", color: "#ccfbf1", textColor: "#0f766e" }
      ],
      "周二": [
        { subject: "语文", teacher: "周老师", room: "本班教室", color: "#fee2e2", textColor: "#b91c1c" },
        { subject: "数学", teacher: "张老师", room: "本班教室", color: "#e0e7ff", textColor: "#4338ca" },
        { subject: "音乐", teacher: "范老师", room: "音乐教室", color: "#fef3c7", textColor: "#b45309" },
        { subject: "道德与法治", teacher: "周老师", room: "本班教室", color: "#e0f2fe", textColor: "#0369a1" },
        { subject: "英语", teacher: "王老师", room: "本班教室", color: "#fef3c7", textColor: "#b45309" },
        { subject: "体育", teacher: "刘老师", room: "操场", color: "#d1fae5", textColor: "#047857" }
      ],
      "周三": [
        { subject: "数学", teacher: "张老师", room: "本班教室", color: "#e0e7ff", textColor: "#4338ca" },
        { subject: "语文", teacher: "周老师", room: "本班教室", color: "#fee2e2", textColor: "#b91c1c" },
        { subject: "英语", teacher: "王老师", room: "本班教室", color: "#fef3c7", textColor: "#b45309" },
        { subject: "体育", teacher: "刘老师", room: "操场", color: "#d1fae5", textColor: "#047857" },
        { subject: "科学", teacher: "刘老师", room: "科学实验室", color: "#ccfbf1", textColor: "#0f766e" },
        { subject: "信息技术", teacher: "叶老师", room: "微机教室", color: "#ede9fe", textColor: "#6d28d9" }
      ],
      "周四": [
        { subject: "语文", teacher: "周老师", room: "本班教室", color: "#fee2e2", textColor: "#b91c1c" },
        { subject: "数学", teacher: "张老师", room: "本班教室", color: "#e0e7ff", textColor: "#4338ca" },
        { subject: "美术", teacher: "陈老师", room: "美术教室", color: "#fce7f3", textColor: "#be185d" },
        { subject: "英语", teacher: "王老师", room: "本班教室", color: "#fef3c7", textColor: "#b45309" },
        { subject: "音乐", teacher: "范老师", room: "音乐教室", color: "#fef3c7", textColor: "#b45309" },
        { subject: "社团活动", teacher: "指导老师", room: "各功能室", color: "#fae8ff", textColor: "#86198f" }
      ],
      "周五": [
        { subject: "数学", teacher: "张老师", room: "本班教室", color: "#e0e7ff", textColor: "#4338ca" },
        { subject: "语文", teacher: "周老师", room: "本班教室", color: "#fee2e2", textColor: "#b91c1c" },
        { subject: "英语", teacher: "王老师", room: "本班教室", color: "#fef3c7", textColor: "#b45309" },
        { subject: "体育", teacher: "刘老师", room: "操场", color: "#d1fae5", textColor: "#047857" },
        { subject: "劳动", teacher: "郑老师", room: "实践基地", color: "#ffedd5", textColor: "#c2410c" },
        { subject: "主题班会", teacher: "周老师", room: "本班教室", color: "#f3e8ff", textColor: "#7e22ce" }
      ]
    }
  },

  // 班干部安排 
  cadres: [
    { title: "班长", name: "陈思远", duties: "全面负责统筹班级管理，协调各委员工作，晨会领诵", term: "2024.09 - 至今", rating: "优秀" },
    { title: "副班长", name: "李小红", duties: "协助班长日常工作，分管纪律考勤与活动主持", term: "2024.09 - 至今", rating: "良好" },
    { title: "学习委员", name: "刘思琪", duties: "各学科作业收发检查，负责晨读领读与学风建设", term: "2024.09 - 至今", rating: "优秀" },
    { title: "纪律委员", name: "吴俊杰", duties: "维护课堂纪律、眼保健操与路队纪律", term: "2024.09 - 至今", rating: "优秀" },
    { title: "劳动委员", name: "郑宇轩", duties: "安排每日值日卫生、检查教室与清洁区保洁", term: "2024.09 - 至今", rating: "良好" },
    { title: "体育委员", name: "王小刚", duties: "课间操整队带操、体育课组织、运动器材借还", term: "2024.09 - 至今", rating: "优秀" },
    { title: "文艺委员", name: "赵小美", duties: "班级黑板报设计、文艺演出编排、艺术节筹备", term: "2024.09 - 至今", rating: "优秀" },
    { title: "生活委员", name: "周雨萱", duties: "管理班费、班级绿植养护、物资采购与分配", term: "2024.09 - 至今", rating: "良好" }
  ],

  // 每日值日生与清洁区域 
  dutySchedule: {
    "周一": { leader: "陈思远", members: ["李小红", "王小刚", "赵小美", "费伟涵"], zone: "讲台、黑板及后门垃圾角", task: "擦拭讲台黑板，垃圾分类倾倒" },
    "周二": { leader: "刘思琪", members: ["孙浩然", "周雨萱", "吴俊杰", "林诗涵"], zone: "走廊窗台及植物角", task: "擦拭窗台，走廊拖地，绿植浇水" },
    "周三": { leader: "黄子轩", members: ["马雨晴", "韩雨哲", "徐子恒", "胡博文"], zone: "第一组、第二组课桌地面", task: "桌椅对齐，地面扫拖并清空纸篓" },
    "周四": { leader: "谢雨桐", members: ["彭俊逸", "沈雅琪", "潘昱辰", "方晨熙"], zone: "第三组、第四组课桌地面", task: "桌椅对齐，地面扫拖并清空纸篓" },
    "周五": { leader: "杜雨桐", members: ["叶家豪", "钱思齐", "蒋子轩", "沈嘉怡"], zone: "全班大扫除及公共卫生区", task: "窗户大扫除，全班卫生死角彻底清查" }
  },

  // 今日作业安排与提交统计
  homeworkList: [
    {
      id: "hw-01",
      subject: "语文",
      title: "第5课《秋天》生字词抄写与背诵",
      content: "1. 规范书写生字词2遍，词语听写预备；2. 背诵全文并由家长签字确认；3. 完成配套练笔小日记一则。",
      assignedDate: "2026-09-04",
      deadline: "2026-09-05 08:00",
      needParentSign: true,
      needSubmission: true,
      stats: { submitted: 43, unsubmitted: 2, corrected: 40, needCorrection: 3 },
      unsubmittedStudents: ["费伟涵", "王小刚"]
    },
    {
      id: "hw-02",
      subject: "数学",
      title: "练习册第18-19页加减法乘除综合应用",
      content: "完成练习三第1-8题，第7题为思考题建议写出解题思路，注意验算。",
      assignedDate: "2026-09-04",
      deadline: "2026-09-05 08:00",
      needParentSign: false,
      needSubmission: true,
      stats: { submitted: 42, unsubmitted: 3, corrected: 37, needCorrection: 5 },
      unsubmittedStudents: ["费伟涵", "李小红", "张明"]
    },
    {
      id: "hw-03",
      subject: "英语",
      title: "Unit 2 Colors 课文跟读音频打卡",
      content: "朗读Unit 2 Let's talk 3遍，在班级语音小程序打卡；抄写4个新单词并配图记忆。",
      assignedDate: "2026-09-04",
      deadline: "2026-09-05 20:00",
      needParentSign: false,
      needSubmission: true,
      stats: { submitted: 44, unsubmitted: 1, corrected: 44, needCorrection: 0 },
      unsubmittedStudents: ["费伟涵"]
    }
  ],

  // 历次考试成绩与学情分析 
  exams: [
    {
      id: "exam-03",
      name: "第三单元质量测验",
      type: "单元测试",
      date: "2026-09-02",
      subject: "综合 (语文/数学/英语)",
      fullScore: 100,
      stats: {
        avgScore: 86.5,
        trend: "+3.2",
        highest: 99,
        lowest: 68,
        excellentRate: 35.6,
        passRate: 93.3,
        totalParticipants: 45
      },
      // 分数段分布
      distribution: [
        { range: "90-100分 (优秀)", count: 16, percentage: "35.6%" },
        { range: "80-89分 (良好)", count: 20, percentage: "44.4%" },
        { range: "70-79分 (中等)", count: 6, percentage: "13.3%" },
        { range: "60-69分 (及格)", count: 3, percentage: "6.7%" },
        { range: "60分以下", count: 0, percentage: "0.0%" }
      ],
      // 成绩详情榜单
      scores: [
        { studentId: "20240001", name: "陈思远", score: 99, rank: 1, level: "优秀", trend: "+5", comment: "发挥出色，审题极其严谨！" },
        { studentId: "20240006", name: "刘思琪", score: 98, rank: 2, level: "优秀", trend: "+2", comment: "卷面整洁如印刷，解题逻辑清晰。" },
        { studentId: "20240029", name: "邹雅洁", score: 97, rank: 3, level: "优秀", trend: "+4", comment: "作文独占鳌头，语文语感出众。" },
        { studentId: "20240012", name: "林诗涵", score: 96, rank: 4, level: "优秀", trend: "+1", comment: "各学科平衡发展，英语满分。" },
        { studentId: "20240020", name: "沈雅琪", score: 95, rank: 5, level: "优秀", trend: "+3", comment: "思维敏捷，各题型完成质量高。" },
        { studentId: "20240008", name: "周雨萱", score: 95, rank: 5, level: "优秀", trend: "+0", comment: "发挥稳健，学习习惯优良。" },
        { studentId: "20240018", name: "谢雨桐", score: 94, rank: 7, level: "优秀", trend: "+2", comment: "阅读理解部分满分，进步可喜。" },
        { studentId: "20240009", name: "吴俊杰", score: 94, rank: 7, level: "优秀", trend: "+1", comment: "数学压轴题思路新颖。" },
        { studentId: "20240004", name: "赵小美", score: 93, rank: 9, level: "优秀", trend: "+2", comment: "字迹优美，基础题全对。" },
        { studentId: "20240013", name: "黄子轩", score: 93, rank: 9, level: "优秀", trend: "+3", comment: "综合应用题表现突出。" },
        { studentId: "20240010", name: "郑宇轩", score: 92, rank: 11, level: "良好", trend: "+0", comment: "基础扎实，计算粗心丢了2分。" },
        { studentId: "20240003", name: "王小刚", score: 91, rank: 12, level: "良好", trend: "+3", comment: "较上次明显进步，态度端正。" },
        { studentId: "20240007", name: "孙浩然", score: 90, rank: 13, level: "良好", trend: "+1", comment: "理解能力强，书写需略微加快。" },
        { studentId: "20240002", name: "李小红", score: 88, rank: 14, level: "良好", trend: "-2", comment: "粗心有扣分，多花时间检查。" },
        { studentId: "20240005", name: "张明", score: 82, rank: 25, level: "良好", trend: "-5", comment: "上周走神影响了听课效率，需重点辅导应用题。" },
        { studentId: "20240011", name: "费伟涵", score: 72, rank: 41, level: "中等", trend: "-4", comment: "基础计算掌握不牢固，课后已安排一对一帮扶。" }
      ]
    },
    {
      id: "exam-02",
      name: "第二单元阶段评估",
      type: "单元测试",
      date: "2026-08-15",
      subject: "综合 (语文/数学/英语)",
      fullScore: 100,
      stats: {
        avgScore: 83.3,
        trend: "+1.5",
        highest: 98,
        lowest: 65,
        excellentRate: 31.1,
        passRate: 91.1,
        totalParticipants: 45
      }
    },
    {
      id: "exam-01",
      name: "入学学业摸底考",
      type: "摸底考试",
      date: "2026-07-02",
      subject: "综合 (语文/数学/英语)",
      fullScore: 100,
      stats: {
        avgScore: 81.8,
        trend: "--",
        highest: 97,
        lowest: 62,
        excellentRate: 28.8,
        passRate: 88.9,
        totalParticipants: 45
      }
    }
  ],

  // 1530安全教育台账 
  safety1530: [
    {
      id: "safe-001",
      date: "2026-09-04",
      type: "1分钟提醒",
      topic: "交通安全与放学路队安全",
      content: "放学有序排队离校，不横穿马路，过十字路口走人行横道看红绿灯，严禁在马路上追逐打闹。",
      method: "口头提醒 + 强调",
      participants: "全班45人",
      teacher: "周老师",
      status: "已完成",
      materials: "安全提醒晨会PPT"
    },
    {
      id: "safe-002",
      date: "2026-09-03",
      type: "1分钟提醒",
      topic: "防溺水“六不准”提醒",
      content: "再次强调不私自下水游泳，不擅自与他人结伴游泳，不到无安全设施、无救援人员的水域游泳。",
      method: "口头提醒 + 强调",
      participants: "全班45人",
      teacher: "周老师",
      status: "已完成",
      materials: "防溺水宣传海报"
    },
    {
      id: "safe-003",
      date: "2026-08-30",
      type: "5分钟教育",
      topic: "周末防溺水与居家消防用电安全",
      content: "周末外出游玩务必有家长陪同；不玩火、不私拉电线，安全使用家电，遇到火灾用湿毛巾捂住口鼻逃生。",
      method: "案例宣讲 + 播放短片",
      participants: "全班45人",
      teacher: "周老师",
      status: "已完成",
      materials: "《中小学生周末安全锦囊》短视频"
    },
    {
      id: "safe-004",
      date: "2026-08-23",
      type: "5分钟教育",
      topic: "上下学乘车与防陌生人诱骗",
      content: "乘坐正规校车系好安全带；拒乘黑车与超员车；不吃陌生人食物，不跟陌生人离开，遇到危险大声呼救。",
      method: "情景问答 + 宣讲",
      participants: "全班45人",
      teacher: "周老师",
      status: "已完成",
      materials: "防诱骗情景手册"
    },
    {
      id: "safe-005",
      date: "2026-08-19",
      type: "30分钟专题",
      topic: "校园防欺凌与心理健康专项教育",
      content: "1. 明确何为校园欺凌（言语、肢体、网络欺凌等）；2. 遇到欺凌勇敢说“不”并第一时间报告老师家长；3. 倡导同学友爱团结互助，营造温暖班集体。",
      method: "专题班会 + 讨论",
      participants: "全班45人",
      teacher: "周老师",
      status: "已完成",
      materials: "防欺凌专题班会课件、承诺签名书"
    },
    {
      id: "safe-006",
      date: "2026-06-27",
      type: "30分钟专题",
      topic: "暑期长假综合安全教育专题",
      content: "涵盖防溺水、交通安全、食品安全、网络防沉迷、雷雨防雷击等七大模块，全班签署《暑期安全责任告知书》。",
      method: "专题讲座 + 签名归档",
      participants: "全班45人",
      teacher: "周老师",
      status: "已完成",
      materials: "《安全告知书45份》"
    }
  ],

  // 每日健康检测
  healthDaily: {
    date: "2026-09-04",
    normalCount: 44,
    testedCount: 45,
    abnormalCount: 1,
    abnormalDetails: [
      { studentName: "赵小美", temp: "37.5℃", symptom: "轻微流涕发热，家长已带往医院，已居家病假。" }
    ]
  },

  // 班规定制与量化奖惩细则 
  classRules: {
    selectedTemplate: "小学规范标准版",
    templates: [
      { id: "primary", name: "小学规范标准版", ruleCount: 12, desc: "适合1-6年级，突出习惯养成、守纪礼貌、爱护公物与安全自护。" },
      { id: "junior", name: "初中规范标准版", ruleCount: 15, desc: "适合7-9年级，兼顾自主管理、学业规范与人际合作。" },
      { id: "senior", name: "高中规范标准版", ruleCount: 16, desc: "适合10-12年级，强调自我驱动、学术诚信与远大志向。" }
    ],
    rulesList: [
      { id: "r1", category: "守时守纪", content: "按时到校不迟到、不早退、不无故缺勤，进校佩戴红领巾。", reward: "+2分", penalty: "-2分" },
      { id: "r2", category: "学习常规", content: "课前预习准备充分，上课专心听讲，积极思考举手发言。", reward: "+2分", penalty: "-1分" },
      { id: "r3", category: "学习常规", content: "独立认真完成作业，字迹工整，按时订正错题。", reward: "+3分", penalty: "-2分" },
      { id: "r4", category: "文明交往", content: "尊敬师长，友爱同学，使用礼貌用语，不打架、不骂人。", reward: "+2分", penalty: "-3分" },
      { id: "r5", category: "劳动卫生", content: "认真做好值日，保持个人及课桌整洁，爱护公物。", reward: "+2分", penalty: "-2分" },
      { id: "r6", category: "安全自护", content: "课间文明休息，走廊不奔跑追逐，下楼梯靠右慢行。", reward: "+2分", penalty: "-3分" },
      { id: "r7", category: "课间活动", content: "认真做好早操和眼保健操，动作规范，节奏准确。", reward: "+2分", penalty: "-1分" }
    ],
    rewardFineRules: [
      { title: "课堂精彩发言 / 答对难点", points: "+2分", target: "个人", type: "reward" },
      { title: "作业评为全优 / 示范作业", points: "+3分", target: "个人", type: "reward" },
      { title: "值日彻底干净被评为优秀", points: "+2分", target: "值日小组", type: "reward" },
      { title: "主动协助老师或帮助同学", points: "+2分", target: "个人", type: "reward" },
      { title: "体育比赛或艺术展演获奖", points: "+5分", target: "个人", type: "reward" },
      { title: "早读或上课迟到", points: "-2分", target: "个人", type: "penalty" },
      { title: "作业未交或马虎重写", points: "-2分", target: "个人", type: "penalty" },
      { title: "课间追逐打闹违反安全规范", points: "-3分", target: "个人", type: "penalty" },
      { title: "值日不认真敷衍了事", points: "-2分", target: "责任人", type: "penalty" },
      { title: "桌面杂乱、纸屑乱扔", points: "-1分", target: "个人", type: "penalty" }
    ]
  },

  // 班级宠物系统 
  petsList: [
    { id: "cat", name: "咪咪猫", species: "折耳小猫", icon: "🐱", rarity: "可爱萌宠", favFood: "美味小鱼干", desc: "乖巧粘人，每当主人认真完成作业时会高兴地喵喵叫。" },
    { id: "dog", name: "旺财柴", species: "元气柴犬", icon: "🐶", rarity: "元气萌宠", favFood: "能量肉骨头", desc: "充满活力，爱跑步，喜欢陪伴主人早起早读。" },
    { id: "panda", name: "圆圆竹", species: "国宝小熊猫", icon: "🐼", rarity: "稀有萌宠", favFood: "嫩绿鲜竹笋", desc: "憨厚温和，最喜欢抱抱，是班级爱心大使。" },
    { id: "unicorn", name: "梦梦角", species: "魔法独角兽", icon: "🦄", rarity: "梦幻神兽", favFood: "彩虹糖果", desc: "自带彩虹光环，代表着无尽的创造力与想象力。" },
    { id: "penguin", name: "波波企", species: "帝企鹅宝宝", icon: "🐧", rarity: "极地萌宠", favFood: "冰鲜小虾米", desc: "走起路来摇摇摆摆，纪律严明从不违规。" },
    { id: "hamster", name: "布丁鼠", species: "金丝仓鼠", icon: "🐹", rarity: "微型萌宠", favFood: "香脆葵花籽", desc: "两颊鼓鼓囊囊，最擅长在书桌前陪伴思考。" },
    { id: "koala", name: "嘟嘟拉", species: "考拉小熊", icon: "🐨", rarity: "森林萌宠", favFood: "桉树嫩叶", desc: "沉静安详，热爱大自然与安静阅读。" },
    { id: "rabbit", name: "雪球兔", species: "长耳白兔", icon: "🐰", rarity: "灵动萌宠", favFood: "甜脆胡萝卜", desc: "蹦蹦跳跳聪明伶俐，书写作业干净利落。" },
    { id: "seal", name: "海宝儿", species: "斑海豹幼崽", icon: "🦭", rarity: "海洋萌宠", favFood: "极地小银鱼", desc: "圆滚滚的大眼睛，喜欢为班级的每一次进步拍手叫好。" },
    { id: "fox", name: "红灵狐", species: "赤狐宝宝", icon: "🦊", rarity: "智慧萌宠", favFood: "野莓果子", desc: "机智聪颖，是思维奥数难题的侦探助手。" },
    { id: "deer", name: "呦呦鹿", species: "梅花小鹿", icon: "🦌", rarity: "优雅萌宠", favFood: "清晨甘露草", desc: "举止优雅从容，代表着文明礼仪与友善关怀。" },
    { id: "alpaca", name: "软软驼", species: "高原羊驼", icon: "🦙", rarity: "治愈萌宠", favFood: "青翠苜蓿草", desc: "毛茸茸的治愈大师，能化解所有学习压力和小烦恼。" },
    { id: "canary", name: "乐乐雀", species: "金丝雀", icon: "🐤", rarity: "歌者萌宠", favFood: "黄金谷物棒", desc: "歌声如银铃般悦耳，每天清晨在晨读中伴唱。" },
    { id: "raccoon", name: "灰灰熊", species: "干脆小浣熊", icon: "🦝", rarity: "动手达人", favFood: "脆皮坚果", desc: "爱干净讲卫生，洗手做卫生最积极。" },
    { id: "husky", name: "酷酷哈", species: "哈士奇雪橇犬", icon: "🐺", rarity: "开心果", favFood: "超级大鸡腿", desc: "班级开心果，给紧张的学习氛围带来满满欢声笑语。" }
  ],

  // 宠物商店商品
  petShop: [
    { id: "food-1", name: "香脆小饼干", type: "food", cost: 10, hunger: +25, exp: +15, icon: "🍪", desc: "宠物最爱的日常解馋零食" },
    { id: "food-2", name: "多汁红苹果", type: "food", cost: 15, hunger: +40, exp: +25, icon: "🍎", desc: "富含营养，补充活力体力" },
    { id: "food-3", name: "特级能量糖果", type: "food", cost: 25, hunger: +60, exp: +50, icon: "🍬", desc: "可大幅加速成长进化的魔法糖果" },
    { id: "toy-1", name: "快乐小皮球", type: "toy", cost: 20, happy: +30, exp: +20, icon: "⚽", desc: "和宠物一起玩耍，心情值大涨" },
    { id: "toy-2", name: "彩色魔方玩具", type: "toy", cost: 30, happy: +45, exp: +35, icon: "🎲", desc: "锻炼宠物智力，增加好感度" },
    { id: "outfit-1", name: "金色荣誉学士帽", type: "outfit", cost: 50, happy: +50, exp: +60, icon: "🎓", desc: "学霸宠物的标志装扮！" },
    { id: "outfit-2", name: "优雅小红蝴蝶结", type: "outfit", cost: 40, happy: +40, exp: +45, icon: "🎀", desc: "给宠物系上，颜值翻倍" },
    { id: "outfit-3", name: "星空魔法斗篷", type: "outfit", cost: 80, happy: +80, exp: +100, icon: "🪄", desc: "散发星辰微光的华丽披风" }
  ],

  // 家校沟通记录与待处理事项
  communication: {
    notices: [
      {
        id: "nt-01",
        title: "关于本周五召开2026学年秋季期中家长会的通知",
        date: "2026-09-03",
        deadline: "2026-09-04 18:00",
        readCount: 42,
        unreadCount: 3,
        content: "各位家长好：为进一步搭建家校育人桥梁，我校定于本周五下午15:00在博学楼302教室召开期中家长会，请合理安排时间准时参会，绿色出行。收到请点击确认回执。",
        needReceipt: true,
        unreadParents: ["费伟涵家长", "李小红家长", "张明家长"]
      },
      {
        id: "nt-02",
        title: "关于秋冬季预防支原体肺炎与流感的温馨提示",
        date: "2026-08-28",
        deadline: "2026-08-29",
        readCount: 45,
        unreadCount: 0,
        content: "近期气温变化较大，请家长督促孩子早晚添衣，保证充足睡眠，多饮温水，如出现发热咳嗽等症状请及时就医并告知班主任。",
        needReceipt: false,
        unreadParents: []
      }
    ],
    logs: [
      {
        id: "comm-01",
        studentName: "张明",
        guardian: "张先生 (父亲)",
        method: "电话沟通",
        date: "2026-09-03",
        topic: "数学课堂听课注意力及近期作业订正情况",
        feedback: "家长表示近期孩子晚上练琴时间较晚导致白天精力不足，已承诺本周起9:00前入睡保证睡眠。",
        actionPlan: "下周跟踪观察张明第一节数学课精神面貌。",
        status: "跟进中"
      },
      {
        id: "comm-02",
        studentName: "费伟涵",
        guardian: "费先生 (父亲)",
        method: "微信沟通",
        date: "2026-09-04",
        topic: "今晨缺勤原因及近期作业拖欠督促",
        feedback: "家长诚恳道歉，说明早晨因手机闹钟故障起晚，正亲自护送孩子到校，并会在今晚督促完成欠交作业。",
        actionPlan: "中午利用大课间为孩子补齐作业知识点。",
        status: "已处理"
      },
      {
        id: "comm-03",
        studentName: "赵小美",
        guardian: "赵女士 (母亲)",
        method: "电话沟通",
        date: "2026-09-04",
        topic: "感冒病假关心与居家休养指导",
        feedback: "赵女士对老师的关心致谢，表示目前体温已恢复至37.2℃，医生诊断为轻微受凉，休养一天明日即可返校。",
        actionPlan: "明日返校晨检特别关注体温。",
        status: "已处理"
      }
    ],
    longTimeUntouched: [
      { studentName: "董浩宇", lastDate: "2026-07-10", days: 56, reason: "开学至今表现平稳，尚未安排单独深入家访" },
      { studentName: "严俊杰", lastDate: "2026-07-15", days: 51, reason: "建议结合下周科学探究表现进行一次电话回访" }
    ]
  },

  // 班级积分与宠物成长换算规则
  scoreRules: {
    baseScore: 80,             // 基础初始分
    hwSubmitBonus: 5,          // 作业按时提交奖励分
    hwUnsubmitPenalty: -2,     // 作业拖欠未交扣除分
    examExcellent: 20,         // 考试优秀 (>=90) 奖励分
    examGood: 10,              // 考试良好 (80-89) 奖励分
    examPass: 5,               // 考试及格 (60-79) 奖励分
    examFail: 0,               // 考试不及格 (<60) 奖励分
    attNormalBonus: 5,         // 今日正常全勤奖励分
    attLatePenalty: -2,        // 迟到扣除分
    attAbsentPenalty: -5,      // 旷课缺勤扣除分
    growthAward: 3             // 课堂积极/好人好事表扬分
  },

  // 班级活动台账与成长相册
  activities: [
    {
      id: "act-01",
      name: "“红领巾爱祖国”秋季主题班会",
      type: "主题班会",
      date: "2026-09-01",
      location: "本班教室",
      summary: "全班重温少先队誓词，各小组交流暑期红色研学见闻，确立新学期班级奋斗目标，师生齐唱队歌，氛围热烈庄重。",
      goals: "增强少先队员光荣感与使命感，树立“强国有我”的新学期成长目标，凝聚班集体团结向上的精神力量。",
      highlights: [
        "班长陈思远带领全班重温少先队誓词，声音洪亮铿锵",
        "第二组李小红分享《寻访红色足迹》暑期调研小报",
        "全班共同签署《新学期向阳班级自主公约》"
      ],
      reflection: "本次班会参与度达到100%，学生发言踊跃。通过仪式感强烈的宣誓与小报分享，有效调动了新学期开学学习斗志，后续可将班级公约融入每日值日考核中。",
      attendanceCount: 45,
      photos: [
        { id: "p-01", title: "全班佩戴红领巾庄严宣誓", tag: "集体合影", date: "2026-09-01", uploader: "周老师", icon: "🚩" },
        { id: "p-02", title: "陈思远同学主持开学第一课", tag: "精彩瞬间", date: "2026-09-01", uploader: "周老师", icon: "🎤" },
        { id: "p-03", title: "学生优秀红色手抄报展播", tag: "作品展示", date: "2026-09-01", uploader: "周老师", icon: "🎨" },
        { id: "p-04", title: "各小组热烈讨论新学期奋斗目标", tag: "精彩瞬间", date: "2026-09-01", uploader: "周老师", icon: "💬" }
      ]
    },
    {
      id: "act-02",
      name: "三年级校园亲子趣味运动会",
      type: "运动会",
      date: "2026-09-22",
      location: "学校大操场",
      summary: "包含齐心协力大脚板、接力运球、袋鼠跳等趣味亲子项目，10位家长志愿者全流程跟进服务，增进亲子沟通与家校信任。",
      goals: "强健学生体魄，培养坚韧拼搏精神与团队协作力，搭建亲切互信的家校共育互动平台。",
      highlights: [
        "家长代表与学生搭档参加“摸石过河”默契配合",
        "第四组在迎面接力赛中顽强逆转夺得年级第一",
        "家校志愿者服务队细心做好防暑补水和安全防护"
      ],
      reflection: "运动会充分释放了孩子们的阳光活力，平时较为内向的同学在赛场上表现抢眼，家校氛围融洽，获得了年级道德风尚奖。",
      attendanceCount: 45,
      photos: [
        { id: "p-05", title: "全班运动员入场式整齐方阵", tag: "集体合影", date: "2026-09-22", uploader: "周老师", icon: "🏃" },
        { id: "p-06", title: "亲子齐心协力大脚板冲刺时刻", tag: "精彩瞬间", date: "2026-09-22", uploader: "周老师", icon: "🏅" },
        { id: "p-07", title: "家长志愿者服务站温馨瞬间", tag: "精彩瞬间", date: "2026-09-22", uploader: "周老师", icon: "🤝" }
      ]
    },
    {
      id: "act-03",
      name: "探秘自然·杭州植物园研学实践",
      type: "研学活动",
      date: "2026-10-18",
      location: "植物园标本馆",
      summary: "已制定研学安全应急预案，分6个小队开展秋季植物标本收集、叶脉书签制作与自然笔记创作。",
      goals: "走出课堂拓宽科学视野，亲近大自然，培养动手观察、分类记录和生态环境保护意识。",
      highlights: [
        "科普导师现场讲解珍稀植物识别技巧与生长规律",
        "各小组自主合作采集落叶制作创意叶脉书签",
        "开展环保“无痕山林”行动，全程自觉捡拾垃圾"
      ],
      reflection: "研学过程井然有序，无任何安全意外。学生完成了45份优秀的植物观察手记，将与美术老师合作举办一期自然艺术展。",
      attendanceCount: 45,
      photos: [
        { id: "p-08", title: "植物园标本馆门前集体大合影", tag: "集体合影", date: "2026-10-18", uploader: "周老师", icon: "🌿" },
        { id: "p-09", title: "同学们认真采集观察秋季落叶", tag: "精彩瞬间", date: "2026-10-18", uploader: "周老师", icon: "🔍" },
        { id: "p-10", title: "学生创作的精美叶脉书签成品展", tag: "作品展示", date: "2026-10-18", uploader: "周老师", icon: "📑" }
      ]
    }
  ],

  // 常用报表中心模板库 (可增删改、支持本地上传自拟模板)
  reportTemplates: [
    { id: "r1", name: "每日班级日志", cycle: "每天生成", desc: "汇总今日出勤、请假、课表、值日及重要事项记录", format: "Excel / PDF" },
    { id: "r2", name: "每周班务总结", cycle: "每周更新", desc: "本周事务完成情况、重点学生跟进、安全教育留痕", format: "Excel / Word" },
    { id: "r3", name: "月度工作总结", cycle: "每月生成", desc: "出勤率汇总、学情月考分析、家校沟通月度报表", format: "Word / PDF" },
    { id: "r4", name: "学生考勤明细表", cycle: "每月生成", desc: "全班45名学生每日出勤、病事假、迟到累计汇总表", format: "Excel" },
    { id: "r5", name: "作业完成情况表", cycle: "每周更新", desc: "各科作业提交率、未交清单、订正率周报表", format: "Excel" },
    { id: "r6", name: "学生成长记录表", cycle: "每月生成", desc: "包含十维评价表现、小红花积分榜、荣誉勋章明细", format: "Excel / PDF" },
    { id: "r7", name: "家校沟通记录表", cycle: "每周生成", desc: "电话/微信/面谈/家访台账留痕，便于督导检查", format: "Excel / Word" },
    { id: "r8", name: "1530安全教育台账", cycle: "活动后更新", desc: "1分钟放学提醒、5分钟周末教育、长假30分钟专题归档", format: "Excel / PDF" },
    { id: "r9", name: "班级活动纪要相册", cycle: "活动后更新", desc: "班会、家长会、研学活动图文纪要与总结报告", format: "PDF" },
    { id: "r10", name: "学期班主任工作总结", cycle: "学期末生成", desc: "全学期班级建设全景式述职总结报告（配图表）", format: "Word / PDF" }
  ]
};

// 为所有学生自动补齐标准18位身份证号
if (DEFAULT_DATA.students) {
  DEFAULT_DATA.students.forEach((s, idx) => {
    if (!s.idCard) {
      const b = (s.birthday || "2016-05-15").replace(/-/g, "");
      const seq = String(1001 + idx).slice(1);
      const genderDigit = s.gender === "女" ? "2" : "1";
      s.idCard = `110101${b}${seq}${genderDigit}`;
    }
  });
}

// 为所有考试自动补齐自定义科目细分
if (DEFAULT_DATA.exams) {
  DEFAULT_DATA.exams.forEach(e => {
    if (!e.subjects) e.subjects = ["语文", "数学", "英语", "科学"];
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
        }
      });
    }
  });
}

// 导出全局
if (typeof window !== "undefined") {
  window.DEFAULT_DATA = DEFAULT_DATA;
}

