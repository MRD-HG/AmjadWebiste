<?php
declare(strict_types=1);
require_once __DIR__ . '/includes/bootstrap.php';

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'POST') {
    http_response_code(405);
    header('Allow: POST');
    exit('Method Not Allowed');
}
verify_csrf_or_fail();
logout_admin();
start_secure_session();
set_flash('success', 'تم تسجيل الخروج بأمان.');
redirect_to('login.php');
