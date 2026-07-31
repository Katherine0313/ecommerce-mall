// 动态统计 .bs-right .item 条目数，更新分页区域的"共X条"
document.addEventListener('DOMContentLoaded', function() {
    var items = document.querySelectorAll('.bs-right .item');
    var totalSpan = document.getElementById('total-count');
    if (totalSpan) {
        totalSpan.textContent = '共' + items.length + '条';
    }
});
