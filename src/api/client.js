import axios from 'axios'

/**
 * One axios instance for the whole application.
 *
 * The tenant travels in a header because authentication is not wired yet: when
 * the API becomes an OIDC resource server the interceptor below is replaced by
 * one that attaches the access token, and no call site changes.
 */
const client = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? '/v1',
  timeout: 15000,
  headers: { Accept: 'application/json' },
})

const TENANT_ID =
  import.meta.env.VITE_TENANT_ID ?? '00000000-0000-0000-0000-000000000001'
const ACTOR_ID = import.meta.env.VITE_ACTOR_ID

client.interceptors.request.use((config) => {
  config.headers['X-Tenant-Id'] = TENANT_ID
  if (ACTOR_ID) config.headers['X-Actor-Id'] = ACTOR_ID
  return config
})

/**
 * Turns an axios failure into the message the API actually sent.
 * The backend answers with { message, rule, violations }, and a dispatcher needs
 * to read "Nigeria landing permit not confirmed", not "Request failed with 409".
 */
client.interceptors.response.use(
  (response) => response,
  (error) => {
    const payload = error.response?.data
    const detail =
      payload?.message ??
      payload?.error ??
      error.message ??
      'The dispatch API did not answer'
    const wrapped = new Error(detail)
    wrapped.status = error.response?.status
    wrapped.rule = payload?.rule
    wrapped.violations = payload?.violations
    return Promise.reject(wrapped)
  },
)

export default client
