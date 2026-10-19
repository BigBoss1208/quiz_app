import { useEffect, useState } from 'react';
import { xemBaiLamAdmin, type BaiLamAdminDTO } from '../services/api';

const statuses = { DUNG: 'Câu đúng', SAI: 'Câu sai', CHUA_TRA_LOI: 'Chưa trả lời' };
export default function AdminSubmissionScreen({ id, onBack }: { id: number; onBack: () => void }) {
  const [data, setData] = useState<BaiLamAdminDTO | null>(null);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('');
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let alive = true; setData(null); setError('');
    xemBaiLamAdmin(id).then(v => { if (alive) setData(v); }).catch(e => { if (alive) setError(e.message); });
    return () => { alive = false; };
  }, [id, retry]);
  const review = data?.baiLam;
  const questions = review?.danhSachCauHoi || [];
  const filtered = questions.filter(q => !filter || q.ketQua === filter);
  return <div className="admin-submission">
    <header><button onClick={onBack}>← Danh sách kết quả</button><h1>Chi tiết bài làm #{id}</h1><span>Quản trị viên</span></header>
    <main>
      {error && <div role="alert" className="submission-card"><p>{error}</p><button onClick={() => setRetry(v => v + 1)}>Thử lại</button></div>}
      {!data && !error && <p role="status">Đang tải bài làm…</p>}
      {data && <>
        <section className="submission-card"><h2>{data.tenChuDe}</h2><dl className="submission-meta">
          <div><dt>Người làm bài</dt><dd>{data.hoTen || data.tenNguoiChoi}{data.username && <small>@{data.username}</small>}{data.userId != null && <small>ID người dùng: {data.userId}</small>}</dd></div>
          <div><dt>Thời gian nộp (giờ máy chủ)</dt><dd>{data.thoiGianNop?.replace('T', ' ').slice(0, 19) || 'Không có dữ liệu'}</dd></div>
          <div><dt>Điểm số</dt><dd className="submission-score">{data.diemSo}</dd></div>
          {review && <div><dt>Thời gian làm bài</dt><dd>{review.thoiGianLam} giây</dd></div>}
        </dl></section>
        {!data.coChiTiet ? <section className="submission-card" role="status"><h2>Bài làm cũ chưa có dữ liệu chi tiết</h2><p>Hệ thống trước đây chỉ lưu điểm và thông tin kết quả. Không thể xác định các câu hỏi hoặc đáp án đã chọn của bài này.</p></section> : <>
          <section className="submission-card"><h2>Tổng quan · {review?.tongSoCauHoi} câu</h2><div className="submission-filters" role="group" aria-label="Lọc kết quả từng câu">
            {[['', `Tất cả (${questions.length})`], ['DUNG', `Câu đúng (${review?.soCauDung})`], ['SAI', `Câu sai (${review?.soCauSai})`], ['CHUA_TRA_LOI', `Chưa trả lời (${review?.soCauChuaTraLoi})`]].map(([key, text]) => <button key={key} aria-pressed={filter === key} onClick={() => setFilter(key)}>{text}</button>)}
          </div><p>Bản lưu tại thời điểm nộp; thay đổi câu hỏi sau đó không sửa bài làm này.</p></section>
          {!filtered.length && <p role="status">Không có câu hỏi thuộc bộ lọc này.</p>}
          {filtered.map(q => <article className="submission-card" key={q.cauHoiId}>
            <div className="submission-question-heading"><h2>Câu {questions.indexOf(q) + 1}</h2><span className={`submission-status ${q.ketQua}`}>{statuses[q.ketQua as keyof typeof statuses] || q.ketQua}</span><span>{q.loaiCauHoi === 'DIEN_TU' ? 'Điền từ' : q.loaiCauHoi === 'SAP_XEP' ? 'Sắp xếp câu' : 'Trắc nghiệm'}</span></div>
            <h3>{q.noiDungCauHoi}</h3>{q.hinhAnh && <img src={q.hinhAnh} alt="Hình minh họa câu hỏi" />}
            {q.loaiCauHoi === 'TRAC_NGHIEM' && <ul className="submission-options">{q.danhSachDapAn.map(a => <li key={a.id} className={(q.dapAnDungIds ?? [q.dapAnDungId]).includes(a.id) ? 'correct' : (q.dapAnDaChonIds ?? [q.dapAnDaChonId]).includes(a.id) ? 'selected-wrong' : ''}><span>{a.noiDung}</span>{(q.dapAnDaChonIds ?? [q.dapAnDaChonId]).includes(a.id) && <b>Đã chọn</b>}{(q.dapAnDungIds ?? [q.dapAnDungId]).includes(a.id) && <b>Đáp án đúng</b>}</li>)}</ul>}
            <div className="submission-answer-grid"><div><h4>Người dùng trả lời</h4><p>{q.ketQua === 'CHUA_TRA_LOI' ? 'Chưa trả lời' : q.cauTraLoiText || q.danhSachDapAn.find(a => (q.dapAnDaChonIds ?? [q.dapAnDaChonId]).includes(a.id))?.noiDung || 'Không có nội dung hợp lệ'}</p></div><div><h4>Đáp án đúng / được chấp nhận</h4><p>{q.dapAnDungText || q.danhSachDapAn.find(a => (q.dapAnDungIds ?? [q.dapAnDungId]).includes(a.id))?.noiDung}</p></div></div>
            {q.giaiThich && <div className="submission-explanation"><h4>Giải thích</h4><p>{q.giaiThich}</p></div>}
          </article>)}
        </>}
      </>}
    </main>
  </div>;
}
