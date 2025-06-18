import { PWAInstallPrompt } from './PWAInstallPrompt';
import { PWAUpdatePrompt } from './PWAUpdatePrompt';
import { OfflineIndicator } from './OfflineIndicator';

export function PWAManager() {
  return (
    <>
      <PWAInstallPrompt />
      <PWAUpdatePrompt />
      <OfflineIndicator />
    </>
  );
}