/**
 * Sport team logo assets — preloaded on app startup to eliminate load delays
 */

import { Asset } from 'expo-asset';

export const SPORT_LOGO_ASSETS = [
  require('./Sportclubs_Visuals/Berlin/1._FC_Union_Berlin.png'),
  require('./Sportclubs_Visuals/Berlin/ALBA_Berlin.png'),
  // eslint-disable-next-line import/no-unresolved
  require('./Sportclubs_Visuals/Berlin/Eisbären_Berlin.png'),
  // eslint-disable-next-line import/no-unresolved
  require('./Sportclubs_Visuals/Berlin/Füchse_Berlin.png'),
  require('./Sportclubs_Visuals/Berlin/Hertha_BSC.png'),
  require('./Sportclubs_Visuals/Berlin/Wasserfreunde_Spandau_04.png'),
  require('./Sportclubs_Visuals/Hamburg/FC_St._Pauli.png'),
  require('./Sportclubs_Visuals/Hamburg/Hamburg_Crocodiles.jpeg'),
  require('./Sportclubs_Visuals/Hamburg/Hamburg_Towers.png'),
  require('./Sportclubs_Visuals/Hamburg/Hamburger_Segel_Club.png'),
  require('./Sportclubs_Visuals/Hamburg/Hamburger_SV.png'),
  require('./Sportclubs_Visuals/Hamburg/HSV_Handball_Hamburg.png'),
  require('./Sportclubs_Visuals/Hannover/Eqestrian_Sport.png'),
  require('./Sportclubs_Visuals/Hannover/Hannover_96.png'),
  require('./Sportclubs_Visuals/Hannover/Hannover_Scorpions.png'),
  require('./Sportclubs_Visuals/Hannover/Hannover_United.jpeg'),
  require('./Sportclubs_Visuals/Hannover/TKH_Turn-Klubb_zu_Hannover.png'),
  require('./Sportclubs_Visuals/Hannover/TSV_Hannover-Burgdorf.png'),
];

export async function preloadSportLogos(): Promise<void> {
  await Asset.loadAsync(SPORT_LOGO_ASSETS);
}
