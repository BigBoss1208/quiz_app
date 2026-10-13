import { useEffect, useMemo, useState } from 'react';

import type { Player } from '../data';

import { layDanhSachChuDeThongKe, type ChatQuestionContext, type NopBaiResponseDTO } from '../services/api';

import { mapTopDiemToPlayers } from '../adapters';

import StudyChatWidget from '../components/StudyChatWidget';

interface Props {

  topicId: string;

  result: NopBaiResponseDTO;

  onReplay: () => void;

  onHome: () => void;

  onLeaderboard: () => void;
  /** Chỉ true khi vừa nộp bài thành công, không dùng cho lịch sử. */
  celebrate?: boolean;

}

const CONFETTI_COLORS = ['#6C5CE7', '#FF6B6B', '#00D9A5', '#FFC107', '#74B9FF', '#fd79a8'];

function Confetti() {
  const [visible, setVisible] = useState(true);
  const [reduceMotion, setReduceMotion] = useState(() =>
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  );
  const pieces = useMemo(() => Array.from({ length: 75 }, (_, i) => ({
    id: i,
    color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
    left: `${Math.random() * 100}%`,
    delay: `${Math.random() * 0.8}s`,
    duration: `${3 + Math.random() * 1.1}s`,
    width: `${5 + Math.random() * 7}px`,
    height: `${7 + Math.random() * 9}px`,
  })), []);

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReduceMotion(media.matches);
    media.addEventListener('change', update);
    const timer = window.setTimeout(() => setVisible(false), 4800);
    return () => {
      window.clearTimeout(timer);
      media.removeEventListener('change', update);
    };
  }, []);

  if (!visible || reduceMotion) return null;

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-20" aria-hidden="true">
      {pieces.map((piece) => (
        <div
          key={piece.id}
          className="absolute"
          style={{
            left: piece.left,
            top: '-24px',
            width: piece.width,
            height: piece.height,
            backgroundColor: piece.color,
            borderRadius: '2px',
            animation: `confetti-fall ${piece.duration} ${piece.delay} linear forwards`,
          }}
        />
      ))}
    </div>
  );
}

function AnimatedNumber({ target, duration = 1500 }: { target: number; duration?: number }) {

  const [value, setValue] = useState(0);

  useEffect(() => {

    const start = Date.now();

    let frame = 0;

    const tick = () => {

      const progress = Math.min((Date.now() - start) / duration, 1);

      setValue(Math.floor((1 - Math.pow(1 - progress, 3)) * target));

      if (progress < 1) frame = requestAnimationFrame(tick);

    };

    frame = requestAnimationFrame(tick);

    return () => cancelAnimationFrame(frame);

  }, [target, duration]);

  return <>{value.toLocaleString()}</>;

}

