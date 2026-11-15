<?php
declare(strict_types=1);

require_once dirname(__DIR__) . '/admin/includes/config.php';
require_once dirname(__DIR__) . '/admin/includes/security.php';
require_once dirname(__DIR__) . '/admin/includes/storage.php';
require_once dirname(__DIR__) . '/admin/includes/evaluations.php';

function evaluation_json_response(array $payload, int $status = 200): void
{
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store, max-age=0');
    header('Pragma: no-cache');
    header('X-Content-Type-Options: nosniff');
    header('Referrer-Policy: no-referrer');
    header('Permissions-Policy: camera=(), microphone=(), geolocation=()');
    header('Vary: Origin, Sec-Fetch-Site');
    echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) . "\n";
    exit;
}

try {
    $method = strtoupper((string)($_SERVER['REQUEST_METHOD'] ?? 'GET'));
    if (!in_array($method, array('GET', 'POST'), true)) {
        header('Allow: GET, POST');
        evaluation_json_response(array('ok' => false, 'error' => array('code' => 'method_not_allowed', 'message' => 'طريقة الطلب غير مدعومة.')), 405);
    }

    evaluation_start_public_session();

    if ($method === 'GET') {
        evaluation_json_response(array(
            'ok' => true,
            'survey_version' => evaluation_survey_version(),
            'csrf_token' => evaluation_csrf_token(),
            'limits' => array(
                'max_payload_bytes' => evaluation_max_payload_bytes(),
                'minimum_duration_seconds' => evaluation_minimum_duration_seconds(),
                'rate_limit_seconds' => evaluation_rate_limit_seconds(),
            ),
            'privacy' => evaluation_privacy_summary(),
        ));
    }

    if (!evaluation_request_is_same_origin()) {
        throw new EvaluationRequestException('يجب إرسال الاستمارة من موقع جمعية أمجاد نفسه.', 403, 'cross_origin_denied');
    }
    $contentType = strtolower(trim(explode(';', (string)($_SERVER['CONTENT_TYPE'] ?? ''))[0]));
    if ($contentType !== 'application/json') {
        throw new EvaluationRequestException('يجب إرسال البيانات بصيغة JSON.', 415, 'unsupported_media_type');
    }
    $declaredLength = (int)($_SERVER['CONTENT_LENGTH'] ?? 0);
    if ($declaredLength > evaluation_max_payload_bytes()) {
        throw new EvaluationRequestException('حجم الطلب أكبر من الحد المسموح.', 413, 'payload_too_large');
    }
    $raw = file_get_contents('php://input', false, null, 0, evaluation_max_payload_bytes() + 1);
    if ($raw === false || strlen($raw) > evaluation_max_payload_bytes()) {
        throw new EvaluationRequestException('حجم الطلب أكبر من الحد المسموح.', 413, 'payload_too_large');
    }
    $payload = json_decode($raw, true);
    if (!is_array($payload) || json_last_error() !== JSON_ERROR_NONE) {
        throw new EvaluationRequestException('تعذر قراءة بيانات الاستمارة.', 400, 'invalid_json');
    }

    $providedToken = trim((string)($_SERVER['HTTP_X_CSRF_TOKEN'] ?? ''));
    evaluation_assert_submission_guard($payload, $providedToken);
    $validated = evaluation_validate_payload($payload);
    $record = evaluation_store_submission($validated);

    $_SESSION['evaluation_last_submit_at'] = time();
    $_SESSION['evaluation_csrf_token'] = bin2hex(random_bytes(32));
    unset($_SESSION['evaluation_started_at']);

    evaluation_json_response(array(
        'ok' => true,
        'submission_id' => $record['submission_id'],
        'submitted_at' => $record['submitted_at'],
        'answered_count' => $record['answered_count'],
        'message' => 'تم حفظ إجابتك بنجاح. شكراً لمساهمتك في تقييم تجربة جمعية أمجاد.',
        'privacy' => evaluation_privacy_summary(),
    ), 201);
} catch (EvaluationRequestException $error) {
    evaluation_json_response(array('ok' => false, 'error' => array('code' => $error->errorCode(), 'message' => $error->getMessage())), $error->httpStatus());
} catch (Throwable $error) {
    error_log('Evaluation API failure: ' . $error->getMessage());
    evaluation_json_response(array('ok' => false, 'error' => array('code' => 'server_error', 'message' => 'تعذر حفظ الإجابة حالياً. لم تُسجل الاستمارة؛ حاول مرة أخرى لاحقاً.')), 500);
}
