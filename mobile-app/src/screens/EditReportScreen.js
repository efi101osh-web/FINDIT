import { useCallback, useEffect, useState } from 'react';
import Screen from '../components/Screen';
import ReportForm from '../components/ReportForm';
import Notice from '../components/Notice';
import { ErrorView, LoadingView } from '../components/StateViews';
import { useOptions } from '../hooks/useOptions';
import { useReportForm } from '../hooks/useReportForm';
import { getItem, updateItem } from '../api/itemsApi';
import { buildUpdateBody, valuesFromItem } from '../utils/itemValidation';

/** Edit one of your own reports. Only the boxes you changed are sent. */
export default function EditReportScreen({ navigation, route }) {
  const { id } = route.params;
  const { options, zones, loading: optionsLoading, error: optionsError } = useOptions();
  const form = useReportForm();
  const [item, setItem] = useState(null);
  const [phase, setPhase] = useState('loading');
  const [message, setMessage] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [problem, setProblem] = useState(null);
  const { reset } = form;

  const load = useCallback(async () => {
    setPhase('loading');
    try {
      const loaded = await getItem(id);
      setItem(loaded);
      reset(valuesFromItem(loaded));
      setPhase('ready');
    } catch (failure) {
      setMessage(failure.message || 'Please check your connection.');
      setPhase('error');
    }
  }, [id, reset]);

  useEffect(() => {
    load();
  }, [load]);

  async function submit() {
    setProblem(null);
    const found = form.check(zones);
    if (Object.keys(found).length > 0) {
      setProblem('Please fix the highlighted boxes.');
      return;
    }
    const changes = buildUpdateBody(item, form.values);
    if (Object.keys(changes).length === 0) {
      setProblem('Nothing has changed yet.');
      return;
    }
    setSubmitting(true);
    try {
      await updateItem(id, changes);
      setSubmitting(false);
      navigation.goBack();
    } catch (failure) {
      setSubmitting(false);
      if (failure.details && failure.details.length > 0) {
        const fromServer = {};
        for (const detail of failure.details) fromServer[detail.field] = detail.message;
        form.setErrors(fromServer);
      }
      setProblem(failure.message || 'Could not save the changes. Please try again.');
    }
  }

  if (phase === 'loading' || optionsLoading) return <Screen edges={['left', 'right']}><LoadingView message="Loading your report…" /></Screen>;
  if (phase === 'error' || optionsError) return <Screen edges={['left', 'right']}><ErrorView message={message || (optionsError && optionsError.message)} onRetry={load} /></Screen>;

  return (
    <Screen scroll edges={['left', 'right']}>
      <Notice message="Preview: changes are kept on this phone only until the app is closed." />
      <ReportForm mode="edit" values={form.values} errors={form.errors} setField={form.setField} zones={zones} options={options} onSubmit={submit} submitting={submitting} problem={problem} />
    </Screen>
  );
}
