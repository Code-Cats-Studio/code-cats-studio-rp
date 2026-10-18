// Contenido editable de la landing (textos del Figma "Pagina Web Code Cats").
export const WHATSAPP_URL = 'https://wa.me/59175268812';
export const LINKTREE_URL = 'https://linktr.ee/code_cats_studio';

export const MARQUEE = ['Cursos', 'Proyectos', 'Comunidad', 'Gatos', 'HTML & CSS', 'JavaScript', 'React', 'Git & GitHub'];

export const ABOUT_STATS = [
  { value: 2000, suffix: '+', label: 'Seguidores' },
  { value: 4, suffix: '', label: 'Cursos' },
  { value: 100, suffix: '%', label: 'Gratis' },
];

export const ABOUT_POINTS = [
  { title: 'Aprende haciendo', text: 'Proyectos reales desde el primer día. Nada de tutoriales infinitos sin propósito práctico.' },
  { title: 'Estudia en grupo', text: 'Sesiones semanales, revisión de código y una comunidad donde siempre hay alguien disponible.' },
  { title: 'Ambiente sin toxicidad', text: 'Todos fuimos principiantes. La comunidad existe para ayudarse, no para competir entre todos.' },
];

// Tarjetas de "Lo que construimos": reemplázalas por proyectos reales cuando los tengas.
export const PROJECTS = [
  { title: 'Proyecto final: página responsive', stack: ['HTML', 'CSS'], image: '/images/mascot/cat-browser.png' },
  { title: 'Tu portafolio con Git y GitHub', stack: ['Git', 'GitHub'], image: '/images/mascot/cat-coding.png' },
  { title: 'Primeros programas con JavaScript', stack: ['JavaScript'], image: '/images/mascot/gato-js-3.png' },
];

// El Linktree reúne las redes oficiales; cambia cada url por el perfil exacto cuando quieras.
export const SOCIALS = [
  { name: 'WhatsApp', short: 'WA', url: WHATSAPP_URL },
  { name: 'TikTok', short: 'TT', url: LINKTREE_URL },
  { name: 'Instagram', short: 'IG', url: LINKTREE_URL },
  { name: 'Facebook', short: 'FB', url: LINKTREE_URL },
];

// Símbolos de la marca ({ } / * > &) que flotan de decoración en el hero.
export const SYMBOLS: { char: string; color: 'lime' | 'blue'; top: string; left: string; size: string; delay: string }[] = [
  { char: '{', color: 'blue', top: '12%', left: '47%', size: '5.5rem', delay: '0s' },
  { char: '/', color: 'lime', top: '70%', left: '44%', size: '4.5rem', delay: '1.2s' },
  { char: '*', color: 'lime', top: '18%', left: '90%', size: '5rem', delay: '0.6s' },
  { char: '>', color: 'lime', top: '78%', left: '94%', size: '4rem', delay: '1.8s' },
  { char: '&', color: 'blue', top: '60%', left: '6%', size: '4.5rem', delay: '0.9s' },
];
