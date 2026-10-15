import type { H3Event } from "h3";
import { z } from "zod";
import type { Prisma } from "../../generated/prisma/client";

/** Field guru yang aman dikirim ke browser (tanpa passwordHash/sessionVersion). */
export const teacherPublicSelect = {
    id: true,
    uuid: true,
    nama: true,
    email: true,
    noHp: true,
    role: true,
    isActive: true,
    fotoPath: true,
    lastLoginAt: true,
    dateCreated: true,
    dateModified: true,
    waliKelas: { select: { jenjang: true, kelas: true } },
} as const;

/** Ambil guru (belum dihapus) dari parameter :uuid, atau 404. */
export async function findTeacherOr404(event: H3Event) {
    const uuid = getRouterParam(event, "uuid");
    const teacher = uuid
        ? await prisma.teacher.findUnique({ where: { uuid } })
        : null;
    if (!teacher || teacher.deleted) {
        throw appError(404, "Guru tidak ditemukan atau sudah dihapus.");
    }
    return teacher;
}

/** Foto guru hanya boleh diubah oleh pemilik akun atau superadmin. */
export function assertCanEditTeacherPhoto(
    event: H3Event,
    user: AuthUser,
    teacher: { id: number },
) {
    if (teacher.id === user.id || user.role === "superadmin") return;
    logger.warn("guru", "Akses ditolak: mengubah foto guru lain", {
        ...requestContext(event),
        role: user.role,
        teacherId: teacher.id,
    });
    throw appError(403, "Anda hanya dapat mengubah foto profil sendiri.");
}

/**
 * Pastikan email belum dipakai guru lain. Email akun yang sudah dihapus tetap tersimpan
 * (soft delete), jadi beri pesan khusus agar admin tidak bingung.
 */
export async function assertEmailAvailable(email: string, exceptId?: number) {
    const existing = await prisma.teacher.findUnique({
        where: { email },
        select: { id: true, deleted: true },
    });
    if (!existing || existing.id === exceptId) return;

    const message = existing.deleted
        ? `Email "${email}" pernah dipakai akun guru yang sudah dihapus, jadi tidak bisa dipakai lagi. Silakan gunakan email lain.`
        : `Email "${email}" sudah terdaftar. Silakan gunakan yang lain.`;
    logger.warn("guru", "Email guru ditolak: sudah dipakai", {
        email,
        akunDihapus: existing.deleted,
    });
    throw appError(409, message, { fieldErrors: { email: message } });
}

/**
 * Perbarui data user di sesi login perangkat ini (mis. setelah mengganti foto/nama sendiri)
 * tanpa mengubah waktu login, "Ingat saya", atau sessionVersion.
 */
export async function refreshOwnSessionUser(
    event: H3Event,
    patch: Partial<Pick<AuthUser, "nama" | "email" | "fotoPath" | "role">>,
) {
    const session = await getUserSession(event);
    if (!session.user) return;
    // setUserSession (defu) mengabaikan nilai null, jadi pakai replace dengan data lengkap
    const { id: _id, ...data } = session;
    await replaceUserSession(
        event,
        { ...data, user: { ...session.user, ...patch } },
        {
            maxAge: session.remember
                ? SESSION_MAX_AGE_REMEMBER
                : SESSION_MAX_AGE_DEFAULT,
        },
    );
}

// --- Wali kelas (Modul 5): 1 kelas = 1 wali, 1 guru boleh memegang beberapa kelas

export const kelasWaliSchema = z
    .array(
        z.object({
            jenjang: z.enum(["TK", "SD", "SMP"], { error: "Jenjang tidak dikenal." }),
            kelas: z.string({ error: "Kelas tidak valid." }).trim().max(10, "Kelas tidak valid."),
        }),
        { error: "Kelas wali tidak valid." },
    )
    .max(20, "Maksimal 20 kelas.")
    .superRefine((list, ctx) => {
        const seen = new Set<string>();
        for (const k of list) {
            if (!isValidKelas(k.jenjang, k.kelas)) {
                ctx.addIssue({ code: "custom", message: `Kelas ${k.jenjang} ${k.kelas} tidak dikenal.` });
            }
            const key = `${k.jenjang}|${k.kelas}`;
            if (seen.has(key)) ctx.addIssue({ code: "custom", message: "Ada kelas yang dipilih dua kali." });
            seen.add(key);
        }
    });

export type KelasWali = z.infer<typeof kelasWaliSchema>[number];

/** "SD 3, SMP 7" (urut jenjang & kelas) untuk audit/log & perbandingan. */
export function labelKelasWali(list: readonly { jenjang: string; kelas: string }[]) {
    return urutkanKelas([...list]).map((k) => formatKelas(k.jenjang, k.kelas)).join(", ");
}

/** Samakan penugasan wali kelas guru dengan `list`. Kelas yang dipegang guru lain -> 409. */
export async function syncWaliKelas(tx: Prisma.TransactionClient, teacherId: number, list: readonly KelasWali[]) {
    if (list.length) {
        const bentrok = await tx.waliKelas.findMany({
            where: {
                teacherId: { not: teacherId },
                OR: list.map((k) => ({ jenjang: k.jenjang, kelas: k.kelas })),
            },
            include: { teacher: { select: { nama: true } } },
        });
        if (bentrok.length) {
            const pesan = bentrok
                .map((b) => `${formatKelas(b.jenjang, b.kelas)} sudah dipegang ${b.teacher.nama}`)
                .join("; ");
            throw appError(409, `${pesan}. Lepaskan dulu dari guru tersebut.`, {
                fieldErrors: { kelasWali: `${pesan}.` },
            });
        }
    }
    await tx.waliKelas.deleteMany({
        where: {
            teacherId,
            NOT: list.length ? { OR: list.map((k) => ({ jenjang: k.jenjang, kelas: k.kelas })) } : undefined,
        },
    });
    const ada = await tx.waliKelas.findMany({ where: { teacherId }, select: { jenjang: true, kelas: true } });
    const baru = list.filter((k) => !ada.some((a) => a.jenjang === k.jenjang && a.kelas === k.kelas));
    if (baru.length) {
        await tx.waliKelas.createMany({ data: baru.map((k) => ({ teacherId, jenjang: k.jenjang, kelas: k.kelas })) });
    }
}
