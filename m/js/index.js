// =================== 1. 侧滑菜单 ===================
var menuBtn = document.getElementById('menuBtn');
var navOverlay = document.getElementById('navOverlay');
var navPanel = document.getElementById('navPanel');
var navClose = document.getElementById('navClose');

function openNav() {
navOverlay.classList.add('show');
navPanel.classList.add('show');
document.body.style.overflow = 'hidden';
}
function closeNav() {
navOverlay.classList.remove('show');
navPanel.classList.remove('show');
document.body.style.overflow = '';
}

menuBtn.addEventListener('click', openNav);
navOverlay.addEventListener('click', closeNav);
navClose.addEventListener('click', closeNav);

// 点击菜单链接后自动关闭
navPanel.querySelectorAll('a').forEach(function(a) {
a.addEventListener('click', function() {
    if (a.getAttribute('href') !== './index.html') closeNav();
});
});

// =================== 2. 顶部导航滚动效果 ===================
var header = document.getElementById('header');
window.addEventListener('scroll', function() {
header.classList.toggle('scrolled', window.scrollY > 10);
});

// =================== 3. 滚动揭示动画 ===================
var observer = new IntersectionObserver(function(e) {
e.forEach(function(v) {
    if (v.isIntersecting) v.target.classList.add('visible');
});
}, { threshold: 0.12, rootMargin: '0px 0px -30px 0px' });

document.querySelectorAll('.reveal').forEach(function(el) {
observer.observe(el);
});

// =================== 4. Hero 粒子背景 ===================
var canvas = document.getElementById('particles');
if (canvas) {
var ctx = canvas.getContext('2d'), w, h;

function resize() {
    w = canvas.width = canvas.offsetWidth;
    h = canvas.height = canvas.offsetHeight;
}
resize();
window.addEventListener('resize', resize);

// 移动端减少粒子数量以优化性能
var particles = Array.from({ length: 30 }, function() {
    return {
        x: Math.random() * w,
        y: Math.random() * h,
        r: Math.random() * 2 + 1,
        vx: (Math.random() - 0.5) * 0.35,
        vy: (Math.random() - 0.5) * 0.35,
        alpha: Math.random() * 0.3 + 0.05
    };
});

function animate() {
    ctx.clearRect(0, 0, w, h);
    particles.forEach(function(p) {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0 || p.x > w) p.vx *= -1;
        if (p.y < 0 || p.y > h) p.vy *= -1;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, 2 * Math.PI);
        ctx.fillStyle = 'rgba(37,99,235,' + p.alpha + ')';
        ctx.fill();
    });
    requestAnimationFrame(animate);
}
animate();
}

// =================== 5. 数字滚动动画 ===================
var countObs = new IntersectionObserver(function(e) {
e.forEach(function(v) {
    if (!v.isIntersecting) return;
    var el = v.target, target = parseInt(el.dataset.count), duration = 1800, start = performance.now();

    function tick(now) {
        var p = Math.min((now - start) / duration, 1), eased = 1 - Math.pow(1 - p, 3);
        el.textContent = Math.floor(target * eased).toLocaleString();
        if (p < 1) requestAnimationFrame(tick);
        else el.textContent = target.toLocaleString();
    }
    requestAnimationFrame(tick);
});
}, { threshold: 0.5 });

document.querySelectorAll('[data-count]').forEach(function(el) {
countObs.observe(el);
});
