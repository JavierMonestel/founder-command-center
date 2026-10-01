// Write endpoints accept a bearer token when INGEST_TOKEN is configured.
// The public demo leaves it unset so reviewers can try the webhooks with curl.
export function authorized(request: Request): boolean {
  const token = process.env.INGEST_TOKEN;
  if (!token) return true;
  return request.headers.get("authorization") === `Bearer ${token}`;
}
