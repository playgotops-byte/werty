"use client";
import {useEffect} from "react";
import {usePathname} from "next/navigation";
export function MotionController(){
 const path=usePathname();
 useEffect(()=>{
  let frame=0;
  const observer=new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting){entry.target.classList.add("in-view");observer.unobserve(entry.target);}}),{threshold:.08});
  const setup=()=>document.querySelectorAll<HTMLElement>(".reveal").forEach((node,i)=>{
   if(document.documentElement.dataset.motion==="off"){node.classList.add("in-view");return;}
   node.style.setProperty("--reveal-delay",Math.min(i%4*90,270)+"ms");node.classList.add("motion-ready");observer.observe(node);
  });
  const scroll=()=>{if(frame)return;frame=requestAnimationFrame(()=>{
   document.documentElement.style.setProperty("--scroll-y",String(scrollY));
   const length=document.documentElement.scrollHeight-innerHeight;
   document.documentElement.style.setProperty("--progress",String(length>0?scrollY/length:0));
   document.querySelectorAll<HTMLElement>(".depth-panel").forEach(el=>{const y=el.getBoundingClientRect().top;el.style.setProperty("--depth",String(Math.max(-1,Math.min(1,(y-innerHeight*.5)/innerHeight))));});
   frame=0;
  });};
  setup();scroll();window.addEventListener("werty-motion",setup);addEventListener("scroll",scroll,{passive:true});
  return()=>{observer.disconnect();cancelAnimationFrame(frame);window.removeEventListener("werty-motion",setup);removeEventListener("scroll",scroll);};
 },[path]);
 return <div className="scroll-progress" aria-hidden="true"/>;
}
