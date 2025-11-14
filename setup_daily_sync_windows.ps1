# PowerShell script to set up daily sync job on Windows
# Runs at 12:00 AM IST (6:30 PM UTC / 18:30 UTC) every day

$TaskName = "McRAE_Daily_Sync_Job"
$ScriptPath = Join-Path $PSScriptRoot "daily_sync_job.py"
$PythonPath = (Get-Command python).Source
$WorkingDir = $PSScriptRoot

# IST is UTC+5:30, so 12:00 AM IST = 6:30 PM UTC (previous day)
# For Windows Task Scheduler, we use local time
# 12:00 AM IST = 6:30 PM UTC = 1:30 AM EST (if server is in EST) or adjust accordingly
# For simplicity, we'll schedule at 12:00 AM local time - adjust timezone as needed

Write-Host "Setting up daily sync job..." -ForegroundColor Green
Write-Host "Task Name: $TaskName" -ForegroundColor Cyan
Write-Host "Script: $ScriptPath" -ForegroundColor Cyan
Write-Host "Python: $PythonPath" -ForegroundColor Cyan
Write-Host ""

# Remove existing task if it exists
$existingTask = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
if ($existingTask) {
    Write-Host "Removing existing task..." -ForegroundColor Yellow
    Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false
}

# Create action (run Python script)
$action = New-ScheduledTaskAction -Execute $PythonPath -Argument "`"$ScriptPath`"" -WorkingDirectory $WorkingDir

# Create trigger (daily at 12:00 AM IST)
# IST is UTC+5:30, so 12:00 AM IST = 6:30 PM UTC (previous day)
# Adjust the time below based on your server's timezone:
# - If server is in IST: use "12:00AM"
# - If server is in UTC: use "6:30PM" (previous day, but Windows doesn't support negative days easily)
# - If server is in EST: use "1:30PM" (previous day)
# For Windows, we'll use local time - adjust your server timezone or use UTC offset
$trigger = New-ScheduledTaskTrigger -Daily -At "12:00AM"

# Create settings
$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable

# Create principal (run as current user or SYSTEM)
$principal = New-ScheduledTaskPrincipal -UserId "$env:USERDOMAIN\$env:USERNAME" -LogonType Interactive -RunLevel Highest

# Register the task
try {
    Register-ScheduledTask -TaskName $TaskName -Action $action -Trigger $trigger -Settings $settings -Principal $principal -Description "Daily sync job for McRAE Analytics - Syncs Scrunch AI and GA4 data at 12 AM IST" | Out-Null
    Write-Host "[SUCCESS] Daily sync job scheduled!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Task Details:" -ForegroundColor Cyan
    Write-Host "  Name: $TaskName"
    Write-Host "  Schedule: Daily at 12:00 AM"
    Write-Host "  Script: daily_sync_job.py"
    Write-Host ""
    Write-Host "To verify, run: Get-ScheduledTask -TaskName $TaskName" -ForegroundColor Yellow
    Write-Host "To test manually, run: python daily_sync_job.py" -ForegroundColor Yellow
} catch {
    Write-Host "[ERROR] Failed to create scheduled task: $_" -ForegroundColor Red
    Write-Host ""
    Write-Host "You may need to run PowerShell as Administrator" -ForegroundColor Yellow
    exit 1
}

