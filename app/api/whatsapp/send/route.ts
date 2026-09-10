import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const GRAPH_VERSION = "v21.0";
const MAX_FILE_BYTES = 50 * 1024 * 1024;

type GraphError = {
  error?: {
    message?: string;
    error_user_msg?: string;
  };
};

function jsonError(message: string, status = 400) {
  return NextResponse.json({ ok: false, error: message }, { status });
}

function normalizePhone(value: string): string {
  return value.replace(/[^\d]/g, "");
}

export async function POST(request: Request) {
  const token = process.env.WHATSAPP_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;

  if (!token || !phoneNumberId) {
    return jsonError(
      "WhatsApp Cloud API is not configured. Add WHATSAPP_TOKEN and WHATSAPP_PHONE_NUMBER_ID on the server.",
      503
    );
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return jsonError("Invalid form data.");
  }

  const phone = normalizePhone(String(form.get("phone") || ""));
  const name = String(form.get("name") || "").trim();
  const message = String(form.get("message") || "").trim();
  const file = form.get("file");

  if (!phone || phone.length < 10 || phone.length > 15) {
    return jsonError("Enter a valid phone number with country code.");
  }
  if (!name) {
    return jsonError("Enter a customer name.");
  }
  if (!(file instanceof File) || file.size === 0) {
    return jsonError("Select a PDF for every customer.");
  }
  if (file.size > MAX_FILE_BYTES) {
    return jsonError("The PDF is larger than 50 MB.");
  }
  if (!file.name.toLowerCase().endsWith(".pdf") && file.type !== "application/pdf") {
    return jsonError("Only PDF files can be sent.");
  }

  const caption = message || `Hello ${name}, please find your PDF attached.`;

  try {
    const mediaForm = new FormData();
    mediaForm.set("messaging_product", "whatsapp");
    mediaForm.set("type", "document");
    mediaForm.set("file", file, file.name || "document.pdf");

    const uploadResponse = await fetch(
      `https://graph.facebook.com/${GRAPH_VERSION}/${phoneNumberId}/media`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: mediaForm,
      }
    );
    const uploadJson = (await uploadResponse.json()) as GraphError & { id?: string };
    if (!uploadResponse.ok || !uploadJson.id) {
      return jsonError(
        uploadJson.error?.error_user_msg ||
          uploadJson.error?.message ||
          "WhatsApp Cloud API did not accept this document.",
        502
      );
    }

    const sendResponse = await fetch(
      `https://graph.facebook.com/${GRAPH_VERSION}/${phoneNumberId}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: phone,
          type: "document",
          document: {
            id: uploadJson.id,
            filename: file.name || "document.pdf",
            caption,
          },
        }),
      }
    );
    const sendJson = (await sendResponse.json()) as GraphError & {
      messages?: Array<{ id?: string }>;
    };
    const messageId = sendJson.messages?.[0]?.id;
    if (!sendResponse.ok || !messageId) {
      return jsonError(
        sendJson.error?.error_user_msg ||
          sendJson.error?.message ||
          "WhatsApp Cloud API did not accept this message.",
        502
      );
    }

    return NextResponse.json({ ok: true, messageId });
  } catch {
    return jsonError("Could not reach WhatsApp Cloud API.", 502);
  }
}
