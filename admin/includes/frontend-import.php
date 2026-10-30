<?php
declare(strict_types=1);

/** Read the static multilingual site into stable, reviewable CMS candidates. */
function frontend_import_dictionary(string $path): array
{
    $result = array('en' => array(), 'fr' => array());
    $active = '';
    foreach (file($path, FILE_IGNORE_NEW_LINES) ?: array() as $line) {
        if (preg_match('/^\s*(en|fr)\s*:\s*\{\s*$/', $line, $match)) { $active = $match[1]; continue; }
        if ($active !== '' && preg_match('/^\s*}\s*,?\s*$/', $line)) { $active = ''; continue; }
        if ($active === '' || !preg_match('/^\s*([A-Za-z0-9_]+)\s*:\s*"((?:\\\\.|[^"\\\\])*)"\s*,?\s*$/u', $line, $match)) continue;
        $decoded = json_decode('"' . $match[2] . '"', true);
        $result[$active][$match[1]] = frontend_import_plain(is_string($decoded) ? $decoded : stripcslashes($match[2]));
    }
    return $result;
}

function frontend_import_plain(string $value): string
{
    $value = preg_replace('/<br\s*\/?\s*>/i', "\n", $value) ?? $value;
    $value = html_entity_decode(strip_tags($value), ENT_QUOTES | ENT_HTML5, 'UTF-8');
    $value = preg_replace('/[ \t]+/u', ' ', $value) ?? $value;
    $value = preg_replace('/\s*\n\s*/u', "\n", $value) ?? $value;
    return trim($value);
}

function frontend_import_dom(string $path): array
{
    $html = file_get_contents($path);
    if ($html === false) throw new RuntimeException('تعذر قراءة ملف الواجهة: ' . basename($path));
    $previous = libxml_use_internal_errors(true);
    $dom = new DOMDocument();
    $dom->loadHTML('<?xml encoding="utf-8" ?>' . $html, LIBXML_NOWARNING | LIBXML_NOERROR | LIBXML_COMPACT);
    libxml_clear_errors();
    libxml_use_internal_errors($previous);
    return array($dom, new DOMXPath($dom));
}

function frontend_import_bindings(string $root, array $pages): array
{
    $bindings = array();
    foreach ($pages as $page) {
        [$dom, $xpath] = frontend_import_dom($root . '/' . $page);
        foreach ($xpath->query('//*[@data-translate or @data-translate-html]') ?: array() as $node) {
            if (!$node instanceof DOMElement) continue;
            $key = trim($node->getAttribute($node->hasAttribute('data-translate') ? 'data-translate' : 'data-translate-html'));
            if ($key === '' || isset($bindings[$key])) continue;
            $attribute = trim($node->getAttribute('data-translate-attr'));
            $attributeName = trim(explode(',', $attribute)[0] ?? '');
            $value = $attributeName !== '' ? $node->getAttribute($attributeName) : $node->textContent;
            $bindings[$key] = array('page' => $page, 'text' => frontend_import_plain($value), 'attribute' => $attributeName !== '');
        }
    }
    return $bindings;
}

function frontend_import_group(string $key): ?string
{
    if (str_starts_with($key, 'about_')) return 'about';
    if (str_starts_with($key, 'services_')) {
        if (preg_match('/(?:_form_|_label$|_placeholder$|_submit$|_cancel$|_field_|_type_|_payment_|_education_|_age$|_job$|_address$|_consent$|_availability_)/', $key)) return null;
        return 'services';
    }
    if (str_starts_with($key, 'programs_eco_')) return 'eco-school';
    if (str_starts_with($key, 'home_tools_')) return 'islamic-tools';
    if (preg_match('/^(pt_(title|subtitle|note)|zakat_(title|subtitle)|z_(assets_help|debts_help|price_help|review_help|note|health_distinction|health_link|privacy_note))$/', $key)) return 'islamic-tools';
    if (str_starts_with($key, 'footer_') || $key === 'index_footer_address') return 'footer';
    if (str_starts_with($key, 'shop_')) {
        if (preg_match('/^shop_(tshirt|cap|badge_|choose|selected|size|color|qty|filter_|search_)/', $key)) return null;
        return 'shop';
    }
    if (preg_match('/^(index|about|services|programs|news|shop|contact)_(title|meta_description)$/', $key)) return 'seo';
    return null;
}

