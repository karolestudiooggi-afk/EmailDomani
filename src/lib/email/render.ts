import { env } from '../env';

export function interpolate(
  template: string,
  vars: Record<string, string | null | undefined>,
): string {
  return template.replace(/\{\{\s*([\w.-]+)\s*\}\}/g, (_, key: string) => {
    const v = vars[key];
    return v == null ? '' : String(v);
  });
}

export function unsubscribeUrl(sendId: string): string {
  return `${env.APP_URL}/unsubscribe?s=${sendId}`;
}

export function unsubscribePostUrl(sendId: string): string {
  return `${env.APP_URL}/api/unsubscribe?s=${sendId}`;
}

function pixel(sendId: string): string {
  return `<img src="${env.APP_URL}/api/track/${sendId}" width="1" height="1" alt="" style="display:none" />`;
}

function rewriteLinks(html: string, sendId: string): string {
  return html.replace(/href="(https?:\/\/[^"]+)"/g, (_m, url: string) => {
    if (url.startsWith(env.APP_URL)) return `href="${url}"`;
    return `href="${env.APP_URL}/api/track/${sendId}?to=${encodeURIComponent(url)}"`;
  });
}

/** Rodapé de descadastro — nome do cliente + site (domínio do remetente). */
function unsubscribeFooter(sendId: string, brand: string, site: string): string {
  const nome = brand || 'Nós';
  const siteLine = site
    ? `<a href="https://${site}" style="color:#8a8784;text-decoration:none">${site}</a><br />`
    : '';
  return (
    `<div style="margin-top:32px;padding:24px 16px 8px;border-top:1px solid #ececec;` +
    `font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.6;color:#9a9a9a;text-align:center">` +
    `<div style="font-weight:bold;color:#6b6b6b;font-size:13px;margin-bottom:2px">${nome}</div>` +
    siteLine +
    `<div style="margin-top:4px">Você recebeu este e-mail porque se cadastrou na ${nome}.</div>` +
    `<div style="margin-top:10px">` +
    `<a href="${unsubscribeUrl(sendId)}" style="color:#9a9a9a;text-decoration:underline">Cancelar inscrição</a>` +
    `</div>` +
    `</div>`
  );
}

function siteFromEmail(fromEmail?: string): string {
  if (!fromEmail) return '';
  const at = fromEmail.split('@')[1];
  return at ? at.trim().toLowerCase() : '';
}

export interface RenderedEmail {
  subject: string;
  html: string;
}

/** HTML final: variáveis + tracking + rodapé + fundo branco forçado. */
export function renderForSend(
  subject: string,
  html: string,
  sendId: string,
  vars: Record<string, string | null | undefined>,
): RenderedEmail {
  const withVars = interpolate(html, vars);
  const withClicks = rewriteLinks(withVars, sendId);

  const brand = String(vars.empresa ?? '').trim();
  const site = siteFromEmail(String(vars.email_remetente ?? vars.from_email ?? '') || undefined);
  const footer = withVars.includes('/unsubscribe') ? '' : unsubscribeFooter(sendId, brand, site);

  const body =
    `<div style="background-color:#ffffff;margin:0;padding:0;width:100%">` +
    withClicks + footer + pixel(sendId) +
    `</div>`;

  return { subject: interpolate(subject, vars), html: body };
}

export function renderPreview(html: string, vars: Record<string, string>): string {
  return interpolate(html, vars);
}