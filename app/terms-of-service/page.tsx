import { APP_NAME } from "@/lib/constants";
import { createPageMetadata } from "@/lib/metadata";

export const metadata = createPageMetadata(
  "Terms of Service",
  `Terms and conditions for using ${APP_NAME}.`,
  "/terms-of-service"
);

export default function TermsOfServicePage() {
  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-12">
      <div className="space-y-8">
        <div>
          <h1 className="text-4xl font-bold tracking-tight">Terms of Service</h1>
          <p className="mt-2 text-muted-foreground">Last updated: October 2024</p>
        </div>

        <div className="space-y-6 prose prose-slate dark:prose-invert max-w-none">
          <section>
            <h2 className="text-2xl font-semibold">Agreement to Terms</h2>
            <p>
              By accessing or using {APP_NAME} (&ldquo;the Service&rdquo;), you agree to be bound by these Terms of Service (&ldquo;Terms&rdquo;). If you do not agree to these Terms, please do not use the Service.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold">Description of Service</h2>
            <p>
              {APP_NAME} provides free online PDF tools for processing, converting, and editing PDF documents. The Service includes tools for merging, splitting, compressing, converting, and editing PDFs, as well as related document processing features.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold">Acceptable Use</h2>
            <p>You agree to use the Service only for lawful purposes and in accordance with these Terms. You agree not to:</p>
            <ul>
              <li>Upload or process files that contain viruses, malware, or malicious code</li>
              <li>Use the Service to infringe on intellectual property rights of others</li>
              <li>Process documents containing illegal, harmful, threatening, abusive, or offensive content</li>
              <li>Attempt to reverse engineer, hack, or disrupt the Service</li>
              <li>Use the Service to harass, abuse, or harm others</li>
              <li>Violate any applicable laws or regulations</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold">User Responsibilities</h2>
            <p>You are solely responsible for:</p>
            <ul>
              <li>Ensuring you have the legal right to upload and process any files you submit</li>
              <li>Maintaining the security of your access credentials</li>
              <li>All activities that occur under your account</li>
              <li>Complying with all applicable laws when using the Service</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold">Intellectual Property</h2>
            <p>
              The Service and its original content, features, and functionality are owned by {APP_NAME} and are protected by international copyright, trademark, and other intellectual property laws.
            </p>
            <p>
              You retain ownership of any files you upload or process through the Service. By using the Service, you grant us a limited license to process your files solely for the purpose of providing the requested service.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold">Service Availability</h2>
            <p>
              We strive to maintain the Service&apos;s availability and functionality. However, we do not guarantee that the Service will be uninterrupted, secure, or error-free. We may suspend or discontinue the Service at any time with or without notice.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold">Disclaimer of Warranties</h2>
            <p>
              THE SERVICE IS PROVIDED &ldquo;AS IS&rdquo; AND &ldquo;AS AVAILABLE&rdquo; WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold">Limitation of Liability</h2>
            <p>
              TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, {APP_NAME} SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING BUT NOT LIMITED TO LOSS OF DATA, PROFITS, OR USE, ARISING FROM YOUR USE OF THE SERVICE.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold">Indemnification</h2>
            <p>
              You agree to indemnify and hold harmless {APP_NAME} and its affiliates from any claims, damages, or expenses arising from your use of the Service or violation of these Terms.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold">Termination</h2>
            <p>
              We reserve the right to terminate or suspend your access to the Service at any time, with or without cause, with or without notice.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold">Governing Law</h2>
            <p>
              These Terms shall be governed by and construed in accordance with the laws of India. Any disputes arising under these Terms shall be subject to the exclusive jurisdiction of the courts in India.
            </p>
            <p className="text-sm text-muted-foreground">
              <em>Note: The governing law and jurisdiction should be reviewed by a legal professional to ensure they are appropriate for your specific situation.</em>
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold">Changes to Terms</h2>
            <p>
              We reserve the right to modify these Terms at any time. We will notify users of significant changes by posting the updated Terms on this page. Your continued use of the Service after such changes constitutes acceptance of the new Terms.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold">Contact Information</h2>
            <p>
              If you have questions about these Terms of Service, please contact us at:
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
