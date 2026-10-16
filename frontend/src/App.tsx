
import { useState, useEffect } from 'react';
import type { Topic } from './data';
import {
  layDanhSachChuDeThongKe,
  layAuth,
  xoaAuth,
  type AuthUser,
  type NopBaiResponseDTO,
} from './services/api';
import { mapChuDeToTopic } from './adapters';

import HomeScreen from './screens/HomeScreen';
import QuizScreen from './screens/QuizScreen';
import ResultScreen from './screens/ResultScreen';
import LeaderboardScreen from './screens/LeaderboardScreen';
import AdminScreen from './screens/AdminScreen';
import LoginScreen from './screens/LoginScreen';

type Screen =
  | 'home'
  | 'quiz'
  | 'result'
  | 'leaderboard'
  | 'admin'
  | 'login';

export default function App() {
  const [screen, setScreen] = useState<Screen>('home');

  // Trang sẽ chuyển đến sau khi đăng nhập
  const [afterLoginGoTo, setAfterLoginGoTo] =
    useState<Screen>('home');

  // Danh sách chủ đề
  const [topics, setTopics] = useState<Topic[]>([]);
  const [loadingTopics, setLoadingTopics] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Người dùng hiện tại
  const [currentUser, setCurrentUser] =
    useState<AuthUser | null>(() => layAuth());

  // Dữ liệu làm bài
  const [selectedTopic, setSelectedTopic] =
    useState<Topic | null>(null);

  const [lastResult, setLastResult] =
    useState<NopBaiResponseDTO | null>(null);

  // Hiệu ứng chúc mừng
  const [celebrate, setCelebrate] = useState(false);

  // Điểm kinh nghiệm và chuỗi hoàn thành
  const [xp, setXp] = useState(0);
  const [streak, setStreak] = useState(0);

  // Tải danh sách chủ đề từ Backend
  const activeTopicKey = `quiz_active_topic_${currentUser?.id ?? 'guest'}`;
  const loadTopics = () => {
    // Keep the active Admin editor mounted during background refresh.
    if (topics.length === 0) setLoadingTopics(true);
    setLoadError(null);

    layDanhSachChuDeThongKe()
      .then((data) => {
        const loaded = data.map(mapChuDeToTopic);
        setTopics(loaded);
        if (!selectedTopic && screen === 'home') {
          try {
            const id = sessionStorage.getItem(activeTopicKey);
            const active = loaded.find(t => t.id === id);
            if (active) { setSelectedTopic(active); setScreen('quiz'); }
          } catch { /* Storage can be unavailable in private browsing. */ }
        }
      })
      .catch(() => {
        setLoadError(
          'Không tải được danh sách chủ đề. Kiểm tra kết nối Backend.'
        );
      })
      .finally(() => {
        setLoadingTopics(false);
      });
  };

  useEffect(() => {
    loadTopics();
  }, []);

  // Bắt đầu bài Quiz mới
  const handleStartTopic = (topic: Topic) => {
    try { sessionStorage.setItem(activeTopicKey, topic.id); } catch {}
    setCelebrate(false);
    setLastResult(null);
    setSelectedTopic(topic);
    setScreen('quiz');
  };

  // Chỉ chạy khi Backend nộp bài thành công
  const handleFinishQuiz = (result: NopBaiResponseDTO) => {
    try { sessionStorage.removeItem(activeTopicKey); } catch {}
    setLastResult(result);

    setXp((previous) => previous + result.diemSo);
    setStreak((previous) => previous + 1);

    // Kích hoạt tuyết giấy trên màn hình kết quả
    setCelebrate(true);
    setScreen('result');
  };

  // Quay lại trang chủ
  const handleBackToHome = () => {
    try { sessionStorage.removeItem(activeTopicKey); } catch {}
    setCelebrate(false);
    setScreen('home');
    loadTopics();
  };

  // Điều hướng đến Admin
  const handleGoAdmin = () => {
    if (currentUser?.vaiTro === 'ADMIN') {
      setScreen('admin');
    } else {
      setAfterLoginGoTo('admin');
      setScreen('login');
    }
  };

  // Điều hướng đến đăng nhập
  const handleGoLogin = () => {
    setAfterLoginGoTo('home');
    setScreen('login');
  };

  // Đăng nhập thành công
  const handleLoginSuccess = (user: AuthUser) => {
    setCurrentUser(user);

    if (
      afterLoginGoTo === 'admin' &&
      user.vaiTro !== 'ADMIN'
    ) {
      setScreen('home');
    } else {
      setScreen(afterLoginGoTo);
    }
  };

  // Đăng xuất
  const handleLogout = () => {
    try { sessionStorage.removeItem(activeTopicKey); } catch {}
    xoaAuth();
    setCurrentUser(null);
    setLastResult(null);
    setCelebrate(false);
    setScreen('home');
  };

  // Đang tải dữ liệu
  if (loadingTopics) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: '#0f0c29' }}
      >
        <p className="text-white/60 font-bold">
          Đang tải dữ liệu...
        </p>
      </div>
    );
  }

  // Lỗi tải dữ liệu
  if (loadError) {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center gap-4"
        style={{ background: '#0f0c29' }}
      >
        <p className="text-white/70 font-bold text-center px-6">
          {loadError}
        </p>

        <button
          type="button"
          onClick={loadTopics}
          className="px-4 py-2 rounded-xl font-bold text-white"
          style={{ background: '#6C5CE7' }}
        >
          Thử lại
        </button>
      </div>
    );
  }

  return (
    <>
      {/* TRANG CHỦ */}
      {screen === 'home' && (
        <HomeScreen
          topics={topics}
          currentUser={currentUser}
          onStart={handleStartTopic}
          onLeaderboard={() => setScreen('leaderboard')}
          onAdmin={handleGoAdmin}
          onLogin={handleGoLogin}
          onLogout={handleLogout}
          xp={xp}
          streak={streak}
          onResults={lastResult && selectedTopic ? () => setScreen('result') : undefined}
        />
      )}

      {/* ĐĂNG NHẬP */}
      {screen === 'login' && (
        <LoginScreen
          onLogin={handleLoginSuccess}
          onSkip={() => setScreen('home')}
        />
      )}

      {/* LÀM BÀI QUIZ */}
      {screen === 'quiz' && selectedTopic && (
        <QuizScreen
          topic={selectedTopic}
          currentUser={currentUser}
          onFinish={handleFinishQuiz}
          onBack={handleBackToHome}
        />
      )}

      {/* KẾT QUẢ VÀ HIỆU ỨNG CHÚC MỪNG */}
      {screen === 'result' && selectedTopic && lastResult && (
        <ResultScreen
          topicId={selectedTopic.id}
          result={lastResult}
          celebrate={celebrate}
          onReplay={() => {
            handleStartTopic(selectedTopic);
          }}
          onHome={handleBackToHome}
          onLeaderboard={() => {
            setCelebrate(false);
            setScreen('leaderboard');
          }}
        />
      )}

      {/* BẢNG XẾP HẠNG */}
      {screen === 'leaderboard' && (
        <LeaderboardScreen
          topics={topics}
          onBack={handleBackToHome}
        />
      )}

      {/* QUẢN TRỊ */}
      {screen === 'admin' && currentUser?.vaiTro === 'ADMIN' && (
        <AdminScreen
          topics={topics}
          onBack={handleBackToHome}
          onTopicsChanged={loadTopics}
          onLogout={handleLogout}
        />
      )}
    </>
  );
}
