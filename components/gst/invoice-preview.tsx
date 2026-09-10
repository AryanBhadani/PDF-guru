"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatMoney } from "@/lib/gst";
import type { InvoiceFormData, InvoiceTotals } from "@/types/invoice";

type InvoicePreviewProps = {
  data: InvoiceFormData;
  totals: InvoiceTotals;
};

export function InvoicePreview({ data, totals }: InvoicePreviewProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Preview</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <p className="text-xs uppercase text-muted-foreground">Seller</p>
            <p className="font-medium">{data.seller.name || "—"}</p>
            <p className="text-muted-foreground">{data.seller.state || "State not set"}</p>
          </div>
          <div>
            <p className="text-xs uppercase text-muted-foreground">Buyer</p>
            <p className="font-medium">{data.buyer.name || "—"}</p>
            <p className="text-muted-foreground">{data.buyer.state || "State not set"}</p>
          </div>
        </div>
        <p className="text-muted-foreground">
          {totals.isIntraState ? "Intra-state: CGST + SGST" : "Inter-state: IGST"}
        </p>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px] text-left">
            <thead>
              <tr className="border-b text-xs text-muted-foreground">
                <th className="py-2 pr-2">Item</th>
                <th className="py-2 pr-2">Qty</th>
                <th className="py-2 pr-2">Rate</th>
                <th className="py-2 pr-2">Taxable</th>
                <th className="py-2">Total</th>
              </tr>
            </thead>
            <tbody>
              {totals.lines.map((line) => (
                <tr key={line.id} className="border-b last:border-0">
                  <td className="py-2 pr-2">{line.description || "Untitled"}</td>
                  <td className="py-2 pr-2">{line.quantity}</td>
                  <td className="py-2 pr-2">{formatMoney(line.rate)}</td>
                  <td className="py-2 pr-2">{formatMoney(line.taxable)}</td>
                  <td className="py-2">{formatMoney(line.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="space-y-1 border-t pt-3">
          <Row label="Taxable" value={formatMoney(totals.taxable)} />
          <Row label="CGST" value={formatMoney(totals.cgst)} />
          <Row label="SGST" value={formatMoney(totals.sgst)} />
          <Row label="IGST" value={formatMoney(totals.igst)} />
          <Row label="Grand total" value={formatMoney(totals.total)} strong />
        </div>
      </CardContent>
    </Card>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className={strong ? "font-semibold" : "text-muted-foreground"}>{label}</span>
      <span className={strong ? "font-semibold" : ""}>{value}</span>
    </div>
  );
}
