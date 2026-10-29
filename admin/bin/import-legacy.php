<?php
declare(strict_types=1);

if (PHP_SAPI !== 'cli') { http_response_code(404); exit; }
require_once dirname(__DIR__) . '/includes/bootstrap.php';

$source = $argv[1] ?? '';
$apply = in_array('--apply', $argv, true);
if ($source === '' || !is_dir($source)) {
    fwrite(STDERR, "Usage: php admin/bin/import-legacy.php <legacy-data-directory> [--apply]\n");
    exit(1);
}
$source = realpath($source) ?: '';
$files = array('programs','news','gallery','site','president','contact');
$loaded = array();
foreach ($files as $name) {
    $path = $source . DIRECTORY_SEPARATOR . $name . '.json';
    if (!is_file($path)) continue;
    $raw = file_get_contents($path);
    $data = json_decode((string)$raw, true);
    if (!is_array($data)) { fwrite(STDERR, "Invalid JSON: {$name}.json\n"); exit(1); }
    $loaded[$name] = array('raw'=>(string)$raw,'data'=>$data,'sha256'=>hash('sha256',(string)$raw));
}
fwrite(STDOUT, 'Validated legacy files: ' . implode(', ', array_keys($loaded)) . "\n");
if (!$apply) { fwrite(STDOUT, "Dry run only. Re-run with --apply to import without overwriting existing IDs.\n"); exit(0); }

$stamp = date('Ymd-His');
$importDir = AMJAD_IMPORT_DIR . '/' . $stamp;
ensure_private_directory($importDir);
$manifest = array('imported_at'=>date(DATE_ATOM),'source'=>$source,'files'=>array());
foreach ($loaded as $name => $entry) {
    atomic_write_file($importDir . '/' . $name . '.json', $entry['raw']);
    $manifest['files'][$name . '.json'] = $entry['sha256'];
}
atomic_write_file($importDir . '/manifest.json', encode_json($manifest));

$string = static function (array $row, array $keys): string { foreach ($keys as $key) if (isset($row[$key]) && is_scalar($row[$key])) return trim((string)$row[$key]); return ''; };
$mapTranslations = static function (array $row, array $fields) use ($string): array {
    $out = empty_translations($fields);
    $aliases = array('title'=>array('title','name'),'summary'=>array('short_description','description'),'body'=>array('content','description'),'cta_text'=>array('button_text'),'caption'=>array('title','caption'),'alt'=>array('alt','title'));
    foreach (array('ar','fr','en') as $language) foreach ($fields as $field) {
        $keys = array(); foreach ($aliases[$field] ?? array($field) as $alias) { $keys[] = $alias . '_' . $language; if ($language === 'ar') $keys[] = $alias; }
        $out[$language][$field] = $string($row, $keys);
    }
    return $out;
};

foreach (array('programs','news','gallery') as $collection) {
    if (!isset($loaded[$collection])) continue;
    $rows = array_values($loaded[$collection]['data']);
    $document = read_collection($collection); $existing = array_column($document['items'], null, 'id'); $definition = collection_definition($collection); $added = 0;
    foreach ($rows as $index => $row) {
        if (!is_array($row)) continue;
        $legacyId = strtolower(preg_replace('/[^a-z0-9-]+/', '-', (string)($row['id'] ?? '')) ?: '');
        $id = stable_id_is_valid($legacyId) ? $legacyId : 'legacy-' . rtrim($definition['prefix'],'-') . '-' . ($index + 1);
        if (isset($existing[$id])) continue;
        $item = array('id'=>$id,'translations'=>$mapTranslations($row,$definition['translation_fields']),'status'=>(($row['status'] ?? '') === 'published' ? 'published' : 'draft'),'order'=>(int)($row['order'] ?? $index),'image_id'=>'','created_at'=>date(DATE_ATOM),'updated_at'=>date(DATE_ATOM),'revision'=>1);
        if (isset($item['translations']['ar']['summary']) && $item['translations']['ar']['summary'] === '') $item['translations']['ar']['summary'] = $item['translations']['ar']['body'] ?? '';
        if (isset($item['translations']['ar']['alt']) && $item['translations']['ar']['alt'] === '') $item['translations']['ar']['alt'] = $item['translations']['ar']['caption'] ?? '';
        if ($collection === 'programs') { $item['family_id']='education'; $item['detail_view_id']=''; }
        if ($collection === 'news') {
            $item['category']='news';
            $legacyDate=$string($row,array('published_at','date'));
            $item['published_at']=preg_match('/^\d{4}-\d{2}-\d{2}$/',$legacyDate) ? $legacyDate : '';
        }
        if ($collection === 'gallery') $item['page_ref']='index';
        try { validate_content_item($collection,$item); } catch (Throwable $e) { fwrite(STDERR, "Skipped invalid {$collection} row " . ($index + 1) . "\n"); continue; }
        $document['items'][]=$item; $existing[$id]=$item; $added++;
    }
    if ($added) write_collection($collection,$document['items'],(int)$document['_meta']['revision'],'legacy-import');
    fwrite(STDOUT, "{$collection}: {$added} imported\n");
}

