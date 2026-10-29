const $ = id => document.getElementById(id);

let canciones = [];

function textoSeguro(valor) {
  return String(valor ?? '');
}

function duracionTexto(segundos) {
  const n = Number(segundos);
  return `${Math.floor(n / 60).toString().padStart(2, '0')}:${(n % 60).toString().padStart(2, '0')}`;
}

function leerDuracion(valor) {
  const partes = valor.match(/^(\d{1,3}):([0-5]\d)$/);
  if (!partes) return null;
  return Number(partes[1]) * 60 + Number(partes[2]);
}

function crearElemento(etiqueta, clase, contenido = '') {
  const el = document.createElement(etiqueta);
  if (clase) el.className = clase;
  el.textContent = textoSeguro(contenido);
  return el;
}

function renderizar() {
  const buscar = $('buscar').value.trim().toLocaleLowerCase();

  const filtradas = canciones.filter(c =>
    [c.titulo, c.artista, c.album, c.genero]
      .some(valor => textoSeguro(valor).toLocaleLowerCase().includes(buscar))
  );

  $('totalCanciones').textContent = canciones.length;
  $('totalArtistas').textContent = new Set(
    canciones.map(c => c.artista.toLocaleLowerCase())
  ).size;
  $('totalGeneros').textContent = new Set(
    canciones.map(c => c.genero).filter(Boolean).map(g => g.toLocaleLowerCase())
  ).size;

  const contenedor = $('canciones');
  contenedor.replaceChildren();

  if (!filtradas.length) {
    contenedor.append(
      crearElemento('div', 'empty',
        buscar ? 'No encontramos canciones con esa búsqueda.' :
          'Tu biblioteca está vacía. ¡Agrega tu primera canción! 🎵')
    );
    return;
  }

  for (const c of filtradas) {
    const tarjeta = crearElemento('article', 'song-card');
    const cover = crearElemento('div', 'cover', '♫');

    if (c.portada_url) {
      const img = document.createElement('img');
      img.src = c.portada_url;
      img.alt = `Portada de ${c.titulo}`;
      img.loading = 'lazy';
      img.referrerPolicy = 'no-referrer';
      img.onerror = () => {
        cover.replaceChildren(document.createTextNode('♫'));
      };
      cover.replaceChildren(img);
    }

    const nombre = crearElemento('h3', '', c.titulo);
    const artista = crearElemento('p', '', `${c.artista} · ${c.album || 'Single'}`);

    const info = crearElemento('div', 'song-meta');
    info.append(
      crearElemento('span', '', c.genero || 'Sin género'),
      crearElemento('span', '', duracionTexto(c.duracion_segundos))
    );

    const acciones = crearElemento('div', 'card-actions');
    const editar = crearElemento('button', 'edit-btn', '✎ Editar');
    const eliminar = crearElemento('button', 'delete-btn', 'Eliminar');

    editar.type = 'button';
    eliminar.type = 'button';

    editar.addEventListener('click', () => editarCancion(c));
    eliminar.addEventListener('click', () => eliminarCancion(c.id, c.titulo));

    acciones.append(editar, eliminar);
    tarjeta.append(cover, nombre, artista, info, acciones);
    contenedor.append(tarjeta);
  }
}

async function cargarCanciones() {
  try {
    const respuesta = await fetch('/api/canciones');
    if (!respuesta.ok) throw new Error('No se pudo cargar el catálogo.');
    canciones = await respuesta.json();
    $('mensajeBiblioteca').textContent = '';
    renderizar();
  } catch (error) {
    $('mensajeBiblioteca').textContent = error.message;
  }
}

function limpiarFormulario() {
  $('formCancion').reset();
  $('cancionId').value = '';
  $('tituloFormulario').textContent = 'Agregar canción';
  $('guardar').textContent = '✦ Guardar canción';
  $('cancelar').hidden = true;
}

function editarCancion(c) {
  $('cancionId').value = c.id;
  $('titulo').value = c.titulo;
  $('artista').value = c.artista;
  $('album').value = c.album || '';
  $('genero').value = c.genero || '';
  $('duracion').value = duracionTexto(c.duracion_segundos);
  $('portada').value = c.portada_url || '';
  $('tituloFormulario').textContent = 'Editar canción';
  $('guardar').textContent = '✦ Guardar cambios';
  $('cancelar').hidden = false;
  $('mensajeFormulario').textContent = '';
  $('formulario').scrollIntoView({ behavior: 'smooth' });
}

async function eliminarCancion(id, titulo) {
  if (!confirm(`¿Eliminar "${titulo}" de tu biblioteca?`)) return;

  try {
    const respuesta = await fetch(`/api/canciones/${id}`, {
      method: 'DELETE'
    });
    if (!respuesta.ok) throw new Error('No se pudo eliminar la canción.');
    await cargarCanciones();
    $('mensajeBiblioteca').textContent = 'Canción eliminada correctamente.';
    if (String($('cancionId').value) === String(id)) limpiarFormulario();
  } catch (error) {
    $('mensajeBiblioteca').textContent = error.message;
  }
}

$('formCancion').addEventListener('submit', async event => {
  event.preventDefault();

  const duracion = leerDuracion($('duracion').value.trim());

  if (!duracion || duracion > 86400) {
    $('mensajeFormulario').textContent = 'Utiliza una duración válida, por ejemplo 03:45.';
    return;
  }

  const datos = {
    titulo: $('titulo').value.trim(),
    artista: $('artista').value.trim(),
    album: $('album').value.trim(),
    genero: $('genero').value.trim(),
    duracion_segundos: duracion,
    portada_url: $('portada').value.trim()
  };

  const id = $('cancionId').value;
  const url = id ? `/api/canciones/${id}` : '/api/canciones';

  try {
    const respuesta = await fetch(url, {
      method: id ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(datos)
    });

    const resultado = await respuesta.json();
    if (!respuesta.ok) {
      throw new Error(resultado.error || 'No se pudo guardar la canción.');
    }

    limpiarFormulario();
    await cargarCanciones();
    $('mensajeFormulario').textContent =
      id ? 'Canción actualizada correctamente.' :
        'Canción agregada a tu biblioteca.';
  } catch (error) {
    $('mensajeFormulario').textContent = error.message;
  }
});

$('cancelar').addEventListener('click', limpiarFormulario);
$('buscar').addEventListener('input', renderizar);

cargarCanciones();
