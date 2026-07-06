<?php
/**
 * 后台登录
 *
 * @version        $Id: login.php 1 8:48 2010年7月13日 $
 * @package        DedeCMS.Administrator
 * @founder        IT柏拉图, https://weibo.com/itprato
 * @author         DedeCMS团队
 * @copyright      Copyright (c) 2004 - 2024, 上海卓卓网络科技有限公司 (DesDev, Inc.)
 * @license        http://help.dedecms.com/usersguide/license.html
 * @link           http://www.dedecms.com
 */
require_once(dirname(__FILE__).'/../include/common.inc.php');
require_once(DEDEINC.'/userlogin.class.php');
if(empty($dopost)) $dopost = '';

//检测安装目录安全性
if( is_dir(dirname(__FILE__).'/../install') )
{
    if(!file_exists(dirname(__FILE__).'/../install/install_lock.txt') )
    {
      $fp = fopen(dirname(__FILE__).'/../install/install_lock.txt', 'w') or die('安装目录无写入权限，无法进行写入锁定文件，请安装完毕删除安装目录！');
      fwrite($fp,'ok');
      fclose($fp);
    }
    //为了防止未知安全性问题，强制禁用安装程序的文件
    if( file_exists("../install/index.php") ) {
        @rename("../install/index.php", "../install/index.php.bak");
    }
    if( file_exists("../install/module-install.php") ) {
        @rename("../install/module-install.php", "../install/module-install.php.bak");
    }
	$fileindex = "../install/index.html";
	if( !file_exists($fileindex) ) {
		$fp = @fopen($fileindex,'w');
		fwrite($fp,'dir');
		fclose($fp);
	}
}

//更新服务器
require_once (DEDEDATA.'/admin/config_update.php');


//检测后台目录是否更名
$cururl = GetCurUrl();
if(preg_match('/dede\/login/i',$cururl))
{
    $redmsg = '<div class=\'safe-tips\'>您的管理目录的名称中包含默认名称dede，建议在FTP里把它修改为其它名称，那样会更安全！</div>';
}
else
{
    $redmsg = '';
}

