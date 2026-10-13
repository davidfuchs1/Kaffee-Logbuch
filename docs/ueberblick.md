# Kaffee-Logbuch – Überblick

Was die App macht, wie sie aussieht, wie sie gebaut ist und was dazu entschieden
wurde. Stand: 14.10.2026, Version 2.0.

Verwandte Dateien: `CLAUDE.md` (Regeln für die Arbeit am Projekt),
`docs/datenformat.md` (verbindliches Datenformat), `README.md` (für Nutzer).

## 1. Was die App ist

Ein privates Brüh-Protokoll für Espresso und Kaffee. Pro Kaffee ein Rezept mit
Bewertung, Geschmacksnoten und einem Foto der Verpackung. Sie läuft als Web-App auf
GitHub Pages und wird auf dem iPhone über „Zum Home-Bildschirm“ installiert.

- Adresse: https://davidfuchs1.github.io/Kaffee-Logbuch/
- Repo: `davidfuchs1/Kaffee-Logbuch`, öffentlich, nur der Zweig `main`. Ein Push nach
  `main` ist nach etwa einer Minute live.
- Nutzer: der Inhaber, dazu Freunde mit je eigener Installation. Jede Installation hat
  ihre eigenen Daten.

**Grundsätze**
- Kein Login, kein Konto, kein Server. Alle Daten liegen nur auf dem Gerät.
- Kostenlos und ohne Build-Schritt: statische Dateien, Vanilla-JS als ES-Module.
- Keine Fremdskripte, keine Tracker, keine Verbindung zu Dritten (auch die Schriften
  liegen lokal).
- Oberfläche und Chat auf Deutsch.

## 2. Funktionen

### Liste
- Karten, sortierbar nach „Neueste“ (`createdAt`) oder „Beste“ (`rating`), dazu ein
  Zähler „n Einträge“. Leerzustand mit Hinweis auf den +-Knopf.
- Karte, von oben nach unten: Foto links (54 × 70, nur wenn vorhanden), daneben Rösterei
  (klein, Großbuchstaben), Kaffeename und darunter fünf Bohnen; dann die Kennzahlen als
  Badges (`1 : 2,2` · `18g → 40g` · `29 Sek` · `2,9 Mahlgrad`); dann Geschmacksnoten als
  Chips; dann die Notiz, auf zwei Zeilen gekürzt.
- Tippen auf eine Karte öffnet sie zum Bearbeiten. Runder +-Knopf unten rechts für einen
  neuen Kaffee.

### Formular (Blatt von unten)
| Feld | Regel |
|---|---|
| Kaffee | Pflichtfeld |
| Rösterei | frei |
| Foto der Verpackung | wählen, ersetzen, entfernen; Tippen aufs Bild zeigt es groß |
| Gramm ein / aus | Standard 18 / 40, −/+-Knöpfe, Verhältnis wird live angezeigt |
| Brühzeit | nur Sekunden, Standard 25 |
| Mahlgrad | Schieberegler −1 bis 20 in 0,1-Schritten, Standard 10 |
| Bewertung | 0 bis 5 Bohnen in halben Schritten |
| Geschmack | Chips zum Antippen, dazu ein Feld für eine eigene Note |
| Bemerkungen | Freitext |

- **Name + Rösterei gibt es nur einmal** (verglichen ohne Groß-/Kleinschreibung und
  überzählige Leerzeichen). Sonst erscheint die Warnung „Für diesen Kaffee bei dieser
  Rösterei gibt es bereits ein Rezept …“.
- **Bewertung:** Tipp auf die linke Hälfte einer Bohne = x,5, auf die rechte = voll.
- **Löschen:** zwei Tipps auf denselben Knopf („Wirklich löschen? Nochmal tippen“, nach
  3 Sekunden zurück). Kein `confirm()` – das war auf iOS unzuverlässig.
- **Schließen:** „Abbrechen“, Tipp neben das Blatt oder das Blatt nach unten wegziehen.
  Alle drei verwerfen ungespeicherte Änderungen ohne Rückfrage.

### Geschmacksnoten
- Zehn Standardnoten, fest im Code: Schokolade, Nuss, Karamell, Beeren, Zitrus,
  Steinobst, Floral, Würzig, Kakao, Milchschokolade.
