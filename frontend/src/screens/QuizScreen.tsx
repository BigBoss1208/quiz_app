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

const ANSWER_COLORS = [
  { bg: '#FF6B6B', shadow: 'rgba(255,107,107,0.4)', label: 'A' },
  { bg: '#4834D4', shadow: 'rgba(72,52,212,0.4)', label: 'B' },
  { bg: '#FFC107', shadow: 'rgba(255,193,7,0.4)', label: 'C' },
  { bg: '#00D9A5', shadow: 'rgba(0,217,165,0.4)', label: 'D' },
];

const TIMER_SECONDS = 20;

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
    <div className="min-h-screen flex flex-col" style={{ background: 'linear-gradient(160deg, #0f0c29, #1a1048 60%, #24243e)' }}>
      <div className="relative z-10 w-full max-w-3xl mx-auto px-4 pt-4 pb-8">
        <header className="flex items-center justify-between gap-3 mb-4">
          <button onClick={onBack} className="btn-bounce text-white/75 hover:text-white font-bold text-sm px-3 py-2 rounded-xl"
            style={{ background: 'rgba(255,255,255,0.08)' }}>← Thoát</button>
          <div className="text-center min-w-0">
            <p className="text-white font-bold truncate">{topic.emoji} {topic.name}</p>
            <p className="text-white/55 text-xs">{answeredCount}/{questions.length} câu đã trả lời</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden sm:inline text-white/50 text-xs">Mỗi câu 20 giây</span>
            <CircleTimer seconds={remainingSeconds} />
          </div>
        </header>

        <div className="mb-4">
          <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.1)' }}>
            <div className="h-full rounded-full transition-all duration-300"
              style={{ width: `${((current + 1) / questions.length) * 100}%`, background: 'linear-gradient(90deg, #6C5CE7, #00D9A5)' }} />
          </div>
          <p className="text-white/65 text-sm font-bold mt-2">Câu {current + 1}/{questions.length}</p>
        </div>

        <nav aria-label="Điều hướng câu hỏi" className="grid grid-cols-[repeat(auto-fill,minmax(2.5rem,1fr))] gap-2 mb-5">
          {questions.map((item, index) => {
            const isAnswered = answers[item.backendId] !== undefined;
            const isCurrent = index === current;
            return (
              <button key={item.backendId} type="button" onClick={() => setCurrent(index)}
                aria-label={`Câu ${index + 1}${isAnswered ? ', đã trả lời' : ', chưa trả lời'}`}
                aria-current={isCurrent ? 'step' : undefined}
                className="h-10 rounded-xl font-extrabold text-sm transition"
                style={{
                  background: isCurrent ? '#6C5CE7' : isAnswered ? 'rgba(0,217,165,0.18)' : 'rgba(255,255,255,0.08)',
                  color: isCurrent ? 'white' : isAnswered ? '#82f0d1' : 'rgba(255,255,255,0.62)',
                  border: `1px solid ${isCurrent ? '#a29bfe' : isAnswered ? 'rgba(0,217,165,0.45)' : 'rgba(255,255,255,0.12)'}`,
                }}>
                {index + 1}{isAnswered ? ' ✓' : ''}
              </button>
            );
          })}
        </nav>

        {error && <p role="alert" className="mb-4 rounded-xl px-4 py-3 text-sm font-bold text-red-100 bg-red-500/20">{error}</p>}

        <section className="rounded-3xl p-5 sm:p-7 mb-5"
          style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', boxShadow: '0 16px 45px rgba(0,0,0,0.2)' }}>
          {question.image && <img src={question.image} alt="" className="w-full max-h-56 object-contain rounded-xl mb-4" />}
          <h1 className="text-white font-extrabold text-xl sm:text-2xl text-center leading-snug">{question.text}</h1>
        </section>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {question.answers.map((answer, index) => {
            const answerId = question.answerIds[index];
            const color = ANSWER_COLORS[index % ANSWER_COLORS.length];
            const isSelected = answerId === selectedAnswerId;
            return (
              <button key={answerId} type="button" onClick={() => selectAnswer(answerId)}
                aria-pressed={isSelected}
                className="answer-btn min-h-20 rounded-2xl p-4 text-left"
                style={{
                  background: isSelected ? color.bg : 'rgba(255,255,255,0.08)',
                  boxShadow: isSelected ? `0 6px 20px ${color.shadow}` : 'none',
                  border: `2px solid ${isSelected ? 'white' : 'rgba(255,255,255,0.12)'}`,
                }}>
                <span className="flex items-start gap-3">
                  <span className="w-8 h-8 shrink-0 rounded-xl bg-white/20 flex items-center justify-center text-white font-black text-sm">
                    {ANSWER_COLORS[index % ANSWER_COLORS.length].label}
                  </span>
                  <span className="text-white font-bold text-sm sm:text-base leading-snug pt-1">{answer}</span>
                  {isSelected && <span className="ml-auto text-white font-black" aria-hidden="true">✓</span>}
                </span>
              </button>
            );
          })}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-3 mt-6">
          <button type="button" onClick={() => setCurrent((index) => Math.max(0, index - 1))} disabled={current === 0}
            className="btn-bounce py-3 rounded-xl font-extrabold text-white disabled:opacity-35"
            style={{ background: 'rgba(255,255,255,0.1)' }}>← Câu trước</button>
          <button type="button" onClick={() => setCurrent((index) => Math.min(questions.length - 1, index + 1))}
            disabled={current === questions.length - 1}
            className="btn-bounce py-3 rounded-xl font-extrabold text-white disabled:opacity-35"
            style={{ background: 'rgba(255,255,255,0.1)' }}>Câu tiếp theo →</button>
          <button type="button" onClick={() => void submitQuiz()}
            className="btn-bounce py-3 px-6 rounded-xl font-extrabold text-white"
            style={{ background: 'linear-gradient(90deg, #6C5CE7, #4834D4)', boxShadow: '0 8px 25px rgba(108,92,231,0.35)' }}>
            Nộp bài
          </button>
        </div>
      </div>
    </div>
  );
}
