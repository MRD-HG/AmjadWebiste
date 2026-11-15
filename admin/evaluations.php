<?php
declare(strict_types=1);

require_once __DIR__ . '/includes/bootstrap.php';
require_login();
require_once __DIR__ . '/includes/evaluations.php';

$download = request_value('download');
if ($download === 'json') {
    evaluation_stream_json_export();
    exit;
}
if ($download === 'csv') {
    evaluation_stream_csv_export();
    exit;
}

require_once __DIR__ . '/includes/layout.php';
$statistics = evaluation_statistics();
$submissions = evaluation_submission_summaries(50);
$latestLabel = $statistics['latest_at'] ? date('d/m/Y H:i', strtotime((string)$statistics['latest_at'])) : '—';

admin_header('تقييم أمجاد ' . "\u{200E}2021–2026\u{200E}", 'إجابات مجهولة الهوية محفوظة في التخزين الخاص');
?>
<section class="stats-grid" aria-label="ملخص إجابات الاستمارة">
    <article class="stat-card"><span>الاستمارات المستلمة</span><strong><?= (int)$statistics['count'] ?></strong><small>سجلات خاصة غير منشورة</small></article>
    <article class="stat-card"><span>متوسط الأسئلة المجاب عنها</span><strong><?= e(number_format((float)$statistics['average_answered'], 1)) ?></strong><small>من أصل 40 سؤالاً اختيارياً</small></article>
    <article class="stat-card"><span>آخر استلام</span><strong style="font-size:1.15rem"><?= e($latestLabel) ?></strong><small>بتوقيت الدار البيضاء</small></article>
</section>

<section class="panel">
    <div class="panel-header">
        <div><h2>تصدير النتائج</h2><p>ملفات التصدير تتضمن الإجابات الكتابية كاملة؛ احفظها في مكان آمن ولا تشاركها إلا مع فريق التقييم المخول.</p></div>
    </div>
    <div class="row-actions">
        <a class="btn" href="evaluations.php?download=csv">تنزيل CSV</a>
        <a class="btn btn--secondary" href="evaluations.php?download=json">تنزيل JSON</a>
    </div>
</section>

<section class="panel">
    <div class="panel-header"><div><h2>أحدث الاستمارات</h2><p>تعرض هذه الصفحة بيانات الاستلام فقط. افتح ملف التصدير لتحليل الإجابات.</p></div></div>
    <?php if (!$submissions): ?>
        <div class="empty-state">لم تصل أي استمارة بعد.</div>
    <?php else: ?>
        <div class="table-wrap">
            <table class="data-table">
                <thead><tr><th>معرّف الاستلام</th><th>تاريخ الاستلام</th><th>الأسئلة المجاب عنها</th><th>نسخة الاستمارة</th></tr></thead>
                <tbody>
                <?php foreach ($submissions as $submission): ?>
                    <tr>
                        <td dir="ltr" title="<?= e((string)$submission['submission_id']) ?>"><?= e(substr((string)$submission['submission_id'], 0, 12)) ?>…</td>
                        <td><?= e(date('d/m/Y H:i', strtotime((string)$submission['submitted_at']))) ?></td>
                        <td dir="ltr"><?= (int)$submission['answered_count'] ?> / 40</td>
                        <td dir="ltr"><?= e((string)$submission['survey_version']) ?></td>
                    </tr>
                <?php endforeach; ?>
                </tbody>
            </table>
        </div>
        <?php if ((int)$statistics['count'] > count($submissions)): ?><p class="hint">تُعرض آخر 50 استمارة فقط؛ يتضمن التصدير جميع الاستمارات.</p><?php endif; ?>
    <?php endif; ?>
</section>

<section class="panel">
    <div class="panel-header"><div><h2>حدود الخصوصية</h2><p>لا تطلب الاستمارة الاسم أو البريد أو الهاتف، ولا يُضاف عنوان الشبكة أو المتصفح أو معرّف الجلسة إلى سجل الإجابة. قد تحتفظ الاستضافة بسجلات وصول تقنية مستقلة. لا توجد مدة حذف تلقائي مفعلة حالياً، لذلك يجب اعتماد سياسة احتفاظ قبل جمع النتائج النهائية.</p></div></div>
</section>
<?php admin_footer(); ?>
