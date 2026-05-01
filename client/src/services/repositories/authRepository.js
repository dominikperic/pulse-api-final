import { useMockApi } from '../config';
import { httpJson } from '../http/httpClient';
import { setActiveUserKey } from '../authState';

const mockUsersByEmail = new Map();

function sanitizeMockUser(email) {
  return {
    id: `u_mock_${String(email || '').trim().toLowerCase()}`,
    email: String(email || '').trim().toLowerCase(),
    name: 'Mock User',
  };
}

export async function signIn(payload) {
  if (useMockApi()) {
    const email = String(payload?.email || '')
      .trim()
      .toLowerCase();
    const password = String(payload?.password || '');
    if (!email || !password) throw new Error('Enter your email and password.');
    const user = mockUsersByEmail.get(email);
    if (!user || user.password !== password) throw new Error('Invalid email or password.');
    setActiveUserKey(user.email);
    return { user };
  }
  const res = await httpJson('POST', '/api/auth/sign-in', payload);
  setActiveUserKey(res?.user?.email || 'anonymous');
  return { user: res.user };
}

export async function signUp(payload) {
  if (useMockApi()) {
    const email = String(payload?.email || '')
      .trim()
      .toLowerCase();
    const password = String(payload?.password || '');
    if (!email.includes('@')) throw new Error('Enter a valid email address.');
    if (password.length < 8) throw new Error('Password must be at least 8 characters.');
    if (!email || !password) throw new Error('Enter an email and password to create an account.');
    if (mockUsersByEmail.has(email)) throw new Error('An account with this email already exists.');
    const user = {
      ...sanitizeMockUser(email),
      password,
    };
    mockUsersByEmail.set(email, user);
    setActiveUserKey(user.email);
    return { user };
  }
  const res = await httpJson('POST', '/api/auth/sign-up', payload);
  setActiveUserKey(res?.user?.email || 'anonymous');
  return { user: res.user };
}

export async function getSession() {
  return { user: null };
}

export async function signOut() {
  setActiveUserKey('anonymous');
  return undefined;
}
