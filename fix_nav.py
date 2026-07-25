import re

path = r'D:/Software/phpstudy/WWW/dede1/templets/default/head.htm'
with open(path, 'rb') as f:
    content = f.read()

old = b'''    <div class="nav">\r
        <div class="nav-item ">\r
            <a href="{dede:global.cfg_cmsurl/}/">\xef\xbc\x88\xe9\xa6\x96\xe9\xa1\xb5</a>\r
        </div>\r
        <div class="nav-item has-drop-down">\r
            <a href="{dede:global.cfg_cmsurl/}/a/aboutus/">\xe5\x85\xb3\xe4\xba\x8e\xe6\x88\x91\xe4\xbb\xac</a>\r
            <ul class="dropdown">\r
                <li><a href="#">\xe5\x85\xac\xe5\x8f\xb8\xe7\xae\x80\xe4\xbb\x8b</a></li>\r
                <li><a href="#">\xe4\xbc\x81\xe4\xb8\x9a\xe6\x96\x87\xe5\x8c\x96</a></li>\r
                <li><a href="#">\xe9\x9b\x86\xe5\x9b\xa2\xe8\x8d\xa3\xe8\xaa\x89</a></li>\r
            </ul>\r
        </div>\r
        <div class="nav-item"><a href="{dede:global.cfg_cmsurl/}/a/business/">\xe5\x85\xac\xe5\x8f\xb8\xe4\xb8\x9a\xe5\x8a\xa1</a></div>\r
        <div class="nav-item"><a href="{dede:global.cfg_cmsurl/}/a/news/">\xe6\x96\xb0\xe9\x97\xbb\xe5\x8a\xa8\xe6\x80\x81</a></div>\r
        <div class="nav-item"><a href="#">\xe6\x8a\x95\xe8\xb5\x84\xe8\x80\x85\xe5\x85\xb3\xe7\xb3\xbb</a></div>\r
        <div class="nav-item"><a href="#">\xe5\x8a\xa0\xe5\x85\xa5\xe9\xbe\x99\xe6\xb4\xb2</a></div>\r
        <div class="nav-item"><a href="#">\xe8\x81\x94\xe7\xb3\xbb\xe9\xbe\x99\xe6\xb4\xb2</a></div>\r
    </div>'''

if old not in content:
    print('OLD STRING NOT FOUND')
    print('Trying without specific chinese bytes...')
else:
    # Build new content with home active class
    new = b'''    <div class="nav">\r
        <div class="nav-item {dede:field.typeid runphp=\'yes\'}if(@me==\'\'||@me==\'0\') @me=\'active\';else @me=\'\';{/dede:field.typeid}">\r
            <a href="{dede:global.cfg_cmsurl/}/">\xef\xbc\x88\xe9\xa6\x96\xe9\xa1\xb5</a>\r
        </div>\r
        <div class="nav-item has-drop-down">\r
            <a href="{dede:global.cfg_cmsurl/}/a/aboutus/">\xe5\x85\xb3\xe4\xba\x8e\xe6\x88\x91\xe4\xbb\xac</a>\r
            <ul class="dropdown">\r
                <li><a href="#">\xe5\x85\xac\xe5\x8f\xb8\xe7\xae\x80\xe4\xbb\x8b</a></li>\r
                <li><a href="#">\xe4\xbc\x81\xe4\xb8\x9a\xe6\x96\x87\xe5\x8c\x96</a></li>\r
                <li><a href="#">\xe9\x9b\x86\xe5\x9b\xa2\xe8\x8d\xa3\xe8\xaa\x89</a></li>\r
            </ul>\r
        </div>\r
        <div class="nav-item"><a href="{dede:global.cfg_cmsurl/}/a/business/">\xe5\x85\xac\xe5\x8f\xb8\xe4\xb8\x9a\xe5\x8a\xa1</a></div>\r
        <div class="nav-item"><a href="{dede:global.cfg_cmsurl/}/a/news/">\xe6\x96\xb0\xe9\x97\xbb\xe5\x8a\xa8\xe6\x80\x81</a></div>\r
        <div class="nav-item"><a href="#">\xe6\x8a\x95\xe8\xb5\x84\xe8\x80\x85\xe5\x85\xb3\xe7\xb3\xbb</a></div>\r
        <div class="nav-item"><a href="#">\xe5\x8a\xa0\xe5\x85\xa5\xe9\xbe\x99\xe6\xb4\xb2</a></div>\r
        <div class="nav-item"><a href="#">\xe8\x81\x94\xe7\xb3\xbb\xe9\xbe\x99\xe6\xb4\xb2</a></div>\r
    </div>\r
<script>\r
document.addEventListener(\'DOMContentLoaded\', function() {\r
    var path = window.location.pathname;\r
    if (path === \'/\' || /index\\.(html|php)$/.test(path)) return;\r
    document.querySelectorAll(\'.nav .nav-item\').forEach(function(item) {\r
        var a = item.querySelector(\'a\');\r
        if (!a) return;\r
        var href = a.getAttribute(\'href\');\r
        if (!href || href === \'#\') return;\r
        var hrefPath = href.split(\'?\')[0].split(\'#\')[0].replace(/\\/+$/, \'\');\r
        if (!hrefPath) return;\r
        if (path === hrefPath || path.indexOf(hrefPath + \'/\') === 0) {\r
            item.classList.add(\'active\');\r
        }\r
    });\r
});\r
</script>'''

    content = content.replace(old, new)
    with open(path, 'wb') as f:
        f.write(content)
    print('OK, replaced')