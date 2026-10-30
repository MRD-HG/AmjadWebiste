<?php
declare(strict_types=1);
$root = dirname(__DIR__);
$sandbox = sys_get_temp_dir() . '/amjad-cms-test-' . bin2hex(random_bytes(5));
putenv('AMJAD_STORAGE_DIR=' . $sandbox . '/private');
putenv('AMJAD_PUBLIC_DATA_DIR=' . $sandbox . '/public');
putenv('AMJAD_UPLOAD_DIR=' . $sandbox . '/uploads');
putenv('AMJAD_UPLOAD_URL=/test-uploads');
putenv('AMJAD_TEST_MODE=1');
$_SERVER['HTTP_USER_AGENT'] = 'AmjadCmsFunctionalTest';
$_SERVER['REMOTE_ADDR'] = '127.0.0.1';
require $root . '/admin/includes/bootstrap.php';

$checks = 0;
$assert = static function (bool $condition, string $message) use (&$checks): void { $checks++; if (!$condition) throw new RuntimeException('FAILED: ' . $message); };

save_admin_credentials('cms-test-admin', 'A-strong-test-password-2026');
$credentials = read_admin_credentials();
$assert($credentials !== null && password_verify('A-strong-test-password-2026', $credentials['password_hash']), 'password hash round trip');
$assert(!password_verify('wrong', $credentials['password_hash']), 'wrong password rejected');

$program = array('id'=>'education-support','translations'=>empty_translations(collection_definition('programs')['translation_fields']),'status'=>'draft','order'=>1,'image_id'=>'','family_id'=>'education','detail_view_id'=>'education-support','created_at'=>date(DATE_ATOM),'updated_at'=>date(DATE_ATOM),'revision'=>1);
$program['translations']['ar']['title']='دعم التعليم'; $program['translations']['ar']['summary']='ملخص عربي'; $program['translations']['fr']['title']='Soutien éducatif';
validate_content_item('programs',$program);
$first = write_collection('programs',array($program),0,'test-create');
$assert($first['_meta']['revision'] === 1, 'collection revision increments');
$public = json_decode((string)file_get_contents(AMJAD_PUBLIC_DATA_DIR . '/programs.json'),true);
$assert(count($public['items']) === 0, 'draft excluded from public projection');
$assert(($public['_meta']['managed_ids'] ?? array()) === array('education-support'), 'draft ownership ID is published without draft content');
$assert(($public['_meta']['ownership_version'] ?? 0) === 1, 'ownership projection version is explicit');
$program['status']='published'; $program['revision']=2; $program['internal_secret']='must-not-publish';
$second = write_collection('programs',array($program),1,'test-publish');
$public = json_decode((string)file_get_contents(AMJAD_PUBLIC_DATA_DIR . '/programs.json'),true);
$assert(count($public['items']) === 1 && !isset($public['items'][0]['internal_secret']), 'published projection is allowlisted');
$assert($public['items'][0]['translations']['fr']['title'] === 'Soutien éducatif', 'multilingual content preserved');
try { write_collection('programs',array($program),1,'stale-write'); $assert(false,'stale write rejected'); } catch (ContentConflictException $expected) { $assert(true,'stale write rejected'); }
$revisions = list_revisions('programs'); $assert(count($revisions) >= 2,'revision snapshots created');
$restored = restore_revision('programs',$revisions[count($revisions)-1],2); $assert($restored['_meta']['revision'] === 3,'restore creates new revision');

$invalid = $program; $invalid['id']='BAD ID';
try { validate_content_item('programs',$invalid); $assert(false,'invalid stable ID rejected'); } catch (InvalidArgumentException $expected) { $assert(true,'invalid stable ID rejected'); }

$section = record_base_for_test('section-about-qa', empty_translations(collection_definition('sections')['translation_fields']));
$section['translations']['ar']['text'] = '<script>alert(1)</script> نص آمن';
$section += array('page'=>'about.html','group'=>'about','binding_key'=>'about_who_title','binding_kind'=>'text','url'=>'');
validate_content_item('sections',$section);
$sectionDocument = write_collection('sections',array($section),0,'test-section');
$assert($sectionDocument['_meta']['revision'] === 1,'section collection writes successfully');
$section['url']='javascript:alert(1)';
try { validate_content_item('sections',$section); $assert(false,'unsafe section URL rejected'); } catch (InvalidArgumentException $expected) { $assert(true,'unsafe section URL rejected'); }

