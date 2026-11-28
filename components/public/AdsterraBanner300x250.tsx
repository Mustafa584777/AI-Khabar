'use client';

import React from 'react';
import { AdsterraAd } from '@/components/public/AdsterraAd';

interface AdsterraBanner300x250Props {
  className?: string;
  allowInsideModal?: boolean;
}

export function AdsterraBanner300x250({
  className = '',
  allowInsideModal = false,
}: AdsterraBanner300x250Props) {
  return (
    <AdsterraAd
      variant="300x250"
      className={`w-full my-4 ${className}`}
      allowInsideModal={allowInsideModal}
    />
  );
}
