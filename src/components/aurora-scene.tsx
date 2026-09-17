"use client";
import {useEffect,useRef} from "react";
export function AuroraScene(){
 const ref=useRef<HTMLCanvasElement>(null);
 useEffect(()=>{
  const canvas=ref.current;if(!canvas)return;
  const ctx=canvas.getContext("2d");if(!ctx)return;
  const reduced=matchMedia("(prefers-reduced-motion: reduce)");
  let width=0,height=0,frame=0,visible=true,time=0,last=0;
  const pointer={x:0,y:0},smooth={x:0,y:0};
  const draw=(stamp:number)=>{
   const delta=last?Math.min(stamp-last,40):16;last=stamp;
   if(!reduced.matches)time+=delta*.00022;
   smooth.x+=(pointer.x-smooth.x)*.04;smooth.y+=(pointer.y-smooth.y)*.04;
   ctx.clearRect(0,0,width,height);
   const radius=Math.min(width,height)*.33;
   const cx=width*.5+smooth.x*18,cy=height*.48+smooth.y*18;
   const glow=ctx.createRadialGradient(cx,cy,0,cx,cy,radius*1.6);
   glow.addColorStop(0,"#a4a0ff25");glow.addColorStop(.5,"#5264ed16");glow.addColorStop(1,"#080b1400");
   ctx.fillStyle=glow;ctx.fillRect(0,0,width,height);
   for(let ring=0;ring<32;ring++){
    const latitude=(ring/31-.5)*Math.PI;
    ctx.beginPath();
    for(let step=0;step<=110;step++){
     const angle=step/110*Math.PI*2;
     const wave=1+.09*Math.sin(angle*3+time*2+latitude*4);
     const r=radius*Math.cos(latitude)*wave;
     const x=r*Math.cos(angle+time);
     const z=r*Math.sin(angle+time);
     const y=radius*Math.sin(latitude);
     const tilt=.42;
     const ry=y*Math.cos(tilt)-z*Math.sin(tilt),rz=y*Math.sin(tilt)+z*Math.cos(tilt);
     const perspective=650/(650-rz);
     const px=cx+x*perspective,py=cy+ry*perspective;
     if(step===0)ctx.moveTo(px,py);else ctx.lineTo(px,py);
    }
    ctx.strokeStyle="hsla("+(225+ring*2)+",90%,78%,"+(.17+Math.sin(ring/31*Math.PI)*.4)+")";
    ctx.lineWidth=.8;ctx.stroke();
   }
   for(let i=0;i<38;i++){
    const a=i*2.399+time*.3,r=radius*(1.15+(i%7)*.08);
    const x=cx+Math.cos(a)*r,y=cy+Math.sin(a)*r*.72;
    ctx.fillStyle=i%3?"#b9bcfa88":"#d9faff";
    ctx.beginPath();ctx.arc(x,y,i%3?1:2,0,Math.PI*2);ctx.fill();
   }
   if(visible&&!reduced.matches&&!document.hidden)frame=requestAnimationFrame(draw);
  };
  const restart=()=>{cancelAnimationFrame(frame);last=0;draw(performance.now());};
  const resize=new ResizeObserver(()=>{
   const box=canvas.getBoundingClientRect();width=box.width;height=box.height;
   const dpr=Math.min(devicePixelRatio||1,2);
   canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);ctx.setTransform(dpr,0,0,dpr,0,0);restart();
  });resize.observe(canvas);
  const intersection=new IntersectionObserver(([entry])=>{visible=entry.isIntersecting;restart();});intersection.observe(canvas);
  const move=(e:PointerEvent)=>{const b=canvas.getBoundingClientRect();pointer.x=(e.clientX-b.left)/b.width-.5;pointer.y=(e.clientY-b.top)/b.height-.5;};
  canvas.addEventListener("pointermove",move);reduced.addEventListener("change",restart);document.addEventListener("visibilitychange",restart);
  return()=>{cancelAnimationFrame(frame);resize.disconnect();intersection.disconnect();canvas.removeEventListener("pointermove",move);reduced.removeEventListener("change",restart);document.removeEventListener("visibilitychange",restart);};
 },[]);
 return <div className="aurora-scene"><canvas ref={ref} aria-hidden="true"/><div className="scene-caption"><span className="signal-dot"/>Единая точка подключения<span>01 / ∞</span></div><div className="scene-tag tag-a">ChatGPT<span>CONNECTED</span></div><div className="scene-tag tag-b">Claude<span>CONNECTED</span></div><div className="scene-coordinate">WERTY NETWORK / LIVE MOTION</div></div>;
}
