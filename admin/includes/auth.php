<?php
declare(strict_types=1);

function start_secure_session(): void
{
    if (session_status() === PHP_SESSION_ACTIVE) {
        return;
    }
    ini_set('session.use_strict_mode', '1');
    ini_set('session.use_only_cookies', '1');
    ini_set('session.cookie_httponly', '1');
    ini_set('session.cookie_samesite', 'Strict');
    ini_set('session.cookie_secure', is_https_request() ? '1' : '0');
    ini_set('session.gc_maxlifetime', (string)AMJAD_SESSION_ABSOLUTE);
    session_name('AMJADADMINSESSID');
    session_set_cookie_params(array(
        'lifetime' => 0,
        'path' => '/admin',
        'secure' => is_https_request(),
        'httponly' => true,
        'samesite' => 'Strict',
    ));
    session_start();
}

function credential_configured(): bool
{
    $envUser = (string)amjad_env('AMJAD_ADMIN_USERNAME', '');
    $envHash = (string)amjad_env('AMJAD_ADMIN_PASSWORD_HASH', '');
    return ($envUser !== '' && $envHash !== '') || is_file(AMJAD_CREDENTIALS_FILE);
}

function read_admin_credentials(): ?array
{
    $envUser = (string)amjad_env('AMJAD_ADMIN_USERNAME', '');
    $envHash = (string)amjad_env('AMJAD_ADMIN_PASSWORD_HASH', '');
    if ($envUser !== '' && $envHash !== '') {
        return array('username' => $envUser, 'password_hash' => $envHash, 'source' => 'environment');
    }
    if (!is_file(AMJAD_CREDENTIALS_FILE)) {
        return null;
    }
    $decoded = json_decode((string)file_get_contents(AMJAD_CREDENTIALS_FILE), true);
    if (!is_array($decoded) || empty($decoded['username']) || empty($decoded['password_hash'])) {
        return null;
    }
    return array('username' => (string)$decoded['username'], 'password_hash' => (string)$decoded['password_hash'], 'source' => 'file');
}

function save_admin_credentials(string $username, string $password): void
{
    $usernameLength = function_exists('mb_strlen') ? mb_strlen($username) : strlen($username);
    if ($usernameLength < 3 || $usernameLength > 80) {
        throw new InvalidArgumentException('اسم المستخدم يجب أن يكون بين 3 و80 حرفاً.');
    }
    if (strlen($password) < 12) {
        throw new InvalidArgumentException('كلمة المرور يجب أن تتكون من 12 حرفاً على الأقل.');
    }
    initialize_storage_directories();
    $payload = array(
        'username' => $username,
        'password_hash' => password_hash($password, PASSWORD_DEFAULT),
        'updated_at' => date(DATE_ATOM),
    );
    atomic_write_file(AMJAD_CREDENTIALS_FILE, encode_json($payload), 0600);
}

function request_identity_key(string $username): string
{
    $ip = (string)($_SERVER['REMOTE_ADDR'] ?? 'unknown');
    return hash('sha256', 'login|' . $ip);
}

function throttle_file(string $key): string
{
    return AMJAD_THROTTLE_DIR . '/' . preg_replace('/[^a-f0-9]/', '', $key) . '.json';
}

function read_login_throttle(string $key): array
{
    initialize_storage_directories();
    $path = throttle_file($key);
    if (!is_file($path)) {
        return array('attempts' => array(), 'locked_until' => 0);
    }
    $data = json_decode((string)file_get_contents($path), true);
    return is_array($data) ? $data : array('attempts' => array(), 'locked_until' => 0);
}

function throttle_status(string $key): array
{
    $now = time();
    $data = read_login_throttle($key);
    $attempts = array_values(array_filter((array)($data['attempts'] ?? array()), static function ($timestamp) use ($now): bool {
        return (int)$timestamp >= $now - AMJAD_LOGIN_WINDOW;
    }));
    $lockedUntil = (int)($data['locked_until'] ?? 0);
    return array('attempts' => $attempts, 'locked_until' => $lockedUntil, 'locked' => $lockedUntil > $now);
}

