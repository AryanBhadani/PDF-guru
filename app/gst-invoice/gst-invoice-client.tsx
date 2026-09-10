"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { PdfToolLayout } from "@/components/pdf/pdf-tool-layout";
import { DownloadButton } from "@/components/pdf/download-button";
import { BuyerForm } from "@/components/gst/buyer-form";
import { InvoiceItems } from "@/components/gst/invoice-items";
import { InvoicePreview } from "@/components/gst/invoice-preview";
import { SellerForm } from "@/components/gst/seller-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  calculateInvoice,
  createEmptyItem,
  emptyParty,
  generateInvoicePdf,
  validateInvoice,
} from "@/lib/gst";
import { downloadBlob, todayIsoDate } from "@/lib/utils";
import type { InvoiceFormData } from "@/types/invoice";

const initialData: InvoiceFormData = {
  seller: emptyParty(),
  buyer: emptyParty(),
  meta: {
    invoiceNumber: "INV-001",
    date: todayIsoDate(),
  },
  items: [createEmptyItem()],
};

export function GstInvoiceClient() {
  const [data, setData] = useState<InvoiceFormData>(initialData);
  const [loading, setLoading] = useState(false);
  const totals = useMemo(() => calculateInvoice(data), [data]);

  const generate = () => {
    const error = validateInvoice(data);
    if (error) {
      toast.error(error);
      return;
    }
    setLoading(true);
    try {
      const blob = generateInvoicePdf(data);
      downloadBlob(blob, `pdf-guru-invoice-${data.meta.invoiceNumber}.pdf`);
      toast.success("Invoice PDF ready.");
    } catch {
      toast.error("Could not generate the invoice PDF.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <PdfToolLayout
      title="GST Invoice Generator"
      description="Fill seller, buyer, and items. PDF Guru calculates GST and builds a professional invoice."
    >
      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <SellerForm
              value={data.seller}
              disabled={loading}
              onChange={(seller) => setData((current) => ({ ...current, seller }))}
            />
            <BuyerForm
              value={data.buyer}
              disabled={loading}
              onChange={(buyer) => setData((current) => ({ ...current, buyer }))}
            />
          </div>
          <Card>
            <CardHeader>
              <CardTitle>Invoice</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="invoice-number">Invoice number</Label>
                <Input
                  id="invoice-number"
                  value={data.meta.invoiceNumber}
                  disabled={loading}
                  onChange={(event) =>
                    setData((current) => ({
                      ...current,
                      meta: { ...current.meta, invoiceNumber: event.target.value },
                    }))
                  }
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="invoice-date">Date</Label>
                <Input
                  id="invoice-date"
                  type="date"
                  value={data.meta.date}
                  disabled={loading}
                  onChange={(event) =>
                    setData((current) => ({
                      ...current,
                      meta: { ...current.meta, date: event.target.value },
                    }))
                  }
                />
              </div>
            </CardContent>
          </Card>
          <InvoiceItems
            items={data.items}
            disabled={loading}
            onChange={(items) => setData((current) => ({ ...current, items }))}
            onAdd={() => setData((current) => ({ ...current, items: [...current.items, createEmptyItem()] }))}
          />
          <DownloadButton
            label="Download invoice PDF"
            loadingLabel="Creating invoice…"
            loading={loading}
            onClick={generate}
          />
        </div>
        <InvoicePreview data={data} totals={totals} />
      </div>
    </PdfToolLayout>
  );
}
