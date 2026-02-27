# NK Sprint & NK Allround — Klassement Tool

Live klassement tool voor de Daikin NK Sprint & NK Allround 2026, Thialf Heerenveen.

## Draaien

Open `index.html` in een browser (Chrome/Safari/Edge). Geen installatie nodig.

## Deelnemers

Alle 80 deelnemers zijn ingeladen vanuit de officiële KNSB deelnemerslijsten (24-02-2026):

- **NK Sprint:** 20 vrouwen + 20 mannen
- **NK Allround:** 20 vrouwen + 20 mannen

Kwalificatieroutes: EK Sprint, EK Allround, OKT, WC 25/26, UCB, Gruno Bokaal, Kraantje Lek, Eindhoven Trofee, Aanwijsplek.

Geen reserves opgenomen.

## Live Data

Pollt elke **2 seconden** naar liveresults.schaatsen.nl. Status-badge rechtsboven:
- **Wachten op data** (oranje) — toernooi nog niet gestart, deelnemerslijst zichtbaar
- **Live** (groen, pulserend) — resultaten worden real-time bijgewerkt

### NK Sprint (event `2026_NED_0003`)

| Afstand  | Vrouwen | Mannen |
|----------|---------|--------|
| 1e 500m  | comp 1  | comp 2 |
| 1e 1000m | comp 3  | comp 4 |
| 2e 500m  | comp 5  | comp 6 |
| 2e 1000m | comp 7  | comp 8 |

### NK Allround (event `2026_NED_0004`)

| Afstand    | Vrouwen | Mannen |
|------------|---------|--------|
| 500m       | comp 1  | comp 2 |
| 3000m/5000m| comp 3  | comp 4 |
| 1500m      | comp 5  | comp 6 |
| 5000m/10km | comp 7  | comp 8 |

Basis-URL: `https://liveresults.schaatsen.nl/events/{eventId}/competition/{compId}/results`

## Features

- **Klassement** — werkelijke tijden, punten, medailles per afstand, achterstand op kiesbare afstand
- **Per afstand** — volledige uitslag met PB-badges
- **Head-to-Head** — spiegelvergelijking + benodigde tijd om target te verslaan
- **Overzicht** — PB-statistieken met percentages, medaillespiegel, combineer Sprint + Allround
- **Kwalificatie** — schaduwklassement slotafstand Allround (wie mag de 5000m/10.000m rijden)
- **Athlete popup** — klik op een naam → resultaten, PBs, kwalificatieroute
- **CSV-export**

## CORS

Als CORS blokkeert, serveer via een lokale webserver:

```bash
python3 -m http.server 8080
```
