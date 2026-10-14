# Giai đoạn D — Nâng cấp Admin

**Cập nhật 14/10/2026:** báo cáo dưới đây ghi trạng thái triển khai ban đầu ngày 13/10. Xem [RELEASE_REPORT.md](RELEASE_REPORT.md) và [DEPLOYMENT_RUNBOOK.md](DEPLOYMENT_RUNBOOK.md) cho kết quả QA/sửa lỗi hiện tại: PostgreSQL test riêng đã chạy, thêm E2E Desktop/Mobile, cấu hình schema mặc định đổi sang validate và seed tắt. Migration/deploy Production vẫn chưa được thực hiện.

Ngày: 13/10/2026. Đã triển khai source và chạy kiểm thử/build cục bộ. Chưa push hoặc deploy; chưa chạy migration trên database cấu hình.

## Hiện trạng trước triển khai

- Frontend: React 19, TypeScript, Vite; Backend: Spring Boot 3.3, Java 17, JPA, PostgreSQL theo `pom.xml` và `application.properties`.
- Không có Flyway/Liquibase; schema đang dùng `spring.jpa.hibernate.ddl-auto=update`.
- Nhóm môn chỉ là chuỗi `chu_de.danh_muc`. Admin CRUD câu hỏi chỉ có giao diện trắc nghiệm; cập nhật Backend chưa lưu loại câu và giải thích.
- Giai đoạn C đã có `TRAC_NGHIEM`, `DIEN_TU`, `SAP_XEP`, draft, điều hướng câu, nộp bài và chấm điểm server. Giữ công thức: 100 điểm đúng + 10 × số giây còn lại trong giới hạn 20 giây.
- Import Excel cũ lưu trực tiếp các dòng hợp lệ. API lấy câu hỏi quản trị có đáp án đã được bảo vệ bằng role ADMIN.
- Có sửa đổi Giai đoạn C chưa commit từ trước. Báo cáo này liệt kê riêng phần D; không coi toàn bộ `git diff` là thay đổi mới.

## Thực hiện

### Nhóm môn

`nhom_mon` có tên, trạng thái hiện/ẩn và thứ tự. Public API chỉ trả nhóm hiện, sắp xếp theo thứ tự rồi ID; Admin xem tất cả. Không chấp nhận nhóm tên “Tất cả”, tên trống/trùng hoặc thứ tự âm. Xóa nhóm có chủ đề trả 409. Đổi tên nhóm cập nhật cả `danh_muc` cũ trong transaction.

Chủ đề liên kết nhóm bằng FK `nhom_mon_id`. Client cũ gửi `danhMuc` vẫn được giải quyết thành nhóm hợp lệ. Frontend lấy danh sách nhóm từ Backend; “Tất cả” là bộ lọc tổng hợp, không lưu thành nhóm. Ẩn nhóm loại nhóm khỏi các tab lọc; chủ đề vẫn có thể xuất hiện trong bộ lọc tổng hợp.

### Ba dạng câu hỏi

Admin → Câu hỏi có form tạo/sửa/xóa/xem trước, lựa chọn loại, giải thích và token/đáp án động.

- Trắc nghiệm: đúng 4 lựa chọn A/B/C/D, đúng 1 đáp án đúng.
- Điền từ: 1–100 đáp án được chấp nhận; mọi mục được đánh dấu đúng. Chấm điểm tiếp tục NFC, bỏ khoảng trắng thừa, không phân biệt hoa/thường, giữ dấu tiếng Việt/chữ Hán.
- Sắp xếp: ít nhất 2, tối đa 100 token; thứ tự đúng liên tục 0…n−1, không trùng vị trí. Token có thể trùng nội dung nhưng có ID riêng.
- Nội dung câu và từng đáp án/token không được trống; đáp án/token tối đa 500 ký tự. Cả Frontend và Backend validate. Bulk AI/Excel cũ cũng kiểm tra dữ liệu trước lưu.
- Sửa câu cập nhật loại/giải thích, xóa orphan đáp án cũ. Thứ tự lựa chọn đọc ổn định theo thứ tự/ID; câu tạo mới không có thứ tự được nối sau câu hiện có.

