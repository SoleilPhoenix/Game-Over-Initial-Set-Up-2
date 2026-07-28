# Game Over - Onboarding-Video: Spec und Prompt-Bibliothek

Stand: 2026-07-20.
Referenz: HelloFresh In-App-Onboarding (Screen Recording, 18,1s, analysiert am 2026-07-20).

## 1. Zielsetzung

Ein 15-Sekunden-Video, das beim ersten Start der Game-Over-App läuft.
Es folgt der Aktstruktur des HelloFresh-Onboardings: erst Marke, dann echte Menschen, dann das Versprechen, dann Auflösung.
Es muss stumm funktionieren und im Hochformat 9:16 (1080 × 1920) ausgeliefert werden.

## 2. Marken-Rahmen

| Rolle | Wert |
|---|---|
| Grund / Navy | `#0D1B2A` |
| Akzent / Gold | `#C6A75E` |
| Text / Creme | `#E8DCC8` |
| Fläche | `#12253A` |
| Logo | `assets/brand/logo.svg` |

Die Farbwelt bestimmt auch die Bildlooks: warme Goldlichter gegen tiefblaue Schatten.
Damit schneidet das Filmmaterial sauber gegen die Motion-Graphics-Akte.

## 3. Produktionsaufteilung

Nur vier Shots kommen aus einem Videomodell.

| Akt | Zeit | Produktionsart |
|---|---|---|
| I - Marken-ID | 0,0 - 2,5s | Motion Graphics (in-house) |
| II - Sozialer Beweis | 2,5 - 8,0s | 4 × KI-Video |
| III - Versprechen | 8,0 - 13,2s | Motion Graphics + KI-Standbilder |
| IV - Auflösung | 13,2 - 15,0s | Motion Graphics (in-house) |

Akt I und II sind zeitlich fixiert.
Die zusätzliche Zeit gegenüber der ersten Fassung liegt vollständig in Akt III, damit die Headlines lesbar bleiben.

Logo und gesetzte Typografie gehören nicht in ein Videomodell.
Weder Veo, Kling noch Seedance reproduzieren eine bestimmte Wortmarke oder Schrift markenkonform.
Das Ergebnis ist zuverlässig verwaschene Pseudo-Schrift und ein Logo, das dem echten nur ähnelt.

## 4. Casting-Logik: zwei Crews

JGA-Gruppen sind praktisch immer gleichgeschlechtlich.
Deshalb wird nicht pro Shot neu besetzt, sondern es gibt zwei durchgehende Crews.

| Crew | Shots | Besetzung |
|---|---|---|
| **A** | Shot 1 (Anstoßen), Shot 4 (Durch die Stadt) | Sechs Männer, Ende zwanzig |
| **B** | Shot 2 (Konfetti), Shot 3 (Das Handy) | Fünf Frauen, Ende zwanzig |

Die Schnittfolge mischt die Crews: A - B - B - A.
So erzählt das Video zwei Abende statt vier unverbundener Clips.

## 5. Pipeline

Die Reihenfolge ist bewusst bildzuerst, nicht videozuerst.

```
Schritt 1   ChatGPT Image 2.0    Hero-Keyframe pro Crew            → A1, B1
Schritt 2   Gemini Nano Banana   Abgeleiteter Keyframe, gleiche    → A2, B2
                                 Gesichter
Schritt 3   Sichtung             Gesichter, Hände, Finger prüfen    Gate
Schritt 4   Veo / Kling / Seed.  Keyframe animieren, 1,3 - 1,4s    → 4 Clips
Schritt 5   Gemini Nano Banana   6 - 8 Mosaik-Standbilder für Akt III
Schritt 6   Schnitt              Motion Graphics + Clips montieren
```

Schritt 3 ist ein echtes Gate.
Ein Standbild lässt sich in Sekunden verwerfen, ein fehlerhaftes Video kostet einen vollen Generierungsdurchlauf.
Wer diesen Schritt überspringt, zahlt ihn später doppelt.

## 6. Bildmodelle

### 6.1 ChatGPT Image 2.0 - die Hero-Keyframes

Stärke: Prompt-Treue und Bildkomposition bei komplexen Szenen mit mehreren Personen.
Prompt-Grammatik: zusammenhängende, beschreibende Prosa. Kein Komma-Stakkato.

#### Keyframe A1 - Crew A, Bar, Anstoßen

