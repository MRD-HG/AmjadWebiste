<?php
declare(strict_types=1);

class ContentConflictException extends RuntimeException {}

function ensure_private_directory(string $path): void
{
    if (!is_dir($path) && !mkdir($path, 0750, true) && !is_dir($path)) {
        throw new RuntimeException('تعذر إنشاء مجلد التخزين الخاص.');
    }
}

function initialize_storage_directories(): void
{
    foreach (array(AMJAD_STORAGE_DIR, AMJAD_CONTENT_DIR, AMJAD_REVISION_DIR, AMJAD_IMPORT_DIR, AMJAD_LOCK_DIR, AMJAD_THROTTLE_DIR, AMJAD_PUBLIC_DATA_DIR, AMJAD_UPLOAD_DIR) as $directory) {
        ensure_private_directory($directory);
    }
}

function allowed_collections(): array
{
    return array('programs', 'news', 'gallery', 'pages', 'media', 'sections', 'products', 'memory');
}

function assert_collection(string $collection): string
{
    if (!in_array($collection, allowed_collections(), true)) {
        throw new InvalidArgumentException('مجموعة المحتوى غير معروفة.');
    }
    return $collection;
}

function default_collection_document(string $collection): array
{
    return array(
        '_meta' => array(
            'collection' => $collection,
            'schema_version' => AMJAD_SCHEMA_VERSION,
            'revision' => 0,
            'updated_at' => null,
        ),
        'items' => array(),
    );
}

function collection_file(string $collection): string
{
    return AMJAD_CONTENT_DIR . '/' . assert_collection($collection) . '.json';
}

function decode_json_document(string $json, string $collection): array
{
    $decoded = json_decode($json, true);
    if (!is_array($decoded) || !isset($decoded['_meta'], $decoded['items']) || !is_array($decoded['items'])) {
        throw new RuntimeException('ملف المحتوى غير صالح: ' . $collection);
    }
    return $decoded;
}

function read_collection(string $collection): array
{
    initialize_storage_directories();
    $path = collection_file($collection);
    if (!is_file($path)) {
        return default_collection_document($collection);
    }
    $contents = file_get_contents($path);
    if ($contents === false) {
        throw new RuntimeException('تعذر قراءة مجموعة المحتوى.');
    }
    return decode_json_document($contents, $collection);
}

function encode_json(array $data): string
{
    $json = json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT);
    if ($json === false) {
        throw new RuntimeException('تعذر ترميز البيانات.');
    }
    return $json . "\n";
}

function atomic_write_file(string $path, string $contents, int $mode = 0640): void
{
    ensure_private_directory(dirname($path));
    $temporary = dirname($path) . '/.' . basename($path) . '.' . bin2hex(random_bytes(6)) . '.tmp';
    $handle = @fopen($temporary, 'xb');
    if ($handle === false) {
        throw new RuntimeException('تعذر إنشاء ملف الحفظ المؤقت.');
    }
    try {
        $length = strlen($contents);
        $written = 0;
        while ($written < $length) {
            $chunk = fwrite($handle, substr($contents, $written));
            if ($chunk === false || $chunk === 0) {
                throw new RuntimeException('تعذر إكمال كتابة الملف المؤقت.');
            }
            $written += $chunk;
        }
        fflush($handle);
        if (function_exists('fsync')) {
            @fsync($handle);
        }
    } finally {
        fclose($handle);
    }
    @chmod($temporary, $mode);

    if (@rename($temporary, $path)) {
        return;
    }

    $rollback = $path . '.rollback';
    if (is_file($rollback)) {
        @unlink($rollback);
    }
    if (is_file($path) && !@rename($path, $rollback)) {
        @unlink($temporary);
        throw new RuntimeException('تعذر تجهيز الملف الحالي للاستبدال الآمن.');
    }
    if (!@rename($temporary, $path)) {
        if (is_file($rollback)) {
            @rename($rollback, $path);
        }
        @unlink($temporary);
        throw new RuntimeException('فشل الاستبدال الآمن؛ تمت محاولة استرجاع النسخة السابقة.');
    }
    if (is_file($rollback)) {
        @unlink($rollback);
    }
}

function audit_event(string $action, string $collection, string $itemId = '', array $context = array()): void
{
    initialize_storage_directories();
    $entry = array(
        'at' => date(DATE_ATOM),
        'actor' => (string)($_SESSION['admin_username'] ?? 'system'),
        'action' => $action,
        'collection' => $collection,
        'item_id' => $itemId,
        'context' => $context,
    );
    @file_put_contents(AMJAD_STORAGE_DIR . '/audit.jsonl', json_encode($entry, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) . "\n", FILE_APPEND | LOCK_EX);
}

function write_revision_snapshot(string $collection, array $document, string $reason): string
{
    $revision = (int)($document['_meta']['revision'] ?? 0);
    $directory = AMJAD_REVISION_DIR . '/' . $collection;
    ensure_private_directory($directory);
    $stamp = date('Ymd-His') . '-' . str_pad((string)$revision, 6, '0', STR_PAD_LEFT) . '-' . bin2hex(random_bytes(3));
    $snapshot = array(
        '_snapshot' => array('reason' => $reason, 'created_at' => date(DATE_ATOM), 'actor' => (string)($_SESSION['admin_username'] ?? 'system')),
        'document' => $document,
    );
    $path = $directory . '/' . $stamp . '.json';
    atomic_write_file($path, encode_json($snapshot));
    return basename($path);
}

