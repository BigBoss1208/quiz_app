export type Screen = 'home' | 'quiz' | 'result' | 'leaderboard' | 'admin';

export interface Topic {
  id: string;
  emoji: string;
  name: string;
  questions: number;
  completion: number;
  gradient: string;
  shadow: string;
  category: string;
}

export interface Question {
  id: number;
  text: string;
  image?: string;
  answers: string[];
  correct: number;
}

export interface Player {
  id: number;
  name: string;
  avatar: string;
  score: number;
  rank: number;
  rankChange: number;
  medals: string;
}

// Tên người chơi lưu tạm ở trình duyệt (chưa có hệ thống đăng nhập)
export function layTenNguoiChoi(): string {
  let name = localStorage.getItem('quiz_player_name');
  if (!name) {
    name = window.prompt('Nhập tên của bạn để lưu điểm:', 'Khách') || 'Khách';
    localStorage.setItem('quiz_player_name', name);
  }
  return name;
}
