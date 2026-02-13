import { put } from "@vercel/blob";
import { nanoid } from "nanoid";

export async function POST(req: Request) {
  try {
    const { html } = (await req.json()) as { html: string };
    if (!html) {
      return new Response(JSON.stringify({ error: "No HTML provided" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const id = nanoid(10);
    const pathname = "scenes/" + id + ".html";
    const blob = await put(pathname, html, {
      access: "public",
      contentType: "text/html",
    });

    return new Response(
      JSON.stringify({ id, url: "/scene/" + id, blobUrl: blob.url }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Share failed:", error);
    return new Response(
      JSON.stringify({ error: "Failed to share scene" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
