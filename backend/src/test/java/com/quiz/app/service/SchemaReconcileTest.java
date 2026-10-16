package com.quiz.app.service;

import com.quiz.app.entity.*;
import io.zonky.test.db.postgres.embedded.EmbeddedPostgres;
import org.hibernate.cfg.Configuration;
import org.junit.jupiter.api.Test;
import java.sql.*;
import java.nio.file.*;
import java.util.*;
import java.security.MessageDigest;
import static org.junit.jupiter.api.Assertions.*;

class SchemaReconcileTest {
    private static final String SQL = "src/main/resources/db/migration/V20261014__schema_reconcile_cd.sql";
    private static final List<String> TABLES=List.of("nguoi_dung","chu_de","cau_hoi","dap_an","ket_qua");
    private void legacy(Connection c, boolean partial) throws Exception {
        try(Statement s=c.createStatement()) {
            s.execute("""
                CREATE TABLE nguoi_dung(id BIGSERIAL PRIMARY KEY,username VARCHAR(100) NOT NULL UNIQUE,mat_khau VARCHAR(255) NOT NULL,ho_ten VARCHAR(255),vai_tro VARCHAR(20));
                CREATE TABLE chu_de(id BIGSERIAL PRIMARY KEY,ten_chu_de VARCHAR(255) NOT NULL,hinh_anh VARCHAR(500),mo_ta TEXT,do_kho VARCHAR(50),danh_muc VARCHAR(50),cho_phep_xem_dap_an BOOLEAN);
                CREATE TABLE cau_hoi(id BIGSERIAL PRIMARY KEY,noi_dung_cau_hoi TEXT NOT NULL,hinh_anh VARCHAR(500),thu_tu INTEGER,chu_de_id BIGINT NOT NULL);
                CREATE TABLE dap_an(id BIGSERIAL PRIMARY KEY,noi_dung VARCHAR(500) NOT NULL,la_dap_an_dung BOOLEAN NOT NULL,cau_hoi_id BIGINT NOT NULL);
                CREATE TABLE ket_qua(id BIGSERIAL PRIMARY KEY,ten_nguoi_choi VARCHAR(255) NOT NULL,user_id BIGINT,chu_de_id BIGINT NOT NULL,diem_so INTEGER NOT NULL,so_cau_da_tra_loi INTEGER,thoi_gian_lam TIMESTAMP);
                INSERT INTO nguoi_dung(username,mat_khau,ho_ten,vai_tro) VALUES('fixture','fixture-not-a-production-credential','Tên Unicode 中国','USER');
                INSERT INTO chu_de(ten_chu_de,mo_ta,danh_muc,cho_phep_xem_dap_an) VALUES('Môn cũ','Giữ nguyên','Tất cả',TRUE),('Môn Hán','中国',' 中国 ',FALSE),('Môn chưa phân loại',NULL,NULL,NULL);
                INSERT INTO cau_hoi(noi_dung_cau_hoi,thu_tu,chu_de_id) VALUES('Câu cũ 中国?',1,1);
                INSERT INTO dap_an(noi_dung,la_dap_an_dung,cau_hoi_id) VALUES('Việt Nam',TRUE,1),('中国',FALSE,1),('日本',FALSE,1),('Khác',FALSE,1);
                INSERT INTO ket_qua(ten_nguoi_choi,user_id,chu_de_id,diem_so,so_cau_da_tra_loi,thoi_gian_lam) VALUES('Người chơi cũ',1,1,250,1,'2026-10-01 10:00:00');
                """);
            if(partial) s.execute("""
                CREATE TABLE nhom_mon(id BIGSERIAL PRIMARY KEY,ten VARCHAR(50));
                INSERT INTO nhom_mon(ten) VALUES('Khoa học');
                ALTER TABLE chu_de ADD COLUMN nhom_mon_id BIGINT;
                ALTER TABLE chu_de ADD COLUMN hien_dap_an_sau_nop BOOLEAN;
                ALTER TABLE chu_de ADD COLUMN xao_tron_cau_hoi BOOLEAN;
                ALTER TABLE chu_de ADD COLUMN xao_tron_lua_chon BOOLEAN;
                UPDATE chu_de SET hien_dap_an_sau_nop=FALSE,xao_tron_cau_hoi=TRUE,xao_tron_lua_chon=FALSE;
                UPDATE chu_de SET nhom_mon_id=1 WHERE id=1;
                ALTER TABLE cau_hoi ADD COLUMN loai_cau_hoi VARCHAR(30);
                UPDATE cau_hoi SET loai_cau_hoi='DIEN_TU';
                """);
        }
    }
    private Map<String,List<String>> columns(Connection c) throws Exception {
        Map<String,List<String>> result=new LinkedHashMap<>();
        for(String t:TABLES) {List<String> names=new ArrayList<>();try(ResultSet r=c.getMetaData().getColumns(null,"public",t,null)){while(r.next())names.add(r.getString("COLUMN_NAME"));}result.put(t,names);}
        return result;
    }
    private Map<String,String> fingerprints(Connection c,Map<String,List<String>> cols) throws Exception {
        Map<String,String> result=new LinkedHashMap<>();
        for(var entry:cols.entrySet())try(Statement s=c.createStatement();ResultSet r=s.executeQuery("SELECT row_to_json(x)::text FROM (SELECT "+String.join(",",entry.getValue())+" FROM public."+entry.getKey()+" ORDER BY id) x")) {
            MessageDigest digest=MessageDigest.getInstance("SHA-256");while(r.next()){digest.update(r.getString(1).getBytes(java.nio.charset.StandardCharsets.UTF_8));digest.update((byte)'\n');}result.put(entry.getKey(),HexFormat.of().formatHex(digest.digest()));
        }
        return result;
    }
    private void validateOnly(EmbeddedPostgres pg,String database) {
        Configuration cfg=new Configuration();
        for(Class<?> entity:List.of(CauHoi.class,DapAn.class,ChuDe.class,NhomMon.class,NguoiDung.class,KetQua.class))cfg.addAnnotatedClass(entity);
        cfg.setProperty("hibernate.hbm2ddl.auto","validate");
        cfg.setPhysicalNamingStrategy(new org.hibernate.boot.model.naming.CamelCaseToUnderscoresNamingStrategy());
        cfg.setProperty("hibernate.connection.url",pg.getJdbcUrl("postgres",database));cfg.setProperty("hibernate.connection.username","postgres");cfg.setProperty("hibernate.connection.password","postgres");
        try(var factory=cfg.buildSessionFactory();var session=factory.openSession()) {
            var tx=session.beginTransaction();NhomMon group=new NhomMon();group.setTen("Temporary identity validation");session.persist(group);session.flush();assertNotNull(group.getId());tx.rollback();
        }
    }
    @Test void legacyCloneMatchesAllEntitiesAndPreservesEveryLegacyColumn() throws Exception { cloneCase(false); }
    @Test void partiallyMigratedCloneRepairsMissingFkAndPreservesPolicies() throws Exception { cloneCase(true); }
    private void cloneCase(boolean partial) throws Exception {
        try(EmbeddedPostgres pg=EmbeddedPostgres.builder().setServerConfig("listen_addresses","127.0.0.1").start()) {
            Map<String,List<String>> cols;Map<String,String> before;
            try(Connection c=pg.getPostgresDatabase().getConnection()){legacy(c,partial);cols=columns(c);cols.get("chu_de").remove("nhom_mon_id");before=fingerprints(c,cols);}
            // Clone a disposable fixture DB. This is not a copy or backup of Production.
            try(Connection admin=pg.getTemplateDatabase().getConnection();Statement s=admin.createStatement()){s.execute("CREATE DATABASE fixture_clone TEMPLATE postgres");}
            try(Connection clone=pg.getDatabase("postgres","fixture_clone").getConnection();Statement s=clone.createStatement()) {
                s.execute(Files.readString(Path.of(SQL)));assertEquals(before,fingerprints(clone,cols));s.execute(Files.readString(Path.of(SQL)));assertEquals(before,fingerprints(clone,cols));
                try(ResultSet r=s.executeQuery("SELECT count(*) FROM pg_constraint WHERE contype='f' AND convalidated AND connamespace='public'::regnamespace")){r.next();assertEquals(4,r.getInt(1));}
                try(ResultSet r=s.executeQuery("SELECT count(*) FROM chu_de WHERE nhom_mon_id IS NULL")){r.next();assertEquals(0,r.getInt(1));}
                if(partial)try(ResultSet r=s.executeQuery("SELECT nhom_mon_id,hien_dap_an_sau_nop,xao_tron_cau_hoi,xao_tron_lua_chon FROM chu_de WHERE id=1")){r.next();assertEquals(1,r.getLong(1));assertFalse(r.getBoolean(2));assertTrue(r.getBoolean(3));assertFalse(r.getBoolean(4));}
                try(ResultSet r=s.executeQuery("SELECT count(*) FROM nhom_mon WHERE ten='Tất cả'")){r.next();assertEquals(0,r.getInt(1));}
                // Inspect only aggregate/schema information; never emit rows/password hashes.
                s.execute(Files.readString(Path.of("tools/schema-preflight.sql")));s.execute(Files.readString(Path.of("tools/schema-data-check.sql")));
            }
            assertDoesNotThrow(()->validateOnly(pg,"fixture_clone"));
            try(Connection original=pg.getPostgresDatabase().getConnection()){assertEquals(before,fingerprints(original,cols));}
        }
    }
    @Test void orphanedRowsAbortAllSchemaAndDataChanges() throws Exception {
        try(EmbeddedPostgres pg=EmbeddedPostgres.builder().setServerConfig("listen_addresses","127.0.0.1").start();Connection c=pg.getPostgresDatabase().getConnection();Statement s=c.createStatement()) {
            legacy(c,false);s.execute("UPDATE cau_hoi SET chu_de_id=999 WHERE id=1");var cols=columns(c);var before=fingerprints(c,cols);
            assertThrows(SQLException.class,()->s.execute(Files.readString(Path.of(SQL))));s.execute("ROLLBACK");assertEquals(before,fingerprints(c,cols));
            try(ResultSet r=s.executeQuery("SELECT to_regclass('public.nhom_mon') IS NULL")){r.next();assertTrue(r.getBoolean(1));}
        }
    }
    @Test void ambiguousGroupNamesAbortInsteadOfMergingData() throws Exception {
        try(EmbeddedPostgres pg=EmbeddedPostgres.builder().setServerConfig("listen_addresses","127.0.0.1").start();Connection c=pg.getPostgresDatabase().getConnection();Statement s=c.createStatement()) {
            legacy(c,true);s.execute("INSERT INTO nhom_mon(ten) VALUES('khoa học')");
            assertThrows(SQLException.class,()->s.execute(Files.readString(Path.of(SQL))));s.execute("ROLLBACK");
            try(ResultSet r=s.executeQuery("SELECT count(*) FROM nhom_mon")){r.next();assertEquals(2,r.getInt(1));}
        }
    }
    @Test void invalidRoleAbortsInsteadOfChangingAccountPrivileges() throws Exception {
        try(EmbeddedPostgres pg=EmbeddedPostgres.builder().setServerConfig("listen_addresses","127.0.0.1").start();Connection c=pg.getPostgresDatabase().getConnection();Statement s=c.createStatement()) {
            legacy(c,false);s.execute("UPDATE nguoi_dung SET vai_tro='UNKNOWN'");var cols=columns(c);var before=fingerprints(c,cols);
            assertThrows(SQLException.class,()->s.execute(Files.readString(Path.of(SQL))));s.execute("ROLLBACK");assertEquals(before,fingerprints(c,cols));
        }
    }
    @Test void publishedMigrationThenReconcileRetainsItsExistingData() throws Exception {
        try(EmbeddedPostgres pg=EmbeddedPostgres.builder().setServerConfig("listen_addresses","127.0.0.1").start();Connection c=pg.getPostgresDatabase().getConnection();Statement s=c.createStatement()) {
            legacy(c,false);s.execute(Files.readString(Path.of("src/main/resources/db/migration/V20261013__phase_d.sql")));var cols=columns(c);var before=fingerprints(c,cols);
            s.execute(Files.readString(Path.of(SQL)));assertEquals(before,fingerprints(c,cols));assertDoesNotThrow(()->validateOnly(pg,"postgres"));
        }
    }
}
