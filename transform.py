#!/usr/bin/env python3
"""
Batch transformation script: Replace all Longzhou-specific content
with generic 鑫远集团 (Xinyuan Group) content across all .htm files.
"""
import os
import re

BASE_DIR = r"D:\Software\phpstudy\WWW\dede1"

# Map of old_string -> new_string for batch replacement
REPLACEMENTS = [
    # === Company identity ===
    ("龙洲集团股份有限公司", "鑫远集团有限公司"),
    ("龙洲集团", "鑫远集团"),
    ("龙洲股份", "鑫远集团"),
    ("WWW.LZGF.CN", "WWW.XINYUANGROUP.COM"),
    ("www.lzgf.cn", "www.xinyuangroup.com"),
    ("lzgf.cn", "xinyuangroup.com"),
    ("LZGF.CN", "XINYUANGROUP.COM"),

    # === Navigation labels ===
    ("龙洲要闻", "集团要闻"),
    ("LONGZHOU NEWS", "XINYUAN NEWS"),
    ("加入龙洲", "加入我们"),
    ("联系龙洲", "联系我们"),

    # === Contact info ===
    ("968866", "400-888-9999"),
    ("0597--3100600", "010-8888-6666"),
    ("0597--3100612", "010-8888-7777"),
    ("364000", "100000"),
    ("福建省龙岩市新罗区南环西路112号", "北京市朝阳区建国路88号鑫远大厦"),
    ("新罗区南环西路112号", "北京市朝阳区建国路88号鑫远大厦"),

    # === Footer / legal ===
    ("闽ICP备17004275号", "京ICP备20240001号"),
    ("闽公网安备 35080202350841号", "京公网安备 11010502000001号"),
    ("网页维护:系统信息部", "网页维护:信息技术部"),

    # === Staff ===
    ("陈明盛", "张明远"),
    ("蓝能旺", "李志强"),
    ("王克勤", "赵建国"),
    ("李常青", "钱学民"),
    ("陈金龙", "孙伟华"),

    # === Email domains ===
    ("@lzgf.cn", "@xinyuangroup.com"),

    # === Subsidiaries in bus.htm ===
    ("福建龙洲运输集团有限公司", "鑫远工程建设有限公司"),
    ("龙岩汽车客运中心站", "北京鑫远建筑工程分公司"),
    ("武平汽车客运中心站", "上海鑫远建筑设计分公司"),
    ("漳平汽车客运中心站", "广州鑫远工程管理分公司"),
    ("永定汽车站", "深圳鑫远工程监理分公司"),
    ("上杭汽车站", "成都鑫远基础设施分公司"),
    ("长汀汽车站", "武汉鑫远路桥建设分公司"),

    # === Subsidiaries in bus-sales.htm ===
    ("东莞中汽宏远汽车有限公司", "鑫远商贸物流有限公司"),
    ("龙岩畅丰专用汽车有限公司", "北京鑫远国际商贸分公司"),
    ("龙岩市新宇汽车销售服务有限公司", "上海鑫远进出口贸易分公司"),
    ("龙岩市龙门机动车安全检测有限公司", "广州鑫远供应链管理分公司"),

    # === Subsidiaries in gas.htm ===
    ("龙岩市岩运石化有限公司", "鑫远新能源科技有限公司"),
    ("福建龙洲海油新能源有限公司", "北京鑫远光伏能源分公司"),

    # === Subsidiaries in otherIndustries.htm ===
    ("龙岩天元信息科技有限公司", "鑫远科技创新投资有限公司"),
    ("武平县龙洲投资发展有限公司", "北京鑫远医疗健康投资分公司"),
    ("龙洲行（厦门）投资有限公司", "上海鑫远文化教育投资分公司"),
    ("龙岩市交通职业技术学校", "鑫远职业技术培训中心"),

    # === Business category names ===
    ("现代物流", "科技研发"),
    ("汽车客运及站务服务", "工程建设"),
    ("汽车制造及销售与服务", "商贸服务"),
    ("成品油及天然气销售", "绿色能源"),
    ("其他产业", "综合投资"),

    # === Business section labels ===
    ("核心业务", "核心业务"),
    ("CORE BUSINESS", "CORE BUSINESS"),

    # === Service hotline label ===
    ("服务热线", "服务热线"),
    ("扫码网上订票", "扫码关注我们"),

    # === Stock ===
    ("002682", "600888"),
    ("股票信息", "股票信息"),
    ("公司公告", "公司公告"),
    ("公司制度", "公司制度"),
    ("独立董事交流专栏", "独立董事交流专栏"),
    ("投资者互动", "投资者互动"),
    ("投资者宣传教育", "投资者宣传教育"),

    # === Honor section ===
    ("集团荣誉", "集团荣誉"),

    # === Taglines ===
    ("龙行 -- 心为洲", "鑫远 -- 行致远"),
    ("龙行·心为洲", "鑫远·行致远"),
    ("道路运输产业持续领导者", "多元化产业持续引领者"),
    ("现代服务产业价值创新商", "现代服务产业价值创新者"),
    ("全方位满足人的高层次需求，全身心创造人的高品质生活", "以创新驱动发展，以品质铸就未来"),
    ("实效为本", "诚信为本"),

    # === Corporate values ===
    ("成事在人，成就由我", "追求卓越，共创未来"),
    ("安全, 快速, 创造, 卓越", "创新, 协作, 诚信, 共赢"),
    ("精诚服务，造福社会", "专业服务，回报社会"),

    # === Company descriptions ===
    ("道路运输", "综合服务"),
    ("汽车客运", "工程管理"),
    ("站务服务", "建设服务"),

    # === Job related ===
    ("纪检监察岗", "行政管理岗"),
    ("资金管理部负责人、财务部会计", "财务部主管"),
    ("武夷股份纪检监察岗招聘公告", "集团行政岗位招聘公告"),
    ("龙洲集团纪检监察岗招聘公告", "集团行政管理岗位招聘公告"),
    ("管理培训生", "管理培训生"),

    # === Misc Longzhou references in content ===
    ("龙洲运输", "鑫远运输"),
    ("龙洲海油", "鑫远能源"),
    ("龙洲行", "鑫远行"),
    ("龙洲", "鑫远"),
]

