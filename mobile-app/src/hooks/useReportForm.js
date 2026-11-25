import { useCallback, useState } from 'react';
import { emptyValues, validateReport } from '../utils/itemValidation';

/**
 * The state of the report form: what has been typed, and what is wrong with it.
 * Typing in a field clears that field's error. Changing the zone clears the place detail,
 * because "Winslow" means nothing once the zone is the library (the server does the same).
 */
export function useReportForm(initial = emptyValues()) {
  const [values, setValues] = useState(initial);
  const [errors, setErrors] = useState({});

  const setField = useCallback((field, value) => {
    setValues((current) => {
      const next = { ...current, [field]: value };
      if (field === 'generalLocation' && value !== current.generalLocation) next.locationDetail = '';
      return next;
    });
    setErrors((current) => {
      if (!current[field] && !(field === 'generalLocation' && current.locationDetail)) return current;
      const next = { ...current, [field]: undefined };
      if (field === 'generalLocation') next.locationDetail = undefined;
      return next;
    });
  }, []);

  const check = useCallback(
    (zones) => {
      const found = validateReport(values, zones);
      setErrors(found);
      return found;
    },
    [values]
  );

  const reset = useCallback((next = emptyValues()) => {
    setValues(next);
    setErrors({});
  }, []);

  return { values, errors, setField, setErrors, check, reset };
}
