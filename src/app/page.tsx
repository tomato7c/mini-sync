"use client";

import { useState, useCallback } from "react";
import SparkMD5 from "spark-md5";

export default function Home() {
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [md5, setMd5] = useState<string>("");
  const [uid, setUid] = useState<string>("");
  const [orderId, setOrderId] = useState<string>("");
  const [uploading, setUploading] = useState(false);
  const [uploadedUrl, setUploadedUrl] = useState<string>("");
  const [error, setError] = useState<string>("");

  const calculateMD5 = useCallback((file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const spark = new SparkMD5.ArrayBuffer();
      const fileReader = new FileReader();
      const chunkSize = 2097152; // 2MB chunks
      let chunks = Math.ceil(file.size / chunkSize);
      let currentChunk = 0;

      fileReader.onload = (e) => {
        if (e.target?.result) {
          spark.append(e.target.result as ArrayBuffer);
          currentChunk++;

          if (currentChunk < chunks) {
            loadNext();
          } else {
            resolve(spark.end());
          }
        }
      };

      fileReader.onerror = () => {
        reject(new Error("Failed to read file"));
      };

      const loadNext = () => {
        const start = currentChunk * chunkSize;
        const end = start + chunkSize >= file.size ? file.size : start + chunkSize;
        fileReader.readAsArrayBuffer(file.slice(start, end));
      };

      loadNext();
    });
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    setError("");

    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && droppedFile.type.startsWith("image/")) {
      setFile(droppedFile);
      try {
        const hash = await calculateMD5(droppedFile);
        setMd5(hash);
      } catch (err) {
        setError("Failed to calculate MD5");
      }
    } else {
      setError("Please drop an image file");
    }
  }, [calculateMD5]);

  const handleFileInput = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setError("");
      try {
        const hash = await calculateMD5(selectedFile);
        setMd5(hash);
      } catch (err) {
        setError("Failed to calculate MD5");
      }
    }
  }, [calculateMD5]);

  const handleUpload = async () => {
    if (!file || !md5 || !uid || !orderId) {
      setError("请填写所有必填字段");
      return;
    }

    setUploading(true);
    setError("");

    try {
      // Upload to R2
      const uploadFormData = new FormData();
      uploadFormData.append("file", file);
      uploadFormData.append("md5", md5);

      const uploadRes = await fetch("/api/upload", {
        method: "POST",
        body: uploadFormData,
      });

      if (!uploadRes.ok) {
        throw new Error("Upload failed");
      }

      const uploadData = await uploadRes.json();

      // Save to D1
      const saveRes = await fetch("/api/save", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          uid,
          name: file.name,
          desc: "",
          link: md5,
          orderId,
        }),
      });

      if (!saveRes.ok) {
        throw new Error("Save failed");
      }

      setUploadedUrl(uploadData.url);
      setFile(null);
      setMd5("");
      setUid("");
      setOrderId("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-zinc-50 to-zinc-100 dark:from-black dark:to-zinc-950 p-4 sm:p-8">
      <main className="w-full max-w-xl">
        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50 mb-2">
            图片同步
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            上传图片到云端存储
          </p>
        </div>

        {/* Card */}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-zinc-200 dark:border-zinc-800 p-6 sm:p-8">
          {/* Drop Zone */}
          <div
            onDrop={handleDrop}
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            className={`relative border-2 border-dashed rounded-xl p-8 sm:p-12 text-center transition-all duration-200 cursor-pointer mb-6 ${
              isDragging
                ? "border-blue-500 bg-blue-50/50 dark:bg-blue-950/20 scale-[1.02]"
                : "border-zinc-300 dark:border-zinc-700 hover:border-zinc-400 dark:hover:border-zinc-600 hover:bg-zinc-50/50 dark:hover:bg-zinc-800/20"
            }`}
          >
            <input
              type="file"
              accept="image/*"
              onChange={handleFileInput}
              className="hidden"
              id="file-input"
              disabled={uploading}
            />
            <label htmlFor="file-input" className="cursor-pointer block">
              {file ? (
                <div className="space-y-3">
                  <div className="w-16 h-16 mx-auto bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                    <svg className="w-8 h-8 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <p className="text-base font-medium text-zinc-900 dark:text-zinc-50 truncate px-4">
                    {file.name}
                  </p>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">
                    {(file.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="w-16 h-16 mx-auto bg-zinc-100 dark:bg-zinc-800 rounded-full flex items-center justify-center">
                    <svg className="w-8 h-8 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-base font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                      拖拽图片到这里
                    </p>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">
                      或点击选择文件
                    </p>
                  </div>
                </div>
              )}
            </label>
          </div>

          {/* MD5 Display */}
          {md5 && (
            <div className="mb-6 p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl border border-zinc-200 dark:border-zinc-700">
              <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-2 uppercase tracking-wide">
                MD5 Hash
              </p>
              <code className="text-sm font-mono text-zinc-900 dark:text-zinc-100 break-all">
                {md5}
              </code>
            </div>
          )}

          {/* Form Fields */}
          <div className="mb-6 grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="uid" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                UID
              </label>
              <input
                type="text"
                id="uid"
                value={uid}
                onChange={(e) => setUid(e.target.value)}
                placeholder="输入用户ID"
                disabled={uploading}
                className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-zinc-900 dark:text-zinc-50 placeholder-zinc-400 dark:placeholder-zinc-500 disabled:opacity-50"
              />
            </div>

            <div>
              <label htmlFor="orderId" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                排序ID
              </label>
              <input
                type="text"
                id="orderId"
                value={orderId}
                onChange={(e) => setOrderId(e.target.value)}
                placeholder="输入排序ID"
                disabled={uploading}
                className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-zinc-900 dark:text-zinc-50 placeholder-zinc-400 dark:placeholder-zinc-500 disabled:opacity-50"
              />
            </div>
          </div>

          {/* Upload Button */}
          <button
            onClick={handleUpload}
            disabled={!file || !md5 || !uid || !orderId || uploading}
            className={`w-full py-3.5 px-6 rounded-xl font-medium transition-all duration-200 ${
              !file || !md5 || !uid || !orderId || uploading
                ? "bg-zinc-200 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-500 cursor-not-allowed"
                : "bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-200 active:scale-[0.98] cursor-pointer shadow-lg hover:shadow-xl"
            }`}
          >
            {uploading ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                上传中...
              </span>
            ) : (
              "上传图片"
            )}
          </button>

          {/* Error Message */}
          {error && (
            <div className="mt-4 p-4 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/30 rounded-xl">
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}

          {/* Success Message */}
          {uploadedUrl && (
            <div className="mt-4 p-4 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900/30 rounded-xl">
              <p className="text-sm font-medium text-green-700 dark:text-green-400 mb-2">
                ✓ 上传成功
              </p>
              <a
                href={uploadedUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-blue-600 dark:text-blue-400 hover:underline break-all block"
              >
                {uploadedUrl}
              </a>
            </div>
          )}
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-zinc-400 dark:text-zinc-600 mt-6">
          支持 JPG、PNG、GIF 等图片格式
        </p>
      </main>
    </div>
  );
}
