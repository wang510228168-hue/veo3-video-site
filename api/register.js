export default async function handler(req,res){
  res.setHeader('Access-Control-Allow-Origin','*');
  res.setHeader('Access-Control-Allow-Headers','Content-Type');
  if(req.method==='OPTIONS') return res.status(204).end();
  if(req.method!=='POST')    return res.status(405).send('Method Not Allowed');
  // You can store emails to DB/Sheet in the future. For now we just return ok.
  return res.json({ ok:true });
}
