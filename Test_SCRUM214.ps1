. D:\Scrum-Project\LeadCareManagement.ps1

Write-Host "=================================================" -ForegroundColor Cyan
Write-Host "      TEST SUBTASK 1: KHỞI TẠO MODEL CARELOG     " -ForegroundColor Cyan
Write-Host "=================================================" -ForegroundColor Cyan

# Tao thu 1 doi tuong CareLog
$sampleLog = [CareLog]::new("LEAD01", "Goi", "Khach hoi ve hoc phi", (Get-Date).AddDays(3))

Write-Host "`n[THANH CONG] Da khoi tao doi tuong CareLog thanh cong:" -ForegroundColor Green
$sampleLog | Format-List