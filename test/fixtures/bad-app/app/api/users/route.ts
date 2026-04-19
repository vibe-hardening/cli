// Vibe-coded: no auth check, returns all users
export async function GET(req: Request) {
  return Response.json({ users: await db.user.findMany() });
}
