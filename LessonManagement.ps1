# ==============================================================================
# MODULE QUAN LY BUOI HOC - HOAN THIEN TOAN BO (SCRUM-173 DEN SCRUM-180)
# ==============================================================================

if (-not $script:Subjects) {
    $script:Subjects = @(
        [PSCustomObject]@{ Id = "SUB01"; Name = "Lap trinh PowerShell"; MaxLessons = 3 }
        [PSCustomObject]@{ Id = "SUB02"; Name = "Cau truc du lieu"; MaxLessons = 15 }
    )
}

if (-not $script:Lessons) {
    $script:Lessons = [System.Collections.Generic.List[PSCustomObject]]::new()
}

# SCRUM-173: Model Buoi hoc
class Lesson {
    [int]$STT
    [string]$Topic
    [string]$Objective
    [string]$SubjectId

    Lesson([int]$stt, [string]$topic, [string]$objective, [string]$subjectId) {
        $this.STT = $stt
        $this.Topic = $topic
        $this.Objective = $objective
        $this.SubjectId = $subjectId
    }
}

# SCRUM-174 & SCRUM-177: Get & Sort Lessons by STT
function Get-LessonsBySubject {
    param (
        [Parameter(Mandatory = $true)]
        [string]$SubjectId
    )
    
    return $script:Lessons | Where-Object { $_.SubjectId -eq $SubjectId } | Sort-Object STT
}

# SCRUM-176: Validate Limit Helper
function Test-LessonLimit {
    param (
        [Parameter(Mandatory = $true)] [string]$SubjectId
    )
    
    $subject = $script:Subjects | Where-Object { $_.Id -eq $SubjectId }
    if (-not $subject) {
        Write-Warning "[LOI] Khong tim thay mon hoc $SubjectId"
        return $false
    }

    $currentCount = ($script:Lessons | Where-Object { $_.SubjectId -eq $SubjectId }).Count
    if ($currentCount -ge $subject.MaxLessons) {
        Write-Warning "[LOI VALIDATE] Mon $SubjectId da dat gioi han toi da ($($subject.MaxLessons) buoi). Khong the them!"
        return $false
    }
    return $true
}

# SCRUM-175 & SCRUM-176: Add Lesson with Validation
function Add-Lesson {
    param (
        [Parameter(Mandatory = $true)] [string]$SubjectId,
        [Parameter(Mandatory = $true)] [int]$STT,
        [Parameter(Mandatory = $true)] [string]$Topic,
        [Parameter(Mandatory = $true)] [string]$Objective
    )

    if (-not (Test-LessonLimit -SubjectId $SubjectId)) {
        return $null
    }

    $newLesson = [Lesson]::new($STT, $Topic, $Objective, $SubjectId)
    $script:Lessons.Add($newLesson)
    Write-Host "[THANH CONG] Da them buoi $STT - $Topic" -ForegroundColor Green
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

    $lesson = $script:Lessons | Where-Object { $_.SubjectId -eq $SubjectId -and $_.STT -eq $STT }
    if ($lesson) {
        if ($PSBoundParameters.ContainsKey('NewTopic')) { $lesson.Topic = $NewTopic }
        if ($PSBoundParameters.ContainsKey('NewObjective')) { $lesson.Objective = $NewObjective }
        Write-Host "[THANH CONG] Da cap nhat buoi $STT" -ForegroundColor Green
        return $lesson
    } else {
        Write-Warning "[LOI] Khong tim thay buoi $STT cua mon $SubjectId"
        return $null
    }
}

# SCRUM-175: Remove Lesson
function Remove-Lesson {
    param (
        [Parameter(Mandatory = $true)] [string]$SubjectId,
        [Parameter(Mandatory = $true)] [int]$STT
    )

    $lesson = $script:Lessons | Where-Object { $_.SubjectId -eq $SubjectId -and $_.STT -eq $STT }
    if ($lesson) {
        $script:Lessons.Remove($lesson) | Out-Null
        Write-Host "[THANH CONG] Da xoa buoi $STT cua mon $SubjectId" -ForegroundColor Yellow
        return $true
    } else {
        Write-Warning "[LOI] Khong tim thay buoi $STT de xoa"
        return $false
    }
}

# SCRUM-179: Xem truoc (Preview) danh sach buoi truoc khi Clone
function Get-ClonePreview {
    param (
        [Parameter(Mandatory = $true)] [string]$FromSubjectId,
        [Parameter(Mandatory = $true)] [string]$ToSubjectId
    )

    Write-Host "=== BANG XEM TRUOC (PREVIEW) TRUOC KHI CLONE ===" -ForegroundColor Yellow
    $sourceLessons = Get-LessonsBySubject -SubjectId $FromSubjectId
    $targetSubject = $script:Subjects | Where-Object { $_.Id -eq $ToSubjectId }
    $targetCount = ($script:Lessons | Where-Object { $_.SubjectId -eq $ToSubjectId }).Count

    Write-Host "Mon nguon: $FromSubjectId (So buoi se copy: $($sourceLessons.Count))"
    Write-Host "Mon dich: $ToSubjectId (Hien co: $targetCount buoi / Toi da: $($targetSubject.MaxLessons) buoi)"
    
    Write-Host "`nDanh sach cac buoi se duoc clone sang mon:" -ForegroundColor Gray
    return $sourceLessons | Select-Object STT, Topic, Objective
}

# SCRUM-178: Clone
function Copy-LessonsFromSubject {
    param (
        [Parameter(Mandatory = $true)] [string]$FromSubjectId,
        [Parameter(Mandatory = $true)] [string]$ToSubjectId
    )

    $sourceLessons = Get-LessonsBySubject -SubjectId $FromSubjectId
    if (-not $sourceLessons) {
        Write-Warning "[LOI] Mon nguon $FromSubjectId khong co buoi hoc nao de clone!"
        return $false
    }

    $clonedCount = 0
    foreach ($lesson in $sourceLessons) {
        if (Test-LessonLimit -SubjectId $ToSubjectId) {
            $newLesson = [Lesson]::new($lesson.STT, $lesson.Topic, $lesson.Objective, $ToSubjectId)
            $script:Lessons.Add($newLesson)
            $clonedCount++
        } else {
            Write-Warning "[DUNG CLONE] Cham gioi han toi da cua mon $ToSubjectId"
            break
        }
    }

    Write-Host "[THANH CONG] Da nhan ban $clonedCount buoi hoc tu $FromSubjectId sang $ToSubjectId" -ForegroundColor Cyan
    return $true
}