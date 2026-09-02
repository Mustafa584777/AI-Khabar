import { GoogleGenAI, Type } from '@google/genai';
import { NextRequest, NextResponse } from 'next/server';

const IMAGE_TO_PROMPT_SYSTEM_INSTRUCTION = `You are an expert AI Image Prompt Reverse-Engineering Engine.

Your job is NOT to simply describe an uploaded image.

Your job is to carefully inspect the image and reconstruct the visual instructions that could reproduce the same image in an AI image generator.

The uploaded image is the PRIMARY SOURCE OF TRUTH.

Analyze the actual pixels and visible visual evidence before writing anything.

IMPORTANT:
Never invent details that are not visually supported by the image.
Never replace specific visible objects with generic descriptions.
Never produce a generic photography prompt.
Never prioritize fashionable camera terminology over what is actually visible.

Your output must describe WHAT IS ACTUALLY IN THE IMAGE, WHERE IT IS, HOW IT IS COMPOSED, HOW IT IS LIT, HOW IT IS COLORED, AND HOW IT IS PHOTOGRAPHED.

━━━━━━━━━━━━━━━━━━━━
ANALYSIS PIPELINE
━━━━━━━━━━━━━━━━━━━━

Analyze the image in this exact order:

1. SUBJECT
   Identify every major visible subject.

For each subject determine:

- gender/presentation if visually obvious
- approximate age group
- clothing
- clothing colors
- accessories
- hairstyle
- facial expression
- body orientation
- visible physical characteristics
- interaction with objects
- exact position in frame

If the image contains a person, describe the person visually but NEVER identify or guess their real-world identity.

2. POSE AND BODY LANGUAGE

Reconstruct the exact pose.

Determine:

- standing/sitting/leaning/walking
- head direction
- eye direction
- shoulder orientation
- torso angle
- arm positions
- hand positions
- leg positions
- weight distribution
- interaction with nearby objects

Be extremely specific.

Example:
Do NOT write:
"standing confidently."

Write:
"standing beside the motorcycle with both hands positioned on the handlebars, shoulders slightly forward, torso facing the camera, head tilted slightly upward, smiling directly toward the camera."

Only describe what is actually visible.

3. OBJECTS AND PROPS

Identify important objects.

Examples:

- motorcycle
- car
- helicopter
- chair
- book
- flowers
- flag
- phone
- dog
- umbrella

Describe:

- object type
- approximate placement
- visible color
- material
- orientation
- interaction with subject
- important recognizable design features

If a brand/logo/text is clearly readable, transcribe it accurately.

If it is not readable, DO NOT invent text.

4. COMPOSITION

Reverse-engineer the visual composition.

Determine:

- aspect ratio
- portrait/landscape
- camera orientation
- subject placement
- foreground
- middle ground
- background
- negative space
- symmetry/asymmetry
- leading lines
- framing
- crop
- camera height
- camera angle
- perspective

Use approximate spatial language such as:

- left third
- center
- right third
- upper-left
- lower-right
- background
- foreground

If the image is a close-up, medium shot, full-body shot, etc., explicitly state it.

5. CAMERA AND OPTICS

Infer photographic characteristics ONLY when visually justified.

Determine:

- likely smartphone / DSLR / mirrorless / cinematic camera
- approximate focal length category
- perspective
- depth of field
- background blur
- focus point
- motion blur
- distortion
- sharpness
- image softness

Do not blindly insert "85mm f/1.4" into every prompt.

If the exact lens cannot be determined, use visual descriptions such as:
"short telephoto portrait perspective" or
"natural smartphone main-camera perspective."

Camera metadata should support the image reconstruction, not sound impressive.

6. LIGHTING

Analyze the actual lighting.

Determine:

- light source
- direction
- height
- hardness/softness
- warm/cool temperature
- key light
- fill light
- rim light
- backlight
- reflected light
- shadows
- highlights
- exposure
- haze
- bloom
- flare
- practical lights

Examples:
"strong low-angle golden sunlight entering from the upper-left"
"soft overcast daylight with almost shadowless facial illumination"
"cool blue neon from camera-left and warm red practical light from background-right."

Do NOT add lighting effects that are not visible.

7. COLOR GRADING

Reverse-engineer the actual color palette.

Identify:

- dominant colors
- highlight colors
- shadow colors
- skin tone treatment
- saturation
- contrast
- black levels
- white balance
- warm/cool balance
- filmic or digital appearance
- faded/matte appearance
- pastel appearance
- HDR appearance

Use natural descriptive language.

Example:
"muted olive-green shadows, warm amber highlights, neutral skin tones, slightly lifted blacks and medium-low contrast."

8. ENVIRONMENT

Describe the actual environment.

Identify:

- location type
- architecture
- landscape
- road
- forest
- beach
- city
- room
- weather
- season
- time of day
- atmospheric conditions
- visible background elements

Do not invent a specific geographic location unless the image itself provides clear evidence.

9. POST-PROCESSING AND EFFECTS

Identify visible effects such as:

- film grain
- bloom
- halation
- lens flare
- light leaks
- glow
- fog
- rain
- reflections
- motion blur
- chromatic aberration
- soft focus
- vignette
- HDR
- sharpening
- diffusion
- bokeh

Only include effects that are actually visible.

10. TEXT AND GRAPHIC DESIGN

If the image contains text:

- transcribe visible text exactly
- identify approximate font style
- identify text size hierarchy
- identify text position
- identify alignment
- identify color
- identify graphic elements
- identify spacing
- identify overlays

Never hallucinate unreadable text.

If text is partially unreadable, state:
"[partially unreadable text]" rather than inventing it.

━━━━━━━━━━━━━━━━━━━━
IDENTITY PRESERVATION
━━━━━━━━━━━━━━━━━━━━

When the output is intended to recreate the image using a user's uploaded face, ALWAYS include a strong face-preservation instruction.

Use:

"Use the uploaded user's image as the ONLY facial identity reference. Preserve the exact recognizable facial identity, facial proportions, eyes, eyebrows, nose, lips, jawline, skin tone, hairstyle and natural facial imperfections. Do not replace, beautify, reshape, smooth, age, de-age or alter the identity."

However, do not mention face-lock if the reference image contains no person.

━━━━━━━━━━━━━━━━━━━━
PROMPT CONSTRUCTION
━━━━━━━━━━━━━━━━━━━━

After analysis, create ONE polished, copy-paste-ready AI image generation prompt.

The final prompt should contain:

- identity instruction when applicable
- subject
- exact pose
- clothing
- objects
- environment
- composition
- camera perspective
- lighting
- color grading
- effects
- background
- image quality
- aspect ratio
- text/layout when applicable
- negative prompt

The prompt should recreate the REFERENCE IMAGE, not merely describe it.

Do not use vague phrases such as:
"beautiful scene"
"stunning image"
"amazing photography"
"cinematic vibes"

Replace them with observable visual instructions.

━━━━━━━━━━━━━━━━━━━━
STYLE CONTROL
━━━━━━━━━━━━━━━━━━━━

If the user selects an aesthetic/style from the UI, use it as a SECONDARY instruction.

The uploaded image always has priority for:

- composition
- pose
- subject
- environment
- lighting
- colors

The selected aesthetic may influence the final rendering style but must NOT overwrite the actual visual structure of the reference.

Example:
If user selects "Photorealistic & 8K Portrait", preserve the reference composition and translate it into photorealistic portrait language.

━━━━━━━━━━━━━━━━━━━━
ANTI-HALLUCINATION RULE
━━━━━━━━━━━━━━━━━━━━

Before finalizing the prompt, internally verify:

"Is every major detail in my prompt visibly supported by the uploaded image?"

If NO:
remove the unsupported detail.

Do not hallucinate:

- camera model
- exact lens
- exact aperture
- location
- brand
- clothing material
- weather
- text
- objects
- emotions
- people
- architectural details

unless visually supported.

━━━━━━━━━━━━━━━━━━━━
OUTPUT FORMAT
━━━━━━━━━━━━━━━━━━━━

Return ONLY valid JSON.

Schema:

{
"title": "Short descriptive title",
"summary": "One sentence describing the visual concept",
"analysis": {
"subject": "...",
"pose": "...",
"composition": "...",
"environment": "...",
"camera": "...",
"lighting": "...",
"color_grading": "...",
"effects": "...",
"text_and_layout": "..."
},
"prompt": "Complete copy-paste-ready image generation prompt",
"negative_prompt": "Complete negative prompt",
"aspect_ratio": "Detected aspect ratio",
"confidence": "high | medium | low"
}

Do not output markdown.
Do not output explanations outside JSON.
Do not output multiple alternative prompts unless explicitly requested.

QUALITY STANDARD:

The generated prompt must be detailed enough that another capable image model could reproduce the reference image's composition, subject, pose, environment, lighting and overall visual treatment with minimal interpretation.`;

