(function () {
    'use strict';

    const survey = window.AMJAD_EVALUATION;
    if (!survey || !Array.isArray(survey.sections)) return;

    const STORAGE_KEY = 'amjad_evaluation_draft_v2';
    const LEGACY_STORAGE_KEY = 'amjad_evaluation_draft_v1';
    const DRAFT_SCHEMA_VERSION = 2;
    const API_URL = 'api/evaluation.php';
    const AUTO_ADVANCE_MS = 900;
    // Brand accents cycled across stations (forest/emerald, burgundy, gold, deep forest).
    const ACCENTS = ['#0d7658', '#861f47', '#b7862b', '#1d5f4c'];
    const CONFETTI_COLORS = ['#10b981', '#0d7658', '#861f47', '#d8b060', '#f3dca6', '#123f34'];
    const sections = survey.sections;
    const allQuestions = sections.flatMap((section, sectionIndex) => section.questions.map((question, sectionPosition) => ({
        ...question,
        sectionIndex,
        sectionPosition,
        sectionLength: section.questions.length
    })));
    const sectionStart = sections.map((section, index) => allQuestions.findIndex(question => question.sectionIndex === index));

    const elements = {};
    let state = defaultState();
    let csrfToken = '';
    let toastTimer = 0;
    let pendingNextIndex = 0;
    let apiPromise = null;
    let storageAvailable = true;
    let activeCompletionSection = 0;
    let advanceTimer = 0;
    let burstTimer = 0;
    let boardObserver = null;
    let lastRenderedQuestion = -1;

    const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const accentFor = sectionIndex => sectionIndex === 0 ? '#b7862b' : ACCENTS[(sectionIndex - 1) % ACCENTS.length];

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
            completionSection: 0,
            autoAdvance: true
        };
    }

    function cacheElements() {
        [
            'evaluation-mobile-nav', 'privacy-dialog', 'draft-resume', 'journey',
            'hero-mission-map', 'hero-board-stage', 'compact-mission-map', 'hero-mission-counter', 'compact-mission-counter',
            'journey-progress-label', 'journey-progress-percent', 'journey-progress-track', 'journey-progress-fill',
            'passport-progress-fill', 'hud-milestones', 'hud-runner', 'hud-stamps', 'hud-station-icon',
            'answered-count', 'sidebar-answered-count', 'toolbar-answered-count', 'journey-live-status', 'question-screen',
            'mission-label', 'mission-purpose', 'question-position', 'question-card', 'question-number', 'station-icon',
            'question-title', 'question-help', 'answer-area', 'answer-clear', 'answer-save-status', 'mission-question-nav',
            'current-mission-title', 'journey-sidebar', 'mission-complete', 'mission-complete-title', 'mission-complete-stamp',
            'mission-complete-text', 'mission-complete-stats', 'mission-progress-collection',
            'review-screen', 'review-title', 'review-answered-count', 'review-dashboard-answered', 'review-stamps',
            'review-unanswered-count', 'review-mission-count', 'review-unanswered-only', 'review-list',
            'submission-consent', 'submission-status', 'success-screen', 'success-title', 'success-stamps', 'confirmation-code',
            'evaluation-toast', 'draft-summary', 'auto-advance-toggle', 'auto-advance-meter', 'asil-bubble',
            'stamp-burst', 'stamp-burst-title', 'stamp-burst-count', 'confetti-layer', 'hud-progress-label'
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
            completionSection: Number.isInteger(Number(draft.completionSection)) ? Math.max(0, Math.min(10, Number(draft.completionSection))) : 0,
            autoAdvance: draft.autoAdvance !== false
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
            ? (justSaved ? 'حُفظت الإجابة' : 'المسودة محفوظة')
            : 'تعذر حفظ المسودة في هذا المتصفح';
        if (justSaved && storageAvailable) window.setTimeout(() => status.classList.remove('is-saved'), 1100);
    }

    function currentSectionIndex() {
        return allQuestions[state.currentQuestion]?.sectionIndex ?? 0;
    }

    /* ------------------------------------------------------------ Board */

    function nextStationIndex() {
        if (state.journeyStarted && state.currentScreen !== 'review') {
            const current = currentSectionIndex();
            if (current > 0) return current;
        }
        for (let index = 1; index < sections.length; index += 1) {
            if (!state.completedMissions.includes(index)) return index;
        }
        return sections.length - 1;
    }

    function stationStatus(sectionIndex) {
        const sectionQuestions = questionsForSection(sectionIndex);
        const answered = sectionQuestions.filter(isAnswered).length;
        const complete = state.completedMissions.includes(sectionIndex);
        return {
            answered,
            total: sectionQuestions.length,
            complete,
            progress: sectionQuestions.length ? Math.round((answered / sectionQuestions.length) * 100) : 0,
            label: complete ? 'طابع محصّل' : answered ? `${answered} من ${sectionQuestions.length} إجابات` : 'بانتظارك'
        };
    }

    function renderBoard(container) {
        if (!container) return;
        const next = nextStationIndex();
        const current = state.journeyStarted ? currentSectionIndex() : -1;
        container.innerHTML = sections.slice(1).map((section, index) => {
            const sectionIndex = index + 1;
            const status = stationStatus(sectionIndex);
            const classes = ['mission-tile', 'board-node'];
            if (status.complete) classes.push('is-complete');
            if (sectionIndex === next) classes.push('is-next');
            if (sectionIndex === current) classes.push('is-current');
            const label = section.shortTitle || section.title;
            return `<button type="button" class="${classes.join(' ')}" style="--node-accent:${accentFor(sectionIndex)}" data-mission-section="${sectionIndex}" data-board-index="${index}" aria-label="${escapeHtml(section.name)}: ${escapeHtml(section.title)}، ${escapeHtml(status.label)}"${sectionIndex === current ? ' aria-current="step"' : ''}>`
                + `<span class="board-node__disc" style="--p:${status.complete ? 100 : status.progress}"><i class="fa-solid ${escapeHtml(section.icon)}" aria-hidden="true"></i><span class="board-node__num" dir="ltr">${sectionIndex}</span>${status.complete ? '<span class="board-node__check" aria-hidden="true"><i class="fa-solid fa-check"></i></span>' : ''}${sectionIndex === 10 ? '<span class="board-node__flag" aria-hidden="true"><i class="fa-solid fa-flag-checkered"></i></span>' : ''}</span>`
                + `<span class="board-node__title">${escapeHtml(label)}</span><span class="board-node__meta" dir="ltr">${status.answered}/${status.total}</span></button>`;
        }).join('');
        layoutBoard();
    }

    function boardColumns(width) {
        if (width < 340) return 3;
        if (width < 470) return 4;
        return 5;
    }

    function smoothPath(points) {
        if (!points.length) return '';
        if (points.length === 1) return `M${points[0].x},${points[0].y}`;
        let d = `M${points[0].x.toFixed(1)},${points[0].y.toFixed(1)}`;
        for (let i = 0; i < points.length - 1; i += 1) {
            const p0 = points[i - 1] || points[i];
            const p1 = points[i];
            const p2 = points[i + 1];
            const p3 = points[i + 2] || p2;
            const c1x = p1.x + (p2.x - p0.x) / 6;
            const c1y = p1.y + (p2.y - p0.y) / 6;
            const c2x = p2.x - (p3.x - p1.x) / 6;
            const c2y = p2.y - (p3.y - p1.y) / 6;
            d += ` C${c1x.toFixed(1)},${c1y.toFixed(1)} ${c2x.toFixed(1)},${c2y.toFixed(1)} ${p2.x.toFixed(1)},${p2.y.toFixed(1)}`;
        }
        return d;
    }

    function layoutBoard() {
        const stage = elements['hero-board-stage'];
        const board = elements['hero-mission-map'];
        if (!stage || !board || !board.children.length) return;
        const columns = boardColumns(board.clientWidth);
        board.style.setProperty('--board-cols', String(columns));
        [...board.children].forEach((node, index) => {
            const row = Math.floor(index / columns);
            const position = index % columns;
            node.style.gridRow = String(row + 1);
            node.style.gridColumn = String(row % 2 === 0 ? position + 1 : columns - position);
        });

        const stageBox = stage.getBoundingClientRect();
        const points = [...board.querySelectorAll('.board-node__disc')].map(disc => {
            const box = disc.getBoundingClientRect();
            return { x: box.left - stageBox.left + box.width / 2, y: box.top - stageBox.top + box.height / 2, size: box.width };
        });
        if (!points.length) return;
        const next = nextStationIndex();
        const allDone = state.completedMissions.length >= 10;
        const progressPoints = points.slice(0, allDone ? points.length : Math.max(1, next));
        const width = stage.clientWidth;
        const height = stage.clientHeight;
        let svg = stage.querySelector('.game-board__path');
        if (!svg) {
            svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            svg.setAttribute('class', 'game-board__path');
            svg.setAttribute('aria-hidden', 'true');
            svg.setAttribute('focusable', 'false');
            stage.prepend(svg);
        }
        svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
        const route = smoothPath(points);
        svg.innerHTML = `<path class="path-base" d="${route}"></path><path class="path-progress" d="${smoothPath(progressPoints)}"></path><path class="path-dash" d="${route}"></path>`;
        if (progressPoints.length < 2) svg.querySelector('.path-progress')?.remove();

        let avatar = stage.querySelector('.game-board__avatar');
        if (!avatar) {
            avatar = document.createElement('span');
            avatar.className = 'game-board__avatar';
            avatar.setAttribute('aria-hidden', 'true');
            avatar.innerHTML = '<img src="images/asil-avatar.webp" alt="" width="46" height="46">';
            stage.appendChild(avatar);
        }
        const target = points[Math.max(0, Math.min(points.length - 1, next - 1))];
        const size = Math.min(46, target.size - 8);
        avatar.style.width = `${size}px`;
        avatar.style.height = `${size}px`;
        avatar.style.transform = `translate(${(target.x - size / 2).toFixed(1)}px, ${(target.y - size / 2).toFixed(1)}px)`;
        avatar.style.left = '0';
        avatar.style.top = '0';
    }

    function watchBoard() {
        if (boardObserver || !('ResizeObserver' in window) || !elements['hero-board-stage']) return;
        let frame = 0;
        boardObserver = new ResizeObserver(() => {
            window.cancelAnimationFrame(frame);
            frame = window.requestAnimationFrame(layoutBoard);
        });
        boardObserver.observe(elements['hero-board-stage']);
    }

    /* --------------------------------------------------------- Passport */

    function renderPassport(container) {
        if (!container) return;
        const current = state.journeyStarted ? currentSectionIndex() : -1;
        container.innerHTML = sections.slice(1).map((section, index) => {
            const sectionIndex = index + 1;
            const status = stationStatus(sectionIndex);
            const active = sectionIndex === current && state.currentScreen === 'question';
            const label = section.shortTitle || section.title;
            return `<button type="button" class="mission-tile stamp-tile${status.complete ? ' is-complete' : ''}${active ? ' is-current' : ''}" style="--node-accent:${accentFor(sectionIndex)}" data-mission-section="${sectionIndex}" aria-label="${escapeHtml(section.name)}: ${escapeHtml(section.title)}، ${escapeHtml(status.label)}"${active ? ' aria-current="step"' : ''}>`
                + `<span class="stamp-tile__num" dir="ltr">${pad(sectionIndex)}</span><span class="stamp-tile__icon"><i class="fa-solid ${escapeHtml(section.icon)}" aria-hidden="true"></i></span>`
                + `<span class="stamp-tile__title">${escapeHtml(label)}</span><span class="stamp-tile__meta"><span class="stamp-tile__bar"><i style="width:${status.progress}%"></i></span><span dir="ltr">${status.answered}/${status.total}</span></span></button>`;
        }).join('');
    }

    function miniStamps(currentIndex) {
        return sections.slice(1).map((section, index) => {
            const sectionIndex = index + 1;
            const complete = state.completedMissions.includes(sectionIndex);
            return `<span class="mini-stamp${complete ? ' is-complete' : ''}${currentIndex === sectionIndex ? ' is-current' : ''}" style="--node-accent:${accentFor(sectionIndex)};--i:${index}" title="${escapeHtml(section.name)}" aria-label="${escapeHtml(section.name)}${complete ? ' — طابع محصّل' : ''}"><i class="fa-solid ${escapeHtml(section.icon)}" aria-hidden="true"></i></span>`;
        }).join('');
    }

    function renderMaps() {
        renderBoard(elements['hero-mission-map']);
        renderPassport(elements['compact-mission-map']);
        const completed = state.completedMissions.length;
        elements['hero-mission-counter'].textContent = `${completed} / 10`;
        elements['compact-mission-counter'].textContent = `${completed} / 10`;
        if (elements['hud-stamps']) elements['hud-stamps'].textContent = `${completed}/10`;
    }

    /* -------------------------------------------------------------- HUD */

    function renderHudMilestones() {
        const holder = elements['hud-milestones'];
        if (!holder) return;
        const last = allQuestions.length - 1;
        holder.innerHTML = sections.slice(1).map((section, index) => {
            const sectionIndex = index + 1;
            const position = (sectionStart[sectionIndex] / last) * 100;
            return `<i class="${state.completedMissions.includes(sectionIndex) ? 'is-complete' : ''}" style="right:${position.toFixed(2)}%"></i>`;
        }).join('');
    }

    function updateProgress() {
        const answered = countAnswered();
        const displayIndex = Math.min(state.currentQuestion + 1, allQuestions.length);
        const percent = Math.round((answered / allQuestions.length) * 100);
        const reviewing = state.currentScreen === 'review';
        const position = reviewing ? 100 : (state.currentQuestion / (allQuestions.length - 1)) * 100;
        elements['journey-progress-label'].textContent = `السؤال ${displayIndex} من ${allQuestions.length}`;
        if (elements['hud-progress-label']) {
            const sectionIndex = currentSectionIndex();
            elements['hud-progress-label'].textContent = reviewing
                ? 'المحطة الأخيرة: المراجعة والإرسال'
                : sectionIndex === 0 ? 'بوابة الانطلاق' : `المحطة ${sectionIndex} من 10`;
        }
        elements['journey-progress-percent'].textContent = `${percent}%`;
        if (elements['passport-progress-fill']) elements['passport-progress-fill'].style.width = `${percent}%`;
        elements['journey-progress-fill'].style.width = `${position}%`;
        if (elements['hud-runner']) elements['hud-runner'].style.setProperty('--pos', String(position / 100));
        elements['journey-progress-track'].setAttribute('aria-valuenow', String(answered));
        elements['journey-progress-track'].setAttribute('aria-valuetext', `أجبت عن ${answered} من ${allQuestions.length} سؤالاً اختيارياً`);
        elements['answered-count'].textContent = String(answered);
        elements['sidebar-answered-count'].textContent = `${answered}/40`;
        if (elements['toolbar-answered-count']) elements['toolbar-answered-count'].textContent = `${answered}/40`;
        renderHudMilestones();
        renderMaps();
    }

    function setStationTheme(sectionIndex) {
        const section = sections[sectionIndex];
        const accent = accentFor(sectionIndex);
        document.querySelector('.journey')?.style.setProperty('--accent', accent);
        const icon = `<i class="fa-solid ${escapeHtml(section.icon)}"></i>`;
        if (elements['station-icon']) elements['station-icon'].innerHTML = icon;
        if (elements['hud-station-icon']) elements['hud-station-icon'].innerHTML = icon;
    }

    /* ---------------------------------------------------------- Answers */

    function keyBadge(number) {
        return `<span class="answer-choice__key" aria-hidden="true" dir="ltr">${number}</span>`;
    }

    function answerChoice(question, option, index, checkbox, extraClass) {
        const answer = answerFor(question);
        const selected = checkbox ? Array.isArray(answer) && answer.includes(option) : answer === option;
        const type = checkbox ? 'checkbox' : 'radio';
        const key = index + 1 <= 9 ? keyBadge(index + 1) : '';
        return `<label class="answer-choice${checkbox ? ' answer-choice--checkbox' : ''}${extraClass ? ` ${extraClass}` : ''}${selected ? ' is-selected' : ''}" data-key="${index + 1}"><input type="${type}" name="q${question.id}" value="${escapeHtml(option)}" data-answer-id="${question.id}"${selected ? ' checked' : ''}>${key}<span class="answer-choice__text">${escapeHtml(option)}</span><i class="fa-solid fa-circle-check answer-choice__tick" aria-hidden="true"></i></label>`;
    }

    function renderRadio(question) {
        const optionsClass = question.options.length >= 6 && question.options.every(option => option.length <= 34) ? ' answer-options--two' : '';
        return `<fieldset><legend class="sr-only">${escapeHtml(question.q)}</legend><div class="answer-options${optionsClass}">${question.options.map((option, index) => answerChoice(question, option, index, false)).join('')}</div>${renderOther(question)}</fieldset>`;
    }

    function selectionDots(question, count) {
        return Array.from({ length: question.max }, (item, index) => `<i class="${index < count ? 'is-filled' : ''}"></i>`).join('');
    }

    function renderCheckbox(question) {
        const answer = Array.isArray(answerFor(question)) ? answerFor(question) : [];
        return `<fieldset><legend class="sr-only">${escapeHtml(question.q)} — حتى ${question.max} اختيارات</legend><div class="selection-limit"><span>اختر حتى ${question.max}: <strong id="selection-count-${question.id}" dir="ltr">${answer.length} / ${question.max}</strong></span><span class="selection-limit__dots" id="selection-dots-${question.id}" aria-hidden="true">${selectionDots(question, answer.length)}</span></div><div class="answer-options${question.options.every(option => option.length <= 34) ? ' answer-options--two' : ''}">${question.options.map((option, index) => answerChoice(question, option, index, true)).join('')}</div>${renderOther(question)}</fieldset>`;
    }

    function renderScale(question) {
        const answer = answerFor(question);
        const main = survey.scale.slice(0, 5).map(option => `<label class="scale-choice${answer === option.value ? ' is-selected' : ''}" title="${escapeHtml(option.label)}" data-key="${option.value}"><input type="radio" name="q${question.id}" value="${escapeHtml(option.value)}" data-answer-id="${question.id}" aria-label="${escapeHtml(option.label)}"${answer === option.value ? ' checked' : ''}><strong>${option.value}</strong><span>${escapeHtml(option.short)}</span></label>`).join('');
        const alternatives = survey.scale.slice(5).map((option, index) => answerChoice(question, option.value, index + 5, false, 'answer-choice--quiet')).join('');
        return `<fieldset><legend class="sr-only">${escapeHtml(question.q)} — من 1 إلى 5</legend><div class="scale-options">${main}</div><div class="scale-alternatives">${alternatives}</div></fieldset>`;
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

    /* ------------------------------------------------------- Asil guide */

    function guideLine(question) {
        const first = question.sectionPosition === 0;
        const last = question.sectionPosition === question.sectionLength - 1;
        if (question.id === 1) return 'أهلاً! ثلاثة أسئلة تمهيدية ثم ننطلق.';
        if (first && question.sectionIndex === 6) return 'تجاوزت منتصف الطريق، شكراً لوقتك!';
        if (first && question.sectionIndex === 9) return 'محطتان فقط وتكتمل الرحلة!';
        if (first && question.sectionIndex === 10) return 'المحطة الأخيرة… أحسنت المرافقة!';
        if (first && question.sectionIndex > 0) return `محطة جديدة: ${question.sectionLength} أسئلة قصيرة.`;
        if (last && question.sectionIndex > 0) return 'آخر سؤال في المحطة، ثم تحصل على طابعها.';
        if (question.type === 'scale') return '1 = لا أوافق إطلاقاً، 5 = أوافق تماماً.';
        if (question.type === 'checkbox') return `اختر حتى ${question.max}، أو أقل إن رغبت.`;
        if (question.type === 'text') return 'اكتب باختصار ومن دون ذكر أسماء.';
        return 'اختر إجابة واحدة، أو تجاوز السؤال.';
    }

    function setGuide(text) {
        const bubble = elements['asil-bubble'];
        if (!bubble || bubble.textContent === text) return;
        bubble.textContent = text;
        bubble.classList.remove('is-new');
        void bubble.offsetWidth;
        bubble.classList.add('is-new');
    }

    /* ------------------------------------------------------ Auto-advance */

    function cancelAutoAdvance() {
        window.clearTimeout(advanceTimer);
        advanceTimer = 0;
        elements['auto-advance-meter']?.classList.remove('is-running');
    }

    function scheduleAutoAdvance(question) {
        cancelAutoAdvance();
        if (!state.autoAdvance || state.currentScreen !== 'question') return;
        const meter = elements['auto-advance-meter'];
        if (meter) {
            meter.style.setProperty('--advance-ms', `${AUTO_ADVANCE_MS}ms`);
            void meter.offsetWidth;
            meter.classList.add('is-running');
        }
        const index = state.currentQuestion;
        advanceTimer = window.setTimeout(() => {
            advanceTimer = 0;
            meter?.classList.remove('is-running');
            if (state.currentQuestion !== index || state.currentScreen !== 'question' || !isAnswered(question) || otherIsSelected(question)) return;
            if (elements.journey.hidden) return;
            moveForward(false);
        }, AUTO_ADVANCE_MS);
    }

    /* --------------------------------------------------------- Effects */

    function confetti(amount) {
        const layer = elements['confetti-layer'];
        if (!layer || reducedMotion()) return;
        const pieces = [];
        for (let i = 0; i < amount; i += 1) {
            const piece = document.createElement('span');
            piece.className = 'confetti-piece';
            piece.style.left = `${Math.random() * 100}%`;
            piece.style.background = CONFETTI_COLORS[i % CONFETTI_COLORS.length];
            piece.style.setProperty('--dx', `${(Math.random() - .5) * 220}px`);
            piece.style.setProperty('--rot', `${(Math.random() > .5 ? 1 : -1) * (360 + Math.random() * 540)}deg`);
            piece.style.setProperty('--fall', `${1.4 + Math.random() * 1.2}s`);
            piece.style.animationDelay = `${Math.random() * .35}s`;
            if (Math.random() > .6) piece.style.borderRadius = '50%';
            pieces.push(piece);
        }
        layer.append(...pieces);
        window.setTimeout(() => pieces.forEach(piece => piece.remove()), 3200);
    }

    function showStampBurst(sectionIndex) {
        const burst = elements['stamp-burst'];
        if (!burst) return;
        const section = sections[sectionIndex];
        burst.style.setProperty('--burgundy', accentFor(sectionIndex));
        burst.querySelector('.stamp-burst__stamp').innerHTML = `<i class="fa-solid ${escapeHtml(section.icon)}"></i>`;
        elements['stamp-burst-title'].textContent = `${section.name} · ${section.shortTitle || section.title}`;
        elements['stamp-burst-count'].textContent = `${state.completedMissions.length} من 10 طوابع في جوازك`;
        burst.classList.remove('is-visible');
        void burst.offsetWidth;
        burst.classList.add('is-visible');
        window.clearTimeout(burstTimer);
        burstTimer = window.setTimeout(() => burst.classList.remove('is-visible'), 2600);
        const pill = document.querySelector('.game-hud__pill');
        if (pill) {
            pill.classList.remove('is-bumped');
            void pill.offsetWidth;
            pill.classList.add('is-bumped');
        }
    }

    /* --------------------------------------------------------- Screens */

    function setVisibleScreen(screenName) {
        const mapping = {
            question: 'question-screen',
            complete: 'mission-complete',
            review: 'review-screen',
            success: 'success-screen'
        };
        if (screenName !== 'question') cancelAutoAdvance();
        Object.values(mapping).forEach(id => { elements[id].hidden = id !== mapping[screenName]; });
        if (screenName !== 'success') state.currentScreen = screenName;
    }

    function focusAfterRender(element) {
        window.requestAnimationFrame(() => {
            element?.focus({ preventScroll: true });
            window.scrollTo({ top: 0, behavior: reducedMotion() ? 'auto' : 'smooth' });
        });
    }

    function renderQuestionStepper(question) {
        const sectionQuestions = questionsForSection(question.sectionIndex);
        if (!elements['mission-question-nav']) return;
        elements['mission-question-nav'].innerHTML = sectionQuestions.map(item => {
            const globalIndex = allQuestions.findIndex(candidate => candidate.id === item.id);
            const current = item.id === question.id;
            const answered = isAnswered(item);
            return `<button type="button" class="question-step${current ? ' is-current' : ''}${answered ? ' is-answered' : ''}" data-question-index="${globalIndex}" aria-label="السؤال ${item.sectionPosition + 1} من ${item.sectionLength}${answered ? '، تمت الإجابة' : '، دون إجابة'}"${current ? ' aria-current="step"' : ''}>${answered && !current ? '<i class="fa-solid fa-check" aria-hidden="true"></i>' : `<span>${item.sectionPosition + 1}</span>`}</button>`;
        }).join('');
    }

    function renderQuestion(options = {}) {
        const question = allQuestions[state.currentQuestion];
        if (!question) return;
        cancelAutoAdvance();
        const section = sections[question.sectionIndex];
        setVisibleScreen('question');
        setStationTheme(question.sectionIndex);
        if (elements['current-mission-title']) elements['current-mission-title'].textContent = sectionIndexLabel(question.sectionIndex);
        elements['mission-label'].textContent = question.sectionIndex === 0 ? section.title : `${section.name}: ${section.shortTitle || section.title}`;
        const stationMinutes = question.sectionLength <= 3 ? '≈ دقيقة ونصف' : '≈ دقيقتان';
        const positionText = question.sectionIndex === 0 ? `سؤال تمهيدي ${question.sectionPosition + 1} من ${question.sectionLength}` : `السؤال ${question.sectionPosition + 1} من ${question.sectionLength} في هذه المحطة`;
        elements['question-position'].textContent = question.sectionPosition === 0 ? `${positionText} · ${stationMinutes}` : positionText;
        elements['question-number'].textContent = `س${pad(question.id)}`;
        elements['question-title'].textContent = question.q;
        elements['question-help'].textContent = question.hint || '';
        elements['question-help'].hidden = !question.hint;
        elements['answer-area'].innerHTML = renderAnswerArea(question);
        renderQuestionStepper(question);
        setGuide(guideLine(question));
        if (elements['answer-clear']) elements['answer-clear'].hidden = !isAnswered(question);
        const previousButton = document.querySelector('[data-action="previous-question"]');
        if (previousButton) previousButton.disabled = state.currentQuestion === 0;
        const nextButton = document.querySelector('[data-action="next-question"]');
        if (nextButton) {
            const lastInSection = question.sectionPosition === question.sectionLength - 1;
            const label = !lastInSection ? 'التالي' : question.sectionIndex === 0 ? 'انطلق' : 'اختم المحطة';
            const icon = lastInSection && question.sectionIndex > 0 ? 'fa-stamp' : 'fa-arrow-left';
            nextButton.innerHTML = `${label} <i class="fa-solid ${icon}" aria-hidden="true"></i>`;
        }
        if (lastRenderedQuestion !== state.currentQuestion) {
            const card = elements['question-card'];
            card.classList.remove('is-entering');
            void card.offsetWidth;
            card.classList.add('is-entering');
            lastRenderedQuestion = state.currentQuestion;
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
        if (elements['auto-advance-toggle']) elements['auto-advance-toggle'].checked = state.autoAdvance;
    }

    function closeJourney() {
        cancelAutoAdvance();
        document.body.classList.remove('is-journey-active');
        closeMissionDrawer();
        elements.journey.hidden = true;
        elements['draft-resume'].hidden = false;
        updateDraftSummary();
        updateHeroStartButton(true);
        renderMaps();
        window.scrollTo({ top: 0 });
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
        cancelAutoAdvance();
        const question = allQuestions[state.currentQuestion];
        if (!question) return;
        const lastInSection = question.sectionPosition === question.sectionLength - 1;
        if (!lastInSection) {
            state.currentQuestion += 1;
            renderQuestion();
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
            continueAfterMission();
            if (!wasComplete && question.sectionIndex > 0) {
                showStampBurst(question.sectionIndex);
                announce(`حصلت على طابع ${sections[question.sectionIndex].name}. ${state.completedMissions.length} من 10 طوابع.`);
            }
        }
    }

    function showMissionComplete(sectionIndex, restoring) {
        const section = sections[sectionIndex];
        activeCompletionSection = sectionIndex;
        state.completionSection = sectionIndex;
        state.pendingNextIndex = pendingNextIndex || state.pendingNextIndex;
        setVisibleScreen('complete');
        saveDraft();
        const stamp = elements['mission-complete-stamp'];
        if (stamp) {
            stamp.style.setProperty('--burgundy', accentFor(sectionIndex));
            stamp.innerHTML = `<i class="fa-solid ${sectionIndex === 0 ? 'fa-flag' : escapeHtml(section.icon)}"></i>`;
        }
        elements['mission-complete-title'].textContent = sectionIndex === 0
            ? 'انطلقت الرحلة!'
            : sectionIndex === 5 ? `طابع ${section.name}… ونصف الطريق!` : 'اكتمل جواز الرحلة!';
        elements['mission-complete-text'].textContent = sectionIndex === 0
            ? 'شكراً لتوضيح طبيعة تجربتك. أمامك الآن عشر محطات، ولكل محطة طابع يُختم في جوازك عند إنهائها، سواء أجبت أو تجاوزت.'
            : sectionIndex === 5
                ? 'وصلت إلى منتصف الرحلة. جوازك يعرض ما أجبت عنه وما تركته اختيارياً، ويمكنك العودة إلى أي محطة في أي وقت.'
                : 'زرت المحطات العشر. بقيت لك مراجعة هادئة قبل أن تقرر إرسال الإجابات إلى الجمعية.';
        const answered = answeredInSection(sectionIndex);
        const total = questionsForSection(sectionIndex).length;
        elements['mission-complete-stats'].innerHTML = `<div><strong dir="ltr">${answered}/${total}</strong><span>إجابات في هذه المحطة</span></div><div><strong dir="ltr">${countAnswered()}/40</strong><span>إجابات في الرحلة</span></div><div><strong dir="ltr">${state.completedMissions.length}/10</strong><span>طوابع في جوازك</span></div>`;
        elements['mission-progress-collection'].innerHTML = miniStamps(sectionIndex);
        const continueButton = elements['mission-complete'].querySelector('[data-action="continue-after-mission"]');
        if (continueButton) continueButton.innerHTML = sectionIndex >= 10 ? 'مراجعة الجواز والإرسال <i class="fa-solid fa-arrow-left" aria-hidden="true"></i>' : `متابعة إلى ${sectionIndex === 0 ? 'المحطة الأولى' : sections[Math.min(sectionIndex + 1, 10)].name} <i class="fa-solid fa-arrow-left" aria-hidden="true"></i>`;
        const returnButton = elements['mission-complete'].querySelector('[data-action="return-to-mission"]');
        if (returnButton) returnButton.hidden = sectionIndex === 0;
        updateProgress();
        if (!restoring) {
            focusAfterRender(elements['mission-complete-title']);
            confetti(sectionIndex === 10 ? 90 : 60);
        }
        announce(sectionIndex === 0 ? 'اكتملت بوابة الانطلاق.' : `اكتملت ${section.name}. ${state.completedMissions.length} من 10 طوابع.`);
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
        if (elements['current-mission-title']) elements['current-mission-title'].textContent = 'مراجعة الجواز قبل الإرسال';
        if (elements['hud-station-icon']) elements['hud-station-icon'].innerHTML = '<i class="fa-solid fa-passport"></i>';
        renderReviewList();
        const answered = countAnswered();
        const subtitle = document.getElementById('review-subtitle');
        if (subtitle) {
            subtitle.textContent = answered === allQuestions.length
                ? 'أجبت عن جميع الأسئلة — شكراً لكرم وقتك! يمكنك تعديل أي إجابة قبل الإرسال.'
                : answered >= 25
                    ? 'تغطية واسعة، شكراً لك! يمكنك تعديل أي سؤال، وترك البقية فارغة مقبول تماماً.'
                    : 'يمكنك تعديل أي سؤال. الأسئلة غير المجاب عنها ستبقى فارغة، وهذا مقبول تماماً.';
        }
        elements['review-answered-count'].textContent = String(answered);
        elements['review-answered-count'].parentElement?.style.setProperty('--score', String(Math.round((answered / 40) * 100)));
        if (elements['review-dashboard-answered']) elements['review-dashboard-answered'].textContent = `${answered} / 40`;
        if (elements['review-unanswered-count']) elements['review-unanswered-count'].textContent = String(40 - answered);
        if (elements['review-mission-count']) elements['review-mission-count'].textContent = `${state.completedMissions.length} / 10`;
        if (elements['review-stamps']) elements['review-stamps'].innerHTML = miniStamps(-1);
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
        cancelAutoAdvance();
        if (!question || !isAnswered(question)) return;
        const key = questionKey(question);
        delete state.answers[key];
        delete state.otherDetails[key];
        renderQuestion({ focus: false });
        elements['question-title']?.focus({ preventScroll: true });
        toast('مُسحت إجابة هذا السؤال. تركه فارغاً مقبول.');
        announce(`مُسحت إجابة السؤال ${question.id}.`);
    }

    function updateChoiceClasses(question, changedInput) {
        elements['answer-area'].querySelectorAll('.answer-choice, .scale-choice').forEach(label => {
            const input = label.querySelector('input');
            const selected = Boolean(input?.checked);
            label.classList.toggle('is-selected', selected);
            label.classList.toggle('just-picked', selected && input === changedInput && !reducedMotion());
        });
        if (question.type === 'checkbox') {
            const count = Array.isArray(answerFor(question)) ? answerFor(question).length : 0;
            const counter = document.getElementById(`selection-count-${question.id}`);
            if (counter) counter.textContent = `${count} / ${question.max}`;
            const dots = document.getElementById(`selection-dots-${question.id}`);
            if (dots) dots.innerHTML = selectionDots(question, count);
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
            if (otherNowSelected) document.getElementById(`other-answer-${question.id}`)?.focus({ preventScroll: true });
            else matchingInput?.focus({ preventScroll: true });
        } else {
            updateChoiceClasses(question, input);
        }
        updateProgress();
        saveDraft();
        updateSaveStatus(true);
        if (elements['answer-clear']) elements['answer-clear'].hidden = !isAnswered(question);
        renderQuestionStepper(question);
        announce(`حُفظت إجابة السؤال ${question.id} مؤقتاً.`);
        if ((question.type === 'scale' || question.type === 'radio') && !otherNowSelected) scheduleAutoAdvance(question);
        else cancelAutoAdvance();
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

    function handleShortcut(event) {
        if (!document.body.classList.contains('is-journey-active') || elements['question-screen'].hidden) return;
        if (event.altKey || event.ctrlKey || event.metaKey) return;
        if (document.body.classList.contains('is-mission-drawer-open') || elements['privacy-dialog']?.open) return;
        const target = event.target;
        const typing = target instanceof HTMLTextAreaElement || (target instanceof HTMLInputElement && ['text', 'search', 'email'].includes(target.type));
        if (typing) return;
        if (event.key === 'Enter') {
            if (target instanceof Element && target.closest('button, a, summary, dialog')) return;
            event.preventDefault();
            moveForward(false);
            return;
        }
        const digit = event.key.replace(/[٠-٩]/g, d => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)));
        if (!/^[1-9]$/.test(digit)) return;
        const option = elements['answer-area'].querySelector(`[data-key="${digit}"] input`);
        if (!option) return;
        event.preventDefault();
        option.click();
        option.focus({ preventScroll: true });
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
            if (elements['success-stamps']) elements['success-stamps'].innerHTML = miniStamps(-1);
            const badgeDate = document.getElementById('success-date');
            if (badgeDate) {
                try { badgeDate.textContent = new Intl.DateTimeFormat('ar-MA-u-ca-gregory', { dateStyle: 'long' }).format(new Date()); }
                catch (formatError) { badgeDate.textContent = new Date().toLocaleDateString('ar'); }
            }
            if (elements['current-mission-title']) elements['current-mission-title'].textContent = 'اكتملت الرحلة';
            elements['journey-progress-fill'].style.width = '100%';
            if (elements['hud-runner']) elements['hud-runner'].style.setProperty('--pos', '1');
            confetti(110);
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
        lastRenderedQuestion = -1;
        renderMaps();
        startJourney(false);
        toast('بدأت رحلة جديدة وفارغة.');
    }

    function discardAndStart() {
        if ((countAnswered() > 0 || state.completedMissions.length > 0) && !window.confirm('هل تريد مسح المسودة الحالية وبدء استجابة جديدة؟ لا يمكن التراجع عن ذلك.')) return;
        resetJourney();
    }

    function clearCurrentDraft() {
        if (!window.confirm('هل تريد مسح كل الإجابات والتقدم المحفوظ في علامة التبويب هذه؟ لا يمكن التراجع عن ذلك.')) return;
        cancelAutoAdvance();
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
        button.innerHTML = `${hasDraft ? 'متابعة الرحلة' : 'ابدأ الرحلة'} <i class="fa-solid fa-arrow-left" aria-hidden="true"></i>`;
    }

    function toggleMissionDrawer() {
        const sidebar = elements['journey-sidebar'];
        if (!sidebar) return;
        const opening = !sidebar.classList.contains('is-open');
        sidebar.classList.toggle('is-open', opening);
        document.body.classList.toggle('is-mission-drawer-open', opening);
        document.querySelector('.journey-toolbar__missions')?.setAttribute('aria-expanded', String(opening));
        if (opening) {
            cancelAutoAdvance();
            sidebar.querySelector('[data-mission-section]')?.focus({ preventScroll: true });
        }
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
                else if (action === 'lang-unavailable') toast('رحلة التقييم متاحة حالياً باللغة العربية فقط.');
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
            if (event.target === elements['auto-advance-toggle']) {
                state.autoAdvance = elements['auto-advance-toggle'].checked;
                if (!state.autoAdvance) cancelAutoAdvance();
                saveDraft();
                toast(state.autoAdvance ? 'سينتقل أصيل بك تلقائياً بعد كل اختيار.' : 'أُوقف الانتقال التلقائي؛ استخدم زر «التالي».');
                return;
            }
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
                return;
            }
            handleShortcut(event);
        });
        document.addEventListener('visibilitychange', () => { if (document.hidden) cancelAutoAdvance(); });
        window.addEventListener('resize', () => window.requestAnimationFrame(layoutBoard));
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
        watchBoard();
        if (document.fonts?.ready) document.fonts.ready.then(layoutBoard).catch(() => {});
        updateSaveStatus();
        ensureApiSession().catch(() => {
            // The visitor can still answer and download a local copy if the endpoint is unavailable.
        });
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initialize);
    else initialize();
}());