- Eine eigene Note gehört **nur zu dem Kaffee**, an dem sie eingegeben wurde. Es gibt
  keine gemerkte Liste und keine Verwaltung in den Einstellungen. Im Formular stehen die
  Standardnoten und zusätzlich die eigenen Noten dieses einen Kaffees.

### Fotos
- Auswahl über die iOS-Fotoauswahl (Mediathek, Kamera, Dateien).
- Die App speichert eine **eigene Kopie**: längste Kante 1280 px als JPEG, dazu ein
  Vorschaubild mit 240 px für die Liste. Das Original in der Fotos-App wird danach nicht
  mehr gebraucht.
- Das Foto wird erst mit „Speichern“ übernommen. Beim Löschen eines Kaffees verschwindet
  auch sein Foto.

### Sicherung (Zahnrad oben rechts)
- **Jetzt sichern:** eine Datei `kaffee-logbuch-backup-JJJJ-MM-TT.json` mit allen
  Einträgen und Fotos. Übergabe an den iOS-Teilen-Dialog („In Dateien sichern“), sonst
  als Download.
- **Wiederherstellen** führt zusammen: Neue Kaffees kommen dazu. Bei vorhandenen wird
  nur ergänzt, was fehlt (Foto, wenn keins da ist; Noten, wenn keine da sind).
  Überschrieben wird nie etwas. Liest auch Backups der ersten App-Version.
- **Erinnerung:** Statuszeile „Letzte Sicherung vor n Tagen · m ungesicherte
  Änderungen“. Ein goldener Punkt am Zahnrad erscheint ab 3 ungesicherten Änderungen
  oder wenn eine Änderung seit 14 Tagen ungesichert ist.

### Ohne Netz
Die App startet und funktioniert vollständig offline. Der Service Worker hält die
Oberfläche vor; die Daten liegen ohnehin auf dem Gerät.

## 3. Aussehen

### Farben (`farben.css`, einzige Stelle für Farbwerte)
| Variable | Wert | Verwendung |
|---|---|---|
| `--bg` | `#1B1512` | Hintergrund, Blätter, Oberkante |
| `--surface` | `#241C17` | Karten, Eingabefelder |
| `--surface-2` | `#2E241E` | Badges, −/+-Knöpfe, Fotofeld |
| `--border` | `#3B2E26` | Rahmen |
| `--text` | `#F2E9DD` | Haupttext |
| `--text-secondary` | `#B3A093` | Notizen, Zahlen in Badges |
| `--text-muted` | `#A08D80` | Nebentext: Beschriftungen, Einheiten, Rösterei-Zeile |
| `--line-muted` | `#7C6A5E` | nur Linien: Kontur der leeren Bohne |
| `--gold` | `#D4A24C` | Akzent: Bohnen, Hauptknopf, aktive Auswahl |
| `--gold-soft` | Gold 14 % | Hintergrund aktiver Elemente |
| `--gold-dim` | `#8A6B37` | Rahmen der Noten-Chips |
| `--danger` / `--danger-soft` | `#B85C4A` / 14 % | Löschen, Warnung |
| `--danger-text` | `#D77E6B` | Text auf rotem Feld |

Der Nebentext wurde bewusst aufgehellt (früher `#7C6A5E`, Kontrast 2,9–3,5). Jetzt
4,8–5,7 auf allen drei Flächen. Text braucht mindestens 4,5.

### Schriften (lokal in `schriften/`, SIL Open Font License)
- **Fraunces 600** – Überschriften (Titel 28 px, Blatt 21 px, Kaffeename 19 px)
- **Inter 400/500/600** – Text und Beschriftungen
- **IBM Plex Mono 400** – Zahlen und Badges

### Maße
- Inhalt höchstens 520 px breit, 18 px Rand. Karten-Radius 16 px, Felder 10 px.
- Tippflächen mindestens 40–44 px (Zahnrad 44, −/+ 40, Sortierung 38 plus Rahmen,
  Bohne in der Auswahl 44).
- Textfelder 16 px – darunter zoomt iOS beim Antippen. Kleinste Schrift 11 px.

