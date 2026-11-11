// Enkel begränsning av antal skrivande anrop per IP-adress (i minnet).
// Räcker för en liten app på en server; vid flera servrar behövs en gemensam lagring.
export function skapaBegransare({ max = 20, fonsterMs = 60_000 } = {}) {
  const traffar = new Map(); // ip -> { antal, slut }

  const stadning = setInterval(() => {
    const nu = Date.now();
    for (const [ip, post] of traffar) if (post.slut <= nu) traffar.delete(ip);
  }, fonsterMs);
  stadning.unref();

  return (req, res, next) => {
    if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) return next();
    const nu = Date.now();
    const ip = req.ip ?? 'okand';
    let post = traffar.get(ip);
    if (!post || post.slut <= nu) {
      post = { antal: 0, slut: nu + fonsterMs };
      traffar.set(ip, post);
    }
    post.antal += 1;
    if (post.antal > max) {
      res.set('Retry-After', String(Math.ceil((post.slut - nu) / 1000)));
      return res.status(429).json({ fel: 'För många förfrågningar. Vänta en stund och försök igen.' });
    }
    next();
  };
}
