-- Modul 2 (Scan): metode & pencatat absen masuk/pulang, catatan, pulang awal (aditif, data lama tidak berubah)
ALTER TABLE `attendances` ADD COLUMN `catatan_masuk` VARCHAR(255) NULL,
    ADD COLUMN `catatan_pulang` VARCHAR(255) NULL,
    ADD COLUMN `masuk_metode` ENUM('qr', 'manual') NULL,
    ADD COLUMN `masuk_oleh` INTEGER NULL,
    ADD COLUMN `pulang_awal` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `pulang_metode` ENUM('qr', 'manual') NULL,
    ADD COLUMN `pulang_oleh` INTEGER NULL;

-- CreateIndex
CREATE INDEX `attendances_tanggal_deleted_idx` ON `attendances`(`tanggal`, `deleted`);

-- AddForeignKey
ALTER TABLE `attendances` ADD CONSTRAINT `attendances_masuk_oleh_fkey` FOREIGN KEY (`masuk_oleh`) REFERENCES `teachers`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `attendances` ADD CONSTRAINT `attendances_pulang_oleh_fkey` FOREIGN KEY (`pulang_oleh`) REFERENCES `teachers`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- Setting baru (tidak menimpa bila key sudah ada)
INSERT IGNORE INTO `settings` (`uuid`, `key`, `value`, `description`, `deleted`, `date_created`, `date_modified`) VALUES
    (UUID(), 'hari_sekolah', '1,2,3,4,5', 'Hari sekolah (1 = Senin ... 7 = Minggu), dipisah koma', false, NOW(3), NOW(3)),
    (UUID(), 'buka_absen_pulang_menit', '30', 'Absen pulang dibuka N menit sebelum jam pulang jenjang', false, NOW(3), NOW(3)),
    (UUID(), 'batas_batal_scan_menit', '10', 'Batas waktu guru membatalkan scan yang ia catat sendiri (menit)', false, NOW(3), NOW(3));
