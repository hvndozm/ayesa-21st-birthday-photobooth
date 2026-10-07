export function createSelectionSearch(formatId, designId) {
  const parameters = new URLSearchParams({ format: formatId })
  if (designId) parameters.set('design', designId)
  return `?${parameters.toString()}`
}