Không có dạng nối đáp án.

### Chính sách đề thi

Admin cấu hình trong mục Câu hỏi sau khi chọn chủ đề:

- `hienDapAnSauNop`: true → review đáp án/giải thích; false → Backend trả `danhSachCauHoi=[]`, chỉ có điểm và thống kê tổng hợp.
- `choPhepXemDapAn`: cho phép kiểm tra từng câu qua API luyện tập cho cả ba dạng. Khi tắt, server trả 403 dù gọi trực tiếp API. Giao diện có nút “Xem đáp án luyện tập”.
- `xaoTronCauHoi`, `xaoTronLuaChon`: xáo trộn trên server, giữ nguyên ID. Token sắp xếp tiếp tục xáo trộn như Giai đoạn C.
- Endpoint làm bài không trả flag đúng, thứ tự token đúng, giải thích hay các đáp án điền từ. Các API quản trị có đáp án vẫn chỉ dành cho ADMIN.

Các flag mới để null khi request cũ không gửi chúng, nhằm giữ cấu hình khi sửa chủ đề bằng client cũ. Null ở dữ liệu cũ có nghĩa hiện review sau nộp, không xáo trộn; luyện tập chỉ bật nếu `choPhepXemDapAn=true`.

### Import

Luồng giao diện: tải file → phân tích → hiển thị câu/cảnh báo → sửa hoặc bỏ câu → xác nhận lưu. Preview không gọi save. Confirm validate toàn bộ trước lưu, transaction rollback cả batch khi có lỗi lưu; không lưu câu không hợp lệ.

- `.xlsx`/`.xls`: parser Excel cũ vẫn được giữ. Mẫu cũ 6 cột tiếp tục hoạt động; mẫu mới 8 cột hỗ trợ ba dạng.
- `.docx`: Apache POI XWPF.
- `.pdf`: PDFBox 3.0.3, đọc lớp chữ; PDF không có chữ trả cảnh báo, không OCR.
- Admin-only ở Backend; kiểm tra đuôi file, dung lượng tối đa 10 MB, nội dung phải đọc được bằng parser thực của định dạng. File giả mạo/hỏng không được lưu.
- Cung cấp mẫu tải xuống XLSX và DOCX cho mỗi dạng. PDF có thể được xuất từ mẫu DOCX với font hỗ trợ Unicode và có lớp chữ.
- API Excel cũ vẫn tồn tại để tương thích; giao diện import mới dùng preview/confirm. Tạo câu hỏi AI vẫn được giữ.

Định dạng XLSX mới: `TYPE | QUESTION | A | B | C | D | ANSWER | EXPLANATION`. Trắc nghiệm ANSWER là A/B/C/D; điền từ dùng `|` giữa đáp án được chấp nhận; sắp xếp dùng `|` giữa token theo thứ tự đúng. Không dùng dấu `|` bên trong một đáp án/token của mẫu này.

Word/PDF dùng từng dòng `KEY: nội dung`. Các câu cách nhau bằng một dòng `---`. Ví dụ:

```text
TYPE: DIEN_TU
QUESTION: 中国 nghĩa là gì?
ANSWER: Trung Quốc|中国
EXPLANATION: Ví dụ Unicode
---
TYPE: SAP_XEP
QUESTION: Sắp xếp câu tiếng Trung
ANSWER: 我|学习|中文
```

Trắc nghiệm thêm các dòng `A:`, `B:`, `C:`, `D:` và `ANSWER: A`. Parser không đoán đáp án từ văn bản tùy ý. Câu parse được nhưng dữ liệu sai được đưa vào preview với cảnh báo để sửa; khối có khóa/loại không đọc được có cảnh báo và không tạo câu. Giải thích/câu hỏi trong mẫu Word/PDF là một dòng; file văn bản nhiều cột hoặc xuống dòng do dàn trang cần chuẩn hóa theo mẫu.

