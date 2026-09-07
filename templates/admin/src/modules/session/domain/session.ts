export interface Session {
  token: string;
  name: string;
}
export interface SessionRepository {
  login(username: string, password: string): Promise<Session>;
}
