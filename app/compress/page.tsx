"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import Navbar from "../layout/navbar";
import Footer from "../layout/footer";
import Link from "next/link";

interface ImageData {
  name: string;
  type: string;
  size: number;
  dataUrl: string;
}

interface CompressionResult {
  blobUrl: string;
  size: number;
  blob: Blob;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getMimeType(format: "jpg" | "png" | "webp"): string {
  if (format === "jpg") return "image/jpeg";
  if (format === "png") return "image/png";
  return "image/webp";
}

function getExtension(format: "jpg" | "png" | "webp"): string {
  return format === "jpg" ? "jpg" : format;
}

function getFormatFromMime(mime: string): string {
  if (mime.includes("jpeg") || mime.includes("jpg")) return "JPG";
  if (mime.includes("png")) return "PNG";
  if (mime.includes("webp")) return "WEBP";
  return "IMG";
}

export default function CompressPage() {
  const router = useRouter();
  const [quality, setQuality] = useState(80);
  const [debouncedQuality, setDebouncedQuality] = useState(80);
  const [scale, setScale] = useState(100);
  const [debouncedScale, setDebouncedScale] = useState(100);
  const [outputFormat, setOutputFormat] = useState<"jpg" | "png" | "webp">("webp");
  const [sliderPos, setSliderPos] = useState(50);
  const comparisonRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);

  // Image state
  const [imageData, setImageData] = useState<ImageData | null>(null);
  const [originalUrl, setOriginalUrl] = useState<string>("");
  const [compressedResult, setCompressedResult] = useState<CompressionResult | null>(null);
  const [imgWidth, setImgWidth] = useState(0);
  const [imgHeight, setImgHeight] = useState(0);
  const [isCompressing, setIsCompressing] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  // Canvas ref for compression
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const originalImageRef = useRef<HTMLImageElement | null>(null);

  // Load image from sessionStorage on mount
  useEffect(() => {
    const stored = sessionStorage.getItem("imlite_image");
    if (!stored) {
      router.push("/");
      return;
    }

    try {
      const data: ImageData = JSON.parse(stored);
      setImageData(data);
      setOriginalUrl(data.dataUrl);

      const img = new Image();
      img.onload = () => {
        setImgWidth(img.naturalWidth);
        setImgHeight(img.naturalHeight);
        originalImageRef.current = img;
        setIsLoaded(true);
      };

      img.onerror = () => {
        console.error("Failed to load image from blob URL. It may have expired.");
        router.push("/");
      };

      img.src = data.dataUrl;
    } catch (err) {
      console.error("Error parsing stored image data:", err);
      router.push("/");
    }
  }, [router]);

