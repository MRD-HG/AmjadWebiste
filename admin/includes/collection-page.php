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
        } elseif ($intent === 'delete') {
            if ($collection !== 'news') throw new InvalidArgumentException('الحذف النهائي متاح للأخبار فقط.');
            delete_news_item(request_value('id'), (int)request_value('collection_revision'), (int)request_value('item_revision'), request_value('confirmation'));
            set_flash('success', 'تم حذف الخبر من الإدارة والواجهة. يمكن استعادته من النسخ السابقة.');
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
$showForm = $action === 'new' || ($editing !== null && $action !== 'delete') || ($_SERVER['REQUEST_METHOD'] === 'POST' && !in_array(request_value('intent'), array('archive', 'delete'), true));
$mediaItems = array_values(array_filter(read_collection('media')['items'], static function ($item): bool { return ($item['status'] ?? '') === 'published'; }));

if ($collection === 'news' && $action === 'delete' && $editing !== null) {
    if (($editing['status'] ?? '') !== 'archived') {
        set_flash('error', 'يجب أرشفة الخبر قبل حذفه.');
        redirect_to('news.php');
    }
    admin_header('حذف الخبر', 'حذف آمن مع إبقاء نسخة قابلة للاستعادة في سجل المراجعات');
    if ($error !== ''): ?><div class="alert alert--error" role="alert"><?= e($error) ?></div><?php endif; ?>
    <section class="panel danger-zone">
        <div class="panel-header"><div><h2>تأكيد حذف الخبر</h2><p>لن تُحذف الصورة الأصلية. سيبقى معرّف محجوزاً لمنع ظهور النسخة القديمة من HTML، ويمكن استعادة المحتوى من النسخ السابقة.</p></div></div>
        <form method="post">
            <?= csrf_field() ?>
            <input type="hidden" name="intent" value="delete">
            <input type="hidden" name="id" value="<?= e((string)$editing['id']) ?>">
            <input type="hidden" name="collection_revision" value="<?= (int)$document['_meta']['revision'] ?>">
            <input type="hidden" name="item_revision" value="<?= (int)$editing['revision'] ?>">
            <div class="field"><label for="confirmation">اكتب المعرّف <bdi dir="ltr"><?= e((string)$editing['id']) ?></bdi> للتأكيد</label><input id="confirmation" name="confirmation" type="text" dir="ltr" required autocomplete="off"></div>
            <div class="form-actions"><button class="btn btn--danger" type="submit">حذف الخبر</button><a class="btn btn--secondary" href="news.php">إلغاء</a></div>
        </form>
    </section>
    <?php admin_footer(); return;
}

if ($showForm) {
    $item = $editing ?: array(
        'id' => '', 'translations' => empty_translations($definition['translation_fields']), 'status' => 'draft',
        'order' => 0, 'image_id' => '', 'revision' => 0, 'family_id' => 'education', 'detail_view_id' => '',
        'category' => 'news', 'published_at' => date('Y-m-d'), 'page_ref' => 'index',
        'page' => 'index.html', 'group' => 'about', 'binding_key' => '', 'binding_kind' => 'text', 'url' => '',
        'kind' => 'product', 'product_code' => '', 'price' => 0, 'currency' => 'MAD', 'sizes' => array(), 'colors' => array(), 'available' => true,
        'content_type' => 'article', 'source_url' => '', 'event_date' => '',
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
        if ($collection === 'sections') { $item['page']=request_value('page','index.html'); $item['group']=request_value('group','about'); $item['binding_key']=request_value('binding_key'); $item['binding_kind']=request_value('binding_kind','text'); $item['url']=request_value('url'); }
        if ($collection === 'products') { $item['kind']=request_value('kind','product'); $item['product_code']=request_value('product_code'); $item['price']=(float)request_value('price','0'); $item['currency']=request_value('currency','MAD'); $item['sizes']=array_map('trim',explode(',',request_value('sizes'))); $item['colors']=array_map('trim',explode(',',request_value('colors'))); $item['available']=request_value('available')==='1'; }
        if ($collection === 'memory') { $item['content_type']=request_value('content_type','article'); $item['source_url']=request_value('source_url'); $item['event_date']=request_value('event_date'); $item['page_ref']=request_value('page_ref','skhirat-memory'); }
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
                <?php elseif ($collection === 'sections'): ?>
                    <div class="field"><label for="group">مجموعة المحتوى</label><select id="group" name="group"><?php foreach (array('about'=>'عن الجمعية','services'=>'الخدمات','eco-school'=>'المدرسة الإيكولوجية','islamic-tools'=>'الخدمات الإسلامية','footer'=>'التذييل','seo'=>'SEO','shop'=>'نصوص المتجر') as $value=>$label): ?><option value="<?= e($value) ?>" <?= $item['group'] === $value ? 'selected' : '' ?>><?= e($label) ?></option><?php endforeach; ?></select></div>
                    <div class="field"><label for="page">ملف الصفحة</label><input id="page" name="page" type="text" dir="ltr" value="<?= e((string)$item['page']) ?>"></div>
                    <div class="field"><label for="binding_key">مفتاح الربط</label><input id="binding_key" name="binding_key" type="text" dir="ltr" value="<?= e((string)($item['binding_key'] ?: $item['id'])) ?>" required></div>
                    <div class="field"><label for="binding_kind">نوع الربط</label><select id="binding_kind" name="binding_kind"><option value="text" <?= $item['binding_kind'] === 'text' ? 'selected' : '' ?>>نص</option><option value="attribute" <?= $item['binding_kind'] === 'attribute' ? 'selected' : '' ?>>خاصية آمنة</option></select></div>
                    <div class="field field--wide"><label for="url">رابط اختياري</label><input id="url" name="url" type="text" dir="ltr" value="<?= e((string)$item['url']) ?>"></div>
                <?php elseif ($collection === 'products'): ?>
                    <div class="field"><label for="product_code">رمز المنتج</label><input id="product_code" name="product_code" type="text" dir="ltr" value="<?= e((string)$item['product_code']) ?>"></div>
                    <div class="field"><label for="kind">التصنيف</label><input id="kind" name="kind" type="text" dir="ltr" value="<?= e((string)$item['kind']) ?>"></div>
                    <div class="field"><label for="price">السعر</label><input id="price" name="price" type="number" min="0" step="0.01" value="<?= e((string)$item['price']) ?>"></div>
                    <div class="field"><label for="currency">العملة</label><select id="currency" name="currency"><?php foreach (array('MAD','EUR','USD') as $currency): ?><option value="<?= e($currency) ?>" <?= $item['currency'] === $currency ? 'selected' : '' ?>><?= e($currency) ?></option><?php endforeach; ?></select></div>
                    <div class="field"><label for="sizes">المقاسات</label><input id="sizes" name="sizes" type="text" dir="ltr" value="<?= e(implode(', ',(array)$item['sizes'])) ?>"><p class="field-help">افصل القيم بفاصلة.</p></div>
                    <div class="field"><label for="colors">الألوان</label><input id="colors" name="colors" type="text" dir="ltr" value="<?= e(implode(', ',(array)$item['colors'])) ?>"></div>
                    <div class="field"><label><input name="available" type="checkbox" value="1" <?= !empty($item['available']) ? 'checked' : '' ?>> متوفر للطلب</label></div>
                <?php elseif ($collection === 'memory'): ?>
                    <div class="field"><label for="content_type">نوع المادة</label><select id="content_type" name="content_type"><?php foreach (array('article'=>'مقال','person'=>'شخصية','place'=>'مكان','timeline'=>'محطة زمنية','gallery'=>'صورة/معرض') as $value=>$label): ?><option value="<?= e($value) ?>" <?= $item['content_type'] === $value ? 'selected' : '' ?>><?= e($label) ?></option><?php endforeach; ?></select></div>
                    <div class="field"><label for="event_date">التاريخ الموثق</label><input id="event_date" name="event_date" type="date" value="<?= e((string)$item['event_date']) ?>"></div>
                    <div class="field"><label for="source_url">رابط المصدر</label><input id="source_url" name="source_url" type="url" dir="ltr" value="<?= e((string)$item['source_url']) ?>"></div>
                    <div class="field"><label for="page_ref">مرجع القسم</label><input id="page_ref" name="page_ref" type="text" dir="ltr" value="<?= e((string)$item['page_ref']) ?>"></div>
                <?php endif; ?>
            </div>
            <div class="language-tabs" role="tablist" aria-label="اللغات">
                <button class="language-tab is-selected" type="button" data-language-tab="ar">العربية</button><button class="language-tab" type="button" data-language-tab="fr">Français</button><button class="language-tab" type="button" data-language-tab="en">English</button>
            </div>
            <p class="translation-warning">العربية هي اللغة الأساسية. عند غياب ترجمة، يمكن للواجهة العامة في المرحلة الثانية الرجوع إلى العربية.</p>
            <?php $fieldLabels = array('title'=>'العنوان','summary'=>'الملخص','body'=>'المحتوى','cta_text'=>'نص الزر','caption'=>'التعليق','alt'=>'النص البديل','text'=>'النص','availability_label'=>'حالة التوفر','source_label'=>'تسمية المصدر'); foreach (array('ar','fr','en') as $language): ?>
                <div data-language-panel="<?= e($language) ?>" <?= $language !== 'ar' ? 'hidden' : '' ?>><div class="form-grid">
                <?php foreach ($definition['translation_fields'] as $field): $value = (string)($item['translations'][$language][$field] ?? ''); $long = in_array($field, array('summary','body','text'), true); ?>
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
    if (($item['status'] ?? '') === 'deleted') return false;
    if ($statusFilter !== '' && ($item['status'] ?? '') !== $statusFilter) return false;
    if ($query === '') return true;
    $haystack = strtolower((string)($item['id'] ?? '') . ' ' . translated_value($item, 'title') . ' ' . translated_value($item, 'caption') . ' ' . translated_value($item, 'text'));
    return strpos($haystack, strtolower($query)) !== false;
}));
admin_header($definition['label'], 'إدارة المحتوى بثلاث لغات مع حالات نشر واضحة');
?>
<section class="panel">
    <div class="toolbar"><form method="get"><div class="field"><label for="q">بحث</label><input id="q" name="q" type="search" value="<?= e($query) ?>" placeholder="العنوان أو المعرّف"></div><div class="field"><label for="status_filter">الحالة</label><select id="status_filter" name="status_filter"><option value="">الكل</option><?php foreach (array('draft','published','archived') as $status): ?><option value="<?= e($status) ?>" <?= $statusFilter === $status ? 'selected' : '' ?>><?= e(status_text($status)) ?></option><?php endforeach; ?></select></div><button class="btn btn--secondary" type="submit">تصفية</button></form><a class="btn" href="<?= e($collection) ?>.php?action=new">إضافة <?= e($definition['singular']) ?></a></div>
    <?php if (!$items): ?><div class="empty-state">لا توجد سجلات مطابقة. ابدأ بإضافة محتوى جديد.</div><?php else: ?><div class="table-wrap"><table class="data-table"><thead><tr><th>المحتوى</th><th>الحالة</th><th>الترتيب</th><th>آخر تحديث</th><th>الإجراءات</th></tr></thead><tbody><?php foreach ($items as $item): $titleField = $collection === 'gallery' ? 'caption' : ($collection === 'sections' ? 'text' : 'title'); ?><tr><td><div class="row-title"><strong><?= e(translated_value($item, $titleField)) ?></strong><small><?= e((string)$item['id']) ?></small></div></td><td><span class="badge badge--<?= e((string)$item['status']) ?>"><?= e(status_text((string)$item['status'])) ?></span></td><td><?= (int)($item['order'] ?? 0) ?></td><td><?= e(date('d/m/Y H:i', strtotime((string)($item['updated_at'] ?? 'now')))) ?></td><td><div class="row-actions"><a class="btn btn--secondary" href="<?= e($collection) ?>.php?action=edit&id=<?= e((string)$item['id']) ?>">تعديل</a><a class="btn btn--secondary" href="preview.php?collection=<?= e($collection) ?>&id=<?= e((string)$item['id']) ?>" target="_blank" rel="noopener">معاينة</a><?php if ($item['status'] !== 'archived'): ?><form method="post" data-confirm="أرشفة هذا السجل؟ يمكن استعادته من النسخ السابقة."><?= csrf_field() ?><input type="hidden" name="intent" value="archive"><input type="hidden" name="id" value="<?= e((string)$item['id']) ?>"><input type="hidden" name="collection_revision" value="<?= (int)$document['_meta']['revision'] ?>"><input type="hidden" name="item_revision" value="<?= (int)$item['revision'] ?>"><button class="btn btn--danger" type="submit">أرشفة</button></form><?php elseif ($collection === 'news'): ?><a class="btn btn--danger" href="news.php?action=delete&amp;id=<?= e((string)$item['id']) ?>">حذف</a><?php endif; ?></div></td></tr><?php endforeach; ?></tbody></table></div><?php endif; ?>
</section>
<?php admin_footer();
