/**
 * 通用轮播图
 * - 自动播放，每 3 秒切换
 * - 鼠标 hover 暂停
 * - 底部小圆点点击切换
 * - 多张图片通过透明度淡入淡出
 *
 * 用法：给任意容器加上 data-carousel 属性，里面依次放 <img> 即可，
 *       圆点会自动生成。
 *
 *   <div data-carousel class="banner">
 *       <img src="1.jpg" />
 *       <img src="2.jpg" />
 *       ...
 *   </div>
 */
(function () {
    var containers = document.querySelectorAll('[data-carousel]');
    if (!containers.length) return;

    var INTERVAL = 3000; // 自动切换间隔（毫秒）

    function init(container) {
        var imgs = container.querySelectorAll('img');
        if (imgs.length < 2) return;

        // 第一张图参与布局（撑出高度），其余绝对定位叠在一起
        imgs[0].classList.add('slide-img', 'active');
        for (var i = 1; i < imgs.length; i++) {
            imgs[i].classList.add('slide-img');
        }

        // 生成底部小圆点
        var dots = document.createElement('ul');
        dots.className = 'slide-dots';
        for (var j = 0; j < imgs.length; j++) {
            var li = document.createElement('li');
            if (j === 0) li.className = 'active';
            (function (idx) {
                li.addEventListener('click', function () {
                    show(idx);
                    resetTimer();
                });
            })(j);
            dots.appendChild(li);
        }
        container.appendChild(dots);

        var current = 0;
        var timer = null;

        function show(idx) {
            for (var i = 0; i < imgs.length; i++) {
                imgs[i].classList.toggle('active', i === idx);
            }
            for (var i = 0; i < dots.children.length; i++) {
                dots.children[i].classList.toggle('active', i === idx);
            }
            current = idx;
        }

        function next() {
            show((current + 1) % imgs.length);
        }

        function resetTimer() {
            if (timer) clearInterval(timer);
            timer = setInterval(next, INTERVAL);
        }

        container.addEventListener('mouseenter', function () {
            if (timer) clearInterval(timer);
        });
        container.addEventListener('mouseleave', function () {
            resetTimer();
        });

        show(0);
        resetTimer();
    }

    for (var i = 0; i < containers.length; i++) {
        init(containers[i]);
    }
})();