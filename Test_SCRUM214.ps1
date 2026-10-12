. D:\Scrum-Project\LeadCareManagement.ps1

Write-Host "=================================================" -ForegroundColor Cyan
Write-Host "      TEST SUBTASK 2: HAM GHI NHAT KY (Add-CareLog) " -ForegroundColor Cyan
Write-Host "=================================================" -ForegroundColor Cyan

Add-CareLog -LeadId "LEAD01" -Type "Goi" -Content "Cuoc goi tu van khoa hoc CNTT"
Add-CareLog -LeadId "LEAD02" -Type "Nhan" -Content "Gui tin nhan Zalo bao gia hoc phi"

Write-Host "`n--- Danh sach tat ca Nhat ky da luu trong system ---" -ForegroundColor Gray
$script:CareLogs | Format-Table -AutoSize