<?php
declare(strict_types=1);

if (!function_exists('amjad_private_config')) {
    /**
     * Optional private configuration file for shared hosting (cPanel/NindoHost) where
     * environment variables cannot be set. Default location is one level ABOVE the
     * document root, e.g. /home/USER/amjad-config.php next to public_html, so it is
     * never reachable from the web. Override with the AMJAD_CONFIG_FILE env variable.
     */
    function amjad_private_config(): array
    {
        static $config;
        if (is_array($config)) {
            return $config;
        }
        $config = array();
        $path = getenv('AMJAD_CONFIG_FILE');
        if ($path === false || $path === '') {
            $path = dirname(__DIR__, 3) . '/amjad-config.php';
        }
        if (is_file($path) && is_readable($path)) {
            $loaded = (static function (string $file) {
                return require $file;
            })($path);
            if (is_array($loaded)) {
                $config = $loaded;
            }
        }
        return $config;
    }
}

if (!function_exists('amjad_env')) {
    function amjad_env(string $key, $default = null)
    {
        $candidates = array(getenv($key), $_SERVER[$key] ?? false, $_SERVER['REDIRECT_' . $key] ?? false);
        foreach ($candidates as $value) {
            if ($value !== false && $value !== null && $value !== '') {
                return $value;
            }
        }
        $config = amjad_private_config();
        if (array_key_exists($key, $config) && $config[$key] !== '' && $config[$key] !== null) {
            return $config[$key];
        }
        return $default;
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
