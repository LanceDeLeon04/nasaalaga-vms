import { useEffect } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { toast } from 'sonner';

/**
 * Mounts once at the app root. Handles:
 *  - Registering the service worker
 *  - Prompting the user to reload when a new version is available
 *  - Letting the user know the app is ready to work offline
 * No visible UI of its own — everything surfaces through the existing sonner Toaster.
 */
export default function PwaUpdater() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    offlineReady: [offlineReady, setOfflineReady],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_url, registration) {
      // Check for a new version every 60 minutes while the tab stays open.
      if (registration) {
        setInterval(() => {
          registration.update().catch(() => {});
        }, 60 * 60 * 1000);
      }
    },
  });

  useEffect(() => {
    if (needRefresh) {
      toast('A new version of NASaAlaga is available', {
        duration: Infinity,
        action: {
          label: 'Update',
          onClick: () => updateServiceWorker(true),
        },
        onDismiss: () => setNeedRefresh(false),
      });
    }
  }, [needRefresh, setNeedRefresh, updateServiceWorker]);

  useEffect(() => {
    if (offlineReady) {
      toast.success('NASaAlaga is ready to work offline');
      setOfflineReady(false);
    }
  }, [offlineReady, setOfflineReady]);

  return null;
}
