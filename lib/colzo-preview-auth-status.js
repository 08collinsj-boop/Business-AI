/* Read-only diagnosis: compare public Supabase project URL used by this preview with
 * the original app's PUBLIC configuration. No passwords, API keys, users or customer
 * records are transmitted by this endpoint. Never treat it as a sign-in mechanism. */
const LIVE_PUBLIC_CONFIG='https://app.getbusiness-ai.com/api/public-config';
export function safeSupabaseHost(value){
  try {const url=new URL(value);if(url.protocol!=='https:'||!/^([a-z0-9-]+)\.supabase\.co$/i.test(url.hostname)||url.pathname!=='/'||url.username||url.password)return null;return url.hostname.toLowerCase();}
  catch{return null;}
}
export async function checkColzoPreviewAuth({env=process.env,fetchImpl=fetch}={}){
 const configured=safeSupabaseHost(env.SUPABASE_URL);
 const available=env.FRONTEND_AUTH_ENABLED==='true'&&!!(env.SUPABASE_PUBLISHABLE_KEY||env.SUPABASE_ANON_KEY);
 if(!configured||!available)return {status:'unconfigured',authReady:false};
 try{
   const response=await fetchImpl(LIVE_PUBLIC_CONFIG,{
     headers:{Accept:'application/json'},redirect:'error',signal:AbortSignal.timeout(4500)
   });
   if(!response.ok)return {status:'unknown',authReady:true};
   const data=await response.json();
   const live=safeSupabaseHost(data?.supabaseUrl);
   if(!live)return {status:'unknown',authReady:true};
   return {status:live===configured?'same_project':'different_project',authReady:true};
 }catch{return {status:'unknown',authReady:true};}
}
export default async function handler(req,res){
 res.setHeader('Cache-Control','private, no-store');
 if(req.method!=='GET')return res.status(405).json({error:'Method not allowed'});
 // This helper is exclusively for non-production preview builds.
 if(process.env.VERCEL_ENV==='production')return res.status(404).json({error:'Not found'});
 const result=await checkColzoPreviewAuth();
 return res.status(200).json(result);
}
