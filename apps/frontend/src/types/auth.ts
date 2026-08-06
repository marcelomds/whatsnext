export interface User {
  userId: string;
  email: string;
  name: string;
  evolutionInstance: string;
}

export interface AuthResult {
  token: string;
  user: User;
}
