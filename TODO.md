# 🕯️ wickbot Development TODO

## Phase 1: Core Engine (Day 1)

### Data Layer
- [x] Birdeye API client
- [x] Candle builder (aggregate 1m → 5m/15m/30m/1h)
- [x] Data validation & error handling

### Pattern Detection
- [x] Bullish patterns (8):
  - [x] Hammer
  - [x] Inverted Hammer
  - [x] Bullish Engulfing
  - [x] Bullish Harami
  - [x] Morning Star
  - [ ] Three White Soldiers (TODO)
  - [x] Piercing Pattern
  - [x] Dragonfly Doji
  
- [x] Bearish patterns (8):
  - [x] Shooting Star
  - [x] Hanging Man
  - [x] Bearish Engulfing
  - [x] Bearish Harami
  - [x] Evening Star
  - [ ] Three Black Crows (TODO)
  - [x] Dark Cloud Cover
  - [x] Gravestone Doji
  
- [x] Neutral patterns (3):
  - [x] Doji
  - [x] Spinning Top
  - [ ] Long-Legged Doji (TODO)

### Technical Indicators
- [x] RSI (Relative Strength Index)
- [x] MACD (Moving Average Convergence Divergence)
- [x] Volume analysis
- [x] Moving Averages (SMA)
- [x] Bollinger Bands

### Signal Generation
- [x] Pattern scoring system
- [x] Indicator weighting
- [x] Multi-timeframe analysis
- [x] BUY/SELL/HOLD decision logic

---

## Phase 2: Execution (Day 2)

### Jupiter Integration
- [x] Swap SOL → USDC (buy signal)
- [x] Swap USDC → SOL (sell signal)
- [x] Route optimization (Jupiter API v6)
- [x] Slippage handling (0.5% default)
- [x] Error recovery (max retries: 3)

### Position Management
- [x] Track open positions
- [x] Calculate P&L
- [x] Monitor TP/SL targets
- [x] Capital management
- [x] Max drawdown protection
- [x] Trade history logging

### Risk Management
- [x] Position sizing (20% capital)
- [x] Stop loss (-5%)
- [x] Take profit (+10%)
- [x] Max positions (1)
- [x] Max drawdown (30%)

---

## Phase 3: Dashboard (Day 3)

### Backend
- [ ] WebSocket server
- [ ] Real-time data broadcasting
- [ ] State persistence

### Frontend
- [ ] Lightweight Charts setup
- [ ] Candle chart rendering
- [ ] Pattern markers
- [ ] Signal indicators
- [ ] Position display
- [ ] P&L chart
- [ ] Stats panel

### UI/UX
- [ ] Responsive layout
- [ ] Dark mode (default)
- [ ] Mobile-friendly
- [ ] Real-time updates

---

## Phase 4: Testing & Optimization

### Testing
- [ ] Unit tests (pattern detection)
- [ ] Integration tests (end-to-end flow)
- [ ] Backtesting framework
- [ ] Paper trading mode

### Optimization
- [ ] Pattern weight tuning
- [ ] Indicator threshold optimization
- [ ] Signal scoring calibration
- [ ] Performance profiling

### Documentation
- [ ] Setup guide
- [ ] Configuration guide
- [ ] Pattern library
- [ ] API reference

---

## Future Enhancements

- [ ] Multi-token support (not just SOL/USDC)
- [ ] Advanced patterns (island reversal, cup & handle, etc.)
- [ ] Machine learning signal scoring
- [ ] Telegram notifications
- [ ] Mobile app
- [ ] Cloud deployment
- [ ] Strategy backtesting UI

---

## Current Status

**Working on:** Phase 2 - Jupiter integration
**Completed:** 
- ✅ Phase 1 Core Engine (Birdeye, Candle Builder, 15 Patterns, Indicators, Signals)
- ✅ Position Manager (P&L tracking, TP/SL monitoring, risk management)

**Next:** 
- Jupiter swap integration (SOL ↔ USDC)
- Dashboard (WebSocket + charts)

**Blockers:** None

**Notes:**
- Need Birdeye API key (free tier)
- Need funded wallet (~1.1 SOL)
- 15/20 patterns implemented (missing 3 White Soldiers, 3 Black Crows, Long-Legged Doji)
