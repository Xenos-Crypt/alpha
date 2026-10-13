export function duplicateEmailMessage(data,error){
 const knownCode=['user_already_exists','email_exists','email_already_exists'].includes(error?.code);
 const knownMessage=/user already registered|email.*already.*(?:registered|exists|use)|already.*registered.*email/i.test(error?.message||'');
 const maskedDuplicate=!error&&!data?.session&&data?.user&&Array.isArray(data.user.identities)&&data.user.identities.length===0;
 return knownCode||knownMessage||maskedDuplicate?'This email is already registered. Log in instead, or use Forgot password.':null;
}
