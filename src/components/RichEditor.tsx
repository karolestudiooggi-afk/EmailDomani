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

const I = {
  bold: <path d="M6 4h8a4 4 0 0 1 0 8H6zM6 12h9a4 4 0 0 1 0 8H6z" />,
  italic: <><line x1="19" y1="4" x2="10" y2="4" /><line x1="14" y1="20" x2="5" y2="20" /><line x1="15" y1="4" x2="9" y2="20" /></>,
  underline: <><path d="M6 4v6a6 6 0 0 0 12 0V4" /><line x1="4" y1="21" x2="20" y2="21" /></>,
  h: <><path d="M6 4v16" /><path d="M18 4v16" /><path d="M6 12h12" /></>,
  list: <><line x1="9" y1="6" x2="20" y2="6" /><line x1="9" y1="12" x2="20" y2="12" /><line x1="9" y1="18" x2="20" y2="18" /><circle cx="4" cy="6" r="1" /><circle cx="4" cy="12" r="1" /><circle cx="4" cy="18" r="1" /></>,
  alignLeft: <><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="15" y2="12" /><line x1="3" y1="18" x2="18" y2="18" /></>,
  alignCenter: <><line x1="3" y1="6" x2="21" y2="6" /><line x1="6" y1="12" x2="18" y2="12" /><line x1="5" y1="18" x2="19" y2="18" /></>,
  alignRight: <><line x1="3" y1="6" x2="21" y2="6" /><line x1="9" y1="12" x2="21" y2="12" /><line x1="6" y1="18" x2="21" y2="18" /></>,
  link: <><path d="M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1" /><path d="M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1" /></>,
  image: <><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="m21 15-5-5L5 21" /></>,
};

function Icon({ children }: { children: React.ReactNode }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      {children}
    </svg>
  );
}

