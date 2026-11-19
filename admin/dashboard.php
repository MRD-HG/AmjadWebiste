<?php
declare(strict_types=1);
require_once __DIR__ . '/includes/bootstrap.php';
require_login();
require_once __DIR__ . '/includes/layout.php';

$news = read_collection('news');
$programs = read_collection('programs');
$gallery = read_collection('gallery');
$media = read_collection('media');
$countStatus = static function (array $items, string $status): int {
    return count(array_filter($items, static function ($item) use ($status): bool { return ($item['status'] ?? '') === $status; }));
};
$updated = array_filter(array(
    $news['_meta']['updated_at'] ?? null,
    $programs['_meta']['updated_at'] ?? null,
    $gallery['_meta']['updated_at'] ?? null,
    $media['_meta']['updated_at'] ?? null,
));
rsort($updated);
$events = recent_audit_events(8);

admin_header('لوحة التحكم', 'نظرة واقعية على المحتوى المسجل في النظام');
?>
<section class="stats-grid" aria-label="ملخص المحتوى">
    <article class="stat-card"><span>الأخبار المنشورة</span><strong><?= $countStatus($news['items'], 'published') ?></strong><small><?= $countStatus($news['items'], 'draft') ?> مسودة</small></article>
    <article class="stat-card"><span>إجمالي البرامج</span><strong><?= count($programs['items']) ?></strong><small><?= $countStatus($programs['items'], 'published') ?> منشور</small></article>
    <article class="stat-card"><span>صور المجلة</span><strong><?= count($gallery['items']) ?></strong><small><?= $countStatus($gallery['items'], 'draft') ?> مسودة</small></article>
    <article class="stat-card"><span>مكتبة الوسائط</span><strong><?= count($media['items']) ?></strong><small><?= $countStatus($media['items'], 'archived') ?> مؤرشف</small></article>
    <article class="stat-card"><span>آخر تحديث</span><strong><?= $updated ? e(date('d/m', strtotime((string)$updated[0]))) : '—' ?></strong><small><?= $updated ? e(date('H:i', strtotime((string)$updated[0]))) : 'لا توجد تعديلات' ?></small></article>
</section>

<section class="panel">
    <div class="panel-header"><div><h2>إجراءات سريعة</h2><p>ابدأ بمهمة تحرير واضحة دون التأثير على الموقع العام.</p></div></div>
    <div class="row-actions"><a class="btn" href="news.php?action=new">إضافة خبر</a><a class="btn" href="programs.php?action=new">إضافة برنامج</a><a class="btn btn--gold" href="media.php?action=upload">رفع صورة</a><a class="btn btn--secondary" href="revisions.php">استعادة نسخة</a></div>
</section>

<section class="panel">
    <div class="panel-header"><div><h2>آخر التعديلات</h2><p>سجل إداري محلي لا يتضمن كلمات مرور أو قيم نماذج حساسة.</p></div></div>
    <?php if (!$events): ?><div class="empty-state">لا توجد تعديلات مسجلة بعد.</div><?php else: ?>
    <ul class="activity-list">
        <?php foreach ($events as $event): ?><li><span class="activity-dot"></span><div><strong><?= e((string)($event['action'] ?? 'تعديل')) ?> — <?= e((string)($event['collection'] ?? '')) ?></strong><small><?= e((string)($event['item_id'] ?? '')) ?></small></div><small><?= e(date('d/m/Y H:i', strtotime((string)($event['at'] ?? 'now')))) ?></small></li><?php endforeach; ?>
    </ul><?php endif; ?>
</section>
<?php admin_footer(); ?>
