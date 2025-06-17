import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { RefreshCw, X } from 'lucide-react';
import { usePWA } from '@/hooks/usePWA';

export function PWAUpdatePrompt() {
  const { isUpdateAvailable, updateApp } = usePWA();

  const handleUpdate = () => {
    updateApp();
  };

  if (!isUpdateAvailable) {
    return null;
  }

  return (
    <div className="fixed top-4 left-4 right-4 z-50 md:left-auto md:right-4 md:max-w-sm">
      <Card className="bg-green-600 border-0 text-white shadow-xl">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-2">
              <RefreshCw className="h-5 w-5" />
              <h3 className="font-semibold text-sm">Update Available</h3>
            </div>
          </div>
          
          <p className="text-xs text-green-100 mb-3">
            A new version of Cush is ready with improvements and bug fixes.
          </p>
          
          <Button
            onClick={handleUpdate}
            size="sm"
            className="bg-white text-green-600 hover:bg-green-50 w-full"
          >
            <RefreshCw className="h-4 w-4 mr-1" />
            Update Now
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}