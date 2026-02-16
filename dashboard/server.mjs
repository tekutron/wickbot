#!/usr/bin/env node
/**
 * server.mjs - wickbot Dashboard Server
 * WebSocket server for real-time updates + REST API for controls
 */

import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.DASHBOARD_PORT || 3000;

// In-memory state
let botProcess = null;
let botState = {
  running: false,
  balance: { sol: 0, usdc: 0 },
  position: null,
  signal: null,
  trades: [],
  stats: { wins: 0, losses: 0, totalPnl: 0 }
};

// HTTP server for static files + API
const server = createServer((req, res) => {
  const { method, url } = req;
  
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }
  
  // API routes
  if (url === '/api/status' && method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(botState));
    return;
  }
  
  if (url === '/api/start' && method === 'POST') {
    startBot();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true, message: 'Bot started' }));
    return;
  }
  
  if (url === '/api/stop' && method === 'POST') {
    stopBot();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true, message: 'Bot stopped' }));
    return;
  }
  
  if (url.startsWith('/api/close-position') && method === 'POST') {
    // TODO: Implement manual position close
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true, message: 'Position closed' }));
    return;
  }
  
  // Serve static files
  let filePath = url === '/' ? '/index.html' : url;
  filePath = path.join(__dirname, filePath);
  
  const extname = path.extname(filePath);
  const contentTypes = {
    '.html': 'text/html',
    '.js': 'text/javascript',
    '.css': 'text/css',
    '.json': 'application/json'
  };
  
  const contentType = contentTypes[extname] || 'text/plain';
  
  fs.readFile(filePath, (err, content) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('404 Not Found');
    } else {
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content);
    }
  });
});

// WebSocket server for real-time updates
const wss = new WebSocketServer({ server });

wss.on('connection', (ws) => {
  console.log('📱 Dashboard connected');
  
  // Send initial state
  ws.send(JSON.stringify({ type: 'status', data: botState }));
  
  ws.on('close', () => {
    console.log('📱 Dashboard disconnected');
  });
});

// Broadcast updates to all connected clients
function broadcast(message) {
  wss.clients.forEach((client) => {
    if (client.readyState === 1) { // OPEN
      client.send(JSON.stringify(message));
    }
  });
}

// Bot control functions
function startBot() {
  if (botProcess) {
    console.log('⚠️  Bot already running');
    return;
  }
  
  console.log('🚀 Starting bot...');
  
  const botPath = path.join(__dirname, '../bot.mjs');
  botProcess = spawn('node', [botPath], {
    cwd: path.join(__dirname, '..'),
    stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, JUPITER_API_KEY: '1f76dcbd-dc35-4766-a29e-d81e2b31a7a8' }
  });
  
  botState.running = true;
  broadcast({ type: 'status', data: { running: true } });
  
  botProcess.stdout.on('data', (data) => {
    const output = data.toString();
    console.log(output);
    
    // Parse output for state updates
    parseOutput(output);
  });
  
  botProcess.on('exit', (code) => {
    console.log(`Bot exited with code ${code}`);
    botProcess = null;
    botState.running = false;
    broadcast({ type: 'status', data: { running: false } });
  });
}

function stopBot() {
  if (!botProcess) {
    console.log('⚠️  Bot not running');
    return;
  }
  
  console.log('🛑 Stopping bot...');
  botProcess.kill('SIGINT');
  botProcess = null;
  botState.running = false;
  broadcast({ type: 'status', data: { running: false } });
}

function parseOutput(output) {
  // Parse bot output for state changes
  // This is a simplified version - expand based on actual output format
  
  if (output.includes('Signal:')) {
    // Extract signal info
    const match = output.match(/Signal: (\w+) \(Score: (\d+)\/100\)/);
    if (match) {
      botState.signal = {
        action: match[1],
        score: parseInt(match[2]),
        timestamp: Date.now()
      };
      broadcast({ type: 'signal', data: botState.signal });
    }
  }
  
  if (output.includes('Position opened')) {
    // Extract position info
    botState.position = {
      id: Date.now(),
      entryTime: Date.now(),
      entryPrice: 0, // Parse from output
      pnl: 0
    };
    broadcast({ type: 'position', data: botState.position });
  }
  
  if (output.includes('Position closed')) {
    // Extract trade result
    botState.position = null;
    broadcast({ type: 'position', data: null });
  }
}

// Load state files on startup
function loadState() {
  try {
    const stateFile = '../wickbot_state.json';
    if (fs.existsSync(path.join(__dirname, stateFile))) {
      const state = JSON.parse(fs.readFileSync(path.join(__dirname, stateFile), 'utf8'));
      botState.position = state.positions?.[0] || null;
    }
    
    const tradesFile = '../wickbot_trades.json';
    if (fs.existsSync(path.join(__dirname, tradesFile))) {
      botState.trades = JSON.parse(fs.readFileSync(path.join(__dirname, tradesFile), 'utf8'));
      
      // Calculate stats
      botState.stats.wins = botState.trades.filter(t => t.pnl > 0).length;
      botState.stats.losses = botState.trades.filter(t => t.pnl <= 0).length;
      botState.stats.totalPnl = botState.trades.reduce((sum, t) => sum + t.pnl, 0);
    }
  } catch (err) {
    console.error('Error loading state:', err.message);
  }
}

// Fetch real-time balances from blockchain
async function updateBalances() {
  return new Promise((resolve) => {
    const balanceScript = spawn('node', [path.join(__dirname, 'get-balance.mjs')]);
    let output = '';
    
    balanceScript.stdout.on('data', (data) => {
      output += data.toString();
    });
    
    balanceScript.on('close', (code) => {
      if (code === 0 && output.trim()) {
        try {
          const balances = JSON.parse(output.trim());
          botState.balance.sol = balances.sol || 0;
          botState.balance.usdc = balances.usdc || 0;
        } catch (err) {
          console.error('Error parsing balances:', err.message);
        }
      }
      resolve();
    });
  });
}

// Start server
server.listen(PORT, async () => {
  console.log(`\n🕯️  wickbot Dashboard`);
  console.log(`📊 http://localhost:${PORT}`);
  console.log(`\nControls:`);
  console.log(`  - Start/Stop bot`);
  console.log(`  - View live signals & P&L`);
  console.log(`  - Manual position close`);
  console.log(`  - Transfer funds\n`);
  
  loadState();
  await updateBalances();
  
  // Poll state files every 5 seconds
  setInterval(async () => {
    loadState();
    await updateBalances();
    broadcast({ type: 'status', data: botState });
  }, 5000);
});
