#!/bin/bash
# View wickbot log in terminal

cd /home/j/.openclaw/wickbot

if [ ! -f wickbot.log ]; then
    zenity --error --text="No log file found" --title="wickbot" 2>/dev/null || \
    echo "No log file found"
    exit 1
fi

# Open log in terminal with live updates
gnome-terminal --title="wickbot Log" -- bash -c "tail -f wickbot.log; exec bash" 2>/dev/null || \
xterm -title "wickbot Log" -e "tail -f wickbot.log" 2>/dev/null || \
tail -f wickbot.log
