// Lớp gọi API backend Spring Boot
// Local: mặc định http://localhost:8080/api
// Production: lấy từ biến môi trường VITE_API_URL

const BASE_URL =
  import.meta.env.VITE_API_URL || 'http://localhost:8080/api';

export interface AuthUser {
  token: string;
  id: number;
  username: string;
  hoTen: string;
  vaiTro: 'ADMIN' | 'USER';
}

const AUTH_KEY = 'quiz_auth';

export function layAuth(): AuthUser | null {
  const raw = localStorage.getItem(AUTH_KEY);
  return raw ? JSON.parse(raw) : null;
}

export function luuAuth(user: AuthUser) {
  localStorage.setItem(AUTH_KEY, JSON.stringify(user));
}

export function xoaAuth() {
  localStorage.removeItem(AUTH_KEY);
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const auth = layAuth();

  const res = await fetch(`${BASE_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(auth ? { Authorization: `Bearer ${auth.token}` } : {}),
    },
    ...options,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(text || `API lỗi ${res.status}: ${path}`);
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
  soCauHoi: number;
  luotChoi: number;
  topDiemCao: {
    tenNguoiChoi: string;
    diemSo: number;
  }[];
}

export interface ChuDeDTO {
  id: number;
  tenChuDe: string;
  hinhAnh: string | null;
  moTa: string | null;
  doKho: string | null;
  danhMuc: string | null;
}

export interface DapAnChoiDTO {
  id: number;
  noiDung: string;
}

export interface CauHoiChoiDTO {
  id: number;
  noiDungCauHoi: string;
  hinhAnh: string | null;
  danhSachDapAn: DapAnChoiDTO[];
}

export interface TraLoiResponseDTO {
  dung: boolean;
  dapAnDungId: number;
  daHetCauHoi: boolean;
}

// ===== Kiểu dữ liệu Admin CRUD câu hỏi =====

export interface DapAnAdmin {
  id?: number;
  noiDung: string;
  laDapAnDung: boolean;
}

export interface CauHoiAdmin {
  id?: number;
  noiDungCauHoi: string;
  hinhAnh?: string | null;
  thuTu?: number;
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
  request<ChuDeThongKeDTO[]>('/chude/thongke');

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
  const res = await fetch(`${BASE_URL}/cauhoi/template-excel`, {
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

  const res = await fetch(`${BASE_URL}/cauhoi/import-excel`, {
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

export const luuKetQua = (data: {
  chuDeId: number;
  tenNguoiChoi: string;
  userId?: number | null;
  diemSo: number;
  soCauDaTraLoi: number;
}) =>
  request('/choi/ketqua', {
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