function public_item_projection(string $collection, array $item): array
{
    $common = array('id', 'translations', 'status', 'image_id', 'order', 'created_at', 'updated_at');
    $specific = array(
        'programs' => array('family_id', 'detail_view_id'),
        'news' => array('category', 'published_at'),
        'gallery' => array('page_ref'),
        'pages' => array('settings'),
        'media' => array('path', 'thumbnail_path', 'mime', 'width', 'height'),
        'sections' => array('page', 'group', 'binding_key', 'binding_kind', 'url'),
        'products' => array('kind', 'product_code', 'price', 'currency', 'sizes', 'colors', 'available'),
        'memory' => array('content_type', 'source_url', 'event_date', 'page_ref'),
    );
    $result = array();
    foreach (array_merge($common, $specific[$collection] ?? array()) as $key) {
        if (array_key_exists($key, $item)) {
            $result[$key] = $item[$key];
        }
    }
    return $result;
}

function published_projection(string $collection, array $document): array
{
    $managedIds = array_values(array_unique(array_filter(array_map(static function ($item): string {
        if (!is_array($item)) return '';
        if (($item['owns_frontend'] ?? true) === false) return '';
        $id = (string)($item['id'] ?? '');
        return preg_match('/^[a-z0-9][a-z0-9-]{2,79}$/', $id) ? $id : '';
    }, $document['items']))));
    $items = array_values(array_filter($document['items'], static function ($item): bool {
        return is_array($item) && ($item['status'] ?? '') === 'published';
    }));
    $items = array_map(static function (array $item) use ($collection): array {
        return public_item_projection($collection, $item);
    }, $items);
    return array(
        '_meta' => array(
            'collection' => $collection,
            'schema_version' => (int)($document['_meta']['schema_version'] ?? AMJAD_SCHEMA_VERSION),
            'revision' => (int)($document['_meta']['revision'] ?? 0),
            'generated_at' => date(DATE_ATOM),
            'ownership_version' => 1,
            'managed_ids' => $managedIds,
        ),
        'items' => $items,
    );
}

function write_public_projection(string $collection, array $document): void
{
    initialize_storage_directories();
    atomic_write_file(AMJAD_PUBLIC_DATA_DIR . '/' . $collection . '.json', encode_json(published_projection($collection, $document)), 0644);
}

function write_collection(string $collection, array $items, int $expectedRevision, string $reason = 'save'): array
{
    assert_collection($collection);
    initialize_storage_directories();
    $lockPath = AMJAD_LOCK_DIR . '/' . $collection . '.lock';
    $lock = fopen($lockPath, 'c+');
    if ($lock === false || !flock($lock, LOCK_EX)) {
        throw new RuntimeException('تعذر قفل مجموعة المحتوى للحفظ.');
    }
    try {
        $current = read_collection($collection);
        $currentRevision = (int)($current['_meta']['revision'] ?? 0);
        if ($expectedRevision !== $currentRevision) {
            throw new ContentConflictException('تم تعديل المحتوى في جلسة أخرى. أعد تحميل الصفحة وراجع التغييرات.');
        }
        $document = array(
            '_meta' => array(
                'collection' => $collection,
                'schema_version' => AMJAD_SCHEMA_VERSION,
                'revision' => $currentRevision + 1,
                'updated_at' => date(DATE_ATOM),
            ),
            'items' => array_values($items),
        );
        atomic_write_file(collection_file($collection), encode_json($document));
        write_revision_snapshot($collection, $document, $reason);
        write_public_projection($collection, $document);
        audit_event($reason, $collection, '', array('revision' => $currentRevision + 1));
        return $document;
    } finally {
        flock($lock, LOCK_UN);
        fclose($lock);
    }
}

function list_revisions(string $collection): array
{
    assert_collection($collection);
    $directory = AMJAD_REVISION_DIR . '/' . $collection;
    if (!is_dir($directory)) {
        return array();
    }
    $files = glob($directory . '/*.json') ?: array();
    rsort($files, SORT_STRING);
    return array_map('basename', $files);
}

function restore_revision(string $collection, string $revisionFile, int $expectedRevision): array
{
    $safe = basename($revisionFile);
    $path = AMJAD_REVISION_DIR . '/' . assert_collection($collection) . '/' . $safe;
    if (!is_file($path)) {
        throw new RuntimeException('النسخة المطلوبة غير موجودة.');
    }
    $snapshot = json_decode((string)file_get_contents($path), true);
    if (!is_array($snapshot) || !isset($snapshot['document']['items']) || !is_array($snapshot['document']['items'])) {
        throw new RuntimeException('ملف النسخة السابقة غير صالح.');
    }
    $restored = write_collection($collection, $snapshot['document']['items'], $expectedRevision, 'restore');
    audit_event('restore', $collection, '', array('source' => $safe, 'revision' => $restored['_meta']['revision']));
    return $restored;
}

function recent_audit_events(int $limit = 8): array
{
    $path = AMJAD_STORAGE_DIR . '/audit.jsonl';
    if (!is_file($path)) {
        return array();
    }
    $lines = file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) ?: array();
    $lines = array_slice(array_reverse($lines), 0, max(1, $limit));
    $events = array();
    foreach ($lines as $line) {
        $event = json_decode($line, true);
        if (is_array($event)) {
            $events[] = $event;
        }
    }
    return $events;
}
