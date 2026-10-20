import { useEffect, useState } from "react";
import type { Topic } from "../data";
import {
  layNhomMon,
  layDanhSachChuDeThongKe,
  type NhomMon,
  type AuthUser,
  type ChuDeThongKeDTO,
} from "../services/api";
import StudyChatWidget from "../components/StudyChatWidget";
import AnalyticsPrivacy from "../components/AnalyticsPrivacy";
import "./HomeScreen.css";

interface Props {
  topics: Topic[];
  currentUser: AuthUser | null;
  onStart: (topic: Topic) => void;
  onLeaderboard: () => void;
  onAdmin: () => void;
  onLogin: () => void;
  onLogout: () => void;
  xp: number;
  streak: number;
  onResults?: () => void;
}
const github = "https://github.com/BigBoss1208/quiz_app";
const normalize = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .toLowerCase();
const scrollTo = (id: string) =>
  document
    .getElementById(id)
    ?.scrollIntoView({ behavior: "smooth", block: "start" });

export default function HomeScreen({
  topics,
  currentUser,
  onStart,
  onLeaderboard,
  onAdmin,
  onLogin,
  onLogout,
  xp,
  streak,
  onResults,
}: Props) {
  const [category, setCategory] = useState("Tất cả");
  const [search, setSearch] = useState("");
  const [groups, setGroups] = useState<NhomMon[]>([]);
  const [groupsLoaded, setGroupsLoaded] = useState(false);
  const [raw, setRaw] = useState<ChuDeThongKeDTO[] | null>(null);
  const [error, setError] = useState("");
  const [accountOpen, setAccountOpen] = useState(false);
  useEffect(() => {
    let alive = true;
    Promise.allSettled([layNhomMon(), layDanhSachChuDeThongKe()]).then(
      ([g, s]) => {
        if (!alive) return;
        if (g.status === "fulfilled") {
          setGroups(g.value);
          setGroupsLoaded(true);
        } else
          setError(
            "Chưa tải được nhóm môn. Bạn vẫn có thể tìm theo tên chủ đề.",
          );
        if (s.status === "fulfilled") setRaw(s.value);
      },
    );
    return () => {
      alive = false;
    };
  }, [topics]);
  const filtered = topics.filter(
    (t) =>
      (category === "Tất cả" || t.category === category) &&
      normalize(`${t.name} ${t.category}`).includes(normalize(search)),
  );
  const highlights = (raw || [])
    .flatMap((t) =>
      (t.topDiemCao || []).map((p) => ({ ...p, topic: t.tenChuDe })),
    )
    .sort((a, b) => b.diemSo - a.diemSo)
    .slice(0, 5);
  const featureAction = currentUser?.vaiTro === "ADMIN" ? onAdmin : undefined;
  return (
    <div className="home-page">
      <header className="home-header">
        <div className="home-header-inner">
          <a
            className="home-brand"
            href="#home-top"
            aria-label="Quiz ManhNhom – Trang chủ"
          >
            <span aria-hidden="true">🎓</span>Quiz <b>ManhNhom</b>
          </a>
          <nav className="home-nav" aria-label="Menu chính">
            <a className="active" href="#home-top">
              Trang chủ
            </a>
            <a href="#home-discover">Khám phá đề thi</a>
            <button
              onClick={featureAction}
              disabled={!featureAction}
              title={
                featureAction
                  ? "Mở quản trị câu hỏi"
                  : "Tính năng USER tạo câu hỏi đang được chuẩn bị"
              }
            >
              Tạo câu hỏi
            </button>
            <button
              disabled
              title="Tính năng đề thi của USER đang được chuẩn bị"
            >
              Đề thi của tôi
            </button>
            <button
              onClick={onResults}
              disabled={!onResults}
              title="Kết quả lượt làm bài vừa hoàn thành"
            >
              Kết quả
            </button>
          </nav>
          <div className="home-account-actions">
            <button
              className="home-rank-button"
              onClick={onLeaderboard}
              aria-label="Bảng xếp hạng"
            >
              🏆 <span>Bảng xếp hạng</span>
            </button>
            {currentUser?.vaiTro === "ADMIN" && (
              <button onClick={onAdmin} aria-label="Quản trị" title="Quản trị">
                ⚙
              </button>
            )}
            <span className="home-xp" title="XP nhận được trong phiên này">
              ⚡ {xp.toLocaleString("vi-VN")} XP
            </span>
            <span
              className="home-streak"
              title="Số lượt hoàn thành trong phiên này"
            >
              🔥 {streak}
            </span>
            {currentUser ? (
              <div className="home-account">
                <button
                  aria-label="Tài khoản"
                  aria-expanded={accountOpen}
                  onClick={() => setAccountOpen(!accountOpen)}
                  className="home-avatar"
                >
                  {currentUser.hoTen?.trim().charAt(0) || "U"}
                </button>
                {accountOpen && (
                  <div className="home-account-menu">
                    <strong>{currentUser.hoTen}</strong>
                    <small>@{currentUser.username}</small>
                    <button onClick={onLogout}>Đăng xuất</button>
                  </div>
                )}
              </div>
            ) : (
              <button className="home-login" onClick={onLogin}>
                Đăng nhập
              </button>
            )}
          </div>
        </div>
      </header>
      <main className="home-container" id="home-top">
        <section className="home-hero" aria-labelledby="home-heading">
          <div className="home-hero-copy">
            <span className="home-eyebrow">HỌC MÀ CHƠI · CHƠI MÀ HỌC</span>
            <h1 id="home-heading">
              Học thông minh
              <br />
              cùng <span>Quiz ManhNhom</span>
            </h1>
            <p>
              Ôn tập kiến thức, thử sức với các câu hỏi và chinh phục những thử
              thách mới mỗi ngày.
            </p>
            <div className="home-hero-actions">
              <a className="home-primary" href="#home-discover">
                Khám phá đề thi <span>→</span>
              </a>
              {featureAction ? (
                <button className="home-outline" onClick={onAdmin}>
                  Quản lý câu hỏi
                </button>
              ) : (
                <a className="home-outline" href="#home-features">
                  Tìm hiểu tính năng
                </a>
              )}
            </div>
            <div className="home-benefits">
              <div>
                <i>▤</i>
                <span>
                  Nhiều
                  <br />
                  chủ đề
                </span>
              </div>
              <div>
                <i>✧</i>
                <span>
                  Đa dạng
                  <br />
                  câu hỏi
                </span>
              </div>
              <div>
                <i>⚗</i>
                <span>
                  Học mọi lúc
                  <br />
                  mọi nơi
                </span>
              </div>
            </div>
          </div>
          <div className="home-hero-art">
            <img
              src="/images/study-hero.webp"
              width="1536"
              height="1024"
              alt="Bạn trẻ học bài với máy tính, sách và bảng kiểm kiến thức"
              fetchPriority="high"
            />
          </div>
        </section>
        <section className="home-search-section" aria-label="Công cụ tìm kiếm">
          <form
            className="home-search"
            onSubmit={(e) => {
              e.preventDefault();
              scrollTo("home-discover");
            }}
          >
            <span aria-hidden="true">⌕</span>
            <input
              aria-label="Tìm kiếm đề thi"
              placeholder="Tìm kiếm theo tên, môn học, chủ đề…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <button type="submit">Tìm kiếm</button>
          </form>
          <div className="home-quick">
            <b>Gợi ý nhanh:</b>
            {topics.slice(0, 8).map((t) => (
              <button
                key={t.id}
                onClick={() => {
                  setSearch(t.name);
                  setCategory("Tất cả");
                  scrollTo("home-discover");
                }}
              >
                {t.name}
              </button>
            ))}
          </div>
        </section>
        <section id="home-discover" className="home-section">
          <div className="home-section-heading">
            <h2>🎓 Chủ đề nổi bật</h2>
            <button
              onClick={() => {
                setCategory("Tất cả");
                setSearch("");
              }}
            >
              Xem tất cả →
            </button>
          </div>
          {error && (
            <p role="alert" className="home-notice">
              {error}
            </p>
          )}
          <div className="home-categories" aria-label="Lọc nhóm môn">
            {["Tất cả", ...groups.map((g) => g.ten)].map((g) => (
              <button
                key={g}
                aria-pressed={category === g}
                onClick={() => setCategory(g)}
              >
                {g}
              </button>
            ))}
          </div>
          <div className="home-topic-grid">
            {filtered.map((t, i) => (
              <div
                className={`home-topic-card home-tone-${i % 6}`}
                key={t.id}
                tabIndex={0}
                onClick={() => onStart(t)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onStart(t);
                  }
                }}
                aria-label={`Làm bài ${t.name}`}
              >
                <span className="home-topic-icon" aria-hidden="true">
                  {t.emoji}
                </span>
                <h3>{t.name}</h3>
                <p>{t.questions} câu hỏi</p>
                <small>{t.category}</small>
                <span className="home-topic-arrow" aria-hidden="true">
                  ↗
                </span>
              </div>
            ))}
          </div>
          {!filtered.length && (
            <p className="home-empty" role="status">
              Không có chủ đề phù hợp. Hãy thử từ khóa hoặc nhóm môn khác.
            </p>
          )}
        </section>
        <section className="home-section">
          <div className="home-section-heading">
            <h2>🔥 Khám phá đề thi</h2>
            <a href="#home-discover">Xem tất cả →</a>
          </div>
          <div className="home-exam-grid">
            {topics.slice(0, 3).map((t, i) => (
              <article className="home-exam-card" key={t.id}>
                <div className="home-exam-heading">
                  <span className={`home-exam-icon home-tone-${i}`}>
                    {t.emoji}
                  </span>
                  <div>
                    <p className="home-exam-title">{t.name}</p>
                    <small>{t.category}</small>
                  </div>
                </div>
                <p>
                  ▤ {t.questions} câu hỏi ·{" "}
                  {t.choPhepXemDapAn
                    ? "Có chế độ luyện tập"
                    : "Ôn tập và kiểm tra kiến thức"}
                </p>
                <button className="home-primary" onClick={() => onStart(t)}>
                  Làm ngay →
                </button>
              </article>
            ))}
          </div>
        </section>
        <section id="home-features" className="home-section">
          <div className="home-section-heading">
            <h2>✦ Tính năng nổi bật</h2>
          </div>
          <div className="home-feature-grid">
            {[
              {
                icon: "▤",
                name: "Làm bài trắc nghiệm",
                description:
                  "Thử sức với các câu hỏi được chấm điểm trên hệ thống.",
                action: () => scrollTo("home-discover"),
                color: 0,
              },
              {
                icon: "✎",
                name: "Tạo câu hỏi",
                description: featureAction
                  ? "Tạo và quản lý câu hỏi trong trang Admin."
                  : "Không gian tạo câu hỏi cho USER đang được chuẩn bị.",
                action: featureAction,
                color: 1,
              },
              {
                icon: "▱",
                name: "Tạo đề thi",
                description: featureAction
                  ? "Cấu hình chủ đề và đề thi tại trang quản trị."
                  : "Tính năng tạo đề thi riêng cho USER đang được chuẩn bị.",
                action: featureAction,
                color: 3,
              },
              {
                icon: "↗",
                name: "Chia sẻ kiến thức",
                description: "Cùng khám phá, luyện tập và học hỏi mỗi ngày.",
                action: () => scrollTo("home-discover"),
                color: 4,
              },
            ].map((f) => (
              <button
                className={`home-feature-card home-tone-${f.color}`}
                key={f.name}
                disabled={!f.action}
                onClick={f.action}
              >
                <i>{f.icon}</i>
                <h3>{f.name}</h3>
                <p>{f.description}</p>
                <span>{f.action ? "Khám phá →" : "Đang chuẩn bị"}</span>
              </button>
            ))}
          </div>
        </section>
        <section className="home-banner">
          <div>
            <h2>Chia sẻ kiến thức – Lan tỏa giá trị</h2>
            <p>Khám phá các chủ đề, luyện tập đều đặn và tiến bộ mỗi ngày.</p>
            <a className="home-primary" href="#home-discover">
              Bắt đầu học ngay →
            </a>
          </div>
          <div className="home-banner-art" aria-hidden="true">
            <span>🎓</span>
            <span>📚</span>
            <span>🏆</span>
          </div>
        </section>
        <section className="home-section" id="home-scores">
          <div className="home-section-heading">
            <h2>🏆 Điểm nổi bật theo chủ đề</h2>
            <button onClick={onLeaderboard}>Bảng xếp hạng →</button>
          </div>
          <p className="home-section-note">
            Các điểm cao được Backend trả về theo từng chủ đề.
          </p>
          <div className="home-score-list">
            {highlights.map((p, i) => (
              <div
                className="home-score-row"
                key={`${p.topic}-${p.tenNguoiChoi}-${i}`}
              >
                <b className="home-rank-number">{i + 1}</b>
                <span className="home-score-avatar">
                  {p.tenNguoiChoi.charAt(0).toUpperCase()}
                </span>
                <strong>{p.tenNguoiChoi}</strong>
                <small>{p.topic}</small>
                <b className="home-score-points">
                  {p.diemSo.toLocaleString("vi-VN")} điểm
                </b>
              </div>
            ))}
            {!highlights.length && (
              <p className="home-empty">
                {raw
                  ? "Chưa có kết quả để hiển thị."
                  : "Chưa tải được dữ liệu điểm."}
              </p>
            )}
          </div>
        </section>
        <section className="home-section">
          <div className="home-section-heading">
            <h2>▥ Thống kê nhanh</h2>
          </div>
          <div className="home-stat-grid">
            {[
              { icon: "▤", label: "Chủ đề hiện có", value: topics.length },
              {
                icon: "✎",
                label: "Câu hỏi",
                value: topics.reduce((n, t) => n + t.questions, 0),
              },
              {
                icon: "✓",
                label: "Lượt làm bài",
                value: raw ? raw.reduce((n, t) => n + t.luotChoi, 0) : null,
              },
              {
                icon: "✦",
                label: "Nhóm môn",
                value: groupsLoaded ? groups.length : null,
              },
            ].map((s, i) => (
              <div className={`home-stat home-tone-${i}`} key={s.label}>
                <i>{s.icon}</i>
                <div>
                  <span>{s.label}</span>
                  <strong>
                    {s.value == null ? "—" : s.value.toLocaleString("vi-VN")}
                  </strong>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>
      <footer className="home-footer">
        <div className="home-container home-footer-grid">
          <section>
            <a className="home-brand" href="#home-top">
              <span>🎓</span>Quiz <b>ManhNhom</b>
            </a>
            <p>
              Nền tảng ôn luyện kiến thức trực tuyến, đồng hành cùng bạn trên
              hành trình học tập và chinh phục tri thức.
            </p>
            <div className="home-social">
              <button
                disabled
                title="Chưa có liên kết Facebook được xác minh"
                aria-label="Facebook – chưa cập nhật"
              >
                f
              </button>
              <a
                href={github}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="GitHub Quiz ManhNhom"
              >
                GH
              </a>
              <a
                href="mailto:quangmanh12082005@gmail.com"
                aria-label="Gửi email"
              >
                ✉
              </a>
            </div>
          </section>
          <section>
            <h2>Thông tin liên hệ</h2>
            <a href="tel:0962022716">☏ 0962022716</a>
            <a href="mailto:quangmanh12082005@gmail.com">
              ✉ quangmanh12082005@gmail.com
            </a>
            <p>♧ Thái Nguyên, Việt Nam</p>
          </section>
          <section>
            <h2>Người phát triển</h2>
            <strong>Ngô Quang Mạnh</strong>
            <p>
              Sinh viên CNTT – ICTU
              <br />
              Phát triển và xây dựng Quiz ManhNhom.
            </p>
            <div className="home-social">
              <button disabled title="Chưa có liên kết Facebook được xác minh">
                Facebook
              </button>
              <a href={github} target="_blank" rel="noopener noreferrer">
                GitHub
              </a>
              <a href="mailto:quangmanh12082005@gmail.com">Liên hệ</a>
            </div>
          </section>
        </div>
        <div className="home-footer-bottom home-container">
          © {new Date().getFullYear()} Quiz ManhNhom. Học mà chơi, chơi mà học.
          <AnalyticsPrivacy />
        </div>
      </footer>
      <StudyChatWidget />
    </div>
  );
}
