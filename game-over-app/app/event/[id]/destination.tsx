/**
 * Destination Guide Screen
 * City-specific tips, real links, emergency contacts for Berlin / Hamburg / Hannover
 */

import React, { useState, useRef } from 'react';
import { ScrollView, Linking, Platform, Pressable, StyleSheet, View, PanResponder, Animated } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { YStack, XStack, Text, Spinner } from 'tamagui';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { KenBurnsImage } from '@/components/ui/KenBurnsImage';
import { useEvent } from '@/hooks/queries/useEvents';
import { useBooking } from '@/hooks/queries/useBookings';
import { useTranslation } from '@/i18n';
import { DARK_THEME } from '@/constants/theme';
import { getEventImage, resolveImageSource } from '@/constants/packageImages';

// ─── German City Data ─────────────────────────────────────────────────────────
interface LocalPlace {
  name: string;
  type: string;
  description: string;
}

interface CityData {
  tagline: { en: string; de: string };
  lat: number;
  lon: number;
  taxi: { label: string; number: string };
  transit: { name: string; url: string };
  places: {
    attractions: LocalPlace[];
    dining: LocalPlace[];
    entertainment: LocalPlace[];
    sports: LocalPlace[];
  };
}

const CITY_DATA: Record<string, CityData> = {
  berlin: {
    tagline: { en: 'Capital of the Night', de: 'Hauptstadt der Nacht' },
    lat: 52.5200,
    lon: 13.4050,
    taxi: { label: 'Taxi Berlin', number: '030 202020' },
    transit: { name: 'BVG Berlin', url: 'https://www.bvg.de' },
    places: {
      attractions: [
        { name: 'Brandenburg Gate', type: 'Landmark', description: 'Iconic neoclassical triumphal arch — the ultimate symbol of Berlin and German reunification.' },
        { name: 'Museum Island', type: 'Culture', description: '5 world-class museums on a UNESCO World Heritage island in the Spree river.' },
        { name: 'East Side Gallery', type: 'Street Art', description: '1.3 km of original Berlin Wall sections covered in powerful international murals.' },
        { name: 'Reichstag Building', type: 'Architecture', description: 'Germany\'s parliament building with Norman Foster\'s iconic glass dome and free public access.' },
        { name: 'Checkpoint Charlie', type: 'History', description: 'The most famous Cold War border crossing point with open-air museum and historic exhibits.' },
        { name: 'Berlin TV Tower', type: 'Landmark', description: '368m iconic GDR-era tower with panoramic views and revolving restaurant at 207m.' },
        { name: 'Holocaust Memorial', type: 'Memorial', description: 'Powerful field of 2,711 concrete stelae, an unmissable tribute to the victims of the Holocaust.' },
        { name: 'Tiergarten', type: 'Park', description: '210 hectares of lush parkland right in the heart of Berlin, perfect for cycling and picnics.' },
        { name: 'Charlottenburg Palace', type: 'Palace', description: 'The largest and most magnificent Baroque palace in Berlin with stunning gardens.' },
        { name: 'Hackesche Höfe', type: 'Culture', description: 'Beautifully restored Art Nouveau courtyards in Mitte with galleries, boutiques and cafés.' },
        { name: 'Topography of Terror', type: 'Memorial', description: 'Sobering outdoor and indoor documentation center on the former site of the SS and Gestapo headquarters.' },
        { name: 'Berlin Cathedral', type: 'Architecture', description: 'Majestic Renaissance Revival cathedral on Museum Island with imperial crypt and dome views.' },
        { name: 'Tempelhof Field', type: 'Park', description: 'Vast former airport turned beloved public park — one of the world\'s largest urban open spaces.' },
        { name: 'Berlin Zoological Garden', type: 'Zoo', description: 'One of the world\'s most visited zoos, home to over 1,300 species since 1844.' },
        { name: 'DDR Museum', type: 'Museum', description: 'Hands-on interactive museum exploring everyday life in communist East Germany.' },
        { name: 'Natural History Museum', type: 'Museum', description: 'World-famous collection including the world\'s tallest mounted dinosaur skeleton.' },
        { name: 'Prenzlauer Berg', type: 'Neighborhood', description: 'Charming cobblestone neighborhood with Sunday flea market, boutiques and café culture.' },
        { name: 'Nikolaiviertel', type: 'Historic', description: 'Berlin\'s oldest neighborhood, painstakingly rebuilt after WWII with medieval character.' },
        { name: 'Potsdamer Platz', type: 'Urban', description: 'Once Europe\'s busiest square, today a striking symbol of Berlin\'s modern reinvention.' },
        { name: 'Filmpark Babelsberg', type: 'Theme Park', description: 'Germany\'s Hollywood — the oldest large-scale film studio in the world, offering guided tours.' },
      ],
      dining: [
        { name: 'Rutz Restaurant', type: 'Fine Dining', description: 'Michelin 2-star modern German cuisine led by Marco Müller, one of Berlin\'s finest.' },
        { name: 'Markthalle Neun', type: 'Market Hall', description: 'Historic 19th-century market with street food Thursdays, local producers and craft beverages.' },
        { name: 'Curry 36', type: 'Street Food', description: 'Berlin\'s most iconic currywurst stand, serving the city\'s defining snack since 1981.' },
        { name: 'Katz Orange', type: 'Farm-to-Table', description: 'Sustainable German cuisine served in a stunning historic courtyard in Mitte.' },
        { name: 'Brlo Brwhouse', type: 'Craft Beer & Food', description: 'Award-winning craft brewery with slow-smoked BBQ in a stunning shipping container complex.' },
        { name: 'Nobelhart & Schmutzig', type: 'Fine Dining', description: 'Hyper-local "brutally regional" tasting menu — only ingredients from the Berlin/Brandenburg area.' },
        { name: 'Borchardt', type: 'Brasserie', description: 'Classic French-German brasserie and true Berlin institution beloved by locals and celebrities alike.' },
        { name: 'Tim Raue', type: 'Fine Dining', description: 'Two Michelin stars, bold Asian-German fusion cuisine from Berlin\'s most celebrated chef.' },
        { name: 'Schwarzes Café', type: 'Café', description: 'Legendary 24/7 café in Charlottenburg open since 1978 — the soul of Berlin\'s night life.' },
        { name: 'Burgermeister', type: 'Street Food', description: 'Cult burgers served from a converted Victorian public toilet under the U-Bahn bridge.' },
        { name: 'Prater Biergarten', type: 'Beer Garden', description: 'Berlin\'s oldest beer garden under ancient chestnut trees, open since 1837 in Prenzlauer Berg.' },
        { name: 'Mustafa\'s Gemüse Kebap', type: 'Street Food', description: 'World-famous vegetable kebab stand at Mehringdamm — always a queue, always worth it.' },
        { name: 'Facil', type: 'Fine Dining', description: 'Michelin-starred Mediterranean cuisine in a stunning bamboo-garden atrium at the Mandala Hotel.' },
        { name: 'Fischers Fritz', type: 'Seafood', description: 'Two Michelin stars, elegant seafood dining at the Regent Hotel with exceptional service.' },
        { name: 'Grill Royal', type: 'Steakhouse', description: 'Premier celebrity steakhouse on the Spree river — top-quality beef and great people-watching.' },
        { name: 'Bandol sur Mer', type: 'Wine Bar', description: 'Intimate French-inspired wine bar with exceptional cuisine and a natural wine focus.' },
        { name: 'Cocolo Ramen', type: 'Japanese', description: 'Berlin\'s most beloved authentic Japanese ramen served in a cozy Mitte setting.' },
        { name: 'Hendl & Hax', type: 'Bavarian', description: 'Comforting Bavarian classics — roast chicken and pork knuckle — in a warm rustic space.' },
        { name: 'Clärchens Ballhaus', type: 'Historic', description: 'Legendary 1913 ballroom turned restaurant — unique Berlin nostalgia with incredible food.' },
        { name: 'Bar Bobu', type: 'Wine Bar', description: 'Berlin\'s leading natural wine bar, an intimate and creative restaurant in the heart of Mitte.' },
      ],
      entertainment: [
        { name: 'Berghain', type: 'Techno Club', description: 'Arguably the world\'s greatest techno club — in a converted power station with legendary door policy.' },
        { name: 'Watergate', type: 'Club', description: 'Spectacular club with floor-to-ceiling windows overlooking the Spree, rotating resident DJs.' },
        { name: 'SO36', type: 'Live Music', description: 'Legendary punk and alternative music venue in Kreuzberg, a Berlin institution since 1978.' },
        { name: 'KitKatClub', type: 'Club', description: 'Berlin\'s most eclectic and inclusive party venue — famous themed events and all-night dancing.' },
        { name: 'Admiralspalast', type: 'Theater', description: 'Grand historic entertainment palace hosting musicals, comedy, and spectacular variety shows.' },
        { name: 'Tresor', type: 'Techno Club', description: 'Legendary techno club in a former bank vault — a pillar of Berlin\'s electronic music history.' },
        { name: 'Sisyphos', type: 'Festival Club', description: 'Epic weekend-long party in a former industrial compound — a unique Berlin experience.' },
        { name: 'Kino International', type: 'Cinema', description: 'Spectacular GDR-era cinema showing cult classics, film festivals and special screenings.' },
        { name: 'Tempodrom', type: 'Venue', description: 'Spectacular big-top style entertainment venue for concerts, galas and major events.' },
        { name: 'Columbiahalle', type: 'Live Music', description: 'Major live music venue in a former US army building, hosting top international touring acts.' },
        { name: 'Wintergarten Varieté', type: 'Variety', description: 'Classic 1920s variety theater with breathtaking acrobatics, magic and cabaret artistry.' },
        { name: 'Panorama Bar', type: 'Club', description: 'Berghain\'s upper floor sanctuary — legendary for house and electronic music until deep morning.' },
        { name: 'Bar Tausend', type: 'Cocktail Bar', description: 'Exclusive cocktail bar under the railway arches — no sign outside, immaculate drinks inside.' },
        { name: 'Chamäleon Theater', type: 'Cabaret', description: 'Intimate and acclaimed cabaret and new circus arts venue in the famous Hackesche Höfe.' },
        { name: 'Sage Club', type: 'Club', description: 'Sophisticated and spacious techno club near the East Side Gallery with outdoor terrace.' },
        { name: 'Frannz Club', type: 'Live Music', description: 'Popular live rock, indie and alternative venue in Prenzlauer Berg\'s Kulturbrauerei complex.' },
        { name: 'Zitadelle Spandau', type: 'Open Air', description: 'Spectacular open-air summer concerts in a stunning Renaissance fortress setting.' },
        { name: 'Bassy Cowboy Club', type: 'Club', description: 'Eclectic and beloved club with burlesque, rock\'n\'roll nights and unique events in Prenzlauer Berg.' },
        { name: 'Ballhaus Berlin', type: 'Ballroom', description: 'Classic ballroom with live swing, tango and salsa nights — dancing history still alive in Berlin.' },
        { name: 'Clärchens Ballhaus', type: 'Ballroom', description: 'The most romantic venue in Berlin — historic 1913 ballroom with regular dancing evenings.' },
      ],
      sports: [
        { name: 'Hertha BSC', type: 'Football', description: 'Berlin\'s historic Bundesliga club, playing at the Olympiastadion since 1963 — the "Old Lady" of German football.' },
        { name: '1. FC Union Berlin', type: 'Football', description: 'Beloved working-class club that rose to the Bundesliga — famous for fan-driven culture and intense derbies against Hertha.' },
        { name: 'Alba Berlin', type: 'Basketball', description: 'Germany\'s most successful basketball club, 11× BBL champions and regular EuroLeague contender.' },
        { name: 'Füchse Berlin', type: 'Handball', description: 'Top-tier Bundesliga handball club known for exciting play, fan atmosphere and European ambitions.' },
        { name: 'Eisbären Berlin', type: 'Ice Hockey', description: '8× DEL champions — Berlin\'s beloved ice hockey club playing at the Mercedes-Benz Arena.' },
        { name: 'Wasserfreunde Spandau 04', type: 'Water Polo', description: 'The world\'s most successful water polo club, with 14 German titles and pan-European dominance.' },
      ],
    },
  },
  hamburg: {
    tagline: { en: 'Gateway to the World', de: 'Tor zur Welt' },
    lat: 53.5753,
    lon: 10.0153,
    taxi: { label: 'Hansa-Taxi', number: '040 211211' },
    transit: { name: 'HVV Hamburg', url: 'https://www.hvv.de' },
    places: {
      attractions: [
        { name: 'Elbphilharmonie', type: 'Concert Hall', description: 'Stunning wave-shaped glass concert hall atop a historic warehouse — Hamburg\'s defining icon.' },
        { name: 'Miniatur Wunderland', type: 'Museum', description: 'World\'s largest model railway exhibition with over 15km of track and incredible detail.' },
        { name: 'Speicherstadt', type: 'Historic District', description: 'UNESCO World Heritage red-brick warehouse district — the world\'s largest warehouse complex.' },
        { name: 'Reeperbahn', type: 'Entertainment Mile', description: 'Hamburg\'s legendary St. Pauli entertainment strip — the undisputed heart of the nightlife.' },
        { name: 'Planten un Blomen', type: 'Park', description: 'Beautiful park with botanical gardens and spectacular free water light concerts in summer.' },
        { name: 'St. Michael\'s Church', type: 'Landmark', description: 'Hamburg\'s most famous landmark — the \"Michel\" with its iconic tower and breathtaking crypt.' },
        { name: 'Alster Lakes', type: 'Lakes', description: 'Two iconic city-centre lakes ideal for boat tours, jogging paths and romantic evenings.' },
        { name: 'Hamburg Museum', type: 'Museum', description: 'Fascinating museum exploring 800 years of Hamburg\'s history as a great trading city.' },
        { name: 'Hamburger Kunsthalle', type: 'Art Museum', description: 'One of Germany\'s largest and most important art museums across three interconnected buildings.' },
        { name: 'Chilehaus', type: 'Architecture', description: 'Expressionist masterpiece shaped like a ship\'s prow — a UNESCO World Heritage Site.' },
        { name: 'Port of Hamburg', type: 'Port', description: 'Germany\'s largest port — harbour boat tours offer spectacular views of ocean-going vessels.' },
        { name: 'Deichtorhallen', type: 'Art Museum', description: 'Landmark contemporary art and photography museum in two spectacular iron exhibition halls.' },
        { name: 'HafenCity', type: 'Urban District', description: 'Europe\'s largest inner-city urban development project — architecture, restaurants and public art.' },
        { name: 'Blankenese', type: 'Village', description: 'Picturesque Elbe-side village with thatched cottages, steep lanes and stunning river panoramas.' },
        { name: 'Hagenbeck\'s Tierpark', type: 'Zoo', description: 'The world\'s first barless zoo (1907) — a revolutionary concept and a Hamburg landmark.' },
        { name: 'Mahnmal St. Nikolai', type: 'Memorial', description: 'Bombed WWII church tower preserved as a haunting anti-war memorial with underground museum.' },
        { name: 'Panoptikum', type: 'Wax Museum', description: 'Germany\'s oldest wax museum (1879) with over 120 life-like figures including historic celebrities.' },
        { name: 'Krameramtsstuben', type: 'Historic', description: 'Perfectly preserved 17th-century almshouses now housing charming boutique shops and a restaurant.' },
        { name: 'Lohsepark', type: 'Memorial Park', description: 'Landscaped memorial park in HafenCity featuring the Memorial for Hamburg\'s Deportees.' },
        { name: 'Fischmarkt Altona', type: 'Market', description: 'Hamburg\'s legendary Sunday fish market since 1703 — starts at 5am, ends with live music.' },
      ],
      dining: [
        { name: 'Die Bank', type: 'Brasserie', description: 'Upscale brasserie in a stunning converted early 20th-century bank building near the Alster.' },
        { name: 'Fischereihafen Restaurant', type: 'Seafood', description: 'Classic Hamburg seafood institution with harbor views and flawless fish dishes since 1981.' },
        { name: 'Fischmarkt', type: 'Experience', description: 'Sunday morning fish market atmosphere — fresh catches, smoked fish, and the iconic Aalsuppe.' },
        { name: 'Haferbar', type: 'Brunch', description: 'Hamburg\'s most popular brunch spot with creative grain bowls, smoothies and health foods.' },
        { name: 'Clouds Heaven\'s Bar & Kitchen', type: 'Sky Bar', description: 'Dramatic rooftop dining at 23rd floor of the Dancing Towers with 360° panoramic city views.' },
        { name: 'Bullerei', type: 'Gastro', description: 'Celebrity chef Tim Mälzer\'s beloved rustic restaurant in a converted slaughterhouse in Altona.' },
        { name: 'Café Paris', type: 'Brasserie', description: 'Charming Parisian bistro in a breathtaking art nouveau banking hall near the city hall.' },
        { name: 'Oberhafen-Kantine', type: 'Traditional', description: 'Hamburg\'s most crooked building serves hearty traditional food with an unbeatable harbor atmosphere.' },
        { name: 'Henssler & Henssler', type: 'Asian Fusion', description: 'Star TV chef Steffen Henssler\'s flagship — bold Asian fusion cuisine and an electric atmosphere.' },
        { name: 'Rive', type: 'Seafood', description: 'Classic seafood restaurant right at the harbor — excellent fish and famous Sunday breakfast.' },
        { name: 'Alt Hamburger Aalspeicher', type: 'Traditional', description: 'Historic cellar restaurant specializing in Hamburg\'s beloved eel dishes and local classics.' },
        { name: 'Vlet', type: 'Regional', description: 'Refined Northern German cuisine in a beautifully converted HafenCity warehouse with exposed brick.' },
        { name: 'Das Weisse Haus', type: 'Fine Dining', description: 'Elegant fine dining in a picturesque historic white house in leafy Blankenese by the Elbe.' },
        { name: 'Tschebull', type: 'Austrian', description: 'Unique Carinthian Austrian cuisine — Hamburg\'s most unexpected and delightful restaurant experience.' },
        { name: 'Goot', type: 'Nordic', description: 'Contemporary Nordic-German cuisine in the heart of St. Pauli with excellent craft cocktails.' },
        { name: 'Meatery Hamburg', type: 'Steakhouse', description: 'Premium dry-aged burgers and steaks in a stylish industrial setting, locally sourced.' },
        { name: 'Hobenköök', type: 'Sustainable', description: 'Award-winning sustainable restaurant and market in HafenCity — zero-waste and farm-to-table.' },
        { name: 'Frau Möller', type: 'Pub', description: 'Classic Hamburg Stampe (corner pub) — hearty local food, Astra beer and no-frills good times.' },
        { name: 'ON Food and Music', type: 'Rooftop', description: 'Stylish rooftop restaurant on the Reeperbahn with live DJ sets, cocktails and harbor sunset views.' },
        { name: 'Block House Hamburg', type: 'Steakhouse', description: 'Hamburg\'s iconic and much-loved steakhouse chain, delivering quality beef and classics since 1968.' },
      ],
      entertainment: [
        { name: 'Reeperbahn Clubs', type: 'Nightlife District', description: 'Hamburg\'s legendary nightlife strip — dozens of clubs, bars and live music venues in one area.' },
        { name: 'Mojo Club', type: 'Jazz & Soul', description: 'Legendary underground club focused on jazz, soul and funk, a cornerstone of Hamburg music culture.' },
        { name: 'Docks', type: 'Live Music', description: 'Major live music venue and concert hall on the Reeperbahn — top international touring acts.' },
        { name: 'Grünspan', type: 'Rock Club', description: 'Intimate rock venue where The Beatles played during their Hamburg years in the early 1960s.' },
        { name: 'Elbphilharmonie Plaza', type: 'Public Space', description: 'Free 37-metre-high public viewing platform with the most spectacular harbor view in Hamburg.' },
        { name: 'Stage Musical Hamburg', type: 'Musical', description: 'World-class musicals including König der Löwen at the Neue Flora — Hamburg\'s theatre institution.' },
        { name: 'Fabrik Hamburg', type: 'Cultural Center', description: 'Beloved cultural center and live music venue in a converted factory in Ottensen — eclectic program.' },
        { name: 'Logo Hamburg', type: 'Live Music', description: 'Intimate basement venue beloved for discovering new talent and emerging national acts.' },
        { name: 'Nochtspeicher', type: 'Live Music', description: 'Atmospheric live music venue with a stunning panoramic view over Hamburg\'s harbor.' },
        { name: 'Molotow', type: 'Rock Club', description: 'Legendary indie, punk and alternative club on the Reeperbahn — a Hamburg music institution.' },
        { name: 'Uebel & Gefährlich', type: 'Club', description: 'Atmospheric club and concert venue inside a massive WWII anti-aircraft bunker in Feldstraße.' },
        { name: 'Indra Club', type: 'Live Music', description: 'Where The Beatles first performed in Hamburg in 1960 — still hosting live music today.' },
        { name: '20up Bar', type: 'Sky Bar', description: 'Glamorous sky bar on the 20th floor of the Empire Riverside Hotel with stunning panoramic views.' },
        { name: 'Barclaycard Arena', type: 'Arena', description: 'Hamburg\'s largest indoor arena hosting major international concerts and sports events.' },
        { name: 'Ernst Deutsch Theater', type: 'Theater', description: 'Premier Hamburg theater renowned for high-quality drama and contemporary plays.' },
        { name: 'Ohnsorg-Theater', type: 'Theater', description: 'Historic Hamburg theater performing exclusively in the Low German dialect since 1902.' },
        { name: 'Stage Operettenhaus', type: 'Musical Theater', description: 'World-class musical theater productions from the leading Hamburg stage entertainment group.' },
        { name: 'Golden Pudel Club', type: 'Club', description: 'Legendary tiny underground club on the harbour — internationally celebrated by music lovers.' },
        { name: 'Club Silencio', type: 'Club', description: 'Chic underground techno and electronic music club with a discerning crowd and quality bookings.' },
        { name: 'Hafenklang', type: 'Live Music', description: 'Intimate and beloved live music venue right on the harbour waterfront in Altona.' },
      ],
      sports: [
        { name: 'Hamburger SV', type: 'Football', description: 'One of Germany\'s founding clubs — the only team never relegated until 2018. The Volksparkstadion is a fortress.' },
        { name: 'FC St. Pauli', type: 'Football', description: 'The cult club of the Reeperbahn — known worldwide for its anti-fascist values, skull logo, and incredible atmosphere.' },
        { name: 'Hamburg Towers', type: 'Basketball', description: 'Hamburg\'s rising BBL club, rapidly growing in fan base with an exciting fast-paced playing style.' },
        { name: 'HSV Handball Hamburg', type: 'Handball', description: 'Historic handball club fighting back through the divisions — deeply embedded in Hamburg\'s sporting identity.' },
        { name: 'Crocodiles Hamburg', type: 'Ice Hockey', description: 'Hamburg\'s ice hockey representatives in DEL2, building a passionate following in the Volkspark Arena.' },
        { name: 'Regatta & Sailing', type: 'Sailing', description: 'Hamburg has a centuries-old sailing tradition — the Alster lakes host regattas and yacht clubs year-round.' },
      ],
    },
  },
  hannover: {
    tagline: { en: 'Bigger than you think', de: 'Größer als du denkst' },
    lat: 52.3759,
    lon: 9.7320,
    taxi: { label: 'ÜSTRA Taxi', number: '0511 38101' },
    transit: { name: 'ÜSTRA Hannover', url: 'https://www.uestra.de' },
    places: {
      attractions: [
        { name: 'Herrenhäuser Gärten', type: 'Royal Gardens', description: 'Magnificent Baroque royal gardens — among the finest and most beautiful in all of Germany.' },
        { name: 'Neues Rathaus', type: 'Architecture', description: 'Spectacular neo-Baroque city hall with a unique inclined panoramic dome elevator.' },
        { name: 'Maschsee', type: 'Lake', description: 'Large artificial lake at the heart of the city — ideal for walks, rowing, festivals and sunsets.' },
        { name: 'Erlebnis-Zoo Hannover', type: 'Zoo', description: 'Award-winning immersive themed zoo experience — one of the most innovative in all of Europe.' },
        { name: 'Altes Rathaus', type: 'Historic', description: 'Stunning 15th-century Gothic brick city hall at the centre of Hannover\'s old town.' },
        { name: 'Sprengel Museum', type: 'Art Museum', description: 'World-class modern and contemporary art collection including major works by Niki de Saint Phalle.' },
        { name: 'Niedersächsisches Landesmuseum', type: 'Museum', description: 'Comprehensive state museum with outstanding collections of art, natural history and archaeology.' },
        { name: 'Herrenhausen Palace', type: 'Palace', description: 'Reconstructed Baroque summer residence with opulent interiors and a spectacular formal park.' },
        { name: 'Eilenriede Forest', type: 'Park', description: '650-hectare ancient urban forest nicknamed "Hannover\'s lungs" — perfect for walks and cycling.' },
        { name: 'Marktkirche', type: 'Church', description: 'Iconic 14th-century brick Gothic church — the defining landmark of Hannover\'s old town skyline.' },
        { name: 'Linden District', type: 'Neighborhood', description: 'Hannover\'s most vibrant multicultural neighborhood — buzzing with cafés, bars and independent shops.' },
        { name: 'Limmerstraße', type: 'Street', description: 'Lively street lined with bars, cafés, street art and eclectic independent boutiques.' },
        { name: 'Waterloo Monument', type: 'Monument', description: 'Impressive 47m column commemorating the pivotal Battle of Waterloo with panoramic city views.' },
        { name: 'Marienburg Castle', type: 'Castle', description: 'Fairy-tale Gothic Revival castle of the Royal House of Hannover, 30 minutes from the city.' },
        { name: 'Historical Museum Hannover', type: 'Museum', description: 'Traces Hannover\'s rich history from medieval times to the present with engaging exhibitions.' },
        { name: 'Welfenschloss', type: 'Architecture', description: 'Palatial neo-Gothic university main building — Hannover\'s most impressive architectural landmark.' },
        { name: 'Kröpcke Square', type: 'Landmark', description: 'Hannover\'s famous central square and meeting point, home to the legendary Kröpcke clock.' },
        { name: 'Christuskirche', type: 'Church', description: 'Beautiful neo-Romanesque church with remarkable stained glass windows and art history.' },
        { name: 'Dino Park Münchehagen', type: 'Theme Park', description: 'Europe\'s largest open-air dinosaur park — 240 life-size models in a natural forest setting.' },
        { name: 'Bundesgartenschau Parks', type: 'Gardens', description: 'Legacy green spaces from past garden festivals, creating an unusually lush and beautiful city.' },
      ],
      dining: [
        { name: 'Pier 51', type: 'Fine Dining', description: 'Sophisticated lakeside fine dining at Maschsee with refined modern German-European cuisine.' },
        { name: 'Loccumer Hof', type: 'Traditional', description: 'Classic Lower Saxony cuisine in a historic atmospheric setting — a true Hannover institution.' },
        { name: 'Markthalle Hannover', type: 'Market', description: 'Bustling indoor market hall with diverse fresh local produce, deli items and ready-made food.' },
        { name: 'Ernst August Brauerei', type: 'Brewery', description: 'Historic brewery serving traditional Hannoversch Bier with hearty local food in the city centre.' },
        { name: 'Café Kröpcke', type: 'Café', description: 'Hannover\'s most iconic café and meeting point at Kröpcke Square, serving guests since 1905.' },
        { name: 'Basil Hannover', type: 'European', description: 'Modern European cuisine with beautifully presented seasonal dishes and excellent wine selection.' },
        { name: 'Restaurant 1690', type: 'Fine Dining', description: 'Fine dining in the historic Leibnizhaus — elegant traditional German and European classics.' },
        { name: 'Köbelin', type: 'German', description: 'Long-established Hannover restaurant renowned for reliably excellent German and European cuisine.' },
        { name: 'Café Mezzo', type: 'Café', description: 'Popular and stylish brunch and lunch café in the city centre — always busy, always good.' },
        { name: 'Broyhan Haus', type: 'Traditional', description: 'Traditional German restaurant serving the old Hannover Broyhan beer and robust local classics.' },
        { name: 'Nikolaikeller', type: 'Cellar', description: 'Atmospheric historic cellar restaurant in the old town — traditional German food and local beer.' },
        { name: 'Ratskeller Hannover', type: 'Traditional', description: 'Classic restaurant in the vaulted cellars of the Old Town Hall — a Hannover tradition.' },
        { name: 'Miss Saigon', type: 'Vietnamese', description: 'Excellent and authentic Vietnamese cuisine, popular with locals and consistently praised.' },
        { name: 'Zeitgeist', type: 'European', description: 'Contemporary European cuisine in a stylish and modern setting, ideal for special evenings.' },
        { name: 'Goya Tapas Bar', type: 'Spanish', description: 'Authentic Spanish tapas with a great wine list — the best place in Hannover for an evening of sharing.' },
        { name: 'Hans im Glück', type: 'Burgers', description: 'Popular German craft burger chain with beautifully designed birch-tree interiors — great for groups.' },
        { name: 'Titus Hannover', type: 'Mediterranean', description: 'Vibrant modern Mediterranean and Middle Eastern cuisine with excellent vegetarian options.' },
        { name: 'La Cantina Hannover', type: 'Italian', description: 'Much-loved Italian restaurant with homemade pasta, wood-fired pizza and warm hospitality.' },
        { name: 'Kartoffelhaus Hannover', type: 'German', description: 'Quirky and charming potato-themed restaurant — a beloved Hannover classic for hearty German food.' },
        { name: 'Drei Pfeffer', type: 'Steakhouse', description: 'Reliable and popular steakhouse and grill, well-regarded by locals for quality meat dishes.' },
      ],
      entertainment: [
        { name: 'GOP Varieté', type: 'Variety Theater', description: 'World-class variety theater with spectacular acrobatics, magic and cabaret in an intimate setting.' },
        { name: 'Lux Hannover', type: 'Club', description: 'Hannover\'s premier electronic music club in an impressive industrial venue — quality bookings.' },
        { name: 'Klagesmarkt', type: 'Nightlife', description: 'Central nightlife area with an eclectic mix of bars, clubs and venues for every taste.' },
        { name: 'HAZ-Palladium', type: 'Concert Hall', description: 'Hannover\'s main concert hall — hosting national and international touring acts year-round.' },
        { name: 'Staatsoper Hannover', type: 'Opera', description: 'Renowned opera house with a rich, varied program of opera, ballet and classical concerts.' },
        { name: 'Faust', type: 'Cultural Center', description: 'Legendary multi-venue alternative culture center for concerts, club nights and festivals.' },
        { name: 'Pavillon', type: 'Cultural Venue', description: 'Well-established cultural venue for concerts, readings, comedy and community events.' },
        { name: 'Café Glocksee', type: 'Club', description: 'Classic alternative culture venue in the Linden district with concerts and club nights.' },
        { name: 'Musikzentrum Hannover', type: 'Music Venue', description: 'Modern multi-purpose music and events venue with excellent acoustics and facilities.' },
        { name: 'Subway Musikclub', type: 'Rock Club', description: 'Famous live rock music venue — a genuine Hannover institution for local and touring bands since 1979.' },
        { name: 'Stage Theater am Küchengarten', type: 'Musical Theater', description: 'Large-scale musical theater productions including major Broadway and West End shows.' },
        { name: 'Indra Hannover', type: 'Live Music', description: 'Indie and alternative music bar with regular live performances and a devoted regular crowd.' },
        { name: 'M.A.S.H. Hannover', type: 'Events Venue', description: 'Versatile event space and concert venue for concerts, comedy shows and corporate events.' },
        { name: 'Brødrene Hannover', type: 'Cocktail Bar', description: 'Stylish Scandinavian-inspired cocktail bar and lounge — one of the best drinks in the city.' },
        { name: 'Georgspalast', type: 'Club', description: 'Versatile nightclub and event venue hosting themed party nights and special events.' },
        { name: '4AQ Club', type: 'Club', description: 'Dedicated techno and electronic music club in central Hannover with a passionate crowd.' },
        { name: 'Heartbreak Hotel', type: 'Bar', description: 'Eclectic rock\'n\'roll bar and live music venue — a gem for those who love authentic music culture.' },
        { name: 'Osho-Bar Hannover', type: 'Bar', description: 'Electronic music bar with a devoted local following and a consistently great atmosphere.' },
        { name: 'Café Glocksee', type: 'Alternative', description: 'Beloved alternative venue in Linden — community concerts, cultural events and DIY spirit.' },
        { name: 'Rooftop Anzeiger-Hochhaus', type: 'Rooftop Bar', description: 'Seasonal rooftop bar at Hannover\'s iconic Art Deco tower with panoramic city views.' },
      ],
      sports: [
        { name: 'Hannover 96', type: 'Football', description: 'Proud Bundesliga club with rich history — the HDI-Arena is a cauldron of Lower Saxon passion.' },
        { name: 'Hannover United', type: 'Basketball', description: 'Hannover\'s basketball representatives, building a loyal fanbase in the ProA division.' },
        { name: 'TSV Hannover-Burgdorf "Die Recken"', type: 'Handball', description: 'One of the strongest clubs in the Handball Bundesliga — exciting fast-break play and passionate home atmosphere.' },
        { name: 'Hannover Scorpions', type: 'Ice Hockey', description: 'DEL2 club with a passionate following — fast-paced games at the Eissporthalle am Pferdeturm.' },
        { name: 'RGH Hannover (Rugby)', type: 'Rugby', description: 'Hannover\'s top rugby club, with a long tradition and regular participation in national league competition.' },
        { name: 'Equestrian Sport (CHIO/Hannover)', type: 'Equestrian', description: 'Hannover is Germany\'s equestrian capital — home of the world-famous Hannover horse breed and major show jumping events.' },
      ],
    },
  },
};

