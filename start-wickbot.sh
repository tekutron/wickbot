#!/bin/bash
# Start wickbot trading bot

cd /home/j/.openclaw/wickbot

# Check if already running
if [ -f wickbot.pid ]; then
    PID=$(cat wickbot.pid)
    if ps -p $PID > /dev/null 2>&1; then
        zenity --info --text="wickbot is already running (PID: $PID)" --title="wickbot" 2>/dev/null || \
        echo "wickbot is already running (PID: $PID)"
        exit 1
    fi
fi

# Start bot in background
JUPITER_API_KEY=1f76dcbd-dc35-4766-a29e-d81e2b31a7a8 \
nohup node bot.mjs > wickbot.log 2>&1 &

# Save PID
echo $! > wickbot.pid

zenity --info --text="🕯️ wickbot started!\n\nPID: $!\nLog: wickbot.log" --title="wickbot" 2>/dev/null || \
echo "🕯️ wickbot started! PID: $!"
