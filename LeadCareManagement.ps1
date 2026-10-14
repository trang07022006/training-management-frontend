if (-not $script:CareLogs) {
    $script:CareLogs = [System.Collections.Generic.List[PSCustomObject]]::new()
}

class CareLog {
    [string]$LeadId
    [string]$Type
    [string]$Content
    [datetime]$Timestamp
    [nullable[datetime]]$NextCallDate

    CareLog([string]$leadId, [string]$type, [string]$content, [nullable[datetime]]$nextCallDate) {
        $this.LeadId =$leadId
        $this.Type =$type
        $this.Content =$content
        $this.Timestamp = Get-Date
        $this.NextCallDate =$nextCallDate
    }
}

function Add-CareLog {
    param (
        [Parameter(Mandatory = $true)] [string]$LeadId,
        [Parameter(Mandatory = $true)] [ValidateSet("Goi", "Nhan", "Gap")] [string]$Type,
        [Parameter(Mandatory = $true)] [string]$Content,
        [datetime]$NextCallDate
    )
    $log = [CareLog]::new($LeadId,$Type, $Content,$NextCallDate)
    $script:CareLogs.Add($log)
    if ($NextCallDate) {
        Write-Host "[THANH CONG] Da ghi nhat ky $Type va DAT LICH GOI LAI vao:$($NextCallDate.ToString('dd/MM/yyyy HH:mm')) cho Lead$LeadId" -ForegroundColor Green
    } else {
        Write-Host "[THANH CONG] Da ghi nhat ky $Type cho Lead$LeadId" -ForegroundColor Green
    }
    return $log
}

function Get-CareLogsByLead {
    param (
        [Parameter(Mandatory = $true)] [string]$LeadId
    )
    return $script:CareLogs | Where-Object { $_.LeadId -eq$LeadId } | Sort-Object Timestamp -Descending
}

function Get-OverdueReminders {
    $now = Get-Date
    $overdueList =$script:CareLogs | Where-Object { $_.NextCallDate -ne$null -and $_.NextCallDate -lt$now }
    if ($overdueList) {
        Write-Host "`n[CANH BAO QUÁ HẠN] PHÁT HIỆN LEAD QUÁ HẠN GỌI LẠI!" -ForegroundColor Red -BackgroundColor Yellow
        foreach ($item in $overdueList) {
            Write-Host " -> Lead ID: $($item.LeadId) | Han goi: $($item.NextCallDate.ToString('dd/MM/yyyy HH:mm')) | Noi dung: $($item.Content)" -ForegroundColor Red
        }
    } else {
        Write-Host "`n[THONG TIN] Khong co Lead nao bi qua han goi lai." -ForegroundColor Cyan
    }
    return $overdueList
}
