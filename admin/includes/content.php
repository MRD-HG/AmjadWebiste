<?php
declare(strict_types=1);

function collection_definition(string $collection): array
{
    $definitions = array(
        'programs' => array(
            'label' => 'البرامج والمشاريع',
            'singular' => 'برنامج',
            'prefix' => 'program',
            'translation_fields' => array('title', 'summary', 'body', 'cta_text'),
            'required_ar' => array('title', 'summary'),
        ),
        'news' => array(
            'label' => 'الأخبار',
            'singular' => 'خبر',
            'prefix' => 'article',
            'translation_fields' => array('title', 'summary', 'body'),
            'required_ar' => array('title', 'summary'),
        ),
        'gallery' => array(
            'label' => 'مجلة الصور',
            'singular' => 'صورة',
            'prefix' => 'gallery',
            'translation_fields' => array('caption', 'alt'),
            'required_ar' => array('caption', 'alt'),
        ),
        'sections' => array(
            'label' => 'محتوى الصفحات',
            'singular' => 'حقل محتوى',
            'prefix' => 'section',
            'translation_fields' => array('text'),
            'required_ar' => array('text'),
        ),
        'products' => array(
            'label' => 'منتجات المتجر',
            'singular' => 'منتج',
            'prefix' => 'product',
            'translation_fields' => array('title', 'summary', 'availability_label'),
            'required_ar' => array('title', 'summary'),
        ),
        'memory' => array(
            'label' => 'ذاكرة الصخيرات',
            'singular' => 'مادة تاريخية',
            'prefix' => 'memory',
            'translation_fields' => array('title', 'summary', 'body', 'caption', 'source_label'),
            'required_ar' => array('title', 'summary'),
        ),
    );
    if (!isset($definitions[$collection])) {
        throw new InvalidArgumentException('وحدة التحرير غير معروفة.');
    }
    return $definitions[$collection];
}

function empty_translations(array $fields): array
{
    $translations = array();
    foreach (array('ar', 'fr', 'en') as $language) {
        $translations[$language] = array_fill_keys($fields, '');
    }
    return $translations;
}

function normalize_translations(array $source, array $fields): array
{
    $result = empty_translations($fields);
    foreach (array('ar', 'fr', 'en') as $language) {
        foreach ($fields as $field) {
            $result[$language][$field] = trim((string)($source[$language][$field] ?? ''));
        }
    }
    return $result;
}

function translations_from_post(array $fields): array
{
    $result = empty_translations($fields);
    foreach (array('ar', 'fr', 'en') as $language) {
        foreach ($fields as $field) {
            $result[$language][$field] = trim((string)($_POST[$field . '_' . $language] ?? ''));
        }
    }
    return $result;
}

function translated_value(array $item, string $field, string $language = 'ar'): string
{
    $translations = (array)($item['translations'] ?? array());
    $value = trim((string)($translations[$language][$field] ?? ''));
    if ($value === '' && $language !== 'ar') {
        return trim((string)($translations['ar'][$field] ?? ''));
    }
    return $value;
}

function stable_id_is_valid(string $id): bool
{
    return (bool)preg_match('/^[a-z0-9][a-z0-9-]{2,79}$/', $id);
}

function new_stable_id(string $prefix): string
{
    return $prefix . '-' . gmdate('Ymd-His') . '-' . bin2hex(random_bytes(3));
}

function find_content_item(array $items, string $id): ?array
{
    foreach ($items as $item) {
        if (is_array($item) && (string)($item['id'] ?? '') === $id) {
            return $item;
        }
    }
    return null;
}

function content_item_index(array $items, string $id): int
{
    foreach ($items as $index => $item) {
        if (is_array($item) && (string)($item['id'] ?? '') === $id) {
            return (int)$index;
        }
    }
    return -1;
}

