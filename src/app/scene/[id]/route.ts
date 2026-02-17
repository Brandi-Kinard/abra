import { list } from "@vercel/blob";
import { NextResponse } from "next/server";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  var { id } = await params;
  var pathname = "scenes/" + id + ".html";

  try {
    var { blobs } = await list({ prefix: pathname, limit: 1 });
    if (!blobs.length) {
      return new NextResponse("Scene not found", { status: 404 });
    }

    var blobUrl = blobs[0].url;
    var res = await fetch(blobUrl);
    if (!res.ok) {
      return new NextResponse("Scene not found", { status: 404 });
    }

    var html = await res.text();

    return new NextResponse(html, {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Permissions-Policy": "xr-spatial-tracking=(self)",
      },
    });
  } catch (e) {
    return new NextResponse("Scene not found", { status: 404 });
  }
}
