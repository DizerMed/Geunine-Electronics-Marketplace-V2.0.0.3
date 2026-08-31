import React, { useState, useEffect, useRef } from 'react';
import { Download, Smartphone, X, Share, PlusSquare, MoreVertical, Monitor, RefreshCw, Copy, Check, CheckCircle2, Sparkles, ExternalLink } from 'lucide-react';
import { BRAND_LOGO_URL } from '../types';
import { useLanguage } from '../i18n/LanguageContext';

export type DevicePlatform = 'ios' | 'android' | 'desktop';

export const detectCurrentDevice = (): DevicePlatform => {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return 'desktop';
  }

  const ua = navigator.userAgent || '';
  const platform = (navigator as any).userAgentData?.platform || navigator.platform || '';

  // 1. Check iOS (iPhone, iPad, iPod, or modern iPadOS requesting desktop user-agent)
  const isIOS =
    /iPhone|iPad|iPod/i.test(ua) ||
    ((/Macintosh|MacIntel/i.test(platform) || /Macintosh/i.test(ua)) && navigator.maxTouchPoints > 1 && !/Windows/i.test(ua));

  if (isIOS) return 'ios';

  // 2. Check Android
  const isAndroid = /Android/i.test(ua);
  if (isAndroid) return 'android';

  // 3. Fallback / Default: Desktop (Windows, macOS, Linux, Chrome OS, PC / Laptop)
  return 'desktop';
};

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

interface InstallPwaBannerProps {
  theme?: 'dark' | 'light';
}

