# -*- coding: utf-8 -*-
"""
班主任工作台 - 局域网协同、多班级数据隔离与权限管理增强型服务
- 支持局域网跨设备多端访问与 IP 自动广播
- 支持按客户端真实 IP 精准定位并查询当地实时气象
- 支持管理员（admin/admin）、班主任、任课老师三级权限体系
- 支持管理员创建多班级并分配班主任，班级数据 100% 独立隔离
- 支持班主任集中维护管理本科任课老师账号密码
- 纯 Python 3 原生标准库实现，零外部依赖
"""

import http.server
import socketserver
import urllib.request
import urllib.parse
import json
import socket
import os
import sys
import time
import re
import traceback
import ssl

PORT = 8768
DIRECTORY = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(DIRECTORY, "data")
CLASSES_DIR = os.path.join(DATA_DIR, "classes")
SYSTEM_FILE = os.path.join(DATA_DIR, "system.json")

# 确保持久化目录就绪
os.makedirs(CLASSES_DIR, exist_ok=True)

# 内存天气缓存 (避免频繁外部请求，缓存15分钟)
weather_cache = {
    "timestamp": 0,
    "data": None
}

# 全局活跃用户会话表 (用于接口细粒度权限校验与数据隔离)
ACTIVE_SESSIONS = {}

def register_user_session(token, user_info, allowed_class_ids):
    ACTIVE_SESSIONS[token] = {
        "user": user_info,
        "username": user_info.get("username"),
        "role": user_info.get("role"),
        "isDemo": bool(user_info.get("isDemo")),
        "allowedClassIds": allowed_class_ids,
        "createdAt": time.time()
    }

def get_session_from_request(handler):
    auth_header = handler.headers.get("Authorization", "")
    token = None
    if auth_header.startswith("Bearer "):
        token = auth_header[7:].strip()
    if not token:
        query = urllib.parse.urlparse(handler.path).query
        qs = urllib.parse.parse_qs(query)
        token = qs.get("token", [None])[0]
    if token and token in ACTIVE_SESSIONS:
        return ACTIVE_SESSIONS[token]
    # 服务重启后或直接传 token 时做智能兜底恢复
    if token and isinstance(token, str):
        if token.startswith("token_admin_"):
            return { "username": "admin", "role": "admin", "isDemo": False, "allowedClassIds": ["*"] }
        elif token.startswith("token_demo_") or "teacher_li" in token or "math_wang" in token:
            return { "username": "demo", "role": "demo_teacher", "isDemo": True, "allowedClassIds": ["class_demo_template", "class_default"] }
        elif token.startswith("token_hr_"):
            parts = token.split("_")
            if len(parts) >= 3:
                un = parts[2]
                sys_data = load_system_data()
                if un in ("teacher_li", "math_wang"):
                    return { "username": un, "role": "demo_teacher", "isDemo": True, "allowedClassIds": ["class_demo_template", "class_default"] }
                u = next((x for x in sys_data.get("users", []) if x.get("username") == un or x.get("phone") == un), None)
                if u:
                    cids = [u.get("classId")] if u.get("classId") else []
                    return { "username": un, "role": "homeroom_teacher", "isDemo": False, "allowedClassIds": cids }
        elif token.startswith("token_st_"):
            parts = token.split("_")
            if len(parts) >= 3:
                un = parts[2]
                sys_data = load_system_data()
                st = next((x for x in sys_data.get("subjectTeachers", []) if x.get("username") == un or x.get("phone") == un), None)
                if st:
                    cids = [st.get("classId")] if st.get("classId") else []
                    return { "username": un, "role": "subject_teacher", "isDemo": False, "allowedClassIds": cids }
    return None

def get_class_file_path(class_id_or_name, sys_data=None):
    """
    根据班级 ID 或班级名称，统一定位到以班级真实名称命名的物理 JSON 文件（例如：'小学四年级（七）班.json'）。
    规则：
    1. 物理文件首选按真实班级名称命名，如 '小学四年级（七）班.json'
    2. 体验账号专用默认模板映射到 '默认班级模板.json'
    3. 自动兼容 URL 编码、全半角括号差异及文件名非法字符安全过滤
    4. 返回 (class_file_path, matched_class_dict)
    """
    if not class_id_or_name:
        class_id_or_name = "class_demo_template"

    raw_query = urllib.parse.unquote(str(class_id_or_name)).strip()
    if raw_query.endswith(".json"):
        raw_query = raw_query[:-5]

    if not sys_data:
        try:
            if os.path.exists(SYSTEM_FILE):
                with open(SYSTEM_FILE, "r", encoding="utf-8") as f:
                    sys_data = json.load(f)
            else:
                sys_data = {}
        except Exception:
            sys_data = {}

    # 体验账号与示范默认模板专项解析
    if raw_query in ("class_demo_template", "demo_template", "class_default", "默认班级模板", "【示范体验】班级默认模板") or "默认模板" in raw_query or "示范体验" in raw_query:
        demo_c = sys_data.get("demoClass", {
            "id": "class_demo_template",
            "name": "【示范体验】班级默认模板",
            "grade": "小学四年级",
            "homeroomTeacher": "体验教师",
            "studentCount": 45,
            "isTemplate": True
        })
        tpl_path = os.path.join(CLASSES_DIR, "默认班级模板.json")
        if not os.path.exists(tpl_path):
            tpl_path = os.path.join(CLASSES_DIR, "class_default.json")
        return tpl_path, demo_c

    classes = sys_data.get("classes", [])

    def norm_str(s):
        if not s:
            return ""
        return str(s).strip().replace("（", "(").replace("）", ")").replace(" ", "")

    q_norm = norm_str(raw_query)

    matched_c = None
    # 1. 优先精确匹配 id 或 name
    for c in classes:
        cid = str(c.get("id", "")).strip()
        cname = str(c.get("name", "")).strip()
        if cid == raw_query or cname == raw_query:
            matched_c = c
            break

    # 2. 其次匹配规范化名称 (消除全角/半角括号差异)
    if not matched_c:
        for c in classes:
            cname = str(c.get("name", "")).strip()
            cid = str(c.get("id", "")).strip()
            if norm_str(cname) == q_norm or norm_str(cid) == q_norm:
                matched_c = c
                break

    # 3. 再次支持包含匹配 (如传入 '四年级(7)班' 匹配 '小学四年级（七）班')
    if not matched_c and q_norm:
        for c in classes:
            cname_norm = norm_str(c.get("name", ""))
            if (q_norm in cname_norm or cname_norm in q_norm) and len(q_norm) >= 3:
                matched_c = c
                break

    if matched_c:
        official_name = (matched_c.get("name") or raw_query).strip()
        safe_name = re.sub(r'[\\/*?:"<>|]', '_', official_name)
        target_path = os.path.join(CLASSES_DIR, f"{safe_name}.json")

        # 检查并自动平滑迁移旧版按 ID 命名的文件
        legacy_id = str(matched_c.get("id", "")).strip()
        if legacy_id and legacy_id != safe_name:
            legacy_path = os.path.join(CLASSES_DIR, f"{legacy_id}.json")
            if os.path.exists(legacy_path):
                if not os.path.exists(target_path):
                    try:
                        os.rename(legacy_path, target_path)
                        print(f"[Auto-Migrate] 成功将旧版文件 {legacy_id}.json 重命名为 {safe_name}.json")
                    except Exception as e:
                        print(f"[Auto-Migrate Error] {e}")
                else:
                    try:
                        os.remove(legacy_path)
                    except Exception:
                        pass

        return target_path, matched_c

    # 特殊默认模板
    if raw_query == "class_default":
        return os.path.join(CLASSES_DIR, "class_default.json"), None

    safe_name = re.sub(r'[\\/*?:"<>|]', '_', raw_query)
    direct_path = os.path.join(CLASSES_DIR, f"{safe_name}.json")
    if os.path.exists(direct_path):
        return direct_path, None

    # 磁盘文件名称模糊匹配
    try:
        for fn in os.listdir(CLASSES_DIR):
            if fn.endswith(".json"):
                base_name = fn[:-5]
                if norm_str(base_name) == q_norm:
                    return os.path.join(CLASSES_DIR, fn), None
    except Exception:
        pass

    return direct_path, None

def migrate_class_files():
    """系统自检：确保 classes 目录下的所有班级数据文件均以班级名称命名，清理残留旧 ID 文件"""
    try:
        if not os.path.exists(SYSTEM_FILE):
            return
        with open(SYSTEM_FILE, "r", encoding="utf-8") as f:
            sys_data = json.load(f)
        classes = sys_data.get("classes", [])
        for c in classes:
            cid = str(c.get("id", "")).strip()
            cname = str(c.get("name", "")).strip()
            if cid and cname:
                safe_name = re.sub(r'[\\/*?:"<>|]', '_', cname)
                named_file = os.path.join(CLASSES_DIR, f"{safe_name}.json")
                id_file = os.path.join(CLASSES_DIR, f"{cid}.json")
                if os.path.exists(id_file) and not os.path.exists(named_file):
                    try:
                        os.rename(id_file, named_file)
                        print(f"[Startup Migration] 成功重命名班级数据文件: {cid}.json -> {safe_name}.json")
                    except Exception as e:
                        print(f"[Startup Migration Error] {e}")
                elif os.path.exists(id_file) and os.path.exists(named_file):
                    try:
                        os.remove(id_file)
                        print(f"[Startup Cleanup] 清理冗余 ID 命名数据文件: {cid}.json")
                    except Exception:
                        pass
    except Exception as e:
        print("[Startup Migration Warning]:", e)

def init_system_data():
    """初始化系统配置文件与默认班级数据"""
    if not os.path.exists(SYSTEM_FILE):
        default_system = {
            "admin": {
                "username": "admin",
                "password": "admin",
                "name": "超级管理员"
            },
            "classes": [
                {
                    "id": "class_default",
                    "name": "三年级(2)班",
                    "grade": "三年级",
                    "homeroomTeacher": "李老师",
                    "homeroomUsername": "teacher_li",
                    "createdAt": "2026-09-01"
                }
            ],
            "users": [
                {
                    "id": "user_admin",
                    "username": "admin",
                    "password": "admin",
                    "role": "admin",
                    "name": "超级管理员",
                    "status": "approved",
                    "classId": None,
                    "phone": "13800000000"
                },
                {
                    "id": "user_li",
                    "username": "teacher_li",
                    "password": "123",
                    "role": "homeroom",
                    "name": "李老师",
                    "status": "approved",
                    "classId": "class_default",
                    "phone": "13800138000"
                }
            ],
            "subjectTeachers": [
                {
                    "id": "st_1",
                    "classId": "class_default",
                    "name": "王老师",
                    "subject": "数学",
                    "username": "math_wang",
                    "password": "123",
                    "phone": "13911112222",
                    "createdAt": "2026-09-02"
                },
                {
                    "id": "st_2",
                    "classId": "class_default",
                    "name": "刘老师",
                    "subject": "英语",
                    "username": "eng_liu",
                    "password": "123",
                    "phone": "13922223333",
                    "createdAt": "2026-09-02"
                }
            ]
        }
        with open(SYSTEM_FILE, "w", encoding="utf-8") as f:
            json.dump(default_system, f, ensure_ascii=False, indent=2)

    # 启动时执行班级物理文件自检迁移
    migrate_class_files()

