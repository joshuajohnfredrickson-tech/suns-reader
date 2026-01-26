This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Telemetry

The resolve/extract pipeline includes lightweight structured telemetry for reliability analysis.

### Configuration

| Env Var | Default | Description |
|---------|---------|-------------|
| `TELEMETRY_ENABLED` | `true` | Set to `"false"` to disable telemetry |
| `TELEMETRY_SAMPLE_RATE` | `0.15` | Sample rate for successful requests (0.0-1.0). Failures are always logged. |

### Log Format

Telemetry events are logged as single-line JSON with `"tag":"telemetry"`:

```json
{"tag":"telemetry","ts":"2025-01-25T12:00:00.000Z","req_id":"abc12345","stage":"extract","domain":"example.com","ok":false,"reason":"blocked","duration_ms":1234,"playwright_candidate":true}
```

### Filtering Logs

**Vercel Dashboard:**
1. Go to your project's Logs tab
2. Filter by: `"tag":"telemetry"`

**Vercel CLI:**
```bash
# Recent telemetry logs
vercel logs --filter='"tag":"telemetry"' | head -100

# Export for analysis
vercel logs --filter='"tag":"telemetry"' --since=7d > telemetry.jsonl
```

**Local analysis:**
```bash
# Count failures by reason
cat telemetry.jsonl | jq -r 'select(.ok == false) | .reason' | sort | uniq -c | sort -rn

# List domains that are playwright candidates
cat telemetry.jsonl | jq -r 'select(.playwright_candidate == true) | .domain' | sort | uniq -c | sort -rn
```
