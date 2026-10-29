<?php
declare(strict_types=1);

require_once __DIR__ . '/bootstrap.php';
require_login();
require_once __DIR__ . '/layout.php';

$collection = (string)($collection ?? '');
$definition = collection_definition($collection);
$error = '';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    try {
        verify_csrf();
        $intent = request_value('intent', 'save');
        if ($intent === 'archive') {
            archive_content_item($collection, request_value('id'), (int)request_value('collection_revision'), (int)request_value('item_revision'));
            set_flash('success', 'تمت أرشفة السجل مع الاحتفاظ بتاريخه.');
        } else {
            save_content_item($collection, (int)request_value('collection_revision'), (int)request_value('item_revision'));
            set_flash('success', 'تم حفظ المحتوى بنجاح.');
        }
        redirect_to($collection . '.php');
    } catch (Throwable $exception) {
        $error = $exception instanceof ContentConflictException ? $exception->getMessage() : 'تعذر الحفظ: ' . $exception->getMessage();
    }
}

$document = read_collection($collection);
$action = request_value('action');
$editId = request_value('id');
$editing = $action === 'new' ? null : ($editId !== '' ? find_content_item($document['items'], $editId) : null);
$showForm = $action === 'new' || $editing !== null || ($_SERVER['REQUEST_METHOD'] === 'POST' && request_value('intent') !== 'archive');
$mediaItems = array_values(array_filter(read_collection('media')['items'], static function ($item): bool { return ($item['status'] ?? '') === 'published'; }));

