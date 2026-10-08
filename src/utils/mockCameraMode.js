// The query flag alone can never enable mock capture in a production build.
// Explicit flags let Node tests exercise both environments without DOM state.
export function isDevelopmentMockCamera(searchParams, {
  isDevelopment = import.meta.env?.DEV,
  isProduction = import.meta.env?.PROD,
} = {}) {
  return isDevelopment === true && isProduction !== true
    && searchParams?.get('mockCamera') === 'true'
}
