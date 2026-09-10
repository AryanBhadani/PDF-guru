"use client";

import { useEffect, useMemo, useState } from "react";
import { MessageCircle, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { PdfToolLayout } from "@/components/pdf/pdf-tool-layout";
import { FileUpload } from "@/components/pdf/file-upload";
import { EmptyState } from "@/components/pdf/empty-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { MAX_PDF_COUNT, PDF_MIME_TYPE } from "@/lib/constants";
import { createId } from "@/lib/utils";
import {
  getWhatsAppConfigStatus,
  interpolateMessage,
  isValidWhatsAppPhone,
  parseCustomerCsv,
  sendWhatsAppDocument,
} from "@/lib/whatsapp";
import { useT } from "@/components/i18n/language-provider";

type PdfItem = { id: string; file: File; name: string };
type SendStatus = "pending" | "sent" | "failed";
type Customer = {
  id: string;
  name: string;
  phone: string;
  pdfId: string;
  status: SendStatus;
  error?: string;
};

export function BulkWhatsappClient() {
  const t = useT();
  const [pdfs, setPdfs] = useState<PdfItem[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [message, setMessage] = useState(t("tools.bulkWhatsapp.defaultMessage"));
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    getWhatsAppConfigStatus()
      .then((status) => setConfigured(status.configured))
      .catch(() => setConfigured(false));
  }, []);

  const stats = useMemo(() => {
    return customers.reduce(
      (acc, row) => {
        acc.total += 1;
        acc[row.status] += 1;
        return acc;
      },
      { total: 0, pending: 0, sent: 0, failed: 0 }
    );
  }, [customers]);

  const handlePdfs = (files: File[]) => {
    if (pdfs.length + files.length > MAX_PDF_COUNT) {
      toast.error(t("upload.maxPdfs", { count: MAX_PDF_COUNT }));
      return;
    }
    const next = files.map((file) => ({ id: createId(), file, name: file.name }));
    setPdfs((current) => [...current, ...next]);
    toast.success(t("upload.addedPdfs", { count: next.length }));
  };

  const addCustomer = () => {
    setCustomers((current) => [
      ...current,
      { id: createId(), name: "", phone: "", pdfId: pdfs[0]?.id || "", status: "pending" },
    ]);
  };

  const importCsv = async (file: File) => {
    const text = await file.text();
    const rows = parseCustomerCsv(text);
    if (rows.length === 0) {
      toast.error(t("errors.generic"));
      return;
    }
    setCustomers((current) => [
      ...current,
      ...rows.map((row) => ({
        id: createId(),
        name: row.name,
        phone: row.phone,
        pdfId: pdfs.find((pdf) => pdf.name.toLowerCase() === row.pdf.toLowerCase())?.id || pdfs[0]?.id || "",
        status: "pending" as const,
      })),
    ]);
  };

  const sendQueue = async (onlyFailed = false) => {
    if (!configured) {
      toast.error(t("tools.bulkWhatsapp.missingConfig"));
      return;
    }
    const queue = customers.filter((row) => (onlyFailed ? row.status === "failed" : row.status !== "sent"));
    if (queue.length === 0) return;

    for (const row of queue) {
      if (!row.name.trim()) {
        toast.error(t("tools.bulkWhatsapp.missingName"));
        return;
      }
      if (!isValidWhatsAppPhone(row.phone)) {
        toast.error(t("tools.bulkWhatsapp.invalidPhone"));
        return;
      }
      if (!row.pdfId || !pdfs.find((pdf) => pdf.id === row.pdfId)) {
        toast.error(t("tools.bulkWhatsapp.missingPdf"));
        return;
      }
    }

    setSending(true);
    for (const row of queue) {
      const pdf = pdfs.find((item) => item.id === row.pdfId);
      if (!pdf) continue;
      setCustomers((current) =>
        current.map((item) => (item.id === row.id ? { ...item, status: "pending", error: undefined } : item))
      );
      try {
        const result = await sendWhatsAppDocument({
          phone: row.phone,
          name: row.name,
          message: interpolateMessage(message, row.name),
          file: pdf.file,
        });
        if (!result.ok) {
          setCustomers((current) =>
            current.map((item) =>
              item.id === row.id ? { ...item, status: "failed", error: result.error } : item
            )
          );
          continue;
        }
        setCustomers((current) =>
          current.map((item) => (item.id === row.id ? { ...item, status: "sent", error: undefined } : item))
        );
      } catch (error) {
        setCustomers((current) =>
          current.map((item) =>
            item.id === row.id
              ? {
                  ...item,
                  status: "failed",
                  error: error instanceof Error ? error.message : t("errors.generic"),
                }
              : item
          )
        );
      }
    }
    setSending(false);
  };

  return (
    <PdfToolLayout title={t("tools.bulkWhatsapp.pageTitle")} description={t("tools.bulkWhatsapp.pageDesc")}>
      <div className="space-y-6">
        <p className="text-sm text-muted-foreground">{t("tools.bulkWhatsapp.onlyOfficial")}</p>
        <div className="rounded-lg border bg-card px-4 py-3 text-sm">
          {configured === null
            ? t("common.working")
            : configured
              ? t("common.configured")
              : t("tools.bulkWhatsapp.missingConfig")}
        </div>
        <FileUpload
          accept="application/pdf,.pdf"
          title={t("tools.bulkWhatsapp.dropPdfs")}
          hint={t("upload.hintPdf")}
          disabled={sending}
          allowedTypes={[PDF_MIME_TYPE]}
          onFiles={handlePdfs}
        />

        {pdfs.length === 0 ? (
          <EmptyState
            icon={<MessageCircle className="h-8 w-8" />}
            title={t("tools.bulkWhatsapp.emptyTitle")}
            hint={t("tools.bulkWhatsapp.emptyHint")}
          />
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>{t("tools.bulkWhatsapp.pdf")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {pdfs.map((pdf) => (
                <div key={pdf.id} className="flex items-center justify-between gap-2">
                  <span className="truncate">{pdf.name}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    disabled={sending}
                    onClick={() => setPdfs((current) => current.filter((item) => item.id !== pdf.id))}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle>{t("tools.bulkWhatsapp.customers")}</CardTitle>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" disabled={sending} onClick={addCustomer}>
                <Plus className="h-4 w-4" />
                {t("tools.bulkWhatsapp.addCustomer")}
              </Button>
              <label className="inline-flex">
                <input
                  type="file"
                  accept=".csv,text/csv"
                  className="hidden"
                  disabled={sending}
                  onChange={(event) => {
                    const next = event.target.files?.[0];
                    if (next) void importCsv(next);
                    event.target.value = "";
                  }}
                />
                <Button size="sm" variant="outline" disabled={sending} asChild>
                  <span>{t("tools.bulkWhatsapp.importCsv")}</span>
                </Button>
              </label>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">{t("tools.bulkWhatsapp.csvHint")}</p>
            {customers.map((row) => (
              <div key={row.id} className="grid gap-3 rounded-lg border p-3 md:grid-cols-4">
                <Input
                  placeholder={t("tools.bulkWhatsapp.name")}
                  value={row.name}
                  disabled={sending || row.status === "sent"}
                  onChange={(event) =>
                    setCustomers((current) =>
                      current.map((item) => (item.id === row.id ? { ...item, name: event.target.value } : item))
                    )
                  }
                />
                <Input
                  placeholder={t("tools.bulkWhatsapp.phone")}
                  value={row.phone}
                  disabled={sending || row.status === "sent"}
                  onChange={(event) =>
                    setCustomers((current) =>
                      current.map((item) => (item.id === row.id ? { ...item, phone: event.target.value } : item))
                    )
                  }
                />
                <NativeSelect
                  value={row.pdfId}
                  disabled={sending || row.status === "sent"}
                  onChange={(event) =>
                    setCustomers((current) =>
                      current.map((item) => (item.id === row.id ? { ...item, pdfId: event.target.value } : item))
                    )
                  }
                >
                  <option value="">{t("tools.bulkWhatsapp.pdf")}</option>
                  {pdfs.map((pdf) => (
                    <option key={pdf.id} value={pdf.id}>
                      {pdf.name}
                    </option>
                  ))}
                </NativeSelect>
                <div className="flex items-center justify-between gap-2 text-sm">
                  <span>
                    {row.status === "sent"
                      ? t("tools.bulkWhatsapp.sent")
                      : row.status === "failed"
                        ? t("tools.bulkWhatsapp.failed")
                        : t("tools.bulkWhatsapp.pending")}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    disabled={sending || row.status === "sent"}
                    onClick={() => setCustomers((current) => current.filter((item) => item.id !== row.id))}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                {row.error && <p className="md:col-span-4 text-sm text-destructive">{row.error}</p>}
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("tools.bulkWhatsapp.message")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Textarea value={message} disabled={sending} onChange={(event) => setMessage(event.target.value)} />
            <div>
              <Label>{t("tools.bulkWhatsapp.messagePreview")}</Label>
              <p className="mt-2 rounded-md border bg-muted/40 p-3 text-sm">
                {interpolateMessage(message, customers[0]?.name || "Asha")}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("tools.bulkWhatsapp.stats")}</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
            <Stat label={t("tools.bulkWhatsapp.total")} value={stats.total} />
            <Stat label={t("tools.bulkWhatsapp.pending")} value={stats.pending} />
            <Stat label={t("tools.bulkWhatsapp.sent")} value={stats.sent} />
            <Stat label={t("tools.bulkWhatsapp.failed")} value={stats.failed} />
          </CardContent>
        </Card>

        <div className="flex flex-col gap-3 sm:flex-row">
          <Button size="lg" disabled={sending || customers.length === 0} onClick={() => void sendQueue(false)}>
            {sending ? t("tools.bulkWhatsapp.sending") : t("tools.bulkWhatsapp.send")}
          </Button>
          <Button
            size="lg"
            variant="outline"
            disabled={sending || stats.failed === 0}
            onClick={() => void sendQueue(true)}
          >
            {t("common.retryFailed")}
          </Button>
        </div>
      </div>
    </PdfToolLayout>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border p-3">
      <p className="text-muted-foreground">{label}</p>
      <p className="text-xl font-semibold">{value}</p>
    </div>
  );
}
