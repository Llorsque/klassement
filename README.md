# NK Sprint & NK Allround — Klassement Tool

Professionele tool die automatisch een klassement berekent op basis van schaats-tijden.

## Features

- **NK Sprint / NK Allround** module-selectie
- **Mannen / Vrouwen** categorie-omschakeling
- **Afstandsweergave** — resultaten per afstand, gesorteerd op tijd, met achterstand t.o.v. snelste
- **Klassement** — totaaloverzicht met werkelijke wedstrijdtijden, totaalpunten, en **achterstand in seconden** berekend op een kiesbare "volgende afstand"
- **Head-to-Head** — spiegelvergelijking van twee rijders + benodigde tijd om leider te worden en om een target-positie te verslaan
- **CSV-export** — exporteer het klassement (Excel-compatible)

## Puntberekening

```
punten = tijd_in_seconden ÷ (afstand ÷ 500)
```

Punten worden **afgekapt** op 3 decimalen. Laagste totaal = leider.

## Klassement — Achterstand

De kolom "Achterstand" toont niet het puntverschil maar het **tijdverschil in seconden** op een kiesbare afstand. Dit laat zien hoeveel seconden een rijder sneller moet rijden op die afstand om de leider in te halen.

## Head-to-Head

1. **Spiegeltabel** — werkelijke tijden naast elkaar met verschil in het midden
2. **Tijd om leider te worden** — de maximale tijd die Rijder A mag rijden op de focusafstand om #1 te worden
3. **Tijd om positie X te verslaan** — idem voor een gekozen positie

## Draaien

Open `index.html` in een browser. Geen build-tools nodig.