## API

| Method | Path | Quyền / chức năng |
|---|---|---|
| GET | `/api/nhom-mon` | Public, nhóm đang hiện |
| GET/POST | `/api/admin/nhom-mon` | ADMIN, danh sách/tạo nhóm |
| PUT/DELETE | `/api/admin/nhom-mon/{id}` | ADMIN, sửa/xóa nhóm |
| POST/PUT | `/api/chude`, `/api/chude/{id}` | ADMIN, nhóm và flag cấu hình mới |
| GET/POST/PUT/DELETE | `/api/cauhoi` và đường dẫn hiện có | ADMIN, CRUD 3 dạng |
| POST | `/api/admin/import/preview` | ADMIN, multipart `file`, `chuDeId`; trả `{questions,warnings}` |
| POST | `/api/admin/import/confirm` | ADMIN, JSON array entity shape câu hỏi; 1–1000 câu; trả số đã lưu |
| GET | `/api/admin/import/template?format=xlsx&type=DIEN_TU` | ADMIN; format xlsx/docx, type 3 enum |
| POST | `/api/choi/luyentap/{id}` | Public nhưng bị server chặn nếu chủ đề không cho luyện tập; payload như một câu trả lời nộp bài |
| GET/POST | API làm bài/nộp bài hiện có | Không đổi shape hay công thức điểm; điều chỉnh quyền trả review |

API CRUD câu hỏi tiếp tục có alias `/admin/cauhoi` và `/api/admin/cauhoi`. Các alias đều được kiểm thử ADMIN/USER/guest.

## Migration PostgreSQL

File: `backend/src/main/resources/db/migration/V20261013__phase_d.sql`.

**Đây là SQL chạy thủ công, không tự chạy bởi Flyway.** Trước khi dùng phiên bản mới trên database đã có dữ liệu: sao lưu, thử trên staging rồi chạy bằng công cụ PostgreSQL. Không khởi động JAR mới trên database production để thử vì cấu hình `ddl-auto=update` vẫn giữ nguyên.

Migration tạo 3 nhóm mặc định và nhóm từ danh mục cũ, thêm FK/flag, backfill chủ đề, giữ nguyên `danh_muc`, bổ sung cột loại/giải thích/thứ tự token nếu còn thiếu và mặc định null loại câu thành trắc nghiệm. Chủ đề không có danh mục hợp lệ được đưa vào Khoa học; Admin cần rà soát các chủ đề này. Không xóa câu hỏi, đáp án hoặc kết quả cũ.

Không có DB_URL staging riêng và kết nối chỉ đọc tới DB_URL hiện có thất bại (`SQLSTATE 08001`) cả khi chạy ngoài sandbox. Vì vậy chưa đọc được schema sống, chưa áp dụng/chạy thử migration PostgreSQL. Schema dự kiến dựa trên entity và cấu hình thực trong repository. H2 chỉ là dependency test, không đổi database ứng dụng.

`backend/tools/SchemaAudit.java` là tiện ích JDBC chỉ đọc `information_schema`, không in credentials. Có thể chạy bằng Java 17 với PostgreSQL driver trên classpath và các biến DB_URL/DB_USERNAME/DB_PASSWORD.

## File thay đổi của phần D

Backend mới:

- `entity/NhomMon.java`, `repository/NhomMonRepository.java`.
- `service/NhomMonService.java`, `QuestionValidator.java`, `QuestionImportService.java`.
- `controller/NhomMonController.java`, `QuestionImportController.java`, `AdminValidationAdvice.java`.
- Migration SQL nói trên; tiện ích `backend/tools/SchemaAudit.java`.
- Tests `PhaseDServiceTest.java`, `PhaseDPersistenceTest.java`, `PhaseDSecurityTest.java`.

