import { getGuestAvatarUrl, getGuestInitials } from '../utils/media';

/**
 * Renders a guest profile photo or sage/sand initials fallback.
 */
const GuestAvatar = ({ guest, anonymous = false, size = 'md', className = '' }) => {
  const src = anonymous ? '' : getGuestAvatarUrl(guest);
  const initials = getGuestInitials(guest, anonymous);
  const label = anonymous
    ? 'Guest'
    : [guest?.firstName, guest?.lastName].filter(Boolean).join(' ') || 'Guest';

  return (
    <span
      className={`guest-avatar guest-avatar-${size} ${className}`.trim()}
      title={label}
      aria-label={label}
    >
      {src ? (
        <img
          src={src}
          alt=""
          onError={(e) => {
            e.currentTarget.style.display = 'none';
            e.currentTarget.nextSibling?.classList.remove('is-hidden');
          }}
        />
      ) : null}
      <span className={`guest-avatar-fallback ${src ? 'is-hidden' : ''}`}>{initials}</span>
    </span>
  );
};

export default GuestAvatar;
