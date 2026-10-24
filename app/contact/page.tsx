"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Mail, MessageSquare } from "lucide-react";

const SUPPORT_EMAIL = "aryanbhadani48@gmail.com";

export default function ContactPage() {
  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-12">
      <div className="space-y-8">
        <div>
          <h1 className="text-4xl font-bold tracking-tight">Contact Us</h1>
          <p className="mt-2 text-muted-foreground">
            Have questions or feedback? We&apos;d love to hear from you.
          </p>
        </div>

        <div className="grid gap-8 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                Email Support
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p>
                For general inquiries, bug reports, or feature requests, please email us directly.
              </p>
              <div className="space-y-2">
                <Label htmlFor="email">Support Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={SUPPORT_EMAIL}
                  readOnly
                  className="bg-muted"
                />
              </div>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => window.location.href = `mailto:${SUPPORT_EMAIL}`}
              >
                <Mail className="mr-2 h-4 w-4" />
                Send Email
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Quick Feedback
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Note: This form is a placeholder. To enable form submissions, integrate with a form service or backend API.
              </p>
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="name">Name</Label>
                  <Input id="name" placeholder="Your name" disabled />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contact-email">Email</Label>
                  <Input id="contact-email" type="email" placeholder="your@email.com" disabled />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="message">Message</Label>
                  <Textarea
                    id="message"
                    placeholder="How can we help?"
                    rows={4}
                    disabled
                  />
                </div>
                <Button className="w-full" disabled>
                  Send Message
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                <em className="font-semibold">Note:</em> Form submissions are not currently available. Please use the email support option above to contact us.
              </p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Response Time</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              We typically respond to emails within 1-2 business days. For urgent matters, please clearly indicate the urgency in your subject line.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Before Contacting Us</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <ul className="list-disc list-inside space-y-1">
              <li>Check our <a href="/privacy-policy" className="text-primary hover:underline">Privacy Policy</a> for data handling questions</li>
              <li>Review our <a href="/terms-of-service" className="text-primary hover:underline">Terms of Service</a> for legal questions</li>
              <li>Try our tools again after clearing your browser cache if you encounter technical issues</li>
              <li>Include your browser type and version when reporting bugs</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
