'use client';

import { Table2 } from 'lucide-react';

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
            <CardFooter>
              <Button
                variant="outline"
                size="sm"
                disabled={exportReport.isPending}
                aria-label={`Download ${r.title} as CSV`}
                onClick={() => exportReport.mutate({ type: r.type })}
              >
                <Table2 className="h-4 w-4" /> Download CSV
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
}