export const InstallPwaBanner: React.FC<InstallPwaBannerProps> = ({ theme = 'light' }) => {
  const isDark = theme === 'dark';
  const { language } = useLanguage();
  const isSw = language === 'sw';

  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [showManualModal, setShowManualModal] = useState(false);
  const [progress, setProgress] = useState(100);
  const [isHovered, setIsHovered] = useState(false);
  const [activeDeviceTab, setActiveDeviceTab] = useState<DevicePlatform>(() => detectCurrentDevice());
  const detectedPlatform = detectCurrentDevice();
  const [copiedLink, setCopiedLink] = useState(false);
  const [updateStatus, setUpdateStatus] = useState<'idle' | 'checking' | 'available' | 'updated'>('idle');
  const [lastCheckTime, setLastCheckTime] = useState<string | null>(null);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Check for Service Worker updates reliably
  const checkSwUpdates = async () => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;
    setUpdateStatus('checking');

    try {
      const reg = await navigator.serviceWorker.getRegistration();
      if (reg) {
        reg.onupdatefound = () => {
          setUpdateStatus('checking');
          const installingWorker = reg.installing;
          if (installingWorker) {
            installingWorker.onstatechange = () => {
              if (installingWorker.state === 'installed' && navigator.serviceWorker.controller) {
                setUpdateStatus('available');
              } else if (installingWorker.state === 'activated') {
                setUpdateStatus('updated');
                setTimeout(() => setUpdateStatus('idle'), 6000);
              }
            };
          }
        };

        if (reg.waiting) {
          setUpdateStatus('available');
        } else {
          await reg.update().catch(() => {});
        }
      }
    } catch (err) {
      console.warn('SW update check notice:', err);
    }

    const now = new Date();
    setLastCheckTime(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));

    setTimeout(() => {
      setUpdateStatus((prev) => (prev === 'checking' ? 'idle' : prev));
    }, 2500);
  };

  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      checkSwUpdates();

      const handleControllerChange = () => {
        setUpdateStatus('updated');
        setTimeout(() => setUpdateStatus('idle'), 6000);
      };

      const handleGlobalCheck = () => {
        checkSwUpdates();
      };

      const handleVisibilityChange = () => {
        if (document.visibilityState === 'visible') {
          checkSwUpdates();
        }
      };

      navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange);
      window.addEventListener('check-pwa-update', handleGlobalCheck);
      document.addEventListener('visibilitychange', handleVisibilityChange);

      return () => {
        navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange);
        window.removeEventListener('check-pwa-update', handleGlobalCheck);
        document.removeEventListener('visibilitychange', handleVisibilityChange);
      };
    }
  }, []);

  useEffect(() => {
    // 1. Check if running in standalone display mode (installed app window)
    const checkStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      ('standalone' in navigator && (navigator as any).standalone) ||
      document.referrer.includes('android-app://');

    setIsStandalone(Boolean(checkStandalone));

    if (checkStandalone) {
      setIsInstalled(true);
      setShowToast(false);
      localStorage.setItem('ge_pwa_installed', 'true');
    }

    // 2. Query browser getInstalledRelatedApps API if available (modern Chromium on Android / Desktop)
    if (typeof navigator !== 'undefined' && 'getInstalledRelatedApps' in navigator) {
      (navigator as any)
        .getInstalledRelatedApps()
        .then((relatedApps: any[]) => {
          if (relatedApps && relatedApps.length > 0) {
            setIsInstalled(true);
            localStorage.setItem('ge_pwa_installed', 'true');
          }
        })
        .catch(() => {});
    }

    // 3. Check localStorage installed flag
    const storedInstalled = localStorage.getItem('ge_pwa_installed') === 'true';
    if (storedInstalled) {
      setIsInstalled(true);
    }

    // 4. Check if prompt was dismissed recently
    const dismissedTime = localStorage.getItem('ge_pwa_dismissed_until');
    const isDismissedRecently = dismissedTime && Date.now() < Number(dismissedTime);

    let initialToastTimer: NodeJS.Timeout | null = null;
    if (!checkStandalone && !storedInstalled && !isDismissedRecently) {
      // Delay showing toast by 3 seconds for smooth initial render
      initialToastTimer = setTimeout(() => {
        setShowToast(true);
      }, 3000);
    }

    // Always detect and set device type accurately
    const detected = detectCurrentDevice();
    setActiveDeviceTab(detected);

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      // Browser confirms eligible for install
      setIsInstalled(false);
      localStorage.removeItem('ge_pwa_installed');
      window.dispatchEvent(new CustomEvent('pwa-installed-changed'));
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setShowToast(false);
      setShowManualModal(false);
      localStorage.setItem('ge_pwa_installed', 'true');
      window.dispatchEvent(new CustomEvent('pwa-installed-changed'));
    };

    const handleGlobalOpenModal = () => {
      const current = detectCurrentDevice();
      setActiveDeviceTab(current);
      setShowManualModal(true);
      setShowToast(false);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);
    window.addEventListener('open-pwa-install', handleGlobalOpenModal);

    return () => {
      if (initialToastTimer) clearTimeout(initialToastTimer);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      window.removeEventListener('open-pwa-install', handleGlobalOpenModal);
    };
  }, []);

  // Toast Auto-Dismiss timer bar
  useEffect(() => {
    if (!showToast || isHovered) {
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
      if (timerRef.current) clearTimeout(timerRef.current);
      return;
    }

    const durationMs = 30000;
    const intervalMs = 100;
    const decrement = (intervalMs / durationMs) * 100;

    progressIntervalRef.current = setInterval(() => {
      setProgress((prev) => {
        if (prev <= decrement) {
          clearInterval(progressIntervalRef.current!);
          setShowToast(false);
          return 0;
        }
        return prev - decrement;
      });
    }, intervalMs);

    timerRef.current = setTimeout(() => {
      setShowToast(false);
    }, durationMs);

    return () => {
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [showToast, isInstalled, isHovered]);

  const dismissToast = () => {
    setShowToast(false);
    // Suppress auto-popup for 24 hours
    localStorage.setItem('ge_pwa_dismissed_until', String(Date.now() + 24 * 60 * 60 * 1000));
  };

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      try {
        await deferredPrompt.prompt();
        const choiceResult = await deferredPrompt.userChoice;
        if (choiceResult.outcome === 'accepted') {
          setIsInstalled(true);
          setShowToast(false);
          setShowManualModal(false);
          localStorage.setItem('ge_pwa_installed', 'true');
        } else {
          setActiveDeviceTab(detectCurrentDevice());
          setShowManualModal(true);
        }
        setDeferredPrompt(null);
      } catch (err) {
        console.warn('Native install prompt failed, opening guide modal:', err);
        setActiveDeviceTab(detectCurrentDevice());
        setShowManualModal(true);
      }
    } else {
      setActiveDeviceTab(detectCurrentDevice());
      setShowManualModal(true);
    }
  };

  const handleCopyAppUrl = () => {
    try {
      navigator.clipboard.writeText(window.location.origin);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    } catch (e) {
      console.error(e);
    }
  };

  const handleResetPwa = async () => {
    localStorage.removeItem('ge_pwa_installed');
    localStorage.removeItem('ge_pwa_dismissed_until');
    setIsInstalled(false);
    window.dispatchEvent(new CustomEvent('pwa-installed-changed'));

    if (deferredPrompt) {
      handleInstallClick();
      return;
    }

    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      try {
        const registrations = await navigator.serviceWorker.getRegistrations();
        for (const registration of registrations) {
          await registration.unregister();
        }

        const cacheKeys = await caches.keys();
        for (const key of cacheKeys) {
          await caches.delete(key);
        }
      } catch (err) {
        console.warn('PWA reset notice:', err);
      }
    }

    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  };

  const handleReloadApp = () => {
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  };

  if (isStandalone) return null;

  return (
    <>
      {/* 1. Interactive Toast Notification */}
      {showToast && (
        <div
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          className="fixed bottom-4 left-3 right-3 sm:left-auto sm:right-6 z-50 max-w-md w-full animate-in fade-in slide-in-from-bottom-5 duration-300 select-none"
        >
          <div
            className={`relative overflow-hidden rounded-2xl shadow-2xl border p-3.5 sm:p-4 transition-all ${
              isDark
                ? 'bg-slate-900 border-slate-700/80 shadow-black/60 text-white'
                : 'bg-white border-slate-200 shadow-slate-300/60 text-slate-900'
            }`}
          >
            {/* Top Progress Bar */}
            <div className={`absolute top-0 left-0 right-0 h-1 ${isDark ? 'bg-slate-800' : 'bg-slate-100'}`}>
              <div
                className="h-full bg-blue-600 transition-all duration-100 ease-linear rounded-r-full"
                style={{ width: `${progress}%` }}
              />
            </div>

            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-slate-900 border border-slate-700/80 p-1 flex items-center justify-center shrink-0 shadow-sm overflow-hidden">
                <img
                  src="/icon-192.png"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).src = BRAND_LOGO_URL;
                  }}
                  alt="Genuine Electronics App Icon"
                  className="w-full h-full object-contain"
                  referrerPolicy="no-referrer"
                />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <h4 className="font-extrabold text-sm tracking-tight truncate">Genuine Electronics</h4>
                  <span
                    className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md shrink-0 ${
                      isDark ? 'bg-blue-900/60 text-blue-300' : 'bg-blue-100 text-blue-700'
                    }`}
                  >
                    {isSw ? 'App Rasmi' : 'Official App'}
                  </span>
                </div>
                <p className={`text-xs truncate mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  {isSw
                    ? 'Weka App kwenye simu/PC kwa ununuzi wa haraka bila mtandao'
                    : 'Install app on home screen for 1-tap offline shopping'}
                </p>

                {/* Service Worker Status Pill */}
                {updateStatus === 'checking' && (
                  <div className="mt-1.5 flex items-center gap-1.5 text-[10px] font-semibold text-blue-600 dark:text-blue-400 animate-pulse">
                    <RefreshCw className="w-3 h-3 animate-spin text-blue-500 shrink-0" />
                    <span>{isSw ? 'Inakagua sasisho...' : 'Checking updates...'}</span>
                  </div>
                )}
                {updateStatus === 'available' && (
                  <div className="mt-1.5 flex items-center gap-1.5 text-[10px] font-bold text-amber-600 dark:text-amber-400">
                    <Sparkles className="w-3 h-3 text-amber-500 shrink-0" />
                    <span>{isSw ? 'Toleo jipya lipo!' : 'New version available!'}</span>
                    <button
                      onClick={handleReloadApp}
                      className="ml-1 underline font-black hover:text-amber-700 dark:hover:text-amber-300 cursor-pointer"
                    >
                      {isSw ? 'Sasisha' : 'Reload'}
                    </button>
                  </div>
                )}
              </div>

              <button
                onClick={dismissToast}
                className={`p-1 rounded-lg transition-colors shrink-0 cursor-pointer ${
                  isDark
                    ? 'text-slate-400 hover:text-white hover:bg-slate-800'
                    : 'text-slate-400 hover:text-slate-900 hover:bg-slate-100'
                }`}
                title={isSw ? 'Funga' : 'Dismiss'}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-3 flex items-center gap-2 justify-end">
              <button
                onClick={dismissToast}
                className={`px-3 py-1.5 text-xs font-semibold transition-colors cursor-pointer ${
                  isDark ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {isSw ? 'Baadaye' : 'Not Now'}
              </button>
              <button
                onClick={handleInstallClick}
                className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all shadow-md shadow-blue-600/30 active:scale-95 shrink-0 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>{isSw ? 'Weka App' : 'Install App'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. Comprehensive PWA Modal with Diagnostics, Guide & Reinstall */}
      {showManualModal && (
        <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200 select-none">
          <div
            className={`relative w-full max-w-lg rounded-3xl shadow-2xl border overflow-hidden transition-all ${
              isDark
                ? 'bg-slate-900 border-slate-800 text-white shadow-black/50'
                : 'bg-white border-slate-200 text-slate-900 shadow-slate-300/50'
            }`}
          >
            {/* Header */}
            <div
              className={`p-5 sm:p-6 border-b flex items-start justify-between gap-4 ${
                isDark ? 'border-slate-800' : 'border-slate-100'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="w-13 h-13 rounded-2xl bg-slate-900 border border-slate-700/80 p-1.5 flex items-center justify-center shrink-0 shadow-md overflow-hidden">
                  <img
                    src="/icon-192.png"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).src = BRAND_LOGO_URL;
                    }}
                    alt="Genuine Electronics App Icon"
                    className="w-full h-full object-contain"
                    referrerPolicy="no-referrer"
                  />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base sm:text-lg font-black tracking-tight">
                      {isSw ? 'Genuine Electronics App' : 'Genuine Electronics App'}
                    </h3>
                    <span className="text-[10px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-blue-600 text-white">
                      {isSw ? 'App Rasmi' : 'App'}
                    </span>
                  </div>
                  <p className={`text-xs mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    {isSw
                      ? 'Weka Genuine App kwenye Home Screen kwa ununuzi salama na wa haraka'
                      : 'Add Genuine Electronics icon directly to your device Home Screen'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowManualModal(false)}
                className={`p-1.5 rounded-xl transition-colors cursor-pointer ${
                  isDark
                    ? 'text-slate-400 hover:text-white hover:bg-slate-800'
                    : 'text-slate-400 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 sm:p-6 space-y-4 max-h-[75vh] overflow-y-auto custom-scrollbar">
              {/* SW Status & Update Indicator Card */}
              <div
                className={`p-3.5 rounded-2xl border flex items-center justify-between gap-3 text-xs transition-all ${
                  updateStatus === 'checking'
                    ? 'bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800/60 text-blue-900 dark:text-blue-200'
                    : updateStatus === 'available'
                    ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800/60 text-amber-900 dark:text-amber-200'
                    : updateStatus === 'updated'
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800/60 text-emerald-900 dark:text-emerald-200'
                    : isDark
                    ? 'bg-slate-800/50 border-slate-700 text-slate-200'
                    : 'bg-slate-50 border-slate-200 text-slate-800'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  {updateStatus === 'checking' ? (
                    <RefreshCw className="w-4 h-4 text-blue-500 animate-spin shrink-0" />
                  ) : updateStatus === 'available' ? (
                    <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />
                  ) : updateStatus === 'updated' ? (
                    <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  )}
                  <div className="min-w-0">
                    <p className="font-bold truncate">
                      {updateStatus === 'checking'
                        ? isSw
                          ? 'Inakagua sasisho za App...'
                          : 'Checking for updates...'
                        : updateStatus === 'available'
                        ? isSw
                          ? 'Sasisho jipya la App linapatikana!'
                          : 'New App version available!'
                        : updateStatus === 'updated'
                        ? isSw
                          ? 'App imesasishwa kikamilifu!'
                          : 'App updated to latest version!'
                        : isSw
                        ? 'App ipo tayari (Offline & Realtime Ready)'
                        : 'App Active (Offline & Realtime Ready)'}
                    </p>
                    {lastCheckTime && (
                      <p className={`text-[10px] mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                        {isSw ? `Ilaguliwa: ${lastCheckTime}` : `Verified: ${lastCheckTime}`}
                      </p>
                    )}
                  </div>
                </div>

                {updateStatus === 'available' ? (
                  <button
                    onClick={handleReloadApp}
                    className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs shrink-0 transition-all shadow-xs cursor-pointer"
                  >
                    {isSw ? 'Sasisha Sasa' : 'Update Now'}
                  </button>
                ) : (
                  <button
                    onClick={checkSwUpdates}
                    disabled={updateStatus === 'checking'}
                    className="px-2.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-[11px] shrink-0 transition-all shadow-xs disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${updateStatus === 'checking' ? 'animate-spin' : ''}`} />
                    <span>
                      {updateStatus === 'checking'
                        ? isSw
                          ? 'Inakagua...'
                          : 'Checking...'
                        : isSw
                        ? 'Kagua Sasisho'
                        : 'Check Updates'}
                    </span>
                  </button>
                )}
              </div>

              {/* Re-installation & Reset Diagnostic Bar */}
              <div
                className={`p-3.5 rounded-2xl border flex items-center justify-between gap-3 text-xs ${
                  isDark ? 'bg-blue-950/30 border-blue-800/50 text-blue-200' : 'bg-blue-50 border-blue-200 text-blue-900'
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <RefreshCw className="w-4 h-4 text-blue-500 shrink-0" />
                  <span className="truncate">
                    {isSw
                      ? 'Je, ulifuta App au unataka kuweka upya?'
                      : 'Uninstalled previously or need fresh install?'}
                  </span>
                </div>
                <button
                  onClick={handleResetPwa}
                  className="px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-[11px] shrink-0 transition-colors shadow-2xs cursor-pointer"
                >
                  {isSw ? 'Weka Upya' : 'Re-Install'}
                </button>
              </div>

              {/* If already installed banner */}
              {isInstalled ? (
                <div
                  className={`p-4 rounded-2xl border text-center ${
                    isDark ? 'bg-emerald-950/20 border-emerald-900/50' : 'bg-emerald-50 border-emerald-200'
                  }`}
                >
                  <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400 mx-auto flex items-center justify-center mb-2">
                    <Check className="w-5 h-5" />
                  </div>
                  <h4 className={`text-sm font-black mb-1 ${isDark ? 'text-emerald-400' : 'text-emerald-700'}`}>
                    {isSw ? 'App Tayari Imewekwa (Installed)' : 'App Already Installed'}
                  </h4>
                  <p className={`text-xs ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                    {isSw
                      ? 'App ya Genuine Electronics ipo kwenye kifaa chako. Unaweza kuifungua kupitia icon yake kwenye Home Screen au Desktop.'
                      : 'The Genuine Electronics app is configured on your device. Launch it directly from your Home Screen, Desktop or App drawer for the full standalone experience.'}
                  </p>
                </div>
              ) : (
                <>
                  {/* Platform Selection Tabs */}
                  <div
                    className={`flex items-center p-1 rounded-2xl text-xs font-bold gap-1 ${
                      isDark ? 'bg-slate-800/50' : 'bg-slate-100'
                    }`}
                  >
                    <button
                      onClick={() => setActiveDeviceTab('desktop')}
                      className={`flex-1 py-2 px-2.5 rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                        activeDeviceTab === 'desktop'
                          ? 'bg-blue-600 text-white shadow-2xs'
                          : isDark
                          ? 'text-slate-400 hover:text-white'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <Monitor className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">Computer / PC</span>
                      {detectedPlatform === 'desktop' && (
                        <span className={`text-[9px] px-1 py-0.2 rounded font-black uppercase shrink-0 ${
                          activeDeviceTab === 'desktop'
                            ? 'bg-white/20 text-white'
                            : 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                        }`}>
                          {isSw ? 'Kifaa Hiki' : 'Detected'}
                        </span>
                      )}
                    </button>

                    <button
                      onClick={() => setActiveDeviceTab('android')}
                      className={`flex-1 py-2 px-2.5 rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                        activeDeviceTab === 'android'
                          ? 'bg-blue-600 text-white shadow-2xs'
                          : isDark
                          ? 'text-slate-400 hover:text-white'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <Smartphone className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">Android</span>
                      {detectedPlatform === 'android' && (
                        <span className={`text-[9px] px-1 py-0.2 rounded font-black uppercase shrink-0 ${
                          activeDeviceTab === 'android'
                            ? 'bg-white/20 text-white'
                            : 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                        }`}>
                          {isSw ? 'Kifaa Hiki' : 'Detected'}
                        </span>
                      )}
                    </button>

                    <button
                      onClick={() => setActiveDeviceTab('ios')}
                      className={`flex-1 py-2 px-2.5 rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                        activeDeviceTab === 'ios'
                          ? 'bg-blue-600 text-white shadow-2xs'
                          : isDark
                          ? 'text-slate-400 hover:text-white'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <Smartphone className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">iPhone / iOS</span>
                      {detectedPlatform === 'ios' && (
                        <span className={`text-[9px] px-1 py-0.2 rounded font-black uppercase shrink-0 ${
                          activeDeviceTab === 'ios'
                            ? 'bg-white/20 text-white'
                            : 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                        }`}>
                          {isSw ? 'Kifaa Hiki' : 'Detected'}
                        </span>
                      )}
                    </button>
                  </div>

                  {/* Step by step guides per platform */}
                  <div className="space-y-2.5">
                    {activeDeviceTab === 'desktop' && (
                      <>
                        {deferredPrompt && (
                          <div className="p-3.5 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md flex items-center justify-between gap-3">
                            <div>
                              <p className="font-extrabold text-xs">
                                {isSw ? 'Kivinjari Chako Kinafaa Kusakinisha Mara Moja!' : 'Your Browser is Ready for Instant Install!'}
                              </p>
                              <p className="text-[11px] text-blue-100 mt-0.5">
                                {isSw ? 'Bofya hapa kuweka app kama programu huru ya kompyuta.' : 'Click to launch the native desktop install wizard directly.'}
                              </p>
                            </div>
                            <button
                              onClick={handleInstallClick}
                              className="px-3.5 py-1.5 rounded-xl bg-white text-blue-700 hover:bg-blue-50 font-black text-xs shrink-0 shadow-sm flex items-center gap-1.5 cursor-pointer transition-all active:scale-95"
                            >
                              <Download className="w-3.5 h-3.5" />
                              <span>{isSw ? 'Sakinisha Sasa' : 'Install Now'}</span>
                            </button>
                          </div>
                        )}

                        <div
                          className={`p-3 rounded-2xl border flex items-start gap-3 ${
                            isDark ? 'bg-slate-800/50 border-slate-700' : 'bg-slate-50 border-slate-200'
                          }`}
                        >
                          <div
                            className={`w-6 h-6 rounded-lg flex items-center justify-center font-extrabold text-xs shrink-0 mt-0.5 ${
                              isDark ? 'bg-blue-900/50 text-blue-400' : 'bg-blue-100 text-blue-600'
                            }`}
                          >
                            1
                          </div>
                          <div className="text-xs flex-1 min-w-0">
                            <p className={`font-bold ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
                              {isSw ? 'Chrome, Edge, Brave au Opera (Windows / Mac / Linux)' : 'Chrome, Edge, Brave or Opera (Windows / Mac / Linux)'}
                            </p>
                            <p className={`mt-0.5 flex items-center gap-1.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                              {isSw
                                ? 'Tazama alama ya App au Download'
                                : 'Look for the App / Install icon'}{' '}
                              <Download className="w-3.5 h-3.5 text-blue-500 inline shrink-0" />{' '}
                              {isSw ? 'kwenye mstari wa URL (Address bar) upande wa kulia, au bofya Menu ya nukta tatu ⋮ na uchague "Install Genuine Electronics".' : 'in the browser address bar (top right), or click the ⋮ menu and choose "Install Genuine Electronics".'}
                            </p>
                          </div>
                        </div>

                        <div
                          className={`p-3 rounded-2xl border flex items-start gap-3 ${
                            isDark ? 'bg-slate-800/50 border-slate-700' : 'bg-slate-50 border-slate-200'
                          }`}
                        >
                          <div
                            className={`w-6 h-6 rounded-lg flex items-center justify-center font-extrabold text-xs shrink-0 mt-0.5 ${
                              isDark ? 'bg-blue-900/50 text-blue-400' : 'bg-blue-100 text-blue-600'
                            }`}
                          >
                            2
                          </div>
                          <div className="text-xs flex-1 min-w-0">
                            <p className={`font-bold ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
                              {isSw ? 'Safari kwenye Mac (macOS Sonoma au Mpya zaidi)' : 'Safari on Mac (macOS Sonoma+)'}
                            </p>
                            <p className={`mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                              {isSw
                                ? 'Kwenye Menu ya juu ya Safari, bofya File > "Add to Dock..." ili kuweka App kwenye Dock yako.'
                                : 'In the top menu bar, click File > "Add to Dock..." to run Genuine Electronics as a standalone Mac app.'}
                            </p>
                          </div>
                        </div>

                        <div
                          className={`p-3 rounded-2xl border flex items-start gap-3 ${
                            isDark ? 'bg-slate-800/50 border-slate-700' : 'bg-slate-50 border-slate-200'
                          }`}
                        >
                          <div
                            className={`w-6 h-6 rounded-lg flex items-center justify-center font-extrabold text-xs shrink-0 mt-0.5 ${
                              isDark ? 'bg-blue-900/50 text-blue-400' : 'bg-blue-100 text-blue-600'
                            }`}
                          >
                            3
                          </div>
                          <div className="text-xs flex-1 min-w-0">
                            <p className={`font-bold ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
                              {isSw ? 'Upatikanaji Rahisi na Ufanyaji Kazi Bila Mtandao' : 'Native Performance & Offline Access'}
                            </p>
                            <p className={`mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                              {isSw
                                ? 'App itafunguka katika dirisha huru la kompyuta, ikiwa na kasi ya juu na uwezo wa kutazama bidhaa hata mtandao ukikatika.'
                                : 'The installed desktop app runs in its own window with zero browser tab clutter, instant launch, and full offline caching.'}
                            </p>
                            <button
                              onClick={handleCopyAppUrl}
                              className="mt-2 flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 text-slate-800 dark:text-slate-200 font-bold text-[11px] transition-colors cursor-pointer"
                            >
                              {copiedLink ? (
                                <Check className="w-3.5 h-3.5 text-emerald-500" />
                              ) : (
                                <Copy className="w-3.5 h-3.5 text-blue-500" />
                              )}
                              <span>
                                {copiedLink
                                  ? isSw
                                    ? 'Link Imenakiliwa!'
                                    : 'Link Copied!'
                                  : isSw
                                  ? 'Nakili Link ya App'
                                  : 'Copy App URL'}
                              </span>
                            </button>
                          </div>
                        </div>
                      </>
                    )}

                    {activeDeviceTab === 'android' && (
                      <>
                        <div
                          className={`p-3 rounded-2xl border flex items-start gap-3 ${
                            isDark ? 'bg-slate-800/50 border-slate-700' : 'bg-slate-50 border-slate-200'
                          }`}
                        >
                          <div
                            className={`w-6 h-6 rounded-lg flex items-center justify-center font-extrabold text-xs shrink-0 mt-0.5 ${
                              isDark ? 'bg-blue-900/50 text-blue-400' : 'bg-blue-100 text-blue-600'
                            }`}
                          >
                            1
                          </div>
                          <div className="text-xs">
                            <p className={`font-bold ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
                              {isSw ? 'Bofya Menu ya Nukta Tatu' : 'Open Chrome Browser Menu'}
                            </p>
                            <p className={`mt-0.5 flex items-center gap-1.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                              {isSw ? 'Bofya alama ya' : 'Tap the'} <MoreVertical className="w-3.5 h-3.5 text-blue-500 inline" />{' '}
                              {isSw ? 'juu kulia mwa Chrome.' : 'icon in the top-right corner.'}
                            </p>
                          </div>
                        </div>

                        <div
                          className={`p-3 rounded-2xl border flex items-start gap-3 ${
                            isDark ? 'bg-slate-800/50 border-slate-700' : 'bg-slate-50 border-slate-200'
                          }`}
                        >
                          <div
                            className={`w-6 h-6 rounded-lg flex items-center justify-center font-extrabold text-xs shrink-0 mt-0.5 ${
                              isDark ? 'bg-blue-900/50 text-blue-400' : 'bg-blue-100 text-blue-600'
                            }`}
                          >
                            2
                          </div>
                          <div className="text-xs">
                            <p className={`font-bold ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
                              {isSw ? 'Chagua "Install App" au "Add to Home Screen"' : 'Select "Install app"'}
                            </p>
                            <p className={`mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                              {isSw
                                ? 'Bofya "Install app" au "Add to Home screen" ili kuweka icon rasmi ya Genuine Electronics.'
                                : 'Tap "Install app" or "Add to Home screen" to create the high-resolution app launcher.'}
                            </p>
                          </div>
                        </div>
                      </>
                    )}

                    {activeDeviceTab === 'ios' && (
                      <>
                        <div
                          className={`p-3 rounded-2xl border flex items-start gap-3 ${
                            isDark ? 'bg-slate-800/50 border-slate-700' : 'bg-slate-50 border-slate-200'
                          }`}
                        >
                          <div
                            className={`w-6 h-6 rounded-lg flex items-center justify-center font-extrabold text-xs shrink-0 mt-0.5 ${
                              isDark ? 'bg-blue-900/50 text-blue-400' : 'bg-blue-100 text-blue-600'
                            }`}
                          >
                            1
                          </div>
                          <div className="text-xs">
                            <p className={`font-bold ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
                              {isSw ? 'Fungua kwenye Safari Browser' : 'Open in Safari Browser'}
                            </p>
                            <p className={`mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                              {isSw
                                ? 'Kwenye iPhone/iPad, tumia Safari. Kama unatumia kivinjari kingine, nakili Link ya App hapa:'
                                : 'On iPhone/iPad, use Safari. If currently inside Chrome or social in-app browser, copy link:'}
                            </p>
                            <button
                              onClick={handleCopyAppUrl}
                              className="mt-1.5 flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 text-slate-800 dark:text-slate-200 font-bold text-[11px] transition-colors cursor-pointer"
                            >
                              {copiedLink ? (
                                <Check className="w-3.5 h-3.5 text-emerald-500" />
                              ) : (
                                <Copy className="w-3.5 h-3.5 text-blue-500" />
                              )}
                              <span>
                                {copiedLink
                                  ? isSw
                                    ? 'Imenakiliwa!'
                                    : 'Copied!'
                                  : isSw
                                  ? 'Nakili Link ya App'
                                  : 'Copy App Link'}
                              </span>
                            </button>
                          </div>
                        </div>

                        <div
                          className={`p-3 rounded-2xl border flex items-start gap-3 ${
                            isDark ? 'bg-slate-800/50 border-slate-700' : 'bg-slate-50 border-slate-200'
                          }`}
                        >
                          <div
                            className={`w-6 h-6 rounded-lg flex items-center justify-center font-extrabold text-xs shrink-0 mt-0.5 ${
                              isDark ? 'bg-blue-900/50 text-blue-400' : 'bg-blue-100 text-blue-600'
                            }`}
                          >
                            2
                          </div>
                          <div className="text-xs">
                            <p className={`font-bold ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
                              {isSw ? 'Bofya Alama ya Share' : 'Tap Share Icon'}
                            </p>
                            <p className={`mt-0.5 flex items-center gap-1.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                              {isSw ? 'Bofya' : 'Tap'} <Share className="w-3.5 h-3.5 text-blue-500 inline" />{' '}
                              {isSw ? 'chini ya Safari.' : 'in bottom toolbar.'}
                            </p>
                          </div>
                        </div>

                        <div
                          className={`p-3 rounded-2xl border flex items-start gap-3 ${
                            isDark ? 'bg-slate-800/50 border-slate-700' : 'bg-slate-50 border-slate-200'
                          }`}
                        >
                          <div
                            className={`w-6 h-6 rounded-lg flex items-center justify-center font-extrabold text-xs shrink-0 mt-0.5 ${
                              isDark ? 'bg-blue-900/50 text-blue-400' : 'bg-blue-100 text-blue-600'
                            }`}
                          >
                            3
                          </div>
                          <div className="text-xs">
                            <p className={`font-bold ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
                              {isSw ? 'Chagua "Add to Home Screen"' : 'Select "Add to Home Screen"'}
                            </p>
                            <p className={`mt-0.5 flex items-center gap-1.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                              {isSw ? 'Sogeza chini na ubofye' : 'Scroll down and choose'}{' '}
                              <PlusSquare className="w-3.5 h-3.5 text-blue-500 inline" /> <b>Add to Home Screen</b>.
                            </p>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Bottom Actions */}
            <div
              className={`p-4 sm:p-5 border-t flex items-center justify-between gap-3 ${
                isDark ? 'bg-slate-900/50 border-slate-800' : 'bg-slate-50 border-slate-100'
              }`}
            >
              {deferredPrompt ? (
                <button
                  onClick={handleInstallClick}
                  className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs py-2.5 px-4 rounded-2xl flex items-center justify-center gap-2 transition-all shadow-md shadow-blue-600/30 cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>{isSw ? 'Pakua Moja kwa Moja (Direct Install)' : 'Direct Install App'}</span>
                </button>
              ) : (
                <button
                  onClick={() => setShowManualModal(false)}
                  className={`w-full font-bold text-xs py-2.5 px-4 rounded-2xl flex items-center justify-center gap-2 transition-all cursor-pointer ${
                    isDark
                      ? 'bg-slate-800 hover:bg-slate-700 text-white'
                      : 'bg-slate-900 hover:bg-slate-800 text-white'
                  }`}
                >
                  <span>{isSw ? 'Nimeelewa, Ahsante!' : 'Got It, Thanks!'}</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
