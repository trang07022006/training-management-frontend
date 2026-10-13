. D:\Scrum-Project\LeadCareManagement.ps1

Write-Host "=================================================" -ForegroundColor Cyan
Write-Host "   TEST SUBTASK 3 & 4: LỊCH NHẮC & LỊCH SỬ LEAD  " -ForegroundColor Cyan
Write-Host "=================================================" -ForegroundColor Cyan

# Test Subtask 3: Ghi nhật ký và đặt lịch nhắc
$nextWeek = (Get-Date).AddDays(7)
Add-CareLog -LeadId "LEAD01" -Type "Goi" -Content "Khach dang suy nghi, hen tuan sau goi lai" -NextCallDate $nextWeek
Add-CareLog -LeadId "LEAD01" -Type "Nhan" -Content "Da gui Zalo brochure chi tiet"
Add-CareLog -LeadId "LEAD02" -Type "Gap" -Content "Tu van truc tiep tai trung tam"

# Test Subtask 4: Truy vấn lịch sử chăm sóc riêng của LEAD01
Write-Host "`n--- Lich su tuong tac cua LEAD01 (Sắp xếp mới nhất trước) ---" -ForegroundColor Yellow
Get-CareLogsByLead -LeadId "LEAD01" | Format-Table LeadId, Type, Content, Timestamp, NextCallDate -AutoSize