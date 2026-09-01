import fs from 'fs';
let code = fs.readFileSync('src/App.tsx', 'utf8');

const replacement = `
import { FullScreenSaveLoader } from './components/FullScreenSaveLoader';
import { useSupabaseCollection, useSupabaseAuth } from './lib/useSupabase';
import { applyDynamicSEOMetadata } from './lib/seoManager';
import { useLoanAlerts } from './hooks/useLoanAlerts';
import { ShieldCheck, Sparkles, Bot, MessageSquareText } from 'lucide-react';
import { customAlert, customConfirm } from './utils/dialog';

const ClientApp = lazy(() => import('./components/ClientShop').then(m => ({ default: m.ClientShop })));
const InternetConnectionBanner = lazy(() => import('./components/InternetConnectionBanner').then(m => ({ default: m.InternetConnectionBanner })));
const WhatsAppFloatingButton = lazy(() => import('./components/WhatsAppFloatingButton').then(m => ({ default: m.WhatsAppFloatingButton })));
const CookieConsentBanner = lazy(() => import('./components/CookieConsentBanner').then(m => ({ default: m.CookieConsentBanner })));
const AIChatWidget = lazy(() => import('./components/AIChatWidget').then(m => ({ default: m.AIChatWidget })));
const InstallPwaBanner = lazy(() => import('./components/InstallPwaBanner').then(m => ({ default: m.InstallPwaBanner })));
const Footer = lazy(() => import('./components/Footer').then(m => ({ default: m.Footer })));
const ClientProfileModal = lazy(() => import('./components/ClientProfileModal').then(m => ({ default: m.ClientProfileModal })));
`;

const lines = code.split('\n');
const newLines = [
  ...lines.slice(0, 3),
  ...replacement.split('\n').filter((_, i, arr) => i > 0 && i < arr.length - 1),
  ...lines.slice(26)
];

fs.writeFileSync('src/App.tsx', newLines.join('\n'));
