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

        // Generate a unique filename
        const original = (formData.get("name") as string) || "inspection";
        const safeSlug = original
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/(^-|-$)/g, "");

        const now = new Date();
        const stamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2,"0")}${String(now.getDate()).padStart(2,"0")}-${String(now.getHours()).padStart(2,"0")}${String(now.getMinutes()).padStart(2,"0")}${String(now.getSeconds()).padStart(2,"0")}`;
        const rand = crypto.randomBytes(3).toString("hex");
        const filename = `${safeSlug}-${stamp}-${rand}.pdf`;

        // ✅ Use /tmp for Vercel (temporary writable dir)
        const uploadsDir =
            process.env.NODE_ENV === "production"
                ? "/tmp"
                : path.join(process.cwd(), "public", "uploads");

        await fs.mkdir(uploadsDir, { recursive: true });

        // ✅ Convert file to buffer before saving
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        const filePath = path.join(uploadsDir, filename);
        await fs.writeFile(filePath, buffer);

        // ✅ In production, file won't be accessible publicly, only temporarily
        // So return a message or handle uploading to Drive/S3 later
        const origin = req.headers.get("origin") || "";
        const fileUrl =
            process.env.NODE_ENV === "production"
                ? `temporary://${filename}` // only exists in /tmp
                : `${origin}/uploads/${filename}`;

        return NextResponse.json({ ok: true, fileUrl, filename });
    } catch (err: any) {
        console.error("Upload error:", err);
        return NextResponse.json({ error: "Upload failed" }, { status: 500 });
    }
}
