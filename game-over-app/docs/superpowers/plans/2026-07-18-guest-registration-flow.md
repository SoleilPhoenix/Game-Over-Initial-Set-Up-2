# Gäste-Registrierungs-Flow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Den Gäste-Registrierungs-Flow verifizieren, drei Bugs beheben (stiller Foto-Upload-Fehler, E-Mail-Confirmation-Sackgasse, divergierende Namensquelle) und den bisher englischen Gäste-Flow auf EN/DE-Parität bringen.

**Architecture:** React Native (Expo Router) + Supabase. Der Invite-Wizard (`app/invite/[code].tsx`) und die Gäste-verwalten-Seite (`app/event/[id]/participants.tsx`) werden auf `useTranslation()` umgestellt; die Namensauflösung in der Organisator-Ansicht wird in eine pure, testbare Hilfsfunktion extrahiert (Option B: Selbstangabe des Gastes gewinnt nach Registrierung). Absicherung über einen i18n-Parität-Unit-Test und eine Detox-E2E-Erweiterung.

**Tech Stack:** TypeScript, Expo Router, Tamagui, react-hook-form + zod, Supabase JS v2, Vitest (Unit), Detox (E2E), custom i18n (`src/i18n/`).

**Spec:** `docs/superpowers/specs/2026-07-18-guest-registration-flow-design.md`

---

## File Structure

- `src/i18n/en.ts` - Quelle der Wahrheit; neuer `invite`-Block + Ergänzungen in `manageInvitations`.
- `src/i18n/de.ts` - deutsches Spiegelbild derselben Keys.
- `app/invite/[code].tsx` - auf `useTranslation()` umstellen; Bug 1 (Foto-Upload sichtbar) + Bug 2 (Confirmation-Sackgasse).
- `src/utils/guestDisplay.ts` - NEU: pure Hilfsfunktion `resolveGuestDisplay()` (Option B), unit-testbar.
- `app/event/[id]/participants.tsx` - `resolveGuestDisplay()` einsetzen (Bug 3) + Rest-Strings auf i18n.
- `__tests__/i18n/parity.test.ts` - NEU: EN/DE-Parität.
- `__tests__/utils/guestDisplay.test.ts` - NEU: Unit-Tests Option B.
- `e2e/invites/inviteSystem.test.ts` - E2E-Erweiterung um Signup→Profil→Beitritt.

---

## Phase 0: Backend-Datenfluss real verifizieren (grounding)

### Task 0: Realen Invite anlegen und Datenkette prüfen

Diese Aufgabe ist reine Verifikation (kein Code) und liefert den Ist-Zustand, bevor Code geändert wird.
Ausführung über den Supabase-MCP (`execute_sql`, Projekt `stdbvehmjpmqbjyiodqg`).

- [ ] **Step 1: Testevent + Testcode-Datensatz prüfen**

Read-only SQL ausführen und die Existenz der Seed-Codes aus dem E2E-Test bestätigen:

```sql
select code, event_id, guest_first_name, guest_last_name, guest_email, guest_phone,
       max_uses, use_count, is_active, expires_at
from invite_codes
order by created_at desc
limit 10;
```

Expected: Zeilen vorhanden; Gastspalten werden befüllt, wenn über die Edge Function eingeladen wurde.

- [ ] **Step 2: Datenkette eines registrierten Gastes prüfen**

```sql
select ep.event_id, ep.user_id, ep.role, ep.confirmed_at,
       p.full_name, p.phone, p.avatar_url
from event_participants ep
join profiles p on p.id = ep.user_id
where ep.role = 'guest'
order by ep.confirmed_at desc nulls last
limit 10;
```

Expected: Für registrierte Gäste sind `full_name`, ggf. `phone` und `avatar_url` gesetzt - das belegt, ob Selbstangaben + Foto ankommen.

- [ ] **Step 3: Befund im Spec festhalten**

Ergebnis (Übertragung sauber ja/nein, aktueller Confirmation-Status) als kurzen Absatz unter "Verifizierter Ist-Zustand" im Spec ergänzen.
Kein Commit nötig - wird mit Phase 1 mitcommittet.

---

## Phase 1: i18n-Keys

### Task 1: `invite`-Block + `manageInvitations`-Ergänzungen in en.ts und de.ts

**Files:**
- Modify: `src/i18n/en.ts` (neuer `invite`-Block vor der schließenden `manageInvitations`/`paymentReminders`-Struktur; Ergänzung in `manageInvitations`)
- Modify: `src/i18n/de.ts` (identische Keys)

- [ ] **Step 1: Neuen `invite`-Block in `en.ts` einfügen**

Unmittelbar nach dem `manageInvitations: { ... },`-Block in `src/i18n/en.ts` einfügen:

