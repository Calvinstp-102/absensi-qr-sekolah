-- AlterTable
ALTER TABLE `teachers` MODIFY `role` ENUM('superadmin', 'admin', 'guru_piket', 'wali_kelas') NOT NULL;
