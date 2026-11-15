<?php
declare(strict_types=1);

$root = dirname(__DIR__);
$sandbox = sys_get_temp_dir() . DIRECTORY_SEPARATOR . 'amjad-evaluation-test-' . bin2hex(random_bytes(6));
putenv('AMJAD_STORAGE_DIR=' . $sandbox . DIRECTORY_SEPARATOR . 'private');
putenv('AMJAD_PUBLIC_DATA_DIR=' . $sandbox . DIRECTORY_SEPARATOR . 'public');
putenv('AMJAD_UPLOAD_DIR=' . $sandbox . DIRECTORY_SEPARATOR . 'uploads');
putenv('AMJAD_TEST_MODE=1');

$removeTree = static function (string $directory) use (&$removeTree): void {
    if (!is_dir($directory)) {
        return;
    }
    foreach (new FilesystemIterator($directory) as $item) {
        if ($item->isDir() && !$item->isLink()) {
            $removeTree($item->getPathname());
        } else {
            @unlink($item->getPathname());
        }
    }
    @rmdir($directory);
};
register_shutdown_function(static function () use ($sandbox, $removeTree): void {
    if (strpos($sandbox, sys_get_temp_dir() . DIRECTORY_SEPARATOR . 'amjad-evaluation-test-') === 0) {
        $removeTree($sandbox);
    }
});

require $root . '/admin/includes/config.php';
require $root . '/admin/includes/security.php';
require $root . '/admin/includes/storage.php';
require $root . '/admin/includes/evaluations.php';

$checks = 0;
$assert = static function (bool $condition, string $message) use (&$checks): void {
    $checks++;
    if (!$condition) {
        throw new RuntimeException('FAILED: ' . $message);
    }
};
$rejects = static function (callable $operation, string $code, string $message) use ($assert): void {
    try {
        $operation();
        $assert(false, $message);
    } catch (EvaluationRequestException $error) {
        $assert($error->errorCode() === $code, $message);
    }
};

$responses = array();
for ($id = 1; $id <= 40; $id++) {
    $responses['q' . $id] = null;
}
$responses['q1'] = 'المشاركة المباشرة والمتابعة معاً.';
$responses['q4'] = '5';
$responses['q7'] = 'تجربة مفيدة دون ذكر أي اسم.';
$responses['q18'] = array('مجموعات واتساب.', 'قناة أخرى.');
$responses['q37'] = array('تطوير الحكامة والتنظيم الداخلي.', 'تحسين التواصل والإعلام والتوثيق.');
$validPayload = array(
    'survey_version' => evaluation_survey_version(),
    'responses' => $responses,
    'other_details' => array('q18' => 'نشرة داخل التطبيق.'),
    'website' => '',
);

$validated = evaluation_validate_payload($validPayload);
$assert($validated['answered_count'] === 5, 'optional answers are counted after strict normalization');
$assert(count($validated['responses']) === 40, 'all q1 through q40 are normalized');
$emptyPayload = array('survey_version' => evaluation_survey_version(), 'responses' => array(), 'website' => '');
$emptyValidated = evaluation_validate_payload($emptyPayload);
$assert($emptyValidated['answered_count'] === 0 && count($emptyValidated['responses']) === 40, 'all questions can be skipped');
$record = evaluation_store_submission($validated);
$files = evaluation_response_files();
$assert(count($files) === 1, 'one private JSON response is written');
$stored = evaluation_read_submission($files[0]);
$assert($stored !== null && $stored['submission_id'] === $record['submission_id'], 'stored response round trips');
$assert(array_keys($stored) === array('schema_version', 'survey_version', 'submission_id', 'submitted_at', 'answered_count', 'responses', 'other_details'), 'stored record contains only the allowlisted response fields');
foreach (array('name', 'email', 'phone', 'ip', 'user_agent', 'session_id') as $forbidden) {
    $assert(!array_key_exists($forbidden, $stored), 'stored response omits ' . $forbidden);
}

$tooMany = $validPayload;
$tooMany['responses']['q18'] = array('مجموعات واتساب.', 'البريد الإلكتروني.', 'الاتصال الهاتفي.');
$rejects(static fn() => evaluation_validate_payload($tooMany), 'too_many_choices', 'q18 maximum is enforced');
$invalidChoice = $validPayload;
$invalidChoice['responses']['q4'] = '6';
$rejects(static fn() => evaluation_validate_payload($invalidChoice), 'invalid_choice', 'scale values are allowlisted');
$unknownQuestion = $validPayload;
$unknownQuestion['responses']['q41'] = 'unexpected';
$rejects(static fn() => evaluation_validate_payload($unknownQuestion), 'unknown_question', 'unknown questions are rejected');
$longText = $validPayload;
$longText['responses']['q7'] = str_repeat('x', 4001);
$rejects(static fn() => evaluation_validate_payload($longText), 'answer_too_long', 'free text length is limited');
$contactDetail = $validPayload;
$contactDetail['responses']['q7'] = 'تواصلوا معي عبر member@example.org';
$rejects(static fn() => evaluation_validate_payload($contactDetail), 'direct_identifier_detected', 'obvious contact details are rejected instead of stored');
$orphanDetail = $validPayload;
$orphanDetail['responses']['q18'] = array('مجموعات واتساب.');
$rejects(static fn() => evaluation_validate_payload($orphanDetail), 'orphan_other_detail', 'other detail requires its matching choice');

$_SESSION = array(
    'evaluation_csrf_token' => 'test-token',
    'evaluation_started_at' => time() - evaluation_minimum_duration_seconds() - 1,
);
evaluation_assert_submission_guard($validPayload, 'test-token');
$assert(true, 'valid session guard passes');
$botPayload = $validPayload;
$botPayload['website'] = 'https://spam.example';
$rejects(static fn() => evaluation_assert_submission_guard($botPayload, 'test-token'), 'invalid_submission', 'honeypot is enforced');
$_SESSION['evaluation_started_at'] = time();
$rejects(static fn() => evaluation_assert_submission_guard($validPayload, 'test-token'), 'submitted_too_quickly', 'minimum completion time is enforced');
$_SESSION['evaluation_started_at'] = time() - 60;
$_SESSION['evaluation_last_submit_at'] = time();
$rejects(static fn() => evaluation_assert_submission_guard($validPayload, 'test-token'), 'rate_limited', 'session submission rate is limited');

$_SERVER['HTTP_HOST'] = 'amjad.test';
$_SERVER['HTTP_ORIGIN'] = 'http://amjad.test';
$_SERVER['HTTP_SEC_FETCH_SITE'] = 'same-origin';
$assert(evaluation_request_is_same_origin(), 'matching origin is accepted');
$_SERVER['HTTP_ORIGIN'] = 'https://attacker.example';
$_SERVER['HTTP_SEC_FETCH_SITE'] = 'cross-site';
$assert(!evaluation_request_is_same_origin(), 'cross-site submission is rejected');

$stats = evaluation_statistics();
$assert($stats['count'] === 1 && (float)$stats['average_answered'] === 5.0, 'admin statistics use valid private records');

fwrite(STDOUT, "Evaluation backend checks passed: {$checks}\n");
