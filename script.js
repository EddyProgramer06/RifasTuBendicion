  /* ---------------------------------------------------
     Almacenamiento de rifas activas — conectado a Firebase.
     Si firebase-config.js está bien configurado, los datos se
     guardan en Firestore y se actualizan EN VIVO para todos los
     visitantes (nadie necesita recargar la página). Si Firebase
     no está configurado todavía, se usa memoria de la sesión
     como respaldo para que el sitio no se rompa mientras lo
     terminas de conectar.
     --------------------------------------------------- */
  const RAFFLES_COLLECTION = 'raffles';
  const firebaseReady = typeof window.db !== 'undefined';
  const db = firebaseReady ? window.db : null;

  let memoryFallback = [];

  const gridEl = document.getElementById('raffle-grid');
  const rifaSelect = document.getElementById('rifa');
  const gradientClasses = ['g1','g2','g3'];

  function renderRifas(rifas){
    if(!rifas.length){
      gridEl.innerHTML = '<p class="admin-empty" style="grid-column:1/-1;">Todavía no hay rifas activas publicadas.</p>';
      rifaSelect.innerHTML = '';
      return;
    }

    gridEl.innerHTML = rifas.map((r, i) => {
      const pct = r.total > 0 ? Math.min(100, Math.round((r.vendidos / r.total) * 100)) : 0;
      const imgContent = r.imagen
        ? `<img src="${r.imagen}" alt="${r.nombre}" style="width:100%; height:100%; object-fit:cover;">`
        : r.nombre.toUpperCase();
      return `
      <div class="raffle-card">
        <div class="raffle-img ${gradientClasses[i % 3]}" style="${r.imagen ? 'padding:0;' : ''}">${imgContent}</div>
        <div class="raffle-body">
          <span class="raffle-tag">${r.etiqueta}</span>
          <h3>${r.nombre}</h3>
          <div class="price">Boleto desde <b>RD$${r.precio}</b></div>
          <div class="progress"><div class="progress-fill" style="width:${pct}%"></div></div>
          <div class="progress-label"><span>${pct}% vendido</span><span>${r.vendidos} / ${r.total}</span></div>
          <a href="#pago" class="raffle-cta">Comprar boleto</a>
        </div>
      </div>`;
    }).join('');

    rifaSelect.innerHTML = rifas.map(r =>
      `<option value="${r.nombre}" data-precio="${r.precio}">${r.nombre} — RD$${r.precio}/boleto</option>`
    ).join('');

    calcularTotal();
  }

  function renderAdminLista(rifas){
    const lista = document.getElementById('admin-lista');
    if(!lista) return;
    if(!rifas.length){
      lista.innerHTML = '<p class="admin-empty">No hay rifas publicadas todavía.</p>';
      return;
    }
    lista.innerHTML = rifas.map(r => `
      <div class="admin-item">
        <div class="a-info">
          <b>${r.nombre}</b>
          <span>RD$${r.precio}/boleto · ${r.vendidos}/${r.total} vendidos · ${r.etiqueta}</span>
        </div>
        <div style="display:flex; flex-shrink:0;">
          <button type="button" class="a-edit" data-id="${r.id}">Editar</button>
          <button type="button" class="a-del" data-id="${r.id}">Eliminar</button>
        </div>
      </div>
    `).join('');

    lista.querySelectorAll('.a-del').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.dataset.id;
        if(!confirm('¿Eliminar esta rifa?')) return;
        if(firebaseReady){
          try{
            await db.collection(RAFFLES_COLLECTION).doc(id).delete();
            // El listener en tiempo real actualiza la vista solo.
          }catch(e){
            alert('No se pudo eliminar en Firebase: ' + e.message);
          }
        }else{
          memoryFallback = memoryFallback.filter(r => r.id !== id);
          renderRifas(memoryFallback);
          renderAdminLista(memoryFallback);
        }
      });
    });

    lista.querySelectorAll('.a-edit').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.id;
        const rifa = rifas.find(r => r.id === id);
        if(!rifa) return;
        entrarModoEdicion(rifa);
      });
    });
  }

  function init(){
    if(!firebaseReady){
      console.warn('Firebase no está configurado todavía (revisa firebase-config.js). Usando datos de ejemplo en memoria.');
      renderRifas(memoryFallback);
      renderAdminLista(memoryFallback);
      return;
    }

  
    db.collection(RAFFLES_COLLECTION).orderBy('creado', 'asc')
      .onSnapshot(snapshot => {
        const rifas = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        renderRifas(rifas);
        renderAdminLista(rifas);
      }, err => {
        console.error('Error leyendo Firestore:', err);
        renderRifas(memoryFallback);
      });
  }

  const ADMIN_PASSWORD = '20bendicion26';

  document.getElementById('admin-login').addEventListener('click', () => {
    const val = document.getElementById('admin-pass').value;
    if(val === ADMIN_PASSWORD){
      document.getElementById('admin-locked').style.display = 'none';
      document.getElementById('admin-panel').style.display = 'block';
    }else{
      document.getElementById('admin-error').style.display = 'block';
    }
  });

  document.getElementById('admin-logout').addEventListener('click', () => {
    document.getElementById('admin-panel').style.display = 'none';
    document.getElementById('admin-locked').style.display = 'block';
    document.getElementById('admin-pass').value = '';
  });

  document.getElementById('admin-agregar').addEventListener('click', async () => {
    const nombre = document.getElementById('a-nombre').value.trim();
    const precio = parseInt(document.getElementById('a-precio').value, 10);
    const etiqueta = document.getElementById('a-etiqueta').value;
    const total = parseInt(document.getElementById('a-total').value, 10) || 0;
    const vendidos = parseInt(document.getElementById('a-vendidos').value, 10) || 0;
    const imagen = imagenActualBase64;

    if(!nombre || !precio){
      alert('Completa al menos el nombre del premio y el precio por boleto.');
      return;
    }

    const datosRifa = { nombre, precio, etiqueta, total, vendidos, imagen };

    if(editandoId){
      // Actualizar una rifa existente
      if(firebaseReady){
        try{
          await db.collection(RAFFLES_COLLECTION).doc(editandoId).update(datosRifa);
        }catch(e){
          alert('No se pudo actualizar en Firebase: ' + e.message);
        }
      }else{
        memoryFallback = memoryFallback.map(r => r.id === editandoId ? { ...r, ...datosRifa } : r);
        renderRifas(memoryFallback);
        renderAdminLista(memoryFallback);
      }
    }else{
      // Publicar una rifa nueva
      if(firebaseReady){
        try{
          await db.collection(RAFFLES_COLLECTION).add({ ...datosRifa, creado: Date.now() });
        }catch(e){
          alert('No se pudo guardar en Firebase: ' + e.message);
        }
      }else{
        memoryFallback.push({ id: String(Date.now()), ...datosRifa });
        renderRifas(memoryFallback);
        renderAdminLista(memoryFallback);
      }
    }

    salirModoEdicion();
  });

  document.getElementById('admin-cancelar-edicion').addEventListener('click', salirModoEdicion);

  /* ---------------------------------------------------
     Modo edición del formulario del admin
     --------------------------------------------------- */
  let editandoId = null;
  let imagenActualBase64 = '';

  function limpiarFormularioRifa(){
    document.getElementById('a-nombre').value = '';
    document.getElementById('a-precio').value = 200;
    document.getElementById('a-etiqueta').selectedIndex = 0;
    document.getElementById('a-total').value = '';
    document.getElementById('a-vendidos').value = '';
    document.getElementById('a-imagen').value = '';
    document.getElementById('a-imagen-preview').innerHTML = '';
    imagenActualBase64 = '';
  }

  function entrarModoEdicion(rifa){
    editandoId = rifa.id;
    document.getElementById('a-nombre').value = rifa.nombre;
    document.getElementById('a-precio').value = rifa.precio;
    document.getElementById('a-etiqueta').value = rifa.etiqueta;
    document.getElementById('a-total').value = rifa.total;
    document.getElementById('a-vendidos').value = rifa.vendidos;
    imagenActualBase64 = rifa.imagen || '';
    document.getElementById('a-imagen-preview').innerHTML = imagenActualBase64
      ? `<img src="${imagenActualBase64}" alt="Imagen actual">` : '';

    document.getElementById('admin-form-title').textContent = 'Editando: ' + rifa.nombre;
    document.getElementById('admin-agregar').textContent = '💾 Guardar cambios';
    document.getElementById('admin-cancelar-edicion').style.display = 'inline-block';
    document.getElementById('admin-form-title').scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  function salirModoEdicion(){
    editandoId = null;
    limpiarFormularioRifa();
    document.getElementById('admin-form-title').textContent = 'Agregar nueva rifa';
    document.getElementById('admin-agregar').textContent = '➕ Publicar rifa';
    document.getElementById('admin-cancelar-edicion').style.display = 'none';
  }

  document.getElementById('a-imagen').addEventListener('change', (e) => {
    const file = e.target.files[0];
    const preview = document.getElementById('a-imagen-preview');
    if(!file){ imagenActualBase64 = ''; preview.innerHTML = ''; return; }
    const reader = new FileReader();
    reader.onload = (ev) => {
      imagenActualBase64 = ev.target.result;
      preview.innerHTML = `<img src="${imagenActualBase64}" alt="Vista previa">`;
    };
    reader.readAsDataURL(file);
  });

  /* ---------------------------------------------------
     Formulario de compra
     --------------------------------------------------- */
  const cantidadInput = document.getElementById('cantidad');
  const totalEl = document.getElementById('total');
  const menosBtn = document.getElementById('menos');
  const masBtn = document.getElementById('mas');
  const nombreInput = document.getElementById('nombre');
  const cuentaRadios = document.querySelectorAll('input[name="cuenta"]');
  const detalles = {
    'Banreservas': document.getElementById('detalle-banreservas'),
    'BHD': document.getElementById('detalle-bhd'),
    'Popular': document.getElementById('detalle-popular')
  };

  function calcularTotal(){
    if(!rifaSelect.selectedOptions.length) return 0;
    const precio = parseInt(rifaSelect.selectedOptions[0].dataset.precio, 10) || 0;
    let cantidad = parseInt(cantidadInput.value, 10);
    if(isNaN(cantidad) || cantidad < 1){ cantidad = 1; cantidadInput.value = 1; }
    const total = precio * cantidad;
    totalEl.textContent = 'RD$' + total.toLocaleString('es-DO');
    return total;
  }

  function mostrarDetalle(cuenta){
    Object.entries(detalles).forEach(([key, el]) => {
      el.style.display = key === cuenta ? 'block' : 'none';
    });
  }

  rifaSelect.addEventListener('change', calcularTotal);
  cantidadInput.addEventListener('input', calcularTotal);
  menosBtn.addEventListener('click', () => {
    cantidadInput.value = Math.max(1, parseInt(cantidadInput.value || 1, 10) - 1);
    calcularTotal();
  });
  masBtn.addEventListener('click', () => {
    cantidadInput.value = parseInt(cantidadInput.value || 1, 10) + 1;
    calcularTotal();
  });
  cuentaRadios.forEach(radio => {
    radio.addEventListener('change', () => mostrarDetalle(radio.value));
  });

  document.getElementById('btn-confirmar').addEventListener('click', () => {
    if(!rifaSelect.value){ alert('No hay rifas activas para comprar en este momento.'); return; }
    const rifa = rifaSelect.value;
    const cantidad = cantidadInput.value;
    const total = calcularTotal();
    const cuenta = document.querySelector('input[name="cuenta"]:checked').value;
    const nombre = nombreInput.value.trim() || 'Sin nombre';

    const mensaje = `Hola, quiero comprar boletos:%0A` +
      `Rifa: ${encodeURIComponent(rifa)}%0A` +
      `Cantidad: ${cantidad}%0A` +
      `Total: RD$${total.toLocaleString('es-DO')}%0A` +
      `Deposité/transferí a: ${encodeURIComponent(cuenta)}%0A` +
      `Nombre: ${encodeURIComponent(nombre)}`;

    // WhatsApp del negocio: +1 (809) 905-5678
    const numeroWhatsapp = '18099055678';
    window.open(`https://wa.me/${numeroWhatsapp}?text=${mensaje}`, '_blank');
  });

  init();