```
Documentary-style candid photograph, vertical 9:16 composition. Six German
men in their late twenties crowded around a small high table in a warm,
dimly lit city bar, clinking half-full beer glasses in a messy, overlapping
toast. Shot on a 35mm lens at f/2, eye level, slight handheld tilt.
Practical lighting only: amber pendant bulbs just above frame, deep
navy-blue shadows filling the background, warm gold highlights on faces and
glass rims. Ordinary weekend clothing, one man in a plain shirt with rolled
sleeves. Genuine mid-laugh expressions, eyes on each other rather than on
the camera, two faces partially turned away. Shallow depth of field,
background patrons dissolved into bokeh. Natural skin texture with visible
pores, fine film grain, subtle motion blur on one moving hand. Colour grade:
warm amber highlights against cool deep-blue shadows. Headroom at the top of
frame.
```

#### Keyframe B1 - Crew B, draußen, Konfetti

```
Documentary-style candid photograph, vertical 9:16 composition. Five German
women in their late twenties standing outdoors on a city street at night,
gold confetti falling through the air around them, one woman being hugged
from behind by another, all of them laughing. Shot on a 50mm lens at f/1.8,
eye level, slight handheld drift. Lighting comes from warm street lamps and
out-of-focus city lights behind them rendered as large soft bokeh circles,
deep navy-blue night sky. Ordinary going-out clothing, coats over dresses,
no matching outfits. Genuine unposed expressions, nobody looking at the
camera, one woman mid-turn and slightly motion-blurred. Shallow depth of
field. Natural skin texture, fine film grain. Colour grade: warm gold
highlights against cool deep-blue shadows. Headroom at the top of frame.
```

#### Negativ-Anweisung (an beide Prompts anhängen)

```
Avoid: bachelor party costumes, sashes, matching t-shirts, party hats,
inflatable props, novelty glasses, posed group portrait, everyone facing
camera and smiling, stock photography look, airbrushed or plastic skin, HDR,
oversaturation, deformed hands, extra or fused fingers, text, watermarks,
logos.
```

Die Kostüm-Ausschlüsse sind nicht optional.
Ohne sie erzeugt jedes Bildmodell auf den Begriff „bachelor party" hin zuverlässig Schärpen, Deko-Brillen und aufblasbare Requisiten.
Das kollidiert frontal mit der Navy-Gold-Anmutung der Marke.

### 6.2 Gemini Nano Banana (Flash Image) - die abgeleiteten Keyframes

Stärke: Gesichtskonsistenz über mehrere Bilder und gezieltes Bearbeiten eines Referenzbildes.
Genau dafür wird es hier eingesetzt, nicht als zweites Text-zu-Bild-Modell.

Vorgehen: das freigegebene Bild A1 hochladen, dann umschreiben lassen.

#### Keyframe A2 - Crew A, nachts durch die Stadt

```
Using the same six men from the reference image, keep their faces, hair and
build identical. Place them walking away from the camera along a wet German
city street at night, seen from behind, shoulders loose, one of them turning
his head slightly to the side in profile. Same wardrobe as the reference.
Warm street lamps and shop windows on both sides, reflections on wet asphalt,
deep navy-blue night sky. 35mm lens, eye level, handheld. Shallow depth of
field, background compressed into bokeh. Fine film grain, natural skin
texture. Warm gold highlights against cool deep-blue shadows. Vertical 9:16.
```

#### Keyframe B2 - Crew B, über das Handy gebeugt

```
Using the same five women from the reference image, keep their faces, hair
and build identical. Place four of them leaning in over a single phone held
by one woman, all looking down at the screen, two of them laughing, one
pointing at it. Indoor setting, warm apartment or bar lighting from a lamp
just out of frame. The phone screen glows softly and is not legible. Same
wardrobe as the reference. 35mm lens, slightly above eye level looking down,
handheld. Shallow depth of field. Fine film grain, natural skin texture.
Warm gold highlights against cool deep-blue shadows. Vertical 9:16.
```

Wichtig bei B2: das Display bleibt unlesbar.
Ein Modell, das eine Benutzeroberfläche erfinden soll, erzeugt eine fremde App mit unleserlicher Schrift.
HelloFresh macht es genauso - das Produkt wird impliziert, nie gezeigt.

## 7. Videomodelle

Alle vier Clips laufen als Bild-zu-Video aus den freigegebenen Keyframes.
Der Bewegungsprompt beschreibt nur noch Bewegung, nicht mehr die Szene - die trägt bereits das Bild.
Zieldauer je Clip: 1,3 bis 1,4 Sekunden. Länger generieren und im Schnitt kürzen ist zulässig und meist sinnvoll.

### 7.1 Veo 3.1

Prompt-Grammatik: zusammenhängende Prosa mit Kameravokabular.
Veo erzeugt nativ Ton, deshalb gehört eine Audiozeile in den Prompt, auch wenn das Video am Ende stumm läuft - der Ton stabilisiert die Bewegungslogik.

