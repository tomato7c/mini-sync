"use client";

import { useState, useCallback } from "react";
import SparkMD5 from "spark-md5";

export default function Home() {
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [md5, setMd5] = useState<string>("");
  const [uid, setUid] = useState<string>("");
  const [name, setName] = useState<string>("");
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
    if (!file || !md5 || !uid || !name || !orderId) {
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
          name,
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
      setName("");
      setOrderId("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 font-sans dark:bg-black p-4">
      <main className="w-full max-w-2xl bg-white dark:bg-black rounded-2xl shadow-xl p-8">
        <h1 className="text-3xl font-bold text-center mb-8 text-black dark:text-zinc-50">
          图片同步工具
        </h1>

        {/* Drop Zone */}
        <div
          onDrop={handleDrop}
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          className={`border-2 border-dashed rounded-lg p-12 text-center transition-colors cursor-pointer mb-6 ${
            isDragging
              ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
              : "border-zinc-300 dark:border-zinc-700 hover:border-zinc-400 dark:hover:border-zinc-600"
          }`}
        >
          <input
            type="file"
            accept="image/*"
            onChange={handleFileInput}
            className="hidden"
            id="file-input"
          />
          <label htmlFor="file-input" className="cursor-pointer block">
            <div className="text-6xl mb-4">📁</div>
            <p className="text-lg text-zinc-600 dark:text-zinc-400">
              {file ? file.name : "拖拽图片到这里或点击选择"}
            </p>
            {file && (
              <p className="text-sm text-zinc-500 dark:text-zinc-500 mt-2">
                {(file.size / 1024 / 1024).toFixed(2)} MB
              </p>
            )}
          </label>
        </div>

        {/* MD5 Display */}
        {md5 && (
          <div className="mb-6 p-4 bg-zinc-100 dark:bg-zinc-900 rounded-lg">
            <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-1">MD5 值</p>
            <code className="text-sm font-mono break-all text-black dark:text-zinc-50">
              {md5}
            </code>
          </div>
        )}

        {/* Form Fields */}
        <div className="mb-6 grid grid-cols-3 gap-4">
          <div>
            <label htmlFor="uid" className="block text-sm font-medium mb-2 text-black dark:text-zinc-50">
              UID *
            </label>
            <input
              type="text"
              id="uid"
              value={uid}
              onChange={(e) => setUid(e.target.value)}
              placeholder="输入用户ID"
              className="w-full px-4 py-3 border border-zinc-300 dark:border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-black text-black dark:text-zinc-50"
            />
          </div>

          <div>
            <label htmlFor="name" className="block text-sm font-medium mb-2 text-black dark:text-zinc-50">
              名称 *
            </label>
            <input
              type="text"
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="输入图片名称"
              className="w-full px-4 py-3 border border-zinc-300 dark:border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-black text-black dark:text-zinc-50"
            />
          </div>

          <div>
            <label htmlFor="orderId" className="block text-sm font-medium mb-2 text-black dark:text-zinc-50">
              排序ID *
            </label>
            <input
              type="text"
              id="orderId"
              value={orderId}
              onChange={(e) => setOrderId(e.target.value)}
              placeholder="输入排序ID"
              className="w-full px-4 py-3 border border-zinc-300 dark:border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-black text-black dark:text-zinc-50"
            />
          </div>
        </div>

        {/* Upload Button */}
        <button
          onClick={handleUpload}
          disabled={!file || !md5 || !uid || !name || !orderId || uploading}
          className={`w-full py-3 px-6 rounded-lg font-medium transition-colors ${
            !file || !md5 || !uid || !name || !orderId || uploading
              ? "bg-zinc-300 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-600 cursor-not-allowed"
              : "bg-blue-500 hover:bg-blue-600 text-white cursor-pointer"
          }`}
        >
          {uploading ? "上传中..." : "上传"}
        </button>

        {/* Error Message */}
        {error && (
          <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
          </div>
        )}

        {/* Success Message */}
        {uploadedUrl && (
          <div className="mt-4 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
            <p className="text-green-600 dark:text-green-400 text-sm mb-2">上传成功！</p>
            <a
              href={uploadedUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-500 hover:text-blue-600 text-sm break-all"
            >
              {uploadedUrl}
            </a>
          </div>
        )}
      </main>
    </div>
  );
}
