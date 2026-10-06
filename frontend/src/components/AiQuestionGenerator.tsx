import { useState, useEffect } from 'react';
import {
  taoCauHoiBangAi,
  luuHangLoatCauHoi,
  type CauHoiCreateDTO,
} from '../services/api';

interface Props {
  chuDeId: number;
  defaultTopicName?: string;
  onSuccess: () => void;
}

export default function AiQuestionGenerator({
  chuDeId,
  defaultTopicName = '',
  onSuccess,
}: Props) {
  const [topic, setTopic] = useState(defaultTopicName);
  const [count, setCount] = useState<number>(5);
  const [doKho, setDoKho] = useState<string>('Cơ bản');

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // State chứa danh sách câu hỏi xem trước và cho phép chỉnh sửa
  const [previewList, setPreviewList] = useState<CauHoiCreateDTO[]>([]);

  useEffect(() => {
    if (defaultTopicName && !topic) {
      setTopic(defaultTopicName);
    }
  }, [defaultTopicName, topic]);

  // Gọi API sinh câu hỏi
  const handleGenerate = async () => {
    if (!topic.trim()) {
      setErrorMessage('Vui lòng nhập chủ đề câu hỏi.');
      return;
    }

    setLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const data = await taoCauHoiBangAi(topic.trim(), count, doKho);
      if (!data || data.length === 0) {
        setErrorMessage('AI không trả về câu hỏi nào. Vui lòng thử lại với chủ đề chi tiết hơn.');
      } else {
        setPreviewList(data);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Tạo câu hỏi thất bại. Kiểm tra kết nối AI hoặc cấu hình API Key.';
      setErrorMessage(msg);
    } finally {
      setLoading(false);
    }
  };

  // Cập nhật từng trường của câu hỏi trong Preview table
  const handleUpdateItem = (
    index: number,
    field: keyof CauHoiCreateDTO,
    value: string
  ) => {
    setPreviewList((prev) => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        [field]: value,
      };
      return updated;
    });
  };

  // Xóa một câu khỏi Preview
  const handleRemoveItem = (index: number) => {
    setPreviewList((prev) => prev.filter((_, i) => i !== index));
  };

  // Lưu toàn bộ danh sách Preview vào CSDL
  const handleSaveAll = async () => {
    if (previewList.length === 0) {
      setErrorMessage('Danh sách xem trước đang trống.');
      return;
    }
    if (!chuDeId) {
      setErrorMessage('Chưa chọn chủ đề để lưu câu hỏi.');
      return;
    }

    // Validate nhanh xem có ô nào bị bỏ trống không
    const hasEmptyField = previewList.some(
      (q) =>
        !q.noiDung.trim() ||
        !q.dapAnA.trim() ||
        !q.dapAnB.trim() ||
        !q.dapAnC.trim() ||
        !q.dapAnD.trim()
    );

    if (hasEmptyField) {
      setErrorMessage('Có câu hỏi hoặc đáp án đang bị để trống trong bảng. Vui lòng kiểm tra lại trước khi lưu.');
      return;
    }

    setSaving(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const savedCount = await luuHangLoatCauHoi(chuDeId, previewList);
      setSuccessMessage(`Đã lưu thành công ${savedCount} câu hỏi vào CSDL!`);
      setPreviewList([]); // Clear state preview
      onSuccess(); // Refresh danh sách câu hỏi của màn hình chính
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Lưu câu hỏi thất bại. Kiểm tra backend.';
      setErrorMessage(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl p-5 mb-5 shadow-sm border border-slate-100">
      {/* Header khu vực AI Generator */}
      <div className="mb-4 pb-3 border-b border-slate-100">
        <h3 className="font-bold text-slate-800 text-base flex items-center gap-2">
          <span>✨</span> Tạo câu hỏi tự động bằng AI (Prompt Engineering)
        </h3>
        <p className="text-xs text-slate-500 mt-0.5">
          Nhập chủ đề, AI sẽ tự động sinh các câu hỏi trắc nghiệm chất lượng. Bạn có thể xem trước, chỉnh sửa trực tiếp trước khi bấm lưu.
        </p>
      </div>

      {/* Form cấu hình sinh câu hỏi */}
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 mb-4 items-end">
        <div className="sm:col-span-6">
          <label className="block text-xs font-bold text-slate-600 mb-1">
            Chủ đề / Từ khóa câu hỏi
          </label>
          <input
            type="text"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="Ví dụ: Lịch sử Việt Nam thế kỷ 20, Java Core..."
            className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-indigo-400"
          />
        </div>

        <div className="sm:col-span-2">
          <label className="block text-xs font-bold text-slate-600 mb-1">
            Số lượng câu
          </label>
          <select
            value={count}
            onChange={(e) => setCount(Number(e.target.value))}
            className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-indigo-400 bg-white"
          >
            <option value={3}>3 câu</option>
            <option value={5}>5 câu</option>
            <option value={10}>10 câu</option>
          </select>
        </div>

        <div className="sm:col-span-2">
          <label className="block text-xs font-bold text-slate-600 mb-1">
            Độ khó
          </label>
          <select
            value={doKho}
            onChange={(e) => setDoKho(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-indigo-400 bg-white"
          >
            <option value="Cơ bản">Cơ bản</option>
            <option value="Trung bình">Trung bình</option>
            <option value="Nâng cao">Nâng cao</option>
          </select>
        </div>

        <div className="sm:col-span-2">
          <button
            type="button"
            onClick={handleGenerate}
            disabled={loading || saving}
            className="w-full py-2 px-3 rounded-xl text-xs font-bold text-white shadow-sm transition-opacity flex items-center justify-center gap-1.5 cursor-pointer"
            style={{ background: '#6C5CE7', opacity: loading ? 0.7 : 1 }}
          >
            {loading ? (
              <>
                <svg className="animate-spin h-3.5 w-3.5 text-white" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                Đang tạo...
              </>
            ) : (
              '⚡ Sinh câu hỏi'
            )}
          </button>
        </div>
      </div>

      {/* Thông báo lỗi & thành công */}
      {errorMessage && (
        <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-xs font-semibold flex items-center gap-2">
          <span>⚠️</span>
          <span>{errorMessage}</span>
        </div>
      )}

      {successMessage && (
        <div className="mb-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold flex items-center gap-2">
          <span>✅</span>
          <span>{successMessage}</span>
        </div>
      )}

      {/* Bảng Preview câu hỏi do AI sinh ra (cho phép sửa trực tiếp) */}
      {previewList.length > 0 && (
        <div className="mt-4 pt-4 border-t border-slate-100">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-slate-800">
                📋 Bảng xem trước & chỉnh sửa ({previewList.length} câu)
              </span>
              <span className="text-[11px] text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                Chưa lưu vào DB
              </span>
            </div>

            <button
              type="button"
              onClick={handleSaveAll}
              disabled={saving}
              className="px-4 py-2 rounded-xl text-xs font-bold text-white shadow-sm transition-opacity flex items-center gap-1.5 cursor-pointer"
              style={{ background: '#10b981', opacity: saving ? 0.7 : 1 }}
            >
              {saving ? (
                <>
                  <svg className="animate-spin h-3.5 w-3.5 text-white" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  Đang lưu...
                </>
              ) : (
                '💾 Lưu tất cả vào CSDL'
              )}
            </button>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                  <th className="p-2.5 w-10 text-center">#</th>
                  <th className="p-2.5 min-w-[240px]">Nội dung câu hỏi</th>
                  <th className="p-2.5 min-w-[130px]">Đáp án A</th>
                  <th className="p-2.5 min-w-[130px]">Đáp án B</th>
                  <th className="p-2.5 min-w-[130px]">Đáp án C</th>
                  <th className="p-2.5 min-w-[130px]">Đáp án D</th>
                  <th className="p-2.5 w-24 text-center">Đúng</th>
                  <th className="p-2.5 w-12 text-center">Xóa</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {previewList.map((item, index) => (
                  <tr key={index} className="hover:bg-slate-50/50 transition-colors">
                    <td className="p-2.5 text-center font-bold text-slate-400">
                      {index + 1}
                    </td>

                    {/* Ô sửa nội dung câu hỏi */}
                    <td className="p-2.5">
                      <textarea
                        value={item.noiDung}
                        onChange={(e) => handleUpdateItem(index, 'noiDung', e.target.value)}
                        rows={2}
                        className="w-full p-2 border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none focus:border-indigo-400 resize-none bg-white"
                        placeholder="Nội dung câu hỏi..."
                      />
                    </td>

                    {/* Ô sửa Đáp án A */}
                    <td className="p-2.5">
                      <input
                        type="text"
                        value={item.dapAnA}
                        onChange={(e) => handleUpdateItem(index, 'dapAnA', e.target.value)}
                        className={`w-full p-1.5 border rounded-lg text-xs focus:outline-none ${
                          item.dapAnDung === 'A'
                            ? 'border-emerald-400 bg-emerald-50/50 text-emerald-800 font-bold'
                            : 'border-slate-200 bg-white'
                        }`}
                        placeholder="Đáp án A"
                      />
                    </td>

                    {/* Ô sửa Đáp án B */}
                    <td className="p-2.5">
                      <input
                        type="text"
                        value={item.dapAnB}
                        onChange={(e) => handleUpdateItem(index, 'dapAnB', e.target.value)}
                        className={`w-full p-1.5 border rounded-lg text-xs focus:outline-none ${
                          item.dapAnDung === 'B'
                            ? 'border-emerald-400 bg-emerald-50/50 text-emerald-800 font-bold'
                            : 'border-slate-200 bg-white'
                        }`}
                        placeholder="Đáp án B"
                      />
                    </td>

                    {/* Ô sửa Đáp án C */}
                    <td className="p-2.5">
                      <input
                        type="text"
                        value={item.dapAnC}
                        onChange={(e) => handleUpdateItem(index, 'dapAnC', e.target.value)}
                        className={`w-full p-1.5 border rounded-lg text-xs focus:outline-none ${
                          item.dapAnDung === 'C'
                            ? 'border-emerald-400 bg-emerald-50/50 text-emerald-800 font-bold'
                            : 'border-slate-200 bg-white'
                        }`}
                        placeholder="Đáp án C"
                      />
                    </td>

                    {/* Ô sửa Đáp án D */}
                    <td className="p-2.5">
                      <input
                        type="text"
                        value={item.dapAnD}
                        onChange={(e) => handleUpdateItem(index, 'dapAnD', e.target.value)}
                        className={`w-full p-1.5 border rounded-lg text-xs focus:outline-none ${
                          item.dapAnDung === 'D'
                            ? 'border-emerald-400 bg-emerald-50/50 text-emerald-800 font-bold'
                            : 'border-slate-200 bg-white'
                        }`}
                        placeholder="Đáp án D"
                      />
                    </td>

                    {/* Dropdown chọn đáp án đúng */}
                    <td className="p-2.5 text-center">
                      <select
                        value={item.dapAnDung}
                        onChange={(e) => handleUpdateItem(index, 'dapAnDung', e.target.value)}
                        className="p-1.5 border border-slate-200 rounded-lg text-xs font-bold text-indigo-600 bg-indigo-50/40 focus:outline-none"
                      >
                        <option value="A">A</option>
                        <option value="B">B</option>
                        <option value="C">C</option>
                        <option value="D">D</option>
                      </select>
                    </td>

                    {/* Nút xóa câu hỏi khỏi preview */}
                    <td className="p-2.5 text-center">
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(index)}
                        className="p-1 text-slate-400 hover:text-red-500 rounded hover:bg-red-50 transition-colors"
                        title="Xóa câu hỏi này"
                      >
                        🗑️
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

