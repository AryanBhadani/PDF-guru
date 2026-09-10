import type { PdfSummary, SummaryRequest } from "@/types/ai";

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function summarizePdf(request: SummaryRequest): Promise<PdfSummary> {
  await delay(900 + Math.floor(Math.random() * 500));

  const pages = request.pageCount;
  const sizeKb = Math.max(1, Math.round(request.sizeBytes / 1024));

  return {
    english: [
      `Summary of ${request.fileName}`,
      "",
      `This PDF contains ${pages} page${pages === 1 ? "" : "s"} and is about ${sizeKb} KB.`,
      "PDF Guru extracted the document structure and produced a concise overview of its likely contents.",
      "Key points typically include the document purpose, important sections, dates, and action items.",
      "Replace this mock service in lib/ai-summary.ts with OpenAI or Gemini when you are ready.",
    ].join("\n"),
    hindi: [
      `${request.fileName} का सारांश`,
      "",
      `इस PDF में ${pages} पृष्ठ हैं और इसका आकार लगभग ${sizeKb} KB है।`,
      "PDF Guru ने दस्तावेज़ की संरचना पढ़कर एक संक्षिप्त सार तैयार किया है।",
      "मुख्य बिंदुओं में दस्तावेज़ का उद्देश्य, महत्वपूर्ण खंड, तिथियाँ और अगले कदम शामिल हो सकते हैं।",
      "असली OpenAI या Gemini API जोड़ने के लिए lib/ai-summary.ts बदलें।",
    ].join("\n"),
  };
}
