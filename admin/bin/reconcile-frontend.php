<?php
declare(strict_types=1);

if (PHP_SAPI !== 'cli') { http_response_code(404); exit; }

require_once dirname(__DIR__) . '/includes/config.php';
require_once dirname(__DIR__) . '/includes/security.php';
require_once dirname(__DIR__) . '/includes/storage.php';
require_once dirname(__DIR__) . '/includes/content.php';

$apply = in_array('--apply', $argv, true);
$publishVerified = in_array('--publish-verified', $argv, true);
$reportPath = '';
foreach ($argv as $argument) if (str_starts_with($argument, '--report=')) $reportPath = substr($argument, 9);
if ($publishVerified && !$apply) {
    fwrite(STDERR, "--publish-verified requires --apply.\n");
    exit(1);
}

$root = AMJAD_ROOT;
$pages = array('index.html','about.html','services.html','programs.html','news.html','shop.html','contact.html');
$translationFile = $root . '/js/translations.js';
if (!is_file($translationFile)) { fwrite(STDERR, "Missing translations.js\n"); exit(1); }

function parse_translation_dictionary(string $path): array
{
    $result = array('en'=>array(),'fr'=>array());
    $active = '';
    foreach (file($path, FILE_IGNORE_NEW_LINES) ?: array() as $line) {
        if (preg_match('/^\s*(en|fr)\s*:\s*\{\s*$/', $line, $match)) { $active = $match[1]; continue; }
        if ($active !== '' && preg_match('/^\s*}\s*,?\s*$/', $line)) { $active = ''; continue; }
        if ($active === '') continue;
        if (!preg_match('/^\s*([A-Za-z0-9_]+)\s*:\s*"((?:\\\\.|[^"\\\\])*)"\s*,?\s*$/u', $line, $match)) continue;
        $decoded = json_decode('"' . $match[2] . '"', true);
        $result[$active][$match[1]] = is_string($decoded) ? $decoded : stripcslashes($match[2]);
    }
    return $result;
}

function frontend_bindings(string $root, array $pages): array
{
    $bindings = array();
    libxml_use_internal_errors(true);
    foreach ($pages as $page) {
        $html = (string)file_get_contents($root . '/' . $page);
        $dom = new DOMDocument();
        $dom->loadHTML('<?xml encoding="utf-8" ?>' . $html, LIBXML_NOWARNING | LIBXML_NOERROR);
        $xpath = new DOMXPath($dom);
        foreach ($xpath->query('//*[@data-translate or @data-translate-html]') ?: array() as $node) {
            if (!$node instanceof DOMElement) continue;
            $key = trim($node->getAttribute($node->hasAttribute('data-translate') ? 'data-translate' : 'data-translate-html'));
            if ($key === '' || isset($bindings[$key])) continue;
            $attr = trim($node->getAttribute('data-translate-attr'));
            $value = $attr !== '' ? trim($node->getAttribute(explode(',', $attr)[0])) : trim(preg_replace('/\s+/u', ' ', $node->textContent) ?? '');
            $bindings[$key] = array('page'=>$page,'text'=>$value,'attribute'=>$attr !== '');
        }
    }
    libxml_clear_errors();
    return $bindings;
}

function section_group(string $key): ?string
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

function record_base(string $id, array $translations, int $order, string $status): array
{
    $now = date(DATE_ATOM);
    return array('id'=>$id,'translations'=>$translations,'status'=>$status,'image_id'=>'','order'=>$order,'created_at'=>$now,'updated_at'=>$now,'revision'=>1);
}

function translated_set(array $dictionary, array $bindings, string $key, string $field): array
{
    $out = empty_translations(array($field));
    $out['ar'][$field] = (string)($bindings[$key]['text'] ?? '');
    $out['fr'][$field] = (string)($dictionary['fr'][$key] ?? '');
    $out['en'][$field] = (string)($dictionary['en'][$key] ?? '');
    return $out;
}

$dictionary = parse_translation_dictionary($translationFile);
$bindings = frontend_bindings($root, $pages);
$status = $publishVerified ? 'published' : 'draft';
$candidates = array('sections'=>array(),'programs'=>array(),'news'=>array(),'products'=>array());
$assets = array();
$order = 0;

