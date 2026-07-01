// Styles partagés entre LoginPage, ForgotPasswordPage et ResetPasswordPage
export const AUTH_STYLES = `
  .auth-root {
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 2rem;
    position: relative;
    overflow: hidden;
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    background:
      radial-gradient(circle at 18% 12%, rgba(124,58,237,0.24), transparent 24%),
      radial-gradient(circle at 88% 18%, rgba(34,211,238,0.14), transparent 24%),
      radial-gradient(circle at 60% 92%, rgba(16,185,129,0.10), transparent 26%),
      #02040c;
  }

  .auth-aurora {
    position: absolute;
    inset: 0;
    pointer-events: none;
  }
  .auth-aurora::before {
    content: '';
    position: absolute;
    width: 600px;
    height: 600px;
    top: -200px;
    left: -150px;
    background: radial-gradient(circle, rgba(139,92,246,0.12) 0%, transparent 70%);
    border-radius: 50%;
  }
  .auth-aurora::after {
    content: '';
    position: absolute;
    width: 500px;
    height: 500px;
    bottom: -150px;
    right: -100px;
    background: radial-gradient(circle, rgba(59,130,246,0.10) 0%, transparent 70%);
    border-radius: 50%;
  }

  .auth-card {
    position: relative;
    z-index: 1;
    display: flex;
    width: 100%;
    max-width: 1120px;
    min-height: 660px;
    border-radius: 28px;
    overflow: hidden;
    background: rgba(4,7,18,0.86);
    border: 1px solid rgba(255,255,255,0.09);
    box-shadow: 0 34px 100px rgba(0,0,0,0.58), 0 0 0 1px rgba(255,255,255,0.035) inset;
    backdrop-filter: blur(24px);
    -webkit-backdrop-filter: blur(24px);
  }
  .auth-right {
    flex: 0.88;
    display: flex;
    flex-direction: column;
    justify-content: center;
    padding: 46px;
    background: linear-gradient(180deg, rgba(255,255,255,0.035), rgba(255,255,255,0.012));
  }

  .auth-right-inner {
    width: 100%;
    max-width: 430px;
    margin: 0 auto;
  }

  .auth-form-shell {
    border: 1px solid rgba(255,255,255,0.08);
    background: rgba(255,255,255,0.035);
    border-radius: 18px;
    padding: 16px;
    box-shadow: inset 0 1px 0 rgba(255,255,255,0.04);
  }

  .auth-input {
    width: 100%;
    padding: 10px 14px;
    border: 1px solid rgba(255,255,255,0.1);
    border-radius: 12px;
    background: rgba(0,0,0,0.18);
    color: #e5e5e5;
    font-size: 13.5px;
    font-family: inherit;
    outline: none;
    transition: all 0.2s ease;
    box-sizing: border-box;
  }
  .auth-input:focus {
    border-color: rgba(139,92,246,0.4);
    box-shadow: 0 0 0 3px rgba(139,92,246,0.08);
    background: rgba(255,255,255,0.05);
  }
  .auth-input::placeholder {
    color: rgba(255,255,255,0.2);
  }
  .auth-btn {
    width: 100%;
    padding: 13px 20px;
    border: none;
    border-radius: 12px;
    background:
      radial-gradient(circle at 16% 0%, rgba(255,255,255,0.28), transparent 28%),
      linear-gradient(135deg, #7c3aed, #8b5cf6 48%, #22d3ee);
    color: #fff;
    font-size: 14px;
    font-weight: 800;
    font-family: inherit;
    cursor: pointer;
    transition: all 0.2s ease;
    letter-spacing: -0.01em;
  }
  .auth-btn:hover {
    background: linear-gradient(135deg, #8b5cf6, #9b6dff 48%, #38bdf8);
    box-shadow: 0 14px 34px rgba(139,92,246,0.32), 0 0 26px rgba(34,211,238,0.16);
  }
  .auth-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .auth-error {
    background: rgba(239,68,68,0.06);
    border: 1px solid rgba(239,68,68,0.15);
    color: #fca5a5;
    font-size: 12.5px;
    padding: 10px 14px;
    border-radius: 10px;
    margin-bottom: 16px;
    display: flex;
    align-items: center;
    gap: 8px;
    line-height: 1.4;
  }

  .auth-divider {
    display: flex;
    align-items: center;
    gap: 12px;
    margin: 18px 0;
  }
  .auth-divider::before,
  .auth-divider::after {
    content: '';
    flex: 1;
    height: 1px;
    background: rgba(255,255,255,0.06);
  }

  .auth-link {
    color: rgba(255,255,255,0.35);
    font-size: 12.5px;
    text-decoration: none;
    transition: color 0.2s;
  }
  .auth-link:hover {
    color: rgba(255,255,255,0.7);
  }
  .auth-link strong {
    color: #a78bfa;
    font-weight: 600;
  }

  @media (max-width: 768px) {
    .auth-card { flex-direction: column; min-height: 100vh; max-width: 100vw; border-radius: 0; }
    .auth-right { width: 100%; padding: 1.4rem 1.35rem 1.6rem; justify-content: flex-start; min-height: auto; }
    .auth-right-inner { max-width: none; }
    .auth-root { padding: 0; }
  }
`
