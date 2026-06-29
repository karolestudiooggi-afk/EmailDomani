import nodemailer, { type Transporter } from 'nodemailer';
import { decrypt } from '../crypto';
import { env } from '../env';

export interface ClientSmtp {
  smtp_host: string | null;
  smtp_port: number | null;
  smtp_secure: boolean | null;
  smtp_user: string | null;
  smtp_pass_enc?: string | null;
}

// Porta 465 = TLS direto (SSL). Demais (587, 2525, 25) = STARTTLS.
// Deriva sozinho pela porta — não depende de o usuário marcar a caixinha certa.
function isDirectTls(port: number, secureFlag: boolean | null): boolean {
  if (port === 465) return true;
  if (port === 587 || port === 2525 || port === 25) return false;
  return secureFlag ?? false;
}

/**
 * Transporter ÚNICO da agência (conta SendPulse), lido do .env.
 * É o mesmo para todos os clientes — o que muda por cliente é só o remetente
 * (from_name/from_email). Sem SMTP_HOST no .env → modo mock (loga, não envia).
 */
let _agency: { transporter: Transporter; mock: boolean } | null = null;

export function buildAgencyTransporter(): { transporter: Transporter; mock: boolean } {
  if (_agency) return _agency;

  if (!env.SMTP_HOST) {
    _agency = { transporter: nodemailer.createTransport({ jsonTransport: true }), mock: true };
    return _agency;
  }
  const port = env.SMTP_PORT;
  const transporter = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port,
    secure: isDirectTls(port, env.SMTP_SECURE),
    auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASS ?? '' } : undefined,
    pool: true,
    maxConnections: 3,
    maxMessages: 50,
    connectionTimeout: 15000,
    greetingTimeout: 15000,
  });
  _agency = { transporter, mock: false };
  return _agency;
}

/**
 * (Legado) Constrói um transporter a partir do SMTP de um cliente.
 * Mantido por compatibilidade; o envio agora usa buildAgencyTransporter().
 */
export function buildTransporter(c: ClientSmtp): { transporter: Transporter; mock: boolean } {
  if (!c.smtp_host) {
    return { transporter: nodemailer.createTransport({ jsonTransport: true }), mock: true };
  }
  const port = c.smtp_port ?? 587;
  const transporter = nodemailer.createTransport({
    host: c.smtp_host,
    port,
    secure: isDirectTls(port, c.smtp_secure),
    auth: c.smtp_user
      ? { user: c.smtp_user, pass: c.smtp_pass_enc ? decrypt(c.smtp_pass_enc) : '' }
      : undefined,
    pool: true,
    maxConnections: 3,
    maxMessages: 50,
    connectionTimeout: 15000,
    greetingTimeout: 15000,
  });
  return { transporter, mock: false };
}

/** Verifica se o SMTP da agência (do .env) conecta. Usado no botão "testar conexão". */
export async function verifyAgencySmtp(): Promise<{ ok: boolean; error?: string }> {
  if (!env.SMTP_HOST) return { ok: false, error: 'SMTP_HOST não configurado no .env.' };
  return verifySmtp({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_SECURE,
    user: env.SMTP_USER ?? '',
    pass: env.SMTP_PASS ?? '',
  });
}

/** Verifica se as credenciais conectam (tela "testar conexão"). */
export async function verifySmtp(raw: {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
}): Promise<{ ok: boolean; error?: string }> {
  try {
    const t = nodemailer.createTransport({
      host: raw.host,
      port: raw.port,
      secure: isDirectTls(raw.port, raw.secure),
      auth: { user: raw.user, pass: raw.pass },
      connectionTimeout: 15000,
      greetingTimeout: 15000,
    });
    await t.verify();
    return { ok: true };
  } catch (err) {
    const msg = (err as Error).message;
    // timeout = quase sempre bloqueio de porta na rede de quem está testando
    if (/ETIMEDOUT|ECONNREFUSED|timeout/i.test(msg)) {
      return {
        ok: false,
        error:
          'Não foi possível conectar (timeout). Isso costuma ser bloqueio das portas de e-mail na rede local — ' +
          'teste novamente após o deploy (Vercel/servidor), onde as portas são liberadas. Detalhe: ' +
          msg,
      };
    }
    return { ok: false, error: msg };
  }
}
