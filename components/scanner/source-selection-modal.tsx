"use client";

import { useRef } from "react";
import { Camera, Images, Image as ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

interface SourceSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectCamera: () => void;
  onSelectPhotos: () => void;
  onSelectGallery: () => void;
}

export function SourceSelectionModal({
  isOpen,
  onClose,
  onSelectCamera,
  onSelectPhotos,
  onSelectGallery,
}: SourceSelectionModalProps) {
  const photosInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  const handlePhotosClick = () => {
    photosInputRef.current?.click();
  };

  const handleGalleryClick = () => {
    galleryInputRef.current?.click();
  };

  const handlePhotosChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      onSelectPhotos();
      e.target.value = "";
    }
  };

  const handleGalleryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      onSelectGallery();
      e.target.value = "";
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-neutral-900 border-t border-neutral-800 rounded-t-2xl p-4 pb-[max(env(safe-area-inset-bottom),1rem)] animate-in slide-in-from-bottom duration-200">
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-center mb-2">
            <div className="w-12 h-1 bg-neutral-700 rounded-full" />
          </div>

          <Button
            type="button"
            variant="ghost"
            className="w-full h-14 justify-start gap-4 text-white hover:bg-neutral-800 text-base font-medium"
            onClick={() => {
              onClose();
              onSelectCamera();
            }}
          >
            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/20">
              <Camera className="h-5 w-5 text-primary" />
            </div>
            Camera
          </Button>

          <Button
            type="button"
            variant="ghost"
            className="w-full h-14 justify-start gap-4 text-white hover:bg-neutral-800 text-base font-medium"
            onClick={handlePhotosClick}
          >
            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/20">
              <ImageIcon className="h-5 w-5 text-primary" />
            </div>
            Photos
          </Button>

          <Button
            type="button"
            variant="ghost"
            className="w-full h-14 justify-start gap-4 text-white hover:bg-neutral-800 text-base font-medium"
            onClick={handleGalleryClick}
          >
            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/20">
              <Images className="h-5 w-5 text-primary" />
            </div>
            Gallery
          </Button>

          <Button
            type="button"
            variant="ghost"
            className="w-full h-12 text-neutral-400 hover:text-white hover:bg-neutral-800 text-base font-medium mt-2"
            onClick={onClose}
          >
            Cancel
          </Button>
        </div>

        {/* Hidden file inputs */}
        <input
          ref={photosInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          multiple
          className="hidden"
          onChange={handlePhotosChange}
        />
        <input
          ref={galleryInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={handleGalleryChange}
        />
      </div>
    </>
  );
}
