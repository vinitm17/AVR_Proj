# AVR EV Charging — Manual Test Cases (Live Demo Checklist)

All tests are manual. Run these in order before any live demo. Mark each ✅ pass or ❌ fail.

---

## 1. Authentication

### 1.1 Sign Up
**Steps:**
1. Open app → click Sign Up
2. Enter name, email, password
3. Submit

**Check:**
- Redirected to dashboard
- Name shown in welcome header
- Points balance = 0

---

### 1.2 Sign In
**Steps:**
1. Sign out (if logged in)
2. Go to Sign In
3. Enter valid credentials → submit

**Check:**
- Redirected to dashboard
- Correct user name displayed
- No error toast

---

### 1.3 Wrong password
**Steps:**
1. Sign In with correct email + wrong password

**Check:**
- Error message shown
- Not redirected to dashboard

---

### 1.4 Sign Out
**Steps:**
1. Click sign out / profile menu

**Check:**
- Redirected to sign in / landing
- Navigating to `/` or `/stations` redirects back to sign in

---

## 2. Dashboard

### 2.1 Points balance display
**Steps:**
1. Log in with a known account

**Check:**
- Points balance matches expected value
- Estimated minutes = points × 5 (shown below balance)

---

### 2.2 Stats cards
**Check:**
- "Available points" matches balance
- "Total sessions" reflects completed sessions
- "Stations used" reflects unique stations

---

### 2.3 Charging readiness panel
**Check:**
- If balance > 0: shows "You can start a charging session"
- If balance = 0: shows "Add points before charging"
- History/stations rows update based on account activity

---

## 3. Points Recharge (Razorpay Demo)

### 3.1 Open recharge sheet
**Steps:**
1. Click "Recharge" button on the balance card

**Check:**
- Sheet slides in from the right
- Three plan cards visible: 100pts/₹99, 500pts/₹399 (Popular badge), 1000pts/₹749
- Custom amount input available

---

### 3.2 Select a plan
**Steps:**
1. Click the "Popular" plan (500pts / ₹399)

**Check:**
- Card gets dark border / highlighted state
- Summary section appears: shows 500 pts, ~2500 min, ₹399
- "Proceed to Pay ₹399" button becomes active

---

### 3.3 Custom amount
**Steps:**
1. Clear plan selection
2. Type `200` in the custom input

**Check:**
- Price shows ₹198 (200 × ₹0.99)
- Summary updates to 200 pts, ~1000 min
- Proceed button shows ₹198

---

### 3.4 Proceed to Pay — UPI flow
**Steps:**
1. Select any plan → click "Proceed to Pay"
2. Razorpay demo modal opens
3. UPI tab selected by default
4. Type any text in UPI field (e.g. `test@demo`)
5. Click "Pay ₹X"

**Check:**
- Modal shows blue Razorpay header with "DEMO" badge
- "Processing payment..." spinner appears for ~2.5s
- Success screen appears with green checkmark
- Shows correct points and amount
- Transaction ID shown (starts with DEMO)

---

### 3.5 Success — balance updates
**Steps:**
1. After success, click "Done"

**Check:**
- Sheet closes
- Dashboard balance card shows increased points
- Success toast appears
- Estimated minutes updates accordingly

---

### 3.6 Card payment flow
**Steps:**
1. Open recharge → select plan → Proceed to Pay
2. Switch to "Card" tab
3. Enter: 4111 1111 1111 1111 | 12/26 | 123
4. Click Pay

**Check:**
- Same processing → success flow as UPI
- Points added correctly

---

### 3.7 No plan selected
**Steps:**
1. Open sheet, do NOT select a plan or enter custom amount
2. Click "Proceed to Pay"

**Check:**
- Button is disabled (greyed out)
- No modal opens

---

## 4. Stations Page

### 4.1 Load stations
**Steps:**
1. Navigate to Stations

**Check:**
- Stations list loads within 2s (no spinner stuck)
- No "Failed to load stations" error
- Station cards show status (Available / Occupied / Faulty)

---

### 4.2 Station status accuracy
**Check per card:**
- Green badge = Available (no active session)
- Yellow badge = Occupied (active session running)
- Red badge = Faulty
- Health bar percentage shown
- Energy consumption shown

---

### 4.3 Search by Station ID
**Steps:**
1. Type station ID (e.g. `2`) in search box

**Check:**
- Only stations matching that ID shown
- Clear Filters button appears

---

### 4.4 Filter by city
**Steps:**
1. Select a city from the dropdown

**Check:**
- Only stations in that city shown
- Count in header updates

---

### 4.5 Clear filters
**Steps:**
1. Apply a filter → click "Clear Filters"

**Check:**
- All stations shown again
- Clear Filters button disappears

---

