"use client";

import { useState } from "react";
import { Star } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

const MAX_FEEDBACK_LENGTH = 500;

export function FeedbackForm() {
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [feedback, setFeedback] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = () => {
    if (rating === 0) {
      toast.error("Please select a rating");
      return;
    }

    if (feedback.trim().length === 0) {
      toast.error("Please provide your feedback");
      return;
    }

    // Currently, feedback is not saved to a backend
    // This is a frontend-ready form for future integration
    setSubmitted(true);
    toast.success("Thank you for your feedback! (Note: Submission not yet enabled)");
  };

  const handleReset = () => {
    setRating(0);
    setHoveredRating(0);
    setFeedback("");
    setSubmitted(false);
  };

  if (submitted) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Thank You!</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            Your feedback has been received. Note: Feedback submission is not yet enabled. To enable this feature, integrate with a backend service or database.
          </p>
          <Button onClick={handleReset} variant="outline">
            Submit Another Review
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Rate Your Experience</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">Overall Rating</label>
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => setRating(star)}
                onMouseEnter={() => setHoveredRating(star)}
                onMouseLeave={() => setHoveredRating(0)}
                className="focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded"
                aria-label={`Rate ${star} stars`}
              >
                <Star
                  className={`h-6 w-6 ${
                    star <= (hoveredRating || rating)
                      ? "fill-primary text-primary"
                      : "text-muted-foreground"
                  }`}
                />
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <label htmlFor="feedback" className="text-sm font-medium">
            Your Feedback (Optional)
          </label>
          <Textarea
            id="feedback"
            placeholder="Tell us what you liked or how we can improve..."
            value={feedback}
            onChange={(e) => {
              const value = e.target.value;
              if (value.length <= MAX_FEEDBACK_LENGTH) {
                setFeedback(value);
              }
            }}
            rows={4}
            maxLength={MAX_FEEDBACK_LENGTH}
          />
          <p className="text-xs text-muted-foreground text-right">
            {feedback.length} / {MAX_FEEDBACK_LENGTH}
          </p>
        </div>

        <div className="rounded-lg border bg-muted/50 px-4 py-3">
          <p className="text-xs text-muted-foreground">
            <strong>Note:</strong> Feedback submission is not yet enabled. This form is prepared for future backend integration. Currently, no data is saved.
          </p>
        </div>

        <Button onClick={handleSubmit} className="w-full" disabled={rating === 0}>
          Submit Feedback
        </Button>
      </CardContent>
    </Card>
  );
}
