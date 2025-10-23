// app/api/upload/route.ts
import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import crypto from "crypto";

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const file = formData.get("file") as File | null;

        if (!file) {
            return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
        }

        // Make a unique name: <slug>-<YYYYMMDD>-<HHmmss>-<6hex>.pdf
        const original = (formData.get("name") as string) || "inspection";
        const safeSlug = original
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/(^-|-$)/g, "");
        const now = new Date();
        const stamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2,"0")}${String(now.getDate()).padStart(2,"0")}-${String(now.getHours()).padStart(2,"0")}${String(now.getMinutes()).padStart(2,"0")}${String(now.getSeconds()).padStart(2,"0")}`;
        const rand = crypto.randomBytes(3).toString("hex");
        const filename = `${safeSlug}-${stamp}-${rand}.pdf`;

        // Save to /public/uploads so it’s publicly reachable at /uploads/<filename>
        const uploadsDir = path.join(process.cwd(), "public", "uploads");
        await fs.mkdir(uploadsDir, { recursive: true });

        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        const filePath = path.join(uploadsDir, filename);
        await fs.writeFile(filePath, buffer);

        // Build a full URL for convenience
        const origin = req.headers.get("origin") || "";
        const fileUrl = `${origin}/uploads/${filename}`;

        return NextResponse.json({ ok: true, fileUrl, filename });
    } catch (err: any) {
        console.error("Upload error:", err);
        return NextResponse.json({ error: "Upload failed" }, { status: 500 });
    }
}
