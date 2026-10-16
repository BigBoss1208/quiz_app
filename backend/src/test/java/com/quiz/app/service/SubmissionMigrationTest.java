package com.quiz.app.service;

import io.zonky.test.db.postgres.embedded.EmbeddedPostgres;
import org.junit.jupiter.api.Test;
import java.sql.*;
import java.nio.file.*;
import static org.junit.jupiter.api.Assertions.*;

class SubmissionMigrationTest {
    @Test void migrationKeepsLegacyRowsEmptyAndEnforcesForeignKey() throws Exception {
        try(var pg=EmbeddedPostgres.builder().setServerConfig("listen_addresses","127.0.0.1").start();var c=pg.getPostgresDatabase().getConnection();var s=c.createStatement()) {
            s.execute("CREATE TABLE ket_qua(id BIGINT PRIMARY KEY, diem_so INT, ten_nguoi_choi TEXT); INSERT INTO ket_qua VALUES(1,123,'Người cũ 中国')");
            s.execute(Files.readString(Path.of("src/main/resources/db/migration/V20261015__submission_details.sql")));
            try(var r=s.executeQuery("SELECT diem_so,ten_nguoi_choi FROM ket_qua WHERE id=1")){assertTrue(r.next());assertEquals(123,r.getInt(1));assertEquals("Người cũ 中国",r.getString(2));}
            try(var r=s.executeQuery("SELECT count(*) FROM ket_qua_chi_tiet")){r.next();assertEquals(0,r.getInt(1));}
            assertThrows(SQLException.class,()->s.execute("INSERT INTO ket_qua_chi_tiet VALUES(999,'{}')"));
            s.execute("INSERT INTO ket_qua_chi_tiet VALUES(1,'{\"text\":\"中国 Việt Nam\"}')");
            assertThrows(SQLException.class,()->s.execute("INSERT INTO ket_qua_chi_tiet VALUES(1,'{}')"));
            s.execute("DELETE FROM ket_qua WHERE id=1");
            try(var r=s.executeQuery("SELECT count(*) FROM ket_qua_chi_tiet")){r.next();assertEquals(0,r.getInt(1));}
        }
    }
}
