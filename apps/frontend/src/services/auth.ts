import { apiGet, apiPost } from "./api";
import type { AuthResult, User } from "../types/auth";

interface ApiEnvelope<T> {
  success: boolean;
  data: T;
}

export async function login(email: string, password: string): Promise<AuthResult> {
  const { data } = await apiPost<ApiEnvelope<AuthResult>>("/api/auth/login", { email, password });
  return data;
}

export async function register(
  name: string,
  email: string,
  password: string,
  evolutionInstance?: string
): Promise<AuthResult> {
  const { data } = await apiPost<ApiEnvelope<AuthResult>>("/api/auth/register", {
    name,
    email,
    password,
    evolutionInstance,
  });
  return data;
}

export async function getMe(): Promise<User> {
  const { data } = await apiGet<ApiEnvelope<User>>("/api/auth/me");
  return data;
}
