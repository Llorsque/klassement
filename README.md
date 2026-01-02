# NK Sprint & NK Allround — Klassement Tool (Stramien)

Dit is een **stramien** (basis) voor een tool die automatisch een klassement maakt op basis van tijden van een uitslagenpagina.

## Wat zit erin
- NK Sprint / NK Allround
- Mannen / Vrouwen switch
- 4 afstand-knoppen + Klassement + Head-to-Head
- Puntberekening: seconden per 500m, 3 decimalen, **afkappen** (niet afronden)
- Head-to-Head: basis-berekening “max tijd om boven target te komen” (met 0.001 punt marge)

## KNSB live results koppeling (later)
In `app.js` staat een stub `fetchKnsbResults()` en een verwacht datamodel:
`resultsRaw = { athletes: [ { athleteId, name, times, status, meta } ] }`

## Draaien
Open `index.html` in je browser.
