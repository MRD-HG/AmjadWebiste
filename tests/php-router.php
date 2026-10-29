<?php
declare(strict_types=1);
$uri = rawurldecode((string)parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH));
if (preg_match('#^/admin/(?:storage|includes|bin)(?:/|$)#i', $uri) || preg_match('#(?:^|/)\.#', $uri) || preg_match('#\.(?:jsonl|lock|rollback)$#i', $uri)) {
    http_response_code(403); echo 'Forbidden'; return true;
}
$root = realpath(dirname(__DIR__));
$candidate = realpath($root . str_replace('/', DIRECTORY_SEPARATOR, $uri));
if ($candidate && strpos($candidate, $root) === 0 && is_file($candidate)) return false;
if ($candidate && is_dir($candidate) && is_file($candidate . DIRECTORY_SEPARATOR . 'index.php')) { require $candidate . DIRECTORY_SEPARATOR . 'index.php'; return true; }
http_response_code(404); echo 'Not found'; return true;
