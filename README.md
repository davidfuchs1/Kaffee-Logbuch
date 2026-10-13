# Kaffee-Logbuch

Privates Brüh-Protokoll für Espresso und Kaffee: Rezept, Bewertung, Geschmacksnoten
und ein Foto der Verpackung pro Kaffee.

**App öffnen:** https://davidfuchs1.github.io/Kaffee-Logbuch/

## Auf dem iPhone einrichten

1. Adresse in Safari öffnen.
2. Teilen → „Zum Home-Bildschirm“.
3. Die App vom Home-Bildschirm öffnen. Sie läuft im Vollbild und auch ohne Netz.

## Wo liegen meine Daten?

Nur auf deinem Gerät, in der App. Kein Konto, kein Server. Dieses Repository enthält
ausschließlich die App, nie Einträge oder Fotos.

Die Kehrseite: Löschst du das Symbol vom Home-Bildschirm, sind die Daten weg. Deshalb
gibt es die Sicherung.

## Sichern und wiederherstellen

Zahnrad oben rechts → **Jetzt sichern**. Es entsteht eine Datei mit allen Einträgen
und Fotos. Leg sie außerhalb der App ab, zum Beispiel in „Dateien“ (iCloud Drive).

Ein goldener Punkt am Zahnrad erinnert dich, wenn sich seit der letzten Sicherung
einiges geändert hat.

**Wiederherstellen** liest die Datei wieder ein. Einträge, die es schon gibt, bleiben
unverändert; nur fehlende kommen dazu. Auch Sicherungen der ersten App-Version lassen
sich einlesen.

## Fotos

Die App speichert eine eigene, verkleinerte Kopie des Fotos. Das Original in der
Fotos-App brauchst du danach nicht mehr.

## Für Entwickler

Statische Seite ohne Build-Schritt. Aufbau und Regeln stehen in `CLAUDE.md`, das
Datenformat in `docs/datenformat.md`.

```bash
python3 tools/server.py
```

Danach http://localhost:8765/ für die App und http://localhost:8765/tests/test.html
für die Tests.

Schriften: Fraunces, Inter und IBM Plex Mono unter der SIL Open Font License
(Texte in `schriften/`).
