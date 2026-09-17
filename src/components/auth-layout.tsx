import {Brand} from "./brand";
import {AuroraScene} from "./aurora-scene";
export function AuthLayout({children}:{children:React.ReactNode}){
 return <main className="auth-page"><aside className="auth-aside"><Brand/><AuroraScene/><blockquote>Большие идеи.<br/><span>Одно подключение.</span><p>Модели, ключи и баланс — в вашем пространстве.</p></blockquote></aside><section className="auth-main"><div className="auth-mobile-brand"><Brand/></div>{children}</section></main>;
}
