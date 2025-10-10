"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface KpiCardsProps {
  todayCount: number;
  weekCount: number;
  cancelRate: number;
}

export function KpiCards({ todayCount, weekCount, cancelRate }: KpiCardsProps) {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium text-muted-foreground">Buchungen heute</CardTitle>
        </CardHeader>
        <CardContent className="text-3xl font-semibold">{todayCount}</CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium text-muted-foreground">Buchungen diese Woche</CardTitle>
        </CardHeader>
        <CardContent className="text-3xl font-semibold">{weekCount}</CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium text-muted-foreground">Stornoquote</CardTitle>
        </CardHeader>
        <CardContent className="text-3xl font-semibold">{cancelRate.toFixed(0)}%</CardContent>
      </Card>
    </div>
  );
}
