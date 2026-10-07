import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../auth";
import { AuthCard } from "../components/AuthCard";
import { OtpFlow } from "../components/OtpFlow";

export function LoginPage() {
  const { user, signIn } = useAuth();
  const nav = useNavigate();
  const loc = useLocation() as { state?: { from?: string } };
  if (user) return <Navigate to={loc.state?.from ?? "/"} replace />;
  return (
    <AuthCard title="Book a stylist near you.">
      <p className="sub">Log in with your mobile number — no passwords.</p>
      <OtpFlow onVerified={(r) => { signIn(r); nav(loc.state?.from ?? "/", { replace: true }); }}
        onNeedsSignup={(signupToken, phone) => nav("/signup", { state: { signupToken, phone } })} />
      <p className="note" style={{ textAlign: "center", marginTop: 16 }}>New here? <Link className="link" to="/signup">Create an account</Link></p>
    </AuthCard>
  );
}
