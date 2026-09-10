/**
 * ZIP + HTML viewer exporter
 *
 * Builds a .zip file containing:
 *   - data.json  — the full buobu export JSON
 *   - index.html — a self-contained, zero-dependency HTML viewer
 *
 * Uses the ZIP STORE method (no compression) so no external library is needed.
 * The spec reference is: PKWARE Application Note, section 4.3.
 */

import type { Database } from "@/lib/rxdb";
import { createExportFile } from "./exporter";

// ---------------------------------------------------------------------------
// Uncompressed ZIP builder
// ---------------------------------------------------------------------------

function encodeUtf8(str: string): Uint8Array {
  return new TextEncoder().encode(str);
}

function u16le(n: number): number[] {
  return [n & 0xff, (n >> 8) & 0xff];
}

function u32le(n: number): number[] {
  return [n & 0xff, (n >> 8) & 0xff, (n >> 16) & 0xff, (n >> 24) & 0xff];
}

/** CRC-32 lookup table (IEEE polynomial 0xEDB88320) */
const CRC32_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    t[i] = c;
  }
  return t;
})();

function crc32(data: Uint8Array): number {
  let crc = 0xffffffff;
  for (let i = 0; i < data.length; i++) {
    crc = CRC32_TABLE[(crc ^ data[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

type ZipEntry = {
  filename: Uint8Array;
  data: Uint8Array;
  crc: number;
  offset: number;
};

function buildZip(files: Array<{ name: string; content: Uint8Array }>): Uint8Array {
  const entries: ZipEntry[] = [];
  const parts: Uint8Array[] = [];
  let offset = 0;

  for (const file of files) {
    const nameBytes = encodeUtf8(file.name);
    const data = file.content;
    const crc = crc32(data);

    const localHeader = new Uint8Array([
      0x50, 0x4b, 0x03, 0x04, // local file header signature
      0x14, 0x00,             // version needed: 2.0
      0x00, 0x00,             // general purpose bit flag
      0x00, 0x00,             // compression method: STORE
      ...u16le(0x0000),       // last mod file time
      ...u16le(0x5400),       // last mod file date (2024-01-01)
      ...u32le(crc),          // crc-32
      ...u32le(data.length),  // compressed size
      ...u32le(data.length),  // uncompressed size
      ...u16le(nameBytes.length), // file name length
      0x00, 0x00,             // extra field length
      ...nameBytes,
    ]);

    entries.push({ filename: nameBytes, data, crc, offset });
    parts.push(localHeader, data);
    offset += localHeader.length + data.length;
  }

  // Central directory
  const cdStart = offset;
  for (const entry of entries) {
    const cdEntry = new Uint8Array([
      0x50, 0x4b, 0x01, 0x02, // central dir signature
      0x14, 0x00,             // version made by
      0x14, 0x00,             // version needed
      0x00, 0x00,             // general purpose bit flag
      0x00, 0x00,             // compression method: STORE
      ...u16le(0x0000),       // last mod time
      ...u16le(0x5400),       // last mod date
      ...u32le(entry.crc),
      ...u32le(entry.data.length),
      ...u32le(entry.data.length),
      ...u16le(entry.filename.length),
      0x00, 0x00,             // extra field length
      0x00, 0x00,             // file comment length
      0x00, 0x00,             // disk number start
      0x00, 0x00,             // internal file attributes
      0x00, 0x00, 0x00, 0x00, // external file attributes
      ...u32le(entry.offset),
      ...entry.filename,
    ]);
    parts.push(cdEntry);
    offset += cdEntry.length;
  }

  const cdSize = offset - cdStart;

  // End of central directory record
  const eocd = new Uint8Array([
    0x50, 0x4b, 0x05, 0x06,       // EOCD signature
    0x00, 0x00,                   // disk number
    0x00, 0x00,                   // disk with start of CD
    ...u16le(entries.length),     // entries on this disk
    ...u16le(entries.length),     // total entries
    ...u32le(cdSize),             // size of central directory
    ...u32le(cdStart),            // offset of central directory
    0x00, 0x00,                   // comment length
  ]);
  parts.push(eocd);

  // Concatenate all parts
  const total = parts.reduce((s, p) => s + p.length, 0);
  const out = new Uint8Array(total);
  let pos = 0;
  for (const p of parts) {
    out.set(p, pos);
    pos += p.length;
  }
  return out;
}

// ---------------------------------------------------------------------------
// Self-contained HTML viewer template
// ---------------------------------------------------------------------------

function buildViewerHtml(exportJson: string): string {
  // Escape </script> sequences inside the JSON so they don't break the script tag
  const safeJson = exportJson.replace(/<\/script>/gi, "<\\/script>");

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>buobu Export Viewer</title>
<style>
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
  :root{
    --bg:#0f0f0f;--surface:#1a1a1a;--border:#2e2e2e;--text:#e5e5e5;
    --muted:#8a8a8a;--primary:#7c6cfc;--accent:#2a2a2a;
    --tag-bg:#252525;--tag-text:#c0bff8;
  }
  body{background:var(--bg);color:var(--text);font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:14px;line-height:1.5}
  a{color:var(--primary);text-decoration:none}
  a:hover{text-decoration:underline}
  /* layout */
  .app{display:flex;height:100dvh;overflow:hidden}
  .sidebar{width:220px;flex-shrink:0;border-right:1px solid var(--border);display:flex;flex-direction:column;background:var(--surface)}
  .sidebar-header{padding:16px;border-bottom:1px solid var(--border)}
  .sidebar-header h1{font-size:15px;font-weight:600;color:var(--text)}
  .sidebar-header p{font-size:11px;color:var(--muted);margin-top:2px}
  .nav{flex:1;overflow-y:auto;padding:8px}
  .nav-btn{display:flex;align-items:center;gap:8px;width:100%;padding:7px 10px;border-radius:6px;border:none;background:none;color:var(--muted);cursor:pointer;font-size:13px;text-align:left;transition:background .15s,color .15s}
  .nav-btn:hover{background:var(--accent);color:var(--text)}
  .nav-btn.active{background:var(--primary);color:#fff}
  .nav-btn .count{margin-left:auto;font-size:11px;background:rgba(255,255,255,.1);padding:1px 6px;border-radius:9px}
  .nav-btn.active .count{background:rgba(255,255,255,.25)}
  .main{flex:1;display:flex;flex-direction:column;min-width:0;overflow:hidden}
  .topbar{padding:10px 20px;border-bottom:1px solid var(--border);display:flex;align-items:center;gap:8px;flex-shrink:0;flex-wrap:wrap}
  .topbar h2{font-size:15px;font-weight:600;margin-right:4px}
  .filter-select{padding:5px 8px;border-radius:6px;border:1px solid var(--border);background:var(--accent);color:var(--text);font-size:12px;outline:none;cursor:pointer;max-width:160px}
  .filter-select:focus{border-color:var(--primary)}
  .search{margin-left:auto;padding:5px 10px;border-radius:6px;border:1px solid var(--border);background:var(--accent);color:var(--text);font-size:13px;width:200px;outline:none}
  .search:focus{border-color:var(--primary)}
  .content{flex:1;overflow-y:auto;padding:20px}
  /* cards */
  .grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:12px}
  .card{background:var(--surface);border:1px solid var(--border);border-radius:8px;padding:12px;cursor:pointer;transition:border-color .15s}
  .card:hover{border-color:var(--primary)}
  .card-title{font-weight:500;line-height:1.3;margin-bottom:4px;word-break:break-word}
  .card-sub{font-size:12px;color:var(--muted);line-height:1.4;margin-bottom:6px}
  .badges{display:flex;flex-wrap:wrap;gap:4px;margin-top:6px}
  .badge{display:inline-flex;align-items:center;padding:2px 7px;border-radius:20px;font-size:11px;font-weight:500}
  .badge-default{background:var(--tag-bg);color:var(--tag-text)}
  .badge-high{background:#3d1111;color:#f87171}
  .badge-medium{background:#3d2e00;color:#fbbf24}
  .badge-low{background:#0c2a1a;color:#4ade80}
  .badge-primary{background:#2d2460;color:#c0bff8}
  /* detail panel */
  .detail-overlay{position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:100;display:flex;justify-content:flex-end}
  .detail-panel{width:min(560px,100vw);height:100%;background:var(--surface);border-left:1px solid var(--border);overflow-y:auto;padding:24px;display:flex;flex-direction:column;gap:16px}
  .detail-close{align-self:flex-end;border:none;background:none;color:var(--muted);cursor:pointer;font-size:18px;line-height:1;padding:4px 8px;border-radius:4px}
  .detail-close:hover{background:var(--accent);color:var(--text)}
  .detail-title{font-size:18px;font-weight:600;line-height:1.3}
  .section-label{font-size:11px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;color:var(--muted);margin-bottom:4px}
  .detail-section{display:flex;flex-direction:column;gap:4px}
  /* prose — used for rendered markdown */
  .prose{font-size:13px;line-height:1.7;color:var(--text);word-break:break-word}
  .prose h1{font-size:1.25em;font-weight:700;margin:10px 0 4px}
  .prose h2{font-size:1.1em;font-weight:600;margin:8px 0 4px}
  .prose h3{font-size:1em;font-weight:600;margin:6px 0 3px}
  .prose p{margin:4px 0}
  .prose ul,.prose ol{padding-left:20px;margin:4px 0}
  .prose li{margin:2px 0}
  .prose blockquote{border-left:3px solid var(--primary);padding-left:10px;color:var(--muted);margin:6px 0}
  .prose code{background:var(--accent);padding:1px 5px;border-radius:3px;font-size:12px;font-family:monospace}
  .prose pre{background:var(--accent);border-radius:6px;padding:10px 12px;overflow-x:auto;margin:6px 0}
  .prose pre code{background:none;padding:0;font-size:12px}
  .prose hr{border:none;border-top:1px solid var(--border);margin:10px 0}
  .prose a{color:var(--primary)}
  .prose strong{font-weight:700}
  .prose em{font-style:italic}
  .meta-row{display:flex;justify-content:space-between;font-size:12px;padding:4px 0;border-bottom:1px solid var(--border)}
  .meta-row:last-child{border-bottom:none}
  .meta-key{color:var(--muted)}
  .act-grid{display:grid;grid-template-columns:repeat(28,1fr);gap:2px;margin-top:4px}
  .act-cell{aspect-ratio:1;border-radius:2px;background:var(--border)}
  .act-cell.d1{background:#3d2460}
  .act-cell.d2{background:#6d4bd6}
  .act-cell.d3{background:var(--primary)}
  .empty{display:flex;flex-direction:column;align-items:center;justify-content:center;padding:64px 0;color:var(--muted);gap:8px;font-size:13px}
  .hidden{display:none!important}
</style>
</head>
<body>
<script>
const RAW = ${safeJson};
const data = RAW.data;
const exportedAt = RAW.exportedAt;

const boardMap = new Map((data.boards||[]).map(b=>[b.id,b]));
const swimlaneMap = new Map((data.swimlanes||[]).map(s=>[s.id,s]));
const logsByHabit = {};
(data.habitLogs||[]).filter(l=>!l._deleted).forEach(l=>{
  if(!logsByHabit[l.habitId]) logsByHabit[l.habitId]=[];
  logsByHabit[l.habitId].push(l);
});

function fmt(d){
  if(!d) return '—';
  try{ return new Date(d).toLocaleDateString(undefined,{month:'short',day:'numeric',year:'numeric'}); }
  catch{return d;}
}
function strip(h){return (h||'').replace(/#+\\s/g,'').replace(/\\*\\*/g,'').replace(/\\*/g,'').replace(/_/g,'').replace(/\\[([^\\]]+)\\]\\([^)]+\\)/g,'$1').replace(/<[^>]*>/g,' ').replace(/\\s+/g,' ').trim();}

// ---------------------------------------------------------------------------
// Minimal Markdown → HTML renderer (zero dependencies)
// Supports: headings, bold, italic, inline code, fenced code blocks,
//           unordered/ordered lists, blockquotes, links, images, <hr>, paragraphs
// ---------------------------------------------------------------------------
function mdToHtml(md){
  if(!md) return '';
  let s = md;
  // Fenced code blocks
  s = s.replace(/\`\`\`([\\s\\S]*?)\`\`\`/g, (_,c)=>\`<pre><code>\${escHtml(c.trim())}</code></pre>\`);
  // Process line by line for block elements
  const lines = s.split('\\n');
  const out = [];
  let i = 0;
  while(i < lines.length){
    const line = lines[i];
    // Headings
    const hm = line.match(/^(#{1,6})\\s+(.*)/);
    if(hm){ out.push(\`<h\${hm[1].length}>\${inlineMd(hm[2])}</h\${hm[1].length}>\`); i++; continue; }
    // HR
    if(/^([-*_]){3,}\\s*$/.test(line)){ out.push('<hr>'); i++; continue; }
    // Blockquote
    if(line.startsWith('> ')){
      const bqLines=[];
      while(i<lines.length && lines[i].startsWith('> ')){ bqLines.push(lines[i].slice(2)); i++; }
      out.push(\`<blockquote>\${mdToHtml(bqLines.join('\\n'))}</blockquote>\`);
      continue;
    }
    // Unordered list
    if(/^[-*+]\\s/.test(line)){
      const ulItems=[];
      while(i<lines.length && /^[-*+]\\s/.test(lines[i])){ ulItems.push(\`<li>\${inlineMd(lines[i].replace(/^[-*+]\\s/,''))}</li>\`); i++; }
      out.push(\`<ul>\${ulItems.join('')}</ul>\`);
      continue;
    }
    // Ordered list
    if(/^\\d+\\.\\s/.test(line)){
      const olItems=[];
      while(i<lines.length && /^\\d+\\.\\s/.test(lines[i])){ olItems.push(\`<li>\${inlineMd(lines[i].replace(/^\\d+\\.\\s/,''))}</li>\`); i++; }
      out.push(\`<ol>\${olItems.join('')}</ol>\`);
      continue;
    }
    // Pre-rendered block (from fenced code pass above)
    if(line.startsWith('<pre>')||line.startsWith('<blockquote>')||line.startsWith('<ul>')||line.startsWith('<ol>')||line.startsWith('<hr>')||/^<h[1-6]>/.test(line)){
      out.push(line); i++; continue;
    }
    // Blank line — paragraph break
    if(line.trim()==='') { out.push(''); i++; continue; }
    // Paragraph text
    const paraLines=[];
    while(i<lines.length && lines[i].trim()!=='' && !/^(#{1,6}\\s|[-*+]\\s|\\d+\\.\\s|> |[-*_]{3}|<pre>)/.test(lines[i])){ paraLines.push(lines[i]); i++; }
    if(paraLines.length) out.push(\`<p>\${inlineMd(paraLines.join(' '))}</p>\`);
  }
  return out.filter(l=>l!=='').join('\\n');
}
function inlineMd(s){
  // inline code first (protect from other replacements)
  const codes=[];
  s=s.replace(/\`([^\`]+)\`/g,(_,c)=>{codes.push(escHtml(c)); return \`%%CODE\${codes.length-1}%%\`;});
  // images before links
  s=s.replace(/!\\[([^\\]]*)\\]\\(([^)]+)\\)/g,'<img src="$2" alt="$1" style="max-width:100%">');
  // links
  s=s.replace(/\\[([^\\]]+)\\]\\(([^)]+)\\)/g,'<a href="$2" target="_blank" rel="noopener">$1</a>');
  // bold+italic
  s=s.replace(/\\*\\*\\*(.+?)\\*\\*\\*/g,'<strong><em>$1</em></strong>');
  // bold
  s=s.replace(/\\*\\*(.+?)\\*\\*/g,'<strong>$1</strong>');
  s=s.replace(/__(.+?)__/g,'<strong>$1</strong>');
  // italic
  s=s.replace(/\\*(.+?)\\*/g,'<em>$1</em>');
  s=s.replace(/_(.+?)_/g,'<em>$1</em>');
  // strikethrough
  s=s.replace(/~~(.+?)~~/g,'<s>$1</s>');
  // restore inline code
  s=s.replace(/%%CODE(\\d+)%%/g,(_,n)=>\`<code>\${codes[+n]}</code>\`);
  return s;
}

const sections = [
  {id:'tasks',    label:'Tasks',        icon:'☑',  items:()=>(data.tasks||[]).filter(t=>!t._deleted)},
  {id:'habits',   label:'Habits',       icon:'⚡', items:()=>(data.habits||[]).filter(h=>!h._deleted)},
  {id:'notes',    label:'Notes',        icon:'📄', items:()=>(data.notes||[]).filter(n=>!n._deleted)},
  {id:'bookmarks',label:'Bookmarks',    icon:'🔖', items:()=>(data.bookmarks||[]).filter(b=>!b._deleted)},
  {id:'visionItems',label:'Whiteboards',icon:'🖼',items:()=>(data.visionItems||[]).filter(v=>!v._deleted)},
  {id:'mindmaps', label:'Mindmaps',     icon:'🌿', items:()=>(data.mindmaps||[]).filter(m=>!m._deleted)},
];

let activeSection = 'tasks';
let searchQuery = '';
let filterBoardId = '';
let filterSwimlaneId = '';
let detailItem = null;
let detailType = null;

function renderNav(){
  const nav = document.getElementById('nav');
  nav.innerHTML = sections.map(s=>{
    const count = s.items().length;
    return \`<button class="nav-btn\${s.id===activeSection?' active':''}" onclick="switchSection('\${s.id}')">
      <span>\${s.icon}</span><span>\${s.label}</span>
      <span class="count">\${count}</span>
    </button>\`;
  }).join('');
}

function switchSection(id){
  activeSection=id;
  searchQuery='';
  filterBoardId='';
  filterSwimlaneId='';
  document.getElementById('search').value='';
  document.getElementById('filter-board').value='';
  document.getElementById('filter-swimlane').value='';
  renderNav();
  renderFilterOptions();
  renderContent();
}

function renderFilterOptions(){
  const sec = sections.find(s=>s.id===activeSection);
  const items = sec ? sec.items() : [];

  // Collect unique boards and swimlanes present in current section
  const boardIds = [...new Set(items.map(i=>i.boardId).filter(Boolean))];
  const swimlaneIds = [...new Set(items.map(i=>i.swimlaneId).filter(Boolean))];

  const boardSel = document.getElementById('filter-board');
  const swimSel = document.getElementById('filter-swimlane');

  boardSel.innerHTML = '<option value="">All boards</option>' +
    boardIds.map(id=>{ const b=boardMap.get(id); return b ? \`<option value="\${escHtml(id)}">\${escHtml(b.name)}</option>\` : ''; }).join('');

  swimSel.innerHTML = '<option value="">All swimlanes</option>' +
    swimlaneIds.map(id=>{ const s=swimlaneMap.get(id); return s ? \`<option value="\${escHtml(id)}">\${escHtml(s.name)}</option>\` : ''; }).join('');

  // Show/hide based on whether any options exist
  boardSel.style.display = boardIds.length > 0 ? '' : 'none';
  swimSel.style.display = swimlaneIds.length > 0 ? '' : 'none';
}

function getFiltered(){
  const sec = sections.find(s=>s.id===activeSection);
  let items = sec ? sec.items() : [];
  if(filterBoardId) items = items.filter(i=>i.boardId===filterBoardId);
  if(filterSwimlaneId) items = items.filter(i=>i.swimlaneId===filterSwimlaneId);
  if(searchQuery){
    const q = searchQuery.toLowerCase();
    items = items.filter(item=>(item.title||item.url||'').toLowerCase().includes(q));
  }
  return items;
}

function cardHtml(item, type){
  const board = boardMap.get(item.boardId)||null;
  const swimlane = swimlaneMap.get(item.swimlaneId)||null;
  const sub = [board?board.name:'', swimlane?swimlane.name:''].filter(Boolean).join(' · ');
  let badges = '';
  if(type==='tasks'){
    if(item.priority) badges += \`<span class="badge badge-\${item.priority}">\${item.priority}</span>\`;
    if(item.archived) badges += \`<span class="badge badge-default">Archived</span>\`;
  }
  if(type==='habits' && item.color){
    badges += \`<span class="badge badge-default" style="background:\${item.color}22;color:\${item.color}">Habit</span>\`;
  }
  if(type==='notes' && item.pinned) badges += \`<span class="badge badge-primary">Pinned</span>\`;
  if(type==='bookmarks') badges += \`<span class="badge badge-default">\${item.status||'unread'}</span>\`;

  const title = item.title || item.url || 'Untitled';
  const preview = type==='notes'||type==='tasks' ? strip(item.description||item.content||'').slice(0,120) : (item.description||'').slice(0,120);
  return \`<div class="card" onclick='openDetail(\${JSON.stringify(type)},\${JSON.stringify(item.id)})'>
    <div class="card-title">\${escHtml(title)}</div>
    \${preview ? \`<div class="card-sub">\${escHtml(preview)}</div>\` : ''}
    \${sub ? \`<div class="card-sub" style="font-size:11px">\${escHtml(sub)}</div>\` : ''}
    \${badges ? \`<div class="badges">\${badges}</div>\` : ''}
  </div>\`;
}

function escHtml(s){
  return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function renderContent(){
  const el = document.getElementById('content');
  const items = getFiltered();
  const sec = sections.find(s=>s.id===activeSection);
  document.getElementById('section-title').textContent = sec ? sec.label : '';
  if(items.length===0){
    el.innerHTML = '<div class="empty"><span style="font-size:32px">🗂️</span><span>No items found</span></div>';
    return;
  }
  el.innerHTML = \`<div class="grid">\${items.map(i=>cardHtml(i,activeSection)).join('')}</div>\`;
}

function openDetail(type, id){
  const sec = sections.find(s=>s.id===type);
  const item = sec ? sec.items().find(i=>i.id===id) : null;
  if(!item) return;
  detailItem=item; detailType=type;
  renderDetail();
  document.getElementById('detail-overlay').classList.remove('hidden');
}

function closeDetail(){
  document.getElementById('detail-overlay').classList.add('hidden');
  detailItem=null; detailType=null;
}

function renderDetail(){
  const panel = document.getElementById('detail-panel');
  if(!detailItem){panel.innerHTML='';return;}
  const board = boardMap.get(detailItem.boardId)||null;
  const swimlane = swimlaneMap.get(detailItem.swimlaneId)||null;
  let html = \`<button class="detail-close" onclick="closeDetail()">✕</button>
    <div class="detail-title">\${escHtml(detailItem.title||detailItem.url||'Untitled')}</div>\`;

  // Meta
  html += '<div class="detail-section"><div class="section-label">Details</div>';
  if(board) html += metaRow('Board', escHtml(board.name));
  if(swimlane) html += metaRow('Swimlane', escHtml(swimlane.name));
  if(detailItem.createdAt) html += metaRow('Created', fmt(detailItem.createdAt));
  if(detailItem.updatedAt) html += metaRow('Updated', fmt(detailItem.updatedAt));
  html += '</div>';

  if(detailType==='tasks'){
    if(detailItem.priority) html += \`<div class="detail-section"><div class="section-label">Priority</div><span class="badge badge-\${detailItem.priority}">\${detailItem.priority}</span></div>\`;
    if(detailItem.deadline) html += \`<div class="detail-section"><div class="section-label">Deadline</div><span>\${fmt(detailItem.deadline)}</span></div>\`;
    if(detailItem.description) html += \`<div class="detail-section"><div class="section-label">Description</div><div class="prose">\${mdToHtml(detailItem.description)}</div></div>\`;
    const labels = detailItem.labels||[];
    if(labels.length) html += \`<div class="detail-section"><div class="section-label">Labels</div><div class="badges">\${labels.map(l=>\`<span class="badge badge-default">\${escHtml(l)}</span>\`).join('')}</div></div>\`;
    const checklists = detailItem.checklists||[];
    if(checklists.length){
      html += '<div class="detail-section"><div class="section-label">Checklists</div>';
      checklists.forEach(cl=>{
        const done = (cl.items||[]).filter(i=>i.done).length;
        html += \`<div style="margin-bottom:8px"><div style="font-weight:500;font-size:13px;margin-bottom:4px">\${escHtml(cl.title)} (\${done}/\${cl.items.length})</div>\`;
        html += (cl.items||[]).map(i=>\`<div style="display:flex;gap:6px;align-items:center;font-size:13px;padding:2px 0"><span>\${i.done?'☑':'☐'}</span><span style="color:\${i.done?'var(--muted)':'var(--text)'};\${i.done?'text-decoration:line-through':''}">\${escHtml(i.text)}</span></div>\`).join('');
        html += '</div>';
      });
      html += '</div>';
    }
    const comments = detailItem.comments||[];
    if(comments.length) html += \`<div class="detail-section"><div class="section-label">Comments (\${comments.length})</div>\${comments.map(c=>\`<div class="prose" style="border-left:2px solid var(--border);padding-left:8px;margin-bottom:6px">\${escHtml(c.text||'')}</div>\`).join('')}</div>\`;
  }

  if(detailType==='habits'){
    const logs = logsByHabit[detailItem.id]||[];
    const totalLogs = logs.filter(l=>l.value>0).length;
    html += \`<div class="detail-section"><div class="section-label">Stats</div>\${metaRow('Total completions',totalLogs)}\${detailItem.frequencyDays?metaRow('Schedule days/week',detailItem.frequencyDays.length):''}</div>\`;
    // 28-day grid
    const today = new Date();
    const cells = [];
    for(let i=27;i>=0;i--){
      const d=new Date(today); d.setDate(today.getDate()-i);
      const key=d.toISOString().slice(0,10);
      const log=logs.find(l=>l.date===key);
      const v=log?log.value:0;
      const cls=v>=3?'d3':v>=2?'d2':v>=1?'d1':'';
      cells.push(\`<div class="act-cell \${cls}" title="\${key}: \${v}"></div>\`);
    }
    html += \`<div class="detail-section"><div class="section-label">Last 28 days</div><div class="act-grid">\${cells.join('')}</div></div>\`;
  }

  if(detailType==='notes'){
    if(detailItem.content) html += \`<div class="detail-section"><div class="section-label">Content</div><div class="prose">\${mdToHtml(detailItem.content)}</div></div>\`;
    const tags = detailItem.tags||[];
    if(tags.length) html += \`<div class="detail-section"><div class="section-label">Tags</div><div class="badges">\${tags.map(t=>\`<span class="badge badge-default">\${escHtml(t)}</span>\`).join('')}</div></div>\`;
  }

  if(detailType==='bookmarks'){
    if(detailItem.url) html += \`<div class="detail-section"><div class="section-label">URL</div><a href="\${escHtml(detailItem.url)}" target="_blank" rel="noopener">\${escHtml(detailItem.url)}</a></div>\`;
    if(detailItem.description) html += \`<div class="detail-section"><div class="section-label">Description</div><div class="prose">\${escHtml(detailItem.description)}</div></div>\`;
    const tags = detailItem.tags||[];
    if(tags.length) html += \`<div class="detail-section"><div class="section-label">Tags</div><div class="badges">\${tags.map(t=>\`<span class="badge badge-default">\${escHtml(t)}</span>\`).join('')}</div></div>\`;
    html += \`<div class="detail-section"><div class="section-label">Status</div><span class="badge badge-default">\${escHtml(detailItem.status||'unread')}</span></div>\`;
  }

  if(detailType==='visionItems'){
    let elCount = 0;
    try{ const p=JSON.parse(detailItem.excalidrawData||'{}'); elCount=(p.elements||[]).length; }catch{}
    html += \`<div class="detail-section"><div class="section-label">Canvas</div>\${metaRow('Elements', elCount)}</div>\`;
    if(detailItem.excalidrawData){
      let excalidrawFileData = detailItem.excalidrawData;
      try{
        const parsed = JSON.parse(detailItem.excalidrawData);
        const withMeta = Object.assign({"type":"excalidraw","version":2,"source":"https://excalidraw.com"}, parsed);
        excalidrawFileData = JSON.stringify(withMeta);
      }catch{}
      const b64 = btoa(unescape(encodeURIComponent(excalidrawFileData)));
      html += \`<div class="detail-section"><div class="section-label">Open in Excalidraw</div>
        <a href="data:application/json;base64,\${b64}" download="\${escHtml((detailItem.title||'whiteboard').replace(/[^a-z0-9_-]/gi,'_'))}.excalidraw"
           style="display:inline-block;margin-top:4px;padding:6px 14px;border-radius:6px;background:var(--primary);color:#fff;font-size:13px;text-decoration:none">
          Download .excalidraw file
        </a>
        <div style="font-size:11px;color:var(--muted);margin-top:6px">Open on <a href="https://excalidraw.com" target="_blank">excalidraw.com</a> or drag the file into the app.</div>
      </div>\`;
    }
    if(detailItem.content) html += \`<div class="detail-section"><div class="section-label">Description</div><div class="prose">\${escHtml(detailItem.content)}</div></div>\`;
  }

  if(detailType==='mindmaps'){
    const nodes = detailItem.nodes||[];
    html += \`<div class="detail-section"><div class="section-label">Stats</div>\${metaRow('Nodes',nodes.length)}\${metaRow('Root nodes',nodes.filter(n=>!n.parentId).length)}</div>\`;
    if(nodes.length){
      function renderMindmapTree(parentId, depth){
        const children = nodes
          .filter(n=>(n.parentId||null)===(parentId||null))
          .sort((a,b)=>(a.order||0)-(b.order||0));
        if(!children.length) return '';
        return children.map(n=>{
          const indent = depth*16;
          const dot = n.color ? \`<span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:\${n.color};margin-right:6px;flex-shrink:0"></span>\` : '';
          return \`<div style="display:flex;align-items:center;padding:3px 0 3px \${indent}px;font-size:13px;border-left:\${depth>0?'1px solid var(--border)':'none'};margin-left:\${depth>0?'8px':'0'}">\${dot}<span style="font-weight:\${depth===0?'600':'400'}">\${escHtml(n.label||'')}</span></div>\${renderMindmapTree(n.id,depth+1)}\`;
        }).join('');
      }
      html += \`<div class="detail-section"><div class="section-label">Tree</div><div style="background:var(--accent);border-radius:6px;padding:10px;margin-top:2px">\${renderMindmapTree(null,0)}</div></div>\`;
    }
  }

  panel.innerHTML = html;
}

function metaRow(key,val){
  return \`<div class="meta-row"><span class="meta-key">\${key}</span><span>\${val}</span></div>\`;
}

// init
document.addEventListener('DOMContentLoaded',()=>{
  const ts = exportedAt ? fmt(exportedAt) : '';
  document.getElementById('export-meta').textContent = ts ? 'Exported '+ts : '';
  document.getElementById('search').addEventListener('input',e=>{
    searchQuery=e.target.value;
    renderContent();
  });
  document.getElementById('filter-board').addEventListener('change',e=>{
    filterBoardId=e.target.value;
    // reset swimlane filter when board changes
    filterSwimlaneId='';
    document.getElementById('filter-swimlane').value='';
    renderContent();
  });
  document.getElementById('filter-swimlane').addEventListener('change',e=>{
    filterSwimlaneId=e.target.value;
    renderContent();
  });
  document.getElementById('detail-overlay').addEventListener('click',e=>{
    if(e.target===e.currentTarget) closeDetail();
  });
  renderNav();
  renderFilterOptions();
  renderContent();
});
</script>
<div class="app">
  <aside class="sidebar">
    <div class="sidebar-header">
      <h1>buobu Export</h1>
      <p id="export-meta"></p>
    </div>
    <nav class="nav" id="nav"></nav>
  </aside>
  <main class="main">
    <div class="topbar">
      <h2 id="section-title"></h2>
      <select id="filter-board" class="filter-select"></select>
      <select id="filter-swimlane" class="filter-select"></select>
      <input id="search" class="search" type="search" placeholder="Search…">
    </div>
    <div class="content" id="content"></div>
  </main>
</div>
<div id="detail-overlay" class="detail-overlay hidden">
  <div id="detail-panel" class="detail-panel"></div>
</div>
</body>
</html>`;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

function getZipFileName(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `buobu-export-${y}-${m}-${d}.zip`;
}

export async function exportToZip(db: Database, includeArchived = true): Promise<{ filename: string; size: number }> {
  const exportFile = await createExportFile(db, includeArchived);
  const jsonString = JSON.stringify(exportFile, null, 2);
  const htmlString = buildViewerHtml(jsonString);

  const zipBytes = buildZip([
    { name: "data.json", content: encodeUtf8(jsonString) },
    { name: "index.html", content: encodeUtf8(htmlString) },
  ]);

  const filename = getZipFileName();
  const blob = new Blob([zipBytes.buffer as ArrayBuffer], { type: "application/zip" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  return { filename, size: blob.size };
}
