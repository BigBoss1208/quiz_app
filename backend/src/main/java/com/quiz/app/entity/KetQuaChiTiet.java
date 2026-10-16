package com.quiz.app.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

/** Immutable server-graded snapshot, intentionally not exposed through KetQua serialization. */
@Entity
@Table(name = "ket_qua_chi_tiet")
@Getter @Setter
public class KetQuaChiTiet {
    @Id
    @Column(name = "ket_qua_id")
    private Long ketQuaId;

    @MapsId
    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "ket_qua_id")
    private KetQua ketQua;

    @Column(name = "snapshot_json", nullable = false, columnDefinition = "text", updatable = false)
    private String snapshotJson;
}
