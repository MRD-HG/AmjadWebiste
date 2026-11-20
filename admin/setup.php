<?php
declare(strict_types=1);

/*
 * One-time web setup for shared hosting without SSH (cPanel / NindoHost).
 * Works only while NO administrator exists AND a setup token of 16+ characters is
 * defined in the private config file (AMJAD_SETUP_TOKEN). After the account is
 * created this page refuses to run again; remove the token from the config file.
 */
require_once __DIR__ . '/includes/bootstrap.php';

if (credential_configured()) {
    set_flash('success', 'حساب المدير مُعدّ مسبقاً. سجّل الدخول.');
    redirect_to('login.php');
}

$setupToken = (string)amjad_env('AMJAD_SETUP_TOKEN', '');
$tokenReady = strlen($setupToken) >= 16;
$error = '';

function setup_inside_document_root(string $path): bool
{
    $root = realpath(AMJAD_ROOT);
    $target = realpath($path) ?: $path;
    return $root !== false && strpos(str_replace('\\', '/', $target) . '/', str_replace('\\', '/', $root) . '/') === 0;
}

function setup_checks(): array
{
    $storageWritable = false;
    try {
        initialize_storage_directories();
        ensure_private_directory(AMJAD_STORAGE_DIR . '/evaluations/responses');
        $probe = AMJAD_STORAGE_DIR . '/evaluations/.write-test';
        $storageWritable = @file_put_contents($probe, 'ok') !== false;
        @unlink($probe);
    } catch (Throwable $error) {
        $storageWritable = false;
    }
    $outside = !setup_inside_document_root(AMJAD_STORAGE_DIR);
    return array(
        array('label' => 'إصدار PHP 8.2 أو أحدث (الحالي ' . PHP_VERSION . ')', 'ok' => version_compare(PHP_VERSION, '8.2.0', '>='), 'required' => true),
        array('label' => 'امتدادات json و session و fileinfo', 'ok' => extension_loaded('json') && extension_loaded('session') && extension_loaded('fileinfo'), 'required' => true),
        array('label' => 'مجلد حفظ الإجابات قابل للكتابة', 'ok' => $storageWritable, 'required' => true),
        array('label' => $outside ? 'مجلد التخزين خارج public_html (موصى به)' : 'مجلد التخزين داخل الموقع ومحمي بـ .htaccess — يُفضّل نقله خارج public_html', 'ok' => $outside, 'required' => false),
    );
}

$checks = setup_checks();
$blocking = array_filter($checks, static fn(array $check): bool => $check['required'] && !$check['ok']);

if ($tokenReady && !$blocking && ($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'POST') {
    verify_csrf_or_fail();
    $key = hash('sha256', 'setup|' . (string)($_SERVER['REMOTE_ADDR'] ?? 'unknown'));
    if (throttle_status($key)['locked']) {
        $error = 'محاولات كثيرة. حاول بعد 15 دقيقة.';
    } elseif (!hash_equals($setupToken, (string)($_POST['setup_token'] ?? ''))) {
        record_failed_login($key);
        usleep(random_int(150000, 350000));
        $error = 'رمز الإعداد غير صحيح.';
    } elseif (!hash_equals((string)($_POST['password'] ?? ''), (string)($_POST['password_confirm'] ?? ''))) {
        $error = 'كلمتا المرور غير متطابقتين.';
    } else {
        try {
            save_admin_credentials(request_value('username'), (string)($_POST['password'] ?? ''));
            foreach (allowed_collections() as $collection) {
                $projection = AMJAD_PUBLIC_DATA_DIR . '/' . $collection . '.json';
                if (!is_file($projection)) write_public_projection($collection, default_collection_document($collection));
            }
            clear_login_throttle($key);
            audit_event('setup_web', 'auth');
            set_flash('success', 'تم إنشاء حساب المدير. احذف AMJAD_SETUP_TOKEN من ملف الإعداد الخاص ثم سجّل الدخول.');
            redirect_to('login.php');
        } catch (Throwable $exception) {
            $error = $exception instanceof InvalidArgumentException ? $exception->getMessage() : 'تعذر حفظ الحساب. تحقق من صلاحيات مجلد التخزين.';
        }
    }
}
?><!doctype html>
<html lang="ar" dir="rtl">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="robots" content="noindex, nofollow">
    <title>الإعداد الأول — <?= e(AMJAD_SITE_NAME) ?></title>
    <link rel="stylesheet" href="assets/admin.css">
</head>
<body class="login-page">
<main class="login-card">
    <div class="login-brand"><img src="../images/logoamjad.png" alt="شعار جمعية أمجاد"><div><h1>الإعداد الأول</h1><p>إنشاء حساب المدير لمتابعة إجابات التقييم</p></div></div>

    <ul class="setup-checks" aria-label="فحص الاستضافة">
        <?php foreach ($checks as $check): $class = $check['ok'] ? 'setup-ok' : ($check['required'] ? 'setup-bad' : 'setup-warn'); ?>
            <li class="<?= $class ?>"><b><?= $check['ok'] ? '✓' : ($check['required'] ? '✗' : '!') ?></b><span><?= e($check['label']) ?></span></li>
        <?php endforeach; ?>
    </ul>
    <p class="setup-path">Storage: <?= e(AMJAD_STORAGE_DIR) ?></p>

    <?php if ($error !== ''): ?><div class="alert alert--error" role="alert"><?= e($error) ?></div><?php endif; ?>

    <?php if ($blocking): ?>
        <div class="alert alert--error" role="alert">أصلح العناصر المعلّمة بـ ✗ أولاً (اختيار إصدار PHP من cPanel ← Select PHP Version، أو صلاحيات مجلد التخزين).</div>
    <?php elseif (!$tokenReady): ?>
        <div class="alert alert--error" role="alert">الإعداد مقفل. أضف <code>AMJAD_SETUP_TOKEN</code> (16 حرفاً على الأقل) إلى ملف <code>amjad-config.php</code> خارج public_html ثم أعد تحميل الصفحة. راجع NINDOHOST_DEPLOYMENT.md.</div>
    <?php else: ?>
        <form method="post" autocomplete="off">
            <?= csrf_field() ?>
            <div class="field"><label for="setup_token">رمز الإعداد (من ملف amjad-config.php)</label><input id="setup_token" name="setup_token" type="password" required></div>
            <div class="field"><label for="username">اسم المستخدم</label><input id="username" name="username" type="text" minlength="3" maxlength="80" autocomplete="username" required></div>
            <div class="field"><label for="password">كلمة المرور (12 حرفاً على الأقل)</label><input id="password" name="password" type="password" minlength="12" autocomplete="new-password" required></div>
            <div class="field"><label for="password_confirm">تأكيد كلمة المرور</label><input id="password_confirm" name="password_confirm" type="password" minlength="12" autocomplete="new-password" required></div>
            <div class="form-actions"><button class="btn" type="submit">إنشاء الحساب</button></div>
        </form>
    <?php endif; ?>
</main>
</body>
</html>
