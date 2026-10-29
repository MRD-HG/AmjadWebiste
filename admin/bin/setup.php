<?php
declare(strict_types=1);

if (PHP_SAPI !== 'cli') {
    http_response_code(404);
    exit;
}
require_once dirname(__DIR__) . '/includes/bootstrap.php';

if (credential_configured() && !in_array('--force', $argv, true)) {
    fwrite(STDERR, "A CMS administrator is already configured. Use --force only when intentionally rotating it.\n");
    exit(1);
}

function setup_prompt(string $label): string
{
    fwrite(STDOUT, $label);
    $value = fgets(STDIN);
    return trim($value === false ? '' : $value);
}

$username = (string)amjad_env('AMJAD_SETUP_USERNAME', '');
$password = (string)amjad_env('AMJAD_SETUP_PASSWORD', '');
if ($username === '') $username = setup_prompt('Administrator username: ');
if ($password === '') {
    fwrite(STDOUT, "Password input may be visible in this terminal. Use AMJAD_SETUP_PASSWORD for protected automation.\n");
    $password = setup_prompt('Administrator password (12+ characters): ');
    $confirm = setup_prompt('Confirm password: ');
    if (!hash_equals($password, $confirm)) {
        fwrite(STDERR, "Passwords do not match.\n");
        exit(1);
    }
}
try {
    save_admin_credentials($username, $password);
    foreach (allowed_collections() as $collection) {
        $projection = AMJAD_PUBLIC_DATA_DIR . '/' . $collection . '.json';
        if (!is_file($projection)) write_public_projection($collection, default_collection_document($collection));
    }
    fwrite(STDOUT, "CMS administrator configured in private storage.\n");
} catch (Throwable $error) {
    fwrite(STDERR, 'Setup failed: ' . $error->getMessage() . "\n");
    exit(1);
}
