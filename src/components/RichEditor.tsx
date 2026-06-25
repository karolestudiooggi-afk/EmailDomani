'use client';

import { useEffect, useRef, useState } from 'react';

interface Props {
  value: string;
  onChange: (html: string) => void;
  clientId: string;
}

const VARS = [
  { tag: '{{nome}}', label: 'Nome' },
  { tag: '{{email}}', label: 'E-mail' },
  { tag: '{{empresa}}', label: 'Empresa' },
  { tag: '{{assinatura}}', label: 'Assinatura' },
];

/**
 * Editor de e-mail para quem não é técnico: barra de formatação tipo Word,
 * upload de imagem (vai pro Storage e entra como <img>), inserção de variáveis
 * e um modo "HTML" para quem quiser editar o código direto.
 */
export function RichEditor({ value, onChange, clientId }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [mode, setMode] = useState<'visual' | 'html'>('visual');
  const [uploading, setUploading] = useState(false);
  const [color, setColor] = useState('#e56d23');

  // inicializa o conteúdo do editor uma vez (evita pulo de cursor)
  useEffect(() => {
    if (ref.current && mode === 'visual' && ref.current.innerHTML !== value) {
      ref.current.innerHTML = value;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  function sync() {
    if (ref.current) onChange(ref.current.innerHTML);
  }

  function exec(cmd: string, arg?: string) {
    document.execCommand(cmd, false, arg);
    ref.current?.focus();
    sync();
  }

  function insertHtml(html: string) {
    ref.current?.focus();
    document.execCommand('insertHTML', false, html);
    sync();
  }

  function insertVar(tag: string) {
    if (mode === 'html') {
      onChange(value + tag);
    } else {
      insertHtml(tag);
    }
  }

  async function onPickImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const form = new FormData();
      form.append('file', file);
      form.append('clientId', clientId);
      const res = await fetch('/api/upload', { method: 'POST', body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Falha no upload');
      const img = `<img src="${data.url}" alt="" style="max-width:100%;height:auto;display:block;margin:8px 0" />`;
      if (mode === 'html') onChange(value + img);
      else insertHtml(img);
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  function addLink() {
    const url = prompt('URL do link (https://...)');
    if (url) exec('createLink', url);
  }

  const btn =
    'h-8 min-w-8 px-2 rounded-md text-sm text-ink/70 hover:bg-stone-100 hover:text-ink transition-colors flex items-center justify-center';

  return (
    <div className="rounded-lg border border-[var(--border)] bg-white">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-1 border-b border-[var(--border)] px-2 py-1.5">
        <button type="button" className={btn} onClick={() => exec('bold')} title="Negrito"><b>B</b></button>
        <button type="button" className={`${btn} italic`} onClick={() => exec('italic')} title="Itálico">I</button>
        <button type="button" className={`${btn} underline`} onClick={() => exec('underline')} title="Sublinhado">U</button>
        <span className="mx-1 h-5 w-px bg-[var(--border)]" />
        <button type="button" className={btn} onClick={() => exec('formatBlock', 'h2')} title="Título">H</button>
        <button type="button" className={btn} onClick={() => exec('formatBlock', 'p')} title="Parágrafo">¶</button>
        <button type="button" className={btn} onClick={() => exec('insertUnorderedList')} title="Lista">• —</button>
        <span className="mx-1 h-5 w-px bg-[var(--border)]" />
        <button type="button" className={btn} onClick={() => exec('justifyLeft')} title="Esquerda">⬅</button>
        <button type="button" className={btn} onClick={() => exec('justifyCenter')} title="Centro">⬌</button>
        <button type="button" className={btn} onClick={() => exec('justifyRight')} title="Direita">➡</button>
        <span className="mx-1 h-5 w-px bg-[var(--border)]" />
        <label className={`${btn} cursor-pointer`} title="Cor do texto">
          <span style={{ color }}>A</span>
          <input
            type="color"
            value={color}
            onChange={(e) => { setColor(e.target.value); exec('foreColor', e.target.value); }}
            className="absolute h-0 w-0 opacity-0"
          />
        </label>
        <button type="button" className={btn} onClick={addLink} title="Link">🔗</button>
        <button type="button" className={btn} onClick={() => fileRef.current?.click()} disabled={uploading} title="Imagem">
          {uploading ? '…' : '🖼'}
        </button>
        <input ref={fileRef} type="file" accept="image/*" onChange={onPickImage} className="hidden" />

        <div className="ml-auto flex items-center gap-1">
          <button
            type="button"
            onClick={() => { if (mode === 'html' && ref.current) ref.current.innerHTML = value; setMode(mode === 'visual' ? 'html' : 'visual'); }}
            className="h-8 rounded-md px-2.5 text-xs font-medium text-ink/60 hover:bg-stone-100"
          >
            {mode === 'visual' ? '</> HTML' : '✎ Visual'}
          </button>
        </div>
      </div>

      {/* Variáveis */}
      <div className="flex flex-wrap items-center gap-1.5 border-b border-[var(--border)] bg-stone-50 px-2 py-1.5">
        <span className="text-[11px] uppercase tracking-wide text-ink/40">Inserir:</span>
        {VARS.map((v) => (
          <button
            key={v.tag}
            type="button"
            onClick={() => insertVar(v.tag)}
            className="rounded-md bg-white px-2 py-0.5 text-xs text-brand-600 ring-1 ring-[var(--border)] hover:bg-brand-50"
          >
            {v.label}
          </button>
        ))}
      </div>

      {/* Área de edição */}
      {mode === 'visual' ? (
        <div
          ref={ref}
          contentEditable
          onInput={sync}
          className="min-h-[320px] px-4 py-3 text-sm text-ink focus:outline-none [&_h2]:text-lg [&_h2]:font-semibold [&_a]:text-brand-600 [&_a]:underline [&_ul]:list-disc [&_ul]:pl-5"
          suppressContentEditableWarning
        />
      ) : (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={16}
          className="w-full resize-y px-4 py-3 font-mono text-xs text-ink focus:outline-none"
          placeholder="<div>Seu HTML…</div>"
        />
      )}
    </div>
  );
}
