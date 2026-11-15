<?php
declare(strict_types=1);

final class EvaluationRequestException extends RuntimeException
{
    private int $httpStatus;
    private string $errorCode;

    public function __construct(string $message, int $httpStatus = 422, string $errorCode = 'invalid_request')
    {
        parent::__construct($message);
        $this->httpStatus = $httpStatus;
        $this->errorCode = $errorCode;
    }

    public function httpStatus(): int
    {
        return $this->httpStatus;
    }

    public function errorCode(): string
    {
        return $this->errorCode;
    }
}

function evaluation_survey_version(): string
{
    return '2021-2026-v1';
}

function evaluation_max_payload_bytes(): int
{
    return 131072;
}

function evaluation_minimum_duration_seconds(): int
{
    return 8;
}

function evaluation_rate_limit_seconds(): int
{
    return 45;
}

function evaluation_response_directory(): string
{
    return AMJAD_STORAGE_DIR . '/evaluations/responses';
}

function evaluation_start_public_session(): void
{
    if (session_status() === PHP_SESSION_ACTIVE) {
        if (session_name() !== 'AMJADEVALUATIONSESSID') {
            throw new RuntimeException('A different session is already active.');
        }
        return;
    }

    ini_set('session.use_strict_mode', '1');
    ini_set('session.use_only_cookies', '1');
    ini_set('session.cookie_httponly', '1');
    ini_set('session.cookie_samesite', 'Strict');
    ini_set('session.cookie_secure', is_https_request() ? '1' : '0');
    session_name('AMJADEVALUATIONSESSID');
    session_set_cookie_params(array(
        'lifetime' => 0,
        'path' => '/',
        'secure' => is_https_request(),
        'httponly' => true,
        'samesite' => 'Strict',
    ));
    session_start();
}

function evaluation_csrf_token(): string
{
    if (empty($_SESSION['evaluation_csrf_token']) || !is_string($_SESSION['evaluation_csrf_token'])) {
        $_SESSION['evaluation_csrf_token'] = bin2hex(random_bytes(32));
    }
    if (empty($_SESSION['evaluation_started_at'])) {
        $_SESSION['evaluation_started_at'] = time();
    }
    return (string)$_SESSION['evaluation_csrf_token'];
}

function evaluation_privacy_summary(): array
{
    return array(
        'direct_identifiers_requested' => false,
        'ip_address_stored_with_response' => false,
        'user_agent_stored_with_response' => false,
        'session_id_stored_with_response' => false,
        'stored' => array('submission_id', 'submitted_at', 'survey_version', 'answered_count', 'responses'),
        'free_text_notice' => 'تُحفظ الإجابات الكتابية كما يرسلها المشارك؛ يُرجى عدم ذكر أسماء الأشخاص أو معلومات الاتصال.',
        'contact_details_policy' => 'تُرفض الإجابة إذا رصد النظام بريداً إلكترونياً أو رقماً هاتفياً واضحاً داخل النص الحر.',
        'retention_notice' => 'لا توجد مدة حذف تلقائي مفعلة حالياً؛ تبقى الإجابة في التخزين الخاص إلى أن يطبق المسؤول سياسة الاحتفاظ المعتمدة.',
        'hosting_notice' => 'قد يحتفظ مزود الاستضافة بسجلات وصول تقنية مستقلة وفق إعداداته؛ لا تضيف الاستمارة عنوان الشبكة أو معرّف الجلسة إلى سجل الإجابة.',
    );
}

