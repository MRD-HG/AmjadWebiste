(function () {
    'use strict';

    const survey = window.AMJAD_EVALUATION;
    if (!survey || !Array.isArray(survey.sections)) return;

    const STORAGE_KEY = 'amjad_evaluation_draft_v1';
    const API_URL = 'api/evaluation.php';
    const positions = [
        [14, 70], [27, 31], [40, 66], [53, 27], [66, 64],
        [80, 30], [88, 71], [69, 84], [47, 85], [24, 87]
    ];
    const sections = survey.sections;
    const allQuestions = sections.flatMap((section, sectionIndex) => section.questions.map((question, sectionPosition) => ({
        ...question,
        sectionIndex,
        sectionPosition,
        sectionLength: section.questions.length
    })));

    const elements = {};
    let state = defaultState();
    let csrfToken = '';
    let toastTimer = 0;
    let pendingNextIndex = 0;
    let apiPromise = null;

    function defaultState() {
        return {
            currentQuestion: 0,
            answers: {},
            otherDetails: {},
            completedMissions: [],
            journeyStarted: false,
            startedAt: Date.now()
        };
    }

    function cacheElements() {
        [
            'evaluation-mobile-nav', 'privacy-dialog', 'draft-resume', 'journey',
            'hero-mission-map', 'compact-mission-map', 'hero-mission-counter', 'compact-mission-counter',
            'journey-progress-label', 'journey-progress-percent', 'journey-progress-track', 'journey-progress-fill',
            'answered-count', 'sidebar-answered-count', 'journey-live-status', 'question-screen',
            'mission-label', 'mission-purpose', 'question-position', 'question-card', 'question-number',
            'question-title', 'question-help', 'answer-area', 'mission-complete', 'mission-complete-title',
            'mission-complete-text', 'review-screen', 'review-title', 'review-answered-count', 'review-list',
            'submission-consent', 'submission-status', 'success-screen', 'success-title', 'confirmation-code',
            'evaluation-toast'
        ].forEach(id => { elements[id] = document.getElementById(id); });
    }

    function safeParse(value) {
        try { return JSON.parse(value); } catch (error) { return null; }
    }

    function loadDraft() {
        let draft = null;
        try { draft = safeParse(sessionStorage.getItem(STORAGE_KEY)); } catch (error) { draft = null; }
        if (!draft || typeof draft !== 'object') return false;
        const currentQuestion = Number(draft.currentQuestion);
        state = {
            currentQuestion: Number.isInteger(currentQuestion) && currentQuestion >= 0 && currentQuestion < allQuestions.length ? currentQuestion : 0,
            answers: draft.answers && typeof draft.answers === 'object' ? draft.answers : {},
            otherDetails: draft.otherDetails && typeof draft.otherDetails === 'object' ? draft.otherDetails : {},
            completedMissions: Array.isArray(draft.completedMissions)
                ? draft.completedMissions.filter(index => Number.isInteger(index) && index >= 1 && index <= 10)
                : [],
            journeyStarted: Boolean(draft.journeyStarted),
            startedAt: Number.isFinite(Number(draft.startedAt)) ? Number(draft.startedAt) : Date.now()
        };
        sanitizeDraft();
        return state.journeyStarted || countAnswered() > 0 || state.completedMissions.length > 0;
    }

    function sanitizeDraft() {
        const questionIds = new Set(allQuestions.map(question => `q${question.id}`));
        Object.keys(state.answers).forEach(key => {
            if (!questionIds.has(key)) delete state.answers[key];
        });
        Object.keys(state.otherDetails).forEach(key => {
            if (!questionIds.has(key)) delete state.otherDetails[key];
        });
        state.completedMissions = [...new Set(state.completedMissions)].sort((a, b) => a - b);
    }

    function saveDraft() {
        try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (error) { /* Storage may be disabled. */ }
    }

    function clearDraft() {
        try { sessionStorage.removeItem(STORAGE_KEY); } catch (error) { /* Storage may be disabled. */ }
    }

    function questionKey(question) { return `q${question.id}`; }

    function answerFor(question) { return state.answers[questionKey(question)]; }

    function isAnswered(question) {
        const answer = answerFor(question);
        if (Array.isArray(answer)) return answer.length > 0;
        return typeof answer === 'string' && answer.trim() !== '';
    }

    function countAnswered() { return allQuestions.filter(isAnswered).length; }

    function escapeHtml(value) {
        return String(value ?? '').replace(/[&<>'"]/g, character => ({
            '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
        })[character]);
    }

    function pad(number) { return String(number).padStart(2, '0'); }

    function announce(message) {
        if (!elements['journey-live-status']) return;
        elements['journey-live-status'].textContent = '';
        window.setTimeout(() => { elements['journey-live-status'].textContent = message; }, 20);
    }

    function toast(message) {
        const toastElement = elements['evaluation-toast'];
        if (!toastElement) return;
        window.clearTimeout(toastTimer);
        toastElement.textContent = message;
        toastElement.classList.add('is-visible');
        toastTimer = window.setTimeout(() => toastElement.classList.remove('is-visible'), 3600);
    }

    function currentSectionIndex() {
        return allQuestions[state.currentQuestion]?.sectionIndex ?? 0;
    }

    function renderMissionMap(container) {
        if (!container) return;
        const current = currentSectionIndex();
        container.innerHTML = sections.slice(1).map((section, index) => {
            const sectionIndex = index + 1;
            const complete = state.completedMissions.includes(sectionIndex);
            const active = state.journeyStarted && current === sectionIndex;
            const label = section.shortTitle || section.title;
            const [x, y] = positions[index];
            return `<button type="button" class="mission-node${complete ? ' is-complete' : ''}${active ? ' is-current' : ''}" style="--x:${x}%;--y:${y}%" data-mission-section="${sectionIndex}" aria-label="${escapeHtml(section.name)}: ${escapeHtml(section.title)}${complete ? ' — منجزة' : ''}"${active ? ' aria-current="step"' : ''} title="${escapeHtml(section.title)}"><i class="fa-solid ${escapeHtml(section.icon)}" aria-hidden="true"></i><span class="mission-node__label">${escapeHtml(label)}</span></button>`;
        }).join('');
    }

    function renderMaps() {
        renderMissionMap(elements['hero-mission-map']);
        renderMissionMap(elements['compact-mission-map']);
        const completed = state.completedMissions.length;
        elements['hero-mission-counter'].textContent = `${completed} / 10`;
        elements['compact-mission-counter'].textContent = `${completed} / 10`;
    }

    function updateProgress() {
        const answered = countAnswered();
        const displayIndex = Math.min(state.currentQuestion + 1, allQuestions.length);
        const percent = Math.round((displayIndex / allQuestions.length) * 100);
        elements['journey-progress-label'].textContent = `السؤال ${displayIndex} من ${allQuestions.length}`;
        elements['journey-progress-percent'].textContent = `${percent}%`;
        elements['journey-progress-fill'].style.width = `${percent}%`;
        elements['journey-progress-track'].setAttribute('aria-valuenow', String(displayIndex));
        elements['journey-progress-track'].setAttribute('aria-valuetext', `وصلت إلى السؤال ${displayIndex} من ${allQuestions.length}`);
        elements['answered-count'].textContent = String(answered);
        elements['sidebar-answered-count'].textContent = `${answered}/40`;
        renderMaps();
    }

    function answerChoice(question, option, index, checkbox) {
        const answer = answerFor(question);
        const selected = checkbox ? Array.isArray(answer) && answer.includes(option) : answer === option;
        const type = checkbox ? 'checkbox' : 'radio';
        return `<label class="answer-choice${selected ? ' is-selected' : ''}"><input type="${type}" name="q${question.id}" value="${escapeHtml(option)}" data-answer-id="${question.id}"${selected ? ' checked' : ''}><span class="answer-choice__mark" aria-hidden="true">${index + 1}</span><span>${escapeHtml(option)}</span></label>`;
    }

    function renderRadio(question) {
        const optionsClass = question.options.length >= 6 ? ' answer-options--two' : '';
        return `<fieldset><legend>اختر إجابة واحدة، أو اترك السؤال من دون إجابة.</legend><div class="answer-options${optionsClass}">${question.options.map((option, index) => answerChoice(question, option, index, false)).join('')}</div>${renderOther(question)}</fieldset>`;
    }

    function renderCheckbox(question) {
        const answer = Array.isArray(answerFor(question)) ? answerFor(question) : [];
        return `<fieldset><legend>يمكنك اختيار ${question.max} إجابات كحد أقصى.</legend><div class="selection-limit"><span>عدد الاختيارات الحالية</span><strong id="selection-count-${question.id}" dir="ltr">${answer.length} / ${question.max}</strong></div><div class="answer-options answer-options--two">${question.options.map((option, index) => answerChoice(question, option, index, true)).join('')}</div>${renderOther(question)}</fieldset>`;
    }

    function renderScale(question) {
        const answer = answerFor(question);
        const main = survey.scale.slice(0, 5).map(option => `<label class="scale-choice${answer === option.value ? ' is-selected' : ''}" title="${escapeHtml(option.label)}"><input type="radio" name="q${question.id}" value="${escapeHtml(option.value)}" data-answer-id="${question.id}" aria-label="${escapeHtml(option.label)}"${answer === option.value ? ' checked' : ''}><strong>${option.value}</strong><span>${escapeHtml(option.short)}</span></label>`).join('');
        const alternatives = survey.scale.slice(5).map((option, index) => answerChoice(question, option.value, index, false)).join('');
        return `<fieldset><legend>اختر درجة من 1 إلى 5، أو أحد الخيارين الإضافيين عند الحاجة.</legend><div class="scale-options">${main}</div><div class="scale-alternatives">${alternatives}</div></fieldset>`;
    }

    function renderText(question) {
        const value = typeof answerFor(question) === 'string' ? answerFor(question) : '';
        return `<label class="sr-only" for="text-answer-${question.id}">${escapeHtml(question.q)}</label><textarea class="text-answer" id="text-answer-${question.id}" data-text-id="${question.id}" maxlength="4000" placeholder="اكتب ما ترغب في مشاركته… وتجنب أسماء الأشخاص أو التفاصيل الكاشفة للهوية.">${escapeHtml(value)}</textarea><p class="character-counter"><span id="character-count-${question.id}">${value.length}</span> / 4000 حرف</p>`;
    }

    function otherIsSelected(question) {
        if (!question.other) return false;
        const answer = answerFor(question);
        return Array.isArray(answer) ? answer.includes(question.other) : answer === question.other;
    }

    function renderOther(question) {
        if (!question.other || !otherIsSelected(question)) return '';
        const detail = state.otherDetails[questionKey(question)] || '';
        return `<label class="sr-only" for="other-answer-${question.id}">توضيح الاختيار الآخر</label><input class="other-answer" id="other-answer-${question.id}" type="text" data-other-id="${question.id}" maxlength="400" value="${escapeHtml(detail)}" placeholder="إن رغبت، وضّح اختيارك الآخر…">`;
    }

    function renderAnswerArea(question) {
        if (question.type === 'scale') return renderScale(question);
        if (question.type === 'radio') return renderRadio(question);
        if (question.type === 'checkbox') return renderCheckbox(question);
        return renderText(question);
    }

    function setVisibleScreen(screenName) {
        const mapping = {
            question: 'question-screen',
            complete: 'mission-complete',
            review: 'review-screen',
            success: 'success-screen'
        };
        Object.values(mapping).forEach(id => { elements[id].hidden = id !== mapping[screenName]; });
    }

    function focusAfterRender(element) {
        window.requestAnimationFrame(() => {
            element?.focus({ preventScroll: true });
            const screen = element?.closest('.question-screen, .mission-complete, .review-screen, .success-screen');
            const scrollTarget = window.innerWidth < 1024 && screen ? screen : elements.journey;
            const top = scrollTarget.getBoundingClientRect().top + window.scrollY - 86;
            window.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
        });
    }

    function renderQuestion(options = {}) {
        const question = allQuestions[state.currentQuestion];
        if (!question) return;
        const section = sections[question.sectionIndex];
        setVisibleScreen('question');
        elements['mission-label'].textContent = `${section.name} · ${section.title}`;
        elements['mission-purpose'].textContent = section.purpose;
        elements['question-position'].textContent = `${question.sectionPosition + 1} / ${question.sectionLength}`;
        elements['question-number'].textContent = `س${pad(question.id)}`;
        elements['question-title'].textContent = question.q;
        elements['question-help'].textContent = question.hint || (question.type === 'scale' ? '1 تعني «لا أوافق إطلاقاً» و5 تعني «أوافق تماماً».' : 'يمكنك الإجابة أو تجاوز السؤال من دون أي إلزام.');
        elements['answer-area'].innerHTML = renderAnswerArea(question);
        const previousButton = document.querySelector('[data-action="previous-question"]');
        if (previousButton) previousButton.disabled = state.currentQuestion === 0;
        const nextButton = document.querySelector('[data-action="next-question"]');
        if (nextButton) {
            const lastInSection = question.sectionPosition === question.sectionLength - 1;
            nextButton.innerHTML = `${lastInSection ? 'إنهاء المحطة' : 'التالي'} <i class="fa-solid fa-arrow-left" aria-hidden="true"></i>`;
        }
        updateProgress();
        saveDraft();
        if (options.focus !== false) focusAfterRender(elements['question-title']);
        announce(`السؤال ${question.id} من 40، ${section.name}.`);
    }

    function startJourney(resume) {
        state.journeyStarted = true;
        if (!resume && countAnswered() === 0 && state.completedMissions.length === 0) state.currentQuestion = 0;
        elements.journey.hidden = false;
        saveDraft();
        renderQuestion();
        ensureApiSession();
    }

    function moveForward(skipped) {
        const question = allQuestions[state.currentQuestion];
        if (!question) return;
        const lastInSection = question.sectionPosition === question.sectionLength - 1;
        if (!lastInSection) {
            state.currentQuestion += 1;
            renderQuestion();
            if (skipped && !isAnswered(question)) toast('تم تجاوز السؤال؛ يمكنك العودة إليه في أي وقت.');
            return;
        }
        pendingNextIndex = state.currentQuestion + 1;
        showMissionComplete(question.sectionIndex);
    }

    function showMissionComplete(sectionIndex) {
        const section = sections[sectionIndex];
        if (sectionIndex > 0 && !state.completedMissions.includes(sectionIndex)) {
            state.completedMissions.push(sectionIndex);
            state.completedMissions.sort((a, b) => a - b);
        }
        saveDraft();
        setVisibleScreen('complete');
        const icon = elements['mission-complete'].querySelector('.mission-key i');
        if (icon) icon.className = sectionIndex === 0 ? 'fa-solid fa-compass' : 'fa-solid fa-key';
        elements['mission-complete-title'].textContent = sectionIndex === 0 ? 'أصبحت مستعداً للمحطات العشر' : `اكتملت ${section.name}`;
        elements['mission-complete-text'].textContent = sectionIndex === 0
            ? 'شكراً لتوضيح طبيعة تجربتك. تبدأ الآن محاور التقييم، ويمكنك تجاوز أي سؤال لا ينطبق عليك.'
            : `أضفت مساهمتك إلى محور «${section.title}». اكتمل هذا الجزء من المشهد لمجرد إنهاء المحطة، لا بسبب نوع الإجابات.`;
        updateProgress();
        focusAfterRender(elements['mission-complete-title']);
        announce(sectionIndex === 0 ? 'اكتملت بوابة الانطلاق.' : `اكتملت ${section.name} من عشر محطات.`);
    }

    function continueAfterMission() {
        if (pendingNextIndex >= allQuestions.length) {
            showReview();
            return;
        }
        state.currentQuestion = pendingNextIndex;
        renderQuestion();
    }

    function goPrevious() {
        if (state.currentQuestion <= 0) return;
        state.currentQuestion -= 1;
        renderQuestion();
    }

    function jumpToSection(sectionIndex) {
        const firstIndex = allQuestions.findIndex(question => question.sectionIndex === sectionIndex);
        if (firstIndex < 0) return;
        state.journeyStarted = true;
        state.currentQuestion = firstIndex;
        elements.journey.hidden = false;
        renderQuestion();
        ensureApiSession();
    }

    function formatAnswer(question) {
        if (!isAnswered(question)) return 'لم تتم الإجابة';
        const answer = answerFor(question);
        let formatted = Array.isArray(answer) ? answer.join('، ') : answer;
        if (question.type === 'scale') {
            formatted = survey.scale.find(option => option.value === answer)?.label || answer;
        }
        if (question.other && otherIsSelected(question)) {
            const detail = (state.otherDetails[questionKey(question)] || '').trim();
            if (detail) formatted += ` — توضيح: ${detail}`;
        }
        return formatted;
    }

    function renderReviewList() {
        elements['review-list'].innerHTML = sections.map((section, sectionIndex) => {
            const sectionAnswered = section.questions.filter(question => isAnswered(question)).length;
            const answers = section.questions.map(question => {
                const answered = isAnswered(question);
                return `<div class="review-answer"><span class="review-answer__number">س${pad(question.id)}</span><div><strong>${escapeHtml(question.q)}</strong><p class="${answered ? '' : 'is-empty'}">${escapeHtml(formatAnswer(question))}</p></div><button type="button" data-edit-question="${question.id}">تعديل</button></div>`;
            }).join('');
            return `<section class="review-section"><div class="review-section__heading"><h3>${escapeHtml(section.name)} · ${escapeHtml(section.title)}</h3><span><bdi dir="ltr">${sectionAnswered} / ${section.questions.length}</bdi> إجابات</span></div>${answers}</section>`;
        }).join('');
    }

    function showReview() {
        state.journeyStarted = true;
        elements.journey.hidden = false;
        setVisibleScreen('review');
        renderReviewList();
        const answered = countAnswered();
        elements['review-answered-count'].textContent = String(answered);
        elements['submission-status'].textContent = '';
        elements['submission-status'].className = 'submission-status';
        updateProgress();
        saveDraft();
        focusAfterRender(elements['review-title']);
        announce(`مراجعة الإجابات. أجبت عن ${answered} من 40 سؤالاً.`);
    }

    function editQuestion(questionId) {
        const index = allQuestions.findIndex(question => question.id === questionId);
        if (index < 0) return;
        state.currentQuestion = index;
        renderQuestion();
    }

    function updateChoiceClasses(question) {
        elements['answer-area'].querySelectorAll('.answer-choice, .scale-choice').forEach(label => {
            const input = label.querySelector('input');
            label.classList.toggle('is-selected', Boolean(input?.checked));
        });
        if (question.type === 'checkbox') {
            const count = Array.isArray(answerFor(question)) ? answerFor(question).length : 0;
            const counter = document.getElementById(`selection-count-${question.id}`);
            if (counter) counter.textContent = `${count} / ${question.max}`;
        }
    }

    function handleAnswerChange(input) {
        const questionId = Number(input.dataset.answerId);
        const question = allQuestions.find(item => item.id === questionId);
        if (!question) return;
        const key = questionKey(question);
        const otherWasSelected = otherIsSelected(question);
        if (question.type === 'checkbox') {
            const values = Array.isArray(state.answers[key]) ? [...state.answers[key]] : [];
            if (input.checked && !values.includes(input.value)) {
                if (values.length >= question.max) {
                    input.checked = false;
                    toast(`يمكن اختيار ${question.max} إجابات كحد أقصى لهذا السؤال.`);
                    return;
                }
                values.push(input.value);
            } else if (!input.checked) {
                const index = values.indexOf(input.value);
                if (index >= 0) values.splice(index, 1);
            }
            state.answers[key] = values;
        } else {
            state.answers[key] = input.value;
        }
        const otherNowSelected = otherIsSelected(question);
        if (question.other && !otherNowSelected) delete state.otherDetails[key];
        if (question.other && otherWasSelected !== otherNowSelected) {
            elements['answer-area'].innerHTML = renderAnswerArea(question);
            const matchingInput = [...elements['answer-area'].querySelectorAll('[data-answer-id]')].find(candidate => candidate.value === input.value);
            matchingInput?.focus({ preventScroll: true });
        } else {
            updateChoiceClasses(question);
        }
        updateProgress();
        saveDraft();
        announce(`حُفظت إجابة السؤال ${question.id} مؤقتاً.`);
    }

    function handleTextInput(target) {
        if (target.matches('[data-text-id]')) {
            const questionId = Number(target.dataset.textId);
            const question = allQuestions.find(item => item.id === questionId);
            if (!question) return;
            state.answers[questionKey(question)] = target.value;
            const count = document.getElementById(`character-count-${questionId}`);
            if (count) count.textContent = String(target.value.length);
            updateProgress();
            saveDraft();
            return;
        }
        if (target.matches('[data-other-id]')) {
            const questionId = Number(target.dataset.otherId);
            const question = allQuestions.find(item => item.id === questionId);
            if (!question) return;
            state.otherDetails[questionKey(question)] = target.value;
            saveDraft();
        }
    }

    async function ensureApiSession(force) {
        if (csrfToken && !force) return csrfToken;
        if (apiPromise && !force) return apiPromise;
        apiPromise = fetch(API_URL, {
            method: 'GET',
            credentials: 'same-origin',
            headers: { Accept: 'application/json' },
            cache: 'no-store'
        }).then(async response => {
            const data = await response.json().catch(() => ({}));
            if (!response.ok || !data.csrf_token) throw new Error(data?.error?.message || 'تعذر بدء جلسة الإرسال.');
            csrfToken = data.csrf_token;
            return csrfToken;
        }).catch(error => {
            csrfToken = '';
            throw error;
        }).finally(() => { apiPromise = null; });
        return apiPromise;
    }

    function submissionPayload() {
        const responses = {};
        const otherDetails = {};
        allQuestions.forEach(question => {
            const key = questionKey(question);
            const answer = state.answers[key];
            if (Array.isArray(answer)) responses[key] = answer.length ? [...answer] : null;
            else responses[key] = typeof answer === 'string' && answer.trim() !== '' ? answer.trim() : null;
            if (question.other && otherIsSelected(question)) {
                const detail = (state.otherDetails[key] || '').trim();
                if (detail) otherDetails[key] = detail;
            }
        });
        return {
            survey_version: survey.version,
            website: '',
            responses,
            other_details: otherDetails
        };
    }

    function setSubmissionStatus(message, type) {
        const status = elements['submission-status'];
        status.textContent = message;
        status.className = `submission-status${type ? ` is-${type}` : ''}`;
    }

    async function submitEvaluation(button) {
        if (!elements['submission-consent'].checked) {
            setSubmissionStatus('يرجى قراءة توضيح الخصوصية ووضع علامة الموافقة قبل الإرسال.', 'error');
            elements['submission-consent'].focus();
            return;
        }
        button.disabled = true;
        button.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin" aria-hidden="true"></i> جارٍ الإرسال…';
        setSubmissionStatus('جارٍ إرسال إجاباتك بصورة آمنة. لا تغلق الصفحة الآن.', '');
        try {
            const token = await ensureApiSession();
            const response = await fetch(API_URL, {
                method: 'POST',
                credentials: 'same-origin',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                    'X-CSRF-Token': token
                },
                body: JSON.stringify(submissionPayload())
            });
            const data = await response.json().catch(() => ({}));
            if (!response.ok || !data.ok) throw new Error(data?.error?.message || 'تعذر حفظ الإجابة حالياً.');
            setSubmissionStatus('تم استلام الإجابات بنجاح.', 'success');
            clearDraft();
            csrfToken = '';
            setVisibleScreen('success');
            elements['confirmation-code'].textContent = String(data.submission_id || '').slice(0, 12).toUpperCase() || 'تم الاستلام';
            focusAfterRender(elements['success-title']);
            announce('تم استلام إجاباتك بنجاح. شكراً لمساهمتك.');
        } catch (error) {
            setSubmissionStatus(`${error.message || 'تعذر الإرسال.'} لم تُسجل الاستمارة؛ بقيت المسودة في علامة التبويب ويمكنك المحاولة مجدداً أو تنزيل نسخة محلية.`, 'error');
        } finally {
            button.disabled = false;
            button.innerHTML = '<i class="fa-solid fa-paper-plane" aria-hidden="true"></i> إرسال مجهول';
        }
    }

    function downloadCopy() {
        const exportData = {
            title: survey.title,
            survey_version: survey.version,
            notice: 'نسخة محلية من إجابات اختيارية دون حقول تعريف مباشرة. هذا الملف ليس دليلاً على نجاح الإرسال إلى الجمعية.',
            responses: allQuestions.map(question => ({
                id: questionKey(question),
                question: question.q,
                answer: isAnswered(question) ? answerFor(question) : null,
                ...(question.other && otherIsSelected(question) && (state.otherDetails[questionKey(question)] || '').trim()
                    ? { other_detail: state.otherDetails[questionKey(question)].trim() }
                    : {})
            }))
        };
        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'amjad-evaluation-local-copy.json';
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.setTimeout(() => URL.revokeObjectURL(url), 1000);
        toast('تم تنزيل نسخة محلية. لا يعني التنزيل أن الإجابات أُرسلت إلى الجمعية.');
    }

    function resetJourney() {
        state = defaultState();
        csrfToken = '';
        clearDraft();
        elements['submission-consent'].checked = false;
        elements['draft-resume'].hidden = true;
        renderMaps();
        startJourney(false);
        toast('بدأت استجابة جديدة وفارغة.');
    }

    function clearCurrentDraft() {
        if (!window.confirm('هل تريد مسح كل الإجابات والتقدم المحفوظ في علامة التبويب هذه؟ لا يمكن التراجع عن ذلك.')) return;
        state = defaultState();
        csrfToken = '';
        clearDraft();
        elements.journey.hidden = true;
        elements['draft-resume'].hidden = true;
        renderMaps();
        document.getElementById('evaluation-intro')?.scrollIntoView({ behavior: 'smooth' });
        toast('مُسحت المسودة من علامة التبويب الحالية.');
    }

    function openPrivacy() {
        const dialog = elements['privacy-dialog'];
        if (typeof dialog.showModal === 'function') dialog.showModal();
        else dialog.setAttribute('open', '');
    }

    function toggleMobileMenu() {
        const menu = elements['evaluation-mobile-nav'];
        const button = document.querySelector('.evaluation-menu-toggle');
        const opening = menu.hidden;
        menu.hidden = !opening;
        button?.setAttribute('aria-expanded', String(opening));
        const icon = button?.querySelector('i');
        if (icon) icon.className = `fa-solid ${opening ? 'fa-xmark' : 'fa-bars'}`;
    }

    function bindEvents() {
        document.addEventListener('click', event => {
            const actionButton = event.target.closest('[data-action]');
            if (actionButton) {
                const action = actionButton.dataset.action;
                if (action === 'start-journey') startJourney(false);
                else if (action === 'resume-draft') startJourney(true);
                else if (action === 'open-privacy') openPrivacy();
                else if (action === 'close-journey') document.getElementById('evaluation-intro')?.scrollIntoView({ behavior: 'smooth' });
                else if (action === 'previous-question') goPrevious();
                else if (action === 'skip-question') moveForward(true);
                else if (action === 'next-question') moveForward(false);
                else if (action === 'continue-after-mission') continueAfterMission();
                else if (action === 'show-review') showReview();
                else if (action === 'back-to-questions') renderQuestion();
                else if (action === 'download-copy') downloadCopy();
                else if (action === 'submit-evaluation') submitEvaluation(actionButton);
                else if (action === 'start-new-response') resetJourney();
                else if (action === 'clear-draft') clearCurrentDraft();
            }
            const missionButton = event.target.closest('[data-mission-section]');
            if (missionButton) jumpToSection(Number(missionButton.dataset.missionSection));
            const editButton = event.target.closest('[data-edit-question]');
            if (editButton) editQuestion(Number(editButton.dataset.editQuestion));
        });

        document.addEventListener('change', event => {
            const input = event.target.closest('[data-answer-id]');
            if (input instanceof HTMLInputElement) handleAnswerChange(input);
        });
        document.addEventListener('input', event => {
            if (event.target instanceof HTMLTextAreaElement || event.target instanceof HTMLInputElement) handleTextInput(event.target);
        });

        document.querySelector('.evaluation-menu-toggle')?.addEventListener('click', toggleMobileMenu);
        elements['evaluation-mobile-nav']?.querySelectorAll('a').forEach(link => link.addEventListener('click', () => {
            elements['evaluation-mobile-nav'].hidden = true;
            document.querySelector('.evaluation-menu-toggle')?.setAttribute('aria-expanded', 'false');
        }));
        elements['privacy-dialog']?.addEventListener('click', event => {
            if (event.target === elements['privacy-dialog']) elements['privacy-dialog'].close();
        });
    }

    function initialize() {
        cacheElements();
        const hasDraft = loadDraft();
        elements['draft-resume'].hidden = !hasDraft;
        bindEvents();
        renderMaps();
        ensureApiSession().catch(() => {
            // The visitor can still answer and download a local copy if the endpoint is unavailable.
        });
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initialize);
    else initialize();
}());