foreach ($bindings as $key => $binding) {
    $group = section_group($key);
    if ($group === null || $binding['text'] === '') continue;
    if (preg_match('/(?:countdown|remaining|last_update|data_date|result|compute|error|refresh)$/', $key)) continue;
    $id = 'section-' . trim(preg_replace('/[^a-z0-9-]+/', '-', str_replace('_', '-', strtolower($key))) ?? '', '-');
    if (!stable_id_is_valid($id)) continue;
    $item = record_base($id, translated_set($dictionary, $bindings, $key, 'text'), $order++, $status);
    $item += array('page'=>$group === 'footer' ? '*' : $binding['page'],'group'=>$group,'binding_key'=>$key,'binding_kind'=>$binding['attribute'] ? 'attribute' : 'text','url'=>'');
    $candidates['sections'][$id] = $item;
}

$programMap = array(
    'academy'=>array('education','academy','programs_edu_project_academy_title','programs_edu_project_academy_desc','images/brainwarm.jpeg'),
    'school'=>array('education','school','programs_edu_project_school_title','programs_edu_project_school_desc','images/event.jpg'),
    'activities'=>array('education','','programs_edu_project_activities_title','programs_edu_project_activities_desc',''),
    'mornings'=>array('education','','programs_edu_project_mornings_title','programs_edu_project_mornings_desc',''),
    'camp'=>array('education','','programs_edu_project_camp_title','programs_edu_project_camp_desc',''),
    'warmth'=>array('social','warmth','programs_social_project_warmth_title','programs_social_project_warmth_desc',''),
    'iftar'=>array('social','iftar','programs_social_project_iftar_title','programs_social_project_iftar_desc','images/Siyam.jpg'),
    'zakat'=>array('social','zakat','programs_social_project_zakat_title','programs_social_project_zakat_desc','images/blood.jpeg'),
    'ambassadors'=>array('social','','programs_social_project_ambassadors_title','programs_social_project_ambassadors_desc',''),
    'orphans'=>array('social','','programs_social_project_orphans_title','programs_social_project_orphans_desc',''),
    'relief'=>array('social','','programs_social_project_relief_title','programs_social_project_relief_desc',''),
);
foreach ($programMap as $id => $map) {
    [$family,$detail,$titleKey,$summaryKey,$asset] = $map;
    $translations = empty_translations(array('title','summary','body','cta_text'));
    foreach (array('ar','fr','en') as $lang) {
        $source = $lang === 'ar' ? $bindings : $dictionary[$lang];
        $translations[$lang]['title'] = (string)($lang === 'ar' ? ($source[$titleKey]['text'] ?? '') : ($source[$titleKey] ?? ''));
        $translations[$lang]['summary'] = (string)($lang === 'ar' ? ($source[$summaryKey]['text'] ?? '') : ($source[$summaryKey] ?? ''));
        $translations[$lang]['body'] = $translations[$lang]['summary'];
        $translations[$lang]['cta_text'] = (string)($lang === 'ar' ? ($bindings['programs_discover_cta']['text'] ?? '') : ($dictionary[$lang]['programs_discover_cta'] ?? ''));
    }
    $item = record_base($id,$translations,$order++,$status); $item += array('family_id'=>$family,'detail_view_id'=>$detail);
    $candidates['programs'][$id] = $item; if ($asset !== '') $assets[$asset] = is_file($root . '/' . $asset);
}

for ($number = 1; $number <= 7; $number++) {
    $id = 'news' . $number; $titleKey = 'news_card' . $number . '_title'; $summaryKey = 'news_card' . $number . '_desc';
    $translations = empty_translations(array('title','summary','body'));
    foreach (array('ar','fr','en') as $lang) {
        $source = $lang === 'ar' ? $bindings : $dictionary[$lang];
        $translations[$lang]['title'] = (string)($lang === 'ar' ? ($source[$titleKey]['text'] ?? '') : ($source[$titleKey] ?? ''));
        $translations[$lang]['summary'] = (string)($lang === 'ar' ? ($source[$summaryKey]['text'] ?? '') : ($source[$summaryKey] ?? ''));
        $detailKey = 'news_detail' . $number . '_intro';
        $translations[$lang]['body'] = (string)($lang === 'ar' ? ($bindings[$detailKey]['text'] ?? $translations[$lang]['summary']) : ($dictionary[$lang][$detailKey] ?? $translations[$lang]['summary']));
    }
    $categories = array(1=>'events',2=>'programs',3=>'programs',4=>'events',5=>'announcements',6=>'events',7=>'news');
    $dates = array(1=>'2025-10-15',2=>'2025-11-27',3=>'2025-09-28',4=>'2025-10-19',5=>'2025-10-11',6=>'2025-09-10',7=>'2025-01-01');
    $item = record_base($id,$translations,$order++,$status); $item += array('category'=>$categories[$number],'published_at'=>$dates[$number]);
    $candidates['news'][$id] = $item;
}

