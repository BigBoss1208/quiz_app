import { useEffect, useState } from 'react';
import type { Player } from '../data';
import { layDanhSachChuDeThongKe } from '../services/api';
import { mapTopDiemToPlayers } from '../adapters';

interface Props {
  topicId: string;
  score: number;
  correct: number;
  total: number;
  time: number;
  onReplay: () => void;
  onHome: () => void;
  onLeaderboard: () => void;
}

const CONFETTI_COLORS = ['#6C5CE7', '#FF6B6B', '#00D9A5', '#FFC107', '#74B9FF', '#fd79a8'];

function Confetti() {
  const pieces = Array.from({ length: 40 }, (_, i) => ({
    id: i,
    color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
    left: `${Math.random() * 100}%`,
    delay: `${Math.random() * 3}s`,
    duration: `${3 + Math.random() * 3}s`,
    size: `${6 + Math.random() * 8}px`,
    shape: Math.random() > 0.5 ? '50%' : '0',
  }));
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      {pieces.map(p => (
        <div key={p.id} className="absolute"
          style={{ left: p.left, top: '-20px', width: p.size, height: p.size, backgroundColor: p.color, borderRadius: p.shape, animation: `confetti-fall ${p.duration} ${p.delay} linear forwards` }} />
      ))}
    </div>
  );
}

function Stars({ count }: { count: number }) {
  return (
    <div className="flex items-center justify-center gap-3">
      {[1, 2, 3].map(i => (
        <span key={i} className={`text-4xl sm:text-5xl ${i <= count ? 'animate-star-pop' : 'opacity-20'}`}
          style={{ animationDelay: `${(i - 1) * 0.2}s`, filter: i <= count ? 'drop-shadow(0 0 12px #FFC107)' : 'none' }}>
          ⭐
        </span>
      ))}
    </div>
  );
}

function AnimatedNumber({ target, duration = 1500 }: { target: number; duration?: number }) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    const start = Date.now();
    const tick = () => {
      const elapsed = Date.now() - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.floor(eased * target));
      if (progress < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [target, duration]);
  return <>{value.toLocaleString()}</>;
}

export default function ResultScreen({ topicId, score, correct, total, time, onReplay, onHome, onLeaderboard }: Props) {
  const safeTotal = total || 1;
  const accuracy = Math.round((correct / safeTotal) * 100);
  const stars = accuracy >= 90 ? 3 : accuracy >= 60 ? 2 : 1;

  const [topPlayers, setTopPlayers] = useState<Player[]>([]);

  useEffect(() => {
    layDanhSachChuDeThongKe()
      .then((data) => {
        const found = data.find((c) => String(c.id) === topicId);
        if (found) setTopPlayers(mapTopDiemToPlayers(found.topDiemCao).slice(0, 3));
      })
      .catch(() => {});
  }, [topicId]);

  return (
    <div className="min-h-screen relative overflow-hidden"
      style={{ background: 'linear-gradient(160deg, #0f0c29 0%, #1a1048 50%, #24243e 100%)' }}>
      <Confetti />
      <div className="fixed top-1/2 left-1/2 w-[600px] h-[600px] rounded-full opacity-10 pointer-events-none"
        style={{ background: 'radial-gradient(circle, #6C5CE7, transparent)', filter: 'blur(80px)', transform: 'translate(-50%, -50%)' }} />

      <div className="relative z-10 max-w-xl mx-auto px-4 py-8 flex flex-col items-center">
        <div className="text-center mb-8 animate-count-up">
          <p className="text-white/60 font-bold text-sm mb-2 uppercase tracking-widest">Điểm của bạn</p>
          <div className="text-white font-black leading-none mb-4"
            style={{ fontSize: 'clamp(64px, 15vw, 100px)', fontFamily: 'Baloo 2', textShadow: '0 0 40px rgba(108,92,231,0.6)' }}>
            <AnimatedNumber target={score} />
          </div>
          <Stars count={stars} />
        </div>

        <div className="w-full grid grid-cols-3 gap-3 mb-6">
          {[
            { icon: '✅', label: 'Đúng', value: `${correct}/${total}`, color: '#00D9A5' },
            { icon: '🎯', label: 'Chính xác', value: `${accuracy}%`, color: '#6C5CE7' },
            { icon: '⏱️', label: 'Thời gian', value: `${time}s`, color: '#FFC107' },
          ].map(stat => (
            <div key={stat.label} className="rounded-[18px] p-4 text-center"
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}>
              <div className="text-2xl mb-1">{stat.icon}</div>
              <div className="font-extrabold text-lg" style={{ color: stat.color, fontFamily: 'Baloo 2' }}>{stat.value}</div>
              <div className="text-white/50 text-xs font-semibold mt-0.5">{stat.label}</div>
            </div>
          ))}
        </div>

        {topPlayers.length > 0 && (
          <div className="w-full rounded-[20px] overflow-hidden mb-6"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
            <div className="px-4 py-3 flex items-center justify-between"
              style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
              <span className="text-white font-extrabold text-sm" style={{ fontFamily: 'Baloo 2' }}>🏆 Top điểm chủ đề này</span>
              <button onClick={onLeaderboard} className="text-purple-400 text-xs font-bold hover:text-purple-300">Xem tất cả →</button>
            </div>
            {topPlayers.map((p, i) => (
              <div key={p.id} className="flex items-center gap-3 px-4 py-3"
                style={{ borderBottom: i < topPlayers.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
                <span className="text-xl w-8 text-center">{['🥇', '🥈', '🥉'][i]}</span>
                <span className="text-2xl">{p.avatar}</span>
                <span className="text-white font-bold text-sm flex-1">{p.name}</span>
                <span className="font-extrabold text-sm" style={{ color: ['#FFC107', '#aaa', '#cd7f32'][i], fontFamily: 'Baloo 2' }}>
                  {p.score.toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        )}

        <div className="w-full flex flex-col sm:flex-row gap-3">
          <button onClick={onReplay} className="btn-bounce flex-1 py-4 rounded-[18px] font-extrabold text-white text-lg"
            style={{ background: 'rgba(255,255,255,0.08)', border: '2px solid rgba(108,92,231,0.5)', fontFamily: 'Baloo 2' }}>
            🔄 Chơi lại
          </button>
          <button onClick={onHome} className="btn-bounce flex-1 py-4 rounded-[18px] font-extrabold text-white text-lg"
            style={{ background: 'linear-gradient(90deg, #6C5CE7, #4834D4)', boxShadow: '0 8px 25px rgba(108,92,231,0.5)', fontFamily: 'Baloo 2' }}>
            🎮 Chủ đề khác
          </button>
        </div>
      </div>
    </div>
  );
}
