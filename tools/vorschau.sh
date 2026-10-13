#!/bin/sh
# Baut den Ordner vorschau/ aus dem Branch v2 in eine Arbeitskopie von main.
# Die Vorschau ist eine zweite, getrennte Kopie der App zum Testen auf dem iPhone:
#   https://davidfuchs1.github.io/Kaffee-Logbuch/vorschau/
# Dateien der echten App (Wurzelverzeichnis von main) werden nicht angefasst.
#
#   tools/vorschau.sh <Arbeitskopie von main>
#
# Danach dort: git add vorschau && git commit && git push origin main
set -eu

ZIEL="${1:?Pfad zur Arbeitskopie von main fehlt}/vorschau"

rm -rf "$ZIEL"
mkdir -p "$ZIEL"
git archive v2 index.html farben.css stil.css manifest.json service-worker.js \
  apple-touch-icon.png icon-512.png js schriften tests | tar -x -C "$ZIEL"

# Eigener Name, damit die zwei Symbole auf dem Home-Bildschirm unterscheidbar sind
sed -i '' \
  -e 's|<title>Kaffee-Logbuch</title>|<title>Kaffee-Logbuch Vorschau</title>|' \
  -e 's|apple-mobile-web-app-title" content="Kaffeebuch"|apple-mobile-web-app-title" content="Vorschau"|' \
  "$ZIEL/index.html"
sed -i '' \
  -e 's|"name": "Kaffee-Logbuch"|"name": "Kaffee-Logbuch Vorschau"|' \
  -e 's|"short_name": "Kaffeebuch"|"short_name": "Vorschau"|' \
  "$ZIEL/manifest.json"

grep -q 'content="Vorschau"' "$ZIEL/index.html" || { echo "Titel nicht ersetzt" >&2; exit 1; }
grep -q '"short_name": "Vorschau"' "$ZIEL/manifest.json" || { echo "Manifest nicht ersetzt" >&2; exit 1; }
echo "Vorschau gebaut: $ZIEL"
