import PhaseDAdmin from '../components/PhaseDAdmin';
import { layNhomMon, layChuDe } from '../services/api';
import { useState, useEffect } from 'react';
import type { Topic } from '../data';
import {
  themChuDe, xoaChuDe, capNhatChuDe,
  layDanhSachNguoiDung, layLichSuChoiCuaNguoiDung, layThongKeTongQuan,
   type NguoiDungAdminDTO, type LichSuChoiDTO, type ThongKeTongQuanDTO,
} from '../services/api';

interface Props {
  topics: Topic[];
  onBack: () => void;
  onTopicsChanged: () => void;
  onLogout: () => void;
}

const NAV_ITEMS = [
  { icon: '📊', label: 'Dashboard' },
  { icon: '📚', label: 'Chủ đề' },
  { icon: '❓', label: 'Câu hỏi' },
  { icon: '👥', label: 'Người dùng' },
  { icon: '📈', label: 'Thống kê' },
];

export default function AdminScreen({ topics, onBack, onTopicsChanged, onLogout }: Props) {
  const [activeNav, setActiveNav] = useState('Chủ đề');
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const [groups, setGroups] = useState<string[]>([]);
  useEffect(() => { layNhomMon(true).then(gs => setGroups(gs.map(g => g.ten))).catch(e => alert(e.message)); }, [topics]);
  // ----- Chủ đề -----
  const [newTopicName, setNewTopicName] = useState('');
  const [newTopicDesc, setNewTopicDesc] = useState('');
  const [newTopicCategory, setNewTopicCategory] = useState('');
  const [newChoPhepXemDapAn, setNewChoPhepXemDapAn] = useState(false);
  const [savingTopic, setSavingTopic] = useState(false);

  const [editingTopicId, setEditingTopicId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editCategory, setEditCategory] = useState('Khoa học');

  const [savingEdit, setSavingEdit] = useState(false);

  useEffect(() => { if (groups.length && !groups.includes(newTopicCategory)) setNewTopicCategory(groups[0]); }, [groups, newTopicCategory]);
  const handleAddTopic = async () => {
    if (!newTopicName.trim()) return;
    setSavingTopic(true);
    try {
      await themChuDe({
        tenChuDe: newTopicName.trim(),
        moTa: newTopicDesc.trim(),
        doKho: 'DE',
        danhMuc: newTopicCategory,
        choPhepXemDapAn: newChoPhepXemDapAn,
      });
      setNewTopicName('');
      setNewTopicDesc('');
      setNewChoPhepXemDapAn(false);
      onTopicsChanged();
    } catch {
      alert('Thêm chủ đề thất bại. Kiểm tra backend.');
    } finally {
      setSavingTopic(false);
    }
  };

  const startEditTopic = (topic: Topic) => {
    setEditingTopicId(topic.id);
    setEditName(topic.name);
    layChuDe(topic.id).then(dto => { setEditDesc(dto.moTa || ''); }).catch(e => alert(e.message));
    setEditCategory(topic.category);
  };

  const handleSaveEditTopic = async () => {
    if (!editingTopicId || !editName.trim()) return;
    setSavingEdit(true);
    try {
      await capNhatChuDe(Number(editingTopicId), {
        tenChuDe: editName.trim(),
        moTa: editDesc.trim(),
        doKho: 'DE',
        danhMuc: editCategory,
      });
      setEditingTopicId(null);
      onTopicsChanged();
    } catch {
      alert('Cập nhật chủ đề thất bại.');
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDeleteTopic = async (id: string) => {
    if (!confirm('Xóa chủ đề này? Toàn bộ câu hỏi bên trong cũng sẽ bị xóa.')) return;
    try {
      await xoaChuDe(Number(id));
      onTopicsChanged();
    } catch {
      alert('Xóa chủ đề thất bại.');
    }
  };

  // ----- Người dùng -----
  const [users, setUsers] = useState<NguoiDungAdminDTO[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [expandedUserId, setExpandedUserId] = useState<number | null>(null);
  const [userHistory, setUserHistory] = useState<LichSuChoiDTO[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  useEffect(() => {
    if (activeNav === 'Người dùng') {
      setLoadingUsers(true);
      layDanhSachNguoiDung().then(setUsers).finally(() => setLoadingUsers(false));
    }
  }, [activeNav]);

  const toggleUserHistory = (userId: number) => {
    if (expandedUserId === userId) {
      setExpandedUserId(null);
      return;
    }
    setExpandedUserId(userId);
    setLoadingHistory(true);
    layLichSuChoiCuaNguoiDung(userId)
      .then(setUserHistory)
      .finally(() => setLoadingHistory(false));
  };

  // ----- Thống kê -----
  const [tongQuan, setTongQuan] = useState<ThongKeTongQuanDTO | null>(null);
  const [loadingTongQuan, setLoadingTongQuan] = useState(false);

  useEffect(() => {
    if (activeNav === 'Thống kê') {
      setLoadingTongQuan(true);
      layThongKeTongQuan().then(setTongQuan).finally(() => setLoadingTongQuan(false));
    }
  }, [activeNav]);

  return (
    <div className="min-h-screen flex" style={{ background: 'linear-gradient(160deg, #0f0c29 0%, #1a1048 60%, #1d1540 100%)', fontFamily: 'Nunito' }}>
      {sidebarOpen && (
        <aside className="w-56 flex-shrink-0 flex flex-col max-md:fixed max-md:inset-y-0 max-md:left-0 max-md:z-30"
          style={{ background: 'rgba(17, 14, 44, 0.95)', borderRight: '1px solid rgba(167,139,250,0.15)', backdropFilter: 'blur(12px)' }}>
          <div className="p-5" style={{ borderBottom: '1px solid rgba(167,139,250,0.12)' }}>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xl">🎮</span>
              <span className="font-black text-white text-base" style={{ fontFamily: 'Baloo 2' }}>Quiz <span style={{ color: '#a78bfa' }}>ManhNhom</span></span>
            </div>
            <span className="text-xs font-bold uppercase tracking-wider" style={{ color: '#a78bfa' }}>Admin Panel</span>
          </div>
          <nav className="flex-1 p-3">
            {NAV_ITEMS.map((item) => (
              <button key={item.label} onClick={() => { setActiveNav(item.label); if (window.matchMedia('(max-width: 767px)').matches) setSidebarOpen(false); }}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl mb-1 text-left transition-all font-semibold text-sm"
                style={{ background: activeNav === item.label ? 'rgba(108,92,231,0.25)' : 'transparent', color: activeNav === item.label ? '#a78bfa' : 'rgba(255,255,255,0.55)', border: activeNav === item.label ? '1px solid rgba(167,139,250,0.25)' : '1px solid transparent' }}>
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </button>
            ))}
          </nav>
          <div className="p-4 space-y-1" style={{ borderTop: '1px solid rgba(167,139,250,0.12)' }}>
            <button onClick={onBack} className="w-full py-2 rounded-xl font-bold text-sm transition-colors"
              style={{ color: 'rgba(255,255,255,0.5)' }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = 'rgba(255,255,255,0.8)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(255,255,255,0.5)'; }}>
              ← Về trang chơi
            </button>
            <button onClick={onLogout} className="w-full py-2 rounded-xl font-bold text-sm transition-colors"
              style={{ color: '#ff8585' }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,107,107,0.1)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}>
              Đăng xuất
            </button>
          </div>
        </aside>
      )}

      <main className="flex-1 min-w-0 overflow-auto">
        <header className="px-6 py-4 flex items-center justify-between sticky top-0 z-10"
          style={{ background: 'rgba(17, 14, 44, 0.9)', borderBottom: '1px solid rgba(167,139,250,0.12)', backdropFilter: 'blur(12px)' }}>
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen((s) => !s)} className="p-2 rounded-lg transition-colors text-white/50 hover:text-white/80"
              style={{ background: 'rgba(255,255,255,0.06)' }}>☰</button>
            <h2 className="font-black text-white text-lg" style={{ fontFamily: 'Baloo 2' }}>
              {activeNav === 'Câu hỏi' ? '❓ Quản lý câu hỏi' : activeNav === 'Chủ đề' ? '📚 Quản lý chủ đề' : activeNav === 'Dashboard' ? '📊 Dashboard' : activeNav}
            </h2>
          </div>
        </header>

        <div className="p-6">
          {activeNav === 'Dashboard' && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { label: 'Số chủ đề', value: String(topics.length), icon: '📚', color: '#6C5CE7' },
                { label: 'Tổng câu hỏi', value: String(topics.reduce((s, t) => s + t.questions, 0)), icon: '❓', color: '#00D9A5' },
              ].map((stat) => (
                <div key={stat.label} className="rounded-2xl p-5" style={{ background: "rgba(26,20,64,0.8)", border: "1px solid rgba(167,139,250,0.15)", boxShadow: "0 8px 24px rgba(0,0,0,0.25)" }}>
                  <div className="text-3xl mb-2">{stat.icon}</div>
                  <div className="font-black text-2xl" style={{ color: stat.color, fontFamily: 'Baloo 2' }}>{stat.value}</div>
                  <div className="text-slate-500 text-sm font-semibold mt-1">{stat.label}</div>
                </div>
              ))}
            </div>
          )}

          {activeNav === 'Chủ đề' && (
            <div>
              <div className="rounded-2xl p-5 mb-4" style={{ background: "rgba(26,20,64,0.8)", border: "1px solid rgba(167,139,250,0.15)", boxShadow: "0 8px 24px rgba(0,0,0,0.25)" }}>
                <p className="font-bold text-white/80 mb-3 text-sm">Thêm chủ đề mới</p>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input value={newTopicName} onChange={(e) => setNewTopicName(e.target.value)}
                    placeholder="Tên chủ đề" className="flex-1 px-3 py-2 rounded-xl text-sm text-white" style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(167,139,250,0.2)" }} />
                  <input value={newTopicDesc} onChange={(e) => setNewTopicDesc(e.target.value)}
                    placeholder="Mô tả" className="flex-1 px-3 py-2 rounded-xl text-sm text-white" style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(167,139,250,0.2)" }} />
                  <select value={newTopicCategory} onChange={(e) => setNewTopicCategory(e.target.value)}
                    className="px-3 py-2 rounded-xl text-sm text-white" style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(167,139,250,0.2)" }}>
                    {groups.map(g => <option key={g} value={g}>{g}</option>)}
                  </select>
                  <button onClick={handleAddTopic} disabled={savingTopic}
                    className="px-4 py-2 rounded-xl font-bold text-sm text-white" style={{ background: '#6C5CE7' }}>
                    {savingTopic ? 'Đang lưu...' : '+ Thêm'}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {topics.map((topic) => (
                  editingTopicId === topic.id ? (
                    <div key={topic.id} className="rounded-2xl p-4 col-span-1 sm:col-span-2" style={{ background: "rgba(26,20,64,0.85)", border: "1.5px solid #a78bfa", boxShadow: "0 0 20px rgba(108,92,231,0.2)" }}>
                      <p className="font-bold text-white/80 mb-2 text-sm">Sửa chủ đề</p>
                      <div className="flex flex-col sm:flex-row gap-2 mb-2">
                        <input value={editName} onChange={(e) => setEditName(e.target.value)}
                          placeholder="Tên chủ đề" className="flex-1 px-3 py-2 rounded-xl text-sm text-white" style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(167,139,250,0.2)" }} />
                        <input value={editDesc} onChange={(e) => setEditDesc(e.target.value)}
                          placeholder="Mô tả" className="flex-1 px-3 py-2 rounded-xl text-sm text-white" style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(167,139,250,0.2)" }} />
                        <select value={editCategory} onChange={(e) => setEditCategory(e.target.value)}
                          className="px-3 py-2 rounded-xl text-sm text-white" style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(167,139,250,0.2)" }}>
                          {groups.map(g => <option key={g} value={g}>{g}</option>)}
                        </select>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={handleSaveEditTopic} disabled={savingEdit}
                          className="px-4 py-2 rounded-xl font-bold text-sm text-white" style={{ background: '#6C5CE7' }}>
                          {savingEdit ? 'Đang lưu...' : 'Lưu'}
                        </button>
                        <button onClick={() => setEditingTopicId(null)}
                          className="px-4 py-2 rounded-xl font-bold text-sm text-white/50 hover:text-white/80" style={{ background: "rgba(255,255,255,0.06)" }}>
                          Hủy
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div key={topic.id} className="rounded-2xl p-4 flex items-center gap-4" style={{ background: "rgba(26,20,64,0.75)", border: "1px solid rgba(167,139,250,0.13)" }}>
                      <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl" style={{ background: `${topic.shadow}` }}>
                        {topic.emoji}
                      </div>
                      <div className="flex-1">
                        <p className="font-bold text-white">{topic.name}</p>
                        <p className="text-white/50 text-xs font-semibold">{topic.questions} câu hỏi · {topic.category}</p>
                      </div>
                      <button onClick={() => startEditTopic(topic)}
                        className="p-1.5 rounded-lg hover:bg-slate-50 text-sm transition-colors">✏️</button>
                      <button onClick={() => handleDeleteTopic(topic.id)}
                        className="p-1.5 rounded-lg hover:bg-red-50 text-sm transition-colors">🗑️</button>
                    </div>
                  )
                ))}
              </div>
            </div>
          )}

          {activeNav === 'Câu hỏi' && <PhaseDAdmin topics={topics} onChanged={onTopicsChanged} />}

          {activeNav === 'Người dùng' && (
            loadingUsers ? (
              <p className="text-white/40 text-sm">Đang tải...</p>
            ) : users.length === 0 ? (
              <div className="rounded-2xl p-12 text-center" style={{ background: "rgba(26,20,64,0.75)", border: "1px solid rgba(167,139,250,0.13)" }}>
                <span className="text-5xl">👥</span>
                <p className="text-white/60 font-bold mt-4">Chưa có người dùng nào đăng ký.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {users.map((u) => (
                  <div key={u.id} className="rounded-2xl overflow-hidden" style={{ background: "rgba(26,20,64,0.75)", border: "1px solid rgba(167,139,250,0.13)" }}>
                    <div className="p-4 flex items-center gap-4 cursor-pointer" onClick={() => toggleUserHistory(u.id)}>
                      <div className="w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold text-white flex-shrink-0"
                        style={{ background: u.vaiTro === 'ADMIN' ? '#FF6B6B' : '#6C5CE7' }}>
                        {u.hoTen?.[0]?.toUpperCase() || '?'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-white">{u.hoTen}</p>
                          {u.vaiTro === 'ADMIN' && (
                            <span className="px-2 py-0.5 rounded-full text-xs font-bold" style={{ background: 'rgba(255,107,107,0.2)', color: '#ff8585' }}>ADMIN</span>
                          )}
                        </div>
                        <p className="text-white/50 text-xs font-semibold">@{u.username}</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="font-bold text-white text-sm">{u.tongLuotChoi} lượt chơi</p>
                        <p className="text-white/40 text-xs">Cao nhất: {u.diemCaoNhat} điểm</p>
                      </div>
                      <span className="text-slate-400 text-sm ml-2">{expandedUserId === u.id ? '▲' : '▼'}</span>
                    </div>

                    {expandedUserId === u.id && (
                      <div className="border-t p-4" style={{ background: "rgba(108,92,231,0.08)", borderColor: "rgba(167,139,250,0.15)" }}>
                        {loadingHistory ? (
                          <p className="text-white/40 text-sm">Đang tải lịch sử...</p>
                        ) : userHistory.length === 0 ? (
                          <p className="text-white/40 text-sm">Người dùng này chưa chơi lượt nào.</p>
                        ) : (
                          <div className="space-y-2">
                            {userHistory.map((h) => (
                              <div key={h.ketQuaId} className="flex items-center justify-between rounded-xl px-3 py-2 text-sm" style={{ background: "rgba(255,255,255,0.06)" }}>
                                <span className="font-semibold text-white/80">{h.tenChuDe}</span>
                                <span className="text-white/40 text-xs">{h.soCauDaTraLoi} câu · {new Date(h.thoiGianLam).toLocaleString('vi-VN')}</span>
                                <span className="font-bold text-purple-300">{h.diemSo} điểm</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )
          )}

          {activeNav === 'Thống kê' && (
            loadingTongQuan || !tongQuan ? (
              <p className="text-white/40 text-sm">Đang tải...</p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                  { label: 'Người dùng', value: tongQuan.tongNguoiDung, icon: '👥', color: '#6C5CE7' },
                  { label: 'Chủ đề', value: tongQuan.tongChuDe, icon: '📚', color: '#00D9A5' },
                  { label: 'Câu hỏi', value: tongQuan.tongCauHoi, icon: '❓', color: '#FFC107' },
                  { label: 'Lượt chơi', value: tongQuan.tongLuotChoi, icon: '🎮', color: '#FF6B6B' },
                ].map((stat) => (
                  <div key={stat.label} className="rounded-2xl p-5" style={{ background: "rgba(26,20,64,0.8)", border: "1px solid rgba(167,139,250,0.15)", boxShadow: "0 8px 24px rgba(0,0,0,0.25)" }}>
                    <div className="text-3xl mb-2">{stat.icon}</div>
                    <div className="font-black text-2xl" style={{ color: stat.color, fontFamily: 'Baloo 2' }}>{stat.value}</div>
                    <div className="text-slate-500 text-sm font-semibold mt-1">{stat.label}</div>
                  </div>
                ))}
              </div>
            )
          )}
        </div>
      </main>
    </div>
  );
}