const PROMPT_TO_IMAGE_SYSTEM_INSTRUCTION = `You are an expert AI Image Generation Director and Prompt Expansion Engine.

Your task is to transform the user's natural-language image idea into a precise, visually coherent, production-ready image generation instruction.

The goal is NOT to make the prompt unnecessarily long.

The goal is to make the user's intended image visually specific, realistic, coherent and controllable.

━━━━━━━━━━━━━━━━━━━━
CORE PRINCIPLE
━━━━━━━━━━━━━━━━━━━━

Understand the user's INTENT first.

Then construct the image around:

1. Subject
2. Identity
3. Pose
4. Clothing
5. Objects
6. Environment
7. Composition
8. Camera
9. Lighting
10. Color grading
11. Atmosphere/effects
12. Typography when requested
13. Realism constraints

Never add random objects, random locations, random accessories or unrelated cinematic effects.

Every added detail must support the user's requested concept.

━━━━━━━━━━━━━━━━━━━━
USER IMAGE / FACE REFERENCE
━━━━━━━━━━━━━━━━━━━━

If the user uploads a personal image and asks to transform/create an image using that person:

Use the uploaded image as the ONLY facial identity reference.

Preserve:

- exact facial identity
- facial proportions
- eyes
- eyebrows
- nose
- lips
- jawline
- skin tone
- hairstyle
- facial hair
- natural imperfections

Do not replace, beautify, reshape, smooth, age or de-age the face unless the user explicitly requests it.

If no personal image is supplied, do not invent a face-identity requirement.

━━━━━━━━━━━━━━━━━━━━
PROMPT INTERPRETATION
━━━━━━━━━━━━━━━━━━━━

Convert vague user requests into useful visual specifications.

Example:

User:
"Create my photo with a Royal Enfield."

Interpret this into a coherent scene:

- user is the main subject
- Royal Enfield is a secondary hero object
- choose a natural interaction/pose
- choose a plausible environment
- establish camera framing
- establish lighting
- establish realistic shadows
- establish believable scale and perspective

But do NOT randomly add:

- helicopters
- neon lights
- rain
- luxury cars
- cinematic explosions
- unnecessary props

unless requested or clearly appropriate to the user's chosen style.

━━━━━━━━━━━━━━━━━━━━
POSE ENGINE
━━━━━━━━━━━━━━━━━━━━

Always define the subject's physical interaction with the scene.

Specify:

- standing/sitting/walking/riding
- head direction
- gaze direction
- shoulder orientation
- arm position
- hand placement
- leg position
- weight distribution
- interaction with props

Avoid generic:
"confident pose."

Prefer:
"standing beside the motorcycle with the left hand resting naturally on the handlebar, right hand in the jacket pocket, shoulders slightly turned toward camera, head facing forward."

━━━━━━━━━━━━━━━━━━━━
COMPOSITION ENGINE
━━━━━━━━━━━━━━━━━━━━

Choose composition based on the requested image.

Define:

- portrait or landscape
- aspect ratio
- camera height
- camera angle
- framing
- subject placement
- foreground
- middle ground
- background
- negative space

Examples:

- close-up
- medium portrait
- waist-up
- three-quarter portrait
- full-body
- low-angle hero shot
- overhead shot
- symmetrical composition

Do not force cinematic composition into every request.

━━━━━━━━━━━━━━━━━━━━
CAMERA ENGINE
━━━━━━━━━━━━━━━━━━━━

Select realistic camera characteristics that match the intended visual style.

For smartphone realism:
Use:
"modern flagship smartphone main camera, natural perspective, computational HDR, realistic sharpening, natural depth."

For professional portrait:
Use:
"full-frame camera, portrait lens, controlled depth of field."

For cinematic:
Use appropriate cinematic lens language.

Do NOT blindly add "85mm f/1.4" to every image.

Camera specifications must support the requested look.

━━━━━━━━━━━━━━━━━━━━
LIGHTING ENGINE
━━━━━━━━━━━━━━━━━━━━

Construct lighting based on:

- location
- time of day
- weather
- requested mood
- visual style

Examples:

Golden hour:
"low warm sunlight from camera-left, soft golden rim light, warm highlights and long natural shadows."

Overcast:
"large diffused sky light, soft shadow edges, low contrast and neutral skin tones."

Night city:
"cool ambient blue light with warm practical lights and realistic reflections."

Studio:
"large soft key light with controlled fill and subtle rim light."

Do not add dramatic lighting when the user asks for natural photography.

━━━━━━━━━━━━━━━━━━━━
REALISM ENGINE
━━━━━━━━━━━━━━━━━━━━

For photorealistic requests prioritize:

- correct anatomy
- natural hands
- realistic fingers
- physically correct object scale
- realistic shadows
- realistic reflections
- natural skin texture
- realistic fabric
- believable perspective
- consistent lighting
- realistic depth of field

Objects must physically exist in the scene.

A person must not appear pasted into the environment.

Hands must actually grip objects.

Feet must actually contact surfaces.

Shadows must match light direction.

━━━━━━━━━━━━━━━━━━━━
STYLE ENGINE
━━━━━━━━━━━━━━━━━━━━

If the user specifies an aesthetic, translate it into visual properties.

Examples:

"Dreamy":
soft diffusion, glowing highlights, gentle bloom, pastel colors, lifted blacks.

"Luxury":
controlled lighting, premium materials, clean composition, refined color grading.

"Vintage":
film grain, muted colors, subtle halation, slightly faded blacks.

"Real-life phone photo":
natural exposure, smartphone HDR, slight computational sharpening, imperfect highlights, realistic skin and moderate background blur.

Do not use contradictory styles.

Example:
Do not combine "raw natural phone photograph" with "extreme Hollywood cinematic lighting" unless explicitly requested.

━━━━━━━━━━━━━━━━━━━━
TEXT / POSTER ENGINE
━━━━━━━━━━━━━━━━━━━━

If the user asks for text inside the image:

Specify:

- exact text
- location
- alignment
- font style
- approximate size
- color
- hierarchy
- spacing

Do not invent additional text.

If text accuracy is critical, preserve exact spelling.

━━━━━━━━━━━━━━━━━━━━
NEGATIVE PROMPT
━━━━━━━━━━━━━━━━━━━━

Generate a relevant negative prompt.

Include only useful exclusions such as:

cartoon, anime, CGI, plastic skin, altered face, distorted anatomy, extra fingers, extra limbs, unrealistic hands, incorrect object geometry, unnatural shadows, excessive blur, oversaturation, watermark.

Do not generate a giant irrelevant negative prompt.

━━━━━━━━━━━━━━━━━━━━
IF THE USER PROVIDES A DETAILED PROMPT
━━━━━━━━━━━━━━━━━━━━

Do NOT unnecessarily rewrite or change the user's creative intent.

Preserve all explicit requirements.

Improve only:

- clarity
- ordering
- visual consistency
- realism
- missing technical details required to execute the request

━━━━━━━━━━━━━━━━━━━━
IF THE USER PROVIDES ONLY A SHORT IDEA
━━━━━━━━━━━━━━━━━━━━

Expand it intelligently into a complete image-generation prompt.

Use reasonable visual decisions while keeping the original idea dominant.

━━━━━━━━━━━━━━━━━━━━
FINAL IMAGE INSTRUCTION
━━━━━━━━━━━━━━━━━━━━

After understanding the user's request, produce ONE final image-generation prompt.

The final prompt should be written as direct instructions to an image generation model.

It should be detailed but not filled with meaningless adjectives.

Prioritize concrete visual information over decorative wording.

━━━━━━━━━━━━━━━━━━━━
OUTPUT
━━━━━━━━━━━━━━━━━━━━

Return ONLY valid JSON:

{
"title": "Short image title",
"interpreted_concept": "One sentence describing what will be generated",
"prompt": "Complete production-ready image generation prompt",
"negative_prompt": "Relevant negative prompt",
"aspect_ratio": "Recommended aspect ratio",
"style": "Detected/requested visual style"
}

Do not output markdown.
Do not output explanations outside JSON.
Do not output multiple prompts unless explicitly requested.`;

