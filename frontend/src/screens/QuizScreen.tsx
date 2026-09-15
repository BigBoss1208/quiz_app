import { useState, useEffect, useCallback } from 'react';
import type { Topic } from '../data';
import { layTenNguoiChoi } from '../data';
import { layCauHoiDeChoi, guiDapAn, luuKetQua, type AuthUser } from '../services/api';
import { mapCauHoiToQuestion, type QuestionWithIds } from '../adapters';

interface Props {
  topic: Topic;
  currentUser: AuthUser | null;
  onFinish: (score: number, correct: number, total: number, time: number) => void;
  onBack: () => void;
}

const ANSWER_COLORS = [
  { bg: '#FF6B6B', shadow: 'rgba(255,107,107,0.4)', label: 'A' },
  { bg: '#4834D4', shadow: 'rgba(72,52,212,0.4)', label: 'B' },
  { bg: '#FFC107', shadow: 'rgba(255,193,7,0.4)', label: 'C' },
  { bg: '#00D9A5', shadow: 'rgba(0,217,165,0.4)', label: 'D' },
];

const TIMER_SECONDS = 20;

function CircleTimer({ seconds, total }: { seconds: number; total: number }) {
  const r = 22, c = 2 * Math.PI * r;
  const pct = seconds / total;
  const offset = c - pct * c;
  const color = pct > 0.5 ? '#00D9A5' : pct > 0.25 ? '#FFC107' : '#FF6B6B';
  return (
    <div className="relative flex items-center justify-center" style={{ width: 60, height: 60 }}>
      <svg width="60" height="60" viewBox="0 0 60 60">
        <circle cx="30" cy="30" r={r} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="4" />
        <circle cx="30" cy="30" r={r} fill="none" stroke={color} strokeWidth="4"
          strokeDasharray={c} strokeDashoffset={offset}
          strokeLinecap="round" transform="rotate(-90 30 30)"
          style={{ transition: 'stroke-dashoffset 1s linear, stroke 0.5s ease' }} />
      </svg>
      <span className="absolute font-black text-white text-base" style={{ fontFamily: 'Baloo 2' }}>{seconds}</span>
    </div>
  );
}

