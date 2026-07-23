---
name: gameover-i18n
description: Add, update, or audit translation keys in the Game Over app's custom i18n system. Use when adding a new screen, adding UI text, or verifying EN/DE parity. Enforces the two-file discipline (en.ts is source of truth; de.ts must stay in sync).
allowed-tools: "Read,Edit,Bash(npm run typecheck)"
version: 1.0.0
---

# Game Over i18n Skill

Rigid process skill. The i18n system lives in `src/i18n/`.

## Files

| File | Purpose |
|---|---|
| `src/i18n/en.ts` | English strings — **source of truth**. TypeScript literal types are derived from this file. |
| `src/i18n/de.ts` | German strings — must mirror every key in `en.ts`. Types use `DeepString<typeof en>` so German values can be any `string`. |
| `src/i18n/index.ts` | Exports `useTranslation()` hook and `getTranslation()` utility. Do not add strings here. |

## Step 1 — Identify what strings need adding/changing

Read the screen or component that needs the text. Determine the logical section name (e.g. `events`, `chat`, `wizard`, `profile`, `booking`).

## Step 2 — Add to `en.ts` first

Open `src/i18n/en.ts`. Add under the appropriate section, or create a new top-level section if the screen is new.

```typescript
// Example: adding a new section for a "notifications" screen
notifications: {
  title: 'Notifications',
  emptyState: 'No notifications yet',
  markAllRead: 'Mark all as read',
},
```

Rules:
- Keys use camelCase
- Values are English strings (no HTML, no JSX)
- Do NOT use `\uXXXX` escapes — use actual UTF-8 characters
- Nest by screen/feature, not by component

## Step 3 — Mirror in `de.ts`

Open `src/i18n/de.ts`. Add the **exact same key structure** with German translations.

```typescript
notifications: {
  title: 'Benachrichtigungen',
  emptyState: 'Noch keine Benachrichtigungen',
  markAllRead: 'Alle als gelesen markieren',
},
```

Rules:
- Key structure must exactly match `en.ts` (same nesting, same key names)
- German strings can be longer — that is expected
- For unknown translations, use the English value as a placeholder and flag it with a comment `// TODO: translate`

## Step 4 — Use in the component

**Inside React components:**
```typescript
const { t } = useTranslation();
// Access: t.notifications.title
<Text>{t.notifications.title}</Text>
```

**Outside React (e.g. Alert callbacks, utility functions):**
```typescript
import { getTranslation } from '@/i18n';
const t = getTranslation();
Alert.alert(t.errors.generic);
```

**Never:**
- Hardcode strings directly in JSX (except legal pages — they use their own bilingual SECTIONS/CONTENT objects)
- Call `useColorScheme()` or any hook inside `getTranslation()` callbacks

## Step 5 — Verify TypeScript parity

```bash
npm run typecheck
```

If TypeScript errors mention `de.ts` missing a key — the key was added to `en.ts` but not mirrored. Go back to Step 3.

## Special cases

**Legal pages** (`app/(tabs)/profile/terms.tsx`, `privacy.tsx`, `impressum.tsx`) are bilingual via their own SECTIONS/CONTENT objects keyed by language. Do not add legal text to `en.ts`/`de.ts`.

**Audit for missing keys:**
```bash
# Quick check — keys in en.ts that might not be in de.ts
grep -n "^\s\+\w\+:" src/i18n/en.ts | wc -l
grep -n "^\s\+\w\+:" src/i18n/de.ts | wc -l
```

If counts differ significantly, read both files and find the gap.
