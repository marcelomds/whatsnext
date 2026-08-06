/**
 * Adapta um handler no formato Lambda (event) => {statusCode, body}
 * para uma função serverless da Vercel (req, res).
 */

function toVercelHandler(lambdaFn) {
  return async (req, res) => {
    const event = {
      body: req.body ? JSON.stringify(req.body) : null,
      queryStringParameters: req.query || {},
      headers: req.headers,
    };

    const result = await lambdaFn(event);

    res.status(result.statusCode);

    const headers = result.headers || {};
    for (const [key, value] of Object.entries(headers)) {
      res.setHeader(key, value);
    }

    res.setHeader("Content-Type", "application/json");
    res.send(result.body);
  };
}

module.exports = { toVercelHandler };
