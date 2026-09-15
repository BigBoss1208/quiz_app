import { useState } from 'react';
import type { Topic } from '../data';
import type { AuthUser } from '../services/api';

interface Props {
  topics: Topic[];
  currentUser: AuthUser | null;
  onStart: (topic: Topic) => void;
  onLeaderboard: () => void;
  onAdmin: () => void;
  onLogin: () => void;
  onLogout: () => void;
  xp: number;
  streak: number;
}

const CATEGORIES = ['Tất cả', 'Khoa học', 'Xã hội', 'Nghệ thuật'];

function ProgressRing({ pct }: { pct: number }) {
  const r = 18, c = 2 * Math.PI * r;
  const offset = c - (pct / 100) * c;
  return (
    <svg width="44" height="44" viewBox="0 0 44 44">
      <circle cx="22" cy="22" r={r} fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="3" />
      <circle cx="22" cy="22" r={r} fill="none" stroke="white" strokeWidth="3"
        strokeDasharray={c} strokeDashoffset={offset}
        strokeLinecap="round" transform="rotate(-90 22 22)" />
      <text x="22" y="26" textAnchor="middle" fill="white" fontSize="9" fontWeight="800" fontFamily="Nunito">
        {pct}%
      </text>
    </svg>
  );
}

function TopicCard({ topic, onStart }: { topic: Topic; onStart: () => void }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      className="card-hover relative rounded-[20px] overflow-hidden cursor-pointer select-none"
      style={{
        background: topic.gradient,
        boxShadow: `0 8px 32px ${topic.shadow}, 0 2px 8px rgba(0,0,0,0.2)`,
        minHeight: 200,
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onTouchStart={() => setHovered(true)}
      onTouchEnd={() => setHovered(false)}
      onClick={onStart}
    >
      <div className="absolute inset-0 opacity-10"
        style={{ background: 'radial-gradient(circle at 70% 30%, white, transparent 60%)' }} />
      <div className="p-5 flex flex-col h-full min-h-[200px]">
        <div className="flex items-start justify-between mb-3">
          <span className="text-5xl animate-float">
            {topic.emoji}
          </span>
          <div style={{ opacity: hovered ? 0 : 1, transition: 'opacity 0.2s' }}>
            <ProgressRing pct={topic.completion} />
          </div>
        </div>
        <div className="mt-auto">
          <h3 className="text-white font-extrabold text-lg leading-tight" style={{ fontFamily: 'Baloo 2' }}>
            {topic.name}
          </h3>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-white/70 text-xs font-semibold">{topic.questions} câu hỏi</span>
            <span className="w-1 h-1 rounded-full bg-white/40" />
            <span className="text-white/70 text-xs font-semibold">{topic.category}</span>
          </div>
        </div>
        <div className="absolute inset-x-4 bottom-4 transition-all duration-200"
          style={{ opacity: hovered ? 1 : 0, transform: hovered ? 'translateY(0)' : 'translateY(8px)' }}>
          <button
            className="btn-bounce w-full py-2.5 rounded-2xl bg-white font-extrabold text-sm"
            style={{ color: '#4834D4', fontFamily: 'Baloo 2' }}
            onClick={(e) => { e.stopPropagation(); onStart(); }}
          >
            🚀 Bắt đầu
          </button>
        </div>
      </div>
    </div>
  );
}

export default function HomeScreen({ topics, currentUser, onStart, onLeaderboard, onAdmin, onLogin, onLogout, xp, streak }: Props) {
  const [activeCategory, setActiveCategory] = useState('Tất cả');
  const filtered = activeCategory === 'Tất cả' ? topics : topics.filter(t => t.category === activeCategory);

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(160deg, #0f0c29 0%, #1a1048 50%, #24243e 100%)' }}>
      <div className="fixed top-0 left-0 w-96 h-96 rounded-full opacity-20 pointer-events-none"
        style={{ background: 'radial-gradient(circle, #6C5CE7, transparent)', filter: 'blur(60px)', transform: 'translate(-30%, -30%)' }} />
      <div className="fixed top-20 right-0 w-80 h-80 rounded-full opacity-15 pointer-events-none"
        style={{ background: 'radial-gradient(circle, #FF6B6B, transparent)', filter: 'blur(50px)', transform: 'translateX(30%)' }} />
      <div className="fixed bottom-0 left-1/2 w-96 h-96 rounded-full opacity-10 pointer-events-none"
        style={{ background: 'radial-gradient(circle, #00D9A5, transparent)', filter: 'blur(80px)', transform: 'translateX(-50%)' }} />

      <div className="relative z-10 max-w-5xl mx-auto px-4 pb-12">
        <header className="flex items-center justify-between py-5">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🎮</span>
            <span className="text-white font-extrabold text-xl" style={{ fontFamily: 'Baloo 2' }}>QuizVN</span>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={onLeaderboard}
              className="btn-bounce flex items-center gap-1.5 px-3 py-2 rounded-2xl text-white/80 font-bold text-sm"
              style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)' }}>
              🏆 <span className="hidden sm:inline">Bảng xếp hạng</span>
            </button>
            <button onClick={onAdmin}
              className="btn-bounce flex items-center gap-1.5 px-3 py-2 rounded-2xl text-white/60 font-bold text-sm"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
              ⚙️
            </button>
            {currentUser ? (
              <button onClick={onLogout}
                className="btn-bounce flex items-center gap-1.5 px-3 py-2 rounded-2xl text-white/80 font-bold text-sm"
                style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)' }}>
                👤 <span className="hidden sm:inline">{currentUser.hoTen}</span>
              </button>
            ) : (
              <button onClick={onLogin}
                className="btn-bounce flex items-center gap-1.5 px-3 py-2 rounded-2xl font-bold text-sm text-white"
                style={{ background: 'linear-gradient(90deg, #6C5CE7, #4834D4)' }}>
                Đăng nhập
              </button>
            )}
            <div className="flex items-center gap-2 px-3 py-2 rounded-2xl"
              style={{ background: 'rgba(255,193,7,0.15)', border: '1px solid rgba(255,193,7,0.3)' }}>
              <span className="text-lg">🔥</span>
              <span className="text-yellow-300 font-extrabold text-sm">{streak}</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-2 rounded-2xl"
              style={{ background: 'rgba(108,92,231,0.2)', border: '1px solid rgba(108,92,231,0.4)' }}>
              <span className="text-lg">⚡</span>
              <span className="text-purple-300 font-extrabold text-sm">{xp.toLocaleString()} XP</span>
            </div>
          </div>
        </header>

        <div className="text-center py-8">
          <h1 className="text-white font-black text-3xl sm:text-5xl leading-tight mb-3" style={{ fontFamily: 'Baloo 2', letterSpacing: '-0.5px' }}>
            Chọn chủ đề của bạn 🎯
          </h1>
          <p className="text-white/50 text-base sm:text-lg font-semibold max-w-md mx-auto">
            Học mà chơi, chơi mà học — nâng cấp bản thân mỗi ngày!
          </p>
        </div>

        <div className="flex gap-2.5 overflow-x-auto pb-2 mb-6" style={{ scrollbarWidth: 'none' }}>
          {CATEGORIES.map(cat => (
            <button key={cat} onClick={() => setActiveCategory(cat)}
              className="btn-bounce flex-shrink-0 px-4 py-2 rounded-full font-extrabold text-sm transition-all duration-200"
              style={{
                background: activeCategory === cat ? 'linear-gradient(90deg, #6C5CE7, #4834D4)' : 'rgba(255,255,255,0.08)',
                color: activeCategory === cat ? 'white' : 'rgba(255,255,255,0.6)',
                border: activeCategory === cat ? 'none' : '1px solid rgba(255,255,255,0.12)',
                boxShadow: activeCategory === cat ? '0 4px 15px rgba(108,92,231,0.4)' : 'none',
              }}>
              {cat}
            </button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <p className="text-white/50 text-center font-semibold py-12">
            Chưa có chủ đề nào. Vào ⚙️ Admin để thêm chủ đề mới.
          </p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {filtered.map(topic => (
              <TopicCard key={topic.id} topic={topic} onStart={() => onStart(topic)} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
