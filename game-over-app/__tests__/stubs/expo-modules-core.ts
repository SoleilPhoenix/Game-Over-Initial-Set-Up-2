/**
 * Stub fuer `expo-modules-core` im Testlauf.
 *
 * Warum es das braucht: `setup.ts` mockt `expo-constants`. Vitest loest die echte Modul-ID
 * trotzdem auf, um den Mock zu registrieren, und landet dabei in `expo-modules-core`. Dessen
 * ausgelieferte Quellen enthalten Syntax, die der Rollup-Parser nicht liest
 * ("Expected 'from', got 'typeOf'").
 *
 * Im Hauptbaum faellt das nicht auf: dort liegt das Paket unter `node_modules/` im Vite-Root und
 * wird als externe Abhaengigkeit gar nicht erst transformiert. Ein Worktree hat kein eigenes
 * `node_modules`, die Aufloesung geht nach `../../../../node_modules/` - also ausserhalb des
 * Roots - und Vite behandelt die Datei als Quellcode, den es uebersetzen muss. Ergebnis: zwei
 * Testdateien scheiterten nur im Worktree, waehrend derselbe Lauf im Hauptbaum gruen war.
 *
 * Der Stub macht beide Baeume gleich. Nichts im Test benutzt echte Native-Module; wer hier eine
 * Funktion vermisst, ergaenzt sie an dieser Stelle statt die Aufloesung wieder aufzumachen.
 */

export function requireNativeModule(): Record<string, unknown> {
  return {};
}

export function requireOptionalNativeModule(): null {
  return null;
}

export const NativeModulesProxy: Record<string, unknown> = {};

export class EventEmitter {
  addListener() {
    return { remove: () => {} };
  }
  removeAllListeners() {}
  emit() {}
}

export class NativeModule {}
export class SharedObject {}

export default { requireNativeModule, requireOptionalNativeModule, NativeModulesProxy };
