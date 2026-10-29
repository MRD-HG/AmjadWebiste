<?php
declare(strict_types=1);
require_once __DIR__ . '/includes/bootstrap.php';
require_login();
require_once __DIR__ . '/includes/layout.php';
$collection = request_value('collection');
$id = request_value('id');
if (!in_array($collection, array('programs','news','gallery','pages','sections','products','memory'), true)) { http_response_code(404); exit('Not found'); }
$item = find_content_item(read_collection($collection)['items'], $id);
if (!$item) { http_response_code(404); exit('Not found'); }
$media = !empty($item['image_id']) ? media_item((string)$item['image_id']) : null;
$titleField = $collection === 'gallery' ? 'caption' : ($collection === 'sections' ? 'text' : ($collection === 'pages' && $id === 'president' ? 'name' : 'title'));
?><!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>معاينة — <?= e(translated_value($item, $titleField)) ?></title><link rel="stylesheet" href="assets/admin.css"></head><body><main class="main-content"><section class="panel"><div class="panel-header"><div><span class="badge badge--<?= e((string)$item['status']) ?>"><?= e(status_text((string)$item['status'])) ?></span><h1><?= e(translated_value($item, $titleField)) ?></h1><p>معاينة داخلية فقط — لا تنشر هذه الصفحة المحتوى على الموقع العام.</p></div><a class="btn btn--secondary" href="<?= e($collection === 'pages' ? $id : $collection) ?>.php">العودة للمحرر</a></div><?php if ($media): ?><img class="preview-hero" src="<?= e((string)$media['path']) ?>" alt="<?= e(translated_value($media, 'alt')) ?>"><?php endif; ?><?php foreach (array('subtitle','summary','body','message','vision','mission','caption','text_block') as $field): $value = translated_value($item, $field); if ($value !== ''): ?><section class="preview-copy"><h2><?= e($field) ?></h2><p><?= nl2br(e($value)) ?></p></section><?php endif; endforeach; ?></section></main></body></html>
