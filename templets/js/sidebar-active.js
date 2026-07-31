// 侧边栏导航自动高亮 — 根据当前页面路径匹配 .intro-left .item a 的 href（支持子路径）
document.addEventListener('DOMContentLoaded', function() {
    var path = window.location.pathname;
    var items = document.querySelectorAll('.intro-left .item a[href]');
    for (var i = 0; i < items.length; i++) {
        var href = items[i].getAttribute('href');
        if (!href || href === '#') continue;
        var hrefPath = href.split('?')[0].split('#')[0].replace(/\/+$/, '');
        if (!hrefPath) continue;
        if (path === hrefPath || path.indexOf(hrefPath + '/') === 0) {
            items[i].parentElement.classList.add('active');
        }
    }
});