```typescript
  // ─── Guest Invite Wizard ─────────────────────────
  invite: {
    invalidTitle: 'This invite link is no longer valid',
    invalidBody: 'The link may have expired, already been used, or been revoked. Ask the organizer for a new one.',
    goToApp: 'Go to App',
    invitedBy: 'Invited by',
    accept: 'Accept Invitation →',
    decline: 'Decline',
    webBannerHave: 'Already have the app? ',
    webBannerOpen: 'Open in Game Over →',
    joining: 'Joining: {{event}}',
    createAccount: 'Create your account',
    firstName: 'First Name',
    lastName: 'Last Name',
    email: 'Email',
    password: 'Password',
    confirmPassword: 'Confirm Password',
    createAccountCta: 'Create Account →',
    alreadyHaveAccount: 'Already have an account? ',
    loginInstead: 'Log in instead →',
    almostThere: 'Almost there',
    completeProfile: 'Complete your profile',
    profilePhotoOptional: 'Profile photo (optional)',
    phone: 'Phone Number',
    phonePlaceholder: '+49 151 1234567',
    continueCta: 'Continue →',
    skipStep: 'Skip this step →',
    valRequired: 'Required',
    valInvalidEmail: 'Please enter a valid email',
    valPasswordMin: 'Password must be at least 8 characters',
    valPasswordUpper: 'Must contain an uppercase letter',
    valPasswordLower: 'Must contain a lowercase letter',
    valPasswordNumber: 'Must contain a number',
    valPasswordsNoMatch: 'Passwords do not match',
    valPhoneInvalid: 'Please enter a valid phone number',
    errorTitle: 'Error',
    authFailed: 'Authentication failed. Please try again.',
    couldNotJoin: 'Could not join event.',
    joinFailed: 'Failed to join event. Please try again.',
    signupFailedTitle: 'Signup failed',
    tryAgain: 'Please try again.',
    emailExists: 'An account with this email already exists — tap "Log in instead" below',
    confirmEmailTitle: 'Almost there!',
    confirmEmailBody: 'Your account is created. Log in to finish joining the event.',
    confirmEmailCta: 'Log in',
    invalidFileTitle: 'Invalid file',
    invalidFileBody: 'Please select a JPEG, PNG, or WebP image.',
    fileTooLargeTitle: 'File too large',
    fileTooLargeBody: 'Please select an image under 5 MB.',
    uploadFailedTitle: 'Photo upload failed',
    uploadFailedBody: 'We could not upload your photo. You can continue without it or try again.',
    uploadFailedContinue: 'Continue without photo',
    uploadFailedRetry: 'Try again',
    skipProfileTitle: 'Skip profile?',
    skipProfileBody: "Your phone number won't be saved. You can add it later in profile settings.",
    stay: 'Stay',
    skip: 'Skip',
    completeProfileError: 'Failed to complete profile.',
  },
```

- [ ] **Step 2: Zwei fehlende Keys in `manageInvitations` (en.ts) ergänzen**

Innerhalb des bestehenden `manageInvitations: { ... }` in `src/i18n/en.ts` diese Keys hinzufügen (vor der schließenden `},`):

```typescript
    total: 'Total',
    confirmSlot: 'Confirm',
    inviteAllGuests: 'Invite All Guests',
    sendFromGameOver: 'SEND FROM GAME OVER',
    sendingEmail: 'Sending email invitations…',
    sendingWhatsapp: 'Sending WhatsApp invitations…',
    emailSent: 'Email Sent',
    whatsappSent: 'WhatsApp Sent',
    sendAnotherChannel: 'Send another channel',
    shareOther: 'Or share invite link via other apps →',
    tapAddPhone: 'Tap to add phone number',
    tapAddContact: 'Tap to add contact details',
    sentSummary: '{{sent}} sent',
    guestUnit: 'guest',
    guestUnitPlural: 'guests',
    duplicateTitle: 'Duplicate contact',
  },
```

- [ ] **Step 3: Identische Keys in `de.ts` einfügen (invite-Block)**

Nach dem `manageInvitations`-Block in `src/i18n/de.ts`:

