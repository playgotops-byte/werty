export const passwordRules=[
 {label:"Не менее 6 символов",test:(value:string)=>value.length>=6},
 {label:"Заглавная буква",test:(value:string)=>/\p{Lu}/u.test(value)},
 {label:"Специальный знак",test:(value:string)=>/[^\p{L}\p{N}\s]/u.test(value)}
];
export function validPassword(value:string){return value.length<=128&&passwordRules.every(rule=>rule.test(value));}
