import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getStorage } from "firebase-admin/storage";

import { getEnv } from "@/lib/env";

function getFirebaseApp() {
  if (getApps().length > 0) {
    return getApps()[0];
  }

  return initializeApp({
    credential: cert({
      projectId: getEnv("FIREBASE_PROJECT_ID"),
      clientEmail: getEnv("FIREBASE_CLIENT_EMAIL"),
      privateKey: getEnv("FIREBASE_PRIVATE_KEY").replace(/\\n/g, "\n"),
    }),
    storageBucket: getEnv("FIREBASE_STORAGE_BUCKET"),
  });
}

function getBucket() {
  return getStorage(getFirebaseApp()).bucket(getEnv("FIREBASE_STORAGE_BUCKET"));
}

function sanitizeFileName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "-").toLowerCase();
}

export async function uploadDocumentFile(file: File, userId: string) {
  const bucket = getBucket();
  const safeName = sanitizeFileName(file.name || "document");
  const filePath = `documents/${userId}/${Date.now()}-${safeName}`;
  const bucketFile = bucket.file(filePath);
  const buffer = Buffer.from(await file.arrayBuffer());

  await bucketFile.save(buffer, {
    contentType: file.type || "application/octet-stream",
    resumable: false,
    metadata: {
      cacheControl: "public, max-age=31536000",
    },
  });

  const [signedUrl] = await bucketFile.getSignedUrl({
    action: "read",
    expires: "03-01-2500",
  });

  const extension = safeName.split(".").pop()?.toUpperCase() || "FILE";

  return {
    fileName: file.name || safeName,
    filePath,
    fileType: extension,
    fileUrl: signedUrl,
  };
}

export async function deleteDocumentFile(filePath: string) {
  if (!filePath) {
    return;
  }

  const bucket = getBucket();

  await bucket.file(filePath).delete({ ignoreNotFound: true });
}
