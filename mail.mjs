import { connect } from 'node:tls';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const directory=dirname(fileURLToPath(import.meta.url));
export function mailConfig(){
 const filename=resolve(directory,'correo.config.json');
 if(!existsSync(filename))return null;
 const c=JSON.parse(readFileSync(filename,'utf8'));
 if(!c.destinatario || !c.usuario || !c.contrasena_aplicacion || !c.servidor)return null;
 if(!/^\S+@\S+\.\S+$/.test(c.destinatario)||!/^\S+@\S+\.\S+$/.test(c.usuario))return null;
 return c;
}
function ascii(s){return String(s??'').replace(/[\r\n]/g,' ').slice(0,250)}
function encode(s){return Buffer.from(String(s),'utf8').toString('base64').replace(/.{1,76}/g,'$&\r\n').trim()}
export async function sendSolicitud(record,config=mailConfig()){
 if(!config)throw new Error('CORREO_SIN_CONFIGURAR');
 const host=String(config.servidor),port=Number(config.puerto||465);
 if(!/^[a-zA-Z0-9.-]+$/.test(host)||!Number.isInteger(port)||port<1||port>65535)throw new Error('Configuración SMTP inválida');
 const lines=[['Tipo',record.tipo],['Nombre',record.nombre],['Empresa',record.empresa],['Correo del cliente',record.correo],['Teléfono',record.telefono],['Servicio',record.servicio],['Mensaje',record.mensaje],['Ubicación',record.ubicacion],['Necesidad',record.necesidad],['Inversión',record.inversion],['Fecha',record.recibido],['Identificador',record.id]].filter(([,v])=>v).map(([k,v])=>`${k}: ${v}`).join('\n\n');
 const msg=[`From: ${ascii(config.usuario)}`,`To: ${ascii(config.destinatario)}`,`Reply-To: ${ascii(record.correo)}`,`Subject: =?UTF-8?B?${Buffer.from('ILUTEX - '+(record.tipo==='cotizacion'?'Nueva cotización':'Nuevo contacto')).toString('base64')}?=`,`Date: ${new Date().toUTCString()}`,'MIME-Version: 1.0','Content-Type: text/plain; charset=UTF-8','Content-Transfer-Encoding: base64','',''+encode(lines)].join('\r\n');
 return new Promise((resolvePromise,rejectPromise)=>{
  const socket=connect({host,port,servername:host,rejectUnauthorized:true});
  let stage=0,buf='',response='',done=false;
  const fail=(err)=>{if(done)return;done=true;socket.destroy();rejectPromise(err)};
  const finish=()=>{if(done)return;done=true;socket.end();resolvePromise(true)};
  socket.setTimeout(15000,()=>fail(new Error('Tiempo de espera SMTP agotado')));
  const send=(command)=>socket.write(command+'\r\n');
  socket.on('error',fail);
  socket.on('data',chunk=>{
   buf+=chunk.toString('utf8');
   let i;
   while((i=buf.indexOf('\n'))!==-1){
    const line=buf.slice(0,i).replace(/\r$/,'');buf=buf.slice(i+1);
    if(!/^\d{3}[ -]/.test(line)){continue}
    response+=line+'\n';
    if(line[3]==='-')continue;
    const code=Number(line.slice(0,3));response='';
    if(stage===0&&code===220){stage++;send('EHLO ilutex.local')}
    else if(stage===1&&code===250){stage++;send('AUTH PLAIN '+Buffer.from('\0'+config.usuario+'\0'+config.contrasena_aplicacion).toString('base64'))}
    else if(stage===2&&code===235){stage++;send(`MAIL FROM:<${config.usuario}>`)}
    else if(stage===3&&code===250){stage++;send(`RCPT TO:<${config.destinatario}>`)}
    else if(stage===4&&(code===250||code===251)){stage++;send('DATA')}
    else if(stage===5&&code===354){stage++;send(msg.replace(/(^|\r\n)\./g,'$1..')+'\r\n.')}
    else if(stage===6&&code===250){stage++;send('QUIT');finish()}
    else fail(new Error('El servidor de correo rechazó el mensaje (SMTP '+code+'). Comprueba la cuenta y contraseña de aplicación.'));
   }
  });
 });
}
