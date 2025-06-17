import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';

interface VersionInfo {
  version: string;
  build: string;
  features: string[];
  timestamp: number;
}

export function VersionIndicator() {
  const [version, setVersion] = useState<VersionInfo | null>(null);

  useEffect(() => {
    fetch('/version.json')
      .then(res => res.json())
      .then(data => setVersion(data))
      .catch(() => {
        // Fallback version info
        setVersion({
          version: '2.1.0-enhanced',
          build: 'dev',
          features: ['enhanced-sidebar'],
          timestamp: Date.now()
        });
      });
  }, []);

  if (!version) return null;

  return (
    <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
      v{version.version}
    </Badge>
  );
}