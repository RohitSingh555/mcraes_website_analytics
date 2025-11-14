#!/bin/bash
# Linux/Mac cron job setup script
# Runs daily sync at 12:00 AM IST (6:30 PM UTC / 18:30 UTC)

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PYTHON_PATH=$(which python3 || which python)
CRON_JOB="30 18 * * * cd $SCRIPT_DIR && $PYTHON_PATH daily_sync_job.py >> $SCRIPT_DIR/logs/daily_sync.log 2>&1"

echo "Setting up daily sync cron job..."
echo "Script directory: $SCRIPT_DIR"
echo "Python path: $PYTHON_PATH"
echo ""

# Create logs directory if it doesn't exist
mkdir -p "$SCRIPT_DIR/logs"

# Add cron job (runs at 18:30 UTC = 12:00 AM IST)
(crontab -l 2>/dev/null | grep -v "daily_sync_job.py"; echo "$CRON_JOB") | crontab -

echo "[SUCCESS] Daily sync job scheduled!"
echo ""
echo "Cron job details:"
echo "  Schedule: Daily at 18:30 UTC (12:00 AM IST)"
echo "  Script: daily_sync_job.py"
echo "  Logs: $SCRIPT_DIR/logs/daily_sync.log"
echo ""
echo "To view cron jobs: crontab -l"
echo "To test manually: python3 daily_sync_job.py"