function frontend_import_translations(array $dictionary, array $bindings, array $fieldKeys): array
{
    $translations = empty_translations(array_keys($fieldKeys));
    foreach ($fieldKeys as $field => $keys) {
        $keys = (array)$keys;
        foreach (array('ar', 'fr', 'en') as $language) {
            $parts = array();
            foreach ($keys as $key) {
                $value = $language === 'ar' ? (string)($bindings[$key]['text'] ?? '') : (string)($dictionary[$language][$key] ?? '');
                $value = frontend_import_plain($value);
                if ($value !== '') $parts[] = $value;
            }
            $translations[$language][$field] = implode("\n\n", $parts);
        }
    }
    return $translations;
}

function frontend_import_record(string $id, array $translations, int $order, array $extra = array(), array $verification = array()): array
{
    $now = date(DATE_ATOM);
    $record = array_merge(array(
        'id' => $id, 'translations' => $translations, 'status' => 'draft', 'image_id' => '', 'order' => $order,
        'owns_frontend' => false, 'created_at' => $now, 'updated_at' => $now, 'revision' => 1,
    ), $extra);
    $hashable = $record;
    foreach (array('created_at', 'updated_at', 'revision', 'status', 'owns_frontend', 'import_meta') as $field) unset($hashable[$field]);
    $record['import_meta'] = array(
        'source' => 'static-frontend',
        'source_hash' => hash('sha256', encode_json($hashable)),
        'verification' => array_values($verification),
        'imported_at' => null,
    );
    return $record;
}

function frontend_import_media_candidate(string $root, string $relativePath, array $altTranslations, int $order): array
{
    $relativePath = ltrim(str_replace('\\', '/', $relativePath), '/');
    $absolute = realpath($root . '/' . $relativePath);
    $imagesRoot = realpath($root . '/images');
    if ($absolute === false || $imagesRoot === false || !str_starts_with(strtolower(str_replace('\\', '/', $absolute)), strtolower(str_replace('\\', '/', $imagesRoot)) . '/')) {
        throw new RuntimeException('صورة مفقودة أو خارج مجلد الصور: ' . $relativePath);
    }
    $metadata = image_metadata($absolute);
    $slug = strtolower(pathinfo($relativePath, PATHINFO_FILENAME));
    $slug = trim(preg_replace('/[^a-z0-9]+/', '-', $slug) ?? '', '-');
    $id = 'static-' . ($slug !== '' ? $slug : substr(hash('sha256', $relativePath), 0, 12));
    $translations = empty_translations(array('caption', 'alt'));
    foreach (array('ar', 'fr', 'en') as $language) {
        $translations[$language]['alt'] = trim((string)($altTranslations[$language] ?? '')) ?: basename($relativePath);
        $translations[$language]['caption'] = $translations[$language]['alt'];
    }
    $record = frontend_import_record($id, $translations, $order, array(
        'path' => '/' . $relativePath, 'thumbnail_path' => '', 'original_name' => basename($relativePath),
        'mime' => $metadata['mime'], 'size' => filesize($absolute) ?: 0, 'width' => $metadata['width'], 'height' => $metadata['height'],
    ));
    // A media-library registration exposes only the already-public image path;
    // it does not publish any article/page. It must be selectable immediately.
    $record['status'] = 'published';
    $record['owns_frontend'] = true;
    return $record;
}

