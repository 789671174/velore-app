# Velora

Modernisierte Buchungs- und Verwaltungsoberfläche für Salons. Die Anwendung basiert auf Next.js 14 und speichert Tenant-Daten standardmäßig in Memory. Für produktive Deployments kann optional Vercel KV verwendet werden.

## Features

- Mandantenfähige Buchungs- und Dashboard-Ansichten (`/t/[tenant]/...`)
- Verwaltung von Unternehmens-Stammdaten, Arbeitstagen und Öffnungszeiten
- Erstellen, Listen und Bearbeiten von Buchungsanfragen
- Feiertagsverwaltung pro Tenant (blockiert Slot-Berechnung)
- API-Routen mit klaren JSON-Kontrakten (`/api/t/[tenant]/*`)

## Entwicklung

```bash
cp .env.example .env # optional, nur falls KV-Zugangsdaten hinterlegt werden sollen
npm install
npm run dev
```

Ohne konfigurierte KV-Instanz werden Daten pro Server-Prozess im Speicher gehalten.

## Deployment (z. B. Vercel)

1. Optional: Vercel KV anlegen und folgende Variablen setzen
   - `KV_REST_API_URL`
   - `KV_REST_API_TOKEN`
2. `NEXT_PUBLIC_DEFAULT_TENANT` setzen (z. B. `velora-hairstyles`).
3. Deploy (`vercel` oder eigenes CI).

Die API-Routen erkennen automatisch, ob KV verfügbar ist. Ohne KV bleiben Daten nicht dauerhaft erhalten (z. B. bei Serverless-Restarts).
