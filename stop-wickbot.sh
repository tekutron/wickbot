#!/bin/bash
# Stop wickbot trading bot

cd /home/j/.openclaw/wickbot

if [ ! -f wickbot.pid ]; then
    zenity --error --text="wickbot is not running (no PID file found)" --title="wickbot" 2>/dev/null || \
    echo "wickbot is not running"
    exit 1
fi

PID=$(cat wickbot.pid)

if ! ps -p $PID > /dev/null 2>&1; then
    zenity --error --text="wickbot process not found (PID: $PID)" --title="wickbot" 2>/dev/null || \
    echo "wickbot process not found"
    rm wickbot.pid
    exit 1
fi

# Stop bot
kill $PID
rm wickbot.pid

zenity --info --text="🛑 wickbot stopped!\n\nCheck wickbot.log for results" --title="wickbot" 2>/dev/null || \
echo "🛑 wickbot stopped!"
