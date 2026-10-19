import { validateQuestion } from "../validation/question";
import { useEffect, useState } from "react";
import * as api from "../services/api";
import type { Topic } from "../data";
import AiQuestionGenerator from "./AiQuestionGenerator";
type Kind = NonNullable<api.CauHoiAdmin["loaiCauHoi"]>;
const kinds: Kind[] = ["TRAC_NGHIEM", "DIEN_TU", "SAP_XEP"];
const labels = {
  TRAC_NGHIEM: "Trắc nghiệm A/B/C/D",
  DIEN_TU: "Điền từ",
  SAP_XEP: "Sắp xếp câu",
};
const empty = (id: number, kind: Kind = "TRAC_NGHIEM"): api.CauHoiAdmin => ({
  noiDungCauHoi: "",
  loaiCauHoi: kind,
  giaiThich: "",
  chuDe: { id },
  danhSachDapAn: Array.from(
    { length: kind === "TRAC_NGHIEM" ? 4 : kind === "DIEN_TU" ? 1 : 2 },
    (_, i) => ({
      noiDung: "",
      laDapAnDung: kind === "DIEN_TU" || (kind === "TRAC_NGHIEM" && i === 0),
      thuTu: i,
    }),
  ),
});
function Editor({
  q,
  change,
}: {
  q: api.CauHoiAdmin;
  change: (q: api.CauHoiAdmin) => void;
}) {
  const kind = q.loaiCauHoi || "TRAC_NGHIEM";
  return (
    <div className="space-y-2">
      <select
        aria-label="Dạng câu hỏi"
        value={kind}
        onChange={(e) =>
          change({
            ...empty(q.chuDe.id, e.target.value as Kind),
            id: q.id,
            noiDungCauHoi: q.noiDungCauHoi,
            giaiThich: q.giaiThich,
          })
        }
      >
        {kinds.map((k) => (
          <option key={k} value={k}>
            {labels[k]}
          </option>
        ))}
      </select>
      <label className="block">Nội dung câu hỏi *</label>
      <textarea
        aria-label="Nội dung câu hỏi"
        placeholder="Nội dung câu hỏi"
        value={q.noiDungCauHoi}
        onChange={(e) => change({ ...q, noiDungCauHoi: e.target.value })}
      />
      {kind === "SAP_XEP" && (
        <p>
          Nhập token theo thứ tự đúng từ trên xuống. Cho phép token lặp nội
          dung.
        </p>
      )}
      {kind === "DIEN_TU" && (
        <p>
          Mỗi dòng là một đáp án được chấp nhận. Giữ nguyên dấu tiếng Việt và
          chữ Hán.
        </p>
      )}
      {kind === "TRAC_NGHIEM" && <p>Đánh dấu tất cả đáp án đúng. Người làm bài phải chọn đủ và không chọn thừa.</p>}
      {q.danhSachDapAn.map((a, i) => (
        <div className="flex gap-2" key={i}>
          {kind === "TRAC_NGHIEM" && (
            <input
              aria-label={`Đáp án đúng ${i + 1}`}
              type="checkbox"
              checked={a.laDapAnDung}
              onChange={() =>
                change({
                  ...q,
                  danhSachDapAn: q.danhSachDapAn.map((v, n) => ({
                    ...v,
                    laDapAnDung: i === n ? !v.laDapAnDung : v.laDapAnDung,
                  })),
                })
              }
            />
          )}
          <span>
            {kind === "TRAC_NGHIEM" ? String.fromCharCode(65 + i) : i + 1}
          </span>
          <input
            aria-label={`Đáp án/token ${i + 1}`}
            maxLength={500}
            value={a.noiDung}
            onChange={(e) =>
              change({
                ...q,
                danhSachDapAn: q.danhSachDapAn.map((v, n) =>
                  n === i ? { ...v, noiDung: e.target.value } : v,
                ),
              })
            }
          />
          {kind !== "TRAC_NGHIEM" && (
            <button
              onClick={() =>
                change({
                  ...q,
                  danhSachDapAn: q.danhSachDapAn
                    .filter((_, n) => n !== i)
                    .map((v, n) => ({ ...v, thuTu: n })),
                })
              }
            >
              Bỏ
            </button>
          )}
        </div>
      ))}
      {kind !== "TRAC_NGHIEM" && (
        <button
          onClick={() =>
            change({
              ...q,
              danhSachDapAn: [
                ...q.danhSachDapAn,
                {
                  noiDung: "",
                  laDapAnDung: kind === "DIEN_TU",
                  thuTu: q.danhSachDapAn.length,
                },
              ],
            })
          }
        >
          + Đáp án/token
        </button>
      )}
      <label className="block">Giải thích (tùy chọn)</label>
      <textarea
        aria-label="Giải thích"
        placeholder="Giải thích"
        value={q.giaiThich || ""}
        onChange={(e) => change({ ...q, giaiThich: e.target.value })}
      />
      <details className="admin-compact-preview">
        <summary>Xem trước</summary>
        <p>{q.noiDungCauHoi}</p>
        {kind === "DIEN_TU" ? (
          <input disabled placeholder="Người chơi nhập từ" />
        ) : (
          q.danhSachDapAn.map((a, i) => (
            <button disabled key={i}>
              {kind === "TRAC_NGHIEM" ? `${String.fromCharCode(65 + i)}. ` : ""}
              {a.noiDung}
            </button>
          ))
        )}
        <p>
          Đáp án:{" "}
          {q.danhSachDapAn
            .filter((a) => kind === "SAP_XEP" || a.laDapAnDung)
            .map((a) => a.noiDung)
            .join(kind === "SAP_XEP" ? " " : " / ")}
        </p>
        <p>{q.giaiThich}</p>
      </details>
    </div>
  );
}
export default function PhaseDAdmin({
  topics,
  onChanged,
  page,
  onNavigate,
}: {
  topics: Topic[];
  onChanged: () => void;
  page: string;
  onNavigate: (page: string) => void;
}) {
  const [groups, setGroups] = useState<api.NhomMon[]>([]);
  const [group, setGroup] = useState<Omit<api.NhomMon, "id"> & { id?: number }>(
    { ten: "", hienThi: true, thuTu: 0 },
  );
  const [topicId, setTopicId] = useState(topics[0]?.id || "");
  const [config, setConfig] = useState<api.ChuDeDTO | null>(null);
  const [questions, setQuestions] = useState<api.CauHoiAdmin[]>([]);
  const [draft, setDraft] = useState(empty(Number(topicId)));
  const [preview, setPreview] = useState<api.CauHoiAdmin[] | null>(null);
  const [templateKind, setTemplateKind] = useState<Kind>("TRAC_NGHIEM");
  const [fileName, setFileName] = useState("");
  const [warnings, setWarnings] = useState<string[]>([]);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  async function act(work: () => Promise<void>) {
    setBusy(true);
    setMessage("");
    try {
      await work();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Thao tác thất bại");
    } finally {
      setBusy(false);
    }
  }
  async function loadGroups() {
    setGroups(await api.layNhomMon(true));
  }
  async function loadQuestions() {
    setQuestions(await api.layCauHoiTheoChuDe(topicId));
  }
  useEffect(() => {
    act(loadGroups);
  }, []);
  useEffect(() => {
    if (!topicId && topics.length) setTopicId(topics[0].id);
  }, [topics, topicId]);
  useEffect(() => {
    if (!topicId) return;
    let alive = true;
    setPreview(null);
    setWarnings([]);
    setDraft(empty(Number(topicId)));
    setConfig(null);
    act(async () => {
      const [c, qs] = await Promise.all([
        api.layChuDe(topicId),
        api.layCauHoiTheoChuDe(topicId),
      ]);
      if (alive) {
        setConfig(c);
        setQuestions(qs);
      }
    });
    return () => {
      alive = false;
    };
  }, [topicId]);
  const [search, setSearch] = useState("");
  const [kindFilter, setKindFilter] = useState("");
  const [listPage, setListPage] = useState(1);
  async function importFile(file?: File) {
    if (!file || busy) return;
    setPreview(null);
    setWarnings([]);
    setFileName(file.name);
    await act(async () => {
      if (
        !topicId ||
        file.size > 10 * 1024 * 1024 ||
        !/\.(xlsx?|docx|pdf)$/i.test(file.name)
      )
        throw new Error("Chọn chủ đề và file hợp lệ không quá 10 MB");
      const result = await api.xemTruocImport(file, Number(topicId));
      setPreview(result.questions);
      setWarnings(result.warnings);
    });
  }
  const filtered = questions.filter(
    (q) =>
      (!kindFilter || (q.loaiCauHoi || "TRAC_NGHIEM") === kindFilter) &&
      q.noiDungCauHoi.toLocaleLowerCase().includes(search.toLocaleLowerCase()),
  );
  const pages = Math.max(1, Math.ceil(filtered.length / 10));
  const currentPage = Math.min(listPage, pages);
  return (
    <div className="phase-d space-y-6 text-white">
      <p role="status" aria-live="polite">
        {busy ? "Đang xử lý…" : message}
      </p>
      <fieldset disabled={busy} className="space-y-6">
        {!topics.length && page !== "Quản lý môn học" && (
          <p>Tạo chủ đề trong Quản lý môn học để bắt đầu.</p>
        )}
        {page === "Quản lý môn học" && (
          <section>
            <h2>Quản lý nhóm môn</h2>
            <input
              aria-label="Tên nhóm"
              placeholder="Tên nhóm"
              maxLength={50}
              value={group.ten}
              onChange={(e) => setGroup({ ...group, ten: e.target.value })}
            />
            <input
              aria-label="Thứ tự nhóm"
              type="number"
              min={0}
              value={group.thuTu}
              onChange={(e) =>
                setGroup({ ...group, thuTu: Number(e.target.value) })
              }
            />
            <label>
              <input
                type="checkbox"
                checked={group.hienThi}
                onChange={(e) =>
                  setGroup({ ...group, hienThi: e.target.checked })
                }
              />{" "}
              Hiện nhóm
            </label>
            <button
              onClick={() =>
                act(async () => {
                  if (
                    !group.ten.trim() ||
                    group.ten.trim().toLowerCase() === "tất cả" ||
                    !Number.isInteger(group.thuTu) ||
                    group.thuTu < 0
                  )
                    throw new Error("Tên/thứ tự nhóm không hợp lệ");
                  await api.luuNhomMon(group);
                  setGroup({ ten: "", hienThi: true, thuTu: 0 });
                  await loadGroups();
                  onChanged();
                })
              }
            >
              Lưu nhóm
            </button>
            <button
              onClick={() => setGroup({ ten: "", hienThi: true, thuTu: 0 })}
            >
              Nhóm mới
            </button>
            {[...groups]
              .sort((a, b) => a.thuTu - b.thuTu)
              .map((g) => (
                <div className="admin-group-row" key={g.id}>
                  <span className="admin-group-name">
                    <small>{g.thuTu}</small> {g.ten}
                  </span>
                  <span className="admin-badge">
                    {g.hienThi ? "Hiện" : "Ẩn"}
                  </span>
                  <button
                    aria-label={`Sửa nhóm ${g.ten}`}
                    onClick={() => setGroup(g)}
                  >
                    ✎
                  </button>
                  <button
                    aria-label={`Ẩn/hiện nhóm ${g.ten}`}
                    onClick={() =>
                      act(async () => {
                        await api.luuNhomMon({ ...g, hienThi: !g.hienThi });
                        await loadGroups();
                        onChanged();
                      })
                    }
                  >
                    ◉
                  </button>
                  <button
                    className="admin-danger"
                    aria-label={`Xóa nhóm ${g.ten}`}
                    onClick={() =>
                      act(async () => {
                        if (!confirm("Xóa nhóm này?")) return;
                        await api.xoaNhomMon(g.id);
                        await loadGroups();
                        onChanged();
                      })
                    }
                  >
                    ×
                  </button>
                </div>
              ))}
          </section>
        )}
        {page !== "Quản lý môn học" && (
          <label className="admin-topic-select">
            Chủ đề{" "}
            <select
              value={topicId}
              onChange={(e) => setTopicId(e.target.value)}
            >
              {topics.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </label>
        )}
        {page === "Cấu hình đề thi" && config && (
          <section>
            <h2>Cấu hình đề thi</h2>
            <label>
              Nhóm{" "}
              <select
                value={config.nhomMon?.id || ""}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    nhomMon: { id: Number(e.target.value) },
                  })
                }
              >
                <option value="">Chọn nhóm</option>
                {groups.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.ten}
                  </option>
                ))}
              </select>
            </label>
            {(
              [
                [
                  "hienDapAnSauNop",
                  "Hiện đáp án và giải thích sau nộp (tắt: chỉ hiện điểm)",
                ],
                ["choPhepXemDapAn", "Cho xem đáp án từng câu khi luyện tập"],
                ["xaoTronCauHoi", "Xáo trộn câu hỏi"],
                ["xaoTronLuaChon", "Xáo trộn lựa chọn trắc nghiệm"],
              ] as const
            ).map(([key, label]) => (
              <label className="admin-setting-row" key={key}>
                <input
                  type="checkbox"
                  checked={config[key] ?? key === "hienDapAnSauNop"}
                  onChange={(e) =>
                    setConfig({ ...config, [key]: e.target.checked })
                  }
                />{" "}
                {label}
              </label>
            ))}
            <button
              onClick={() =>
                act(async () => {
                  if (!config.nhomMon?.id) throw new Error("Chọn nhóm");
                  await api.capNhatChuDe(Number(topicId), config);
                  onChanged();
                  setMessage("Đã lưu cấu hình");
                })
              }
            >
              Lưu cấu hình
            </button>
          </section>
        )}
        {page === "Tạo câu hỏi" && (
          <section className="admin-editor-grid">
            <div>
              <h2>{draft.id ? "Sửa câu hỏi" : "Tạo câu hỏi"}</h2>
              <Editor q={draft} change={setDraft} />
              <button
                onClick={() =>
                  act(async () => {
                    const error = validateQuestion(draft);
                    if (error) throw new Error(error);
                    if (draft.id) await api.capNhatCauHoi(draft.id, draft);
                    else await api.themCauHoi(draft);
                    setDraft(empty(Number(topicId)));
                    await loadQuestions();
                    onChanged();
                    setMessage("Đã lưu câu hỏi");
                    onNavigate("Danh sách câu hỏi");
                  })
                }
              >
                Lưu câu hỏi
              </button>
              <button onClick={() => setDraft(empty(Number(topicId)))}>
                Hủy / Câu mới
              </button>
            </div>
            <aside className="admin-live-preview">
              <h2>◉ Xem trước câu hỏi</h2>
              <span className="admin-badge">
                {labels[draft.loaiCauHoi || "TRAC_NGHIEM"]}
              </span>
              <h3>
                {draft.noiDungCauHoi || "Nội dung câu hỏi sẽ xuất hiện tại đây"}
              </h3>
              {draft.loaiCauHoi === "DIEN_TU" ? (
                <input disabled placeholder="Người chơi nhập đáp án…" />
              ) : (
                draft.danhSachDapAn.map((a, i) => (
                  <div
                    className={`admin-preview-answer ${a.laDapAnDung && draft.loaiCauHoi !== "SAP_XEP" ? "correct" : ""}`}
                    key={i}
                  >
                    <b>
                      {draft.loaiCauHoi === "SAP_XEP"
                        ? i + 1
                        : String.fromCharCode(65 + i)}
                    </b>
                    {a.noiDung || "Nội dung lựa chọn"}
                  </div>
                ))
              )}
              <div className="admin-preview-explanation">
                <strong>Đáp án / thứ tự đúng</strong>
                <p>
                  {draft.danhSachDapAn
                    .filter(
                      (a) => draft.loaiCauHoi === "SAP_XEP" || a.laDapAnDung,
                    )
                    .map((a) => a.noiDung)
                    .join(" / ")}
                </p>
                <strong>Giải thích</strong>
                <p>{draft.giaiThich || "Chưa có giải thích"}</p>
              </div>
            </aside>
          </section>
        )}
        {page === "Danh sách câu hỏi" && (
          <section>
            <div className="admin-section-heading">
              <h2>Danh sách câu hỏi ({filtered.length})</h2>
              <button
                onClick={() => {
                  setDraft(empty(Number(topicId)));
                  onNavigate("Tạo câu hỏi");
                }}
              >
                + Tạo câu hỏi
              </button>
            </div>
            <div className="admin-filters">
              <input
                aria-label="Tìm kiếm câu hỏi"
                placeholder="Tìm nội dung câu hỏi…"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setListPage(1);
                }}
              />
              <select
                aria-label="Lọc loại câu hỏi"
                value={kindFilter}
                onChange={(e) => {
                  setKindFilter(e.target.value);
                  setListPage(1);
                }}
              >
                <option value="">Tất cả dạng câu hỏi</option>
                {kinds.map((k) => (
                  <option key={k} value={k}>
                    {labels[k]}
                  </option>
                ))}
              </select>
              <button onClick={() => onNavigate("Import câu hỏi")}>
                ↑ Import
              </button>
            </div>
            <div className="admin-table-scroll">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Nội dung câu hỏi</th>
                    <th>Loại câu hỏi</th>
                    <th>Hành động</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered
                    .slice((currentPage - 1) * 10, currentPage * 10)
                    .map((q, i) => (
                      <tr key={q.id}>
                        <td>{(currentPage - 1) * 10 + i + 1}</td>
                        <td>{q.noiDungCauHoi}</td>
                        <td>
                          <span className="admin-badge">
                            {labels[q.loaiCauHoi || "TRAC_NGHIEM"]}
                          </span>
                        </td>
                        <td>
                          <div className="admin-actions">
                            <button
                              onClick={() => {
                                setDraft({
                                  ...q,
                                  danhSachDapAn: [...q.danhSachDapAn].sort(
                                    (a, b) => (a.thuTu || 0) - (b.thuTu || 0),
                                  ),
                                });
                                onNavigate("Tạo câu hỏi");
                              }}
                            >
                              Sửa / Xem trước
                            </button>
                            <button
                              className="admin-danger"
                              onClick={() =>
                                act(async () => {
                                  if (!confirm("Xóa câu hỏi?")) return;
                                  await api.xoaCauHoi(q.id!);
                                  await loadQuestions();
                                  onChanged();
                                })
                              }
                            >
                              Xóa
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
            {!filtered.length && (
              <p className="admin-empty">
                Chưa có câu hỏi phù hợp. Tạo câu hỏi hoặc nhập từ file.
              </p>
            )}
            <div className="admin-pagination">
              <span>10 câu / trang</span>
              <button
                disabled={currentPage === 1}
                onClick={() => setListPage(currentPage - 1)}
              >
                ← Trước
              </button>
              <b>
                {currentPage} / {pages}
              </b>
              <button
                disabled={currentPage === pages}
                onClick={() => setListPage(currentPage + 1)}
              >
                Sau →
              </button>
            </div>
          </section>
        )}
        {page === "Import câu hỏi" && (
          <section className="admin-import">
            <h2>Import Excel / Word / PDF</h2>
            <p>
              Trắc nghiệm nhiều đáp án: cột ANSWER nhập A,C (hoặc A;C). Tối đa 10 MB. PDF cần có lớp chữ; không dùng OCR. Word/PDF: KEY:
              nội dung, các câu cách nhau bằng dòng ---. Tải mẫu để biết định
              dạng.
            </p>
            <div className="admin-import-grid">
              <div>
                <h3>1. Tải file lên</h3>
                <label
                  className="admin-dropzone"
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    importFile(e.dataTransfer.files[0]);
                  }}
                >
                  <strong>⇧ Kéo thả file vào đây</strong>
                  <span>hoặc chọn file Excel · Word DOCX · PDF</span>
                  <input
                    aria-label="File nhập câu hỏi"
                    type="file"
                    accept=".xls,.xlsx,.docx,.pdf"
                    onChange={(e) => {
                      importFile(e.target.files?.[0]);
                      e.target.value = "";
                    }}
                  />
                </label>
                {fileName && <p className="admin-file-name">▤ {fileName}</p>}
                <p>
                  File chỉ được phân tích. Hãy kiểm tra và chỉnh sửa bản xem
                  trước trước khi xác nhận lưu.
                </p>
              </div>
              <aside className="admin-import-guide">
                <h3>Hướng dẫn định dạng file</h3>
                <div className="admin-type-tabs">
                  {kinds.map((k) => (
                    <button
                      className={templateKind === k ? "selected" : ""}
                      key={k}
                      onClick={() => setTemplateKind(k)}
                    >
                      {labels[k]}
                    </button>
                  ))}
                </div>
                <p>Tải mẫu theo dạng câu hỏi đã chọn:</p>
                {["xlsx", "docx"].map((f) => (
                  <button
                    key={f}
                    onClick={() =>
                      act(async () => {
                        await api.taiMauImport(f, templateKind);
                      })
                    }
                  >
                    ↓ Mẫu {f}
                  </button>
                ))}
                <ul>
                  <li>File tối đa 10 MB.</li>
                  <li>PDF phải có lớp chữ, không dùng OCR.</li>
                  <li>Hỗ trợ tiếng Việt và chữ Hán Unicode.</li>
                  <li>Các câu Word/PDF cách nhau bằng dòng ---.</li>
                  <li>Chỉ lưu sau khi dữ liệu hợp lệ.</li>
                </ul>
                <p>
                  Nhập PDF: xuất file Word mẫu thành PDF có thể chọn và sao chép
                  chữ.
                </p>
              </aside>
            </div>
            {warnings.map((w, i) => (
              <p role="alert" key={i}>
                {w}
              </p>
            ))}
            {preview && (
              <>
                <h3>2. Kiểm tra và chỉnh sửa</h3>
                <p>
                  {preview.length} câu trong bản xem trước; chưa lưu. Sửa hoặc
                  bỏ câu trước khi xác nhận.
                </p>
                {preview.map((q, i) => (
                  <div className="admin-import-question" key={i}>
                    <h3>Câu {i + 1}</h3>
                    <Editor
                      q={q}
                      change={(v) =>
                        setPreview(preview.map((old, n) => (n === i ? v : old)))
                      }
                    />
                    <p>{validateQuestion(q)}</p>
                    <button
                      onClick={() =>
                        setPreview(preview.filter((_, n) => n !== i))
                      }
                    >
                      Bỏ câu
                    </button>
                  </div>
                ))}
                <button
                  disabled={
                    !preview.length || preview.some((q) => validateQuestion(q))
                  }
                  onClick={() =>
                    act(async () => {
                      const count = await api.xacNhanImport(preview);
                      setPreview(null);
                      setWarnings([]);
                      await loadQuestions();
                      onChanged();
                      setMessage(`Đã lưu ${count} câu`);
                    })
                  }
                >
                  Xác nhận lưu {preview.length} câu
                </button>
              </>
            )}
          </section>
        )}
        {page === "Tạo câu hỏi" && topicId && (
          <details className="admin-ai-panel">
            <summary>Tạo câu hỏi bằng AI</summary>
            <AiQuestionGenerator
              key={topicId}
              chuDeId={Number(topicId)}
              defaultTopicName={topics.find((t) => t.id === topicId)?.name}
              onSuccess={() => {
                loadQuestions().catch((e) => setMessage(e.message));
                onChanged();
              }}
            />
          </details>
        )}
      </fieldset>
    </div>
  );
}