$productMap = array('tshirt'=>array('tshirt','T-shirt','shop_tshirt_title','shop_tshirt_desc','shop_badge_best'),'cap'=>array('cap','Cap','shop_cap_title','shop_cap_desc','shop_badge_new'));
foreach ($productMap as $id => $map) {
    [$kind,$code,$titleKey,$summaryKey,$availableKey] = $map;
    $translations = empty_translations(array('title','summary','availability_label'));
    foreach (array('ar','fr','en') as $lang) foreach (array('title'=>$titleKey,'summary'=>$summaryKey,'availability_label'=>$availableKey) as $field=>$key) {
        $translations[$lang][$field] = (string)($lang === 'ar' ? ($bindings[$key]['text'] ?? '') : ($dictionary[$lang][$key] ?? ''));
    }
    $item = record_base($id,$translations,$order++,$status); $item += array('kind'=>$kind,'product_code'=>$code,'price'=>0,'currency'=>'MAD','sizes'=>$id === 'tshirt' ? array('S','M','L','XL') : array('OneSize'),'colors'=>array('Black','White','Green'),'available'=>true);
    $candidates['products'][$id] = $item;
}

$report = array('mode'=>$apply ? 'apply' : 'dry-run','publish_verified'=>$publishVerified,'generated_at'=>date(DATE_ATOM),'collections'=>array(),'missing_assets'=>array(),'verification_required'=>array(),'invalid_details'=>array());
foreach ($assets as $path => $exists) if (!$exists) $report['missing_assets'][] = $path;

foreach ($candidates as $collection => $records) {
    $document = read_collection($collection); $existing = array_column($document['items'], null, 'id');
    $matched = $frontendOnly = $conflicts = $added = array();
    foreach ($records as $id => $candidate) {
        if (!isset($existing[$id])) { $frontendOnly[] = $id; continue; }
        $matched[] = $id;
        $comparison = $candidate; $current = $existing[$id];
        foreach (array('status','created_at','updated_at','revision','image_id') as $volatile) { unset($comparison[$volatile], $current[$volatile]); }
        if ($comparison != array_intersect_key($current, $comparison)) $conflicts[] = $id;
    }
    $cmsOnly = array_values(array_diff(array_keys($existing), array_keys($records)));
    if ($apply) {
        foreach ($frontendOnly as $id) {
            try { validate_content_item($collection, $records[$id]); }
            catch (Throwable $error) { $conflicts[] = $id . ':invalid'; $report['invalid_details'][$collection . ':' . $id] = $error->getMessage(); continue; }
            $document['items'][] = $records[$id]; $added[] = $id;
        }
        if ($added) write_collection($collection,$document['items'],(int)$document['_meta']['revision'],'frontend-reconciliation');
    }
    $report['collections'][$collection] = compact('matched','frontendOnly','cmsOnly','conflicts','added');
    if (!$publishVerified) foreach (array_keys($records) as $id) $report['verification_required'][] = $collection . ':' . $id;
}

$json = json_encode($report, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) . "\n";
fwrite(STDOUT, $json);
if ($reportPath !== '') {
    $absoluteReport = preg_match('/^[A-Za-z]:[\\\\\/]/', $reportPath) ? $reportPath : $root . '/' . ltrim($reportPath, '/\\');
    $directory = dirname($absoluteReport); if (!is_dir($directory)) mkdir($directory, 0775, true);
    file_put_contents($absoluteReport, $json);
}
fwrite(STDERR, $apply ? "Reconciliation complete. Existing IDs were never overwritten.\n" : "Dry run only. Use --apply to add frontend-only records as drafts.\n");
