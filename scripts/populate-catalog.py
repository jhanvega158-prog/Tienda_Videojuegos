"""Carga autorizada de portadas y juegos. Requiere una cuenta ADMIN real; no altera el esquema."""
import getpass,json,os,time
from pathlib import Path
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
root=Path(__file__).resolve().parent.parent
manifest=json.loads((root/'docs/catalogo-juegos.json').read_text(encoding='utf-8-sig'))
email=os.environ.get('JJC_ADMIN_EMAIL') or input('Correo ADMIN: ')
password=getpass.getpass('Contrasena ADMIN: ')
opts=webdriver.ChromeOptions();opts.add_argument('--headless=new');d=webdriver.Chrome(options=opts);d.set_window_size(1600,1100);wait=WebDriverWait(d,40)
def api(code,*args):
 r=d.execute_async_script('const done=arguments[arguments.length-1];const db=ng.getComponent(document.querySelector("app-header")).auth.client;(async()=>{'+code+'})().then(done).catch(e=>done({error:{message:String(e)}}));',*args)
 if r.get('error'):raise RuntimeError(str(r['error']))
 return r.get('data')
try:
 d.get('http://127.0.0.1:4200/login');wait.until(lambda x:x.find_elements(By.CSS_SELECTOR,'[formcontrolname=correo]'))
 d.find_element(By.CSS_SELECTOR,'[formcontrolname=correo]').send_keys(email);d.find_element(By.CSS_SELECTOR,'[formcontrolname=password]').send_keys(password);d.execute_script('document.querySelector(".auth-submit").click()');wait.until(lambda x:'/admin' in x.current_url)
 if not api('return await db.rpc("es_admin");'):raise RuntimeError('Se requiere ADMIN')
 before=api('return await db.from("videojuegos").select("*").order("id");')
 backup=root/'docs/catalogo-antes-portadas.json'
 if not backup.exists():backup.write_text(json.dumps(before,ensure_ascii=False,indent=2),encoding='utf8')
 categories=api('return await db.from("categorias").select("id,nombre,activo");');cats={c['nombre']:c['id'] for c in categories if c['activo']}
 receipts=[]
 for game in manifest:
  if game['existingId']:
   row=api('return await db.from("videojuegos").update({imagen_url:arguments[1]}).eq("id",arguments[0]).select("id,nombre,imagen_url,precio,stock").single();',game['existingId'],game['imagen_url'])
  else:
   found=next((r for r in before if r['nombre']==game['nombre']),None)
   if found:row=found
   else:
    payload={k:game[k] for k in ['nombre','descripcion','precio','stock','plataforma','desarrollador','editor','imagen_url','trailer_url','fecha_lanzamiento','activo','destacado']};payload['id_categoria']=cats[game['category']]
    row=api('return await db.from("videojuegos").insert(arguments[0]).select("id,nombre,imagen_url,precio,stock").single();',payload)
  receipts.append(row);(root/'docs/catalogo-carga-resultado.json').write_text(json.dumps(receipts,ensure_ascii=False,indent=2),encoding='utf8');print(json.dumps({'id':row['id'],'nombre':row['nombre'],'imagen':row['imagen_url']},ensure_ascii=True),flush=True)
 final=api('return await db.from("videojuegos").select("id,nombre,imagen_url,activo").eq("activo",true);');print('ACTIVE_TOTAL',len(final),flush=True)
finally:
 password=None
 d.quit()
