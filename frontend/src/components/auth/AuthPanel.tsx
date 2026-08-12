import { useState } from "react";
import { useTranslation } from "react-i18next";

import { useAuth } from "@/hooks/useAuth";

export function AuthPanel() {
  const { t } = useTranslation("common");
  const { status, user, signIn, signUp, signOut } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);

  if (status === "unconfigured") {
    return null;
  }

  if (status === "authenticated" && user) {
    return (
      <div className="flex items-center gap-2">
        <span className="hidden text-xs text-label sm:inline">{user.email}</span>
        <button type="button" onClick={() => void signOut()} className="ui-btn-ghost">
          {t("auth.signOut")}
        </button>
      </div>
    );
  }

  if (!expanded) {
    return (
      <button type="button" onClick={() => setExpanded(true)} className="ui-btn-ghost">
        {t("auth.signIn")}
      </button>
    );
  }

  const handleSignIn = async () => {
    setError(null);
    const err = await signIn(email, password);
    if (err) setError(err);
  };

  const handleSignUp = async () => {
    setError(null);
    const err = await signUp(email, password);
    if (err) setError(err);
    else setError(t("auth.checkEmail"));
  };

  return (
    <div className="flex items-end gap-2">
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder={t("auth.email")}
        className="ui-input w-32 py-1.5 text-xs sm:w-40"
      />
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder={t("auth.password")}
        className="ui-input w-24 py-1.5 text-xs sm:w-28"
      />
      <button type="button" onClick={() => void handleSignIn()} className="ui-btn-primary">
        {t("auth.signIn")}
      </button>
      <button type="button" onClick={() => void handleSignUp()} className="ui-btn-secondary">
        {t("auth.signUp")}
      </button>
      {error && <span className="text-[10px] text-red-500">{error}</span>}
    </div>
  );
}