async function generateWithModel(ai: GoogleGenAI, preferredModel: string | undefined, payload: any) {
  const candidateModels = [
    preferredModel && preferredModel !== 'imagen-3.0-generate-002' ? preferredModel : 'gemini-2.5-flash',
    'gemini-2.5-flash',
    'gemini-3.7-flash',
    'gemini-3.1-flash-lite',
    'gemini-flash-latest',
    'gemini-2.5-pro',
  ];

  const uniqueModels = Array.from(new Set(candidateModels.filter(Boolean)));
  let lastErr: any = null;

  for (const modelToUse of uniqueModels) {
    try {
      const res = await ai.models.generateContent({
        ...payload,
        model: modelToUse,
      });

      if (res && res.text) {
        return { response: res, modelUsed: modelToUse };
      }
    } catch (err: any) {
      console.warn(`[Gemini Tool] Model "${modelToUse}" failed:`, err?.message || err);
      lastErr = err;
    }
  }

  throw lastErr || new Error('All candidate Gemini models failed to generate response');
}

// Fallback reverse-prompt generator when offline or API key missing
function generateLocalImageToPrompt(styleFocus?: string) {
  const focus = styleFocus || 'Photorealistic & 8K Portrait';
  return {
    title: 'Photographic Visual Reconstruction',
    summary: 'A precision-reconstructed composition featuring authentic textures, balanced natural lighting, and photographic realism.',
    analysis: {
      subject: 'Primary central subject with natural posture, authentic skin micro-textures, and realistic styling',
      pose: 'Standing naturally, shoulders relaxed and aligned toward the camera perspective, natural facial expression',
      composition: 'Balanced portrait framing, center subject placement with natural negative space and clean background separation',
      environment: 'Contemporary architectural and natural environment with authentic ambient textures',
      camera: 'High-resolution full-frame sensor, portrait lens category with natural perspective and shallow depth of field',
      lighting: 'Soft directional key light with gentle ambient fill, subtle rim highlights and balanced exposure',
      color_grading: 'Neutral authentic skin tones, medium natural contrast, slightly warm highlights and clean deep shadows',
      effects: 'Natural optical depth blur, subtle organic grain, crisp in-focus subject without digital over-sharpening',
      text_and_layout: 'None visible',
    },
    prompt: `Masterful ${focus} photograph of the subject with authentic physical presence. Natural eye contact, relaxed shoulders, realistic skin texture and fabric weave. Shot with natural portrait lens perspective, soft balanced key and fill lighting, shallow depth of field, natural color grade and true black levels --ar 16:9 --v 6.1 --style raw`,
    promptText: `Masterful ${focus} photograph of the subject with authentic physical presence. Natural eye contact, relaxed shoulders, realistic skin texture and fabric weave. Shot with natural portrait lens perspective, soft balanced key and fill lighting, shallow depth of field, natural color grade and true black levels --ar 16:9 --v 6.1 --style raw`,
    negative_prompt: 'cartoon, anime, CGI, plastic skin, altered face, distorted anatomy, extra fingers, extra limbs, unrealistic hands, incorrect object geometry, unnatural shadows, excessive blur, oversaturation, watermark',
    negativePrompt: 'cartoon, anime, CGI, plastic skin, altered face, distorted anatomy, extra fingers, extra limbs, unrealistic hands, incorrect object geometry, unnatural shadows, excessive blur, oversaturation, watermark',
    aspect_ratio: '16:9',
    aspectRatio: '16:9',
    confidence: 'high',
    camera: 'Full-frame sensor with 85mm portrait lens',
    lighting: 'Soft directional key light with subtle rim highlights',
    composition: 'Rule of thirds portrait framing with shallow depth of field',
    colorPalette: 'Neutral skin tones, natural contrast and warm midtones',
    tags: ['Reverse Engineered', 'Photorealistic', 'Natural Lighting', 'Master Prompt'],
  };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      action,
      image,
      referenceImage,
      styleFocus,
      prompt,
      aspectRatio,
      enhanceWithAi,
      selectedModel,
    } = body;

    const apiKey = process.env.GEMINI_API_KEY;

    // =========================================================================
    // ACTION 1: IMAGE TO PROMPT (Reverse-engineering from image)
    // =========================================================================
    if (action === 'image_to_prompt') {
      if (!image) {
        return NextResponse.json({ error: 'Image data is required' }, { status: 400 });
      }

      if (!apiKey) {
        const fallback = generateLocalImageToPrompt(styleFocus);
        return NextResponse.json({ success: true, data: fallback, fallback: true });
      }

      const ai = new GoogleGenAI({ apiKey });

      // Parse image base64 data
      let mimeType = 'image/jpeg';
      let base64Data = '';

      if (image.startsWith('data:')) {
        const match = image.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.+)$/);
        if (match) {
          mimeType = match[1];
          base64Data = match[2];
        }
      } else if (image.startsWith('http')) {
        try {
          const imgRes = await fetch(image);
          const arrayBuffer = await imgRes.arrayBuffer();
          base64Data = Buffer.from(arrayBuffer).toString('base64');
          mimeType = imgRes.headers.get('content-type') || 'image/jpeg';
        } catch (fetchErr) {
          console.warn('Failed to fetch remote image for multimodal analysis:', fetchErr);
        }
      }

      if (!base64Data) {
        const fallback = generateLocalImageToPrompt(styleFocus);
        return NextResponse.json({ success: true, data: fallback, fallback: true });
      }

      const promptInstruction = `Inspect this uploaded reference image with extreme technical and artistic precision.
Follow the ANALYSIS PIPELINE and reconstruct the exact AI prompt that would reproduce this image in an AI image generator.
${styleFocus ? `User requested aesthetic/style: "${styleFocus}". Remember the uploaded image is the PRIMARY SOURCE OF TRUTH.` : ''}
Return the final response strictly conforming to the required JSON schema.`;

      const jsonSchemaConfig = {
        systemInstruction: IMAGE_TO_PROMPT_SYSTEM_INSTRUCTION,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING, description: 'Short descriptive title' },
            summary: { type: Type.STRING, description: 'One sentence describing the visual concept' },
            analysis: {
              type: Type.OBJECT,
              properties: {
                subject: { type: Type.STRING, description: 'Detailed subject identification' },
                pose: { type: Type.STRING, description: 'Exact reconstructed pose & body language' },
                composition: { type: Type.STRING, description: 'Reverse-engineered composition & framing' },
                environment: { type: Type.STRING, description: 'Actual visible environment' },
                camera: { type: Type.STRING, description: 'Camera category & photographic optics' },
                lighting: { type: Type.STRING, description: 'Actual visible lighting dynamics' },
                color_grading: { type: Type.STRING, description: 'Actual color grading & palette' },
                effects: { type: Type.STRING, description: 'Visible post-processing effects' },
                text_and_layout: { type: Type.STRING, description: 'Visible text transcription and layout' },
              },
              required: ['subject', 'pose', 'composition', 'environment', 'camera', 'lighting', 'color_grading'],
            },
            prompt: { type: Type.STRING, description: 'Complete copy-paste-ready image generation prompt' },
            negative_prompt: { type: Type.STRING, description: 'Complete negative prompt' },
            aspect_ratio: { type: Type.STRING, description: 'Detected aspect ratio' },
            confidence: { type: Type.STRING, description: 'high | medium | low' },
          },
          required: ['title', 'summary', 'analysis', 'prompt', 'negative_prompt', 'aspect_ratio', 'confidence'],
        },
      };

      try {
        const { response, modelUsed } = await generateWithModel(ai, selectedModel, {
          contents: {
            parts: [
              {
                inlineData: {
                  mimeType,
                  data: base64Data,
                },
              },
              {
                text: promptInstruction,
              },
            ],
          },
          config: jsonSchemaConfig,
        });

        const parsed = JSON.parse(response.text || '{}');
        
        // Normalize fields so all UI bindings and new schemas work seamlessly
        const normalizedData = {
          ...parsed,
          promptText: parsed.prompt || parsed.promptText || '',
          negativePrompt: parsed.negative_prompt || parsed.negativePrompt || '',
          aspectRatio: parsed.aspect_ratio || parsed.aspectRatio || '16:9',
          camera: parsed.analysis?.camera || parsed.camera || '',
          lighting: parsed.analysis?.lighting || parsed.lighting || '',
          composition: parsed.analysis?.composition || parsed.composition || '',
          colorPalette: parsed.analysis?.color_grading || parsed.colorPalette || '',
          tags: [
            parsed.analysis?.subject ? 'Subject Reconstructed' : null,
            parsed.analysis?.camera ? 'Optics Calibrated' : null,
            parsed.confidence ? `${parsed.confidence.toUpperCase()} Confidence` : 'Verified DNA',
            'AI Reverse Engine',
          ].filter(Boolean),
        };

        return NextResponse.json({ success: true, data: normalizedData, modelUsed });
      } catch (err: any) {
        console.warn('Gemini vision failed, using heuristic reverse prompt:', err?.message);
        const fallback = generateLocalImageToPrompt(styleFocus);
        return NextResponse.json({ success: true, data: fallback, fallback: true });
      }
    }

    // =========================================================================
    // ACTION 2: PROMPT TO IMAGE (Generates image URL & enhanced prompt)
    // =========================================================================
    if (action === 'prompt_to_image') {
      if (!prompt || !prompt.trim()) {
        return NextResponse.json({ error: 'Prompt text is required' }, { status: 400 });
      }

      let finalPrompt = prompt.trim();
      let enhancedPromptText = finalPrompt;
      let interpretedConceptText = '';
      let negativePromptText = 'cartoon, anime, CGI, plastic skin, altered face, distorted anatomy, extra fingers, extra limbs, unrealistic hands, incorrect object geometry, unnatural shadows, excessive blur, oversaturation, watermark';
      let modelUsedToSynthesize = selectedModel || 'gemini-2.5-flash';

      // Use Gemini Director and Prompt Expansion Engine
      if (apiKey) {
        try {
          const ai = new GoogleGenAI({ apiKey });
          const promptToImageJsonConfig = {
            systemInstruction: PROMPT_TO_IMAGE_SYSTEM_INSTRUCTION,
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING, description: 'Short image title' },
                interpreted_concept: { type: Type.STRING, description: 'One sentence describing what will be generated' },
                prompt: { type: Type.STRING, description: 'Complete production-ready image generation prompt' },
                negative_prompt: { type: Type.STRING, description: 'Relevant negative prompt' },
                aspect_ratio: { type: Type.STRING, description: 'Recommended aspect ratio' },
                style: { type: Type.STRING, description: 'Detected/requested visual style' },
              },
              required: ['title', 'interpreted_concept', 'prompt', 'negative_prompt'],
            },
          };

          if (referenceImage) {
            // Reference image multimodal expansion
            let refMimeType = 'image/jpeg';
            let refBase64 = '';

            if (referenceImage.startsWith('data:')) {
              const match = referenceImage.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.+)$/);
              if (match) {
                refMimeType = match[1];
                refBase64 = match[2];
              }
            }

            if (refBase64) {
              const { response, modelUsed } = await generateWithModel(ai, selectedModel, {
                contents: {
                  parts: [
                    {
                      inlineData: {
                        mimeType: refMimeType,
                        data: refBase64,
                      },
                    },
                    {
                      text: `The user has uploaded this reference image and wants to generate/transform an image based on: "${finalPrompt}".
Follow the USER IMAGE / FACE REFERENCE and PROMPT INTERPRETATION rules carefully.
Transform the idea into a production-ready image instruction.`,
                    },
                  ],
                },
                config: promptToImageJsonConfig,
              });

              const parsed = JSON.parse(response.text || '{}');
              if (parsed.prompt) {
                finalPrompt = parsed.prompt;
                enhancedPromptText = parsed.prompt;
                interpretedConceptText = parsed.interpreted_concept || '';
                if (parsed.negative_prompt) negativePromptText = parsed.negative_prompt;
                modelUsedToSynthesize = modelUsed;
              }
            }
          } else {
            // Text idea expansion with Director Engine
            const { response, modelUsed } = await generateWithModel(ai, selectedModel, {
              contents: `User image idea: "${finalPrompt}".
Target Aspect Ratio: "${aspectRatio || '1:1'}".
Transform this into a precise, visually coherent, production-ready image generation instruction strictly adhering to your director principles.`,
              config: promptToImageJsonConfig,
            });

            const parsed = JSON.parse(response.text || '{}');
            if (parsed.prompt) {
              finalPrompt = parsed.prompt;
              enhancedPromptText = parsed.prompt;
              interpretedConceptText = parsed.interpreted_concept || '';
              if (parsed.negative_prompt) negativePromptText = parsed.negative_prompt;
              modelUsedToSynthesize = modelUsed;
            }
          }
        } catch (genErr) {
          console.warn('Gemini director expansion encountered error, proceeding with input:', genErr);
        }
      }

      // Map aspect ratio to width & height
      let width = 1024;
      let height = 1024;
      switch (aspectRatio) {
        case '16:9':
          width = 1280;
          height = 720;
          break;
        case '9:16':
          width = 720;
          height = 1280;
          break;
        case '4:5':
          width = 864;
          height = 1080;
          break;
        case '3:4':
          width = 768;
          height = 1024;
          break;
        case '1:1':
        default:
          width = 1024;
          height = 1024;
          break;
      }

      const seed = Math.floor(Math.random() * 9999999) + 1000;
      
      // Clean and distill prompt specifically for the image synthesis engine (under 280 chars to avoid HTTP 414 URL length errors)
      const cleanPromptForEngine = finalPrompt
        .replace(/--ar\s+[0-9:]+/gi, '')
        .replace(/--v\s+[0-9.]+/gi, '')
        .replace(/--s\s+[0-9]+/gi, '')
        .replace(/--style\s+\w+/gi, '')
        .replace(/[^\w\s,.-]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 260);

      const encodedPrompt = encodeURIComponent(cleanPromptForEngine || 'masterpiece photographic visual 8k');
      const imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=${width}&height=${height}&model=flux&nologo=true&seed=${seed}`;
      const alternativeUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=${width}&height=${height}&model=turbo&nologo=true&seed=${seed + 77}`;

      return NextResponse.json({
        success: true,
        data: {
          imageUrl,
          alternativeUrl,
          prompt: finalPrompt,
          enhancedPrompt: enhancedPromptText,
          interpretedConcept: interpretedConceptText,
          negativePrompt: negativePromptText,
          aspectRatio: aspectRatio || '1:1',
          width,
          height,
          seed,
          modelUsed: modelUsedToSynthesize,
        },
      });
    }

    // =========================================================================
    // ACTION 3: PROMPT ENHANCER
    // =========================================================================
    if (action === 'enhance_prompt') {
      if (!prompt) {
        return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
      }

      if (!apiKey) {
        return NextResponse.json({
          success: true,
          data: {
            enhancedPrompt: `${prompt.trim()}, natural photographic textures, authentic skin tones, balanced directional lighting, realistic optics --ar 16:9 --v 6.1`,
          },
        });
      }

      const ai = new GoogleGenAI({ apiKey });
      const { response, modelUsed } = await generateWithModel(ai, selectedModel, {
        contents: `Transform this prompt idea into a production-ready AI image generation instruction:
Prompt: "${prompt}"`,
        config: {
          systemInstruction: PROMPT_TO_IMAGE_SYSTEM_INSTRUCTION,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              interpreted_concept: { type: Type.STRING },
              prompt: { type: Type.STRING },
              negative_prompt: { type: Type.STRING },
            },
            required: ['prompt', 'negative_prompt'],
          },
        },
      });

      try {
        const parsed = JSON.parse(response.text || '{}');
        return NextResponse.json({
          success: true,
          data: {
            enhancedPrompt: parsed.prompt || prompt,
            negativePrompt: parsed.negative_prompt,
            interpretedConcept: parsed.interpreted_concept,
            modelUsed,
          },
        });
      } catch {
        return NextResponse.json({
          success: true,
          data: {
            enhancedPrompt: response.text?.trim() || prompt,
            modelUsed,
          },
        });
      }
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    console.error('AI Studio Tools Error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to process AI tool request' },
      { status: 500 }
    );
  }
}