```typescript
  // ─── Guest Invite Wizard ─────────────────────────
  invite: {
    invalidTitle: 'Dieser Einladungslink ist nicht mehr gültig',
    invalidBody: 'Der Link ist möglicherweise abgelaufen, bereits verwendet oder widerrufen worden. Bitte den Organisator um einen neuen.',
    goToApp: 'Zur App',
    invitedBy: 'Eingeladen von',
    accept: 'Einladung annehmen →',
    decline: 'Ablehnen',
    webBannerHave: 'Hast du die App schon? ',
    webBannerOpen: 'In Game Over öffnen →',
    joining: 'Beitritt: {{event}}',
    createAccount: 'Konto erstellen',
    firstName: 'Vorname',
    lastName: 'Nachname',
    email: 'E-Mail',
    password: 'Passwort',
    confirmPassword: 'Passwort bestätigen',
    createAccountCta: 'Konto erstellen →',
    alreadyHaveAccount: 'Hast du bereits ein Konto? ',
    loginInstead: 'Stattdessen anmelden →',
    almostThere: 'Fast geschafft',
    completeProfile: 'Profil vervollständigen',
    profilePhotoOptional: 'Profilbild (optional)',
    phone: 'Telefonnummer',
    phonePlaceholder: '+49 151 1234567',
    continueCta: 'Weiter →',
    skipStep: 'Diesen Schritt überspringen →',
    valRequired: 'Erforderlich',
    valInvalidEmail: 'Bitte eine gültige E-Mail eingeben',
    valPasswordMin: 'Passwort muss mindestens 8 Zeichen haben',
    valPasswordUpper: 'Muss einen Großbuchstaben enthalten',
    valPasswordLower: 'Muss einen Kleinbuchstaben enthalten',
    valPasswordNumber: 'Muss eine Zahl enthalten',
    valPasswordsNoMatch: 'Passwörter stimmen nicht überein',
    valPhoneInvalid: 'Bitte eine gültige Telefonnummer eingeben',
    errorTitle: 'Fehler',
    authFailed: 'Anmeldung fehlgeschlagen. Bitte erneut versuchen.',
    couldNotJoin: 'Beitritt zum Event nicht möglich.',
    joinFailed: 'Beitritt fehlgeschlagen. Bitte erneut versuchen.',
    signupFailedTitle: 'Registrierung fehlgeschlagen',
    tryAgain: 'Bitte erneut versuchen.',
    emailExists: 'Mit dieser E-Mail existiert bereits ein Konto — tippe unten auf „Stattdessen anmelden“',
    confirmEmailTitle: 'Fast geschafft!',
    confirmEmailBody: 'Dein Konto wurde erstellt. Melde dich an, um dem Event beizutreten.',
    confirmEmailCta: 'Anmelden',
    invalidFileTitle: 'Ungültige Datei',
    invalidFileBody: 'Bitte ein JPEG-, PNG- oder WebP-Bild wählen.',
    fileTooLargeTitle: 'Datei zu groß',
    fileTooLargeBody: 'Bitte ein Bild unter 5 MB wählen.',
    uploadFailedTitle: 'Foto-Upload fehlgeschlagen',
    uploadFailedBody: 'Dein Foto konnte nicht hochgeladen werden. Du kannst ohne fortfahren oder es erneut versuchen.',
    uploadFailedContinue: 'Ohne Foto fortfahren',
    uploadFailedRetry: 'Erneut versuchen',
    skipProfileTitle: 'Profil überspringen?',
    skipProfileBody: 'Deine Telefonnummer wird nicht gespeichert. Du kannst sie später in den Profileinstellungen hinzufügen.',
    stay: 'Bleiben',
    skip: 'Überspringen',
    completeProfileError: 'Profil konnte nicht abgeschlossen werden.',
  },
```

- [ ] **Step 4: Identische Ergänzungen in `manageInvitations` (de.ts)**

Innerhalb des bestehenden `manageInvitations`-Blocks in `src/i18n/de.ts`:

```typescript
    total: 'Gesamt',
    confirmSlot: 'Bestätigen',
    inviteAllGuests: 'Alle Gäste einladen',
    sendFromGameOver: 'AUS GAME OVER SENDEN',
    sendingEmail: 'E-Mail-Einladungen werden gesendet…',
    sendingWhatsapp: 'WhatsApp-Einladungen werden gesendet…',
    emailSent: 'E-Mail gesendet',
    whatsappSent: 'WhatsApp gesendet',
    sendAnotherChannel: 'Anderen Kanal senden',
    shareOther: 'Oder Einladungslink über andere Apps teilen →',
    tapAddPhone: 'Tippen, um Telefonnummer hinzuzufügen',
    tapAddContact: 'Tippen, um Kontaktdaten hinzuzufügen',
    sentSummary: '{{sent}} gesendet',
    guestUnit: 'Gast',
    guestUnitPlural: 'Gäste',
    duplicateTitle: 'Doppelter Kontakt',
  },
```

- [ ] **Step 5: Typecheck (fängt Parität-Lücken via `DeepString`)**

Run: `npm run typecheck`
Expected: PASS. Falls ein Key nur in einer Datei existiert, meldet TS einen Fehler - dann fehlenden Key in der anderen Datei ergänzen.

- [ ] **Step 6: Commit**

```bash
git add src/i18n/en.ts src/i18n/de.ts docs/superpowers/specs/2026-07-18-guest-registration-flow-design.md docs/superpowers/plans/2026-07-18-guest-registration-flow.md
git commit -m "feat(i18n): add guest invite wizard + manage-invitations keys (EN/DE)"
```

---

## Phase 2: Invite-Wizard - i18n + Bug 1 + Bug 2

### Task 2: `app/invite/[code].tsx` auf `useTranslation()` umstellen

**Files:**
- Modify: `app/invite/[code].tsx`

- [ ] **Step 1: Hook importieren und im Component beziehen**

`useMemo` zum bestehenden React-Import hinzufügen (die Datei importiert aktuell `React, { useState, useCallback, useEffect, useRef }`):

```typescript
import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
```

i18n-Import ergänzen (bei den bestehenden Store-Imports):

```typescript
import { useTranslation } from '@/i18n';
```

In `InviteWizardScreen`, direkt nach `const language = useLanguageStore(s => s.language);`:

```typescript
  const { t } = useTranslation();
```

