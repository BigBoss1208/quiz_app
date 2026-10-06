import React, { useState, useRef } from 'react';
import { taiFileMauExcel, importCauHoiExcel, type ImportExcelResultDTO } from '../services/api';

interface Props {
  chuDeId: number;
  onSuccess: () => void;
}

export default function ExcelImportCard({ chuDeId, onSuccess }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [downloadingTemplate, setDownloadingTemplate] = useState(false);
  const [result, setResult] = useState<ImportExcelResultDTO | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDownloadTemplate = async () => {
    setDownloadingTemplate(true);
    setErrorMessage(null);
    try {
      await taiFileMauExcel();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Không thể tải file mẫu.';
      setErrorMessage(msg);
    } finally {
      setDownloadingTemplate(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0];
      if (!selected.name.endsWith('.xlsx')) {
        setErrorMessage('Vui lòng chọn file có định dạng Excel (.xlsx).');
        return;
      }
      setFile(selected);
      setErrorMessage(null);
      setResult(null);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const dropped = e.dataTransfer.files[0];
      if (!dropped.name.endsWith('.xlsx')) {
        setErrorMessage('Chỉ chấp nhận file định dạng Excel (.xlsx).');
        return;
      }
      setFile(dropped);
      setErrorMessage(null);
      setResult(null);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setErrorMessage('Vui lòng chọn file Excel trước khi bấm Tải lên.');
      return;
    }
    if (!chuDeId) {
      setErrorMessage('Chưa chọn chủ đề để thêm câu hỏi.');
      return;
    }

    setLoading(true);
    setErrorMessage(null);
    setResult(null);

    try {
      const res = await importCauHoiExcel(chuDeId, file);
      setResult(res);

      if (res.soCauThanhCong > 0) {
        onSuccess();
        // Reset file sau khi import thành công
        setFile(null);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Upload file thất bại. Kiểm tra kết nối backend.';
      setErrorMessage(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveFile = () => {
    setFile(null);
    setErrorMessage(null);
    setResult(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="bg-white rounded-2xl p-5 mb-5 shadow-sm border border-slate-100">
      {/* Header khu vực Import Excel */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-100">
        <div>
          <h3 className="font-bold text-slate-800 text-base flex items-center gap-2">
            <span>📥</span> Import câu hỏi hàng loạt từ Excel
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Tải lên file danh sách câu hỏi (.xlsx) theo định dạng chuẩn để nạp nhanh vào chủ đề.
          </p>
        </div>

        <button
          type="button"
          onClick={handleDownloadTemplate}
          disabled={downloadingTemplate}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 transition-colors self-start sm:self-auto cursor-pointer"
        >
          <span>📄</span>
          {downloadingTemplate ? 'Đang tải file...' : 'Tải file Excel mẫu (.xlsx)'}
        </button>
      </div>

      {/* Vùng Drag & Drop và File Input */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all ${
          isDragging
            ? 'border-indigo-500 bg-indigo-50/50 scale-[0.99]'
            : 'border-slate-200 hover:border-indigo-300 hover:bg-slate-50/60'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          onChange={handleFileChange}
          className="hidden"
        />

        <div className="flex flex-col items-center">
          <span className="text-3xl mb-2">📊</span>
          <p className="font-bold text-slate-700 text-sm">
            Kéo thả file Excel vào đây hoặc <span className="text-indigo-600 underline">bấm để chọn file</span>
          </p>
          <p className="text-xs text-slate-400 mt-1">Định dạng hỗ trợ: .xlsx (Dung lượng tối đa 10MB)</p>
        </div>
      </div>

      {/* Hiển thị File đã chọn */}
      {file && (
        <div className="mt-4 p-3 bg-slate-50 rounded-xl flex items-center justify-between border border-slate-200">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <span className="text-xl">📁</span>
            <div className="truncate">
              <p className="text-sm font-bold text-slate-800 truncate">{file.name}</p>
              <p className="text-xs text-slate-400">{(file.size / 1024).toFixed(1)} KB</p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              type="button"
              onClick={handleRemoveFile}
              disabled={loading}
              className="text-xs font-bold text-slate-400 hover:text-red-500 px-2 py-1 rounded-lg transition-colors"
            >
              Hủy chọn
            </button>
            <button
              type="button"
              onClick={handleUpload}
              disabled={loading}
              className="px-4 py-2 rounded-xl text-xs font-bold text-white shadow-sm transition-opacity flex items-center gap-1.5 cursor-pointer"
              style={{ background: '#6C5CE7', opacity: loading ? 0.7 : 1 }}
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-3.5 w-3.5 text-white" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  Đang xử lý...
                </>
              ) : (
                '🚀 Tải lên & Lưu CSDL'
              )}
            </button>
          </div>
        </div>
      )}

      {/* Thông báo lỗi tổng quát */}
      {errorMessage && (
        <div className="mt-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-xs font-semibold flex items-center gap-2">
          <span>⚠️</span>
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Hiển thị kết quả Import sau khi xử lý */}
      {result && (
        <div className="mt-4 space-y-2">
          {result.soCauThanhCong > 0 && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold flex items-center gap-2">
              <span>✅</span>
              <span>Đã thêm thành công {result.soCauThanhCong} câu hỏi vào chủ đề!</span>
            </div>
          )}

          {result.danhSachLoi && result.danhSachLoi.length > 0 && (
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs">
              <p className="font-bold mb-1 flex items-center gap-1">
                <span>⚠️</span> Phát hiện {result.danhSachLoi.length} dòng có lỗi (đã bỏ qua):
              </p>
              <ul className="list-disc list-inside space-y-0.5 text-[11px] text-amber-700 max-h-32 overflow-y-auto">
                {result.danhSachLoi.map((err, idx) => (
                  <li key={idx}>{err}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

