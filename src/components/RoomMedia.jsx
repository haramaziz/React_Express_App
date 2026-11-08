import { useState, useEffect } from 'react';
import { Spinner } from './common';
import { getRoomCover, getRoomImages, DEFAULT_ROOM_GALLERY } from '../utils/media';

/**
 * Room card / gallery media with loaders and universal fallbacks.
 */
export const RoomCoverImage = ({ room, className = '', label = true }) => {
  const [loaded, setLoaded] = useState(false);
  const [src, setSrc] = useState(() => getRoomCover(room));

  useEffect(() => {
    setLoaded(false);
    setSrc(getRoomCover(room));
  }, [room?._id, room?.image, room?.images, room?.roomType]);

  return (
    <div className={`room-media tone-${room?.roomType || 'standard'} ${className}`.trim()}>
      {!loaded && (
        <div className="room-media-loader">
          <Spinner size="sm" />
        </div>
      )}
      <img
        src={src}
        alt={room?.name || room?.roomNumber || 'Room'}
        className={`room-media-img ${loaded ? 'loaded' : ''}`}
        loading="lazy"
        onLoad={() => setLoaded(true)}
        onError={() => {
          setSrc(DEFAULT_ROOM_GALLERY[0]);
          setLoaded(true);
        }}
      />
      {label && <span className="room-media-label">{room?.roomType || 'room'}</span>}
    </div>
  );
};

export const RoomGallery = ({ room }) => {
  const images = getRoomImages(room);
  const [active, setActive] = useState(0);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setActive(0);
    setLoaded(false);
  }, [room?._id]);

  const show = (index) => {
    setLoaded(false);
    setActive(index);
  };

  const prev = () => show((active - 1 + images.length) % images.length);
  const next = () => show((active + 1) % images.length);

  return (
    <div className="room-gallery">
      <div className="gallery-main gallery-main-photo">
        {!loaded && (
          <div className="gallery-loader">
            <Spinner size="md" />
          </div>
        )}
        <img
          key={images[active]}
          src={images[active]}
          alt={`${room?.name || room?.roomNumber || 'Room'} photo ${active + 1}`}
          className={`gallery-main-img ${loaded ? 'loaded' : ''}`}
          onLoad={() => setLoaded(true)}
          onError={(e) => {
            e.currentTarget.src = DEFAULT_ROOM_GALLERY[active % DEFAULT_ROOM_GALLERY.length];
            setLoaded(true);
          }}
        />
        {images.length > 1 && (
          <>
            <button type="button" className="gallery-nav prev" onClick={prev} aria-label="Previous image">
              ‹
            </button>
            <button type="button" className="gallery-nav next" onClick={next} aria-label="Next image">
              ›
            </button>
          </>
        )}
      </div>
      <div className="gallery-thumbs">
        {images.map((src, i) => (
          <button
            key={`${src}-${i}`}
            type="button"
            className={`gallery-thumb gallery-thumb-btn ${i === active ? 'active' : ''}`}
            onClick={() => show(i)}
          >
            <img
              src={src}
              alt=""
              loading="lazy"
              onError={(e) => {
                e.currentTarget.src = DEFAULT_ROOM_GALLERY[i % DEFAULT_ROOM_GALLERY.length];
              }}
            />
          </button>
        ))}
      </div>
    </div>
  );
};

export default RoomCoverImage;
