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
    return `href="${env.APP_URL}/api/track/${sendId}?to=${encodeURIComponent(url)}"`;
  });
}

/** Rodapé de descadastro — injetado se o template ainda não tiver um. */
function unsubscribeFooter(sendId: string): string {
  return (
    `<div style="margin-top:28px;padding-top:16px;border-top:1px solid #e7e3da;` +
    `font-family:Arial,sans-serif;font-size:12px;color:#8a8784;text-align:center">` +
    `Não quer mais receber estes e-mails? ` +
    `<a href="${unsubscribeUrl(sendId)}" style="color:#e56d23">Descadastrar</a>.` +
    `</div>`
  );
}

export interface RenderedEmail {
  subject: string;
  html: string;
}

/** HTML final de um envio: variáveis + tracking + rodapé de descadastro. */
export function renderForSend(
  subject: string,
  html: string,
  sendId: string,
  vars: Record<string, string | null | undefined>,
): RenderedEmail {
  const withVars = interpolate(html, vars);
  const withClicks = rewriteLinks(withVars, sendId);
  const footer = withVars.includes('/unsubscribe') ? '' : unsubscribeFooter(sendId);
  return { subject: interpolate(subject, vars), html: withClicks + footer + pixel(sendId) };
}

/** Preview (sem tracking), pra UI. */
export function renderPreview(html: string, vars: Record<string, string>): string {
  return interpolate(html, vars);
}