TARGET_DIRS = [
    os.path.join(BASE_DIR, "pages"),
    os.path.join(BASE_DIR, "templets", "default"),
]

TARGET_EXTENSIONS = {".htm", ".html"}


def transform_file(filepath):
    """Apply all replacements to a single file."""
    try:
        with open(filepath, "r", encoding="utf-8") as f:
            content = f.read()
    except Exception as e:
        print(f"  SKIP (read error): {filepath} — {e}")
        return False

    original = content
    changes = 0
    for old, new in REPLACEMENTS:
        if old != new and old in content:
            content = content.replace(old, new)
            changes += 1

    if content == original:
        return False  # no changes

    try:
        with open(filepath, "w", encoding="utf-8") as f:
            f.write(content)
        print(f"  OK ({changes} replacements): {filepath}")
        return True
    except Exception as e:
        print(f"  FAIL (write error): {filepath} — {e}")
        return False


def main():
    processed = 0
    changed = 0

    for target_dir in TARGET_DIRS:
        if not os.path.isdir(target_dir):
            print(f"SKIP (not a directory): {target_dir}")
            continue

        for root, dirs, files in os.walk(target_dir):
            # Skip mobile directories
            dirs[:] = [d for d in dirs if d not in ("m",)]

            for filename in files:
                ext = os.path.splitext(filename)[1].lower()
                if ext not in TARGET_EXTENSIONS:
                    continue
                filepath = os.path.join(root, filename)
                processed += 1
                if transform_file(filepath):
                    changed += 1

    print(f"\nDone. Processed {processed} files, changed {changed} files.")


if __name__ == "__main__":
    main()
