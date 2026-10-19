// Lớp gọi API backend Spring Boot
// Local: mặc định http://localhost:8080/api
// Production: lấy từ biến môi trường VITE_API_URL

const BASE_URL =
  import.meta.env.VITE_API_URL || (import.meta.env.PROD ? 'https://quiz-app-10-kln9.onrender.com/api' : 'http://localhost:8080/api');

export interface AuthUser {
  token: string;
  id: number;
  username: string;
  hoTen: string;
  vaiTro: 'ADMIN' | 'USER';
}

const AUTH_KEY = 'quiz_auth';

export interface NhomMon { id: number; ten: string; hienThi: boolean; thuTu: number }
export const layNhomMon = (admin = false) => request<NhomMon[]>(admin ? '/admin/nhom-mon' : '/nhom-mon');
export const luuNhomMon = (g: Omit<NhomMon, 'id'> & { id?: number }) => request<NhomMon>(`/admin/nhom-mon${g.id ? '/' + g.id : ''}`, { method: g.id ? 'PUT' : 'POST', body: JSON.stringify(g) });
export const xoaNhomMon = (id: number) => request<void>(`/admin/nhom-mon/${id}`, { method: 'DELETE' });
export const xacNhanImport = (questions: CauHoiAdmin[]) => request<number>('/admin/import/confirm', { method: 'POST', body: JSON.stringify(questions) });
export async function xemTruocImport(file: File, chuDeId: number): Promise<{ questions: CauHoiAdmin[]; warnings: string[] }> {
  const form = new FormData(); form.append('file', file); form.append('chuDeId', String(chuDeId));
  const res = await apiFetch(`${BASE_URL}/admin/import/preview`, { method: 'POST', headers: { Authorization: `Bearer ${layAuth()?.token || ''}` }, body: form });
  if (!res.ok) throw new Error(await res.text()); return res.json();
}
export async function taiMauImport(format: string, type: string) {
  const res = await apiFetch(`${BASE_URL}/admin/import/template?format=${format}&type=${type}`, { headers: { Authorization: `Bearer ${layAuth()?.token || ''}` } });
  if (!res.ok) throw new Error(await res.text());
  const url = URL.createObjectURL(await res.blob()); const a = document.createElement('a'); a.href = url; a.download = `questions-${type}.${format}`; a.click(); URL.revokeObjectURL(url);
}

