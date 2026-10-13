export function duplicateEmailMessage(data,error){
 const knownCode=['user_already_exists','email_exists','email_already_exists'].includes(error?.code);
 const knownMessage=/user already registered|email.*already.*(?:registered|exists|use)|already.*registered.*email/i.test(error?.message||'');
 const maskedDuplicate=!error&&!data?.session&&data?.user&&Array.isArray(data.user.identities)&&data.user.identities.length===0;
 return knownCode||knownMessage||maskedDuplicate?'This email is already registered. Log in instead, or use Forgot password.':null;
}
export function verificationEmailMessage(error){
 return error?.code==='email_not_confirmed'||/email.*not.*confirmed|email.*not.*verified/i.test(error?.message||'')?'Your email has not been verified yet. Open the confirmation email and click its link, then log in again. Check your spam folder too.':null;
}
