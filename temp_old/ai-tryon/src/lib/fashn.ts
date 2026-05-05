export async function callFashnAI(
  personImageUrl: string,
  garmentImageUrl: string,
  category: 'tops' | 'bottoms' | 'one-pieces' = 'tops'
): Promise<{ jobId: string }> {
  const fashnKey = process.env.FASHN_API_KEY;
  if (!fashnKey) throw new Error('FASHN_API_KEY is not configured');

  const response = await fetch('https://api.fashn.ai/v1/run', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${fashnKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'tryon',
      input: {
        model_image: personImageUrl,
        garment_image: garmentImageUrl,
        category: category,
      },
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Fashn.ai run failed: ${response.status} - ${text}`);
  }

  const data = await response.json();
  if (!data.id) {
    throw new Error('Fashn.ai did not return a jobId');
  }

  return { jobId: data.id };
}

export async function pollFashnResult(
  jobId: string
): Promise<{ status: string; resultUrl?: string; error?: string }> {
  const fashnKey = process.env.FASHN_API_KEY;
  if (!fashnKey) throw new Error('FASHN_API_KEY is not configured');

  const response = await fetch(`https://api.fashn.ai/v1/status/${jobId}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${fashnKey}`,
    },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Fashn.ai status failed: ${response.status} - ${text}`);
  }

  const data = await response.json();
  
  if (data.status === 'completed') {
    return {
      status: 'completed',
      resultUrl: data.output && data.output.length > 0 ? data.output[0] : undefined,
    };
  }

  if (data.status === 'failed') {
    return {
      status: 'failed',
      error: data.error || 'Unknown Fashn.ai error',
    };
  }

  // returning 'starting' or 'processing'
  return { status: data.status || 'processing' };
}
