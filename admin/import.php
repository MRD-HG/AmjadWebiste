<?php
declare(strict_types=1);

require_once __DIR__ . '/includes/bootstrap.php';
require_login();
require_once __DIR__ . '/includes/layout.php';

$error = '';
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    try {
        verify_csrf();
        $selected = isset($_POST['selected']) && is_array($_POST['selected']) ? array_map('strval', $_POST['selected']) : array();
        $result = frontend_import_apply($selected);
        set_flash('success', 'اكتمل الاستيراد كمسودات. أضيف ' . (int)$result['counts']['added'] . ' عنصر، دون الكتابة فوق أي سجل موجود.');
        redirect_to('import.php?run=' . rawurlencode((string)$result['run_id']));
    } catch (Throwable $exception) {
        $error = $exception instanceof ContentConflictException ? $exception->getMessage() : 'تعذر الاستيراد: ' . $exception->getMessage();
    }
}

$analysis = frontend_import_analysis();
$labels = array('media'=>'الوسائط','pages'=>'الصفحات الرئيسية','sections'=>'حقول الصفحات','programs'=>'البرامج','news'=>'الأخبار','products'=>'المنتجات','gallery'=>'الصور','memory'=>'الذاكرة');
$stateLabels = array('needs_import'=>'جاهز للاستيراد','already_imported'=>'مستورد سابقاً','conflict'=>'تعارض — لن يُستبدل');
admin_header('استيراد محتوى الموقع', 'مراجعة المحتوى القديم ثم استيراد العناصر المختارة كمسودات آمنة');
if ($error !== ''): ?><div class="alert alert--error" role="alert"><?= e($error) ?></div><?php endif; ?>

<section class="stats-grid" aria-label="ملخص الفحص">
    <article class="stat-card"><span>العناصر الموجودة</span><strong><?= (int)$analysis['counts']['found'] ?></strong><small>من ملفات الواجهة الحالية</small></article>
    <article class="stat-card"><span>جاهز للاستيراد</span><strong><?= (int)$analysis['counts']['needs_import'] ?></strong><small>لن يُنشر تلقائياً</small></article>
    <article class="stat-card"><span>مستورد سابقاً</span><strong><?= (int)$analysis['counts']['already_imported'] ?></strong><small>يحمي التكرار</small></article>
    <article class="stat-card"><span>تعارضات</span><strong><?= (int)$analysis['counts']['conflicts'] ?></strong><small>لا تتم الكتابة فوقها</small></article>
    <article class="stat-card"><span>تحتاج مراجعة</span><strong><?= (int)$analysis['counts']['verification_required'] ?></strong><small>تواريخ أو بيانات غير مكتملة</small></article>
</section>

<?php if ($analysis['warnings']): ?><div class="alert alert--error" role="alert"><?= e(implode(' — ', $analysis['warnings'])) ?></div><?php endif; ?>

<section class="panel">
    <div class="panel-header"><div><h2>معاينة الاستيراد</h2><p>كل عنصر يُحفظ كمسودة ولا يسيطر على الواجهة قبل أن تفتحه وتراجعه وتنشره بنفسك. تُنشأ نسخة احتياطية وتقرير قبل أي كتابة.</p><p>صور مفقودة: <?= (int)$analysis['counts']['missing_images'] ?> · سجلات بترجمات ناقصة: <?= (int)$analysis['counts']['missing_translations'] ?></p></div></div>
    <form method="post">
        <?= csrf_field() ?>
        <div class="table-wrap"><table class="data-table"><thead><tr><th><span class="sr-only">اختيار</span></th><th>المحتوى</th><th>الوحدة</th><th>الحالة</th><th>ملاحظات المراجعة</th></tr></thead><tbody>
        <?php foreach ($analysis['items'] as $item): $selectable = $item['state'] === 'needs_import'; ?>
            <tr>
                <td><?php if ($selectable): ?><input type="checkbox" name="selected[]" value="<?= e($item['key']) ?>" checked aria-label="استيراد <?= e($item['title']) ?>"><?php else: ?>—<?php endif; ?></td>
                <td><div class="row-title"><strong><?= e($item['title']) ?></strong><small><?= e($item['id']) ?></small></div></td>
                <td><?= e($labels[$item['collection']] ?? $item['collection']) ?></td>
                <td><span class="badge badge--<?= e($item['state']) ?>"><?= e($stateLabels[$item['state']] ?? $item['state']) ?></span></td>
                <td><?php if (!$item['missing_translations'] && !$item['verification']): ?>—<?php else: ?><ul class="import-notes"><?php if ($item['missing_translations']): ?><li>ترجمات ناقصة: <?= e(implode('، ', $item['missing_translations'])) ?></li><?php endif; ?><?php foreach ($item['verification'] as $note): ?><li><?= e($note) ?></li><?php endforeach; ?></ul><?php endif; ?></td>
            </tr>
        <?php endforeach; ?>
        </tbody></table></div>
        <div class="form-actions"><button class="btn" type="submit" <?= (int)$analysis['counts']['needs_import'] === 0 ? 'disabled' : '' ?>>استيراد العناصر المختارة كمسودات</button><a class="btn btn--secondary" href="import.php">إعادة الفحص</a></div>
    </form>
</section>
<?php admin_footer();