- [ ] **Step 2: Zod-Schemas in den Component verschieben (für übersetzte Fehlermeldungen)**

Die beiden modulweiten Schemas `signupSchema`/`profileSchema` entfernen und durch memoisierte Fabriken **innerhalb** des Components ersetzen. Direkt nach `const { t } = useTranslation();`:

```typescript
  const signupSchema = useMemo(() => z.object({
    firstName: z.string().min(1, t.invite.valRequired),
    lastName: z.string().min(1, t.invite.valRequired),
    email: z.string().email(t.invite.valInvalidEmail),
    password: z.string()
      .min(8, t.invite.valPasswordMin)
      .regex(/[A-Z]/, t.invite.valPasswordUpper)
      .regex(/[a-z]/, t.invite.valPasswordLower)
      .regex(/[0-9]/, t.invite.valPasswordNumber),
    confirmPassword: z.string(),
  }).refine(d => d.password === d.confirmPassword, {
    message: t.invite.valPasswordsNoMatch,
    path: ['confirmPassword'],
  }), [t]);

  const profileSchema = useMemo(() => z.object({
    phone: z.string().min(7, t.invite.valPhoneInvalid).optional().or(z.literal('')),
  }), [t]);
```

Die Typaliase `SignupForm`/`ProfileForm` bleiben, aber ihre Basis muss unabhängig vom Laufzeit-Schema deklariert werden (das Schema ist jetzt lokal). Ersetze die modulweiten `type SignupForm = z.infer<typeof signupSchema>;`-Zeilen durch explizite Typen am Modulanfang:

```typescript
type SignupForm = {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
};
type ProfileForm = { phone?: string };
```

Die `useForm`-Resolver referenzieren weiterhin `zodResolver(signupSchema)` / `zodResolver(profileSchema)` - jetzt die lokalen Werte.

- [ ] **Step 3: Alle sichtbaren Strings ersetzen (Mapping)**

Jeden hartkodierten String durch den passenden Key ersetzen:

| Original | Ersetzung |
|---|---|
| `This invite link is no longer valid` | `{t.invite.invalidTitle}` |
| `The link may have expired, ...` | `{t.invite.invalidBody}` |
| `Go to App` | `{t.invite.goToApp}` |
| `Invited by ` (Prefix vor `{preview.organizerName}`) | `{t.invite.invitedBy} ` |
| `Accept Invitation →` | `{t.invite.accept}` |
| `Decline` | `{t.invite.decline}` |
| `Already have the app? ` | `{t.invite.webBannerHave}` |
| `Open in Game Over →` | `{t.invite.webBannerOpen}` |
| `Joining: {preview.eventName}` | `{t.invite.joining.replace('{{event}}', preview.eventName)}` |
| `Create your account` | `{t.invite.createAccount}` |
| `First Name` (label) | `t.invite.firstName` |
| `Last Name` (label) | `t.invite.lastName` |
| `Email` (label) | `t.invite.email` |
| `Password` (label) | `t.invite.password` |
| `Confirm Password` (label) | `t.invite.confirmPassword` |
| `Create Account →` | `{t.invite.createAccountCta}` |
| `Already have an account? ` | `{t.invite.alreadyHaveAccount}` |
| `Log in instead →` | `{t.invite.loginInstead}` |
| `Almost there` (Profil-Header) | `{t.invite.almostThere}` |
| `Complete your profile` | `{t.invite.completeProfile}` |
| `Profile photo (optional)` | `{t.invite.profilePhotoOptional}` |
| `Phone Number` (label) | `t.invite.phone` |
| `+49 151 1234567` (placeholder) | `t.invite.phonePlaceholder` |
| `Continue →` | `{t.invite.continueCta}` |
| `Skip this step →` | `{t.invite.skipStep}` |

- [ ] **Step 4: Alert-Strings ersetzen**

Alle `Alert.alert(...)`-Aufrufe auf Keys ziehen. Beispiele:

```typescript
// auth failed
Alert.alert(t.invite.errorTitle, t.invite.authFailed);
// could not join
Alert.alert(t.invite.errorTitle, result.error || t.invite.couldNotJoin);
// join failed (catch)
Alert.alert(t.invite.errorTitle, t.invite.joinFailed);
// email already exists (setError)
signupForm.setError('email', { message: t.invite.emailExists });
// signup failed (catch)
Alert.alert(t.invite.signupFailedTitle, e.message || t.invite.tryAgain);
// invalid file
Alert.alert(t.invite.invalidFileTitle, t.invite.invalidFileBody);
// file too large
Alert.alert(t.invite.fileTooLargeTitle, t.invite.fileTooLargeBody);
// complete profile error (catch)
Alert.alert(t.invite.errorTitle, e.message || t.invite.completeProfileError);
// skip profile confirm
Alert.alert(t.invite.skipProfileTitle, t.invite.skipProfileBody, [
  { text: t.invite.stay, style: 'cancel' },
  { text: t.invite.skip, onPress: () => doAcceptInvite() },
]);
```

- [ ] **Step 5: Typecheck + Lint**

