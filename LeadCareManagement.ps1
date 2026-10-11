# ==============================================================================
# SCRUM-214-1: MODEL DATA CARELOG
# ==============================================================================

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