| Shot | Prompt |
|---|---|
| 1 | `The men complete the toast, the glasses meeting in the centre of the frame, then pull their arms back as they laugh. The camera drifts slightly to the right and settles. Natural handheld micro-shake throughout. Nobody turns to look at the camera. Audio: layered bar chatter, a single glass clink, warm overlapping laughter, no music.` |
| 2 | `Confetti continues to fall through the frame in slow motion. The woman being hugged tilts her head back laughing, the others sway slightly. The camera holds, breathing gently with handheld micro-shake. Audio: soft street ambience, laughter, no music.` |
| 3 | `The women lean in a little closer over the phone, one of them points at the screen and the others react with laughter. Small natural head movements. The camera holds steady with faint handheld drift. Audio: quiet indoor room tone, overlapping laughter, no music.` |
| 4 | `The group walks away from the camera down the street, shoulders moving naturally with their stride. The camera follows behind them at walking pace, gently unsteady. Reflections shift on the wet asphalt. Audio: footsteps on wet pavement, distant city traffic, faint laughter, no music.` |

### 7.2 Kling 3.1

Prompt-Grammatik: kommagetrennte Deskriptoren, deutlich knapper als Veo.
Negative Prompts gehören in ein eigenes Feld, nicht in den Hauptprompt.

| Shot | Prompt |
|---|---|
| 1 | `toast completing, beer glasses meeting centre frame, arms pulling back, men laughing, subtle handheld camera drift right, natural micro-shake, shallow depth of field maintained, warm amber practical lighting` |
| 2 | `gold confetti falling slowly through frame, woman tilting head back laughing, group swaying gently, static handheld camera, soft bokeh city lights behind, slow motion` |
| 3 | `group leaning closer over phone, one hand pointing at screen, heads turning slightly, laughing, static camera with faint drift, warm indoor lamp light` |
| 4 | `group walking away from camera down wet street, natural stride, camera following behind at walking pace, gentle handheld instability, reflections shifting on wet asphalt` |

Negative Prompt für alle vier Shots:

```
morphing faces, changing identity, face swap, extra limbs, extra fingers,
fused fingers, hands merging with objects, warping background, sudden zoom,
camera whip, speed ramp, text overlay, watermark, logo, cartoon, 3d render
```

### 7.3 Seedance

Prompt-Grammatik: am knappsten von allen. Kamerabewegung als eigene Klammer.
Lange Prompts verschlechtern das Ergebnis hier eher, als dass sie helfen.

| Shot | Prompt |
|---|---|
| 1 | `A group of men complete a toast and laugh together. [Camera: slight pan right, handheld]` |
| 2 | `Confetti falls around a group of laughing women. [Camera: static, handheld]` |
| 3 | `A group leans over a phone, one points, all laugh. [Camera: static]` |
| 4 | `A group walks away down a wet night street. [Camera: follow from behind, handheld]` |

### 7.4 Modellwahl pro Shot

Die drei Modelle sind nicht gleichwertig für diese Aufgabe.

| Shot | Erste Wahl | Begründung |
|---|---|---|
| 1 Anstoßen | Veo 3.1 | Sechs Gesichter plus Handbewegung mit Objekten ist der schwerste Shot. Höchste Kohärenz nötig. |
| 2 Konfetti | Kling 3.1 | Partikelbewegung und Zeitlupe sind Klings Stärke. |
| 3 Handy | Veo 3.1 | Enge Gesichter, feine Mimik. |
| 4 Stadt | Seedance | Gesichter abgewandt, einfachste Bewegung. Schnell und günstig, hier reicht das schwächste Modell. |

Shot 4 zuerst generieren.
Er ist der billigste und zeigt früh, ob der Look insgesamt trägt.

## 8. Akt III - Mosaik-Standbilder

Sechs bis acht quadratische Karten, erzeugt in Gemini Nano Banana.
Drei Stadtmotive, zwei Paketmotive, drei Gruppenmomente.

```
Vertical mobile-photo aesthetic, square crop, warm gold highlights against
deep navy-blue shadows, fine grain, candid and unposed. Subject: <MOTIV>.
No text, no logos, no watermarks, no faces looking at camera.
```

Motive einsetzen für `<MOTIV>`:

1. `the Berlin skyline at night from a rooftop, city lights as soft bokeh`
2. `the Hamburg harbour at blue hour, cranes silhouetted against the sky`
3. `a Hannover street at night, warm shop windows reflected on wet pavement`
4. `a table from above with beer glasses, phones and car keys, warm lamp light`
5. `a hotel room door with a key card being held up, shallow focus`
6. `hands raised in a crowd at night, gold confetti in the air`
7. `a small group seen from behind on a rooftop looking at the city`
8. `a phone lying face down on a bar table next to two glasses`

