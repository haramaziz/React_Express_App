const API_ORIGIN = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace(/\/api\/?$/, '');

/** Universal fallback gallery: Master Bedroom, En-suite Bathroom, Balcony */
export const DEFAULT_ROOM_GALLERY = [
  'https://images.unsplash.com/photo-1616594039964-ae9021a400a0?auto=format&fit=crop&w=1400&q=80',
  'https://images.unsplash.com/photo-1552321554-5fefe8c9ef14?auto=format&fit=crop&w=1400&q=80',
  'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=1400&q=80'
];

const TYPE_FALLBACKS = {
  standard: DEFAULT_ROOM_GALLERY[0],
  deluxe: 'https://images.unsplash.com/photo-1591088398332-8a7791972843?auto=format&fit=crop&w=1400&q=80',
  suite: 'https://images.unsplash.com/photo-1582719508461-905c673771fd?auto=format&fit=crop&w=1400&q=80',
  family: 'https://images.unsplash.com/photo-1595578063854-8cb63bcdbabb?auto=format&fit=crop&w=1400&q=80',
  presidential: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1400&q=80'
};

export const resolveMediaUrl = (url) => {
  if (!url) return '';
  if (/^https?:\/\//i.test(url) || url.startsWith('data:')) return url;
  if (url.startsWith('/')) return `${API_ORIGIN}${url}`;
  return `${API_ORIGIN}/${url}`;
};

export const getRoomImages = (room) => {
  const list = [];
  if (Array.isArray(room?.images)) list.push(...room.images.filter(Boolean));
  if (room?.image) list.unshift(room.image);
  const unique = [...new Set(list.map(resolveMediaUrl).filter(Boolean))];
  if (unique.length) return unique;

  const typeCover = TYPE_FALLBACKS[room?.roomType];
  if (typeCover && typeCover !== DEFAULT_ROOM_GALLERY[0]) {
    return [typeCover, ...DEFAULT_ROOM_GALLERY.filter((u) => u !== typeCover)].slice(0, 3);
  }
  return [...DEFAULT_ROOM_GALLERY];
};

export const getRoomCover = (room) => getRoomImages(room)[0];

export const getGuestAvatarUrl = (guestOrUser) => {
  if (!guestOrUser) return '';
  return resolveMediaUrl(
    guestOrUser.avatarUrl ||
    guestOrUser.profileImage ||
    guestOrUser.avatar ||
    guestOrUser.photo ||
    ''
  );
};

export const getGuestInitials = (guest, anonymous = false) => {
  if (anonymous || !guest) return 'G';
  const first = guest.firstName?.charAt(0) || guest.name?.charAt(0) || '';
  const last = guest.lastName?.charAt(0) || '';
  return `${first}${last}`.toUpperCase() || 'G';
};

export default {
  resolveMediaUrl,
  getRoomImages,
  getRoomCover,
  getGuestAvatarUrl,
  getGuestInitials,
  DEFAULT_ROOM_GALLERY
};
