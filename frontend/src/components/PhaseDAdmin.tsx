import { validateQuestion } from '../validation/question';
import { useEffect, useState } from 'react';
import * as api from '../services/api';
import type { Topic } from '../data';
import AiQuestionGenerator from './AiQuestionGenerator';
type Kind = NonNullable<api.CauHoiAdmin['loaiCauHoi']>;
const kinds: Kind[] = ['TRAC_NGHIEM', 'DIEN_TU', 'SAP_XEP'];
const labels = { TRAC_NGHIEM: 'Trắc nghiệm A/B/C/D', DIEN_TU: 'Điền từ', SAP_XEP: 'Sắp xếp câu' };
const empty = (id: number, kind: Kind = 'TRAC_NGHIEM'): api.CauHoiAdmin => ({ noiDungCauHoi: '', loaiCauHoi: kind, giaiThich: '', chuDe: { id }, danhSachDapAn: Array.from({ length: kind === 'TRAC_NGHIEM' ? 4 : kind === 'DIEN_TU' ? 1 : 2 }, (_, i) => ({ noiDung: '', laDapAnDung: kind === 'DIEN_TU' || (kind === 'TRAC_NGHIEM' && i === 0), thuTu: i })) });
function Editor({ q, change }: { q: api.CauHoiAdmin; change: (q: api.CauHoiAdmin) => void }) {
  const kind = q.loaiCauHoi || 'TRAC_NGHIEM';
  return <div className="space-y-2">
    <select aria-label="Dạng câu hỏi" value={kind} onChange={e => change({ ...empty(q.chuDe.id, e.target.value as Kind), id: q.id, noiDungCauHoi: q.noiDungCauHoi, giaiThich: q.giaiThich })}>{kinds.map(k => <option key={k} value={k}>{labels[k]}</option>)}</select>
    <textarea aria-label="Nội dung câu hỏi" placeholder="Nội dung câu hỏi" value={q.noiDungCauHoi} onChange={e => change({ ...q, noiDungCauHoi: e.target.value })} />
    {kind === 'SAP_XEP' && <p>Nhập token theo thứ tự đúng từ trên xuống. Cho phép token lặp nội dung.</p>}
    {kind === 'DIEN_TU' && <p>Mỗi dòng là một đáp án được chấp nhận. Giữ nguyên dấu tiếng Việt và chữ Hán.</p>}
    {q.danhSachDapAn.map((a, i) => <div className="flex gap-2" key={i}>
      {kind === 'TRAC_NGHIEM' && <input aria-label={`Đáp án đúng ${i + 1}`} type="radio" checked={a.laDapAnDung} onChange={() => change({ ...q, danhSachDapAn: q.danhSachDapAn.map((v, n) => ({ ...v, laDapAnDung: i === n })) })} />}
      <span>{kind === 'TRAC_NGHIEM' ? String.fromCharCode(65 + i) : i + 1}</span>
      <input aria-label={`Đáp án/token ${i + 1}`} maxLength={500} value={a.noiDung} onChange={e => change({ ...q, danhSachDapAn: q.danhSachDapAn.map((v, n) => n === i ? { ...v, noiDung: e.target.value } : v) })} />
      {kind !== 'TRAC_NGHIEM' && <button onClick={() => change({ ...q, danhSachDapAn: q.danhSachDapAn.filter((_, n) => n !== i).map((v, n) => ({ ...v, thuTu: n })) })}>Bỏ</button>}
    </div>)}
    {kind !== 'TRAC_NGHIEM' && <button onClick={() => change({ ...q, danhSachDapAn: [...q.danhSachDapAn, { noiDung: '', laDapAnDung: kind === 'DIEN_TU', thuTu: q.danhSachDapAn.length }] })}>+ Đáp án/token</button>}
    <textarea aria-label="Giải thích" placeholder="Giải thích" value={q.giaiThich || ''} onChange={e => change({ ...q, giaiThich: e.target.value })} />
    <details><summary>Xem trước</summary><p>{q.noiDungCauHoi}</p>{kind === 'DIEN_TU' ? <input disabled placeholder="Người chơi nhập từ" /> : q.danhSachDapAn.map((a, i) => <button disabled key={i}>{kind === 'TRAC_NGHIEM' ? `${String.fromCharCode(65 + i)}. ` : ''}{a.noiDung}</button>)}<p>Đáp án: {q.danhSachDapAn.filter(a => kind === 'SAP_XEP' || a.laDapAnDung).map(a => a.noiDung).join(kind === 'SAP_XEP' ? ' ' : ' / ')}</p><p>{q.giaiThich}</p></details>
  </div>;
}
export default function PhaseDAdmin({ topics, onChanged }: { topics: Topic[]; onChanged: () => void }) {
  const [groups, setGroups] = useState<api.NhomMon[]>([]);
  const [group, setGroup] = useState<Omit<api.NhomMon, 'id'> & { id?: number }>({ ten: '', hienThi: true, thuTu: 0 });
  const [topicId, setTopicId] = useState(topics[0]?.id || '');
  const [config, setConfig] = useState<api.ChuDeDTO | null>(null);
  const [questions, setQuestions] = useState<api.CauHoiAdmin[]>([]);
  const [draft, setDraft] = useState(empty(Number(topicId)));
  const [preview, setPreview] = useState<api.CauHoiAdmin[] | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [message, setMessage] = useState(''); const [busy, setBusy] = useState(false);
  async function act(work: () => Promise<void>) { setBusy(true); setMessage(''); try { await work(); } catch (e) { setMessage(e instanceof Error ? e.message : 'Thao tác thất bại'); } finally { setBusy(false); } }
  async function loadGroups() { setGroups(await api.layNhomMon(true)); }
  async function loadQuestions() { setQuestions(await api.layCauHoiTheoChuDe(topicId)); }
  useEffect(() => { act(loadGroups); }, []);
  useEffect(() => { if (!topicId) return; let alive = true; setPreview(null); setWarnings([]); setDraft(empty(Number(topicId))); setConfig(null); act(async () => { const [c, qs] = await Promise.all([api.layChuDe(topicId), api.layCauHoiTheoChuDe(topicId)]); if (alive) { setConfig(c); setQuestions(qs); } }); return () => { alive = false; }; }, [topicId]);
  return <div className="phase-d space-y-6 text-white"><p role="status">{message}</p><fieldset disabled={busy} className="space-y-6">
    <section><h2>Quản lý nhóm môn</h2><input aria-label="Tên nhóm" placeholder="Tên nhóm" maxLength={50} value={group.ten} onChange={e => setGroup({ ...group, ten: e.target.value })} /><input aria-label="Thứ tự nhóm" type="number" min={0} value={group.thuTu} onChange={e => setGroup({ ...group, thuTu: Number(e.target.value) })} /><label><input type="checkbox" checked={group.hienThi} onChange={e => setGroup({ ...group, hienThi: e.target.checked })} /> Hiện nhóm</label><button onClick={() => act(async () => { if (!group.ten.trim() || group.ten.trim().toLowerCase() === 'tất cả' || group.thuTu < 0) throw new Error('Tên/thứ tự nhóm không hợp lệ'); await api.luuNhomMon(group); setGroup({ ten: '', hienThi: true, thuTu: 0 }); await loadGroups(); onChanged(); })}>Lưu nhóm</button><button onClick={() => setGroup({ ten: '', hienThi: true, thuTu: 0 })}>Nhóm mới</button>
    {groups.map(g => <div key={g.id}>{g.thuTu}. {g.ten} — {g.hienThi ? 'Hiện' : 'Ẩn'} <button onClick={() => setGroup(g)}>Sửa</button><button onClick={() => act(async () => { await api.luuNhomMon({ ...g, hienThi: !g.hienThi }); await loadGroups(); onChanged(); })}>Ẩn/hiện</button><button onClick={() => act(async () => { if (!confirm('Xóa nhóm này?')) return; await api.xoaNhomMon(g.id); await loadGroups(); })}>Xóa</button></div>)}</section>
    <label>Chủ đề <select value={topicId} onChange={e => setTopicId(e.target.value)}>{topics.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</select></label>
    {config && <section><h2>Cấu hình đề thi</h2><label>Nhóm <select value={config.nhomMon?.id || ''} onChange={e => setConfig({ ...config, nhomMon: { id: Number(e.target.value) } })}><option value="">Chọn nhóm</option>{groups.map(g => <option key={g.id} value={g.id}>{g.ten}</option>)}</select></label>
    {([['hienDapAnSauNop', 'Hiện đáp án và giải thích sau nộp (tắt: chỉ hiện điểm)'], ['choPhepXemDapAn', 'Cho xem đáp án từng câu khi luyện tập'], ['xaoTronCauHoi', 'Xáo trộn câu hỏi'], ['xaoTronLuaChon', 'Xáo trộn lựa chọn trắc nghiệm']] as const).map(([key, label]) => <label className="block" key={key}><input type="checkbox" checked={config[key] ?? (key === 'hienDapAnSauNop')} onChange={e => setConfig({ ...config, [key]: e.target.checked })} /> {label}</label>)}
    <button onClick={() => act(async () => { if (!config.nhomMon?.id) throw new Error('Chọn nhóm'); await api.capNhatChuDe(Number(topicId), config); onChanged(); setMessage('Đã lưu cấu hình'); })}>Lưu cấu hình</button></section>}
    <section><h2>{draft.id ? 'Sửa câu hỏi' : 'Tạo câu hỏi'}</h2><Editor q={draft} change={setDraft} /><button onClick={() => act(async () => { const error = validateQuestion(draft); if (error) throw new Error(error); if (draft.id) await api.capNhatCauHoi(draft.id, draft); else await api.themCauHoi(draft); setDraft(empty(Number(topicId))); await loadQuestions(); onChanged(); })}>Lưu câu hỏi</button><button onClick={() => setDraft(empty(Number(topicId)))}>Hủy / Câu mới</button>
    {questions.map(q => <div key={q.id}><strong>{labels[q.loaiCauHoi || 'TRAC_NGHIEM']}: </strong>{q.noiDungCauHoi}<button onClick={() => setDraft({ ...q, danhSachDapAn: [...q.danhSachDapAn].sort((a, b) => (a.thuTu || 0) - (b.thuTu || 0)) })}>Sửa / Xem trước</button><button onClick={() => act(async () => { if (!confirm('Xóa câu hỏi?')) return; await api.xoaCauHoi(q.id!); await loadQuestions(); onChanged(); })}>Xóa</button></div>)}</section>
    <section><h2>Import Excel / Word / PDF</h2><p>Tối đa 10 MB. PDF cần có lớp chữ; không dùng OCR. Word/PDF: KEY: nội dung, các câu cách nhau bằng dòng ---. Tải mẫu để biết định dạng.</p>
    {kinds.map(k => <div key={k}>{labels[k]} {['xlsx', 'docx'].map(f => <button key={f} onClick={() => act(async () => { await api.taiMauImport(f, k); })}>Mẫu {f}</button>)}</div>)}
    <input aria-label="File nhập câu hỏi" type="file" accept=".xls,.xlsx,.docx,.pdf" onChange={e => { const file = e.target.files?.[0]; if (!file) return; setPreview(null); act(async () => { if (!topicId || file.size > 10 * 1024 * 1024 || !/\.(xlsx?|docx|pdf)$/i.test(file.name)) throw new Error('Chọn chủ đề và file hợp lệ'); const result = await api.xemTruocImport(file, Number(topicId)); setPreview(result.questions); setWarnings(result.warnings); }); e.target.value = ''; }} />
    {warnings.map((w, i) => <p role="alert" key={i}>{w}</p>)}
    {preview && <><p>{preview.length} câu trong bản xem trước; chưa lưu. Sửa hoặc bỏ câu trước khi xác nhận.</p>{preview.map((q, i) => <div key={i}><Editor q={q} change={v => setPreview(preview.map((old, n) => n === i ? v : old))} /><p>{validateQuestion(q)}</p><button onClick={() => setPreview(preview.filter((_, n) => n !== i))}>Bỏ câu</button></div>)}<button disabled={!preview.length || preview.some(q => validateQuestion(q))} onClick={() => act(async () => { const count = await api.xacNhanImport(preview); setPreview(null); setWarnings([]); await loadQuestions(); onChanged(); setMessage(`Đã lưu ${count} câu`); })}>Xác nhận lưu {preview.length} câu</button></>}
    </section>
    {topicId && <section><h2>Tạo câu hỏi bằng AI</h2><AiQuestionGenerator key={topicId} chuDeId={Number(topicId)} defaultTopicName={topics.find(t => t.id === topicId)?.name} onSuccess={() => { loadQuestions().catch(e => setMessage(e.message)); onChanged(); }} /></section>}
    </fieldset></div>;
}
