import bcrypt from "bcryptjs";
import { z } from "zod";

// Role superadmin tidak bisa dibuat lewat aplikasi (keputusan user, Modul 6)
const createTeacherSchema = z
    .object({
        nama: namaSchema,
        email: emailSchema,
        noHp: phoneSchema,
        role: z.enum(["admin", "guru_piket", "wali_kelas"], {
            error: "Pilih role: Admin, Guru Piket, atau Wali Kelas.",
        }),
        password: newPasswordSchema("Password"),
        confirmPassword: z
            .string({ error: "Konfirmasi password wajib diisi." })
            .min(1, "Konfirmasi password wajib diisi."),
        // Modul 5: kelas yang dipegang (hanya role Wali Kelas)
        kelasWali: kelasWaliSchema.default([]),
    })
    .refine((d) => d.password === d.confirmPassword, {
        path: ["confirmPassword"],
        message: "Konfirmasi password tidak sama dengan password.",
    })
    .refine((d) => d.role === "wali_kelas" || d.kelasWali.length === 0, {
        path: ["kelasWali"],
        message: "Kelas wali hanya dapat diisi untuk role Wali Kelas.",
    });

export default defineEventHandler(async (event) => {
    const user = await requireRole(event, SUPERADMIN_ONLY);
    const body = await parseBody(event, createTeacherSchema);

    await assertEmailAvailable(body.email);

    const passwordHash = await bcrypt.hash(body.password, 10);

    const teacher = await prisma
        .$transaction(async (tx) => {
            const t = await tx.teacher.create({
                data: {
                    nama: body.nama,
                    email: body.email,
                    noHp: body.noHp,
                    passwordHash,
                    role: body.role,
                },
                select: teacherPublicSelect,
            });
            if (body.kelasWali.length) await syncWaliKelas(tx, t.id, body.kelasWali);
            await tx.auditLog.create({
                data: {
                    teacherId: user.id,
                    actionType: "create_teacher",
                    entityType: "teacher",
                    entityId: t.id,
                    afterValue: {
                        nama: t.nama,
                        email: t.email,
                        noHp: t.noHp,
                        role: t.role,
                        isActive: t.isActive,
                        ...(body.kelasWali.length && { kelasWali: labelKelasWali(body.kelasWali) }),
                    },
                    reason: "Guru baru ditambahkan",
                },
            });
            return tx.teacher.findUniqueOrThrow({ where: { id: t.id }, select: teacherPublicSelect });
        })
        .catch((e) => handlePrismaError(e, { email: "Email" }, body));

    logger.info("guru", "Guru ditambahkan", {
        ...requestContext(event),
        teacherId: teacher.id,
        email: teacher.email,
        role: teacher.role,
        ...(body.kelasWali.length && { kelasWali: labelKelasWali(body.kelasWali) }),
    });

    return teacher;
});
