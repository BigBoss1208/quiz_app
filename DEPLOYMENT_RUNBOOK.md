# Quiz ManhNhom — release C/D

## Gate trước deploy Production

Auto-Deploy Render đã được người dùng xác nhận tắt trước khi push. Giữ tắt cho tới khi migration được phê duyệt riêng và Backend kiểm tra schema thành công.

Không chạy ứng dụng mới với `DDL_AUTO=update` để thay cho migration. Mặc định mới là `validate`; seed dữ liệu tự động mặc định tắt. Frontend chỉ deploy sau khi Backend mới đã chạy và kiểm tra đủ API.

## Biến môi trường Render

- `DB_URL`: JDBC PostgreSQL, dạng `jdbc:postgresql://HOST:5432/DATABASE?sslmode=require`. Không đặt `postgres://...` hoặc URL web vào trường này. Username/password đặt riêng, không nhúng trong URL.
- `DB_USERNAME`, `DB_PASSWORD`: giữ trong Render Environment; không commit hay chép vào báo cáo.
- `JWT_SECRET`: chuỗi ngẫu nhiên tối thiểu 32 byte UTF-8, giữ trong Render Environment. Thay key làm các JWT cũ hết hiệu lực; người dùng đăng nhập lại.
- `RENDER=true` (Render tự cung cấp): buộc Backend từ chối khởi động khi thiếu JWT_SECRET.
- `DDL_AUTO=validate`, `SEED_ENABLED=false`.
- `CORS_ALLOWED_ORIGINS=https://quiz-app.quangmanh12082005.workers.dev` nếu chỉ cho Production. Default còn có các origin dev cục bộ.
- Các API key AI giữ nguyên ở Environment; không bắt buộc cho quiz/import.

Lỗi 08001 quan sát trong môi trường local là `No suitable driver found`, DB_URL không bắt đầu `jdbc:postgresql:`. Điều này không chứng minh DB Production có cùng cấu hình lỗi. Cần xem Environment/log Render qua quyền quản trị để đối chiếu, không gửi secrets trong chat.

## Sao lưu, migration và rollback

1. Chọn maintenance window và ngừng các thao tác ghi trong lúc sao lưu/migration.
2. Tạo backup PostgreSQL custom-format bằng `pg_dump` với secrets qua môi trường/file pass riêng và xác nhận restore được **vào database thử nghiệm khác**. Ghi bản PostgreSQL, commit đang chạy, vị trí backup trong nơi riêng tư.
3. Chạy `backend/src/main/resources/db/migration/V20261013__phase_d.sql` trên bản sao staging với `ON_ERROR_STOP=1`. Kiểm tra số dòng chủ đề/câu/đáp án/kết quả trước và sau, nhóm được backfill, các cột/constraints. Script transaction nên lỗi trước COMMIT rollback toàn bộ; script có thể chạy lặp.
4. Xin phê duyệt riêng cho migration Production trên bản script đã test. Chưa có phê duyệt này thì dừng deploy Backend.
5. Sau phê duyệt, chạy migration đúng script bằng công cụ PostgreSQL có quyền, không khởi động Hibernate update. Rà soát chủ đề thiếu danh mục cũ (fallback Khoa học).
6. Deploy Render commit mới, kiểm tra startup validate, auth, nhóm, play/nộp bài và API Admin/import. Chỉ sau đó deploy Cloudflare từ `frontend/dist` với Wrangler hiện có.

Rollback ứng dụng ưu tiên redeploy commit cũ. Các cột/bảng thêm mới được giữ để tránh mất dữ liệu; backend cũ bỏ qua chúng. Không tự chạy DROP hoặc restore đè Production. Nếu cần phục hồi dữ liệu từ backup phải được duyệt riêng, kiểm chứng trên DB khác và thống nhất mất dữ liệu phát sinh sau backup. Chưa triển khai hay kiểm thử restore backup Production trong phiên này.

## Kiểm thử cục bộ

Java 17 + Maven; Backend dùng cache Maven workspace nếu cần. `mvn package` chạy các unit/JPA/security/migration tests. PostgreSQL test là instance ephemeral qua Zonky, chỉ listen loopback; không sử dụng DB_URL Production.

Frontend: `npm ci`, `npm test`, `npx tsc --noEmit`, `npm run build`, `node scripts/check-production.cjs`.

E2E tích hợp chạy riêng bằng `mvn -Dtest=FullStackQaIT test`: nó tạo PostgreSQL + tài khoản ngẫu nhiên cục bộ, chạy Backend random port và Playwright Desktop/Mobile trên Vite preview build mode QA. Chuẩn bị `npm ci` và `npx playwright install chromium` trong frontend trước. Renderer CPU tránh lỗi GPU process của môi trường headless Windows. Không chạy các test ghi dữ liệu vào Production.

## Deployment

Backend dùng Dockerfile hiện có: Maven build Java 17, Java 17 runtime. Không thay cấu trúc hosting. Render cần deploy commit SHA cụ thể qua phương thức service đang cấu hình sau khi qua gate.

Frontend `.env.production` chỉ chứa API URL công khai `https://quiz-app-10-kln9.onrender.com/api`. Chạy build rồi kiểm tra bundle, tiếp theo `wrangler deploy` từ thư mục frontend khi tài khoản đã xác thực. `wrangler.jsonc` tiếp tục tên worker quiz-app, assets dist.

URL kiểm tra: https://quiz-app.quangmanh12082005.workers.dev/ và https://quiz-app-10-kln9.onrender.com/api/chude/thongke . HTTP 200 HTML không thay thế kiểm tra chức năng/API.
