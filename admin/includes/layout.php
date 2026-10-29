<?php
declare(strict_types=1);

function admin_navigation(): array
{
    return array(
        'dashboard.php' => array('الرئيسية', 'fa-house'),
        'hero.php' => array('الواجهة الرئيسية', 'fa-wand-magic-sparkles'),
        'programs.php' => array('البرامج', 'fa-diagram-project'),
        'news.php' => array('الأخبار', 'fa-newspaper'),
        'gallery.php' => array('مجلة الصور', 'fa-images'),
        'media.php' => array('مكتبة الوسائط', 'fa-photo-film'),
        'president.php' => array('كلمة الرئيس', 'fa-quote-right'),
        'contact.php' => array('الاتصال', 'fa-address-book'),
        'revisions.php' => array('النسخ السابقة', 'fa-clock-rotate-left'),
        'settings.php' => array('الإعدادات', 'fa-gear'),
    );
}

function status_text(string $status): string
{
    return array('draft' => 'مسودة', 'published' => 'منشور', 'archived' => 'مؤرشف')[$status] ?? 'غير محدد';
}

function admin_header(string $title, string $subtitle = ''): void
{
    $current = basename((string)($_SERVER['PHP_SELF'] ?? 'dashboard.php'));
    $flash = take_flash();
    ?><!doctype html>
<html lang="ar" dir="rtl">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title><?= e($title) ?> — <?= e(AMJAD_SITE_NAME) ?></title>
    <link rel="stylesheet" href="assets/admin.css">
</head>
<body>
<a class="skip-link" href="#main-content">تجاوز إلى المحتوى</a>
<div class="admin-shell">
    <aside class="sidebar" id="admin-sidebar" aria-label="التنقل الرئيسي">
        <div class="brand">
            <img src="../images/logoamjad.png" alt="شعار جمعية أمجاد">
            <div><strong>إدارة أمجاد</strong><span>المحتوى والوسائط</span></div>
        </div>
        <nav>
            <?php foreach (admin_navigation() as $file => $item): ?>
                <a href="<?= e($file) ?>" class="<?= $current === $file ? 'is-active' : '' ?>" <?= $current === $file ? 'aria-current="page"' : '' ?>>
                    <i class="fa-solid <?= e($item[1]) ?>" aria-hidden="true"></i><span><?= e($item[0]) ?></span>
                </a>
            <?php endforeach; ?>
        </nav>
        <div class="sidebar-footer">
            <a href="../index.html" target="_blank" rel="noopener"><i class="fa-solid fa-arrow-up-right-from-square" aria-hidden="true"></i><span>معاينة الموقع</span></a>
            <form method="post" action="logout.php">
                <?= csrf_field() ?>
                <button type="submit"><i class="fa-solid fa-right-from-bracket" aria-hidden="true"></i><span>تسجيل الخروج</span></button>
            </form>
        </div>
    </aside>
    <div class="admin-workspace">
        <header class="topbar">
            <button class="menu-toggle" type="button" aria-controls="admin-sidebar" aria-expanded="false"><span class="sr-only">فتح القائمة</span><i class="fa-solid fa-bars" aria-hidden="true"></i></button>
            <div class="page-heading"><p>جمعية أمجاد للتربية والأعمال الاجتماعية</p><h1><?= e($title) ?></h1><?php if ($subtitle !== ''): ?><span><?= e($subtitle) ?></span><?php endif; ?></div>
            <?php $identityName = (string)($_SESSION['admin_username'] ?? 'أ'); $identityInitial = function_exists('mb_substr') ? mb_substr($identityName, 0, 1) : substr($identityName, 0, 1); ?>
            <div class="admin-identity"><span class="admin-avatar" aria-hidden="true"><?= e($identityInitial) ?></span><div><strong><?= e($identityName) ?></strong><small>مدير المحتوى</small></div></div>
        </header>
        <main class="main-content" id="main-content" tabindex="-1">
            <?php if ($flash): ?><div class="alert alert--<?= e($flash['type'] === 'error' ? 'error' : 'success') ?>" role="status"><?= e($flash['message']) ?></div><?php endif; ?>
<?php
}

function admin_footer(): void
{
    ?>
        </main>
        <footer class="admin-footer">محتوى خاص بإدارة جمعية أمجاد — لا تُنشر المسودات في الواجهة العامة.</footer>
    </div>
</div>
<script src="assets/admin.js"></script>
</body>
</html><?php
}