export function RichEditor({ value, onChange, clientId }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [mode, setMode] = useState<'visual' | 'html'>('visual');
  const [uploading, setUploading] = useState(false);
  const [color, setColor] = useState('#e56d23');
  const [linkOpen, setLinkOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const savedRange = useRef<Range | null>(null);

  useEffect(() => {
    if (ref.current && mode === 'visual' && ref.current.innerHTML !== value) {
      ref.current.innerHTML = value;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  function sync() { if (ref.current) onChange(ref.current.innerHTML); }
  function saveSelection() {
    const sel = window.getSelection();
    if (sel && sel.rangeCount) savedRange.current = sel.getRangeAt(0).cloneRange();
  }
  function restoreSelection() {
    const sel = window.getSelection();
    if (savedRange.current && sel) { sel.removeAllRanges(); sel.addRange(savedRange.current); }
  }
  function exec(cmd: string, arg?: string) {
    ref.current?.focus();
    document.execCommand(cmd, false, arg);
    sync();
  }
  function insertHtml(html: string) {
    ref.current?.focus();
    restoreSelection();
    document.execCommand('insertHTML', false, html);
    sync();
  }
  function insertVar(tag: string) {
    if (mode === 'html') onChange(value + tag);
    else insertHtml(tag);
  }
  function confirmLink() {
    if (linkUrl.trim()) {
      ref.current?.focus();
      restoreSelection();
      document.execCommand('createLink', false, linkUrl.trim());
      sync();
    }
    setLinkOpen(false); setLinkUrl('');
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

  const tool = 'flex h-8 w-8 items-center justify-center rounded-md text-ink/65 hover:bg-stone-100 hover:text-ink active:bg-stone-200 transition-colors';

  return (
    <div className="overflow-hidden rounded-lg border border-[var(--border)] bg-white">
      <div className="flex flex-wrap items-center gap-0.5 border-b border-[var(--border)] bg-stone-50/60 px-2 py-1.5">
        <button type="button" className={tool} onClick={() => exec('bold')} title="Negrito"><Icon>{I.bold}</Icon></button>
        <button type="button" className={tool} onClick={() => exec('italic')} title="Itálico"><Icon>{I.italic}</Icon></button>
        <button type="button" className={tool} onClick={() => exec('underline')} title="Sublinhado"><Icon>{I.underline}</Icon></button>
        <span className="mx-1 h-5 w-px bg-[var(--border)]" />
        <button type="button" className={tool} onClick={() => exec('formatBlock', 'h2')} title="Título"><Icon>{I.h}</Icon></button>
        <button type="button" className={tool} onClick={() => exec('insertUnorderedList')} title="Lista"><Icon>{I.list}</Icon></button>
        <span className="mx-1 h-5 w-px bg-[var(--border)]" />
        <button type="button" className={tool} onClick={() => exec('justifyLeft')} title="Alinhar à esquerda"><Icon>{I.alignLeft}</Icon></button>
        <button type="button" className={tool} onClick={() => exec('justifyCenter')} title="Centralizar"><Icon>{I.alignCenter}</Icon></button>
        <button type="button" className={tool} onClick={() => exec('justifyRight')} title="Alinhar à direita"><Icon>{I.alignRight}</Icon></button>
        <span className="mx-1 h-5 w-px bg-[var(--border)]" />
        <label className={`${tool} relative cursor-pointer`} title="Cor do texto" style={{ color }}>
          <span className="text-[15px] font-semibold leading-none">A</span>
          <span className="absolute bottom-1 h-1 w-4 rounded" style={{ background: color }} />
          <input type="color" value={color} onChange={(e) => { setColor(e.target.value); exec('foreColor', e.target.value); }} className="absolute inset-0 cursor-pointer opacity-0" />
        </label>
        <button type="button" className={tool} onMouseDown={(e) => { e.preventDefault(); saveSelection(); }} onClick={() => setLinkOpen((v) => !v)} title="Inserir link"><Icon>{I.link}</Icon></button>
        <span className="mx-1 h-5 w-px bg-[var(--border)]" />
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="flex h-8 items-center gap-1.5 rounded-md bg-brand-50 px-2.5 text-xs font-medium text-brand-700 hover:bg-brand-100 active:bg-brand-200 transition-colors disabled:opacity-50"
          title="Enviar uma imagem do seu computador"
        >
          <Icon>{I.image}</Icon>
          {uploading ? 'Enviando…' : 'Imagem'}
        </button>
        <input ref={fileRef} type="file" accept="image/*" onChange={onPickImage} className="hidden" />
        <button
          type="button"
          onClick={() => { if (mode === 'html' && ref.current) ref.current.innerHTML = value; setMode(mode === 'visual' ? 'html' : 'visual'); }}
          className="ml-auto h-8 rounded-md px-2.5 text-xs font-medium text-ink/55 hover:bg-stone-100 active:bg-stone-200 transition-colors"
          title="Alternar entre editor visual e código HTML"
        >
          {mode === 'visual' ? '</> HTML' : '✎ Visual'}
        </button>
      </div>

      {linkOpen && (
        <div className="flex items-center gap-2 border-b border-[var(--border)] bg-white px-3 py-2">
          <input
            autoFocus
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') confirmLink(); if (e.key === 'Escape') { setLinkOpen(false); setLinkUrl(''); } }}
            placeholder="https://..."
            className="flex-1 rounded-md border border-[var(--border)] px-2.5 py-1.5 text-sm focus:border-brand-400 focus:outline-none"
          />
          <button type="button" onClick={confirmLink} className="rounded-md bg-brand-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-600">Aplicar</button>
          <button type="button" onClick={() => { setLinkOpen(false); setLinkUrl(''); }} className="rounded-md px-2 py-1.5 text-xs text-ink/50 hover:bg-stone-100">Cancelar</button>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-1.5 border-b border-[var(--border)] bg-white px-3 py-2">
        <span className="text-[11px] uppercase tracking-wide text-ink/40">Inserir variável:</span>
        {VARS.map((v) => (
          <button
            key={v.tag}
            type="button"
            onMouseDown={(e) => { e.preventDefault(); saveSelection(); }}
            onClick={() => insertVar(v.tag)}
            className="rounded-md bg-stone-50 px-2 py-0.5 text-xs text-brand-600 ring-1 ring-[var(--border)] hover:bg-brand-50 active:bg-brand-100 transition-colors"
          >
            {v.label}
          </button>
        ))}
      </div>

      {mode === 'visual' ? (
        <div
          ref={ref}
          contentEditable
          onInput={sync}
          onMouseUp={saveSelection}
          onKeyUp={saveSelection}
          className="min-h-[340px] px-4 py-3 text-sm leading-relaxed text-ink focus:outline-none [&_h2]:mb-2 [&_h2]:text-lg [&_h2]:font-semibold [&_a]:text-brand-600 [&_a]:underline [&_ul]:list-disc [&_ul]:pl-5 [&_img]:rounded-md"
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
