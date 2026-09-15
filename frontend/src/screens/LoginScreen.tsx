import { useState } from "react"
import { dangNhap, dangKy, luuAuth, type AuthUser } from "../services/api"

interface Props {
  onLogin: (user: AuthUser) => void
  onSkip: () => void
}

export default function LoginScreen({ onLogin, onSkip }: Props) {
  const [tab, setTab] = useState<"login" | "register">("login")
  const [hoTen, setHoTen] = useState("")
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [shaking, setShaking] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!username || !password || (tab === "register" && !hoTen)) {
      setShaking(true)
      setTimeout(() => setShaking(false), 500)
      return
    }

    setLoading(true)
    try {
      const user = tab === "login"
        ? await dangNhap(username, password)
        : await dangKy(username, password, hoTen)
      luuAuth(user)
      onLogin(user)
    } catch (err) {
      setError(tab === "login" ? "Sai tên đăng nhập hoặc mật khẩu." : "Đăng ký thất bại — tên đăng nhập có thể đã tồn tại.")
      setShaking(true)
      setTimeout(() => setShaking(false), 500)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden"
      style={{ background: "linear-gradient(160deg, #0f0c29 0%, #1a1048 55%, #24243e 100%)" }}
    >
      <div className="fixed pointer-events-none" style={{ top: "-10%", left: "-10%", width: 500, height: 500, borderRadius: "50%", background: "radial-gradient(circle, #6C5CE7, transparent)", filter: "blur(80px)", opacity: 0.25 }} />
      <div className="fixed pointer-events-none" style={{ bottom: "-10%", right: "-10%", width: 400, height: 400, borderRadius: "50%", background: "radial-gradient(circle, #FF6B6B, transparent)", filter: "blur(70px)", opacity: 0.18 }} />
      <div className="fixed pointer-events-none" style={{ top: "40%", right: "5%", width: 300, height: 300, borderRadius: "50%", background: "radial-gradient(circle, #00D9A5, transparent)", filter: "blur(60px)", opacity: 0.12 }} />

      <div className="fixed top-8 left-8 text-4xl animate-float opacity-40">⭐</div>
      <div className="fixed top-20 right-16 text-3xl animate-float opacity-30" style={{ animationDelay: "0.8s" }}>🎮</div>
      <div className="fixed bottom-16 left-12 text-3xl animate-float opacity-30" style={{ animationDelay: "1.5s" }}>🔥</div>
      <div className="fixed bottom-8 right-10 text-4xl animate-float opacity-25" style={{ animationDelay: "0.4s" }}>⚡</div>
      <div className="fixed top-1/2 left-6 text-2xl animate-float opacity-20" style={{ animationDelay: "2s" }}>🎯</div>

      <div className={`relative w-full max-w-sm animate-slide-up ${shaking ? "animate-shake" : ""}`} style={{ zIndex: 10 }}>
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-3 text-3xl"
            style={{ background: "linear-gradient(135deg, #6C5CE7, #4834D4)", boxShadow: "0 8px 30px rgba(108,92,231,0.5)" }}>
            🎮
          </div>
          <h1 className="text-white font-black text-2xl" style={{ fontFamily: "Baloo 2" }}>QuizVN</h1>
          <p className="text-white/40 text-sm font-semibold mt-0.5">Học mà chơi, chơi mà học!</p>
        </div>

        <div className="rounded-[24px] p-6"
          style={{ background: "rgba(255,255,255,0.06)", backdropFilter: "blur(24px)", border: "1px solid rgba(255,255,255,0.12)", boxShadow: "0 24px 60px rgba(0,0,0,0.35)" }}>
          <h2 className="text-white font-black text-xl mb-5 text-center" style={{ fontFamily: "Baloo 2" }}>
            {tab === "login" ? "Chào mừng trở lại! 👋" : "Tạo tài khoản mới 🎉"}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-3">
            {tab === "register" && (
              <div>
                <label className="block text-white/60 text-xs font-bold uppercase tracking-wider mb-2">Tên hiển thị</label>
                <input type="text" value={hoTen} onChange={(e) => setHoTen(e.target.value)}
                  placeholder="Ví dụ: Minh Khoa"
                  className="w-full px-4 py-3.5 rounded-2xl text-white font-semibold text-sm outline-none transition-all"
                  style={{ background: "rgba(255,255,255,0.07)", border: "1.5px solid rgba(255,255,255,0.1)" }}
                  onFocus={(e) => (e.currentTarget.style.border = "1.5px solid #6C5CE7")}
                  onBlur={(e) => (e.currentTarget.style.border = "1.5px solid rgba(255,255,255,0.1)")} />
              </div>
            )}

            <div>
              <label className="block text-white/60 text-xs font-bold uppercase tracking-wider mb-2">Tên đăng nhập</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30 text-base">👤</span>
                <input type="text" value={username} onChange={(e) => setUsername(e.target.value)}
                  placeholder="ten_dang_nhap"
                  className="w-full pl-11 pr-4 py-3.5 rounded-2xl text-white font-semibold text-sm outline-none transition-all"
                  style={{ background: "rgba(255,255,255,0.07)", border: "1.5px solid rgba(255,255,255,0.1)" }}
                  onFocus={(e) => (e.currentTarget.style.border = "1.5px solid #6C5CE7")}
                  onBlur={(e) => (e.currentTarget.style.border = "1.5px solid rgba(255,255,255,0.1)")} />
              </div>
            </div>

            <div>
              <label className="block text-white/60 text-xs font-bold uppercase tracking-wider mb-2">Mật khẩu</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30 text-base">🔒</span>
                <input type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-11 pr-12 py-3.5 rounded-2xl text-white font-semibold text-sm outline-none transition-all"
                  style={{ background: "rgba(255,255,255,0.07)", border: "1.5px solid rgba(255,255,255,0.1)" }}
                  onFocus={(e) => (e.currentTarget.style.border = "1.5px solid #6C5CE7")}
                  onBlur={(e) => (e.currentTarget.style.border = "1.5px solid rgba(255,255,255,0.1)")} />
                <button type="button" onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors text-sm font-bold">
                  {showPassword ? "Ẩn" : "Hiện"}
                </button>
              </div>
            </div>

            {error && <p className="text-red-400 text-xs font-semibold text-center">{error}</p>}

            <button type="submit" disabled={loading}
              className="btn-bounce w-full py-4 rounded-2xl font-extrabold text-white text-base mt-2 relative overflow-hidden"
              style={{ background: "linear-gradient(90deg, #6C5CE7, #4834D4)", boxShadow: "0 8px 25px rgba(108,92,231,0.5)", fontFamily: "Baloo 2", opacity: loading ? 0.8 : 1 }}>
              {loading ? "Đang xử lý..." : tab === "login" ? "🚀 Đăng nhập" : "🎉 Tạo tài khoản"}
            </button>
          </form>

          <div className="flex items-center gap-3 my-5">
            <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.08)" }} />
            <span className="text-white/30 text-xs font-bold">hoặc</span>
            <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.08)" }} />
          </div>

          <button type="button" onClick={onSkip}
            className="btn-bounce w-full py-3 rounded-2xl font-bold text-sm transition-all"
            style={{ background: "rgba(255,255,255,0.06)", border: "1.5px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.7)" }}>
            👤 Chơi thử không cần tài khoản
          </button>
        </div>

        <button onClick={() => { setTab(tab === "login" ? "register" : "login"); setError(null); }}
          className="btn-bounce w-full mt-4 py-4 rounded-2xl font-extrabold text-sm transition-all duration-200"
          style={{ background: "rgba(255,255,255,0.06)", border: "1.5px solid rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.6)", fontFamily: "Baloo 2" }}>
          {tab === "login" ? "✨ Chưa có tài khoản? Đăng ký ngay" : "← Đã có tài khoản? Đăng nhập"}
        </button>
      </div>
    </div>
  )
}
