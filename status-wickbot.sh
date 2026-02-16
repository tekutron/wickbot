#!/bin/bash
# Check wickbot status

cd /home/j/.openclaw/wickbot

if [ ! -f wickbot.pid ]; then
    zenity --info --text="❌ wickbot is NOT running" --title="wickbot Status" 2>/dev/null || \
    echo "wickbot is NOT running"
    exit 0
fi

PID=$(cat wickbot.pid)

if ps -p $PID > /dev/null 2>&1; then
    # Get uptime
    UPTIME=$(ps -p $PID -o etime= | xargs)
    
    # Get capital from state file
    CAPITAL=$(grep -o '"currentCapital":[^,]*' wickbot_state.json 2>/dev/null | cut -d: -f2 || echo "0.2")
    
    # Count trades
    TRADES=$(grep -c '"id":' wickbot_trades.json 2>/dev/null || echo "0")
    
    zenity --info --text="✅ wickbot is RUNNING\n\nPID: $PID\nUptime: $UPTIME\nCapital: $CAPITAL SOL\nTrades: $TRADES" --title="wickbot Status" 2>/dev/null || \
    echo "✅ wickbot is RUNNING (PID: $PID, Uptime: $UPTIME)"
else
    zenity --error --text="❌ wickbot process not found\n\n(stale PID file)" --title="wickbot Status" 2>/dev/null || \
    echo "wickbot process not found (stale PID file)"
    rm wickbot.pid
fi
