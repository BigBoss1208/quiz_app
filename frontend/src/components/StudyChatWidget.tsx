import { useEffect, useRef, useState } from 'react';
import { guiTinNhanChat, layTrangThaiChat, type ChatQuestionContext } from '../services/api';

interface Props {
  inline?: boolean;
  context?: ChatQuestionContext | null;
  onClearContext?: () => void;
}

interface ChatMessage {
  id: number;
  role: 'user' | 'assistant';
  text: string;
  source?: 'SEEKAI' | 'KNOWLEDGE_BASE';
  notice?: string | null;
}

export default function StudyChatWidget({ inline = false, context = null, onClearContext }: Props) {
  const [open, setOpen] = useState(false);
  const [seekAiConfigured, setSeekAiConfigured] = useState<boolean | null>(null);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [failedMessage, setFailedMessage] = useState<string | null>(null);
  const nextId = useRef(0);
  const bottomRef = useRef<HTMLDivElement>(null);

  const refreshStatus = () => {
    setStatusError(null);
    layTrangThaiChat()
      .then(({ seekAiConfigured: isConfigured }) => setSeekAiConfigured(isConfigured))
      .catch((error: unknown) => {
        setSeekAiConfigured(null);
        setStatusError(error instanceof Error ? error.message : 'Không kiểm tra được trạng thái chatbot.');
      });
  };

  useEffect(() => {
    refreshStatus();
  }, []);

  useEffect(() => {
    if (context) setOpen(true);
  }, [context]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, sending]);

  const sendMessage = async (text: string, retry = false) => {
    const trimmed = text.trim();
    if (!trimmed || sending) return;
    if (!retry) {
      setMessages((previous) => [...previous, { id: nextId.current++, role: 'user', text: trimmed }]);
    }
    setSending(true);
    setSendError(null);
    setFailedMessage(null);
    try {
      const response = await guiTinNhanChat(trimmed, context ?? undefined);
      setMessages((previous) => [...previous, {
        id: nextId.current++,
        role: 'assistant',
        text: response.reply,
        source: response.source,
        notice: response.notice,
      }]);
      setMessage('');
    } catch (error) {
      setSendError(error instanceof Error ? error.message : 'Gửi tin nhắn thất bại.');
      setFailedMessage(trimmed);
    } finally {
      setSending(false);
    }
  };

  const panel = open && (
    <section className={inline
      ? 'mt-3 w-full rounded-2xl overflow-hidden'
      : 'fixed bottom-20 right-4 z-50 w-[min(24rem,calc(100vw-2rem))] rounded-2xl overflow-hidden shadow-2xl'}
      style={{ background: '#13102d', border: '1px solid rgba(167,139,250,0.2)', boxShadow: '0 24px 60px rgba(0,0,0,0.5)' }}
      aria-label="Trợ lý AI học tập">
      <header className="flex items-center justify-between gap-3 px-4 py-3"
        style={{ background: 'rgba(108,92,231,0.22)', borderBottom: '1px solid rgba(167,139,250,0.15)' }}>
        <div className="flex items-center gap-2">
          <span className="text-lg">✨</span>
          <div>
            <h2 className="text-white font-extrabold text-sm">Trợ lý AI <span style={{ color: '#a78bfa' }}>ManhNhom</span></h2>
            <p className="text-white/50 text-xs">
              {seekAiConfigured === true
                ? 'Ưu tiên SeekAI · có kho hướng dẫn dự phòng'
                : seekAiConfigured === false
                  ? 'Kho hướng dẫn Quiz · chưa cấu hình SeekAI'
                  : 'Đang kiểm tra cấu hình...'}
            </p>
          </div>
        </div>
        <button type="button" onClick={() => { setOpen(false); onClearContext?.(); }}
          aria-label="Đóng chatbot" className="text-white/50 hover:text-white text-xl w-8 h-8 flex items-center justify-center rounded-full transition-colors"
          style={{ background: 'rgba(255,255,255,0.07)' }}>×</button>
      </header>

      {context && (
        <div className="px-3 py-2 flex items-center justify-between gap-2 bg-indigo-950/60">
          <span className="text-indigo-100 text-xs truncate">Đang hỏi về câu: {context.question}</span>
          <button type="button" onClick={onClearContext} className="text-indigo-200 text-xs underline shrink-0">Bỏ ngữ cảnh</button>
        </div>
      )}

      <div className="h-64 overflow-y-auto px-3 py-3 space-y-3" aria-live="polite">
        {messages.length === 0 && (
          <div>
            <p className="text-white/60 text-sm leading-relaxed mb-3">
              Trợ lý ưu tiên SeekAI khi đã cấu hình; nếu chưa có hoặc dịch vụ lỗi, chatbot tra cứu kho hướng dẫn Quiz đã xác minh.
              Trong bài kiểm tra, hãy nộp bài trước khi hỏi về đáp án.
            </p>
            <div className="flex flex-wrap gap-2">
              {['Làm sao bắt đầu bài Quiz?', 'Trả lời sai có bị dừng không?', 'Xem lại đáp án ở đâu?'].map((suggestion) => (
                <button key={suggestion} type="button" disabled={sending}
                  onClick={() => void sendMessage(suggestion)}
                  className="rounded-full px-3 py-1.5 text-xs font-bold text-purple-100 disabled:opacity-50"
                  style={{ background: 'rgba(108,92,231,0.3)' }}>
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        )}
        {messages.map((item) => (
          <div key={item.id} className={`flex ${item.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[90%] rounded-2xl px-3 py-2 ${item.role === 'user' ? 'text-white bg-purple-700' : 'text-slate-100 bg-white/10'}`}>
              <p className="text-sm whitespace-pre-wrap">{item.text}</p>
              {item.source && (
                <span className="mt-1 block text-[10px] font-bold text-white/55">
                  {item.source === 'SEEKAI' ? 'SeekAI' : 'Kho hướng dẫn Quiz (không phải mô hình đã huấn luyện)'}
                </span>
              )}
              {item.notice && <span className="mt-1 block text-xs text-amber-200">{item.notice}</span>}
            </div>
          </div>
        ))}
        {sending && <p className="text-white/60 text-sm animate-pulse">AI đang trả lời...</p>}
        <div ref={bottomRef} />
      </div>

      {statusError && <p role="alert" className="px-3 pb-2 text-amber-200 text-xs">{statusError}</p>}
      {sendError && (
        <div className="px-3 pb-3" role="alert">
          <p className="text-red-200 text-sm">{sendError}</p>
          {failedMessage && (
            <button type="button" onClick={() => sendMessage(failedMessage, true)} disabled={sending}
              className="mt-1 text-red-100 text-sm font-bold underline disabled:opacity-50">Gửi lại</button>
          )}
        </div>
      )}

      <form onSubmit={(event) => { event.preventDefault(); void sendMessage(message); }}
        className="flex gap-2 p-3" style={{ borderTop: '1px solid rgba(255,255,255,0.1)' }}>
        <input value={message} onChange={(event) => setMessage(event.target.value)} maxLength={2000}
          placeholder="Nhập câu hỏi của bạn..."
          disabled={sending}
          aria-label="Tin nhắn gửi tới trợ lý AI"
          className="min-w-0 flex-1 rounded-xl px-3 py-2 text-white text-sm outline-none disabled:opacity-50"
          style={{ background: 'rgba(255,255,255,0.1)' }} />
        <button type="submit" disabled={sending || !message.trim()}
          className="rounded-xl px-3 py-2 text-white font-bold text-sm disabled:opacity-45"
          style={{ background: '#6C5CE7' }}>
          Gửi
        </button>
      </form>
    </section>
  );

  return (
    <div className={inline ? 'w-full' : 'fixed bottom-4 right-4 z-50'}>
      {!inline && (
        <button type="button" onClick={() => setOpen((value) => !value)}
          className="btn-bounce flex items-center gap-2 rounded-2xl px-4 py-3 text-white font-extrabold shadow-xl"
          style={{
            background: open ? 'rgba(108,92,231,0.8)' : 'linear-gradient(135deg, #6C5CE7, #4834D4)',
            boxShadow: open ? '0 4px 16px rgba(108,92,231,0.3)' : '0 8px 30px rgba(108,92,231,0.5)',
            border: '1px solid rgba(167,139,250,0.3)',
          }}
          aria-expanded={open}
          aria-label={open ? 'Đóng chatbot AI' : 'Mở chatbot AI'}>
          <span>{open ? '×' : '✨'}</span>
          <span className="text-sm">{open ? 'Đóng' : 'Hỏi AI'}</span>
        </button>
      )}
      {panel}
    </div>
  );
}
