# ==============================================================================
# MODULE QUAN LY BUOI HOC (SCRUM-173, SCRUM-174, SCRUM-175)
# ==============================================================================

if (-not $script:Subjects) {$script:Subjects = @(
        [PSCustomObject]@{ Id = "SUB01"; Name = "Lap trinh PowerShell"; MaxLessons = 10 }
        [PSCustomObject]@{ Id = "SUB02"; Name = "Cau truc du lieu"; MaxLessons = 15 }
    )
}

if (-not $script:Lessons) {$script:Lessons = [System.Collections.Generic.List[PSCustomObject]]::new()
}

# SCRUM-173: Model
class Lesson {
    [int]$STT
    [string]$Topic
    [string]$Objective
    [string]$SubjectId

    Lesson([int]$stt, [string]$topic, [string]$objective, [string]$subjectId) {
        $this.STT =$stt
        $this.Topic =$topic
        $this.Objective =$objective
        $this.SubjectId =$subjectId
    }
}

# SCRUM-174: Get Lessons
function Get-LessonsBySubject {
    param (
        [Parameter(Mandatory = $true)]
        [string]$SubjectId
    )
    
    return $script:Lessons | Where-Object { $_.SubjectId -eq$SubjectId }
}

# SCRUM-175: Add Lesson
function Add-Lesson {
    param (
        [Parameter(Mandatory = $true)] [string]$SubjectId,
        [Parameter(Mandatory = $true)] [int]$STT,
        [Parameter(Mandatory = $true)] [string]$Topic,
        [Parameter(Mandatory = $true)] [string]$Objective
    )

    $newLesson = [Lesson]::new($STT,$Topic, $Objective,$SubjectId)
    $script:Lessons.Add($newLesson)
    Write-Host "[THANH CONG] Da them buoi $STT -$Topic" -ForegroundColor Green
    return $newLesson
}

# SCRUM-175: Update Lesson
function Update-Lesson {
    param (
        [Parameter(Mandatory = $true)] [string]$SubjectId,
        [Parameter(Mandatory = $true)] [int]$STT,
        [string]$NewTopic,
        [string]$NewObjective
    )

    $lesson =$script:Lessons | Where-Object { $_.SubjectId -eq$SubjectId -and $_.STT -eq$STT }
    if ($lesson) {
        if ($PSBoundParameters.ContainsKey('NewTopic')) { $lesson.Topic =$NewTopic }
        if ($PSBoundParameters.ContainsKey('NewObjective')) { $lesson.Objective =$NewObjective }
        Write-Host "[THANH CONG] Da cap nhat buoi $STT" -ForegroundColor Green
        return $lesson
    } else {
        Write-Warning "[LOI] Khong tim thay buoi $STT cua mon$SubjectId"
        return $null
    }
}

# SCRUM-175: Remove Lesson
function Remove-Lesson {
    param (
        [Parameter(Mandatory = $true)] [string]$SubjectId,
        [Parameter(Mandatory = $true)] [int]$STT
    )

    $lesson =$script:Lessons | Where-Object { $_.SubjectId -eq$SubjectId -and $_.STT -eq$STT }
    if ($lesson) {
        $script:Lessons.Remove($lesson) | Out-Null
        Write-Host "[THANH CONG] Da xoa buoi $STT cua mon$SubjectId" -ForegroundColor Yellow
        return $true
    } else {
        Write-Warning "[LOI] Khong tim thay buoi $STT de xoa"
        return $false
    }
}