  // Compress function
  const compressImage = useCallback((q: number, fmt: "jpg" | "png" | "webp", s: number) => {
    const img = originalImageRef.current;
    if (!img) return;

    setIsCompressing(true);

    // Use requestAnimationFrame to allow UI to update
    requestAnimationFrame(() => {
      const canvas = canvasRef.current;
      if (!canvas) {
        setIsCompressing(false);
        return;
      }

      const targetWidth = Math.round(img.naturalWidth * (s / 100));
      const targetHeight = Math.round(img.naturalHeight * (s / 100));

      canvas.width = targetWidth;
      canvas.height = targetHeight;

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        setIsCompressing(false);
        return;
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

      const mimeType = getMimeType(fmt);
      const qualityValue = fmt === "png" ? undefined : q / 100;

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            setIsCompressing(false);
            return;
          }

          // Revoke previous blob URL
          setCompressedResult((prev) => {
            if (prev) URL.revokeObjectURL(prev.blobUrl);
            return null;
          });

          const blobUrl = URL.createObjectURL(blob);
          setCompressedResult({ blobUrl, size: blob.size, blob });
          setIsCompressing(false);
        },
        mimeType,
        qualityValue
      );
    });
  }, []);

  // Debounce quality updates
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuality(quality);
    }, 150);
    return () => clearTimeout(timer);
  }, [quality]);

  // Debounce scale updates
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedScale(scale);
    }, 150);
    return () => clearTimeout(timer);
  }, [scale]);

  // Run compression when image loads or settings change
  useEffect(() => {
    if (isLoaded) {
      compressImage(debouncedQuality, outputFormat, debouncedScale);
    }
  }, [isLoaded, debouncedQuality, outputFormat, debouncedScale, compressImage]);

  // Cleanup blob URLs on unmount
  useEffect(() => {
    return () => {
      if (compressedResult) URL.revokeObjectURL(compressedResult.blobUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Comparison slider logic
  const handleSliderMove = useCallback((clientX: number) => {
    if (!comparisonRef.current) return;
    const rect = comparisonRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const percent = Math.max(0, Math.min(100, (x / rect.width) * 100));
    setSliderPos(percent);
  }, []);

  const handleMouseDown = useCallback(() => {
    isDragging.current = true;
  }, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging.current) handleSliderMove(e.clientX);
    };
    const handleMouseUp = () => {
      isDragging.current = false;
    };
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [handleSliderMove]);

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (e.touches.length > 0) {
        handleSliderMove(e.touches[0].clientX);
      }
    },
    [handleSliderMove]
  );

  // Download handler
  const handleDownload = () => {
    if (!compressedResult || !imageData) return;
    const a = document.createElement("a");
    a.href = compressedResult.blobUrl;
    const baseName = imageData.name.replace(/\.[^/.]+$/, "");
    a.download = `${baseName}_compressed.${getExtension(outputFormat)}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // Reset handler
  const handleReset = () => {
    setQuality(80);
    setScale(100);
    setOutputFormat("webp");
  };

  // Calculated stats
  const originalSize = imageData?.size ?? 0;
  const compressedSize = compressedResult?.size ?? 0;
  const savings = originalSize > 0 ? Math.round((1 - compressedSize / originalSize) * 100) : 0;
  const originalFormatLabel = imageData ? getFormatFromMime(imageData.type) : "IMG";

  // Show nothing while redirecting
  if (!imageData) return null;

  return (
    <div className="page-wrapper">
      <Navbar />

      {/* Hidden canvas for compression */}
      <canvas ref={canvasRef} style={{ display: "none" }} />

      <main className="compress-layout">
        {/* ===== Main Content ===== */}
        <div className="compress-main">
          {/* Breadcrumb */}
          <div className="compress-topbar">
            <div className="breadcrumb">
              <Link href="/" className="breadcrumb-item">
                Dashboard
              </Link>
              <span className="breadcrumb-sep">›</span>
              <span className="breadcrumb-active">Compression</span>
            </div>
          </div>

          <h1 className="compress-title">Compression Result</h1>

          {/* Stats Row */}
          <div className="stats-row">
            <div className="stat-card">
              <span className="stat-label">ORIGINAL SIZE</span>
              <div className="stat-value-row">
                <span className="stat-value">{formatSize(originalSize)}</span>
                <svg className="stat-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                  <circle cx="9" cy="9" r="2" />
                  <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
                </svg>
              </div>
            </div>
            <div className="stat-card stat-card--success">
              <span className="stat-label stat-label--success">COMPRESSED SIZE</span>
              <div className="stat-value-row">
                <span className="stat-value">{isCompressing ? "…" : formatSize(compressedSize)}</span>
                <svg className="stat-icon stat-icon--success" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
              </div>
            </div>
            <div className="stat-card stat-card--savings">
              <span className="stat-label stat-label--savings">TOTAL SAVINGS</span>
              <div className="stat-value-row">
                <span className="stat-value">{isCompressing ? "…" : `-${savings}%`}</span>
              </div>
            </div>
          </div>

          {/* Image Comparison */}
          <div className="comparison-container" ref={comparisonRef} onMouseDown={handleMouseDown} onTouchMove={handleTouchMove}>
            {/* Original side */}
            <div className="comparison-image comparison-original">
              {originalUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={originalUrl} alt="Original" className="comparison-img" />
              ) : (
                <div className="comparison-placeholder">
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" opacity="0.3">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                    <circle cx="9" cy="9" r="2" />
                    <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
                  </svg>
                </div>
              )}
            </div>

            {/* Compressed side (revealed by slider) */}
            <div className="comparison-image comparison-compressed" style={{ clipPath: `inset(0 0 0 ${sliderPos}%)` }}>
              {compressedResult ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={compressedResult.blobUrl} alt="Compressed" className="comparison-img" />
              ) : (
                <div className="comparison-placeholder compressed-placeholder">
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" opacity="0.3">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                    <circle cx="9" cy="9" r="2" />
                    <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
                  </svg>
                </div>
              )}
            </div>

            {/* Labels */}
            <span className="comparison-label comparison-label--original">ORIGINAL</span>
            <span className="comparison-label comparison-label--compressed">COMPRESSED</span>

            {/* Slider handle */}
            <div className="comparison-slider" style={{ left: `${sliderPos}%` }}>
              <div className="slider-line" />
              <div className="slider-handle">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="15 18 9 12 15 6" />
                </svg>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </div>
            </div>
          </div>

          {/* File Info Bar */}
          <div className="file-info-bar">
            <div className="file-info-left">
              <span className="file-type-badge">{originalFormatLabel}</span>
              <div className="file-info-text">
                <span className="file-name">{imageData.name}</span>
                <span className="file-meta">
                  {Math.round(imgWidth * (debouncedScale / 100))} × {Math.round(imgHeight * (debouncedScale / 100))} px • RGB
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ===== Sidebar ===== */}
        <aside className="compress-sidebar">
          <div className="sidebar-header">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--purple-light)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
            <h2 className="sidebar-title">Settings</h2>
          </div>

          {/* Quality Slider */}
          <div className="setting-group">
            <div className="setting-label-row">
              <span className="setting-label">Image Quality</span>
              <span className="quality-value">{quality}%</span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              value={quality}
              onChange={(e) => setQuality(Number(e.target.value))}
              className="quality-slider"
              style={{
                background: `linear-gradient(to right, var(--purple) 0%, var(--purple) ${quality}%, #2a2a2a ${quality}%, #2a2a2a 100%)`,
              }}
            />
            <div className="quality-labels">
              <span>SMALLEST</span>
              <span>BEST QUALITY</span>
            </div>
          </div>

          {/* Scale Slider */}
          <div className="setting-group">
            <div className="setting-label-row">
              <span className="setting-label">Image Dimensions</span>
              <span className="quality-value">{scale}%</span>
            </div>
            <input
              type="range"
              min={10}
              max={100}
              value={scale}
              onChange={(e) => setScale(Number(e.target.value))}
              className="quality-slider"
              style={{
                background: `linear-gradient(to right, var(--purple) 0%, var(--purple) ${((scale - 10) / 90) * 100}%, #2a2a2a ${((scale - 10) / 90) * 100}%, #2a2a2a 100%)`,
              }}
            />
            <div className="quality-labels">
              <span>{Math.round(imgWidth * (scale / 100))}px</span>
              <span>{imgWidth}px</span>
            </div>

            {outputFormat === "png" && (
              <div
                style={{
                  marginTop: "12px",
                  padding: "10px",
                  borderRadius: "8px",
                  background: "rgba(168, 85, 247, 0.1)",
                  border: "1px solid rgba(168, 85, 247, 0.2)",
                  fontSize: "0.8rem",
                  color: "#cbd5e1",
                  display: "flex",
                  gap: "8px",
                }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--purple-light)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: "2px" }}>
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="16" x2="12" y2="12" />
                  <line x1="12" y1="8" x2="12.01" y2="8" />
                </svg>
                <span>
                  PNG is <strong>lossless</strong>. To reduce file size, try adjusting the <strong>Image Dimensions</strong>.
                </span>
              </div>
            )}
          </div>

          {/* Output Format */}
          <div className="setting-group">
            <span className="setting-label">Output Format</span>
            <div className="format-options">
              {(["jpg", "png", "webp"] as const).map((fmt) => (
                <button key={fmt} className={`format-btn ${outputFormat === fmt ? "format-btn--active" : ""}`} onClick={() => setOutputFormat(fmt)}>
                  {fmt === "jpg" && (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                      <circle cx="9" cy="9" r="2" />
                      <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
                    </svg>
                  )}
                  {fmt === "png" && (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M4 22h14a2 2 0 0 0 2-2V7l-5-5H6a2 2 0 0 0-2 2v4" />
                      <path d="M14 2v5h5" />
                      <path d="m3 15 2 2 4-4" />
                    </svg>
                  )}
                  {fmt === "webp" && (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
                      <path d="M8 21h8" />
                      <path d="M12 17v4" />
                    </svg>
                  )}
                  <span>{fmt.toUpperCase()}</span>
                  {fmt === "webp" && <span className="best-badge">BEST</span>}
                </button>
              ))}
            </div>
          </div>

          <div className="sidebar-actions">
            <button className="download-btn" onClick={handleDownload} disabled={!compressedResult || isCompressing}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              Download Saved Image
            </button>
            <button className="reset-btn" onClick={handleReset}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                <path d="M3 3v5h5" />
                <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
                <path d="M21 21v-5h-5" />
              </svg>
              Reset to Defaults
            </button>
            <p className="local-note">Processed locally in your browser.</p>
          </div>
        </aside>
      </main>

      <Footer />
    </div>
  );
}
