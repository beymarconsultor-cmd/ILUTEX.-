import test from 'node:test'
import assert from 'node:assert/strict'
import {validate,handler} from '../server.mjs'
import {createServer} from 'node:http'
test('validación de contacto y cotización',()=>{
 const base={tipo:'contacto',nombre:'Cliente',correo:'cliente@example.com',telefono:'71234567',servicio:'Trabajos eléctricos',mensaje:'Solicito información'}
 assert.equal(validate(base),null)
 assert.match(validate({...base,correo:'invalido'}),/Correo/)
 assert.match(validate({...base,mensaje:''}),/mensaje/)
 assert.equal(validate({...base,tipo:'cotizacion',necesidad:'Instalación',ubicacion:'Potosí'}),null)
})
test('rutas de diagnóstico y petición inválida',async()=>{
 const server=createServer(handler);await new Promise(r=>server.listen(0,'127.0.0.1',r));
 try {const base=`http://127.0.0.1:${server.address().port}`;const health=await fetch(base+'/api/salud');assert.equal(health.status,200);assert.equal((await health.json()).ok,true);const bad=await fetch(base+'/api/solicitudes',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({tipo:'contacto'})});assert.equal(bad.status,400)} finally{await new Promise(r=>server.close(r))}
})
