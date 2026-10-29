<?php
declare(strict_types=1);

function e($value): string
{
    return htmlspecialchars((string)$value, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
}

function request_value(string $key, string $default = ''): string
{
    $value = $_POST[$key] ?? $_GET[$key] ?? $default;
    return is_scalar($value) ? trim((string)$value) : $default;
}

function is_https_request(): bool
{
    if (!empty($_SERVER['HTTPS']) && strtolower((string)$_SERVER['HTTPS']) !== 'off') {
        return true;
    }
    return isset($_SERVER['HTTP_X_FORWARDED_PROTO']) && strtolower((string)$_SERVER['HTTP_X_FORWARDED_PROTO']) === 'https';
}

function send_admin_security_headers(): void
{
    if (headers_sent()) {
        return;
    }
    header('X-Content-Type-Options: nosniff');
    header('X-Frame-Options: DENY');
    header('Referrer-Policy: no-referrer');
    header('Permissions-Policy: camera=(), microphone=(), geolocation=()');
    header("Content-Security-Policy: default-src 'self'; img-src 'self' data:; style-src 'self'; script-src 'self'; form-action 'self'; frame-ancestors 'none'; base-uri 'self'");
    header('Cache-Control: no-store, max-age=0');
}

function csrf_token(): string
{
    if (empty($_SESSION['csrf_token']) || !is_string($_SESSION['csrf_token'])) {
        $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
    }
    return $_SESSION['csrf_token'];
}

function csrf_field(): string
{
    return '<input type="hidden" name="csrf_token" value="' . e(csrf_token()) . '">';
}

function verify_csrf_or_fail(): void
{
    if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'POST') {
        return;
    }
    try {
        verify_csrf();
    } catch (RuntimeException $error) {
        http_response_code(403);
        exit('تعذر التحقق من الطلب. حدّث الصفحة وحاول مرة أخرى.');
    }
}

function verify_csrf(): void
{
    $provided = (string)($_POST['csrf_token'] ?? '');
    $expected = (string)($_SESSION['csrf_token'] ?? '');
    if ($provided === '' || $expected === '' || !hash_equals($expected, $provided)) {
        throw new RuntimeException('تعذر التحقق من الطلب. حدّث الصفحة وحاول مرة أخرى.');
    }
}

function redirect_to(string $path): void
{
    if ($path === '' || preg_match('#^(?:https?:)?//#i', $path) || strpos($path, "\r") !== false || strpos($path, "\n") !== false) {
        $path = 'dashboard.php';
    }
    header('Location: ' . $path);
    exit;
}

function set_flash(string $type, string $message): void
{
    $_SESSION['flash'] = array('type' => $type, 'message' => $message);
}

function take_flash(): ?array
{
    if (empty($_SESSION['flash']) || !is_array($_SESSION['flash'])) {
        return null;
    }
    $flash = $_SESSION['flash'];
    unset($_SESSION['flash']);
    return $flash;
}

function valid_status(string $status): bool
{
    return in_array($status, array('draft', 'published', 'archived'), true);
}

function validate_http_or_local_url(string $url, bool $allowEmpty = true): bool
{
    if ($url === '') {
        return $allowEmpty;
    }
    if ($url[0] === '/' || $url[0] === '#') {
        return strpos($url, "\r") === false && strpos($url, "\n") === false;
    }
    $parts = parse_url($url);
    return is_array($parts) && isset($parts['scheme']) && in_array(strtolower((string)$parts['scheme']), array('http', 'https'), true);
}
