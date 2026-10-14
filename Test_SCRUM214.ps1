. D:\Scrum-Project\LeadCareManagement.ps1

Write-Host "=================================================" -ForegroundColor Cyan
Write-Host "   TEST SUBTASK 5 & 6: CANH BAO QUÁ HẠN & TOTAL UNIT TEST " -ForegroundColor Cyan
Write-Host "=================================================" -ForegroundColor Cyan

# 1. Test Ghi nhat ky & dat lich tuong lai
Add-CareLog -LeadId "LEAD01" -Type "Goi" -Content "Khach hen tuan sau goi lai" -NextCallDate ((Get-Date).AddDays(7))
Add-CareLog -LeadId "LEAD02" -Type "Nhan" -Content "Da gui brochure Zalo"

# 2. Test Dat lich bi QUÁ HẠN (Lich hen trong khu vuc qua han)
Add-CareLog -LeadId "LEAD03" -Type "Goi" -Content "Khach bao ban, hen 2 tiếng sau goi lai" -NextCallDate ((Get-Date).AddHours(-2))

# 3. Test Truy van lich su LEAD01
Write-Host "`n--- Lich su tuong tac LEAD01 ---" -ForegroundColor Yellow
Get-CareLogsByLead -LeadId "LEAD01" | Format-Table LeadId, Type, Content, NextCallDate -AutoSize

# 4. Test Kiem tra Danh sach QUÁ HẠN goi lai (SCRUM-214-5)
Write-Host "`n--- Kiem tra Canh bao Quá hạn Gọi lại ---" -ForegroundColor Yellow
Get-OverdueReminders | Format-Table LeadId, Type, Content, NextCallDate -AutoSize