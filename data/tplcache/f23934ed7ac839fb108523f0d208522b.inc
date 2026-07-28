<div class="tbox">
                    <div class="head">
                        <div class="l">
                            <a href="{dede:field name='typeurl'/}">{dede:field name='typename'/}</a>
                        </div>
                        <div class="r"><a href="{dede:field name='typeurl'/}">更多...</a></div>
                    </div>
                    <div>
                        <div class="d1" id="news-list">
                            {dede:arclist titlelen='75' row='8'}
                            <div class="item">
                                <div class="l news-date">
                                    <div class="day">[field:pubdate function="MyDate('d',@me)"/]</div>
                                    <div class="ym">[field:pubdate function="MyDate('Y-m',@me)"/]</div>
                                </div>
                                <div class="r"><a href="[field:arcurl /]">[field:title function="(strlen(@me)>75?mb_substr(@me,0,25,'utf-8').'…':@me)" /]</a></div>
                            </div>
                            {/dede:arclist}
                        </div>
                    </div>
                </div>