function evaluation_question_schema(): array
{
    static $schema;
    if (is_array($schema)) {
        return $schema;
    }

    $scaleOptions = array('1', '2', '3', '4', '5', 'لا تتوفر لدي معلومات كافية', 'لا ينطبق على تجربتي');
    $schema = array();
    foreach (array(4, 5, 6, 8, 9, 10, 12, 13, 14, 16, 17, 19, 20, 21, 23, 24, 25, 26, 28, 29, 31, 32) as $id) {
        $schema['q' . $id] = array('type' => 'radio', 'options' => $scaleOptions);
    }
    foreach (array(7, 34, 35, 38, 40) as $id) {
        $schema['q' . $id] = array('type' => 'text', 'max_length' => 4000);
    }

    $radios = array(
        1 => array('المشاركة المباشرة في أنشطة الجمعية أو أعمالها.', 'متابعة أنشطة الجمعية وأخبارها دون مشاركة مباشرة.', 'المشاركة المباشرة والمتابعة معاً.', 'معرفتي بأعمال الجمعية محدودة.', 'أفضل عدم الإجابة.'),
        2 => array('اطلاع واسع على أغلب الأعمال التي تهمني.', 'اطلاع متوسط على بعض الأعمال.', 'اطلاع محدود على عدد قليل من الأعمال.', 'لا أستطيع تحديد مستوى اطلاعي.', 'أفضل عدم الإجابة.'),
        3 => array('منتظمة في الغالب.', 'متقطعة حسب الظروف.', 'محدودة أو نادرة.', 'لم أشارك بصورة مباشرة.', 'أفضل عدم الإجابة.'),
        11 => array('تحديد المسؤوليات وتوزيع المهام.', 'التخطيط وبرمجة الأعمال.', 'متابعة تنفيذ القرارات والمهام.', 'التنسيق بين الأفراد والفرق.', 'توثيق الأعمال والاجتماعات والقرارات.', 'لا أرى حاجة ملحة إلى تحسين جانب محدد.', 'لا تتوفر لدي معلومات كافية.', 'جانب آخر.'),
        15 => array('تلقيت رداً وتوضيحاً بشأنه.', 'تلقيت رداً دون توضيح كافٍ.', 'لم أتلق رداً واضحاً.', 'لم يسبق لي تقديم رأي أو مقترح.', 'لا أتذكر بصورة كافية.', 'أفضل عدم الإجابة.'),
        22 => array('الالتزامات الدراسية أو المهنية.', 'ظروف شخصية أو عائلية.', 'عدم وضوح المهام أو المسؤوليات.', 'صعوبات التنسيق أو التواصل.', 'عدم ملاءمة فرص المشاركة المتاحة.', 'تغير الاهتمامات أو الأولويات.', 'انخفاض الرغبة في المشاركة.', 'لم تتراجع مشاركتي أو تنقطع.', 'لم أشارك بصورة مباشرة.', 'لا أستطيع تحديد عامل واحد.', 'عامل آخر.', 'أفضل عدم الإجابة.'),
        27 => array('التربية والتعليم والدعم التربوي.', 'الأعمال الاجتماعية والمبادرات التضامنية.', 'الأنشطة الثقافية والفنية.', 'التطوع والمواطنة والعمل المجتمعي.', 'تنمية المهارات والتكنولوجيا.', 'توجد تجارب في عدة مجالات ولا أستطيع اختيار مجال واحد.', 'لا أرى مجالاً محدداً يمكنني اختياره.', 'لا تتوفر لدي معرفة كافية للحكم.', 'مجال آخر.'),
        30 => array('تطوير الانخراطات والمساهمات الداخلية.', 'بناء شراكات مع مؤسسات عمومية أو خاصة.', 'التقدم بطلبات المنح وبرامج الدعم.', 'تعبئة التبرعات والمساهمات التطوعية.', 'تطوير أنشطة مدرة للدخل منسجمة مع أهداف الجمعية.', 'الجمع بين عدة مصادر دون تفضيل مصدر واحد.', 'لا تتوفر لدي معلومات كافية للاختيار.', 'مسار آخر.'),
        33 => array('توثيق الأنشطة ونشر حصيلتها ونتائجها.', 'تحسين انتظام التواصل الرقمي.', 'تنظيم لقاءات وأنشطة للانفتاح على المجتمع.', 'تطوير العلاقات مع المؤسسات والشركاء.', 'توحيد الهوية البصرية والمواد التواصلية.', 'لا أرى إجراءً محدداً ذا أولوية.', 'لا أستطيع تحديد ذلك.', 'إجراء آخر.'),
        36 => array('1 — ضعيفة جداً.', '2 — ضعيفة.', '3 — متوسطة.', '4 — جيدة.', '5 — جيدة جداً.', 'لا تتوفر لدي معرفة كافية لتقييم الحصيلة العامة.'),
        39 => array('أستطيع تحمل مهام منتظمة إذا كانت الظروف مناسبة.', 'أفضل المساهمة حسب الوقت المتاح.', 'أفضل المساهمة في أنشطة أو مشاريع محددة.', 'أرغب في المتابعة حالياً دون التزام بالمشاركة.', 'لا أنوي المشاركة خلال المرحلة المقبلة.', 'لم أحدد موقفي بعد.', 'أفضل عدم الإجابة.'),
    );
    foreach ($radios as $id => $options) {
        $schema['q' . $id] = array('type' => 'radio', 'options' => $options);
    }

    $schema['q18'] = array(
        'type' => 'checkbox',
        'max' => 2,
        'options' => array('مجموعات واتساب.', 'الاجتماعات واللقاءات المباشرة.', 'البريد الإلكتروني.', 'الاتصال الهاتفي.', 'الموقع الإلكتروني أو الصفحات الرسمية للجمعية.', 'قناة أخرى.'),
    );
    $schema['q37'] = array(
        'type' => 'checkbox',
        'max' => 3,
        'options' => array('تطوير الحكامة والتنظيم الداخلي.', 'تحسين التخطيط ومتابعة تنفيذ الأعمال.', 'استقطاب المتطوعين وتكوينهم وتحفيزهم.', 'تنويع الموارد المالية وتعزيز الاستدامة.', 'تطوير جودة البرامج وطرق تقييم نتائجها.', 'توسيع الشراكات والتعاون المؤسساتي.', 'تحسين التواصل والإعلام والتوثيق.', 'تطوير مشاريع وأنشطة موجهة للمستفيدين.', 'مجال آخر.'),
    );

    ksort($schema, SORT_NATURAL);
    return $schema;
}

