// Tipe Log Aktivitas (respons /api/audit-logs, Modul 7)
import type { KategoriAudit, PerubahanAudit, ToneAudit } from "#shared/utils/audit-labels";
import type { TeacherRole } from "~/composables/useAuth";

export interface AuditRow {
    id: number;
    uuid: string;
    waktu: string;
    aksi: string;
    label: string;
    kategori: KategoriAudit;
    tone: ToneAudit;
    guru: { uuid: string; nama: string; role: TeacherRole; fotoPath: string | null };
    target: { jenis: string; label: string; sub: string | null; link: string | null } | null;
    perubahan: PerubahanAudit[];
    ringkasan: string;
    alasan: string | null;
    akun: { ip: string | null; perangkat: string | null } | null;
}
