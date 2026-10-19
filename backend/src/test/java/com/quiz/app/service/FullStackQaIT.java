package com.quiz.app.service;

import com.quiz.app.entity.*;
import com.quiz.app.repository.*;
import io.zonky.test.db.postgres.embedded.EmbeddedPostgres;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.security.crypto.password.PasswordEncoder;
import java.nio.file.*;
import java.sql.*;
import java.util.*;
import java.util.concurrent.TimeUnit;
import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest(webEnvironment=SpringBootTest.WebEnvironment.RANDOM_PORT, properties={"spring.jpa.hibernate.ddl-auto=create-drop","app.production=false","app.seed.enabled=false","logging.level.root=WARN","spring.jpa.show-sql=false","app.cors.allowed-origins=http://127.0.0.1:5173"})
@TestInstance(TestInstance.Lifecycle.PER_CLASS)
@org.springframework.test.annotation.DirtiesContext(classMode=org.springframework.test.annotation.DirtiesContext.ClassMode.AFTER_CLASS)
@org.springframework.test.context.TestExecutionListeners(listeners=FullStackQaIT.PgCleanup.class,mergeMode=org.springframework.test.context.TestExecutionListeners.MergeMode.MERGE_WITH_DEFAULTS)
class FullStackQaIT {
    static EmbeddedPostgres pg;
    static final String testPassword=UUID.randomUUID().toString();
    @DynamicPropertySource static void database(DynamicPropertyRegistry props) throws Exception {
        pg=EmbeddedPostgres.builder().setServerConfig("listen_addresses","127.0.0.1").start();
        props.add("spring.datasource.url",()->pg.getJdbcUrl("postgres","postgres"));
        props.add("spring.datasource.username",()->"postgres");props.add("spring.datasource.password",()->"postgres");
        props.add("jwt.secret",()->UUID.randomUUID().toString()+UUID.randomUUID());
    }
    @LocalServerPort int port;
    @Autowired NguoiDungRepository users;
    @Autowired KetQuaRepository results;
    @Autowired KetQuaChiTietRepository snapshots;
    @Autowired QuizPlayService play;
    @Autowired ChuDeRepository topics;
    @Autowired NhomMonRepository groups;
    @Autowired CauHoiService questions;
    @Autowired PasswordEncoder encoder;
    @BeforeAll void fixtures() throws Exception {
        try(Connection c=pg.getPostgresDatabase().getConnection();Statement s=c.createStatement()) {s.execute(Files.readString(Path.of("src/main/resources/db/migration/V20261013__phase_d.sql")));}
        for(String role:List.of("ADMIN","USER")) {NguoiDung u=new NguoiDung();u.setUsername("qa_"+role.toLowerCase());u.setHoTen("QA "+role);u.setVaiTro(NguoiDung.VaiTro.valueOf(role));u.setMatKhau(encoder.encode(testPassword));users.save(u);}
        ChuDe topic=new ChuDe();topic.setTenChuDe("QA Demo");topic.setMoTa("Disposable local QA fixture");topic.setDoKho("DE");topic.setNhomMon(groups.findByTenIgnoreCase("Khoa học").orElseThrow());topic.setDanhMuc("Khoa học");topic.setHienDapAnSauNop(true);topic.setChoPhepXemDapAn(true);topic=topics.save(topic);
        KetQua legacy=new KetQua();legacy.setChuDe(topic);legacy.setTenNguoiChoi("QA old score");legacy.setUserId(users.findByUsername("qa_user").orElseThrow().getId());legacy.setDiemSo(123);results.save(legacy);
        for(var kind:CauHoi.LoaiCauHoi.values()) {
            CauHoi q=new CauHoi();q.setChuDe(topic);q.setLoaiCauHoi(kind);q.setNoiDungCauHoi(kind==CauHoi.LoaiCauHoi.TRAC_NGHIEM?"QA: Thủ đô Việt Nam?":kind==CauHoi.LoaiCauHoi.DIEN_TU?"QA: 中国 nghĩa là gì?":"QA: Sắp xếp câu");q.setGiaiThich("QA explanation");
            List<String> texts=kind==CauHoi.LoaiCauHoi.TRAC_NGHIEM?List.of("Hà Nội","Huế","Đà Nẵng","Hải Phòng"):kind==CauHoi.LoaiCauHoi.DIEN_TU?List.of("Trung Quốc","中国"):List.of("我","学习","中文");
            List<DapAn> answers=new ArrayList<>();for(int i=0;i<texts.size();i++)answers.add(new DapAn(null,texts.get(i),kind==CauHoi.LoaiCauHoi.DIEN_TU||i==0,i,null));q.setDanhSachDapAn(answers);questions.them(q);
        }
    }
    @Test void snapshotFailureRollsBackScore() throws Exception {
        long before=results.count(), detailsBefore=snapshots.count();
        try(Connection c=pg.getPostgresDatabase().getConnection();Statement s=c.createStatement()) {
            s.execute("ALTER TABLE ket_qua_chi_tiet ADD CONSTRAINT qa_reject_snapshot CHECK (length(snapshot_json)<1) NOT VALID");
            try {
                var request=new com.quiz.app.dto.NopBaiRequestDTO();request.setChuDeId(topics.findAll().get(0).getId());
                assertThrows(RuntimeException.class,()->play.nopBai(request));
                assertEquals(before,results.count());assertEquals(detailsBefore,snapshots.count());
            } finally {s.execute("ALTER TABLE ket_qua_chi_tiet DROP CONSTRAINT qa_reject_snapshot");}
        }
    }
    @Test void runDesktopMobileAndApiQa() throws Exception {
        // This process only receives the disposable local DB credentials and test account.
        ProcessBuilder pb=System.getProperty("os.name").toLowerCase(java.util.Locale.ROOT).contains("win")
                ? new ProcessBuilder("cmd.exe","/c","npm.cmd","exec","playwright","test")
                : new ProcessBuilder("npm","exec","playwright","test");
        pb.directory(Path.of("../frontend").toFile());pb.environment().put("QA_BACKEND_URL","http://127.0.0.1:"+port+"/api");pb.environment().put("VITE_API_URL","http://127.0.0.1:"+port+"/api");pb.environment().put("QA_PASSWORD",testPassword);
        pb.redirectErrorStream(true);pb.redirectOutput(Path.of("target/playwright-qa.log").toFile());Process process=pb.start();
        boolean done=process.waitFor(360,TimeUnit.SECONDS);if(!done)process.destroyForcibly();
        assertTrue(done,"Playwright timeout; see target/playwright-qa.log");assertEquals(0,process.exitValue(),"See target/playwright-qa.log");
    }
    public static class PgCleanup extends org.springframework.test.context.support.AbstractTestExecutionListener {
        @Override public int getOrder() { return 0; }
        @Override public void afterTestClass(org.springframework.test.context.TestContext context) throws Exception {if(pg!=null)pg.close();}
    }
}
