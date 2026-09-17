"use client";
import {useEffect} from "react";
import {usePathname} from "next/navigation";
export function MotionController(){
 const path=usePathname();
 useEffect(()=>{
  const media=matchMedia("(prefers-reduced-motion: reduce)");
  let frame=0;
  const observer=new IntersectionObserver(entries=>entries.forEach(entry=>{
   if(entry.isIntersecting){entry.target.classList.add("in-view");observer.unobserve(entry.target);}
  }),{threshold:.06});
  const setup=()=>{
   document.querySelectorAll<HTMLElement>(".reveal").forEach((node,i)=>{
    if(media.matches){node.classList.add("in-view");return;}
    node.style.setProperty("--reveal-delay",Math.min(i%4*70,210)+"ms");
    node.classList.add("motion-ready");observer.observe(node);
   });
  };
  const scroll=()=>{
   if(frame)return;
   frame=requestAnimationFrame(()=>{
    document.documentElement.style.setProperty("--scroll-y",String(window.scrollY));
    const length=document.documentElement.scrollHeight-innerHeight;
    document.documentElement.style.setProperty("--progress",String(length>0?scrollY/length:0));
    frame=0;
   });
  };
  setup();scroll();
  media.addEventListener("change",setup);
  addEventListener("scroll",scroll,{passive:true});
  return()=>{observer.disconnect();cancelAnimationFrame(frame);media.removeEventListener("change",setup);removeEventListener("scroll",scroll);};
 },[path]);
 return <div className="scroll-progress" aria-hidden="true"/>;
}
