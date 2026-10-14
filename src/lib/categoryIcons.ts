import React from 'react';
import {
  Zap,
  Wifi,
  ShieldCheck,
  Home,
  Car,
  CreditCard,
  Landmark,
  Layers,
  Briefcase,
  HeartPulse,
  GraduationCap,
  ShoppingBag,
  Tv,
  Folder,
  Tag,
  Globe,
  Phone,
  Shield,
  FileText,
  Sparkles,
  Plane,
  Music,
  Dumbbell,
  BookOpen,
  Coffee,
  Key,
} from 'lucide-react';

export const CATEGORY_ICON_MAP: Record<string, React.ElementType> = {
  Zap,
  Wifi,
  ShieldCheck,
  Home,
  Car,
  CreditCard,
  Landmark,
  Layers,
  Briefcase,
  HeartPulse,
  GraduationCap,
  ShoppingBag,
  Tv,
  Folder,
  Tag,
  Globe,
  Phone,
  Shield,
  FileText,
  Sparkles,
  Plane,
  Music,
  Dumbbell,
  BookOpen,
  Coffee,
  Key,
};

export interface IconOption {
  id: string;
  label: string;
  icon: React.ElementType;
}

export const CATEGORY_ICON_OPTIONS: IconOption[] = [
  { id: 'Zap', label: 'Energy / Power', icon: Zap },
  { id: 'Wifi', label: 'Internet / Telecom', icon: Wifi },
  { id: 'ShieldCheck', label: 'Insurance', icon: ShieldCheck },
  { id: 'Home', label: 'Housing / Property', icon: Home },
  { id: 'Car', label: 'Mobility / Auto', icon: Car },
  { id: 'CreditCard', label: 'Subscriptions', icon: CreditCard },
  { id: 'Landmark', label: 'Banking / Finance', icon: Landmark },
  { id: 'Layers', label: 'General / Services', icon: Layers },
  { id: 'Briefcase', label: 'Business / Work', icon: Briefcase },
  { id: 'HeartPulse', label: 'Health / Medical', icon: HeartPulse },
  { id: 'GraduationCap', label: 'Education / Study', icon: GraduationCap },
  { id: 'ShoppingBag', label: 'Retail / Shopping', icon: ShoppingBag },
  { id: 'Tv', label: 'Media / Streaming', icon: Tv },
  { id: 'Dumbbell', label: 'Fitness / Sport', icon: Dumbbell },
  { id: 'Plane', label: 'Travel / Transport', icon: Plane },
  { id: 'Music', label: 'Music / Audio', icon: Music },
  { id: 'BookOpen', label: 'Reading / News', icon: BookOpen },
  { id: 'Coffee', label: 'Food / Beverage', icon: Coffee },
  { id: 'Folder', label: 'Documents / Archive', icon: Folder },
  { id: 'Tag', label: 'Tag / Custom', icon: Tag },
  { id: 'Globe', label: 'Online / Web', icon: Globe },
  { id: 'Sparkles', label: 'Special / Demo', icon: Sparkles },
];

export const CATEGORY_COLOR_PRESETS: string[] = [
  '#f59e0b', // Amber
  '#06b6d4', // Cyan
  '#3b82f6', // Blue
  '#8b5cf6', // Violet
  '#10b981', // Emerald
  '#ec4899', // Pink
  '#6366f1', // Indigo
  '#f43f5e', // Rose
  '#14b8a6', // Teal
  '#eab308', // Yellow
  '#64748b', // Slate
  '#d97706', // Orange
  '#7c3aed', // Purple
  '#059669', // Green
];

export function getCategoryIconComponent(iconName?: string): React.ElementType {
  if (!iconName) return Layers;
  return CATEGORY_ICON_MAP[iconName] || Layers;
}
