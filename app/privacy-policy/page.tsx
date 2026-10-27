import { APP_NAME } from "@/lib/constants";
import { createPageMetadata } from "@/lib/metadata";

export const metadata = createPageMetadata(
  "Privacy Policy",
  `Learn how ${APP_NAME} handles your data and privacy.`,
  "/privacy-policy"
);

export default function PrivacyPolicyPage() {
  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-12">
      <div className="space-y-8">
        <div>
          <h1 className="text-4xl font-bold tracking-tight">Privacy Policy</h1>
          <p className="mt-2 text-muted-foreground">Last updated: October 2024</p>
        </div>

        <div className="space-y-6 prose prose-slate dark:prose-invert max-w-none">
          <section>
            <h2 className="text-2xl font-semibold">Introduction</h2>
            <p>
              {APP_NAME} (&ldquo;we,&rdquo; &ldquo;our,&rdquo; or &ldquo;the Service&rdquo;) is committed to protecting your privacy. This Privacy Policy explains how we handle your information when you use our online PDF tools.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold">Information We Collect</h2>
            <p>We collect the following types of information:</p>
            <ul>
              <li><strong>Files you upload:</strong> PDFs, images, and other documents you process through our tools.</li>
              <li><strong>Usage data:</strong> Basic information about how you interact with our service, such as which tools you use.</li>
              <li><strong>Technical data:</strong> Browser type, device type, and operating system for compatibility and performance improvements.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold">How We Process Your Files</h2>
            <p>
              Most {APP_NAME} tools process your files entirely in your browser using client-side JavaScript. Your files are not uploaded to our servers for processing. This includes tools like:
            </p>
            <ul>
              <li>Merge, Split, Compress PDF</li>
              <li>PDF to Image, Image to PDF</li>
              <li>PDF Editor, Clean PDF</li>
              <li>Photo to PDF, Screenshot Editor</li>
              <li>And most other PDF conversion and editing tools</li>
            </ul>
            <p>
              <strong>Exception:</strong> The Bulk WhatsApp tool uses the official WhatsApp Cloud API to send PDFs. Files uploaded for this feature are transmitted to WhatsApp&apos;s servers according to their privacy policy.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold">Data Storage and Retention</h2>
            <p>
              For client-side tools, your files never leave your device. We do not store, retain, or have access to your documents. Once you close your browser or refresh the page, any temporary data is cleared.
            </p>
            <p>
              For the WhatsApp Cloud API integration, file transmission and storage are handled by WhatsApp/Meta according to their terms and privacy policy.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold">Cookies and Local Storage</h2>
            <p>
              We use minimal cookies and local storage for essential functionality:
            </p>
            <ul>
              <li><strong>Theme preference:</strong> Stores your light/dark mode choice using the next-themes library.</li>
              <li><strong>Language preference:</strong> Stores your selected language for consistent localization.</li>
            </ul>
            <p>
              We do not currently use analytics cookies, advertising trackers, or third-party marketing scripts. Optional Google Analytics 4 integration may be enabled in the future through environment variable configuration for basic usage analytics only. No sensitive file contents, personal data, or uploaded documents are tracked.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold">Third-Party Services</h2>
            <p>
              We use the following third-party services:
            </p>
            <ul>
              <li><strong>Google Fonts:</strong> For typography. Fonts are loaded from Google&apos;s CDN.</li>
              <li><strong>WhatsApp Cloud API:</strong> For the Bulk WhatsApp feature. File transmission is handled by WhatsApp/Meta.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold">Security</h2>
            <p>
              We implement reasonable security measures to protect your information. However, no method of transmission over the internet is 100% secure. We cannot guarantee absolute security.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold">Your Rights</h2>
            <p>
              Depending on your location, you may have the following rights:
            </p>
            <ul>
              <li>Access to your personal data</li>
              <li>Correction of inaccurate data</li>
              <li>Deletion of your data (where applicable)</li>
              <li>Restriction of processing</li>
              <li>Data portability</li>
              <li>Objection to processing</li>
            </ul>
            <p>
              Since most processing happens client-side on your device, you maintain control over your files at all times. For the Bulk WhatsApp feature, data is transmitted to WhatsApp/Meta according to their policies. To exercise rights related to data processed by WhatsApp, please refer to WhatsApp&apos;s privacy policy.
            </p>
            <p>
              To exercise your rights regarding {APP_NAME}, please contact us at <a href="mailto:aryanbhadani48@gmail.com" className="text-primary hover:underline">aryanbhadani48@gmail.com</a>.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold">Children&apos;s Privacy</h2>
            <p>
              Our service is not directed to children under 13. We do not knowingly collect personal information from children.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold">International Data Transfers</h2>
            <p>
              Your information may be transferred to and processed in countries other than your country of residence. This includes when you use third-party services like Google Fonts or WhatsApp Cloud API.
            </p>
            <p>
              <strong>Google Fonts:</strong> Fonts are loaded from Google&apos;s servers, which may be located outside your country of residence. Google Fonts may collect IP addresses and other technical information. Refer to Google&apos;s privacy policy for details.
            </p>
            <p>
              <strong>WhatsApp Cloud API:</strong> When using the Bulk WhatsApp feature, your files, phone numbers, and messages are transmitted to WhatsApp/Meta servers, which may be located outside your country of residence. This processing is governed by WhatsApp&apos;s and Meta&apos;s privacy policies.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold">Changes to This Policy</h2>
            <p>
              We may update this Privacy Policy from time to time. We will notify you of significant changes by posting the new policy on this page with an updated effective date.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold">Contact Us</h2>
            <p>
              If you have questions about this Privacy Policy or our data practices, please contact us at:
            </p>
            <p>
              <strong>Email:</strong> <a href="mailto:aryanbhadani48@gmail.com" className="text-primary hover:underline">aryanbhadani48@gmail.com</a>
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
