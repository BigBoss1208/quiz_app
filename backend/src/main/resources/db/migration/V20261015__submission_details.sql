-- Apply only after backup/staging verification and explicit Production approval.
-- No backfill: legacy score-only results intentionally have no snapshot.
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '60s';
SET LOCAL search_path = public;
CREATE TABLE ket_qua_chi_tiet (
    ket_qua_id BIGINT PRIMARY KEY,
    snapshot_json TEXT NOT NULL,
    CONSTRAINT fk_ket_qua_chi_tiet_result FOREIGN KEY (ket_qua_id)
        REFERENCES ket_qua(id) ON DELETE CASCADE
);
COMMIT;
