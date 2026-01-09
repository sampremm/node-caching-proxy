// SSRF prevention
const PRIVATE_IP_REGEX = /^(?:(?:10|127|172\.(?:1[6-9]|2\d|3[01])|192\.168|169\.254)\.|\[(?:(?:fc|fd)[0-9a-f]{0,2}:|fe80:|::1|::))/i;

export default function (req, res, next) {
  const url = req.query.url;

  if (!url) {
    return res.status(400).json({ error: "URL is required" });
  }

  // Validate URL format
  try {
    const parsedUrl = new URL(/^https?:\/\//i.test(url) ? url : `https://${url}`);
    
    // Prevent SSRF attacks
    if (PRIVATE_IP_REGEX.test(parsedUrl.hostname)) {
      return res.status(403).json({ error: "Access to private IP addresses not allowed" });
    }

    // Only allow http/https
    if (!["http:", "https:"].includes(parsedUrl.protocol)) {
      return res.status(400).json({ error: "Only HTTP(S) protocols allowed" });
    }
  } catch (err) {
    return res.status(400).json({ error: "Invalid URL format" });
  }

  next();
};
