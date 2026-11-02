# tessl.io Dunk Tank

Hit the target and drop the dev into the tessl.io tank. Watch the wind: it
changes after every throw.

## How to play

- Press and hold the mouse button on the game to charge your throw. The power
  meter on the left rises to full in 1.2 seconds, then falls back while you
  keep holding.
- Let go to throw. The longer the hold on the way up, the harder the throw.
- The wind arrow at the top shows which way the wind blows and how hard. It
  pushes the ball sideways while it flies, so throw harder into a headwind
  (an arrow pointing left) and softer with a tailwind (pointing right).
- You have 10 balls. The game ends when the last ball has landed.
- Click again on the game over screen to play another round.

## Wind

Each throw gets a random wind from 150 to the left to 150 to the right, in
px/s², rounded to 10. A new wind blows once the ball lands or dunks.

## Scoring

A dunk scores 10 points, plus 5 for every 50 of wind it beat, rounded up:

| Wind       | Points |
| ---------- | ------ |
| Calm       | 10     |
| 10 to 50   | 15     |
| 60 to 100  | 20     |
| 110 to 150 | 25     |

Your final score is saved to the carnival's score board when the game ends.

## Files

- `game.ts`: the game logic (`createState`, `startCharge`, `release`, `step`,
  `powerFor`, `rollWind`, `scoreForDunk`) and the `dunkTank` entry, the default
  export the midway finds.
- `game.test.ts`: tests for the game logic.
