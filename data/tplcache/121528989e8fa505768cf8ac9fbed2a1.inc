<div class="tbox">
                    <div><strong><a href="{dede:field name='typeurl'/}" >
                        {dede:field name='typename'/}</a></strong><span
                            class="more"><a href="{dede:field name='typeurl'/}" >
                        更多...</a></span></div>
                    <div>
                        <div class="d1" id="news">
                            {dede:arclist titlelen='60' row='8'}
                            <div><span>[field:pubdate function="MyDate('m-d',@me)"/]</span><a href="[field:arcurl /]">[field:title
                                /]</a></div>
                            {/dede:arclist}
                        </div>
                    </div>
                </div>