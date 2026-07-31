var header = document.getElementById('header')
window.addEventListener('scroll', function () {
    header.classList.toggle('scrolled', window.scrollY > 20)
})
var observer = new IntersectionObserver(function (e) {
    e.forEach(function (v) {
        if (v.isIntersecting) v.target.classList.add('visible')
    })
}, {threshold: .15, rootMargin: '0px 0px -40px 0px'})
document.querySelectorAll('.reveal').forEach(function (el) {
    observer.observe(el)
})
// Particles
var canvas = document.getElementById('particles')
if (canvas) {
    var ctx = canvas.getContext('2d'), w, h

    function resize() {
        w = canvas.width = canvas.offsetWidth;
        h = canvas.height = canvas.offsetHeight
    }

    resize();
    window.addEventListener('resize', resize)
    var particles = Array.from({length: 50}, function () {
        return {
            x: Math.random() * w,
            y: Math.random() * h,
            r: Math.random() * 2 + 1,
            vx: (Math.random() - .5) * .4,
            vy: (Math.random() - .5) * .4,
            alpha: Math.random() * .3 + .05
        }
    })

    function animate() {
        ctx.clearRect(0, 0, w, h)
        particles.forEach(function (p) {
            p.x += p.vx;
            p.y += p.vy;
            if (p.x < 0 || p.x > w) p.vx *= -1;
            if (p.y < 0 || p.y > h) p.vy *= -1;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.r, 0, 2 * Math.PI);
            ctx.fillStyle = 'rgba(37,99,235,' + p.alpha + ')';
            ctx.fill()
        })
        requestAnimationFrame(animate)
    }

    animate()
}
// Count-up
var countObs = new IntersectionObserver(function (e) {
    e.forEach(function (v) {
        if (!v.isIntersecting) return;
        var el = v.target, target = parseInt(el.dataset.count), duration = 2000, start = performance.now()

        function tick(now) {
            var p = Math.min((now - start) / duration, 1), eased = 1 - Math.pow(1 - p, 3);
            el.textContent = Math.floor(target * eased).toLocaleString();
            if (p < 1) requestAnimationFrame(tick); else el.textContent = target.toLocaleString()
        }

        requestAnimationFrame(tick)
    })
}, {threshold: .5})
document.querySelectorAll('[data-count]').forEach(function (el) {
    countObs.observe(el)
})