export default function (req, res, next) {
  const url = req.query.url;

  if (!url) {
    return res.status(400).json({ error: "URL is required" });
  }

  if (!url.startsWith("https://")) {
    return res.status(400).json({ error: "Only HTTPS allowed" });
  }

  next();
};
