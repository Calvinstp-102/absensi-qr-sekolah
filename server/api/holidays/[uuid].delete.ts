// Hapus hari libur (soft delete). Libur yang sudah selesai tidak bisa dihapus.
export default defineEventHandler(async (event) => {
    const user = await requireRole(event, ADMIN_ROLES);
    const holiday = await findHolidayOr404(event);
    const status = holidayStatus(holiday, todayWibStr());

    if (status === "selesai") {
        throw appError(409, "Libur yang sudah selesai tidak dapat dihapus, karena absensi pada tanggal tersebut sudah ditetapkan.");
    }

    const mulai = dbDateStr(holiday.tanggalMulai);
    const selesai = dbDateStr(holiday.tanggalSelesai);
    await prisma.$transaction(async (tx) => {
        await tx.holiday.update({ where: { id: holiday.id }, data: { deleted: true, updatedBy: user.id } });
        await tx.auditLog.create({
            data: {
                teacherId: user.id,
                actionType: "delete_holiday",
                entityType: "holiday",
                entityId: holiday.id,
                beforeValue: {
                    tanggalMulai: mulai,
                    tanggalSelesai: selesai,
                    keterangan: holiday.keterangan,
                    jenjang: labelJenjangLibur(parseJenjangLibur(holiday.jenjang)),
                },
                afterValue: { deleted: true },
                reason: `Hapus hari libur: ${holiday.keterangan}`,
            },
        });
    });

    logger.info("pengaturan", "Hari libur dihapus", {
        ...requestContext(event),
        holidayId: holiday.id,
        status,
    });

    return {
        status: "ok",
        message:
            status === "berlangsung"
                ? `Libur "${holiday.keterangan}" dihapus. Hari ini kembali menjadi hari sekolah` +
                  (holiday.jenjang ? ` untuk ${labelJenjangLibur(parseJenjangLibur(holiday.jenjang))}.` : ".")
                : `Libur "${holiday.keterangan}" berhasil dihapus.`,
    };
});
