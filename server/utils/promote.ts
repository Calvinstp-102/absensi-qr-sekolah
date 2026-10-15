import { z } from "zod";

// Aturan naik kelas — dipakai bersama oleh pratinjau (GET) dan proses (POST)

export const promoteSourceShape = {
    jenjang: z.enum(["TK", "SD", "SMP"], { error: "Pilih jenjang kelas asal." }),
    kelas: z.string({ error: "Pilih kelas asal." }).trim().min(1, "Pilih kelas asal."),
};

export function withPromoteKelasCheck<T extends z.ZodType<{ jenjang: string; kelas: string }>>(
    schema: T,
) {
    return schema.superRefine((v, ctx) => {
        if (v.kelas && !isValidKelas(v.jenjang, v.kelas)) {
            ctx.addIssue({
                code: "custom",
                path: ["kelas"],
                message: `Kelas "${v.kelas}" tidak tersedia untuk jenjang ${v.jenjang}.`,
            });
        }
    });
}

/** Tujuan naik kelas yang dihitung server (bukan dari browser). */
export function promoteTarget(jenjang: string, kelas: string) {
    const next = nextKelas(jenjang, kelas);
    if (!next) throw appError(422, "Kelas asal tidak dikenal.");
    return next === "lulus"
        ? { lulus: true as const, label: "Lulus" }
        : { lulus: false as const, ...next, label: formatKelas(next.jenjang, next.kelas) };
}

/** Id siswa yang sudah naik kelas / lulus di tahun ajaran ini (agar tidak naik dua kali). */
export async function alreadyPromotedIds(studentIds: number[], tahunAjaran: string) {
    if (!studentIds.length) return new Set<number>();
    const rows = await prisma.studentClassHistory.findMany({
        where: {
            studentId: { in: studentIds },
            tahunAjaran,
            action: { in: ["naik_kelas", "lulus"] },
            deleted: false,
        },
        select: { studentId: true },
    });
    return new Set(rows.map((r) => r.studentId));
}
