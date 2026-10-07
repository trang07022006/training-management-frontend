. .\LessonManagement.ps1

Write-Host "=======================================" -ForegroundColor Cyan
Write-Host "       CHAY TEST CHO SCRUM 173-175     " -ForegroundColor Cyan
Write-Host "=======================================" -ForegroundColor Cyan

# 1. Test Them
Write-Host "`n--- 1. Kiem tra Them buoi hoc (Add-Lesson) ---" -ForegroundColor Gray
Add-Lesson -SubjectId "SUB01" -STT 1 -Topic "Gioi thieu PowerShell" -Objective "Nam cu phap co ban"
Add-Lesson -SubjectId "SUB01" -STT 2 -Topic "Variables and Arrays" -Objective "Quan ly bien va mang"
Add-Lesson -SubjectId "SUB02" -STT 1 -Topic "Tong quan Cau truc du lieu" -Objective "Hieu bo nho RAM"

# 2. Test Xem
Write-Host "`n--- 2. Kiem tra Xem danh sach (Get-LessonsBySubject) ---" -ForegroundColor Gray
$list = Get-LessonsBySubject -SubjectId "SUB01"
$list | Format-Table -AutoSize

# 3. Test Sua
Write-Host "`n--- 3. Kiem tra Cap nhat buoi hoc (Update-Lesson) ---" -ForegroundColor Gray
Update-Lesson -SubjectId "SUB01" -STT 2 -NewTopic "Bien, Mang va Custom Objects"

# 4. Test Xoa
Write-Host "`n--- 4. Kiem tra Xoa buoi hoc (Remove-Lesson) ---" -ForegroundColor Gray
Remove-Lesson -SubjectId "SUB01" -STT 1

# 5. Ket qua cuoi
Write-Host "`n--- Ket qua danh sach mon SUB01 sau khi sua va xoa ---" -ForegroundColor Gray
Get-LessonsBySubject -SubjectId "SUB01" | Format-Table -AutoSize