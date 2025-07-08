import { GoogleGenerativeAI } from "https://esm.sh/@google/generative-ai@0.4.0";
import JSZip from "https://cdn.jsdelivr.net/npm/jszip@3.10.1/+esm";

const $ = id => document.getElementById(id);
const out = $("output");
const codePanel = $("codePanel");
const fs = {};
const ai = new GoogleGenerativeAI("AIzaSyCV4IeMBmC-wo1jvO0cV9rMA3-ZWQQB6E4"); // <-- replace with valid key

/* Build full HTML doc for iframe */
function buildPreviewDoc(html, css, js){
  return `<!DOCTYPE html><html><head><meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1.0"/>
  <style>${css}</style></head><body>${html}<script>${js}<\/script></body></html>`;
}

/* Preview */
$("previewBtn").onclick = () => {
  if(!fs["index.html"]) return alert("Generate first!");
  $("previewIframe").srcdoc = buildPreviewDoc(fs["index.html"], fs["style.css"]||"", fs["script.js"]||"");
  $("previewBox").style.display = "block";
};
$("closePreviewBtn").onclick = () => $("previewBox").style.display="none";

/* Download Zip */
$("downloadBtn").onclick = async()=>{
  if(!Object.keys(fs).length) return alert("Generate first!");
  const zip=new JSZip(); for(const [f,c] of Object.entries(fs)) zip.file(f,c);
  const blob=await zip.generateAsync({type:"blob"}); triggerDownload(blob,"website.zip");
};

/* Show Code */
$("codeBtn").onclick = () => {
  if (!Object.keys(fs).length) return alert("Generate first!");
  codePanel.style.display = "block";
  codePanel.innerHTML = ""; // clear

  const extLang = { html: "language-html", css: "language-css", js: "language-js" };

  for (const [file, content] of Object.entries(fs)) {
    const ext = file.split(".").pop();
    const lang = extLang[ext] || "language-none";
    const block = document.createElement("div");
    block.className = "code-block";

    // Header
    const head = document.createElement("div");
    head.className = "code-head";
    head.textContent = file;

    // Copy button
    const copyBtn = document.createElement("button");
    copyBtn.className = "code-copy-btn";
    copyBtn.textContent = "Copy";
    copyBtn.onclick = () => {
      navigator.clipboard.writeText(content);
      copyBtn.textContent = "Copied!";
      setTimeout(() => (copyBtn.textContent = "Copy"), 1200);
    };

    head.appendChild(copyBtn);

    // Code content
    const pre = document.createElement("pre");
    pre.className = "code-content";
    const codeEl = document.createElement("code");
    codeEl.className = lang;
    codeEl.textContent = content;
    pre.appendChild(codeEl);

    block.appendChild(head);
    block.appendChild(pre);
    codePanel.appendChild(block);

    // Syntax highlight (if using Prism or similar)
    if (window.Prism) Prism.highlightElement(codeEl);
  }
};

/* Generate */
$("generateBtn").onclick = async()=>{
  const prompt = $("prompt").value.trim();
  const includeEmojis = $("emojiOption").checked;

  if(!prompt) return(out.textContent="❌ Please enter a prompt.");
  out.textContent="⏳ Talking to Gemini…"; $("generateBtn").disabled=true; reset();

  let emojiInstruction = "";
  if (includeEmojis) {
    emojiInstruction = " If appropriate, include relevant emojis in the website content, such as in headings, buttons, or sections, to enhance visual appeal.";
  }

  const model=ai.getGenerativeModel({model:"gemini-1.5-flash"});
  const userMessage = `
You are an assistant that generates small, modern, and beautiful front-end websites.
Here is an example of a good template structure:
{"html":"<!DOCTYPE html><html><head>...</head><body>...</body></html>","css":"body{...}","js":"document.addEventListener(...)"}
Always use a visually appealing, accessible, and responsive design with a harmonious, colorful palette (including gradients and accent colors) that you choose automatically for the website type.
Use a modern automatic template: visually distinct header, navigation, main content, and footer, with card or panel backgrounds, and clear section separation.
Use Flexbox or CSS Grid for layout, and ensure the UI looks good for all users.
Use modern web fonts (like Google Fonts), and style all buttons and links with hover effects.
Choose and apply a suitable color palette and free stock or placeholder images automatically for the website type (e.g., use https://source.unsplash.com or https://placehold.co for images).
Add basic interactivity and functionality as appropriate for the website type.
All JSON values must be valid JSON strings. Escape all backslashes and quotes as required by JSON. Do not use template literals, only double-quoted strings for JS. Do not include any unescaped backslashes or special characters. Do not include \\n or \\t in JS strings; use concatenation instead.
Respond ONLY with minified JSON object (no markdown), like:
{"html":"...","css":"...","js":"..."}
No extra keys, no commentary.
Prompt: ${prompt}${emojiInstruction}`.trim();

  try{
    const res=await model.generateContent(userMessage);
    const txt=await res.response.text();
    // Replace unescaped backslashes with double backslashes
    let sanitizedTxt = txt.replace(/\\(?![\"\\/bfnrtu])/g, '\\\\');
    const json=JSON.parse(sanitizedTxt.slice(sanitizedTxt.indexOf("{"),sanitizedTxt.lastIndexOf("}")+1));

    fs["index.html"]=json.html||"<h1>No HTML</h1>";
    if(json.css) fs["style.css"]=json.css;
    if(json.js)  fs["script.js"]=json.js;

    out.textContent="✅ Files generated:\\n"+Object.keys(fs).join("\\n");
    ["previewBtn","downloadBtn","codeBtn"].forEach(id=>$(id).disabled=false);
    // auto-open preview
    $("previewBtn").click();
  }catch(err){
    console.error(err); out.textContent="❌ Error: "+err.message;
  }finally{ $("generateBtn").disabled=false; }
};

/* Helpers */
function triggerDownload(blob,name){
  const url=URL.createObjectURL(blob);
  Object.assign(document.createElement("a"),{href:url,download:name}).click();
  setTimeout(()=>URL.revokeObjectURL(url),500);
}
function reset(){["previewBtn","downloadBtn","codeBtn"].forEach(id=>$(id).disabled=true);codePanel.style.display="none";}
