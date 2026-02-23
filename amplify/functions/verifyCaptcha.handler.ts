interface CaptchaRequest {
  token: string;
}

interface CaptchaResponse {
  success: boolean;
  challenge_ts?: string;
  hostname?: string;
  error_codes?: string[];
}

export const handler = async (event: CaptchaRequest) => {
  const token = event.token;

  if (!token) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "Token missing" }),
    };
  }

  const secretKey = process.env.TURNSTILE_SECRET_KEY;

  if (!secretKey) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Secret key not configured" }),
    };                                    
  }

  try {
    const response = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          secret: secretKey,
          response: token,
        }),
      },
    );

    const data: CaptchaResponse = await response.json();

    if (data.success) {
      return {
        statusCode: 200,
        body: JSON.stringify({ verified: true, data }),
      };
    } else {
      return {
        statusCode: 403,
        body: JSON.stringify({
          verified: false,
          error: "Verification failed",
          errors: data.error_codes,
        }),
      };
    }
  } catch (error) {
    console.error("Captcha verification error:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Server error during verification" }),
    };
  }
};