export default function ResultScreen({ topicId, result, onReplay, onHome, onLeaderboard, celebrate = false }: Props) {

  const accuracy = result.tongSoCauHoi > 0

    ? Math.round((result.soCauDung / result.tongSoCauHoi) * 100)

    : 0;

  const [topPlayers, setTopPlayers] = useState<Player[]>([]);

  const [leaderboardError, setLeaderboardError] = useState<string | null>(null);

  const [chatContext, setChatContext] = useState<ChatQuestionContext | null>(null);

  useEffect(() => {

    layDanhSachChuDeThongKe()

      .then((data) => {

        const found = data.find((item) => String(item.id) === topicId);

        if (found) setTopPlayers(mapTopDiemToPlayers(found.topDiemCao).slice(0, 3));

      })

      .catch(() => setLeaderboardError('Chưa tải được bảng điểm chủ đề.'));

  }, [topicId]);

  const statCards = [

    { icon: '📋', label: 'Tổng câu', value: result.tongSoCauHoi, color: '#74B9FF' },

    { icon: '✅', label: 'Trả lời đúng', value: result.soCauDung, color: '#00D9A5' },

    { icon: '❌', label: 'Trả lời sai', value: result.soCauSai, color: '#FF8585' },

    { icon: '➖', label: 'Chưa trả lời', value: result.soCauChuaTraLoi, color: '#FFC107' },

  ];

  return (

    <div className="min-h-screen relative overflow-hidden"

      style={{ background: 'linear-gradient(160deg, #0f0c29 0%, #1a1048 50%, #24243e 100%)' }}>

      {celebrate && <Confetti />}

      <div className="fixed top-1/2 left-1/2 w-[600px] h-[600px] rounded-full opacity-10 pointer-events-none"

        style={{ background: 'radial-gradient(circle, #6C5CE7, transparent)', filter: 'blur(80px)', transform: 'translate(-50%, -50%)' }} />

      <main className="relative z-10 max-w-4xl mx-auto px-4 py-8">

        <header className="text-center mb-7">
          {celebrate && (
            <div className="mb-5 animate-slide-up">
              <div className="text-6xl mb-2" aria-hidden="true">🏆</div>
              <h2 className="text-white text-2xl sm:text-3xl font-black">
                🎉 Chúc mừng bạn đã hoàn thành bài Quiz!
              </h2>
              <p className="text-purple-200 mt-2 font-semibold">
                Bạn đã hoàn thành thử thách. Cùng xem kết quả nhé!
              </p>
            </div>
          )}

          <p className="text-white/65 font-bold text-sm mb-2 uppercase tracking-widest">Bài làm đã được chấm</p>

          <h1 className="text-white font-black leading-none mb-3"

            style={{ fontSize: 'clamp(56px, 12vw, 88px)', fontFamily: 'Baloo 2', textShadow: '0 0 40px rgba(108,92,231,0.55)' }}>

            <AnimatedNumber target={result.diemSo} />

          </h1>

          <p className="text-white/75 font-extrabold text-lg">Điểm số</p>

        </header>

        <section aria-label="Tổng kết bài làm" className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">

          {statCards.map((stat) => (

            <div key={stat.label} className="rounded-2xl p-4 text-center"

              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}>

              <div className="text-2xl mb-1" aria-hidden="true">{stat.icon}</div>

              <div className="font-extrabold text-2xl" style={{ color: stat.color, fontFamily: 'Baloo 2' }}>{stat.value}</div>

              <div className="text-white/60 text-xs font-semibold mt-1">{stat.label}</div>

            </div>

          ))}

        </section>

        <section className="grid grid-cols-2 gap-3 mb-8">

          <div className="rounded-2xl p-4 text-center"

            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}>

            <div className="text-purple-300 font-extrabold text-2xl">{accuracy}%</div>

            <div className="text-white/60 text-xs font-semibold">Tỷ lệ chính xác</div>

          </div>

          <div className="rounded-2xl p-4 text-center"

            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}>

            <div className="text-yellow-300 font-extrabold text-2xl">{result.thoiGianLam}s</div>

            <div className="text-white/60 text-xs font-semibold">Thời gian hoàn thành</div>

          </div>

        </section>

        <section className="mb-8" aria-labelledby="review-title">

          <div className="flex items-center justify-between gap-3 mb-4">

            <h2 id="review-title" className="text-white font-extrabold text-xl" style={{ fontFamily: 'Baloo 2' }}>

              Xem lại bài làm

            </h2>

            <span className="text-white/50 text-sm">{result.danhSachCauHoi.length} câu</span>

          </div>

          <div className="space-y-4">

            {result.danhSachCauHoi.map((question, index) => {

              const correctAnswer = question.danhSachDapAn.find((answer) => answer.id === question.dapAnDungId);

              const selectedAnswer = question.danhSachDapAn.find((answer) => answer.id === question.dapAnDaChonId);

              const status = question.ketQua === 'DUNG'

                ? { label: 'Trả lời đúng', icon: '✓', color: '#00D9A5' }

                : question.ketQua === 'SAI'

                  ? { label: 'Trả lời sai', icon: '✗', color: '#FF8585' }

                  : { label: 'Chưa trả lời', icon: '—', color: '#FFC107' };

              const context: ChatQuestionContext = {

                question: question.noiDungCauHoi,

                options: question.danhSachDapAn.map((answer) => answer.noiDung),

                selectedAnswer: selectedAnswer?.noiDung ?? 'Người học chưa chọn đáp án.',

                correctAnswer: correctAnswer?.noiDung ?? 'Không có dữ liệu đáp án đúng.',

                outcome: status.label,

                explanation: question.giaiThich,

              };

              return (

                <article key={question.cauHoiId} className="rounded-2xl p-4 sm:p-5"

                  style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)' }}>

                  <div className="flex items-start justify-between gap-3 mb-3">

                    <h3 className="text-white font-extrabold leading-snug">Câu {index + 1}: {question.noiDungCauHoi}</h3>

                    <span className="shrink-0 font-extrabold text-sm" style={{ color: status.color }}>

                      {status.icon} {status.label}

                    </span>

                  </div>

                  {question.hinhAnh && <img src={question.hinhAnh} alt="" className="max-h-48 max-w-full object-contain rounded-xl mb-3" />}

                  <ul className="space-y-2">

                    {question.danhSachDapAn.map((answer, answerIndex) => {

                      const isCorrect = answer.id === question.dapAnDungId;

                      const isSelected = answer.id === question.dapAnDaChonId;

                      return (

                        <li key={answer.id} className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-xl px-3 py-2 text-sm"

                          style={{

                            background: isCorrect ? 'rgba(0,217,165,0.14)' : isSelected ? 'rgba(255,107,107,0.15)' : 'rgba(255,255,255,0.04)',

                            border: `1px solid ${isCorrect ? 'rgba(0,217,165,0.45)' : isSelected ? 'rgba(255,107,107,0.45)' : 'transparent'}`,

                          }}>

                          <span className="text-white/60 font-extrabold">{String.fromCharCode(65 + answerIndex)}.</span>

                          <span className="text-white/90">{answer.noiDung}</span>

                          {isCorrect && <span className="text-emerald-200 font-extrabold">✓ Đáp án đúng</span>}

                          {isSelected && <span className="text-rose-200 font-extrabold">← Bạn đã chọn</span>}

                        </li>

                      );

                    })}

                  </ul>

                  <p className="text-white/70 text-sm mt-3">

                    {question.giaiThich?.trim()

                      ? <>Giải thích: {question.giaiThich}</>

                      : 'Câu hỏi này chưa có lời giải thích được cung cấp.'}

                  </p>

                  <button type="button" onClick={() => setChatContext(context)}

                    className="mt-3 rounded-xl px-3 py-2 text-sm font-extrabold text-white"

                    style={{ background: 'rgba(108,92,231,0.38)', border: '1px solid rgba(162,155,254,0.45)' }}>

                    ✨ Hỏi AI về câu này

                  </button>

                </article>

              );

            })}

          </div>

        </section>

        {topPlayers.length > 0 && (

          <section className="w-full rounded-2xl overflow-hidden mb-6"

            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>

            <div className="px-4 py-3 flex items-center justify-between"

              style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>

              <span className="text-white font-extrabold text-sm">🏆 Top điểm chủ đề này</span>

              <button onClick={onLeaderboard} className="text-purple-300 text-xs font-bold hover:text-purple-200">Xem tất cả →</button>

            </div>

            {topPlayers.map((player, index) => (

              <div key={player.id} className="flex items-center gap-3 px-4 py-3"

                style={{ borderBottom: index < topPlayers.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>

                <span className="text-xl w-8 text-center">{['🥇', '🥈', '🥉'][index]}</span>

                <span className="text-2xl">{player.avatar}</span>

                <span className="text-white font-bold text-sm flex-1">{player.name}</span>

                <span className="font-extrabold text-sm text-yellow-300">{player.score.toLocaleString()}</span>

              </div>

            ))}

          </section>

        )}

        {leaderboardError && <p role="status" className="text-white/50 text-sm mb-4">{leaderboardError}</p>}

        <div className="w-full flex flex-col sm:flex-row gap-3">

          <button onClick={onReplay} className="btn-bounce flex-1 py-4 rounded-2xl font-extrabold text-white text-lg"

            style={{ background: 'rgba(255,255,255,0.08)', border: '2px solid rgba(108,92,231,0.5)' }}>

            🔄 Làm lại bài

          </button>

          <button onClick={onHome} className="btn-bounce flex-1 py-4 rounded-2xl font-extrabold text-white text-lg"

            style={{ background: 'linear-gradient(90deg, #6C5CE7, #4834D4)', boxShadow: '0 8px 25px rgba(108,92,231,0.4)' }}>

            🎮 Chủ đề khác

          </button>

        </div>

        <div className="mt-5">

          <StudyChatWidget inline context={chatContext} onClearContext={() => setChatContext(null)} />

        </div>

      </main>

    </div>

  );

}
