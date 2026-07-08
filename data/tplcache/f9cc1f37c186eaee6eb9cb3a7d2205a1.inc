<div class="tbox">
                    <div class="head">
                        <div class="l">
                            <a href="{dede:field name='typeurl'/}">
                                {dede:field name='typename'/}</a>
                        </div>
                        <div class="r"><a href="{dede:field name='typeurl'/}">
                        更多...</a></div>
                    </div>
                    <div>
                        <div class="d1" id="news">
                            {dede:arclist titlelen='90' row='8'}
                            <div class="item">
                                <span>[field:pubdate function="MyDate('m-d',@me)"/]</span><a
                                    href="[field:arcurl /]">[field:title
                                /]</a></div>
                            {/dede:arclist}
                        </div>
                    </div>
                </div>