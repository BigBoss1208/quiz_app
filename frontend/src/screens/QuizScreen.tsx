import { useCallback, useEffect, useRef, useState } from 'react';
import type { Topic } from '../data';
import { layTenNguoiChoi } from '../data';
import { layCauHoiDeChoi, nopBai, type AuthUser, type NopBaiResponseDTO } from '../services/api';
import { mapCauHoiToQuestion, type QuestionWithIds } from '../adapters';

interface Props {
  topic: Topic;
  currentUser: AuthUser | null;
  onFinish: (result: NopBaiResponseDTO) => void;
  onBack: () => void;
}

const TIMER_SECONDS = 20;

function answerLetter(index: number) {
  let value = index;
  let label = '';
  do {
    label = String.fromCharCode(65 + (value % 26)) + label;
    value = Math.floor(value / 26) - 1;
  } while (value >= 0);
  return label;
}

function CircleTimer({ seconds }: { seconds: number }) {
  const circumference = 2 * Math.PI * 22;
  const progress = seconds / TIMER_SECONDS;
  const color = progress > 0.5 ? '#00D9A5' : progress > 0.25 ? '#FFC107' : '#FF6B6B';
  return (
    <div className="relative flex items-center justify-center" style={{ width: 56, height: 56 }}>
      <svg width="56" height="56" viewBox="0 0 56 56" aria-hidden="true">
        <circle cx="28" cy="28" r="22" fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="4" />
        <circle cx="28" cy="28" r="22" fill="none" stroke={color} strokeWidth="4"
          strokeDasharray={circumference} strokeDashoffset={circumference * (1 - progress)}
          strokeLinecap="round" transform="rotate(-90 28 28)" />
      </svg>
      <span className="absolute font-black text-white text-base">{seconds}</span>
    </div>
  );
}

