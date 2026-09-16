/**
 * Enlaces de vídeo y archivos del material de estudio.
 *
 * El vídeo NO se incrusta: se ofrece como enlace para que el aprendiz lo abra en
 * el sitio de origen. Por eso la URL se guarda tal como la escribe el instructor
 * —un enlace de YouTube en su forma normal— y aquí solo se comprueba que sea
 * una dirección válida. Incrustarlo era además lo que dejaba el recuadro gris:
 * YouTube rechaza mostrarse dentro de otra página desde una URL de tipo watch.
 */

const TIPOS_PERMITIDOS = {
  'application/pdf': 'documento',
  'image/png': 'imagen',
  'image/jpeg': 'imagen',
  'image/webp': 'imagen',
  'image/gif': 'imagen',
  'audio/mpeg': 'audio',
  'audio/wav': 'audio',
  'audio/webm': 'audio',
  'video/mp4': 'video',
  'video/webm': 'video'
};

export const TAMANO_MAXIMO_BYTES = 25 * 1024 * 1024; // 25 MB

export function tipoDeArchivoPermitido(mime) {
  return Boolean(TIPOS_PERMITIDOS[mime]);
}

export function categoriaDeArchivo(mime) {
  return TIPOS_PERMITIDOS[mime] || 'otro';
}

export function extensionesPermitidas() {
  return Object.keys(TIPOS_PERMITIDOS);
}

/**
 * Convierte un enlace de vídeo a su forma incrustable.
 * @returns {{ url: string, incrustable: boolean, servicio: string }}
 */
export function normalizarUrlDeVideo(url) {
  const original = String(url || '').trim();
  if (!original) return { url: '', incrustable: false, servicio: 'ninguno' };

  try {
    const u = new URL(original);
    const host = u.hostname.replace(/^www\./, '');

    // youtube.com/watch?v=ID  ·  youtube.com/embed/ID  ·  youtu.be/ID
    if (host === 'youtube.com' || host === 'm.youtube.com' || host === 'youtube-nocookie.com') {
      if (u.pathname.startsWith('/embed/')) {
        return { url: `https://www.youtube.com/embed/${u.pathname.split('/')[2]}`, incrustable: true, servicio: 'youtube' };
      }
      const id = u.searchParams.get('v');
      if (id) return { url: `https://www.youtube.com/embed/${id}`, incrustable: true, servicio: 'youtube' };
    }
    if (host === 'youtu.be') {
      const id = u.pathname.slice(1).split('/')[0];
      if (id) return { url: `https://www.youtube.com/embed/${id}`, incrustable: true, servicio: 'youtube' };
    }

    // vimeo.com/ID  ·  player.vimeo.com/video/ID
    if (host === 'vimeo.com') {
      const id = u.pathname.split('/').filter(Boolean)[0];
      if (id && /^\d+$/.test(id)) {
        return { url: `https://player.vimeo.com/video/${id}`, incrustable: true, servicio: 'vimeo' };
      }
    }
    if (host === 'player.vimeo.com') return { url: original, incrustable: true, servicio: 'vimeo' };

    // Archivo de vídeo servido directamente
    if (/\.(mp4|webm|ogg)$/i.test(u.pathname)) {
      return { url: original, incrustable: true, servicio: 'archivo' };
    }

    // Servicio desconocido: se conserva, pero se mostrará como enlace.
    return { url: original, incrustable: false, servicio: 'desconocido' };
  } catch {
    return { url: original, incrustable: false, servicio: 'invalido' };
  }
}

/**
 * Limpia el datos_json de un contenido antes de guardarlo.
 * El enlace se conserva íntegro: es el que abrirá el aprendiz.
 */
export function normalizarDatosDeContenido(datos) {
  if (!datos || typeof datos !== 'object') return datos ?? null;

  const limpio = { ...datos };
  if (limpio.videoUrl) {
    const url = String(limpio.videoUrl).trim();
    if (!url) {
      delete limpio.videoUrl;
    } else {
      limpio.videoUrl = url;
      limpio.videoServicio = normalizarUrlDeVideo(url).servicio;
    }
  }
  return limpio;
}

/** Comprueba que un texto sea una dirección web utilizable. */
export function esUrlValida(url) {
  try {
    const u = new URL(String(url).trim());
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}