### Bohnen-Symbol (`js/bohne.js`)
In mehreren Runden vom Inhaber abgenommen. **Nicht ohne Rückfrage ändern.**
- Glattes Oval, 13 × 17,87 Einheiten im 24er-Feld, um 20° nach rechts gekippt.
- Zwei Hälften mit einer dunklen Lücke dazwischen: in der Mitte 1,3 breit, an beiden
  Enden spitz zulaufend.
- Drei Zustände, exakt gleich groß und mit derselben Lücke:
  - **voll:** beide Hälften gold
  - **halb:** links gold, rechts nur Kontur
  - **leer:** beide Hälften nur Kontur
- Kontur immer nach innen gezeichnet: außen 0,6, entlang der Lücke 0,3.
- Größe: 20 px in der Karte, 36 px in der Bewertungsauswahl.

Was dabei ausprobiert und abgelehnt wurde: zwei getrennte Hälften mit breitem Spalt,
ein Körper mit dünner Linie, eine plastische Fassung mit Schatten; Konturen, die sich an
den Spitzen kreuzen; eine an den Enden stumpfe Lücke; ein kleiner Zipfel an den Spitzen;
eine abgeflachte Kappe.

### App-Icon
Dieselbe Bohne, voll, 20° gekippt, 60 % der Icon-Höhe.
- Hintergrund: Verlauf von der Mitte nach außen `#46351F` → `#2A2019` (bei 50 %) →
  `#1A1411`, Radius 62 %.
- Bohne: Goldverlauf von oben links nach unten rechts `#E3B865` → `#CF9C45`. Die Lücke
  zeigt den Hintergrund.
- Dateien: `apple-touch-icon.png` (180 × 180) und `icon-512.png`, randlos – iOS rundet
  die Ecken selbst. In `index.html` und `manifest.json` mit `?v=3` eingebunden; bei
  einem neuen Icon die Zahl erhöhen.

## 4. Aufbau

| Datei | Aufgabe |
|---|---|
| `index.html` | Gerüst: Liste, Formular-Blatt, Sicherungs-Blatt, Foto-Ansicht |
| `farben.css`, `stil.css` | Farben bzw. Layout, Komponenten, Schriften |
| `js/app.js` | Oberfläche und Ereignisse; hält den Zustand im Speicher |
| `js/daten.js` | Datenmodell, Migration, Import/Export, Erinnerung – reine Funktionen |
| `js/speicher.js` | Laden/Speichern (localStorage) und Foto-Ablage (IndexedDB) |
| `js/bilder.js` | Fotos verkleinern, Umwandlung für die Sicherungsdatei |
| `js/bohne.js` | Bohnen-Symbol |
| `js/ziehen.js` | Blätter nach unten wegziehen |
| `service-worker.js` | Oberfläche vorhalten |
| `tests/` | Tests im Browser |
| `tools/server.py` | lokaler Testserver ohne Browser-Cache |

**Ablauf beim Start:** `speicher.js` lädt den Zustand (und wandelt alte Stände einmalig
um), `app.js` zeichnet die Liste und lädt danach die Vorschaubilder nach.
**Bei jeder Änderung:** Zustand im Speicher ändern → `saveState` → Liste neu zeichnen →
Zähler für die Erinnerung erhöhen.

**Speicherorte:** Einträge in `localStorage` (`kaffee-logbuch-v3`), Fotos in IndexedDB
(`kaffee-logbuch`), Stand der Sicherung in `kaffee-logbuch-meta`. Alte Schlüssel der
ersten App-Version werden gelesen, aber nie verändert. Einzelheiten:
`docs/datenformat.md`.

**Service Worker:** erst Netz mit 1,5 s Wartezeit, sonst Cache. Dadurch kommt eine neue
Version beim nächsten Öffnen an. Er löscht nur eigene Caches, weil alle Seiten unter
`davidfuchs1.github.io` sich einen Bereich teilen. Bei neuen Dateien die Liste
`OBERFLAECHE` ergänzen.

**Sicherheit:** Content-Security-Policy erlaubt nur eigene Dateien. Deshalb keine
Inline-Skripte und keine `style="…"`-Attribute. Nutzereingaben werden nur über
`escapeHtml` ins HTML gesetzt.

