"use strict";exports.id=34,exports.ids=[34],exports.modules={15982:(a,b,c)=>{c.d(b,{A:()=>d});let d=(0,c(23339).A)("mail",[["path",{d:"m22 7-8.991 5.727a2 2 0 0 1-2.009 0L2 7",key:"132q7q"}],["rect",{x:"2",y:"4",width:"20",height:"16",rx:"2",key:"izxlao"}]])},22842:(a,b,c)=>{c.d(b,{A:()=>d});let d=(0,c(23339).A)("lock",[["rect",{width:"18",height:"11",x:"3",y:"11",rx:"2",ry:"2",key:"1w4ew1"}],["path",{d:"M7 11V7a5 5 0 0 1 10 0v4",key:"fwvmzm"}]])},54937:(a,b,c)=>{c.d(b,{A:()=>d});let d=(0,c(23339).A)("shield-check",[["path",{d:"M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z",key:"oel41y"}],["path",{d:"m9 12 2 2 4-4",key:"dzmm74"}]])},61549:(a,b,c)=>{c.d(b,{I:()=>m});var d=c(21124),e=c(38301),f=c(52827),g=c(47089),h=c(22842),i=c(15982);let j=(0,c(23339).A)("key",[["path",{d:"m15.5 7.5 2.3 2.3a1 1 0 0 0 1.4 0l2.1-2.1a1 1 0 0 0 0-1.4L19 4",key:"g0fldk"}],["path",{d:"m21 2-9.6 9.6",key:"1j0ho8"}],["circle",{cx:"7.5",cy:"15.5",r:"5.5",key:"yqb3hr"}]]);var k=c(75535),l=c(54937);let m=()=>{let{showLoginModal:a,setShowLoginModal:b,login:c,setCurrentView:m,setAdminSubView:n}=(0,f.n)(),[o,p]=(0,e.useState)("admin@trendinggeminiprompts.com"),[q,r]=(0,e.useState)("admin123"),[s,t]=(0,e.useState)("");return a?(0,d.jsx)("div",{className:"fixed inset-0 z-50 overflow-y-auto bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in",children:(0,d.jsxs)("div",{className:"relative w-full max-w-md bg-white dark:bg-neutral-900 rounded-[28px] shadow-2xl border border-neutral-200 dark:border-neutral-800 overflow-hidden p-6 sm:p-8",children:[(0,d.jsx)("button",{onClick:()=>b(!1),className:"absolute top-4 right-4 p-2 rounded-full text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors",children:(0,d.jsx)(g.A,{className:"w-5 h-5"})}),(0,d.jsx)("div",{className:"w-12 h-12 rounded-full bg-[#E60023]/10 text-[#E60023] flex items-center justify-center mb-4",children:(0,d.jsx)(h.A,{className:"w-6 h-6"})}),(0,d.jsx)("h2",{className:"text-2xl font-bold text-neutral-900 dark:text-white mb-1",children:"Account & Admin Login"}),(0,d.jsx)("p",{className:"text-xs text-neutral-500 dark:text-neutral-400 mb-6",children:"Access the prompt engineering catalog and editorial management suite."}),s&&(0,d.jsx)("div",{className:"p-3 mb-4 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-xs font-semibold text-red-600 dark:text-red-300",children:s}),(0,d.jsxs)("form",{onSubmit:a=>{a.preventDefault(),c(o,q)?(t(""),n("dashboard"),m("admin")):t("Invalid credentials. You can use the Demo Admin button below.")},className:"space-y-4",children:[(0,d.jsxs)("div",{children:[(0,d.jsx)("label",{className:"block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1",children:"Admin Email / Username"}),(0,d.jsxs)("div",{className:"relative",children:[(0,d.jsx)("div",{className:"absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-400",children:(0,d.jsx)(i.A,{className:"w-4 h-4"})}),(0,d.jsx)("input",{type:"email",required:!0,value:o,onChange:a=>p(a.target.value),className:"w-full pl-10 pr-4 py-2.5 bg-[#efefef] dark:bg-neutral-800 border-0 rounded-full text-sm text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#E60023]/40",placeholder:"admin@trendinggeminiprompts.com"})]})]}),(0,d.jsxs)("div",{children:[(0,d.jsx)("label",{className:"block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1",children:"Password"}),(0,d.jsxs)("div",{className:"relative",children:[(0,d.jsx)("div",{className:"absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-400",children:(0,d.jsx)(j,{className:"w-4 h-4"})}),(0,d.jsx)("input",{type:"password",required:!0,value:q,onChange:a=>r(a.target.value),className:"w-full pl-10 pr-4 py-2.5 bg-[#efefef] dark:bg-neutral-800 border-0 rounded-full text-sm text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#E60023]/40",placeholder:"••••••••"})]})]}),(0,d.jsxs)("button",{type:"submit",className:"w-full py-3 px-4 rounded-full bg-[#E60023] hover:bg-[#ad081b] text-white font-bold text-sm shadow-md shadow-[#E60023]/30 flex items-center justify-center gap-2 transition-all mt-2 active:scale-98",children:[(0,d.jsx)("span",{children:"Log In"}),(0,d.jsx)(k.A,{className:"w-4 h-4"})]})]}),(0,d.jsx)("div",{className:"mt-6 pt-5 border-t border-neutral-100 dark:border-neutral-800",children:(0,d.jsxs)("button",{onClick:()=>{p("admin@trendinggeminiprompts.com"),r("admin123"),c("admin@trendinggeminiprompts.com","admin123"),n("dashboard"),m("admin")},className:"w-full py-2.5 px-3 rounded-full bg-[#efefef] dark:bg-neutral-800 hover:bg-[#e2e2e2] dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 text-xs font-bold flex items-center justify-center gap-2 transition-colors",children:[(0,d.jsx)(l.A,{className:"w-4 h-4 text-[#E60023]"}),(0,d.jsx)("span",{children:"1-Click Auto Demo Login"})]})})]})}):null}},72567:(a,b,c)=>{c.d(b,{A:()=>d});let d=(0,c(23339).A)("calendar",[["path",{d:"M8 2v4",key:"1cmpym"}],["path",{d:"M16 2v4",key:"4m81vk"}],["rect",{width:"18",height:"18",x:"3",y:"4",rx:"2",key:"1hopcy"}],["path",{d:"M3 10h18",key:"8toen8"}]])},74252:(a,b,c)=>{c.d(b,{$3:()=>f,X5:()=>d,t1:()=>e});let d=[{id:"post-how-to-use-prompts",slug:"how-to-use-photo-prompts",title:"How to Use AI Photo Prompts: The Complete Step-by-Step Guide (2026)",excerpt:"Learn how to copy, customize, and execute trending AI photo prompts in Midjourney, Flux, ChatGPT, and Bing Image Creator to generate ultra-realistic 8K portraits and photography.",category:"Tutorials & Guides",readTime:"6 min read",coverImage:"https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1200&q=80",imageAlt:"How to use AI photo prompts complete guide",author:{name:"tool.reelz",avatar:"/logo.webp",role:"Prompt Specialist & Author"},publishedAt:"2026-08-15T10:00:00.000Z",featured:!0,tags:["How To","Midjourney","Flux","AI Photography","Beginner Guide"],content:`
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
`},{id:"post-camera-settings-guide",slug:"best-camera-settings-for-ai-photography",title:"Camera & Lens Guide for AI Image Generators: 35mm, 85mm & Cinematic Lighting",excerpt:"Discover how specifying real camera bodies, focal lengths, f-stops, and shutter speeds transforms AI generated images into authentic magazine-grade photography.",category:"Photography Insights",readTime:"5 min read",coverImage:"https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=1200&q=80",imageAlt:"Camera settings and lens guide for AI photography",author:{name:"tool.reelz",avatar:"/logo.webp",role:"Prompt Specialist & Author"},publishedAt:"2026-08-14T14:00:00.000Z",featured:!1,tags:["Camera Gear","Lenses","Midjourney","Photography"],content:`
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
`},{id:"post-common-prompting-mistakes",slug:"top-10-ai-prompting-mistakes-to-avoid",title:"10 AI Prompting Mistakes That Ruin Your Images & How to Fix Them",excerpt:"Are your AI photos coming out plasticky, blurry, or oversaturated? Avoid these 10 common prompting traps to instantly improve image fidelity and realism.",category:"Tips & Best Practices",readTime:"4 min read",coverImage:"https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=1200&q=80",imageAlt:"Common AI prompting mistakes and solutions",author:{name:"tool.reelz",avatar:"/logo.webp",role:"Prompt Specialist & Author"},publishedAt:"2026-08-12T09:30:00.000Z",featured:!1,tags:["Best Practices","Troubleshooting","Prompts"],content:`
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
`},{id:"post-flux-vs-midjourney",slug:"flux-vs-midjourney-prompting-guide",title:"Flux.1 vs Midjourney v6.1: How to Prompt Each Model for Maximum Realism",excerpt:"A deep-dive breakdown of the prompting syntax differences between Flux natural language and Midjourney parameter flags.",category:"Model Comparisons",readTime:"6 min read",coverImage:"https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=1200&q=80",imageAlt:"Flux versus Midjourney prompting guide",author:{name:"tool.reelz",avatar:"/logo.webp",role:"Prompt Specialist & Author"},publishedAt:"2026-08-10T11:00:00.000Z",featured:!1,tags:["Flux","Midjourney","Comparison"],content:`
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
`}],e=a=>d.find(b=>b.slug===a),f=()=>d},75535:(a,b,c)=>{c.d(b,{A:()=>d});let d=(0,c(23339).A)("arrow-right",[["path",{d:"M5 12h14",key:"1ays0h"}],["path",{d:"m12 5 7 7-7 7",key:"xquz4c"}]])}};