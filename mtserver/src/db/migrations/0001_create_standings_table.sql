CREATE TABLE standings_sb (
  standing_id SERIAL PRIMARY KEY,
  tab_id UUID NOT NULL REFERENCES tabs_sb(tab_id) ON DELETE CASCADE,
  speller_id INTEGER NOT NULL REFERENCES spellers(speller_id) ON DELETE CASCADE,
  total_score INTEGER NOT NULL DEFAULT 0,
  round_scores TEXT,
  rank INTEGER,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(tab_id, speller_id)
);

CREATE INDEX standings_tabId_idx ON standings_sb(tab_id);
CREATE INDEX standings_rank_idx ON standings_sb(rank);
