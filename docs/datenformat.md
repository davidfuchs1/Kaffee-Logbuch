# Datenformat

Verbindlich für App, Speicher und Sicherungsdatei. Umsetzung: `js/daten.js`.

**Grundsatz:** Jede neue Version liest alle älteren Speicherstände und Sicherungen.
Alte Speicher-Keys werden nie verändert oder gelöscht.

## Wo die Daten liegen

| Ort | Inhalt |
|---|---|
| `localStorage` · `kaffee-logbuch-v3` | Zustand v3 (Einträge) |
| `localStorage` · `kaffee-logbuch-meta` | Stand der Sicherung |
| IndexedDB `kaffee-logbuch` · `fotos` | Foto je id, längste Kante 1280 px, JPEG |
| IndexedDB `kaffee-logbuch` · `vorschau` | Vorschaubild je id, längste Kante 240 px |
| `localStorage` · `kaffee-logbuch-entries-v2`, `-v1` | alte Stände, bleiben als Rückweg liegen |
| `localStorage` · `kaffee-logbuch-v3-defekt` | unlesbarer Stand v3, falls einer gefunden wurde |

Alles liegt nur auf dem Gerät. Die Home-Bildschirm-App hat einen eigenen Speicher,
getrennt von Safari.

## Zustand v3

```json
{
  "formatVersion": 3,
  "entries": [
    {
      "id": "k-msn20uto-1ubszhn",
      "name": "Sommer",
      "roastery": "Heilandt",
      "gramsIn": 18,
      "gramsOut": 40,
      "brewSeconds": 29,
      "grind": 2.9,
      "rating": 4,
      "notes": "Sehr floral/fruchtig.",
      "flavors": ["Beeren", "Floral"],
      "photo": "f-k-msn20uto-1ubszhn-mv73ww6j",
      "createdAt": 1786355636748,
      "updatedAt": 1786355636748
    }
  ]
}
```

| Feld | Bedeutung |
|---|---|
| `id` | `k-<createdAt, Basis 36>-<Prüfsumme aus Name+Rösterei>`. Berechnet, nicht gewürfelt: Dasselbe Backup ergibt überall dieselben ids. Bleibt beim Umbenennen gleich. |
| `name`, `roastery` | Text. Die Kombination gibt es nur einmal (verglichen ohne Groß-/Kleinschreibung und überzählige Leerzeichen). |
| `gramsIn`, `gramsOut` | Gramm, Standard im Formular 18 / 40 |
| `brewSeconds` | Brühzeit in Sekunden, Standard 25 |
| `grind` | Mahlgrad −1 bis 20 in 0,1-Schritten, Standard 10 |
| `rating` | 0 bis 5 in 0,5-Schritten, 0 = unbewertet |
| `notes` | Freitext |
| `flavors` | Geschmacksnoten als Text, ohne Doppelte. Standardnoten und eigene stehen gleichberechtigt hier; eigene Noten werden nirgends sonst gemerkt. |
| `photo` | id des Fotos in IndexedDB oder `null` |
| `createdAt` | Millisekunden, steuert die Sortierung „Neueste“ |
| `updatedAt` | Millisekunden der letzten Änderung (für einen späteren Abgleich zwischen Geräten) |

Standardnoten (fest im Code): Schokolade, Nuss, Karamell, Beeren, Zitrus, Steinobst,
Floral, Würzig, Kakao, Milchschokolade.

## Sicherungsdatei

`kaffee-logbuch-backup-JJJJ-MM-TT.json` – der Zustand v3 plus die Fotos:

```json
{
  "formatVersion": 3,
  "exportedAt": 1791921711000,
  "entries": [ … ],
  "photos": { "f-k-msn20uto-1ubszhn-mv73ww6j": "data:image/jpeg;base64,…" }
}
```

In `photos` stehen nur Fotos, auf die ein Eintrag zeigt. Vorschaubilder werden beim
Wiederherstellen neu erzeugt.

**Wiederherstellen führt zusammen:**
- Neue Name+Rösterei-Kombinationen werden übernommen.
- Vorhandene Einträge bleiben, wie sie sind. Nur was ihnen fehlt, wird aus der Datei
  ergänzt: das Foto, wenn sie keins haben, und die Geschmacksnoten, wenn sie keine haben.
  Vorhandene Fotos, Noten und alle anderen Werte werden nie überschrieben.
- Ein unlesbares Foto kostet nur das Bild, nicht den Eintrag.

Ältere Dateien können ein Feld `customFlavors` enthalten; es wird ignoriert.

## Ältere Formate (werden weiter gelesen)

**v2** – Liste ohne id, so sehen die Backups der ersten App-Version aus:

```json
[{ "name": "Sommer", "roastery": "Heilandt", "gramsIn": 18, "gramsOut": 40,
   "brewSeconds": 29, "grind": 2.9, "rating": 4, "notes": "…", "createdAt": 1786355636748 }]
```

**v1** – Liste mit eigener `id` sowie `brewMin` und `brewSec` statt `brewSeconds`.

Umwandlung nach v3 (`toV3Entry`): `brewSeconds = brewMin·60 + brewSec`, fehlender
Mahlgrad = 10, `id` wird neu berechnet, `flavors = []`, `photo = null`,
`updatedAt = createdAt`.

## Stand der Sicherung (`kaffee-logbuch-meta`)

```json
{ "lastBackupAt": 1791921711000, "changesSinceBackup": 2, "firstChangeAt": 1791921727754 }
```

Als Änderung zählen Speichern, Löschen und ein Import mit neuen Einträgen. Der Punkt
am Sicherungs-Knopf erscheint ab 3 ungesicherten Änderungen oder wenn eine Änderung seit
14 Tagen ungesichert ist.
