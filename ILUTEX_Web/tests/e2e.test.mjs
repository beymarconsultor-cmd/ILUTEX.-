import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {handler} from '../server.mjs';

test('recorrido HTTP, recursos, rutas y bloqueo de envío sin configurar', async()=> {
 const dir=mkdtempSync(join(tmpdir(),'ilutex-test-'));
 process.env.DATA_DIR=dir; // cambiar antes de importar servidor en aplicaciones independientes
 const server=createServer(handler);
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 try {
  const root=`http://127.0.0.1:${server.address().port}`;
  for(const path of ['/','/servicios','/proyectos','/contacto','/cotizacion','/servicio/electricos','/proyecto/radio-base']){
   const r=await fetch(root+path); assert.equal(r.status,200,path);
   assert.match(await r.text(),/ILUTEX L\.S\./);
  }
  for(const path of ['/app.js','/styles.css','/assets/logo-ilutex.png','/assets/electricidad.svg','/assets/antenas.svg','/assets/radiobases.svg']){
   const r=await fetch(root+path); assert.equal(r.status,200,path);assert.ok((await r.arrayBuffer()).byteLength>100,path);
  }
  const bad=await fetch(root+'/api/solicitudes',{method:'POST',headers:{'Content-Type':'application/json','Origin':'https://example.com'},body:'{}'});
  assert.equal(bad.status,403);
  const missing=await fetch(root+'/archivo-inexistente.jpg');assert.equal(missing.status,404);
  const post=await fetch(root+'/api/solicitudes',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({tipo:'cotizacion',nombre:'Persona de prueba',correo:'prueba@example.org',telefono:'71234567',servicio:'Trabajos eléctricos',necesidad:'Revisión técnica',ubicacion:'Potosí'})});
  assert.equal(post.status,503);
  assert.match((await post.json()).error,/correo/i);
 } finally { await new Promise(r=>server.close(r));rmSync(dir,{recursive:true,force:true}) }
});
