# Paid Domain Research

The default way this agent researches a business domain.

## What it does

Ask it to research a business domain and it runs one paid DataForSEO search, then answers in plain language:

- what the business does
- the best keyword opportunities, and why
- competitors worth watching, split into real business rivals and sites that just compete in Google
- three practical next steps
- a short note about evidence, only when something is missing

It saves the findings so later conversations can use them without paying again.

## What it costs

Each run has a reviewed spending ceiling:

| Mode | What it covers | Up to |
| --- | --- | ---: |
| `refresh` | Current rankings and search competitors | US$0.10 |
| `standard` | Adds keyword ideas, two expansions, and up to three live searches | US$0.20 |
| `deep` | Up to five expansions and five live searches | US$0.50 |

`standard` is the default. Asking for a mode accepts its ceiling, so you are not asked to confirm twice. A failed request is never retried automatically, and a successful result from the last 24 hours is reused instead of paying again.

Set a budget on your DataForSEO account as well. That is the final billing control.

## Free fallback

If paid research is unavailable, fails, or comes back with nothing useful, the agent falls back to the free [`domain-research`](../domain-research/README.md) skill, which reads only the site's public home page. You can also ask for a free scan directly.

## Setting up the credential

See [docs/PAID_DOMAIN_RESEARCH.md](../../docs/PAID_DOMAIN_RESEARCH.md). Your DataForSEO login and password go into n8n's own encrypted credential store, never into this repository, a prompt, or a chat message.

## Related skills

- [`domain-research`](../domain-research/README.md) - the free website-only version and the saved-memory reader.
