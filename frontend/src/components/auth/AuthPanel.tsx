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
        <span className="hidden text-xs text-white/50 sm:inline">{user.email}</span>
        <button
          type="button"
          onClick={() => void signOut()}
          className="rounded-lg border border-greenhouse-700 px-3 py-1.5 text-xs text-greenhouse-300 hover:bg-greenhouse-800"
        >
          {t("auth.signOut")}
        </button>
      </div>
    );
  }

  if (!expanded) {
    return (
      <button
        type="button"
        onClick={() => setExpanded(true)}
        className="rounded-lg border border-greenhouse-700 px-3 py-1.5 text-xs text-greenhouse-300 hover:bg-greenhouse-800"
      >
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
        className="w-32 rounded-lg border border-greenhouse-700 bg-greenhouse-900 px-2 py-1.5 text-xs text-white outline-none sm:w-40"
      />
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder={t("auth.password")}
        className="w-24 rounded-lg border border-greenhouse-700 bg-greenhouse-900 px-2 py-1.5 text-xs text-white outline-none sm:w-28"
      />
      <button type="button" onClick={() => void handleSignIn()} className="rounded-lg bg-greenhouse-500 px-2 py-1.5 text-xs text-white">
        {t("auth.signIn")}
      </button>
      <button type="button" onClick={() => void handleSignUp()} className="rounded-lg border border-greenhouse-600 px-2 py-1.5 text-xs text-greenhouse-300">
        {t("auth.signUp")}
      </button>
      {error && <span className="text-[10px] text-red-400">{error}</span>}
    </div>
  );
}