### 4.6 Auto-refresh
**Steps:**
1. Keep the stations page open for 30s (don't interact)

**Check:**
- Station data refreshes silently (no loading spinner, no flicker)
- If a session ended during 30s, the station status updates

---

## 5. Station Detail Drawer

### 5.1 Open station drawer
**Steps:**
1. Click "View Details & Connect" on any station card

**Check:**
- Right-side drawer opens
- Station info panel shows location, status, health, energy, operator
- Map panel shows on right side

---

### 5.2 Available station — start charging
**Prerequisites:** Station is Available, user has points

**Steps:**
1. Open an Available station
2. Enter points amount (e.g. 2)
3. Click "Start Charging (2 points)"

**Check:**
- Toast "Charging started" appears immediately (not after 5s delay)
- Countdown timer starts ticking immediately
- Safety checklist appears
- Remaining time = points × 5 minutes (e.g. 2pts = 10:00)
- "Stop Charging" section becomes visible

---

### 5.3 Timer counts down live
**Steps:**
1. Start a charging session (use 1 point = 5 min timer)
2. Watch for 30s

**Check:**
- Timer decrements every second
- Points draining counter updates

---

### 5.4 Stop charging manually
**Steps:**
1. Start charging → wait at least a few seconds
2. Click "Stop Charging"

**Check:**
- Toast shows: "Charging stopped! Time: X min · Coins Used: Y"
- Drawer now shows "Start Charging" section (session ended)
- Station card updates to Available on next refresh
- History page shows the session

---

### 5.5 Charging completes automatically (timer expires)
**Steps:**
1. Start a session with 1 point (5 min timer) OR use backend to set a short estimated duration
2. Wait for timer to reach 0

**Check:**
- Toast "Charging session completed · Saved to history"
- Drawer no longer shows "Active Charging" section (no stale state)
- Station shows as Available (should update without manual refresh)

---

### 5.6 Occupied station — shows time remaining
**Steps:**
1. Open a station that is Occupied

**Check:**
- "Estimated Availability" panel visible
- "Charging since: X min ago" shown
- Live countdown timer ticking (e.g. "4m 23s")
- "Almost free!" alert if < 5 min remaining

---

### 5.7 Cannot start charging when station is occupied
**Check:**
- "Start Charging" section NOT visible on an Occupied station
- Queue section shown instead

---

### 5.8 Cannot start charging with 0 points
**Steps:**
1. Use an account with 0 points
2. Open an Available station

**Check:**
- "Start Charging" button disabled
- Error shown if somehow clicked

---

## 6. Queue System

### 6.1 Join queue
**Prerequisites:** Station is Occupied

**Steps:**
1. Open an Occupied station drawer
2. Click "Join Queue"

**Check:**
- Toast "Joined the queue at position #X"
- Queue section immediately updates to show your position (no refresh needed)
- "Leave Queue" button appears
- Position number displayed (e.g. "#1")

---

### 6.2 Queue position updates live
**Steps:**
1. Join queue for an occupied station
2. Wait for auto-refresh (30s) or have another user join

**Check:**
- Queue count updates automatically
- Your position reflects current queue state

---

### 6.3 Leave queue
**Steps:**
1. Join a queue → click "Leave Queue"

**Check:**
- Toast "You have left the queue successfully"
- Queue section immediately reverts to "Join Queue" button (no refresh needed)
- Queue count decreases

---

### 6.4 Already in queue
**Steps:**
1. Join a queue
2. Try to join the same queue again (via another tab or re-click)

**Check:**
- Error: "You are already in the queue at position #X"

---

### 6.5 Queue not shown for Available stations
**Check:**
- Available station drawer shows NO queue section
- Only "Start Charging" section

---

### 6.6 First in queue gets priority
**Steps:**
1. User A starts charging at Station X
2. User B joins queue (position #1)
3. User A stops charging

**Check:**
- Station becomes Available
- User B's queue status shows "It's your turn!" (NOTIFIED)
- User B can start charging
- User C (not in queue) gets "queue active" warning if they try to start

---

## 7. Multi-station Protection

### 7.1 Cannot charge at two stations simultaneously
**Steps:**
1. Start charging at Station A
2. Open Station B (Available) in the drawer
3. Try to click "Start Charging"

**Check:**
- Button is disabled (greyed out)
- Error toast: "You already have an active charging session at another station"
- Backend also rejects if somehow bypassed

---

## 8. History Page

### 8.1 Sessions listed
**Steps:**
1. Complete at least one charging session
2. Navigate to History

**Check:**
- Session appears in list
- Shows: station location, date, total time, coins used
- Most recent at top

---

### 8.2 Active session shown
**Steps:**
1. Start a charging session
2. Open History page

**Check:**
- Active session shows with "Active" badge
- No end time shown yet

---

## 9. Edge Cases & Error States

### 9.1 Network offline — stations fail gracefully
**Steps:**
1. Disconnect network
2. Navigate to Stations or refresh

**Check:**
- "Failed to load stations. Please try again." error shown
- "Try again" button visible and functional

---

### 9.2 Station goes faulty during session
**Check:**
- Station shows red "Faulty" badge
- If user tries to start: error returned

---

### 9.3 Session expired on backend but not yet reconciled
**Steps:**
1. Start a 1-point session (5 min estimated)
2. Wait for timer to expire
3. Immediately check the station

**Check:**
- Station shown as Available (virtual expiry in GET /stations)
- No manual refresh needed

---

### 9.4 Page refresh mid-session
**Steps:**
1. Start charging
2. Refresh the browser

**Check:**
- `isCurrentUserCharging: true` returned from server
- "Active Charging" / "Stop Charging" section visible in the drawer
- Note: local countdown resets (this is expected — local timer is not persisted)

---

## 10. Quick Pre-Demo Smoke Test (5 min run)

Run these in sequence right before the demo:

| # | Action | Expected |
|---|--------|----------|
| 1 | Sign in | Dashboard loads, correct name |
| 2 | Check balance | Correct points shown |
| 3 | Click Recharge → select Popular plan → UPI → Pay | Points + 500, success screen |
| 4 | Go to Stations | All stations load, no error |
| 5 | Open an Available station | Drawer opens, map visible |
| 6 | Enter 1 point → Start Charging | Timer starts immediately |
| 7 | Wait 5s → Stop Charging | Session ends, toast shown |
| 8 | Open an Occupied station | Time remaining visible |
| 9 | Join queue | Position shown immediately |
| 10 | Leave queue | Reverts to "Join Queue" immediately |
| 11 | Go to History | Session from step 7 listed |
| 12 | Sign out → Sign in again | Works cleanly |

All 12 must pass before going live.