export default function QuizScreen({ topic, currentUser, onFinish, onBack }: Props) {
  const [questions, setQuestions] = useState<QuestionWithIds[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [current, setCurrent] = useState(0);
  const [selectedAnswerId, setSelectedAnswerId] = useState<number | null>(null);
  const [correctAnswerId, setCorrectAnswerId] = useState<number | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [checking, setChecking] = useState(false);
  const [wasWrong, setWasWrong] = useState(false);
  const [wasLast, setWasLast] = useState(false);

  const [score, setScore] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [timer, setTimer] = useState(TIMER_SECONDS);
  const [animClass, setAnimClass] = useState('');
  const [startTime] = useState(Date.now());
  const [finishing, setFinishing] = useState(false);

  useEffect(() => {
    layCauHoiDeChoi(topic.id)
      .then((data) => setQuestions(data.map(mapCauHoiToQuestion)))
      .catch(() => setLoadError('Không tải được câu hỏi cho chủ đề này.'))
      .finally(() => setLoading(false));
  }, [topic.id]);

  const q = questions[current];

  const finishAndSave = useCallback(
    async (finalScore: number, finalCorrect: number, answeredCount: number) => {
      setFinishing(true);
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      try {
        await luuKetQua({
          chuDeId: Number(topic.id),
          tenNguoiChoi: currentUser?.hoTen || layTenNguoiChoi(),
          userId: currentUser?.id ?? null,
          diemSo: finalScore,
          soCauDaTraLoi: answeredCount,
        });
      } catch {
        // vẫn cho xem kết quả kể cả khi lưu điểm lỗi (ví dụ mất mạng)
      }
      onFinish(finalScore, finalCorrect, questions.length, elapsed);
    },
    [onFinish, questions.length, startTime, topic.id, currentUser],
  );

  const handleAnswer = useCallback(
    async (answerId: number) => {
      if (revealed || checking || !q) return;
      setChecking(true);
      setSelectedAnswerId(answerId);
      try {
        const res = await guiDapAn(q.backendId, answerId);
        setCorrectAnswerId(res.dapAnDungId);
        setRevealed(true);
        setWasWrong(!res.dung);
        setWasLast(res.daHetCauHoi);
        if (res.dung) {
          const timeBonus = Math.floor(timer * 10);
          setScore((s) => s + 100 + timeBonus);
          setCorrectCount((c) => c + 1);
          setAnimClass('animate-pulse-green');
        } else {
          setAnimClass('animate-shake');
        }
        setTimeout(() => setAnimClass(''), 600);
      } catch {
        setLoadError('Không kiểm tra được đáp án. Kiểm tra kết nối backend.');
      } finally {
        setChecking(false);
      }
    },
    [revealed, checking, q, timer],
  );

  // Hết giờ = coi như trả lời sai (không chọn đáp án nào), dừng lượt chơi
  useEffect(() => {
    if (loading || revealed || !q) return;
    if (timer <= 0) {
      setRevealed(true);
      setWasWrong(true);
      setAnimClass('animate-shake');
      // Vẫn cần biết đáp án đúng để hiển thị — hỏi server bằng cách gửi id không hợp lệ (-1)
      guiDapAn(q.backendId, -1)
        .then((res) => setCorrectAnswerId(res.dapAnDungId))
        .catch(() => {});
      return;
    }
    const id = setTimeout(() => setTimer((t) => t - 1), 1000);
    return () => clearTimeout(id);
  }, [timer, revealed, loading, q]);

  const nextQuestion = () => {
    // Sai hoặc đã hết câu hỏi → dừng lại, lưu điểm và sang màn kết quả
    if (wasWrong || wasLast || current >= questions.length - 1) {
      finishAndSave(score, correctCount, current + 1);
      return;
    }
    setCurrent((c) => c + 1);
    setSelectedAnswerId(null);
    setCorrectAnswerId(null);
    setRevealed(false);
    setTimer(TIMER_SECONDS);
    setAnimClass('');
  };

  const getAnswerStyle = (answerId: number, idx: number) => {
    const base = ANSWER_COLORS[idx];
    if (!revealed) return { background: base.bg, boxShadow: `0 6px 20px ${base.shadow}` };
    if (answerId === correctAnswerId) return { background: '#00D9A5', boxShadow: '0 6px 20px rgba(0,217,165,0.5)' };
    if (answerId === selectedAnswerId) return { background: '#FF6B6B', boxShadow: '0 6px 20px rgba(255,107,107,0.5)', filter: 'brightness(0.7)' };
    return { background: 'rgba(255,255,255,0.08)', boxShadow: 'none', filter: 'brightness(0.5)' };
  };

  if (loading || finishing) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#0f0c29' }}>
        <p className="text-white/60 font-bold">{finishing ? 'Đang lưu kết quả...' : 'Đang tải câu hỏi...'}</p>
      </div>
    );
  }

  if (loadError && questions.length === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-6" style={{ background: '#0f0c29' }}>
        <p className="text-white/70 font-bold text-center">{loadError}</p>
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

  return (
    <div className="min-h-screen flex flex-col"
      style={{ background: `linear-gradient(160deg, #0f0c29 0%, #1a1048 60%, #24243e 100%)` }}>
      <div className="fixed top-0 right-0 w-80 h-80 rounded-full opacity-20 pointer-events-none"
        style={{ background: `radial-gradient(circle, #6C5CE7, transparent)`, filter: 'blur(60px)' }} />

      <div className="relative z-10 px-4 pt-4 pb-2">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center justify-between mb-3">
            <button onClick={onBack} className="btn-bounce text-white/60 hover:text-white font-bold text-sm px-3 py-1.5 rounded-xl"
              style={{ background: 'rgba(255,255,255,0.08)' }}>← Thoát</button>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl"
              style={{ background: 'rgba(108,92,231,0.2)', border: '1px solid rgba(108,92,231,0.4)' }}>
              <span className="text-purple-300 font-extrabold text-sm">⚡ {score}</span>
            </div>
            <CircleTimer seconds={timer} total={TIMER_SECONDS} />
          </div>
          <div className="flex gap-1.5">
            {questions.map((_, i) => (
              <div key={i} className="flex-1 h-2 rounded-full overflow-hidden"
                style={{ background: 'rgba(255,255,255,0.1)' }}>
                <div className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: i < current ? '100%' : i === current ? '50%' : '0%',
                    background: i < current ? '#00D9A5' : 'linear-gradient(90deg, #6C5CE7, #74B9FF)',
                  }} />
              </div>
            ))}
          </div>
          <div className="flex justify-between mt-1">
            <span className="text-white/40 text-xs font-semibold">Câu {current + 1}/{questions.length}</span>
            <span className="text-white/40 text-xs font-semibold">{topic.emoji} {topic.name}</span>
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col px-4 py-4 max-w-2xl mx-auto w-full">
        <div className={`relative rounded-[24px] p-6 mb-6 animate-slide-up ${animClass}`}
          style={{ background: 'rgba(255,255,255,0.07)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.12)', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
          <div className="absolute -top-3 left-6">
            <span className="px-3 py-1 rounded-full text-xs font-extrabold text-white"
              style={{ background: 'linear-gradient(90deg, #6C5CE7, #4834D4)' }}>
              Câu hỏi {current + 1}
            </span>
          </div>
          {q.image && (
            <img src={q.image} alt="" className="w-full max-h-40 object-cover rounded-xl mb-3 mt-2" />
          )}
          <p className="text-white font-extrabold text-xl sm:text-2xl leading-snug mt-2 text-center"
            style={{ fontFamily: 'Baloo 2' }}>
            {q.text}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 flex-1">
          {q.answers.map((ans, idx) => {
            const answerId = q.answerIds[idx];
            const color = ANSWER_COLORS[idx];
            const isCorrect = revealed && answerId === correctAnswerId;
            const isWrong = revealed && answerId === selectedAnswerId && answerId !== correctAnswerId;
            return (
              <button key={answerId} onClick={() => handleAnswer(answerId)} disabled={revealed || checking}
                className={`answer-btn rounded-[18px] p-4 text-left relative overflow-hidden ${isCorrect ? 'animate-bounce-in' : ''} ${isWrong ? 'animate-shake' : ''}`}
                style={getAnswerStyle(answerId, idx)}>
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center">
                    <span className="text-white font-black text-sm">{color.label}</span>
                  </div>
                  <span className="text-white font-extrabold text-sm sm:text-base leading-snug flex-1">
                    {ans}
                  </span>
                </div>
                {isCorrect && (
                  <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-white/30 flex items-center justify-center">
                    <span className="text-sm">✓</span>
                  </div>
                )}
                {isWrong && (
                  <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-white/30 flex items-center justify-center">
                    <span className="text-sm">✗</span>
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {revealed && (
          <button onClick={nextQuestion}
            className="btn-bounce mt-4 w-full py-4 rounded-[18px] font-extrabold text-white text-lg animate-slide-up"
            style={{ background: 'linear-gradient(90deg, #6C5CE7, #4834D4)', boxShadow: '0 8px 25px rgba(108,92,231,0.5)', fontFamily: 'Baloo 2' }}>
            {wasWrong || wasLast || current >= questions.length - 1 ? '🏆 Xem kết quả' : 'Câu tiếp theo →'}
          </button>
        )}
      </div>
    </div>
  );
}
