if (-not $script:CareLogs) {
    $script:CareLogs = [System.Collections.Generic.List[PSCustomObject]]::new()
}

class CareLog {
    [string]$LeadId
    [string]$Type        # Goi, Nhan, Gap
    [string]$Content     # Noi dung trao doi
    [datetime]$Timestamp # Thoi diem tuong tac
    [nullable[datetime]]$NextCallDate # Ngay hen goi lai

    CareLog([string]$leadId, [string]$type, [string]$content, [nullable[datetime]]$nextCallDate) {
        $this.LeadId = $leadId
        $this.Type = $type
        $this.Content = $content
        $this.Timestamp = Get-Date
        $this.NextCallDate = $nextCallDate
    }
}

# SCRUM-214-2 & SCRUM-214-3: Ham ghi nhat ky va Dat lich goi lai
function Add-CareLog {
    param (
        [Parameter(Mandatory = $true)] [string]$LeadId,
        [Parameter(Mandatory = $true)] [ValidateSet("Goi", "Nhan", "Gap")] [string]$Type,
        [Parameter(Mandatory = $true)] [string]$Content,
        [datetime]$NextCallDate
    )

    $log = [CareLog]::new($LeadId, $Type, $Content, $NextCallDate)
    $script:CareLogs.Add($log)
    
    if ($NextCallDate) {
        Write-Host "[THANH CONG] Da ghi nhat ky $Type va DAT LICH GOI LAI vao: $($NextCallDate.ToString('dd/MM/yyyy HH:mm')) cho Lead $LeadId" -ForegroundColor Green
    } else {
        Write-Host "[THANH CONG] Da ghi nhat ky $Type cho Lead $LeadId" -ForegroundColor Green
    }
    return $log
}

# SCRUM-214-4: Ham lay lich su cham soc theo Lead
function Get-CareLogsByLead {
    param (
        [Parameter(Mandatory = $true)] [string]$LeadId
    )

    return $script:CareLogs | Where-Object { $_.LeadId -eq $LeadId } | Sort-Object Timestamp -Descending
}