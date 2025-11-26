import { useState, useCallback } from 'react';
import Cropper from 'react-easy-crop';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { getCroppedImg } from '@/lib/canvasUtils';
import { Crop } from 'lucide-react';

interface ImageCropperDialogProps {
  isOpen: boolean;
  onClose: () => void;
  imageSrc: string | null;
  onCropComplete: (croppedFile: File, previewUrl: string) => void;
}

export function ImageCropperDialog({ isOpen, onClose, imageSrc, onCropComplete }: ImageCropperDialogProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const onCropChange = (crop: { x: number; y: number }) => {
    setCrop(crop);
  };

  const onZoomChange = (zoom: number) => {
    setZoom(zoom);
  };

  const onCropCompleteInternal = useCallback((_croppedArea: any, croppedAreaPixels: any) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleSave = async () => {
    if (!imageSrc || !croppedAreaPixels) return;
    
    try {
      setIsProcessing(true);
      // 1. Generate the cropped file using the utility
      const croppedFile = await getCroppedImg(imageSrc, croppedAreaPixels);
      
      // 2. Create a preview URL for UI
      const previewUrl = URL.createObjectURL(croppedFile);
      
      // 3. Pass back to parent
      onCropComplete(croppedFile, previewUrl);
      onClose();
    } catch (e) {
      console.error(e);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden gap-0">
        <DialogHeader className="p-4 z-10 bg-background/80 backdrop-blur-sm absolute top-0 left-0 right-0">
          <DialogTitle className="flex items-center gap-2">
            <Crop className="w-5 h-5" /> Crop Profile Photo
          </DialogTitle>
        </DialogHeader>

        <div className="relative h-[400px] w-full bg-black">
          {imageSrc && (
            <Cropper
              image={imageSrc}
              crop={crop}
              zoom={zoom}
              aspect={1} // 1:1 Aspect Ratio (Square)
              onCropChange={onCropChange}
              onCropComplete={onCropCompleteInternal}
              onZoomChange={onZoomChange}
              cropShape="round" // "rect" or "round" (Visual guide only)
              showGrid={false}
            />
          )}
        </div>

        <div className="p-4 space-y-4 bg-background">
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium min-w-[3rem]">Zoom</span>
            <Slider
              value={[zoom]}
              min={1}
              max={3}
              step={0.1}
              onValueChange={(value) => setZoom(value[0])}
              className="flex-1"
            />
          </div>
          
          <DialogFooter className="flex-row gap-2 justify-end">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isProcessing}>
              {isProcessing ? 'Processing...' : 'Set Profile Photo'}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}