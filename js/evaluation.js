(function () {
    'use strict';

    const survey = window.AMJAD_EVALUATION;
    if (!survey || !Array.isArray(survey.sections)) return;

    const STORAGE_KEY = 'amjad_evaluation_draft_v2';
    const LEGACY_STORAGE_KEY = 'amjad_evaluation_draft_v1';
    const DRAFT_SCHEMA_VERSION = 2;
    const API_URL = 'api/evaluation.php';
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
    let storageAvailable = true;
    let activeCompletionSection = 0;

    function createResponseId() {
        if (window.crypto?.randomUUID) return window.crypto.randomUUID();
        if (!window.crypto?.getRandomValues) return '';
        const bytes = new Uint8Array(16);
        window.crypto.getRandomValues(bytes);
        bytes[6] = (bytes[6] & 0x0f) | 0x40;
        bytes[8] = (bytes[8] & 0x3f) | 0x80;
        const hex = [...bytes].map(value => value.toString(16).padStart(2, '0')).join('');
        return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
    }

    function defaultState() {
        return {
            schemaVersion: DRAFT_SCHEMA_VERSION,
            surveyVersion: survey.version,
            responseId: createResponseId(),
            currentQuestion: 0,
            answers: {},
            otherDetails: {},
            completedMissions: [],
            journeyStarted: false,
            currentScreen: 'question',
            pendingNextIndex: 0,
            completionSection: 0
        };
    }

    function cacheElements() {
        [
            'evaluation-mobile-nav', 'privacy-dialog', 'draft-resume', 'journey',
            'hero-mission-map', 'compact-mission-map', 'hero-mission-counter', 'compact-mission-counter',
            'journey-progress-label', 'journey-progress-percent', 'journey-progress-track', 'journey-progress-fill',
            'answered-count', 'sidebar-answered-count', 'toolbar-answered-count', 'journey-live-status', 'question-screen',
            'mission-label', 'mission-purpose', 'question-position', 'question-card', 'question-number',
            'question-title', 'question-help', 'answer-area', 'answer-clear', 'answer-save-status', 'mission-question-nav',
            'current-mission-title', 'journey-sidebar', 'mission-complete', 'mission-complete-title',
            'mission-complete-text', 'mission-complete-stats', 'mission-progress-collection',
            'review-screen', 'review-title', 'review-answered-count', 'review-dashboard-answered',
            'review-unanswered-count', 'review-mission-count', 'review-unanswered-only', 'review-list',
            'submission-consent', 'submission-status', 'success-screen', 'success-title', 'confirmation-code',
            'evaluation-toast', 'draft-summary'
        ].forEach(id => { elements[id] = document.getElementById(id); });
    }

    function safeParse(value) {
        try { return JSON.parse(value); } catch (error) { return null; }
    }

    function loadDraft() {
        let draft = null;
        try {
            draft = safeParse(sessionStorage.getItem(STORAGE_KEY));
            if (!draft) draft = safeParse(sessionStorage.getItem(LEGACY_STORAGE_KEY));
        } catch (error) {
            storageAvailable = false;
            draft = null;
        }
        if (!draft || typeof draft !== 'object') return false;
        if ((draft.schemaVersion !== undefined && Number(draft.schemaVersion) !== DRAFT_SCHEMA_VERSION)
            || (draft.surveyVersion !== undefined && draft.surveyVersion !== survey.version)) {
            try { sessionStorage.removeItem(STORAGE_KEY); } catch (error) { storageAvailable = false; }
            return false;
        }
        const currentQuestion = Number(draft.currentQuestion);
        state = {
            schemaVersion: DRAFT_SCHEMA_VERSION,
            surveyVersion: survey.version,
            responseId: typeof draft.responseId === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(draft.responseId)
                ? draft.responseId
                : createResponseId(),
            currentQuestion: Number.isInteger(currentQuestion) && currentQuestion >= 0 && currentQuestion < allQuestions.length ? currentQuestion : 0,
            answers: draft.answers && typeof draft.answers === 'object' ? draft.answers : {},
            otherDetails: draft.otherDetails && typeof draft.otherDetails === 'object' ? draft.otherDetails : {},
            completedMissions: Array.isArray(draft.completedMissions)
                ? draft.completedMissions.filter(index => Number.isInteger(index) && index >= 1 && index <= 10)
                : [],
            journeyStarted: Boolean(draft.journeyStarted),
            currentScreen: ['question', 'review', 'complete'].includes(draft.currentScreen) ? draft.currentScreen : 'question',
            pendingNextIndex: Number.isInteger(Number(draft.pendingNextIndex)) ? Number(draft.pendingNextIndex) : 0,
            completionSection: Number.isInteger(Number(draft.completionSection)) ? Math.max(0, Math.min(10, Number(draft.completionSection))) : 0
        };
        sanitizeDraft();
        return state.journeyStarted || countAnswered() > 0 || state.completedMissions.length > 0;
    }

    function sanitizeDraft() {
        const normalizedAnswers = {};
        const normalizedOtherDetails = {};
        allQuestions.forEach(question => {
            const key = questionKey(question);
            const answer = state.answers[key];
            if (question.type === 'text') {
                if (typeof answer === 'string' && answer.trim()) normalizedAnswers[key] = answer.slice(0, 4000);
            } else if (question.type === 'checkbox') {
                if (Array.isArray(answer)) {
                    const choices = [...new Set(answer.filter(value => question.options.includes(value)))].slice(0, question.max);
                    if (choices.length) normalizedAnswers[key] = choices;
                }
            } else {
                const options = question.type === 'scale' ? survey.scale.map(option => option.value) : question.options;
                if (typeof answer === 'string' && options.includes(answer)) normalizedAnswers[key] = answer;
            }
            if (question.other && typeof state.otherDetails[key] === 'string') {
                const normalized = state.otherDetails[key].slice(0, 400);
                const selected = Array.isArray(normalizedAnswers[key]) ? normalizedAnswers[key].includes(question.other) : normalizedAnswers[key] === question.other;
                if (selected && normalized.trim()) normalizedOtherDetails[key] = normalized;
            }
        });
        state.answers = normalizedAnswers;
        state.otherDetails = normalizedOtherDetails;
        state.completedMissions = [...new Set(state.completedMissions)].sort((a, b) => a - b);
    }

    function saveDraft() {
        try {
            sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
            sessionStorage.removeItem(LEGACY_STORAGE_KEY);
            storageAvailable = true;
        } catch (error) {
            storageAvailable = false;
        }
        updateSaveStatus();
        return storageAvailable;
    }

    function clearDraft() {
        try {
            sessionStorage.removeItem(STORAGE_KEY);
            sessionStorage.removeItem(LEGACY_STORAGE_KEY);
        } catch (error) { storageAvailable = false; }
    }

    function questionKey(question) { return `q${question.id}`; }

    function answerFor(question) { return state.answers[questionKey(question)]; }

    function isAnswered(question) {
        const answer = answerFor(question);
        if (Array.isArray(answer)) return answer.length > 0;
        return typeof answer === 'string' && answer.trim() !== '';
    }

    function countAnswered() { return allQuestions.filter(isAnswered).length; }

    function questionsForSection(sectionIndex) {
        return allQuestions.filter(question => question.sectionIndex === sectionIndex);
    }

    function answeredInSection(sectionIndex) {
        return questionsForSection(sectionIndex).filter(isAnswered).length;
    }

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

    function updateSaveStatus(justSaved) {
        const status = elements['answer-save-status'];
        if (!status) return;
        status.classList.toggle('is-warning', !storageAvailable);
        status.classList.toggle('is-saved', Boolean(justSaved && storageAvailable));
        const text = status.querySelector('span');
        if (text) text.textContent = storageAvailable
            ? (justSaved ? 'حُفظت الإجابة في هذا التبويب' : 'المسودة محفوظة في هذا التبويب')
            : 'تعذر حفظ المسودة في هذا المتصفح';
        if (justSaved && storageAvailable) window.setTimeout(() => status.classList.remove('is-saved'), 1100);
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
            const sectionQuestions = questionsForSection(sectionIndex);
            const answered = sectionQuestions.filter(isAnswered).length;
            const progress = sectionQuestions.length ? Math.round((answered / sectionQuestions.length) * 100) : 0;
            const status = complete ? 'تمت زيارتها' : answered ? `${answered} من ${sectionQuestions.length} إجابات` : 'جاهزة للبدء';
            return `<button type="button" class="mission-tile${complete ? ' is-complete' : ''}${active ? ' is-current' : ''}" data-mission-section="${sectionIndex}" aria-label="${escapeHtml(section.name)}: ${escapeHtml(section.title)}، ${escapeHtml(status)}"${active ? ' aria-current="step"' : ''}><span class="mission-tile__top"><span class="mission-tile__number" dir="ltr">${String(index + 1).padStart(2, '0')}</span><span class="mission-tile__icon"><i class="fa-solid ${escapeHtml(section.icon)}" aria-hidden="true"></i></span></span><strong class="mission-tile__title">${escapeHtml(label)}</strong><span class="mission-tile__progress"><span class="mission-tile__bar"><i style="width:${progress}%"></i></span><span dir="ltr">${answered}/${sectionQuestions.length}</span></span><span class="mission-tile__status">${escapeHtml(status)}</span></button>`;
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
        const percent = Math.round((answered / allQuestions.length) * 100);
        elements['journey-progress-label'].textContent = `السؤال ${displayIndex} من ${allQuestions.length}`;
        elements['journey-progress-percent'].textContent = `${percent}%`;
        elements['journey-progress-fill'].style.width = `${percent}%`;
        elements['journey-progress-track'].setAttribute('aria-valuenow', String(answered));
        elements['journey-progress-track'].setAttribute('aria-valuetext', `أجبت عن ${answered} من ${allQuestions.length} سؤالاً اختيارياً`);
        elements['answered-count'].textContent = String(answered);
        elements['sidebar-answered-count'].textContent = `${answered}/40`;
        if (elements['toolbar-answered-count']) elements['toolbar-answered-count'].textContent = `${answered}/40`;
        renderMaps();
    }

    function answerChoice(question, option, index, checkbox) {
        const answer = answerFor(question);
        const selected = checkbox ? Array.isArray(answer) && answer.includes(option) : answer === option;
        const type = checkbox ? 'checkbox' : 'radio';
        return `<label class="answer-choice${selected ? ' is-selected' : ''}"><input type="${type}" name="q${question.id}" value="${escapeHtml(option)}" data-answer-id="${question.id}"${selected ? ' checked' : ''}><span class="answer-choice__mark" aria-hidden="true"></span><span>${escapeHtml(option)}</span></label>`;
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
        return `<fieldset><legend>اختر درجة من 1 إلى 5، أو أحد الخيارين الإضافيين عند الحاجة.</legend><div class="scale-endpoints" aria-hidden="true"><span>1 · لا أوافق إطلاقاً</span><span>5 · أوافق تماماً</span></div><div class="scale-options">${main}</div><div class="scale-alternatives">${alternatives}</div></fieldset>`;
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
        if (screenName !== 'success') state.currentScreen = screenName;
    }

    function focusAfterRender(element) {
        window.requestAnimationFrame(() => {
            element?.focus({ preventScroll: true });
            const content = document.querySelector('.journey-content');
            if (content) content.scrollTo({ top: 0, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
        });
    }

    function renderQuestionStepper(question) {
        const sectionQuestions = questionsForSection(question.sectionIndex);
        if (!elements['mission-question-nav']) return;
        elements['mission-question-nav'].innerHTML = sectionQuestions.map(item => {
            const globalIndex = allQuestions.findIndex(candidate => candidate.id === item.id);
            const current = item.id === question.id;
            const answered = isAnswered(item);
            return `<button type="button" class="question-step${current ? ' is-current' : ''}${answered ? ' is-answered' : ''}" data-question-index="${globalIndex}" aria-label="السؤال ${item.sectionPosition + 1} من ${item.sectionLength}${answered ? '، تمت الإجابة' : '، دون إجابة'}"${current ? ' aria-current="step"' : ''}><span>${item.sectionPosition + 1}</span></button>`;
        }).join('');
    }

    function renderQuestion(options = {}) {
        const question = allQuestions[state.currentQuestion];
        if (!question) return;
        const section = sections[question.sectionIndex];
        setVisibleScreen('question');
        if (elements['current-mission-title']) elements['current-mission-title'].textContent = sectionIndexLabel(question.sectionIndex);
        elements['mission-label'].textContent = `${section.name} · ${section.title}`;
        elements['mission-purpose'].textContent = section.purpose;
        elements['question-position'].textContent = `${question.sectionPosition + 1} / ${question.sectionLength}`;
        elements['question-number'].textContent = `س${pad(question.id)}`;
        elements['question-title'].textContent = question.q;
        elements['question-help'].textContent = question.hint || (question.type === 'scale' ? '1 تعني «لا أوافق إطلاقاً» و5 تعني «أوافق تماماً».' : 'يمكنك الإجابة أو تجاوز السؤال من دون أي إلزام.');
        elements['answer-area'].innerHTML = renderAnswerArea(question);
        renderQuestionStepper(question);
        if (elements['answer-clear']) elements['answer-clear'].hidden = !isAnswered(question);
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

    function sectionIndexLabel(sectionIndex) {
        const section = sections[sectionIndex];
        return sectionIndex === 0 ? section.name : `${section.name} · ${section.shortTitle || section.title}`;
    }

    function openJourneyShell() {
        elements.journey.hidden = false;
        document.body.classList.add('is-journey-active');
        document.querySelector('.journey-toolbar__missions')?.setAttribute('aria-expanded', 'false');
    }

    function closeJourney() {
        document.body.classList.remove('is-journey-active');
        closeMissionDrawer();
        elements.journey.hidden = true;
        elements['draft-resume'].hidden = false;
        updateDraftSummary();
        updateHeroStartButton(true);
        document.querySelector('[data-action="resume-draft"]')?.focus({ preventScroll: true });
    }

    function startJourney(resume) {
        state.journeyStarted = true;
        if (!resume && countAnswered() === 0 && state.completedMissions.length === 0) state.currentQuestion = 0;
        openJourneyShell();
        saveDraft();
        if (resume && state.currentScreen === 'review') showReview();
        else if (resume && state.currentScreen === 'complete') showMissionComplete(state.completionSection, true);
        else renderQuestion();
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
        state.pendingNextIndex = pendingNextIndex;
        const wasComplete = state.completedMissions.includes(question.sectionIndex);
        if (question.sectionIndex > 0 && !wasComplete) {
            state.completedMissions.push(question.sectionIndex);
            state.completedMissions.sort((a, b) => a - b);
        }
        const milestone = question.sectionIndex === 0 || question.sectionIndex === 5 || question.sectionIndex === 10;
        if (!wasComplete && milestone) showMissionComplete(question.sectionIndex);
        else {
            saveDraft();
            if (!wasComplete && question.sectionIndex > 0) toast(`اكتملت ${sections[question.sectionIndex].name}. أُضيئت بطاقتها في لوحة المهمات.`);
            continueAfterMission();
        }
    }

    function showMissionComplete(sectionIndex, restoring) {
        const section = sections[sectionIndex];
        activeCompletionSection = sectionIndex;
        state.completionSection = sectionIndex;
        state.pendingNextIndex = pendingNextIndex || state.pendingNextIndex;
        setVisibleScreen('complete');
        saveDraft();
        const icon = elements['mission-complete'].querySelector('.mission-key i');
        if (icon) icon.className = sectionIndex === 0 ? 'fa-solid fa-compass' : 'fa-solid fa-key';
        elements['mission-complete-title'].textContent = sectionIndex === 0 ? 'أصبحت مستعداً للمحطات العشر' : `اكتملت ${section.name}`;
        elements['mission-complete-text'].textContent = sectionIndex === 0
            ? 'شكراً لتوضيح طبيعة تجربتك. تبدأ الآن محاور التقييم، ويمكنك تجاوز أي سؤال لا ينطبق عليك.'
            : sectionIndex === 5
                ? 'وصلت إلى منتصف الرحلة. بطاقات المحطات تعرض ما أجبت عنه وما تركته اختيارياً، ويمكنك العودة إلى أي منها.'
                : 'اكتملت المحطات العشر. بقيت لك مراجعة هادئة قبل أن تقرر إرسال الإجابات إلى الجمعية.';
        const answered = answeredInSection(sectionIndex);
        const total = questionsForSection(sectionIndex).length;
        elements['mission-complete-stats'].innerHTML = `<div><strong dir="ltr">${answered}/${total}</strong><span>إجابات في هذه المحطة</span></div><div><strong dir="ltr">${countAnswered()}/40</strong><span>إجابات في الرحلة</span></div>`;
        elements['mission-progress-collection'].innerHTML = sections.slice(1).map((item, index) => `<span class="${state.completedMissions.includes(index + 1) ? 'is-complete' : ''}${sectionIndex === index + 1 ? ' is-current' : ''}" aria-label="${escapeHtml(item.name)}${state.completedMissions.includes(index + 1) ? ' مكتملة' : ''}">${index + 1}</span>`).join('');
        const continueButton = elements['mission-complete'].querySelector('[data-action="continue-after-mission"]');
        if (continueButton) continueButton.innerHTML = sectionIndex >= 10 ? 'مراجعة الإجابات <i class="fa-solid fa-arrow-left" aria-hidden="true"></i>' : `متابعة إلى ${sectionIndex === 0 ? 'المحطة الأولى' : sections[Math.min(sectionIndex + 1, 10)].name} <i class="fa-solid fa-arrow-left" aria-hidden="true"></i>`;
        updateProgress();
        if (!restoring) focusAfterRender(elements['mission-complete-title']);
        announce(sectionIndex === 0 ? 'اكتملت بوابة الانطلاق.' : `اكتملت ${section.name} من عشر محطات.`);
    }

    function continueAfterMission() {
        pendingNextIndex = state.pendingNextIndex || pendingNextIndex;
        if (pendingNextIndex >= allQuestions.length) {
            showReview();
            return;
        }
        state.currentQuestion = pendingNextIndex;
        renderQuestion();
    }

    function returnToMission() {
        const firstIndex = allQuestions.findIndex(question => question.sectionIndex === activeCompletionSection);
        if (firstIndex >= 0) {
            state.currentQuestion = firstIndex;
            renderQuestion();
        }
    }

    function goPrevious() {
        if (state.currentQuestion <= 0) return;
        state.currentQuestion -= 1;
        renderQuestion();
    }

    function jumpToSection(sectionIndex) {
        const sectionQuestions = questionsForSection(sectionIndex);
        const target = sectionQuestions.find(question => !isAnswered(question)) || sectionQuestions[0];
        const firstIndex = target ? allQuestions.findIndex(question => question.id === target.id) : -1;
        if (firstIndex < 0) return;
        state.journeyStarted = true;
        state.currentQuestion = firstIndex;
        openJourneyShell();
        closeMissionDrawer();
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
        const unansweredOnly = Boolean(elements['review-unanswered-only']?.checked);
        elements['review-list'].innerHTML = sections.map((section, sectionIndex) => {
            const sectionAnswered = section.questions.filter(question => isAnswered(question)).length;
            const visibleQuestions = unansweredOnly ? section.questions.filter(question => !isAnswered(question)) : section.questions;
            if (!visibleQuestions.length) return '';
            const answers = visibleQuestions.map(question => {
                const answered = isAnswered(question);
                return `<div class="review-answer"><span class="review-answer__number">س${pad(question.id)}</span><div><strong>${escapeHtml(question.q)}</strong><p class="${answered ? '' : 'is-empty'}">${escapeHtml(formatAnswer(question))}</p></div><button type="button" data-edit-question="${question.id}">تعديل</button></div>`;
            }).join('');
            const open = sectionIndex === 0 || sectionAnswered < section.questions.length || unansweredOnly;
            return `<details class="review-section"${open ? ' open' : ''}><summary class="review-section__heading"><span><h3>${escapeHtml(section.name)} · ${escapeHtml(section.title)}</h3><small>${sectionAnswered === section.questions.length ? 'تمت الإجابة عن جميع أسئلة المحطة' : `${section.questions.length - sectionAnswered} أسئلة متروكة اختيارياً`}</small></span><strong><bdi dir="ltr">${sectionAnswered} / ${section.questions.length}</bdi><i aria-hidden="true"></i></strong></summary><div class="review-section__answers">${answers}</div></details>`;
        }).join('');
        if (!elements['review-list'].innerHTML.trim()) elements['review-list'].innerHTML = '<p class="review-empty">لا توجد أسئلة غير مجاب عنها. يمكنك الإرسال أو العودة لتعديل أي إجابة.</p>';
    }

    function showReview() {
        state.journeyStarted = true;
        openJourneyShell();
        closeMissionDrawer();
        setVisibleScreen('review');
        if (elements['current-mission-title']) elements['current-mission-title'].textContent = 'مراجعة الرحلة قبل الإرسال';
        renderReviewList();
        const answered = countAnswered();
        elements['review-answered-count'].textContent = String(answered);
        if (elements['review-dashboard-answered']) elements['review-dashboard-answered'].textContent = `${answered} / 40`;
        if (elements['review-unanswered-count']) elements['review-unanswered-count'].textContent = String(40 - answered);
        if (elements['review-mission-count']) elements['review-mission-count'].textContent = `${state.completedMissions.length} / 10`;
        elements['submission-status'].textContent = '';
        elements['submission-status'].className = 'submission-status';
        updateProgress();
        saveDraft();
        ensureApiSession(true).catch(() => {
            setSubmissionStatus('يمكنك متابعة المراجعة. سنعيد محاولة تجهيز الإرسال عند الضغط على زر الإرسال.', '');
        });
        focusAfterRender(elements['review-title']);
        announce(`مراجعة الإجابات. أجبت عن ${answered} من 40 سؤالاً.`);
    }

    function editQuestion(questionId) {
        const index = allQuestions.findIndex(question => question.id === questionId);
        if (index < 0) return;
        state.currentQuestion = index;
        renderQuestion();
    }

    function goToFirstUnanswered() {
        const index = allQuestions.findIndex(question => !isAnswered(question));
        if (index < 0) {
            toast('أجبت عن جميع الأسئلة. ما زال بإمكانك تعديل أي إجابة من قائمة المراجعة.');
            return;
        }
        state.currentQuestion = index;
        renderQuestion();
    }

    function clearCurrentAnswer() {
        const question = allQuestions[state.currentQuestion];
        if (!question || !isAnswered(question)) return;
        const key = questionKey(question);
        delete state.answers[key];
        delete state.otherDetails[key];
        renderQuestion({ focus: false });
        elements['question-title']?.focus({ preventScroll: true });
        toast('مُسحت إجابة هذا السؤال. تركه فارغاً مقبول.');
        announce(`مُسحت إجابة السؤال ${question.id}.`);
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
        updateSaveStatus(true);
        if (elements['answer-clear']) elements['answer-clear'].hidden = false;
        renderQuestionStepper(question);
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
            updateSaveStatus(true);
            if (elements['answer-clear']) elements['answer-clear'].hidden = !target.value.trim();
            renderQuestionStepper(question);
            return;
        }
        if (target.matches('[data-other-id]')) {
            const questionId = Number(target.dataset.otherId);
            const question = allQuestions.find(item => item.id === questionId);
            if (!question) return;
            state.otherDetails[questionKey(question)] = target.value;
            saveDraft();
            updateSaveStatus(true);
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
            response_id: state.responseId,
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

    async function postEvaluation(token) {
        const controller = new AbortController();
        const timeout = window.setTimeout(() => controller.abort(), 25000);
        try {
            const response = await fetch(API_URL, {
                method: 'POST',
                credentials: 'same-origin',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                    'X-CSRF-Token': token
                },
                body: JSON.stringify(submissionPayload()),
                signal: controller.signal
            });
            const data = await response.json().catch(() => ({}));
            return { response, data };
        } finally {
            window.clearTimeout(timeout);
        }
    }

    async function submitEvaluation(button) {
        if (!elements['submission-consent'].checked) {
            setSubmissionStatus('يرجى قراءة توضيح الخصوصية ووضع علامة الموافقة قبل الإرسال.', 'error');
            elements['submission-consent'].focus();
            return;
        }
        if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(state.responseId || '')) {
            setSubmissionStatus('لا يستطيع هذا المتصفح إنشاء مرجع إرسال آمن. يمكنك تنزيل نسخة محلية أو استخدام متصفح حديث ثم بدء استجابة جديدة.', 'error');
            return;
        }
        button.disabled = true;
        button.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin" aria-hidden="true"></i> جارٍ الإرسال…';
        setSubmissionStatus('جارٍ إرسال إجاباتك بصورة آمنة. لا تغلق الصفحة الآن.', '');
        try {
            let token = await ensureApiSession();
            let result = await postEvaluation(token);
            if (result.response.status === 403 && result.data?.error?.code === 'csrf_failed') {
                csrfToken = '';
                token = await ensureApiSession(true);
                result = await postEvaluation(token);
            }
            const { response, data } = result;
            if (!response.ok || !data.ok) {
                const error = new Error(data?.error?.message || 'تعذر حفظ الإجابة حالياً.');
                error.code = data?.error?.code || '';
                error.status = response.status;
                throw error;
            }
            setSubmissionStatus(data.idempotent_replay ? 'تم تأكيد أن هذه الإجابات استُلمت سابقاً؛ لم تُنشأ نسخة مكررة.' : 'تم استلام الإجابات بنجاح.', 'success');
            clearDraft();
            csrfToken = '';
            setVisibleScreen('success');
            elements['confirmation-code'].textContent = String(data.submission_id || '').slice(0, 12).toUpperCase() || 'تم الاستلام';
            focusAfterRender(elements['success-title']);
            announce('تم استلام إجاباتك بنجاح. شكراً لمساهمتك.');
        } catch (error) {
            const conflict = error.code === 'response_id_conflict';
            const prefix = error.name === 'AbortError'
                ? 'انتهت مهلة الاتصال ولم نتمكن من تأكيد الاستلام.'
                : (error.message || 'تعذر تأكيد الاستلام حالياً.');
            const guidance = conflict
                ? ' تغيّرت بيانات استجابة سبق استلامها بهذا المرجع. ابدأ استجابة جديدة إذا كنت تريد إرسال نسخة مختلفة.'
                : ' بقيت المسودة في هذا التبويب؛ أعد المحاولة بنفس الزر، وسيمنع النظام إنشاء نسخة مكررة إن كانت المحاولة الأولى قد وصلت.';
            setSubmissionStatus(`${prefix}${guidance}`, 'error');
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
        pendingNextIndex = 0;
        activeCompletionSection = 0;
        csrfToken = '';
        clearDraft();
        elements['submission-consent'].checked = false;
        elements['draft-resume'].hidden = true;
        renderMaps();
        startJourney(false);
        toast('بدأت استجابة جديدة وفارغة.');
    }

    function discardAndStart() {
        if ((countAnswered() > 0 || state.completedMissions.length > 0) && !window.confirm('هل تريد مسح المسودة الحالية وبدء استجابة جديدة؟ لا يمكن التراجع عن ذلك.')) return;
        resetJourney();
    }

    function clearCurrentDraft() {
        if (!window.confirm('هل تريد مسح كل الإجابات والتقدم المحفوظ في علامة التبويب هذه؟ لا يمكن التراجع عن ذلك.')) return;
        state = defaultState();
        csrfToken = '';
        clearDraft();
        elements.journey.hidden = true;
        document.body.classList.remove('is-journey-active');
        closeMissionDrawer();
        elements['draft-resume'].hidden = true;
        updateHeroStartButton(false);
        renderMaps();
        document.getElementById('evaluation-intro')?.scrollIntoView({ behavior: 'smooth' });
        toast('مُسحت المسودة من علامة التبويب الحالية.');
    }

    function updateDraftSummary() {
        if (!elements['draft-summary']) return;
        const answered = countAnswered();
        const section = sections[currentSectionIndex()];
        elements['draft-summary'].textContent = `${answered} من 40 إجابة · ${section?.name || 'بوابة الانطلاق'} · محفوظة في جلسة علامة التبويب الحالية`;
    }

    function updateHeroStartButton(hasDraft) {
        const button = document.querySelector('.evaluation-hero__actions button[data-action]');
        if (!button) return;
        button.dataset.action = hasDraft ? 'resume-draft' : 'start-journey';
        button.innerHTML = `${hasDraft ? 'فتح المسودة' : 'ابدأ الرحلة'} <i class="fa-solid fa-arrow-left" aria-hidden="true"></i>`;
    }

    function toggleMissionDrawer() {
        const sidebar = elements['journey-sidebar'];
        if (!sidebar) return;
        const opening = !sidebar.classList.contains('is-open');
        sidebar.classList.toggle('is-open', opening);
        document.body.classList.toggle('is-mission-drawer-open', opening);
        document.querySelector('.journey-toolbar__missions')?.setAttribute('aria-expanded', String(opening));
        if (opening) sidebar.querySelector('[data-mission-section]')?.focus({ preventScroll: true });
    }

    function closeMissionDrawer() {
        elements['journey-sidebar']?.classList.remove('is-open');
        document.body.classList.remove('is-mission-drawer-open');
        document.querySelector('.journey-toolbar__missions')?.setAttribute('aria-expanded', 'false');
    }

    async function copyConfirmation() {
        const value = elements['confirmation-code']?.textContent?.trim();
        if (!value || value === '—') return;
        try {
            await navigator.clipboard.writeText(value);
            toast('نُسخ مرجع الاستلام.');
        } catch (error) {
            const range = document.createRange();
            range.selectNodeContents(elements['confirmation-code']);
            const selection = window.getSelection();
            selection.removeAllRanges();
            selection.addRange(range);
            toast('حددنا المرجع؛ يمكنك نسخه الآن.');
        }
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
                else if (action === 'discard-and-start') discardAndStart();
                else if (action === 'open-privacy') openPrivacy();
                else if (action === 'close-journey') closeJourney();
                else if (action === 'toggle-missions') toggleMissionDrawer();
                else if (action === 'previous-question') goPrevious();
                else if (action === 'skip-question') moveForward(true);
                else if (action === 'next-question') moveForward(false);
                else if (action === 'continue-after-mission') continueAfterMission();
                else if (action === 'return-to-mission') returnToMission();
                else if (action === 'show-review') showReview();
                else if (action === 'back-to-questions') renderQuestion();
                else if (action === 'first-unanswered') goToFirstUnanswered();
                else if (action === 'clear-answer') clearCurrentAnswer();
                else if (action === 'download-copy') downloadCopy();
                else if (action === 'submit-evaluation') submitEvaluation(actionButton);
                else if (action === 'start-new-response') resetJourney();
                else if (action === 'clear-draft') clearCurrentDraft();
                else if (action === 'copy-confirmation') copyConfirmation();
            }
            const missionButton = event.target.closest('[data-mission-section]');
            if (missionButton) jumpToSection(Number(missionButton.dataset.missionSection));
            const editButton = event.target.closest('[data-edit-question]');
            if (editButton) editQuestion(Number(editButton.dataset.editQuestion));
            const questionStep = event.target.closest('[data-question-index]');
            if (questionStep) {
                state.currentQuestion = Number(questionStep.dataset.questionIndex);
                renderQuestion();
            }
        });

        document.addEventListener('change', event => {
            const input = event.target.closest('[data-answer-id]');
            if (input instanceof HTMLInputElement) handleAnswerChange(input);
            if (event.target === elements['review-unanswered-only']) renderReviewList();
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
        document.addEventListener('keydown', event => {
            if (event.key === 'Escape' && document.body.classList.contains('is-mission-drawer-open')) {
                closeMissionDrawer();
                document.querySelector('.journey-toolbar__missions')?.focus();
            }
        });
    }

    function initialize() {
        cacheElements();
        const hasDraft = loadDraft();
        elements['draft-resume'].hidden = !hasDraft;
        if (hasDraft) {
            updateDraftSummary();
            updateHeroStartButton(true);
        }
        bindEvents();
        renderMaps();
        updateSaveStatus();
        ensureApiSession().catch(() => {
            // The visitor can still answer and download a local copy if the endpoint is unavailable.
        });
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initialize);
    else initialize();
}());