$pages = read_collection('pages');
$pageIndex = array_column($pages['items'], null, 'id');
$pageAdded = 0;
if (isset($loaded['site']['data']['hero']) && !isset($pageIndex['hero'])) {
    $row = (array)$loaded['site']['data']['hero']; $item = empty_page_item('hero');
    $item['translations'] = $mapTranslations($row, page_definition('hero')['translation_fields']);
    $item['status'] = 'draft'; $item['revision'] = 1;
    $item['settings'] = array('cta_link'=>$string($row,array('button_link','cta_link','link')),'years'=>(int)($row['years'] ?? 0),'volunteers'=>(int)($row['volunteers'] ?? 0),'beneficiaries'=>(int)($row['beneficiaries'] ?? 0));
    $pages['items'][]=$item; $pageAdded++;
}
if (isset($loaded['president']) && !isset($pageIndex['president'])) {
    $row = $loaded['president']['data']; $item = empty_page_item('president');
    foreach (array('ar','fr','en') as $language) foreach (page_definition('president')['translation_fields'] as $field) {
        $legacyField = $field === 'message' ? 'paragraphs' : $field; $value = $row[$legacyField . '_' . $language] ?? '';
        if (is_array($value)) $value = implode("\n\n", array_map('strval',$value));
        $item['translations'][$language][$field] = trim((string)$value);
    }
    $item['status']='draft'; $item['revision']=1; $pages['items'][]=$item; $pageAdded++;
}
if (isset($loaded['contact']) && !isset($pageIndex['contact'])) {
    $row = $loaded['contact']['data']; $item = empty_page_item('contact');
    foreach (array('ar','fr','en') as $language) { $item['translations'][$language]['address'] = $string($row,array('address_' . $language)); $item['translations'][$language]['opening_hours'] = $string($row,array('work_time_' . $language)); }
    $social = (array)($row['social'] ?? array());
    $item['settings']=array('phone'=>$string($row,array('phone')),'email'=>$string($row,array('email')),'secondary_email'=>$string($row,array('secondary_email')),'map_url'=>$string($row,array('map_link')),'facebook'=>(string)($social['facebook'] ?? ''),'instagram'=>(string)($social['instagram'] ?? ''),'x'=>(string)($social['x'] ?? ''),'youtube'=>(string)($social['youtube'] ?? ''),'tiktok'=>(string)($social['tiktok'] ?? ''),'linkedin'=>(string)($social['linkedin'] ?? ''));
    $item['status']='draft'; $item['revision']=1; $pages['items'][]=$item; $pageAdded++;
}
if ($pageAdded) write_collection('pages',$pages['items'],(int)$pages['_meta']['revision'],'legacy-import');
fwrite(STDOUT, "pages: {$pageAdded} imported as drafts\n");
audit_event('legacy-import','system','',array('manifest'=>$stamp));
fwrite(STDOUT, "Import complete. Original JSON and checksums preserved in private imports storage.\n");