if ($showForm) {
    $item = $editing ?: array(
        'id' => '', 'translations' => empty_translations($definition['translation_fields']), 'status' => 'draft',
        'order' => 0, 'image_id' => '', 'revision' => 0, 'family_id' => 'education', 'detail_view_id' => '',
        'category' => 'news', 'published_at' => date('Y-m-d'), 'page_ref' => 'index',
    );
    if ($_SERVER['REQUEST_METHOD'] === 'POST' && $error !== '') {
        $item = $editing ?: $item;
        $item['id'] = (string)($editing['id'] ?? request_value('stable_id'));
        $item['translations'] = translations_from_post($definition['translation_fields']);
        $item['status'] = request_value('save_status', request_value('status','draft'));
        $item['order'] = max(0,(int)request_value('order','0'));
        $item['image_id'] = request_value('image_id');
        if ($collection === 'programs') { $item['family_id']=request_value('family_id','education'); $item['detail_view_id']=request_value('detail_view_id'); }
        if ($collection === 'news') { $item['category']=request_value('category','news'); $item['published_at']=request_value('published_at'); }
        if ($collection === 'gallery') $item['page_ref']=request_value('page_ref','index');
        $item['revision'] = (int)request_value('item_revision');
    }
    admin_header(($editing ? 'تعديل ' : 'إضافة ') . $definition['singular'], 'حرّر العربية أولاً ثم أضف الترجمات الاختيارية');
    if ($error !== ''): ?><div class="alert alert--error" role="alert"><?= e($error) ?></div><?php endif; ?>
    <section class="panel">
        <form method="post" novalidate>
            <?= csrf_field() ?>
            <input type="hidden" name="intent" value="save">
            <input type="hidden" name="id" value="<?= e((string)$item['id']) ?>">
            <input type="hidden" name="collection_revision" value="<?= (int)$document['_meta']['revision'] ?>">
            <input type="hidden" name="item_revision" value="<?= (int)$item['revision'] ?>">
            <div class="form-grid">
                <div class="field"><label for="stable_id">المعرّف الثابت</label><input id="stable_id" name="stable_id" type="text" dir="ltr" value="<?= e((string)$item['id']) ?>" <?= $editing ? 'readonly' : '' ?> pattern="[a-z0-9-]{3,80}"><p class="field-help">لاتيني صغير وشرطات فقط. يبقى ثابتاً بعد الإنشاء.</p></div>
                <div class="field"><label for="status">الحالة</label><select id="status" name="status"><option value="draft" <?= $item['status'] === 'draft' ? 'selected' : '' ?>>مسودة</option><option value="published" <?= $item['status'] === 'published' ? 'selected' : '' ?>>منشور</option><option value="archived" <?= $item['status'] === 'archived' ? 'selected' : '' ?>>مؤرشف</option></select></div>
                <div class="field"><label for="order">الترتيب</label><input id="order" name="order" type="number" min="0" value="<?= (int)$item['order'] ?>"></div>
                <div class="field"><label for="image_id">الصورة</label><select id="image_id" name="image_id"><option value="">بدون صورة</option><?php foreach ($mediaItems as $media): ?><option value="<?= e((string)$media['id']) ?>" <?= $item['image_id'] === $media['id'] ? 'selected' : '' ?>><?= e(translated_value($media, 'alt')) ?></option><?php endforeach; ?></select><p class="field-help"><a href="media.php?action=upload">رفع صورة جديدة</a></p></div>
                <?php if ($collection === 'programs'): ?>
                    <div class="field"><label for="family_id">عائلة البرنامج</label><select id="family_id" name="family_id"><option value="education" <?= $item['family_id'] === 'education' ? 'selected' : '' ?>>التربية</option><option value="social" <?= $item['family_id'] === 'social' ? 'selected' : '' ?>>الأعمال الاجتماعية</option></select></div>
                    <div class="field"><label for="detail_view_id">معرّف صفحة التفاصيل</label><input id="detail_view_id" name="detail_view_id" type="text" dir="ltr" value="<?= e((string)$item['detail_view_id']) ?>"></div>
                <?php elseif ($collection === 'news'): ?>
                    <div class="field"><label for="category">التصنيف</label><select id="category" name="category"><?php foreach (array('news'=>'أخبار','events'=>'فعاليات','announcements'=>'إعلانات','programs'=>'برامج') as $value=>$label): ?><option value="<?= e($value) ?>" <?= $item['category'] === $value ? 'selected' : '' ?>><?= e($label) ?></option><?php endforeach; ?></select></div>
                    <div class="field"><label for="published_at">تاريخ النشر</label><input id="published_at" name="published_at" type="date" value="<?= e((string)$item['published_at']) ?>"></div>
                <?php elseif ($collection === 'gallery'): ?>
                    <div class="field"><label for="page_ref">مرجع الصفحة</label><input id="page_ref" name="page_ref" type="text" dir="ltr" value="<?= e((string)$item['page_ref']) ?>"></div>
                <?php endif; ?>
            </div>
            <div class="language-tabs" role="tablist" aria-label="اللغات">
                <button class="language-tab is-selected" type="button" data-language-tab="ar">العربية</button><button class="language-tab" type="button" data-language-tab="fr">Français</button><button class="language-tab" type="button" data-language-tab="en">English</button>
            </div>
            <p class="translation-warning">العربية هي اللغة الأساسية. عند غياب ترجمة، يمكن للواجهة العامة في المرحلة الثانية الرجوع إلى العربية.</p>
            <?php $fieldLabels = array('title'=>'العنوان','summary'=>'الملخص','body'=>'المحتوى','cta_text'=>'نص الزر','caption'=>'التعليق','alt'=>'النص البديل'); foreach (array('ar','fr','en') as $language): ?>
                <div data-language-panel="<?= e($language) ?>" <?= $language !== 'ar' ? 'hidden' : '' ?>><div class="form-grid">
                <?php foreach ($definition['translation_fields'] as $field): $value = (string)($item['translations'][$language][$field] ?? ''); $long = in_array($field, array('summary','body'), true); ?>
                    <div class="field <?= $long ? 'field--wide' : '' ?>"><label for="<?= e($field . '_' . $language) ?>"><?= e($fieldLabels[$field] ?? $field) ?> — <?= e(strtoupper($language)) ?></label><?php if ($long): ?><textarea id="<?= e($field . '_' . $language) ?>" name="<?= e($field . '_' . $language) ?>" rows="<?= $field === 'body' ? 9 : 4 ?>" <?= $language === 'ar' && in_array($field, $definition['required_ar'], true) ? 'required' : '' ?>><?= e($value) ?></textarea><?php else: ?><input id="<?= e($field . '_' . $language) ?>" name="<?= e($field . '_' . $language) ?>" type="text" value="<?= e($value) ?>" <?= $language === 'ar' && in_array($field, $definition['required_ar'], true) ? 'required' : '' ?>><?php endif; ?></div>
                <?php endforeach; ?></div></div>
            <?php endforeach; ?>
            <div class="form-actions"><button class="btn" type="submit" name="save_status" value="draft">حفظ كمسودة</button><button class="btn btn--gold" type="submit" name="save_status" value="published">حفظ ونشر</button><?php if ($editing): ?><a class="btn btn--secondary" href="preview.php?collection=<?= e($collection) ?>&id=<?= e((string)$item['id']) ?>" target="_blank" rel="noopener">معاينة</a><?php endif; ?><a class="btn btn--secondary" href="<?= e($collection) ?>.php">إلغاء</a></div>
        </form>
    </section>
    <?php admin_footer(); return;
}

