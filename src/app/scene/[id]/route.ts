import { list } from "@vercel/blob";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const prefix = "scenes/" + id + ".html";
    const { blobs } = await list({ prefix: prefix });

    if (blobs.length === 0) {
      return new Response("<h1>Scene not found</h1>", {
        status: 404,
        headers: { "Content-Type": "text/html" },
      });
    }

    const blobUrl = blobs[0].url;
    const response = await fetch(blobUrl);
    const html = await response.text();

    return new Response(html, {
      headers: {
        "Content-Type": "text/html",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (error) {
    console.error("Scene fetch failed:", error);
    return new Response("<h1>Error loading scene</h1>", {
      status: 500,
      headers: { "Content-Type": "text/html" },
    });
  }
}
