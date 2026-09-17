import { BlogPost } from '@/types/blog';

export const BLOG_POSTS: BlogPost[] = [
  {
    id: 'post-how-to-use-prompts',
    slug: 'how-to-use-photo-prompts',
    title: 'How to Use AI Photo Prompts: The Complete Step-by-Step Guide (2026)',
    excerpt:
      'Learn how to copy, customize, and execute trending AI photo prompts in Midjourney, Flux, ChatGPT, and Bing Image Creator to generate ultra-realistic 8K portraits and photography.',
    category: 'Tutorials & Guides',
    readTime: '6 min read',
    coverImage: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1200&q=80',
    imageAlt: 'How to use AI photo prompts complete guide',
    author: {
      name: 'tool.reelz',
      avatar: '/logo.webp',
      role: 'Prompt Specialist & Author',
    },
    publishedAt: '2026-08-15T10:00:00.000Z',
    featured: true,
    tags: ['How To', 'Midjourney', 'Flux', 'AI Photography', 'Beginner Guide'],
    content: `
# How to Use AI Photo Prompts: The Complete Step-by-Step Guide

AI image generation has evolved dramatically with models like **Midjourney v6.1**, **Flux.1 (Dev & Schnell)**, **ChatGPT-4o (DALL-E 3)**, and **Leonardo AI**. With the right copy-paste prompt formulas, you can generate stunning, studio-quality photorealistic portraits, cinematic lighting, and 3D architectural renders in seconds.

In this step-by-step master guide from **tool.reelz**, you will learn how to select, copy, adjust, and execute prompts from our directory.

---

## Step 1: Copy the Prompt from the Directory
1. Browse through the prompt categories on **Trending Copy Paste Photo Prompts**.
2. When you find an aesthetic or photo concept you like, click the **"Copy Prompt"** button on the card (or inside the prompt detail view).
3. The complete prompt formula is instantly copied to your device's clipboard.

---

## Step 2: Choose Your AI Image Generator

Our curated prompts are tested across all major AI image platforms:

| Platform | Best For | How to Input |
| :--- | :--- | :--- |
| **Midjourney (Discord & Web)** | Hyper-realistic skin, cinematic film grain, editorial fashion | Type \`/imagine prompt:\` followed by your copied prompt. |
| **Flux.1 (Replicate / Fal / Grok)** | Exact prompt adherence, pristine natural hands, photorealism | Paste directly into the text prompt box. |
| **ChatGPT / DALL-E 3** | Complex conceptual compositions, multi-character scenes | Paste into the chat box with instructions like *"Create an image with this exact visual prompt: [Prompt]"*. |
| **Bing Image Creator / Copilot** | Free high-definition creations powered by DALL-E | Paste into the prompt field and click **Create**. |
| **Leonardo.ai** | Custom stylistic control, game assets, and canvas upscaling | Paste into the prompt bar and pick PhotoReal / Kino v2 model. |

---

## Step 3: Understanding Prompt Anatomy

A master photorealistic prompt consists of 5 core building blocks:

### 1. Subject & Action
Define who or what is in the shot with precise adjectives.
> *Example: "A 28-year-old Scandinavian woman with natural freckles, light blue eyes, subtle wind-blown hair..."*

### 2. Environment & Setting
Set the scene, background depth, and environmental cues.
> *Example: "...standing on a misty Reykjavik coastline during golden hour with rugged volcanic rocks..."*

### 3. Lighting & Atmosphere
Lighting dictates 80% of image realism. Use photographic lighting terms.
> *Example: "...backlit with soft diffused rim lighting, cinematic golden hour glow, volumetric mist..."*

### 4. Camera, Lens & Optics
Specifying camera gear forces AI models to simulate optical depth of field and lens focal characteristics.
> *Example: "...shot on Hasselblad H6D-100c, 85mm f/1.4 lens, shallow depth of field, natural bokeh, 35mm film grain..."*

### 5. Technical Parameters (Midjourney & Flux)
- **Aspect Ratio (\`--ar\`):** \`--ar 16:9\` (widescreen), \`--ar 9:16\` (vertical stories/reels), \`--ar 4:5\` (Instagram portrait).
- **Stylization (\`--s\`):** \`--s 250\` (adds artistic flair) or \`--s 50\` (keeps raw realistic accuracy).
- **Stylize Raw (\`--style raw\`):** Reduces AI gloss and increases authentic photo realism.

---

## Step 4: How to Customize Prompts for Your Needs

You don't have to keep every prompt identical! Easily swap variables:

- **Change Subject:** Swap *"young female model"* for *"elderly fisherman with weathered hands"* or *"futuristic athlete"*.
- **Change Lighting:** Swap *"Golden hour"* for *"Moody neon cyberpunk rain"* or *"Studio softbox chiaroscuro"*.
- **Change Clothing:** Swap *"cashmere turtleneck"* for *"high-fashion metallic avant-garde suit"*.

---

## Step 5: Pro Tips for Hyper-Realistic Results

1. **Avoid Generic Buzzwords:** Words like *"ultra realistic, 8k, photorealistic"* are outdated in 2026. Instead, describe real photographic qualities like *"subtle skin pores, Hasselblad 85mm lens, natural film grain, specular highlights"*.
2. **Use Natural Color Palettes:** Specify color grading like *"Kodak Portra 400 tones, muted cinematic teal and orange"*.
3. **Upscale with Subtle Details:** When your AI generator creates 4 variations, pick your favorite and run a subtle upscale (\`Upscale (Subtle)\` in Midjourney or \`Clarity Upscaler\`) to preserve natural skin and fabric textures.

---

## Summary Checklist
- [x] Click **Copy Prompt** on any photo card on tool.reelz.
- [x] Open your generator (Midjourney, Flux, ChatGPT, etc.).
- [x] Paste the prompt and tweak any desired subjects or aspect ratios.
- [x] Generate and download your high-resolution render!
`,
  },
  {
    id: 'post-camera-settings-guide',
    slug: 'best-camera-settings-for-ai-photography',
    title: 'Camera & Lens Guide for AI Image Generators: 35mm, 85mm & Cinematic Lighting',
    excerpt:
      'Discover how specifying real camera bodies, focal lengths, f-stops, and shutter speeds transforms AI generated images into authentic magazine-grade photography.',
    category: 'Photography Insights',
    readTime: '5 min read',
    coverImage: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=1200&q=80',
    imageAlt: 'Camera settings and lens guide for AI photography',
    author: {
      name: 'tool.reelz',
      avatar: '/logo.webp',
      role: 'Prompt Specialist & Author',
    },
    publishedAt: '2026-08-14T14:00:00.000Z',
    featured: false,
    tags: ['Camera Gear', 'Lenses', 'Midjourney', 'Photography'],
    content: `
# Camera & Lens Guide for AI Image Generators

When creating photorealistic imagery with modern AI diffusion models, standard adjectives like "realistic" are largely ignored. Modern models like Midjourney v6 and Flux are trained on millions of indexed photographic datasets with rich EXIF metadata.

By integrating **real camera bodies, lens focal lengths, and aperture settings** into your prompt formulas, you can directly command the depth of field, perspective compression, and optical clarity of your render.

---

## 1. Choosing the Right Focal Length

- **24mm – 35mm (Wide Angle):** Perfect for environmental portraits, architecture, and dynamic street photography. Captures background context with slight edge distortion.
- **50mm (Nifty Fifty):** Represents natural human eye perspective with zero distortion. Great for documentary photography and lifestyle shots.
- **85mm (The Portrait King):** Creates gorgeous background separation (bokeh), flattering facial proportions, and silky smooth depth of field.
- **135mm – 200mm (Telephoto):** Compresses background elements, pulling distant cityscapes or mountain ranges right behind your subject.

---

## 2. Best Camera Bodies to Prompt

- **Hasselblad H6D-100c / X2D 100C:** Unrivaled medium format texture, ultra-high dynamic range, and rich micro-contrast.
- **Leica M11 with Summilux-M 50mm f/1.4:** Signature filmic tones, micro-contrast, and authentic street editorial aesthetic.
- **Canon EOS R5 / Sony A7R V:** Sharp modern commercial photography with crisp studio clarity.
- **Arri Alexa Mini LF (Cinematic Film):** Gives video-still cinematic lighting, anamorphic lens flare, and filmic grain.

---

## 3. Lighting Terminology That Works Wonders

- **Chiaroscuro / Rim Light:** Strong contrast between light and dark with an edge glow separating the subject from darkness.
- **Rembrandt Lighting:** A classic triangle of light on the shadowed cheek, perfect for moody character portraits.
- **Catchlights in Eyes:** Ensures eyes have natural specular reflections rather than appearing flat or lifeless.
`,
  },
  {
    id: 'post-common-prompting-mistakes',
    slug: 'top-10-ai-prompting-mistakes-to-avoid',
    title: '10 AI Prompting Mistakes That Ruin Your Images & How to Fix Them',
    excerpt:
      'Are your AI photos coming out plasticky, blurry, or oversaturated? Avoid these 10 common prompting traps to instantly improve image fidelity and realism.',
    category: 'Tips & Best Practices',
    readTime: '4 min read',
    coverImage: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=1200&q=80',
    imageAlt: 'Common AI prompting mistakes and solutions',
    author: {
      name: 'tool.reelz',
      avatar: '/logo.webp',
      role: 'Prompt Specialist & Author',
    },
    publishedAt: '2026-08-12T09:30:00.000Z',
    featured: false,
    tags: ['Best Practices', 'Troubleshooting', 'Prompts'],
    content: `
# 10 AI Prompting Mistakes That Ruin Your Images & How to Fix Them

Even with state-of-the-art AI generators, poor prompting structure can cause plastic skin, unnatural limbs, or chaotic backgrounds. Here are the top 10 mistakes and their exact fixes:

---

### 1. Keyword Stuffing ("8k, hyperdetailed, masterpiece")
**Why it fails:** Modern AI models treat buzzword bloat as spam, which often leads to oversaturated, noisy, or synthetic artifacts.
**The Fix:** Use descriptive nouns and photographic descriptors (e.g. *"Kodak Portra 400 film grain, raw skin texture, natural softbox lighting"*).

### 2. Forgetting Aspect Ratios
**Why it fails:** The default 1:1 square ratio is rarely ideal for cinematic landscapes or mobile portrait wallpaper.
**The Fix:** Always specify \`--ar 16:9\` for cinematic landscapes or \`--ar 4:5\` / \`--ar 9:16\` for portraits and mobile.

### 3. Conflicting Style Keywords
**Why it fails:** Mixing *"photorealistic portrait"* with *"cyberpunk anime 3D render"* confuses the diffusion latent space.
**The Fix:** Keep your stylistic direction cohesive throughout the prompt.

### 4. Over-Describing Hands
**Why it fails:** Explicitly writing *"perfect hands with 5 fingers"* often draws excess model attention to hands, resulting in mutations.
**The Fix:** Give the subject an action: *"holding a ceramic coffee mug"* or *"hands resting naturally in jacket pockets"*.
`,
  },
  {
    id: 'post-flux-vs-midjourney',
    slug: 'flux-vs-midjourney-prompting-guide',
    title: 'Flux.1 vs Midjourney v6.1: How to Prompt Each Model for Maximum Realism',
    excerpt:
      'A deep-dive breakdown of the prompting syntax differences between Flux natural language and Midjourney parameter flags.',
    category: 'Model Comparisons',
    readTime: '6 min read',
    coverImage: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=1200&q=80',
    imageAlt: 'Flux versus Midjourney prompting guide',
    author: {
      name: 'tool.reelz',
      avatar: '/logo.webp',
      role: 'Prompt Specialist & Author',
    },
    publishedAt: '2026-08-10T11:00:00.000Z',
    featured: false,
    tags: ['Flux', 'Midjourney', 'Comparison'],
    content: `
# Flux.1 vs Midjourney v6.1: How to Prompt Each Model

With the release of Black Forest Labs' **Flux.1** alongside **Midjourney v6.1**, creators now have two powerhouse image generators. However, their prompting mechanics are fundamentally different.

---

## 1. Midjourney v6.1: Token & Flag Mastery
Midjourney excels at stylistic flair, aesthetic mood, and command-line parameters:
- **Natural Language + Weighting:** Responds well to commas, focal lengths, and stylistic cues.
- **Parameters:** Relies on flags like \`--ar 16:9\`, \`--v 6.1\`, \`--stylize 250\`, \`--style raw\`, and \`--chaos 10\`.

## 2. Flux.1 (Dev / Schnell): Natural English Sentence Structure
Flux is powered by a massive 12B parameter multimodal text encoder (T5-XXL), making it understand conversational English and precise typography:
- **Full Sentences:** Use descriptive storytelling rather than comma-separated keywords.
- **Text Rendering:** Flux can accurately write words in images when wrapped in quotation marks (e.g. *a vintage neon sign that says "TOOL REELZ"*).
`,
  },
];

export const getBlogPostBySlug = (slug: string): BlogPost | undefined => {
  return BLOG_POSTS.find((p) => p.slug === slug);
};

export const getAllBlogPosts = (): BlogPost[] => {
  return BLOG_POSTS;
};