function frontend_import_candidates(): array
{
    $root = AMJAD_ROOT;
    $pages = array('index.html', 'about.html', 'services.html', 'programs.html', 'news.html', 'shop.html', 'contact.html');
    $dictionary = frontend_import_dictionary($root . '/js/translations.js');
    $bindings = frontend_import_bindings($root, $pages);
    $candidates = array_fill_keys(allowed_collections(), array());
    $warnings = array();
    $order = 0;

    foreach ($bindings as $key => $binding) {
        $group = frontend_import_group($key);
        if ($group === null || $binding['text'] === '' || preg_match('/(?:countdown|remaining|last_update|data_date|result|compute|error|refresh)$/', $key)) continue;
        $id = 'section-' . trim(preg_replace('/[^a-z0-9-]+/', '-', str_replace('_', '-', strtolower($key))) ?? '', '-');
        if (!stable_id_is_valid($id)) continue;
        $translations = frontend_import_translations($dictionary, $bindings, array('text' => $key));
        $candidates['sections'][$id] = frontend_import_record($id, $translations, $order++, array(
            'page' => $group === 'footer' ? '*' : $binding['page'], 'group' => $group, 'binding_key' => $key,
            'binding_kind' => $binding['attribute'] ? 'attribute' : 'text', 'url' => '',
        ));
    }

    [$programDom, $programXpath] = frontend_import_dom($root . '/programs.html');
    $programCards = $programXpath->query('//*[@data-cms-id and contains(concat(" ", normalize-space(@class), " "), " project-card ")]') ?: array();
    $programFamily = array('academy'=>'education','school'=>'education','activities'=>'education','mornings'=>'education','camp'=>'education','warmth'=>'social','iftar'=>'social','zakat'=>'social','ambassadors'=>'social','orphans'=>'social','relief'=>'social');
    $programDetail = array('academy'=>'academy','school'=>'school','activities'=>'','mornings'=>'','camp'=>'','warmth'=>'warmth','iftar'=>'iftar','zakat'=>'zakat','ambassadors'=>'','orphans'=>'','relief'=>'');
    foreach ($programCards as $card) {
        if (!$card instanceof DOMElement) continue;
        $id = $card->getAttribute('data-cms-id');
        if (!isset($programFamily[$id])) continue;
        $titleNode = $programXpath->query('.//h4[@data-translate]', $card)?->item(0);
        $summaryNode = $programXpath->query('.//p[@data-translate or @data-translate-html]', $card)?->item(0);
        $titleKey = $titleNode instanceof DOMElement ? $titleNode->getAttribute('data-translate') : '';
        $summaryKey = $summaryNode instanceof DOMElement ? ($summaryNode->getAttribute('data-translate') ?: $summaryNode->getAttribute('data-translate-html')) : '';
        $detailKeys = array();
        $detailId = $programDetail[$id];
        if ($detailId !== '') {
            $detail = $programXpath->query('//*[@id="' . $detailId . '-detail"]')?->item(0);
            $firstColumn = $detail instanceof DOMElement ? $programXpath->query('.//div[contains(concat(" ", normalize-space(@class), " "), " grid ")]/div[1]', $detail)?->item(0) : null;
            if ($firstColumn instanceof DOMElement) {
                foreach ($programXpath->query('.//*[@data-translate or @data-translate-html]', $firstColumn) ?: array() as $node) {
                    if (!$node instanceof DOMElement) continue;
                    $key = $node->getAttribute('data-translate') ?: $node->getAttribute('data-translate-html');
                    if ($key !== '' && !str_contains($key, '_stat_')) $detailKeys[] = $key;
                }
            }
        }
        $verification = array();
        if (!$detailKeys) { $detailKeys = array($summaryKey); $verification[] = 'لا توجد صفحة تفاصيل؛ المحتوى الكامل يساوي الملخص ويحتاج مراجعة تحريرية.'; }
        $translations = frontend_import_translations($dictionary, $bindings, array(
            'title' => $titleKey, 'summary' => $summaryKey, 'body' => $detailKeys, 'cta_text' => 'programs_discover_cta',
        ));
        $imageNode = $programXpath->query('.//img[@src]', $card)?->item(0);
        $imagePath = $imageNode instanceof DOMElement ? $imageNode->getAttribute('src') : '';
        $imageId = '';
        if ($imagePath !== '') {
            $altKey = $imageNode->getAttribute('data-translate');
            $alt = array('ar' => frontend_import_plain($imageNode->getAttribute('alt')), 'fr' => $dictionary['fr'][$altKey] ?? '', 'en' => $dictionary['en'][$altKey] ?? '');
            try {
                $media = frontend_import_media_candidate($root, $imagePath, $alt, $order++);
                $imageId = $media['id']; $candidates['media'][$imageId] ??= $media;
            } catch (Throwable $error) { $warnings[] = $error->getMessage(); $verification[] = $error->getMessage(); }
        }
        $record = frontend_import_record($id, $translations, $order++, array('image_id'=>$imageId,'family_id'=>$programFamily[$id],'detail_view_id'=>$detailId), $verification);
        $candidates['programs'][$id] = $record;
    }

    [$newsDom, $newsXpath] = frontend_import_dom($root . '/news.html');
    $newsDates = array('news1'=>'2025-10-15','news2'=>'2025-11-27','news3'=>'2025-09-28','news4'=>'2025-10-19','news5'=>'2025-10-11','news6'=>'2025-09-10','news7'=>'');
    foreach ($newsXpath->query('//*[@data-cms-id and contains(concat(" ", normalize-space(@class), " "), " news-card ")]') ?: array() as $card) {
        if (!$card instanceof DOMElement) continue;
        $id = $card->getAttribute('data-cms-id');
        if (!isset($newsDates[$id])) continue;
        $titleNode = $newsXpath->query('.//h3[@data-translate]', $card)?->item(0);
        $summaryNode = $newsXpath->query('.//p[@data-translate or @data-translate-html]', $card)?->item(0);
        $titleKey = $titleNode instanceof DOMElement ? $titleNode->getAttribute('data-translate') : '';
        $summaryKey = $summaryNode instanceof DOMElement ? ($summaryNode->getAttribute('data-translate') ?: $summaryNode->getAttribute('data-translate-html')) : '';
        $bodyKeys = array();
        $detail = $newsXpath->query('//*[@id="' . $id . '-detail"]//*[contains(concat(" ", normalize-space(@class), " "), " prose ")]')?->item(0);
        if ($detail instanceof DOMElement) {
            foreach ($newsXpath->query('.//*[@data-translate or @data-translate-html]', $detail) ?: array() as $node) {
                if (!$node instanceof DOMElement) continue;
                $key = $node->getAttribute('data-translate') ?: $node->getAttribute('data-translate-html');
                if ($key !== '') $bodyKeys[] = $key;
            }
        }
        $verification = array();
        if (!$bodyKeys) { $bodyKeys[] = $summaryKey; $verification[] = 'تعذر العثور على نص التفاصيل؛ استُخدم الملخص مؤقتاً.'; }
        if ($newsDates[$id] === '') $verification[] = 'المصدر يذكر سنة 2025 فقط؛ التاريخ الكامل غير موثق ولم يتم اختلاقه.';
        $translations = frontend_import_translations($dictionary, $bindings, array('title'=>$titleKey,'summary'=>$summaryKey,'body'=>$bodyKeys));
        $imageNode = $newsXpath->query('.//img[@src]', $card)?->item(0);
        $imagePath = $imageNode instanceof DOMElement ? $imageNode->getAttribute('src') : '';
        $imageId = '';
        if ($imagePath !== '') {
            $altKey = $imageNode->getAttribute('data-translate');
            $alt = array('ar'=>frontend_import_plain($imageNode->getAttribute('alt')),'fr'=>$dictionary['fr'][$altKey] ?? '','en'=>$dictionary['en'][$altKey] ?? '');
            try {
                $media = frontend_import_media_candidate($root, $imagePath, $alt, $order++);
                $imageId = $media['id']; $candidates['media'][$imageId] ??= $media;
            } catch (Throwable $error) { $warnings[] = $error->getMessage(); $verification[] = $error->getMessage(); }
        }
        $category = $card->getAttribute('data-category');
        $candidates['news'][$id] = frontend_import_record($id, $translations, $order++, array(
            'image_id'=>$imageId,'category'=>in_array($category,array('news','events','announcements','programs'),true)?$category:'news','published_at'=>$newsDates[$id],
        ), $verification);
    }

    $hero = frontend_import_translations($dictionary, $bindings, array('title'=>'heroTitle','subtitle'=>'index_hero_subtitle','cta_text'=>'index_hero_cta','text_block'=>'index_hero_badge'));
    $candidates['pages']['hero'] = frontend_import_record('hero', $hero, $order++, array('settings'=>array('cta_link'=>'contact.html','years'=>4,'volunteers'=>80,'beneficiaries'=>2500)));
    $messageKeys = array('index_president_paragraph_1','index_president_paragraph_2','index_president_paragraph_3','index_president_paragraph_4');
    $president = frontend_import_translations($dictionary, $bindings, array('name'=>'index_president_signature_title','role'=>'index_president_card_title','organization'=>'index_president_signature_org','motto'=>'index_president_motto_text','message'=>$messageKeys,'vision'=>'index_president_vision_text','mission'=>'index_president_mission_text'));
    $presidentImage = '';
    try {
        $alt = array('ar'=>$bindings['index_president_alt']['text'] ?? 'الرئيس','fr'=>$dictionary['fr']['index_president_alt'] ?? '','en'=>$dictionary['en']['index_president_alt'] ?? '');
        $media = frontend_import_media_candidate($root, 'images/mustapha.png', $alt, $order++); $presidentImage = $media['id']; $candidates['media'][$presidentImage] ??= $media;
    } catch (Throwable $error) { $warnings[] = $error->getMessage(); }
    $candidates['pages']['president'] = frontend_import_record('president', $president, $order++, array('image_id'=>$presidentImage,'settings'=>array()));
    $contact = frontend_import_translations($dictionary, $bindings, array('address'=>array('contact_address_city','contact_address_street','contact_address_landmark'),'opening_hours'=>'contact_phone_hours'));
    $candidates['pages']['contact'] = frontend_import_record('contact', $contact, $order++, array('settings'=>array('phone'=>'','email'=>'contact@associationamjad.ma','secondary_email'=>'','map_url'=>'','facebook'=>'','instagram'=>'','x'=>'','youtube'=>'','tiktok'=>'','linkedin'=>'')), array('رقم الهاتف والروابط الاجتماعية غير موثقة في الواجهة وتحتاج مراجعة.'));

    $productMap = array('tshirt'=>array('tshirt','T-shirt','shop_tshirt_title','shop_tshirt_desc','shop_badge_best'),'cap'=>array('cap','Cap','shop_cap_title','shop_cap_desc','shop_badge_new'));
    foreach ($productMap as $id => $map) {
        [$kind,$code,$titleKey,$summaryKey,$availableKey] = $map;
        $translations = frontend_import_translations($dictionary, $bindings, array('title'=>$titleKey,'summary'=>$summaryKey,'availability_label'=>$availableKey));
        $candidates['products'][$id] = frontend_import_record($id,$translations,$order++,array('kind'=>$kind,'product_code'=>$code,'price'=>0,'currency'=>'MAD','sizes'=>$id==='tshirt'?array('S','M','L','XL'):array('OneSize'),'colors'=>array('Black','White','Green'),'available'=>true),array('السعر غير موثق؛ القيمة 0 تعني أنه يجب تحديد السعر قبل النشر.'));
    }

    return array('candidates'=>$candidates,'warnings'=>array_values(array_unique($warnings)),'source_pages'=>$pages);
}

