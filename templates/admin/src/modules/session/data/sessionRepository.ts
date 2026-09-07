import { login } from '../../../api/generated/client';
import type { SessionRepository } from '../domain/session';
export const sessionRepository: SessionRepository = {
  async login(username, password) {
    return { ...(await login({ body: { username, password } })) };
  },
};
