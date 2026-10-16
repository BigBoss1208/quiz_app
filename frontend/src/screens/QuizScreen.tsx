import { useCallback, useEffect, useRef, useState } from 'react';
import type { Topic } from '../data';
import { layTenNguoiChoi } from '../data';
import { layCauHoiDeChoi, nopBai, xemDapAnLuyenTap, type AuthUser, type NopBaiResponseDTO } from '../services/api';
import { mapCauHoiToQuestion, type QuestionWithIds } from '../adapters';
import { restoreDraft, type QuestionAnswerState } from '../quizDraft';

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
  const color = progress > 0.5 ? '#10D5A0' : progress > 0.25 ? '#FFC107' : '#FF557A';
  return (
    <div className="relative flex items-center justify-center" style={{ width: 56, height: 56 }}>
      <svg width="56" height="56" viewBox="0 0 56 56" aria-hidden="true">
        <circle cx="28" cy="28" r="22" fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="4" />
        <circle
          cx="28"
          cy="28"
          r="22"
          fill="none"
          stroke={color}
          strokeWidth="4"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - progress)}
          strokeLinecap="round"
          transform="rotate(-90 28 28)"
          style={{ transition: 'stroke-dashoffset 900ms linear, stroke 300ms ease' }}
        />
      </svg>
      <span className="absolute font-black text-white text-base">{seconds}</span>
    </div>
  );
}

