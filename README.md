# NK Sprint & NK Allround — Klassement Tool

Een professionele tool die automatisch een klassement berekent op basis van schaats-tijden, bedoeld voor NK Sprint en NK Allround.

## Features

- **NK Sprint / NK Allround** module-selectie met visuele indicator
- **Mannen / Vrouwen** categorie-omschakeling
- **Afstandsweergave** — resultaten per individuele afstand met delta t.o.v. snelste tijd
- **Klassement** — totaaloverzicht met punten, totaalscore en delta t.o.v. de leider
- **Head-to-Head** — volledige vergelijkingstabel + berekening van de benodigde tijd om een target te verslaan
- **CSV-export** — exporteer het huidige klassement (Excel-compatible, UTF-8 BOM)
- **Podium-indicatoren** — goud / zilver / brons markering op top-3

## Puntberekening

```
punten = tijd_in_seconden ÷ (afstand ÷ 500)
```

- Punten worden **afgekapt** op 3 decimalen (niet afgerond)
- Laagste totaalscore = eerste in het klassement

## Head-to-Head

1. Volledige vergelijkingstabel: tijden + punten per afstand voor beide rijders, met win/loss markering
2. Target-berekening: de maximaal toegestane tijd op een focusafstand om strikt beter te zijn dan een target (0.001 punt marge)

## KNSB Live Results (toekomstig)

In `app.js` staat een stub `fetchKnsbResults()` met het verwachte datamodel:

```js
{
  athletes: [{
    athleteId: string,
    name: string,
    times: { [distanceKey]: "1:09.86" },
    status: { [distanceKey]: "OK" | "DNS" | "DNF" | "DQ" },
    meta: { club: string }
  }]
}
```

## Draaien

Open `index.html` in een browser. Geen build-tools of server nodig.
