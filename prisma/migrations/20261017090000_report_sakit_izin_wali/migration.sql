-- Modul 5 (Laporan): keterangan Sakit/Izin + penugasan wali kelas (aditif)
ALTER TABLE `attendances` MODIFY `status_koreksi` ENUM('dimaklumi', 'sakit', 'izin') NULL;

-- CreateTable
CREATE TABLE `wali_kelas` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `teacher_id` INTEGER NOT NULL,
    `jenjang` ENUM('TK', 'SD', 'SMP') NOT NULL,
    `kelas` VARCHAR(20) NOT NULL,
    `date_created` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `wali_kelas_teacher_id_idx`(`teacher_id`),
    UNIQUE INDEX `wali_kelas_jenjang_kelas_key`(`jenjang`, `kelas`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `wali_kelas` ADD CONSTRAINT `wali_kelas_teacher_id_fkey` FOREIGN KEY (`teacher_id`) REFERENCES `teachers`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
