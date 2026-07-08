<?php
// 简易点击计数器
$file = isset($_GET['file']) ? $_GET['file'] : 'default';
$file = preg_replace('/[^a-zA-Z0-9_-]/', '', $file);

$dir = __DIR__;
$countFile = $dir . '/count_' . $file . '.txt';

if (!file_exists($countFile)) {
    file_put_contents($countFile, '0');
}

$count = (int)file_get_contents($countFile);
$count++;
file_put_contents($countFile, (string)$count);

header('Content-Type: text/plain; charset=utf-8');
echo $count;