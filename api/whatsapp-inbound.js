/* Disabled-by-default staging stub. This is not a live Twilio webhook!
 * Routing to AI and replying require a separately approved implementation.
 */
export default async function handler(req,res){
 res.setHeader('Cache-Control','no-store');
 if(req.method!=='POST')return res.status(405).json({error:'Method not allowed'});
 if(process.env.COLZO_WHATSAPP_WEBHOOK_ENABLED!=='true')
  return res.status(404).json({error:'WhatsApp integration is not enabled'});
 // Fail closed even when a toggle is accidentally enabled. Never ack messages
 // with HTTP 200 before durable dedupe and tenant-bound handling are ready.
 return res.status(503).json({error:'WhatsApp provider is not connected'});
}
