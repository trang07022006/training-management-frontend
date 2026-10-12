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

# SCRUM-214-2: Ham ghi nhat ky cham soc
function Add-CareLog {
    param (
        [Parameter(Mandatory = $true)] [string]$LeadId,
        [Parameter(Mandatory = $true)] [ValidateSet("Goi", "Nhan", "Gap")] [string]$Type,
        [Parameter(Mandatory = $true)] [string]$Content,
        [datetime]$NextCallDate
    )

    $log = [CareLog]::new($LeadId, $Type, $Content, $NextCallDate)
    $script:CareLogs.Add($log)
    Write-Host "[THANH CONG] Da ghi nhat ky $Type cho Lead $LeadId" -ForegroundColor Green
    return $log
}