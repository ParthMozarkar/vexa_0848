export async function startFashnTryOn(personImageUrl: string, garmentImageUrl: string, apiKey: string): Promise<string> {
  const response = await fetch('https://api.fashn.ai/v1/run', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model_image: personImageUrl,
      garment_image: garmentImageUrl,
      category: 'tops',
    }),
  });

  if (!response.ok) {
    throw new Error(`Fashn API error: ${response.statusText}`);
  }

  const data = await response.json();
  return data.id;
}

export async function pollFashnResult(predictionId: string, apiKey: string): Promise<string | null> {
  const response = await fetch(`https://api.fashn.ai/v1/status/${predictionId}`, {
    headers: {
      'Authorization': `Bearer ${apiKey}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Fashn status error: ${response.statusText}`);
  }

  const data = await response.json();
  if (data.status === 'completed') {
    return data.output[0];
  }
  return null;
}
