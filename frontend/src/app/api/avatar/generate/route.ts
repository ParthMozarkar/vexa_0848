/**
 * POST /api/avatar/generate
 * Internal endpoint called from the onboarding flow.
 *
 * Auth: Supabase Bearer token (session access_token). This route is NOT a
 * marketplace endpoint — it should not require the `x-vexa-key` header.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabaseServer';
import { logger } from '@/lib/logger';
import { enqueueJob, QUEUE_NAMES, type AvatarHeavyJobData } from '@/lib/queues';
import { jobStore, generateJobId } from '@/lib/jobStore';

function getServerSupabase() {
  return createServerSupabaseClient();
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = getServerSupabase();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { userId, photoUrl, photoBase64, measurements } = body as {
      userId?: string;
      photoUrl?: string;
      photoBase64?: string;
      measurements?: unknown;
    };

    const parsedPhoto = photoUrl || photoBase64;

    if (!userId || !parsedPhoto || !measurements) {
      return NextResponse.json(
        { error: 'Missing required fields: userId, photoUrl, or measurements' },
        { status: 400 },
      );
    }

    if (userId !== user.id) {
      return NextResponse.json(
        { error: 'Forbidden: cannot generate avatar for another user' },
        { status: 403 },
      );
    }

    const pyServiceUrl = process.env.AVATAR_SERVICE_URL || process.env.PYTHON_SERVICE_URL;

    // If the python service is not configured, fall back to the bundled
    // placeholder GLB so onboarding still works end-to-end in local dev.
    if (!pyServiceUrl) {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || new URL(req.url).origin;
      const fallbackAvatarUrl = `${appUrl.replace(/\/$/, '')}/models/avatar.glb`;
      const { error: dbError } = await supabase
        .from('users')
        .update({ avatar_url: fallbackAvatarUrl })
        .eq('id', userId);
      if (dbError) logger.warn('[/api/avatar/generate] avatar_url update failed:', dbError.message);
      return NextResponse.json({ avatarUrl: fallbackAvatarUrl, status: 'ready' });
    }

    // Heavy path: pyServiceUrl is set — enqueue instead of awaiting synchronously
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || new URL(req.url).origin;
    const fallbackAvatarUrl = `${appUrl.replace(/\/$/, '')}/models/avatar.glb`;

    const jobData: AvatarHeavyJobData = {
      userId,
      photoUrl: parsedPhoto,
      measurements: measurements as Record<string, number>,
    };

    const enqueued = await enqueueJob(QUEUE_NAMES.AVATAR_HEAVY, jobData);

    if (enqueued) {
      return NextResponse.json(
        { jobId: enqueued.jobId, status: 'queued', avatarUrl: fallbackAvatarUrl },
        { status: 202 },
      );
    }

    // Redis not available — fall back to in-memory job + fire-and-forget
    const internalToken = process.env.INTERNAL_SERVICE_TOKEN;
    const fallbackJobId = generateJobId();
    jobStore.set(fallbackJobId, {
      id: fallbackJobId,
      status: 'queued',
      createdAt: Date.now(),
    });

    void fetch(`${pyServiceUrl.replace(/\/$/, '')}/generate-avatar`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(internalToken ? { Authorization: `Bearer ${internalToken}` } : {}),
      },
      body: JSON.stringify({ photo_url: parsedPhoto, measurements }),
    })
      .then(async (pyRes) => {
        jobStore.update(fallbackJobId, { status: 'active' });
        if (!pyRes.ok) {
          const errTxt = await pyRes.text();
          throw new Error(`Python service failed: ${errTxt}`);
        }
        const data = (await pyRes.json()) as { avatar_url?: string };
        if (!data.avatar_url) throw new Error('No avatar_url returned from Python service');
        const { error: dbError } = await supabase
          .from('users')
          .update({ avatar_url: data.avatar_url })
          .eq('id', userId);
        if (dbError)
          logger.warn('[/api/avatar/generate] avatar_url update failed:', dbError.message);
        jobStore.update(fallbackJobId, {
          status: 'completed',
          result: { avatarUrl: data.avatar_url },
        });
      })
      .catch((e: unknown) => {
        const msg = e instanceof Error ? e.message : String(e);
        console.error('[/api/avatar/generate] async fallback failed:', msg);
        jobStore.update(fallbackJobId, { status: 'failed', error: msg });
      });

    return NextResponse.json(
      { jobId: fallbackJobId, status: 'queued', avatarUrl: fallbackAvatarUrl },
      { status: 202 },
    );
  } catch (err: unknown) {
    const error = err instanceof Error ? err : new Error(String(err));
    logger.error('[/api/avatar/generate]', { message: error.message });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
