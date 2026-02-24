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

### NK Sprint (event `2026_NED_0003`)

**Vrouwen:**
| Afstand  | Comp ID |
|----------|---------|
| 1e 500m  | 1       |
| 1e 1000m | 3       |
| 2e 500m  | 5       |
| 2e 1000m | 7       |

**Mannen:**
| Afstand  | Comp ID |
|----------|---------|
| 1e 500m  | 2       |
| 1e 1000m | 4       |
| 2e 500m  | 6       |
| 2e 1000m | 8       |

### NK Allround (event `2026_NED_0004`)

**Vrouwen:**
| Afstand | Comp ID |
|---------|---------|
| 500m    | 1       |
| 3000m   | 3       |
| 1500m   | 5       |
| 5000m   | 7       |

**Mannen:**
| Afstand  | Comp ID |
|----------|---------|
| 500m     | 2       |
| 5000m    | 4       |
| 1500m    | 6       |
| 10.000m  | 8       |

Basis-URLs:
- Sprint: `https://liveresults.schaatsen.nl/events/2026_NED_0003/competition/{id}/results`
- Allround: `https://liveresults.schaatsen.nl/events/2026_NED_0004/competition/{id}/results`

## Auto-polling

Pollt elke **2 seconden**. Status-badge toont "Live" (groen) of "Mockdata" (oranje).

## CORS

Als CORS blokkeert, serveer via een lokale webserver:

```bash
python3 -m http.server 8080
```

## Draaien

Open `index.html` in een browser. Geen build-tools nodig.
