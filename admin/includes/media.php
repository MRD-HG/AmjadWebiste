<?php
declare(strict_types=1);

function media_item(string $id): ?array
{
    return find_content_item(read_collection('media')['items'], $id);
}

function media_is_referenced(string $mediaId, bool $publishedOnly = true): array
{
    $references = array();
    foreach (array('programs', 'news', 'gallery', 'pages', 'products', 'memory', 'sections') as $collection) {
        $document = read_collection($collection);
        foreach ($document['items'] as $item) {
            if ($publishedOnly && ($item['status'] ?? '') !== 'published') {
                continue;
            }
            if ((string)($item['image_id'] ?? '') === $mediaId) {
                $references[] = $collection . ':' . (string)($item['id'] ?? '');
            }
        }
    }
    return $references;
}

function safe_original_filename(string $name): string
{
    $base = pathinfo(str_replace('\\', '/', $name), PATHINFO_FILENAME);
    $base = preg_replace('/[^A-Za-z0-9._-]+/', '-', $base) ?: 'image';
    return substr(trim($base, '-._'), 0, 80) ?: 'image';
}

function image_metadata(string $path): array
{
    $size = @getimagesize($path);
    if ($size === false || empty($size[0]) || empty($size[1])) {
        throw new InvalidArgumentException('الملف ليس صورة صحيحة.');
    }
    if (!class_exists('finfo')) {
        throw new RuntimeException('امتداد Fileinfo مطلوب للتحقق الآمن من الصور.');
    }
    $finfo = new finfo(FILEINFO_MIME_TYPE);
    $mime = (string)$finfo->file($path);
    $allowed = array('image/jpeg' => 'jpg', 'image/png' => 'png', 'image/webp' => 'webp');
    if (!isset($allowed[$mime]) || !in_array((string)($size['mime'] ?? ''), array_keys($allowed), true)) {
        throw new InvalidArgumentException('الصيغ المسموحة هي JPEG وPNG وWebP فقط.');
    }
    if ((int)$size[0] * (int)$size[1] > AMJAD_MAX_IMAGE_PIXELS) {
        throw new InvalidArgumentException('أبعاد الصورة كبيرة جداً للمعالجة الآمنة.');
    }
    return array('mime' => $mime, 'extension' => $allowed[$mime], 'width' => (int)$size[0], 'height' => (int)$size[1]);
}

function move_validated_upload(string $temporary, string $destination): void
{
    $moved = is_uploaded_file($temporary) && move_uploaded_file($temporary, $destination);
    if (!$moved && in_array(PHP_SAPI, array('cli-server', 'cli'), true) && amjad_env('AMJAD_TEST_MODE', '0') === '1') {
        $moved = @rename($temporary, $destination) || @copy($temporary, $destination);
    }
    if (!$moved) {
        throw new RuntimeException('تعذر نقل الصورة المرفوعة بأمان.');
    }
}

function create_image_thumbnail(string $source, string $destination, string $mime, int $width, int $height): bool
{
    if (!extension_loaded('gd')) {
        return false;
    }
    $loaders = array('image/jpeg' => 'imagecreatefromjpeg', 'image/png' => 'imagecreatefrompng', 'image/webp' => 'imagecreatefromwebp');
    if (!isset($loaders[$mime]) || !function_exists($loaders[$mime])) {
        return false;
    }
    $sourceImage = @$loaders[$mime]($source);
    if (!$sourceImage) {
        return false;
    }
    $targetWidth = min(480, $width);
    $targetHeight = max(1, (int)round($height * ($targetWidth / $width)));
    $thumbnail = imagecreatetruecolor($targetWidth, $targetHeight);
    if ($mime !== 'image/jpeg') {
        imagealphablending($thumbnail, false);
        imagesavealpha($thumbnail, true);
    }
    imagecopyresampled($thumbnail, $sourceImage, 0, 0, 0, 0, $targetWidth, $targetHeight, $width, $height);
    $saved = false;
    if ($mime === 'image/jpeg') $saved = imagejpeg($thumbnail, $destination, 84);
    if ($mime === 'image/png') $saved = imagepng($thumbnail, $destination, 6);
    if ($mime === 'image/webp' && function_exists('imagewebp')) $saved = imagewebp($thumbnail, $destination, 82);
    imagedestroy($sourceImage);
    imagedestroy($thumbnail);
    return (bool)$saved;
}

