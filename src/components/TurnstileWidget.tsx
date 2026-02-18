import { Turnstile, useTurnstile } from "react-turnstile";
import { useState } from "react";

interface TurnstileWidgetProps {
  onVerify?: (token: string) => void;
  onError?: (error: Error) => void;
  theme?: "light" | "dark" | "auto";
  size?: "normal" | "compact" | "flexible";
}

export default function TurnstileWidget({
  onVerify,
  onError,
  theme = "auto",
  size = "normal",
}: TurnstileWidgetProps) {
  const turnstile = useTurnstile();
  const [isVerified, setIsVerified] = useState(false);

  const handleVerify = (token: string) => {
    console.log(
      "✅ Captcha verified with token:",
      token.substring(0, 20) + "...",
    );
    setIsVerified(true);
    if (onVerify) {
      onVerify(token);
    }
  };

  const handleError = (error: Error) => {
    console.error("❌ Captcha error:", error);
    setIsVerified(false);
    if (onError) {
      onError(error);
    }
  };

  const handleExpire = () => {
    console.log("⏰ Captcha token expired");
    setIsVerified(false);
    if (turnstile) {
      turnstile.reset();
    }
  };

  return (
    <div className="flex justify-center my-4">
      <Turnstile
        sitekey={import.meta.env.VITE_TURNSTILE_SITE_KEY}
        onVerify={handleVerify}
        onError={handleError}
        onExpire={handleExpire}
        theme={theme}
        size={size}
        fixedSize={true}
        refreshExpired="auto"
      />
    </div>
  );
}
