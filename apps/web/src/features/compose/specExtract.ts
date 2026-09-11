const TEXT_EXTENSIONS = new Set(['.txt', '.md', '.markdown', '.json', '.yaml', '.yml', '.csv']);

const MAX_SPEC_CHARS = 48_000;

export async function extractSpecText(file: File): Promise<string> {
  const ext = '.' + (file.name.split('.').pop()?.toLowerCase() ?? '');
  if (!TEXT_EXTENSIONS.has(ext)) {
    throw new Error(
      `${file.name}: use .txt or .md for now, or paste the spec into your goal.`,
    );
  }
  if (file.size > 2 * 1024 * 1024) {
    throw new Error(`${file.name} is too large (max 2MB for inline specs).`);
  }
  const text = await file.text();
  if (!text.trim()) {
    throw new Error(`${file.name} is empty.`);
  }
  if (text.length > MAX_SPEC_CHARS) {
    return text.slice(0, MAX_SPEC_CHARS) + '\n… [truncated]';
  }
  return text;
}
