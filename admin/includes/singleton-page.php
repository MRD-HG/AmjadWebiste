<?php
declare(strict_types=1);

require_once __DIR__ . '/bootstrap.php';
require_login();
require_once __DIR__ . '/layout.php';

$pageId = (string)($pageId ?? '');
$definition = page_definition($pageId);
$error = '';
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    try {
        verify_csrf();
        save_page_item($pageId, (int)request_value('collection_revision'), (int)request_value('item_revision'));
        set_flash('success', 'تم حفظ الصفحة بنجاح.');
        redirect_to($pageId . '.php');
    } catch (Throwable $exception) {
        $error = $exception->getMessage();
    }
}

$document = read_collection('pages');
$item = find_content_item($document['items'], $pageId) ?: empty_page_item($pageId);
$mediaItems = array_values(array_filter(read_collection('media')['items'], static function ($media): bool { return ($media['status'] ?? '') === 'published'; }));
$labels = array('title'=>'العنوان','subtitle'=>'العنوان الفرعي','cta_text'=>'نص الزر','text_block'=>'النص التعريفي','name'=>'الاسم','role'=>'الصفة','organization'=>'المؤسسة','motto'=>'الشعار','message'=>'الكلمة','vision'=>'الرؤية','mission'=>'الرسالة','address'=>'العنوان البريدي','opening_hours'=>'أوقات العمل');
admin_header($definition['label'], 'صفحة واحدة بإصدارات محفوظة وترجمات عربية وفرنسية وإنجليزية');
if ($error !== ''): ?><div class="alert alert--error" role="alert"><?= e($error) ?></div><?php endif; ?>
<section class="panel">
<form method="post">
    <?= csrf_field() ?><input type="hidden" name="collection_revision" value="<?= (int)$document['_meta']['revision'] ?>"><input type="hidden" name="item_revision" value="<?= (int)$item['revision'] ?>">
    <div class="form-grid"><div class="field"><label for="status">الحالة</label><select id="status" name="status"><option value="draft" <?= $item['status'] === 'draft' ? 'selected' : '' ?>>مسودة</option><option value="published" <?= $item['status'] === 'published' ? 'selected' : '' ?>>منشور</option><option value="archived" <?= $item['status'] === 'archived' ? 'selected' : '' ?>>مؤرشف</option></select></div><div class="field"><label for="image_id">الصورة الرئيسية</label><select id="image_id" name="image_id"><option value="">بدون صورة</option><?php foreach ($mediaItems as $media): ?><option value="<?= e((string)$media['id']) ?>" <?= $item['image_id'] === $media['id'] ? 'selected' : '' ?>><?= e(translated_value($media, 'alt')) ?></option><?php endforeach; ?></select></div></div>
    <div class="language-tabs" role="tablist" aria-label="اللغات"><button class="language-tab is-selected" type="button" data-language-tab="ar">العربية</button><button class="language-tab" type="button" data-language-tab="fr">Français</button><button class="language-tab" type="button" data-language-tab="en">English</button></div>
    <?php foreach (array('ar','fr','en') as $language): ?><div data-language-panel="<?= e($language) ?>" <?= $language !== 'ar' ? 'hidden' : '' ?>><div class="form-grid"><?php foreach ($definition['translation_fields'] as $field): $long = in_array($field, array('text_block','message','vision','mission','opening_hours'), true); ?><div class="field <?= $long ? 'field--wide' : '' ?>"><label for="<?= e($field . '_' . $language) ?>"><?= e($labels[$field] ?? $field) ?> — <?= e(strtoupper($language)) ?></label><?php if ($long): ?><textarea id="<?= e($field . '_' . $language) ?>" name="<?= e($field . '_' . $language) ?>" rows="6"><?= e((string)($item['translations'][$language][$field] ?? '')) ?></textarea><?php else: ?><input id="<?= e($field . '_' . $language) ?>" name="<?= e($field . '_' . $language) ?>" type="text" value="<?= e((string)($item['translations'][$language][$field] ?? '')) ?>"><?php endif; ?></div><?php endforeach; ?></div></div><?php endforeach; ?>
    <?php $settings = (array)($item['settings'] ?? array()); if ($pageId === 'hero'): ?><div class="form-grid"><div class="field field--wide"><label for="cta_link">رابط الزر</label><input id="cta_link" name="cta_link" type="text" dir="ltr" value="<?= e((string)($settings['cta_link'] ?? '')) ?>"></div><?php foreach (array('years'=>'سنوات العمل','volunteers'=>'المتطوعون','beneficiaries'=>'المستفيدون') as $key=>$label): ?><div class="field"><label for="<?= e($key) ?>"><?= e($label) ?></label><input id="<?= e($key) ?>" name="<?= e($key) ?>" type="number" min="0" value="<?= (int)($settings[$key] ?? 0) ?>"></div><?php endforeach; ?></div><?php elseif ($pageId === 'contact'): ?><div class="form-grid"><?php foreach (array('phone'=>'الهاتف','email'=>'البريد الإلكتروني','secondary_email'=>'البريد الثانوي','map_url'=>'رابط الخريطة','facebook'=>'Facebook','instagram'=>'Instagram','x'=>'X','youtube'=>'YouTube','tiktok'=>'TikTok','linkedin'=>'LinkedIn') as $key=>$label): ?><div class="field"><label for="<?= e($key) ?>"><?= e($label) ?></label><input id="<?= e($key) ?>" name="<?= e($key) ?>" type="<?= strpos($key, 'email') !== false ? 'email' : 'text' ?>" dir="ltr" value="<?= e((string)($settings[$key] ?? '')) ?>"></div><?php endforeach; ?></div><?php endif; ?>
    <div class="form-actions"><button class="btn" type="submit" name="save_status" value="draft">حفظ كمسودة</button><button class="btn btn--gold" type="submit" name="save_status" value="published">حفظ ونشر</button><a class="btn btn--secondary" href="preview.php?collection=pages&id=<?= e($pageId) ?>" target="_blank" rel="noopener">معاينة</a></div>
</form>
</section>
<?php admin_footer();