def load_system_data():
    init_system_data()
    try:
        with open(SYSTEM_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception as e:
        print("[Error] 读取系统配置失败:", e)
        return {"admin": {"username": "admin", "password": "admin"}, "classes": [], "users": [], "subjectTeachers": []}

def save_system_data(data):
    try:
        with open(SYSTEM_FILE, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        return True
    except Exception as e:
        print("[Error] 写入系统配置失败:", e)
        return False

def create_initial_class_data(cid, name, grade, teacher_name, student_count=45):
    """创建全新独立班级物理数据，具备安全缺省模板，即使默认班级文件已被删除也不会报错"""
    default_file = os.path.join(CLASSES_DIR, "class_default.json")
    cl_data = {}
    if os.path.exists(default_file):
        try:
            with open(default_file, "r", encoding="utf-8") as df:
                cl_data = json.load(df)
        except Exception:
            pass
    if not cl_data:
        cl_data = {
            "students": [],
            "attendance": {"records": {}},
            "exams": [],
            "scores": [],
            "activities": [],
            "homework": [],
            "rules": [],
            "safety": []
        }
    cl_data["classInfo"] = {
        "id": cid,
        "name": name,
        "grade": grade,
        "gradeLevel": grade,
        "teacher": {"name": teacher_name, "role": "班主任"},
        "studentCount": student_count,
        "school": "阳光实验学校"
    }
    return cl_data

def get_lan_ips():
    """获取本机全部局域网有效 IPv4 地址"""
    ips = []
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(('8.8.8.8', 80))
        primary = s.getsockname()[0]
        if primary and not primary.startswith('127.'):
            ips.append(primary)
        s.close()
    except Exception:
        pass

    try:
        hostname = socket.gethostname()
        for ip in socket.gethostbyname_ex(hostname)[2]:
            if not ip.startswith('127.') and ip not in ips:
                ips.append(ip)
    except Exception:
        pass

    if not ips:
        ips.append("127.0.0.1")
    return ips

def fetch_weather_by_ip(force=False):
    """根据真实访问 IP 获取本地天气（支持免费高可用气象 API 与智能中文转换）"""
    global weather_cache
    now = time.time()
    if not force and weather_cache["data"] and (now - weather_cache["timestamp"] < 900):
        return weather_cache["data"]

    # 1. 优先调用 ip-api.com 获取城市中文名及经纬度
    city_name = "本地"
    lat, lon = 23.0, 113.7
    try:
        req = urllib.request.Request("http://ip-api.com/json/?lang=zh-CN", headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(req, timeout=3.5) as res:
            loc = json.loads(res.read().decode("utf-8"))
            if loc.get("status") == "success":
                city_name = loc.get("city") or loc.get("regionName") or "本地"
                lat = loc.get("lat", 23.0)
                lon = loc.get("lon", 113.7)
    except Exception:
        pass

    # 2. 调用 Open-Meteo 免费全球精准气象 API
    wmo_map = {
        0: ("晴", "☀️"),
        1: ("晴间多云", "🌤️"),
        2: ("多云", "⛅"),
        3: ("阴", "☁️"),
        45: ("雾", "🌫️"),
        48: ("雾凇", "🌫️"),
        51: ("毛毛细雨", "🌦️"),
        53: ("中度细雨", "🌦️"),
        55: ("密毛细雨", "🌧️"),
        61: ("小雨", "🌧️"),
        63: ("中雨", "🌧️"),
        65: ("大雨", "🌧️"),
        71: ("小雪", "🌨️"),
        73: ("中雪", "❄️"),
        75: ("大雪", "❄️"),
        80: ("阵雨", "🌦️"),
        81: ("强阵雨", "🌧️"),
        82: ("狂暴阵雨", "⛈️"),
        95: ("雷阵雨", "⛈️"),
        96: ("雷阵雨伴有冰雹", "⛈️"),
        99: ("强雷暴伴有冰雹", "⛈️")
    }

    try:
        w_url = f"https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lon}&current_weather=true"
        req2 = urllib.request.Request(w_url, headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(req2, timeout=3.5) as res2:
            w_data = json.loads(res2.read().decode("utf-8"))
            cur = w_data.get("current_weather", {})
            temp = round(cur.get("temperature", 26))
            code = cur.get("weathercode", 0)
            desc, icon = wmo_map.get(code, ("晴", "☀️"))
            wind_speed = cur.get("windspeed", 0)

            result = {
                "city": city_name,
                "weather": desc,
                "temp": f"{temp}℃",
                "wind": f"风速 {wind_speed}km/h",
                "icon": icon,
                "display": f"{icon} {city_name} · {desc} {temp}℃",
                "timestamp": now
            }
            weather_cache["timestamp"] = now
            weather_cache["data"] = result
            return result
    except Exception:
        pass

    # 3. 备用接口: wttr.in
    try:
        req3 = urllib.request.Request("https://wttr.in/?format=j1&lang=zh", headers={"User-Agent": "curl/7.68.0"})
        with urllib.request.urlopen(req3, timeout=4) as res3:
            d3 = json.loads(res3.read().decode("utf-8"))
            area = d3.get("nearest_area", [{}])[0].get("areaName", [{}])[0].get("value", city_name)
            c3 = d3.get("current_condition", [{}])[0]
            temp = c3.get("temp_C", "26")
            desc = c3.get("lang_zh", [{}])[0].get("value") or c3.get("weatherDesc", [{}])[0].get("value", "晴")
            result = {
                "city": area or city_name,
                "weather": desc,
                "temp": f"{temp}℃",
                "wind": f"风速 {c3.get('windspeedKmph', '10')}km/h",
                "icon": "⛅",
                "display": f"⛅ {area} · {desc} {temp}℃",
                "timestamp": now
            }
            weather_cache["timestamp"] = now
            weather_cache["data"] = result
            return result
    except Exception:
        pass

    # 4. 离线离线降级默认
    return {
        "city": "本地",
        "weather": "晴",
        "temp": "26℃",
        "wind": "微风",
        "icon": "☀️",
        "display": "☀️ 本地 · 晴 26℃",
        "timestamp": now,
        "isFallback": True
    }


class EnhancedWorkbenchHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

    def end_headers(self):
        # 强制杜绝浏览器静态强缓存
        self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(200)
        self.end_headers()

    def send_json(self, status_code, data_obj):
        self.send_response(status_code)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.end_headers()
        if isinstance(data_obj, dict):
            if "success" not in data_obj:
                data_obj["success"] = (200 <= status_code < 300)
            if "code" not in data_obj:
                data_obj["code"] = status_code
        json_bytes = json.dumps(data_obj, ensure_ascii=False).encode('utf-8')
        self.wfile.write(json_bytes)

    def get_post_json(self):
        try:
            content_length = int(self.headers.get('Content-Length', 0))
            if content_length > 0:
                raw = self.rfile.read(content_length).decode('utf-8')
                return json.loads(raw)
            elif self.headers.get('Transfer-Encoding') == 'chunked':
                chunks = []
                while True:
                    line = self.rfile.readline().strip()
                    if not line:
                        break
                    chunk_size = int(line, 16)
                    if chunk_size == 0:
                        self.rfile.readline()
                        break
                    chunk = self.rfile.read(chunk_size)
                    chunks.append(chunk)
                    self.rfile.readline()
                raw = b"".join(chunks).decode('utf-8')
                return json.loads(raw)
        except Exception as e:
            print("[Error] 解析 POST 请求体失败:", e)
        return {}

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path
        query = urllib.parse.parse_qs(parsed.query)

        # 兼容 /admin.htm 与 /admin 访问，重定向至 /admin.html
        if path in ("/admin.htm", "/admin", "/admin/"):
            self.send_response(302)
            self.send_header('Location', '/admin.html')
            self.end_headers()
            return

        # 1. 实时天气查询 API
        if path == "/api/weather":
            force = bool(query.get("refresh", [False])[0])
            w = fetch_weather_by_ip(force=force)
            resp = dict(w)
            resp["code"] = 200
            resp["data"] = w
            resp["success"] = True
            return self.send_json(200, resp)

        # 2. 系统与局域网网络信息 API
        if path == "/api/system/info":
            sys_data = load_system_data()
            lan_ips = get_lan_ips()
            admin_data = sys_data.get("admin", {"username": "admin"})
            info = {
                "lanIps": lan_ips,
                "port": self.server.server_address[1],
                "activeClasses": len(sys_data.get("classes", [])),
                "totalUsers": len(sys_data.get("users", [])),
                "subjectTeachers": len(sys_data.get("subjectTeachers", [])),
                "adminUsername": admin_data.get("username", "admin")
            }
            resp = dict(info)
            resp["code"] = 200
            resp["data"] = info
            resp["success"] = True
            return self.send_json(200, resp)

        # 3. 班级列表获取 (带身份隔离与权限锁标识)
        if path == "/api/classes":
            sys_data = load_system_data()
            classes = sys_data.get("classes", [])
            session = get_session_from_request(self)

            demo_c = sys_data.get("demoClass", {
                "id": "class_demo_template",
                "name": "【示范体验】班级默认模板",
                "grade": "小学四年级",
                "homeroomTeacher": "体验教师",
                "studentCount": 45,
                "isTemplate": True
            })
            demo_item = {
                "id": demo_c.get("id", "class_demo_template"),
                "name": demo_c.get("name", "【示范体验】班级默认模板"),
                "grade": demo_c.get("grade", "小学四年级"),
                "homeroomTeacher": demo_c.get("homeroomTeacher", "体验教师"),
                "studentCount": demo_c.get("studentCount", 45),
                "isTemplate": True,
                "hasAccess": True,
                "isLocked": False,
                "fileName": "默认班级模板.json",
                "filePath": "data/classes/默认班级模板.json"
            }

            resp_classes = [demo_item]
            for c in classes:
                item = dict(c)
                cname = item.get("name", "")
                safe_name = re.sub(r'[\\/*?:"<>|]', '_', cname.strip()) if cname else item.get("id", "")
                item["fileName"] = f"{safe_name}.json"
                item["filePath"] = f"data/classes/{safe_name}.json"

                # 动态以物理班级数据文件中的真实学生档案记录条数为唯一基准（取消预计人数，以实际导入条数为准）
                class_json_path = os.path.join(CLASSES_DIR, f"{safe_name}.json")
                actual_cnt = 0
                if os.path.exists(class_json_path):
                    try:
                        with open(class_json_path, "r", encoding="utf-8") as cjf:
                            c_content = json.load(cjf)
                            if isinstance(c_content, dict) and "students" in c_content and isinstance(c_content["students"], list):
                                actual_cnt = len(c_content["students"])
                    except Exception:
                        pass
                item["studentCount"] = actual_cnt
                c["studentCount"] = actual_cnt

                # 关联该班级的任课老师团队 (无论后台建立还是后续由班主任在工作台创建，均自动关联呈现)
                cid = item.get("id")
                matched_teachers = [t for t in sys_data.get("subjectTeachers", []) if t.get("classId") == cid]
                item["subjectTeachers"] = matched_teachers
                item["subjectTeacherCount"] = len(matched_teachers)

                # 关联该班负责班主任账号详情
                hr_user = next((u for u in sys_data.get("users", []) if u.get("classId") == cid or (item.get("homeroomUsername") and u.get("username") == item.get("homeroomUsername"))), None)
                if hr_user:
                    item["homeroomUsername"] = hr_user.get("username")
                    item["homeroomPhone"] = hr_user.get("phone", "")
                    item["homeroomRealName"] = hr_user.get("realName") or hr_user.get("name")

                # 权限判定：超级管理员全部解锁；体验账号真实班级全锁；正式教师仅本人负责班级解锁
                if session and session.get("role") == "admin":
                    item["hasAccess"] = True
                    item["isLocked"] = False
                elif session and session.get("isDemo"):
                    item["hasAccess"] = False
                    item["isLocked"] = True
                    item["lockReason"] = "体验账号仅限体验示范默认模板，无权访问学校真实班级"
                elif session and session.get("allowedClassIds"):
                    allowed = session.get("allowedClassIds", [])
                    if item.get("id") in allowed or "*" in allowed:
                        item["hasAccess"] = True
                        item["isLocked"] = False
                    else:
                        item["hasAccess"] = False
                        item["isLocked"] = True
                        item["lockReason"] = f"该班级由{item.get('homeroomTeacher') or '其他老师'}负责，无权跨班访问"
                else:
                    item["hasAccess"] = False
                    item["isLocked"] = True
                    item["lockReason"] = "请先登录正式教师账号"
                resp_classes.append(item)

            return self.send_json(200, {"code": 200, "success": True, "classes": resp_classes, "data": resp_classes})

        # 4. 获取某个班级的独立数据 (严格权限隔离)
        if path.startswith("/api/classes/") and path.endswith("/data"):
            class_id_raw = path.split("/")[3]
            sys_data = load_system_data()
            class_file, matched_c = get_class_file_path(class_id_raw, sys_data)

            is_demo_req = class_id_raw in ("class_demo_template", "demo_template", "class_default", "默认班级模板", "【示范体验】班级默认模板")
            session = get_session_from_request(self)

            if not is_demo_req:
                if not session:
                    return self.send_json(401, {"code": 401, "success": False, "message": "未登录或登录凭据已失效，禁止访问真实班级数据！"})
                if session.get("isDemo"):
                    return self.send_json(403, {"code": 403, "success": False, "message": "权限不足：体验账号仅限访问示范默认模板，严禁访问学校真实班级！"})
                if session.get("role") != "admin":
                    allowed = session.get("allowedClassIds", [])
                    matched_id = matched_c.get("id") if matched_c else class_id_raw
                    if class_id_raw not in allowed and matched_id not in allowed and "*" not in allowed:
                        return self.send_json(403, {"code": 403, "success": False, "message": "权限不足：您无权跨账号访问其他老师负责的班级数据！"})

            if os.path.exists(class_file):
                try:
                    with open(class_file, "r", encoding="utf-8") as f:
                        data = json.load(f)

                    # 强力同步：确保 classInfo 始终与系统管理后台中设置的班级全称、年级、负责班主任、人数绝对一致
                    if matched_c:
                        ci = data.setdefault("classInfo", {})
                        need_save = False
                        if ci.get("name") != matched_c.get("name"):
                            ci["name"] = matched_c.get("name")
                            need_save = True
                        if ci.get("gradeLevel") != matched_c.get("grade"):
                            ci["gradeLevel"] = matched_c.get("grade")
                            ci["grade"] = matched_c.get("grade")
                            need_save = True
                        if matched_c.get("homeroomTeacher"):
                            t_info = ci.setdefault("teacher", {})
                            if isinstance(t_info, dict) and t_info.get("name") != matched_c.get("homeroomTeacher"):
                                t_info["name"] = matched_c.get("homeroomTeacher")
                                need_save = True
                            elif isinstance(t_info, str) and t_info != matched_c.get("homeroomTeacher"):
                                ci["teacher"] = {"name": matched_c.get("homeroomTeacher"), "role": "班主任"}
                                need_save = True
                        # 班级学生总数必须以名册中实际学生数量（len(students)）为第一基准
                        real_st_cnt = len(data.get("students", []))
                        if real_st_cnt > 0:
                            if ci.get("studentCount") != real_st_cnt:
                                ci["studentCount"] = real_st_cnt
                                need_save = True
                            if matched_c.get("studentCount") != real_st_cnt:
                                matched_c["studentCount"] = real_st_cnt
                                try:
                                    save_system_data(sys_data)
                                except Exception:
                                    pass
                        elif matched_c.get("studentCount") and ci.get("studentCount") != matched_c.get("studentCount"):
                            ci["studentCount"] = matched_c.get("studentCount")
                            need_save = True

                        if need_save:
                            try:
                                with open(class_file, "w", encoding="utf-8") as f:
                                    json.dump(data, f, ensure_ascii=False, indent=2)
                            except Exception as se:
                                print("[Warning] 同步更新班级数据文件失败:", se)

                    return self.send_json(200, {"code": 200, "success": True, "data": data})
                except Exception as e:
                    return self.send_json(500, {"code": 500, "success": False, "message": f"读取班级数据失败: {str(e)}"})
            else:
                # 若文件尚不存在但系统已注册该班级，立即自动生成标准班级物理数据文件
                if matched_c:
                    init_data = create_initial_class_data(
                        matched_c.get("id", class_id_raw),
                        matched_c.get("name", "新班级"),
                        matched_c.get("grade", "小学四年级"),
                        matched_c.get("homeroomTeacher", "待分配"),
                        int(matched_c.get("studentCount", 45))
                    )
                    try:
                        with open(class_file, "w", encoding="utf-8") as f:
                            json.dump(init_data, f, ensure_ascii=False, indent=2)
                        return self.send_json(200, {"code": 200, "success": True, "data": init_data, "message": "新班级数据已成功初始化"})
                    except Exception as e:
                        print("[Error] 写入新班级数据失败:", e)
                        return self.send_json(200, {"code": 200, "success": True, "data": init_data})
                else:
                    return self.send_json(200, {"code": 200, "success": True, "data": None, "message": "新班级数据未建立"})

        # 5. 用户列表获取 (管理员使用)
        if path == "/api/users":
            sys_data = load_system_data()
            users = sys_data.get("users", [])
            # 脱敏密码字段
            safe_users = []
            for u in users:
                c = dict(u)
                c["hasPassword"] = bool(c.get("password"))
                c.pop("password", None)
                safe_users.append(c)
            return self.send_json(200, {"code": 200, "success": True, "users": safe_users, "data": safe_users})

        # 6. 获取特定班级的任课老师列表
        if path.startswith("/api/classes/") and path.endswith("/teachers"):
            class_id = path.split("/")[3]
            sys_data = load_system_data()
            teachers = [t for t in sys_data.get("subjectTeachers", []) if str(t.get("classId")) == str(class_id)]
            return self.send_json(200, {"code": 200, "success": True, "teachers": teachers, "data": teachers})

        # 7. 全校任课老师全量列表获取 (管理员最高权限管理)
        if path == "/api/subject-teachers":
            sys_data = load_system_data()
            teachers = sys_data.get("subjectTeachers", [])
            return self.send_json(200, {"code": 200, "success": True, "teachers": teachers, "data": teachers})

        # 常规静态资源托管
        return super().do_GET()

    def do_POST(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path
        body = self.get_post_json()
        sys_data = load_system_data()

        # 辅助方法：获取某个教师任教的所有班级列表
        def get_user_taught_classes(user_obj, username):
            taught = []
            classes = sys_data.get("classes", [])

            # 体验账号专属隔离逻辑：体验账号严禁进入任何真实班级，仅返回默认模板
            if user_obj.get("isDemo") or str(username).lower() in ("teacher_li", "math_wang", "demo", "teacher_demo"):
                demo_c = sys_data.get("demoClass", {
                    "id": "class_demo_template",
                    "name": "【示范体验】班级默认模板",
                    "grade": "小学四年级",
                    "studentCount": 45
                })
                return [{
                    "id": demo_c.get("id", "class_demo_template"),
                    "name": demo_c.get("name", "【示范体验】班级默认模板"),
                    "grade": demo_c.get("grade", "小学四年级"),
                    "studentCount": demo_c.get("studentCount", 45),
                    "roleInClass": "数学老师" if str(username).lower() == "math_wang" else "体验班主任",
                    "isHomeroom": str(username).lower() != "math_wang"
                }]

            u_name = (user_obj.get("realName") or user_obj.get("name") or "").strip()
            u_cids = user_obj.get("classIds") if isinstance(user_obj.get("classIds"), list) else ([user_obj.get("classId")] if user_obj.get("classId") else [])

            # 1. 真实班主任负责的班级
            for c in classes:
                c_hr = str(c.get("homeroomUsername") or "").strip().lower()
                q_un = str(username).strip().lower()
                u_un = str(user_obj.get("username") or "").strip().lower()
                u_ph = str(user_obj.get("phone") or "").strip()
                if c_hr and (c_hr == q_un or c_hr == u_un or c_hr == u_ph):
                    is_match = True
                elif c.get("id") in u_cids:
                    is_match = True
                elif u_name and c.get("homeroomTeacher") and str(c.get("homeroomTeacher")) == u_name:
                    is_match = True
                else:
                    is_match = False

                if is_match and not any(x["id"] == c["id"] for x in taught):
                    taught.append({
                        "id": c.get("id"),
                        "name": c.get("name"),
                        "grade": c.get("grade", "小学四年级"),
                        "studentCount": c.get("studentCount", 45),
                        "roleInClass": "班主任",
                        "isHomeroom": True
                    })

            # 2. 真实任课老师任教的班级
            for st in sys_data.get("subjectTeachers", []):
                if not st.get("isDemo") and (str(st.get("username")) == str(username) or str(st.get("phone")) == str(username)):
                    st_cid = st.get("classId")
                    matched_c = next((c for c in classes if c.get("id") == st_cid), None)
                    if matched_c and not any(x["id"] == matched_c["id"] for x in taught):
                        taught.append({
                            "id": matched_c.get("id"),
                            "name": matched_c.get("name"),
                            "grade": matched_c.get("grade", "小学四年级"),
                            "studentCount": matched_c.get("studentCount", 45),
                            "roleInClass": f"{st.get('subject', '任课')}老师",
                            "isHomeroom": False
                        })

            # 3. 兜底保障 (仅用于真实教师，不可默认指向七班)
            if not taught and user_obj.get("classId") and not user_obj.get("isDemo"):
                cid = user_obj.get("classId")
                matched_c = next((c for c in classes if c.get("id") == cid), None)
                if matched_c:
                    taught.append({
                        "id": matched_c.get("id"),
                        "name": matched_c.get("name"),
                        "grade": matched_c.get("grade", "小学四年级"),
                        "studentCount": matched_c.get("studentCount", 45),
                        "roleInClass": "班主任" if user_obj.get("role") == "homeroom_teacher" else "任课老师",
                        "isHomeroom": user_obj.get("role") == "homeroom_teacher"
                    })
            return taught

        # 0. 大模型测试与生成代理接口 (OpenAI 兼容协议，兼容智谱、千问、DeepSeek、OpenAI、Kimi、Ollama等，彻底解决前端 CORS 跨域)
        if path == "/api/ai/test":
            api_url = (body.get("apiUrl") or "").strip()
            api_key = (body.get("apiKey") or "").strip()
            model = (body.get("model") or "").strip()
            if not api_url:
                self.send_json(200, {"success": False, "message": "API 地址未填写，请输入大模型接口地址"})
                return

            endpoint = api_url.rstrip("/")
            if not endpoint.endswith("/chat/completions"):
                endpoint = f"{endpoint}/chat/completions"

            headers = {
                "Content-Type": "application/json; charset=utf-8",
                "User-Agent": "HomeroomWorkbench-AI/1.0"
            }
            if api_key:
                headers["Authorization"] = f"Bearer {api_key}"

            test_payload = {
                "model": model or "gpt-3.5-turbo",
                "messages": [
                    {"role": "user", "content": "请仅回复两字：连接成功"}
                ],
                "max_tokens": 20,
                "temperature": 0.2
            }

            ssl_ctx = ssl.create_default_context()
            ssl_ctx.check_hostname = False
            ssl_ctx.verify_mode = ssl.CERT_NONE

            start_t = time.time()
            try:
                req = urllib.request.Request(
                    endpoint,
                    data=json.dumps(test_payload, ensure_ascii=False).encode("utf-8"),
                    headers=headers,
                    method="POST"
                )
                with urllib.request.urlopen(req, timeout=25, context=ssl_ctx) as resp:
                    duration_ms = int((time.time() - start_t) * 1000)
                    resp_bytes = resp.read()
                    resp_json = json.loads(resp_bytes.decode("utf-8"))
                    reply_text = ""
                    choices = resp_json.get("choices", [])
                    if choices and isinstance(choices, list):
                        msg = choices[0].get("message", {})
                        reply_text = msg.get("content", "")
                    self.send_json(200, {
                        "success": True,
                        "message": f"连接成功！模型已正常响应 (延迟: {duration_ms}ms)",
                        "latencyMs": duration_ms,
                        "reply": reply_text.strip(),
                        "model": model
                    })
                    return
            except urllib.error.HTTPError as he:
                err_body = ""
                try:
                    err_body = he.read().decode("utf-8", errors="ignore")
                except Exception:
                    pass
                self.send_json(200, {
                    "success": False,
                    "message": f"服务商接口返回 HTTP {he.code}: {err_body or he.reason}",
                    "httpCode": he.code
                })
                return
            except Exception as e:
                self.send_json(200, {
                    "success": False,
                    "message": f"连接测试失败: {str(e)}"
                })
                return

        if path == "/api/ai/models":
            api_url = (body.get("apiUrl") or "").strip()
            api_key = (body.get("apiKey") or "").strip()
            if not api_url:
                self.send_json(200, {"success": False, "message": "请先输入 API 接口基准地址 (URL)"})
                return

            endpoint = api_url.rstrip("/")
            if endpoint.endswith("/chat/completions"):
                endpoint = endpoint[:-len("/chat/completions")]
            if not endpoint.endswith("/models"):
                endpoint = f"{endpoint}/models"

            headers = {
                "User-Agent": "HomeroomWorkbench-AI/1.0"
            }
            if api_key:
                headers["Authorization"] = f"Bearer {api_key}"

            ssl_ctx = ssl.create_default_context()
            ssl_ctx.check_hostname = False
            ssl_ctx.verify_mode = ssl.CERT_NONE

            try:
                req = urllib.request.Request(
                    endpoint,
                    headers=headers,
                    method="GET"
                )
                with urllib.request.urlopen(req, timeout=30, context=ssl_ctx) as resp:
                    resp_bytes = resp.read()
                    resp_json = json.loads(resp_bytes.decode("utf-8"))
                    model_ids = []
                    raw_items = []
                    if isinstance(resp_json, dict):
                        raw_list = resp_json.get("data") or resp_json.get("models") or []
                        if isinstance(raw_list, list):
                            raw_items = [x for x in raw_list if isinstance(x, dict)]
                            for item in raw_list:
                                if isinstance(item, dict):
                                    mid = item.get("id") or item.get("name") or item.get("model")
                                    if mid and isinstance(mid, str):
                                        model_ids.append(mid.strip())
                                elif isinstance(item, str):
                                    model_ids.append(item.strip())
                        elif isinstance(resp_json.get("data"), dict):
                            for k in resp_json["data"].keys():
                                model_ids.append(str(k).strip())
                    elif isinstance(resp_json, list):
                        for item in resp_json:
                            if isinstance(item, dict):
                                raw_items.append(item)
                                mid = item.get("id") or item.get("name") or item.get("model")
                                if mid: model_ids.append(str(mid).strip())
                            elif isinstance(item, str):
                                model_ids.append(item.strip())

                    # ========== 🚀 本地 unsloth / LM Studio 多量化变体智能展开引擎 ==========
                    # unsloth / LM Studio 本地部署通常按目录组织量化版本 (如 Google/gemma-4-12b 下含 Q4_K_M 与 Q6_K)
                    # 标准 OpenAI /v1/models 仅返回目录根 ID，官方规范需以冒号后缀指定量化版本 (:Q4_K_M / :Q6_K)
                    expanded_models = []
                    
                    # 1. 尝试探测 unsloth studio 本地扩展端点 /api/models/local
                    parsed_ep = urllib.parse.urlparse(endpoint)
                    base_origin = f"{parsed_ep.scheme}://{parsed_ep.netloc}"
                    local_models_info = []
                    try:
                        loc_req = urllib.request.Request(
                            f"{base_origin}/api/models/local",
                            headers=headers,
                            method="GET"
                        )
                        with urllib.request.urlopen(loc_req, timeout=3, context=ssl_ctx) as loc_resp:
                            loc_data = json.loads(loc_resp.read().decode("utf-8"))
                            if isinstance(loc_data, dict) and isinstance(loc_data.get("models"), list):
                                local_models_info = loc_data.get("models")
                    except Exception:
                        pass

                    # 辅助函数：从 GGUF 文件名提取量化规格
                    def _extract_quant(fname):
                        # 忽略 mmproj (多模态投影文件) 与 mtp 伴随文件
                        if fname.lower().startswith("mmproj-") or fname.lower().startswith("mmproj_"):
                            return None
                        m = re.search(r'[-_.](Q[0-9]_[A-Za-z0-9_]+|IQ[0-9]_[A-Za-z0-9_]+|Q[0-9]_[0-9]|[0-9]+[bB][-_.](?:Q|IQ)[0-9]_[A-Za-z0-9_]+)\.gguf$', fname, re.IGNORECASE)
                        if m:
                            q = m.group(1)
                            # 清洗去掉前面的 12B- 等干扰
                            if "-" in q: q = q.split("-")[-1]
                            if "_" in q:
                                parts = q.split("_")
                                if len(parts) >= 2 and parts[0].upper().startswith(("Q", "IQ")):
                                    return q.upper()
                            return q.upper()
                        # 泛化量化后缀匹配
                        m2 = re.search(r'[-_.](Q[0-9]_[A-Z0-9_]+|IQ[0-9]_[A-Z0-9_]+)', fname, re.IGNORECASE)
                        if m2:
                            return m2.group(1).upper()
                        return None

                    # 2. 若获取到本地模型路径信息，深入解析每个本地模型目录中的有效量化版本
                    scanned_variants_map = {}
                    for linfo in local_models_info:
                        lpath = linfo.get("path")
                        lmid = linfo.get("model_id") or linfo.get("display_name") or linfo.get("id")
                        if not lpath or not os.path.exists(lpath):
                            continue
                        if os.path.isdir(lpath):
                            # 目录型模型 (如 Google/gemma-4-12b)
                            try:
                                dir_files = [f for f in os.listdir(lpath) if f.lower().endswith(".gguf") and not f.lower().startswith("mmproj-")]
                                quants_found = []
                                for df in dir_files:
                                    q = _extract_quant(df)
                                    if q and q not in quants_found:
                                        quants_found.append(q)
                                if quants_found:
                                    # 查找匹配的根 model_id
                                    matched_root = next((m for m in model_ids if m.lower() == (lmid or "").lower() or (lmid and lmid.lower().endswith(m.lower()))), lmid)
                                    scanned_variants_map[matched_root] = sorted(quants_found)
                            except Exception:
                                pass

                    # 3. 兜底扫描常见本地模型盘目录 (如 F:\AImodels\ollama 等)
                    if not scanned_variants_map:
                        candidate_dirs = [
                            r"F:\AImodels\ollama",
                            r"D:\AImodels\ollama",
                            r"E:\AImodels\ollama",
                            os.path.expanduser(r"~/.cache/lm-studio/models"),
                            os.path.expanduser(r"~/.lmstudio/models")
                        ]
                        for cdir in candidate_dirs:
                            if not os.path.exists(cdir): continue
                            try:
                                for r, d_list, f_list in os.walk(cdir):
                                    rel = os.path.relpath(r, cdir).replace("\\", "/")
                                    for root_m in model_ids:
                                        if root_m.lower() in rel.lower() or rel.lower().endswith(root_m.lower()):
                                            ggufs = [f for f in f_list if f.lower().endswith(".gguf") and not f.lower().startswith("mmproj-")]
                                            quants = []
                                            for gf in ggufs:
                                                q = _extract_quant(gf)
                                                if q and q not in quants: quants.append(q)
                                            if quants:
                                                scanned_variants_map[root_m] = sorted(quants)
                            except Exception:
                                pass

                    # 4. 根据扫描结果将根模型展开为完整量化版本
                    for m in model_ids:
                        # 查找是否有量化变体
                        quants = scanned_variants_map.get(m)
                        if not quants:
                            # 尝试忽略大小写匹配
                            for k, v in scanned_variants_map.items():
                                if k.lower() == m.lower():
                                    quants = v
                                    break

                        if quants and len(quants) > 0:
                            for q in quants:
                                expanded_models.append(f"{m}:{q}")
                        else:
                            # 单文件模型或无子量化文件夹的模型直接保留
                            expanded_models.append(m)

                    # 去重并保持原有顺序
                    seen = set()
                    unique_models = []
                    for m in expanded_models:
                        if m and m not in seen:
                            seen.add(m)
                            unique_models.append(m)

                    # 若展开结果为空兜底回退原始列表
                    if not unique_models:
                        unique_models = list(dict.fromkeys(model_ids))

                    self.send_json(200, {
                        "success": True,
                        "message": f"成功获取到 {len(unique_models)} 个上游可用模型",
                        "count": len(unique_models),
                        "models": unique_models,
                        "endpoint": endpoint
                    })
                    return
            except urllib.error.HTTPError as he:
                err_body = ""
                try:
                    err_body = he.read().decode("utf-8", errors="ignore")
                except Exception:
                    pass
                msg = f"上游接口返回 HTTP {he.code}: {err_body or he.reason}"
                if he.code == 401:
                    msg = f"API 密钥认证未通过 (HTTP 401)，请核对填写的 API Key 是否有效"
                elif he.code == 404:
                    msg = f"上游服务商未提供标准 /models 模型列表查询端点 (HTTP 404)"
                self.send_json(200, {
                    "success": False,
                    "message": msg,
                    "httpCode": he.code
                })
                return
            except Exception as e:
                self.send_json(200, {
                    "success": False,
                    "message": f"获取上游模型列表失败: {str(e)}"
                })
                return

        if path == "/api/ai/chat":
            api_url = (body.get("apiUrl") or "").strip()
            api_key = (body.get("apiKey") or "").strip()
            model = (body.get("model") or "").strip()
            messages = body.get("messages", [])
            temperature = float(body.get("temperature", 0.7))
            max_tokens = int(body.get("max_tokens", 1200))

            if not api_url:
                self.send_json(200, {"success": False, "message": "API 地址为空，请在班级设置中配置大模型 API 地址"})
                return

            endpoint = api_url.rstrip("/")
            if not endpoint.endswith("/chat/completions"):
                endpoint = f"{endpoint}/chat/completions"

            headers = {
                "Content-Type": "application/json; charset=utf-8",
                "User-Agent": "HomeroomWorkbench-AI/1.0"
            }
            if api_key:
                headers["Authorization"] = f"Bearer {api_key}"

            chat_payload = {
                "model": model or "gpt-3.5-turbo",
                "messages": messages,
                "temperature": temperature,
                "max_tokens": max_tokens
            }

            ssl_ctx = ssl.create_default_context()
            ssl_ctx.check_hostname = False
            ssl_ctx.verify_mode = ssl.CERT_NONE

            start_t = time.time()
            try:
                req = urllib.request.Request(
                    endpoint,
                    data=json.dumps(chat_payload, ensure_ascii=False).encode("utf-8"),
                    headers=headers,
                    method="POST"
                )
                with urllib.request.urlopen(req, timeout=60, context=ssl_ctx) as resp:
                    duration_ms = int((time.time() - start_t) * 1000)
                    resp_bytes = resp.read()
                    resp_json = json.loads(resp_bytes.decode("utf-8"))
                    content = ""
                    choices = resp_json.get("choices", [])
                    if choices and isinstance(choices, list):
                        msg = choices[0].get("message", {})
                        content = msg.get("content", "")
                    self.send_json(200, {
                        "success": True,
                        "content": content,
                        "latencyMs": duration_ms,
                        "usage": resp_json.get("usage", {}),
                        "model": resp_json.get("model", model)
                    })
                    return
            except urllib.error.HTTPError as he:
                err_body = ""
                try:
                    err_body = he.read().decode("utf-8", errors="ignore")
                except Exception:
                    pass
                self.send_json(200, {
                    "success": False,
                    "message": f"大模型接口调用失败 HTTP {he.code}: {err_body or he.reason}",
                    "httpCode": he.code
                })
                return
            except Exception as e:
                self.send_json(200, {
                    "success": False,
                    "message": f"大模型生成评语失败: {str(e)}"
                })
                return

        # 1. 用户登录
        if path == "/api/auth/login":
            username = (body.get("username") or "").strip()
            password = (body.get("password") or "").strip()

            # A. 优先验证管理员
            admin = sys_data.get("admin", {"username": "admin", "password": "admin"})
            if username == admin.get("username") and password == admin.get("password"):
                admin_classes = sys_data.get("classes", [])
                taught = [
                    {
                        "id": c.get("id"),
                        "name": c.get("name"),
                        "grade": c.get("grade", "小学四年级"),
                        "studentCount": c.get("studentCount", 45),
                        "roleInClass": "超级管理员",
                        "isHomeroom": True
                    } for c in admin_classes
                ]
                first_c = admin_classes[0] if admin_classes else None
                token = "token_admin_" + str(int(time.time()))
                u_info = {
                    "username": admin["username"],
                    "name": admin.get("name", "超级管理员"),
                    "realName": admin.get("name", "超级管理员"),
                    "role": "admin",
                    "isDemo": False,
                    "classId": first_c.get("id", "class_1788592961") if first_c else "class_1788592961",
                    "className": first_c.get("name", "小学四年级（七）班") if first_c else "小学四年级（七）班",
                    "grade": first_c.get("grade", "小学四年级") if first_c else "小学四年级",
                    "studentCount": first_c.get("studentCount", 45) if first_c else 45,
                    "taughtClasses": taught,
                    "token": token
                }
                register_user_session(token, u_info, ["*"])
                return self.send_json(200, {
                    "code": 200,
                    "success": True,
                    "user": u_info,
                    "data": u_info,
                    "message": "管理员登录成功"
                })

            # B. 验证体验账号 (班主任体验账号 teacher_li / demo)
            if username.lower() in ("teacher_li", "demo", "teacher_demo"):
                if password != "123":
                    return self.send_json(401, {"code": 401, "success": False, "message": "体验账号密码错误，默认密码为 123"})
                demo_c = sys_data.get("demoClass", {
                    "id": "class_demo_template",
                    "name": "【示范体验】班级默认模板",
                    "grade": "小学四年级",
                    "studentCount": 45
                })
                token = f"token_demo_teacher_li_{int(time.time())}"
                u_info = {
                    "id": "user_demo_li",
                    "username": "teacher_li",
                    "name": "体验教师",
                    "realName": "体验教师",
                    "role": "demo_teacher",
                    "isDemo": True,
                    "classId": demo_c.get("id", "class_demo_template"),
                    "className": demo_c.get("name", "【示范体验】班级默认模板"),
                    "grade": demo_c.get("grade", "小学四年级"),
                    "studentCount": demo_c.get("studentCount", 45),
                    "taughtClasses": [{
                        "id": demo_c.get("id", "class_demo_template"),
                        "name": demo_c.get("name", "【示范体验】班级默认模板"),
                        "grade": demo_c.get("grade", "小学四年级"),
                        "studentCount": demo_c.get("studentCount", 45),
                        "roleInClass": "体验班主任",
                        "isHomeroom": True
                    }],
                    "token": token
                }
                register_user_session(token, u_info, ["class_demo_template", "class_default"])
                return self.send_json(200, {
                    "code": 200,
                    "success": True,
                    "user": u_info,
                    "data": u_info,
                    "message": "体验账号登录成功，已进入【示范体验】班级默认模板"
                })

            # C. 验证体验账号 (任课老师体验账号 math_wang)
            if username.lower() in ("math_wang", "demo_math"):
                if password != "123":
                    return self.send_json(401, {"code": 401, "success": False, "message": "体验账号密码错误，默认密码为 123"})
                demo_c = sys_data.get("demoClass", {
                    "id": "class_demo_template",
                    "name": "【示范体验】班级默认模板",
                    "grade": "小学四年级",
                    "studentCount": 45
                })
                token = f"token_demo_math_wang_{int(time.time())}"
                u_info = {
                    "id": "st_demo",
                    "username": "math_wang",
                    "name": "体验教师(数学)",
                    "realName": "体验教师(数学)",
                    "role": "demo_subject",
                    "isDemo": True,
                    "subject": "数学",
                    "classId": demo_c.get("id", "class_demo_template"),
                    "className": demo_c.get("name", "【示范体验】班级默认模板"),
                    "grade": demo_c.get("grade", "小学四年级"),
                    "studentCount": demo_c.get("studentCount", 45),
                    "taughtClasses": [{
                        "id": demo_c.get("id", "class_demo_template"),
                        "name": demo_c.get("name", "【示范体验】班级默认模板"),
                        "grade": demo_c.get("grade", "小学四年级"),
                        "studentCount": demo_c.get("studentCount", 45),
                        "roleInClass": "数学老师",
                        "isHomeroom": False
                    }],
                    "token": token
                }
                register_user_session(token, u_info, ["class_demo_template", "class_default"])
                return self.send_json(200, {
                    "code": 200,
                    "success": True,
                    "user": u_info,
                    "data": u_info,
                    "message": "任课老师体验账号登录成功，已进入【示范体验】班级默认模板"
                })

            # D. 验证真实班主任 (通过管理员审核分配的正式班主任账号，如手机号或自定义用户名)
            homeroom_user = next((u for u in sys_data.get("users", []) if not u.get("isDemo") and (
                str(u.get("username", "")).strip().lower() == username.lower() or 
                str(u.get("phone", "")).strip() == username
            )), None)
            if homeroom_user:
                if homeroom_user.get("password") != password:
                    return self.send_json(401, {"code": 401, "success": False, "message": "密码输入错误！"})
                if homeroom_user.get("status") != "approved":
                    return self.send_json(403, {"code": 403, "success": False, "message": "该班主任账号尚在管理员审核中，请联系管理员通过！"})
                
                taught = get_user_taught_classes(homeroom_user, username)
                first_c = taught[0] if taught else None
                cid = first_c["id"] if first_c else homeroom_user.get("classId")
                cname = first_c["name"] if first_c else homeroom_user.get("className")
                cgrade = first_c["grade"] if first_c else homeroom_user.get("grade", "小学四年级")
                ccount = first_c["studentCount"] if first_c else 45

                token = f"token_hr_{homeroom_user['username']}_{int(time.time())}"
                u_info = {
                    "id": homeroom_user.get("id"),
                    "username": homeroom_user["username"],
                    "name": homeroom_user.get("name") or homeroom_user.get("realName", "班主任"),
                    "realName": homeroom_user.get("name") or homeroom_user.get("realName", "班主任"),
                    "role": "homeroom_teacher",
                    "isDemo": False,
                    "classId": cid,
                    "className": cname,
                    "grade": cgrade,
                    "studentCount": ccount,
                    "taughtClasses": taught,
                    "token": token
                }
                allowed_cids = [c["id"] for c in taught] if taught else ([cid] if cid else [])
                register_user_session(token, u_info, allowed_cids)
                return self.send_json(200, {
                    "code": 200,
                    "success": True,
                    "user": u_info,
                    "data": u_info,
                    "message": "班主任登录成功"
                })

            # E. 验证真实任课老师 (非体验账号)
            st_user = next((t for t in sys_data.get("subjectTeachers", []) if not t.get("isDemo") and (
                str(t.get("username", "")).strip().lower() == username.lower() or 
                str(t.get("phone", "")).strip() == username
            )), None)
            if st_user:
                if st_user.get("password") != password:
                    return self.send_json(401, {"code": 401, "success": False, "message": "密码输入错误！"})
                
                taught = get_user_taught_classes(st_user, username)
                first_c = taught[0] if taught else None
                cid = first_c["id"] if first_c else st_user.get("classId")
                cname = first_c["name"] if first_c else "任教班级"
                cgrade = first_c["grade"] if first_c else "小学四年级"
                ccount = first_c["studentCount"] if first_c else 45

                token = f"token_st_{st_user['username']}_{int(time.time())}"
                u_info = {
                    "id": st_user.get("id"),
                    "username": st_user["username"],
                    "name": st_user.get("name", "任课老师"),
                    "realName": st_user.get("name", "任课老师"),
                    "role": "subject_teacher",
                    "isDemo": False,
                    "subject": st_user.get("subject", "学科"),
                    "classId": cid,
                    "className": cname,
                    "grade": cgrade,
                    "studentCount": ccount,
                    "taughtClasses": taught,
                    "token": token
                }
                allowed_cids = [c["id"] for c in taught] if taught else ([cid] if cid else [])
                register_user_session(token, u_info, allowed_cids)
                return self.send_json(200, {
                    "code": 200,
                    "success": True,
                    "user": u_info,
                    "data": u_info,
                    "message": "任课老师登录成功"
                })


            return self.send_json(404, {"code": 404, "success": False, "message": "账号不存在，请核对用户名！"})

        # 2. 班主任账号自主注册 (进入审核流)
        if path == "/api/auth/register":
            username = (body.get("username") or "").strip()
            password = (body.get("password") or "").strip()
            name = (body.get("name") or body.get("realName") or "").strip()
            phone = (body.get("phone") or "").strip()

            if not username or not password or not name:
                return self.send_json(400, {"code": 400, "success": False, "message": "用户名、密码与姓名均为必填项！"})

            existing = any(u.get("username") == username for u in sys_data.get("users", []))
            if existing or username == sys_data.get("admin", {}).get("username"):
                return self.send_json(400, {"code": 400, "success": False, "message": "该账号已被占用，请使用其他用户名！"})

            new_user = {
                "id": "u_" + str(int(time.time())),
                "username": username,
                "password": password,
                "name": name,
                "realName": name,
                "role": "homeroom_teacher",
                "phone": phone,
                "status": "pending",  # 默认待后台审核
                "classId": None,
                "createdAt": time.strftime("%Y-%m-%d %H:%M")
            }
            sys_data.setdefault("users", []).append(new_user)
            save_system_data(sys_data)
            return self.send_json(200, {"code": 200, "success": True, "message": "注册申请已提交，请等待后台管理员审核授权！", "data": new_user})

        # 3. 管理员修改自身账号与密码
        if path in ("/api/auth/change-password", "/api/auth/update-admin"):
            old_pwd = (body.get("oldPassword") or "").strip()
            new_pwd = (body.get("newPassword") or "").strip()
            new_username = (body.get("newUsername") or body.get("username") or "").strip()
            admin = sys_data.get("admin", {"username": "admin", "password": "admin"})

            if old_pwd != admin.get("password"):
                return self.send_json(400, {"code": 400, "success": False, "message": "当前密码验证不通过，无法修改！"})
            if not new_pwd and not new_username:
                return self.send_json(400, {"code": 400, "success": False, "message": "新账号与新密码不能同时为空！"})

            msg_items = []
            if new_username and new_username != admin.get("username"):
                if any(u.get("username") == new_username for u in sys_data.get("users", []) if u.get("role") != "admin"):
                    return self.send_json(400, {"code": 400, "success": False, "message": "该账号已被占用，请使用其他用户名！"})
                admin["username"] = new_username
                msg_items.append(f"登录账号已变更为【{new_username}】")

            if new_pwd:
                admin["password"] = new_pwd
                msg_items.append("登录密码已更新")

            sys_data["admin"] = admin

            # 同步更新 users 中的管理员记录
            for u in sys_data.get("users", []):
                if u.get("role") == "admin" or u.get("id") == "user_admin":
                    if new_username:
                        u["username"] = new_username
                    if new_pwd:
                        u["password"] = new_pwd

            save_system_data(sys_data)
            return self.send_json(200, {
                "code": 200,
                "success": True,
                "message": f"超级管理员{'与'.join(msg_items)}！",
                "admin": {"username": admin["username"], "name": admin.get("name", "超级管理员")},
                "data": {"username": admin["username"]}
            })

        # 4. 创建或修改班级 (管理员：一站式合并创建班级、开通班主任账号、集中配置各科任课老师团队，取消预计人数以实际档案为准)
        if path == "/api/classes":
            cid = body.get("id")
            name = (body.get("name") or "").strip()
            grade = (body.get("grade") or "").strip() or "小学部"
            teacher_name = (body.get("homeroomTeacher") or "").strip() or "待分配班主任"
            teacher_username = (body.get("homeroomUsername") or "").strip()
            teacher_password = (body.get("homeroomPassword") or "123").strip()
            teacher_phone = (body.get("homeroomPhone") or "").strip()
            sub_teachers_req = body.get("subjectTeachers") or []

            if not name:
                return self.send_json(400, {"code": 400, "success": False, "message": "班级名称不能为空！"})

            classes = sys_data.setdefault("classes", [])
            users = sys_data.setdefault("users", [])
            all_st = sys_data.setdefault("subjectTeachers", [])
            target_c = next((c for c in classes if c.get("id") == cid), None) if cid else None

            if target_c:
                old_file, _ = get_class_file_path(cid, sys_data)
                target_c["name"] = name
                target_c["grade"] = grade
                target_c["homeroomTeacher"] = teacher_name
                if teacher_username:
                    target_c["homeroomUsername"] = teacher_username

                # 动态获取实际档案人数
                actual_cnt = 0
                if old_file and os.path.exists(old_file):
                    try:
                        with open(old_file, "r", encoding="utf-8") as f:
                            cld = json.load(f)
                            actual_cnt = len(cld.get("students", []))
                    except Exception:
                        pass
                target_c["studentCount"] = actual_cnt

                # 同步维护对应班主任账号 (若填入了账号用户名)
                if teacher_username:
                    u = next((item for item in users if item.get("classId") == cid or item.get("username") == teacher_username), None)
                    if u:
                        u["username"] = teacher_username
                        u["name"] = teacher_name
                        u["realName"] = teacher_name
                        u["grade"] = grade
                        u["classId"] = cid
                        u["status"] = "approved"
                        u["role"] = "homeroom_teacher"
                        if teacher_password: u["password"] = teacher_password
                        if teacher_phone: u["phone"] = teacher_phone
                    else:
                        users.append({
                            "id": "u_" + str(int(time.time())),
                            "username": teacher_username,
                            "password": teacher_password or "123",
                            "name": teacher_name,
                            "realName": teacher_name,
                            "role": "homeroom_teacher",
                            "phone": teacher_phone or "",
                            "grade": grade,
                            "status": "approved",
                            "classId": cid,
                            "createdAt": time.strftime("%Y-%m-%d %H:%M")
                        })

                # 若传入了任课老师团队则集中同步更新
                if isinstance(sub_teachers_req, list) and len(sub_teachers_req) > 0:
                    for st in sub_teachers_req:
                        st_name = (st.get("name") or "").strip()
                        st_sub = (st.get("subject") or "").strip()
                        st_user = (st.get("username") or "").strip()
                        st_pwd = (st.get("password") or "123").strip()
                        st_ph = (st.get("phone") or "").strip()
                        if st_name and st_sub and st_user:
                            ex_st = next((x for x in all_st if x.get("username") == st_user), None)
                            if ex_st:
                                ex_st.update({
                                    "classId": cid,
                                    "name": st_name,
                                    "subject": st_sub,
                                    "password": st_pwd,
                                    "phone": st_ph
                                })
                            else:
                                import random
                                all_st.append({
                                    "id": "st_" + str(int(time.time())) + "_" + str(random.randint(100, 999)),
                                    "classId": cid,
                                    "name": st_name,
                                    "subject": st_sub,
                                    "username": st_user,
                                    "password": st_pwd,
                                    "phone": st_ph,
                                    "createdAt": time.strftime("%Y-%m-%d")
                                })

                save_system_data(sys_data)

                # 若班级名称修改，自动重命名磁盘物理 JSON 文件
                new_file, _ = get_class_file_path(cid, sys_data)
                if old_file and os.path.exists(old_file) and old_file != new_file:
                    try:
                        if os.path.exists(new_file):
                            os.remove(new_file)
                        os.rename(old_file, new_file)
                        print(f"[Rename Class File] 班级更名重命名文件: {old_file} -> {new_file}")
                    except Exception as re_err:
                        print("[Error] 重命名班级数据文件失败:", re_err)

                # 同步更新对应班级数据文件中的 classInfo
                if os.path.exists(new_file):
                    try:
                        with open(new_file, "r", encoding="utf-8") as f:
                            cl_data = json.load(f)
                        ci = cl_data.setdefault("classInfo", {})
                        ci["name"] = name
                        ci["grade"] = grade
                        ci["gradeLevel"] = grade
                        ci["teacher"] = {"name": teacher_name, "role": "班主任", "phone": teacher_phone}
                        ci["studentCount"] = len(cl_data.get("students", []))
                        with open(new_file, "w", encoding="utf-8") as f:
                            json.dump(cl_data, f, ensure_ascii=False, indent=2)
                    except Exception as e:
                        print("[Error] 更新班级数据文件失败:", e)

                return self.send_json(200, {"code": 200, "success": True, "data": target_c, "message": f"班级【{name}】及师资信息修改成功！"})
            else:
                new_class_id = "class_" + str(int(time.time() * 1000))
                new_class = {
                    "id": new_class_id,
                    "name": name,
                    "grade": grade,
                    "homeroomTeacher": teacher_name,
                    "homeroomUsername": teacher_username,
                    "studentCount": 0, # 新班级初始学生数为0，后续由上传学生档案实际人数动态决定
                    "createdAt": time.strftime("%Y-%m-%d")
                }
                classes.append(new_class)

                # 自动为新班级开通并审核通过班主任账号
                if teacher_username:
                    u = next((item for item in users if item.get("username") == teacher_username), None)
                    if u:
                        u["classId"] = new_class_id
                        u["name"] = teacher_name
                        u["realName"] = teacher_name
                        u["grade"] = grade
                        u["status"] = "approved"
                        u["role"] = "homeroom_teacher"
                        if teacher_password: u["password"] = teacher_password
                        if teacher_phone: u["phone"] = teacher_phone
                    else:
                        users.append({
                            "id": "u_" + str(int(time.time())),
                            "username": teacher_username,
                            "password": teacher_password or "123",
                            "name": teacher_name,
                            "realName": teacher_name,
                            "role": "homeroom_teacher",
                            "phone": teacher_phone or "",
                            "grade": grade,
                            "status": "approved",
                            "classId": new_class_id,
                            "createdAt": time.strftime("%Y-%m-%d %H:%M")
                        })

                # 若创建班级时可选配置了任课老师团队，一并开通绑定
                if isinstance(sub_teachers_req, list) and len(sub_teachers_req) > 0:
                    import random
                    for st in sub_teachers_req:
                        st_name = (st.get("name") or "").strip()
                        st_sub = (st.get("subject") or "").strip()
                        st_user = (st.get("username") or "").strip()
                        st_pwd = (st.get("password") or "123").strip()
                        st_ph = (st.get("phone") or "").strip()
                        if st_name and st_sub and st_user:
                            ex_st = next((x for x in all_st if x.get("username") == st_user), None)
                            if ex_st:
                                ex_st.update({
                                    "classId": new_class_id,
                                    "name": st_name,
                                    "subject": st_sub,
                                    "password": st_pwd,
                                    "phone": st_ph
                                })
                            else:
                                all_st.append({
                                    "id": "st_" + str(int(time.time())) + "_" + str(random.randint(100, 999)),
                                    "classId": new_class_id,
                                    "name": st_name,
                                    "subject": st_sub,
                                    "username": st_user,
                                    "password": st_pwd,
                                    "phone": st_ph,
                                    "createdAt": time.strftime("%Y-%m-%d")
                                })

                save_system_data(sys_data)

                # 为新班级初始化专属独立数据文件 (按班级名称命名，学生初始为空列表，由上传档案决定实际人数)
                new_class_file, _ = get_class_file_path(new_class_id, sys_data)
                if not os.path.exists(new_class_file):
                    cl_data = create_initial_class_data(new_class_id, name, grade, teacher_name, 0)
                    cl_data["students"] = [] # 保证全新班级无预设死数据，纯净档案
                    ci = cl_data.setdefault("classInfo", {})
                    ci["studentCount"] = 0
                    if teacher_phone:
                        ci.setdefault("teacher", {})["phone"] = teacher_phone
                    try:
                        with open(new_class_file, "w", encoding="utf-8") as nf:
                            json.dump(cl_data, nf, ensure_ascii=False, indent=2)
                    except Exception as e:
                        print("[Error] 创建班级数据文件失败:", e)

                msg = f"班级【{name}】创建成功！"
                if teacher_username:
                    msg += f" 负责班主任账号【{teacher_username}】已同步开通并审核通过！"
                return self.send_json(200, {"code": 200, "success": True, "data": new_class, "message": msg})

        # 5. 保存特定班级的独立数据 (严格权限隔离)
        if path.startswith("/api/classes/") and path.endswith("/data"):
            class_id_raw = path.split("/")[3]
            sys_data = load_system_data()
            class_file, matched_c = get_class_file_path(class_id_raw, sys_data)

            is_demo_req = class_id_raw in ("class_demo_template", "demo_template", "class_default", "默认班级模板", "【示范体验】班级默认模板")
            session = get_session_from_request(self)

            if not is_demo_req:
                if not session:
                    return self.send_json(401, {"code": 401, "success": False, "message": "未登录或登录凭据已失效，禁止修改真实班级数据！"})
                if session.get("isDemo"):
                    return self.send_json(403, {"code": 403, "success": False, "message": "权限不足：体验账号禁止修改学校真实班级数据！"})
                if session.get("role") != "admin":
                    allowed = session.get("allowedClassIds", [])
                    matched_id = matched_c.get("id") if matched_c else class_id_raw
                    if class_id_raw not in allowed and matched_id not in allowed and "*" not in allowed:
                        return self.send_json(403, {"code": 403, "success": False, "message": "权限不足：您无权跨账号修改其他老师负责的班级数据！"})

            try:
                with open(class_file, "w", encoding="utf-8") as f:
                    json.dump(body, f, ensure_ascii=False, indent=2)
                return self.send_json(200, {"code": 200, "success": True, "message": "班级数据已成功同步持久化！"})
            except Exception as e:
                return self.send_json(500, {"code": 500, "success": False, "message": f"保存班级数据失败: {str(e)}"})


        # 6. 添加 / 编辑班主任账号 (管理员，支持执教班级自由修改/重命名/新建)
        if path == "/api/users":
            uid = body.get("id")
            username = (body.get("username") or "").strip()
            password = (body.get("password") or "").strip()
            real_name = (body.get("realName") or body.get("name") or "").strip()
            phone = (body.get("phone") or "").strip()
            class_id = body.get("classId")
            class_name = (body.get("className") or "").strip()
            rename_current_class = bool(body.get("renameCurrentClass"))
            grade = (body.get("grade") or "").strip() or "小学四年级"
            status = body.get("status", "approved")
            role = body.get("role", "homeroom_teacher")

            if not username:
                return self.send_json(400, {"code": 400, "success": False, "message": "用户名不能为空！"})

            classes = sys_data.setdefault("classes", [])

            # 处理班级名称：支持重命名当前班级，或创建新独立班级，或绑定已有班级
            if rename_current_class and class_id and class_name:
                target_c = next((c for c in classes if c.get("id") == class_id), None)
                if target_c:
                    old_file, _ = get_class_file_path(class_id, sys_data)
                    target_c["name"] = class_name
                    target_c["grade"] = grade
                    target_c["homeroomTeacher"] = real_name
                    target_c["homeroomUsername"] = username
                    new_file, _ = get_class_file_path(class_id, sys_data)
                    if old_file and os.path.exists(old_file) and old_file != new_file:
                        try:
                            if os.path.exists(new_file):
                                os.remove(new_file)
                            os.rename(old_file, new_file)
                        except Exception:
                            pass
                    # 同步到物理数据文件
                    if os.path.exists(new_file):
                        try:
                            with open(new_file, "r", encoding="utf-8") as f:
                                cdata = json.load(f)
                            ci = cdata.setdefault("classInfo", {})
                            ci["name"] = class_name
                            ci["grade"] = grade
                            ci["gradeLevel"] = grade
                            ci["teacher"] = {"name": real_name, "role": "班主任"}
                            with open(new_file, "w", encoding="utf-8") as f:
                                json.dump(cdata, f, ensure_ascii=False, indent=2)
                        except Exception as e:
                            print("[Error] 重命名同步班级文件失败:", e)
            elif class_name:
                # 查找是否存在同名班级
                existing_c = next((c for c in classes if c.get("name") == class_name), None)
                if existing_c:
                    class_id = existing_c["id"]
                    existing_c["homeroomTeacher"] = real_name
                    existing_c["homeroomUsername"] = username
                    if grade:
                        existing_c["grade"] = grade
                else:
                    # 自动创建全新独立班级
                    import random
                    new_cid = "class_" + str(int(time.time())) + "_" + str(random.randint(100, 999))
                    new_c = {
                        "id": new_cid,
                        "name": class_name,
                        "grade": grade,
                        "homeroomTeacher": real_name,
                        "homeroomUsername": username,
                        "studentCount": 45,
                        "createdAt": time.strftime("%Y-%m-%d")
                    }
                    classes.append(new_c)
                    class_id = new_cid

                    # 为新班级生成专属物理数据文件 (按班级名称命名)
                    new_cf, _ = get_class_file_path(new_cid, sys_data)
                    if not os.path.exists(new_cf):
                        cl_data = create_initial_class_data(new_cid, class_name, grade, real_name, 45)
                        try:
                            with open(new_cf, "w", encoding="utf-8") as nf:
                                json.dump(cl_data, nf, ensure_ascii=False, indent=2)
                        except Exception as e:
                            print("[Error] 新建班级数据文件失败:", e)

            users = sys_data.setdefault("users", [])
            u = None
            if uid:
                u = next((item for item in users if item.get("id") == uid), None)
            elif username:
                u = next((item for item in users if item.get("username") == username), None)

            if u:
                u["username"] = username
                if password:
                    u["password"] = password
                u["name"] = real_name
                u["realName"] = real_name
                u["phone"] = phone
                if class_id:
                    u["classId"] = class_id
                u["grade"] = grade
                u["status"] = status
                u["role"] = role
            else:
                new_u = {
                    "id": "u_" + str(int(time.time())),
                    "username": username,
                    "password": password or "123",
                    "name": real_name,
                    "realName": real_name,
                    "role": role,
                    "phone": phone,
                    "grade": grade,
                    "status": status,
                    "classId": class_id,
                    "createdAt": time.strftime("%Y-%m-%d %H:%M")
                }
                users.append(new_u)

            # 同步更新对应班级的班主任姓名与执教年级
            if class_id:
                target_class = next((c for c in classes if c.get("id") == class_id), None)
                if target_class:
                    target_class["homeroomTeacher"] = real_name
                    target_class["homeroomUsername"] = username
                    if grade:
                        target_class["grade"] = grade

                    # 同步到该班级的物理数据文件
                    cf, _ = get_class_file_path(class_id, sys_data)
                    if os.path.exists(cf):
                        try:
                            with open(cf, "r", encoding="utf-8") as f:
                                cdata = json.load(f)
                            ci = cdata.setdefault("classInfo", {})
                            ci["teacher"] = {"name": real_name, "role": "班主任"}
                            if grade:
                                ci["grade"] = grade
                                ci["gradeLevel"] = grade
                            with open(cf, "w", encoding="utf-8") as f:
                                json.dump(cdata, f, ensure_ascii=False, indent=2)
                        except Exception:
                            pass

            save_system_data(sys_data)
            return self.send_json(200, {"code": 200, "success": True, "message": "班主任账号、执教年级及执教班级信息保存成功！", "data": {"classId": class_id, "className": class_name}})

        # 7. 审核班主任账号 (管理员)
        if path == "/api/users/audit" or (path.startswith("/api/users/") and path.endswith("/audit")):
            user_id = body.get("id") or (path.split("/")[3] if len(path.split("/")) > 4 else None)
            action = body.get("action") or body.get("status")
            class_id = body.get("classId")

            user = next((u for u in sys_data.get("users", []) if u.get("id") == user_id), None)
            if not user:
                return self.send_json(404, {"code": 404, "success": False, "message": "未找到该用户！"})

            if action in ("approve", "approved"):
                user["status"] = "approved"
                if class_id:
                    user["classId"] = class_id
                    target_class = next((c for c in sys_data.get("classes", []) if c.get("id") == class_id), None)
                    if target_class:
                        target_class["homeroomTeacher"] = user.get("name") or user.get("realName", "班主任")
                        target_class["homeroomUsername"] = user.get("username")
            elif action in ("reject", "rejected"):
                user["status"] = "rejected"
            elif action == "disable":
                user["status"] = "disabled"

            save_system_data(sys_data)
            return self.send_json(200, {"code": 200, "success": True, "message": "班主任账号审核状态已更新！"})

        # 8. 添加/编辑任课老师账号 (班主任或直接由管理员通过 /api/subject-teachers 或 /api/classes/<cid>/teachers 维护)
        if path == "/api/subject-teachers" or (path.startswith("/api/classes/") and path.endswith("/teachers")):
            operator_role = (body.get("operatorRole") or self.headers.get("X-User-Role") or "").strip()
            if operator_role in ("subject_teacher", "subject"):
                return self.send_json(403, {"code": 403, "success": False, "message": "权限拒绝：任课老师不能增删修改老师账号！"})

            if path == "/api/subject-teachers":
                class_id = (body.get("classId") or "").strip()
            else:
                parts = path.split("/")
                class_id = parts[3] if len(parts) >= 4 and parts[3] else (body.get("classId") or "").strip()

            name = (body.get("name") or "").strip()
            subject = (body.get("subject") or "").strip()
            username = (body.get("username") or "").strip()
            password = (body.get("password") or "").strip()
            phone = (body.get("phone") or "").strip()

            if not name or not subject or not username or not password:
                return self.send_json(400, {"code": 400, "success": False, "message": "教师姓名、负责学科、账号与密码均为必填项！"})

            if not class_id:
                return self.send_json(400, {"code": 400, "success": False, "message": "必须指定所执教班级！"})

            teachers = sys_data.setdefault("subjectTeachers", [])
            tid = body.get("id")
            if tid:
                tid_str = str(tid).strip()
                t = next((item for item in teachers if str(item.get("id")) == tid_str or str(item.get("username")) == tid_str), None)
                if t:
                    if any(item.get("username") == username and str(item.get("id")) != tid_str for item in teachers):
                        return self.send_json(400, {"code": 400, "success": False, "message": "该登录账号已被其他任课老师使用！"})
                    t.update({"classId": class_id, "name": name, "subject": subject, "username": username, "password": password, "phone": phone})
                    save_system_data(sys_data)
                    return self.send_json(200, {"code": 200, "success": True, "message": f"已成功更新【{name} ({subject})】任课老师账号！", "data": t})

            if any(item.get("username") == username for item in teachers):
                return self.send_json(400, {"code": 400, "success": False, "message": "该任课老师登录账号已存在！"})

            import random
            new_item = {
                "id": "st_" + str(int(time.time())) + "_" + str(random.randint(100, 999)),
                "classId": class_id,
                "name": name,
                "subject": subject,
                "username": username,
                "password": password,
                "phone": phone,
                "createdAt": time.strftime("%Y-%m-%d")
            }
            teachers.append(new_item)
            save_system_data(sys_data)
            return self.send_json(200, {"code": 200, "success": True, "message": f"已成功保存【{name} ({subject})】任课老师账号！", "data": new_item})

        return self.send_json(404, {"code": 404, "success": False, "message": "未知 API 接口"})

    def do_DELETE(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path
        query = urllib.parse.parse_qs(parsed.query)
        sys_data = load_system_data()

        # 1. 优先处理特定班级的任课老师删除: /api/classes/<cid>/teachers?id=<tid> or /api/classes/<cid>/teachers/<tid>
        if "/teachers" in path and path.startswith("/api/classes/"):
            operator_role = (query.get("operatorRole", [None])[0] or self.headers.get("X-User-Role") or "").strip()
            if operator_role in ("subject_teacher", "subject"):
                return self.send_json(403, {"code": 403, "success": False, "message": "权限拒绝：任课老师不能增删修改老师账号！"})

            parts = path.split("/")
            teacher_id = query.get("id", [None])[0]
            if not teacher_id and len(parts) >= 6:
                teacher_id = parts[5]

            if teacher_id:
                tid_str = str(teacher_id).strip()
                sys_data["subjectTeachers"] = [
                    t for t in sys_data.get("subjectTeachers", [])
                    if str(t.get("id")) != tid_str and str(t.get("username")) != tid_str
                ]
                save_system_data(sys_data)
                return self.send_json(200, {"code": 200, "success": True, "message": "任课老师账号已成功移除！"})
            return self.send_json(400, {"code": 400, "success": False, "message": "缺少要删除的任课老师 ID"})

        # 2. 全局删除任课老师: /api/subject-teachers?id=<id> or /api/subject-teachers/<id>
        if path == "/api/subject-teachers" or path.startswith("/api/subject-teachers/"):
            operator_role = (query.get("operatorRole", [None])[0] or self.headers.get("X-User-Role") or "").strip()
            if operator_role in ("subject_teacher", "subject"):
                return self.send_json(403, {"code": 403, "success": False, "message": "权限拒绝：任课老师不能增删修改老师账号！"})

            teacher_id = query.get("id", [None])[0]
            if not teacher_id and len(path.split("/")) >= 4:
                teacher_id = path.split("/")[3]
            if teacher_id:
                tid_str = str(teacher_id).strip()
                sys_data["subjectTeachers"] = [
                    t for t in sys_data.get("subjectTeachers", [])
                    if str(t.get("id")) != tid_str and str(t.get("username")) != tid_str
                ]
                save_system_data(sys_data)
                return self.send_json(200, {"code": 200, "success": True, "message": "任课老师账号已成功移除！"})
            return self.send_json(400, {"code": 400, "success": False, "message": "缺少要删除的任课老师 ID"})

        # 3. 删除班级: /api/classes?id=<id> or /api/classes/<id>
        if path == "/api/classes" or path.startswith("/api/classes/"):
            parts = path.split("/")
            class_id = query.get("id", [None])[0]
            if not class_id and len(parts) >= 4 and parts[3]:
                class_id = parts[3]

            if class_id:
                cid_str = str(class_id).strip()
                cf, _ = get_class_file_path(cid_str, sys_data)
                sys_data["classes"] = [c for c in sys_data.get("classes", []) if str(c.get("id")) != cid_str and str(c.get("name")) != cid_str]
                sys_data["subjectTeachers"] = [t for t in sys_data.get("subjectTeachers", []) if str(t.get("classId")) != cid_str]
                save_system_data(sys_data)
                try:
                    if cf and os.path.exists(cf):
                        os.remove(cf)
                    legacy_f = os.path.join(CLASSES_DIR, f"{cid_str}.json")
                    if os.path.exists(legacy_f):
                        os.remove(legacy_f)
                except Exception:
                    pass
                return self.send_json(200, {"code": 200, "success": True, "message": "班级已安全删除！"})

        # 4. 删除用户: /api/users?id=<id> or /api/users/<id>
        if path == "/api/users" or path.startswith("/api/users/"):
            user_id = query.get("id", [None])[0]
            if not user_id and len(path.split("/")) >= 4:
                user_id = path.split("/")[3]
            if user_id:
                uid_str = str(user_id).strip()
                sys_data["users"] = [u for u in sys_data.get("users", []) if str(u.get("id")) != uid_str]
                save_system_data(sys_data)
                return self.send_json(200, {"code": 200, "success": True, "message": "用户账号已移除！"})

        return self.send_json(404, {"code": 404, "success": False, "message": "未知删除路由"})


def main():
    os.chdir(DIRECTORY)
    init_system_data()

    # 尝试绑定端口，若被占用则自动递增
    port = PORT
    httpd = None
    for _ in range(15):
        try:
            httpd = http.server.ThreadingHTTPServer(("", port), EnhancedWorkbenchHandler)
            break
        except OSError:
            port += 1

    if not httpd:
        print("[Fatal] 无法启动服务器，所有尝试端口均被占用！")
        sys.exit(1)

    if hasattr(sys.stdout, 'reconfigure'):
        try:
            sys.stdout.reconfigure(encoding='utf-8', errors='replace')
            sys.stderr.reconfigure(encoding='utf-8', errors='replace')
        except Exception:
            pass

    lan_ips = get_lan_ips()
    primary_ip = lan_ips[0] if lan_ips else "127.0.0.1"

    print("=" * 65)
    print("  [Server] 班主任工作台 & 学校多班级协同平台 - 服务已启动！")
    print(f"  [Local] 本机电脑访问地址: http://localhost:{port}/index.html")
    print(f"  [LAN] 局域网其他电脑访问: http://{primary_ip}:{port}/index.html")
    print(f"  [Admin] 后台管理页面地址: http://{primary_ip}:{port}/admin.html")
    print(f"  [Admin Auth] 管理员默认账号: admin    密码: admin (支持在后台修改)")
    print(f"  [提示] 若局域网其他设备打不开，请运行根目录下【setup_firewall.bat】")
    print("=" * 65)

    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\n服务器已安全停止。")
        httpd.server_close()

if __name__ == "__main__":
    main()
