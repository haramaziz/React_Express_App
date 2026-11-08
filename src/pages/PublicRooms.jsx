import { useState, useEffect, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { FaBed, FaUsers, FaSearch, FaHotel, FaArrowRight, FaFilter } from 'react-icons/fa';
import { RoomStatusBadge, formatCurrency, Spinner } from '../components/common';
import * as apiService from '../services/api';
import { useAlert } from '../contexts/AlertContext';
import { RoomCoverImage } from '../components/RoomMedia';

const PublicRooms = () => {
  const alert = useAlert();
  const [searchParams, setSearchParams] = useSearchParams();
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    search: searchParams.get('q') || '',
    roomType: searchParams.get('roomType') || '',
    minPrice: searchParams.get('minPrice') || '',
    maxPrice: searchParams.get('maxPrice') || '',
    guests: searchParams.get('guests') || '',
    amenity: searchParams.get('amenity') || '',
    checkIn: searchParams.get('checkIn') || '',
    checkOut: searchParams.get('checkOut') || ''
  });

  useEffect(() => {
    loadRooms();
  }, []);

  const loadRooms = async () => {
    try {
      setLoading(true);
      const res = await apiService.rooms.getPublic();
      setRooms(res.data?.data?.rooms || []);
    } catch (err) {
      alert.handleApiError(err, 'Unable to load rooms');
      setRooms([]);
    } finally {
      setLoading(false);
    }
  };

  const amenityOptions = useMemo(() => {
    const set = new Set();
    rooms.forEach((r) => (r.amenities || []).forEach((a) => set.add(a)));
    return Array.from(set).sort();
  }, [rooms]);

  const filteredRooms = useMemo(() => {
    return rooms.filter((room) => {
      if (filters.roomType && room.roomType !== filters.roomType) return false;
      if (filters.minPrice && Number(room.pricePerNight) < Number(filters.minPrice)) return false;
      if (filters.maxPrice && Number(room.pricePerNight) > Number(filters.maxPrice)) return false;
      if (filters.guests && Number(room.capacity?.adults || 0) < Number(filters.guests)) return false;
      if (filters.amenity && !(room.amenities || []).includes(filters.amenity)) return false;
      if (filters.search) {
        const q = filters.search.toLowerCase();
        const hay = `${room.name || ''} ${room.roomNumber || ''} ${room.roomType || ''} ${room.description || ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [rooms, filters]);

  const applyFilters = (e) => {
    e?.preventDefault?.();
    const next = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => {
      if (v) next.set(k === 'search' ? 'q' : k, v);
    });
    setSearchParams(next);
  };

  const clearFilters = () => {
    setFilters({
      search: '',
      roomType: '',
      minPrice: '',
      maxPrice: '',
      guests: '',
      amenity: '',
      checkIn: '',
      checkOut: ''
    });
    setSearchParams({});
  };

  return (
    <div className="public-rooms">
      <section className="rooms-page-header">
        <div className="rooms-page-inner">
          <h1 className="rooms-page-title">Rooms & Suites</h1>
          <p className="rooms-page-subtitle">Browse live inventory and reserve the space that fits your stay</p>
        </div>
      </section>

      <section className="public-section">
        <form className="rooms-filter-bar" onSubmit={applyFilters}>
          <div className="filter-title"><FaFilter /> Filter stays</div>
          <div className="filter-grid">
            <input
              type="search"
              placeholder="Search rooms..."
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
            />
            <select value={filters.roomType} onChange={(e) => setFilters({ ...filters, roomType: e.target.value })}>
              <option value="">All types</option>
              <option value="standard">Standard</option>
              <option value="deluxe">Deluxe</option>
              <option value="suite">Suite</option>
              <option value="family">Family</option>
              <option value="presidential">Presidential</option>
            </select>
            <input type="number" min="0" placeholder="Min price" value={filters.minPrice} onChange={(e) => setFilters({ ...filters, minPrice: e.target.value })} />
            <input type="number" min="0" placeholder="Max price" value={filters.maxPrice} onChange={(e) => setFilters({ ...filters, maxPrice: e.target.value })} />
            <select value={filters.guests} onChange={(e) => setFilters({ ...filters, guests: e.target.value })}>
              <option value="">Any capacity</option>
              {[1, 2, 3, 4, 5, 6].map((n) => <option key={n} value={n}>{n}+ guests</option>)}
            </select>
            <select value={filters.amenity} onChange={(e) => setFilters({ ...filters, amenity: e.target.value })}>
              <option value="">Any amenity</option>
              {amenityOptions.map((a) => <option key={a} value={a}>{a}</option>)}
            </select>
            <button type="submit" className="btn btn-primary"><FaSearch /> Apply</button>
            <button type="button" className="btn btn-outline" onClick={clearFilters}>Clear</button>
          </div>
        </form>

        {loading ? (
          <div className="loading-center"><Spinner size="lg" /></div>
        ) : filteredRooms.length === 0 ? (
          <div className="empty-state">
            <FaHotel className="empty-icon" />
            <p>No rooms match your filters.</p>
            <button type="button" className="btn btn-primary" onClick={clearFilters}>Reset Filters</button>
          </div>
        ) : (
          <>
            <p className="results-count">{filteredRooms.length} room{filteredRooms.length !== 1 ? 's' : ''} found</p>
            <div className="room-grid">
              {filteredRooms.map((room) => (
                <Link key={room._id} to={`/rooms/${room._id}`} className={`room-card status-${room.status} room-card-link`}>
                  <RoomCoverImage room={room} />
                  <div className="room-card-header">
                    <div>
                      <div className="room-number">{room.roomNumber}</div>
                      <div className="room-type-label">{room.name || room.roomType}</div>
                    </div>
                    <RoomStatusBadge status={room.status} />
                  </div>
                  <div className="room-card-body">
                    <p className="room-desc">{room.description || 'Elegant LuxuryStay accommodation with curated amenities.'}</p>
                    <div className="room-meta-row">
                      <span><FaUsers /> {room.capacity?.adults || 2} adults · <FaBed /> {room.bedType || 'King'}</span>
                      <strong>{formatCurrency(room.pricePerNight)}<small>/night</small></strong>
                    </div>
                    <span className="room-cta-text">View details <FaArrowRight /></span>
                  </div>
                </Link>
              ))}
            </div>
          </>
        )}
      </section>
    </div>
  );
};

export default PublicRooms;
