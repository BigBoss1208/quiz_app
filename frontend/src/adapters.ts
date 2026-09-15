// Chuyển dữ liệu backend (ChuDeThongKeDTO...) sang đúng "shape" mà UI (Figma) đang cần.
// Backend chưa lưu emoji/gradient/màu/category — nên gán theo bảng màu cố định dựa trên vị trí,
// còn lại (tên, số câu hỏi, lượt chơi, top điểm) đều lấy dữ liệu THẬT từ server.

import type { Topic, Question, Player } from '../data';
import type { ChuDeThongKeDTO, CauHoiChoiDTO } from '../services/api';

const PALETTE = [
  { emoji: '🔢', gradient: 'linear-gradient(135deg, #6C5CE7, #a29bfe)', shadow: 'rgba(108,92,231,0.4)' },
  { emoji: '⚗️', gradient: 'linear-gradient(135deg, #FF6B6B, #fd79a8)', shadow: 'rgba(255,107,107,0.4)' },
  { emoji: '🗺️', gradient: 'linear-gradient(135deg, #00D9A5, #00b894)', shadow: 'rgba(0,217,165,0.4)' },
  { emoji: '🔭', gradient: 'linear-gradient(135deg, #74B9FF, #0984e3)', shadow: 'rgba(116,185,255,0.4)' },
  { emoji: '📜', gradient: 'linear-gradient(135deg, #FFC107, #e17055)', shadow: 'rgba(255,193,7,0.4)' },
  { emoji: '🧬', gradient: 'linear-gradient(135deg, #55efc4, #00D9A5)', shadow: 'rgba(85,239,196,0.4)' },
];

export function mapChuDeToTopic(dto: ChuDeThongKeDTO, index: number): Topic {
  const style = PALETTE[index % PALETTE.length];
  return {
    id: String(dto.id),
    emoji: style.emoji,
    name: dto.tenChuDe,
    questions: dto.soCauHoi,
    // Chưa có tiến độ hoàn thành theo user thật ở backend — dùng lượt chơi làm chỉ số tạm thời
    completion: Math.min(dto.luotChoi * 5, 100),
    gradient: style.gradient,
    shadow: style.shadow,
    category: dto.danhMuc || 'Khoa học',
  };
}

// Question mở rộng: giữ thêm id đáp án thật của backend để gửi lên /api/choi/traloi
export interface QuestionWithIds extends Question {
  backendId: number;
  answerIds: number[];
}

export function mapCauHoiToQuestion(dto: CauHoiChoiDTO, index: number): QuestionWithIds {
  return {
    id: index,
    backendId: dto.id,
    text: dto.noiDungCauHoi,
    image: dto.hinhAnh || undefined,
    answers: dto.danhSachDapAn.map((a) => a.noiDung),
    answerIds: dto.danhSachDapAn.map((a) => a.id),
    correct: -1, // không biết trước — server mới biết đáp án đúng
  };
}

export function mapTopDiemToPlayers(top: { tenNguoiChoi: string; diemSo: number }[]): Player[] {
  const avatars = ['🦊', '🐼', '🦁', '🐯', '🐸', '🦋', '🦅', '🦚'];
  return top.map((t, i) => ({
    id: i + 1,
    name: t.tenNguoiChoi,
    avatar: avatars[i % avatars.length],
    score: t.diemSo,
    rank: i + 1,
    rankChange: 0,
    medals: i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : '',
  }));
}
