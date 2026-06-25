'use client';

import { useRef } from 'react';
import EmailEditor from 'react-email-editor';

// API que o componente pai usa para exportar o HTML e carregar um design salvo.
export interface BlockEditorApi {
  exportHtml: () => Promise<{ html: string; design: unknown }>;
  loadDesign: (design: unknown) => void;
}

interface Props {
  clientId: string;
  initialDesign?: unknown | null;
  onReady?: (api: BlockEditorApi) => void;
}

/**
 * Editor visual de e-mail por blocos (arrastar imagem, botão, colunas…),
 * baseado no Unlayer. O upload de imagem vai para o NOSSO Storage (/api/upload),
 * e o HTML gerado é enviado pelo nosso SMTP como qualquer outro.
 *
 * Este componente deve ser carregado com `dynamic(..., { ssr: false })`.
 */
export default function BlockEditor({ clientId, initialDesign, onReady }: Props) {
  const ref = useRef<any>(null);

  function handleReady() {
    const unlayer = ref.current?.editor;
    if (!unlayer) return;

    // carrega um design salvo (ao editar um template existente)
    if (initialDesign) {
      try { unlayer.loadDesign(initialDesign); } catch { /* design inválido */ }
    }

    // upload de imagem → nosso Storage (Supabase), devolve URL pública
    unlayer.registerCallback(
      'image',
      async (
        file: { attachments: File[] },
        done: (arg: { progress: number; url?: string }) => void,
      ) => {
        try {
          const form = new FormData();
          form.append('file', file.attachments[0]);
          form.append('clientId', clientId);
          const res = await fetch('/api/upload', { method: 'POST', body: form });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || 'Falha no upload');
          done({ progress: 100, url: data.url });
        } catch (err) {
          alert((err as Error).message);
          done({ progress: 0 });
        }
      },
    );

    const api: BlockEditorApi = {
      exportHtml: () =>
        new Promise((resolve) => {
          unlayer.exportHtml((data: { html: string; design: unknown }) =>
            resolve({ html: data.html, design: data.design }),
          );
        }),
      loadDesign: (design: unknown) => {
        try { unlayer.loadDesign(design); } catch { /* ignora */ }
      },
    };
    onReady?.(api);
  }

  return (
    <div className="overflow-hidden rounded-lg border border-[var(--border)]">
      <EmailEditor
        ref={ref}
        onReady={handleReady}
        minHeight={560}
        options={{
          locale: 'pt-BR',
          appearance: { theme: 'modern_light' },
          features: { textEditor: { tables: true } },
          // variáveis disponíveis no editor (menu "merge tags")
          mergeTags: {
            nome: { name: 'Nome', value: '{{nome}}' },
            email: { name: 'E-mail', value: '{{email}}' },
            empresa: { name: 'Empresa', value: '{{empresa}}' },
            assinatura: { name: 'Assinatura', value: '{{assinatura}}' },
          },
        }}
      />
    </div>
  );
}
