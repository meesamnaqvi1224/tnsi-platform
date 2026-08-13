import { getAuthUser } from '@/lib/auth-api';
import { success, unauthorized } from '@/lib/api-response';

export const runtime = 'nodejs';

export async function GET() {
  const user = await getAuthUser();
  if (!user) return unauthorized();

  if (!user.entitlements) {
    return success({
      tier: 'free',
      status: 'active',
      programs: [],
      certifications: [],
      features: [],
      currentPeriodEnd: null,
    });
  }

  const { userId, metadata, createdAt, updatedAt, ...entitlements } = user.entitlements;

  return success(entitlements);
}