function evaluation_other_options(): array
{
    return array(
        'q11' => 'جانب آخر.',
        'q18' => 'قناة أخرى.',
        'q22' => 'عامل آخر.',
        'q27' => 'مجال آخر.',
        'q30' => 'مسار آخر.',
        'q33' => 'إجراء آخر.',
        'q37' => 'مجال آخر.',
    );
}

function evaluation_string_length(string $value): int
{
    return function_exists('mb_strlen') ? mb_strlen($value, 'UTF-8') : strlen($value);
}

function evaluation_clean_text(string $value, int $maxLength, string $field): ?string
{
    $value = str_replace(array("\r\n", "\r"), "\n", trim($value));
    if ($value === '') {
        return null;
    }
    if (preg_match('/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/u', $value)) {
        throw new EvaluationRequestException('تتضمن ' . $field . ' محارف غير مسموح بها.', 422, 'invalid_answer');
    }
    if (evaluation_string_length($value) > $maxLength) {
        throw new EvaluationRequestException('تجاوزت ' . $field . ' الحد الأقصى المسموح.', 422, 'answer_too_long');
    }
    if (preg_match('/\b[A-Z0-9._%+\-]+@[A-Z0-9.\-]+\.[A-Z]{2,}\b/iu', $value)
        || preg_match('/(?:\+?\p{N}[\s().-]*){8,}/u', $value)) {
        throw new EvaluationRequestException('يرجى حذف البريد الإلكتروني أو رقم الهاتف من ' . $field . ' حفاظاً على سرية الاستمارة.', 422, 'direct_identifier_detected');
    }
    return $value;
}

