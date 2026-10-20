import { useState } from 'react';

export default function AnalyticsPrivacy() {
  const [optedOut, setOptedOut] = useState(() => document.cookie.split(';').some(v => v.trim() === 'quiz_analytics_optout=1'));
  function toggle() {
    const next = !optedOut;
    document.cookie = `quiz_analytics_optout=${next ? '1' : '0'}; Path=/; Max-Age=31536000; SameSite=Lax${location.protocol === 'https:' ? '; Secure' : ''}`;
    setOptedOut(next);
  }
  return <div style={{ marginTop: 12, lineHeight: 1.7 }}>
    <span>Thống kê truy cập dùng quốc gia, loại thiết bị và mã trình duyệt ngẫu nhiên; không ghi mật khẩu hoặc đáp án. </span>
    <button type="button" onClick={toggle} aria-pressed={optedOut} style={{ color: '#c4b5fd', textDecoration: 'underline', cursor: 'pointer' }}>
      {optedOut ? 'Bật lại thống kê truy cập' : 'Tắt thống kê truy cập'}
    </button>
    {optedOut && <span role="status"> Đã tắt cho các lượt mở trang tiếp theo trên trình duyệt này.</span>}
  </div>;
}