Run: `npm run typecheck && npm run lint`
Expected: PASS. Kein hartkodierter englischer UI-String mehr im Render-Baum (Alert-Bug-2/Bug-1 folgen in Task 3/4).

- [ ] **Step 6: Commit**

```bash
git add app/invite/[code].tsx
git commit -m "feat(i18n): translate guest invite wizard (EN/DE)"
```

### Task 3: Bug 1 - Foto-Upload-Fehler sichtbar machen

**Files:**
- Modify: `app/invite/[code].tsx` (Funktion `handleProfileComplete`, ca. Zeile 306-315)

- [ ] **Step 1: Upload-Fehler abfangen und Nutzer informieren**

Im `if (avatarUri) { ... }`-Block: Wenn `uploadError` gesetzt ist, den bisher stillen Pfad durch eine sichtbare, blockierende Entscheidung ersetzen. Ersetze den `if (!uploadError) { ... }`-Block durch:

```typescript
        if (uploadError) {
          const proceed = await new Promise<boolean>((resolve) => {
            Alert.alert(
              t.invite.uploadFailedTitle,
              t.invite.uploadFailedBody,
              [
                { text: t.invite.uploadFailedRetry, style: 'cancel', onPress: () => resolve(false) },
                { text: t.invite.uploadFailedContinue, onPress: () => resolve(true) },
              ],
            );
          });
          if (!proceed) {
            setIsSubmitting(false);
            return; // Nutzer will erneut versuchen - Flow nicht fortsetzen
          }
          // Nutzer fährt bewusst ohne Foto fort: avatarUrl bleibt null
        } else {
          const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path);
          avatarUrl = `${urlData.publicUrl}?t=${Date.now()}`;
        }
```

- [ ] **Step 2: Typecheck + Lint**

Run: `npm run typecheck && npm run lint`
Expected: PASS.

- [ ] **Step 3: Manuelle Verifikation notieren**

Kein Unit-Test (Seiteneffekt Storage). Verifikation erfolgt in Phase 4 (realer Durchlauf: absichtlich >5 MB / falsches Format wählen bzw. Netz trennen → Alert erscheint).

- [ ] **Step 4: Commit**

```bash
git add app/invite/[code].tsx
git commit -m "fix(invite): surface photo-upload failure instead of swallowing it"
```

### Task 4: Bug 2 - E-Mail-Confirmation-Sackgasse

**Files:**
- Modify: `app/invite/[code].tsx` (Funktion `handleSignup`, ca. Zeile 203-217)

- [ ] **Step 1: Statt Sackgasse zurück in den Login mit Redirect leiten**

Ersetze den `if (!signUpData?.session) { ... }`-Block (den Teil, der bei fehlgeschlagenem Auto-Login nur ein Alert zeigt) durch:

```typescript
      // If email confirmation is required (no session returned), auto sign-in with password
      if (!signUpData?.session) {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: data.email,
          password: data.password,
        });
        if (signInError) {
          // Confirmation truly required — route back into THIS invite via login redirect,
          // so the guest is not stranded after confirming their email.
          Alert.alert(
            t.invite.confirmEmailTitle,
            t.invite.confirmEmailBody,
            [{ text: t.invite.confirmEmailCta, onPress: () => router.push(`/(auth)/login?redirect=/invite/${code}`) }],
          );
          return;
        }
      }
```

- [ ] **Step 2: Typecheck + Lint**

Run: `npm run typecheck && npm run lint`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add app/invite/[code].tsx
git commit -m "fix(invite): route guest back into invite after email-confirmation dead-end"
```

---

## Phase 3: Gäste-verwalten - Bug 3 (Option B) + Rest-i18n

### Task 5: Pure Hilfsfunktion `resolveGuestDisplay()` (Option B) - TDD

**Files:**
- Create: `src/utils/guestDisplay.ts`
- Test: `__tests__/utils/guestDisplay.test.ts`

- [ ] **Step 1: Failing test schreiben**

```typescript
// __tests__/utils/guestDisplay.test.ts
import { describe, it, expect } from 'vitest';
import { resolveGuestDisplay } from '@/utils/guestDisplay';

