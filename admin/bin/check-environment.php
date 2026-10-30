<?php
declare(strict_types=1);

if (PHP_SAPI !== 'cli') { http_response_code(404); exit; }
require_once dirname(__DIR__) . '/includes/config.php';

$checks = array();
$add = static function (string $name, bool $ok, string $detail, bool $required = true) use (&$checks): void {
    $checks[] = array('name' => $name, 'ok' => $ok, 'detail' => $detail, 'required' => $required);
};
$writableTarget = static function (string $path): bool {
    $probe = $path;
    while (!file_exists($probe) && dirname($probe) !== $probe) $probe = dirname($probe);
    return is_dir($probe) && is_writable($probe);
};

$add('PHP version', version_compare(PHP_VERSION, '8.2.0', '>='), PHP_VERSION . ' (required: 8.2+)');
foreach (array('json', 'session', 'fileinfo') as $extension) $add('Extension ' . $extension, extension_loaded($extension), extension_loaded($extension) ? 'loaded' : 'missing');
foreach (array('password_hash', 'random_bytes', 'getimagesize', 'mime_content_type') as $function) $add('Function ' . $function, function_exists($function), function_exists($function) ? 'available' : 'missing');
$add('Extension gd', extension_loaded('gd'), extension_loaded('gd') ? 'loaded' : 'optional; image metadata works without it', false);
foreach (array('private storage' => AMJAD_STORAGE_DIR, 'public projections' => AMJAD_PUBLIC_DATA_DIR, 'uploads' => AMJAD_UPLOAD_DIR) as $label => $path) $add('Writable ' . $label, $writableTarget($path), $path);

$failed = false;
foreach ($checks as $check) {
    $status = $check['ok'] ? 'PASS' : ($check['required'] ? 'FAIL' : 'WARN');
    fwrite(STDOUT, sprintf("[%s] %s: %s\n", $status, $check['name'], $check['detail']));
    if (!$check['ok'] && $check['required']) $failed = true;
}
fwrite(STDOUT, $failed ? "Environment is not ready.\n" : "Environment is ready.\n");
exit($failed ? 1 : 0);
