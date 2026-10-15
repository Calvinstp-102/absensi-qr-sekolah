import { z } from "zod";

// Hanya data profil. Password diganti lewat /reset-password (superadmin) atau Akun Saya (sendiri).
const updateTeacherSchema = z.object({
    nama: namaSchema,
    email: emailSchema,
    noHp: phoneSchema,
    role: z.enum(["superadmin", "admin", "guru_piket", "wali_kelas"], {
        error: "Pilih role: Admin, Guru Piket, atau Wali Kelas.",
    }),
    isActive: z.boolean({ error: "Status aktif harus diisi." }),
    // Modul 5: kelas yang dipegang. Tidak dikirim = tidak berubah; role selain Wali Kelas = dikosongkan
    kelasWali: kelasWaliSchema.optional(),
});

type Field = "nama" | "email" | "noHp" | "role" | "isActive";
const FIELDS: Field[] = ["nama", "email", "noHp", "role", "isActive"];

function reject(field: Field, message: string): never {
    throw appError(422, message, { fieldErrors: { [field]: message } });
}

export default defineEventHandler(async (event) => {
    const user = await requireRole(event, SUPERADMIN_ONLY);
    const body = await parseBody(event, updateTeacherSchema);
    const before = await findTeacherOr404(event);
    const isSelf = before.id === user.id;

    // Aturan role & status
    if (before.role === "superadmin" && body.role !== "superadmin") {
        reject("role", "Role Superadmin tidak dapat diubah lewat aplikasi.");
    }
    if (before.role !== "superadmin" && body.role === "superadmin") {
        reject("role", "Role Superadmin tidak dapat diberikan lewat aplikasi.");
    }
    if (isSelf && body.role !== before.role) {
        reject("role", "Anda tidak dapat mengubah role akun sendiri.");
    }
    if (isSelf && !body.isActive) {
        reject("isActive", "Anda tidak dapat menonaktifkan akun sendiri.");
    }
    if (before.role === "superadmin" && before.isActive && !body.isActive) {
        const activeSuperadmins = await prisma.teacher.count({
            where: { role: "superadmin", isActive: true, deleted: false },
        });
        if (activeSuperadmins <= 1) {
            reject(
                "isActive",
                "Superadmin terakhir yang aktif tidak dapat dinonaktifkan.",
            );
        }
    }

    if (body.role !== "wali_kelas" && body.kelasWali?.length) {
        throw appError(422, "Kelas wali hanya dapat diisi untuk role Wali Kelas.", {
            fieldErrors: { kelasWali: "Kelas wali hanya dapat diisi untuk role Wali Kelas." },
        });
    }
    const waliLama = await prisma.waliKelas.findMany({
        where: { teacherId: before.id },
        select: { jenjang: true, kelas: true },
    });
    const waliBaru = body.role === "wali_kelas" ? (body.kelasWali ?? waliLama) : [];
    const waliBerubah = labelKelasWali(waliLama) !== labelKelasWali(waliBaru);

    const changed = FIELDS.filter((f) => body[f] !== before[f]);
    if (!changed.length && !waliBerubah) {
        const teacher = await prisma.teacher.findUniqueOrThrow({
            where: { id: before.id },
            select: teacherPublicSelect,
        });
        return { teacher, changed, message: "Tidak ada perubahan data." };
    }

    if (changed.includes("email")) {
        await assertEmailAvailable(body.email, before.id);
    }

    // Role/status berubah -> sesi lama guru ini tidak berlaku lagi
    const revokeSessions = changed.includes("role") || changed.includes("isActive");

    // Hanya field yang berubah yang dicatat di audit log
    const pick = (src: Record<Field, string | boolean | null>) =>
        Object.fromEntries(changed.map((f) => [f, src[f]]));

    const updated = await prisma
        .$transaction(async (tx) => {
            const t = await tx.teacher.update({
                where: { id: before.id },
                data: {
                    nama: body.nama,
                    email: body.email,
                    noHp: body.noHp,
                    role: body.role,
                    isActive: body.isActive,
                    ...(revokeSessions && { sessionVersion: { increment: 1 } }),
                },
                select: teacherPublicSelect,
            });
            if (waliBerubah) await syncWaliKelas(tx, before.id, waliBaru as KelasWali[]);
            await tx.auditLog.create({
                data: {
                    teacherId: user.id,
                    actionType: "update_teacher",
                    entityType: "teacher",
                    entityId: before.id,
                    beforeValue: { ...pick(before), ...(waliBerubah && { kelasWali: labelKelasWali(waliLama) || "-" }) },
                    afterValue: { ...pick(t), ...(waliBerubah && { kelasWali: labelKelasWali(waliBaru) || "-" }) },
                    reason:
                        changed.length === 1 && changed[0] === "isActive"
                            ? body.isActive
                                ? "Akun guru diaktifkan"
                                : "Akun guru dinonaktifkan"
                            : "Update data guru",
                },
            });
            return waliBerubah
                ? tx.teacher.findUniqueOrThrow({ where: { id: before.id }, select: teacherPublicSelect })
                : t;
        })
        .catch((e) => handlePrismaError(e, { email: "Email" }, body));

    // Mengubah profil sendiri -> perbarui nama/email di sesi agar sidebar ikut berubah
    if (isSelf) {
        await refreshOwnSessionUser(event, {
            nama: updated.nama,
            email: updated.email,
        });
    }

    logger.info("guru", "Data guru diperbarui", {
        ...requestContext(event),
        teacherId: before.id,
        diubah: changed,
        ...(changed.includes("role") && { roleLama: before.role, roleBaru: updated.role }),
        ...(changed.includes("isActive") && { aktif: updated.isActive }),
        ...(waliBerubah && { kelasWali: labelKelasWali(waliBaru) || "-" }),
        sesiDicabut: revokeSessions,
    });

    return {
        teacher: updated,
        changed,
        message: revokeSessions
            ? "Perubahan disimpan. Guru tersebut perlu login ulang."
            : "Perubahan data guru disimpan.",
    };
});
