//Storage helpers 
const LS_CLIENTES = "agenda_clientes_v1";
const LS_TURNOS = "agenda_turnos_v1";

const $ = (sel) => document.querySelector(sel);

function load(key){
  try { return JSON.parse(localStorage.getItem(key)) ?? []; }
  catch { return []; }
}
function save(key, val){
  localStorage.setItem(key, JSON.stringify(val));
}

function uid(){
  return crypto.randomUUID ? crypto.randomUUID() : String(Date.now() + Math.random());
}

//State 
let clientes = load(LS_CLIENTES);
let turnos = load(LS_TURNOS);

//Elementos
const modalPaciente = $("#modalPaciente");
const btnNuevoPaciente = $("#btnNuevoPaciente");
const pacienteForm = $("#pacienteForm");

const pacienteSelect = $("#pacienteSelect");
const turnoForm = $("#turnoForm");
const msg = $("#msg");

const buscar = $("#buscar");
const gridPacientes = $("#gridPacientes");

const fecha = $("#fecha");
const hora = $("#hora");
const servicio = $("#servicio");
const notasTurno = $("#notasTurno");

const fechaVer = $("#fechaVer");
const btnHoy = $("#btnHoy");
const listaTurnos = $("#listaTurnos");

//Init dates 
function isoToday(){
  const d = new Date();
  const off = d.getTimezoneOffset();
  const local = new Date(d.getTime() - off * 60000);
  return local.toISOString().slice(0,10);
}
fecha.value = isoToday();
fechaVer.value = isoToday();

//UI render
function renderPacienteSelect(){
  pacienteSelect.innerHTML = "";
  if(clientes.length === 0){
    const opt = document.createElement("option");
    opt.value = "";
    opt.textContent = "Primero creá un paciente…";
    pacienteSelect.appendChild(opt);
    pacienteSelect.disabled = true;
    return;
  }
  pacienteSelect.disabled = false;

  const opt0 = document.createElement("option");
  opt0.value = "";
  opt0.textContent = "Seleccionar paciente…";
  pacienteSelect.appendChild(opt0);

  clientes
    .slice()
    .sort((a,b)=> a.nombre.localeCompare(b.nombre))
    .forEach(c=>{
      const opt = document.createElement("option");
      opt.value = c.id;
      opt.textContent = `${c.nombre} — ${c.telefono}`;
      pacienteSelect.appendChild(opt);
    });
}

function renderPacientes(){
  const q = buscar.value.trim().toLowerCase();

  const filtered = clientes.filter(c=>{
    const hay = `${c.nombre} ${c.telefono} ${c.ruc}`.toLowerCase();
    return hay.includes(q);
  }).sort((a,b)=> a.nombre.localeCompare(b.nombre));

  gridPacientes.innerHTML = "";

  if(filtered.length === 0){
    gridPacientes.innerHTML = `<div class="msg">No hay pacientes que coincidan.</div>`;
    return;
  }

  filtered.forEach(c=>{
    const next = proximoTurnoDe(c.id);
    const last = ultimoTurnoDe(c.id);

    const div = document.createElement("div");
    div.className = "card";
    div.innerHTML = `
      <h3>${escapeHtml(c.nombre)}</h3>
      <div class="meta">
        <div>📞 <b>${escapeHtml(c.telefono)}</b></div>
        <div>🧾 RUC: <b>${escapeHtml(c.ruc)}</b></div>
        ${c.notas ? `<div>📝 ${escapeHtml(c.notas)}</div>` : ``}
        <div>⏭ Próximo: <b>${next ?? "—"}</b></div>
        <div>⏮ Último: <b>${last ?? "—"}</b></div>
      </div>
      <div class="actions">
        <button class="btn primary" data-agendar="${c.id}">Agendar</button>
        <button class="btn" data-hist="${c.id}">Historial</button>
        <button class="btn" data-del="${c.id}">Eliminar</button>
      </div>
    `;
    gridPacientes.appendChild(div);
  });
}

function renderTurnosDelDia(fechaISO){
  const day = turnos
    .filter(t => t.fecha === fechaISO)
    .sort((a,b)=> a.hora.localeCompare(b.hora));

  listaTurnos.innerHTML = "";
  if(day.length === 0){
    listaTurnos.innerHTML = `<li class="msg">No hay turnos para esta fecha.</li>`;
    return;
  }

  day.forEach(t=>{
    const c = clientes.find(x=> x.id === t.clienteId);
    const li = document.createElement("li");
    li.className = "item";

    const ok = t.estado === "confirmado" || t.estado === "pendiente";
    li.innerHTML = `
      <div class="top">
        <div>
          <b>${t.hora}</b> · ${escapeHtml(t.servicio)}<br/>
          <span class="badge">${c ? escapeHtml(c.nombre) : "Paciente eliminado"}</span>
          ${t.notas ? ` <span class="badge">${escapeHtml(t.notas)}</span>` : ``}
        </div>
        <span class="badge ${ok ? "ok":"no"}">${escapeHtml(t.estado)}</span>
      </div>

      <div class="row" style="margin-top:10px; justify-content:flex-end;">
        <button class="btn" data-toggle="${t.id}">Cambiar estado</button>
        <button class="btn" data-remove-turno="${t.id}">Borrar</button>
      </div>
    `;
    listaTurnos.appendChild(li);
  });
}

