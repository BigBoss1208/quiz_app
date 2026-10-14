# Quiz ManhNhom — sửa lỗi và chuẩn bị deploy

Ngày bàn giao: 14/10/2026. Source bao gồm các thay đổi C/D chưa commit ban đầu cùng những sửa lỗi tìm được trong phiên QA này. Không đổi React/Spring Boot/PostgreSQL hoặc thêm dạng nối đáp án.

## Lỗi đã tìm thấy và sửa

| Lỗi | Nguyên nhân và sửa |
|---|---|
| PostgreSQL `08001` trong môi trường local | Log có `No suitable driver found`; DB_URL không có dạng JDBC PostgreSQL. Tiện ích SchemaAudit phân loại URL và ghi cause đã che credentials. Không kết luận DB Production hỏng từ lỗi local này. |
| Admin lấy câu hỏi trả 500 | Jackson serialize Hibernate proxy của ChuDe. Bỏ các thuộc tính proxy nội bộ khỏi JSON, giữ shape API hiện có. Đã kiểm tra bằng request HTTP trên PostgreSQL thật cục bộ. |
| Validation auth trả 403 | Error dispatch `/error` bị filter Security chặn. Cho phép ERROR dispatch và xử lý lỗi auth validation bằng response 400 không echo/log mật khẩu bị reject. |
| JWT có thể giả mạo từ khóa trong source | Loại khóa cố định; sử dụng JWT_SECRET, tối thiểu 32 byte. Production thiếu secret từ chối startup. Dev không cấu hình sử dụng key ngẫu nhiên. |
| Mật khẩu Admin seed nằm trong source/log | Chuyển sang SEED_ADMIN_PASSWORD; seed mặc định tắt cho cả Admin và câu hỏi. Không tự ghi dữ liệu Production khi startup. |
| Startup tự thay schema | `ddl-auto` mặc định chuyển sang `validate`, cấu hình qua DDL_AUTO. Migration là bước riêng cần duyệt. |
| Có thể giả userId khi nộp bài | Controller xác định userId từ tài khoản JWT; khách không được tự gán ID tài khoản khác. |
| F5 reset đồng hồ/thứ tự/câu hiện tại | Draft v2 lưu timer, vị trí, thứ tự câu, thời điểm bắt đầu; lọc ID cũ; khôi phục màn hình quiz bằng sessionStorage. Giữ tương thích draft cũ. |
| Lưu Admin làm mất màn hình đang sửa | Refresh danh sách chủ đề chạy nền, không unmount Admin. |
| Import preview không xác nhận được | Backend gửi thứ tự câu `null`; Frontend trước đó coi null là lỗi. Chấp nhận null để server gán thứ tự lúc lưu; có test hồi quy. |
| Migration lỗi trên bảng nhóm do Hibernate tạo | Bảng có NOT NULL nhưng không có DB default; INSERT trước đó thiếu hien_thi. INSERT giờ ghi rõ TRUE. Test trên schema cũ và schema JPA. |
| Admin mobile tràn ngang/menu che form | Sidebar dạng overlay trên mobile, đóng khi chọn mục; main min-width 0, ô nhập co giãn. Radio/checkbox giữ kích thước đúng. |
| Dependency test PostgreSQL không khởi động | Spring Boot quản lý commons-lang3 cũ không đáp ứng commons-compress của Zonky. Pin commons-lang3 3.20.0 theo dependency POM. |
| npm audit high severity | Bản source-map-js cũ trong lockfile; cập nhật bản vá không đổi major. Audit sau cập nhật: 0 vulnerabilities. |
| Production bundle có nguy cơ fallback localhost | Fallback production dùng API Render; thêm script kiểm tra bundle. Build thực tế không chứa localhost:8080. |

## Chức năng được giữ/kiểm tra

Ba dạng câu TRAC_NGHIEM/DIEN_TU/SAP_XEP; chấm điểm server theo công thức Giai đoạn C; xác nhận nộp, đánh dấu, draft, đồng hồ; Admin nhóm/chủ đề/câu hỏi; cấu hình review/luyện tập/xáo trộn; Excel cũ và mẫu mới, DOCX, PDF có lớp chữ, không OCR; AI generator hiện có.

