<?php
declare(strict_types=1);

if (!function_exists('amjad_env')) {
    function amjad_env(string $key, $default = null)
    {
        $value = getenv($key);
        return ($value === false || $value === '') ? $default : $value;
    }
}

define('AMJAD_ROOT', dirname(__DIR__, 2));
define('AMJAD_ADMIN_DIR', dirname(__DIR__));
define('AMJAD_STORAGE_DIR', (string)amjad_env('AMJAD_STORAGE_DIR', AMJAD_ADMIN_DIR . '/storage'));
define('AMJAD_CONTENT_DIR', AMJAD_STORAGE_DIR . '/content');
define('AMJAD_REVISION_DIR', AMJAD_STORAGE_DIR . '/revisions');
define('AMJAD_IMPORT_DIR', AMJAD_STORAGE_DIR . '/imports');
define('AMJAD_LOCK_DIR', AMJAD_STORAGE_DIR . '/locks');
define('AMJAD_THROTTLE_DIR', AMJAD_STORAGE_DIR . '/throttle');
define('AMJAD_CREDENTIALS_FILE', AMJAD_STORAGE_DIR . '/credentials.json');
define('AMJAD_PUBLIC_DATA_DIR', (string)amjad_env('AMJAD_PUBLIC_DATA_DIR', AMJAD_ROOT . '/data/cms'));
define('AMJAD_UPLOAD_DIR', (string)amjad_env('AMJAD_UPLOAD_DIR', AMJAD_ROOT . '/images/uploads'));
define('AMJAD_UPLOAD_URL', (string)amjad_env('AMJAD_UPLOAD_URL', '/images/uploads'));
define('AMJAD_MAX_UPLOAD_SIZE', (int)amjad_env('AMJAD_MAX_UPLOAD_SIZE', 5 * 1024 * 1024));
define('AMJAD_MAX_IMAGE_PIXELS', (int)amjad_env('AMJAD_MAX_IMAGE_PIXELS', 40000000));
define('AMJAD_SESSION_IDLE', (int)amjad_env('AMJAD_SESSION_IDLE', 1800));
define('AMJAD_SESSION_ABSOLUTE', (int)amjad_env('AMJAD_SESSION_ABSOLUTE', 28800));
define('AMJAD_SESSION_REGENERATE', (int)amjad_env('AMJAD_SESSION_REGENERATE', 900));
define('AMJAD_LOGIN_MAX_ATTEMPTS', (int)amjad_env('AMJAD_LOGIN_MAX_ATTEMPTS', 5));
define('AMJAD_LOGIN_WINDOW', (int)amjad_env('AMJAD_LOGIN_WINDOW', 900));
define('AMJAD_LOGIN_LOCKOUT', (int)amjad_env('AMJAD_LOGIN_LOCKOUT', 900));
define('AMJAD_SITE_NAME', 'لوحة إدارة جمعية أمجاد');
define('AMJAD_SCHEMA_VERSION', 1);

date_default_timezone_set('Africa/Casablanca');
