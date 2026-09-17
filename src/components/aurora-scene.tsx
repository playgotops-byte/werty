"use client";
import {useEffect,useRef} from "react";
export function AuroraScene(){
 const ref=useRef<HTMLCanvasElement>(null);
 useEffect(()=>{
  const canvas=ref.current;if(!canvas)return;
  const ctx=canvas.getContext("2d");if(!ctx)return;
  let w=0,h=0,frame=0,t=0,last=0,visible=true;
  document.documentElement.dataset.motion="on";
  const pointer={x:0,y:0},smooth={x:0,y:0};
  const render=(now:number)=>{
   const dt=last?Math.min(now-last,40):16;last=now;t+=dt*.00065;
   smooth.x+=(pointer.x-smooth.x)*.035;smooth.y+=(pointer.y-smooth.y)*.035;
   ctx.clearRect(0,0,w,h);
   const unit=Math.min(w*.43,h*.45),cx=w*.52,cy=h*.5;
   const glow=ctx.createRadialGradient(cx,cy,unit*.15,cx,cy,unit*1.45);
   glow.addColorStop(0,"#ff3d121a");glow.addColorStop(.5,"#fb52101c");glow.addColorStop(.8,"#08090900");glow.addColorStop(1,"#05070b00");ctx.fillStyle=glow;ctx.fillRect(0,0,w,h);
   const tilt=.65+Math.sin(t*.27)*.35+smooth.y*.35;
   const rotate=t*.32+smooth.x*.35+Math.min(window.scrollY/h,2)*.18;
   const points:{x:number;y:number;z:number;r:number;hue:number;light:number}[]=[];
   const rings=w<500?60:92,steps=w<500?90:120;
   for(let i=0;i<rings;i++){
    const a=i/rings*Math.PI*2;
    for(let j=0;j<steps;j++){
     const b=j/steps*Math.PI*2;
     const tube=.29+.07*Math.sin(a*3+t);
     const radius=.66+tube*Math.cos(b);
     let x=radius*Math.cos(a),y=radius*Math.sin(a),z=tube*Math.sin(b);
     const ry=y*Math.cos(tilt)-z*Math.sin(tilt);
     z=y*Math.sin(tilt)+z*Math.cos(tilt);y=ry;
     const rx=x*Math.cos(rotate)+z*Math.sin(rotate);
     z=-x*Math.sin(rotate)+z*Math.cos(rotate);x=rx;
     const scale=2.5/(2.5-z);
     points.push({x:cx+x*unit*scale,y:cy+y*unit*scale,z,r:(w<500?.75:1.05)*scale,hue:15+160*(.5+.5*Math.sin(a+t*.6))**5,light:38+(z+1)*20});
    }
   }
   points.sort((a,b)=>a.z-b.z);
   for(const p of points){ctx.fillStyle="hsl("+p.hue+" 95% "+p.light+"% / "+(.3+(p.z+1)*.32)+")";ctx.beginPath();ctx.arc(p.x,p.y,p.r,0,Math.PI*2);ctx.fill();}
   ctx.save();ctx.translate(cx,cy);ctx.rotate(-.4+t*.06);ctx.scale(1,.34);
   ctx.beginPath();ctx.ellipse(0,0,unit*1.34,unit*1.34,0,0,Math.PI*2);ctx.strokeStyle="#fa7a4033";ctx.lineWidth=1;ctx.stroke();
   for(let i=0;i<5;i++){const a=t*(.6+i*.08)+i*1.26;ctx.beginPath();ctx.arc(Math.cos(a)*unit*1.34,Math.sin(a)*unit*1.34,3,0,Math.PI*2);ctx.fillStyle=i%2?"#6af5ed":"#ff783d";ctx.fill();}
   ctx.restore();
   if(visible&&!document.hidden)frame=requestAnimationFrame(render);
  };
  const restart=()=>{cancelAnimationFrame(frame);last=0;render(performance.now());};
  const resize=new ResizeObserver(()=>{const b=canvas.getBoundingClientRect();w=b.width;h=b.height;const dpr=Math.min(devicePixelRatio||1,1.75);canvas.width=w*dpr;canvas.height=h*dpr;ctx.setTransform(dpr,0,0,dpr,0,0);restart();});
  resize.observe(canvas);
  const observer=new IntersectionObserver(([entry])=>{visible=entry.isIntersecting;if(visible)restart();else cancelAnimationFrame(frame);});observer.observe(canvas);
  const move=(e:PointerEvent)=>{const b=canvas.getBoundingClientRect();pointer.x=(e.clientX-b.left)/b.width-.5;pointer.y=(e.clientY-b.top)/b.height-.5;};
  canvas.addEventListener("pointermove",move);document.addEventListener("visibilitychange",restart);
  return()=>{cancelAnimationFrame(frame);resize.disconnect();observer.disconnect();canvas.removeEventListener("pointermove",move);document.removeEventListener("visibilitychange",restart);};
 },[]);
 return <div className="aurora-scene"><canvas ref={ref} aria-hidden="true"/></div>;
}
