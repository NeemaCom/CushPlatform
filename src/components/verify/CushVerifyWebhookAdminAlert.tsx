import { useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { BellRing, Check, ExternalLink, ShieldAlert } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

type FailureAlert = {
  id: number;
  destinationName: string;
  eventType: string;
  deliveryStatus: string;
  attemptCount: number;
  lastErrorCode: string | null;
  emailStatus: string;
  createdAt: string;
  readAt: string | null;
};

export default function CushVerifyWebhookAdminAlert({
  role,
  onOpen,
}: {
  role: string;
  onOpen: () => void;
}) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const lastNotifiedId = useRef<number | null>(null);
  const query = useQuery<{ notifications: FailureAlert[] }>({
    queryKey: ["/api/verify/webhook-notifications"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/verify/webhook-notifications?limit=20");
      return response.json() as Promise<{ notifications: FailureAlert[] }>;
    },
    enabled: role === "organisation_admin",
    refetchInterval: 30_000,
    refetchIntervalInBackground: false,
    retry: false,
  });

  const unread = query.data?.notifications.filter((notification) => !notification.readAt) ?? [];
  const latest = unread[0];
  useEffect(() => {
    if (!latest || lastNotifiedId.current === latest.id) return;
    lastNotifiedId.current = latest.id;
    toast({
      title: "Webhook delivery needs attention",
      description: `${latest.destinationName} did not deliver ${latest.eventType} after ${latest.attemptCount} attempts.`,
      className: "border-2 border-amber-300 bg-[#0c1830] text-white shadow-[0_18px_50px_rgba(12,24,48,.45)] ring-2 ring-amber-300/30",
    });
  }, [latest, toast]);

  if (role !== "organisation_admin" || !latest) return null;

  async function markRead() {
    try {
      await apiRequest("PATCH", `/api/verify/webhook-notifications/${latest.id}/read`, {});
      await queryClient.invalidateQueries({ queryKey: ["/api/verify/webhook-notifications"] });
    } catch {
      toast({
        title: "Alert could not be dismissed",
        description: "Refresh the workspace and try again.",
        variant: "destructive",
      });
    }
  }

  return (
    <aside role="status" aria-live="polite" className="mx-auto mt-5 flex max-w-7xl flex-wrap items-center justify-between gap-4 rounded-xl border-2 border-amber-300 bg-[#fff8e5] px-4 py-3 text-[#392b07] shadow-sm sm:px-6">
      <div className="flex min-w-0 items-start gap-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-amber-200 text-amber-950"><BellRing className="h-4 w-4" /></span>
        <div>
          <p className="text-sm font-bold">Webhook delivery failed</p>
          <p className="mt-0.5 text-xs leading-5">
            <strong>{latest.destinationName}</strong> could not deliver {latest.eventType} after {latest.attemptCount} attempts.
            {latest.lastErrorCode ? ` Last outcome: ${latest.lastErrorCode}.` : ""}
            {" "}Email status: {latest.emailStatus.replace(/_/g, " ")}.
          </p>
        </div>
      </div>
      <div className="flex shrink-0 gap-2">
        <button type="button" onClick={onOpen} className="inline-flex min-h-9 items-center gap-1.5 rounded-lg bg-[#0c1830] px-3 text-xs font-semibold text-white"><ShieldAlert className="h-3.5 w-3.5" /> Review webhooks <ExternalLink className="h-3 w-3" /></button>
        <button type="button" onClick={() => void markRead()} aria-label="Dismiss webhook failure alert" className="grid h-9 w-9 place-items-center rounded-lg border border-amber-300 bg-white text-amber-950"><Check className="h-4 w-4" /></button>
      </div>
    </aside>
  );
}
