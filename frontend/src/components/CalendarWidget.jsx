/**
 * CalendarWidget — LOT 20
 * Mini-vue agenda pour le Dashboard
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, Clock, MapPin, User, Plus, ChevronRight, Video, Phone } from 'lucide-react';
import { AuroraCard, AuroraButton, AuroraSkeleton, useToast } from './aurora';

const EVENT_TYPES = {
  rdv: { label: 'RDV', color: '#6366f1', icon: Calendar },
  call: { label: 'Appel', color: '#22d3ee', icon: Phone },
  video: { label: 'Visio', color: '#10b981', icon: Video },
  relance: { label: 'Relance', color: '#f59e0b', icon: Clock },
};

export default function CalendarWidget({ maxEvents = 5, showHeader = true }) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [googleConnected, setGoogleConnected] = useState(false);
  const { showToast } = useToast();

  const fetchEvents = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/calendar/events/today', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setEvents(data.events || []);
        setGoogleConnected(data.googleConnected || false);
      }
    } catch (err) {
      console.error('Erreur chargement agenda:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
    // Refresh toutes les 5 minutes
    const interval = setInterval(fetchEvents, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const formatTime = (date) => {
    return new Date(date).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  };

  const isNow = (event) => {
    const now = new Date();
    const start = new Date(event.start);
    const end = new Date(event.end);
    return now >= start && now <= end;
  };

  const isSoon = (event) => {
    const now = new Date();
    const start = new Date(event.start);
    const diffMinutes = (start - now) / (1000 * 60);
    return diffMinutes > 0 && diffMinutes <= 30;
  };

  return (
    <AuroraCard style={{ padding: 'var(--aurora-space-4)' }}>
      {showHeader && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 'var(--aurora-space-4)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Calendar size={18} color="#6366f1" />
            <span style={{ fontWeight: 600, color: 'var(--aurora-text-primary)' }}>
              Agenda du jour
            </span>
          </div>
          <AuroraButton
            variant="ghost"
            size="sm"
            icon={Plus}
            onClick={() => window.location.href = '/parametres?tab=calendar'}
          >
            Ajouter
          </AuroraButton>
        </div>
      )}

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[1, 2, 3].map(i => <AuroraSkeleton key={i} height={60} />)}
        </div>
      ) : events.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: 'var(--aurora-space-6)',
          color: 'var(--aurora-text-tertiary)',
        }}>
          <Calendar size={32} style={{ marginBottom: 8, opacity: 0.5 }} />
          <div style={{ fontSize: 13 }}>Aucun événement aujourd'hui</div>
          <div style={{ fontSize: 11, marginTop: 4 }}>
            {googleConnected ? 'Votre agenda est synchronisé' : 'Connectez Google Calendar dans les paramètres'}
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <AnimatePresence>
            {events.slice(0, maxEvents).map((event, idx) => {
              const eventType = EVENT_TYPES[event.eventType] || EVENT_TYPES.rdv;
              const EventIcon = eventType.icon;
              const happening = isNow(event);
              const soon = isSoon(event);

              return (
                <motion.div
                  key={event.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ delay: idx * 0.05 }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: 12,
                    background: happening
                      ? 'linear-gradient(135deg, rgba(99,102,241,0.15), rgba(139,92,246,0.1))'
                      : soon
                        ? 'rgba(245,158,11,0.1)'
                        : 'var(--aurora-bg-tertiary)',
                    borderRadius: 10,
                    border: happening
                      ? '1px solid rgba(99,102,241,0.3)'
                      : soon
                        ? '1px solid rgba(245,158,11,0.3)'
                        : '1px solid var(--aurora-border)',
                  }}
                >
                  {/* Time badge */}
                  <div style={{
                    minWidth: 50,
                    textAlign: 'center',
                  }}>
                    <div style={{
                      fontSize: 14,
                      fontWeight: 700,
                      color: happening ? '#6366f1' : 'var(--aurora-text-primary)',
                    }}>
                      {formatTime(event.start)}
                    </div>
                    {happening && (
                      <div style={{
                        fontSize: 9,
                        color: '#6366f1',
                        fontWeight: 600,
                        textTransform: 'uppercase',
                        marginTop: 2,
                      }}>
                        En cours
                      </div>
                    )}
                    {soon && !happening && (
                      <div style={{
                        fontSize: 9,
                        color: '#f59e0b',
                        fontWeight: 600,
                        marginTop: 2,
                      }}>
                        Bientôt
                      </div>
                    )}
                  </div>

                  {/* Event type icon */}
                  <div style={{
                    width: 32,
                    height: 32,
                    borderRadius: 8,
                    background: `${eventType.color}20`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                    <EventIcon size={16} color={eventType.color} />
                  </div>

                  {/* Event info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontWeight: 600,
                      color: 'var(--aurora-text-primary)',
                      fontSize: 13,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}>
                      {event.title}
                    </div>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      marginTop: 2,
                      fontSize: 11,
                      color: 'var(--aurora-text-tertiary)',
                    }}>
                      {event.clientName && (
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <User size={10} /> {event.clientName}
                        </span>
                      )}
                      {event.location && (
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <MapPin size={10} /> {event.location}
                        </span>
                      )}
                    </div>
                  </div>

                  <ChevronRight size={16} color="var(--aurora-text-tertiary)" />
                </motion.div>
              );
            })}
          </AnimatePresence>

          {events.length > maxEvents && (
            <button
              onClick={() => window.location.href = '/parametres?tab=calendar'}
              style={{
                background: 'none',
                border: 'none',
                color: '#6366f1',
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
                padding: 8,
                textAlign: 'center',
              }}
            >
              Voir {events.length - maxEvents} autre{events.length - maxEvents > 1 ? 's' : ''} événement{events.length - maxEvents > 1 ? 's' : ''}
            </button>
          )}
        </div>
      )}
    </AuroraCard>
  );
}