$product = record_base_for_test('product-qa', empty_translations(collection_definition('products')['translation_fields']));
$product['translations']['ar']['title']='منتج اختبار'; $product['translations']['ar']['summary']='ملخص المنتج';
$product += array('kind'=>'bag','product_code'=>'QA-BAG','price'=>90,'currency'=>'MAD','sizes'=>array(),'colors'=>array('Green'),'available'=>true);
validate_content_item('products',$product); write_collection('products',array($product),0,'test-product-draft');
$productPublic = json_decode((string)file_get_contents(AMJAD_PUBLIC_DATA_DIR . '/products.json'),true);
$assert(count($productPublic['items']) === 0,'draft product excluded from projection');
$assert(($productPublic['_meta']['managed_ids'] ?? array()) === array('product-qa'),'draft product ownership excludes private fields');
$product['status']='published'; write_collection('products',array($product),1,'test-product-publish');
$productPublic = json_decode((string)file_get_contents(AMJAD_PUBLIC_DATA_DIR . '/products.json'),true);
$assert(($productPublic['items'][0]['product_code'] ?? '') === 'QA-BAG','published product projection includes allowlisted fields');

$memory = record_base_for_test('memory-qa', empty_translations(collection_definition('memory')['translation_fields']));
$memory['translations']['ar']['title']='ذاكرة اختبار'; $memory['translations']['ar']['summary']='ملخص موثق';
$memory += array('content_type'=>'article','source_url'=>'https://example.org/source','event_date'=>'2020-01-01','page_ref'=>'skhirat-memory');
validate_content_item('memory',$memory); $assert(true,'memory content validates');

ensure_private_directory($sandbox . '/fixtures');
$png = $sandbox . '/fixtures/tiny.png'; file_put_contents($png,base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII='));
$meta = image_metadata($png); $assert($meta['mime'] === 'image/png' && $meta['width'] === 1,'valid PNG accepted');
$svg = $sandbox . '/fixtures/bad.svg'; file_put_contents($svg,'<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>');
try { image_metadata($svg); $assert(false,'SVG rejected'); } catch (InvalidArgumentException $expected) { $assert(true,'SVG rejected'); }

$translations = array('ar'=>array('caption'=>'صورة','alt'=>'وصف بديل'),'fr'=>array('caption'=>'','alt'=>''),'en'=>array('caption'=>'','alt'=>''));
$uploadOne = $sandbox . '/fixtures/upload-one.png'; copy($png,$uploadOne);
$media = save_media_upload(array('error'=>UPLOAD_ERR_OK,'size'=>filesize($uploadOne),'tmp_name'=>$uploadOne,'name'=>'original.png'),$translations,0);
$assert(is_file(AMJAD_UPLOAD_DIR . substr($media['path'],strlen('/test-uploads'))),'validated media upload saved');
$uploadTwo = $sandbox . '/fixtures/upload-two.png'; copy($png,$uploadTwo);
$replacement = save_media_upload(array('error'=>UPLOAD_ERR_OK,'size'=>filesize($uploadTwo),'tmp_name'=>$uploadTwo,'name'=>'replacement.png'),$translations,1,$media);
$assert($replacement['id'] === $media['id'] && count($replacement['previous_files']) === 1,'media replacement preserves stable ID and history');
$currentPrograms = read_collection('programs'); $linked=$currentPrograms['items'][0]; $linked['status']='published';
$linked['image_id']=$replacement['id'];
write_collection('programs',array($linked),(int)$currentPrograms['_meta']['revision'],'test-link');
try { archive_media($replacement['id'],2); $assert(false,'referenced media archive blocked'); } catch (RuntimeException $expected) { $assert(true,'referenced media archive blocked'); }

$login = login_admin('cms-test-admin','A-strong-test-password-2026'); $assert($login['ok'] === true,'correct login accepted');
$_SESSION['last_activity_at'] = time() - AMJAD_SESSION_IDLE - 1;
$assert(session_is_valid() === false,'expired session rejected');

fwrite(STDOUT, "CMS functional checks passed: {$checks}\nSandbox: {$sandbox}\n");

function record_base_for_test(string $id, array $translations): array
{
    return array('id'=>$id,'translations'=>$translations,'status'=>'draft','order'=>1,'image_id'=>'','created_at'=>date(DATE_ATOM),'updated_at'=>date(DATE_ATOM),'revision'=>1);
}