describe('resolveGuestDisplay (Option B)', () => {
  it('prefers the registered guest self-provided name over the organizer-entered name', () => {
    const r = resolveGuestDisplay({
      isRegistered: true,
      profileFullName: 'Max Mustermann',
      profilePhone: '+49 170 1111111',
      inviteFirstName: 'Maximilian',
      inviteLastName: 'M.',
      invitePhone: '+49 170 9999999',
    });
    expect(r.name).toBe('Max Mustermann');
    expect(r.phone).toBe('+49 170 1111111');
  });

  it('falls back to organizer invite data for a not-yet-registered slot', () => {
    const r = resolveGuestDisplay({
      isRegistered: false,
      profileFullName: null,
      profilePhone: null,
      inviteFirstName: 'Anna',
      inviteLastName: 'Beispiel',
      invitePhone: '+49 170 2222222',
    });
    expect(r.name).toBe('Anna Beispiel');
    expect(r.phone).toBe('+49 170 2222222');
  });

  it('uses invite phone when a registered guest has no self-provided phone', () => {
    const r = resolveGuestDisplay({
      isRegistered: true,
      profileFullName: 'Max Mustermann',
      profilePhone: null,
      inviteFirstName: 'Maximilian',
      inviteLastName: 'M.',
      invitePhone: '+49 170 9999999',
    });
    expect(r.phone).toBe('+49 170 9999999');
  });

  it('returns empty name when nothing is known', () => {
    const r = resolveGuestDisplay({
      isRegistered: false,
      profileFullName: null,
      profilePhone: null,
      inviteFirstName: '',
      inviteLastName: '',
      invitePhone: '',
    });
    expect(r.name).toBe('');
    expect(r.phone).toBe('');
  });
});
```

- [ ] **Step 2: Test ausführen - muss fehlschlagen**

Run: `npm test -- __tests__/utils/guestDisplay.test.ts`
Expected: FAIL ("resolveGuestDisplay is not a function" / Modul fehlt).

- [ ] **Step 3: Implementierung schreiben**

```typescript
// src/utils/guestDisplay.ts
/**
 * Resolves the display name and phone for a guest slot in the organizer's
 * "Manage Invitations" view.
 *
 * Option B (product decision 2026-07-18): once the guest has registered, their
 * OWN profile data wins over the organizer-entered invite_codes data. The
 * organizer entry is only a placeholder until the slot is registered.
 */
export interface GuestDisplayInput {
  isRegistered: boolean;
  profileFullName: string | null;
  profilePhone: string | null;
  inviteFirstName: string;
  inviteLastName: string;
  invitePhone: string;
}

export interface GuestDisplay {
  name: string;
  phone: string;
}

export function resolveGuestDisplay(input: GuestDisplayInput): GuestDisplay {
  const inviteName = [input.inviteFirstName, input.inviteLastName]
    .filter(Boolean)
    .join(' ')
    .trim();

  if (input.isRegistered) {
    return {
      name: (input.profileFullName?.trim() || inviteName),
      phone: (input.profilePhone?.trim() || input.invitePhone || ''),
    };
  }

  return {
    name: inviteName,
    phone: input.invitePhone || '',
  };
}
```

- [ ] **Step 4: Test ausführen - muss bestehen**

Run: `npm test -- __tests__/utils/guestDisplay.test.ts`
Expected: PASS (4 Tests).

- [ ] **Step 5: Commit**

```bash
git add src/utils/guestDisplay.ts __tests__/utils/guestDisplay.test.ts
git commit -m "feat(invitations): add resolveGuestDisplay helper (Option B name/phone source)"
```

### Task 6: `resolveGuestDisplay()` in participants.tsx einsetzen (Bug 3)

**Files:**
- Modify: `app/event/[id]/participants.tsx` (Slot-Aufbau `dbGuest`-Zweig, ca. Zeile 279-305)

- [ ] **Step 1: Import ergänzen**

```typescript
import { resolveGuestDisplay } from '@/utils/guestDisplay';
```

- [ ] **Step 2: `dbGuest`-Zweig auf Option B umstellen**

Im `if (dbGuest) { ... }`-Block die bisherige Namens-/Telefon-Auflösung (die `inviteName` bevorzugt) durch `resolveGuestDisplay` ersetzen:

```typescript
        const isCurrentUserGuest = dbGuest.user_id === user?.id;
        const guestEmail = dbGuest.profile?.email || (dbGuest as any)?.email || '';
        const inviteData = invitesByEmail[guestEmail.toLowerCase()];
        const selfName = isCurrentUserGuest
          ? (ownProfile?.full_name || dbGuest.profile?.full_name || user?.user_metadata?.full_name || null)
          : (dbGuest.profile?.full_name || null);
        const display = resolveGuestDisplay({
          isRegistered: !!dbGuest.user_id,
          profileFullName: selfName,
          profilePhone: (dbGuest.profile as any)?.phone ?? null,
          inviteFirstName: inviteData?.firstName || '',
          inviteLastName: inviteData?.lastName || '',
          invitePhone: inviteData?.phone || '',
        });
        result.push({
          index: i + 1,
          role: 'guest',
          name: display.name || 'Guest',
          email: guestEmail,
          phone: display.phone,
          status: dbGuest.confirmed_at ? 'confirmed' : (dbGuest.user_id ? 'pending' : 'not_invited'),
          isEditable: false,
          isExpanded: false,
          participant: dbGuest,
        });
```

Hinweis: `invitesByEmail` liefert aktuell `phone: ''` (die Query holt keine Telefonnummer). Das ist ok - bei registriertem Gast gewinnt ohnehin `profilePhone`; für nicht-registrierte Slots wird die Telefonnummer weiterhin aus `guestDetails` (lokaler Cache) im `else`-Zweig gefüllt.

- [ ] **Step 3: Typecheck + Lint**

Run: `npm run typecheck && npm run lint`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add app/event/[id]/participants.tsx
git commit -m "fix(invitations): registered guest self-provided name/phone wins (Option B)"
```

