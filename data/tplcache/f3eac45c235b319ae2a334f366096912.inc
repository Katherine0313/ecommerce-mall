<div class="item">
                                <div class="l news-date">
                                    <div class="day">[field:pubdate function="MyDate('d',@me)"/]</div>
                                    <div class="ym">[field:pubdate function="MyDate('Y-m',@me)"/]</div>
                                </div>
                                <div class="r"><a href="[field:arcurl /]">[field:title function="(strlen(@me)>75?mb_substr(@me,0,25,'utf-8').'…':@me)" /]</a></div>
                            </div>