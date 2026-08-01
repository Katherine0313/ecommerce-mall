/**
 * 分页信息自动统计
 * 读取 .content-right .item 数量，写入 #total-count
 */
(function () {
    //计数范围
    var items = document.querySelectorAll('.content-right .item');
    // 计数后填到哪个地方
    var el = document.getElementById('total-count');
    if (el) {
        el.textContent = '共' + items.length + '条';
    }
})();
