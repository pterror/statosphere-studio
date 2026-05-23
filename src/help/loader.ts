const modules = import.meta.glob('../../help/**/*.md', { query: '?raw', import: 'default', eager: true }) as Record<string, string>

function key(section: string, field: string): string {
  return `../../help/${section}/${field}.md`
}

export function getHelp(section: string, field: string): string | null {
  return modules[key(section, field)] ?? null
}

export function getHelpSummary(section: string, field: string): string | null {
  const raw = getHelp(section, field)
  if (!raw) return null
  for (const line of raw.split('\n')) {
    const trimmed = line.trim()
    if (trimmed && !trimmed.startsWith('#') && !trimmed.startsWith('```') && !trimmed.startsWith('[')) {
      const sentence = trimmed.split(/(?<=[.!?])\s/)[0]
      return sentence
    }
  }
  return null
}
