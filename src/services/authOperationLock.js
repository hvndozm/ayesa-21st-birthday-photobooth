// Guest creation and private login/logout share the same client and must finish
// in order. An older anonymous response must not replace a newer private login.
const pendingOperations = new WeakMap()

export function runAuthOperation(client, operation) {
  const previous = pendingOperations.get(client)
  let current
  if (previous) current = previous.catch(() => {}).then(operation)
  else {
    try { current = Promise.resolve(operation()) }
    catch (error) { current = Promise.reject(error) }
  }
  pendingOperations.set(client, current)
  const release = () => {
    if (pendingOperations.get(client) === current) pendingOperations.delete(client)
  }
  current.then(release, release)
  return current
}
