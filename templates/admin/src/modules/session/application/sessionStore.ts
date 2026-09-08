import { ref, type InjectionKey } from 'vue';
import { defineStore } from 'pinia';
import type { Session, SessionRepository } from '../domain/session';

export const sessionRepositoryKey: InjectionKey<SessionRepository> = Symbol('SessionRepository');
function storedSession(): Session | null {
  try {
    const value: unknown = JSON.parse(sessionStorage.getItem('agent-admin.session') ?? 'null');
    if (
      value &&
      typeof value === 'object' &&
      'token' in value &&
      typeof value.token === 'string' &&
      'name' in value &&
      typeof value.name === 'string'
    )
      return { token: value.token, name: value.name };
  } catch {
    sessionStorage.removeItem('agent-admin.session');
  }
  return null;
}
export const useSessionStore = defineStore('session', () => {
  const session = ref<Session | null>(storedSession());
  function accept(value: Session) {
    session.value = value;
    sessionStorage.setItem('agent-admin.session', JSON.stringify(value));
  }
  function clear() {
    session.value = null;
    sessionStorage.removeItem('agent-admin.session');
  }
  return { session, accept, clear };
});
