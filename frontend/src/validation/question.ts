import type { CauHoiAdmin } from '../services/api';
export function validateQuestion(q: CauHoiAdmin): string {
  const kind = q.loaiCauHoi || 'TRAC_NGHIEM';
  if (!['TRAC_NGHIEM', 'DIEN_TU', 'SAP_XEP'].includes(kind)) return 'Dạng câu hỏi không hợp lệ';
  if (!q.chuDe.id || !q.noiDungCauHoi.trim()) return 'Chọn chủ đề và nhập câu hỏi';
  if (!q.danhSachDapAn.length || q.danhSachDapAn.length > 100 || q.danhSachDapAn.some(a => !a.noiDung.trim() || a.noiDung.length > 500)) return 'Cần 1–100 đáp án/token, mỗi mục 1–500 ký tự';
  if (kind === 'TRAC_NGHIEM' && (q.danhSachDapAn.length !== 4 || !q.danhSachDapAn.some(a => a.laDapAnDung))) return 'Cần 4 lựa chọn và ít nhất 1 đáp án đúng';
  if (kind === 'SAP_XEP' && (q.danhSachDapAn.length < 2 || new Set(q.danhSachDapAn.map(a => a.thuTu)).size !== q.danhSachDapAn.length || q.danhSachDapAn.some(a => a.thuTu === undefined || a.thuTu < 0 || a.thuTu >= q.danhSachDapAn.length || !Number.isInteger(a.thuTu)))) return 'Cần ít nhất 2 token có thứ tự liên tục từ 0';
  if (kind === 'DIEN_TU' && q.danhSachDapAn.some(a => !a.laDapAnDung)) return 'Mọi đáp án điền từ phải được chấp nhận';
  if (q.thuTu != null && (!Number.isInteger(q.thuTu) || q.thuTu < 0)) return 'Thứ tự không hợp lệ';
  return '';
}