### Task 7: Rest-Strings in participants.tsx auf i18n

**Files:**
- Modify: `app/event/[id]/participants.tsx`

- [ ] **Step 1: Hartkodierte Strings ersetzen (Mapping)**

| Original | Ersetzung |
|---|---|
| `Total` (Stat-Label) | `{t.manageInvitations.total}` |
| `Confirm` (Confirm-Button-Text) | `{t.manageInvitations.confirmSlot}` |
| `Invite All Guests` (Modal-Titel) | `{t.manageInvitations.inviteAllGuests}` |
| `SEND FROM GAME OVER` | `{t.manageInvitations.sendFromGameOver}` |
| `Sending email invitations…` / `Sending WhatsApp invitations…` | `{activeChannel === 'email' ? t.manageInvitations.sendingEmail : t.manageInvitations.sendingWhatsapp}` |
| `Email Sent` / `WhatsApp Sent` | `{activeChannel === 'email' ? t.manageInvitations.emailSent : t.manageInvitations.whatsappSent}` |
| `Send another channel` | `{t.manageInvitations.sendAnotherChannel}` |
| `Or share invite link via other apps →` | `{t.manageInvitations.shareOther}` |
| `Tap to add phone number` | `{t.manageInvitations.tapAddPhone}` |
| `Tap to add contact details` | `{t.manageInvitations.tapAddContact}` |
| `Doppelter Kontakt` / `Duplicate contact` (Alert-Titel, Zeile ~435) | `t.manageInvitations.duplicateTitle` |

- [ ] **Step 2: `guest`/`guests`-Pluralisierung ersetzen**

Die inline `guest${count !== 1 ? 's' : ''}`-Stellen (Channel-Buttons + Sending-Text) ersetzen durch:

```typescript
{count} {count === 1 ? t.manageInvitations.guestUnit : t.manageInvitations.guestUnitPlural}
```

(jeweils mit der lokalen `emailCount`/`phoneCount`-Variable statt `count`).

- [ ] **Step 3: `{n} sent`-Summary ersetzen**

```typescript
{t.manageInvitations.sentSummary.replace('{{sent}}', String(inviteResults.filter(r => r.status === 'sent').length))}
```

- [ ] **Step 4: Typecheck + Lint**

Run: `npm run typecheck && npm run lint`
Expected: PASS. Kein hartkodierter englischer UI-String mehr in participants.tsx.

- [ ] **Step 5: Commit**

```bash
git add app/event/[id]/participants.tsx
git commit -m "feat(i18n): translate remaining manage-invitations strings (EN/DE)"
```

---

## Phase 4: Absicherung - Parität-Test, E2E, Verifikation

### Task 8: EN/DE-Parität-Unit-Test - TDD

**Files:**
- Create: `__tests__/i18n/parity.test.ts`

- [ ] **Step 1: Test schreiben**

```typescript
// __tests__/i18n/parity.test.ts
import { describe, it, expect } from 'vitest';
import en from '@/i18n/en';
import de from '@/i18n/de';

function leafPaths(obj: Record<string, unknown>, prefix = ''): string[] {
  return Object.entries(obj).flatMap(([k, v]) => {
    const path = prefix ? `${prefix}.${k}` : k;
    return typeof v === 'object' && v !== null
      ? leafPaths(v as Record<string, unknown>, path)
      : [path];
  });
}

describe('i18n EN/DE parity', () => {
  it('has the exact same set of leaf keys in EN and DE', () => {
    const enKeys = new Set(leafPaths(en as any));
    const deKeys = new Set(leafPaths(de as any));
    const missingInDe = [...enKeys].filter(k => !deKeys.has(k));
    const extraInDe = [...deKeys].filter(k => !enKeys.has(k));
    expect({ missingInDe, extraInDe }).toEqual({ missingInDe: [], extraInDe: [] });
  });

  it('has no German value identical to a placeholder-free English value in the invite block', () => {
    // Guards against forgotten translations (copy/paste of English into de.ts).
    const enInvite = en.invite as Record<string, string>;
    const deInvite = de.invite as Record<string, string>;
    const untranslated = Object.keys(enInvite).filter(
      k => enInvite[k] === deInvite[k] && !/^[+\d\s]+$/.test(enInvite[k]),
    );
    // phonePlaceholder is intentionally identical; allow it explicitly.
    expect(untranslated.filter(k => k !== 'phonePlaceholder')).toEqual([]);
  });
});
```

- [ ] **Step 2: Test ausführen**

Run: `npm test -- __tests__/i18n/parity.test.ts`
Expected: PASS. Falls FAIL, meldet der Test genau die fehlenden/überschüssigen Keys bzw. unübersetzte Invite-Strings - dann in `de.ts`/`en.ts` korrigieren.

- [ ] **Step 3: Commit**

```bash
git add __tests__/i18n/parity.test.ts
git commit -m "test(i18n): enforce EN/DE key parity and invite-block translation"
```

### Task 9: E2E-Erweiterung - Signup → Profil → Beitritt

**Files:**
- Modify: `e2e/invites/inviteSystem.test.ts`

