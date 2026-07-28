import os

old_nav = '''<div class="header_top">
    <div class="nav">
        <a href="/">首页</a>
        <a href="#">关于我们</a>
        <a href="/pages/bus.htm">公司业务</a>
        <a href="/a/qiyezixun/">新闻动态</a>
        <a href="/pages/invest/stock.htm">投资者关系</a>
        <a href="/pages/joinus.htm">加入龙洲</a>
        <a href="/pages/contact.htm">联系龙洲</a>
    </div>
</div>'''

new_nav = '''<div class="header_top">
    <img src="/templets/default/images/long/head-left.png" alt="龙洲股份" class="header-logo header-logo-left" />
    <div class="nav">
        <div class="nav-item">
            <a href="/">首页</a>
        </div>
        <div class="nav-item has-drop-down">
            <a href="/pages/about/index.htm">关于我们</a>
            <ul class="dropdown">
                <li><a href="/pages/about/index.htm">公司简介</a></li>
                <li><a href="/pages/about/culture.htm">企业文化</a></li>
                <li><a href="/pages/about/honor.htm">集团荣誉</a></li>
            </ul>
        </div>
        <div class="nav-item has-drop-down">
            <a href="/pages/bus.htm">公司业务</a>
            <ul class="dropdown">
                <li><a href="http://www.ahzzwl.cn/">现代物流</a></li>
                <li><a href="/pages/bus.htm">汽车客运及站务服务</a></li>
                <li><a href="/pages/bus-sales.htm">汽车制造及销售与服务</a></li>
                <li><a href="/pages/gas.htm">成品油及天然气销售</a></li>
                <li><a href="/pages/otherIndustries.htm">其他产业</a></li>
            </ul>
        </div>
        <div class="nav-item has-drop-down">
            <a href="/a/qiyezixun/">新闻动态</a>
            <ul class="dropdown">
                <li><a href="/a/qiyezixun/">龙洲要闻</a></li>
                <li><a href="/a/zhaotoubiao/">招投标</a></li>
            </ul>
        </div>
        <div class="nav-item has-drop-down">
            <a href="/pages/invest/stock.htm">投资者关系</a>
            <ul class="dropdown">
                <li><a href="/pages/invest/stock.htm">股票信息</a></li>
                <li><a href="https://www.szse.cn/disclosure/listed/notice/index.html?name=%E9%BE%99%E6%B4%B2%E8%82%A1%E4%BB%BD&stock=002682&r=1592295365241">公司公告</a></li>
                <li><a href="/pages/invest/system.htm">公司制度</a></li>
                <li><a href="/pages/invest/investor.htm">独立董事交流专栏</a></li>
                <li><a href="https://ir.p5w.net/c/002682">投资者互动</a></li>
                <li><a href="/pages/invest/education.htm">投资者宣传教育</a></li>
            </ul>
        </div>
        <div class="nav-item has-drop-down">
            <a href="/pages/joinus.htm">加入龙洲</a>
        </div>
        <div class="nav-item has-drop-down">
            <a href="/pages/contact.htm">联系龙洲</a>
        </div>
    </div>
    <script>
    document.addEventListener('DOMContentLoaded', function() {
        var path = window.location.pathname;
        if (path === '/' || /index\.(html|php)$/.test(path)) return;
        document.querySelectorAll('.nav .nav-item').forEach(function(item) {
            var a = item.querySelector('a');
            if (!a) return;
            var href = a.getAttribute('href');
            if (!href || href === '#') return;
            var hrefPath = href.split('?')[0].split('#')[0].replace(/\/+$/, '');
            if (!hrefPath) return;
            if (path === hrefPath || path.indexOf(hrefPath + '/') === 0) {
                item.classList.add('active');
            }
        });
    });
    </script>
    <img src="/templets/default/images/long/head-right.png" alt="" class="header-logo header-logo-right" />
</div>'''

files = [
    r'D:\Software\phpstudy\WWW\dede1\pages\bus.htm',
    r'D:\Software\phpstudy\WWW\dede1\pages\bus-sales.htm',
    r'D:\Software\phpstudy\WWW\dede1\pages\gas.htm',
    r'D:\Software\phpstudy\WWW\dede1\pages\otherIndustries.htm',
    r'D:\Software\phpstudy\WWW\dede1\pages\invest\investor.htm',
]

for f in files:
    with open(f, 'r', encoding='utf-8') as fp:
        content = fp.read()
    if old_nav in content:
        content = content.replace(old_nav, new_nav)
        # Add layout.css if missing
        if 'layout.css' not in content:
            content = content.replace(
                '<link href="/templets/default/style/page.css"',
                '<link href="/templets/default/style/layout.css" rel="stylesheet" media="screen" type="text/css" />\n    <link href="/templets/default/style/page.css"'
            )
        with open(f, 'w', encoding='utf-8') as fp:
            fp.write(content)
        print(f'OK: {f}')
    else:
        print(f'SKIP (nav not found): {f}')