const FALLBACK_CITY: CityData = {
  tagline: { en: 'Explore your destination', de: 'Entdecke dein Ziel' },
  lat: 52.5200,
  lon: 13.4050,
  taxi: { label: 'Local Taxi', number: '110' },
  transit: { name: 'Local Transit', url: 'https://www.google.com/maps' },
  places: {
    attractions: [],
    dining: [],
    entertainment: [],
    sports: [],
  },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
/** Open city in Maps — searches by name so the city overview opens (not a pin) */
function openMapsForCity(_lat: number, _lon: number, label: string) {
  const encoded = encodeURIComponent(label);
  if (Platform.OS === 'ios') {
    Linking.openURL(`https://maps.apple.com/?q=${encoded}`);
  } else {
    Linking.openURL(`https://maps.google.com/?q=${encoded}`);
  }
}

/** Open native Weather app (iOS) at the event city; falls back to Google on both platforms */
function openWeather(lat: number, lon: number, cityName: string) {
  if (Platform.OS === 'ios') {
    const weatherUrl = `weather://?lat=${lat}&lon=${lon}`;
    Linking.openURL(weatherUrl).catch(() => {
      const query = encodeURIComponent(`Wetter ${cityName}`);
      Linking.openURL(`https://www.google.com/search?q=${query}`);
    });
  } else {
    const query = encodeURIComponent(`Wetter ${cityName}`);
    Linking.openURL(`https://www.google.com/search?q=${query}`);
  }
}

/** Open city transit authority website directly */
function openTransportation(transitUrl: string) {
  Linking.openURL(transitUrl);
}

/** Search for nearby hospitals in the city */
function openHospitalSearch(_lat: number, _lon: number, cityName: string) {
  const query = encodeURIComponent(`${cityName} Krankenhaus`);
  if (Platform.OS === 'ios') {
    Linking.openURL(`https://maps.apple.com/?q=${query}`);
  } else {
    Linking.openURL(`https://maps.google.com/?q=${query}`);
  }
}

type PopupCategory = 'attractions' | 'dining' | 'entertainment' | 'sports' | null;

interface TeamBadgeConfig {
  abbr: string;
  primary: string;
  secondary: string;
}

const TEAM_BADGE_CONFIG: Record<string, TeamBadgeConfig> = {
  // Berlin
  'Hertha BSC':              { abbr: 'BSC',  primary: '#005DAA', secondary: '#FFFFFF' },
  '1. FC Union Berlin':      { abbr: 'FCU',  primary: '#E3001A', secondary: '#FFFFFF' },
  'Alba Berlin':             { abbr: 'ALB',  primary: '#E8002D', secondary: '#FFFFFF' },
  'Füchse Berlin':           { abbr: 'FÜC',  primary: '#E30613', secondary: '#FFFFFF' },
  'Eisbären Berlin':         { abbr: 'EIS',  primary: '#003D7C', secondary: '#FFFFFF' },
  'Wasserfreunde Spandau 04':{ abbr: 'WSP',  primary: '#0057A8', secondary: '#FFFFFF' },
  // Hamburg
  'Hamburger SV':            { abbr: 'HSV',  primary: '#001E62', secondary: '#FFFFFF' },
  'FC St. Pauli':            { abbr: 'FCS',  primary: '#7E3517', secondary: '#FFFFFF' },
  'Hamburg Towers':          { abbr: 'HTW',  primary: '#0E3577', secondary: '#FF6B00' },
  'HSV Handball Hamburg':    { abbr: 'HSH',  primary: '#001E62', secondary: '#FFFFFF' },
  'Crocodiles Hamburg':      { abbr: 'CRO',  primary: '#2D7D46', secondary: '#FFFFFF' },
  'Regatta & Sailing':       { abbr: 'SAI',  primary: '#0077B6', secondary: '#FFFFFF' },
  // Hannover
  'Hannover 96':             { abbr: '96',   primary: '#00A859', secondary: '#000000' },
  'Hannover United':         { abbr: 'HUN',  primary: '#E8721C', secondary: '#FFFFFF' },
  'TSV Hannover-Burgdorf "Die Recken"': { abbr: 'REC', primary: '#FFD700', secondary: '#C0001A' },
  'Hannover Scorpions':      { abbr: 'SCO',  primary: '#1A1A1A', secondary: '#FFD700' },
  'RGH Hannover (Rugby)':    { abbr: 'RGH',  primary: '#003087', secondary: '#FFFFFF' },
  'Equestrian Sport (CHIO/Hannover)': { abbr: 'CHI', primary: '#8B6914', secondary: '#FFFFFF' },
};

const CATEGORY_CONFIG: Record<NonNullable<PopupCategory>, { label: string; icon: string; color: string }> = {
  attractions: { label: 'Local Attractions', icon: 'telescope-outline', color: '#F59E0B' },
  dining: { label: 'Dining Options', icon: 'restaurant-outline', color: '#10B981' },
  entertainment: { label: 'Entertainment', icon: 'musical-notes-outline', color: '#8B5CF6' },
  sports: { label: 'Sports Teams', icon: 'trophy-outline', color: '#EF4444' },
};

// ─── Screen ───────────────────────────────────────────────────────────────────
export default function DestinationScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [popupCategory, setPopupCategory] = useState<PopupCategory>(null);

  const translateY = useRef(new Animated.Value(0)).current;
  const popupPanResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gs) => gs.dy > 5 && Math.abs(gs.dy) > Math.abs(gs.dx),
      onPanResponderMove: (_, gs) => {
        if (gs.dy > 0) translateY.setValue(gs.dy);
      },
      onPanResponderRelease: (_, gs) => {
        if (gs.dy > 80) {
          Animated.timing(translateY, { toValue: 800, duration: 200, useNativeDriver: true }).start(() => {
            setPopupCategory(null);
            translateY.setValue(0);
          });
        } else {
          Animated.spring(translateY, { toValue: 0, useNativeDriver: true, tension: 100, friction: 8 }).start();
        }
      },
    })
  ).current;

  const { language } = useTranslation();
  const { data: event, isLoading } = useEvent(id);
  const { data: booking } = useBooking(id);

  if (isLoading || !event) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: DARK_THEME.background }}>
        <Spinner size="large" color={DARK_THEME.primary} />
      </View>
    );
  }

  const cityName = event.city?.name || 'Berlin';
  const citySlug = cityName.toLowerCase() as keyof typeof CITY_DATA;
  const city = CITY_DATA[citySlug] || FALLBACK_CITY;
  const cityTagline = city.tagline[language as 'en' | 'de'] ?? city.tagline.en;

  // German emergency contacts — same for all cities
  const emergencyContacts = [
    {
      label: 'Notruf (Emergency)',
      icon: 'shield',
      iconColor: '#EF4444',
      iconBg: 'rgba(239, 68, 68, 0.15)',
      number: '112',
      onPress: () => Linking.openURL('tel:112'),
    },
    {
      label: 'Polizei (Police)',
      icon: 'shield-checkmark',
      iconColor: '#3B82F6',
      iconBg: 'rgba(59, 130, 246, 0.15)',
      number: '110',
      onPress: () => Linking.openURL('tel:110'),
    },
    {
      label: 'Taxi — ' + city.taxi.label,
      icon: 'car',
      iconColor: '#F59E0B',
      iconBg: 'rgba(245, 158, 11, 0.15)',
      number: city.taxi.number,
      onPress: () => Linking.openURL(`tel:${city.taxi.number.replace(/\s/g, '')}`),
    },
    {
      label: 'Ärztlicher Bereitschaftsdienst',
      icon: 'medkit',
      iconColor: '#10B981',
      iconBg: 'rgba(16, 185, 129, 0.15)',
      number: '116 117',
      onPress: () => Linking.openURL('tel:116117'),
    },
    {
      label: 'Nächstes Krankenhaus',
      icon: 'add-circle',
      iconColor: '#9CA3AF',
      iconBg: 'rgba(156, 163, 175, 0.15)',
      number: 'In Maps',
      onPress: () => openHospitalSearch(city.lat, city.lon, cityName),
    },
  ];

  // Use the same package-tier image as the rest of the app for consistency
  const bookingPkgId = (booking as any)?.selected_package_id || event?.hero_image_url;
  const heroImage = getEventImage(citySlug, bookingPkgId);

  // Popup places list
  const popupConfig = popupCategory ? CATEGORY_CONFIG[popupCategory] : null;
  const popupPlaces = popupCategory ? city.places[popupCategory] : [];

  return (
    <View style={styles.container}>
      {/* ─── Hero Header ─────────────────────────── */}
      <View style={styles.heroContainer}>
        <KenBurnsImage source={resolveImageSource(heroImage)} style={StyleSheet.absoluteFillObject} />
        <View style={styles.heroOverlay} />
        <Pressable
          style={[styles.backButton, { top: insets.top + 8 }]}
          onPress={() => router.back()}
          hitSlop={8}
          testID="back-button"
        >
          <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
        </Pressable>
        <View style={styles.heroContent}>
          <Text style={styles.heroSupertitle}>DESTINATION GUIDE</Text>
          <Text style={styles.heroTitle}>{cityName}</Text>
          <Text style={styles.heroSubtitle}>{cityTagline}</Text>
        </View>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 32 }}
        showsVerticalScrollIndicator={false}
      >
        {/* ─── Highlights (in-app popup) ────────────── */}
        <Text style={styles.sectionTitle}>Highlights</Text>
        <View style={styles.highlightRow}>
          {(Object.keys(CATEGORY_CONFIG) as NonNullable<PopupCategory>[]).map((cat) => {
            const cfg = CATEGORY_CONFIG[cat];
            return (
              <Pressable
                key={cat}
                style={({ pressed }) => [styles.highlightChip, pressed && { opacity: 0.75 }]}
                onPress={() => setPopupCategory(cat)}
              >
                <Ionicons name={cfg.icon as any} size={14} color={cfg.color} />
                <Text style={styles.highlightText}>{cfg.label}</Text>
                <Ionicons name="chevron-forward" size={12} color={DARK_THEME.textTertiary} />
              </Pressable>
            );
          })}
        </View>

        {/* ─── Local Tips ──────────────────────────── */}
        <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Local Tips</Text>
        <View style={styles.tipsCard}>
          {/* Check Weather */}
          <Pressable
            style={({ pressed }) => [styles.tipRow, pressed && { opacity: 0.7 }]}
            onPress={() => openWeather(city.lat, city.lon, cityName)}
          >
            <XStack alignItems="center" gap={10} flex={1}>
              <View style={[styles.tipIcon, { backgroundColor: 'rgba(245, 158, 11, 0.15)' }]}>
                <Ionicons name="partly-sunny" size={16} color="#F59E0B" />
              </View>
              <YStack flex={1}>
                <Text style={styles.tipLabel}>Check local weather</Text>
                <Text style={styles.tipUrl}>
                  {Platform.OS === 'ios' ? 'Weather App' : `Wetter ${cityName}`}
                </Text>
              </YStack>
              <Ionicons name="open-outline" size={15} color={DARK_THEME.textTertiary} />
            </XStack>
          </Pressable>

          <View style={styles.tipDivider} />

          {/* Transportation */}
          <Pressable
            style={({ pressed }) => [styles.tipRow, pressed && { opacity: 0.7 }]}
            onPress={() => openTransportation(city.transit.url)}
          >
            <XStack alignItems="center" gap={10} flex={1}>
              <View style={[styles.tipIcon, { backgroundColor: 'rgba(59, 130, 246, 0.15)' }]}>
                <Ionicons name="train" size={16} color="#3B82F6" />
              </View>
              <YStack flex={1}>
                <Text style={styles.tipLabel}>Public transportation</Text>
                <Text style={styles.tipUrl}>{city.transit.name}</Text>
              </YStack>
              <Ionicons name="open-outline" size={15} color={DARK_THEME.textTertiary} />
            </XStack>
          </Pressable>
        </View>

        {/* ─── Emergency Contacts ───────────────────── */}
        <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Emergency Contacts</Text>
        <View style={styles.emergencyCard}>
          {emergencyContacts.map((contact, i) => (
            <React.Fragment key={contact.label}>
              {i > 0 && <View style={styles.tipDivider} />}
              <Pressable
                style={({ pressed }) => [styles.emergencyRow, pressed && { opacity: 0.7 }]}
                onPress={contact.onPress}
              >
                <View style={[styles.emergencyIcon, { backgroundColor: contact.iconBg }]}>
                  <Ionicons name={contact.icon as any} size={16} color={contact.iconColor} />
                </View>
                <Text style={styles.emergencyLabel} flex={1}>{contact.label}</Text>
                <Text style={[styles.emergencyNumber, { color: contact.iconColor }]}>{contact.number}</Text>
              </Pressable>
            </React.Fragment>
          ))}
        </View>

        {/* ─── Open in Maps ────────────────────────── */}
        <Pressable
          style={({ pressed }) => [styles.mapsButton, pressed && { opacity: 0.8 }]}
          onPress={() => openMapsForCity(city.lat, city.lon, cityName)}
          testID="open-maps-button"
        >
          <Ionicons name="map" size={20} color="#5A7EB0" />
          <Text style={styles.mapsButtonText}>Open in Maps</Text>
        </Pressable>
      </ScrollView>

      {/* ─── In-App Places Popup ──────────────────── */}
      {popupCategory && popupConfig && (
        <View style={styles.popupOverlay} pointerEvents="box-none">
          {/* Backdrop — tap to dismiss */}
          <Pressable style={StyleSheet.absoluteFillObject} onPress={() => setPopupCategory(null)} />
          {/* Sheet — separate from backdrop so ScrollView gets all touch events */}
          <Animated.View style={[styles.popupSheet, { paddingBottom: insets.bottom + 16 }, { transform: [{ translateY }] }]}>
            {/* Drag handle + Header — pan responder only on fixed header, not the scroll list */}
            <View {...popupPanResponder.panHandlers}>
              {/* Handle */}
              <View style={styles.popupHandle} />
              {/* Header */}
              <XStack alignItems="center" gap={10} marginBottom={16}>
                <View style={[styles.popupIconCircle, { backgroundColor: `${popupConfig.color}22` }]}>
                  <Ionicons name={popupConfig.icon as any} size={20} color={popupConfig.color} />
                </View>
                <YStack flex={1}>
                  <Text style={styles.popupTitle}>{popupConfig.label}</Text>
                  <Text style={styles.popupSubtitle}>{cityName} — Top picks</Text>
                </YStack>
                <Pressable onPress={() => setPopupCategory(null)} hitSlop={8}>
                  <Ionicons name="close-circle" size={24} color={DARK_THEME.textTertiary} />
                </Pressable>
              </XStack>
            </View>
            {/* Places list */}
            <ScrollView scrollEnabled={true} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              {popupPlaces.map((place, i) => (
                <View key={i} style={styles.placeRow}>
                  <XStack alignItems="flex-start" gap={12}>
                    <YStack alignItems="center" gap={4}>
                      <View style={[styles.placeNumber, { backgroundColor: `${popupConfig.color}22` }]}>
                        <Text style={[styles.placeNumberText, { color: popupConfig.color }]}>{i + 1}</Text>
                      </View>
                      {popupCategory === 'sports' && (() => {
                        const badge = TEAM_BADGE_CONFIG[place.name];
                        if (!badge) return null;
                        return (
                          <View style={[styles.teamBadge, { backgroundColor: badge.primary }]}>
                            <Text style={[styles.teamBadgeText, { color: badge.secondary }]}>{badge.abbr}</Text>
                          </View>
                        );
                      })()}
                    </YStack>
                    <YStack flex={1} gap={2}>
                      <XStack alignItems="center" gap={6}>
                        <Text style={styles.placeName}>{place.name}</Text>
                      </XStack>
                      <Text style={styles.placeType}>{place.type}</Text>
                      <Text style={styles.placeDescription}>{place.description}</Text>
                    </YStack>
                  </XStack>
                  {i < popupPlaces.length - 1 && <View style={styles.placeDivider} />}
                </View>
              ))}
            </ScrollView>
          </Animated.View>
        </View>
      )}
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: DARK_THEME.background,
  },
  heroContainer: {
    height: 240,
    position: 'relative',
  },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.52)',
  },
  backButton: {
    position: 'absolute',
    left: 16,
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroContent: {
    position: 'absolute',
    bottom: 20,
    left: 16,
    right: 16,
  },
  heroSupertitle: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 1.5,
    color: 'rgba(255,255,255,0.75)',
    marginBottom: 4,
  },
  heroTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: '#FFFFFF',
    lineHeight: 36,
  },
  heroSubtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: DARK_THEME.textPrimary,
    marginBottom: 12,
  },
  highlightRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  highlightChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: DARK_THEME.surfaceCard,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderWidth: 1,
    borderColor: DARK_THEME.glassBorder,
  },
  highlightText: {
    fontSize: 13,
    fontWeight: '600',
    color: DARK_THEME.textPrimary,
  },
  tipsCard: {
    backgroundColor: DARK_THEME.surfaceCard,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: DARK_THEME.glassBorder,
    overflow: 'hidden',
  },
  tipRow: {
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  tipIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tipLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: DARK_THEME.textPrimary,
  },
  tipUrl: {
    fontSize: 12,
    color: DARK_THEME.textTertiary,
    marginTop: 1,
  },
  tipDivider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.05)',
    marginHorizontal: 14,
  },
  emergencyCard: {
    backgroundColor: DARK_THEME.surfaceCard,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: DARK_THEME.glassBorder,
    overflow: 'hidden',
  },
  emergencyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 13,
    gap: 12,
  },
  emergencyIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emergencyLabel: {
    fontSize: 13,
    color: DARK_THEME.textSecondary,
  },
  emergencyNumber: {
    fontSize: 15,
    fontWeight: '700',
  },
  mapsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 16,
    backgroundColor: DARK_THEME.surfaceCard,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: DARK_THEME.glassBorder,
    paddingVertical: 16,
  },
  mapsButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#5A7EB0',
  },
  // ─── Popup styles ────────────────────────────
  popupOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
    zIndex: 100,
    // pointerEvents="box-none" applied inline so touches pass through to children
  },
  popupSheet: {
    backgroundColor: '#1E2329',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 16,
    paddingTop: 12,
    maxHeight: '90%',
    borderTopWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  popupHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignSelf: 'center',
    marginBottom: 16,
  },
  popupIconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  popupTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: DARK_THEME.textPrimary,
  },
  popupSubtitle: {
    fontSize: 12,
    color: DARK_THEME.textTertiary,
    marginTop: 1,
  },
  placeRow: {
    paddingVertical: 12,
  },
  placeNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  placeNumberText: {
    fontSize: 13,
    fontWeight: '700',
  },
  placeName: {
    fontSize: 14,
    fontWeight: '700',
    color: DARK_THEME.textPrimary,
  },
  placeType: {
    fontSize: 11,
    fontWeight: '600',
    color: DARK_THEME.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 1,
  },
  placeDescription: {
    fontSize: 13,
    color: DARK_THEME.textSecondary,
    lineHeight: 18,
    marginTop: 3,
  },
  placeDivider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.05)',
    marginTop: 12,
  },
  teamBadge: {
    width: 38,
    height: 38,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  teamBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
});
