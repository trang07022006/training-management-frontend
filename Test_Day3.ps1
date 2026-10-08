. D:\Scrum-Project\LessonManagement.ps1

Write-Host "=================================================" -ForegroundColor Cyan
Write-Host "   SCRUM-180: CHAY SUITE TEST KIEM THU TOAN BO   " -ForegroundColor Cyan
Write-Host "=================================================" -ForegroundColor Cyan

# Ready Data
Add-Lesson -SubjectId "SUB01" -STT 2 -Topic "Buoi 2: Functions" -Objective "Viet ham"
Add-Lesson -SubjectId "SUB01" -STT 1 -Topic "Buoi 1: Overview" -Objective "Co ban"

# 1. Test SCRUM-179 Preview
Write-Host "`n--- 1. Kiem tra tinh nang Preview truoc khi clone (SCRUM-179) ---" -ForegroundColor Gray
Get-ClonePreview -FromSubjectId "SUB01" -ToSubjectId "SUB02" | Format-Table -AutoSize

# 2. Test SCRUM-178 Clone
Write-Host "`n--- 2. Kiem tra Thuc hien Clone (SCRUM-178) ---" -ForegroundColor Gray
Copy-LessonsFromSubject -FromSubjectId "SUB01" -ToSubjectId "SUB02"

# 3. Test SCRUM-180 Result Validation
Write-Host "`n--- 3. Ket qua danh sach buoi mon SUB02 sau khi Clone ---" -ForegroundColor Gray
Get-LessonsBySubject -SubjectId "SUB02" | Format-Table -AutoSize