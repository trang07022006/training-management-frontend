# ==============================================================================
# MODULE QUAN LY KHOA & MO KHOA TAI KHOAN (SCRUM-103)
# ==============================================================================

# Danh sach nguoi dung he thong mau
if (-not $script:Users) {
    $script:Users = [System.Collections.Generic.List[PSCustomObject]]::new()
    $script:Users.Add([PSCustomObject]@{ UserId = "USR01"; Username = "phungviet053"; IsLocked = $false; LockReason = "" })
    $script:Users.Add([PSCustomObject]@{ UserId = "USR02"; Username = "student_test"; IsLocked = $false; LockReason = "" })
}

# 1. Ham xem danh sach tai khoan
function Get-UserAccounts {
    return $script:Users
}

# 2. Ham Khoa tai khoan (Lock Account)
function Lock-UserAccount {
    param (
        [Parameter(Mandatory = $true)] [string]$UserId,
        [Parameter(Mandatory = $true)] [string]$Reason
    )

    $user = $script:Users | Where-Object { $_.UserId -eq $UserId }
    if (-not $user) {
        Write-Warning "[LOI] Khong tim thay nguoi dung co ID $UserId"
        return $false
    }

    if ($user.IsLocked) {
        Write-Warning "[THONG TIN] Tai khoan $UserId da bi khoa tu truoic!"
        return $false
    }

    $user.IsLocked = $true
    $user.LockReason = $Reason
    Write-Host "[THANH CONG] Da KHOA tai khoan $($user.Username) ($UserId). Ly do: $Reason" -ForegroundColor Red
    return $true
}

# 3. Ham Mo khoa tai khoan (Unlock Account)
function Unlock-UserAccount {
    param (
        [Parameter(Mandatory = $true)] [string]$UserId
    )

    $user = $script:Users | Where-Object { $_.UserId -eq $UserId }
    if (-not $user) {
        Write-Warning "[LOI] Khong tim thay nguoi dung co ID $UserId"
        return $false
    }

    if (-not $user.IsLocked) {
        Write-Warning "[THONG TIN] Tai khoan $UserId dang o trang thai hoat dong, khong can mo khoa."
        return $false
    }

    $user.IsLocked = $false
    $user.LockReason = ""
    Write-Host "[THANH CONG] Da MO KHOA tai khoan $($user.Username) ($UserId) thanh cong!" -ForegroundColor Green
    return $true
}