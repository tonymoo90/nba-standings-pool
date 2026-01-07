// hooks/useProximity.ts
import { useEffect, useRef, useState } from "react";

type Spot = { id: string; name: string; lat: number; lng: number; radius?: number };

const toRad = (d:number)=> d*Math.PI/180;
const havDist = (a:GeolocationCoordinates, b:{lat:number;lng:number}) => {
  const R = 6371000;
  const dLat = toRad(b.lat - a.latitude);
  const dLng = toRad(b.lng - a.longitude);
  const la1 = toRad(a.latitude);
  const la2 = toRad(b.lat);
  const h = Math.sin(dLat/2)**2 + Math.cos(la1)*Math.cos(la2)*Math.sin(dLng/2)**2;
  return 2*R*Math.asin(Math.sqrt(h));
};

export function useProximity(spots: Spot[], pollMs = 3000) {
  const [nearby, setNearby] = useState<Spot | null>(null);
  const timer = useRef<number | null>(null);

  useEffect(() => {
    const poll = async () => {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const best = spots
            .map(s => ({ s, d: havDist(pos.coords, s) }))
            .sort((a,b)=> a.d - b.d)[0];
          if (best && best.d <= (best.s.radius ?? 150)) setNearby(best.s);
          else setNearby(null);
        },
        console.error,
        { enableHighAccuracy: true, maximumAge: 10000, timeout: 8000 }
      );
    };
    poll();
    // @ts-ignore
    timer.current = window.setInterval(poll, pollMs);
    return () => { if (timer.current) window.clearInterval(timer.current); };
  }, [spots, pollMs]);

  return nearby;
}