export function layAuth(): AuthUser | null {
  try {
    const raw = localStorage.getItem(AUTH_KEY);
    if (!raw) return null;
    const user = JSON.parse(raw);
    if (!user || typeof user.token !== 'string' || typeof user.id !== 'number' || !['ADMIN','USER'].includes(user.vaiTro)) return null;
    const payload = JSON.parse(atob(user.token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    if (typeof payload.exp !== 'number' || payload.exp * 1000 <= Date.now()) {
      localStorage.removeItem(AUTH_KEY);
      return null;
    }
    // This expiry check is UX only; Backend still verifies the signature and role.
    return user;
  } catch { return null; }
}

export function luuAuth(user: AuthUser) {
  localStorage.setItem(AUTH_KEY, JSON.stringify(user));
}

export function xoaAuth() {
  localStorage.removeItem(AUTH_KEY);
}

async function apiFetch(url: string, options?: RequestInit): Promise<Response> {
  const auth = layAuth();
  const res = await fetch(url, options);
  if (!url.includes('/auth/') && (res.status === 401 || (res.status === 403 && (!auth || auth.vaiTro === 'ADMIN')))) {
    // Never replay a failed write automatically. Preserve the role checks on the server.
    xoaAuth();
    window.dispatchEvent(new Event('quiz-session-expired'));
    throw new Error('Phiên đăng nhập đã hết hạn hoặc không còn hợp lệ. Vui lòng đăng nhập lại.');
  }
  return res;
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const auth = layAuth();

  const res = await apiFetch(`${BASE_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(auth ? { Authorization: `Bearer ${auth.token}` } : {}),
    },
    ...options,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    let message = text;
    if (text) {
      try {
        const body = JSON.parse(text) as { error?: string; message?: string };
        message = body.error || body.message || text;
      } catch {
        message = text;
      }
    }
    throw new Error(message || `API lỗi ${res.status}: ${path}`);
  }

  if (res.status === 204) {
    return undefined as unknown as T;
  }

  return res.json();
}

// ===== Đăng nhập / Đăng ký =====

export const dangNhap = (username: string, matKhau: string) =>
  request<AuthUser>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, matKhau }),
  });

export const dangKy = (
  username: string,
  matKhau: string,
  hoTen: string
) =>
  request<AuthUser>('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ username, matKhau, hoTen }),
  });

// ===== Kiểu dữ liệu thô từ backend =====

export interface ChuDeThongKeDTO {
  id: number;
  tenChuDe: string;
  hinhAnh: string | null;
  moTa: string | null;
  doKho: string | null; // "DE" | "TRUNG_BINH" | "KHO"
  danhMuc: string | null; // "Khoa học" | "Xã hội" | "Nghệ thuật" ...
  choPhepXemDapAn?: boolean;
  soCauHoi: number;
  luotChoi: number;
  topDiemCao: {
    tenNguoiChoi: string;
    diemSo: number;
  }[];
}

export interface ChuDeDTO {
  nhomMon?: { id: number };
  hienDapAnSauNop?: boolean;
  xaoTronCauHoi?: boolean;
  xaoTronLuaChon?: boolean;
  id: number;
  tenChuDe: string;
  hinhAnh: string | null;
  moTa: string | null;
  doKho: string | null;
  danhMuc: string | null;
  choPhepXemDapAn?: boolean;
}

export interface DapAnChoiDTO {
  id: number;
  noiDung: string;
}

export interface CauHoiChoiDTO {
  id: number;
  noiDungCauHoi: string;
  hinhAnh: string | null;
  loaiCauHoi?: 'TRAC_NGHIEM' | 'DIEN_TU' | 'SAP_XEP';
  nhieuDapAn?: boolean;
  danhSachDapAn: DapAnChoiDTO[];
}

export interface TraLoiResponseDTO {
  dung: boolean;
  dapAnDungId: number;
  daHetCauHoi: boolean;
}

export interface CauTraLoiNopBaiDTO {
  cauHoiId: number;
  dapAnId?: number | null;
  dapAnIds?: number[] | null;
  cauTraLoiText?: string | null;
  thuTuTokenIds?: number[] | null;
  thoiGianTraLoi: number;
}

export interface CauHoiReviewDTO {
  cauHoiId: number;
  noiDungCauHoi: string;
  hinhAnh: string | null;
  loaiCauHoi?: 'TRAC_NGHIEM' | 'DIEN_TU' | 'SAP_XEP';
  nhieuDapAn?: boolean;
  danhSachDapAn: DapAnChoiDTO[];
  dapAnDaChonId: number | null;
  dapAnDungId: number | null;
  dapAnDungIds?: number[] | null;
  dapAnDaChonIds?: number[] | null;
  cauTraLoiText?: string | null;
  dapAnDungText?: string | null;
  thuTuTokenIdsDaChon?: number[] | null;
  thuTuTokenIdsDung?: number[] | null;
  ketQua: 'DUNG' | 'SAI' | 'CHUA_TRA_LOI';
  giaiThich: string | null;
}

export interface NopBaiResponseDTO {
  ketQuaId: number;
  diemSo: number;
  tongSoCauHoi: number;
  soCauDung: number;
  soCauSai: number;
  soCauChuaTraLoi: number;
  thoiGianLam: number;
  danhSachCauHoi: CauHoiReviewDTO[];
}

// ===== Kiểu dữ liệu Admin CRUD câu hỏi =====

export interface DapAnAdmin {
  thuTu?: number;
  id?: number;
  noiDung: string;
  laDapAnDung: boolean;
}

export interface CauHoiAdmin {
  loaiCauHoi?: "TRAC_NGHIEM" | "DIEN_TU" | "SAP_XEP";
  giaiThich?: string | null;
  id?: number;
  noiDungCauHoi: string;
  hinhAnh?: string | null;
  thuTu?: number | null;
  chuDe: {
    id: number;
  };
  danhSachDapAn: DapAnAdmin[];
}

export interface CauHoiCreateDTO {
  noiDung: string;
  dapAnA: string;
  dapAnB: string;
  dapAnC: string;
  dapAnD: string;
  dapAnDung: string; // "A" | "B" | "C" | "D"
}

export interface AiGenerateRequestDTO {
  topic: string;
  count: number;
  doKho?: string;
}

export interface ImportExcelResultDTO {
  soCauThanhCong: number;
  danhSachLoi: string[];
}

// ===== Chủ đề =====

export const layDanhSachChuDeThongKe = () =>
  request<ChuDeThongKeDTO[]>('/chude/thongke', {
    signal: AbortSignal.timeout(20_000),
  });

export const layChuDe = (id: number | string) =>
  request<ChuDeDTO>(`/chude/${id}`);

export const themChuDe = (chuDe: Partial<ChuDeDTO>) =>
  request<ChuDeDTO>('/chude', {
    method: 'POST',
    body: JSON.stringify(chuDe),
  });

export const capNhatChuDe = (
  id: number,
  chuDe: Partial<ChuDeDTO>
) =>
  request<ChuDeDTO>(`/chude/${id}`, {
    method: 'PUT',
    body: JSON.stringify(chuDe),
  });

export const xoaChuDe = (id: number) =>
  request<void>(`/chude/${id}`, {
    method: 'DELETE',
  });

// ===== Câu hỏi (Admin) =====

export const layCauHoiTheoChuDe = (
  chuDeId: number | string
) =>
  request<CauHoiAdmin[]>(
    `/cauhoi/chude/${chuDeId}`
  );

export const themCauHoi = (cauHoi: CauHoiAdmin) =>
  request<CauHoiAdmin>('/cauhoi', {
    method: 'POST',
    body: JSON.stringify(cauHoi),
  });

export const capNhatCauHoi = (
  id: number,
  cauHoi: CauHoiAdmin
) =>
  request<CauHoiAdmin>(`/cauhoi/${id}`, {
    method: 'PUT',
    body: JSON.stringify(cauHoi),
  });

export const xoaCauHoi = (id: number) =>
  request<void>(`/cauhoi/${id}`, {
    method: 'DELETE',
  });

// ===== Excel & AI Câu hỏi =====

export const taiFileMauExcel = async () => {
  const auth = layAuth();
  const res = await apiFetch(`${BASE_URL}/cauhoi/template-excel`, {
    headers: {
      ...(auth ? { Authorization: `Bearer ${auth.token}` } : {}),
    },
  });

  if (!res.ok) {
    throw new Error('Không thể tải file mẫu Excel từ máy chủ.');
  }

  const blob = await res.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'CauHoi_Template.xlsx';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
};

export const importCauHoiExcel = async (
  chuDeId: number,
  file: File
): Promise<ImportExcelResultDTO> => {
  const auth = layAuth();
  const formData = new FormData();
  formData.append('file', file);
  formData.append('chuDeId', String(chuDeId));

  const res = await apiFetch(`${BASE_URL}/cauhoi/import-excel`, {
    method: 'POST',
    headers: {
      ...(auth ? { Authorization: `Bearer ${auth.token}` } : {}),
    },
    body: formData,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(text || `Upload file thất bại (Mã lỗi ${res.status}).`);
  }

  return res.json();
};

export const taoCauHoiBangAi = (
  topic: string,
  count: number,
  doKho: string = 'Cơ bản'
) =>
  request<CauHoiCreateDTO[]>('/cauhoi/generate-ai', {
    method: 'POST',
    body: JSON.stringify({ topic, count, doKho }),
  });

export const luuHangLoatCauHoi = (
  chuDeId: number,
  danhSach: CauHoiCreateDTO[]
) =>
  request<number>(`/cauhoi/bulk?chuDeId=${chuDeId}`, {
    method: 'POST',
    body: JSON.stringify(danhSach),
  });

// ===== Chơi Quiz =====

export const layCauHoiDeChoi = (
  chuDeId: number | string
) =>
  request<CauHoiChoiDTO[]>(
    `/choi/chude/${chuDeId}/cauhoi`
  );

export const guiDapAn = (
  cauHoiId: number,
  dapAnId: number
) =>
  request<TraLoiResponseDTO>('/choi/traloi', {
    method: 'POST',
    body: JSON.stringify({
      cauHoiId,
      dapAnId,
    }),
  });

export const xemDapAnLuyenTap = (id: number, answer: CauTraLoiNopBaiDTO) => request<{ dung: boolean; dapAnDungText: string; giaiThich: string | null }>(`/choi/luyentap/${id}`, { method: 'POST', body: JSON.stringify(answer) });

export const nopBai = (data: {
  chuDeId: number;
  tenNguoiChoi: string;
  userId?: number | null;
  thoiGianLam: number;
  danhSachTraLoi: CauTraLoiNopBaiDTO[];
}) =>
  request<NopBaiResponseDTO>('/choi/nopbai', {
    method: 'POST',
    body: JSON.stringify(data),
  });

// ===== Admin: Người dùng =====

export interface NguoiDungAdminDTO {
  id: number;
  username: string;
  hoTen: string;
  vaiTro: 'ADMIN' | 'USER';
  tongLuotChoi: number;
  tongDiem: number;
  diemCaoNhat: number;
}

export interface LichSuChoiDTO {
  ketQuaId: number;
  tenChuDe: string;
  diemSo: number;
  soCauDaTraLoi: number;
  thoiGianLam: string;
}

// ===== Admin: Thống kê tổng quan =====

export interface ThongKeTongQuanDTO {
  tongNguoiDung: number;
  tongChuDe: number;
  tongCauHoi: number;
  tongLuotChoi: number;
}

export const layDanhSachNguoiDung = () =>
  request<NguoiDungAdminDTO[]>(
    '/admin/nguoidung'
  );

export const layLichSuChoiCuaNguoiDung = (
  userId: number
) =>
  request<LichSuChoiDTO[]>(
    `/admin/nguoidung/${userId}/lichsu`
  );

export const layThongKeTongQuan = () =>
  request<ThongKeTongQuanDTO>(
    '/admin/thongke'
  );

// ===== Chatbot AI =====

export interface ChatResponseDTO {
  reply: string;
  source: 'SEEKAI' | 'KNOWLEDGE_BASE';
  notice?: string | null;
}

export interface ChatQuestionContext {
  question: string;
  options: string[];
  selectedAnswer: string;
  correctAnswer: string;
  outcome: string;
  explanation: string | null;
}

export const layTrangThaiChat = () =>
  request<{ seekAiConfigured: boolean }>('/chat/status');

export const guiTinNhanChat = async (
  message: string,
  questionContext?: ChatQuestionContext,
): Promise<ChatResponseDTO> => {
  const data = await request<ChatResponseDTO>('/chat', {
    method: 'POST',
    body: JSON.stringify({ message, questionContext }),
  });
  return data;
};

export interface BaiLamAdminDTO {
  ketQuaId: number; userId: number | null; tenNguoiChoi: string; username: string | null; hoTen: string | null;
  tenChuDe: string; thoiGianNop: string; diemSo: number; coChiTiet: boolean; baiLam: NopBaiResponseDTO | null;
}
export const xemBaiLamAdmin = (id: number) => request<BaiLamAdminDTO>(`/admin/ketqua/${id}/bai-lam`);
