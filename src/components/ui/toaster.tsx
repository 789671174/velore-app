"use client";

import { Toaster } from "sonner";

export function AppToaster() {
  return (
    <Toaster
      richColors
      position="top-right"
      toastOptions={{
        classNames: {
          toast: "bg-popover text-popover-foreground border border-border",
          closeButton: "text-muted-foreground",
        },
      }}
    />
  );
}
