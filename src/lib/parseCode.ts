export function parseCode(markdown: string): string | null {
  const match = markdown.match(/```html\s*\n([\s\S]*?)```/);
  return match ? match[1].trim() : null;
}