## 5. iPhone-Besonderheiten

- **Getrennter Speicher:** Die Home-Bildschirm-App hat einen eigenen Speicher, getrennt
  von Safari. Wird das Symbol gelöscht, sind die Daten weg – dafür gibt es die Sicherung.
- **Unschärfe an der Notch:** iOS 26/27 legt oben einen Unschärfe-Verlauf über
  Home-Bildschirm-Apps. Gelöst mit Statusleiste `default` und der `.oberkante`, einer
  deckenden, haftenden Fläche in der Hintergrundfarbe. Die Blätter beginnen darunter.
  Am Gerät bestätigt: Der Streifen allein reicht nicht, es braucht beides.
- **Nur beim Hinzufügen gelesen:** Statusleisten-Angabe und Icon übernimmt iOS nur in
  dem Moment, in dem die App zum Home-Bildschirm hinzugefügt wird. Änderungen daran
  wirken erst nach Löschen und Neu-Hinzufügen; vorher sichern, danach wiederherstellen.
- **Vor dem Hinzufügen neu laden:** Safari kann zuerst eine ältere Fassung zeigen.

## 6. Entschieden und verworfen

| Thema | Entscheidung |
|---|---|
| Cloud-Datenbank, Login | abgelehnt |
| Datei in iCloud Drive direkt lesen/schreiben | in Safari/iOS nicht möglich |
| Native App | braucht bezahlten Developer-Account, abgelehnt |
| Abgleich über ein privates GitHub-Repo | geprüft und machbar (privates Repo pro Person, Token pro Repo, Muster aus der Trainings-App), aber **zurückgestellt**. Gründe: Token im Gerätespeicher, Daten bei GitHub, Token-Weitergabe an Freunde rechtlich unklar. `id` und `updatedAt` im Datenmodell sind dafür vorbereitet. |
| Fotos als Verweis auf die Fotos-App | abgelehnt, die App hält eine eigene Kopie |
| Sicherung als ZIP mit einzelnen Bilddateien | nicht umgesetzt, eine JSON-Datei mit eingebetteten Fotos reicht |
| Gemerkte Liste eigener Geschmacksnoten | wieder entfernt, Noten stehen nur am Kaffee |
| Import überspringt vorhandene Kaffees ganz | geändert: fehlendes Foto und fehlende Noten werden ergänzt |
| Getrennte Vorschau-Fassung unter `vorschau/` | zum Testen genutzt, danach entfernt. Bei Bedarf aus der Git-Historie (`tools/vorschau.sh`) zurückholen. |
| Statusleiste `black-translucent` | ersetzt durch `default`, siehe oben |
| Bohnen oben rechts in der Karte | jetzt unter dem Namen, damit Karten mit und ohne Foto gleich aufgebaut sind |

## 7. Arbeiten am Projekt

```bash
python3 tools/server.py
```
Dann http://localhost:8765/ für die App und http://localhost:8765/tests/test.html für die
Tests. Der Test „Echtes Backup“ läuft nur, wenn lokal `backup/echt.json` liegt.

- Vor jedem Commit: Tests grün, App bei 375 px Breite angesehen.
- Veröffentlichen heißt `git push origin main`. Nur nach ausdrücklicher Freigabe.
- Anmeldung bei GitHub ausschließlich über `gh`, nie über den macOS-Schlüsselbund. Im
  Repo ist das lokal eingestellt (`credential.helper`).
- `backup/` ist vom Hochladen ausgeschlossen. Dort liegen höchstens Backups des Inhabers.
- Bei Design-Fragen: erst Vorschläge zeigen, als Weiterentwicklung des Bestehenden, alle
  Zustände nebeneinander. Maße nachmessen statt schätzen.

## 8. Nicht geprüft oder offen

- Ob iOS den Speicher einer Home-Bildschirm-App von sich aus leeren kann. Laut WebKit
  nicht vorgesehen, aber nicht garantiert. Die App bittet um dauerhaften Speicher.
- Tablet- und Desktop-Darstellung: funktioniert, ist aber nur für das iPhone gestaltet.
