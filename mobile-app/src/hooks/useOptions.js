import { useEffect, useState } from 'react';
import { getOptions } from '../api/metaApi';

// The allowed values (places, categories, ...) come from the server. They rarely change, so they
// are fetched once and remembered while the app is open.
let cached = null;
let pending = null;

export function resetOptionsCache() {
  cached = null;
  pending = null;
}

export function useOptions() {
  const [state, setState] = useState({ options: cached, error: null });

  useEffect(() => {
    if (cached) return undefined;
    let alive = true;
    pending = pending || getOptions();
    pending
      .then((options) => {
        cached = options;
        if (alive) setState({ options, error: null });
      })
      .catch((error) => {
        pending = null;
        if (alive) setState({ options: null, error });
      });
    return () => {
      alive = false;
    };
  }, []);

  const zones = state.options ? state.options.campusLocations : [];
  return { options: state.options, zones, loading: !state.options && !state.error, error: state.error };
}
