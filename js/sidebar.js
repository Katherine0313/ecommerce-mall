/**
 * 子页面侧边栏自动高亮 — 全自动
 *
 * 优先级：
 *   1. <body data-sidebar="../project.html"> — 子页面手动指定归属
 *   2. URL 路径自动匹配 — 同级页面无需任何改动
 */
(function () {
    var body = document.body;
    var target = body.getAttribute('data-sidebar'); // 子页面指定归属路径

    var path = window.location.pathname.replace(/\/+$/, '');
    var links = document.querySelectorAll('.content-left .item a[href]');

    for (var i = 0; i < links.length; i++) {
        var href = links[i].getAttribute('href');
        if (!href || href === '#') continue;

        var resolved = new URL(href, window.location.href).pathname.replace(/\/+$/, '');

        var matched = target
            ? (resolved === new URL(target, window.location.href).pathname.replace(/\/+$/, ''))
            : (path === resolved || path.indexOf(resolved + '/') === 0);

        if (matched) {
            links[i].parentElement.classList.add('active');
            break;
        }
    }
})();