Role ADMIN/USER tiếp tục dùng enum hiện có. Không tự migrate/xóa/reset database Production, không ghi dữ liệu test vào Production.

## Kết quả kiểm thử đã thực hiện

| Kiểm tra | Kết quả |
|---|---|
| Maven clean package — unit/JPA/security/migration/PDF | 32 test PASS, không fail/error/skip trên Windows hiện tại; JAR tạo thành công |
| FullStackQaIT — PostgreSQL riêng + HTTP Backend + Playwright | PASS; wrapper JUnit 1 test, Playwright 6/6 PASS |
| Frontend Node tests | 8/8 PASS |
| TypeScript `tsc --noEmit` | PASS |
| Vite production build | PASS |
| `scripts/check-production.cjs` | PASS, không có localhost:8080 hoặc 127.0.0.1:8080 |
| npm audit sau vá lockfile | 0 vulnerabilities |
| Scan release credentials | Không tìm thấy credential URI/private key/GitHub token/env secret trong file candidate; không in secret value |

E2E có Desktop 1440×900 và Mobile 390×844: đăng ký/đăng nhập API, validation; USER không được vào Admin; payload play không lộ key; ba dạng và điểm; score-only không trả review; tắt luyện tập trả 403; API CRUD nhóm và ba loại câu; Customer chọn đáp án/đánh dấu/điền từ/F5/sắp token/modal/nộp/xem review; Admin tạo nhóm/câu, tải mẫu DOCX, upload/preview/confirm lưu thật. Customer browser không có pageerror; kiểm tra không tràn chiều ngang trên Customer/Admin.

Service tests gồm Excel mẫu cũ; XLSX/DOCX round-trip cả 3 dạng; PDF scan/corrupt/đuôi sai/quá dung lượng; transaction import rollback; Unicode chấm điểm. PDF Unicode mới được sinh với font nhúng từ font hệ thống và xác nhận giữ chữ Hán cùng tiếng Việt khi đọc qua PDFBox. Không commit font có bản quyền; test này cần font fixture cục bộ và có thể skip ở môi trường thiếu font, không được coi là đã kiểm tra ở môi trường đó.

Kiểm thử PostgreSQL dùng Zonky instance ephemeral chỉ listen 127.0.0.1; migration chạy lặp, giữ câu/đáp án/kết quả cũ, backfill nhóm. Không thay thế kiểm tra trên bản sao dữ liệu Production/staging hay restore backup thật.

## File sửa/thêm

Backend: pom.xml, application.properties; SecurityConfig, DataSeeder, QuestionSeeder; JwtUtil; AuthDTO, các DTO nộp bài/chơi; AuthController/AuthValidationAdvice, QuizPlayController, CauHoiController, AdminValidationAdvice; entity CauHoi/ChuDe/DapAn/NhomMon; NhomMonRepository; CauHoiService/ChuDeService/QuizPlayService/NhomMonService/QuestionValidator/QuestionImportService; controller nhóm/import; migration V20261013__phase_d.sql; SchemaAudit; các tests C/D, JWT, PostgreSQL, PDF Unicode, FullStackQaIT.

Frontend: package.json/package-lock.json, .env.production (chỉ API URL công khai); App.tsx, api.ts, adapters.ts, quizDraft.ts, validation/question.ts; Home/Admin/Quiz/Result; PhaseDAdmin; index.css; 8 Node tests; Playwright config và e2e/quiz.spec.ts; script kiểm tra Production.

Tài liệu/công cụ: PHASE_D_REPORT.md (hiện trạng phần D ban đầu), DEPLOYMENT_RUNBOOK.md (hướng dẫn hiện tại), RELEASE_REPORT.md, tools/scan-release.cjs, .gitignore.