function save_media_upload(array $file, array $translations, int $expectedCollectionRevision, ?array $replace = null): array
{
    if (($file['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK) {
        throw new InvalidArgumentException('اختر صورة صالحة للرفع.');
    }
    $fileSize = (int)($file['size'] ?? 0);
    if ($fileSize <= 0 || $fileSize > AMJAD_MAX_UPLOAD_SIZE) {
        throw new InvalidArgumentException('حجم الصورة يتجاوز الحد المسموح.');
    }
    $temporary = (string)($file['tmp_name'] ?? '');
    $metadata = image_metadata($temporary);
    $month = date('Y/m');
    $directory = AMJAD_UPLOAD_DIR . '/' . $month;
    ensure_private_directory($directory);
    $base = safe_original_filename((string)($file['name'] ?? 'image')) . '-' . bin2hex(random_bytes(8));
    $filename = $base . '.' . $metadata['extension'];
    $destination = $directory . '/' . $filename;
    if (is_file($destination)) {
        throw new RuntimeException('تعارض غير متوقع في اسم الملف.');
    }
    move_validated_upload($temporary, $destination);
    @chmod($destination, 0644);
    $thumbName = $base . '-thumb.' . $metadata['extension'];
    $thumbPath = $directory . '/' . $thumbName;
    $hasThumbnail = create_image_thumbnail($destination, $thumbPath, $metadata['mime'], $metadata['width'], $metadata['height']);
    if ($hasThumbnail) {
        @chmod($thumbPath, 0644);
    }

    try {
        $document = read_collection('media');
        $now = date(DATE_ATOM);
        $item = $replace ?: array();
        $item['id'] = (string)($replace['id'] ?? new_stable_id('media'));
        $item['translations'] = normalize_translations($translations, array('caption', 'alt'));
        if ($item['translations']['ar']['alt'] === '') {
            throw new InvalidArgumentException('النص البديل العربي مطلوب.');
        }
        $item['status'] = 'published';
        $item['path'] = rtrim(AMJAD_UPLOAD_URL, '/') . '/' . $month . '/' . $filename;
        $item['thumbnail_path'] = $hasThumbnail ? rtrim(AMJAD_UPLOAD_URL, '/') . '/' . $month . '/' . $thumbName : '';
        $item['original_name'] = basename((string)($file['name'] ?? 'image'));
        $item['mime'] = $metadata['mime'];
        $item['size'] = $fileSize;
        $item['width'] = $metadata['width'];
        $item['height'] = $metadata['height'];
        $item['created_at'] = (string)($replace['created_at'] ?? $now);
        $item['updated_at'] = $now;
        $item['revision'] = (int)($replace['revision'] ?? 0) + 1;
        if ($replace) {
            $item['previous_files'] = array_values(array_filter(array_merge((array)($replace['previous_files'] ?? array()), array((string)($replace['path'] ?? '')))));
        }
        $index = content_item_index($document['items'], $item['id']);
        if ($index >= 0) $document['items'][$index] = $item; else $document['items'][] = $item;
        write_collection('media', $document['items'], $expectedCollectionRevision, $replace ? 'replace-media' : 'upload-media');
        audit_event($replace ? 'replace-media' : 'upload-media', 'media', $item['id'], array('mime' => $metadata['mime'], 'size' => $fileSize));
        return $item;
    } catch (Throwable $error) {
        @unlink($destination);
        if ($hasThumbnail) @unlink($thumbPath);
        throw $error;
    }
}

function archive_media(string $id, int $expectedCollectionRevision): void
{
    $references = media_is_referenced($id, true);
    if ($references) {
        throw new RuntimeException('لا يمكن أرشفة الصورة لأنها مستخدمة في محتوى منشور: ' . implode('، ', $references));
    }
    $document = read_collection('media');
    $index = content_item_index($document['items'], $id);
    if ($index < 0) {
        throw new RuntimeException('الصورة غير موجودة.');
    }
    $document['items'][$index]['status'] = 'archived';
    $document['items'][$index]['updated_at'] = date(DATE_ATOM);
    $document['items'][$index]['revision'] = (int)($document['items'][$index]['revision'] ?? 0) + 1;
    write_collection('media', $document['items'], $expectedCollectionRevision, 'archive-media');
    audit_event('archive-media', 'media', $id);
}
