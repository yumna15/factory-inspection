import { SignJWT } from 'jose/jwt/sign';
import { importPKCS8 } from 'jose/key/import';

// ✅ Hardcoded credentials (make sure these stay server-side if deploying securely)
const GOOGLE_CLIENT_EMAIL = 'yumna-489@xenon-axe-466706-k9.iam.gserviceaccount.com';
const PRIVATE_KEY = `-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC81/K6kdz0xV+G\n9iYePPpaiL4KZkoiRnqFDZiko4nAsLxZqOiePOVYKYHBYPna0VAF+s46B53cka9/\na58Bhh/pqTpsdxeeav8nncYXxu4abHlVFhjwcg9w4Rz4e9uU5zABdY3/fUy6wcSk\nVRVT/pzqdUg3VOU+73MxJ8AnrbhqezW2PWB+EjOG2UUwv18YuX207Njf53WoZ2Fy\nZIrhfrsUGveZraShVg/EP+1UaVKCw34dYBF68zjVtaOYaQ6KgkGuocJAexzxjHl7\ncGI64XvaZmKMrdZ5K4BgyxvJbgmMdiBKFohUcBc8rc07NRwTJcBJ9TfSN+sDFj3A\nRlTUv3xvAgMBAAECggEAAbPVXDQ7cI4k+H5YmqDZxZ4s+cKxUWd0QaXSkKK+zQNq\n4fNhYX0oDihATgzV7ntA7u+IvheFJ1C9lcxTwHuZPGM1A8xRD1xklNKvJKtmSHZe\nOP5RgZLDATVZAa5613f8GU9E1Umnuu6gm2CpqA+yvMm2OcrPTvFxXD9A/rqUtTUH\nhTEY2954taGB70SjcRmSKlrvZKDElnAlZnECzVbqujnexDfR/ofS7eySNZN9i9xy\nVkGH78pQ+r6kTnayhEcWitbJJ6F5t0Xege9HgfPN2cWZQrL4er3dzXWBpZGZbN7e\nWdWv8telS0kJV13aBBpHijwYS05c+uFJrSJG9JYVkQKBgQDkAVmLczZJlztkoiZL\nuGsMyijf1XLE4CJmtj6aHzhcUftprMjmtd3Jt1ce4Fe6ur+AH48rNl318F3btc7h\n6jI6Y6G/xbRNq+erFfGvzZBrD4iJMkoTWr0DZB8c1byoSSK2OeXlGGCRRuuNZApX\nLRrfVLrH2hZQKgrh3pdBJdFKPwKBgQDUB6tEMe2k/8VZnQJYdE3kkHQ2d8p1xB/J\ncmI0xwSywP9sFz7q+Vdu9fHrffKhz6xh66zabhGkW93J3IjZ85pFSNX7zMF1w1UI\nQMIGmc9htjw4HR+7J9BkSwj2U2ot3AEQ71Dd7psgdNt4Na8wX5iAZrDbQCIPAfI0\nMpWL6EBh0QKBgFndBlPl9tGOX4RMPFe/ucFytCV0VSWvSR++WHIaN/Z7AWInDY+Q\nwndMYXPz69/W1r9CsQTRCrtyHywHPiDgUyecORYCcAvk4wwVPAqUNIVdu+yG+5ch\nPjnl7jVJMHALUzkLHMbskrLvhstVUJYHWv4GwQ8fr4es6lkXh/nPU+u1AoGBAKmg\nEQYXo3UTIgEVOSEmuoIWhsJkh1Y7tupkVei/JyUSfcUtu6okHCyrGgU513hYOiKE\ndt6wm/CPhhnOErW6yzqOkJJHNqZNxKM7m33IYz5amkaSFiaWLYNu/BaEmTdjAH9Z\n1aoXD4ehtUqwOB1M/SYMAYUGA7lZ5ziXF0i8X3VhAoGAC82xd+bb6oerVTUgGkcb\nGIpVeJLiiSAZfptkiMWQrwk2xg/kSqEONhCd/jpmdcpHR8OISHUIEpFonFSMFrs/\nXV+MliGLLjTpvPPvwSj6sHIixFHR8/RmNYHjbzWlakPMvy5vI0vUP8qOjhYnB16c\n1W75WEiGphVYzOnAxF2cxgc=\n-----END PRIVATE KEY-----\n`;
const GOOGLE_SHEET_ID = '1uFOWEszGULA56AkmBqhG4nqZpF1pV8khrLI85zD-EUI';

const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];

async function getAccessToken(): Promise<string> {
  const now = Math.floor(Date.now() / 1000);

  const payload = {
    iss: GOOGLE_CLIENT_EMAIL,
    scope: SCOPES.join(' '),
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now,
  };

  const key = await importPKCS8(PRIVATE_KEY, 'RS256');

  const jwt = await new SignJWT(payload)
    .setProtectedHeader({ alg: 'RS256', typ: 'JWT' })
    .setIssuedAt()
    .setExpirationTime('1h')
    .sign(key);

  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  });

  const json = await tokenRes.json();
  if (!tokenRes.ok) throw new Error(`❌ Token error: ${json.error?.message}`);
  return json.access_token;
}

export async function uploadRowToSheet(formData: any) {
  const accessToken = await getAccessToken();
  const range = 'Sheet1!A1';

  // ✅ Your required order for columns:
  const row: string[] = [
    formData.date || '',
    formData.supplierName || '',
    formData.productCategory || '',
    formData.itemDescription || '',
    formData.designNo || '',
    formData.colour || '',
    formData.fabricQuality || '',
    formData.checkerName || '',
    formData.merchandiserName || '',
    formData.deliveryDate || '',
    formData.orderQuantity || '',
    formData.presentedQuantity || '',
    formData.inlineInspection || '',
    formData.ppApproved || '',
    formData.inspectionResult || '',
    formData.finalComments?.replace(/\n/g, ' ') || '',
    formData.fileLink || '',
  ];

  const res = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${GOOGLE_SHEET_ID}/values/${range}:append?valueInputOption=USER_ENTERED`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ values: [row] }),
    }
  );

  const data = await res.json();
  if (!res.ok) throw new Error(`❌ Sheet upload failed: ${data.error?.message || res.statusText}`);
}
