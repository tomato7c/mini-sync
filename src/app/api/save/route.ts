import { NextRequest, NextResponse } from "next/server";
import { loadConfig } from "@/lib/config";

export const runtime = "nodejs";

interface SaveRequest {
  uid: string;
  name: string;
  desc?: string;
  link: string;
  orderId: string;
}

// Execute SQL query via Cloudflare D1 HTTP API
async function executeD1Query(
  config: ReturnType<typeof loadConfig>,
  sql: string,
  params: (string | number)[] = []
): Promise<any> {
  const response = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${config.d1.accountId}/d1/database/${config.d1.databaseId}/query`,
    {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${config.d1.apiToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        sql,
        params,
      }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`D1 API error: ${response.status} ${errorText}`);
  }

  const data = await response.json();

  if (!data.success) {
    throw new Error(`D1 query failed: ${JSON.stringify(data.errors)}`);
  }

  return data.result[0];
}

export async function POST(request: NextRequest) {
  try {
    const body: SaveRequest = await request.json();

    if (!body.uid || !body.name || !body.link || !body.orderId) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Load config (from env vars or config.json)
    const config = loadConfig();

    // Insert record into D1 using HTTP API
    const result = await executeD1Query(
      config,
      "INSERT INTO linsv_picture (uid, desc, link, order_id, create_time) VALUES (?, ?, ?, ?, datetime('now'))",
      [body.uid, body.desc || "", body.link, body.orderId]
    );

    return NextResponse.json({
      success: true,
      meta: result.meta,
    });
  } catch (error) {
    console.error("Save error:", error);
    return NextResponse.json(
      {
        error: "Save failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