function frontend_import_compare(array $candidate, ?array $existing): string
{
    if ($existing === null) return 'needs_import';
    $sourceHash = (string)($candidate['import_meta']['source_hash'] ?? '');
    if (($existing['import_meta']['source'] ?? '') === 'static-frontend' && hash_equals($sourceHash, (string)($existing['import_meta']['source_hash'] ?? ''))) return 'already_imported';
    return 'conflict';
}

function frontend_import_analysis(): array
{
    $built = frontend_import_candidates();
    $items = array(); $counts = array('found'=>0,'needs_import'=>0,'already_imported'=>0,'conflicts'=>0,'missing_images'=>count($built['warnings']),'missing_translations'=>0,'verification_required'=>0);
    foreach ($built['candidates'] as $collection => $records) {
        $document = read_collection($collection); $existing = array_column($document['items'], null, 'id');
        foreach ($records as $id => $candidate) {
            $state = frontend_import_compare($candidate, $existing[$id] ?? null);
            $missing = array();
            foreach ((array)($candidate['translations'] ?? array()) as $language => $fields) foreach ((array)$fields as $field => $value) if (trim((string)$value) === '') $missing[] = $language . ':' . $field;
            $verification = (array)($candidate['import_meta']['verification'] ?? array());
            $title = translated_value($candidate, 'title') ?: translated_value($candidate, 'caption') ?: translated_value($candidate, 'text') ?: $id;
            $items[] = array('key'=>$collection.':'.$id,'collection'=>$collection,'id'=>$id,'title'=>$title,'state'=>$state,'missing_translations'=>$missing,'verification'=>$verification,'image_id'=>(string)($candidate['image_id'] ?? ''));
            $counts['found']++; $counts[$state === 'conflict' ? 'conflicts' : $state]++;
            if ($missing) $counts['missing_translations']++;
            if ($verification) $counts['verification_required']++;
        }
    }
    return array('generated_at'=>date(DATE_ATOM),'counts'=>$counts,'items'=>$items,'warnings'=>$built['warnings'],'candidates'=>$built['candidates'],'source_pages'=>$built['source_pages']);
}