export default function QuizScreen({ topic, currentUser, onFinish, onBack }: Props) {
  const draftKey = `quiz_draft_${topic.id}_${currentUser?.id ?? 'guest'}`;

  const [questions, setQuestions] = useState<QuestionWithIds[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [current, setCurrent] = useState(0);
  const [transitionDirection, setTransitionDirection] = useState<'next' | 'previous'>('next');

  const [answers, setAnswers] = useState<Record<number, QuestionAnswerState>>({});
  const [flagged, setFlagged] = useState<Record<number, boolean>>({});
  const [remainingByQuestion, setRemainingByQuestion] = useState<Record<number, number>>({});

  const [mobileNavigationOpen, setMobileNavigationOpen] = useState(false);
  const [practice, setPractice] = useState<Record<number, { dung: boolean; dapAnDungText: string; giaiThich: string | null }>>({});
  const [practiceBusy, setPracticeBusy] = useState(false);
  const [showConfirmSubmit, setShowConfirmSubmit] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);

  const [startTime, setStartTime] = useState(() => Date.now());
  const submitting = useRef(false);
  const timeoutSubmissionAttempted = useRef(false);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    layCauHoiDeChoi(topic.id).then(data => {
      if (!alive) return;
      let raw: string | null = null;
      try { raw = localStorage.getItem(draftKey); } catch {}
      const restored = restoreDraft(raw, data.map(mapCauHoiToQuestion), Date.now());
      setQuestions(restored.questions); setAnswers(restored.answers); setFlagged(restored.flagged);
      setRemainingByQuestion(restored.remaining); setCurrent(restored.current); setStartTime(restored.startedAt);
    }).catch(() => { if (alive) setError('Không tải được câu hỏi cho chủ đề này. Kiểm tra kết nối backend.'); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [topic.id, draftKey]);

  // Tự động lưu tiến độ vào localStorage
  useEffect(() => {
    if (questions.length === 0) return;
    try {
      localStorage.setItem(
        draftKey,
        JSON.stringify({
          version: 2,
          answers,
          flagged,
          remaining: remainingByQuestion,
          currentId: questions[current]?.backendId,
          questionIds: questions.map(q => q.backendId),
          startedAt: startTime,
          savedAt: Date.now(),
        }),
      );
    } catch {
      // Bỏ qua nếu localStorage đầy
    }
  }, [answers, flagged, draftKey, questions, remainingByQuestion, current, startTime]);

  const question = questions[current];

  const isQuestionAnswered = useCallback((item: QuestionWithIds): boolean => {
    const ans = answers[item.backendId];
    if (!ans) return false;
    if (item.loaiCauHoi === 'DIEN_TU') {
      return Boolean(ans.textAnswer && ans.textAnswer.trim().length > 0);
    }
    if (item.loaiCauHoi === 'SAP_XEP') {
      return Boolean(ans.tokenIds && ans.tokenIds.length > 0);
    }
    return ans.dapAnId !== undefined && ans.dapAnId !== null;
  }, [answers]);

  const currentAnswer = question ? answers[question.backendId] : undefined;
  const isCurrentAnswered = question ? isQuestionAnswered(question) : false;
  const isCurrentFlagged = question ? Boolean(flagged[question.backendId]) : false;
  const remainingSeconds = question
    ? remainingByQuestion[question.backendId] ?? TIMER_SECONDS
    : TIMER_SECONDS;
  const answeredCount = questions.filter(isQuestionAnswered).length;
  const unansweredCount = questions.length - answeredCount;

  // Đếm ngược thời gian cho câu hiện tại (đối với trắc nghiệm dừng khi đã chọn)
  useEffect(() => {
    if (!question || (question.loaiCauHoi === 'TRAC_NGHIEM' && isCurrentAnswered) || remainingSeconds <= 0 || isSubmitting) return;
    const timerId = window.setTimeout(() => {
      setRemainingByQuestion((prev) => ({
        ...prev,
        [question.backendId]: Math.max(0, (prev[question.backendId] ?? TIMER_SECONDS) - 1),
      }));
    }, 1000);
    return () => window.clearTimeout(timerId);
  }, [question, isCurrentAnswered, remainingSeconds, isSubmitting]);

  // Tự động chuyển câu khi hết giờ câu đó
  useEffect(() => {
    if (!question || remainingSeconds !== 0 || current >= questions.length - 1) return;
    const advanceId = window.setTimeout(() => {
      setTransitionDirection('next');
      setCurrent((index) => Math.min(index + 1, questions.length - 1));
    }, 350);
    return () => window.clearTimeout(advanceId);
  }, [question, remainingSeconds, current, questions.length]);

  const goToQuestion = (nextIndex: number) => {
    if (nextIndex < 0 || nextIndex >= questions.length || nextIndex === current) return;
    setTransitionDirection(nextIndex > current ? 'next' : 'previous');
    setCurrent(nextIndex);
  };

  // Trắc nghiệm: chọn một đáp án
  const selectChoiceAnswer = (answerId: number) => {
    if (!question || isSubmitting) return;
    setAnswers((prev) => ({
      ...prev,
      [question.backendId]: {
        ...prev[question.backendId],
        dapAnId: answerId,
      },
    }));
    setError(null);
  };

  // Điền từ: nhập nội dung câu trả lời
  const handleTextAnswerChange = (val: string) => {
    if (!question || isSubmitting) return;
    setAnswers((prev) => ({
      ...prev,
      [question.backendId]: {
        ...prev[question.backendId],
        textAnswer: val,
      },
    }));
    setError(null);
  };

  // Sắp xếp: thêm token vào chuỗi
  const handleAddToken = (tokenId: number) => {
    if (!question || isSubmitting) return;
    const currentTokens = answers[question.backendId]?.tokenIds || [];
    if (currentTokens.includes(tokenId)) return;
    const updated = [...currentTokens, tokenId];
    setAnswers((prev) => ({
      ...prev,
      [question.backendId]: {
        ...prev[question.backendId],
        tokenIds: updated,
      },
    }));
    setError(null);
  };

  // Sắp xếp: gỡ token khỏi chuỗi
  const handleRemoveToken = (tokenId: number) => {
    if (!question || isSubmitting) return;
    const currentTokens = answers[question.backendId]?.tokenIds || [];
    const updated = currentTokens.filter((id) => id !== tokenId);
    setAnswers((prev) => ({
      ...prev,
      [question.backendId]: {
        ...prev[question.backendId],
        tokenIds: updated,
      },
    }));
    setError(null);
  };

  // Sắp xếp: xóa làm lại
  const handleResetTokens = () => {
    if (!question || isSubmitting) return;
    setAnswers((prev) => ({
      ...prev,
      [question.backendId]: {
        ...prev[question.backendId],
        tokenIds: [],
      },
    }));
  };

  // Sắp xếp: hoàn tác từ cuối
  const handleUndoLastToken = () => {
    if (!question || isSubmitting) return;
    const currentTokens = answers[question.backendId]?.tokenIds || [];
    if (currentTokens.length === 0) return;
    const updated = currentTokens.slice(0, -1);
    setAnswers((prev) => ({
      ...prev,
      [question.backendId]: {
        ...prev[question.backendId],
        tokenIds: updated,
      },
    }));
  };

  const toggleFlag = () => {
    if (!question) return;
    setFlagged((prev) => ({
      ...prev,
      [question.backendId]: !prev[question.backendId],
    }));
  };

  // Nộp bài thi
  const submitQuiz = useCallback(async () => {
    if (submitting.current || questions.length === 0) return;

    submitting.current = true;
    setIsSubmitting(true);
    setShowConfirmSubmit(false);
    setError(null);

    try {
      const result = await nopBai({
        chuDeId: Number(topic.id),
        tenNguoiChoi: currentUser?.hoTen || layTenNguoiChoi(),
        userId: currentUser?.id ?? null,
        thoiGianLam: Math.floor((Date.now() - startTime) / 1000),
        danhSachTraLoi: questions.map((item) => {
          const ans = answers[item.backendId];
          return {
            cauHoiId: item.backendId,
            dapAnId: item.loaiCauHoi === 'TRAC_NGHIEM' || !item.loaiCauHoi ? ans?.dapAnId ?? null : null,
            cauTraLoiText: item.loaiCauHoi === 'DIEN_TU' ? (ans?.textAnswer ?? '') : null,
            thuTuTokenIds: item.loaiCauHoi === 'SAP_XEP' ? (ans?.tokenIds ?? []) : null,
            thoiGianTraLoi: TIMER_SECONDS - (remainingByQuestion[item.backendId] ?? TIMER_SECONDS),
          };
        }),
      });

      // Xóa bản nháp khi nộp bài thành công
      try {
        localStorage.removeItem(draftKey);
      } catch {
        // Bỏ qua
      }

      onFinish(result);
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? `Nộp bài thất bại: ${submitError.message}`
          : 'Nộp bài thất bại. Vui lòng thử lại.',
      );
      submitting.current = false;
      setIsSubmitting(false);
    }
  }, [answers, currentUser, draftKey, onFinish, questions, remainingByQuestion, startTime, topic.id]);

  // Tự động nộp khi câu cuối cùng hết giờ
  useEffect(() => {
    if (
      current !== questions.length - 1 ||
      remainingSeconds !== 0 ||
      isSubmitting ||
      timeoutSubmissionAttempted.current
    )
      return;

    const timeoutId = window.setTimeout(() => {
      timeoutSubmissionAttempted.current = true;
      void submitQuiz();
    }, 350);
    return () => window.clearTimeout(timeoutId);
  }, [current, isSubmitting, questions.length, remainingSeconds, submitQuiz]);

  const handleExitClick = () => {
    if (answeredCount > 0) {
      setShowExitConfirm(true);
    } else {
      onBack();
    }
  };

  if (loading || isSubmitting) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4" style={{ background: '#0f0c29' }}>
        <div className="w-12 h-12 rounded-full border-4 border-purple-500/20 border-t-purple-500 animate-spin" />
        <p className="text-white/80 font-bold text-base">
          {isSubmitting ? 'Đang chấm điểm và hoàn tất bài thi...' : 'Đang tải câu hỏi thi...'}
        </p>
      </div>
    );
  }

  if (error && questions.length === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-6" style={{ background: '#0f0c29' }}>
        <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/30 text-center max-w-md">
          <p className="text-red-300 font-bold mb-3">{error}</p>
          <button onClick={onBack} className="btn-bounce px-5 py-2.5 rounded-xl font-bold text-white bg-purple-600">
            Quay lại trang chủ
          </button>
        </div>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-6" style={{ background: '#0f0c29' }}>
        <p className="text-white/70 font-bold text-center">Chủ đề này chưa có câu hỏi nào.</p>
        <button onClick={onBack} className="btn-bounce px-5 py-2.5 rounded-xl font-bold text-white bg-purple-600">
          Quay lại trang chủ
        </button>
      </div>
    );
  }

  if (!question) return null;

  return (
    <div className="quiz-page">
      <div className="quiz-layout">
        {/* HEADER ĐỀ THI */}
        <header className="quiz-header">
          <button type="button" onClick={handleExitClick} className="quiz-exit" title="Thoát khỏi bài thi">
            <span aria-hidden="true">←</span> Thoát
          </button>

          <div className="quiz-heading">
            <div className="flex items-center gap-2">
              <span className="text-xl">{topic.emoji}</span>
              <p className="quiz-topic">{topic.name}</p>
              {topic.category && (
                <span className="hidden sm:inline-block px-2.5 py-0.5 rounded-full text-xs font-bold text-purple-200 bg-purple-900/40 border border-purple-500/20">
                  {topic.category}
                </span>
              )}
            </div>
            <p className="quiz-answered">
              Đã làm <strong>{answeredCount}</strong> / {questions.length} câu
            </p>
          </div>

          {/* Nút mở Palette Drawer trên Mobile */}
          <button
            type="button"
            onClick={() => setMobileNavigationOpen(true)}
            className="md:hidden flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-purple-200 bg-purple-950/60 border border-purple-500/30"
          >
            <span>📋</span>
            <span>{answeredCount}/{questions.length}</span>
          </button>

          <div className="quiz-clock" aria-label={`Còn ${remainingSeconds} giây`}>
            <CircleTimer seconds={remainingSeconds} />
            <span className="quiz-clock-unit">giây</span>
          </div>

          {/* Thanh tiến độ */}
          <div className="quiz-progress">
            <div className="quiz-progress-copy">
              <span>Tiến độ bài thi</span>
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
              <div
                className="quiz-progress-fill"
                style={{ width: `${((current + 1) / questions.length) * 100}%` }}
              />
            </div>
          </div>
        </header>

        {/* WORKSPACE: VÙNG CÂU HỎI CHÍNH Ở TRÁI, PALETTE SỐ CÂU Ở PHẢI */}
        <div className="quiz-workspace">
          {/* VÙNG CÂU HỎI CHÍNH */}
          <main className="quiz-main">
            {error && <p role="alert" className="quiz-error">{error}</p>}
            {topic.choPhepXemDapAn && question && <div className="quiz-error">
              <button disabled={practiceBusy || isSubmitting || !isCurrentAnswered} onClick={async () => {
                setPracticeBusy(true);
                try { const review = await xemDapAnLuyenTap(question.backendId, { cauHoiId: question.backendId, dapAnId: currentAnswer?.dapAnId, cauTraLoiText: currentAnswer?.textAnswer, thuTuTokenIds: currentAnswer?.tokenIds, thoiGianTraLoi: 0 }); setPractice(prev => ({ ...prev, [question.backendId]: review })); }
                catch (e) { setError(e instanceof Error ? e.message : 'Không xem được đáp án'); }
                finally { setPracticeBusy(false); }
              }}>Xem đáp án luyện tập</button>
              {practice[question.backendId] && <p>{practice[question.backendId].dung ? 'Đúng' : 'Sai'} — {practice[question.backendId].dapAnDungText}<br />{practice[question.backendId].giaiThich}</p>}
            </div>}

            <div
              key={question.backendId}
              className={`quiz-question-transition ${transitionDirection === 'next' ? 'from-right' : 'from-left'}`}
            >
              <section className="quiz-question-card" aria-labelledby="quiz-question-title">
                <div className="quiz-question-card-top flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="quiz-question-chip">CÂU {current + 1}</span>
                    <span className="quiz-question-total">/{questions.length}</span>

                    {/* Huy hiệu loại câu hỏi */}
                    {question.loaiCauHoi === 'DIEN_TU' ? (
                      <span className="quiz-type-badge dien-tu">✏️ Điền từ</span>
                    ) : question.loaiCauHoi === 'SAP_XEP' ? (
                      <span className="quiz-type-badge sap-xep">🧩 Sắp xếp</span>
                    ) : (
                      <span className="quiz-type-badge trac-nghiem">🔘 Trắc nghiệm</span>
                    )}
                  </div>

              <button
                type="button"
                onClick={toggleFlag}
                className={`quiz-nav-button quiz-nav-flag${isCurrentFlagged ? ' is-active' : ''}`}
                title="Đánh dấu câu này để xem lại sau"
              >
                <span aria-hidden="true">♧</span>
                <span>{isCurrentFlagged ? 'Đã đánh dấu' : 'Đánh dấu câu này'}</span>
              </button>

                </div>

                {question.image && <img src={question.image} alt="" className="quiz-question-image" />}
                <h1 id="quiz-question-title">{question.text}</h1>

                <p className="quiz-select-hint">
                  {question.loaiCauHoi === 'DIEN_TU'
                    ? 'Nhập câu trả lời của bạn vào ô bên dưới'
                    : question.loaiCauHoi === 'SAP_XEP'
                      ? 'Chạm vào các từ bên dưới để ghép thành câu hoàn chỉnh'
                      : 'Chọn một đáp án phù hợp nhất'}
                </p>
              </section>

              {/* DẠNG 1: ĐIỀN TỪ (DIEN_TU) */}
              {question.loaiCauHoi === 'DIEN_TU' && (
                <section className="quiz-fill-wrapper" aria-label="Khu vực điền từ">
                  <div className="quiz-fill-input-box">
                    <input
                      type="text"
                      value={currentAnswer?.textAnswer ?? ''}
                      onChange={(e) => handleTextAnswerChange(e.target.value)}
                      placeholder="Nhập câu trả lời của bạn..."
                      className="quiz-fill-input"
                      autoComplete="off"
                      spellCheck="false"
                      disabled={isSubmitting}
                    />
                    {(currentAnswer?.textAnswer ?? '').length > 0 && (
                      <button
                        type="button"
                        onClick={() => handleTextAnswerChange('')}
                        className="quiz-fill-clear"
                        title="Xóa nhanh nội dung"
                      >
                        ×
                      </button>
                    )}
                  </div>
                  <div className="quiz-fill-hint">
                    <span>💡</span> Gõ trực tiếp bằng bàn phím. Hệ thống bảo toàn chữ và dấu tiếng Việt / Pinyin.
                  </div>
                </section>
              )}

              {/* DẠNG 2: SẮP XẾP CÂU (SAP_XEP) */}
              {question.loaiCauHoi === 'SAP_XEP' && (
                <section className="quiz-reorder-container" aria-label="Khu vực sắp xếp câu">
                  {/* Vùng câu đang ghép */}
                  <div className={`quiz-reorder-target${(currentAnswer?.tokenIds?.length ?? 0) > 0 ? ' has-tokens' : ''}`}>
                    {(currentAnswer?.tokenIds?.length ?? 0) === 0 ? (
                      <p className="quiz-reorder-placeholder">
                        Chạm vào các từ bên dưới để ghép thành câu theo thứ tự đúng
                      </p>
                    ) : (
                      (currentAnswer?.tokenIds ?? []).map((tokenId) => {
                        const token = (question.rawTokens || []).find((t) => t.id === tokenId);
                        if (!token) return null;
                        return (
                          <button
                            key={token.id}
                            type="button"
                            onClick={() => handleRemoveToken(token.id)}
                            className="quiz-token-chip is-in-assembled"
                            title="Chạm để gỡ từ này"
                          >
                            <span>{token.noiDung}</span>
                            <span className="text-white/60 text-xs ml-0.5">✕</span>
                          </button>
                        );
                      })
                    )}
                  </div>

                  {/* Thanh điều khiển phụ của câu sắp xếp */}
                  <div className="quiz-reorder-controls">
                    <span className="quiz-reorder-pool-label">Kho từ gợi ý:</span>
                    <div className="quiz-reorder-actions">
                      <button
                        type="button"
                        onClick={handleUndoLastToken}
                        disabled={(currentAnswer?.tokenIds?.length ?? 0) === 0 || isSubmitting}
                        className="quiz-reorder-btn"
                        title="Gỡ từ vừa ghép gần nhất"
                      >
                        ⌫ Xóa từ cuối
                      </button>
                      <button
                        type="button"
                        onClick={handleResetTokens}
                        disabled={(currentAnswer?.tokenIds?.length ?? 0) === 0 || isSubmitting}
                        className="quiz-reorder-btn"
                        title="Đặt lại tất cả các từ"
                      >
                        ↺ Làm lại
                      </button>
                    </div>
                  </div>

                  {/* Kho từ (Word bank) */}
                  <div className="quiz-reorder-pool">
                    {(question.rawTokens || []).map((token) => {
                      const isPlaced = (currentAnswer?.tokenIds ?? []).includes(token.id);
                      return (
                        <button
                          key={token.id}
                          type="button"
                          onClick={() => handleAddToken(token.id)}
                          disabled={isPlaced || isSubmitting}
                          className={`quiz-token-chip${isPlaced ? ' is-placed' : ''}`}
                        >
                          {token.noiDung}
                        </button>
                      );
                    })}
                  </div>
                </section>
              )}

              {/* DẠNG 3: TRẮC NGHIỆM A/B/C/D (TRAC_NGHIEM) */}
              {(question.loaiCauHoi === 'TRAC_NGHIEM' || !question.loaiCauHoi) && (
                <section className="quiz-answers" aria-label="Các phương án trả lời">
                  {question.answers.map((answer, index) => {
                    const answerId = question.answerIds[index];
                    const isSelected = answerId === (currentAnswer?.dapAnId ?? null);
                    return (
                      <button
                        key={answerId}
                        type="button"
                        onClick={() => selectChoiceAnswer(answerId)}
                        aria-pressed={isSelected}
                        className={`quiz-answer${isSelected ? ' is-selected' : ''}`}
                      >
                        <span className="quiz-answer-letter">{answerLetter(index)}</span>
                        <span className="quiz-answer-text">{answer}</span>
                        <span className="quiz-answer-radio" aria-hidden="true">
                          {isSelected ? '✓' : ''}
                        </span>
                      </button>
                    );
                  })}
                </section>
              )}
            </div>

            {/* THANH ĐIỀU HƯỚNG PHÍA DƯỚI (BOTTOM BAR) */}
            <div className="quiz-navigation">
              <button
                type="button"
                onClick={() => goToQuestion(current - 1)}
                disabled={current === 0}
                className="quiz-nav-button quiz-nav-secondary"
              >
                <span aria-hidden="true">←</span>
                <span>Câu trước</span>
              </button>

              <button
                type="button"
                onClick={() => goToQuestion(current + 1)}
                disabled={current === questions.length - 1}
                className="quiz-nav-button quiz-nav-secondary"
              >
                <span>Câu tiếp theo</span>
                <span aria-hidden="true">→</span>
              </button>

              <button
                type="button"
                onClick={() => setShowConfirmSubmit(true)}
                className="quiz-nav-button quiz-submit quiz-submit-inline"
              >
                <span>Nộp bài</span>
                <span aria-hidden="true">↗</span>
              </button>
            </div>
          </main>

          {/* QUESTION PALETTE: BẢNG SỐ CÂU Ở BÊN PHẢI (DESKTOP) & DRAWER (MOBILE) */}
          <aside
            id="quiz-question-navigation"
            className={`quiz-sidebar${mobileNavigationOpen ? ' is-open' : ''}`}
          >
            {/* Header cho Drawer trên Mobile */}
            <div className="quiz-drawer-header md:hidden">
              <div>
                <h2 className="text-white font-extrabold text-base">Danh sách câu hỏi</h2>
                <p className="text-purple-300/70 text-xs">Chạm vào số câu để chuyển nhanh</p>
              </div>
              <button
                type="button"
                onClick={() => setMobileNavigationOpen(false)}
                className="quiz-drawer-close"
                aria-label="Đóng bảng câu hỏi"
              >
                ×
              </button>
            </div>

            <div className="quiz-sidebar-heading hidden md:flex">
              <div>
                <h2>Bảng câu hỏi</h2>
                <p>Chọn câu để chuyển</p>
              </div>
              <span>{answeredCount}/{questions.length}</span>
            </div>

            {/* LƯỚI SỐ CÂU HỎI: CHỈ HIỂN THỊ SỐ THỨ TỰ (CĂN CHÍNH GIỮA) */}
            <nav aria-label="Điều hướng câu hỏi" className="quiz-question-list">
              {questions.map((item, index) => {
                const isAnswered = isQuestionAnswered(item);
                const isCurrent = index === current;
                const isItemFlagged = Boolean(flagged[item.backendId]);

                return (
                  <button
                    key={item.backendId}
                    type="button"
                    onClick={() => {
                      goToQuestion(index);
                      setMobileNavigationOpen(false);
                    }}
                    aria-label={`Câu ${index + 1}${isAnswered ? ', đã làm' : ', chưa làm'}${isItemFlagged ? ', có cờ' : ''}`}
                    aria-current={isCurrent ? 'step' : undefined}
                    className={`quiz-question-number${isCurrent ? ' is-current' : ''}${isAnswered ? ' is-answered' : ''}${isItemFlagged ? ' is-flagged' : ''}`}
                  >
                    <span>{index + 1}</span>
                  </button>
                );
              })}
            </nav>

            {/* CHÚ GIẢI TRẠNG THÁI */}
            <div className="quiz-sidebar-legend">
              <span><i className="is-answered" /> Đã làm</span>
              <span><i className="is-unanswered" /> Chưa làm</span>
              <span><i className="is-current" /> Đang chọn</span>
              <span><i className="is-flagged" /> Đánh dấu</span>
            </div>
            <div className="quiz-summary"><h3>Tóm tắt bài làm</h3><p><span>Đã trả lời</span><strong>{answeredCount}</strong></p><p><span>Chưa trả lời</span><strong>{unansweredCount}</strong></p><p><span>Đã đánh dấu</span><strong>{questions.filter(q => flagged[q.backendId]).length}</strong></p><p className="quiz-summary-total"><span>Tổng số câu</span><strong>{questions.length}</strong></p></div>
            <button className="quiz-nav-button quiz-submit quiz-submit-sidebar" onClick={() => setShowConfirmSubmit(true)} disabled={isSubmitting}>↗ Nộp bài ngay</button>
          </aside>
        </div>
      </div>

      {/* MODAL GAMING UI: XÁC NHẬN NỘP BÀI THI */}
      {showConfirmSubmit && (
        <div className="quiz-modal-backdrop" onClick={() => setShowConfirmSubmit(false)}>
          <div className="quiz-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="text-4xl mb-2">📝</div>
            <h2 className="text-white font-black text-2xl" style={{ fontFamily: 'Baloo 2' }}>
              Xác nhận nộp bài thi
            </h2>
            <p className="text-white/70 text-sm mt-1">
              Bạn có chắc chắn muốn nộp bài để hệ thống chấm điểm không?
            </p>

            <div className="quiz-modal-stats">
              <div className="quiz-modal-stat-box">
                <div className="text-white/60 text-xs font-bold">Tổng số</div>
                <div className="text-white font-extrabold text-xl mt-0.5">{questions.length}</div>
              </div>
              <div className="quiz-modal-stat-box" style={{ borderColor: 'rgba(16, 213, 160, 0.4)' }}>
                <div className="text-emerald-400 text-xs font-bold">Đã làm</div>
                <div className="text-emerald-300 font-extrabold text-xl mt-0.5">{answeredCount}</div>
              </div>
              <div className="quiz-modal-stat-box" style={{ borderColor: unansweredCount > 0 ? 'rgba(245, 158, 11, 0.4)' : 'rgba(255,255,255,0.1)' }}>
                <div className="text-amber-400 text-xs font-bold">Chưa làm</div>
                <div className="text-amber-300 font-extrabold text-xl mt-0.5">{unansweredCount}</div>
              </div>
            </div>

            {unansweredCount > 0 && (
              <div className="p-3 mb-5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-200 text-xs font-semibold leading-relaxed">
                ⚠️ Bạn vẫn còn <strong>{unansweredCount}</strong> câu chưa hoàn thành. Các câu này sẽ được tính là chưa trả lời.
              </div>
            )}

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowConfirmSubmit(false)}
                className="btn-bounce flex-1 py-3 rounded-xl font-extrabold text-sm text-white/80 bg-white/10 hover:bg-white/15"
              >
                Tiếp tục làm
              </button>
              <button
                type="button"
                onClick={() => void submitQuiz()}
                className="btn-bounce flex-1 py-3 rounded-xl font-extrabold text-sm text-white"
                style={{
                  background: 'linear-gradient(135deg, #6C5CE7, #4834D4)',
                  boxShadow: '0 8px 24px rgba(108, 92, 231, 0.5)',
                }}
              >
                Xác nhận nộp bài
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL XÁC NHẬN KHI BẤM NÚT THOÁT */}
      {showExitConfirm && (
        <div className="quiz-modal-backdrop" onClick={() => setShowExitConfirm(false)}>
          <div className="quiz-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="text-4xl mb-2">🚪</div>
            <h2 className="text-white font-black text-2xl" style={{ fontFamily: 'Baloo 2' }}>
              Rời khỏi bài thi?
            </h2>
            <p className="text-white/70 text-sm mt-2 mb-6">
              Tiến độ bài làm hiện tại của bạn đã được tự động lưu tạm trên trình duyệt. Bạn có thể quay lại tiếp tục bất cứ lúc nào.
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowExitConfirm(false)}
                className="btn-bounce flex-1 py-3 rounded-xl font-extrabold text-sm text-white/80 bg-white/10 hover:bg-white/15"
              >
                Ở lại làm tiếp
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowExitConfirm(false);
                  onBack();
                }}
                className="btn-bounce flex-1 py-3 rounded-xl font-extrabold text-sm text-white bg-red-600 hover:bg-red-500"
              >
                Rời bài thi
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
