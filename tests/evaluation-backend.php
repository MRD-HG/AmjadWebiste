<?php
declare(strict_types=1);

$root = dirname(__DIR__);

if (($argv[1] ?? '') === 'concurrency-worker') {
    $workerSandbox = (string)($argv[2] ?? '');
    $workerPayloadPath = (string)($argv[3] ?? '');
    if ($workerSandbox === '' || $workerPayloadPath === '') {
        fwrite(STDERR, "Missing concurrency worker arguments.\n");
        exit(2);
    }
    putenv('AMJAD_STORAGE_DIR=' . $workerSandbox . DIRECTORY_SEPARATOR . 'private');
    putenv('AMJAD_PUBLIC_DATA_DIR=' . $workerSandbox . DIRECTORY_SEPARATOR . 'public');
    putenv('AMJAD_UPLOAD_DIR=' . $workerSandbox . DIRECTORY_SEPARATOR . 'uploads');
    putenv('AMJAD_TEST_MODE=1');
    require $root . '/admin/includes/config.php';
    require $root . '/admin/includes/security.php';
    require $root . '/admin/includes/storage.php';
    require $root . '/admin/includes/evaluations.php';
    try {
        $workerPayload = json_decode((string)file_get_contents($workerPayloadPath), true);
        if (!is_array($workerPayload)) {
            throw new RuntimeException('Invalid worker payload.');
        }
        $workerResult = evaluation_submit_idempotently(evaluation_validate_payload($workerPayload));
        fwrite(STDOUT, json_encode(array(
            'submission_id' => $workerResult['record']['submission_id'],
            'idempotent_replay' => $workerResult['idempotent_replay'],
        )) . "\n");
        exit(0);
    } catch (Throwable $error) {
        fwrite(STDERR, $error->getMessage() . "\n");
        exit(1);
    }
}

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
$rejects = static function (callable $operation, string $code, string $message, ?int $httpStatus = null) use ($assert): void {
    try {
        $operation();
        $assert(false, $message);
    } catch (EvaluationRequestException $error) {
        $matches = $error->errorCode() === $code && ($httpStatus === null || $error->httpStatus() === $httpStatus);
        $assert($matches, $message);
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
    'response_id' => '018f1c2a-7b3d-4e5f-8a9b-c0d1e2f3a4b5',
    'responses' => $responses,
    'other_details' => array('q18' => 'نشرة داخل التطبيق.'),
    'website' => '',
);

$validated = evaluation_validate_payload($validPayload);
$assert($validated['answered_count'] === 5, 'optional answers are counted after strict normalization');
$assert(count($validated['responses']) === 40, 'all q1 through q40 are normalized');
$assert($validated['response_id'] === $validPayload['response_id'], 'valid UUIDv4 response ID is normalized');
$emptyPayload = array('survey_version' => evaluation_survey_version(), 'response_id' => '928d71d3-04e7-4c86-b3ca-32fb783b9baa', 'responses' => array(), 'website' => '');
$emptyValidated = evaluation_validate_payload($emptyPayload);
$assert($emptyValidated['answered_count'] === 0 && count($emptyValidated['responses']) === 40, 'all questions can be skipped');
$created = evaluation_submit_idempotently($validated);
$record = $created['record'];
$assert($created['idempotent_replay'] === false, 'first use of a response ID creates a record');
$files = evaluation_response_files();
$assert(count($files) === 1, 'one private JSON response is written');
$assert(basename($files[0]) === $validPayload['response_id'] . '.json', 'response UUID selects a deterministic private record path');
$stored = evaluation_read_submission($files[0]);
$assert($stored !== null && $stored['submission_id'] === $record['submission_id'], 'stored response round trips');
$assert(array_keys($stored) === array('schema_version', 'survey_version', 'response_id', 'submission_id', 'submitted_at', 'answered_count', 'content_hash', 'responses', 'other_details'), 'stored record contains only the allowlisted response fields');
$assert($stored['schema_version'] === 2 && preg_match('/^[0-9a-f]{64}$/', (string)$stored['content_hash']) === 1, 'idempotent record schema and canonical hash are explicit');
foreach (array('name', 'email', 'phone', 'ip', 'user_agent', 'session_id') as $forbidden) {
    $assert(!array_key_exists($forbidden, $stored), 'stored response omits ' . $forbidden);
}

$beforeCreateCalled = false;
$reorderedReplayPayload = $validPayload;
$reorderedReplayPayload['responses']['q18'] = array('قناة أخرى.', 'مجموعات واتساب.');
$replayed = evaluation_submit_idempotently(evaluation_validate_payload($reorderedReplayPayload), static function () use (&$beforeCreateCalled): void {
    $beforeCreateCalled = true;
    throw new RuntimeException('Rate guard must not run for an idempotent replay.');
});
$assert($replayed['idempotent_replay'] === true, 'same response ID and canonical answers replay successfully');
$assert($replayed['record']['submission_id'] === $record['submission_id'], 'idempotent replay returns the original receipt');
$assert($beforeCreateCalled === false && count(evaluation_response_files()) === 1, 'idempotent replay resolves before rate limiting and creates no duplicate');

$changedReplayPayload = $validPayload;
$changedReplayPayload['responses']['q4'] = '4';
$rejects(static fn() => evaluation_submit_idempotently(evaluation_validate_payload($changedReplayPayload)), 'response_id_conflict', 'same response ID with different normalized answers conflicts', 409);
$assert(count(evaluation_response_files()) === 1, 'conflicting replay does not modify the original response');

$invalidResponseId = $validPayload;
$invalidResponseId['response_id'] = '018f1c2a-7b3d-1e5f-8a9b-c0d1e2f3a4b5';
$rejects(static fn() => evaluation_validate_payload($invalidResponseId), 'invalid_response_id', 'response ID must be a strict UUIDv4');

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
$longOtherDetail = $validPayload;
$longOtherDetail['other_details']['q18'] = str_repeat('x', 401);
$rejects(static fn() => evaluation_validate_payload($longOtherDetail), 'answer_too_long', 'other detail matches the 400-character frontend limit');

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
$_SESSION = array(
    'evaluation_csrf_token' => 'rotated-token',
    'evaluation_previous_csrf_token' => 'test-token',
    'evaluation_previous_response_id' => $validPayload['response_id'],
    'evaluation_previous_csrf_expires_at' => time() + 60,
);
evaluation_assert_submission_guard($validPayload, 'test-token', false);
$assert(true, 'short-lived previous CSRF token permits replay after the accepted session timer is cleared');
$differentResponse = $validPayload;
$differentResponse['response_id'] = $emptyPayload['response_id'];
$rejects(static fn() => evaluation_assert_submission_guard($differentResponse, 'test-token', false), 'csrf_failed', 'previous CSRF token cannot authorize a different response ID');

$_SERVER['HTTP_HOST'] = 'amjad.test';
$_SERVER['HTTP_ORIGIN'] = 'http://amjad.test';
$_SERVER['HTTP_SEC_FETCH_SITE'] = 'same-origin';
$assert(evaluation_request_is_same_origin(), 'matching origin is accepted');
$_SERVER['HTTP_ORIGIN'] = 'https://attacker.example';
$_SERVER['HTTP_SEC_FETCH_SITE'] = 'cross-site';
$assert(!evaluation_request_is_same_origin(), 'cross-site submission is rejected');

$concurrencyTested = false;
if (function_exists('proc_open')) {
    $concurrentPayload = $validPayload;
    $concurrentPayload['response_id'] = '6b67c1c9-9df2-4b97-a39b-bc2d2730a776';
    $workerPayloadPath = $sandbox . DIRECTORY_SEPARATOR . 'concurrency-payload.json';
    file_put_contents($workerPayloadPath, json_encode($concurrentPayload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));
    $descriptorSpec = array(
        0 => array('pipe', 'r'),
        1 => array('pipe', 'w'),
        2 => array('pipe', 'w'),
    );
    $workers = array();
    for ($workerIndex = 0; $workerIndex < 2; $workerIndex++) {
        $pipes = array();
        $process = proc_open(array(PHP_BINARY, __FILE__, 'concurrency-worker', $sandbox, $workerPayloadPath), $descriptorSpec, $pipes);
        if (!is_resource($process)) {
            throw new RuntimeException('FAILED: unable to start concurrency worker');
        }
        fclose($pipes[0]);
        $workers[] = array('process' => $process, 'stdout' => $pipes[1], 'stderr' => $pipes[2]);
    }
    $workerResults = array();
    foreach ($workers as $worker) {
        $stdout = stream_get_contents($worker['stdout']);
        $stderr = stream_get_contents($worker['stderr']);
        fclose($worker['stdout']);
        fclose($worker['stderr']);
        $exitCode = proc_close($worker['process']);
        $assert($exitCode === 0, 'concurrency worker exits successfully: ' . trim((string)$stderr));
        $decoded = json_decode((string)$stdout, true);
        $assert(is_array($decoded), 'concurrency worker returns JSON');
        $workerResults[] = $decoded;
    }
    $assert($workerResults[0]['submission_id'] === $workerResults[1]['submission_id'], 'concurrent duplicate calls return one submission receipt');
    $replayFlags = array($workerResults[0]['idempotent_replay'], $workerResults[1]['idempotent_replay']);
    sort($replayFlags);
    $assert($replayFlags === array(false, true), 'per-response lock creates once and replays once under concurrency');
    $assert(count(evaluation_response_files()) === 2, 'concurrent duplicate calls create exactly one additional response file');
    $concurrencyTested = true;
}

$stats = evaluation_statistics();
$expectedCount = $concurrencyTested ? 2 : 1;
$assert($stats['count'] === $expectedCount, 'admin statistics count idempotent records once');

fwrite(STDOUT, "Evaluation backend checks passed: {$checks}\n");