export default function QuizScreen({ topic, currentUser, onFinish, onBack }: Props) {
  const [questions, setQuestions] = useState<QuestionWithIds[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [remainingByQuestion, setRemainingByQuestion] = useState<Record<number, number>>({});
  const [mobileNavigationOpen, setMobileNavigationOpen] = useState(false);
  const [startTime] = useState(() => Date.now());
  const submitting = useRef(false);
  const timeoutSubmissionAttempted = useRef(false);

  useEffect(() => {
    layCauHoiDeChoi(topic.id)
      .then((data) => {
        const loadedQuestions = data.map(mapCauHoiToQuestion);
        setQuestions(loadedQuestions);
        setRemainingByQuestion(Object.fromEntries(
          loadedQuestions.map((question) => [question.backendId, TIMER_SECONDS]),
        ));
      })
      .catch(() => setError('Không tải được câu hỏi cho chủ đề này. Kiểm tra kết nối backend.'))
      .finally(() => setLoading(false));
  }, [topic.id]);

  const question = questions[current];
  const selectedAnswerId = question ? answers[question.backendId] ?? null : null;
  const remainingSeconds = question
    ? remainingByQuestion[question.backendId] ?? TIMER_SECONDS
    : TIMER_SECONDS;
  const answeredCount = Object.keys(answers).length;

  useEffect(() => {
    if (!question || selectedAnswerId !== null || remainingSeconds <= 0 || isSubmitting) return;
    const timerId = window.setTimeout(() => {
      setRemainingByQuestion((previous) => ({
        ...previous,
        [question.backendId]: Math.max(0, (previous[question.backendId] ?? TIMER_SECONDS) - 1),
      }));
    }, 1000);
    return () => window.clearTimeout(timerId);
  }, [question, selectedAnswerId, remainingSeconds, isSubmitting]);

  useEffect(() => {
    if (!question || selectedAnswerId !== null || remainingSeconds !== 0 || current >= questions.length - 1) return;
    const advanceId = window.setTimeout(() => setCurrent((index) => Math.min(index + 1, questions.length - 1)), 350);
    return () => window.clearTimeout(advanceId);
  }, [question, selectedAnswerId, remainingSeconds, current, questions.length]);

  const selectAnswer = (answerId: number) => {
    if (!question || isSubmitting) return;
    setAnswers((previous) => ({ ...previous, [question.backendId]: answerId }));
    setError(null);
  };

  const submitQuiz = useCallback(async (timeExpired = false) => {
    if (submitting.current || questions.length === 0) return;
    const unansweredCount = questions.length - answeredCount;
    if (!timeExpired && unansweredCount > 0
      && !window.confirm(`Bạn còn ${unansweredCount} câu chưa trả lời. Bạn có chắc chắn muốn nộp bài không?`)) {
      return;
    }

    submitting.current = true;
    setIsSubmitting(true);
    setError(null);
    try {
      const result = await nopBai({
        chuDeId: Number(topic.id),
        tenNguoiChoi: currentUser?.hoTen || layTenNguoiChoi(),
        userId: currentUser?.id ?? null,
        thoiGianLam: Math.floor((Date.now() - startTime) / 1000),
        danhSachTraLoi: questions.map((item) => ({
          cauHoiId: item.backendId,
          dapAnId: answers[item.backendId] ?? null,
          thoiGianTraLoi: TIMER_SECONDS - (remainingByQuestion[item.backendId] ?? TIMER_SECONDS),
        })),
      });
      onFinish(result);
    } catch (submitError) {
      setError(submitError instanceof Error
        ? `Nộp bài thất bại: ${submitError.message}`
        : 'Nộp bài thất bại. Vui lòng thử lại.');
      submitting.current = false;
      setIsSubmitting(false);
    }
  }, [answeredCount, answers, currentUser, onFinish, questions, remainingByQuestion, startTime, topic.id]);

  useEffect(() => {
    if (current !== questions.length - 1 || selectedAnswerId !== null
      || remainingSeconds !== 0 || isSubmitting || timeoutSubmissionAttempted.current) return;
    const timeoutId = window.setTimeout(() => {
      timeoutSubmissionAttempted.current = true;
      void submitQuiz(true);
    }, 350);
    return () => window.clearTimeout(timeoutId);
  }, [current, isSubmitting, questions.length, remainingSeconds, selectedAnswerId, submitQuiz]);

  if (loading || isSubmitting) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#0f0c29' }}>
        <p className="text-white/70 font-bold">{isSubmitting ? 'Đang chấm và lưu kết quả...' : 'Đang tải câu hỏi...'}</p>
      </div>
    );
  }

  if (error && questions.length === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-6" style={{ background: '#0f0c29' }}>
        <p className="text-white/70 font-bold text-center">{error}</p>
        <button onClick={onBack} className="px-4 py-2 rounded-xl font-bold text-white" style={{ background: '#6C5CE7' }}>
          Quay lại
        </button>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-6" style={{ background: '#0f0c29' }}>
        <p className="text-white/70 font-bold text-center">Chủ đề này chưa có câu hỏi nào.</p>
        <button onClick={onBack} className="px-4 py-2 rounded-xl font-bold text-white" style={{ background: '#6C5CE7' }}>
          Quay lại
        </button>
      </div>
    );
  }

  if (!question) return null;

  return (
    <div className="quiz-page">
      <div className="quiz-layout">
        <header className="quiz-header">
          <button type="button" onClick={onBack} className="quiz-exit">
            <span aria-hidden="true">←</span> Thoát
          </button>
          <div className="quiz-heading">
            <p className="quiz-topic">{topic.emoji} {topic.name}</p>
            <p className="quiz-answered">{answeredCount} / {questions.length} câu đã trả lời</p>
          </div>
          <div className="quiz-clock" aria-label={`Còn ${remainingSeconds} giây`}>
            <span className="quiz-clock-label">CÒN LẠI</span>
            <CircleTimer seconds={remainingSeconds} />
            <span className="quiz-clock-unit">giây</span>
          </div>
          <div className="quiz-progress">
            <div className="quiz-progress-copy">
              <span>Tiến độ bài làm</span>
              <strong>Câu {current + 1} / {questions.length}</strong>
            </div>
            <div
              className="quiz-progress-track"
              role="progressbar"
              aria-label="Tiến độ bài làm"
              aria-valuemin={0}
              aria-valuemax={questions.length}
              aria-valuenow={current + 1}
            >
              <div className="quiz-progress-fill" style={{ width: `${((current + 1) / questions.length) * 100}%` }} />
            </div>
          </div>
        </header>

        <div className="quiz-mobile-nav">
          <button type="button" className="quiz-mobile-nav-toggle"
            onClick={() => setMobileNavigationOpen((isOpen) => !isOpen)}
            aria-expanded={mobileNavigationOpen} aria-controls="quiz-question-navigation">
            <span>{mobileNavigationOpen ? 'Ẩn danh sách câu' : 'Điều hướng câu hỏi'}</span>
            <span className="quiz-mobile-nav-count">{answeredCount}/{questions.length} đã trả lời</span>
            <span aria-hidden="true">{mobileNavigationOpen ? '⌃' : '⌄'}</span>
          </button>
        </div>

        <div className="quiz-workspace">
          <aside id="quiz-question-navigation" className={`quiz-sidebar${mobileNavigationOpen ? ' is-open' : ''}`}>
            <div className="quiz-sidebar-heading">
              <div>
                <h2>Câu hỏi</h2>
                <p>Chọn câu để di chuyển</p>
              </div>
              <span>{answeredCount}/{questions.length}</span>
            </div>
            <nav aria-label="Điều hướng câu hỏi" className="quiz-question-list">
              {questions.map((item, index) => {
                const isAnswered = answers[item.backendId] !== undefined;
                const isCurrent = index === current;
                return (
                  <button key={item.backendId} type="button"
                    onClick={() => { setCurrent(index); setMobileNavigationOpen(false); }}
                    aria-label={`Câu ${index + 1}${isAnswered ? ', đã trả lời' : ', chưa trả lời'}`}
                    aria-current={isCurrent ? 'step' : undefined}
                    className={`quiz-question-number${isCurrent ? ' is-current' : ''}${isAnswered ? ' is-answered' : ''}`}>
                    <span>{index + 1}</span>
                    <span className="quiz-question-status">{isAnswered ? 'Đã trả lời' : 'Chưa trả lời'}</span>
                    <span className="quiz-question-mark" aria-hidden="true">{isAnswered ? '✓' : '–'}</span>
                  </button>
                );
              })}
            </nav>
            <div className="quiz-sidebar-legend">
              <span><i className="is-current" /> Câu hiện tại</span>
              <span><i className="is-answered" /> Đã trả lời</span>
              <span><i className="is-unanswered" /> Chưa trả lời</span>
            </div>
          </aside>

          <main className="quiz-main">
            {error && <p role="alert" className="quiz-error">{error}</p>}

            <section className="quiz-question-card" aria-labelledby="quiz-question-title">
              <div className="quiz-question-card-top">
                <span className="quiz-question-chip">CÂU {current + 1}</span>
                <span className="quiz-question-total">/{questions.length}</span>
              </div>
              {question.image && <img src={question.image} alt="" className="quiz-question-image" />}
              <h1 id="quiz-question-title">{question.text}</h1>
              <p className="quiz-select-hint">Chọn một đáp án phù hợp nhất</p>
            </section>

            <section className="quiz-answers" aria-label="Các phương án trả lời">
              {question.answers.map((answer, index) => {
                const answerId = question.answerIds[index];
                const isSelected = answerId === selectedAnswerId;
                return (
                  <button key={answerId} type="button" onClick={() => selectAnswer(answerId)}
                    aria-pressed={isSelected}
                    className={`quiz-answer${isSelected ? ' is-selected' : ''}`}>
                    <span className="quiz-answer-letter">{answerLetter(index)}</span>
                    <span className="quiz-answer-text">{answer}</span>
                    <span className="quiz-answer-radio" aria-hidden="true">{isSelected ? '✓' : ''}</span>
                  </button>
                );
              })}
            </section>

            <div className="quiz-navigation">
              <button type="button" onClick={() => setCurrent((index) => Math.max(0, index - 1))} disabled={current === 0}
                className="quiz-nav-button quiz-nav-secondary">
                <span aria-hidden="true">←</span><span>Câu trước</span>
              </button>
              <button type="button" onClick={() => setCurrent((index) => Math.min(questions.length - 1, index + 1))}
                disabled={current === questions.length - 1}
                className="quiz-nav-button quiz-nav-secondary">
                <span>Câu tiếp theo</span><span aria-hidden="true">→</span>
              </button>
              <button type="button" onClick={() => void submitQuiz()}
                className="quiz-nav-button quiz-submit">
                Nộp bài <span aria-hidden="true">↗</span>
              </button>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
