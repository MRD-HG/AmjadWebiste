<?php
declare(strict_types=1);
require_once __DIR__ . '/includes/bootstrap.php';
if (session_is_valid()) {
    redirect_to('dashboard.php');
}
redirect_to('login.php');
