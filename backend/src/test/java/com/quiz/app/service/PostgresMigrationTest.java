package com.quiz.app.service;
import io.zonky.test.db.postgres.embedded.EmbeddedPostgres;
import org.junit.jupiter.api.Test;
import java.sql.*;
import java.nio.file.*;
import static org.junit.jupiter.api.Assertions.*;
class PostgresMigrationTest {
    @Test void migrationPreservesLegacyDataAndCanBeRepeated() throws Exception {
        try(EmbeddedPostgres pg=EmbeddedPostgres.builder().setServerConfig("listen_addresses","127.0.0.1").start();Connection c=pg.getPostgresDatabase().getConnection();Statement s=c.createStatement()) {
            s.execute("CREATE TABLE chu_de(id BIGINT PRIMARY KEY, danh_muc VARCHAR(50)); CREATE TABLE cau_hoi(id BIGINT PRIMARY KEY, noi_dung_cau_hoi TEXT); CREATE TABLE dap_an(id BIGINT PRIMARY KEY, noi_dung VARCHAR(500)); CREATE TABLE ket_qua(id BIGINT PRIMARY KEY, diem_so INT); INSERT INTO chu_de VALUES(1,'Xã hội'),(2,'中国'),(3,NULL); INSERT INTO cau_hoi VALUES(1,'Câu hỏi cũ'); INSERT INTO dap_an VALUES(1,'Đáp án cũ'); INSERT INTO ket_qua VALUES(1,250)");
            String sql=Files.readString(Path.of("src/main/resources/db/migration/V20261013__phase_d.sql"));s.execute(sql);s.execute(sql);
            try(ResultSet r=s.executeQuery("SELECT count(*) FROM nhom_mon")){r.next();assertEquals(4,r.getInt(1));}
            try(ResultSet r=s.executeQuery("SELECT count(*) FROM chu_de WHERE nhom_mon_id IS NOT NULL AND hien_dap_an_sau_nop=TRUE")){r.next();assertEquals(3,r.getInt(1));}
            try(ResultSet r=s.executeQuery("SELECT loai_cau_hoi,noi_dung_cau_hoi FROM cau_hoi WHERE id=1")){r.next();assertEquals("TRAC_NGHIEM",r.getString(1));assertEquals("Câu hỏi cũ",r.getString(2));}
            try(ResultSet r=s.executeQuery("SELECT diem_so FROM ket_qua WHERE id=1")){r.next();assertEquals(250,r.getInt(1));}
            s.execute("BEGIN; UPDATE chu_de SET hien_dap_an_sau_nop=FALSE WHERE id=1; ROLLBACK");
            try(ResultSet r=s.executeQuery("SELECT hien_dap_an_sau_nop FROM chu_de WHERE id=1")){r.next();assertTrue(r.getBoolean(1));}
        }
    }
}
