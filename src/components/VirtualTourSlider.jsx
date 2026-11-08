import { useState, useEffect, useCallback } from 'react';
import { FaChevronLeft, FaChevronRight } from 'react-icons/fa';
import { VIRTUAL_TOUR_SLIDES } from '../utils/media';

const AUTO_MS = 4500;

const VirtualTourSlider = ({ slides = VIRTUAL_TOUR_SLIDES, hotelName = 'LuxuryStay' }) => {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const total = slides.length;

  const goTo = useCallback((i) => {
    setIndex(((i % total) + total) % total);
  }, [total]);

  const next = useCallback(() => goTo(index + 1), [goTo, index]);
  const prev = useCallback(() => goTo(index - 1), [goTo, index]);

  useEffect(() => {
    if (paused || total < 2) return undefined;
    const id = setInterval(() => {
      setIndex((i) => (i + 1) % total);
    }, AUTO_MS);
    return () => clearInterval(id);
  }, [paused, total]);

  const slide = slides[index];

  return (
    <div
      className="tour-slider"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <div className="tour-slider-track">
        {slides.map((s, i) => (
          <div
            key={s.id}
            className={`tour-slide ${i === index ? 'active' : ''}`}
            style={{ backgroundImage: `url(${s.image})` }}
            aria-hidden={i !== index}
          />
        ))}
        <div className="tour-slide-veil" />
        <div className="tour-slide-caption">
          <p className="tour-slide-kicker">{hotelName} Virtual Tour</p>
          <h3>{slide.title}</h3>
          <p>{slide.caption}</p>
        </div>
      </div>

      <button type="button" className="tour-nav prev" onClick={prev} aria-label="Previous slide">
        <FaChevronLeft />
      </button>
      <button type="button" className="tour-nav next" onClick={next} aria-label="Next slide">
        <FaChevronRight />
      </button>

      <div className="tour-dots" role="tablist" aria-label="Tour slides">
        {slides.map((s, i) => (
          <button
            key={s.id}
            type="button"
            role="tab"
            aria-selected={i === index}
            className={`tour-dot ${i === index ? 'active' : ''}`}
            onClick={() => goTo(i)}
            aria-label={`Show ${s.title}`}
          />
        ))}
      </div>
    </div>
  );
};

export default VirtualTourSlider;
