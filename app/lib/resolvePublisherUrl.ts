/**
 * Resolves Google News RSS URLs to the actual publisher URL
 * using the /api/resolve endpoint
 */
export async function resolvePublisherUrl(googleNewsUrl: string): Promise<string | null> {
  try {
    const response = await fetch('/api/resolve', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ url: googleNewsUrl }),
    });

    if (!response.ok) {
      console.error('[resolvePublisherUrl] HTTP error:', response.status);
      return null;
    }

    const data = await response.json();

    if (data.success && data.publisherUrl) {
      return data.publisherUrl;
    }

    return null;
  } catch (error) {
    console.error('[resolvePublisherUrl] Error:', error);
    return null;
  }
}
