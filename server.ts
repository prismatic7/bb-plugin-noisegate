// bb-plugin-noisegate — noise suppression for BB agent output.
//
// Registers `noisegate_suppress` as a native agent tool that detects and
// suppresses low-signal patterns in agent output — acknowledgements,
// filler, boilerplate, repetitive confirmations.
//
// Also registers `noisegate_watchword` to check if a phrase is known noise.
import { type BbPluginApi } from "@get-bb/plugin-sdk";
import { z } from "zod";

// ─── Noise patterns — full-match suppression ────────────────────────
// Lines that are exactly (or trimmed to) these → suppressed entirely

const EXACT_NOISE: Set<string> = new Set([
  "ok",
  "ok.",
  "okay",
  "okay.",
  "sure",
  "sure.",
  "got it",
  "got it.",
  "gotcha",
  "gotcha.",
  "understood.",
  "understood",
  "acknowledged.",
  "acknowledged",
  "noted.",
  "noted",
  "done.",
  "done",
  "will do.",
  "will do",
  "on it.",
  "on it",
  "let me check.",
  "let me check",
  "let me see.",
  "let me see",
  "one moment.",
  "one moment",
  "working on it.",
  "working on it",
  "let me think.",
  "let me think",
  "hmm.",
  "hmm",
  "ok, let me",
  "okay, let me",
  "sure, let me",
  "right.",
  "right",
  "cool.",
  "cool",
  "alright.",
  "alright",
]);

// ─── Substring noise — suppress if the entire output IS this (trimmed) ───

const SUBSTRING_NOISE: RegExp[] = [
  // Standalone acknowledgements
  /^(ok|okay|sure|got it|gotcha|understood|acknowledged|noted|done|will do|on it|right|cool|alright)[.!,]?$/i,
  // Thinking aloud preamble
  /^(?:let me|I'll|I will) (?:think|check|see|look|try|work on) (?:about )?(?:this|that|it)[.]?$/i,
  // Hmm / Hmmm variants
  /^hmm+[.]?$/i,
  // One moment
  /^(?:one|a|just a) (?:moment|sec|second)[.]?$/i,
  // Working / processing
  /^(?:working on it|processing|thinking)[.]?$/i,
];

// ─── Plugin entry ────────────────────────────────────────────────────

export default async function plugin(bb: BbPluginApi) {
  bb.log.info("bb-plugin-noisegate loaded");

  const settings = bb.settings.define({
    customNoise: {
      type: "string" as const,
      label: "Custom noise phrases (one per line)",
      default: "",
      description: "Additional phrases to suppress. One per line, case-insensitive.",
    },
    threshold: {
      type: "select" as const,
      label: "Suppression threshold",
      options: ["strict", "normal", "permissive"],
      default: "normal",
      description:
        "strict: only exact matches. normal: exact + common patterns. permissive: also flag borderline cases.",
    },
  });

  const { customNoise, threshold } = await settings.get();

  // Parse custom noise
  const customExact = new Set<string>();
  if (customNoise) {
    for (const line of customNoise.split("\n")) {
      const trimmed = line.trim().toLowerCase();
      if (trimmed && !trimmed.startsWith("#")) {
        EXACT_NOISE.add(trimmed);
        customExact.add(trimmed);
      }
    }
  }

  // ── Agent tool: noisegate_suppress ─────────────────────────────────

  bb.agents.registerTool({
    name: "noisegate_suppress",
    description:
      "Check if text is low-signal noise and should be suppressed. " +
      'Returns the original text if it passes, or "(suppressed)" if it matches known noise patterns. ' +
      'Call this on short acknowledgements and confirmations before sending.',
    parameters: z.object({
      text: z
        .string()
        .min(1)
        .describe("The text to check for noise."),
    }),
    async execute({ text }) {
      if (!text) return "(suppressed)";
      const trimmed = text.trim();
      const lower = trimmed.toLowerCase();

      // Check exact match
      if (EXACT_NOISE.has(lower)) return "(suppressed)";

      // Check substring patterns (normal + permissive)
      if (threshold !== "strict") {
        for (const pattern of SUBSTRING_NOISE) {
          if (pattern.test(trimmed)) return "(suppressed)";
        }
      }

      // Permissive: also flag very short non-code outputs
      if (threshold === "permissive") {
        const wordCount = trimmed.split(/\s+/).length;
        if (wordCount <= 2 && !trimmed.includes("\n") && trimmed.length < 30) {
          // Very short output that isn't a known command or file path
          if (!/^[\/.]/.test(trimmed) && !trimmed.startsWith("```")) {
            return "(suppressed — permissive mode)";
          }
        }
      }

      return text;
    },
  });

  // ── Agent tool: noisegate_watchword ────────────────────────────────

  bb.agents.registerTool({
    name: "noisegate_watchword",
    description:
      'Check if a word or phrase is in the noise suppression dictionary. Returns "known noise" or "clean".',
    parameters: z.object({
      phrase: z
        .string()
        .min(1)
        .describe("The word or phrase to check."),
    }),
    async execute({ phrase }) {
      const lower = phrase.trim().toLowerCase();
      if (EXACT_NOISE.has(lower)) return `"${phrase}" → known noise (exact match)`;
      for (const pattern of SUBSTRING_NOISE) {
        if (pattern.test(phrase.trim())) return `"${phrase}" → known noise (pattern match)`;
      }
      return `"${phrase}" → clean`;
    },
  });

  // ── Cleanup ──────────────────────────────────────────────────────

  bb.onDispose(() => {
    bb.log.info("bb-plugin-noisegate disposed");
  });
}
