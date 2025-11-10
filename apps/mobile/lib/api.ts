const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? 'http://localhost:8080/api/v1';

type RequestOptions = RequestInit & { path: string };

async function request<T>({ path, headers, ...options }: RequestOptions): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(headers || {}),
    },
    ...options,
  });

  const text = await response.text();
  const data = text ? JSON.parse(text) : null;

  if (!response.ok) {
    const message = data?.message || 'Unexpected server error';
    throw new Error(message);
  }

  return data as T;
}

export type SignUpPayload = {
  email: string;
  password: string;
};

export async function registerUser(payload: SignUpPayload) {
  return request<{ status: number; message: string }>({
    path: '/auth/sign-up',
    method: 'POST',
    body: JSON.stringify(payload),
  });
}
