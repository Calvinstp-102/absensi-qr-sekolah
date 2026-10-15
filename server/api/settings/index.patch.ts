import { z } from "zod";
import type { SettingSection } from "#shared/utils/setting-rules";

const SECTIONS = Object.keys(SETTING_SECTION_LABELS) as [SettingSection, ...SettingSection[]];

const updateSchema = z.object({
    section: z.enum(SECTIONS, { error: "Seksi pengaturan tidak dikenal." }),
    values: z.record(
        z.string(),
        z.string({ error: "Nilai pengaturan harus berupa teks." }).max(500, "Nilai pengaturan terlalu panjang."),
        { error: "Data pengaturan tidak valid." },
    ),
});

// Simpan pengaturan per seksi: hanya key yang berubah, divalidasi per key & antar-kolom, 1 audit per simpan
export default defineEventHandler(async (event) => {
    const user = await requireRole(event, ADMIN_ROLES);
    const body = await parseBody(event, updateSchema);
    const sectionLabel = SETTING_SECTION_LABELS[body.section];

    const keys = Object.keys(body.values);
    if (keys.length === 0) throw appError(422, "Tidak ada pengaturan yang dikirim.");

    // Validasi per key
    const fieldErrors: Record<string, string> = {};
    const values: Record<string, string> = {};
    for (const key of keys) {
        const def = isSettingKey(key) ? SETTING_DEFS[key]! : null;
        if (!def) {
            fieldErrors[key] = "Pengaturan tidak dikenal.";
            continue;
        }
        if (def.section !== body.section) {
            fieldErrors[key] = `${def.label} bukan bagian dari seksi ${sectionLabel}.`;
            continue;
        }
        values[key] = def.normalize(body.values[key]!);
        const error = def.validate(values[key]);
        if (error) fieldErrors[key] = error;
    }
    if (Object.keys(fieldErrors).length > 0) {
        const messages = Object.values(fieldErrors);
        throw appError(422, messages.length === 1 ? messages[0]! : "Periksa kembali data yang diisi.", {
            code: "VALIDATION_ERROR",
            fieldErrors,
        });
    }

    const current = await getAllSettings();
    const changed = keys.filter((k) => values[k] !== current.values[k]);
    if (changed.length === 0) {
        return { status: "ok", changed, message: "Tidak ada perubahan data.", ...current };
    }

    // Aturan antar-kolom memakai nilai tersimpan + perubahan
    const ruleErrors = validateSettingRules({ ...current.values, ...values });
    if (Object.keys(ruleErrors).length > 0) {
        const messages = Object.values(ruleErrors);
        logger.warn("pengaturan", "Simpan pengaturan ditolak: aturan jam tidak terpenuhi", {
            ...requestContext(event),
            section: body.section,
            keys: Object.keys(ruleErrors),
        });
        throw appError(422, messages.length === 1 ? messages[0]! : "Periksa kembali pengaturan jam.", {
            code: "VALIDATION_ERROR",
            fieldErrors: ruleErrors,
        });
    }

    const before = Object.fromEntries(changed.map((k) => [k, current.values[k]]));
    const after = Object.fromEntries(changed.map((k) => [k, values[k]]));

    // Hari ini tidak lagi termasuk hari sekolah -> absensi otomatis hari ini dikosongkan
    const hariIniDihapus =
        changed.includes("hari_sekolah") && !parseHariSekolah(values.hari_sekolah!).includes(wibInfo().isoWeekday);

    const dikosongkan = await prisma.$transaction(async (tx) => {
        for (const key of changed) {
            await tx.settings.upsert({
                where: { key },
                update: { value: values[key]!, updatedBy: user.nama },
                create: { key, value: values[key]!, updatedBy: user.nama },
            });
        }
        await tx.auditLog.create({
            data: {
                teacherId: user.id,
                actionType: "update_setting",
                entityType: "settings",
                entityId: 0,
                beforeValue: before,
                afterValue: after,
                reason: `Ubah pengaturan ${sectionLabel}`,
            },
        });
        return hariIniDihapus ? await bersihkanAbsensiOtomatisHariIni(tx, null) : 0;
    });

    logger.info("pengaturan", "Pengaturan diperbarui", {
        ...requestContext(event),
        section: body.section,
        keys: changed,
        ...(dikosongkan > 0 ? { absensiOtomatisDikosongkan: dikosongkan } : {}),
    });

    return {
        status: "ok",
        changed,
        message: `Pengaturan ${sectionLabel} disimpan.`,
        ...(await getAllSettings()),
    };
});