function frontend_import_backup(): array
{
    initialize_storage_directories();
    $runId = date('Ymd-His') . '-' . bin2hex(random_bytes(3));
    $directory = AMJAD_IMPORT_DIR . '/frontend-' . $runId;
    ensure_private_directory($directory . '/backup/private'); ensure_private_directory($directory . '/backup/public');
    $files = array();
    foreach (allowed_collections() as $collection) {
        foreach (array(collection_file($collection)=>$directory.'/backup/private/'.$collection.'.json', AMJAD_PUBLIC_DATA_DIR.'/'.$collection.'.json'=>$directory.'/backup/public/'.$collection.'.json') as $source=>$target) {
            if (!is_file($source)) continue;
            if (!copy($source, $target)) throw new RuntimeException('تعذر إنشاء نسخة احتياطية قبل الاستيراد.');
            $files[] = array('source'=>$source,'backup'=>$target,'sha256'=>hash_file('sha256',$target));
        }
    }
    $manifest = array('run_id'=>$runId,'created_at'=>date(DATE_ATOM),'files'=>$files,'static_images_unchanged'=>true);
    atomic_write_file($directory . '/backup/manifest.json', encode_json($manifest));
    return array('run_id'=>$runId,'directory'=>$directory,'manifest'=>$manifest);
}

