// lib/googleDriveUploader.ts
/// <reference types="gapi" />
/// <reference types="gapi.auth2" />

export async function authenticateWithGoogleDrive(clientId: string): Promise<gapi.auth2.GoogleUser> {
  return new Promise((resolve, reject) => {
    gapi.load("client:auth2", async () => {
      try {
        await gapi.client.init({
          apiKey: '', // leave empty
          clientId,
          discoveryDocs: ["https://www.googleapis.com/discovery/v1/apis/drive/v3/rest"],
          scope: "https://www.googleapis.com/auth/drive.file",
        });

        const authInstance = gapi.auth2.getAuthInstance();
        const user = await authInstance.signIn();
        resolve(user);
      } catch (e) {
        reject(e);
      }
    });
  });
}

export async function uploadFileToDrive(file: File, filename: string): Promise<string> {
  const metadata = {
    name: filename,
    mimeType: file.type,
  };

  const accessToken = gapi.auth.getToken().access_token;
  const form = new FormData();
  form.append(
    "metadata",
    new Blob([JSON.stringify(metadata)], { type: "application/json" })
  );
  form.append("file", file);

  // 1️⃣ Upload file to Drive
  const res = await fetch(
    "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id",
    {
      method: "POST",
      headers: new Headers({ Authorization: `Bearer ${accessToken}` }),
      body: form,
    }
  );

  if (!res.ok) {
    const error = await res.json();
    throw new Error(`❌ Google Drive upload failed: ${error.error?.message || res.statusText}`);
  }

  const result = await res.json();
  console.log("✅ File uploaded with ID:", result.id);

  // 2️⃣ Make it publicly shareable
  await fetch(`https://www.googleapis.com/drive/v3/files/${result.id}/permissions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      role: "reader",
      type: "anyone",
    }),
  });

  // 3️⃣ Build shareable link
  const driveUrl = `https://drive.google.com/file/d/${result.id}/view?usp=sharing`;
  console.log("✅ Shareable link:", driveUrl);

  // 4️⃣ Return this URL to save in Google Sheet
  return driveUrl;
}

