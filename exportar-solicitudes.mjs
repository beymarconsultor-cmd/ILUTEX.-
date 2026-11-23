import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {resolve} from 'node:path';
const path=resolve(process.env.DATA_DIR||'./data','solicitudes.jsonl');
const fields=['id','recibido','tipo','nombre','empresa','correo','telefono','servicio','mensaje','ubicacion','necesidad','inversion'];
try {
  const lines=readFileSync(path,'utf8').split(/\r?\n/).filter(Boolean);
  const rows=lines.map(l=>JSON.parse(l));
  // Prefix dangerous spreadsheet formulas so opening a CSV cannot execute them.
  const safe=x=>{let s=String(x??'');if(/^[\s]*[=+@-]/.test(s))s="'"+s;return '"'+s.replaceAll('"','""')+'"'};
  const output='\uFEFF'+[fields.join(';'),...rows.map(row=>fields.map(f=>safe(row[f])).join(';'))].join('\r\n');
  mkdirSync('exportaciones',{recursive:true});
  const destination=resolve('exportaciones','solicitudes.csv');
  writeFileSync(destination,output,{mode:0o600});
  console.log(`Exportadas ${rows.length} solicitudes a ${destination}`);
} catch(e){console.error(e.code==='ENOENT'?'No hay solicitudes guardadas todavía.':e.message);process.exitCode=1}
