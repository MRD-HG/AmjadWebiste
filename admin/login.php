<?php
declare(strict_types=1);
require_once __DIR__ . '/includes/bootstrap.php';

if (session_is_valid()) {
    redirect_to('dashboard.php');
}

$error = '';
$flash = take_flash();
if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'POST') {
    verify_csrf_or_fail();
    $result = login_admin(request_value('username'), (string)($_POST['password'] ?? ''));
    if ($result['ok']) {
        redirect_to('dashboard.php');
    }
    $error = (string)$result['message'];
}
$configured = credential_configured();
?><!doctype html>
<html lang="ar" dir="rtl">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>تسجيل الدخول — <?= e(AMJAD_SITE_NAME) ?></title>
    <link rel="stylesheet" href="assets/admin.css">
</head>
<body class="login-page">
<main class="login-card">
    <div class="login-brand"><img src="../images/logoamjad.png" alt="شعار جمعية أمجاد"><div><h1>لوحة إدارة أمجاد</h1><p>إدارة المحتوى والوسائط بأمان</p></div></div>
    <?php if ($flash): ?><div class="alert alert--<?= e($flash['type'] === 'error' ? 'error' : 'success') ?>" role="status"><?= e($flash['message']) ?></div><?php endif; ?>
    <?php if ($error !== ''): ?><div class="alert alert--error" role="alert"><?= e($error) ?></div><?php endif; ?>
    <?php if (!$configured): ?><div class="alert alert--error" role="alert">لم يتم إعداد حساب المدير بعد. شغّل أمر الإعداد المحلي الموضح في CMS_SETUP.md أو استخدم متغيرات البيئة الآمنة.</div><?php endif; ?>
    <form method="post" autocomplete="on">
        <?= csrf_field() ?>
        <div class="field"><label for="username">اسم المستخدم</label><input id="username" name="username" type="text" autocomplete="username" required autofocus></div>
        <div class="field"><label for="password">كلمة المرور</label><input id="password" name="password" type="password" autocomplete="current-password" required></div>
        <div class="form-actions"><button class="btn" type="submit" <?= !$configured ? 'disabled' : '' ?>>دخول آمن</button><a class="btn btn--secondary" href="../index.html">العودة للموقع</a></div>
    </form>
</main>
</body>
</html>
