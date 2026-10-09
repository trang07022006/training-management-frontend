. D:\Scrum-Project\UserAccountManagement.ps1

Write-Host "=================================================" -ForegroundColor Cyan
Write-Host "     TEST CHUC NANG KHOA & MO KHOA (SCRUM-103)   " -ForegroundColor Cyan
Write-Host "=================================================" -ForegroundColor Cyan

Write-Host "`n--- 1. Danh sach tai khoan ban dau ---" -ForegroundColor Gray
Get-UserAccounts | Format-Table -AutoSize

Write-Host "`n--- 2. Thuc hien KHOA tai khoan USR02 ---" -ForegroundColor Gray
Lock-UserAccount -UserId "USR02" -Reason "Vi pham quy dinh dang nhap sai qua 5 lan"

Write-Host "`n--- Danh sach tai khoan sau khi Khoa ---" -ForegroundColor Gray
Get-UserAccounts | Format-Table -AutoSize

Write-Host "`n--- 3. Thuc hien MO KHOA tai khoan USR02 ---" -ForegroundColor Gray
Unlock-UserAccount -UserId "USR02"

Write-Host "`n--- Danh sach tai khoan sau khi Mo Khoa ---" -ForegroundColor Gray
Get-UserAccounts | Format-Table -AutoSize