function frontend_import_apply(array $selectedKeys): array
{
    $selectedKeys = array_values(array_unique(array_filter(array_map('strval', $selectedKeys))));
    if (!$selectedKeys) throw new InvalidArgumentException('اختر عنصراً واحداً على الأقل للاستيراد.');
    $analysis = frontend_import_analysis();
    $select = array_fill_keys($selectedKeys, true);
    $backup = frontend_import_backup();
    $result = array('run_id'=>$backup['run_id'],'generated_at'=>date(DATE_ATOM),'selected'=>count($selectedKeys),'added'=>array(),'skipped'=>array(),'conflicts'=>array(),'backup_manifest'=>$backup['directory'].'/backup/manifest.json');
    foreach (allowed_collections() as $collection) {
        $records = $analysis['candidates'][$collection] ?? array();
        if (!$records) continue;
        $document = read_collection($collection); $existing = array_column($document['items'], null, 'id'); $changed = false;
        foreach ($records as $id => $candidate) {
            $key = $collection . ':' . $id;
            if (!isset($select[$key])) continue;
            $state = frontend_import_compare($candidate, $existing[$id] ?? null);
            if ($state === 'already_imported') { $result['skipped'][] = $key; continue; }
            if ($state === 'conflict') { $result['conflicts'][] = $key; continue; }
            if (!in_array($collection, array('media', 'pages'), true)) validate_content_item($collection, $candidate);
            $candidate['import_meta']['imported_at'] = date(DATE_ATOM);
            $document['items'][] = $candidate; $existing[$id] = $candidate; $changed = true; $result['added'][] = $key;
        }
        if ($changed) write_collection($collection, $document['items'], (int)$document['_meta']['revision'], 'frontend-import');
    }
    $result['counts'] = array('added'=>count($result['added']),'skipped'=>count($result['skipped']),'conflicts'=>count($result['conflicts']));
    atomic_write_file($backup['directory'] . '/report.json', encode_json($result));
    audit_event('frontend-import', 'all', '', array('run_id'=>$backup['run_id'],'counts'=>$result['counts']));
    return $result;
}
