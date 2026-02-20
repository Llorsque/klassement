# NK Sprint & NK Allround — Klassement Tool

Een tool die automatisch een klassement berekent op basis van schaats-tijden, bedoeld voor NK Sprint en NK Allround.

## Features

- **NK Sprint / NK Allround** moduleselectie
- **Mannen / Vrouwen** omschakelen
- **Afstandsweergave** — resultaten per individuele afstand met delta t.o.v. snelste
- **Klassement** — totaaloverzicht met punten per afstand, totaalscore, en delta t.o.v. leider
- **Head-to-Head** — volledig vergelijkingstabel van twee rijders + berekening van de benodigde tijd om boven een target te komen
- **CSV-export** — exporteer het huidige klassement als CSV-bestand
- **Podium-indicatoren** — visuele goud/zilver/brons markering op top-3 posities

## Puntberekening

- Punten per afstand = `tijd_in_seconden / (afstand / 500)`
- Punten worden **afgekapt** op 3 decimalen (niet afgerond)
- Laagste totaalscore = eerste in het klassement

## Head-to-Head

De H2H-berekening toont:
1. Een volledige vergelijkingstabel met tijden en punten per afstand voor beide rijders
2. De maximaal toegestane tijd op een gekozen focusafstand om strikt beter te zijn dan een target (met 0.001 punt marge)

## KNSB Live Results (toekomstig)

In `app.js` staat een stub `fetchKnsbResults()` en een verwacht datamodel:

```js
resultsRaw = {
  athletes: [
    {
      athleteId: string,
      name: string,
      times: { [distanceKey]: "1:09.86" },
      status: { [distanceKey]: "OK" | "DNS" | "DNF" | "DQ" },
      meta: { club: string }
    }
  ]
}
```

## Draaien

Open `index.html` in een browser. Geen build-tools of server nodig.