## 9. Akt I und IV - Motion Graphics

Kein Prompt, sondern Umsetzung im Schnittprogramm oder in React Native.

**Akt I (0,0 - 2,5s).**
Navy-Vollfläche `#0D1B2A`.
Das Gold-Logo aus `assets/brand/logo.svg` baut sich aus der Mitte auf, Skalierung von 0,92 auf 1,0 mit weicher Abbremsung.
Darunter ein feiner Ladeindikator in `#C6A75E`.
Kein Text, keine Claim-Zeile.
Die Komponente `AnimatedLogo` existiert bereits (Commit `c21c3b4f7`) und sollte wiederverwendet werden.

**Akt III Typografie (8,8 - 13,2s).**
Hintergrund wechselt auf Creme `#E8DCC8`.
Headline 1 von 8,8s bis 11,0s, Headline 2 von 11,0s bis 13,2s, harter Austausch ohne Überblendung.
Zeilen umbrechen wie notiert.

> Den JGA feiern,
> ohne ihn zu organisieren

> Stadt wählen. Paket buchen.
> Und den Ehrengast feiern.

Beide Headlines stehen 2,2 Sekunden.
Das ist die Untergrenze für acht Wörter bei rund 2,5 lesbaren Wörtern pro Sekunde.
Kürzer wirkt die zweite Zeile gehetzt, egal wie groß sie gesetzt ist.

**Akt IV (13,2 - 15,0s).**
Karten fliegen aus dem Bild, eine bleibt und schrumpft zum Logo auf Navy.

> & alle zahlen ihren Teil

## 10. Erwarteter Aufwand

Gesichter in Gruppen sind der schwierigste Fall für alle drei Videomodelle.
Realistisch sind vier bis acht Generierungsdurchläufe pro brauchbarem Clip.
Bei vier Shots also grob 20 bis 30 Durchläufe insgesamt.

Prüfkriterien beim Sichten, in dieser Reihenfolge:

1. Hände und Finger, besonders am Glas und am Handy
2. Gesichtsidentität über die Clipdauer - driftet jemand?
3. Blickrichtung - schaut jemand in die Kamera?
4. Hintergrund - warpt etwas beim Kameraschwenk?

Kriterium 1 fällt am häufigsten durch.

## 11. Phase 2 - Ton und Musik

Bewusst nach hinten geschoben.
Erst steht die Bildsequenz, dann wird vertont - nicht umgekehrt.

Der Grund ist praktisch: Musik diktiert Schnittpunkte.
Wer zuerst einen Track wählt, schneidet danach das Bild auf die Musik und verschiebt dabei die Aktgrenzen.
Da die Aktgrenzen hier aus der Erzähllogik kommen und nicht aus dem Takt, ist die Reihenfolge Bild vor Ton die richtige.

Wenn die 15 Sekunden geschnitten sind, sind das die Entscheidungen für Phase 2:

1. Trägt der Ton, oder unterstützt er nur? Das Video muss stumm funktionieren, also unterstützt er.
2. Ein Musikbett über die volle Länge, oder Einsatz erst ab Akt II? Der Logo-Reveal in Stille ist die ruhigere Variante.
3. Werden die Veo-generierten Originaltöne aus Akt II genutzt (Gläserklirren, Lachen) oder komplett ersetzt?
4. Braucht der Übergang bei 8,0s einen Akzent, wenn die Clips zum Mosaik kollabieren?

Punkt 3 ist der interessanteste.
Die Veo-Clips bringen brauchbaren Originalton mit, der bereits synchron zum Bild ist.
Das kann echter wirken als ein sauberer Musikteppich, ist aber schwerer zu mischen.

## 12. Offene Punkte

**Plattform-Parameter.**
Die Prompt-Grammatiken oben sind stabil und belastbar.
Die konkreten Bedienfelder - Namen der Regler für Bewegungsstärke, Seitenverhältnis, Clipdauer - ändern sich bei diesen Anbietern schnell und sind hier bewusst nicht dokumentiert.
Sie sind in der jeweiligen Oberfläche direkt sichtbar.

**Akt IV.**
„& alle zahlen ihren Teil" ist funktional, genau wie HelloFresh' Schlusszeile.
Nachdem Headline 2 jetzt auf dem Ehrengast landet, steht der Zahlungshinweis unmittelbar danach.
Die App kann den Ehrengast von der Zahlung ausnehmen - ob dieser Gedanke ins Endbild gehört, ist offen.
