// Test with ACTUAL file upload to the Space first
const SPACE_URL = 'https://yisol-idm-vton.hf.space';

async function uploadToSpace(imageUrl, filename) {
  console.log(`Downloading ${filename} from URL...`);
  const imgRes = await fetch(imageUrl);
  if (!imgRes.ok) throw new Error(`Failed to download: ${imgRes.status}`);
  const imgBuffer = await imgRes.arrayBuffer();
  console.log(`Downloaded ${imgBuffer.byteLength} bytes`);

  const blob = new Blob([imgBuffer], { type: 'image/png' });
  const formData = new FormData();
  formData.append('files', blob, filename);

  console.log(`Uploading ${filename} to Space...`);
  const uploadRes = await fetch(`${SPACE_URL}/upload`, {
    method: 'POST',
    body: formData,
  });

  if (!uploadRes.ok) {
    const err = await uploadRes.text();
    throw new Error(`Upload failed: ${uploadRes.status} - ${err}`);
  }

  const paths = await uploadRes.json();
  console.log(`Upload result:`, JSON.stringify(paths));
  return paths[0];
}

async function test() {
  // Use a small test image
  const testImgUrl = 'https://raw.githubusercontent.com/gradio-app/gradio/main/test/test_files/bus.png';
  
  const humanPath = await uploadToSpace(testImgUrl, 'human.png');
  const garmPath = await uploadToSpace(testImgUrl, 'garment.png');
  
  console.log('\nUploaded paths:', { humanPath, garmPath });

  const sessionHash = Math.random().toString(36).substring(2, 15);
  
  console.log('\nJoining queue...');
  const joinRes = await fetch(`${SPACE_URL}/queue/join`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      data: [
        {
          background: { path: humanPath, meta: { _type: "gradio.FileData" } },
          layers: [],
          composite: null,
        },
        { path: garmPath, meta: { _type: "gradio.FileData" } },
        "Upper-body garment",
        true,
        true,
        30,
        42,
      ],
      fn_index: 0,
      session_hash: sessionHash,
    }),
  });
  
  console.log('Join status:', joinRes.status);
  const joinData = await joinRes.json();
  console.log('Join response:', JSON.stringify(joinData));

  // Read SSE
  console.log('\nConnecting to SSE stream...');
  const dataRes = await fetch(`${SPACE_URL}/queue/data?session_hash=${sessionHash}`);
  
  const reader = dataRes.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  const startTime = Date.now();
  
  while (true) {
    if (Date.now() - startTime > 120000) {
      console.log('Timeout after 120s');
      break;
    }

    const { done, value } = await reader.read();
    if (done) {
      console.log('Stream closed');
      break;
    }

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      // Truncate very long lines
      if (trimmed.length > 300) {
        console.log('RAW:', trimmed.slice(0, 300) + '...[truncated]');
      } else {
        console.log('RAW:', trimmed);
      }
    }
  }
}

test().catch(e => console.error('Error:', e.message));
