export function validateTwitterURL(url) {
  if (!url || !/https:\/\/(x|twitter)\.com/.test(url)) {
    throw new Error('Please provide a valid Twitter URL.');
  }

  return url;
}

export async function parseTwitterUrl(url) {
  const id = url.split('/').pop().split('?')[0];

  const response = await fetch(`https://xnapper.com/api/twitter-video?id=${id}`);

  const data = await response.json();
  
  if (!data.video.variants) {
    throw new Error('Failed to fetch Twitter URL. Possibly account is private.');
  }

  const variant = ['1080', '720', '540', '320'].reduce(
    (found, q) =>
      found ??
      data.video.variants.find(
        v => v.type === 'video/mp4' && v.src.includes(q)
      ),
    null
  );

  if (!variant) {
    throw new Error('Failed to find appropriate video quality.');
  }

  return variant.src;
}