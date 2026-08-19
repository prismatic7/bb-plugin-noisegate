# bb-plugin-noisegate

Noise suppression for BB agent output. Detects and suppresses low-signal
patterns — acknowledgements, filler, boilerplate, repetitive confirmations —
so agents stop burning tokens on "ok", "got it", and "let me check".

## Tools

- **`noisegate_suppress`** — checks whether text is low-signal noise. Returns
  the original text if it passes, or `(suppressed)` if it matches a known noise
  pattern. Call it on short acknowledgements and confirmations before sending.
- **`noisegate_watchword`** — checks whether a word or phrase is in the noise
  dictionary. Returns `known noise` or `clean`.

## Noise patterns

- **Exact matches** — a dictionary of standalone acknowledgements (`ok`,
  `got it`, `understood`, `noted`, `will do`, `on it`, `let me check`, …).
- **Substring patterns** — regexes for thinking-aloud preambles, "hmm"
  variants, "one moment", and "working on it" / "processing" / "thinking".
- **Custom phrases** — add your own, one per line, case-insensitive.

## Settings

| Setting | Default | Description |
|---|---|---|
| `customNoise` | *(empty)* | Additional phrases to suppress, one per line. |
| `threshold` | `normal` | `strict` (exact matches only), `normal` (exact + common patterns), or `permissive` (also flags borderline short outputs). |

## Install

```sh
npm install
bb plugin install .
```

After editing sources, reload:

```sh
bb plugin reload noisegate
```

## Configure

```sh
bb plugin config noisegate
bb plugin config noisegate set threshold strict
```

## Build

```sh
bb plugin build
```
