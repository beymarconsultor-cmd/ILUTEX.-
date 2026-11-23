import { sendSolicitud,mailConfig } from './mail.mjs'
import { createServer } from 'node:http'
import { createReadStream, existsSync, mkdirSync, appendFileSync, statSync } from 'node:fs'
import { resolve, extname, sep } from 'node:path'
import { randomUUID } from 'node:crypto'
import { fileURLToPath } from 'node:url'
import { dirname } from 'node:path'

const root = resolve(dirname(fileURLToPath(import.meta.url)), 'dist')
const dataFile = () => resolve(process.env.DATA_DIR || './data', 'solicitudes.jsonl')
const port = Number(process.env.PORT || 3000)
const maxBodyBytes = 16000
const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.txt':'text/plain; charset=utf-8' }
const attempts = new Map()
const limit = 10
const windowMs = 60 * 60 * 1000
export function validate(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return 'Datos inválidos.'
  if (body.tipo !== 'contacto' && body.tipo !== 'cotizacion') return 'Tipo de solicitud inválido.'
  for (const k of ['nombre', 'correo', 'telefono', 'servicio']) {
    if (typeof body[k] !== 'string' || !body[k].trim() || body[k].length > 250) return `Revisa el campo ${k}.`
  }
  if (!/^\S+@\S+\.\S+$/.test(body.correo) || body.correo.length > 254) return 'Correo electrónico inválido.'
  if (!/^[+\d\s()-]{6,25}$/.test(body.telefono)) return 'Teléfono inválido.'
  if (body.tipo === 'contacto' && (typeof body.mensaje !== 'string' || !body.mensaje.trim())) return 'Escribe tu mensaje.'
  if (body.tipo === 'cotizacion' && (typeof body.necesidad !== 'string' || !body.necesidad.trim() || typeof body.ubicacion !== 'string' || !body.ubicacion.trim())) return 'Completa los datos del proyecto.'
  for (const [key,value] of Object.entries(body)) if (typeof value !== 'string' || value.length > 4000) return `Dato inválido: ${key}.`
  return null
}
function respond(res, status, data) { res.writeHead(status, {'Content-Type':'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options':'nosniff'}); res.end(JSON.stringify(data)) }
async function handler(req,res) {
  const url = new URL(req.url || '/', 'http://localhost')
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin')
  res.setHeader('X-Frame-Options', 'SAMEORIGIN')
  if (url.pathname === '/api/salud' && req.method === 'GET') return respond(res,200,{ ok:true, servicio:'ILUTEX', correoConfigurado:!!mailConfig() })
  if (url.pathname === '/api/solicitudes') {
    if (req.method !== 'POST') return respond(res,405,{error:'Método no permitido.'})
    const remote = req.socket.remoteAddress || 'desconocido'
    const now = Date.now(); const times = (attempts.get(remote) || []).filter(t => now - t < windowMs)
    if (times.length >= limit) return respond(res,429,{error:'Demasiadas solicitudes. Inténtalo más tarde.'})
    times.push(now); attempts.set(remote,times)
    // Mitigación CSRF: navegadores deben compartir el host de origen.
    const origin = req.headers.origin
    if (origin) { try { if (new URL(origin).host !== req.headers.host) return respond(res,403,{error:'Origen no autorizado.'}) } catch { return respond(res,403,{error:'Origen no autorizado.'}) } }
    let raw = ''
    try { for await (const chunk of req) { raw += chunk.toString(); if (Buffer.byteLength(raw) > maxBodyBytes) return respond(res,413,{error:'Solicitud demasiado extensa.'}) } } catch { return respond(res,400,{error:'Error leyendo datos.'}) }
    let body
    try { body = JSON.parse(raw) } catch { return respond(res,400,{error:'JSON inválido.'}) }
    if (body.sitio_web) return respond(res,200,{ok:true}) // Campo trampa opcional
    const error = validate(body)
    if (error) return respond(res,400,{error})
    const allowed = ['tipo','nombre','empresa','correo','telefono','servicio','mensaje','ubicacion','necesidad','inversion']
    const record = { id: randomUUID(), recibido: new Date().toISOString() }
    for (const key of allowed) if (body[key]) record[key] = body[key].trim()
    if(!mailConfig())return respond(res,503,{error:'El envío por correo aún no está configurado. Revisa correo.config.json en el servidor.'})
    try { await sendSolicitud(record) }
    catch(err){ console.error('SMTP:',err.message); return respond(res,502,{error:'No fue posible enviar el correo. Revisa la configuración SMTP y tu conexión a Internet.'}) }
    try { mkdirSync(resolve(process.env.DATA_DIR || './data'), { recursive:true }); appendFileSync(dataFile(), JSON.stringify(record)+'\n', {mode:0o600}) }
    catch(err){ console.error('Copia local:',err.message) }
    return respond(res,201,{ok:true, id:record.id, correoEnviado:true})
  }
  if (req.method !== 'GET' && req.method !== 'HEAD') return respond(res,405,{error:'Método no permitido.'})
  let decoded
  try { decoded = decodeURIComponent(url.pathname) } catch { return respond(res,400,{error:'Ruta inválida.'}) }
  const assetPath = resolve(root, '.' + decoded)
  if (assetPath !== root && !assetPath.startsWith(root + sep)) return respond(res,403,{error:'Acceso denegado.'})
  const target = existsSync(assetPath) && statSync(assetPath).isFile() ? assetPath : (extname(decoded) ? null : resolve(root,'index.html'))
  if (!target || !existsSync(target)) return respond(res,404,{error:'Archivo no encontrado.'})
  res.writeHead(200, { 'Content-Type': mime[extname(target)] || 'application/octet-stream', 'Cache-Control': target.endsWith('index.html') ? 'no-cache' : 'public, max-age=3600' })
  if (req.method === 'HEAD') return res.end()
  createReadStream(target).pipe(res)
}
if (process.argv[1] && resolve(process.argv[1]) === resolve(new URL(import.meta.url).pathname)) createServer(handler).listen(port,process.env.HOST || '127.0.0.1',()=>console.log(`ILUTEX web: http://localhost:${port}`))
export {handler}
