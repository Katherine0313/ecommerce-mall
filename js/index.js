/**
 * 首页（index.html）交互脚本
 * ============================
 * 包含四个功能模块：
 *   1. 顶部导航滚动效果 —— 页面滚动时给 header 添加半透明毛玻璃样式
 *   2. 滚动揭示动画     —— 元素进入视口时触发淡入上移效果（.reveal）
 *   3. Hero 粒子背景   —— 首页首屏 Canvas 粒子动画
 *   4. 数字滚动动画     —— 统计数据从 0 递增到目标值（data-count）
 */

// =================== 1. 顶部导航滚动效果 ===================
// 页面滚动超过 20px 时，header 添加 .scrolled 类（半透明 + 毛玻璃 + 底部边框）
var header = document.getElementById('header')
window.addEventListener('scroll', function () {
	header.classList.toggle('scrolled', window.scrollY > 20)
})

// =================== 2. 滚动揭示动画 ===================
// 监听所有 .reveal 元素，进入视口时添加 .visible 触发 CSS 过渡（淡入 + 上移）
var observer = new IntersectionObserver(function (e) {
	e.forEach(function (v) {
		if (v.isIntersecting) v.target.classList.add('visible')
	})
}, {threshold: .15, rootMargin: '0px 0px -40px 0px'})
document.querySelectorAll('.reveal').forEach(function (el) {
	observer.observe(el)
})

// =================== 3. Hero 粒子背景 ===================
// 在首页首屏 <canvas id="particles"> 上绘制 50 个随机运动的蓝色粒子
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

// =================== 4. 数字滚动动画 ===================
// 监听所有带 data-count 属性的元素，进入视口后数字从 0 缓动递增至目标值
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