function record_failed_login(string $key): void
{
    $status = throttle_status($key);
    $status['attempts'][] = time();
    if (count($status['attempts']) >= AMJAD_LOGIN_MAX_ATTEMPTS) {
        $status['locked_until'] = time() + AMJAD_LOGIN_LOCKOUT;
    }
    unset($status['locked']);
    atomic_write_file(throttle_file($key), encode_json($status), 0600);
}

function clear_login_throttle(string $key): void
{
    $path = throttle_file($key);
    if (is_file($path)) {
        @unlink($path);
    }
}

function login_admin(string $username, string $password): array
{
    $key = request_identity_key($username);
    $throttle = throttle_status($key);
    if ($throttle['locked']) {
        return array('ok' => false, 'message' => 'تعذر تسجيل الدخول حالياً. حاول لاحقاً.');
    }
    $credentials = read_admin_credentials();
    $usernameMatches = $credentials !== null && hash_equals((string)$credentials['username'], $username);
    $passwordMatches = $credentials !== null && password_verify($password, (string)$credentials['password_hash']);
    if (!$usernameMatches || !$passwordMatches) {
        record_failed_login($key);
        usleep(random_int(150000, 350000));
        return array('ok' => false, 'message' => 'اسم المستخدم أو كلمة المرور غير صحيحة.');
    }
    clear_login_throttle($key);
    session_regenerate_id(true);
    $_SESSION['admin_authenticated'] = true;
    $_SESSION['admin_username'] = (string)$credentials['username'];
    $_SESSION['auth_started_at'] = time();
    $_SESSION['last_activity_at'] = time();
    $_SESSION['last_regenerated_at'] = time();
    $_SESSION['user_agent_hash'] = hash('sha256', (string)($_SERVER['HTTP_USER_AGENT'] ?? ''));
    $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
    audit_event('login', 'auth');
    return array('ok' => true, 'message' => '');
}

function session_is_valid(): bool
{
    if (empty($_SESSION['admin_authenticated'])) {
        return false;
    }
    $now = time();
    $started = (int)($_SESSION['auth_started_at'] ?? 0);
    $last = (int)($_SESSION['last_activity_at'] ?? 0);
    $agent = hash('sha256', (string)($_SERVER['HTTP_USER_AGENT'] ?? ''));
    if ($started === 0 || $last === 0 || $now - $last > AMJAD_SESSION_IDLE || $now - $started > AMJAD_SESSION_ABSOLUTE || !hash_equals((string)($_SESSION['user_agent_hash'] ?? ''), $agent)) {
        logout_admin(false);
        return false;
    }
    if ($now - (int)($_SESSION['last_regenerated_at'] ?? 0) >= AMJAD_SESSION_REGENERATE) {
        session_regenerate_id(true);
        $_SESSION['last_regenerated_at'] = $now;
    }
    $_SESSION['last_activity_at'] = $now;
    return true;
}

function require_login(): void
{
    if (!session_is_valid()) {
        if (session_status() !== PHP_SESSION_ACTIVE) {
            start_secure_session();
        }
        set_flash('error', 'انتهت الجلسة أو يلزم تسجيل الدخول.');
        redirect_to('login.php');
    }
}

function logout_admin(bool $audit = true): void
{
    if ($audit && !empty($_SESSION['admin_authenticated'])) {
        audit_event('logout', 'auth');
    }
    $_SESSION = array();
    if (ini_get('session.use_cookies')) {
        $parameters = session_get_cookie_params();
        setcookie(session_name(), '', time() - 42000, $parameters['path'], $parameters['domain'], (bool)$parameters['secure'], (bool)$parameters['httponly']);
    }
    if (session_status() === PHP_SESSION_ACTIVE) {
        session_destroy();
    }
}
