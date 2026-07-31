import { env } from '../env';

/**
 * Substitui {{chave}} por valores. Variáveis em dois níveis:
 *  - do cliente: {{empresa}}, {{logo}}, {{assinatura}} (brand_fields)
 *  - do contato: {{nome}}, {{email}} e colunas da planilha
 * Chave ausente vira string vazia.
 */
export function interpolate(
  template: string,
  vars: Record<string, string | null | undefined>,
): string {
  return template.replace(/\{\{\s*([\w.-]+)\s*\}\}/g, (_, key: string) => {
    const v = vars[key];
    return v == null ? '' : String(v);
  });
}

/** Link visível (rodapé): abre a página amigável de descadastro. */
export function unsubscribeUrl(sendId: string): string {
  return `${env.APP_URL}/unsubscribe?s=${sendId}`;
}

/** Endpoint que o Gmail/Yahoo aciona via POST no descadastro one-click. */
export function unsubscribePostUrl(sendId: string): string {
  return `${env.APP_URL}/api/unsubscribe?s=${sendId}`;
}

function pixel(sendId: string): string {
  return `<img src="${env.APP_URL}/api/track/${sendId}" width="1" height="1" alt="" style="display:none" />`;
}

function rewriteLinks(html: string, sendId: string): string {
  return html.replace(/href="(https?:\/\/[^"]+)"/g, (_m, url: string) => {
    // não reescreve links que já apontam para o próprio sistema (evita duplicar tracking)
    if (url.startsWith(env.APP_URL)) return `href="${url}"`;
    return `href="${env.APP_URL}/api/track/${sendId}?to=${encodeURIComponent(url)}"`;
  });
}

/** Rodapé de descadastro — injetado se o template ainda não tiver um.
 *  Usa o nome do cliente ({{empresa}}) e o site (domínio do remetente). */
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

/** Extrai o domínio "site" a partir do e-mail remetente (contato@brewteco.com.br → brewteco.com.br). */
function siteFromEmail(fromEmail?: string): string {
  if (!fromEmail) return '';
  const at = fromEmail.split('@')[1];
  return at ? at.trim().toLowerCase() : '';
}

export interface RenderedEmail {
  subject: string;
  html: string;
}

/** HTML final de um envio: variáveis + tracking + rodapé + fundo branco forçado. */
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

  // Envelope com fundo BRANCO: evita o tom creme que o Gmail aplica quando o
  // e-mail não declara um background explícito.
  const body =
    `<div style="background-color:#ffffff;margin:0;padding:0;width:100%">` +
    withClicks + footer + pixel(sendId) +
    `</div>`;

  return { subject: interpolate(subject, vars), html: body };
}

/** Preview (sem tracking), pra UI. */
export function renderPreview(html: string, vars: Record<string, string>): string {
  return interpolate(html, vars);
}
