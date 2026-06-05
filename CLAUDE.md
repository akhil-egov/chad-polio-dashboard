@AGENTS.md

## Visual verification loop

You have Puppeteer MCP available in every session. Use it as your default
way to verify any UI change — not just code review.

The loop for every frontend change:

1. Make the change
2. Screenshot the relevant URL (default localhost:3000, adjust if dev server picked a different port)
3. Review the screenshot against the intended outcome
4. If anything looks off — layout, color, missing element, overflow — fix it
5. Screenshot again to confirm the fix
6. Only then move to the next change

Never mark a UI change complete based on code alone.
The screenshot is the source of truth.

## When to screenshot

- At the start of any session touching frontend code (baseline)
- After any CSS or layout change
- After any new component is added
- After any data rendering change (table, chart, map)
- After fixing a bug someone reported

## What to look for

- No horizontal scroll at 1280px width
- Text not overflowing containers
- Colors rendering correctly (not defaulting to black/unstyled)
- Data actually appearing (not empty/zero when it shouldn't be)
- Map tiles loading (not grey boxes)

