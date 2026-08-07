/**
 * Setzt `colorPrimary` in android/app/src/main/res/values/colors.xml auf die
 * Markenfarbe.
 *
 * Warum ein Plugin und kein Eintrag in app.config.ts: Expo generiert diesen
 * Wert aus seinem Android-Template und bietet dafuer keine Config-Option an.
 * Er stand deshalb noch auf dem Template-Default #023c69, einem Blau, das in
 * keiner der beiden Paletten vorkommt. Die Nachbarwerte (`colorPrimaryDark`,
 * `splashscreen_background`, `iconBackground`) leitet Expo dagegen aus der
 * Config ab und sie sind laengst #0D1B2A.
 *
 * Von Hand in colors.xml zu editieren ist keine Option: android/ ist nicht
 * mehr versioniert und wird bei jedem `expo prebuild` neu erzeugt.
 */
const { withAndroidColors, AndroidConfig } = require('expo/config-plugins');

/** Midnight Navy - identisch zu EDITORIAL_DARK.background. */
const BRAND_NAVY = '#0D1B2A';

module.exports = function withBrandAndroidColors(config) {
  return withAndroidColors(config, (cfg) => {
    cfg.modResults = AndroidConfig.Colors.assignColorValue(cfg.modResults, {
      name: 'colorPrimary',
      value: BRAND_NAVY,
    });
    return cfg;
  });
};
