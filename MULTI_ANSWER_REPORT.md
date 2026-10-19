# Trắc nghiệm nhiều đáp án đúng — 19/10/2026

## Quy tắc

- Admin tạo/sửa câu trắc nghiệm với 4 lựa chọn, ít nhất 1 đáp án đúng; đánh dấu bằng checkbox.
- Người làm bài chọn đủ đáp án đúng, không chọn thừa mới được điểm. Không cho điểm từng phần.
- Câu một đáp án giữ cách chọn và cách tính điểm hiện tại; không thay đổi công thức điểm/timer.
- Import Excel (cả mẫu cũ và mới), Word DOCX, PDF có lớp chữ: đáp án `A,C`, `A;C`, hoặc `A|C`. Từ chối ký tự ngoài A–D, mục trùng, mục rỗng. Không OCR.
- File mẫu Excel/Word đã có ví dụ nhiều đáp án. Preview cho phép sửa cờ đáp án đúng trước khi lưu.

## API và dữ liệu

- GET `/api/choi/chude/{id}/cauhoi`: thêm `nhieuDapAn` để chọn chế độ; không trả ID đáp án đúng hoặc số lượng đáp án đúng cụ thể.
- POST `/api/choi/nopbai` và `/api/choi/luyentap/{id}` nhận `dapAnIds: number[]`. Giữ `dapAnId` cho client/câu cũ. Từ chối ID trùng, null, ngoài câu hỏi, dữ liệu mâu thuẫn giữa hai trường.
- Review sau nộp và snapshot Admin thêm `dapAnDaChonIds`, `dapAnDungIds`; giữ trường đơn cho câu một đáp án, fallback với snapshot cũ.
- Quyền Admin và chính sách ẩn đáp án vẫn do Backend kiểm soát. API luyện tập cũ chỉ gửi một đáp án không thể chấm đúng câu có nhiều đáp án đúng.
- Không cần migration: `dap_an.la_dap_an_dung` đã lưu độc lập cho từng lựa chọn; snapshot lưu JSON. Không sửa bài làm cũ.

## Phạm vi file

Backend: DTO chơi/nộp/review; QuizPlayService; QuestionValidator; QuestionImportService; ExcelCauHoiService; CauHoiService. Frontend: adapter, API types, editor/AI preview Admin, validator, quiz draft, QuizScreen, ResultScreen, AdminSubmissionScreen. Kiểm thử: MultiAnswerServiceTest, PhaseDServiceTest, FullStackQaIT, multi-answer.spec.ts, unit validation/draft.

## Kiểm thử

- TypeScript và build Frontend đạt; 9 unit test Frontend đạt.
- Backend: chấm đúng tập hợp; thiếu/thừa/sai/bỏ trống; ID sai/trùng/null; tương thích trường cũ; luyện tập và ẩn đáp án; Excel/DOCX/PDF nhập nhiều đáp án.
- 50 kiểm tra Backend đạt (48 test dịch vụ/bảo mật/schema và 2 FullStackQaIT); Backend package thành công.
- Playwright: 39 đạt, 1 bỏ qua có chủ đích (kiểm tra viewport Desktop trên Mobile). Kích thước 1366px, 1440px, 1920px và Mobile 390px.
- Luồng mới: Admin tải mẫu Excel/Word và preview nhiều đáp án; Admin tạo câu bằng checkbox; USER chọn/bỏ chọn, F5 khôi phục hai đáp án, nộp bài; kiểm tra kết quả và Admin xem snapshot hai lựa chọn. Kiểm tra thiếu/thừa/bỏ trống và USER bị từ chối API Admin.
- Test mẫu Excel cũ đã cập nhật từ 3 lên 4 dòng do bổ sung ví dụ `A,C`; kiểm tra riêng dòng mới có đúng 2 cờ đáp án đúng.

## Phát hành

Người dùng đã xác nhận deploy để test. Không cần migration hoặc thay đổi secret/domain. Backend Render phát hành trước Frontend Cloudflare; trạng thái cuối được ghi sau khi xác minh Production.
