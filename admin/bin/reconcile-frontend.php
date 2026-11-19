<?php
declare(strict_types=1);

if (PHP_SAPI !== 'cli') { http_response_code(404); exit; }

require_once dirname(__DIR__) . '/includes/config.php';
require_once dirname(__DIR__) . '/includes/security.php';
require_once dirname(__DIR__) . '/includes/storage.php';
require_once dirname(__DIR__) . '/includes/content.php';
require_once dirname(__DIR__) . '/includes/media.php';
require_once dirname(__DIR__) . '/includes/frontend-import.php';

$apply = in_array('--apply', $argv, true);
$reportPath = '';
foreach ($argv as $argument) if (str_starts_with($argument, '--report=')) $reportPath = substr($argument, 9);

try {
    $analysis = frontend_import_analysis();
    if ($apply) {
        $selected = array_values(array_map(static fn(array $item): string => $item['key'], array_filter($analysis['items'], static fn(array $item): bool => $item['state'] === 'needs_import')));
        $result = $selected ? frontend_import_apply($selected) : array('generated_at'=>date(DATE_ATOM),'counts'=>array('added'=>0,'skipped'=>0,'conflicts'=>0),'added'=>array(),'skipped'=>array(),'conflicts'=>array(),'message'=>'Nothing new to import.');
        $output = array('mode'=>'apply','analysis'=>array_diff_key($analysis,array('candidates'=>true)),'result'=>$result);
    } else {
        $output = array('mode'=>'dry-run','analysis'=>array_diff_key($analysis,array('candidates'=>true)));
    }
    $json = encode_json($output);
    fwrite(STDOUT, $json);
    if ($reportPath !== '') {
        $absolute = preg_match('/^[A-Za-z]:[\\\\\/]/', $reportPath) ? $reportPath : AMJAD_ROOT . '/' . ltrim($reportPath, '/\\');
        atomic_write_file($absolute, $json, 0644);
    }
    fwrite(STDERR, $apply ? "Import complete. Existing IDs were never overwritten.\n" : "Dry run only. No files were changed.\n");
} catch (Throwable $error) {
    fwrite(STDERR, 'Import failed: ' . $error->getMessage() . "\n");
    exit(1);
}