$query = trim(request_value('q'));
$statusFilter = request_value('status_filter');
$items = array_values(array_filter($document['items'], static function ($item) use ($query, $statusFilter): bool {
    if ($statusFilter !== '' && ($item['status'] ?? '') !== $statusFilter) return false;
    if ($query === '') return true;
    $haystack = strtolower((string)($item['id'] ?? '') . ' ' . translated_value($item, 'title') . ' ' . translated_value($item, 'caption'));
    return strpos($haystack, strtolower($query)) !== false;
}));
admin_header($definition['label'], 'إدارة المحتوى بثلاث لغات مع حالات نشر واضحة');
?>
<section class="panel">
    <div class="toolbar"><form method="get"><div class="field"><label for="q">بحث</label><input id="q" name="q" type="search" value="<?= e($query) ?>" placeholder="العنوان أو المعرّف"></div><div class="field"><label for="status_filter">الحالة</label><select id="status_filter" name="status_filter"><option value="">الكل</option><?php foreach (array('draft','published','archived') as $status): ?><option value="<?= e($status) ?>" <?= $statusFilter === $status ? 'selected' : '' ?>><?= e(status_text($status)) ?></option><?php endforeach; ?></select></div><button class="btn btn--secondary" type="submit">تصفية</button></form><a class="btn" href="<?= e($collection) ?>.php?action=new">إضافة <?= e($definition['singular']) ?></a></div>
    <?php if (!$items): ?><div class="empty-state">لا توجد سجلات مطابقة. ابدأ بإضافة محتوى جديد.</div><?php else: ?><div class="table-wrap"><table class="data-table"><thead><tr><th>المحتوى</th><th>الحالة</th><th>الترتيب</th><th>آخر تحديث</th><th>الإجراءات</th></tr></thead><tbody><?php foreach ($items as $item): ?><tr><td><div class="row-title"><strong><?= e(translated_value($item, $collection === 'gallery' ? 'caption' : 'title')) ?></strong><small><?= e((string)$item['id']) ?></small></div></td><td><span class="badge badge--<?= e((string)$item['status']) ?>"><?= e(status_text((string)$item['status'])) ?></span></td><td><?= (int)($item['order'] ?? 0) ?></td><td><?= e(date('d/m/Y H:i', strtotime((string)($item['updated_at'] ?? 'now')))) ?></td><td><div class="row-actions"><a class="btn btn--secondary" href="<?= e($collection) ?>.php?action=edit&id=<?= e((string)$item['id']) ?>">تعديل</a><a class="btn btn--secondary" href="preview.php?collection=<?= e($collection) ?>&id=<?= e((string)$item['id']) ?>" target="_blank" rel="noopener">معاينة</a><?php if ($item['status'] !== 'archived'): ?><form method="post" data-confirm="أرشفة هذا السجل؟ يمكن استعادته من النسخ السابقة."><?= csrf_field() ?><input type="hidden" name="intent" value="archive"><input type="hidden" name="id" value="<?= e((string)$item['id']) ?>"><input type="hidden" name="collection_revision" value="<?= (int)$document['_meta']['revision'] ?>"><input type="hidden" name="item_revision" value="<?= (int)$item['revision'] ?>"><button class="btn btn--danger" type="submit">أرشفة</button></form><?php endif; ?></div></td></tr><?php endforeach; ?></tbody></table></div><?php endif; ?>
</section>
<?php admin_footer();