function validate_content_item(string $collection, array $item): void
{
    $definition = collection_definition($collection);
    if (!stable_id_is_valid((string)($item['id'] ?? ''))) {
        throw new InvalidArgumentException('المعرّف الثابت غير صالح. استخدم حروفاً لاتينية صغيرة وأرقاماً وشرطات فقط.');
    }
    if (!valid_status((string)($item['status'] ?? ''))) {
        throw new InvalidArgumentException('حالة النشر غير صالحة.');
    }
    $translations = normalize_translations((array)($item['translations'] ?? array()), $definition['translation_fields']);
    foreach ($definition['required_ar'] as $field) {
        if ($translations['ar'][$field] === '') {
            throw new InvalidArgumentException('الحقول العربية الأساسية مطلوبة.');
        }
    }
    if ($collection === 'programs') {
        if (!in_array((string)($item['family_id'] ?? ''), array('education', 'social'), true)) {
            throw new InvalidArgumentException('عائلة البرنامج غير صالحة.');
        }
        $detail = (string)($item['detail_view_id'] ?? '');
        if ($detail !== '' && !preg_match('/^[a-z0-9][a-z0-9-]{1,79}$/', $detail)) {
            throw new InvalidArgumentException('معرّف صفحة التفاصيل غير صالح.');
        }
    }
    if ($collection === 'news') {
        if (!in_array((string)($item['category'] ?? ''), array('news', 'events', 'announcements', 'programs'), true)) {
            throw new InvalidArgumentException('تصنيف الخبر غير صالح.');
        }
        $date = (string)($item['published_at'] ?? '');
        if ($date !== '' && DateTime::createFromFormat('Y-m-d', $date) === false) {
            throw new InvalidArgumentException('تاريخ النشر غير صالح.');
        }
    }
    if ($collection === 'sections') {
        if (!in_array((string)($item['group'] ?? ''), array('about','services','eco-school','islamic-tools','footer','seo','shop'), true)) {
            throw new InvalidArgumentException('مجموعة محتوى الصفحة غير صالحة.');
        }
        if (!preg_match('/^[a-z0-9][a-z0-9_-]{2,119}$/', (string)($item['binding_key'] ?? ''))) {
            throw new InvalidArgumentException('مفتاح الربط الثابت غير صالح.');
        }
        if (!in_array((string)($item['binding_kind'] ?? ''), array('text','attribute'), true)) {
            throw new InvalidArgumentException('نوع ربط المحتوى غير صالح.');
        }
        if (!validate_http_or_local_url((string)($item['url'] ?? ''))) {
            throw new InvalidArgumentException('رابط المحتوى غير صالح.');
        }
    }
    if ($collection === 'products') {
        if (!in_array((string)($item['currency'] ?? ''), array('MAD','EUR','USD'), true)) {
            throw new InvalidArgumentException('عملة المنتج غير صالحة.');
        }
        if ((float)($item['price'] ?? 0) < 0) throw new InvalidArgumentException('سعر المنتج لا يمكن أن يكون سالباً.');
    }
    if ($collection === 'memory') {
        if (!in_array((string)($item['content_type'] ?? ''), array('article','person','place','timeline','gallery'), true)) {
            throw new InvalidArgumentException('نوع المادة التاريخية غير صالح.');
        }
        if (!validate_http_or_local_url((string)($item['source_url'] ?? ''))) throw new InvalidArgumentException('رابط المصدر غير صالح.');
        $eventDate = (string)($item['event_date'] ?? '');
        if ($eventDate !== '' && DateTime::createFromFormat('Y-m-d', $eventDate) === false) throw new InvalidArgumentException('تاريخ المادة غير صالح.');
    }
}

