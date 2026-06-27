'use client';

import { FileSpreadsheet, FileText, Table2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import { useExportReport } from '@/features/analytics/use-analytics';

const REPORTS = [
  {
    type: 'loyalty',
    title: 'Loyalty activity',
    description: 'Points issued and redeemed across all customers.',
  },
  {
    type: 'campaigns',
    title: 'Campaign performance',
    description: 'Code generation and redemption per campaign.',
  },
  {
    type: 'rewards',
    title: 'Reward redemptions',
    description: 'Redemption requests, approvals and fulfilment.',
  },
  {
    type: 'outlets',
    title: 'Outlet performance',
    description: 'Sales, points and customer registrations by outlet.',
  },
];

export default function AdminReportsPage() {
  const exportReport = useExportReport();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reports"
        description="Generate and export platform reports."
      />
      <div className="grid gap-4 md:grid-cols-2">
        {REPORTS.map((r) => (
          <Card key={r.type}>
            <CardHeader>
              <CardTitle>{r.title}</CardTitle>
              <CardDescription>{r.description}</CardDescription>
            </CardHeader>
            <CardContent />
            <CardFooter className="gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={exportReport.isPending}
                onClick={() =>
                  exportReport.mutate({ type: r.type, format: 'csv' })
                }
              >
                <Table2 className="h-4 w-4" /> CSV
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={exportReport.isPending}
                onClick={() =>
                  exportReport.mutate({ type: r.type, format: 'excel' })
                }
              >
                <FileSpreadsheet className="h-4 w-4" /> Excel
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={exportReport.isPending}
                onClick={() =>
                  exportReport.mutate({ type: r.type, format: 'pdf' })
                }
              >
                <FileText className="h-4 w-4" /> PDF
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
}