Loại khỏi commit: HTTP request cá nhân trong reset client; root package-lock rỗng; cache Maven/node_modules; JAR/dist/logs/screenshot/report generated. File cá nhân vẫn giữ tại workspace.

## PostgreSQL, Render, Cloudflare

- Chưa truy cập schema/log/config quản trị Render Production trong phiên này: không có connector/browser dashboard/API credential Render. DB_URL local sai định dạng; không sửa biến môi trường Production bằng suy đoán.
- Public Backend Render từng trả 200 cho `/api/chude/thongke` và CORS đúng origin Cloudflare, nhưng các lần khác timeout. `/api/nhom-mon` trả 403: Backend đang chạy chưa hỗ trợ API public nhóm của bản mới. Chưa xác nhận phiên bản backend mới hoặc các API ghi dữ liệu trên Production.
- Website Cloudflare trả HTML 200 với asset của phiên bản đang chạy. Đây không phải xác nhận mọi chức năng Production hoạt động.
- Wrangler whoami xác nhận **đã đăng nhập Cloudflare**; không in token/email/account ID. `wrangler.jsonc` dùng worker quiz-app, assets dist; API production trỏ Render đúng yêu cầu.
- Render deploy: **chưa thực hiện**. Migration Production chưa được duyệt riêng, chưa có backup/staging copy/schema validation và JWT_SECRET mới ở Render cần cấu hình.
- Cloudflare deploy: **chưa thực hiện**, dù đã authenticated, vì Backend hiện tại không tương thích API mới. Giữ nguyên website hiện có.
- Người dùng xác nhận đã tắt Auto-Deploy Render và cho phép push main; không force push.

## GitHub

Đã push commit source **`5847c296d6d002aca3845416097f1ebf56b98786`** lên `origin/main`; `git ls-remote origin refs/heads/main` trả đúng SHA này. Push fast-forward từ `36d2af2`, không force push. [Xem commit source trên GitHub](https://github.com/BigBoss1208/quiz_app/commit/5847c296d6d002aca3845416097f1ebf56b98786).

Bản cập nhật báo cáo này là commit tài liệu sau commit source, không đổi code đã build/test. HEAD tài liệu cuối được xác nhận trong câu trả lời bàn giao và `git log -1`.

## Việc cần thực hiện trước Production

1. Xác nhận các biến Render đúng trong dashboard: DB_URL dạng JDBC, DB_USERNAME/DB_PASSWORD riêng, JWT_SECRET mạnh, DDL_AUTO=validate, SEED_ENABLED=false. Không gửi secret trong chat/source/log.
2. Tạo backup và thử restore vào database riêng; test migration trên bản sao dữ liệu Production theo DEPLOYMENT_RUNBOOK.md.
3. Phê duyệt riêng migration Production trên script đã kiểm tra, sau đó người có quyền áp dụng migration và kiểm tra schema.
4. Deploy Render commit đã push và kiểm tra auth/chủ đề/play/nộp/review/Admin/import qua HTTP thật; sau đó mới deploy Cloudflare và kiểm tra trình duyệt Production.

Giới hạn còn lại: import Word/PDF theo mẫu KEY, không tự đoán mọi bố cục; PDF scan không OCR; chưa có đăng nhập/Admin/nộp bài end-to-end trên Production vì không sửa dữ liệu Production và deploy còn bị gate. Thời gian thưởng điểm vẫn theo thời gian từng câu do client gửi, được server giới hạn 0–20 giây như Giai đoạn C; chưa có session server chống giả thời gian. Cần xử lý bằng thiết kế attempt/session riêng nếu yêu cầu chống gian lận thời gian, không coi kiểm thử điểm hiện tại là bằng chứng chống loại gian lận này.

Nguồn đối chiếu kỹ thuật: [Zonky embedded PostgreSQL](https://github.com/zonkyio/embedded-postgres), [Render deploy/auto-deploy](https://render.com/docs/deploys), [POI XWPF](https://poi.apache.org/components/document/quick-guide-xwpf.html), [PDFBox 3](https://pdfbox.apache.org/3.0/migration.html).
