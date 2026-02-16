import { put } from "@vercel/blob";
import { nanoid } from "nanoid";
import { NextResponse } from "next/server";

function injectMobileControls(html: string): string {
  var mobileScript = `
<style>
.mobile-dpad{position:fixed;bottom:20px;left:50%;transform:translateX(-50%);z-index:9999;display:none;gap:8px;pointer-events:auto}
.mobile-dpad button{width:52px;height:52px;border-radius:50%;border:2px solid rgba(255,255,255,0.4);background:rgba(0,0,0,0.35);color:white;font-size:18px;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(4px);-webkit-backdrop-filter:blur(4px);touch-action:none;user-select:none;-webkit-user-select:none}
.mobile-dpad button:active{background:rgba(100,100,255,0.5);border-color:rgba(100,100,255,0.8)}
@media(hover:none)and(pointer:coarse){.mobile-dpad{display:flex}}
</style>
<div class="mobile-dpad">
<button id="ml">&larr;</button>
<button id="mf">&uarr;</button>
<button id="mb">&darr;</button>
<button id="mr">&rarr;</button>
</div>
<script>
(function(){
var rig,cam,interval=null,speed=0.15;
function init(){rig=document.getElementById('rig');cam=document.querySelector('[camera]');}
function move(dir){
if(!rig||!cam)init();
if(!rig||!cam)return;
var r=cam.object3D.rotation,p=rig.getAttribute('position');
if(dir==='f'){p.x-=Math.sin(r.y)*speed;p.z-=Math.cos(r.y)*speed;}
else if(dir==='b'){p.x+=Math.sin(r.y)*speed;p.z+=Math.cos(r.y)*speed;}
else if(dir==='l'){p.x-=Math.cos(r.y)*speed;p.z+=Math.sin(r.y)*speed;}
else if(dir==='r'){p.x+=Math.cos(r.y)*speed;p.z-=Math.sin(r.y)*speed;}
rig.setAttribute('position',p);
}
function start(dir){if(interval)return;move(dir);interval=setInterval(function(){move(dir);},33);}
function stop(){clearInterval(interval);interval=null;}
document.addEventListener('DOMContentLoaded',function(){
['ml','mf','mb','mr'].forEach(function(id){
var btn=document.getElementById(id);
var dir=id==='mf'?'f':id==='mb'?'b':id==='ml'?'l':'r';
btn.addEventListener('touchstart',function(e){e.preventDefault();start(dir);},{passive:false});
btn.addEventListener('touchend',stop);
btn.addEventListener('touchcancel',stop);
});
});
})();
</script>`;
  return html.replace('</body>', mobileScript + '\n</body>');
}

export async function POST(request: Request) {
  try {
    var body = await request.json();
    var html = body.html as string;

    if (!html) {
      return NextResponse.json({ error: "No HTML provided" }, { status: 400 });
    }

    // Inject mobile controls before uploading
    var enhancedHtml = injectMobileControls(html);

    var id = nanoid(10);
    var pathname = "scenes/" + id + ".html";
    var blob = await put(pathname, enhancedHtml, {
      access: "public",
      contentType: "text/html",
    });

    return NextResponse.json({ url: "/scene/" + id, blobUrl: blob.url });
  } catch (error) {
    console.error("Share failed:", error);
    return NextResponse.json({ error: "Share failed" }, { status: 500 });
  }
}
