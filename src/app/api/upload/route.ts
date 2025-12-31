import { NextRequest, NextResponse } from "next/server";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { loadConfig } from "@/lib/config";

export const runtime = "nodejs";

// Initialize S3 client for Cloudflare R2
function getS3Client(config: ReturnType<typeof loadConfig>): S3Client {
  return new S3Client({
    region: "auto",
    endpoint: `https://${config.r2.accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: config.r2.accessKeyId,
      secretAccessKey: config.r2.secretAccessKey,
    },
  });
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const md5 = formData.get("md5") as string;

    if (!file || !md5) {
      return NextResponse.json(
        { error: "Missing file or md5" },
        { status: 400 }
      );
    }

    // Load config (from env vars or config.json)
    const config = loadConfig();

    // Get S3 client
    const s3Client = getS3Client(config);

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upload to R2 using S3 protocol
    const command = new PutObjectCommand({
      Bucket: config.r2.bucketName,
      Key: md5,
      Body: buffer,
      ContentType: file.type,
    });

    await s3Client.send(command);

    return NextResponse.json({
      success: true,
      key: md5,
      url: `${config.r2.publicUrl}/${md5}`,
    });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      {
        error: "Upload failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
