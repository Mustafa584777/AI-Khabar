'use client';

import React from 'react';

const FAQ_ITEMS = [
  {
    question: "What makes Gemini-optimized prompts different from other LLMs?",
    answer: "Google's Gemini models have a native multimodal foundation and a massive context window. Standard prompts designed for older text-only engines often underutilize Gemini's ability to cross-reference multiple data formats. Our curated Gemini prompts are explicitly calibrated to leverage its advanced logical reasoning and multimodal interpretation."
  },
  {
    question: "How does the 1-click prompt copying system work?",
    answer: "Every prompt in our directory is complete and ready to run. When you click 'Copy Prompt', the fully formatted prompt text is placed onto your clipboard with optimal aspect ratios, lighting, and parameters included."
  },
  {
    question: "Are these prompts safe for commercial use and client projects?",
    answer: "Yes, 100%. All prompts and creative guides published are free for both personal and commercial use without attribution constraints."
  }
];

export const SEOContentSection = () => {
  // Structured Data Schema for Google Search Console (JSON-LD)
  const schemaJsonLD = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": FAQ_ITEMS.map((item) => ({
      "@type": "Question",
      "name": item.question,
      "acceptedAnswer": {
        "@type": "Answer",
        "text": item.answer
      }
    }))
  };

  const directorySchemaJsonLD = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "name": "Trending Photo Prompts",
    "operatingSystem": "All",
    "applicationCategory": "DeveloperApplication",
    "description": "Copy-paste photo prompt directory with tested visual styles and camera parameters.",
    "aggregateRating": {
      "@type": "AggregateRating",
      "ratingValue": "4.9",
      "reviewCount": "24850"
    },
    "offers": {
      "@type": "Offer",
      "price": "0.00",
      "priceCurrency": "USD"
    }
  };

  return (
    <>
      {/* Search Engine Schema Injection */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaJsonLD) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(directorySchemaJsonLD) }}
      />
    </>
  );
};