function proximoTurnoDe(clienteId){
  const today = isoToday();
  const future = turnos
    .filter(t=> t.clienteId === clienteId)
    .filter(t=> (t.fecha > today) || (t.fecha === today && t.hora >= (new Date().toTimeString().slice(0,5))))
    .sort((a,b)=> (a.fecha+a.hora).localeCompare(b.fecha+b.hora))[0];
  return future ? `${future.fecha} ${future.hora}` : null;
}
function ultimoTurnoDe(clienteId){
  const past = turnos
    .filter(t=> t.clienteId === clienteId)
    .sort((a,b)=> (b.fecha+b.hora).localeCompare(a.fecha+a.hora))[0];
  return past ? `${past.fecha} ${past.hora}` : null;
}

function escapeHtml(str){
  return String(str).replace(/[&<>"']/g, s => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"
  }[s]));
}

function flash(text, ok=true){
  msg.textContent = text;
  msg.style.color = ok ? "var(--ok)" : "var(--danger)";
  setTimeout(()=> { msg.textContent = ""; msg.style.color = "var(--muted)"; }, 2600);
}

//Acciones para pacientes
btnNuevoPaciente.addEventListener("click", ()=>{
  $("#pNombre").value = "";
  $("#pTelefono").value = "";
  $("#pRuc").value = "";
  $("#pNotas").value = "";
  modalPaciente.showModal();
});

pacienteForm.addEventListener("submit", (e)=>{
  e.preventDefault();

  const nombre = $("#pNombre").value.trim();
  const telefono = $("#pTelefono").value.trim();
  const ruc = $("#pRuc").value.trim();
  const notas = $("#pNotas").value.trim();

  const nuevo = { id: uid(), nombre, telefono, ruc, notas };

  clientes.push(nuevo);
  save(LS_CLIENTES, clientes);

  modalPaciente.close();
  renderPacienteSelect();
  renderPacientes();
  flash("Paciente guardado ✅", true);
});

turnoForm.addEventListener("submit", (e)=>{
  e.preventDefault();

  const f = fecha.value;
  const h = hora.value;
  const s = servicio.value;
  const clienteId = pacienteSelect.value;
  const notas = notasTurno.value.trim();

  if(!clienteId){
    flash("Elegí un paciente.", false);
    return;
  }

  // Evitar doble turno en misma fecha y hora
  const ocupado = turnos.some(t => t.fecha === f && t.hora === h && t.estado !== "cancelado");
  if(ocupado){
    flash("Ese horario ya está ocupado ❌", false);
    return;
  }

  const turno = { id: uid(), fecha: f, hora: h, servicio: s, clienteId, notas, estado:"pendiente" };
  turnos.push(turno);
  save(LS_TURNOS, turnos);

  notasTurno.value = "";
  flash("Turno guardado ✅", true);

  renderTurnosDelDia(fechaVer.value);
  renderPacientes();
});

btnHoy.addEventListener("click", ()=>{
  fechaVer.value = isoToday();
  renderTurnosDelDia(fechaVer.value);
});
fechaVer.addEventListener("change", ()=> renderTurnosDelDia(fechaVer.value));

buscar.addEventListener("input", renderPacientes);

gridPacientes.addEventListener("click", (e)=>{
  const ag = e.target.closest("[data-agendar]");
  const hs = e.target.closest("[data-hist]");
  const del = e.target.closest("[data-del]");

  if(ag){
    const id = ag.dataset.agendar;
    pacienteSelect.value = id;
    // mini “salto” a la izquierda en pantallas chicas
    window.scrollTo({ top: 0, behavior:"smooth" });
    flash("Listo: seleccioné el paciente para agendar ✨", true);
  }

  if(hs){
    const id = hs.dataset.hist;
    const c = clientes.find(x=>x.id===id);
    const hist = turnos
      .filter(t=>t.clienteId===id)
      .sort((a,b)=> (b.fecha+b.hora).localeCompare(a.fecha+a.hora))
      .slice(0,10)
      .map(t=> `${t.fecha} ${t.hora} · ${t.servicio} (${t.estado})`)
      .join("\n") || "Sin historial todavía.";

    alert(`${c?.nombre ?? "Paciente"}\n\nHistorial (últimos 10):\n${hist}`);
  }

  if(del){
    const id = del.dataset.del;
    const c = clientes.find(x=>x.id===id);
    if(confirm(`¿Eliminar a ${c?.nombre ?? "este paciente"}?\n(No borra turnos anteriores, pero quedará como “Paciente eliminado”)`)){
      clientes = clientes.filter(x=>x.id!==id);
      save(LS_CLIENTES, clientes);
      renderPacienteSelect();
      renderPacientes();
      renderTurnosDelDia(fechaVer.value);
      flash("Paciente eliminado 🗑️", true);
    }
  }
});

listaTurnos.addEventListener("click", (e)=>{
  const tog = e.target.closest("[data-toggle]");
  const rm = e.target.closest("[data-remove-turno]");

  if(tog){
    const id = tog.dataset.toggle;
    const t = turnos.find(x=>x.id===id);
    if(!t) return;

    const order = ["pendiente","confirmado","completado","cancelado"];
    const idx = order.indexOf(t.estado);
    t.estado = order[(idx+1) % order.length];

    save(LS_TURNOS, turnos);
    renderTurnosDelDia(fechaVer.value);
    renderPacientes();
  }

  if(rm){
    const id = rm.dataset.removeTurno;
    if(confirm("¿Borrar este turno?")){
      turnos = turnos.filter(x=>x.id!==id);
      save(LS_TURNOS, turnos);
      renderTurnosDelDia(fechaVer.value);
      renderPacientes();
      flash("Turno borrado 🗑️", true);
    }
  }
});

//First render
renderPacienteSelect();
renderPacientes();
renderTurnosDelDia(fechaVer.value);