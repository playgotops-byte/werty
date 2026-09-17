"use client";
import {useState} from "react";
export function CodeBlock({code,label="CONFIG"}:{code:string;label?:string}){
 const [status,setStatus]=useState("");
 async function copy(){try{await navigator.clipboard.writeText(code);setStatus("Скопировано");}catch{setStatus("Выделите и скопируйте текст");}}
 return <div className="code-block"><header><span>{label}</span><button type="button" onClick={copy}>{status||"Копировать"}</button></header><pre><code>{code}</code></pre><span className="sr-only" aria-live="polite">{status}</span></div>;
}
