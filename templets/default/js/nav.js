/**
 * 龙洲集团 - 全局路由管理
 * ============================
 * 项目中所有页面跳转统一在这里维护。
 *
 * 用法一：在 HTML 中用 data-route="key" 代替 href
 *   <a href="#" data-route="about">关于我们</a>
 *
 * 用法二：在 JS 中调用
 *   router.go('about');
 *   router.goUrl('/a/aboutus/');
 *
 * 用法三：导航下拉菜单自动匹配（根据链接文字查找 URL）
 *   保持 <a href="#">公司简介</a> 即可，JS 自动拦截跳转
 */

var ROUTES = {
    // =================== 首页 ===================
    'home':       '/',

    // =================== 关于我们（待建页面，建好后替换 #）===================
    'about':      '#', // TODO: /a/aboutus/
    '公司简介':     '#', // TODO: /a/aboutus/profile/
    '企业文化':     '#', // TODO: /a/aboutus/culture/
    '集团荣誉':     '#', // TODO: /a/aboutus/honor/

    // =================== 公司业务（待建页面，建好后替换 #）===================
    'business':   '#', // TODO: /a/business/
    '现代物流':     'http://www.ahzzwl.cn/',
    '汽车客运及站务服务': '/pages/bus.htm',
    '汽车制造及销售与服务': '/pages/bus-sales.htm',
    '成品油及天然气销售': '#', // TODO: /a/business/oil/
    '其他产业':     '#', // TODO: /a/business/other/

    // =================== 新闻动态 ====================
    'news':       '#', // TODO: /a/news/
    '龙洲要闻':     '/a/qiyezixun/',
    '招投标':       '/a/zhaotoubiao/',

    // =================== 投资者关系（待建页面，建好后替换 #）===================
    'investor':   '#', // TODO: /a/investor/
    '股票信息':     '#', // TODO: /a/investor/stock/
    '公司公告':     '#', // TODO: /a/investor/announcement/
    '公司制度':     '#', // TODO: /a/investor/policy/
    '独立董事交流专栏': '#', // TODO: /a/investor/director/
    '投资者互动':   '#', // TODO: /a/investor/interaction/
    '投资者宣传教育': '#', // TODO: /a/investor/education/
    '联系我们':     '#', // TODO: /a/investor/contact/

    // =================== 加入龙洲 ===================
    'join':       '/pages/joinus.htm',

    // =================== 联系龙洲 ===================
    'contact':    '/pages/contact.htm',

    // =================== 首页核心业务 ===================
    'biz-logistics':      'http://www.ahzzwl.cn/',
    'biz-passenger':      '/pages/bus.htm',
    'biz-manufacturing':  '/pages/bus-sales.htm',
    'biz-oil':            '#',
    'biz-other':          '#',

    // =================== 搜索 ===================
    'search':     '/plus/search.php'
};

// 兼容旧变量名
var NAV_URLS = ROUTES;

// =================== 路由工具函数 ===================

var router = {

    /** 根据 key 跳转 */
    go: function (key) {
        var url = ROUTES[key];
        if (url && url !== '#') {
            window.location.href = url;
        }
    },

    /** 直接跳转 URL */
    goUrl: function (url) {
        if (url && url !== '#') {
            window.location.href = url;
        }
    },

    /** 根据链接文字跳转（用于下拉菜单） */
    goByText: function (text) {
        var url = ROUTES[text.trim()];
        if (url) {
            window.location.href = url;
        }
    },

    /** 获取 URL，不跳转 */
    getUrl: function (key) {
        return ROUTES[key] || '#';
    }
};

// 兼容旧函数名
function navGo(url) { router.goUrl(url); }
function navGoByText(text) { router.goByText(text); }

// =================== 自动绑定事件 ===================

document.addEventListener('DOMContentLoaded', function () {

    // 1. 所有带 data-route 属性的元素，点击时按 key 跳转
    var routeLinks = document.querySelectorAll('[data-route]');
    for (var i = 0; i < routeLinks.length; i++) {
        routeLinks[i].addEventListener('click', function (e) {
            e.preventDefault();
            router.go(this.getAttribute('data-route'));
        });
    }

    // 2. 导航下拉菜单 — 根据链接文字自动匹配 ROUTES
    var dropdownLinks = document.querySelectorAll('.nav .dropdown li a');
    for (var j = 0; j < dropdownLinks.length; j++) {
        dropdownLinks[j].addEventListener('click', function (e) {
            e.preventDefault();
            router.goByText(this.textContent);
        });
    }

    // 3. 所有 href="#" 且有 data-route-text 的链接
    var textLinks = document.querySelectorAll('a[data-route-text]');
    for (var k = 0; k < textLinks.length; k++) {
        textLinks[k].addEventListener('click', function (e) {
            e.preventDefault();
            router.goByText(this.getAttribute('data-route-text'));
        });
    }
});
