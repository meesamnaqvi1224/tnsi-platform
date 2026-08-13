import { getAuthUser } from '@/lib/auth-api';
import { success, unauthorized } from '@/lib/api-response';

export const runtime = 'nodejs';

export async function GET() {
  const user = await getAuthUser();
  if (!user) return unauthorized();

  const { entitlements, deletedAt, ...userProfile } = user;

  return success({
    id: userProfile.id,
    clerkUserId: userProfile.clerkUserId,
    email: userProfile.email,
    fullName: userProfile.fullName,
    avatarUrl: userProfile.avatarUrl,
    metadata: userProfile.metadata,
    createdAt: userProfile.createdAt,
    updatedAt: userProfile.updatedAt,
  });
}
