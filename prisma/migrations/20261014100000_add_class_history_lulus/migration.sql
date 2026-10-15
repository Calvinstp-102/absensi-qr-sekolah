-- AlterTable: tambah aksi "lulus" pada histori kelas (aditif, data lama tidak berubah)
ALTER TABLE `student_class_history` MODIFY `action` ENUM('masuk_baru', 'naik_kelas', 'pindah_kelas', 'lulus') NOT NULL;
