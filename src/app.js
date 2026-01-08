import express from "express";
import ratelimiter from "./middleware/ratelimiter.js";
import security from "./middleware/security.js";
import cache from "./middleware/cache.js";
import proxyRoutes from "./routes/proxy.routes.js";


const app = express();

app.use(ratelimiter);
app.use(security);
app.use(cache);
app.use(proxyRoutes);

export default app;
