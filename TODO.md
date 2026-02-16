# 🕯️ wickbot Development TODO

## Phase 1: Core Engine (Day 1)

### Data Layer
- [x] Birdeye API client
- [ ] Candle builder (aggregate 1m → 5m/15m/30m/1h)
- [ ] Data validation & error handling

### Pattern Detection
- [ ] Bullish patterns (8):
  - [ ] Hammer
  - [ ] Inverted Hammer
  - [ ] Bullish Engulfing
  - [ ] Bullish Harami
  - [ ] Morning Star
  - [ ] Three White Soldiers
  - [ ] Piercing Pattern
  - [ ] Dragonfly Doji
  
- [ ] Bearish patterns (8):
  - [ ] Shooting Star
  - [ ] Hanging Man
  - [ ] Bearish Engulfing
  - [ ] Bearish Harami
  - [ ] Evening Star
  - [ ] Three Black Crows
  - [ ] Dark Cloud Cover
  - [ ] Gravestone Doji
  
- [ ] Neutral patterns (3):
  - [ ] Doji
  - [ ] Spinning Top
  - [ ] Long-Legged Doji

### Technical Indicators
- [ ] RSI (Relative Strength Index)
- [ ] MACD (Moving Average Convergence Divergence)
- [ ] Volume analysis
- [ ] Moving Averages (SMA)
- [ ] Bollinger Bands

### Signal Generation
- [ ] Pattern scoring system
- [ ] Indicator weighting
- [ ] Multi-timeframe analysis
- [ ] BUY/SELL/HOLD decision logic

---

## Phase 2: Execution (Day 2)

### Jupiter Integration
- [ ] Swap SOL → USDC (buy signal)
- [ ] Swap USDC → SOL (sell signal)
- [ ] Route optimization
- [ ] Slippage handling
- [ ] Error recovery

### Position Management
- [ ] Track open positions
- [ ] Calculate P&L
- [ ] Monitor TP/SL targets
- [ ] Capital management
- [ ] Max drawdown protection
- [ ] Trade history logging

### Risk Management
- [ ] Position sizing (20% capital)
- [ ] Stop loss (-5%)
- [ ] Take profit (+10%)
- [ ] Max positions (1)
- [ ] Max drawdown (30%)

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

**Working on:** Phase 1 - Birdeye API integration ✅
**Next:** Candle builder

**Blockers:** None

**Notes:**
- Need Birdeye API key (free tier)
- Need funded wallet (~1.1 SOL)
