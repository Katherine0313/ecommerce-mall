<div class="item">
            [field:array runphp='yes']@me = (empty(@me['litpic']) ? "<div class=\"thumb\"><span style=\"color:#ccc;font-size:30px;\">&#128196;</span></div>" : "<a href=\"view.php?aid={@me['id']}\" class=\"thumb\"><img src=\"{@me['litpic']}\"></a>"); [/field:array]
            <div class="info">
                <h3><a href="view.php?aid=[field:id/]">[field:title/]</a></h3>
                <div class="meta">[field:pubdate function="GetDateTimeMK(@me)"/] &nbsp; 点击: [field:click/]</div>
                <div class="desc">[field:description/]...</div>
            </div>
        </div>