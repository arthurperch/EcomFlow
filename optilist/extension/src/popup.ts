const $ = (s: string) => document.querySelector(s) as HTMLElement;
const linksEl = $('#links') as HTMLTextAreaElement;
const threadsEl = $('#threads') as HTMLInputElement;
const logEl = $('#log') as HTMLPreElement;

threadsEl.addEventListener('change', ()=>{
  chrome.runtime.sendMessage({ type: 'OPTL_SET_THREADS', threads: Number(threadsEl.value)||1 });
});

$('#run')!.addEventListener('click', async ()=>{
  const urls = linksEl.value.split('\n').map(s=>s.trim()).filter(Boolean);
  append('Starting '+urls.length+' URLs...');
  const res = await chrome.runtime.sendMessage({ type: 'OPTL_START', urls });
  append(JSON.stringify(res, null, 2));
});

function append(s: string){ logEl.textContent += s + '\n'; }
