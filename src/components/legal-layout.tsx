import Link from "next/link";
import {Brand} from "@/components/brand";
export function LegalLayout({title,children}:{title:string;children:React.ReactNode}){
 return <div className="site"><header className="container nav"><Brand/><nav className="nav-links"><Link href="/docs">Документация</Link><Link className="button ghost" href="/">На главную</Link></nav></header><main className="container legal-layout"><header className="legal-heading"><p>Документы Werty · редакция от 17 сентября 2026</p><h1>{title}</h1></header><article className="legal-content">{children}</article></main><footer className="container footer"><Brand/><div className="footer-links"><Link href="/terms">Условия использования</Link><Link href="/privacy">Конфиденциальность</Link><a href="mailto:wertysupport@gmail.com">Поддержка</a></div></footer></div>;
}