function content_item_from_post(string $collection, ?array $existing = null): array
{
    $definition = collection_definition($collection);
    $now = date(DATE_ATOM);
    $providedId = strtolower(trim((string)($_POST['stable_id'] ?? '')));
    $id = $existing['id'] ?? ($providedId !== '' ? $providedId : new_stable_id($definition['prefix']));
    $item = $existing ?: array();
    $item['id'] = (string)$id;
    $item['translations'] = translations_from_post($definition['translation_fields']);
    $item['status'] = request_value('save_status', request_value('status', 'draft'));
    $item['order'] = max(0, (int)request_value('order', '0'));
    $item['image_id'] = request_value('image_id');
    $item['created_at'] = (string)($existing['created_at'] ?? $now);
    $item['updated_at'] = $now;
    $item['revision'] = (int)($existing['revision'] ?? 0) + 1;

    if ($collection === 'programs') {
        $item['family_id'] = request_value('family_id', 'education');
        $item['detail_view_id'] = request_value('detail_view_id');
    } elseif ($collection === 'news') {
        $item['category'] = request_value('category', 'news');
        $item['published_at'] = request_value('published_at');
    } elseif ($collection === 'gallery') {
        $item['page_ref'] = request_value('page_ref', 'index');
    } elseif ($collection === 'sections') {
        $item['page'] = request_value('page', 'index.html');
        $item['group'] = request_value('group', 'about');
        $item['binding_key'] = request_value('binding_key', (string)$id);
        $item['binding_kind'] = request_value('binding_kind', 'text');
        $item['url'] = request_value('url');
    } elseif ($collection === 'products') {
        $item['kind'] = request_value('kind', 'product');
        $item['product_code'] = request_value('product_code', (string)$id);
        $item['price'] = max(0, (float)request_value('price', '0'));
        $item['currency'] = request_value('currency', 'MAD');
        $item['sizes'] = array_values(array_filter(array_map('trim', explode(',', request_value('sizes')))));
        $item['colors'] = array_values(array_filter(array_map('trim', explode(',', request_value('colors')))));
        $item['available'] = request_value('available') === '1';
    } elseif ($collection === 'memory') {
        $item['content_type'] = request_value('content_type', 'article');
        $item['source_url'] = request_value('source_url');
        $item['event_date'] = request_value('event_date');
        $item['page_ref'] = request_value('page_ref', 'skhirat-memory');
    }
    validate_content_item($collection, $item);
    return $item;
}

function save_content_item(string $collection, int $expectedCollectionRevision, int $expectedItemRevision = 0): array
{
    $document = read_collection($collection);
    $id = strtolower(trim((string)($_POST['id'] ?? '')));
    $index = $id === '' ? -1 : content_item_index($document['items'], $id);
    $existing = $index >= 0 ? $document['items'][$index] : null;
    if ($existing !== null && (int)($existing['revision'] ?? 0) !== $expectedItemRevision) {
        throw new ContentConflictException('هذا السجل عُدّل في جلسة أخرى. أعد تحميل الصفحة قبل الحفظ.');
    }
    $item = content_item_from_post($collection, $existing);
    if ($existing === null && find_content_item($document['items'], $item['id']) !== null) {
        throw new InvalidArgumentException('المعرّف الثابت مستخدم مسبقاً.');
    }
    if ($index >= 0) {
        $document['items'][$index] = $item;
    } else {
        $document['items'][] = $item;
    }
    usort($document['items'], static function ($left, $right): int {
        return ((int)($left['order'] ?? 0) <=> (int)($right['order'] ?? 0)) ?: strcmp((string)($left['id'] ?? ''), (string)($right['id'] ?? ''));
    });
    write_collection($collection, $document['items'], $expectedCollectionRevision, $existing ? 'update' : 'create');
    audit_event($existing ? 'update-item' : 'create-item', $collection, $item['id'], array('status' => $item['status']));
    return $item;
}

function archive_content_item(string $collection, string $id, int $expectedCollectionRevision, int $expectedItemRevision): void
{
    $document = read_collection($collection);
    $index = content_item_index($document['items'], $id);
    if ($index < 0) {
        throw new RuntimeException('السجل غير موجود.');
    }
    if ((int)($document['items'][$index]['revision'] ?? 0) !== $expectedItemRevision) {
        throw new ContentConflictException('السجل عُدّل قبل طلب الأرشفة.');
    }
    $document['items'][$index]['status'] = 'archived';
    $document['items'][$index]['updated_at'] = date(DATE_ATOM);
    $document['items'][$index]['revision'] = $expectedItemRevision + 1;
    write_collection($collection, $document['items'], $expectedCollectionRevision, 'archive');
    audit_event('archive-item', $collection, $id);
}

