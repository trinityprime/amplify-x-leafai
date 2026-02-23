import { Turnstile, useTurnstile } from "react-turnstile";

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

  const handleVerify = (token: string) => {
    if (onVerify) {
      onVerify(token);
    }
  };

  const handleError = (error: Error) => {
    if (onError) {
      onError(error);
    }
  };

  const handleExpire = () => {
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
