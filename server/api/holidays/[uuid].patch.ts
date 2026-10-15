// Ubah hari libur. Libur yang sudah selesai terkunci; yang sedang berlangsung tidak bisa diubah tanggal mulainya.
export default defineEventHandler(async (event) => {
    const user = await requireRole(event, ADMIN_ROLES);
    const before = await findHolidayOr404(event);
    const body = await parseBody(event, holidaySchema);
    const today = todayWibStr();
    const status = holidayStatus(before, today);

    if (status === "selesai") {
        throw appError(409, "Libur yang sudah selesai tidak dapat diubah, karena absensi pada tanggal tersebut sudah ditetapkan.");
    }

    const lama = {
        tanggalMulai: dbDateStr(before.tanggalMulai),
        tanggalSelesai: dbDateStr(before.tanggalSelesai),
        keterangan: before.keterangan,
        jenjang: before.jenjang,
    };
    const baru = { ...body, jenjang: formatJenjangLibur(body.jenjang) };

    const fieldErrors: Record<string, string> = {};
    if (status === "berlangsung") {
        if (baru.tanggalMulai !== lama.tanggalMulai) {
            fieldErrors.tanggalMulai = "Tanggal mulai libur yang sedang berlangsung tidak dapat diubah.";
        }
        if (baru.tanggalSelesai < today) {
            fieldErrors.tanggalSelesai = "Tanggal selesai libur yang sedang berlangsung tidak boleh sebelum hari ini.";
        }
    } else if (baru.tanggalMulai < today) {
        fieldErrors.tanggalMulai = "Tanggal mulai tidak boleh sebelum hari ini.";
    }
    if (Object.keys(fieldErrors).length > 0) {
        const messages = Object.values(fieldErrors);
        throw appError(422, messages.length === 1 ? messages[0]! : "Periksa kembali data yang diisi.", {
            code: "VALIDATION_ERROR",
            fieldErrors,
        });
    }

    const changed = (Object.keys(lama) as (keyof typeof lama)[]).filter((k) => lama[k] !== baru[k]);
    const hariSekolah = parseHariSekolah(await getSettingValue("hari_sekolah"));
    if (changed.length === 0) {
        const holiday = await prisma.holiday.findUniqueOrThrow({ where: { id: before.id }, include: holidayInclude });
        return { status: "ok", message: "Tidak ada perubahan data.", holiday: holidayView(holiday, hariSekolah, today) };
    }

    const tampil = (v: typeof lama) => ({ ...v, jenjang: labelJenjangLibur(parseJenjangLibur(v.jenjang)) });
    const termasukHariIni = baru.tanggalMulai <= today && today <= baru.tanggalSelesai;

    const { holiday, dikosongkan } = await prisma.$transaction(async (tx) => {
        await assertNoOverlap(tx, baru, before.id);
        const holiday = await tx.holiday.update({
            where: { id: before.id },
            data: {
                tanggalMulai: toDbDate(baru.tanggalMulai),
                tanggalSelesai: toDbDate(baru.tanggalSelesai),
                keterangan: baru.keterangan,
                jenjang: baru.jenjang,
                updatedBy: user.id,
            },
            include: holidayInclude,
        });
        await tx.auditLog.create({
            data: {
                teacherId: user.id,
                actionType: "update_holiday",
                entityType: "holiday",
                entityId: before.id,
                beforeValue: Object.fromEntries(changed.map((k) => [k, tampil(lama)[k]])),
                afterValue: Object.fromEntries(changed.map((k) => [k, tampil(baru)[k]])),
                reason: `Ubah hari libur: ${baru.keterangan}`,
            },
        });
        // Jenjang yang tidak lagi libur hari ini dihidupkan lagi oleh cron
        const dikosongkan = termasukHariIni
            ? await bersihkanAbsensiOtomatisHariIni(tx, parseJenjangLibur(baru.jenjang))
            : 0;
        return { holiday, dikosongkan };
    });

    logger.info("pengaturan", "Hari libur diperbarui", {
        ...requestContext(event),
        holidayId: before.id,
        fields: changed,
        ...(termasukHariIni ? { absensiOtomatisDikosongkan: dikosongkan } : {}),
    });

    return {
        status: "ok",
        message: "Perubahan hari libur disimpan.",
        holiday: holidayView(holiday, hariSekolah, today),
        absensiDikosongkan: dikosongkan,
    };
});
