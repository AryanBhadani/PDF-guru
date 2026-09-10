export type WhatsAppSendInput = {
  phone: string;
  name: string;
  message: string;
  file: File;
};

export type WhatsAppSendResult = {
  ok: boolean;
  messageId?: string;
  error?: string;
};

export type WhatsAppConfigStatus = {
  configured: boolean;
};

export function normalizePhone(value: string): string {
  return value.replace(/[^\d]/g, "");
}

export function isValidWhatsAppPhone(value: string): boolean {
  const digits = normalizePhone(value);
  return digits.length >= 10 && digits.length <= 15;
}

export function interpolateMessage(template: string, name: string): string {
  return template.replace(/\{name\}/g, name.trim() || "there");
}

export function parseCustomerCsv(text: string): Array<{ name: string; phone: string; pdf: string }> {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (lines.length === 0) return [];

  const header = splitCsvLine(lines[0]).map((part) => part.toLowerCase());
  const hasHeader = header.includes("name") || header.includes("phone") || header.includes("pdf");
  const rows = hasHeader ? lines.slice(1) : lines;
  const nameIndex = hasHeader ? Math.max(0, header.indexOf("name")) : 0;
  const phoneIndex = hasHeader ? Math.max(1, header.indexOf("phone")) : 1;
  const pdfIndex = hasHeader ? Math.max(2, header.indexOf("pdf")) : 2;

  return rows.map((line) => {
    const cols = splitCsvLine(line);
    return {
      name: cols[nameIndex] || "",
      phone: cols[phoneIndex] || "",
      pdf: cols[pdfIndex] || "",
    };
  });
}

function splitCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let quoted = false;
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === '"') {
      if (quoted && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        quoted = !quoted;
      }
    } else if (char === "," && !quoted) {
      result.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

export async function getWhatsAppConfigStatus(): Promise<WhatsAppConfigStatus> {
  const response = await fetch("/api/whatsapp/status", { method: "GET" });
  if (!response.ok) return { configured: false };
  return (await response.json()) as WhatsAppConfigStatus;
}

export async function sendWhatsAppDocument(input: WhatsAppSendInput): Promise<WhatsAppSendResult> {
  const form = new FormData();
  form.set("phone", normalizePhone(input.phone));
  form.set("name", input.name);
  form.set("message", input.message);
  form.set("file", input.file, input.file.name);

  const response = await fetch("/api/whatsapp/send", {
    method: "POST",
    body: form,
  });

  let payload: WhatsAppSendResult | null = null;
  try {
    payload = (await response.json()) as WhatsAppSendResult;
  } catch {
    payload = null;
  }

  if (!response.ok || !payload?.ok) {
    return {
      ok: false,
      error: payload?.error || "WhatsApp Cloud API did not accept this message.",
    };
  }

  return payload;
}
