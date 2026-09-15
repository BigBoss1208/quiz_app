import { useState, useEffect } from 'react';
import type { Topic } from '../data';
import {
  themChuDe, xoaChuDe, capNhatChuDe,
  layCauHoiTheoChuDe, themCauHoi, capNhatCauHoi, xoaCauHoi,
  layDanhSachNguoiDung, layLichSuChoiCuaNguoiDung, layThongKeTongQuan,
  type CauHoiAdmin, type NguoiDungAdminDTO, type LichSuChoiDTO, type ThongKeTongQuanDTO,
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

  // ----- Chủ đề -----
  const [newTopicName, setNewTopicName] = useState('');
  const [newTopicDesc, setNewTopicDesc] = useState('');
  const [newTopicCategory, setNewTopicCategory] = useState('Khoa học');
  const [savingTopic, setSavingTopic] = useState(false);

  const [editingTopicId, setEditingTopicId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editCategory, setEditCategory] = useState('Khoa học');
  const [savingEdit, setSavingEdit] = useState(false);

  const handleAddTopic = async () => {
    if (!newTopicName.trim()) return;
    setSavingTopic(true);
    try {
      await themChuDe({ tenChuDe: newTopicName.trim(), moTa: newTopicDesc.trim(), doKho: 'DE', danhMuc: newTopicCategory });
      setNewTopicName('');
      setNewTopicDesc('');
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
    setEditDesc('');
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

  // ----- Câu hỏi -----
  const [selectedTopicId, setSelectedTopicId] = useState<string>('');
  const [questions, setQuestions] = useState<CauHoiAdmin[]>([]);
  const [loadingQuestions, setLoadingQuestions] = useState(false);

  const [qText, setQText] = useState('');
  const [answers, setAnswers] = useState(['', '', '', '']);
  const [correctIdx, setCorrectIdx] = useState(0);
  const [savingQuestion, setSavingQuestion] = useState(false);

  const [editingQuestionId, setEditingQuestionId] = useState<number | null>(null);
  const [editQText, setEditQText] = useState('');
  const [editAnswers, setEditAnswers] = useState(['', '', '', '']);
  const [editCorrectIdx, setEditCorrectIdx] = useState(0);
  const [savingEditQuestion, setSavingEditQuestion] = useState(false);

  useEffect(() => {
    if (!selectedTopicId && topics.length > 0) setSelectedTopicId(topics[0].id);
  }, [topics, selectedTopicId]);

  const loadQuestions = (topicId: string) => {
    if (!topicId) return;
    setLoadingQuestions(true);
    layCauHoiTheoChuDe(topicId)
      .then(setQuestions)
      .finally(() => setLoadingQuestions(false));
  };

  useEffect(() => {
    if (selectedTopicId) loadQuestions(selectedTopicId);
  }, [selectedTopicId]);

  const handleAddQuestion = async () => {
    if (!qText.trim() || answers.some((a) => !a.trim()) || !selectedTopicId) return;
    setSavingQuestion(true);
    try {
      await themCauHoi({
        noiDungCauHoi: qText.trim(),
        chuDe: { id: Number(selectedTopicId) },
        danhSachDapAn: answers.map((a, i) => ({ noiDung: a.trim(), laDapAnDung: i === correctIdx })),
      });
      setQText('');
      setAnswers(['', '', '', '']);
      setCorrectIdx(0);
      loadQuestions(selectedTopicId);
      onTopicsChanged();
    } catch {
      alert('Thêm câu hỏi thất bại. Kiểm tra backend.');
    } finally {
      setSavingQuestion(false);
    }
  };

  const startEditQuestion = (q: CauHoiAdmin) => {
    setEditingQuestionId(q.id!);
    setEditQText(q.noiDungCauHoi);
    setEditAnswers(q.danhSachDapAn.map((a) => a.noiDung));
    setEditCorrectIdx(q.danhSachDapAn.findIndex((a) => a.laDapAnDung));
  };

  const handleSaveEditQuestion = async () => {
    if (!editingQuestionId || !editQText.trim() || editAnswers.some((a) => !a.trim())) return;
    setSavingEditQuestion(true);
    try {
      await capNhatCauHoi(editingQuestionId, {
        noiDungCauHoi: editQText.trim(),
        chuDe: { id: Number(selectedTopicId) },
        danhSachDapAn: editAnswers.map((a, i) => ({ noiDung: a.trim(), laDapAnDung: i === editCorrectIdx })),
      });
      setEditingQuestionId(null);
      loadQuestions(selectedTopicId);
    } catch {
      alert('Cập nhật câu hỏi thất bại.');
    } finally {
      setSavingEditQuestion(false);
    }
  };

  const handleDeleteQuestion = async (id?: number) => {
    if (!id) return;
    if (!confirm('Xóa câu hỏi này?')) return;
    try {
      await xoaCauHoi(id);
      loadQuestions(selectedTopicId);
      onTopicsChanged();
    } catch {
      alert('Xóa câu hỏi thất bại.');
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
    <div className="min-h-screen flex" style={{ background: '#f8fafc', fontFamily: 'Nunito' }}>
      {sidebarOpen && (
        <aside className="w-56 flex-shrink-0 flex flex-col"
          style={{ background: 'white', borderRight: '1px solid #e2e8f0', boxShadow: '4px 0 20px rgba(0,0,0,0.04)' }}>
          <div className="p-5 border-b border-slate-100">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xl">🎮</span>
              <span className="font-black text-slate-800 text-base" style={{ fontFamily: 'Baloo 2' }}>QuizVN</span>
            </div>
            <span className="text-xs font-bold text-indigo-500 uppercase tracking-wider">Admin Panel</span>
          </div>
          <nav className="flex-1 p-3">
            {NAV_ITEMS.map((item) => (
              <button key={item.label} onClick={() => setActiveNav(item.label)}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl mb-1 text-left transition-all font-semibold text-sm"
                style={{ background: activeNav === item.label ? '#ede9ff' : 'transparent', color: activeNav === item.label ? '#6C5CE7' : '#64748b' }}>
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </button>
            ))}
          </nav>
          <div className="p-4 border-t border-slate-100 space-y-1">
            <button onClick={onBack} className="w-full py-2 rounded-xl font-bold text-sm text-slate-500 hover:text-slate-700 hover:bg-slate-50 transition-colors">
              ← Về trang chơi
            </button>
            <button onClick={onLogout} className="w-full py-2 rounded-xl font-bold text-sm text-red-400 hover:text-red-600 hover:bg-red-50 transition-colors">
              Đăng xuất
            </button>
          </div>
        </aside>
      )}

      <main className="flex-1 overflow-auto">
        <header className="bg-white border-b border-slate-100 px-6 py-4 flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen((s) => !s)} className="p-2 rounded-lg hover:bg-slate-50 transition-colors text-slate-500">☰</button>
            <h2 className="font-black text-slate-800 text-lg" style={{ fontFamily: 'Baloo 2' }}>
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
                <div key={stat.label} className="bg-white rounded-2xl p-5" style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
                  <div className="text-3xl mb-2">{stat.icon}</div>
                  <div className="font-black text-2xl" style={{ color: stat.color, fontFamily: 'Baloo 2' }}>{stat.value}</div>
                  <div className="text-slate-500 text-sm font-semibold mt-1">{stat.label}</div>
                </div>
              ))}
            </div>
          )}

          {activeNav === 'Chủ đề' && (
            <div>
              <div className="bg-white rounded-2xl p-5 mb-4" style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
                <p className="font-bold text-slate-700 mb-3 text-sm">Thêm chủ đề mới</p>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input value={newTopicName} onChange={(e) => setNewTopicName(e.target.value)}
                    placeholder="Tên chủ đề" className="flex-1 px-3 py-2 rounded-xl border border-slate-200 text-sm" />
                  <input value={newTopicDesc} onChange={(e) => setNewTopicDesc(e.target.value)}
                    placeholder="Mô tả" className="flex-1 px-3 py-2 rounded-xl border border-slate-200 text-sm" />
                  <select value={newTopicCategory} onChange={(e) => setNewTopicCategory(e.target.value)}
                    className="px-3 py-2 rounded-xl border border-slate-200 text-sm">
                    <option value="Khoa học">Khoa học</option>
                    <option value="Xã hội">Xã hội</option>
                    <option value="Nghệ thuật">Nghệ thuật</option>
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
                    <div key={topic.id} className="bg-white rounded-2xl p-4 col-span-1 sm:col-span-2" style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.05)', border: '1.5px solid #6C5CE7' }}>
                      <p className="font-bold text-slate-700 mb-2 text-sm">Sửa chủ đề</p>
                      <div className="flex flex-col sm:flex-row gap-2 mb-2">
                        <input value={editName} onChange={(e) => setEditName(e.target.value)}
                          placeholder="Tên chủ đề" className="flex-1 px-3 py-2 rounded-xl border border-slate-200 text-sm" />
                        <input value={editDesc} onChange={(e) => setEditDesc(e.target.value)}
                          placeholder="Mô tả" className="flex-1 px-3 py-2 rounded-xl border border-slate-200 text-sm" />
                        <select value={editCategory} onChange={(e) => setEditCategory(e.target.value)}
                          className="px-3 py-2 rounded-xl border border-slate-200 text-sm">
                          <option value="Khoa học">Khoa học</option>
                          <option value="Xã hội">Xã hội</option>
                          <option value="Nghệ thuật">Nghệ thuật</option>
                        </select>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={handleSaveEditTopic} disabled={savingEdit}
                          className="px-4 py-2 rounded-xl font-bold text-sm text-white" style={{ background: '#6C5CE7' }}>
                          {savingEdit ? 'Đang lưu...' : 'Lưu'}
                        </button>
                        <button onClick={() => setEditingTopicId(null)}
                          className="px-4 py-2 rounded-xl font-bold text-sm text-slate-500 hover:bg-slate-50">
                          Hủy
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div key={topic.id} className="bg-white rounded-2xl p-4 flex items-center gap-4" style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
                      <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl" style={{ background: `${topic.shadow}` }}>
                        {topic.emoji}
                      </div>
                      <div className="flex-1">
                        <p className="font-bold text-slate-800">{topic.name}</p>
                        <p className="text-slate-500 text-xs font-semibold">{topic.questions} câu hỏi · {topic.category}</p>
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

          {activeNav === 'Câu hỏi' && (
            topics.length === 0 ? (
              <div className="bg-white rounded-2xl p-12 text-center" style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
                <span className="text-5xl">📚</span>
                <p className="text-slate-500 font-bold mt-4">Chưa có chủ đề nào.</p>
                <p className="text-slate-400 text-sm mt-1">Vào tab "Chủ đề" để tạo chủ đề trước, rồi quay lại đây thêm câu hỏi.</p>
                <button onClick={() => setActiveNav('Chủ đề')}
                  className="mt-4 px-4 py-2 rounded-xl font-bold text-sm text-white" style={{ background: '#6C5CE7' }}>
                  Sang tab Chủ đề
                </button>
              </div>
            ) : (
            <div>
              <div className="bg-white rounded-2xl p-5 mb-4" style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
                <p className="font-bold text-slate-700 mb-3 text-sm">Chọn chủ đề</p>
                <select value={selectedTopicId} onChange={(e) => setSelectedTopicId(e.target.value)}
                  className="px-3 py-2 rounded-xl border border-slate-200 text-sm mb-4 w-full sm:w-64">
                  {topics.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>

                <p className="font-bold text-slate-700 mb-2 text-sm">Thêm câu hỏi mới</p>
                <textarea value={qText} onChange={(e) => setQText(e.target.value)}
                  placeholder="Nội dung câu hỏi" className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm mb-2" rows={2} />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3">
                  {answers.map((a, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <input type="radio" checked={correctIdx === i} onChange={() => setCorrectIdx(i)} />
                      <input value={a} onChange={(e) => {
                        const next = [...answers];
                        next[i] = e.target.value;
                        setAnswers(next);
                      }} placeholder={`Đáp án ${String.fromCharCode(65 + i)}`}
                        className="flex-1 px-3 py-2 rounded-xl border border-slate-200 text-sm" />
                    </div>
                  ))}
                </div>
                <button onClick={handleAddQuestion} disabled={savingQuestion}
                  className="px-4 py-2 rounded-xl font-bold text-sm text-white" style={{ background: '#6C5CE7' }}>
                  {savingQuestion ? 'Đang lưu...' : '+ Thêm câu hỏi'}
                </button>
              </div>

              {loadingQuestions ? (
                <p className="text-slate-400 text-sm">Đang tải...</p>
              ) : (
                <div className="space-y-3">
                  {questions.map((q) => (
                    editingQuestionId === q.id ? (
                      <div key={q.id} className="bg-white rounded-2xl p-4" style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.05)', border: '1.5px solid #6C5CE7' }}>
                        <p className="font-bold text-slate-700 mb-2 text-sm">Sửa câu hỏi</p>
                        <textarea value={editQText} onChange={(e) => setEditQText(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm mb-2" rows={2} />
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3">
                          {editAnswers.map((a, i) => (
                            <div key={i} className="flex items-center gap-2">
                              <input type="radio" checked={editCorrectIdx === i} onChange={() => setEditCorrectIdx(i)} />
                              <input value={a} onChange={(e) => {
                                const next = [...editAnswers];
                                next[i] = e.target.value;
                                setEditAnswers(next);
                              }} placeholder={`Đáp án ${String.fromCharCode(65 + i)}`}
                                className="flex-1 px-3 py-2 rounded-xl border border-slate-200 text-sm" />
                            </div>
                          ))}
                        </div>
                        <div className="flex gap-2">
                          <button onClick={handleSaveEditQuestion} disabled={savingEditQuestion}
                            className="px-4 py-2 rounded-xl font-bold text-sm text-white" style={{ background: '#6C5CE7' }}>
                            {savingEditQuestion ? 'Đang lưu...' : 'Lưu'}
                          </button>
                          <button onClick={() => setEditingQuestionId(null)}
                            className="px-4 py-2 rounded-xl font-bold text-sm text-slate-500 hover:bg-slate-50">
                            Hủy
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div key={q.id} className="bg-white rounded-2xl p-4" style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
                        <div className="flex items-start gap-3">
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-slate-800 text-sm mb-2 leading-snug">{q.noiDungCauHoi}</p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                              {q.danhSachDapAn.map((a, i) => (
                                <div key={i} className="flex items-center gap-1.5 text-xs px-2 py-1.5 rounded-lg"
                                  style={{ background: a.laDapAnDung ? '#dcfce7' : '#f8fafc', color: a.laDapAnDung ? '#16a34a' : '#64748b' }}>
                                  <span className="font-bold">{String.fromCharCode(65 + i)}.</span>
                                  <span className="flex-1">{a.noiDung}</span>
                                  {a.laDapAnDung && <span>✓</span>}
                                </div>
                              ))}
                            </div>
                          </div>
                          <div className="flex flex-col gap-1 flex-shrink-0">
                            <button onClick={() => startEditQuestion(q)}
                              className="p-1.5 rounded-lg hover:bg-slate-50 text-slate-400 hover:text-slate-600 transition-colors text-sm">✏️</button>
                            <button onClick={() => handleDeleteQuestion(q.id)}
                              className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors text-sm">🗑️</button>
                          </div>
                        </div>
                      </div>
                    )
                  ))}
                </div>
              )}
            </div>
            )
          )}

          {activeNav === 'Người dùng' && (
            loadingUsers ? (
              <p className="text-slate-400 text-sm">Đang tải...</p>
            ) : users.length === 0 ? (
              <div className="bg-white rounded-2xl p-12 text-center" style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
                <span className="text-5xl">👥</span>
                <p className="text-slate-500 font-bold mt-4">Chưa có người dùng nào đăng ký.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {users.map((u) => (
                  <div key={u.id} className="bg-white rounded-2xl overflow-hidden" style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
                    <div className="p-4 flex items-center gap-4 cursor-pointer" onClick={() => toggleUserHistory(u.id)}>
                      <div className="w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold text-white flex-shrink-0"
                        style={{ background: u.vaiTro === 'ADMIN' ? '#FF6B6B' : '#6C5CE7' }}>
                        {u.hoTen?.[0]?.toUpperCase() || '?'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-slate-800">{u.hoTen}</p>
                          {u.vaiTro === 'ADMIN' && (
                            <span className="px-2 py-0.5 rounded-full text-xs font-bold" style={{ background: '#fee2e2', color: '#dc2626' }}>ADMIN</span>
                          )}
                        </div>
                        <p className="text-slate-500 text-xs font-semibold">@{u.username}</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="font-bold text-slate-800 text-sm">{u.tongLuotChoi} lượt chơi</p>
                        <p className="text-slate-400 text-xs">Cao nhất: {u.diemCaoNhat} điểm</p>
                      </div>
                      <span className="text-slate-400 text-sm ml-2">{expandedUserId === u.id ? '▲' : '▼'}</span>
                    </div>

                    {expandedUserId === u.id && (
                      <div className="border-t border-slate-100 p-4 bg-slate-50">
                        {loadingHistory ? (
                          <p className="text-slate-400 text-sm">Đang tải lịch sử...</p>
                        ) : userHistory.length === 0 ? (
                          <p className="text-slate-400 text-sm">Người dùng này chưa chơi lượt nào.</p>
                        ) : (
                          <div className="space-y-2">
                            {userHistory.map((h) => (
                              <div key={h.ketQuaId} className="flex items-center justify-between bg-white rounded-xl px-3 py-2 text-sm">
                                <span className="font-semibold text-slate-700">{h.tenChuDe}</span>
                                <span className="text-slate-400 text-xs">{h.soCauDaTraLoi} câu · {new Date(h.thoiGianLam).toLocaleString('vi-VN')}</span>
                                <span className="font-bold text-indigo-600">{h.diemSo} điểm</span>
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
              <p className="text-slate-400 text-sm">Đang tải...</p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                  { label: 'Người dùng', value: tongQuan.tongNguoiDung, icon: '👥', color: '#6C5CE7' },
                  { label: 'Chủ đề', value: tongQuan.tongChuDe, icon: '📚', color: '#00D9A5' },
                  { label: 'Câu hỏi', value: tongQuan.tongCauHoi, icon: '❓', color: '#FFC107' },
                  { label: 'Lượt chơi', value: tongQuan.tongLuotChoi, icon: '🎮', color: '#FF6B6B' },
                ].map((stat) => (
                  <div key={stat.label} className="bg-white rounded-2xl p-5" style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
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