Hinweis: Der Test nutzt bereits Seed-Codes (`TEST_INVITE_CODES.valid = 'TESTCODE1'`). Für den Registrierungspfad wird ein frischer, noch nicht benutzter Code benötigt und ein per Zufall eindeutiger Gast-E-Mail-Wert, damit der Lauf wiederholbar ist.

- [ ] **Step 1: Neuen `describe`-Block am Ende von `inviteSystem.test.ts` (vor der letzten schließenden `});`) einfügen**

```typescript
  describe('Guest Registration via Invite', () => {
    beforeEach(async () => {
      await device.reloadReactNative();
    });

    it('walks an unauthenticated guest from preview through signup and profile to the event', async () => {
      const unique = Date.now();
      const guestEmail = `guest+${unique}@example.com`;

      // Deep-link straight into the invite preview (public, no auth)
      await device.openURL({ url: `gameover://invite/${TEST_INVITE_CODES.valid}` });
      await waitForElement('accept-invite-button', 15000);

      // Step 1 → signup
      await tap('accept-invite-button');
      await waitForElement('signup-submit-button', 10000);
      await typeInInput('signup-firstname', 'E2E');
      await typeInInput('signup-lastname', 'Guest');
      await typeInInput('signup-email', guestEmail);
      await typeInInput('signup-password', 'Passw0rd!');
      await typeInInput('signup-confirm-password', 'Passw0rd!');
      await dismissKeyboard();
      await tap('signup-submit-button');

      // Step 3 profile — skip photo, add phone
      await waitForElement('profile-continue-button', 15000);
      await typeInInput('profile-phone', '+49 170 1234567');
      await dismissKeyboard();
      await tap('profile-continue-button');

      // Lands on the event screen as a confirmed participant
      await waitForElement('event-summary-screen', 20000);
    });

    it('shows an invalid-invite state for a revoked code', async () => {
      await device.openURL({ url: `gameover://invite/${TEST_INVITE_CODES.revoked}` });
      // Invalid invite screen renders the "Go to App" button
      await waitForElement('decline-invite-button', 10000).catch(() => {});
      await assertTextVisible(en.invite.invalidTitle);
    });
  });
```

- [ ] **Step 2: Import für i18n-Assertions ergänzen (oben in der Datei)**

```typescript
import en from '../../src/i18n/en';
```

- [ ] **Step 3: E2E ausführen (falls Simulator verfügbar)**

Run: `npm run test:e2e -- --configuration ios.sim.debug e2e/invites/inviteSystem.test.ts`
Expected: Der neue `describe`-Block läuft; der Registrierungspfad endet auf `event-summary-screen`.
Falls der Build fehlschlägt: `rm -rf ios/build` und erneut (siehe CLAUDE.md Detox-Troubleshooting).

- [ ] **Step 4: Commit**

```bash
git add e2e/invites/inviteSystem.test.ts
git commit -m "test(e2e): cover guest signup→profile→join invite flow"
```

### Task 10: Realer Durchlauf + Abschlussverifikation

- [ ] **Step 1: Voller Unit-Test-Lauf**

Run: `npm test`
Expected: Alle Tests grün (inkl. neuer Parität- und guestDisplay-Tests).

- [ ] **Step 2: Typecheck + Lint gesamt**

Run: `npm run typecheck && npm run lint`
Expected: PASS.

- [ ] **Step 3: Realer UI-Durchlauf**

Entweder iPhone (mac-preview/tunnel) oder iOS-Simulator via codex-computer-use. Prüfen:
- App-Sprache DE → Invite-Wizard vollständig deutsch (Vorschau, Signup, Profil, alle Alerts).
- Foto wählen >5 MB oder falsches Format → Alert erscheint (Bug 1).
- Gast registriert sich mit abweichendem Namen → Organisator-Ansicht zeigt die Gast-Selbstangabe (Bug 3 / Option B).
- Gast erstellt danach ein eigenes Event → funktioniert.

- [ ] **Step 4: Datenkette final prüfen (Supabase, wie Task 0)**

Nach dem realen Durchlauf die SQL aus Task 0 Step 2 erneut ausführen und bestätigen: `full_name` = Gast-Selbstangabe, `phone` gesetzt, `avatar_url` gesetzt.

- [ ] **Step 5: Finaler Commit / Branch abschließen**

```bash
git add -A
git commit -m "docs: record guest-flow verification results"
```

Danach superpowers:finishing-a-development-branch für Merge/PR-Entscheidung.

---

## Self-Review-Notiz

- Spec-Abdeckung: Bug 1 (Task 3), Bug 2 (Task 4), Bug 3/Option B (Task 5+6), i18n Invite (Task 1+2), i18n participants (Task 1+7), Edge Cases (Task 9 + Task 10 Step 3), Datenfluss-Verifikation (Task 0 + Task 10 Step 4), Parität (Task 8). Alle Spec-Punkte abgedeckt.
- Nebenbefunde (Avatar-Policy-Härtung, Atomarität) bewusst ausgelassen (separater Vorgang).