//登录检测
$admindirs = explode('/',str_replace("\\",'/',dirname(__FILE__)));
$admindir = $admindirs[count($admindirs)-1];
if($dopost=='login')
{

    // 请替换为你的私钥
    $privateKey = '-----BEGIN PRIVATE KEY-----
MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQDLBfWm0aKNbOtB
KHRXJkzVATr5JNfed0I3NxLyLDSJjgnq/k4Rf66lUpZaChEB/N5dY6ef7f7EJvVh
f0uIiusd0bbFxdNpbt+KIH3SP/ySSVPD/Ur5x/uOox/TCncoqASFi/wR/V3qqia8
o1ytv6QmuJizpUILP0qUPSEy5lDw6O4CPJvGGCKbQMwUAG/taWmiS5x6m3gZkx6T
t8bniYvrMse0mCQlnwQ8sByM8XDsH0gta19+TZzJqaE8UlTFvKXjTG9JmJEvpi5p
s2BOzkL1pY/CWh7ws28TWf6JO9cktviNxnDk4wfrpRX46J6XOtilPR5BCIBTmtOm
y8peHWTRAgMBAAECggEAUgfmabDqbRpFM96Uo2HmSWpl2aT5U/n71zN5hEA4Ohwa
Bcka4hclCceE2HyYwqTZdAKACC6xcbAMFYjJjDIVLcc+gkqcUU1rJPRb4kfYVYMr
RVVipeoXylo+0Za47sR0j0EwaFRnThnR7QZUvB9ixAJyMKPlO4YnLB5G+7nzmmLJ
5lctynHvd/xqSm/0pREr60/D++CWpfrmlSic/EWKup+rUwbJ5wDyJWdqEUcF5aep
pshkbTDdCG/nTFzxD9a7d1BSpPiXHoiMaHqz61a/8qLybD2Z4uPpIpJVLajANJbG
Ho6MD6q8VBcuqNXbzEveVF3qli2s1YExylWiudcHwQKBgQD+8Lq802fWNxoIbEVW
qA7X4M2t06Tcwtp1n6+MF0A4SDcknQbU5YxAk0qsgSlm1/F66Qkwvaib0SmYqD8y
LmEMhFzBoulIw3+7/zH8opV3icNHMHMcl7OxNfuJb8kaZ1XOowBlSNDk1pgEEVrH
JuCljfrZ9osg2brKaHuBQ1X4BwKBgQDL3fzNwzQln+YVubrMWFLTYBVfnN1efCO7
0vAUGH+1Fc/N6cLWduF8mdXlrPNH++rUtPkLbk1awGFBEt+mkRhbhEFoxB7Y08p1
p4lQH9JJFniWEuhXkreLEOwSaXBwCvZ72PCimOlW6Y0e5c8SqVst++qSXb7GTzOm
Io25GZoWZwKBgQCEjHDqoBfKvpdgbbqXVYVyJEWL7RA4X27p3P6OncAcAx/4f1P/
+OE06d/XVMhL2laJCwRmPRWe/d7cqg1Bb++xbFg1rRgRZuPQwNwid/2ySwQmzT/s
S8t3hZOkX2R1v+hTKViZUISblh8vbj5+cO435VvZW1/20n1Vo4EjMflOnQKBgBLV
ENNZIuoO2UxMeesChbQs/gx1CyX9RbfGBpN0p+dsemPFIlB5bt75vv6WeWq+5LR9
ezwJFnA5sUI3oh1a7esWToyFAWx6NAumTFLwfZZu0vjaCkh8ryPTjlstDkvrV1Wd
dq0ufu+eZ4DhLb3FkzyuNr8KleLv0g+YxYrByLAlAoGAXj3amqNBQk/BkSOwaHQt
9vjMXTc2XpFwHgeBEpdW+D/zp8DgO/DZvtFVMSbi5KVM6NchSy4EqlgVZ6EGJYXh
PT5O8Br7TPaHPLpD/SJ1OPFW97XYlSIoUrJC97AtWaBbKacPDnaDBXaT2p9UrWlm
eU29rEAkULWpJChy0kWL3Gg=
-----END PRIVATE KEY-----';

    if (openssl_pkey_get_private($privateKey)) {
    } else {
        ShowMsg("私钥格式不正确或无法读取", 'login.php', 0, 5000);
        exit;
    }

    $encrypted = base64_decode($pwd);
    $decrypted = '';

    if (openssl_private_decrypt($encrypted, $decrypted, $privateKey)) {
    } else {
        ShowMsg("解密失败: ".openssl_error_string(), 'login.php', 0, 5000);
        exit;
    }


    //只允许用户名和密码用0-9,a-z,A-Z,'@','_','.','-'这些字符
    $userid = preg_replace("/[^0-9a-zA-Z_@!\.-]/", '', $userid);
    $pwd = preg_replace("/[^0-9a-zA-Z_@!\.-]/", '', $decrypted);

    $cfg_fail_limit = isset($cfg_fail_limit) ? $cfg_fail_limit : 5;
    $cfg_lock_time = isset($cfg_lock_time) ? $cfg_lock_time : 3600;

    // 连续登录失败用户锁定
    $fail_limit = $cfg_fail_limit;
    $lock_time = $cfg_lock_time;
    $arr_login = array();
    $filename = DEDEDATA.'/login.data.php';
    if (file_exists($filename)) {
        require_once(DEDEDATA . '/login.data.php');
        $arr_login = json_decode($str_login, true);
        if ($arr_login[$userid] != '') {
            $count = explode(',', $arr_login[$userid])[0];
            $timestamp = explode(',', $arr_login[$userid])[1];
            if ($count == $fail_limit && $timestamp + $lock_time > time()) {
                $date = date('Y-m-d H:i:s', $timestamp + $lock_time);
                ResetVdValue();
                ShowMsg("连续登录失败用户锁定！解锁时间：{$date}", 'login.php', 0, 5000);
                exit;
            }
        }
    }

    $validate = empty($validate) ? '' : strtolower(trim($validate));
    $svali = strtolower(GetCkVdValue());
    if(($validate=='' || $validate != $svali) && preg_match("/6/",$safe_gdopen)){
        ResetVdValue();
        ShowMsg('验证码不正确!','login.php',0,1000);
        exit;
    } else {
        $cuserLogin = new userLogin($admindir);
        if(!empty($userid) && !empty($pwd))
        {
            $res = $cuserLogin->checkUser($userid,$pwd);

            //success
            if($res==1)
            {
                // 连续登录失败用户锁定
                $count = 0;
                $timestamp = time();
                $arr_login[$userid] = "{$count},{$timestamp}";
                $content = "<?php\r\n\$str_login='".json_encode($arr_login)."';";

                $fp = fopen($filename, 'w') or die("写入文件失败，请检查权限！");
                fwrite($fp, $content);
                fclose($fp);

                $cuserLogin->keepUser();
                if(!empty($gotopage))
                {
                    if (preg_match("#^(http|https):\/\/#i", $gotopage) && !preg_match("#^(http|https):\/\/{$_SERVER['HTTP_HOST']}#i", $gotopage)) {
                        ShowMsg('非本站资源无法访问', 'javascript:;');
                        exit();
                    }
                    ShowMsg('成功登录，正在转向管理管理主页！',dede_htmlspecialchars($gotopage));
                    exit();
                }
                else
                {
                    ShowMsg('成功登录，正在转向管理管理主页！',"index.php");
                    exit();
                }
            }
            //error
            else if($res==-1)
            {
                ResetVdValue();
                ShowMsg('用户名或者密码错误!','login.php',0,1000);
                exit;
            }
            else
            {
                // 连续登录失败用户锁定
                $count = 1;
                $timestamp = time();
                if ($arr_login[$userid] != '') {
                    $count = explode(',', $arr_login[$userid])[0] + 1;
                    if ($count > $fail_limit) {
                        $count = 1;
                    }
                }
                $arr_login[$userid] = "{$count},{$timestamp}";
                $content = "<?php\r\n\$str_login='".json_encode($arr_login)."';";

                $fp = fopen($filename, 'w') or die("写入文件失败，请检查权限！");
                fwrite($fp, $content);
                fclose($fp);

                ResetVdValue();
                ShowMsg('用户名或者密码错误!','login.php',0,1000);
				exit;
            }
        }

        //password empty
        else
        {
            ResetVdValue();
            ShowMsg('用户名和密码没填写完整!','login.php',0,1000);
			exit;
        }
    }
}

include('templets/login.htm');