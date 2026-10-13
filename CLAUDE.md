# Projektanweisung: Kaffee-Logbuch

Privates Brüh-Protokoll für Espresso/Kaffee als PWA auf GitHub Pages
(https://davidfuchs1.github.io/Kaffee-Logbuch/, Pages aus `main`/Wurzel).
**Dieses Repository ist öffentlich** und enthält nur die App. Die Daten liegen
ausschließlich im Gerätespeicher des Nutzers, nie im Repo.

## Harte Vorgaben
- Kein Login, kein Nutzerkonto, keine Daten auf fremden Servern. V2 ist für alle
  **nur lokal** (Entscheidung 13.10.2026). GitHub-Sync ist geprüft, aber zurückgestellt.
- Kostenlos, ohne Build-Schritt: nur statische Dateien, Vanilla-JS als ES-Module.
- **Die Adresse darf sich nicht ändern.** Die installierte Home-Bildschirm-App hat
  einen eigenen Speicher, der an dieser Adresse hängt. `service-worker.js` und
  `manifest.json` nicht umbenennen.
- Keine Fremdskripte, keine Tracker. Content-Security-Policy erlaubt nur eigene Dateien.
  Deshalb: keine Inline-Skripte, keine `style="…"`-Attribute im HTML oder in Vorlagen.

## Aufbau

| Pfad | Zweck |
|---|---|
| `index.html` | Gerüst |
| `farben.css` | **alle Farbwerte** |
| `stil.css` | Layout, Komponenten, Schriften |
| `js/daten.js` | Datenmodell, Migration, Import/Export – reine Funktionen, getestet |
| `js/speicher.js` | Gerätespeicher (localStorage für Einträge, IndexedDB für Fotos) |
| `js/bilder.js` | Fotos verkleinern, Umwandlung für die Sicherungsdatei |
| `js/bohne.js` | Bohnen-Symbol der Bewertung |
| `js/app.js` | Oberfläche |
| `service-worker.js` | Oberfläche gecacht; erst Netz, sonst Cache. Bei neuen Dateien die Liste `OBERFLAECHE` ergänzen und `VERSION` erhöhen |
| `schriften/` | Fraunces, Inter, IBM Plex Mono (lokal, OFL) |
| `tests/` | Tests im Browser: `tests/test.html` |
| `docs/datenformat.md` | verbindliches Datenformat |

## Daten
- Echte Daten liegen nur auf dem iPhone des Nutzers. **Jede Version muss ältere
  Speicherstände und ältere Backups lesen können.**
- Alte Speicher-Keys (`kaffee-logbuch-entries-v1`, `-v2`) werden nie verändert oder gelöscht.
- Regel: Name + Rösterei (normalisiert) gibt es nur einmal.
- Backups des Nutzers liegen höchstens lokal in `backup/` (per `.gitignore` ausgeschlossen) – nie committen.

## Testen
```bash
python3 -m http.server 8765 --bind 127.0.0.1   # dann http://localhost:8765/tests/test.html
```
Vor jedem Commit: Tests grün, App bei 375 px Breite angesehen.

## Design
Dunkles Kaffee-Farbschema mit Gold. Das Bohnen-Symbol ist vom Nutzer in mehreren
Runden abgenommen (Maße in `js/bohne.js`) – **nicht ohne Rückfrage ändern**.

## Arbeitsweise
- Sprache: Deutsch, kurz und klar.
- Bei Design-Fragen erst Vorschläge zeigen, nichts ändern, bis der Nutzer freigibt.
- Maße, Formen, Optik nachmessen oder nachfragen, nicht schätzen.
- Wenn etwas nicht geht oder ungeprüft ist: direkt sagen.
- Push nach `main` (= live) nur nach ausdrücklicher Freigabe.
