#!/bin/bash
# Check if wickbot is running (exits 0 regardless, outputs JSON)

BOT_PID=$(ps aux | grep "node.*bot.mjs" | grep -v grep | awk '{print $2}' | head -1)
DASHBOARD_PID=$(ps aux | grep "dashboard/server.mjs" | grep -v grep | awk '{print $2}' | tail -1)

if [ -n "$BOT_PID" ]; then
  BOT_STATUS="running"
else
  BOT_STATUS="stopped"
fi

if [ -n "$DASHBOARD_PID" ]; then
  DASHBOARD_STATUS="running"
else
  DASHBOARD_STATUS="stopped"
fi

echo "{\"bot\":\"$BOT_STATUS\",\"botPid\":\"$BOT_PID\",\"dashboard\":\"$DASHBOARD_STATUS\",\"dashboardPid\":\"$DASHBOARD_PID\"}"
exit 0