function evaluation_validate_payload(array $payload): array
{
    $allowedTopLevel = array('survey_version', 'responses', 'other_details', 'website');
    foreach (array_keys($payload) as $key) {
        if (!is_string($key) || !in_array($key, $allowedTopLevel, true)) {
            throw new EvaluationRequestException('يتضمن الطلب حقلاً غير معروف.', 422, 'unknown_field');
        }
    }
    if (($payload['survey_version'] ?? '') !== evaluation_survey_version()) {
        throw new EvaluationRequestException('نسخة الاستمارة غير مدعومة.', 422, 'unsupported_version');
    }
    if (!array_key_exists('responses', $payload) || !is_array($payload['responses'])) {
        throw new EvaluationRequestException('بنية الإجابات غير صالحة.', 422, 'invalid_responses');
    }
    if (isset($payload['other_details']) && !is_array($payload['other_details'])) {
        throw new EvaluationRequestException('بنية تفاصيل الإجابات الأخرى غير صالحة.', 422, 'invalid_other_details');
    }

    $schema = evaluation_question_schema();
    $incoming = $payload['responses'];
    foreach (array_keys($incoming) as $questionId) {
        if (!is_string($questionId) || !isset($schema[$questionId])) {
            throw new EvaluationRequestException('يتضمن الطلب رقم سؤال غير معروف.', 422, 'unknown_question');
        }
    }

    $normalized = array();
    foreach ($schema as $questionId => $definition) {
        $value = $incoming[$questionId] ?? null;
        if ($value === null || $value === '') {
            $normalized[$questionId] = null;
            continue;
        }
        if ($definition['type'] === 'text') {
            if (!is_string($value)) {
                throw new EvaluationRequestException('يجب أن تكون إجابة ' . $questionId . ' نصاً.', 422, 'invalid_answer');
            }
            $normalized[$questionId] = evaluation_clean_text($value, (int)$definition['max_length'], $questionId);
            continue;
        }
        if ($definition['type'] === 'radio') {
            if (!is_string($value) || !in_array($value, $definition['options'], true)) {
                throw new EvaluationRequestException('اختيار غير صالح في ' . $questionId . '.', 422, 'invalid_choice');
            }
            $normalized[$questionId] = $value;
            continue;
        }
        if (!is_array($value) || count($value) > (int)$definition['max']) {
            throw new EvaluationRequestException('عدد الاختيارات غير صالح في ' . $questionId . '.', 422, 'too_many_choices');
        }
        $choices = array();
        foreach ($value as $choice) {
            if (!is_string($choice) || !in_array($choice, $definition['options'], true)) {
                throw new EvaluationRequestException('اختيار غير صالح في ' . $questionId . '.', 422, 'invalid_choice');
            }
            if (in_array($choice, $choices, true)) {
                throw new EvaluationRequestException('لا يمكن تكرار الاختيار في ' . $questionId . '.', 422, 'duplicate_choice');
            }
            $choices[] = $choice;
        }
        $normalized[$questionId] = $choices === array() ? null : $choices;
    }

    $incomingOther = $payload['other_details'] ?? array();
    $otherOptions = evaluation_other_options();
    foreach (array_keys($incomingOther) as $questionId) {
        if (!is_string($questionId) || !isset($otherOptions[$questionId])) {
            throw new EvaluationRequestException('يتضمن الطلب تفصيلاً لسؤال غير معروف.', 422, 'unknown_other_detail');
        }
    }
    $normalizedOther = array();
    foreach ($incomingOther as $questionId => $detail) {
        if ($detail === null || $detail === '') {
            continue;
        }
        if (!is_string($detail)) {
            throw new EvaluationRequestException('يجب أن يكون توضيح ' . $questionId . ' نصاً.', 422, 'invalid_other_detail');
        }
        $answer = $normalized[$questionId] ?? null;
        $selectedOther = is_array($answer) ? in_array($otherOptions[$questionId], $answer, true) : $answer === $otherOptions[$questionId];
        if (!$selectedOther) {
            throw new EvaluationRequestException('أُرسل توضيح دون اختيار خانة «آخر» في ' . $questionId . '.', 422, 'orphan_other_detail');
        }
        $cleaned = evaluation_clean_text($detail, 1000, 'توضيح ' . $questionId);
        if ($cleaned !== null) {
            $normalizedOther[$questionId] = $cleaned;
        }
    }

    return array(
        'responses' => $normalized,
        'other_details' => $normalizedOther,
        'answered_count' => count(array_filter($normalized, static function ($answer): bool {
            return $answer !== null && $answer !== array() && $answer !== '';
        })),
    );
}

