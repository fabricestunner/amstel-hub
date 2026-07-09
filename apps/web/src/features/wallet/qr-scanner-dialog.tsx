'use client';

import type { Html5Qrcode } from 'html5-qrcode';
import { AlertCircle, Loader2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

const READER_ID = 'qr-reader-region';

interface QrScannerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called once with the decoded text; the dialog then closes. */
  onScan: (value: string) => void;
}

/**
 * Camera QR scanner in a modal. Uses html5-qrcode, loaded lazily so it never
 * runs during SSR. The camera is always stopped on close/unmount to release
 * the device.
 */
export function QrScannerDialog({
  open,
  onOpenChange,
  onScan,
}: QrScannerDialogProps) {
  const [status, setStatus] = useState<'starting' | 'scanning' | 'error'>(
    'starting',
  );
  const [errorMsg, setErrorMsg] = useState('');
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const handledRef = useRef(false);

  useEffect(() => {
    if (!open) return;

    handledRef.current = false;
    setStatus('starting');
    setErrorMsg('');
    let cancelled = false;

    async function start() {
      try {
        const { Html5Qrcode } = await import('html5-qrcode');
        if (cancelled) return;
        const scanner = new Html5Qrcode(READER_ID);
        scannerRef.current = scanner;

        await scanner.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: { width: 220, height: 220 } },
          (decodedText: string) => {
            if (handledRef.current) return;
            handledRef.current = true;
            onScan(decodedText.trim());
            onOpenChange(false);
          },
          () => {
            // per-frame decode failures are expected; ignore
          },
        );
        if (!cancelled) setStatus('scanning');
      } catch (err) {
        if (cancelled) return;
        setStatus('error');
        setErrorMsg(
          err instanceof Error && /permission|NotAllowed/i.test(err.message)
            ? 'Camera access was blocked. Allow camera permission and try again, or type the code manually.'
            : 'Could not start the camera. Type the code manually instead.',
        );
      }
    }

    void start();

    return () => {
      cancelled = true;
      const scanner = scannerRef.current;
      scannerRef.current = null;
      if (scanner) {
        // stop() rejects if already stopped; swallow.
        scanner
          .stop()
          .then(() => scanner.clear())
          .catch(() => undefined);
      }
    };
  }, [open, onScan, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Scan a QR code</DialogTitle>
          <DialogDescription>
            Point your camera at the QR code on your Amstel voucher or product.
          </DialogDescription>
        </DialogHeader>

        <div className="relative overflow-hidden rounded-lg border bg-black/90">
          {/* html5-qrcode renders the video stream into this region */}
          <div id={READER_ID} className="mx-auto w-full [&_video]:rounded-lg" />

          {status === 'starting' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-white">
              <Loader2 className="h-6 w-6 animate-spin" />
              <p className="text-sm">Starting camera…</p>
            </div>
          )}

          {status === 'error' && (
            <div className="flex flex-col items-center justify-center gap-2 p-8 text-center">
              <AlertCircle className="h-8 w-8 text-destructive" />
              <p className="text-sm text-muted-foreground">{errorMsg}</p>
            </div>
          )}
        </div>

        {status === 'scanning' && (
          <p className="text-center text-xs text-muted-foreground">
            Hold steady. The code is detected automatically.
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}
