import { useState, useEffect } from 'react';
import type { Topic } from './data';
import { layDanhSachChuDeThongKe, layAuth, xoaAuth, type AuthUser } from './services/api';
import { mapChuDeToTopic } from './adapters';
import HomeScreen from './screens/HomeScreen';
import QuizScreen from './screens/QuizScreen';
import ResultScreen from './screens/ResultScreen';
import LeaderboardScreen from './screens/LeaderboardScreen';
import AdminScreen from './screens/AdminScreen';
import LoginScreen from './screens/LoginScreen';

type Screen = 'home' | 'quiz' | 'result' | 'leaderboard' | 'admin' | 'login';

export default function App() {
  const [screen, setScreen] = useState<Screen>('home');
  // Sau khi đăng nhập từ trang Admin, quay về đúng đích (admin) thay vì luôn về home
  const [afterLoginGoTo, setAfterLoginGoTo] = useState<Screen>('home');

  const [topics, setTopics] = useState<Topic[]>([]);
  const [loadingTopics, setLoadingTopics] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [currentUser, setCurrentUser] = useState<AuthUser | null>(() => layAuth());

  const [selectedTopic, setSelectedTopic] = useState<Topic | null>(null);
  const [lastScore, setLastScore] = useState(0);
  const [lastCorrect, setLastCorrect] = useState(0);
  const [lastTotal, setLastTotal] = useState(0);
  const [lastTime, setLastTime] = useState(0);
  const [xp, setXp] = useState(0);
  const [streak, setStreak] = useState(0);

  const loadTopics = () => {
    setLoadingTopics(true);
    setLoadError(null);
    layDanhSachChuDeThongKe()
      .then((data) => setTopics(data.map(mapChuDeToTopic)))
      .catch(() => setLoadError('Không tải được danh sách chủ đề. Kiểm tra backend đã chạy chưa (http://localhost:8080).'))
      .finally(() => setLoadingTopics(false));
  };

  useEffect(() => {
    loadTopics();
  }, []);

  const handleStartTopic = (topic: Topic) => {
    setSelectedTopic(topic);
    setScreen('quiz');
  };

  const handleFinishQuiz = (score: number, correct: number, total: number, time: number) => {
    setLastScore(score);
    setLastCorrect(correct);
    setLastTotal(total);
    setLastTime(time);
    setXp((x) => x + score);
    setStreak((s) => s + 1);
    setScreen('result');
  };

  const handleBackToHome = () => {
    setScreen('home');
    loadTopics();
  };

  // Bấm ⚙️ ở Home: chưa đăng nhập → sang login; đã đăng nhập nhưng không phải ADMIN → không cho vào; là ADMIN → vào thẳng
  const handleGoAdmin = () => {
    if (currentUser?.vaiTro === 'ADMIN') {
      setScreen('admin');
    } else {
      setAfterLoginGoTo('admin');
      setScreen('login');
    }
  };

  const handleGoLogin = () => {
    setAfterLoginGoTo('home');
    setScreen('login');
  };

  const handleLoginSuccess = (user: AuthUser) => {
    setCurrentUser(user);
    if (afterLoginGoTo === 'admin' && user.vaiTro !== 'ADMIN') {
      // Đăng nhập thành công nhưng không phải admin — không cho vào trang admin
      setScreen('home');
    } else {
      setScreen(afterLoginGoTo);
    }
  };

  const handleLogout = () => {
    xoaAuth();
    setCurrentUser(null);
    setScreen('home');
  };

  if (loadingTopics) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#0f0c29' }}>
        <p className="text-white/60 font-bold">Đang tải dữ liệu...</p>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4" style={{ background: '#0f0c29' }}>
        <p className="text-white/70 font-bold text-center px-6">{loadError}</p>
        <button onClick={loadTopics} className="px-4 py-2 rounded-xl font-bold text-white" style={{ background: '#6C5CE7' }}>
          Thử lại
        </button>
      </div>
    );
  }

  return (
    <>
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
        />
      )}
      {screen === 'login' && (
        <LoginScreen onLogin={handleLoginSuccess} onSkip={() => setScreen('home')} />
      )}
      {screen === 'quiz' && selectedTopic && (
        <QuizScreen
          topic={selectedTopic}
          currentUser={currentUser}
          onFinish={handleFinishQuiz}
          onBack={handleBackToHome}
        />
      )}
      {screen === 'result' && selectedTopic && (
        <ResultScreen
          topicId={selectedTopic.id}
          score={lastScore}
          correct={lastCorrect}
          total={lastTotal}
          time={lastTime}
          onReplay={() => setScreen('quiz')}
          onHome={handleBackToHome}
          onLeaderboard={() => setScreen('leaderboard')}
        />
      )}
      {screen === 'leaderboard' && (
        <LeaderboardScreen topics={topics} onBack={handleBackToHome} />
      )}
      {screen === 'admin' && currentUser?.vaiTro === 'ADMIN' && (
        <AdminScreen topics={topics} onBack={handleBackToHome} onTopicsChanged={loadTopics} onLogout={handleLogout} />
      )}
    </>
  );
}