function evaluation_assert_submission_guard(array $payload, string $providedToken): void
{
    $honeypot = $payload['website'] ?? '';
    if (!is_string($honeypot) || trim($honeypot) !== '') {
        throw new EvaluationRequestException('تعذر قبول الإرسال.', 400, 'invalid_submission');
    }
    $expectedToken = (string)($_SESSION['evaluation_csrf_token'] ?? '');
    if ($providedToken === '' || $expectedToken === '' || !hash_equals($expectedToken, $providedToken)) {
        throw new EvaluationRequestException('انتهت صلاحية جلسة الاستمارة. أعد تحميل الصفحة وحاول مرة أخرى.', 403, 'csrf_failed');
    }
    $startedAt = (int)($_SESSION['evaluation_started_at'] ?? 0);
    if ($startedAt === 0 || time() - $startedAt < evaluation_minimum_duration_seconds()) {
        throw new EvaluationRequestException('تم الإرسال بسرعة غير متوقعة. انتظر لحظات ثم حاول مرة أخرى.', 429, 'submitted_too_quickly');
    }
    $lastSubmitAt = (int)($_SESSION['evaluation_last_submit_at'] ?? 0);
    if ($lastSubmitAt > 0 && time() - $lastSubmitAt < evaluation_rate_limit_seconds()) {
        throw new EvaluationRequestException('تم استلام إجابة من هذه الجلسة قبل قليل. حاول لاحقاً.', 429, 'rate_limited');
    }
}

function evaluation_normalize_origin(string $url): ?string
{
    $parts = parse_url($url);
    if (!is_array($parts) || empty($parts['scheme']) || empty($parts['host'])) {
        return null;
    }
    $scheme = strtolower((string)$parts['scheme']);
    if (!in_array($scheme, array('http', 'https'), true)) {
        return null;
    }
    $host = strtolower((string)$parts['host']);
    $port = isset($parts['port']) ? (int)$parts['port'] : ($scheme === 'https' ? 443 : 80);
    return $scheme . '://' . $host . ':' . $port;
}

function evaluation_request_is_same_origin(): bool
{
    $fetchSite = strtolower((string)($_SERVER['HTTP_SEC_FETCH_SITE'] ?? ''));
    if ($fetchSite !== '' && $fetchSite !== 'same-origin') {
        return false;
    }
    $host = (string)($_SERVER['HTTP_HOST'] ?? '');
    $expected = evaluation_normalize_origin((is_https_request() ? 'https://' : 'http://') . $host);
    if ($expected === null) {
        return false;
    }
    $origin = trim((string)($_SERVER['HTTP_ORIGIN'] ?? ''));
    if ($origin !== '') {
        $normalized = evaluation_normalize_origin($origin);
        return $normalized !== null && hash_equals($expected, $normalized);
    }
    $referer = trim((string)($_SERVER['HTTP_REFERER'] ?? ''));
    if ($referer !== '') {
        $normalized = evaluation_normalize_origin($referer);
        return $normalized !== null && hash_equals($expected, $normalized);
    }
    return $fetchSite === 'same-origin';
}

function evaluation_store_submission(array $validated): array
{
    ensure_private_directory(evaluation_response_directory());
    $submissionId = bin2hex(random_bytes(16));
    $record = array(
        'schema_version' => 1,
        'survey_version' => evaluation_survey_version(),
        'submission_id' => $submissionId,
        'submitted_at' => gmdate('c'),
        'answered_count' => (int)$validated['answered_count'],
        'responses' => $validated['responses'],
    );
    if (!empty($validated['other_details'])) {
        $record['other_details'] = $validated['other_details'];
    }
    $filename = gmdate('Ymd\THis\Z') . '-' . $submissionId . '.json';
    atomic_write_file(evaluation_response_directory() . '/' . $filename, encode_json($record), 0600);
    return $record;
}

function evaluation_response_files(): array
{
    $directory = evaluation_response_directory();
    if (!is_dir($directory)) {
        return array();
    }
    $files = glob($directory . '/*.json') ?: array();
    rsort($files, SORT_STRING);
    return $files;
}

function evaluation_read_submission(string $path): ?array
{
    if (!is_file($path) || pathinfo($path, PATHINFO_EXTENSION) !== 'json') {
        return null;
    }
    $record = json_decode((string)file_get_contents($path), true);
    if (!is_array($record) || !isset($record['submission_id'], $record['submitted_at'], $record['responses']) || !is_array($record['responses'])) {
        return null;
    }
    return $record;
}

