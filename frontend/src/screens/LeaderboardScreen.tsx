import { useEffect, useState } from 'react';
import type { Topic, Player } from '../data';
import { layDanhSachChuDeThongKe, type ChuDeThongKeDTO } from '../services/api';
import { mapTopDiemToPlayers } from '../adapters';

interface Props {
  topics: Topic[];
  onBack: () => void;
}

// Backend hiện chưa lưu mốc thời gian theo tuần/tháng — 3 tab này tạm thời chỉ mang tính hiển thị
const TIME_TABS = ['Theo tuần', 'Theo tháng', 'Mọi lúc'];

function Podium({ players }: { players: Player[] }) {
  if (players.length < 3) return null;
  const order = [players[1], players[0], players[2]];
  const heights = [120, 160, 100];
  const colors = ['#C0C0C0', '#FFD700', '#CD7F32'];
  const bgColors = ['rgba(192,192,192,0.15)', 'rgba(255,215,0,0.15)', 'rgba(205,127,50,0.15)'];
  const crowns = ['🥈', '🥇', '🥉'];

  return (
    <div className="flex items-end justify-center gap-3 mb-8 pt-4">
      {order.map((p, i) => (
        <div key={p.id} className="flex flex-col items-center" style={{ width: 100 }}>
          <span className="text-2xl mb-1">{crowns[i]}</span>
          <div className="w-14 h-14 rounded-full flex items-center justify-center text-2xl mb-2"
            style={{ background: bgColors[i], border: `3px solid ${colors[i]}`, boxShadow: `0 0 20px ${colors[i]}40` }}>
            {p.avatar}
          </div>
          <p className="text-white font-bold text-xs text-center mb-1 truncate w-full text-center">{p.name}</p>
          <p className="font-extrabold text-xs mb-2" style={{ color: colors[i], fontFamily: 'Baloo 2' }}>
            {p.score.toLocaleString()}
          </p>
          <div className="w-full rounded-t-[12px] flex items-center justify-center"
            style={{ height: heights[i], background: `linear-gradient(180deg, ${colors[i]}30, ${colors[i]}10)`, border: `1px solid ${colors[i]}40`, borderBottom: 'none' }}>
            <span className="font-black text-2xl" style={{ color: colors[i], fontFamily: 'Baloo 2' }}>
              {i === 1 ? '1' : i === 0 ? '2' : '3'}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function LeaderboardScreen({ topics, onBack }: Props) {
  const [activeTime, setActiveTime] = useState('Mọi lúc');
  const [activeTopic, setActiveTopic] = useState('Tất cả');
  const [raw, setRaw] = useState<ChuDeThongKeDTO[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    layDanhSachChuDeThongKe()
      .then(setRaw)
      .finally(() => setLoading(false));
  }, []);

  const players: Player[] = (() => {
    if (activeTopic === 'Tất cả') {
      const merged = raw.flatMap((c) => c.topDiemCao);
      merged.sort((a, b) => b.diemSo - a.diemSo);
      return mapTopDiemToPlayers(merged.slice(0, 20));
    }
    const found = raw.find((c) => c.tenChuDe === activeTopic);
    return found ? mapTopDiemToPlayers(found.topDiemCao) : [];
  })();

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(160deg, #0f0c29 0%, #1a1048 50%, #24243e 100%)' }}>
      <div className="fixed top-0 left-1/2 w-[500px] h-[500px] rounded-full opacity-10 pointer-events-none"
        style={{ background: 'radial-gradient(circle, #FFC107, transparent)', filter: 'blur(80px)', transform: 'translateX(-50%)' }} />

      <div className="relative z-10 max-w-xl mx-auto px-4 py-6">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={onBack} className="btn-bounce text-white/60 hover:text-white font-bold px-3 py-1.5 rounded-xl text-sm"
            style={{ background: 'rgba(255,255,255,0.08)' }}>← Quay lại</button>
          <h1 className="text-white font-black text-2xl" style={{ fontFamily: 'Baloo 2' }}>🏆 Bảng xếp hạng</h1>
        </div>

        <div className="flex gap-2 mb-4 p-1 rounded-2xl" style={{ background: 'rgba(255,255,255,0.05)' }}>
          {TIME_TABS.map(t => (
            <button key={t} onClick={() => setActiveTime(t)}
              className="flex-1 py-2 rounded-xl font-bold text-xs transition-all duration-200"
              style={{
                background: activeTime === t ? 'linear-gradient(90deg, #6C5CE7, #4834D4)' : 'transparent',
                color: activeTime === t ? 'white' : 'rgba(255,255,255,0.5)',
                boxShadow: activeTime === t ? '0 4px 15px rgba(108,92,231,0.4)' : 'none',
              }}>
              {t}
            </button>
          ))}
        </div>

        <div className="flex gap-2 overflow-x-auto pb-2 mb-6" style={{ scrollbarWidth: 'none' }}>
          {['Tất cả', ...topics.map(t => t.name)].map(t => (
            <button key={t} onClick={() => setActiveTopic(t)}
              className="btn-bounce flex-shrink-0 px-3 py-1.5 rounded-full font-bold text-xs transition-all"
              style={{
                background: activeTopic === t ? 'rgba(108,92,231,0.3)' : 'rgba(255,255,255,0.06)',
                color: activeTopic === t ? '#a29bfe' : 'rgba(255,255,255,0.5)',
                border: activeTopic === t ? '1px solid rgba(108,92,231,0.5)' : '1px solid rgba(255,255,255,0.1)',
              }}>
              {t}
            </button>
          ))}
        </div>

        {loading ? (
          <p className="text-white/50 text-center font-semibold py-12">Đang tải...</p>
        ) : players.length === 0 ? (
          <p className="text-white/50 text-center font-semibold py-12">Chưa có ai chơi chủ đề này.</p>
        ) : (
          <>
            <Podium players={players} />
            {players.length > 3 && (
              <div className="rounded-[20px] overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
                {players.slice(3).map((p, i) => (
                  <div key={p.id} className="flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-white/5"
                    style={{ borderBottom: i < players.length - 4 ? '1px solid rgba(255,255,255,0.05)' : 'none', background: 'rgba(255,255,255,0.02)' }}>
                    <span className="w-8 text-center font-black text-white/40 text-sm" style={{ fontFamily: 'Baloo 2' }}>
                      #{p.rank}
                    </span>
                    <div className="w-9 h-9 rounded-full flex items-center justify-center text-lg"
                      style={{ background: 'rgba(255,255,255,0.08)' }}>
                      {p.avatar}
                    </div>
                    <div className="flex-1">
                      <p className="text-white font-bold text-sm">{p.name}</p>
                      <p className="text-white/40 text-xs font-semibold">{p.score.toLocaleString()} điểm</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
