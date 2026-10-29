<?php
declare(strict_types=1);
$uri = rawurldecode((string)parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH));
if (preg_match('#^/admin/(?:storage|includes|bin)(?:/|$)#i', $uri) || preg_match('#(?:^|/)\.#', $uri) || preg_match('#\.(?:jsonl|lock|rollback)$#i', $uri)) {
    http_response_code(403); echo 'Forbidden'; return true;
}
$root = realpath(dirname(__DIR__));
$publicData = getenv('AMJAD_PUBLIC_DATA_DIR') ?: '';
$uploadDirectory = getenv('AMJAD_UPLOAD_DIR') ?: '';
if (preg_match('#^/data/cms/([a-z]+\.json)$#', $uri, $match) && $publicData !== '') {
    $file = realpath(rtrim($publicData, '/\\') . DIRECTORY_SEPARATOR . $match[1]);
    $base = realpath($publicData);
    if ($file && $base && strpos($file, $base . DIRECTORY_SEPARATOR) === 0 && is_file($file)) {
        header('Content-Type: application/json; charset=utf-8'); readfile($file); return true;
    }
    http_response_code(404); echo 'Not found'; return true;
}
if (preg_match('#^/images/uploads/(.+)$#', $uri, $match) && $uploadDirectory !== '') {
    $file = realpath(rtrim($uploadDirectory, '/\\') . DIRECTORY_SEPARATOR . str_replace('/', DIRECTORY_SEPARATOR, $match[1]));
    $base = realpath($uploadDirectory);
    if ($file && $base && strpos($file, $base . DIRECTORY_SEPARATOR) === 0 && is_file($file)) {
        header('Content-Type: ' . (mime_content_type($file) ?: 'application/octet-stream')); readfile($file); return true;
    }
    http_response_code(404); echo 'Not found'; return true;
}
$candidate = realpath($root . str_replace('/', DIRECTORY_SEPARATOR, $uri));
if ($candidate && strpos($candidate, $root) === 0 && is_file($candidate)) return false;
if ($candidate && is_dir($candidate) && is_file($candidate . DIRECTORY_SEPARATOR . 'index.php')) { require $candidate . DIRECTORY_SEPARATOR . 'index.php'; return true; }
http_response_code(404); echo 'Not found'; return true;
