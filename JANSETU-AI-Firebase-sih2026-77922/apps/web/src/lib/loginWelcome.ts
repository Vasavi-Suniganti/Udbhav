const LOGIN_WELCOME_KEY = 'udbhav-login-welcome-pending';

export function markLoginWelcomePending() {
  try {
    window.sessionStorage.setItem(LOGIN_WELCOME_KEY, 'true');
  } catch {}
}

export function clearLoginWelcomePending() {
  try {
    window.sessionStorage.removeItem(LOGIN_WELCOME_KEY);
  } catch {}
}

export function consumeLoginWelcomePending() {
  try {
    const pending = window.sessionStorage.getItem(LOGIN_WELCOME_KEY) === 'true';
    window.sessionStorage.removeItem(LOGIN_WELCOME_KEY);
    return pending;
  } catch {
    return false;
  }
}