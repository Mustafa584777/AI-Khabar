'use client';

import React from 'react';
import { BookOpen, CheckCircle2 } from 'lucide-react';

export type PromptToolType = 'reverse' | 'generator' | 'editor';

interface StepItem {
  number: string;
  title: string;
  description: string;
}

interface ToolGuideConfig {
  heading: string;
  subtitle: string;
  steps: StepItem[];
  tips: string[];
}

const TOOL_GUIDES: Record<PromptToolType, ToolGuideConfig> = {
  reverse: {
    heading: 'How to Use Image to Prompt',
    subtitle:
      'Turn any reference photo, portrait, or artwork into a complete copy-paste prompt with camera optics, lighting, and styling breakdown.',
    steps: [
      {
        number: '01',
        title: 'Upload or Select a Reference Photo',
        description:
          'Drop a JPG, PNG, or WebP photo into the upload zone, choose one of the sample presets, or click Decode on any prompt in Explore Prompts below.',
      },
      {
        number: '02',
        title: 'Add Custom Instructions (Optional)',
        description:
          'Tell our AI whether to skip watermarks or text, target a minimum 250-word output, or adjust lighting and mood during extraction.',
      },
      {
        number: '03',
        title: 'Extract, Copy & Customize',
        description:
          'Click Extract AI Prompt to decode subject framing, lens physics, and color grading in seconds—then copy, save, or send directly to Prompt Editor.',
      },
    ],
    tips: [
      'Use crisp high-contrast photos so Gemini detects accurate lens focal length, depth of field, and skin micro-textures.',
      'Combine custom rules like "remove text, add golden hour rim light" to remix an existing photo aesthetic right away.',
      'Use the Breakdown Copy button when you want clean comma-free photographic segments ready for Midjourney, Flux, or ChatGPT.',
    ],
  },
  generator: {
    heading: 'How to Use Idea to Prompt',
    subtitle:
      'Expand a short 3-word concept into a studio-grade photographic prompt engineered for Gemini, Midjourney v6.1, Flux.1, and DALL-E.',
    steps: [
      {
        number: '01',
        title: 'Enter Your Core Concept',
        description:
          'Type any rough scene idea—like "rainy street in Tokyo" or "royal bridal portrait"—or click a Quick Start suggestion or Explore card to remix.',
      },
      {
        number: '02',
        title: 'Choose Aspect Ratio & Subject',
        description:
          'Pick your output framing (3:4 portrait, 16:9 cinema, 9:16 mobile, or 1:1 square) and set Subject Gender when relevant.',
      },
      {
        number: '03',
        title: 'Generate & Export Master Prompt',
        description:
          'Click Generate Detailed Prompt to synthesize full camera optics, lighting direction, negative keywords, and ready-to-paste model parameters.',
      },
    ],
    tips: [
      'Short ideas work great—specify just the subject mood and let the generator build authentic sensor, aperture, and lighting specs.',
      'Try "--ar 3:4" for Pinterest/portrait compositions and "--ar 16:9" for cinematic widescreen wallpapers.',
      'Click "Edit" on the generated result whenever you want to swap outfits, lighting, or backgrounds cleanly.',
    ],
  },
  editor: {
    heading: 'How to Use AI Prompt Editor & Modifier',
    subtitle:
      'Surgically modify outfits, lighting, vehicles, backdrops, or film grain inside long prompts without losing your original composition or length.',
    steps: [
      {
        number: '01',
        title: 'Paste or Load Your Base Prompt',
        description:
          'Paste any prompt in Box 1—short or 1,000+ words long—or pick a trending prompt from Explore Prompts below with one click.',
      },
      {
        number: '02',
        title: 'Describe What to Change',
        description:
          'Write clear modification instructions in Box 2 (e.g., "change saree color to emerald green, golden sunset background") or tap a Popular Modification chip.',
      },
      {
        number: '03',
        title: 'Apply Surgical AI Edits',
        description:
          'Click Edit Prompt to transform only what you requested while preserving 100% of your camera specs, lighting depth, and photographic realism.',
      },
    ],
    tips: [
      'Great for long detailed prompts: the editor preserves existing subject details, skin textures, and lens physics while updating only requested parts.',
      'Stack multiple modifications in Box 2 separated by commas for fast multi-attribute restyling.',
      'Use "Open in AI Studio Generator" after editing if you want to spin up alternate variations with new aspect ratios.',
    ],
  },
};

export const PromptToolHowTo = ({ tool }: { tool: PromptToolType }) => {
  const guide = TOOL_GUIDES[tool];

  return (
    <section
      aria-labelledby={`howto-heading-${tool}`}
      className="pt-8 border-t border-neutral-200 dark:border-neutral-800 space-y-6"
    >
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
        <div className="space-y-1.5 max-w-2xl">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#E60023]">
            <BookOpen className="w-4 h-4 shrink-0" />
            <span>Step-by-Step Guide</span>
          </div>
          <h2
            id={`howto-heading-${tool}`}
            className="text-xl sm:text-2xl font-black text-neutral-900 dark:text-white tracking-tight"
          >
            {guide.heading}
          </h2>
          <p className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">
            {guide.subtitle}
          </p>
        </div>
      </div>

      {/* 3-Step Clean Editorial Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5">
        {guide.steps.map((step) => (
          <div
            key={step.number}
            className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 flex flex-col gap-3"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-black tracking-widest text-[#E60023] tabular-nums">
                STEP {step.number}
              </span>
            </div>
            <h3 className="text-sm sm:text-base font-extrabold text-neutral-900 dark:text-white leading-snug">
              {step.title}
            </h3>
            <p className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">
              {step.description}
            </p>
          </div>
        ))}
      </div>

      {/* Concise Pro Tips Row */}
      <div className="p-5 rounded-2xl bg-neutral-100/80 dark:bg-neutral-900/70 border border-neutral-200 dark:border-neutral-800 space-y-3">
        <h3 className="text-xs font-extrabold uppercase tracking-wider text-neutral-800 dark:text-neutral-200">
          Pro Tips for Best Results
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {guide.tips.map((tip, idx) => (
            <div key={idx} className="flex items-start gap-2.5 text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed">
              <CheckCircle2 className="w-4 h-4 text-[#E60023] shrink-0 mt-0.5" />
              <span>{tip}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
