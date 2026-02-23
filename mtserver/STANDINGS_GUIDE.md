# Standings System Implementation Guide

# What Was Created

# 1. **Table Schema** (`standingsSB.ts`)
- `standings_sb` table with columns:
  - `standing_id` (PK)
  - `tab_id` (FK → tabs_sb)
  - `speller_id` (FK → spellers)
  - `total_score` (computed from round scores)
  - `round_scores` (JSON array of round results)
  - `rank` (auto-calculated)
  - `updated_at` (timestamp)
  - Unique constraint: (tab_id, speller_id)

# 2. **Migration** (`0001_create_standings_table.sql`)
- Creates the `standings_sb` table in your database
- Run with: `npm run db:migrate`

# 3. **Service** (`standings.service.ts`)
Core functions:
- `updateStandingsForSpeller(drawSpellerId)` - Updates standings when a result is inserted/updated
- `getStandingsForTab(tabId)` - Retrieves standings with parsed JSON
- `initializeStandingsForSpeller(tabId, spellerId)` - Creates initial entry
- `deleteStandingsForSpeller(tabId, spellerId)` - Removes standings

# 4. **Example Controller** (`results.controller.ts`)
Shows how to integrate standings updates into your API routes

# Integration Steps

# Step 1: Run the Migration
```bash
npm run db:migrate
```

# Step 2: Import and Use in Your Routes

In your `server.ts` or route files:

```typescript
import resultsRouter from './controllers/results.controller';

app.use('/api', resultsRouter);
```

# Step 3: Use the Service in Your Code

When inserting a result:

```typescript
import { updateStandingsForSpeller } from './services/standings.service';

// After inserting a result
const result = await db.insert(resultsSB).values({
  drawSpellerId: 123,
  score: 8,
});

// Update standings
await updateStandingsForSpeller(123);
```

---

# API Endpoints

# POST /api/results
Create a new result and auto-update standings

```json
{
  "drawSpellerId": 123,
  "score": 8
}
```

# PUT /api/results/:resultId
Update a result and recalculate standings

# GET /api/standings/:tabId
Get standings for a tab

```json
[
  {
    "standingId": 1,
    "tabId": "uuid-here",
    "spellerId": 1,
    "totalScore": 21,
    "roundScores": [
      { "round_id": 1, "round_name": "Round 1", "score": 8 },
      { "round_id": 2, "round_name": "Round 2", "score": 7 },
      { "round_id": 3, "round_name": "Round 3", "score": 6 }
    ],
    "rank": 1,
    "updatedAt": "2026-02-22T10:30:00.000Z"
  }
]
```

# How It Works
# When a Result is Created/Updated:
1. **User creates/updates a result** via API
2. **`updateStandingsForSpeller()` is called** with the drawSpellerId
3. **Service queries all results** for that speller in preliminary rounds
4. **Calculates total score** and formats round scores as JSON
5. **Upserts standings** record (creates if new, updates if exists)
6. **Recalculates ranks** for ALL spellers in that tab
7. **Returns updated standings**

# Data Flow:
results_sb (new score)
    ↓
updateStandingsForSpeller()
    ↓
Draw speller info from draw_spellers
    ↓
Query all their round scores
    ↓
Aggregate + format as JSON
    ↓
Upsert into standings_sb
    ↓
Recalculate ranks (DENSE_RANK)
    ↓
standings_sb updated & ready for queries

# Customization
# Add More Functions
**Get top 3 spellers:**
```typescript
export async function getTopSpellers(tabId: string, limit: number = 3) {
  return db
    .select()
    .from(standingsSB)
    .where(eq(standingsSB.tabId, tabId))
    .orderBy(standingsSB.rank)
    .limit(limit);
}
```
**Get speller's standing:**
```typescript
export async function getSpellerStanding(tabId: string, spellerId: number) {
  const standing = await db
    .select()
    .from(standingsSB)
    .where(and(
      eq(standingsSB.tabId, tabId),
      eq(standingsSB.spellerId, spellerId)
    ))
    .limit(1);

  return standing[0];
}
```