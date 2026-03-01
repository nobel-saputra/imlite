"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import Navbar from "./layout/navbar";
import Footer from "./layout/footer";

export default function Home() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingText, setLoadingText] = useState("Reading image…");
  const router = useRouter();

  // Clear previous session data when arriving at home page
  useEffect(() => {
    sessionStorage.removeItem("imlite_image");
  }, []);

  const handleBrowse = () => {
    fileInputRef.current?.click();
  };

  const processFile = useCallback(
    (file: File) => {
      if (!file || !file.type.startsWith("image/")) return;

      setIsLoading(true);
      setLoadingText("Reading image…");

      // Use a Blob URL instead of base64 to bypass sessionStorage limits (~5MB)
      const blobUrl = URL.createObjectURL(file);

      // Store metadata and blob URL reference
      const imageData = {
        name: file.name,
        type: file.type,
        size: file.size,
        dataUrl: blobUrl, // Reusing the key name 'dataUrl' to minimize changes elsewhere, but now holding a blob URL
      };

      try {
        sessionStorage.setItem("imlite_image", JSON.stringify(imageData));
      } catch {
        // This is now highly unlikely with a blob URL, but good to keep as a fallback
        alert("Metadata storage failed. Please try a different browser or clear storage.");
        setIsLoading(false);
        URL.revokeObjectURL(blobUrl);
        return;
      }

      setLoadingText("Preparing compression…");

      setTimeout(() => {
        setLoadingText("Almost ready…");
        setTimeout(() => {
          router.push("/compress");
        }, 600);
      }, 800);
    },
    [router]
  );

  const handleFiles = useCallback(
    (files: FileList | null) => {
      if (!files || files.length === 0) return;
      processFile(files[0]);
    },
    [processFile]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      handleFiles(e.dataTransfer.files);
    },
    [handleFiles]
  );

  return (
    <div className="page-wrapper">
      <Navbar />

      {/* Loading Overlay */}
      {isLoading && (
        <div className="loading-overlay">
          <div className="loading-content">
            <div className="loading-spinner" />
            <p className="loading-text">{loadingText}</p>
          </div>
        </div>
      )}

      {/* Hero Section */}
      <main className="main-content">
        <section className="hero">
          <h1 className="hero-title">
            <span className="block mb-4">Compress Images</span>
            <span className="bg-[#7c3aed] px-4 rounded-xl py-4 inline-block">Not Quality</span>
          </h1>
          <p className="hero-subtitle">Professional grade local compression. Your photos never leave your device, ensuring 100% privacy and blazing fast speeds.</p>
        </section>

        {/* Drop Zone */}
        <div className={`dropzone ${isDragging ? "dropzone-active" : ""}`} onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}>
          <div className="dropzone-icon">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242" />
              <path d="M12 12v9" />
              <path d="m16 16-4-4-4 4" />
            </svg>
          </div>
          <p className="dropzone-title">Drop files here to compress</p>
          <p className="dropzone-subtitle">Supports JPG, PNG, WebP up to 50MB</p>
          <button className="browse-btn" onClick={handleBrowse}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
            </svg>
            Browse Files
          </button>
          <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="file-input-hidden" onChange={(e) => handleFiles(e.target.files)} />
        </div>
      </main>

      <Footer />
    </div>
  );
}
