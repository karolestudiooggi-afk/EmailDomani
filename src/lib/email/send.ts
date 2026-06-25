import type { Transporter } from 'nodemailer';

export interface SendResult {
  ok: boolean;
  messageId?: string;
  error?: string;
}

/** Envia um e-mail por um transporter já construído (do cliente). */
export async function sendOne(
  transporter: Transporter,
  mock: boolean,
  opts: {
    to: string;
    from: string;
    subject: string;
    html: string;
    headers?: Record<string, string>;
  },
): Promise<SendResult> {
  if (mock) {
    console.log(`[MOCK] → ${opts.to} | ${opts.subject}`);
    return { ok: true, messageId: `mock-${Date.now()}` };
  }
  try {
    const info = await transporter.sendMail(opts);
    if (info.rejected && info.rejected.length > 0) {
      return { ok: false, error: `Rejeitado: ${info.rejected.join(', ')}` };
    }
    return { ok: true, messageId: info.messageId };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}

export function fromAddress(name: string, email: string): string {
  return `"${name}" <${email}>`;
}
