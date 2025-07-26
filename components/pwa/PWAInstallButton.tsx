import { useState, useEffect } from 'react';
import { Download, Smartphone } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

interface PWAInstallButtonProps {
  className?: string;
  variant?: 'header' | 'standalone';
}

export function PWAInstallButton({ className = '', variant = 'header' }: PWAInstallButtonProps) {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showButton, setShowButton] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Check if already installed
    const checkInstalled = () => {
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
      const isIOSStandalone = (window.navigator as any).standalone === true;
      setIsInstalled(isStandalone || isIOSStandalone);
    };

    checkInstalled();

    const handleBeforeInstallPrompt = (e: Event) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();
      
      const promptEvent = e as BeforeInstallPromptEvent;
      console.log('PWA install prompt captured for manual button');
      
      setDeferredPrompt(promptEvent);
      setShowButton(true);
    };

    const handleAppInstalled = () => {
      console.log('PWA was installed via manual button');
      setShowButton(false);
      setDeferredPrompt(null);
      setIsInstalled(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      try {
        // Show the install prompt
        await deferredPrompt.prompt();
        
        // Wait for the user to respond to the prompt
        const { outcome } = await deferredPrompt.userChoice;
        
        console.log('Manual PWA install prompt outcome:', outcome);
        
        if (outcome === 'accepted') {
          console.log('User accepted the manual install prompt');
        } else {
          console.log('User dismissed the manual install prompt');
        }
        
        // Clear the prompt
        setDeferredPrompt(null);
        setShowButton(false);
      } catch (error) {
        console.error('Error showing install prompt:', error);
      }
    }
  };

  // Don't show if already installed or no prompt available
  if (isInstalled || !showButton || !deferredPrompt) {
    return null;
  }

  if (variant === 'header') {
    return (
      <button
        onClick={handleInstallClick}
        className={`flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg text-sm font-medium transition-colors shadow-sm ${className}`}
        title="Install Riverwalks as an app"
      >
        <Download className="w-4 h-4" />
        <span className="hidden sm:inline">Install App</span>
        <span className="sm:hidden">Install</span>
      </button>
    );
  }

  // Standalone variant (default)
  return (
    <div className="flex justify-center mb-8">
      <button
        onClick={handleInstallClick}
        className={`flex items-center gap-3 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors shadow-sm ${className}`}
      >
        <Smartphone className="w-5 h-5" />
        <div className="text-left">
          <div className="text-sm font-semibold">Install Riverwalks</div>
          <div className="text-xs text-blue-100">Add to your device for quick access</div>
        </div>
      </button>
    </div>
  );
}