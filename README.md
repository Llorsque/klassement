# NK Sprint & NK Allround — Klassement Tool

Professionele tool die automatisch een klassement berekent op basis van schaats-tijden, met live data van liveresults.schaatsen.nl.

## Features

- **Live data** van liveresults.schaatsen.nl — automatisch bijgewerkt elke 30 seconden
- **Mockdata fallback** als de live verbinding niet beschikbaar is
- **NK Sprint / NK Allround** module-selectie
- **Mannen / Vrouwen** categorie-omschakeling
- **Klassement** — werkelijke tijden + positie per afstand (🥇🥈🥉), punten, achterstand op kiesbare afstand
- **Head-to-Head** — spiegelvergelijking + benodigde tijd om leider/target te verslaan
- **CSV-export**

## Live Data Bronnen

### NK Sprint Vrouwen
| Afstand  | Comp ID | URL |
|----------|---------|-----|
| 1e 500m  | 1       | `competition/1/results` |
| 1e 1000m | 3       | `competition/3/results` |
| 2e 500m  | 5       | `competition/5/results` |
| 2e 1000m | 7       | `competition/7/results` |

### NK Sprint Mannen
| Afstand  | Comp ID | URL |
|----------|---------|-----|
| 1e 500m  | 2       | `competition/2/results` |
| 1e 1000m | 4       | `competition/4/results` |
| 2e 500m  | 6       | `competition/6/results` |
| 2e 1000m | 8       | `competition/8/results` |

Basis-URL: `https://liveresults.schaatsen.nl/events/2026_NED_0003/`

## Auto-polling

Pollt elke **30 seconden**. Status-badge toont "Live" (groen) of "Mockdata" (oranje).

## CORS

Als CORS blokkeert, serveer via een lokale webserver:

```bash
python3 -m http.server 8080
```

## Draaien

Open `index.html` in een browser. Geen build-tools nodig.