Backend chỉnh sửa: `pom.xml` (PDFBox; H2 test-only), `entity/ChuDe.java`, `entity/CauHoi.java` (thứ tự collection), `service/CauHoiService.java`, `ChuDeService.java`, `QuizPlayService.java`, `controller/CauHoiController.java`, `QuizPlayController.java`, `config/SecurityConfig.java`.

Frontend mới: `components/PhaseDAdmin.tsx`, `validation/question.ts`, `tests/phase-d.test.cjs`.

Frontend chỉnh sửa: `services/api.ts`, `screens/AdminScreen.tsx`, `HomeScreen.tsx`, `QuizScreen.tsx`, `ResultScreen.tsx`, `adapters.ts`, `index.css`, `package.json` (script test). `.gitignore` thêm cache Maven cục bộ.

Các thay đổi Giai đoạn C đã có trước trong QuestionSeeder, DTO nộp bài, DapAn, QuizPlayServiceTest và các màn hình vẫn được giữ. Không sửa file HTTP, cấu hình production frontend hay root package-lock của người dùng.

## Kết quả kiểm thử

| Kiểm tra | Kết quả |
|---|---|
| Backend `mvn package` (bao gồm test) | PASS; JAR `backend/target/app-0.0.1-SNAPSHOT.jar` |
| Backend JUnit | 28 test PASS, 0 fail/error/skip |
| Frontend `npm test` | 4 test PASS |
| Frontend `npm run build` | PASS; `frontend/dist` |
| TypeScript `tsc --noEmit` | PASS |
| Kết nối/schema PostgreSQL | Chưa xác minh; SQLSTATE 08001 |

Phạm vi test: CRUD 3 dạng; từ chối dữ liệu sai; CRUD/ẩn nhóm, đổi tên đồng bộ danh mục và chặn xóa nhóm đang dùng; điểm sau tạo câu; score-only không trả review; quyền luyện tập; payload không lộ key; ID khi xáo trộn; Excel mẫu cũ; round-trip mẫu XLSX/DOCX 3 dạng có Việt/Hán; PDF lớp chữ/không chữ/file hỏng/sai đuôi/quá dung lượng; quyền ADMIN/Customer/guest cho API và alias; transaction import rollback; JPA orphan/cascade; kiểm thử Giai đoạn C/chat cũ.

H2 xác nhận hành vi JPA/transaction, không thay thế thử migration trên PostgreSQL. Test PDF sinh lớp chữ bằng ASCII; Unicode được test trực tiếp trong DOCX/XLSX và chấm điểm, còn PDF Việt/Hán thực tế cần kiểm tra font/lớp chữ của file nguồn. Chưa chạy E2E trình duyệt với Backend/PostgreSQL thật hoặc kiểm tra giao diện bằng ảnh render.

## Giới hạn và việc cần xác minh trên staging

- Chạy migration PostgreSQL và kiểm tra nhóm của các chủ đề không có danh mục cũ; seed mặc định từ SQL nên cần chạy migration trước khi sử dụng quản lý nhóm trên database mới.
- Kiểm tra file Word/PDF thực tế theo mẫu, đặc biệt PDF Unicode/multiple-column/line-wrap. Không hỗ trợ scan/OCR hay tự suy luận mọi bố cục tài liệu.
- API confirm có giới hạn 1000 câu/batch; chia file lớn thành nhiều batch. Preview chưa có phân trang.
- Import Excel cũ vẫn là endpoint lưu trực tiếp dành cho Admin để giữ tương thích; UI mới sử dụng đầy đủ bước xem trước/xác nhận.
- Không push main hoặc deploy production.

Tài liệu API thư viện đã đối chiếu: [POI XWPF](https://poi.apache.org/components/document/quick-guide-xwpf.html), [PDFBox 3 migration/API Loader](https://pdfbox.apache.org/3.0/migration.html).
