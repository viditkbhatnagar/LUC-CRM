// Default storage driver — no AWS needed. Returns a deterministic fake key/url
// and logs the "upload". Real files are not persisted; swap STORAGE_DRIVER=s3
// (and provide AWS creds) to store in S3 via s3Storage.js.
function safeName(name = 'file') {
  return String(name).replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 80);
}

export const stubStorage = {
  name: 'stub',
  async upload({ buffer, filename, contentType, leadId }) {
    const key = `leads/${leadId}/${Date.now()}-${safeName(filename)}`;
    // eslint-disable-next-line no-console
    console.log(`[storage:stub] "uploaded" ${key} (${buffer?.length ?? 0} bytes)`);
    return {
      key,
      url: `/uploads/${key}`, // placeholder URL (no real object served)
      size: buffer?.length ?? 0,
      contentType: contentType || 'application/octet-stream',
    };
  },
  async getSignedUrl(key) {
    return `/uploads/${key}`;
  },
};

export default stubStorage;