function page_definition(string $pageId): array
{
    $definitions = array(
        'hero' => array('label' => 'الواجهة الرئيسية', 'translation_fields' => array('title', 'subtitle', 'cta_text', 'text_block')),
        'president' => array('label' => 'كلمة الرئيس', 'translation_fields' => array('name', 'role', 'organization', 'motto', 'message', 'vision', 'mission')),
        'contact' => array('label' => 'معلومات الاتصال', 'translation_fields' => array('address', 'opening_hours')),
    );
    if (!isset($definitions[$pageId])) {
        throw new InvalidArgumentException('صفحة المحتوى غير معروفة.');
    }
    return $definitions[$pageId];
}

function empty_page_item(string $pageId): array
{
    $definition = page_definition($pageId);
    return array(
        'id' => $pageId,
        'translations' => empty_translations($definition['translation_fields']),
        'status' => 'draft',
        'image_id' => '',
        'settings' => array(),
        'created_at' => date(DATE_ATOM),
        'updated_at' => date(DATE_ATOM),
        'revision' => 0,
    );
}

function save_page_item(string $pageId, int $expectedCollectionRevision, int $expectedItemRevision): array
{
    $definition = page_definition($pageId);
    $document = read_collection('pages');
    $index = content_item_index($document['items'], $pageId);
    $existing = $index >= 0 ? $document['items'][$index] : empty_page_item($pageId);
    if ((int)($existing['revision'] ?? 0) !== $expectedItemRevision) {
        throw new ContentConflictException('تم تعديل هذه الصفحة في جلسة أخرى.');
    }
    $item = $existing;
    $item['translations'] = translations_from_post($definition['translation_fields']);
    $item['status'] = request_value('save_status', request_value('status', 'draft'));
    $item['image_id'] = request_value('image_id');
    $item['updated_at'] = date(DATE_ATOM);
    $item['revision'] = $expectedItemRevision + 1;
    $settings = array();
    if ($pageId === 'hero') {
        $settings = array(
            'cta_link' => request_value('cta_link'),
            'years' => max(0, (int)request_value('years', '0')),
            'volunteers' => max(0, (int)request_value('volunteers', '0')),
            'beneficiaries' => max(0, (int)request_value('beneficiaries', '0')),
        );
        if (!validate_http_or_local_url($settings['cta_link'])) {
            throw new InvalidArgumentException('رابط زر الواجهة غير صالح.');
        }
    } elseif ($pageId === 'contact') {
        $settings = array(
            'phone' => request_value('phone'),
            'email' => request_value('email'),
            'secondary_email' => request_value('secondary_email'),
            'map_url' => request_value('map_url'),
            'facebook' => request_value('facebook'),
            'instagram' => request_value('instagram'),
            'x' => request_value('x'),
            'youtube' => request_value('youtube'),
            'tiktok' => request_value('tiktok'),
            'linkedin' => request_value('linkedin'),
        );
        foreach (array('email', 'secondary_email') as $emailField) {
            if ($settings[$emailField] !== '' && filter_var($settings[$emailField], FILTER_VALIDATE_EMAIL) === false) {
                throw new InvalidArgumentException('صيغة البريد الإلكتروني غير صالحة.');
            }
        }
        foreach (array('map_url', 'facebook', 'instagram', 'x', 'youtube', 'tiktok', 'linkedin') as $urlField) {
            if (!validate_http_or_local_url($settings[$urlField])) {
                throw new InvalidArgumentException('أحد الروابط الرسمية غير صالح.');
            }
        }
    }
    $item['settings'] = $settings;
    if (!valid_status($item['status'])) {
        throw new InvalidArgumentException('حالة النشر غير صالحة.');
    }
    if ($index >= 0) {
        $document['items'][$index] = $item;
    } else {
        $document['items'][] = $item;
    }
    write_collection('pages', $document['items'], $expectedCollectionRevision, 'update-page');
    audit_event('update-page', 'pages', $pageId, array('status' => $item['status']));
    return $item;
}
