import React from 'react';
import {
  Camera,
  Box,
  Sparkles,
  Palette,
  Code,
  FileText,
  Building,
  Wand2,
  Image as ImageIcon,
  Cpu,
  Layers,
  Zap,
  Globe,
  Feather,
  Layout,
  LucideProps,
} from 'lucide-react';

export const getCategoryIcon = (iconName: string, props?: LucideProps) => {
  const p = { className: 'w-4 h-4', ...props };
  switch (iconName?.toLowerCase()) {
    case 'camera':
      return <Camera {...p} />;
    case 'box':
      return <Box {...p} />;
    case 'sparkles':
      return <Sparkles {...p} />;
    case 'palette':
      return <Palette {...p} />;
    case 'code':
      return <Code {...p} />;
    case 'filetext':
    case 'file-text':
      return <FileText {...p} />;
    case 'building':
      return <Building {...p} />;
    case 'wand2':
    case 'wand':
      return <Wand2 {...p} />;
    case 'image':
      return <ImageIcon {...p} />;
    case 'cpu':
      return <Cpu {...p} />;
    case 'layers':
      return <Layers {...p} />;
    case 'feather':
      return <Feather {...p} />;
    case 'layout':
      return <Layout {...p} />;
    default:
      return <Sparkles {...p} />;
  }
};
