const HUB_URL = "https://eliezelapolinaris2017-lab.github.io/oasis-hub/";
const KEY = "oasis_mapcrm_v1";

const $ = (id)=>document.getElementById(id);

function uid(){ return "id_" + Date.now() + "_" + Math.random().toString(16).slice(2); }

function loadDB(){
  try{
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : { clients: [] };
  }catch{
    return { clients: [] };
  }
}
function saveDB(db){ localStorage.setItem(KEY, JSON.stringify(db)); }

function setMap(lat, lng, zoom=16){
  const q = encodeURIComponent(`${lat},${lng}`);
  const src = `https://maps.google.com/maps?q=${q}&z=${zoom}&output=embed`;
  $("map").src = src;
  $("mapHint").textContent = `Centrado en ${lat}, ${lng}`;
}

function refreshKPIs(db){
  $("kpiCount").textContent = String((db.clients||[]).length);
}

function render(){
  const db = loadDB();
  const q = ($("search").value||"").trim().toLowerCase();
  const tbody = $("tbody");
  tbody.innerHTML = "";

  let rows = db.clients || [];
  if(q){
    rows = rows.filter(c=>{
      const s = `${c.name} ${c.tag} ${c.note}`.toLowerCase();
      return s.includes(q);
    });
  }

  rows.forEach(c=>{
    const tr = document.createElement("tr");

    const td1 = document.createElement("td");
    td1.textContent = c.name || "";

    const td2 = document.createElement("td");
    td2.textContent = c.tag || "";

    const td3 = document.createElement("td");
    td3.textContent = `${c.lat}, ${c.lng}`;

    const td4 = document.createElement("td");
    const wrap = document.createElement("div");
    wrap.className = "aBtns";

    const btnGo = document.createElement("button");
    btnGo.className = "aBtn";
    btnGo.type = "button";
    btnGo.textContent = "Ver en mapa";
    btnGo.addEventListener("click", ()=> setMap(c.lat, c.lng, 17));

    const btnFill = document.createElement("button");
    btnFill.className = "aBtn";
    btnFill.type = "button";
    btnFill.textContent = "Editar";
    btnFill.addEventListener("click", ()=>{
      $("name").value = c.name || "";
      $("tag").value = c.tag || "";
      $("note").value = c.note || "";
      $("lat").value = c.lat || "";
      $("lng").value = c.lng || "";
      $("btnSave").dataset.editId = c.id;
      $("btnSave").textContent = "Actualizar";
      setMap(c.lat, c.lng, 17);
      window.scrollTo({ top: 0, behavior: "smooth" });
    });

    const btnDel = document.createElement("button");
    btnDel.className = "aBtn";
    btnDel.type = "button";
    btnDel.textContent = "Borrar";
    btnDel.addEventListener("click", ()=>{
      const ok = confirm("¿Borrar este cliente?");
      if(!ok) return;
      const db2 = loadDB();
      db2.clients = (db2.clients||[]).filter(x=>x.id!==c.id);
      saveDB(db2);
      render();
    });

    wrap.appendChild(btnGo);
    wrap.appendChild(btnFill);
    wrap.appendChild(btnDel);
    td4.appendChild(wrap);

    tr.appendChild(td1);
    tr.appendChild(td2);
    tr.appendChild(td3);
    tr.appendChild(td4);

    // tap en fila = centrar mapa
    tr.style.cursor = "pointer";
    tr.addEventListener("click", (e)=>{
      if(e.target.closest("button")) return;
      setMap(c.lat, c.lng, 17);
    });

    tbody.appendChild(tr);
  });

  refreshKPIs(db);

  // si no hay nada, usa PR center
  if((db.clients||[]).length === 0 && !$("map").src){
    setMap(18.2208, -66.5901, 10);
  }
}

function readForm(){
  const name = ($("name").value||"").trim();
  const tag = ($("tag").value||"").trim();
  const note = ($("note").value||"").trim();
  const lat = Number(($("lat").value||"").trim());
  const lng = Number(($("lng").value||"").trim());

  if(!name) return { error: "Nombre requerido." };
  if(!Number.isFinite(lat) || !Number.isFinite(lng)) return { error: "Lat/Lng inválidos." };

  return { name, tag, note, lat: Number(lat.toFixed(6)), lng: Number(lng.toFixed(6)) };
}

function clearForm(){
  $("name").value="";
  $("tag").value="";
  $("note").value="";
  $("lat").value="";
  $("lng").value="";
  delete $("btnSave").dataset.editId;
  $("btnSave").textContent = "Guardar";
}

function saveClient(){
  const data = readForm();
  if(data.error) return alert(data.error);

  const db = loadDB();
  db.clients = db.clients || [];

  const editId = $("btnSave").dataset.editId;
  if(editId){
    const idx = db.clients.findIndex(x=>x.id===editId);
    if(idx>=0){
      db.clients[idx] = { ...db.clients[idx], ...data, updatedAt: new Date().toISOString() };
    }
  }else{
    db.clients.unshift({
      id: uid(),
      ...data,
      createdAt: new Date().toISOString()
    });
  }

  saveDB(db);
  setMap(data.lat, data.lng, 17);
  clearForm();
  render();
}

function geo(){
  if(!navigator.geolocation){
    alert("Este dispositivo no soporta geolocalización.");
    return;
  }
  navigator.geolocation.getCurrentPosition(
    (pos)=>{
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;
      $("lat").value = lat.toFixed(6);
      $("lng").value = lng.toFixed(6);
      setMap(lat.toFixed(6), lng.toFixed(6), 17);
      $("mapHint").textContent = "Ubicación cargada. Dale Guardar.";
    },
    ()=>{
      alert("No se pudo obtener tu ubicación. Revisa permisos.");
    },
    { enableHighAccuracy:true, timeout:12000, maximumAge:0 }
  );
}

function exportDB(){
  const db = loadDB();
  const blob = new Blob([JSON.stringify(db.clients||[], null, 2)], {type:"application/json"});
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "oasis_mapcrm_clients.json";
  a.click();
  URL.revokeObjectURL(a.href);
}

function clearDB(){
  const ok = confirm("¿Vaciar todas las ubicaciones?");
  if(!ok) return;
  localStorage.removeItem(KEY);
  $("map").src = "";
  clearForm();
  render();
}

function boot(){
  const hub = $("hubBackBtn");
  if(hub) hub.href = HUB_URL;

  $("btnGeo").addEventListener("click", geo);
  $("btnSave").addEventListener("click", saveClient);
  $("search").addEventListener("input", render);
  $("btnExport").addEventListener("click", exportDB);
  $("btnClear").addEventListener("click", clearDB);

  // mapa inicial
  setMap(18.2208, -66.5901, 10);
  render();
}

document.addEventListener("DOMContentLoaded", boot);
