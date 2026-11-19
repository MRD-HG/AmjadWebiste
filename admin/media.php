<?php
declare(strict_types=1);
require_once __DIR__ . '/includes/bootstrap.php';
require_login();
require_once __DIR__ . '/includes/layout.php';

$error = '';
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    try {
        verify_csrf();
        $document = read_collection('media');
        if (request_value('intent') === 'archive') {
            archive_media(request_value('id'), (int)request_value('collection_revision'));
            set_flash('success', 'تمت أرشفة الصورة.');
        } else {
            $replace = request_value('replace_id') !== '' ? media_item(request_value('replace_id')) : null;
            $translations = array();
            foreach (array('ar','fr','en') as $language) $translations[$language] = array('caption'=>request_value('caption_' . $language), 'alt'=>request_value('alt_' . $language));
            save_media_upload($_FILES['image'] ?? array(), $translations, (int)request_value('collection_revision'), $replace);
            set_flash('success', $replace ? 'تم استبدال ملف الصورة مع الاحتفاظ بالسجل.' : 'تم رفع الصورة بأمان.');
        }
        redirect_to('media.php');
    } catch (Throwable $exception) {
        $error = $exception->getMessage();
    }
}
$document = read_collection('media');
$replace = request_value('replace') !== '' ? media_item(request_value('replace')) : null;
$showUpload = request_value('action') === 'upload' || $replace !== null || ($_SERVER['REQUEST_METHOD'] === 'POST' && $error !== '');
admin_header('مكتبة الوسائط', 'صور JPEG وPNG وWebP موثقة بنصوص بديلة');
if ($error !== ''): ?><div class="alert alert--error" role="alert"><?= e($error) ?></div><?php endif; ?>
<?php if ($showUpload): ?><section class="panel"><div class="panel-header"><div><h2><?= $replace ? 'استبدال الصورة' : 'رفع صورة جديدة' ?></h2><p>الحد الأقصى <?= (int)(AMJAD_MAX_UPLOAD_SIZE / 1048576) ?> MB. يتم التحقق من النوع الحقيقي والأبعاد.</p></div></div><form method="post" enctype="multipart/form-data"><?= csrf_field() ?><input type="hidden" name="intent" value="upload"><input type="hidden" name="collection_revision" value="<?= (int)$document['_meta']['revision'] ?>"><input type="hidden" name="replace_id" value="<?= e((string)($replace['id'] ?? '')) ?>"><div class="upload-dropzone" data-upload-dropzone tabindex="0" role="button" aria-controls="image"><strong>اختر صورة أو اسحبها هنا</strong><small data-upload-name>JPEG / PNG / WebP</small><img class="media-preview" data-upload-preview alt="معاينة الصورة المختارة" hidden></div><input class="sr-only" id="image" name="image" type="file" accept="image/jpeg,image/png,image/webp" data-upload-input required><div class="language-tabs" role="tablist"><button class="language-tab is-selected" type="button" data-language-tab="ar">العربية</button><button class="language-tab" type="button" data-language-tab="fr">Français</button><button class="language-tab" type="button" data-language-tab="en">English</button></div><?php foreach (array('ar','fr','en') as $language): ?><div data-language-panel="<?= e($language) ?>" <?= $language !== 'ar' ? 'hidden' : '' ?>><div class="form-grid"><div class="field"><label for="caption_<?= e($language) ?>">التعليق — <?= e(strtoupper($language)) ?></label><input id="caption_<?= e($language) ?>" name="caption_<?= e($language) ?>" type="text" value="<?= e((string)($replace['translations'][$language]['caption'] ?? '')) ?>"></div><div class="field"><label for="alt_<?= e($language) ?>">النص البديل — <?= e(strtoupper($language)) ?></label><input id="alt_<?= e($language) ?>" name="alt_<?= e($language) ?>" type="text" value="<?= e((string)($replace['translations'][$language]['alt'] ?? '')) ?>" <?= $language === 'ar' ? 'required' : '' ?>></div></div></div><?php endforeach; ?><div class="form-actions"><button class="btn" type="submit"><?= $replace ? 'استبدال الملف' : 'رفع الصورة' ?></button><a class="btn btn--secondary" href="media.php">إلغاء</a></div></form></section><?php else: ?>
<?php $mediaQuery = trim(request_value('q')); $mediaStatus = request_value('status_filter','published'); $visible = array_values(array_filter($document['items'], static function ($item) use ($mediaQuery,$mediaStatus): bool { if ($mediaStatus !== '' && ($item['status'] ?? '') !== $mediaStatus) return false; if ($mediaQuery === '') return true; $text = strtolower((string)($item['id'] ?? '') . ' ' . translated_value($item,'caption') . ' ' . translated_value($item,'alt')); return strpos($text,strtolower($mediaQuery)) !== false; })); ?>
<section class="panel"><div class="toolbar"><form method="get"><div class="field"><label for="q">بحث</label><input id="q" name="q" type="search" value="<?= e($mediaQuery) ?>" placeholder="التعليق أو المعرّف"></div><div class="field"><label for="status_filter">الحالة</label><select id="status_filter" name="status_filter"><option value="" <?= $mediaStatus === '' ? 'selected' : '' ?>>الكل</option><option value="published" <?= $mediaStatus === 'published' ? 'selected' : '' ?>>متاح</option><option value="archived" <?= $mediaStatus === 'archived' ? 'selected' : '' ?>>مؤرشف</option></select></div><button class="btn btn--secondary" type="submit">تصفية</button></form><a class="btn" href="media.php?action=upload">رفع صورة</a></div><?php if (!$visible): ?><div class="empty-state">لا توجد صور مطابقة.</div><?php else: ?><div class="media-grid"><?php foreach ($visible as $item): ?><article class="media-card"><div class="media-card__image"><img src="<?= e((string)($item['thumbnail_path'] ?: $item['path'])) ?>" alt="<?= e(translated_value($item, 'alt')) ?>" loading="lazy"></div><div class="media-card__body"><strong><?= e(translated_value($item, 'caption') ?: translated_value($item, 'alt')) ?></strong><small><?= e((string)$item['id']) ?> · <?= (int)$item['width'] ?>×<?= (int)$item['height'] ?> · <?= e(number_format((int)($item['size'] ?? 0) / 1024, 1)) ?> KB</small><div class="row-actions"><?php if (($item['status'] ?? '') !== 'archived'): ?><a class="btn btn--secondary" href="media.php?replace=<?= e((string)$item['id']) ?>">استبدال</a><form method="post" data-confirm="أرشفة هذه الصورة؟"><?= csrf_field() ?><input type="hidden" name="intent" value="archive"><input type="hidden" name="id" value="<?= e((string)$item['id']) ?>"><input type="hidden" name="collection_revision" value="<?= (int)$document['_meta']['revision'] ?>"><button class="btn btn--danger" type="submit">أرشفة</button></form><?php else: ?><span class="badge badge--archived">مؤرشف</span><?php endif; ?></div></div></article><?php endforeach; ?></div><?php endif; ?></section>
<?php endif; admin_footer();
