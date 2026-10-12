import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { db } from './db';
import { readSessionToken, SESSION_COOKIE } from './session';

export async function getAdmin() {
  const id = await readSessionToken((await cookies()).get(SESSION_COOKIE)?.value);
  if (!id) return null;
  return db.admin.findUnique({ where: { id }, select: { id: true, email: true } });
}

/** For admin pages: middleware already blocks anonymous visitors; this also rejects deleted admins. */
export async function requireAdmin() {
  const admin = await getAdmin();
  if (!admin) redirect('/admin/login');
  return admin;
}