function evaluation_submission_summaries(int $limit = 50): array
{
    $summaries = array();
    foreach (evaluation_response_files() as $path) {
        $record = evaluation_read_submission($path);
        if ($record === null) {
            continue;
        }
        $summaries[] = array(
            'submission_id' => (string)$record['submission_id'],
            'submitted_at' => (string)$record['submitted_at'],
            'answered_count' => (int)($record['answered_count'] ?? 0),
            'survey_version' => (string)($record['survey_version'] ?? ''),
        );
        if (count($summaries) >= max(1, $limit)) {
            break;
        }
    }
    return $summaries;
}

function evaluation_statistics(): array
{
    $count = 0;
    $answered = 0;
    $latest = null;
    foreach (evaluation_response_files() as $path) {
        $record = evaluation_read_submission($path);
        if ($record === null) {
            continue;
        }
        $count++;
        $answered += (int)($record['answered_count'] ?? 0);
        $submittedAt = (string)($record['submitted_at'] ?? '');
        if ($latest === null || strcmp($submittedAt, $latest) > 0) {
            $latest = $submittedAt;
        }
    }
    return array(
        'count' => $count,
        'average_answered' => $count > 0 ? round($answered / $count, 1) : 0.0,
        'latest_at' => $latest,
    );
}

function evaluation_safe_csv_cell($value): string
{
    if (is_array($value)) {
        $value = implode(' | ', array_map('strval', $value));
    }
    $text = $value === null ? '' : (string)$value;
    if ($text !== '' && preg_match('/^[=+\-@\t\r]/u', $text)) {
        $text = "'" . $text;
    }
    return $text;
}

function evaluation_stream_json_export(): void
{
    header('Content-Type: application/json; charset=utf-8');
    header('Content-Disposition: attachment; filename="amjad-evaluations-' . gmdate('Y-m-d') . '.json"');
    echo '{"exported_at":' . json_encode(gmdate('c')) . ',"survey_version":' . json_encode(evaluation_survey_version()) . ',"submissions":[';
    $first = true;
    foreach (evaluation_response_files() as $path) {
        $record = evaluation_read_submission($path);
        if ($record === null) {
            continue;
        }
        $encoded = json_encode($record, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        if ($encoded === false) {
            continue;
        }
        echo $first ? '' : ',';
        echo $encoded;
        $first = false;
    }
    echo "]}\n";
}

function evaluation_stream_csv_export(): void
{
    header('Content-Type: text/csv; charset=utf-8');
    header('Content-Disposition: attachment; filename="amjad-evaluations-' . gmdate('Y-m-d') . '.csv"');
    $output = fopen('php://output', 'wb');
    if ($output === false) {
        throw new RuntimeException('تعذر إنشاء ملف التصدير.');
    }
    fwrite($output, "\xEF\xBB\xBF");
    $questionIds = array_keys(evaluation_question_schema());
    $otherIds = array_keys(evaluation_other_options());
    fputcsv($output, array_merge(array('submission_id', 'submitted_at', 'survey_version', 'answered_count'), $questionIds, array_map(static fn(string $id): string => $id . '_other', $otherIds)), ',', '"', '\\');
    foreach (evaluation_response_files() as $path) {
        $record = evaluation_read_submission($path);
        if ($record === null) {
            continue;
        }
        $row = array(
            evaluation_safe_csv_cell($record['submission_id'] ?? ''),
            evaluation_safe_csv_cell($record['submitted_at'] ?? ''),
            evaluation_safe_csv_cell($record['survey_version'] ?? ''),
            evaluation_safe_csv_cell($record['answered_count'] ?? 0),
        );
        foreach ($questionIds as $questionId) {
            $row[] = evaluation_safe_csv_cell($record['responses'][$questionId] ?? null);
        }
        foreach ($otherIds as $questionId) {
            $row[] = evaluation_safe_csv_cell($record['other_details'][$questionId] ?? null);
        }
        fputcsv($output, $row, ',', '"', '\\');
    }
    fclose($output);
}
