import type { Metadata } from "next";
export const metadata: Metadata = {title:"Werty API",description:"Werty API gateway"};
export default function Layout({children}:{children:React.ReactNode}) {return <html lang="ru"><body style={{background:"#090d14",color:"#dbe3ec",fontFamily:"system-ui",maxWidth:900,margin:"80px auto",padding:24}}>{children}</body></html>}
